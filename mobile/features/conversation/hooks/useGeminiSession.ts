import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import AudioRecord from "react-native-audio-record";
import RNFS from "react-native-fs";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { endSession, onGeminiResponse, onTurnComplete, sendAudioChunk, startSession } from "../services/socket";
import { useAudioSettings } from "./useAudioSettings";
import type { GeminiAudioResponse } from "../types";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// mp3 を再生し、再生完了(didJustFinish)まで待つ
const playFile = (uri: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const player = createAudioPlayer({ uri });
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player.remove();
        resolve();
      }
    });
    try {
      player.play();
    } catch (e) {
      subscription.remove();
      player.remove();
      reject(e);
    }
  });

/**
 * Gemini とのマルチモーダル会話セッション（音声）を統括するフック。
 *
 * - マイク音声(PCM)を Socket.IO 経由でストリーミング
 * - Gemini の応答テキストをサーバーが Fish Audio TTS で音声化(MP3)した
 *   ものを受信して再生（ターン完了時に一括スピーカー再生）
 */
export const useGeminiSession = () => {
  const audioSetting = useAudioSettings();
  const [isRecording, setIsRecording] = useState(false);

  const audioChunks = useRef<Buffer[]>([]);
  const recordingRef = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    AudioRecord.init(audioSetting);

    const handleGeminiAudio = (audio: GeminiAudioResponse) => {
      const buf = Buffer.from(audio as ArrayBuffer);
      console.log("[audio] gemini_response 受信:", buf.length, "bytes");
      audioChunks.current.push(buf);
    };

    const handleTurnComplete = async () => {
      console.log("[audio] turn_complete: chunks =", audioChunks.current.length);
      if (audioChunks.current.length === 0) return;

      // Fish Audio TTS が返す完成済み MP3（ターンごとに 1 つ）
      const mp3 = Buffer.concat(audioChunks.current);
      audioChunks.current = [];
      console.log("[audio] MP3 再生開始:", mp3.length, "bytes");

      const path = `${RNFS.CachesDirectoryPath}/gemini_response.mp3`;
      const uri = `file://${path}`;
      const wasRecording = recordingRef.current;
      try {
        await RNFS.writeFile(path, mp3.toString("base64"), "base64");

        // 録音を一時停止してスピーカーモードに切り替え。
        // 停止直後は AVAudioSession の切り替えがまだ不安定なため少し待つ
        // （react-native-audio-record と expo-audio が同じセッションを取り合うため）
        if (wasRecording) {
          AudioRecord.stop();
          await sleep(150);
        }
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });

        try {
          await playFile(uri);
        } catch (e) {
          console.warn("[audio] 再生リトライ:", e);
          await sleep(200);
          await playFile(uri);
        }
        console.log("[audio] 再生完了");
      } catch (e) {
        console.error("[audio] 再生エラー:", e);
      } finally {
        RNFS.unlink(path).catch(() => {});
        // 録音モードに戻して録音を再開
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
        if (wasRecording) AudioRecord.start();
      }
    };

    const unsubAudio = onGeminiResponse(handleGeminiAudio);
    const unsubTurn = onTurnComplete(handleTurnComplete);
    return () => {
      unsubAudio();
      unsubTurn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (recordingRef.current) return;
    recordingRef.current = true;
    setIsRecording(true);
    startSession();
    AudioRecord.start();
    AudioRecord.on("data", (data: string) => {
      sendAudioChunk(data);
    });
  }, []);

  const stop = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);
    AudioRecord.stop();
    endSession();
  }, []);

  const toggle = useCallback(() => {
    if (recordingRef.current) stop();
    else start();
  }, [start, stop]);

  return { isRecording, start, stop, toggle };
};
