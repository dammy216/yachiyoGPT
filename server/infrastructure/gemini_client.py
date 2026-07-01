"""Gemini API クライアント（プロセスで 1 つ）。"""

from google import genai

from settings import GEMINI_API_KEY

gemini_client = genai.Client(api_key=GEMINI_API_KEY)
