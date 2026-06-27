import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Rect,
  vec,
} from "@shopify/react-native-skia";

import { colors } from "../theme/colors";

type Star = { x: number; y: number; r: number; opacity: number };

/**
 * Skia で描く星空グラデーション背景（新規ネイティブ依存を増やさないため Skia を使用）。
 * 夜空のグラデーション・ランダムな星・右上の月を一度だけ生成して描画する。
 */
export const StarryBackground = () => {
  const { width, height } = useWindowDimensions();

  const stars = useMemo<Star[]>(() => {
    const count = Math.round((width * height) / 9000);
    return Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.7 + 0.2,
    }));
  }, [width, height]);

  const moon = useMemo(
    () => ({ cx: width * 0.78, cy: height * 0.16, r: Math.min(width, height) * 0.13 }),
    [width, height]
  );

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[colors.skyTop, colors.skyMid, colors.skyBottom]}
          positions={[0, 0.5, 1]}
        />
      </Rect>

      {/* 月のぼんやりした光 */}
      <Circle cx={moon.cx} cy={moon.cy} r={moon.r * 1.9} color="rgba(207, 211, 230, 0.10)" />
      <Circle cx={moon.cx} cy={moon.cy} r={moon.r * 1.4} color="rgba(207, 211, 230, 0.14)" />
      <Circle cx={moon.cx} cy={moon.cy} r={moon.r} color={colors.moon} opacity={0.85} />

      <Group>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={colors.star} opacity={s.opacity} />
        ))}
      </Group>
    </Canvas>
  );
};
