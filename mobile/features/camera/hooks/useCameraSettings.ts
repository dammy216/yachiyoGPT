import { useCameraDevice, useCameraFormat } from "react-native-vision-camera";

/**
 * 背面カメラのデバイス・フォーマットをまとめて返す。
 *
 * takeSnapshot()（プレビューからの軽量スナップショット）を使うため、
 * video 用のフォーマットヒントを指定する（あくまで候補へのヒントで、
 * 実際のサイズは端末依存。送信前に useFrameStreaming 側で 640px に
 * リサイズするため、ここはなるべく小さいフォーマットを要求するだけ）。
 */
export const useCameraSettings = () => {
  const device = useCameraDevice("back");

  const format = useCameraFormat(device, [
    { videoResolution: { width: 640, height: 480 } },
  ]);

  return { device, format };
};
