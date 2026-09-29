import { SUPPORTED_SOURCES, type MusicSource } from '@/types/music';
import { keyValue } from './keyValue';

const PREFERRED_SOURCE_KEY = 'shory.onboarding.preferredSource';

// Anything else stored under the key (an older value, a corrupt write) is treated as no answer
// rather than being sent to Supabase as the user's preference.
const isMusicSource = (value: string | null): value is MusicSource =>
  SUPPORTED_SOURCES.includes(value as MusicSource);

export async function loadPreferredSource(): Promise<MusicSource | null> {
  try {
    const stored = await keyValue.getItem(PREFERRED_SOURCE_KEY);
    return isMusicSource(stored) ? stored : null;
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
