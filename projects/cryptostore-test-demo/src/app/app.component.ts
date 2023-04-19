import { Component, OnInit } from '@angular/core';
import { StorageService } from 'projects/ng-cryptostore/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'demo';
  constructor(private srv: StorageService) { }
  ngOnInit(): void {
    this.srv.set('userData', [{ name: 'orange', icons: '🍊' }, { name: 'fraise', icons: '🍓' }, { name: 'banana', icons: '🍌' }], '2020')
  }
}
