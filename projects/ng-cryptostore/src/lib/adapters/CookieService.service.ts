import { Injectable, inject } from '@angular/core';
import { CookieLimitError, StorageUnavailableError } from '../errors';
import { CookieOptions, STORAGE_CONFIG } from '../StorageConfig';
import { SyncStorageAdapter } from './storage-adapter';

const CHUNK_MARKER = '__ngcs_chunked__';
const CHUNK_INFIX = '.__ngcs_';
const MAX_CHUNKS = 64;
const DEFAULT_MAX_COOKIE_SIZE = 3800;

/**
 * Cookie backend.
 *
 * Fixes and improvements over the historical implementation:
 * - values are URI encoded and decoded (cookie-safe),
 * - large values are transparently split into chunks (cookies are limited to ~4 KB),
 *   up to {@link MAX_CHUNKS} chunks, and reassembled on read,
 * - the `Path`, `Domain`, `SameSite` and `Secure` attributes are always written so that
 *   reading and deleting a cookie works from any route of the application,
 * - `clear()` only removes the cookies owned by the configured `keyPrefix`
 *   (every cookie of the application when no prefix is configured, the historical behaviour),
 * - safe on the server: reads return `null`, writes throw {@link StorageUnavailableError}.
 */
@Injectable({ providedIn: 'root' })
export class CookieService implements SyncStorageAdapter {
  readonly isAsync = false as const;
  readonly kind = 'cookies' as const;

  private readonly config = inject(STORAGE_CONFIG);

  private get options(): {
    path: string;
    domain: string | undefined;
    sameSite: 'Lax' | 'Strict' | 'None';
    secure: boolean;
    expiresInDays: number | null;
    maxCookieSize: number;
  } {
    const cookies: CookieOptions = this.config.cookies ?? {};
    return {
      path: cookies.path ?? '/',
      domain: cookies.domain,
      sameSite: cookies.sameSite ?? 'Lax',
      secure: cookies.secure ?? isSecureContext(),
      expiresInDays: cookies.expiresInDays === undefined ? 1 : cookies.expiresInDays,
      maxCookieSize: Math.max(200, cookies.maxCookieSize ?? DEFAULT_MAX_COOKIE_SIZE)
    };
  }

  private get prefix(): string {
    return this.config.keyPrefix ?? '';
  }

  // ---------------------------------------------------------------------------
  // StorageAdapter implementation
  // ---------------------------------------------------------------------------

  getItem(key: string): string | null {
    const raw = this.readRaw(key);
    if (raw === null) return null;

    if (raw.startsWith(`${CHUNK_MARKER}:`)) {
      const count = Number.parseInt(raw.slice(CHUNK_MARKER.length + 1), 10);
      if (!Number.isInteger(count) || count <= 0 || count > MAX_CHUNKS) return null;
      let encoded = '';
      for (let index = 0; index < count; index++) {
        const part = this.readRaw(this.chunkKey(key, index));
        if (part === null) return null;
        encoded += part;
      }
      return decodeSafely(encoded);
    }

    return decodeSafely(raw);
  }

  setItem(key: string, value: string): void {
    this.write(key, value, this.options.expiresInDays);
  }

  removeItem(key: string): void {
    const chunks = this.chunkCount(key);
    this.deleteRaw(key);
    this.deleteChunks(key, chunks);
  }

  keys(): string[] {
    const names = new Set<string>();
    for (const name of this.cookieNames()) {
      if (!name.includes(CHUNK_INFIX)) names.add(name);
    }
    return Array.from(names);
  }

