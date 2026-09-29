import type { ImageRequireSource } from 'react-native';

// react-native-web has no Image.resolveAssetSource. On web, Metro turns `require('…jpg')` into
// `{ uri, width, height }` rather than a numeric asset id, so the URI is read straight off it.
export function assetUri(source: ImageRequireSource): string {
  const asset = source as unknown as { uri?: string } | string;
  if (typeof asset === 'string') return asset;
  return asset?.uri ?? '';
}
