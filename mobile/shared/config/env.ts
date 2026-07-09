/**
 * アプリ全体で使う環境設定。
 *
 * SERVER_URL は server フォルダ（FastAPI + Socket.IO / Gemini Live）の接続先。
 * mobile/.env（.env.example をコピーして作成、gitignore 対象）の
 * EXPO_PUBLIC_SERVER_URL を LAN 上の PC の IP に合わせて設定する。
 */
if (!process.env.EXPO_PUBLIC_SERVER_URL) {
  throw new Error(
    "EXPO_PUBLIC_SERVER_URL が未設定です。mobile/.env.example を mobile/.env にコピーし、LAN上のサーバーPCのIPを設定してください。"
  );
}
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

/** 外部リンク（ヘッダーメニューから開く） */
export const EXTERNAL_LINKS = {
  geminiDocs: "https://ai.google.dev/gemini-api/docs/live?hl=ja",
  apiKey: "https://aistudio.google.com/apikey",
  github: "https://github.com/dammy216/matsuzaki-info-app",
} as const;
