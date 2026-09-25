import { useFonts } from 'expo-font';
import { fontAssets } from '@/theme/typography';

export function useAppFonts(): boolean {
  const [loaded] = useFonts(fontAssets);
  return loaded;
}
