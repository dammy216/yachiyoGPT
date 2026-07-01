"""Socket.IO / FastAPI サーバーのインスタンスを生成する。

各 slice はここから `sio` を import してイベントハンドラを登録し、
起動エントリ（main.py）は `socket_app` を uvicorn に渡す。
"""

import socketio
from fastapi import FastAPI

from settings import MAX_HTTP_BUFFER_SIZE

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    max_http_buffer_size=MAX_HTTP_BUFFER_SIZE,
)
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)
