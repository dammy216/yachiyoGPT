import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import AudioRecord from "react-native-audio-record";
import RNFS from "react-native-fs";
import { Audio } from "expo-av";

import { endSession, onGeminiResponse, onTurnComplete, sendAudioChunk, startSession } from "../services/socket";
import { useAudioSettings } from "./useAudioSettings";
import type { GeminiAudioResponse } from "../types";

/**
 * Gemini とのマルチモーダル会話セッション（音声）を統括するフック。
 *
 * - マイク音声(PCM)を Socket.IO 経由でストリーミング
 * - Gemini はテキストで応答し、サーバーが Fish Audio TTS で音声化(MP3)した
 *   ものを受信して再生（ターン完了時に一括スピーカー再生）
 */
export const useGeminiSession = () => {
  const audioSetting = useAudioSettings();
  const [isRecording, setIsRecording] = useState(false);

  const audioChunks = useRef<Buffer[]>([]);
  const recordingRef = useRef(false);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: true });
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
      try {
        await RNFS.writeFile(path, mp3.toString("base64"), "base64");

        // 録音を一時停止してスピーカーモードに切り替え
        const wasRecording = recordingRef.current;
        if (wasRecording) AudioRecord.stop();
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });

        const sound = new Audio.Sound();
        // 再生完了の監視は loadAsync より先に登録する（短い音声の取りこぼし防止）
        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log("[audio] 再生完了");
            await sound.unloadAsync();
            RNFS.unlink(path).catch(() => {});
            // 録音モードに戻して録音を再開
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: true });
            if (wasRecording) AudioRecord.start();
          }
        });
        await sound.loadAsync({ uri: `file://${path}` });
        await sound.playAsync();
      } catch (e) {
        console.error("[audio] 再生エラー:", e);
        RNFS.unlink(path).catch(() => {});
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: true });
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
