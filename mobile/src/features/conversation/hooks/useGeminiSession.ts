import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import AudioRecord from "react-native-audio-record";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";
import type { Camera } from "react-native-vision-camera";

import {
  endSession,
  onGeminiResponse,
  sendAudioChunk,
  sendImageFrame,
  startSession,
} from "../api/socket";
import { useAudioSettings } from "./useAudioSettings";
import type { GeminiAudioResponse } from "../types";

/** カメラフレームを送信する間隔（ミリ秒） */
const FRAME_INTERVAL_MS = 300;

/**
 * Gemini とのマルチモーダル会話セッションを統括するフック。
 *
 * - マイク音声(PCM)を Socket.IO 経由でストリーミング
 * - 一定間隔でカメラの JPEG フレームを送信
 * - Gemini からの音声応答を受信して再生
 *
 * UI（カメラプレビューと録音ボタン）からはこのフックだけを使えばよい。
 */
export const useGeminiSession = (cameraRef: React.RefObject<Camera | null>) => {
  const audioSetting = useAudioSettings();

  const [isRecording, setIsRecording] = useState(false);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // マイク初期化 & Gemini 応答の受信ハンドラ登録
  useEffect(() => {
    AudioRecord.init(audioSetting);

    const handleGeminiAudio = async (audio: GeminiAudioResponse) => {
      try {
        const path = `${RNFS.CachesDirectoryPath}/gemini_resp.wav`;
        await RNFS.writeFile(path, Buffer.from(audio as ArrayBuffer).toString("base64"), "base64");

        const sound = new Sound(path, "", (error) => {
          if (error) {
            console.error("音声ロードエラー:", error);
            return;
          }
          sound.play((success) => {
            if (!success) console.error("音声再生に失敗しました");
            sound.release();
          });
        });
      } catch (e) {
        console.error("Gemini 応答の再生エラー:", e);
      }
    };

    const unsubscribe = onGeminiResponse(handleGeminiAudio);
    return unsubscribe;
    // audioSetting は固定値なのでマウント時に一度だけ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 音声＋画像ストリーミング開始 */
  const start = useCallback(() => {
    setIsRecording(true);
    startSession();

    // 音声ストリーミング
    AudioRecord.start();
    AudioRecord.on("data", (data: string) => {
      sendAudioChunk(data);
    });

    // 一定間隔でカメラプレビューの JPEG フレームを送信
    frameIntervalRef.current = setInterval(() => {
      void (async () => {
        try {
          const frame = await cameraRef.current?.takePhoto({ enableShutterSound: false });
          if (frame) {
            const base64Frame = await RNFS.readFile(frame.path, "base64");
            sendImageFrame(base64Frame);
          }
        } catch (e) {
          console.error("画像送信エラー:", e);
        }
      })();
    }, FRAME_INTERVAL_MS);
  }, [cameraRef]);

  /** ストリーミング停止 */
  const stop = useCallback(() => {
    setIsRecording(false);
    AudioRecord.stop();
    endSession();

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  /** ボタン用トグル */
  const toggle = useCallback(() => {
    if (isRecording) stop();
    else start();
  }, [isRecording, start, stop]);

  return { isRecording, start, stop, toggle };
};
