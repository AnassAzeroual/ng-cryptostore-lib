import { NgModule, ModuleWithProviders, Optional, SkipSelf, makeEnvironmentProviders, EnvironmentProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageConfig, STORAGE_CONFIG } from './StorageConfig';

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
export function provideNgCryptoStore(config: StorageConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: STORAGE_CONFIG, useValue: config }
  ]);
}

/**
 * @deprecated Use `provideNgCryptoStore()` instead. This module is kept for backward compatibility.
 */
@NgModule({
  imports: [
    CommonModule
  ]
})
export class StorageModule {
  constructor(@Optional() @SkipSelf() parentModule?: StorageModule) {
    if (parentModule) {
      throw new Error(
        'StorageModule is already loaded. Import it in the AppModule only');
    }
  }

  /**
   * @deprecated Use `provideNgCryptoStore()` instead.
   */
  static withConfig(config: StorageConfig): ModuleWithProviders<StorageModule> {
    return {
      ngModule: StorageModule,
      providers: [
        { provide: STORAGE_CONFIG, useValue: config }
      ]
    };
  }
}
