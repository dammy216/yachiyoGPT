"""slice: rtc — WebRTC 下り音声トラック。

Fish TTS の PCM(48kHz mono s16) をキューから 20ms フレームに刻んで送出する。
キューが空の間は無音を流し続ける（トラックは常時 live）。
割り込み時は flush() で未再生分を破棄する。
"""

import asyncio
import fractions
import time
from typing import Optional

from aiortc.mediastreams import MediaStreamError, MediaStreamTrack
from av import AudioFrame

SAMPLE_RATE = 48000
FRAME_SAMPLES = 960  # 20ms @ 48kHz
_FRAME_BYTES = FRAME_SAMPLES * 2  # s16 mono


class TTSAudioTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self) -> None:
        super().__init__()
        self._queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._buffer = b""
        self._start: Optional[float] = None
        self._timestamp = 0

    def push(self, pcm: bytes) -> None:
        """48kHz mono s16 の生 PCM を再生キューに積む。"""
        self._queue.put_nowait(pcm)

    def flush(self) -> None:
        """未再生の音声を破棄する（割り込み時）。"""
        self._buffer = b""
        while not self._queue.empty():
            self._queue.get_nowait()

    async def recv(self) -> AudioFrame:
        if self.readyState != "live":
            raise MediaStreamError

        # 実時間にペーシング（20ms ごとに 1 フレーム）
        if self._start is None:
            self._start = time.time()
        else:
            self._timestamp += FRAME_SAMPLES
            wait = self._start + self._timestamp / SAMPLE_RATE - time.time()
            if wait > 0:
                await asyncio.sleep(wait)

        while len(self._buffer) < _FRAME_BYTES and not self._queue.empty():
            self._buffer += self._queue.get_nowait()
        chunk, self._buffer = self._buffer[:_FRAME_BYTES], self._buffer[_FRAME_BYTES:]
        chunk = chunk.ljust(_FRAME_BYTES, b"\x00")  # 足りない分は無音

        frame = AudioFrame(format="s16", layout="mono", samples=FRAME_SAMPLES)
        frame.planes[0].update(chunk)
        frame.sample_rate = SAMPLE_RATE
        frame.pts = self._timestamp
        frame.time_base = fractions.Fraction(1, SAMPLE_RATE)
        return frame
