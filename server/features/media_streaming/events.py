"""slice: media_streaming — モバイルからの音声/画像チャンクを Gemini へ転送する。"""

import base64

from google.genai import types

from infrastructure.session_store import store
from infrastructure.socket_server import sio


@sio.event
async def send_audio_chunk(sid, data):
    state = store.get(sid)
    if not state or not state.gemini_session:
        return

    audio = base64.b64decode(data["data"])
    try:
        await state.gemini_session.send_realtime_input(
            audio=types.Blob(data=audio, mime_type="audio/pcm;rate=16000")
        )
    except Exception:
        # 再接続の合間など、セッションが一時的に閉じている瞬間は無視する
        return
    print(f"[send_audio_chunk] {sid} 音声チャンク送信完了")


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
        return
    print(f"[send_image_frame] {sid} 画像フレーム送信完了")
