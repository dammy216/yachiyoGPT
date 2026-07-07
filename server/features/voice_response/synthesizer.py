"""slice: voice_response — Gemini の読み上げテキストを音声にしてモバイルへ返す。

これまではターン完了（turn_complete）を待ってから全文をまとめて Fish Audio に
送っていたが、Gemini の output_transcription はターン完了前に少しずつ届く。
TurnAudioPipeline はその断片を受け取るたびにバッファへ足し、文が確定
（文末記号まで揃い、かつ `[]` タグの対応も閉じている）次第すぐに TTS
リクエストを投げる。Gemini がまだ喋り終わっていない段階から音声合成を
先行させられるため、ターン完了を待つより喋り出しが速い。
各文の合成は並行に進めつつ、音声投入はキューにより文の順序どおりに行う。
"""

import asyncio
import re
from typing import Optional

from av import AudioFrame
from av.audio.resampler import AudioResampler
from fishaudio.types import TTSConfig

from features.rtc.tts_track import SAMPLE_RATE
from infrastructure.fish_audio_client import fish_client
from infrastructure.session_store import SessionState
from infrastructure.socket_server import sio
from settings import (
    FISH_CHUNK_LENGTH,
    FISH_FORMAT,
    FISH_MODEL,
    FISH_SAMPLE_RATE,
    FISH_TEMPERATURE,
    FISH_TOP_P,
    FISH_VOICE_ID,
)

_TTS_CONFIG = TTSConfig(
    format=FISH_FORMAT,
    sample_rate=FISH_SAMPLE_RATE,
    temperature=FISH_TEMPERATURE,
    top_p=FISH_TOP_P,
    chunk_length=FISH_CHUNK_LENGTH,
)
# Fish Audio (https://fish.audio/ja/ の TTS デモに掲載) が実際に認識するスタイルタグの
# 一覧。API リファレンスには載っていないが、プロダクトサイトで確認済み。
# ここに無いタグ（Gemini が万一綴りを間違えた/存在しないタグを作った場合）は
# そのまま読み上げられて発音が乱れるため、TTSに渡す直前に除去する。
_SUPPORTED_STYLE_TAGS = {
    "angry", "sad", "embarrassed", "emphasis", "whispering", "soft", "breathy", "excited",
    "laughing", "chuckling", "moaning", "clear throat", "sobbing", "crying loudly",
    "sighing", "panting", "groaning", "crowd laughing", "background laughter",
    "audience laughing", "pause", "long pause",
}
_BRACKET_TAG_RE = re.compile(r"\[([^\[\]]*)\]")
# 文末記号の直後で分割（記号自体は前の文に残す）
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[。!?！？])")
_TERMINATORS = "。!?！？"
# 「会話に1回だけ」のはずの決め台詞をプロンプトの指示だけでは守り切れず、
# 毎ターン言ってしまうことがあるため、2回目以降は機械的に除去する。
_GREETING_RE = re.compile(r"ヤオヨロ[~〜ー!!]*")
_FAREWELL_RE = re.compile(r"さらば[~〜ー]*い[!!]*")

_BYTES_PER_SAMPLE = 2  # s16 mono


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]


def _extract_ready_sentences(buffer: str) -> tuple[list[str], str]:
    """buffer のうち `[]` タグの対応が閉じている範囲までを確定文として切り出す。

    タグの途中（例: "[happ" で途切れている）で文が終わったと誤判定しないよう、
    `[`/`]` の深さが 0 に戻った位置の文末記号だけを安全な切れ目として扱う。
    """
    depth = 0
    last_cut = 0
    for i, ch in enumerate(buffer):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth = max(0, depth - 1)
        elif ch in _TERMINATORS and depth == 0:
            last_cut = i + 1
    if last_cut == 0:
        return [], buffer
    return _split_sentences(buffer[:last_cut]), buffer[last_cut:]


def _filter_style_tags(text: str) -> str:
    """Fish Audio が対応していないタグ（Gemini の綴りミスや作り話タグ）だけを除去する。

    対応済みタグはそのまま残し、Fish Audio 側にスタイル制御として渡す。
    """

    def repl(m: re.Match) -> str:
        tag = m.group(1).strip().lower()
        return m.group(0) if tag in _SUPPORTED_STYLE_TAGS else ""

    return _BRACKET_TAG_RE.sub(repl, text).strip()


