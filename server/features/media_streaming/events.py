"""slice: media_streaming — モバイルからの画像チャンクを Gemini へ転送する。

音声は WebRTC の上りトラック（features/rtc）で送られるため、
ここで扱うのはカメラ画像フレームのみ。画像は JPEG バイナリで届く
（旧クライアント互換のため base64 文字列も受け付ける）。
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

    # 前のフレームの送信が終わっていなければ、このフレームは捨てる。
    # 溜めて順に送ると Gemini への送信が詰まったとき遅延が雪だるま式に増える。
    if state.image_sending:
        return
    state.image_sending = True
    try:
        raw = data["data"]
        image = bytes(raw) if isinstance(raw, (bytes, bytearray)) else base64.b64decode(raw)
        await state.gemini_session.send_realtime_input(
            video=types.Blob(data=image, mime_type="image/jpeg")
        )
    except Exception:
        # 再接続の合間など、セッションが一時的に閉じている瞬間は無視する
        return
    finally:
        state.image_sending = False
    print(f"[send_image_frame] {sid} 画像フレーム送信完了 ({len(image)} bytes)")
