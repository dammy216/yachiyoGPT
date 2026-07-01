/**
 * conversation feature の型定義。
 * server (Socket.IO / Gemini Live) とやり取りするペイロードの形を表す。
 */

/** クライアント -> サーバー へ送るチャンク（音声・画像共通） */
export type MediaChunk = {
  mime_type: "audio/pcm" | "image/jpeg";
  data: string; // base64
};

/** サーバー -> クライアント の応答音声（Fish Audio TTS の MP3 / ArrayBuffer 相当） */
export type GeminiAudioResponse = ArrayBuffer | Uint8Array | number[];

/** react-native-audio-record の初期化オプション */
export type AudioRecordOptions = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  audioSource: number;
  wavFile: string;
};