def _apply_greeting_dedup(state: Optional[SessionState], clean_text: str) -> str:
    if not state or not clean_text:
        return clean_text
    if _GREETING_RE.search(clean_text):
        if state.greeted:
            clean_text = _GREETING_RE.sub("", clean_text).strip()
        else:
            state.greeted = True
    if _FAREWELL_RE.search(clean_text):
        if state.farewelled:
            clean_text = _FAREWELL_RE.sub("", clean_text).strip()
        else:
            state.farewelled = True
    return clean_text


def _decode_pcm_to_track_rate(audio: bytes) -> bytes:
    """Fish の生 PCM (FISH_SAMPLE_RATE, s16 mono) を 48kHz にリサンプルする。"""
    resampler = AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
    samples = len(audio) // _BYTES_PER_SAMPLE
    pcm = bytearray()
    if samples:
        frame = AudioFrame(format="s16", layout="mono", samples=samples)
        frame.planes[0].update(audio[: samples * _BYTES_PER_SAMPLE])
        frame.sample_rate = FISH_SAMPLE_RATE
        for out in resampler.resample(frame):
            pcm += out.to_ndarray().tobytes()
    for out in resampler.resample(None):
        pcm += out.to_ndarray().tobytes()
    return bytes(pcm)


async def _synthesize_sentence(text: str) -> bytes:
    stream = await fish_client.tts.stream(
        text=text,
        reference_id=FISH_VOICE_ID,
        model=FISH_MODEL,
        config=_TTS_CONFIG,
    )
    raw = bytearray()
    async for chunk in stream:
        raw += chunk
    return _decode_pcm_to_track_rate(bytes(raw))


class TurnAudioPipeline:
    """1ターン分の音声合成をインクリメンタルに処理する。

    `feed()` で文字列断片を渡すたびに確定した文から TTS を開始し、
    `finish()`（turn_complete 時）で残りのバッファを最後の文として流し切る。
    音声投入はキュー経由で文の順序どおりに行われる。
    """

    def __init__(self, state: Optional[SessionState]) -> None:
        self._state = state
        self._buffer = ""
        self._queue: asyncio.Queue[Optional[asyncio.Task]] = asyncio.Queue()
        self._current_task: Optional[asyncio.Task] = None
        self._pusher_task = asyncio.create_task(self._pusher())

    def feed(self, raw_chunk: str) -> None:
        self._buffer += raw_chunk
        ready, self._buffer = _extract_ready_sentences(self._buffer)
        for sentence in ready:
            self._dispatch(sentence)

    def _dispatch(self, raw_sentence: str) -> None:
        clean = _filter_style_tags(raw_sentence)
        clean = _apply_greeting_dedup(self._state, clean)
        if clean:
            self._queue.put_nowait(asyncio.create_task(_synthesize_sentence(clean)))

    async def finish(self, sid: str) -> None:
        """残りのバッファを最後の文として確定し、全チャンクの投入完了を待つ。"""
        remainder = self._buffer.strip()
        self._buffer = ""
        if remainder:
            self._dispatch(remainder)
        self._queue.put_nowait(None)  # 番兵: このターンはここで終わり
        await self._pusher_task
        await sio.emit("turn_complete", {}, to=sid)

    def cancel(self) -> None:
        """割り込み時、まだ投入していない/生成中の音声をすべて破棄する。"""
        self._pusher_task.cancel()
        if self._current_task:
            self._current_task.cancel()
        while not self._queue.empty():
            item = self._queue.get_nowait()
            if item is not None:
                item.cancel()

    async def _pusher(self) -> None:
        while True:
            task = await self._queue.get()
            if task is None:
                break
            self._current_task = task
            try:
                pcm = await task
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"[TurnAudioPipeline] TTS エラー: {e}")
                continue
            finally:
                self._current_task = None
            track = self._state.tts_track if self._state else None
            if track and pcm:
                track.push(pcm)
