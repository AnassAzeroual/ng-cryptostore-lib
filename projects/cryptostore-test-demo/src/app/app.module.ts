import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { StorageModule } from 'ng-cryptostore';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LocalstoreComponent } from './localstore/localstore.component';
import { SessionstoreComponent } from './sessionstore/sessionstore.component';

@NgModule({
  declarations: [
    AppComponent,
    LocalstoreComponent,
    SessionstoreComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    StorageModule.withConfig({ storageType: 'cookies' })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
