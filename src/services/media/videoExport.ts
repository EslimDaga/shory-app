import type { View } from 'react-native';
import { recordView } from 'shory-recorder';
import { STORY_EXPORT_SIZE } from '@/theme/layout';

export const VIDEO_FPS = 30;

const nextFrames = (count: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });

type Options = {
  durationSeconds: number;
  backgroundVideo?: string | null;
  setClock: (seconds: number | null) => void;
  onProgress?: (fraction: number) => void;
  shouldCancel?: () => boolean;
};

// Renders `view` into a 4K (2160×3840) MP4. Each frame moves the story clock to that instant
// and waits for React and the native view tree to paint it before it's captured.
export async function renderStoryVideo(view: View | null, options: Options): Promise<string> {
  if (!view) throw new Error('Nothing to record');
  try {
    return await recordView(view, {
      width: STORY_EXPORT_SIZE.width,
      height: STORY_EXPORT_SIZE.height,
      fps: VIDEO_FPS,
      durationSeconds: options.durationSeconds,
      backgroundVideo: options.backgroundVideo,
      onProgress: options.onProgress,
      shouldCancel: options.shouldCancel,
      renderFrame: async (seconds) => {
        options.setClock(seconds);
        await nextFrames(2);
      },
    });
  } finally {
    options.setClock(null);
  }
}
