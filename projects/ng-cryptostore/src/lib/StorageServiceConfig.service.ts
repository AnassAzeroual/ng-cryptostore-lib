import { StorageConfig } from './StorageConfig';
import { Injectable, Optional } from '@angular/core';


// tslint:disable-next-line: max-classes-per-file
@Injectable({ providedIn: 'root' })
export class StorageServiceConfig {
  _storageType: string;

  constructor(@Optional() config?: StorageConfig) {
    if (config) { this._storageType = config.storageType; }
  }

  get storage() {
    return (this._storageType === 'localStorage') ? localStorage : sessionStorage
  }

}
