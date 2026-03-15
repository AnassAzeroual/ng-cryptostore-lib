import { InjectionToken } from '@angular/core';

export interface StorageConfig {
  storageType: 'localStorage' | 'sessionStorage' | 'IndexedDB' | 'cookies';
}

export const STORAGE_CONFIG = new InjectionToken<StorageConfig>('StorageConfig', {
  providedIn: 'root',
  factory: () => ({ storageType: 'localStorage' })
});
