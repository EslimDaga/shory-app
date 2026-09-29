import { SUPPORTED_SOURCES, type MusicLink, type MusicSource, type TrackMetadata } from '@/types/music';
import { extractAppleMusicUrl, fetchAppleMusicMetadata } from './appleMusic';
import { extractSpotifyUrl, fetchSpotifyMetadata } from './spotify';
import { extractYouTubeMusicUrl, fetchYouTubeMusicMetadata } from './youtubeMusic';

type MusicProvider = {
  extractUrl: (text: string) => string | null;
  fetchMetadata: (url: string) => Promise<TrackMetadata>;
};

const PROVIDERS: Record<MusicSource, MusicProvider> = {
  spotify: { extractUrl: extractSpotifyUrl, fetchMetadata: fetchSpotifyMetadata },
  'youtube-music': { extractUrl: extractYouTubeMusicUrl, fetchMetadata: fetchYouTubeMusicMetadata },
  'apple-music': { extractUrl: extractAppleMusicUrl, fetchMetadata: fetchAppleMusicMetadata },
};

// A link that ends a sentence ("escucha esto: https://….") picks up the punctuation. No provider's
// URL ends in one of these, and Spotify rejects the link if it stays.
const TRAILING_PUNCTUATION = /[.,;:!?)\]}]+$/;

export function extractMusicLink(text: string | null | undefined): MusicLink | null {
  if (!text) return null;
  for (const source of SUPPORTED_SOURCES) {
    const url = PROVIDERS[source].extractUrl(text)?.replace(TRAILING_PUNCTUATION, '');
    if (url) return { source, url };
  }
  return null;
}

export function fetchTrackMetadata(link: MusicLink): Promise<TrackMetadata> {
  return PROVIDERS[link.source].fetchMetadata(link.url);
}
