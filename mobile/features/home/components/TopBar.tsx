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
 * 左：メニュー、右：CAPTURE（カメラ切替）。
 */
export const TopBar = ({ cameraMode, onToggleCamera, onMenu }: Props) => (
  <View style={styles.row}>
    <TouchableOpacity onPress={onMenu} hitSlop={8} style={styles.menuButton}>
      <Ionicons name="reorder-two" size={38} color={colors.text} />
    </TouchableOpacity>

    <GlassPanel radius={20} intensity={cameraMode ? 50 : 30}>
      <TouchableOpacity onPress={onToggleCamera} style={styles.captureButton}>
        <Ionicons
          name={cameraMode ? "close" : "camera"}
          size={24}
          color={cameraMode ? colors.recording : colors.text}
        />
        <Text style={[styles.captureText, cameraMode && { color: colors.recording }]}>
          {cameraMode ? "CLOSE" : "CAMERA"}
        </Text>
      </TouchableOpacity>
    </GlassPanel>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
  },
  menuButton: {
    padding: 4,
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
    fontSize: 14,
    fontWeight: "700",
  },
});
