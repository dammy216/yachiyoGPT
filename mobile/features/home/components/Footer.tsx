import React from "react";
import { Linking, StyleSheet, Text } from "react-native";

import { colors } from "@/shared";

/** 非公式ファンサイトであることを示すフッター表記。 */
export const Footer = () => (
  <Text style={styles.text}>
    非公式ファンサイト /{" "}
    <Text
      style={styles.link}
      onPress={() => Linking.openURL("https://www.netflix.com/")}
    >
      公式・Netflix
    </Text>
    ・権利者とは関係ありません
  </Text>
);

const styles = StyleSheet.create({
  text: {
    textAlign: "center",
    fontSize: 10,
    color: colors.textFaint,
    paddingTop: 8,
  },
  link: {
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
});
