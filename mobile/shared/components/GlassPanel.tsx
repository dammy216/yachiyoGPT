import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

import { colors } from "../theme/colors";

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** 角丸（ブラーをクリップするため指定） */
  radius?: number;
};

/**
 * すりガラス風のパネル。トップバー・操作ボタン・入力欄などに使う共通UI。
 * expo-blur の BlurView を半透明オーバーレイと枠線で包む。
 */
export const GlassPanel = ({ children, style, intensity = 30, radius = 24 }: Props) => (
  <BlurView
    intensity={intensity}
    tint="dark"
    style={[styles.base, { borderRadius: radius }, style]}
  >
    <View style={[styles.overlay, { borderRadius: radius }]} pointerEvents="none" />
    {children}
  </BlurView>
);

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass,
  },
});
