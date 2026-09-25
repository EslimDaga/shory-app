import { FALLBACK_ACCENT } from '@/constants/storyBackgrounds';
import { isLightColor, withAlpha } from '@/utils/color';
import type { WidgetTone } from './types';

export type TonePalette = {
  surface: string;
  onSurface: string;
  onSurfaceMuted: string;
  hairline: string;
  track: string;
  isLightSurface: boolean;
};

const DARK_SURFACE = '#121212';
const GLASS_SURFACE = '#1E1E20';
const LIGHT_SURFACE = '#F7F4EE';

export function getTonePalette(tone: WidgetTone, accentColor: string | null): TonePalette {
  const surfaces: Record<WidgetTone, string> = {
    glass: GLASS_SURFACE,
    dark: DARK_SURFACE,
    light: LIGHT_SURFACE,
    accent: accentColor ?? FALLBACK_ACCENT,
  };
  const surface = surfaces[tone];
  const isLightSurface = isLightColor(surface);
  const onSurface = isLightSurface ? '#141414' : '#FFFFFF';
  return {
    surface,
    onSurface,
    onSurfaceMuted: withAlpha(onSurface, isLightSurface ? 0.55 : 0.6),
    hairline: withAlpha(onSurface, isLightSurface ? 0.1 : 0.16),
    track: withAlpha(onSurface, 0.2),
    isLightSurface,
  };
}
