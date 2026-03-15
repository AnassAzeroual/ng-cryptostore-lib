import { STORAGE_CONFIG, StorageConfig } from './StorageConfig';
import { Injectable, inject } from '@angular/core';


@Injectable({ providedIn: 'root' })
export class StorageServiceConfigs {
  private config = inject(STORAGE_CONFIG);
  _storageType: StorageConfig['storageType'] = this.config.storageType;

  get storage() {
    return (this._storageType === 'localStorage') ? localStorage : sessionStorage;
  }

}
