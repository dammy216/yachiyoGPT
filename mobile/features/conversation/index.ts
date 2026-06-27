/**
 * conversation feature の公開 API。
 * 音声マルチモーダル会話のセッション制御を提供する。
 */
export { useGeminiSession } from "./hooks/useGeminiSession";
export { useAudioSettings } from "./hooks/useAudioSettings";
export { sendImageFrame } from "./api/socket";
export type { MediaChunk, GeminiAudioResponse } from "./types";
