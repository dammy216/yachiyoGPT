import { useCameraDevice, useCameraFormat } from "react-native-vision-camera";
import type { CameraQuality } from "../types";

/**
 * 背面カメラのデバイス・フォーマット・撮影品質をまとめて返す。
 * なるべく小さい写真フォーマット・速度優先を要求する（あくまで候補への
 * ヒントで、実際のサイズは端末依存。送信前に useFrameStreaming 側で
 * 640px にリサイズするため、ここは撮影を軽くする目的）。
 */
export const useCameraSettings = () => {
  const device = useCameraDevice("back");

  const format = useCameraFormat(device, [
    { photoResolution: { width: 512, height: 512 } },
  ]);

  const photoQuality: CameraQuality = "speed";

  return { device, format, photoQuality };
};
