import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Camera, useCameraPermission } from "react-native-vision-camera";

import { useCameraSettings } from "../hooks/useCameraSettings";
import { useFrameStreaming } from "../hooks/useFrameStreaming";

type Props = {
  /** 会話中（録音中）か。true の間だけ映像フレームを送信する */
  isRecording: boolean;
};

/**
 * 全画面のカメラプレビュー。
 * CAPTURE を押してカメラモードに入ったときに表示される。
 * 録音中は一定間隔で JPEG フレームを Gemini に送る（音声＋映像のマルチモーダル）。
 */
export const CameraStage = ({ isRecording }: Props) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const { device, format } = useCameraSettings();
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useFrameStreaming(cameraRef, isRecording);

  if (!device || !hasPermission) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fallback]}>
        <Text style={styles.fallbackText}>カメラ／マイクの権限がありません</Text>
      </View>
    );
  }

  return (
    <Camera
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      video={true}
      format={format}
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  fallbackText: {
    color: "#fff",
  },
});
