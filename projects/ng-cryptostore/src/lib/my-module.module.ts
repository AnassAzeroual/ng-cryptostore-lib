import { LocalstorageService } from './localstorage.service';
import { SessionstorageService } from './sessionstorage.service';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [LocalstorageService, SessionstorageService]
})
export class MyModuleModule { }
