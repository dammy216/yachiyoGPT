import { useEffect, useRef } from "react";
import { Buffer } from "buffer";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import RNFS from "react-native-fs";
import type { Camera } from "react-native-vision-camera";

import { sendImageFrame } from "@/features/conversation";

/** カメラフレームを送信する間隔（ミリ秒）。Gemini Live API の上限は 1fps */
const FRAME_INTERVAL_MS = 1000;
/** Gemini へ送るフレームの横幅（px）。これ以上の解像度は帯域の無駄になる */
const FRAME_WIDTH = 640;
/** JPEG 圧縮率（0-1）。映像コンテキスト用途なので画質より軽さを優先 */
const FRAME_COMPRESS = 0.6;

/**
 * `active` の間だけ、一定間隔でカメラの JPEG フレームを Gemini へ送信する。
 *
 * カメラ画面を開いていて、かつ会話中(isRecording)のときに `active=true` にする。
 * これにより通常（キャラ表示）モードでは映像は送られず、
 * カメラモードのときだけ音声＋映像のマルチモーダル送信になる。
 *
 * 撮影した写真は 640px 以下になるようリサイズ・再圧縮してからバイナリで送る。
 * フル解像度のまま送ると 1 枚数 MB になり、同じ Wi-Fi を流れる
 * WebRTC 音声（ヤチヨの声）を圧迫して途切れの原因になる。
 *
 * カメラ側の photoResolution 指定はあくまで「一番近いフォーマットを選ぶ」
 * ヒントであり、その解像度での撮影を保証しない（実際の解像度は端末依存）。
 * そのため実際に撮れた photo.width を見て、既に 640px 以下ならリサイズを
 * スキップする（拡大してしまうのを防ぐ）。
 */
export const useFrameStreaming = (
  cameraRef: React.RefObject<Camera | null>,
  active: boolean
) => {
  // 前のフレームの処理中に次の tick が重ならないようにする
  const busyRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => {
      void (async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        let photoPath: string | null = null;
        let resizedUri: string | null = null;
        try {
          const photo = await cameraRef.current?.takePhoto({ enableShutterSound: false });
          if (!photo) return;
          photoPath = photo.path;
          console.log(
            `[frame] 撮影結果: ${photo.width}x${photo.height} (orientation=${photo.orientation})`
          );

          const context = ImageManipulator.manipulate(`file://${photo.path}`);
          // 既に目標幅以下なら拡大になってしまうのでリサイズしない
          if (photo.width > FRAME_WIDTH) {
            context.resize({ width: FRAME_WIDTH });
          }
          const rendered = await context.renderAsync();
          const result = await rendered.saveAsync({
            format: SaveFormat.JPEG,
            compress: FRAME_COMPRESS,
            base64: true,
          });
          resizedUri = result.uri;
          console.log(
            `[frame] 送信結果: ${result.width}x${result.height}, ${result.base64?.length ?? 0} bytes(base64換算)`
          );

          if (result.base64) {
            sendImageFrame(Buffer.from(result.base64, "base64"));
          }
        } catch (e) {
          console.error("画像送信エラー:", e);
        } finally {
          // takePhoto / リサイズが吐いた一時ファイルはキャッシュに溜まるので消す
          if (photoPath) RNFS.unlink(photoPath).catch(() => {});
          if (resizedUri) RNFS.unlink(resizedUri.replace("file://", "")).catch(() => {});
          busyRef.current = false;
        }
      })();
    }, FRAME_INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, cameraRef]);
};
