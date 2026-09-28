import { requireOptionalNativeModule } from 'expo';
import { findNodeHandle, type View } from 'react-native';

type NativeRecorder = {
  start(width: number, height: number, fps: number, backgroundVideo: string | null): Promise<string>;
  appendView(viewTag: number, index: number): Promise<void>;
  finish(): Promise<string>;
  cancel(): Promise<void>;
  describeVideo(uri: string): Promise<VideoDescription>;
};

export type VideoDescription = { posterUri: string; durationSeconds: number };

// Looked up lazily: a build without the native module (e.g. an older dev client) still opens,
// and only recording a video fails, with a clear error.
function recorder(): NativeRecorder {
  const module = requireOptionalNativeModule<NativeRecorder>('ShoryRecorder');
  if (!module) throw new Error('Video recording needs a build that includes ShoryRecorder');
  return module;
}

export type RecordOptions = {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  // Drawn under every frame, in place of whatever the view shows behind its transparent areas.
  backgroundVideo?: string | null;
  // Brings the scene to `seconds`; the view is captured once the returned promise resolves.
  renderFrame: (seconds: number) => Promise<void>;
  onProgress?: (fraction: number) => void;
  shouldCancel?: () => boolean;
};

export class RecordingCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'RecordingCancelledError';
  }
}

export async function recordView(view: View, options: RecordOptions): Promise<string> {
  const tag = findNodeHandle(view);
  if (tag == null) throw new Error('The view to record is not mounted');
  const frames = Math.round(options.durationSeconds * options.fps);
  const Recorder = recorder();
  await Recorder.start(options.width, options.height, options.fps, options.backgroundVideo ?? null);
  try {
    for (let index = 0; index < frames; index += 1) {
      if (options.shouldCancel?.()) throw new RecordingCancelledError();
      await options.renderFrame(index / options.fps);
      await Recorder.appendView(tag, index);
      options.onProgress?.((index + 1) / frames);
    }
    return await Recorder.finish();
  } catch (error) {
    await Recorder.cancel();
    throw error;
  }
}

// A still frame (file URI) and the length of a video file.
export async function describeVideo(uri: string): Promise<VideoDescription> {
  return recorder().describeVideo(uri);
}
