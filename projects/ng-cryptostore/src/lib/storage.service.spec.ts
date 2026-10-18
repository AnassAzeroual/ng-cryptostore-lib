import { TestBed } from '@angular/core/testing';
import { AsyncStorageAdapter, MemoryStorageAdapter } from './adapters/storage-adapter';
import { STORAGE_ADAPTER } from './adapters/storage-adapter.provider';
import { WebStorageAdapter } from './adapters/web-storage.adapter';
import { AsyncStorageError, DecryptionError, NgCryptoStoreError, UnsupportedStorageTypeError } from './errors';
import { provideNgCryptoStore } from './Storage.module';
import { StorageConfig, StorageType } from './StorageConfig';
import { StorageService } from './storage.service';

const TEST_ENCRYPTION = { iterations: 25 };

function configure(config: StorageConfig): StorageService {
  TestBed.configureTestingModule({ providers: [provideNgCryptoStore(config)] });
  return TestBed.inject(StorageService);
}

describe('StorageService (localStorage)', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    service = configure({ storageType: 'localStorage', encryption: TEST_ENCRYPTION });
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('stores and reads back every kind of value', async () => {
    const values: [string, unknown][] = [
      ['string', 'fruits: orange, fraise and 🍌'],
      ['number', 1_234_567_892_121],
      ['boolean', true],
      ['nullable', null],
      ['array', [{ name: 'fraise', icons: '🍓' }, { name: 'banana', icons: '🍌' }]],
      ['object', { nested: { deep: [1, 2, 3] } }]
    ];

    for (const [name, value] of values) {
      await service.set(name, value);
      expect(service.get(name)).withContext(name).toEqual(value);
      expect(await service.asyncGet(name)).withContext(`async ${name}`).toEqual(value);
    }
  });

  it('round trips types that JSON cannot represent', async () => {
    const date = new Date('2026-10-18T10:00:00.000Z');
    await service.set('rich', { date, big: 123n, set: new Set([1, 2]), nan: Number.NaN });

    const read = service.get<any>('rich');
    expect(read.date instanceof Date).toBeTrue();
    expect(read.date.toISOString()).toBe(date.toISOString());
    expect(read.big).toBe(123n);
    expect(read.set instanceof Set).toBeTrue();
    expect(Number.isNaN(read.nan)).toBeTrue();
  });

  it('returns an empty value for missing keys', async () => {
    expect(service.get('missing')).toBe('');
    expect(await service.asyncGet('missing')).toBe('');
    expect(service.getEncrypted('missing')).toBe('');
    expect(await service.asyncGetEncrypted('missing')).toBe('');
    expect(service.check('missing')).toBeFalse();
    expect(await service.asyncCheck('missing')).toBeFalse();
    expect(await service.keys()).toEqual([]);
  });

  it('exposes the encrypted payload and never stores plaintext', async () => {
    await service.set('fruit', { name: 'orange' });

    const raw = localStorage.getItem('fruit');
    expect(raw).not.toBeNull();
    expect(raw!.startsWith('v2.')).toBeTrue();
    expect(raw).not.toContain('orange');
    expect(service.getEncrypted('fruit')).toBe(raw);
    expect(service.check('fruit')).toBeTrue();
    expect(await service.decrypt(raw!)).toEqual({ name: 'orange' });
  });

  it('removes entries and clears everything', async () => {
    await service.set('a', 1);
    await service.set('b', 2);
    expect(await service.keys()).toEqual(['a', 'b']);

    await service.remove('a');
    expect(service.check('a')).toBeFalse();
    expect(await service.keys()).toEqual(['b']);

    await service.clearAll();
    expect(localStorage.length).toBe(0);
    expect(await service.keys()).toEqual([]);
  });

  it('supports per call secrets and rejects wrong ones', async () => {
    await service.set('classified', 'top-secret', '!secret token @123456');

    expect(service.get('classified', '!secret token @123456')).toBe('top-secret');
    expect(() => service.get('classified')).toThrowError(DecryptionError);
    expect(() => service.get('classified', 'wrong')).toThrowError(DecryptionError);
    expect(service.get('unknown', 'wrong')).toBe('');
  });

  it('uses the configured default secret', async () => {
    TestBed.resetTestingModule();
    const configured = configure({ storageType: 'localStorage', secret: 'app-secret', encryption: TEST_ENCRYPTION });
    await configured.set('k', 'v');
    expect(configured.get('k')).toBe('v');

    TestBed.resetTestingModule();
    const fallback = configure({ storageType: 'localStorage', encryption: TEST_ENCRYPTION });
    expect(() => fallback.get('k')).toThrowError(DecryptionError);
  });

  it('serves repeat reads from the cache and invalidates it across tabs', async () => {
    await service.set('cached', { value: 1 });
    expect(service.get('cached')).toEqual({ value: 1 });

    // Simulate a rogue modification behind the library's back: the cache masks it...
    localStorage.setItem('cached', 'corrupted');
    expect(service.get('cached')).toEqual({ value: 1 });

    // ...until another tab reports a storage change, which drops the cached value.
    window.dispatchEvent(new StorageEvent('storage', { key: 'cached' }));
    expect(() => service.get('cached')).toThrowError(DecryptionError);
  });

  it('can disable the cache', async () => {
    TestBed.resetTestingModule();
    const uncached = configure({ storageType: 'localStorage', encryption: TEST_ENCRYPTION, cache: false });
    await uncached.set('k', 1);
    expect(uncached.get('k')).toBe(1);

    localStorage.setItem('k', 'corrupted');
    expect(() => uncached.get('k')).toThrowError(DecryptionError);
  });

  it('namespaces keys with keyPrefix and scopes clearAll', async () => {
    TestBed.resetTestingModule();
    const prefixed = configure({ storageType: 'localStorage', encryption: TEST_ENCRYPTION, keyPrefix: 'app:' });
    localStorage.setItem('foreign', 'keep me');

    await prefixed.set('k', 'v');
    expect(localStorage.getItem('app:k')).not.toBeNull();
    expect(prefixed.get('k')).toBe('v');
    expect(await prefixed.keys()).toEqual(['k']);

    await prefixed.clearAll();
    expect(localStorage.getItem('foreign')).toBe('keep me');
    expect(await prefixed.keys()).toEqual([]);
  });

  it('measures the length of decrypted values', async () => {
    await service.set('list', [1, 2, 3]);
    await service.set('text', 'hello');
    await service.set('object', { a: 1, b: 2 });
    await service.set('number', 42);

    expect(await service.getItemLength('list')).toBe(3);
    expect(await service.getItemLength('text')).toBe(5);
    expect(await service.getItemLength('object')).toBe(2);
    expect(await service.getItemLength('number')).toBe(0);
    expect(await service.getItemLength('missing')).toBe(0);
  });

  it('encrypts and decrypts standalone values', async () => {
    const payload = await service.crypt([{ name: 'fraise' }]);
    expect(payload.startsWith('v2.')).toBeTrue();
    expect(await service.decrypt(payload)).toEqual([{ name: 'fraise' }]);
    expect(await service.decrypt('')).toBe('');
  });

  it('exposes the backend in use', () => {
    expect(service.storageType).toBe('localStorage');
    expect(service.isAsyncStorage).toBeFalse();
  });

  it('rejects invalid configuration and keys', async () => {
    expect(() => provideNgCryptoStore({ storageType: 'nope' as StorageType })).toThrowError(UnsupportedStorageTypeError);
    expect(() => provideNgCryptoStore({ storageType: 'localStorage', encryption: { iterations: 0 } })).toThrowError(
      NgCryptoStoreError
    );
    await expectAsync(service.set('', 1)).toBeRejectedWithError(TypeError);
  });
});

