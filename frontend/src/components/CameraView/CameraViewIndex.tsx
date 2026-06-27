import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AudioRecord from "react-native-audio-record";
import { Camera, useCameraPermission } from "react-native-vision-camera";
import io from "socket.io-client";
import * as FileSystem from 'expo-file-system';
import { Ionicons } from "@expo/vector-icons";
import { useCameraSettings } from "@/src/hooks/useCameraSettings";
import { useAudioSettings } from "@/src/hooks/useAudioSettings";
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';

const socket = io("http://192.168.32.158:8080");

const CameraViewIndex = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const { device, format, photoQuality } = useCameraSettings();
  const audioSetting = useAudioSettings();

  const [isRecording, setIsRecording] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const imageIntervalRef = useRef<number | null>(null);

  useEffect(() => {
  const handleGeminiAudio = async (wavArrayBuffer: any) => {
    const path = RNFS.CachesDirectoryPath + '/gemini_resp.wav';
    await RNFS.writeFile(path, Buffer.from(wavArrayBuffer).toString('base64'), 'base64');

    const sound = new Sound(path, '', (error) => {
      if (!error) sound.play();
      else console.error("音声ロードエラー:", error);
    });
  };

  socket.on('gemini_response', handleGeminiAudio);

  return () => {
    socket.off('gemini_response', handleGeminiAudio);
  };
}, []);

  // 権限チェック
  useEffect(() => {
    if (hasPermission === false) {
      requestPermission();
    }
    AudioRecord.init(audioSetting);
  }, [hasPermission, requestPermission]);

  // --- 音声＋画像ストリーミング開始 ---
  const startRecording = () => {
    setIsRecording(true);
    socket.emit("start_session", {});

    // 音声ストリーミング
    AudioRecord.start();
    AudioRecord.on("data", (data) => {
      socket.emit("send_audio_chunk", { mime_type: "audio/pcm", data, });
    });

    // 1秒ごとにカメラプレビューのJPEGフレームを送信
    imageIntervalRef.current = setInterval(() => {
      (async () => {
        try {
          const frame = (await cameraRef.current?.takePhoto({ enableShutterSound: false }));
          if (frame) {
            const base64Frame = await FileSystem.readAsStringAsync(frame.path, { encoding: FileSystem.EncodingType.Base64 });
            socket.emit("send_image_frame", { mime_type: "image/jpeg", data: base64Frame });
          }
        } catch (e) {
          console.error("画像送信エラー:", e);
        }
      })();
    }, 300);
  };

  // --- ストリーミング停止 ---
  const stopRecording = () => {
    setIsRecording(false);
    AudioRecord.stop();

    socket.emit("end_session", {});

    if (imageIntervalRef.current) {
      clearInterval(imageIntervalRef.current);
      imageIntervalRef.current = null;
    }
  };

  if (!device || !hasPermission) {
    return <View style={styles.permission}><Text>カメラ/マイク権限がありません</Text></View>;
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
        <TouchableOpacity
          style={styles.recordButton}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons name="radio-button-on-outline" size={80} color={isRecording ? "red" : "white"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111"
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
    alignSelf: 'center',
    position: 'absolute',
    bottom: 10,
  },
  permission: {
    flex: 1, alignItems: "center",
    justifyContent: "center"
  },
});

export default CameraViewIndex;
