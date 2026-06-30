/**
 * アプリ全体で使う環境設定。
 *
 * SERVER_URL は server フォルダ（FastAPI + Socket.IO / Gemini Live）の接続先。
 * 開発時は LAN 上の PC の IP に合わせて変更する。
 * TODO: 本番では app.json の extra や EAS の環境変数から注入する。
 */
export const SERVER_URL = "http://192.168.32.164:8080";

/** 外部リンク（ヘッダーメニューから開く） */
export const EXTERNAL_LINKS = {
  geminiDocs: "https://ai.google.dev/gemini-api/docs/live?hl=ja",
  apiKey: "https://aistudio.google.com/apikey",
  github: "https://github.com/dammy216/matsuzaki-info-app",
} as const;
