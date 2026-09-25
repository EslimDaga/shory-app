import type { History } from '@/types/history';
import type { TrackMetadata } from '@/types/music';

const MAX_EXPORTS = 500;
const MAX_RECENTS = 12;

export function appendExport(history: History, track: TrackMetadata, exportedAt: number): History {
  return {
    exports: [...history.exports, exportedAt].slice(-MAX_EXPORTS),
    recents: [
      { track, exportedAt },
      ...history.recents.filter((entry) => entry.track.url !== track.url),
    ].slice(0, MAX_RECENTS),
  };
}
