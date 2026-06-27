import { io, type Socket } from "socket.io-client";
import { SERVER_URL } from "@/src/shared/config/env";
import type { GeminiAudioResponse, MediaChunk } from "../types";

/**
 * server (geminiSession.py) の Socket.IO エンドポイントと話すための薄いラッパー。
 *
 * サーバー側イベント（server/geminiSession.py 参照）:
 *   emit: start_session / send_audio_chunk / send_image_frame / end_session
 *   on  : gemini_response (Gemini の音声 PCM)
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
 * Gemini の音声応答を購読する。
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
