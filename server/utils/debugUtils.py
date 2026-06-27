import sounddevice as sd
import numpy as np
from PIL import Image
import io

def play_client_pcm(pcm_data, samplerate=16000):
    try:
        # PCMデータをnumpy配列に変換（int16型でリトルエンディアンを想定）
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)

        sd.play(audio_array, samplerate=samplerate)

        # 再生完了まで待機
        sd.wait()
    except Exception as e:
        print(f"音声再生エラー: {e}")
        

async def play_gemini_pcm(audio_queue):
    with sd.OutputStream(samplerate=24000, channels=1, dtype='int16') as stream:
        while True:
            data = await audio_queue.get()
            audio_array = np.frombuffer(data, dtype=np.int16)
            stream.write(audio_array)

        

def show_image(image_data: bytes):
    try:
        # バイトデータを画像として読み込む
        image = Image.open(io.BytesIO(image_data))

        # 画像を表示（別ウィンドウで開く）
        image.show()
    except Exception as e:
        print(f"画像表示エラー: {e}")