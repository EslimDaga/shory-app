import { strings } from '@/i18n/es';
import type { MusicLink, MusicSource, TrackMetadata } from '@/types/music';
import { extractAppleMusicUrl, fetchAppleMusicMetadata } from './appleMusic';
import { extractSpotifyUrl, fetchSpotifyMetadata } from './spotify';
import { extractYouTubeMusicUrl, fetchYouTubeMusicMetadata } from './youtubeMusic';

type MusicProvider = {
  source: MusicSource;
  extractUrl: (text: string) => string | null;
  fetchMetadata: (url: string) => Promise<TrackMetadata>;
};

const PROVIDERS: MusicProvider[] = [
  { source: 'spotify', extractUrl: extractSpotifyUrl, fetchMetadata: fetchSpotifyMetadata },
  {
    source: 'youtube-music',
    extractUrl: extractYouTubeMusicUrl,
    fetchMetadata: fetchYouTubeMusicMetadata,
  },
  { source: 'apple-music', extractUrl: extractAppleMusicUrl, fetchMetadata: fetchAppleMusicMetadata },
];

export function extractMusicLink(text: string | null | undefined): MusicLink | null {
  if (!text) return null;
  for (const provider of PROVIDERS) {
    const url = provider.extractUrl(text);
    if (url) return { source: provider.source, url };
  }
  return null;
}

export function fetchTrackMetadata(link: MusicLink): Promise<TrackMetadata> {
  const provider = PROVIDERS.find((p) => p.source === link.source);
  if (!provider) throw new Error(strings.errors.unsupportedSource(link.source));
  return provider.fetchMetadata(link.url);
}
