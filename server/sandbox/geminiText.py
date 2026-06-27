import asyncio
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

# 最新版では API キーを明示的に渡す
client = genai.Client(
    api_key=os.getenv("API_KEY"),  # ※セキュリティ上、実際は環境変数で管理してください
    http_options={"api_version": "v1alpha"}
)

model = "gemini-2.0-flash-live-001"

# 応答形式を TEXT に限定
config = {
    "response_modalities": ["TEXT"]
}

async def main():
    async with client.aio.live.connect(model=model, config=config) as session:
        while True:
            message = input("User> ")
            if message.lower() == "exit":
                break
            await session.send(input=message, end_of_turn=True)

            async for response in session.receive():
                if response.text is None:
                    continue
                print(response.text, end="")

if __name__ == "__main__":
    asyncio.run(main())
