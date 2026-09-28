import * as SecureStore from 'expo-secure-store';
import { keyValue, type KeyValueStore } from '@/services/storage/keyValue';

// Supabase's session (access + refresh token) lives in the iOS Keychain, never in plain SQLite.
// A session can outgrow what one Keychain item comfortably holds, so it's split into chunks:
// `<key>.count` says how many, `<key>.0`, `<key>.1`… hold the pieces.
const CHUNK_SIZE = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  // Readable in the background after the first unlock (token refresh), and never restored onto
  // another device from a backup.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// Every key this store has written, kept in the Keychain itself.
const INDEX_KEY = 'shory.auth.keys';
// The Keychain outlives an uninstall; app storage doesn't. A missing marker means a fresh install,
// so a session left behind by a previous install is wiped instead of silently signing someone in.
const INSTALL_MARKER_KEY = 'shory.auth.installed';

const countKey = (key: string) => `${key}.count`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readIndex(): Promise<string[]> {
  try {
    const stored = await SecureStore.getItemAsync(INDEX_KEY, OPTIONS);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

async function readChunkCount(key: string): Promise<number> {
  const stored = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  const count = stored ? Number.parseInt(stored, 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function removeSecure(key: string): Promise<void> {
  const count = await readChunkCount(key);
  await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS)),
  );
  await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
}

let installCheck: Promise<void> | null = null;

function wipeIfFreshInstall(): Promise<void> {
  installCheck ??= (async () => {
    if (await keyValue.getItem(INSTALL_MARKER_KEY)) return;
    await Promise.all((await readIndex()).map(removeSecure));
    await SecureStore.deleteItemAsync(INDEX_KEY, OPTIONS);
    await keyValue.setItem(INSTALL_MARKER_KEY, '1');
  })();
  return installCheck;
}

export const secureSessionStorage: KeyValueStore = {
  async getItem(key) {
    await wipeIfFreshInstall();
    const count = await readChunkCount(key);
    if (count > 0) {
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index), OPTIONS)),
      );
      // A partial write (app killed mid-save) leaves a corrupt session: treat it as signed out.
      if (chunks.some((chunk) => chunk === null)) {
        await removeSecure(key);
        return null;
      }
      return chunks.join('');
    }

    // Sessions saved by earlier versions sat in plain app storage: move them into the Keychain.
    const legacy = await keyValue.getItem(key);
    if (legacy === null) return null;
    await secureSessionStorage.setItem(key, legacy);
    await keyValue.removeItem(key);
    return legacy;
  },

  async setItem(key, value) {
    await wipeIfFreshInstall();
    await removeSecure(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk, OPTIONS)),
    );
    // The count goes last: until it's written, a reader sees no session rather than half of one.
    await SecureStore.setItemAsync(countKey(key), String(chunks.length), OPTIONS);
    const index = await readIndex();
    if (!index.includes(key)) {
      await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...index, key]), OPTIONS);
    }
  },

  async removeItem(key) {
    await wipeIfFreshInstall();
    await removeSecure(key);
    await keyValue.removeItem(key);
  },
};
