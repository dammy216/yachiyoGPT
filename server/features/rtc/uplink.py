"""slice: rtc — WebRTC 上り音声（モバイルのマイク）を Gemini Live へ転送する。

WebRTC から届くフレーム（通常 48kHz）を Gemini Live の入力要件
（PCM 16kHz mono 16bit）へリサンプルして送る。旧 send_audio_chunk の後継。
"""

from aiortc.mediastreams import MediaStreamError, MediaStreamTrack
from av.audio.resampler import AudioResampler
from google.genai import types

from infrastructure.session_store import store

_GEMINI_RATE = 16000


async def forward_audio_to_gemini(track: MediaStreamTrack, sid: str) -> None:
    resampler = AudioResampler(format="s16", layout="mono", rate=_GEMINI_RATE)
    while True:
        try:
            frame = await track.recv()
        except MediaStreamError:
            break
        state = store.get(sid)
        if not state or not state.gemini_session:
            continue
        for out in resampler.resample(frame):
            pcm = out.to_ndarray().tobytes()
            try:
                await state.gemini_session.send_realtime_input(
                    audio=types.Blob(data=pcm, mime_type=f"audio/pcm;rate={_GEMINI_RATE}")
                )
            except Exception:
                # 再接続の合間など、セッションが一時的に閉じている瞬間は無視する
                break
    print(f"[rtc] {sid} 上り音声トラックが終了しました")
