export const useAudioSettings = () => {
  return {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6,
    wavFile: 'test.wav',
  };
};
