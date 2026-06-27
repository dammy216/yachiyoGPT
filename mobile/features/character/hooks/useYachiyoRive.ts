import { useRiveFile } from "@rive-app/react-native";

/** バンドルされたヤチヨの .riv ファイル（RN アセットのため require で読み込む） */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YACHIYO_RIV = require("@/assets/animations/yachiyo.riv");

/**
 * ヤチヨの Rive ファイルを読み込むフック。
 * 読み込み中は `riveFile` が null。
 *
 * .riv 内の構成（strings 抽出で確認済み）:
 *   - State Machine: "State Machine 1"
 *   - 埋め込み Luau スクリプト "CharacterAnimation" が
 *     呼吸・瞬き・目追従などを自動再生する。
 */
export const useYachiyoRive = () => {
  const { riveFile, isLoading, error } = useRiveFile(YACHIYO_RIV);
  return { riveFile, isLoading, error };
};
