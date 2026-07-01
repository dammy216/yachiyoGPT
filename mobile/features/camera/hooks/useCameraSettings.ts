import { useCameraDevice, useCameraFormat } from "react-native-vision-camera";
import type { CameraQuality } from "../types";

/**
 * 背面カメラのデバイス・フォーマット・撮影品質をまとめて返す。
 * Gemini へ送るフレームは正方形（1024x1024）・速度優先。
 */
export const useCameraSettings = () => {
  const device = useCameraDevice("back");

  const format = useCameraFormat(device, [
    { photoResolution: { width: 512, height: 512 } },
  ]);

  const photoQuality: CameraQuality = "speed";

  return { device, format, photoQuality };
};
