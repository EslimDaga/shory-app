import * as ImagePicker from 'expo-image-picker';
import { strings } from '@/i18n/es';

export type PhotoSource = 'library' | 'camera';

export async function pickPhoto(_source: PhotoSource): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

// Unreachable from the editor (no video option on web); here so the shim matches photoLibrary.ts.
export async function pickVideo(): Promise<string | null> {
  throw new Error(strings.errors.videoWebUnsupported);
}

export async function saveToPhotos(_fileUri: string): Promise<void> {
  throw new Error(strings.errors.saveWebUnsupported);
}
