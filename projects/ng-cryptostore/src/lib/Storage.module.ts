import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageConfig } from './StorageConfig';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: []
})
export class StorageModule {
  constructor(@Optional() @SkipSelf() parentModule?: StorageModule) {
    if (parentModule) {
      throw new Error(
        'StorageModule is already loaded. Import it in the AppModule only');
    }
  }

  static forRoot(config: StorageConfig): ModuleWithProviders<StorageModule> {
    return {
      ngModule: StorageModule,
      providers: [
        { provide: StorageConfig, useValue: config }
      ]
    };
  }
}
