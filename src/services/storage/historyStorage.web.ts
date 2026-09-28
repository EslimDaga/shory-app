import { EMPTY_HISTORY, type History } from '@/types/history';
import type { TrackMetadata } from '@/types/music';
import { appendExport } from './historyReducer';

// The web build has no file to keep history in, so it lasts as long as the page, for one account.
let stored: { userId: string; history: History } | null = null;

export async function loadHistory(userId: string): Promise<History> {
  return stored?.userId === userId ? stored.history : EMPTY_HISTORY;
}

export async function clearHistory(): Promise<void> {
  stored = null;
}

export async function recordExport(userId: string, track: TrackMetadata): Promise<History> {
  const history = appendExport(await loadHistory(userId), track, Date.now());
  stored = { userId, history };
  return history;
}
