"""slice: voice_response — Gemini の読み上げテキストを音声にしてモバイルへ返す。

ターン単位で溜めたテキストを Fish Audio TTS（ヤチヨの声）で音声化し、
48kHz mono s16 の PCM にデコードして WebRTC の下りトラック
（SessionState.tts_track）へ流す。投入後に `turn_complete` を emit する。
Gemini の受信ループとは別タスクで動く前提で、ターンの順序を保つため
sid 単位のロック（SessionState.synth_lock）で直列化する。
"""

import asyncio
import io

import av
from av.audio.resampler import AudioResampler
from fishaudio.types import TTSConfig

from features.rtc.tts_track import SAMPLE_RATE
from infrastructure.fish_audio_client import fish_client
from infrastructure.session_store import store
from infrastructure.socket_server import sio
from settings import FISH_FORMAT, FISH_MODEL, FISH_SAMPLE_RATE, FISH_VOICE_ID

_TTS_CONFIG = TTSConfig(format=FISH_FORMAT, sample_rate=FISH_SAMPLE_RATE)


def _decode_to_track_pcm(audio: bytes) -> bytes:
    """Fish Audio の WAV バイト列を下りトラック形式（48kHz mono s16）の生 PCM にする。

    WAV はヘッダにサンプルレートを持つため、API 側の出力仕様に依存せず
    正しくデコード・リサンプルできる。
    """
    resampler = AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
    pcm = bytearray()
    with av.open(io.BytesIO(audio)) as container:
        for frame in container.decode(audio=0):
            for out in resampler.resample(frame):
                pcm += out.to_ndarray().tobytes()
    # リサンプラ内部に残ったぶんを吐き出す
    for out in resampler.resample(None):
        pcm += out.to_ndarray().tobytes()
    return bytes(pcm)


async def synthesize_and_emit(sid: str, text: str) -> None:
    state = store.get(sid)
    # セッションがすでに終了していてもターン完了通知は送れるよう、
    # state が無い場合は使い捨てロックにフォールバックする。
    lock = state.synth_lock if state else asyncio.Lock()
    async with lock:
        if text:
            try:
                audio = await fish_client.tts.convert(
                    text=text,
                    reference_id=FISH_VOICE_ID,
                    model=FISH_MODEL,
                    config=_TTS_CONFIG,
                )
                pcm = _decode_to_track_pcm(audio)
                track = state.tts_track if state else None
                if track:
                    track.push(pcm)
                    print(f"[synthesize_and_emit] {sid} TTS 投入完了 ({len(pcm)} bytes)")
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"[synthesize_and_emit] {sid} TTS エラー: {e}")
        # 音声を流し始めてからターン完了を通知する（口パク連動などに使える）
        await sio.emit("turn_complete", {}, to=sid)
