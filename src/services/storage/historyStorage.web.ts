import { EMPTY_HISTORY, type History } from '@/types/history';
import type { TrackMetadata } from '@/types/music';
import { appendExport } from './historyReducer';

export async function loadHistory(): Promise<History> {
  return EMPTY_HISTORY;
}

export async function clearHistory(): Promise<void> {}

export async function recordExport(history: History, track: TrackMetadata): Promise<History> {
  return appendExport(history, track, Date.now());
}
