import { StorageServiceConfig } from './StorageServiceConfig.service';
import * as CryptoJS from 'crypto-js';


async function set(name: string, data: any, secret?: string) {
  const storage = new StorageServiceConfig().storage
  if (!secret) {
    secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
  }
  const dataCrypted = await CryptoJS.AES.encrypt(JSON.stringify(data), secret,
    {
      keySize: 128 / 8,
      iv: secret,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  storage.setItem(name, dataCrypted)
}

function get(name: string, secret?: string) {
  const storage = new StorageServiceConfig().storage
  if (!secret) {
    secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
  }
  if (!check(name)) return "";
  const scripts: any = storage.getItem(name)
  return JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
    {
      keySize: 128 / 8,
      iv: secret,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })));
}

async function asyncGet(name: string, secret?: string) {
  const storage = new StorageServiceConfig().storage
  if (!secret) {
    secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
  }
  if (!check(name)) return "";
  const scripts: any = storage.getItem(name)
  return await JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
    {
      keySize: 128 / 8,
      iv: secret,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })));
}

function remove(name: string) {
  const storage = new StorageServiceConfig().storage
  if (check(name)) {
    storage.removeItem(name)
  }
}

function check(name: string) {
  const storage = new StorageServiceConfig().storage
  return (!!storage.getItem(name) && !!storage.getItem(name).length)
}

function getItemLength(name: string, secret?: string): Promise<number> {
  const data = get(name, secret)
  return data.length
}

function clearAll() {
  const storage = new StorageServiceConfig().storage
  storage.clear()
}

async function crypt(data: any, secret?: string) {
  if (!secret) {
    secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
  }
  return await CryptoJS.AES.encrypt(JSON.stringify(data), secret,
    {
      keySize: 128 / 8,
      iv: secret,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
}

async function decrypt(scripts: string, secret?: string) {
  if (!secret) {
    secret = "kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG"
  }
  return await JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(scripts, secret,
    {
      keySize: 128 / 8,
      iv: secret,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })));
}

export {
  set,
  get,
  asyncGet,
  remove,
  check,
  getItemLength,
  clearAll,
  crypt,
  decrypt
}
