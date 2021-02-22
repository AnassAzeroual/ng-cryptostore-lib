import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
@Injectable({
  providedIn: 'root'
})
export class SessionstorageService {
  async setItem(name: string, data: any, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    let dataCrypted = await CryptoJS.AES.encrypt(JSON.stringify(data), secret,
      {
        keySize: 128 / 8,
        iv: secret,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
    sessionStorage.setItem(name, dataCrypted)
  }

  getItem(name: string, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    if (!this.check(name)) return "";
    let scripts: any = sessionStorage.getItem(name)
    return JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
      {
        keySize: 128 / 8,
        iv: secret,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })));
  }

  async awiatGetItem(name: string, secret?: string) {
    if (!secret) {
      secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
    }
    if (!this.check(name)) return "";
    let scripts: any = sessionStorage.getItem(name)
    return await JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
      {
        keySize: 128 / 8,
        iv: secret,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })));
  }

  removeItem(name: string) {
    if (this.check(name)) {
      sessionStorage.removeItem(name)
    }
  }

  check(name: string) {
    return (!!sessionStorage.getItem(name) && !!sessionStorage.getItem(name).length)
  }

  async getItemLength(name: string, secret?: string): Promise<number> {
    const data = await this.awiatGetItem(name, secret)
    return data.length
  }

  clearAll() {
    sessionStorage.clear()
  }

}
