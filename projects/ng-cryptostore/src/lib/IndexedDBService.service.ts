import { Injectable } from '@angular/core';
import { StorageServiceConfigs } from './StorageServiceConfig.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {

  private db!: IDBDatabase;
  private objectStore!: IDBObjectStore;

  constructor(private config: StorageServiceConfigs) {
    this.checkCompatibility();
  }
  private checkCompatibility() {
    if (!('indexedDB' in window)) {
      console.error("Your browser doesn't support a stable version of IndexedDB.");
      return;
    }
    this.openDatabase();
  }
  private openDatabase() {
    const request = window.indexedDB.open("myDatabase", 1);

    request.onupgradeneeded = (event: any) => {
      this.db = event.target?.result;
      const objectStore = this.db.createObjectStore("myObjectStore", { keyPath: "id",autoIncrement:true });
    };

    request.onsuccess = (event: any) => {
      this.db = event.target?.result;
    };

    request.onerror = (event: any) => {
      console.error("Failed to open database", event.target?.error);
    };
  }

  public create(key: string | number, object: any) {
    this.checkCompatibility();
    if (!this.db) {
      throw new Error('IndexedDB database not opened');
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("myObjectStore", "readwrite");
      const objectStore = transaction.objectStore("myObjectStore");
      const request = key ? objectStore.add(object, key) : objectStore.add(object);
      request.onsuccess = (event:any) => {
        resolve(event.target?.result);
      };
      request.onerror = (event:any) => {
        reject(event.target?.error);
      };
    });
  }


  public read(key: string | number) {
    this.checkCompatibility();
    if (!this.db) {
      throw new Error('IndexedDB database not opened');
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("myObjectStore");
      const objectStore = transaction.objectStore("myObjectStore");
      const request = objectStore.get(key);
      request.onsuccess = (event: any) => {
        resolve(event.target?.result);
      };
      request.onerror = (event: any) => {
        reject(event.target?.error);
      };
    });
  }

  public update(key: string | number, object: any) {
    this.checkCompatibility();
    if (!this.db) {
      throw new Error('IndexedDB database not opened');
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("myObjectStore", "readwrite");
      const objectStore = transaction.objectStore("myObjectStore");
      const request = objectStore.put(object, key);
      request.onsuccess = (event: any) => {
        resolve(event.target?.result);
      };
      request.onerror = (event: any) => {
        reject(event.target?.error);
      };
    });
  }

  public delete(key: string | number) {
    this.checkCompatibility();
    if (!this.db) {
      throw new Error('IndexedDB database not opened');
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("myObjectStore", "readwrite");
      const objectStore = transaction.objectStore("myObjectStore");
      const request = objectStore.delete(key);
      request.onsuccess = (event: any) => {
        resolve(event.target?.result);
      };
      request.onerror = (event: any) => {
        reject(event.target?.error);
      };
    });
  }

  public async deleteAll() {
    this.checkCompatibility();
    if (!this.db) {
      throw new Error('IndexedDB database not opened');
    }
    return new Promise(async (resolve, reject) => {
      const transaction = this.db.transaction("myObjectStore", "readwrite");
      const objectStore = transaction.objectStore("myObjectStore");
      const request = objectStore.clear();
      request.onsuccess = (event: any) => {
        resolve(event.target?.result);
      };
      request.onerror = (event: any) => {
        reject(event.target?.error);
      };
    });
  }

}
