import * as ImagePicker from 'expo-image-picker';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
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

// Keeps the original file (no re-encode), so a 4K clip stays 4K in the export.
const VIDEO_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'videos',
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
};

export async function pickVideo(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(VIDEO_PICKER_OPTIONS);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

export async function saveToPhotos(fileUri: string): Promise<void> {
  const { granted } = await requestPermissionsAsync(true);
  if (!granted) throw new Error(strings.errors.photosPermission);
  await Asset.create(fileUri);
}
