import { StorageServiceConfig } from './../../../../ng-cryptostore/src/lib/StorageServiceConfig.service';
import { Component, OnInit } from '@angular/core';
import { StorageService } from 'projects/ng-cryptostore/src/public-api';

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
  constructor(private srv: StorageService, private dataStorage: StorageServiceConfig) {
    this.storagetype = this.dataStorage._storageType;
  }

  ngOnInit() {
    console.log("datastoragetype :: ", this.dataStorage._storageType);
  }

  save(data: string) {
    this.srv.set('text', data).then(() => {
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
    this.showData = this.srv.get('text')
  }

  async readAwait() {
    this.showDataAwait = await this.srv.asyncGet('text')
  }

  removeItem(name: string) {
    this.srv.remove("text");
  }

  removeAll() {
    this.srv.clearAll()
  }

  check() {
    this.checkValue = this.srv.check('text');
    console.log(this.srv.check('text'));
  }

  async getLength() {
    this.length = await this.srv.getItemLength('text');
    console.log(await this.srv.getItemLength('text'));
  }

  async crypt() {
    console.log(await this.srv.crypt([
      { name: "fraise", icons: "🍓" },
      { name: "banane", icons: "🍌" },
    ]));
  }

  async decrypt() {
    console.log(await this.srv.decrypt(await this.srv.crypt([
      { name: "fraise", icons: "🍓" },
      { name: "banane", icons: "🍌" },
    ])));
  }

}
