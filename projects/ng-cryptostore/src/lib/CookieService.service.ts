import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CookieService {

  constructor() { }

  public create(key: string, value: string, expires?: number | Date) {
    let cookieValue = `${key}=${value}`;
    if (expires) {
      if (typeof expires === 'number') {
        const date = new Date();
        date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
        expires = date;
      }
      cookieValue = `${cookieValue}; expires=${expires.toUTCString()}`;
    }
    document.cookie = cookieValue;
  }

  public read(key: string) {
    const keyValue = document.cookie.match(`(^|;) ?${key}=([^;]*)(;|$)`);
    return keyValue ? keyValue[2] : "";
  }

  public update(key: string, value: string, expires?: number | Date) {
    this.create(key, value, expires);
  }

  public delete(key: string) {
    this.create(key, "", -1);
  }

  public deleteAll() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}
