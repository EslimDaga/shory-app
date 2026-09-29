import type { TrackMetadata } from './music';

export type HistoryEntry = {
  track: TrackMetadata;
  exportedAt: number;
};

export type History = {
  // Only the latest export times are kept: enough for the weekly count, not for the all-time one.
  exports: number[];
  recents: HistoryEntry[];
  // All-time counters, kept apart from the capped lists above so they keep growing past the caps.
  total: number;
  artists: string[];
};

export const EMPTY_HISTORY: History = { exports: [], recents: [], total: 0, artists: [] };
