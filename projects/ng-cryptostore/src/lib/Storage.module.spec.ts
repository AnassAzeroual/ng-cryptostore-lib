import { TestBed } from '@angular/core/testing';
import { STORAGE_CONFIG } from './StorageConfig';
import { StorageModule, provideNgCryptoStore } from './Storage.module';
import { StorageService } from './storage.service';

describe('provideNgCryptoStore', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('provides the configuration and the service', () => {
    TestBed.configureTestingModule({ providers: [provideNgCryptoStore({ storageType: 'memory' })] });

    expect(TestBed.inject(STORAGE_CONFIG).storageType).toBe('memory');
    expect(TestBed.inject(StorageService).storageType).toBe('memory');
  });

  it('defaults to localStorage when called without arguments', () => {
    TestBed.configureTestingModule({ providers: [provideNgCryptoStore()] });

    expect(TestBed.inject(STORAGE_CONFIG).storageType).toBe('localStorage');
    expect(TestBed.inject(StorageService).storageType).toBe('localStorage');
  });

  it('keeps the deprecated StorageModule.withConfig working', async () => {
    TestBed.configureTestingModule({
      imports: [StorageModule.withConfig({ storageType: 'memory', encryption: { iterations: 10 } })]
    });
    const service = TestBed.inject(StorageService);

    await service.set('k', 'v');

    expect(service.get('k')).toBe('v');
    expect(service.storageType).toBe('memory');
  });
});
