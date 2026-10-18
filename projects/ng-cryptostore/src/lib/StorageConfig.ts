import { InjectionToken } from '@angular/core';

/** Every backend supported by the library. */
export type StorageType = 'localStorage' | 'sessionStorage' | 'IndexedDB' | 'cookies' | 'memory';

/** Fine tuning of the encryption layer. */
export interface EncryptionOptions {
  /**
   * Payload format written by the library.
   *
   * - `v2` (default): random salt + random IV per value, PBKDF2 key derivation and an
   *   HMAC-SHA256 authentication tag (tamper detection).
   * - `legacy`: the historical format (static IV derived from the secret, no authentication).
   *   Only use it to stay interoperable with data written by ng-cryptostore <= 21.0.x while an
   *   older version of the library is still deployed somewhere. Values written in `legacy`
   *   format can always be *read* by `v2` builds, so migration is automatic on next write.
   */
  format?: 'v2' | 'legacy';
  /**
   * PBKDF2 iteration count used by the `v2` format. Defaults to `2500`.
   *
   * The key derivation is only paid when a value is encrypted or decrypted;
   * repeated reads are served by the in-memory cache unless it is disabled.
   * Raise it for stronger protection against brute force of a weak secret.
   */
  iterations?: number;
}

/** IndexedDB specific options. */
export interface IndexedDBOptions {
  /** Database name. Defaults to `myDatabase` (kept for backward compatibility). */
  databaseName?: string;
  /** Object store name. Defaults to `myObjectStore`. */
  storeName?: string;
  /** Database schema version. Defaults to `2`. */
  version?: number;
}

/** Cookie specific options. */
export interface CookieOptions {
  /** Cookie path. Defaults to `/`. */
  path?: string;
  /** Cookie domain. Defaults to the current host. */
  domain?: string;
  /** Cookie SameSite attribute. Defaults to `Lax`. */
  sameSite?: 'Lax' | 'Strict' | 'None';
  /** Write the `Secure` attribute. Defaults to `true` when served over HTTPS. */
  secure?: boolean;
  /** Lifetime in days. `null` creates a session cookie. Defaults to `1` day. */
  expiresInDays?: number | null;
  /** Maximum number of characters per cookie before values are split. Defaults to `3800`. */
  maxCookieSize?: number;
}

/** Configuration of the library, passed to `provideNgCryptoStore()`. */
export interface StorageConfig {
  /** Backend used to persist the values. */
  storageType: StorageType;
  /** Fallback secret used when no secret is passed to an API call. */
  secret?: string;
  /** Encryption tuning. */
  encryption?: EncryptionOptions;
  /**
   * Cache decrypted values in memory to avoid re-running PBKDF2/AES on every read.
   * The cache is invalidated on every write and when another browser tab changes the storage.
   * Defaults to `true`.
   */
  cache?: boolean;
  /**
   * Prefix applied to every key written by the library.
   * Useful to namespace the storage inside a shared backend or to scope `clearAll()`.
   */
  keyPrefix?: string;
  /** IndexedDB tuning. */
  indexedDB?: IndexedDBOptions;
  /** Cookie tuning. */
  cookies?: CookieOptions;
}

/** Default configuration used when the token is injected without `provideNgCryptoStore()`. */
export const DEFAULT_STORAGE_CONFIG: Readonly<StorageConfig> = Object.freeze({ storageType: 'localStorage' });

export const STORAGE_CONFIG = new InjectionToken<StorageConfig>('StorageConfig', {
  providedIn: 'root',
  factory: () => ({ ...DEFAULT_STORAGE_CONFIG })
});
