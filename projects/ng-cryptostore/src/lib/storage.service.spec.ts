import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { StorageConfig, STORAGE_CONFIG } from './StorageConfig';
import { provideNgCryptoStore } from './Storage.module';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNgCryptoStore({ storageType: 'localStorage' })
      ]
    });
    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
