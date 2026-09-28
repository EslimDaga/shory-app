import type { History } from '@/types/history';
import type { MusicSource } from '@/types/music';
import { WEEK_MS } from '@/utils/time';

export type HomeStats = {
  total: number;
  thisWeek: number;
  artistCount: number;
  favoriteSource: MusicSource | null;
};

function findMostUsedSource(history: History): MusicSource | null {
  const counts = new Map<MusicSource, number>();
  for (const { track } of history.recents) {
    counts.set(track.source, (counts.get(track.source) ?? 0) + 1);
  }
  let best: MusicSource | null = null;
  for (const [source, count] of counts) {
    if (!best || count > (counts.get(best) ?? 0)) best = source;
  }
  return best;
}

export function computeHomeStats(history: History, now: number): HomeStats {
  return {
    total: history.total,
    thisWeek: history.exports.filter((timestamp) => now - timestamp < WEEK_MS).length,
    artistCount: history.artists.length,
    favoriteSource: findMostUsedSource(history),
  };
}
