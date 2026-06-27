import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassPanel, colors } from "@/shared";

type Props = {
  /** 会話中（録音中）か */
  isRecording: boolean;
  /** マイクのトグル（実機能：音声マルチモーダルの開始/停止） */
  onToggleMic: () => void;
};

type RoundButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  size?: number;
};

const RoundButton = ({ icon, onPress, active, size = 64 }: RoundButtonProps) => (
  <GlassPanel
    radius={size / 2}
    intensity={active ? 60 : 28}
    style={[
      { width: size, height: size },
      active && styles.activeGlass,
    ]}
  >
    <TouchableOpacity style={styles.buttonInner} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={icon}
        size={size * 0.42}
        color={active ? colors.recording : colors.text}
      />
    </TouchableOpacity>
  </GlassPanel>
);

/**
 * 画面下部の操作ボタン列。
 * 設定・表情・スピーカーは見た目のみ（モック）。マイクのみ実機能。
 */
export const BottomControls = ({ isRecording, onToggleMic }: Props) => {
  // スピーカーのミュート切替（見た目のみ）
  const [muted, setMuted] = useState(false);

  return (
    <View style={styles.row}>
      <RoundButton icon="settings-outline" onPress={() => {}} />
      <RoundButton icon="happy-outline" onPress={() => {}} />
      <RoundButton
        icon={muted ? "volume-mute" : "volume-high"}
        onPress={() => setMuted((m) => !m)}
      />
      <RoundButton
        icon={isRecording ? "mic" : "mic-outline"}
        onPress={onToggleMic}
        active={isRecording}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  buttonInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlass: {
    borderColor: colors.recording,
    borderWidth: 1.5,
  },
});
