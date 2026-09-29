import { File, Paths } from 'expo-file-system';
import { EMPTY_HISTORY, type History, type HistoryEntry } from '@/types/history';
import { createLogger } from '@/services/observability/logger';
import type { TrackMetadata } from '@/types/music';
import { appendExport } from './historyReducer';

const log = createLogger('history');

const HISTORY_FILE_NAME = 'shory-history.json';

type StoredEntry = { track: TrackMetadata; exportedAt?: number; at?: number };

// Older files have no userId (history wasn't tied to an account yet) and no all-time counters.
type StoredHistory = {
  userId?: string;
  exports?: number[];
  recents?: StoredEntry[];
  total?: number;
  artists?: string[];
};

const historyFile = () => new File(Paths.document, HISTORY_FILE_NAME);

function toEntry(stored: StoredEntry): HistoryEntry {
  return { track: stored.track, exportedAt: stored.exportedAt ?? stored.at ?? 0 };
}

function toHistory(stored: StoredHistory): History {
  const exports = stored.exports ?? [];
  const recents = (stored.recents ?? []).map(toEntry);
  // Files without counters get the best count their capped lists allow.
  const recentArtists = recents.flatMap(({ track }) => (track.artist ? [track.artist] : []));
  return {
    exports,
    recents,
    total: stored.total ?? exports.length,
    artists: stored.artists ?? [...new Set(recentArtists)],
  };
}

function saveHistory(userId: string, history: History): void {
  try {
    const file = historyFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify({ userId, ...history } satisfies StoredHistory));
  } catch (error) {
    log.error('history save failed', error);
  }
}

// The file is tagged with its account, so a session that ended without an explicit sign-out (an
// expired refresh token, say) never shows its songs to, or mixes them with, whoever signs in next.
export async function loadHistory(userId: string): Promise<History> {
  try {
    const file = historyFile();
    if (!file.exists) return EMPTY_HISTORY;
    const stored = JSON.parse(await file.text()) as StoredHistory;
    if (stored.userId !== undefined && stored.userId !== userId) return EMPTY_HISTORY;
    const history = toHistory(stored);
    // A file from before history was tied to an account goes to the first account that loads it.
    if (stored.userId === undefined) saveHistory(userId, history);
    return history;
  } catch (error) {
    // A corrupt file starts the history over: the person loses their list, so it's worth knowing.
    log.error('history load failed', error);
    return EMPTY_HISTORY;
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const file = historyFile();
    if (file.exists) file.delete();
  } catch {
    return;
  }
}

export async function recordExport(userId: string, track: TrackMetadata): Promise<History> {
  // Built on what's stored rather than on the caller's copy, which may be stale or not loaded yet.
  const next = appendExport(await loadHistory(userId), track, Date.now());
  saveHistory(userId, next);
  return next;
}
