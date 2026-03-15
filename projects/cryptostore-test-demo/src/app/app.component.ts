import { Component, OnInit, inject } from '@angular/core';
import { StorageService } from 'ng-cryptostore';
import { LocalstoreComponent } from './localstore/localstore.component';
import { SessionstoreComponent } from './sessionstore/sessionstore.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LocalstoreComponent, SessionstoreComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'demo';
  private srv = inject(StorageService);

  ngOnInit(): void {
    this.srv.set('userData', [{ name: 'orange', icons: '🍊' }, { name: 'fraise', icons: '🍓' }, { name: 'banana', icons: '🍌' }], '2020');
  }
}
