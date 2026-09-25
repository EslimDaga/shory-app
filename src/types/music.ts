export type MusicSource = 'spotify' | 'youtube-music' | 'apple-music';

export type TrackMetadata = {
  source: MusicSource;
  url: string;
  title: string;
  artist: string | null;
  coverUrl: string;
  accentColor: string | null;
  durationMs: number | null;
};

export type MusicLink = {
  source: MusicSource;
  url: string;
};

export const SOURCE_NAMES: Record<MusicSource, string> = {
  spotify: 'Spotify',
  'youtube-music': 'YouTube Music',
  'apple-music': 'Apple Music',
};

export const SUPPORTED_SOURCES: MusicSource[] = ['spotify', 'youtube-music', 'apple-music'];
