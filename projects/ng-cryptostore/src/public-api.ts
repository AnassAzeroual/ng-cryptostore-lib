/*
 * Public API Surface of ng-cryptostore
 */

export { StorageService } from './lib/storage.service';
export { StorageModule, provideNgCryptoStore } from './lib/Storage.module';
export { DEFAULT_STORAGE_CONFIG, STORAGE_CONFIG } from './lib/StorageConfig';
export type {
  CookieOptions,
  EncryptionOptions,
  IndexedDBOptions,
  StorageConfig,
  StorageType
} from './lib/StorageConfig';
export { CryptoService, DEFAULT_SECRET } from './lib/crypto.service';
export { decodeJson, encodeJson } from './lib/json-codec';
export { STORAGE_ADAPTER } from './lib/adapters/storage-adapter.provider';
export { MemoryStorageAdapter } from './lib/adapters/storage-adapter';
export type { AsyncStorageAdapter, StorageAdapter, StorageLike, SyncStorageAdapter } from './lib/adapters/storage-adapter';
export { WebStorageAdapter } from './lib/adapters/web-storage.adapter';
export { CookieService } from './lib/adapters/CookieService.service';
export { IndexedDBService } from './lib/adapters/IndexedDBService.service';
export {
  AsyncStorageError,
  CookieLimitError,
  DecryptionError,
  IntegrityError,
  NgCryptoStoreError,
  StorageUnavailableError,
  StorageWriteError,
  UnsupportedStorageTypeError
} from './lib/errors';
