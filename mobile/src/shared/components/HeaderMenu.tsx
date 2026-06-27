import React from "react";
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";

import { EXTERNAL_LINKS } from "@/src/shared/config/env";

/** ヘッダー左：ロゴ＋タイトル */
export const HeaderTitle = () => (
  <View style={styles.headerTitleContainer}>
    <Image source={require("@/assets/images/OIP.webp")} style={styles.headerLeftImage} />
    <Text style={styles.headerTitle}>Gemini Session</Text>
  </View>
);

/** ヘッダー右：Google アイコンから開く外部リンクメニュー */
export const HeaderMenu = () => (
  <Menu>
    <MenuTrigger
      customStyles={{
        TriggerTouchableComponent: TouchableOpacity,
        triggerWrapper: styles.controlButton,
      }}
    >
      <Image source={require("@/assets/images/google-icon.png")} style={styles.headerRightImage} />
    </MenuTrigger>
    <MenuOptions customStyles={{ optionsContainer: styles.optionsContainer }}>
      <MenuOption onSelect={() => Linking.openURL(EXTERNAL_LINKS.geminiDocs)}>
        <Text>公式ドキュメント</Text>
      </MenuOption>
      <MenuOption onSelect={() => Linking.openURL(EXTERNAL_LINKS.apiKey)}>
        <Text>APIキー発行</Text>
      </MenuOption>
      <MenuOption onSelect={() => Linking.openURL(EXTERNAL_LINKS.github)}>
        <Text>GitHub</Text>
      </MenuOption>
    </MenuOptions>
  </Menu>
);

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerLeftImage: {
    width: 32,
    height: 32,
  },
  headerRightImage: {
    width: 30,
    height: 30,
  },
  controlButton: {
    alignSelf: "flex-end",
    marginRight: Platform.OS === "web" ? 24 : 0,
  },
  optionsContainer: {
    marginTop: 40,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 136,
  },
});
