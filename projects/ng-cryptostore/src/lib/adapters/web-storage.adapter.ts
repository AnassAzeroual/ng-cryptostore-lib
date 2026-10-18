import { StorageWriteError } from '../errors';
import { StorageType } from '../StorageConfig';
import { StorageLike, SyncStorageAdapter } from './storage-adapter';

/**
 * Adapter for the synchronous Web Storage APIs (`localStorage` / `sessionStorage`).
 *
 * Every access is guarded because some environments (Safari private mode, storage disabled
 * by policy) throw on read as well as on write. `clear()` deletes the whole storage when no
 * key prefix is configured (historical behaviour) and only the prefixed keys otherwise.
 */
export class WebStorageAdapter implements SyncStorageAdapter, StorageLike {
  readonly isAsync = false as const;

  constructor(
    private readonly target: StorageLike,
    readonly kind: StorageType,
    private readonly prefix = ''
  ) {}

  get length(): number {
    return this.guard(() => this.target.length, 0);
  }

  key(index: number): string | null {
    return this.guard(() => this.target.key(index), null);
  }

  getItem(key: string): string | null {
    return this.guard(() => this.target.getItem(key), null);
  }

  setItem(key: string, value: string): void {
    try {
      this.target.setItem(key, value);
    } catch (error) {
      throw new StorageWriteError(
        `Unable to write "${key}" to ${this.kind}. The storage may be full or disabled by the browser.`,
        { cause: error }
      );
    }
  }

  removeItem(key: string): void {
    this.guard(() => this.target.removeItem(key), undefined);
  }

  keys(): string[] {
    const result: string[] = [];
    const length = this.guard(() => this.target.length, 0);
    for (let index = 0; index < length; index++) {
      const key = this.guard(() => this.target.key(index), null);
      if (key !== null) result.push(key);
    }
    return result;
  }

  clear(): void {
    if (!this.prefix) {
      this.guard(() => this.target.clear(), undefined);
      return;
    }
    for (const key of this.keys()) {
      if (key.startsWith(this.prefix)) {
        this.guard(() => this.target.removeItem(key), undefined);
      }
    }
  }

  private guard<T>(operation: () => T, fallback: T): T {
    try {
      return operation();
    } catch {
      return fallback;
    }
  }
}
