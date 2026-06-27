/**
 * アプリ全体のカラートークン。
 * 参考画像の「星空＋月」の世界観に合わせた夜空のグラデーション基調。
 */
export const colors = {
  // 背景グラデーション（上→下）
  skyTop: "#2a2350",
  skyMid: "#1b1740",
  skyBottom: "#0c0a24",

  star: "#ffffff",
  moon: "#cfd3e6",

  // ガラスUI
  glass: "rgba(40, 36, 70, 0.45)",
  glassBorder: "rgba(255, 255, 255, 0.18)",
  glassStrong: "rgba(58, 50, 92, 0.7)",

  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.65)",
  textFaint: "rgba(255, 255, 255, 0.45)",

  accent: "#8b7bd8",
  recording: "#ff5a6e",
} as const;
