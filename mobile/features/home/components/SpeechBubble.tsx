import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassPanel, colors } from "@/shared";

type Props = {
  title: string;
  subtitle?: string;
};

/** キャラクター付近に出る吹き出し。会話開始前のガイドなどに使う。 */
export const SpeechBubble = ({ title, subtitle }: Props) => (
  <GlassPanel radius={18} intensity={40} style={styles.bubble}>
    <View style={styles.inner}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  </GlassPanel>
);

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
  },
  inner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
