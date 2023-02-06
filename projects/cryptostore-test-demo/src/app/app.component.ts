import { StorageService } from './../../../ng-cryptostore/src/lib/storage.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'demo';
  constructor(private srv: StorageService) { }
  ngOnInit(): void {
    this.srv.set('userData', [{ name: 'orange', icons: '🍊' }, { name: 'fraise', icons: '🍓' }, { name: 'banane', icons: '🍌' }], '2020')
  }
}
