import type { GradientBackground } from '@/types/storyBackground';
import { mixColors } from '@/utils/color';

export const FALLBACK_ACCENT = '#2A2A2E';

export const AUTO_BACKGROUND_ID = 'auto';

export function createAutoBackground(accentColor: string | null): GradientBackground {
  const top = accentColor ?? FALLBACK_ACCENT;
  return { kind: 'gradient', id: AUTO_BACKGROUND_ID, top, bottom: mixColors(top, '#000000', 0.78) };
}

export const GRADIENT_PRESETS: GradientBackground[] = [
  { kind: 'gradient', id: 'night', top: '#16161B', bottom: '#000000' },
  { kind: 'gradient', id: 'sunset', top: '#FF8A4C', bottom: '#8E1F4F' },
  { kind: 'gradient', id: 'ocean', top: '#3CC8F4', bottom: '#0A2766' },
  { kind: 'gradient', id: 'mint', top: '#A6F6CF', bottom: '#0E6A58' },
  { kind: 'gradient', id: 'sand', top: '#F4E4C4', bottom: '#A87E4E' },
  { kind: 'gradient', id: 'bubblegum', top: '#FFB8CB', bottom: '#D8386F' },
  { kind: 'gradient', id: 'lime', top: '#F2F76B', bottom: '#5E8C1E' },
  { kind: 'gradient', id: 'paper', top: '#FFFFFF', bottom: '#E6E2DA' },
];
