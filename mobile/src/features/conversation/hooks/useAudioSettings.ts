import type { AudioRecordOptions } from "../types";

/**
 * react-native-audio-record の初期化オプション。
 * Gemini Live API が要求する PCM 16kHz / mono / 16bit に合わせる。
 */
export const useAudioSettings = (): AudioRecordOptions => {
  return {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    wavFile: "test.wav",
  };
};
