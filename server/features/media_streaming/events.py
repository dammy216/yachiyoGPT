"""slice: media_streaming — モバイルからの画像チャンクを Gemini へ転送する。

音声は WebRTC の上りトラック（features/rtc）で送られるため、
ここで扱うのはカメラ画像フレームのみ。
"""

import base64

from google.genai import types

from infrastructure.session_store import store
from infrastructure.socket_server import sio


@sio.event
async def send_image_frame(sid, data):
    state = store.get(sid)
    if not state or not state.gemini_session:
        return

    image = base64.b64decode(data["data"])
    try:
        await state.gemini_session.send_realtime_input(
            video=types.Blob(data=image, mime_type="image/jpeg")
        )
    except Exception:
        # 再接続の合間など、セッションが一時的に閉じている瞬間は無視する
        return
    print(f"[send_image_frame] {sid} 画像フレーム送信完了")
