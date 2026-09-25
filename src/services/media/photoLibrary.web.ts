import * as ImagePicker from 'expo-image-picker';
import { strings } from '@/i18n/es';

export type PhotoSource = 'library' | 'camera';

export async function pickPhoto(_source: PhotoSource): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

export async function saveToPhotos(_fileUri: string): Promise<void> {
  throw new Error(strings.errors.saveWebUnsupported);
}
