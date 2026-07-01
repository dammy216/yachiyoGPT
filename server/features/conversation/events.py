"""slice: conversation — 会話セッションの開始/終了イベント。"""

import asyncio

from features.conversation.session_runner import run_session
from infrastructure.session_store import store
from infrastructure.socket_server import sio


@sio.event
async def start_session(sid, data):
    state = store.get_or_create(sid)
    state.runner_task = asyncio.create_task(run_session(sid))
    print(f"[start_session] セッション {sid} を開始しました")


@sio.event
async def end_session(sid, data):
    # 再接続ループを止めてから接続を閉じる
    store.deactivate(sid)
    state = store.get(sid)
    if state and state.gemini_session:
        await state.gemini_session.close()
        print(f"[end_session] セッション {sid} を終了しました")
