/**
 * conversation feature の型定義。
 * server (Socket.IO / WebRTC / Gemini Live) とやり取りするペイロードの形を表す。
 */

/** クライアント -> サーバー へ送る画像チャンク */
export type MediaChunk = {
  mime_type: "image/jpeg";
  data: Uint8Array; // JPEG バイナリ（Socket.IO がバイナリのまま運ぶ）
};

/** WebRTC シグナリングで交換する SDP */
export type SessionDescription = {
  sdp: string;
  type: string;
};
