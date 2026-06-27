import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassPanel, colors } from "@/shared";

/**
 * 下部のチャット入力欄。
 * 今回は音声マルチモーダルのみ対応のため「見た目だけ」。
 * 入力はできるが送信は無効（テキスト送信は未実装）。
 */
export const ChatInputBar = () => {
  const [text, setText] = useState("");

  return (
    <GlassPanel radius={26} intensity={35} style={styles.panel}>
      <View style={styles.inner}>
        <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="何でも話してね"
          placeholderTextColor={colors.textFaint}
        />
        {/* 送信は無効（モック） */}
        <TouchableOpacity disabled style={styles.sendButton}>
          <Ionicons name="send" size={16} color={colors.textFaint} />
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );
};

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 14,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    padding: 0,
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
