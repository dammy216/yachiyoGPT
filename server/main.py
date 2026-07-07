"""サーバー起動エントリ。

各 slice の events モジュールを import することで、@sio.event ハンドラを
Socket.IO サーバーに登録する（import 副作用で登録される）。

起動:
  uvicorn main:socket_app --host 0.0.0.0 --port 8080 --reload
"""

import uvicorn

import infrastructure.aiortc_patches  # noqa: F401 (import 副作用で Opus 設定を上書き)
from infrastructure.socket_server import socket_app
from settings import HOST, PORT

# --- slice のイベントハンドラを登録（import 副作用） ---
import features.connection.events  # noqa: E402,F401
import features.conversation.events  # noqa: E402,F401
import features.media_streaming.events  # noqa: E402,F401
import features.rtc.events  # noqa: E402,F401

if __name__ == "__main__":
    uvicorn.run(socket_app, host=HOST, port=PORT)