describe('StorageService (memory and sessionStorage)', () => {
  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('supports the memory backend', async () => {
    const service = configure({ storageType: 'memory', encryption: TEST_ENCRYPTION });
    await service.set('k', 'v');
    expect(service.get('k')).toBe('v');
    expect(await service.keys()).toEqual(['k']);
    expect(service.storageType).toBe('memory');
  });

  it('supports the sessionStorage backend', async () => {
    const service = configure({ storageType: 'sessionStorage', encryption: TEST_ENCRYPTION });
    await service.set('k', 'v');
    expect(service.get('k')).toBe('v');
    expect(sessionStorage.length).toBe(1);
    expect(service.storageType).toBe('sessionStorage');
  });
});

describe('StorageService (asynchronous backend)', () => {
  afterEach(() => TestBed.resetTestingModule());

  function createAsyncAdapter(): { adapter: AsyncStorageAdapter; target: Map<string, string> } {
    const target = new Map<string, string>();
    return {
      target,
      adapter: {
        isAsync: true,
        kind: 'IndexedDB',
        getItem: async (key) => target.get(key) ?? null,
        setItem: async (key, value) => void target.set(key, value),
        removeItem: async (key) => void target.delete(key),
        keys: async () => Array.from(target.keys()),
        clear: async () => void target.clear()
      }
    };
  }

  it('works with the async APIs and rejects the sync ones with a helpful error', async () => {
    const { adapter, target } = createAsyncAdapter();
    TestBed.configureTestingModule({
      providers: [
        provideNgCryptoStore({ storageType: 'IndexedDB', encryption: TEST_ENCRYPTION }),
        { provide: STORAGE_ADAPTER, useValue: adapter }
      ]
    });
    const service = TestBed.inject(StorageService);

    await service.set('k', 'v');
    expect(service.isAsyncStorage).toBeTrue();
    expect(await service.asyncGet('k')).toBe('v');
    expect(await service.asyncCheck('k')).toBeTrue();
    expect((await service.asyncGetEncrypted('k'))!.startsWith('v2.')).toBeTrue();
    expect(await service.keys()).toEqual(['k']);
    expect(await service.getItemLength('k')).toBe(1);

    expect(() => service.get('k')).toThrowError(AsyncStorageError);
    expect(() => service.getEncrypted('k')).toThrowError(AsyncStorageError);
    expect(() => service.check('k')).toThrowError(AsyncStorageError);

    await service.remove('k');
    expect(await service.asyncCheck('k')).toBeFalse();
    await service.set('other', 1);
    await service.clearAll();
    expect(target.size).toBe(0);
  });

  it('accepts a custom adapter provided through STORAGE_ADAPTER', async () => {
    const target = new MemoryStorageAdapter();
    const adapter = new WebStorageAdapter(target, 'localStorage', '');
    TestBed.configureTestingModule({
      providers: [
        provideNgCryptoStore({ storageType: 'localStorage', encryption: TEST_ENCRYPTION }),
        { provide: STORAGE_ADAPTER, useValue: adapter }
      ]
    });
    const service = TestBed.inject(StorageService);

    await service.set('k', 'v');
    expect(target.keys()).toHaveSize(1);
    expect(service.get('k')).toBe('v');
  });
});
