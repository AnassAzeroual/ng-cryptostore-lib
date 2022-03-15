import { StorageServiceConfig } from './../../../../ng-cryptostore/src/lib/StorageServiceConfig.service';
import { Component, OnInit } from '@angular/core';
import { asyncGet, check, clearAll, crypt, decrypt, get, getItemLength, remove, set } from 'projects/ng-cryptostore/src/public-api';

@Component({
  selector: 'app-storage',
  templateUrl: './localstore.component.html',
  styleUrls: ['./localstore.component.scss']
})
export class LocalstoreComponent implements OnInit {
  showDataCrypted: string = ""
  showData: string = ""
  showDataAwait: Promise<any>;
  checkValue: boolean;
  length: number;
  storagetype = ""
  constructor(private dataStorage: StorageServiceConfig) {
    this.storagetype = this.dataStorage._storageType;
  }

  ngOnInit() {
    console.log("datastoragetype :: ", this.dataStorage._storageType);
  }

  save(data: string) {
    set('text', data).then(() => {
      this.show()
      this.read()
      this.readAwait()
      this.check()
      this.getLength()
    })
  }

  show() {
    this.showDataCrypted = (!!localStorage.getItem('text')) ? localStorage.getItem('text') : sessionStorage.getItem('text');
  }

  read() {
    this.showData = get('text')
  }

  async readAwait() {
    this.showDataAwait = await asyncGet('text')
  }

  removeItem(name: string) {
    remove("text");
  }

  removeAll() {
    clearAll()
  }

  check() {
    this.checkValue = check('text');
    console.log(check('text'));
  }

  async getLength() {
    this.length = await getItemLength('text');
    console.log(await getItemLength('text'));
  }

  async crypt() {
    console.log(await crypt([
      { name: "fraise", icons: "🍓" },
      { name: "banane", icons: "🍌" },
    ]));
  }

  async decrypt() {
    console.log(await decrypt(await crypt([
      { name: "fraise", icons: "🍓" },
      { name: "banane", icons: "🍌" },
    ])));
  }

}
