import * as ImagePicker from 'expo-image-picker';
import { strings } from '@/i18n/es';

export type PhotoSource = 'library' | 'camera';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.9 };

export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) throw new Error(strings.errors.cameraPermission);
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}
