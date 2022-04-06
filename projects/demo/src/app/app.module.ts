import { StorageModule } from './../../../ng-cryptostore/src/lib/Storage.module';
import { SessionstoreComponent } from './sessionstore/sessionstore.component';
import { LocalstoreComponent } from './localstore/localstore.component';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    LocalstoreComponent,
    SessionstoreComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    StorageModule.withConfig({ storageType: "localStorage" })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
