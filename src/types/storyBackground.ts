export type GradientBackground = {
  kind: 'gradient';
  id: string;
  top: string;
  bottom: string;
};

export type PhotoBackground = {
  kind: 'photo';
  uri: string;
};

// A clip that plays behind the story; the export composites its original frames under each frame.
export type VideoBackground = {
  kind: 'video';
  uri: string;
  // Its first frame, for places that need a still picture (thumbnails, Magic colors).
  posterUri: string | null;
  durationSeconds: number;
};

export type StoryBackground = GradientBackground | PhotoBackground | VideoBackground;

// The background as a still picture: a video stands in with its first frame.
export function stillBackground(
  background: StoryBackground,
  fallback: GradientBackground,
): GradientBackground | PhotoBackground {
  if (background.kind !== 'video') return background;
  return background.posterUri ? { kind: 'photo', uri: background.posterUri } : fallback;
}
