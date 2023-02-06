import { StorageConfig } from './StorageConfig';
import { Injectable, Optional } from '@angular/core';


@Injectable({ providedIn: 'root' })
export class StorageServiceConfigs {
  _storageType!: string;

  constructor(@Optional() config?: StorageConfig) {
    if (config) { this._storageType = config.storageType; }
  }

  get storage() {
    return (this._storageType === 'localStorage') ? localStorage : sessionStorage
  }

}
