import { LocalstorageService } from 'ng-cryptostore';
import { Component, OnInit } from '@angular/core';

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

}
