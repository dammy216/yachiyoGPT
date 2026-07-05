"""slice: rtc — WebRTC シグナリング。

シグナリングは既存の Socket.IO で行う。トリクル ICE は使わず、
両側とも ICE 収集完了後の SDP をまるごと交換する（LAN 前提）。

上り: モバイルのマイク音声トラック → Gemini Live（uplink.py）
下り: Fish TTS の音声 → TTSAudioTrack → モバイル（自動再生）
"""

import asyncio

from aiortc import RTCPeerConnection, RTCSessionDescription

from features.rtc.tts_track import TTSAudioTrack
from features.rtc.uplink import forward_audio_to_gemini
from infrastructure.session_store import store
from infrastructure.socket_server import sio


@sio.event
async def webrtc_offer(sid, data):
    state = store.get_or_create(sid)

    # 前の接続が残っていれば閉じる（再接続時）
    if state.pc:
        await state.pc.close()

    pc = RTCPeerConnection()
    state.pc = pc
    state.tts_track = TTSAudioTrack()
    pc.addTrack(state.tts_track)

    @pc.on("track")
    def on_track(track):
        if track.kind == "audio":
            asyncio.create_task(forward_audio_to_gemini(track, sid))

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"[rtc] {sid} connection state: {pc.connectionState}")
        if pc.connectionState == "failed":
            await pc.close()

    await pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"], type=data["type"]))
    answer = await pc.createAnswer()
    # aiortc は setLocalDescription 内で ICE 収集の完了まで待つ
    await pc.setLocalDescription(answer)
    await sio.emit(
        "webrtc_answer",
        {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type},
        to=sid,
    )
    print(f"[rtc] {sid} answer を送信しました")
