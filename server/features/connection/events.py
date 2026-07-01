"""slice: connection — Socket.IO の接続/切断イベント。"""

from infrastructure.socket_server import sio


@sio.event
async def connect(sid, environ):
    print(f"✅ クライアント {sid} が接続しました")


@sio.event
async def disconnect(sid):
    print(f"❌ クライアント {sid} が切断しました")
