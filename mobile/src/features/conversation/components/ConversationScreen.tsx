import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, useCameraPermission } from "react-native-vision-camera";

import { useCameraSettings } from "../hooks/useCameraSettings";
import { useGeminiSession } from "../hooks/useGeminiSession";

/**
 * Gemini とマルチモーダル会話する画面。
 * カメラプレビューを映しつつ、録音ボタンで音声＋映像のストリーミングを開始/停止する。
 */
const ConversationScreen = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const { device, format, photoQuality } = useCameraSettings();

  const cameraRef = useRef<Camera>(null);
  const { isRecording, toggle } = useGeminiSession(cameraRef);

  // カメラ権限チェック
  useEffect(() => {
    if (hasPermission === false) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (!device || !hasPermission) {
    return (
      <View style={styles.permission}>
        <Text>カメラ/マイク権限がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
        photoQualityBalance={photoQuality}
        format={format}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.recordButton} onPress={toggle}>
          <Ionicons
            name="radio-button-on-outline"
            size={80}
            color={isRecording ? "red" : "white"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  camera: {
    flex: 3,
    aspectRatio: 1 / 1,
    alignSelf: "center",
    overflow: "hidden",
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    gap: 32,
  },
  recordButton: {
    alignSelf: "center",
    position: "absolute",
    bottom: 10,
  },
  permission: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ConversationScreen;
