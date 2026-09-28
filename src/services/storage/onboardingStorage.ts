import type { MusicSource } from '@/types/music';
import { keyValue } from './keyValue';

const PREFERRED_SOURCE_KEY = 'shory.onboarding.preferredSource';

export async function loadPreferredSource(): Promise<MusicSource | null> {
  try {
    return (await keyValue.getItem(PREFERRED_SOURCE_KEY)) as MusicSource | null;
  } catch {
    return null;
  }
}

export async function clearPreferredSource(): Promise<void> {
  try {
    await keyValue.removeItem(PREFERRED_SOURCE_KEY);
  } catch {
    return;
  }
}

export async function savePreferredSource(source: MusicSource): Promise<void> {
  try {
    await keyValue.setItem(PREFERRED_SOURCE_KEY, source);
  } catch {
    return;
  }
}
