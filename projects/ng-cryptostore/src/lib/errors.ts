/**
 * Base class for every error thrown by ng-cryptostore.
 *
 * Catch this type to handle any library failure:
 *
 * ```ts
 * try {
 *   await store.asyncGet('fruits');
 * } catch (error) {
 *   if (error instanceof NgCryptoStoreError) {
 *     console.error(error.message);
 *   }
 * }
 * ```
 */
export class NgCryptoStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when the configured storage type is unknown or not provided. */
export class UnsupportedStorageTypeError extends NgCryptoStoreError {
  constructor(storageType: unknown) {
    super(
      `Unsupported storage type: "${String(storageType)}". ` +
        `Expected one of "localStorage", "sessionStorage", "IndexedDB", "cookies" or "memory".`
    );
  }
}

/** Thrown when the underlying storage is unavailable (private mode, disabled cookies, no IndexedDB support, SSR...). */
export class StorageUnavailableError extends NgCryptoStoreError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Thrown when a synchronous method is used while an asynchronous backend (IndexedDB) is configured. */
export class AsyncStorageError extends NgCryptoStoreError {
  constructor(method: string, storageType: string) {
    super(
      `"${method}()" cannot be used with the asynchronous "${storageType}" storage. ` +
        `Use the asynchronous variant instead (for example "asyncGet()", "remove()" or "clearAll()").`
    );
  }
}

/** Thrown when writing to a storage backend fails (quota exceeded, storage disabled...). */
export class StorageWriteError extends NgCryptoStoreError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Thrown when data is too large for a single cookie and exceeds the chunk limit. */
export class CookieLimitError extends NgCryptoStoreError {
  constructor(key: string, size: number, limit: number) {
    super(
      `The value for "${key}" needs ${size} characters and cannot be stored in cookies ` +
        `(maximum ${limit} characters). Consider using "localStorage" or "IndexedDB" instead.`
    );
  }
}

/** Thrown when a payload cannot be decrypted (wrong secret or corrupted data). */
export class DecryptionError extends NgCryptoStoreError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Thrown when the payload was tampered with: the authentication tag does not match. */
export class IntegrityError extends DecryptionError {
  constructor(message = 'The stored value failed its integrity check and was rejected.') {
    super(message);
  }
}
