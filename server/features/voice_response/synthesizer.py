"""slice: voice_response — Gemini の読み上げテキストを音声にしてモバイルへ返す。

ターン単位で溜めたテキストを Fish Audio TTS（ヤチヨの声）で音声化し、
`gemini_response`（音声バイト）→ `turn_complete` の順で emit する。
Gemini の受信ループとは別タスクで動く前提で、ターンの順序を保つため
sid 単位のロック（SessionState.synth_lock）で直列化する。
"""

import asyncio

from infrastructure.fish_audio_client import fish_client
from infrastructure.session_store import store
from infrastructure.socket_server import sio
from settings import FISH_FORMAT, FISH_MODEL, FISH_VOICE_ID


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
                    format=FISH_FORMAT,
                )
                await sio.emit("gemini_response", audio, to=sid)
                print(f"[synthesize_and_emit] {sid} TTS 送信完了 ({len(audio)} bytes)")
            except Exception as e:
                print(f"[synthesize_and_emit] {sid} TTS エラー: {e}")
        # 音声を送ってからターン完了を通知する（モバイルは turn_complete で再生する）
        await sio.emit("turn_complete", {}, to=sid)
