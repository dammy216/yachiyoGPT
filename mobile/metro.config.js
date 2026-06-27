// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// .riv ファイル（Rive アニメーション）をアセットとしてバンドルできるようにする
config.resolver.assetExts.push("riv");

module.exports = config;
