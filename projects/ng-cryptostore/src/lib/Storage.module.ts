import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageConfig } from './StorageConfig';

@NgModule({
  imports: [
    CommonModule
  ]
})
export class StorageModule {
  constructor(@Optional() @SkipSelf() parentModule?: StorageModule) {
    if (parentModule) {
      throw new Error(
        'GreetingModule is already loaded. Import it in the AppModule only');
    }
  }

  static withConfig(config: StorageConfig): ModuleWithProviders<StorageModule> {
    return {
      ngModule: StorageModule,
      providers: [
        { provide: StorageConfig, useValue: config }
      ]
    };
  }
}
