from fastapi import FastAPI
import socketio
import uvicorn
from google import genai
import base64
import asyncio
from dotenv import load_dotenv
import os


load_dotenv()

# SocketIO 初期化
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", max_http_buffer_size=100* 1024 * 1024)
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

# GenAI API 初期化
client = genai.Client(api_key=os.getenv("API_KEY"), http_options={'api_version': 'v1alpha'})
model_id = "gemini-2.0-flash-live-001"
config = {"response_modalities": ["TEXT"]}
        
@sio.event
async def connect(sid, environ):
    print(f"✅ クライアント {sid} が接続しました")

# チャットイベントのハンドラ
@sio.event
async def chat_test(sid, data):
    try:
        
        async with client.aio.live.connect(model=model_id, config=config) as session:

            async def send_to_gemini():
                try:
                    for message in data["realtime_input"]:
                        if message["mime_type"] == "audio/pcm":
                            decoded_sound_data = base64.b64decode(message["data"])
                            play_pcm(decoded_sound_data)
                            await session.send(input={"mime_type": "audio/pcm", "data": decoded_sound_data})
                            print(f"音声チャンクを送信しました: {decoded_sound_data[:50]}")
                        
                        elif message["mime_type"] == "image/jpeg":
                            decoded_image_data = base64.b64decode(message["data"])
                            show_image(decoded_image_data)
                            await session.send(input={"mime_type": "image/jpeg", "data": decoded_image_data})
                            print(f"画像チャンクを送信しました: {decoded_image_data[:50]}")
                    
                except Exception as e:
                    print(f"[Gemini送信エラー] {e}")

            async def receive_from_gemini():
                try:
                    async for response in session.receive():
                        if response.text:
                            print(f"[Gemini応答]: {response.text}")
                            await sio.emit("gemini_text", response.text, to=sid)
                except Exception as e:
                    print(f"[Gemini受信エラー] {e}")
                finally:
                    await session.close()

            send_task = asyncio.create_task(send_to_gemini())
            receive_task = asyncio.create_task(receive_from_gemini())
            await asyncio.gather(send_task, receive_task)

    except Exception as e:
        print(f"[Geminiセッションエラー] {e}")
    finally:
        print("🔚 セッション終了")



@sio.event
async def disconnect(sid):
    print(f"❌ クライアント {sid} が切断しました")
    

# サーバー起動
if __name__ == "__main__":
    uvicorn.run(socket_app, host="0.0.0.0", port=8080)

# uvicorn main2:socket_app --host 0.0.0.0 --port 8080 --reload