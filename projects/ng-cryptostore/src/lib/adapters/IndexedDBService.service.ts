import { Injectable, inject } from '@angular/core';
import { StorageUnavailableError } from '../errors';
import { IndexedDBOptions, STORAGE_CONFIG } from '../StorageConfig';
import { AsyncStorageAdapter } from './storage-adapter';

/**
 * IndexedDB backend.
 *
 * Rewritten from scratch: the historical implementation created an auto-incrementing store
 * (`keyPath`) and then called `add(value, key)`, which always throws a `DataError`, so
 * nothing could ever be stored. This version is a plain asynchronous key/value store:
 *
 * - the database is opened once, lazily, and the connection is shared by every call
 *   (concurrent calls during startup wait on the same promise),
 * - writes are `put()` (upsert) instead of `add()` so updating a key works,
 * - opening a database created by an old version re-creates the incompatible object store,
 * - `onblocked` / `onversionchange` are handled so other tabs can upgrade the schema.
 */
@Injectable({ providedIn: 'root' })
export class IndexedDBService implements AsyncStorageAdapter {
  readonly isAsync = true as const;
  readonly kind = 'IndexedDB' as const;

  private readonly config = inject(STORAGE_CONFIG);
  private database: Promise<IDBDatabase> | null = null;

  private get options(): Required<IndexedDBOptions> {
    const options: IndexedDBOptions = this.config.indexedDB ?? {};
    return {
      databaseName: options.databaseName ?? 'myDatabase',
      storeName: options.storeName ?? 'myObjectStore',
      version: options.version ?? 2
    };
  }

  async getItem(key: string): Promise<string | null> {
    const value = await this.run('readonly', (store) => store.get(key));
    return typeof value === 'string' ? value : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.run('readwrite', (store) => store.put(value, key));
  }

  async removeItem(key: string): Promise<void> {
    await this.run('readwrite', (store) => store.delete(key));
  }

  async keys(): Promise<string[]> {
    const keys = await this.run('readonly', (store) => store.getAllKeys());
    return keys.map(String);
  }

  async clear(): Promise<void> {
    await this.run('readwrite', (store) => store.clear());
  }

  /**
   * Closes the underlying connection (it is reopened lazily on the next call).
   * Useful in tests and before deleting the database.
   */
  close(): void {
    const pending = this.database;
    this.database = null;
    pending?.then((database) => database.close()).catch(() => undefined);
  }

  // ---------------------------------------------------------------------------
  // Historical API (kept for backward compatibility)
  // ---------------------------------------------------------------------------

  /** @deprecated Use `setItem(key, value)` instead. */
  create(key: string, value: string): Promise<void> {
    return this.setItem(key, value);
  }

  /** @deprecated Use `getItem(key)` instead. */
  read(key: string): Promise<string | null> {
    return this.getItem(key);
  }

  /** @deprecated Use `setItem(key, value)` instead. */
  update(key: string, value: string): Promise<void> {
    return this.setItem(key, value);
  }

  /** @deprecated Use `removeItem(key)` instead. */
  delete(key: string): Promise<void> {
    return this.removeItem(key);
  }

  /** @deprecated Use `clear()` instead. */
  deleteAll(): Promise<void> {
    return this.clear();
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private openDatabase(): Promise<IDBDatabase> {
    if (this.database) return this.database;

    const { databaseName, storeName, version } = this.options;
    this.database = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new StorageUnavailableError('IndexedDB is not available in this environment.'));
        return;
      }

      const request = indexedDB.open(databaseName, version);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (database.objectStoreNames.contains(storeName)) {
          // Object stores created by ng-cryptostore <= 21.0.x use an inline keyPath and are
          // incompatible with key/value access: recreate them.
          const existing = request.transaction?.objectStore(storeName);
          if (existing && existing.keyPath !== null) {
            database.deleteObjectStore(storeName);
          }
        }
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.database = null;
        };
        resolve(database);
      };

      request.onerror = () => {
        this.database = null;
        reject(
          new StorageUnavailableError(`Unable to open the IndexedDB database "${databaseName}".`, {
            cause: request.error
          })
        );
      };
    });

    // Never cache a rejected promise; every caller still receives the rejection.
    this.database.catch(() => {
      this.database = null;
    });
    return this.database;
  }

  private async run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const database = await this.openDatabase();
    const { storeName } = this.options;

    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      let request: IDBRequest<T>;
      try {
        transaction = database.transaction(storeName, mode);
        request = action(transaction.objectStore(storeName));
      } catch (error) {
        reject(
          new StorageUnavailableError(`The IndexedDB store "${storeName}" could not be accessed.`, { cause: error })
        );
        return;
      }

      let result: T;
      request.onsuccess = () => {
        result = request.result;
        if (mode === 'readonly') resolve(result);
      };
      request.onerror = () => {
        reject(request.error ?? new StorageUnavailableError('An IndexedDB request failed.'));
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => {
        reject(transaction.error ?? new StorageUnavailableError('The IndexedDB transaction was aborted.'));
      };
    });
  }
}
