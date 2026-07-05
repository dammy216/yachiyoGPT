import {
  mediaDevices,
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";
import InCallManager from "react-native-incall-manager";

import { onWebrtcAnswer, sendWebrtcOffer } from "./socket";

/**
 * server の aiortc と WebRTC で接続し、マイク音声(上り)とヤチヨの声(下り)を
 * 双方向ストリーミングする。
 *
 * - AEC(エコーキャンセル)は WebRTC 標準機能。スピーカー再生中もマイクを
 *   常時 ON にでき、発話への割り込みができる
 * - シグナリングは Socket.IO。トリクル ICE は使わず、ICE 収集完了後の
 *   SDP をまるごと交換する（LAN 前提。server 側 aiortc も同じ方式）
 * - 下りトラック（ヤチヨの声）は react-native-webrtc が自動再生する
 */

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let unsubAnswer: (() => void) | null = null;

const waitIceGatheringComplete = async (connection: RTCPeerConnection): Promise<void> => {
  // LAN 前提なので収集は一瞬で終わる想定。保険として 3 秒で打ち切る
  const deadline = Date.now() + 3000;
  while (connection.iceGatheringState !== "complete" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

/** マイクを取得して server と WebRTC 接続を確立する */
export const connectWebrtc = async (): Promise<void> => {
  disconnectWebrtc(); // 二重接続防止

  // 通話向けオーディオモードにしてスピーカーへルーティング
  InCallManager.start({ media: "audio" });
  InCallManager.setForceSpeakerphoneOn(true);

  localStream = await mediaDevices.getUserMedia({ audio: true });

  pc = new RTCPeerConnection({ iceServers: [] });
  const stream = localStream;
  stream.getAudioTracks().forEach((track) => pc?.addTrack(track, stream));

  unsubAnswer = onWebrtcAnswer(async (answer) => {
    unsubAnswer?.();
    unsubAnswer = null;
    await pc?.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("[webrtc] answer を受信して接続を確立しました");
  });

  const offer = await pc.createOffer({});
  await pc.setLocalDescription(offer);
  await waitIceGatheringComplete(pc);

  const local = pc.localDescription;
  if (!local?.type) throw new Error("localDescription がありません");
  sendWebrtcOffer({ sdp: local.sdp, type: local.type });
};

/** WebRTC 接続とマイクを閉じる */
export const disconnectWebrtc = (): void => {
  unsubAnswer?.();
  unsubAnswer = null;
  localStream?.getTracks().forEach((track) => track.stop());
  localStream = null;
  pc?.close();
  pc = null;
  InCallManager.stop();
};
