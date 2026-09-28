import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { fontAssets } from '@/theme/typography';

// A font that fails to load (on web each one times out after 12 s) falls back to the system font
// instead of holding the app on the splash screen.
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (error && __DEV__) console.warn('[fonts] falling back to system fonts:', error.message);
  }, [error]);

  return loaded || error !== null;
}
