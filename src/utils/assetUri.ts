import { Image, type ImageRequireSource } from 'react-native';

// URI of a bundled image (`require('…jpg')`), for code that needs a plain URL instead of a source.
export function assetUri(source: ImageRequireSource): string {
  return Image.resolveAssetSource(source).uri;
}
