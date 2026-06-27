
import { useCameraDevice, useCameraFormat } from 'react-native-vision-camera';

type CameraQuality = 'speed' | 'balanced' | 'quality';

export const useCameraSettings = () => {
  const device = useCameraDevice('back');

  const format = useCameraFormat(device, [
    { photoResolution: { width: 1024, height: 1024 } }
  ]);

  const photoQuality: CameraQuality = 'speed';

  return { device, format, photoQuality};
};
