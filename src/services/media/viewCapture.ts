import type { RefObject } from 'react';
import { PixelRatio, Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { STORY_EXPORT_SIZE } from '@/theme/layout';

// view-shot reads width/height as points on iOS (then multiplies by the screen scale) but as
// pixels on Android, so convert to get an exact pixel size on both.
const toCaptureUnits = (pixels: number) => (Platform.OS === 'ios' ? pixels / PixelRatio.get() : pixels);

const toFileUri = (uri: string) => (uri.startsWith('file://') ? uri : `file://${uri}`);

export async function captureStoryImage(ref: RefObject<View | null>): Promise<string> {
  return toFileUri(
    await captureRef(ref, {
      format: 'jpg',
      quality: 0.92,
      width: toCaptureUnits(STORY_EXPORT_SIZE.width),
      height: toCaptureUnits(STORY_EXPORT_SIZE.height),
      result: 'tmpfile',
    }),
  );
}

export async function captureStickerLayer(
  ref: RefObject<View | null>,
  renderInContext = false,
): Promise<string> {
  return toFileUri(
    await captureRef(ref, {
      format: 'png',
      width: toCaptureUnits(STORY_EXPORT_SIZE.width),
      height: toCaptureUnits(STORY_EXPORT_SIZE.height),
      result: 'tmpfile',
    }),
  );
}
