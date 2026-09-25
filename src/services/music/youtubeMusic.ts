import { strings } from '@/i18n/es';
import type { TrackMetadata } from '@/types/music';

type OEmbedResponse = {
  title: string;
  author_name: string;
  thumbnail_url: string;
};

const YOUTUBE_URL_PATTERN =
  /https?:\/\/(?:music\.youtube\.com|(?:www\.|m\.)?youtube\.com|youtu\.be)\/[^\s"'<>]+/i;
const VIDEO_ID_PATTERN = /(?:[?&]v=|youtu\.be\/|\/shorts\/)([\w-]{11})/;
const TITLE_NOISE_PATTERN =
  /\s*[([][^)\]]*(official|video|audio|lyric|visuali[sz]er|remaster|4k|hd|mv)[^)\]]*[)\]]/gi;
const TOPIC_SUFFIX_PATTERN = / - Topic$/i;
const CHANNEL_SUFFIX_PATTERN = /\s*(VEVO|Official)$/i;
const TITLE_SEPARATOR_PATTERN = /\s[-–—]\s/;

export function extractYouTubeMusicUrl(text: string): string | null {
  return text.match(YOUTUBE_URL_PATTERN)?.[0] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitArtistAndTitle(rawTitle: string, author: string) {
  const title = rawTitle.replace(TITLE_NOISE_PATTERN, '').trim();

  if (TOPIC_SUFFIX_PATTERN.test(author)) {
    return { title, artist: author.replace(TOPIC_SUFFIX_PATTERN, '') };
  }

  const separator = title.match(TITLE_SEPARATOR_PATTERN);
  if (separator?.index) {
    return {
      artist: title.slice(0, separator.index).trim(),
      title: title.slice(separator.index + separator[0].length).trim(),
    };
  }

  const artist = author.replace(CHANNEL_SUFFIX_PATTERN, '').trim();
  const artistPrefix = new RegExp(`^${escapeRegExp(artist)}\\s*[:|]\\s*`, 'i');
  return { title: title.replace(artistPrefix, '') || title, artist: artist || null };
}

async function pickCover(videoId: string, fallback: string): Promise<string> {
  const maxResolution = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  try {
    const response = await fetch(maxResolution, { method: 'HEAD' });
    return response.ok ? maxResolution : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchYouTubeMusicMetadata(rawUrl: string): Promise<TrackMetadata> {
  const videoId = rawUrl.match(VIDEO_ID_PATTERN)?.[1];
  if (!videoId) throw new Error(strings.errors.youtubeVideoNotFound);

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
  );
  if (!response.ok) throw new Error(strings.errors.youtubeStatus(response.status));
  const data: OEmbedResponse = await response.json();

  const { title, artist } = splitArtistAndTitle(data.title, data.author_name);

  return {
    source: 'youtube-music',
    url: `https://music.youtube.com/watch?v=${videoId}`,
    title,
    artist,
    coverUrl: await pickCover(videoId, data.thumbnail_url),
    accentColor: null,
    durationMs: null,
  };
}
