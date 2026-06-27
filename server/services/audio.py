import io
import wave
import numpy as np

async def pcm_to_wav_bytes(pcm_bytes, sample_rate=24000, channels=1, bits_per_sample=16):
    with io.BytesIO() as wav_io:
        with wave.open(wav_io, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(bits_per_sample // 8)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_bytes)
        wav_bytes = wav_io.getvalue()
    return wav_bytes