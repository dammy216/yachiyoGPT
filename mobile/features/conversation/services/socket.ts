import { io, type Socket } from "socket.io-client";
import { SERVER_URL } from "@/shared/config/env";
import type { GeminiAudioResponse, MediaChunk } from "../types";

/**
 * server (main.py) の Socket.IO エンドポイントと話すための薄いラッパー。
 *
 * サーバー側イベント（server/features/ の各 slice 参照）:
 *   emit: start_session / send_audio_chunk / send_image_frame / end_session
 *   on  : gemini_response (Fish Audio TTS で音声化した MP3 / ターンごとに 1 つ)
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

/** 音声チャンク（base64 PCM）を送信する */
export const sendAudioChunk = (data: string): void => {
  const chunk: MediaChunk = { mime_type: "audio/pcm", data };
  socket.emit("send_audio_chunk", chunk);
};

/** 画像フレーム（base64 JPEG）を送信する */
export const sendImageFrame = (data: string): void => {
  const chunk: MediaChunk = { mime_type: "image/jpeg", data };
  socket.emit("send_image_frame", chunk);
};

/**
 * Gemini の応答音声（Fish Audio TTS の MP3）を購読する。
 * 返り値の関数を呼ぶと購読解除できる（useEffect の cleanup 用）。
 */
export const onGeminiResponse = (
  handler: (audio: GeminiAudioResponse) => void
): (() => void) => {
  socket.on("gemini_response", handler);
  return () => {
    socket.off("gemini_response", handler);
  };
};

/** Gemini のターン完了を購読する */
export const onTurnComplete = (handler: () => void): (() => void) => {
  socket.on("turn_complete", handler);
  return () => {
    socket.off("turn_complete", handler);
  };
};
