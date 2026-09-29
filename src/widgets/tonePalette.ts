import { FALLBACK_ACCENT } from '@/constants/storyBackgrounds';
import { isLightColor, mixColors, withAlpha } from '@/utils/color';
import type { WidgetTone } from './types';

// Every widget comes in the same four looks: liquid glass, black, white, and a gradient of the
// song's own color (from its cover). Nothing else, so every story reads as one family.
export type TonePalette = {
  // Solid fill, or the gradient's top color for the song tone.
  surface: string;
  // Only for the song tone: the gradient from `surface` down to this.
  surfaceBottom: string | null;
  onSurface: string;
  onSurfaceMuted: string;
  hairline: string;
  track: string;
  isLightSurface: boolean;
};

const BLACK_SURFACE = '#0E0E0F';
const GLASS_SURFACE = '#1E1E20';
const WHITE_SURFACE = '#FFFFFF';
// How far the song tone darkens toward its bottom edge.
const ACCENT_DEPTH = 0.42;

export function getTonePalette(tone: WidgetTone, accentColor: string | null): TonePalette {
  const accent = accentColor ?? FALLBACK_ACCENT;
  const surfaces: Record<WidgetTone, string> = {
    glass: GLASS_SURFACE,
    dark: BLACK_SURFACE,
    light: WHITE_SURFACE,
    accent,
  };
  const surface = surfaces[tone];
  const surfaceBottom = tone === 'accent' ? mixColors(accent, '#000000', ACCENT_DEPTH) : null;
  // Text color is judged on the middle of the gradient, where most of it sits.
  const isLightSurface = isLightColor(surfaceBottom ? mixColors(surface, surfaceBottom, 0.5) : surface);
  const onSurface = isLightSurface ? '#111111' : '#FFFFFF';
  return {
    surface,
    surfaceBottom,
    onSurface,
    onSurfaceMuted: withAlpha(onSurface, isLightSurface ? 0.55 : 0.62),
    hairline: withAlpha(onSurface, isLightSurface ? 0.1 : 0.16),
    track: withAlpha(onSurface, 0.2),
    isLightSurface,
  };
}
