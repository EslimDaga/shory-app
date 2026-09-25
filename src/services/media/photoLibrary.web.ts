import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'library' | 'camera';

export async function pickPhoto(_source: PhotoSource): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}
