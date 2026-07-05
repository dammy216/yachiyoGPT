import { io, type Socket } from "socket.io-client";
import { SERVER_URL } from "@/shared/config/env";
import type { MediaChunk, SessionDescription } from "../types";

/**
 * server (main.py) の Socket.IO エンドポイントと話すための薄いラッパー。
 *
 * サーバー側イベント（server/features/ の各 slice 参照）:
 *   emit: start_session / end_session / webrtc_offer / send_image_frame
 *   on  : webrtc_answer / turn_complete
 *
 * 音声はここを通らず WebRTC のトラックで双方向に流れる（services/webrtc.ts）。
 */

/** アプリ全体で 1 本だけ張る Socket.IO コネクション */
export const socket: Socket = io(SERVER_URL);

/** Gemini セッションを開始する */
export const startSession = (): void => {
  socket.emit("start_session", {});
};

/** Gemini セッションを終了する */
export const endSession = (): void => {
  socket.emit("end_session", {});
};

/** WebRTC の offer SDP を送信する（ICE 収集完了後のものを送る） */
export const sendWebrtcOffer = (offer: SessionDescription): void => {
  socket.emit("webrtc_offer", offer);
};

/**
 * WebRTC の answer SDP を購読する。
 * 返り値の関数を呼ぶと購読解除できる。
 */
export const onWebrtcAnswer = (
  handler: (answer: SessionDescription) => void
): (() => void) => {
  socket.on("webrtc_answer", handler);
  return () => {
    socket.off("webrtc_answer", handler);
  };
};

/** 画像フレーム（JPEG バイナリ）を送信する。base64 より 25% ほど軽い */
export const sendImageFrame = (data: Uint8Array): void => {
  const chunk: MediaChunk = { mime_type: "image/jpeg", data };
  socket.emit("send_image_frame", chunk);
};

/** Gemini のターン完了を購読する（口パク連動などに使える） */
export const onTurnComplete = (handler: () => void): (() => void) => {
  socket.on("turn_complete", handler);
  return () => {
    socket.off("turn_complete", handler);
  };
};
