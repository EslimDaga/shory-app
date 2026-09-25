import { File, Paths } from 'expo-file-system';
import { EMPTY_HISTORY, type History, type HistoryEntry } from '@/types/history';
import type { TrackMetadata } from '@/types/music';
import { appendExport } from './historyReducer';

const HISTORY_FILE_NAME = 'shory-history.json';

type StoredEntry = { track: TrackMetadata; exportedAt?: number; at?: number };

const historyFile = () => new File(Paths.document, HISTORY_FILE_NAME);

function toEntry(stored: StoredEntry): HistoryEntry {
  return { track: stored.track, exportedAt: stored.exportedAt ?? stored.at ?? 0 };
}

export async function loadHistory(): Promise<History> {
  try {
    const file = historyFile();
    if (!file.exists) return EMPTY_HISTORY;
    const parsed = JSON.parse(await file.text()) as { exports?: number[]; recents?: StoredEntry[] };
    return { exports: parsed.exports ?? [], recents: (parsed.recents ?? []).map(toEntry) };
  } catch {
    return EMPTY_HISTORY;
  }
}

export async function recordExport(history: History, track: TrackMetadata): Promise<History> {
  const next = appendExport(history, track, Date.now());
  try {
    const file = historyFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}
