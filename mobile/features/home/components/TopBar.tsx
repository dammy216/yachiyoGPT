import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassPanel, colors } from "@/shared";

type Props = {
  cameraMode: boolean;
  onToggleCamera: () => void;
  /** ハンバーガーメニュー（見た目のみ） */
  onMenu?: () => void;
};

/**
 * 画面上部のバー。
 * 左：メニュー、中央：「新しい会話」（見た目のみ）、右：CAPTURE（カメラ切替）。
 */
export const TopBar = ({ cameraMode, onToggleCamera, onMenu }: Props) => (
  <View style={styles.row}>
    <TouchableOpacity onPress={onMenu} hitSlop={8} style={styles.menuButton}>
      <Ionicons name="menu" size={26} color={colors.text} />
    </TouchableOpacity>

    <GlassPanel radius={22} style={styles.conversationPill}>
      <View style={styles.conversationInner}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textMuted} />
        <Text style={styles.conversationText} numberOfLines={1}>
          新しい会話
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </View>
    </GlassPanel>

    <GlassPanel radius={20} intensity={cameraMode ? 50 : 30}>
      <TouchableOpacity onPress={onToggleCamera} style={styles.captureButton}>
        <Ionicons
          name={cameraMode ? "close" : "camera"}
          size={18}
          color={cameraMode ? colors.recording : colors.text}
        />
        <Text style={[styles.captureText, cameraMode && { color: colors.recording }]}>
          {cameraMode ? "CLOSE" : "CAPTURE"}
        </Text>
      </TouchableOpacity>
    </GlassPanel>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  menuButton: {
    padding: 4,
  },
  conversationPill: {
    flex: 1,
  },
  conversationInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  conversationText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  captureText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
