"""Fish Audio TTS クライアント（プロセスで 1 つ）。

FISH_API_KEY を環境変数から自動で読む（settings.py の load_dotenv 済み）。
"""

from fishaudio import AsyncFishAudio

fish_client = AsyncFishAudio()
