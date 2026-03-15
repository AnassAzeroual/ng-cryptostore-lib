import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNgCryptoStore } from 'ng-cryptostore';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([]),
    provideNgCryptoStore({ storageType: 'cookies' })
  ]
}).catch(err => console.error(err));
