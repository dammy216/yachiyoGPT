"""sid（Socket.IO クライアント）ごとの会話状態を集中管理する。

複数の slice（conversation / media_streaming / voice_response）が
同じ sid の状態を共有するため、横断的関心事としてここに置く。

旧実装ではグローバル dict（session_map / text_buffers / synth_locks /
active_sessions ...）に分散していたものを 1 つの SessionState にまとめた。
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SessionState:
    """1 クライアント（sid）ぶんの会話状態。"""

    # Gemini Live セッション（再接続のたびに差し替わる）
    gemini_session: Optional[Any] = None
    # このセッションを回している非同期タスク（handle/run_session）
    runner_task: Optional[asyncio.Task] = None
    # 現在のターンで Gemini が返したテキストの蓄積
    text_buffer: str = ""
    # TTS 合成を直列化してターン順を保つためのロック
    synth_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    # 会話継続中フラグ（True の間は切断されても再接続する）
    active: bool = False
    # WebRTC ピア接続（webrtc_offer のたびに差し替わる）
    pc: Optional[Any] = None
    # 下り音声トラック（Fish TTS の PCM を流す。割り込み時は flush する）
    tts_track: Optional[Any] = None
    # 実行中の TTS タスク（割り込み時にキャンセルする）
    synth_task: Optional[asyncio.Task] = None
    # 画像フレームを Gemini へ送信中か（詰まったら後続フレームを捨てる）
    image_sending: bool = False


class SessionStore:
    """sid → SessionState の単純なレジストリ。"""

    def __init__(self) -> None:
        self._states: dict[str, SessionState] = {}

    def get_or_create(self, sid: str) -> SessionState:
        state = self._states.get(sid)
        if state is None:
            state = SessionState()
            self._states[sid] = state
        return state

    def get(self, sid: str) -> Optional[SessionState]:
        return self._states.get(sid)

    def remove(self, sid: str) -> None:
        self._states.pop(sid, None)

    def is_active(self, sid: str) -> bool:
        state = self._states.get(sid)
        return bool(state and state.active)

    def deactivate(self, sid: str) -> None:
        """再接続ループを止める（状態自体はループの終了処理で remove される）。"""
        state = self._states.get(sid)
        if state:
            state.active = False


# プロセス全体で共有する単一インスタンス
store = SessionStore()
