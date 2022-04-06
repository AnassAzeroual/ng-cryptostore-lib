import { StorageServiceConfigs } from './../../../../ng-cryptostore/src/lib/StorageServiceConfig.service';
import { Component, OnInit } from '@angular/core';
import { StorageService } from 'projects/ng-cryptostore/src/public-api';

@Component({
  selector: 'app-localstore',
  templateUrl: './localstore.component.html',
  styleUrls: ['./localstore.component.scss']
})
export class LocalstoreComponent implements OnInit {
  showDataCrypted: string = ""
  showData: string = ""
  showDataAwait: Promise<any>;
  constructor(private srv: StorageService, private dataStorage: StorageServiceConfigs) { }

  ngOnInit() {

    console.log("datastoragetype :: ", this.dataStorage._storageType);
  }

  save(data: string) {
    this.srv.set('text', data).then(() => {
      this.show()
      this.read()
      this.readAwait()
    })
  }

  show() {
    this.showDataCrypted = localStorage.getItem('text')
  }

  read() {
    this.showData = this.srv.get('text')
  }

  async readAwait() {
    this.showDataAwait = await this.srv.asyncGet('text')
  }

  removeItem(name: string) {
    this.srv.remove("text")
  }

  removeAll() {
    this.srv.clearAll()
  }

  check() {
    console.log(this.srv.check('text'));
  }

  async awiatGetItem() {
    console.log(await this.srv.asyncGet('text'));
  }

  getItem() {
    console.log(this.srv.get('text'));
  }

  async getLength() {
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
