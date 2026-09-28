export class RecordingCancelledError extends Error {}

export async function recordView(): Promise<string> {
  throw new Error('Video export is not available on web');
}

export type VideoDescription = { posterUri: string; durationSeconds: number };

export async function describeVideo(): Promise<VideoDescription> {
  throw new Error('Video backgrounds are not available on web');
}
