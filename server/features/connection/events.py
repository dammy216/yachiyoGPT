"""slice: connection — Socket.IO の接続/切断イベント。"""

from infrastructure.session_store import store
from infrastructure.socket_server import sio


@sio.event
async def connect(sid, environ):
    print(f"✅ クライアント {sid} が接続しました")


@sio.event
async def disconnect(sid):
    # 再接続ループを止め、WebRTC ピア接続も後始末する
    store.deactivate(sid)
    state = store.get(sid)
    if state and state.pc:
        await state.pc.close()
        state.pc = None
        state.tts_track = None
    print(f"❌ クライアント {sid} が切断しました")
