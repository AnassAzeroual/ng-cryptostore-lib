import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { StorageModule } from 'projects/ng-cryptostore/src/public-api';

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
    StorageModule.withConfig({ storageType: "localStorage" })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
