import { TestBed } from '@angular/core/testing';
import { AsyncStorageError } from '../errors';
import { provideNgCryptoStore } from '../Storage.module';
import { StorageService } from '../storage.service';
import { IndexedDBService } from './IndexedDBService.service';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('IndexedDB backend', () => {
  let databaseName: string;

  beforeEach(() => {
    databaseName = `ngcs_test_${Math.random().toString(36).slice(2)}`;
  });

  afterEach(async () => {
    try {
      TestBed.inject(IndexedDBService).close();
    } catch {
      // No testing module configured for this spec.
    }
    TestBed.resetTestingModule();
    await deleteDatabase(databaseName);
  });

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideNgCryptoStore({
          storageType: 'IndexedDB',
          encryption: { iterations: 10 },
          indexedDB: { databaseName, storeName: 'kv' }
        })
      ]
    });
  }

  it('stores, overwrites, reads and removes values through the async API', async () => {
    configure();
    const store = TestBed.inject(StorageService);

    await store.set('fruits', [{ name: 'fraise' }]);
    expect(await store.asyncGet('fruits')).toEqual([{ name: 'fraise' }]);
    expect(await store.asyncCheck('fruits')).toBeTrue();
    expect(await store.keys()).toEqual(['fruits']);

    await store.set('fruits', [{ name: 'banana' }]); // upsert
    expect(await store.asyncGet('fruits')).toEqual([{ name: 'banana' }]);

    expect(await store.getItemLength('fruits')).toBe(1);
    const payload = await store.asyncGetEncrypted('fruits');
    expect((payload as string).startsWith('v2.')).toBeTrue();
    expect(await store.decrypt(payload as string)).toEqual([{ name: 'banana' }]);

    await store.remove('fruits');
    expect(await store.asyncGet('fruits')).toBe('');

    await store.set('a', 1);
    await store.clearAll();
    expect(await store.keys()).toEqual([]);
  });

  it('rejects the synchronous APIs with a helpful error', async () => {
    configure();
    const store = TestBed.inject(StorageService);
    await store.set('k', 'v');

    expect(store.storageType).toBe('IndexedDB');
    expect(store.isAsyncStorage).toBeTrue();
    expect(() => store.get('k')).toThrowError(AsyncStorageError);
    expect(() => store.getEncrypted('k')).toThrowError(AsyncStorageError);
    expect(() => store.check('k')).toThrowError(AsyncStorageError);
  });

  it('queues concurrent operations while the database opens', async () => {
    configure();
    const store = TestBed.inject(StorageService);

    await Promise.all(Array.from({ length: 12 }, (_, index) => store.set(`k${index}`, index)));

    const values = await Promise.all(Array.from({ length: 12 }, (_, index) => store.asyncGet(`k${index}`)));
    expect(values).toEqual(Array.from({ length: 12 }, (_, index) => index));
    expect((await store.keys()).length).toBe(12);
  });

  it('upgrades a database created by ng-cryptostore <= 21.0.x', async () => {
    // Reproduce the historical, incompatible schema: an inline keyPath object store.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('kv', { keyPath: 'id', autoIncrement: true });
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    configure();
    const store = TestBed.inject(StorageService);

    await store.set('k', 'v');
    expect(await store.asyncGet('k')).toBe('v');
  });

  it('keeps the historical IndexedDBService API working', async () => {
    configure();
    const service = TestBed.inject(IndexedDBService);

    await service.create('legacy', 'value');
    expect(await service.read('legacy')).toBe('value');

    await service.update('legacy', 'updated');
    expect(await service.read('legacy')).toBe('updated');

    await service.delete('legacy');
    expect(await service.read('legacy')).toBeNull();

    await service.create('a', '1');
    await service.deleteAll();
    expect(await service.keys()).toEqual([]);
  });
});
