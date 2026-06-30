import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CameraStage } from "@/features/camera";
import { CharacterView } from "@/features/character";
import { useGeminiSession } from "@/features/conversation";
import { StarryBackground, colors } from "@/shared";

import { BottomControls } from "./BottomControls";
import { ChatInputBar } from "./ChatInputBar";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

/**
 * キャラクター表示枠の下端（画面下からのオフセット）。
 * 返答UIを下部に出しても顔が隠れないよう、やや高め（=大きめ）に取って上に寄せる。
 */
const CHARACTER_BOTTOM = 230;

/**
 * アプリのメイン画面。
 *
 * 通常モード … 星空背景＋ヤチヨを全画面表示。マイクで音声マルチモーダル会話。
 * カメラモード … CAPTURE でカメラ映像に切替え、ヤチヨを右上に小さく表示。
 *                録音中は音声＋映像を Gemini に送信する。
 *
 * Rive のキャラクターはモード切替で再読込されないよう常時マウントし、
 * 配置スタイル（全画面 ⇄ 右上サムネ）だけを切り替える。
 */
export const HomeScreen = () => {
  const { isRecording, toggle } = useGeminiSession();
  const [cameraMode, setCameraMode] = useState(false);

  return (
    <View style={styles.root}>
      <StarryBackground />

      {cameraMode && <CameraStage isRecording={isRecording} />}

      {/* キャラクターは常時マウント。配置だけ切り替える */}
      {/* 通常モードは角丸フレームで囲み、.riv 側の見切れをフレーム端に揃えて隠す */}
      <View
        style={cameraMode ? styles.thumbWrap : styles.fullWrap}
        pointerEvents={cameraMode ? "none" : "auto"}
      >
        <CharacterView variant={cameraMode ? "thumbnail" : "full"} />
      </View>

      {/* UIオーバーレイ。box-none で空き領域のタッチはキャラに通す（目追従などのため） */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <TopBar cameraMode={cameraMode} onToggleCamera={() => setCameraMode((v) => !v)} />

        <View style={styles.bottom} pointerEvents="box-none">
          <BottomControls isRecording={isRecording} onToggleMic={toggle} />
          <ChatInputBar />
          <Footer />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.skyBottom,
  },
  fullWrap: {
    position: "absolute",
    top: 110,
    bottom: CHARACTER_BOTTOM - 20,
    left: 32,
    right: 32,
    // キャラを枠下端に揃える
    justifyContent: "flex-end",
    // .riv の見切れをフレーム端でクリップして「意図したフレーム表示」に見せる
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    overflow: "hidden",
  },
  thumbWrap: {
    position: "absolute",
    top: 110,
    right: 14,
    width: 96,
    height: 128,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassStrong,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  bottom: {
    gap: 14,
    paddingBottom: 6,
  },
});
