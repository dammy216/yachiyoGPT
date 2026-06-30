import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import AudioRecord from "react-native-audio-record";
import RNFS from "react-native-fs";
import { Audio } from "expo-av";

import { endSession, onGeminiResponse, sendAudioChunk, startSession } from "../services/socket";
import { useAudioSettings } from "./useAudioSettings";
import type { GeminiAudioResponse } from "../types";

/**
 * Gemini とのマルチモーダル会話セッション（音声）を統括するフック。
 *
 * - マイク音声(PCM)を Socket.IO 経由でストリーミング
 * - Gemini からの音声応答を受信して再生
 *
 * カメラ映像フレームの送信は camera feature の `useFrameStreaming` が担当する。
 * このフックは「会話中かどうか(isRecording)」を一元管理し、
 * その状態を見て映像送信のON/OFFが切り替わる。
 */
export const useGeminiSession = () => {
  const audioSetting = useAudioSettings();
  const [isRecording, setIsRecording] = useState(false);

  const audioQueue = useRef<string[]>([]);
  const isPlaying = useRef(false);
  const chunkIndex = useRef(0);
  const playNextRef = useRef<() => Promise<void>>();

  const playNext = useCallback(async () => {
    const path = audioQueue.current.shift();
    if (!path) {
      isPlaying.current = false;
      return;
    }
    isPlaying.current = true;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: `file://${path}` },
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          RNFS.unlink(path).catch(() => {});
          playNextRef.current?.();
        }
      });
    } catch (e) {
      console.error("[audio] 再生エラー:", e);
      RNFS.unlink(path).catch(() => {});
      playNextRef.current?.();
    }
  }, []);

  playNextRef.current = playNext;

  // マイク初期化 & Gemini 応答の受信ハンドラ登録
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
    });
    AudioRecord.init(audioSetting);

    const handleGeminiAudio = async (audio: GeminiAudioResponse) => {
      try {
        const pcm = Buffer.from(audio as ArrayBuffer);
        const wavHeader = createWavHeader(pcm.length);
        const wav = Buffer.concat([wavHeader, pcm]);
        const path = `${RNFS.CachesDirectoryPath}/gemini_${chunkIndex.current++}.wav`;
        await RNFS.writeFile(path, wav.toString("base64"), "base64");
        audioQueue.current.push(path);
        if (!isPlaying.current) playNextRef.current?.();
      } catch (e) {
        console.error("Gemini 応答の再生エラー:", e);
      }
    };

    const unsubscribe = onGeminiResponse(handleGeminiAudio);
    return unsubscribe;
    // audioSetting は固定値なのでマウント時に一度だけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useCallback の依存を増やさず最新の録音状態を参照するためのフラグ
  const recordingRef = useRef(false);

  /** 音声ストリーミング開始 */
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

  /** ストリーミング停止 */
  const stop = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);
    AudioRecord.stop();
    endSession();
  }, []);

  /** ボタン用トグル */
  const toggle = useCallback(() => {
    if (recordingRef.current) stop();
    else start();
  }, [start, stop]);

  return { isRecording, start, stop, toggle };
};

function createWavHeader(pcmLength: number, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmLength, 40);
  return header;
}
