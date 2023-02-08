import { inject, Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { IndexedDBService } from './IndexedDBService.service';
import { StorageServiceConfigs } from './StorageServiceConfig.service';
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  storage
  constructor(private config: StorageServiceConfigs,private indexDB: IndexedDBService) {
    this.storage = config.storage;
  }

  async set(name: string, data: any, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    const dataCrypted = await CryptoJS.AES.encrypt(JSON.stringify(data), secret,
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secret),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
    if (this.config._storageType === 'IndexedDB') {
      return this.indexDB.create(name, dataCrypted)
    }
    return this.storage.setItem(name, dataCrypted)
  }

  get(name: string, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    if (!this.check(name)) return "";
    let scripts:any;
    if (this.config._storageType === 'IndexedDB') {
      scripts = this.indexDB.read(name)
    }else{
      scripts = this.storage.getItem(name)
    }
    return JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secret),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })));
  }

  async asyncGet(name: string, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    if (!this.check(name)) return "";
    let scripts:any;
    if (this.config._storageType === 'IndexedDB') {
      scripts = this.indexDB.read(name)
    }else{
      scripts = this.storage.getItem(name)
    }
    return await JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secret),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })));
  }

  remove(name: string) {
    if (this.check(name)) {
      if (this.config._storageType === 'IndexedDB') {
        this.indexDB.delete(name)
      } else {
        this.storage.removeItem(name)
      }
    }
  }

  check(name: string) {
    return (this.config._storageType === 'IndexedDB')? true:(!!this.storage.getItem(name) && !!this.storage.getItem(name)?.length);
  }

  async getItemLength(name: string, secret?: string): Promise<number> {
    let data: any
    if (this.config._storageType === 'IndexedDB') {
      data = this.decrypt(await this.indexDB.read(name) as string,secret)
    } else {
      data = this.get(name, secret)
    }
    return data.length
  }

  clearAll() {
    (this.config._storageType === 'IndexedDB') ? this.indexDB.deleteAll():this.storage.clear();
  }

  async crypt(data: any, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    return await CryptoJS.AES.encrypt(JSON.stringify(data), secret,
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secret),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
  }

  async decrypt(scripts: string, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    return await JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secret),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })));
  }

}
