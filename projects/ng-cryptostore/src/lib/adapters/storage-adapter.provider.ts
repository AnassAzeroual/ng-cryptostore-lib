import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UnsupportedStorageTypeError } from '../errors';
import { STORAGE_CONFIG } from '../StorageConfig';
import { CookieService } from './CookieService.service';
import { IndexedDBService } from './IndexedDBService.service';
import { MemoryStorageAdapter, StorageAdapter, StorageLike } from './storage-adapter';
import { WebStorageAdapter } from './web-storage.adapter';

/**
 * Injection token of the backend used by `StorageService`.
 *
 * Override it to plug a custom implementation:
 *
 * ```ts
 * providers: [
 *   { provide: STORAGE_ADAPTER, useValue: myAsyncAdapter }
 * ]
 * ```
 */
export const STORAGE_ADAPTER = new InjectionToken<StorageAdapter>('ng-cryptostore:storage-adapter', {
  providedIn: 'root',
  factory: (): StorageAdapter => {
    const config = inject(STORAGE_CONFIG);
    const storageType: string = config.storageType;
    const prefix = config.keyPrefix ?? '';

    // Server side rendering / web workers: keep the API working with an in-memory store.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return new MemoryStorageAdapter();
    }

    switch (storageType) {
      case 'localStorage':
        return new WebStorageAdapter(nativeStorage('localStorage'), 'localStorage', prefix);
      case 'sessionStorage':
        return new WebStorageAdapter(nativeStorage('sessionStorage'), 'sessionStorage', prefix);
      case 'cookies':
        return inject(CookieService);
      case 'IndexedDB':
        return inject(IndexedDBService);
      case 'memory':
        return new MemoryStorageAdapter();
      default:
        throw new UnsupportedStorageTypeError(storageType);
    }
  }
});

/**
 * Returns the native storage object, or an in-memory fallback when the browser blocks
 * access to it (private mode, cookies/storage disabled by policy...).
 */
function nativeStorage(kind: 'localStorage' | 'sessionStorage'): StorageLike {
  try {
    const storage = globalThis[kind] as StorageLike | undefined;
    if (storage) return storage;
  } catch {
    // Reading the property itself can throw a SecurityError.
  }
  console.warn(`ng-cryptostore: ${kind} is not available in this browser, falling back to an in-memory store.`);
  return new MemoryStorageAdapter();
}
