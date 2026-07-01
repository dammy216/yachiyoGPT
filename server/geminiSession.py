from fastapi import FastAPI
import socketio
import uvicorn
from google import genai
from google.genai import types
import base64
import asyncio
from dotenv import load_dotenv
import os
import websockets
from fishaudio import AsyncFishAudio


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", max_http_buffer_size=100* 1024 * 1024)
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

load_dotenv()

# Gemini API 初期化
# gemini-3.1-flash-live-preview は native audio モデルで応答は AUDIO のみ対応
# （TEXT modality は非対応）。そこで AUDIO で応答させつつ
# output_audio_transcription で「読み上げテキスト」を受け取り、
# その文字起こしを Fish Audio の TTS で音声化してモバイルへ送る構成にする。
# Gemini 自身の音声は使わず破棄する。
client = genai.Client(api_key=os.getenv("API_KEY"))
model_id = "gemini-3.1-flash-live-preview"
# session_resumption: 接続が切れても直前までの会話状態を引き継いで再接続できる。
# context_window_compression: スライディングウィンドウで長時間セッションでも切れにくくする。
config = {
    "response_modalities": ["AUDIO"],
    "output_audio_transcription": {},
    "context_window_compression": {"sliding_window": {}},
}

# Fish Audio TTS 初期化（FISH_API_KEY を環境変数から自動で読む）
fish_client = AsyncFishAudio()
# ヤチヨの声: https://fish.audio/m/dce8b25c992d434d80ac6763a3d1e4aa
FISH_VOICE_ID = "dce8b25c992d434d80ac6763a3d1e4aa"
# 現在無料で使える s2 pro free。
# SDK の型は "s2-pro" 等しか宣言していないが、値はそのまま "model" ヘッダーに
# 渡されるだけなので、API が受け付ける "s2.1-pro-free" を指定できる。
FISH_MODEL = "s2.1-pro-free"
# モバイル側はこの音声ファイルをそのまま再生する
FISH_FORMAT = "mp3"

# 「どのクライアント（＝Socket.IOのsid）が、どのGeminiセッションを持っているか」を管理
session_map = {}
# 「どのクライアントが、Geminiからの応答を受け取る非同期タスク（asyncio.Task）」を持っているか」を管理
receive_tasks = {}
# 「どのクライアントが、Geminiセッションを開始しているか」を管理
task_map = {}
# 「どのクライアントの、現在のターンで Gemini が返したテキスト」を蓄積する
text_buffers = {}
# 「どのクライアントの TTS 合成を直列化するためのロック」を管理（ターン順を保つ）
synth_locks = {}
# 「会話を継続中（＝接続が切れたら再接続すべき）の sid」を管理。
# end_session で取り除くと再接続ループが止まる。
active_sessions = set()

# セッションを管理するための非同期関数。
# Gemini Live の接続は ~10 分や音声/動画の制限で切れることがあるため、
# session_resumption のハンドルを使って切れたら自動で再接続し、会話を継続する。
async def handle_session(sid):
    active_sessions.add(sid)
    handle = None  # session_resumption ハンドル（再接続で会話状態を引き継ぐ）
    try:
        while sid in active_sessions:
            cfg = dict(config)
            cfg["session_resumption"] = types.SessionResumptionConfig(handle=handle)
            try:
                async with client.aio.live.connect(model=model_id, config=cfg) as session:
                    session_map[sid] = session
                    print(f"[handle_session] {sid} Gemini 接続確立 (resume={'yes' if handle else 'no'})")
                    handle = await receive_from_gemini(session, sid, handle)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"[handle_session] {sid} 接続エラー: {e}")

            if sid in active_sessions:
                print(f"[handle_session] {sid} 接続が閉じたため再接続します")
                await asyncio.sleep(0.5)

    except asyncio.CancelledError:
        print(f"[handle_session] セッション {sid} はキャンセルされました")

    finally:
        active_sessions.discard(sid)
        session_map.pop(sid, None)
        receive_tasks.pop(sid, None)
        task_map.pop(sid, None)
        text_buffers.pop(sid, None)
        synth_locks.pop(sid, None)
        print(f"[handle_session] セッション {sid} が終了しました")


# Geminiからの応答を受信する非同期関数（1 接続ぶん）。
# Gemini の音声は破棄し、output_transcription（読み上げテキスト）を
# ターンごとに溜めて Fish Audio で音声化する。
# 接続が閉じたら最新の session_resumption ハンドルを返し、呼び出し元が再接続に使う。

async def receive_from_gemini(session, sid, handle):
    try:
        async for response in session.receive():
            # 再接続用ハンドルを更新
            sru = getattr(response, "session_resumption_update", None)
            if sru and sru.resumable and sru.new_handle:
                handle = sru.new_handle
            # 切断予告（この後で接続が閉じるが、handle_session が再接続する）
            ga = getattr(response, "go_away", None)
            if ga:
                print(f"\n[receive] {sid} GoAway time_left={getattr(ga, 'time_left', None)}")

            sc = getattr(response, "server_content", None)
            if not sc:
                continue
            ot = getattr(sc, "output_transcription", None)
            if ot and ot.text:
                print(ot.text, end="")
                text_buffers[sid] = text_buffers.get(sid, "") + ot.text
            if getattr(sc, "turn_complete", False):
                text = text_buffers.pop(sid, "").strip()
                print(f"\n[receive] {sid} turn_complete text='{text[:60]}'")
                # TTS は受信ループをブロックしないよう別タスクで実行する。
                # ここでブロックすると Live セッションのターン処理が止まり、
                # 2 回目以降の応答が受信できなくなる。
                asyncio.create_task(synthesize_and_emit(sid, text))
    except websockets.exceptions.ConnectionClosedOK:
        pass
    return handle


# 溜めたテキストを Fish Audio TTS で音声化してモバイルへ送る。
# 受信ループとは別タスクで動く。ターンの順序を保つため sid 単位でロックする。
async def synthesize_and_emit(sid, text):
    lock = synth_locks.setdefault(sid, asyncio.Lock())
    async with lock:
        if text:
            try:
                audio = await fish_client.tts.convert(
                    text=text,
                    reference_id=FISH_VOICE_ID,
                    model=FISH_MODEL,
                    format=FISH_FORMAT,
                )
                await sio.emit("gemini_response", audio, to=sid)
                print(f"[synthesize_and_emit] {sid} TTS 送信完了 ({len(audio)} bytes)")
            except Exception as e:
                print(f"[synthesize_and_emit] {sid} TTS エラー: {e}")
        # 音声を送ってからターン完了を通知する（モバイルは turn_complete で再生する）
        await sio.emit("turn_complete", {}, to=sid)


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
    try:
        await session.send_realtime_input(audio=types.Blob(data=audio, mime_type="audio/pcm;rate=16000"))
    except Exception:
        # 再接続の合間など、セッションが一時的に閉じている瞬間は無視する
        return
    print(f"[send_audio_chunk] {sid} 音声チャンク送信完了")
        
# 画像フレームを受geminiに送信するイベント
@sio.event
async def send_image_frame(sid, data):
    session = session_map.get(sid)
    if not session:
        return

    image = base64.b64decode(data["data"])
    try:
        await session.send_realtime_input(video=types.Blob(data=image, mime_type="image/jpeg"))
    except Exception:
        return
    print(f"[send_image_frame] {sid} 画像フレーム送信完了")

# geminiセッション終了イベント
@sio.event
async def end_session(sid, data):
    # 再接続ループを止めてから接続を閉じる
    active_sessions.discard(sid)
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