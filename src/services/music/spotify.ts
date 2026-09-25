import { strings } from '@/i18n/es';
import type { TrackMetadata } from '@/types/music';
import { rgbToHex } from '@/utils/color';

type SpotifyEntityType = 'track' | 'album' | 'playlist' | 'artist' | 'episode' | 'show';

type OEmbedResponse = {
  title: string;
  thumbnail_url: string;
  iframe_url?: string;
};

type EmbedDetails = {
  artist: string | null;
  accentColor: string | null;
  durationMs: number | null;
};

const SPOTIFY_URL_PATTERN =
  /https?:\/\/(?:open\.spotify\.com|spotify\.link|spotify\.app\.link)\/[^\s"'<>]+/i;
const OPEN_URL_PATTERN = /https:\/\/open\.spotify\.com\/[a-z-]+\/[A-Za-z0-9]+/;
const ENTITY_TYPE_PATTERN = /open\.spotify\.com\/(track|album|playlist|artist|episode|show)\//;
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
const SMALL_COVER_HASH = 'ab67616d00001e02';
const LARGE_COVER_HASH = 'ab67616d0000b273';

const EMPTY_DETAILS: EmbedDetails = { artist: null, accentColor: null, durationMs: null };

export function extractSpotifyUrl(text: string): string | null {
  return text.match(SPOTIFY_URL_PATTERN)?.[0] ?? null;
}

function normalizeOpenUrl(url: string): string {
  const path = new URL(url).pathname.replace(/^\/intl-[a-z-]+\//i, '/');
  return `https://open.spotify.com${path}`;
}

async function resolveShortLink(url: string): Promise<string> {
  const response = await fetch(url);
  if (response.url.includes('open.spotify.com')) return response.url;
  const found = (await response.text()).match(OPEN_URL_PATTERN);
  if (!found) throw new Error(strings.errors.spotifyShortLink);
  return found[0];
}

function getEntityType(openUrl: string): SpotifyEntityType | null {
  return (openUrl.match(ENTITY_TYPE_PATTERN)?.[1] as SpotifyEntityType | undefined) ?? null;
}

async function fetchEmbedDetails(iframeUrl: string): Promise<EmbedDetails> {
  try {
    const html = await (await fetch(iframeUrl)).text();
    const json = html.match(NEXT_DATA_PATTERN)?.[1];
    if (!json) return EMPTY_DETAILS;

    const entity = JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
    const artists: { name: string }[] | undefined = entity?.artists;
    const artist = artists?.length
      ? artists.map((a) => a.name).join(', ')
      : (entity?.subtitle ?? null);

    const base = entity?.visualIdentity?.backgroundBase;
    const accentColor = base ? rgbToHex(base.red, base.green, base.blue) : null;
    const durationMs = typeof entity?.duration === 'number' ? entity.duration : null;

    return { artist, accentColor, durationMs };
  } catch {
    return EMPTY_DETAILS;
  }
}

export async function fetchSpotifyMetadata(rawUrl: string): Promise<TrackMetadata> {
  const resolved = rawUrl.includes('open.spotify.com') ? rawUrl : await resolveShortLink(rawUrl);
  const url = normalizeOpenUrl(resolved);

  const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(strings.errors.spotifyStatus(response.status));
  const data: OEmbedResponse = await response.json();

  const details = data.iframe_url ? await fetchEmbedDetails(data.iframe_url) : EMPTY_DETAILS;

  return {
    source: 'spotify',
    url,
    title: data.title,
    artist: getEntityType(url) === 'artist' ? null : details.artist,
    coverUrl: data.thumbnail_url.replace(SMALL_COVER_HASH, LARGE_COVER_HASH),
    accentColor: details.accentColor,
    durationMs: details.durationMs,
  };
}
