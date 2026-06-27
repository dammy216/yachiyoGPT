import { useCallback, useEffect, useRef, useState } from "react";
import { Buffer } from "buffer";
import AudioRecord from "react-native-audio-record";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";

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
