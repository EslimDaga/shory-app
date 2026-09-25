import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { STORY_EXPORT_SIZE } from '@/theme/layout';

const toFileUri = (uri: string) => (uri.startsWith('file://') ? uri : `file://${uri}`);

export async function captureStoryImage(ref: RefObject<View | null>): Promise<string> {
  return toFileUri(
    await captureRef(ref, {
      format: 'jpg',
      quality: 0.92,
      width: STORY_EXPORT_SIZE.width,
      height: STORY_EXPORT_SIZE.height,
      result: 'tmpfile',
    }),
  );
}
