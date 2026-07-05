import { useCallback, useRef, useState } from "react";

import { endSession, startSession } from "../services/socket";
import { connectWebrtc, disconnectWebrtc } from "../services/webrtc";

/**
 * Gemini とのマルチモーダル会話セッション（音声）を統括するフック。
 *
 * - マイク音声は WebRTC の上りトラックで server → Gemini へ常時ストリーミング
 * - ヤチヨの声（Fish Audio TTS）は WebRTC の下りトラックとして届き自動再生される
 * - AEC(エコーキャンセル)により再生中もマイクは生きたままなので、
 *   ヤチヨの発話への割り込みができる
 */
export const useGeminiSession = () => {
  const [isRecording, setIsRecording] = useState(false);
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsRecording(true);
    try {
      startSession();
      await connectWebrtc();
    } catch (e) {
      console.error("[session] WebRTC 接続エラー:", e);
      disconnectWebrtc();
      endSession();
      activeRef.current = false;
      setIsRecording(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setIsRecording(false);
    disconnectWebrtc();
    endSession();
  }, []);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  return { isRecording, start, stop, toggle };
};
