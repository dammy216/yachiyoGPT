import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Alignment, Fit, RiveView } from "@rive-app/react-native";

import { useYachiyoRive } from "../hooks/useYachiyoRive";

const STATE_MACHINE = "State Machine 1";

type Props = {
  /**
   * full     … 画面いっぱいに表示（通常モード）
   * thumbnail … カメラモード時に右上へ小さく表示
   */
  variant?: "full" | "thumbnail";
  style?: StyleProp<ViewStyle>;
};

/**
 * ヤチヨを Rive で描画するビュー。
 * 埋め込みの Luau スクリプトが呼吸・瞬き・目追従を自動再生する。
 */
export const CharacterView = ({ variant = "full", style }: Props) => {
  const { riveFile } = useYachiyoRive();

  if (!riveFile) {
    return <View style={style} />;
  }

  const isThumb = variant === "thumbnail";

  return (
    <RiveView
      file={riveFile}
      stateMachineName={STATE_MACHINE}
      autoPlay
      // サムネは上半身（顔）が見えるよう上寄せ＆カバー、通常は全身を中央表示
      fit={isThumb ? Fit.Cover : Fit.Contain}
      alignment={isThumb ? Alignment.TopCenter : Alignment.Center}
      style={StyleSheet.flatten([styles.rive, style])}
      onError={(error) => console.error("Rive error:", error.message)}
    />
  );
};

const styles = StyleSheet.create({
  rive: {
    width: "100%",
    height: "100%",
  },
});
