import { useEffect, useState } from 'react';
import { samplePixels } from 'shory-palette';
import { buildPalette } from '@/utils/palette';

const SAMPLE_SIZE = 48;
const PALETTE_SIZE = 6;

// Palettes don't change for a given image, so each one is computed once per session.
const cache = new Map<string, string[]>();

// The dominant colors of an image, most common first. Empty while loading or if it can't be read.
export function useImagePalette(uri: string | null): string[] {
  const [result, setResult] = useState<{ uri: string; colors: string[] } | null>(null);

  useEffect(() => {
    if (!uri || cache.has(uri)) return;
    let active = true;
    samplePixels(uri, SAMPLE_SIZE)
      .then((pixels) => buildPalette(pixels, PALETTE_SIZE))
      .catch(() => [])
      .then((colors) => {
        cache.set(uri, colors);
        if (active) setResult({ uri, colors });
      });
    return () => {
      active = false;
    };
  }, [uri]);

  if (!uri) return [];
  return cache.get(uri) ?? (result?.uri === uri ? result.colors : []);
}
