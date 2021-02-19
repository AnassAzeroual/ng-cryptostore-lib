import { Component, OnInit } from '@angular/core';
import { LocalstorageService,SessionstorageService } from 'ng-cryptostore';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'demo';
  constructor(private srv:SessionstorageService){}
  ngOnInit(): void {
    this.srv.setItem('userData',[{name:'orange',icons:'🍊'},{name:'fraise',icons:'🍓'},{name:'banane',icons:'🍌'}],'2020')
  }
}
