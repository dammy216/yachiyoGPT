"""Fish Audio TTS クライアント（プロセスで 1 つ）。"""

from fishaudio import AsyncFishAudio

from settings import FISH_API_KEY

fish_client = AsyncFishAudio(api_key=FISH_API_KEY)
