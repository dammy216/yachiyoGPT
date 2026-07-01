"""slice: conversation — Gemini Live セッションのライフサイクル管理。

Gemini Live の接続は ~10 分や音声/動画の制限で切れることがあるため、
session_resumption のハンドルを使って切れたら自動で再接続し会話を継続する。
"""

import asyncio

from google.genai import types

from features.conversation.gemini_receiver import receive_from_gemini
from infrastructure.gemini_client import gemini_client
from infrastructure.session_store import store
from settings import GEMINI_LIVE_CONFIG, GEMINI_MODEL_ID


async def run_session(sid: str) -> None:
    state = store.get_or_create(sid)
    state.active = True
    handle = None  # session_resumption ハンドル（再接続で会話状態を引き継ぐ）
    try:
        while store.is_active(sid):
            cfg = dict(GEMINI_LIVE_CONFIG)
            cfg["session_resumption"] = types.SessionResumptionConfig(handle=handle)
            try:
                async with gemini_client.aio.live.connect(model=GEMINI_MODEL_ID, config=cfg) as session:
                    state.gemini_session = session
                    print(f"[run_session] {sid} Gemini 接続確立 (resume={'yes' if handle else 'no'})")
                    handle = await receive_from_gemini(session, sid, handle)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"[run_session] {sid} 接続エラー: {e}")

            if store.is_active(sid):
                print(f"[run_session] {sid} 接続が閉じたため再接続します")
                await asyncio.sleep(0.5)

    except asyncio.CancelledError:
        print(f"[run_session] セッション {sid} はキャンセルされました")

    finally:
        store.remove(sid)
        print(f"[run_session] セッション {sid} が終了しました")
