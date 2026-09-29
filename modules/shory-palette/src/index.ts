import { requireOptionalNativeModule } from 'expo';

type NativePalette = {
  samplePixels(uri: string, size: number): Promise<number[]>;
};

// Optional: Magic colors are a nice-to-have, so a build without the native module (e.g. an older
// dev client) just offers none instead of crashing the app.
const Palette = requireOptionalNativeModule<NativePalette>('ShoryPalette');

// The opaque pixels of `uri` drawn at size×size, as packed 0xRRGGBB integers.
export async function samplePixels(uri: string, size: number): Promise<number[]> {
  return Palette ? Palette.samplePixels(uri, size) : [];
}
