import { File } from 'expo-file-system';

// Exports and posters are written to the app's temporary directory, which iOS doesn't reliably
// purge: each one is deleted as soon as nothing needs it.

export function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function deleteFile(uri: string): void {
  try {
    new File(uri).delete();
  } catch {}
}
