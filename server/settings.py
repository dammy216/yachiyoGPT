"""アプリ全体の設定・定数を集約する。

環境変数の読み込みもここで一度だけ行う（import 時に load_dotenv）。
各 slice / infrastructure はこのモジュールから定数を読む。
"""

import os

from dotenv import load_dotenv

load_dotenv()

# ------- Gemini -------
# gemini-3.1-flash-live-preview は native audio モデルで応答は AUDIO のみ対応
# （TEXT modality は非対応）。そこで AUDIO で応答させつつ
# output_audio_transcription で「読み上げテキスト」を受け取り、
# その文字起こしを Fish Audio の TTS で音声化してモバイルへ送る構成にする。
# Gemini 自身の音声は使わず破棄する。
GEMINI_API_KEY = os.getenv("API_KEY")
GEMINI_MODEL_ID = "gemini-3.1-flash-live-preview"
# session_resumption: 接続が切れても直前までの会話状態を引き継いで再接続できる。
# context_window_compression: スライディングウィンドウで長時間セッションでも切れにくくする。
GEMINI_LIVE_CONFIG = {
    "response_modalities": ["AUDIO"],
    "output_audio_transcription": {},
    "context_window_compression": {"sliding_window": {}},
}

# ------- Fish Audio TTS -------
FISH_API_KEY = os.getenv("FISH_API_KEY")
# ヤチヨの声: https://fish.audio/m/dce8b25c992d434d80ac6763a3d1e4aa
FISH_VOICE_ID = "dce8b25c992d434d80ac6763a3d1e4aa"
# 現在無料で使える s2 pro free。
# SDK の型は "s2-pro" 等しか宣言していないが、値はそのまま "model" ヘッダーに
# 渡されるだけなので、API が受け付ける "s2.1-pro-free" を指定できる。
FISH_MODEL = "s2.1-pro-free"
# WAV で受け取り、サーバー側で 48kHz PCM にデコードして WebRTC の
# 下りトラックへ流す（WAV はヘッダにサンプルレートを持つため誤解釈がない）
FISH_FORMAT = "wav"

# ------- サーバー -------
HOST = "0.0.0.0"
PORT = 8080
# クライアントからの音声/画像チャンクを許容するため大きめに取る
MAX_HTTP_BUFFER_SIZE = 100 * 1024 * 1024
