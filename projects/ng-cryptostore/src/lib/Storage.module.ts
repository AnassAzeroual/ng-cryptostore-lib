import {
  EnvironmentProviders,
  ModuleWithProviders,
  NgModule,
  Optional,
  SkipSelf,
  makeEnvironmentProviders
} from '@angular/core';
import { NgCryptoStoreError, UnsupportedStorageTypeError } from './errors';
import { STORAGE_CONFIG, StorageConfig, StorageType } from './StorageConfig';

const STORAGE_TYPES: readonly StorageType[] = ['localStorage', 'sessionStorage', 'IndexedDB', 'cookies', 'memory'];

/**
 * Provides the ng-cryptostore services with the given configuration.
 * This is the recommended way to configure the library in standalone applications.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideNgCryptoStore({ storageType: 'localStorage' })
 *   ]
 * });
 * ```
 */
export function provideNgCryptoStore(config: StorageConfig = { storageType: 'localStorage' }): EnvironmentProviders {
  validateConfig(config);
  return makeEnvironmentProviders([{ provide: STORAGE_CONFIG, useValue: { ...config } }]);
}

/**
 * @deprecated Use `provideNgCryptoStore()` instead. This module is kept for backward compatibility.
 */
@NgModule({
  imports: []
})
export class StorageModule {
  constructor(@Optional() @SkipSelf() parentModule?: StorageModule) {
    if (parentModule) {
      throw new Error('StorageModule is already loaded. Import it in the AppModule only');
    }
  }

  /**
   * @deprecated Use `provideNgCryptoStore()` instead.
   */
  static withConfig(config: StorageConfig): ModuleWithProviders<StorageModule> {
    validateConfig(config);
    return {
      ngModule: StorageModule,
      providers: [{ provide: STORAGE_CONFIG, useValue: { ...config } }]
    };
  }
}

function validateConfig(config: StorageConfig): void {
  const storageType = (config as { storageType?: unknown } | null | undefined)?.storageType;
  if (typeof storageType !== 'string' || !(STORAGE_TYPES as readonly string[]).includes(storageType)) {
    throw new UnsupportedStorageTypeError(storageType);
  }

  const iterations = config.encryption?.iterations;
  if (iterations !== undefined && (!Number.isFinite(iterations) || iterations < 1)) {
    throw new NgCryptoStoreError(`"encryption.iterations" must be a positive number, received "${String(iterations)}".`);
  }
}