  clear(): void {
    const names = this.keys();
    for (const name of names) {
      if (!this.prefix || name.startsWith(this.prefix)) {
        this.removeItem(name);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Historical API (kept for backward compatibility)
  // ---------------------------------------------------------------------------

  /**
   * @deprecated Use `setItem(key, value)` instead. Kept for backward compatibility.
   * `expires` accepts a number of days or an absolute `Date`.
   */
  create(key: string, value: string, expires?: number | Date): void {
    if (expires === undefined) {
      this.setItem(key, value);
      return;
    }
    const days = expires instanceof Date ? (expires.getTime() - Date.now()) / 86_400_000 : expires;
    this.write(key, value, days);
  }

  /** @deprecated Use `getItem(key)` instead. Returns `''` when the cookie is missing. */
  read(key: string): string {
    return this.getItem(key) ?? '';
  }

  /** @deprecated Use `setItem(key, value)` instead. */
  update(key: string, value: string, expires?: number | Date): void {
    this.create(key, value, expires);
  }

  /** @deprecated Use `removeItem(key)` instead. */
  delete(key: string): void {
    this.removeItem(key);
  }

  /** @deprecated Use `clear()` instead. */
  deleteAll(): void {
    this.clear();
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private write(key: string, value: string, expiresInDays: number | null): void {
    this.assertAvailable();
    const encoded = encodeURIComponent(value);
    const { maxCookieSize } = this.options;
    const previousChunks = this.chunkCount(key);

    if (encoded.length <= maxCookieSize) {
      this.writeRaw(key, encoded, expiresInDays);
      if (previousChunks > 0) this.deleteChunks(key, previousChunks);
      return;
    }

    const count = Math.ceil(encoded.length / maxCookieSize);
    if (count > MAX_CHUNKS) {
      throw new CookieLimitError(key, value.length, maxCookieSize * MAX_CHUNKS);
    }

    for (let index = 0; index < count; index++) {
      const part = encoded.slice(index * maxCookieSize, (index + 1) * maxCookieSize);
      this.writeRaw(this.chunkKey(key, index), part, expiresInDays);
    }
    this.writeRaw(key, `${CHUNK_MARKER}:${count}`, expiresInDays);

    if (previousChunks > count) this.deleteChunks(key, previousChunks, count);
  }

  private readRaw(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const prefix = `${key}=`;
    for (const entry of document.cookie.split(';')) {
      const trimmed = entry.trimStart();
      if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
    }
    return null;
  }

  private writeRaw(key: string, value: string, expiresInDays: number | null): void {
    this.assertAvailable();
    const options = this.options;
    let cookie = `${key}=${value}`;
    if (expiresInDays !== null) {
      const expires = new Date();
      expires.setTime(expires.getTime() + expiresInDays * 86_400_000);
      cookie += `; expires=${expires.toUTCString()}`;
    }
    cookie += `; path=${options.path}`;
    if (options.domain) cookie += `; domain=${options.domain}`;
    cookie += `; SameSite=${options.sameSite}`;
    if (options.secure) cookie += '; Secure';
    document.cookie = cookie;
  }

  private deleteRaw(key: string): void {
    if (typeof document === 'undefined') return;
    this.writeRaw(key, '', -1);
  }

  private cookieNames(): string[] {
    if (typeof document === 'undefined') return [];
    const names: string[] = [];
    for (const entry of document.cookie.split(';')) {
      const separator = entry.indexOf('=');
      if (separator === -1) continue;
      const name = entry.slice(0, separator).trim();
      if (name) names.push(name);
    }
    return names;
  }

  private chunkKey(key: string, index: number): string {
    return `${key}${CHUNK_INFIX}${index}`;
  }

  private chunkCount(key: string): number {
    const raw = this.readRaw(key);
    if (raw === null || !raw.startsWith(`${CHUNK_MARKER}:`)) return 0;
    const count = Number.parseInt(raw.slice(CHUNK_MARKER.length + 1), 10);
    return Number.isInteger(count) && count > 0 && count <= MAX_CHUNKS ? count : 0;
  }

  private deleteChunks(key: string, count: number, from = 0): void {
    for (let index = from; index < count; index++) {
      this.deleteRaw(this.chunkKey(key, index));
    }
  }

  private assertAvailable(): void {
    if (typeof document === 'undefined') {
      throw new StorageUnavailableError('Cookies cannot be written outside of a browser environment.');
    }
  }
}

function decodeSafely(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function isSecureContext(): boolean {
  return typeof location !== 'undefined' && location.protocol === 'https:';
}
