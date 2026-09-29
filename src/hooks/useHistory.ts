import { useCallback, useEffect, useState } from 'react';
import { loadHistory, recordExport } from '@/services/storage/historyStorage';
import { EMPTY_HISTORY, type History } from '@/types/history';
import type { TrackMetadata } from '@/types/music';

type AccountHistory = { userId: string | null; history: History };

// History belongs to one signed-in account: it starts empty on every sign-in and is dropped on
// sign-out, so the next person on the device never sees, or writes back, someone else's stories.
export function useHistory(userId: string | null) {
  const [current, setCurrent] = useState<AccountHistory>({ userId, history: EMPTY_HISTORY });
  if (current.userId !== userId) setCurrent({ userId, history: EMPTY_HISTORY });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadHistory(userId).then((history) => {
      if (active) setCurrent({ userId, history });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const addExport = useCallback(
    async (track: TrackMetadata) => {
      if (!userId) return;
      const history = await recordExport(userId, track);
      // An export that finishes after the account changed must not show up in the next one.
      setCurrent((latest) => (latest.userId === userId ? { userId, history } : latest));
    },
    [userId],
  );

  return { history: current.history, addExport };
}
