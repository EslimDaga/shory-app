import type { KeyValueStore } from './keyValue';

export type { KeyValueStore } from './keyValue';

export const keyValue: KeyValueStore = {
  getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key) => globalThis.localStorage?.removeItem(key),
};
