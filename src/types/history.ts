import type { TrackMetadata } from './music';

export type HistoryEntry = {
  track: TrackMetadata;
  exportedAt: number;
};

export type History = {
  exports: number[];
  recents: HistoryEntry[];
};

export const EMPTY_HISTORY: History = { exports: [], recents: [] };
