import { strings } from '@/i18n/es';
import type { TrackMetadata } from '@/types/music';

type LookupResult = {
  wrapperType: 'track' | 'collection' | 'artist';
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
};

const APPLE_MUSIC_URL_PATTERN = /https?:\/\/(?:music|itunes)\.apple\.com\/[^\s"'<>]+/i;
const COUNTRY_PATTERN = /apple\.com\/([a-z]{2})\//i;
const SONG_QUERY_PATTERN = /[?&]i=(\d+)/;
const SONG_PATH_PATTERN = /\/song\/(?:[^/]+\/)?(\d+)/;
const ALBUM_PATH_PATTERN = /\/album\/(?:[^/]+\/)?(\d+)/;
const BACKGROUND_COLOR_PATTERN = /"bgColor":"([0-9a-fA-F]{6})"/;
const ARTWORK_SIZE_PATTERN = /\/\d+x\d+bb\./;
const DEFAULT_COUNTRY = 'us';

export function extractAppleMusicUrl(text: string): string | null {
  return text.match(APPLE_MUSIC_URL_PATTERN)?.[0] ?? null;
}

function parseIds(url: string) {
  const country = url.match(COUNTRY_PATTERN)?.[1]?.toLowerCase() ?? DEFAULT_COUNTRY;
  const songId = url.match(SONG_QUERY_PATTERN)?.[1] ?? url.match(SONG_PATH_PATTERN)?.[1];
  const albumId = url.match(ALBUM_PATH_PATTERN)?.[1];
  return { country, id: songId ?? albumId ?? null };
}

async function fetchAccentColor(url: string): Promise<string | null> {
  try {
    const html = await (await fetch(url)).text();
    const hex = html.match(BACKGROUND_COLOR_PATTERN)?.[1];
    return hex ? `#${hex.toLowerCase()}` : null;
  } catch {
    return null;
  }
}

export async function fetchAppleMusicMetadata(rawUrl: string): Promise<TrackMetadata> {
  const url = rawUrl.split('&')[0].replace(/[?&]uo=\d+/, '');
  const { country, id } = parseIds(url);
  if (!id) throw new Error(strings.errors.appleSongNotFound);

  const [lookup, accentColor] = await Promise.all([
    fetch(`https://itunes.apple.com/lookup?id=${id}&country=${country}`).then((r) => r.json()),
    fetchAccentColor(url),
  ]);
  const item: LookupResult | undefined = lookup?.results?.[0];
  if (!item?.artworkUrl100) throw new Error(strings.errors.appleNoData);

  return {
    source: 'apple-music',
    url,
    title: (item.wrapperType === 'track' ? item.trackName : item.collectionName) ?? '',
    artist: item.artistName ?? null,
    coverUrl: item.artworkUrl100.replace(ARTWORK_SIZE_PATTERN, '/1000x1000bb.'),
    accentColor,
    durationMs: item.trackTimeMillis ?? null,
  };
}
