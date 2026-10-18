import { StorageType } from '../StorageConfig';

/** Minimal shape shared by the browser `Storage` interface and in-memory implementations. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * Backend contract used internally by `StorageService`.
 *
 * Values are always strings (already encrypted). Implement this interface and provide it
 * through `STORAGE_ADAPTER` to plug a custom backend (React Native AsyncStorage, Capacitor
 * Preferences, a remote API...). Adapters that are inherently asynchronous
 * (IndexedDB, network, native bridges) must set `isAsync: true` and return promises.
 */
export interface SyncStorageAdapter {
  readonly isAsync: false;
  readonly kind: StorageType;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** All logical keys currently held by the backend. */
  keys(): string[];
  /** Removes every entry owned by the backend (or only the ones matching the key prefix). */
  clear(): void;
}

/** Asynchronous flavour of {@link SyncStorageAdapter}. */
export interface AsyncStorageAdapter {
  readonly isAsync: true;
  readonly kind: StorageType;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export type StorageAdapter = SyncStorageAdapter | AsyncStorageAdapter;

/**
 * In-memory key/value store.
 *
 * Used automatically when the application runs outside a browser (SSR, unit tests) and
 * available as the `memory` storage type for short lived data.
 */
export class MemoryStorageAdapter implements SyncStorageAdapter, StorageLike {
  readonly isAsync = false as const;
  readonly kind: StorageType = 'memory';

  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }
}
