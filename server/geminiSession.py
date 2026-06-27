from fastapi import FastAPI
import socketio
import uvicorn
from google import genai
import base64
import asyncio
from dotenv import load_dotenv
import os
from utils.debugUtils import play_gemini_pcm
import websockets


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", max_http_buffer_size=100* 1024 * 1024)
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

load_dotenv()

# Gemini API 初期化
client = genai.Client(api_key=os.getenv("API_KEY"), http_options={'api_version': 'v1beta'})
model_id = "gemini-2.0-flash-live-001"
config = {"response_modalities": ["AUDIO"]}

# 「どのクライアント（＝Socket.IOのsid）が、どのGeminiセッションを持っているか」を管理
session_map = {}
# 「どのクライアントが、Geminiからの応答を受け取る非同期タスク（asyncio.Task）」を持っているか」を管理
receive_tasks = {}
# 「どのクライアントが、Geminiセッションを開始しているか」を管理
task_map = {}

# セッションを管理するための非同期関数
async def handle_session(sid):
    try:
        async with client.aio.live.connect(model=model_id, config=config) as session:
            session_map[sid] = session

            # audio_queueをこのセッション専用に作る
            audio_queue = asyncio.Queue()

            # 受信タスク
            receive_tasks[sid] = asyncio.create_task(receive_from_gemini(session, sid, audio_queue))

            # 再生タスク
            play_task = asyncio.create_task(play_gemini_pcm(audio_queue))

            # どちらかが終わるまで待つ（どっちも並行でOK）
            await receive_tasks[sid]
            # 通常、再生タスクも停止させる必要がある場合はキャンセルしてOK
            play_task.cancel()

    except asyncio.CancelledError:
        print(f"[handle_session] セッション {sid} はキャンセルされました")

    finally:
        session_map.pop(sid, None)
        receive_tasks.pop(sid, None)
        task_map.pop(sid, None)
        print(f"[handle_session] セッション {sid} が終了しました")


# Geminiからの応答を受信する非同期関数

async def receive_from_gemini(session, sid, audio_queue):
    while True:
        try:
            async for response in session.receive():
                if data := response.data:
                    await sio.emit("gemini_response", data, to=sid)
                    await audio_queue.put(data)
                if text := response.text:
                    print(text, end="")
        except websockets.exceptions.ConnectionClosedOK:
            break 


# ------------------------------------- socket.ioエンドポイント -------------------------------------------------------

# クライアント接続イベント
@sio.event
async def connect(sid, environ):
    print(f"✅ クライアント {sid} が接続しました")
          
# geminiセッション開始イベント
@sio.event
async def start_session(sid, data):
     task_map[sid] = asyncio.create_task(handle_session(sid))
     print(f"[start_session] セッション {sid} を開始しました")
# 音声チャンクをgeminiに送信するイベント
@sio.event
async def send_audio_chunk(sid, data):
    session = session_map.get(sid)
    if not session:
        return

    audio = base64.b64decode(data["data"])
    await session.send(input={"mime_type": "audio/pcm", "data": audio})
    print(f"[send_audio_chunk] {sid} 音声チャンク送信完了")
        
# 画像フレームを受geminiに送信するイベント
@sio.event
async def send_image_frame(sid, data):
    session = session_map.get(sid)
    if not session:
        return

    image = base64.b64decode(data["data"])
    await session.send(input={"mime_type": "image/jpeg", "data": image})
    print(f"[send_image_frame] {sid} 画像フレーム送信完了")

# geminiセッション終了イベント
@sio.event
async def end_session(sid, data):
    session = session_map.get(sid)
    if session:
        await session.close()
        print(f"[end_session] セッション {sid} を終了しました")


@sio.event
async def disconnect(sid):
    print(f"❌ クライアント {sid} が切断しました")


# サーバー起動
if __name__ == "__main__":
    uvicorn.run(socket_app, host="0.0.0.0", port=8080)
    
 # uvicorn geminiSession:socket_app --host 0.0.0.0 --port 8080 --reload