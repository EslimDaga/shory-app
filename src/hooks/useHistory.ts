import { useCallback, useEffect, useState } from 'react';
import { loadHistory, recordExport } from '@/services/storage/historyStorage';
import { EMPTY_HISTORY, type History } from '@/types/history';
import type { TrackMetadata } from '@/types/music';

export function useHistory() {
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const addExport = useCallback(
    async (track: TrackMetadata) => setHistory(await recordExport(history, track)),
    [history],
  );

  return { history, addExport };
}
