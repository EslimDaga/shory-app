import { rgbToHex } from './color';

type Bucket = { count: number; r: number; g: number; b: number };
type Rgb = readonly [number, number, number];

// Two colors closer than this (RGB distance) read as the same swatch.
const MIN_DISTANCE = 56;

// Builds up to `count` distinct colors from sampled pixels (packed 0xRRGGBB), most common first:
// pixels are grouped into 4-bit-per-channel buckets, each bucket averages its pixels, and a
// bucket is kept only if it's far enough from every color already chosen.
export function buildPalette(pixels: number[], count: number): string[] {
  const buckets = new Map<number, Bucket>();
  for (const pixel of pixels) {
    const r = (pixel >> 16) & 255;
    const g = (pixel >> 8) & 255;
    const b = pixel & 255;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  const ranked: Rgb[] = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map(({ count: n, r, g, b }) => [r / n, g / n, b / n]);

  const chosen: Rgb[] = [];
  for (const color of ranked) {
    if (chosen.length >= count) break;
    const distinct = chosen.every(
      (other) => Math.hypot(color[0] - other[0], color[1] - other[1], color[2] - other[2]) >= MIN_DISTANCE,
    );
    if (distinct) chosen.push(color);
  }
  return chosen.map(([r, g, b]) => rgbToHex(r, g, b));
}
