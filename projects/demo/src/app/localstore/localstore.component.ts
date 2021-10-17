import { Component, OnInit } from '@angular/core';
import { LocalstorageService } from 'projects/ng-cryptostore/src/public-api';

@Component({
  selector: 'app-localstore',
  templateUrl: './localstore.component.html',
  styleUrls: ['./localstore.component.scss']
})
export class LocalstoreComponent implements OnInit {
  showDataCrypted: string = ""
  showData: string = ""
  showDataAwait: Promise<any>;
  constructor(private srv: LocalstorageService) { }

  ngOnInit() {
  }

  save(data: string) {
    this.srv.setItem('text', data).then(() => {
      this.show()
      this.read()
      this.readAwait()
    })
  }

  show() {
    this.showDataCrypted = localStorage.getItem('text')
  }

  read() {
    this.showData = this.srv.getItem('text')
  }

  async readAwait() {
    this.showDataAwait = await this.srv.awiatGetItem('text')
  }

  removeItem(name: string) {
    this.srv.removeItem("text")
  }

  removeAll() {
    this.srv.clearAll()
  }

  check() {
    console.log(this.srv.check('text'));
  }

  async awiatGetItem() {
    console.log(await this.srv.awiatGetItem('text'));
  }

  getItem() {
    console.log(this.srv.getItem('text'));
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
