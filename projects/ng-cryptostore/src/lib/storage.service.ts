import { DestroyRef, Injectable, inject } from '@angular/core';
import { AsyncStorageAdapter, SyncStorageAdapter } from './adapters/storage-adapter';
import { STORAGE_ADAPTER } from './adapters/storage-adapter.provider';
import { CryptoService, DEFAULT_SECRET } from './crypto.service';
import { AsyncStorageError, DecryptionError } from './errors';
import { decodeJson, encodeJson } from './json-codec';
import { STORAGE_CONFIG, StorageType } from './StorageConfig';

/**
 * Encrypted key/value storage for Angular applications.
 *
 * Values are serialized with a rich JSON codec (dates, maps, sets, bigints survive the
 * round trip), encrypted (AES-256-CBC, PBKDF2 derivation, HMAC-SHA256 integrity tag) and
 * handed over to the configured backend: `localStorage`, `sessionStorage`, `IndexedDB`,
 * `cookies` or `memory`.
 *
 * ### Synchronous vs asynchronous
 *
 * `localStorage`, `sessionStorage`, `cookies` and `memory` are synchronous: use `get()`,
 * `getEncrypted()` and `check()`. `IndexedDB` is asynchronous: only the async APIs
 * (`asyncGet()`, `asyncGetEncrypted()`, `asyncCheck()`) work with it, everything else throws
 * {@link AsyncStorageError}. Mutating operations (`set`, `remove`, `clearAll`) are always
 * asynchronous so the same code works with every backend.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly adapter = inject(STORAGE_ADAPTER);
  private readonly crypto = inject(CryptoService);
  private readonly config = inject(STORAGE_CONFIG);

  private readonly prefix = this.config.keyPrefix ?? '';
  private readonly cacheEnabled = this.config.cache !== false;
  private readonly plaintextCache = new Map<string, string>();
  private readonly syncAdapter: SyncStorageAdapter | null = this.adapter.isAsync ? null : this.adapter;
  private readonly asyncAdapter: AsyncStorageAdapter | null = this.adapter.isAsync ? this.adapter : null;

  constructor() {
    if (this.cacheEnabled && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const onStorage = (event: StorageEvent) => this.handleStorageEvent(event);
      window.addEventListener('storage', onStorage);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
    }
  }

  /** Backend currently in use. */
  get storageType(): StorageType {
    return this.adapter.kind;
  }

  /** `true` when the backend is asynchronous (IndexedDB or a custom async adapter). */
  get isAsyncStorage(): boolean {
    return this.adapter.isAsync;
  }

  /**
   * Encrypts and stores a value.
   *
   * ```ts
   * await store.set('fruits', [{ name: 'fraise', icons: '🍓' }]);
   * await store.set('session', user, 'my-own-secret');
   * ```
   */
  async set<T>(name: string, data: T, secret?: string): Promise<void> {
    const key = this.toKey(name);
    const effectiveSecret = this.toSecret(secret);
    const json = encodeJson(data);
    const payload = this.crypto.encryptString(json, effectiveSecret);

    if (this.asyncAdapter) {
      await this.asyncAdapter.setItem(key, payload);
    } else {
      this.syncAdapter?.setItem(key, payload);
    }

    if (this.cacheEnabled) {
      this.plaintextCache.set(this.cacheKey(key, effectiveSecret), json);
    }
  }

  /**
   * Reads and decrypts a value (synchronous backends only).
   *
   * Returns `''` when the key does not exist and throws {@link DecryptionError} when the
   * payload cannot be decrypted (wrong secret) or was tampered with.
   */
  get<T = unknown>(name: string, secret?: string): T | '' | null {
    const adapter = this.requireSync('get');
    const key = this.toKey(name);
    const payload = this.normalizePayload(adapter.getItem(key));
    if (payload === null) return '';
    return this.decode<T>(key, payload, this.toSecret(secret));
  }

  /** Asynchronous counterpart of {@link get}, required for asynchronous backends. */
  async asyncGet<T = unknown>(name: string, secret?: string): Promise<T | '' | null> {
    const key = this.toKey(name);
    const payload = this.normalizePayload(await this.adapter.getItem(key));
    if (payload === null) return '';
    return this.decode<T>(key, payload, this.toSecret(secret));
  }

  /** Returns the raw encrypted payload (synchronous backends only). `''` when missing. */
  getEncrypted(name: string): string | '' | null {
    const adapter = this.requireSync('getEncrypted');
    return this.normalizePayload(adapter.getItem(this.toKey(name))) ?? '';
  }

  /** Asynchronous counterpart of {@link getEncrypted}. */
  async asyncGetEncrypted(name: string): Promise<string | '' | null> {
    return this.normalizePayload(await this.adapter.getItem(this.toKey(name))) ?? '';
  }

  /** `true` when a (non empty) value exists for `name` (synchronous backends only). */
  check(name: string): boolean {
    const adapter = this.requireSync('check');
    return this.normalizePayload(adapter.getItem(this.toKey(name))) !== null;
  }

  /** Asynchronous counterpart of {@link check}. */
  async asyncCheck(name: string): Promise<boolean> {
    return this.normalizePayload(await this.adapter.getItem(this.toKey(name))) !== null;
  }

  /** Removes one entry. */
  async remove(name: string): Promise<void> {
    const key = this.toKey(name);
    if (this.asyncAdapter) {
      await this.asyncAdapter.removeItem(key);
    } else {
      this.syncAdapter?.removeItem(key);
    }
    this.invalidateKey(key);
  }

  /** Removes every entry owned by the configured backend (respecting `keyPrefix` when set). */
  async clearAll(): Promise<void> {
    if (this.asyncAdapter) {
      await this.asyncAdapter.clear();
    } else {
      this.syncAdapter?.clear();
    }
    this.plaintextCache.clear();
  }

  /** Names of the entries currently stored (the configured `keyPrefix` is stripped). */
  async keys(): Promise<string[]> {
    const allKeys = await this.adapter.keys();
    if (!this.prefix) return allKeys;
    return allKeys
      .filter((key) => key.startsWith(this.prefix))
      .map((key) => key.slice(this.prefix.length));
  }

  /**
   * Decrypts a value and measures its size: character count for strings, item count for
   * arrays / maps / sets, own key count for plain objects. `0` for primitives.
   */
  async getItemLength(name: string, secret?: string): Promise<number> {
    return measureLength(await this.asyncGet(name, secret));
  }

  /** Encrypts any value without storing it. */
  async crypt(data: unknown, secret?: string): Promise<string> {
    return this.crypto.encrypt(data, this.toSecret(secret));
  }

  /** Decrypts any payload produced by {@link crypt} or {@link getEncrypted}. */
  async decrypt<T = unknown>(payload: string, secret?: string): Promise<T | ''> {
    if (!payload) return '';
    return this.crypto.decrypt<T>(payload, this.toSecret(secret));
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private requireSync(method: string): SyncStorageAdapter {
    const adapter = this.syncAdapter;
    if (!adapter) {
      throw new AsyncStorageError(method, this.adapter.kind);
    }
    return adapter;
  }

  private decode<T>(key: string, payload: string, secret: string): T {
    const cacheKey = this.cacheKey(key, secret);
    let json = this.cacheEnabled ? this.plaintextCache.get(cacheKey) : undefined;

    if (json === undefined) {
      json = this.crypto.decryptString(payload, secret);
      if (this.cacheEnabled) this.plaintextCache.set(cacheKey, json);
    }

    try {
      return decodeJson<T>(json);
    } catch (error) {
      this.plaintextCache.delete(cacheKey);
      throw new DecryptionError('The stored value is not valid JSON: wrong secret or corrupted data.', { cause: error });
    }
  }

  private toKey(name: string): string {
    if (typeof name !== 'string' || name.length === 0) {
      throw new TypeError('The storage key must be a non-empty string.');
    }
    return this.prefix + name;
  }

  private toSecret(secret?: string): string {
    return secret || this.config.secret || DEFAULT_SECRET;
  }

  private cacheKey(storageKey: string, secret: string): string {
    return `${storageKey}\u0000${secret}`;
  }

  private invalidateKey(storageKey: string): void {
    const marker = `${storageKey}\u0000`;
    for (const key of Array.from(this.plaintextCache.keys())) {
      if (key.startsWith(marker)) this.plaintextCache.delete(key);
    }
  }

  private normalizePayload(value: string | null | undefined): string | null {
    return value === null || value === undefined || value.length === 0 ? null : value;
  }

  /** Another tab changed the storage: drop the affected decrypted values. */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key === null) {
      this.plaintextCache.clear();
      return;
    }
    if (this.prefix && !event.key.startsWith(this.prefix)) return;
    this.invalidateKey(event.key);
  }
}

function measureLength(data: unknown): number {
  if (data === null || data === undefined || data === '') return 0;
  if (typeof data === 'string' || Array.isArray(data)) return data.length;
  if (data instanceof Map || data instanceof Set) return data.size;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  if (typeof data === 'object') return Object.keys(data).length;
  return 0;
}
