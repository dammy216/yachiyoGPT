"""slice: conversation — Gemini Live からの応答を受信する（1 接続ぶん）。

Gemini の音声は破棄し、output_transcription（読み上げテキスト）を
ターンごとに溜めて voice_response の TTS に渡す。
接続が閉じたら最新の session_resumption ハンドルを返し、
呼び出し元（session_runner）が再接続に使う。
"""

import asyncio

import websockets

from features.voice_response.synthesizer import synthesize_and_emit
from infrastructure.session_store import store


async def receive_from_gemini(session, sid: str, handle):
    state = store.get(sid)
    try:
        async for response in session.receive():
            # 再接続用ハンドルを更新
            sru = getattr(response, "session_resumption_update", None)
            if sru and sru.resumable and sru.new_handle:
                handle = sru.new_handle
            # 切断予告（この後で接続が閉じるが、session_runner が再接続する）
            ga = getattr(response, "go_away", None)
            if ga:
                print(f"\n[receive] {sid} GoAway time_left={getattr(ga, 'time_left', None)}")

            sc = getattr(response, "server_content", None)
            if not sc:
                continue
            ot = getattr(sc, "output_transcription", None)
            if ot and ot.text:
                print(ot.text, end="")
                if state:
                    state.text_buffer += ot.text
            if getattr(sc, "turn_complete", False):
                text = ""
                if state:
                    text = state.text_buffer.strip()
                    state.text_buffer = ""
                print(f"\n[receive] {sid} turn_complete text='{text[:60]}'")
                # TTS は受信ループをブロックしないよう別タスクで実行する。
                # ここでブロックすると Live セッションのターン処理が止まり、
                # 2 回目以降の応答が受信できなくなる。
                asyncio.create_task(synthesize_and_emit(sid, text))
    except websockets.exceptions.ConnectionClosedOK:
        pass
    return handle
