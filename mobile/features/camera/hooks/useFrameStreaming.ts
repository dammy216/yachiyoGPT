import { useEffect } from "react";
import RNFS from "react-native-fs";
import type { Camera } from "react-native-vision-camera";

import { sendImageFrame } from "@/features/conversation";

/** カメラフレームを送信する間隔（ミリ秒） */
const FRAME_INTERVAL_MS = 300;

/**
 * `active` の間だけ、一定間隔でカメラの JPEG フレームを Gemini へ送信する。
 *
 * カメラ画面を開いていて、かつ会話中(isRecording)のときに `active=true` にする。
 * これにより通常（キャラ表示）モードでは映像は送られず、
 * カメラモードのときだけ音声＋映像のマルチモーダル送信になる。
 */
export const useFrameStreaming = (
  cameraRef: React.RefObject<Camera | null>,
  active: boolean
) => {
  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
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

    return () => clearInterval(id);
  }, [active, cameraRef]);
};
