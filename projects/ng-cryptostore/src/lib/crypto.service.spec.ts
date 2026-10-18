import { TestBed } from '@angular/core/testing';
import * as CryptoJS from 'crypto-js';
import { CryptoService, DEFAULT_SECRET } from './crypto.service';
import { DecryptionError, IntegrityError } from './errors';
import { provideNgCryptoStore } from './Storage.module';
import { EncryptionOptions } from './StorageConfig';

/**
 * Reproduces the encryption code of ng-cryptostore <= 21.0.x so the tests can prove that
 * data written by the old versions is still readable.
 */
function legacyEncrypt(data: unknown, secret: string): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secret, {
    keySize: 128 / 8,
    iv: CryptoJS.enc.Utf8.parse(secret),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}

function legacyDecrypt(payload: string, secret: string): unknown {
  return JSON.parse(
    CryptoJS.enc.Utf8.stringify(
      CryptoJS.AES.decrypt(payload, secret, {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(secret),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
    )
  );
}

function createService(encryption?: EncryptionOptions): CryptoService {
  TestBed.configureTestingModule({
    providers: [provideNgCryptoStore({ storageType: 'memory', encryption: encryption ?? { iterations: 25 } })]
  });
  return TestBed.inject(CryptoService);
}

describe('CryptoService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('writes the modern authenticated format', () => {
    const service = createService();
    const payload = service.encrypt({ fruit: '🍊' }, 'secret');

    expect(payload.startsWith('v2.')).toBeTrue();
    expect(payload.split('.')).toHaveSize(5);
    expect(payload.slice(3)).toMatch(/^[A-Za-z0-9\-_.]+$/); // base64url: safe for cookies and URLs
    expect(service.decrypt(payload, 'secret')).toEqual({ fruit: '🍊' });
  });

  it('never produces the same payload twice and round trips unicode', () => {
    const service = createService();
    const text = 'fruits: orange, fraise, 🍌 and §@! characters';

    const first = service.encryptString(text, 'secret');
    const second = service.encryptString(text, 'secret');

    expect(first).not.toBe(second);
    expect(service.decryptString(first, 'secret')).toBe(text);
    expect(service.decryptString(second, 'secret')).toBe(text);
  });

  it('round trips empty strings and large payloads', () => {
    const service = createService();
    expect(service.decryptString(service.encryptString('', 'secret'), 'secret')).toBe('');

    const large = 'x'.repeat(64 * 1024);
    expect(service.decryptString(service.encryptString(large, 'secret'), 'secret')).toBe(large);
  });

  it('detects tampering with the salt, iv, ciphertext or mac', () => {
    const service = createService();
    const parts = service.encrypt('hello', 'secret').split('.');
    const tamper = (part: string) => (part[0] === 'A' ? 'B' : 'A') + part.slice(1);

    for (let index = 1; index <= 4; index++) {
      const forged = [...parts];
      forged[index] = tamper(parts[index]!);
      expect(() => service.decryptString(forged.join('.'), 'secret'))
        .withContext(`part ${index}`)
        .toThrowError(IntegrityError);
    }
  });

  it('rejects a wrong secret', () => {
    const service = createService();
    const payload = service.encrypt('hello', 'right-secret');
    expect(() => service.decrypt(payload, 'wrong-secret')).toThrowError(IntegrityError);
  });

  it('throws a DecryptionError on malformed payloads', () => {
    const service = createService();
    expect(() => service.decryptString('v2.broken', 'secret')).toThrowError(DecryptionError);
    expect(() => service.decryptString('v2.a.b.c.d', 'secret')).toThrowError(DecryptionError);
    expect(() => service.decryptString('v2.@@@@.@@@@.@@@@.@@@@', 'secret')).toThrowError(DecryptionError);
  });

  it('reads values written by ng-cryptostore <= 21.0.x (legacy format)', () => {
    const service = createService();
    const legacyPayload = legacyEncrypt({ fruits: ['🍓'] }, DEFAULT_SECRET);

    expect(legacyPayload.startsWith('U2FsdGVkX1')).toBeTrue(); // "Salted__", the OpenSSL envelope
    expect(service.decrypt(legacyPayload)).toEqual({ fruits: ['🍓'] });
    expect(service.decrypt(legacyEncrypt('text', 'custom'), 'custom')).toBe('text');
  });

  it('throws when a legacy payload cannot be decoded', () => {
    const service = createService();
    expect(() => service.decrypt(legacyEncrypt('data', 'secret'), 'another-secret')).toThrowError(DecryptionError);
    expect(() => service.decrypt(legacyEncrypt('data', 'secret'), DEFAULT_SECRET)).toThrowError(DecryptionError);
  });

  it('can still write the legacy format for interoperability with old versions', () => {
    const service = createService({ format: 'legacy' });
    const payload = service.encrypt({ fruits: ['🍌'] }, 'secret');

    expect(payload.startsWith('v2.')).toBeFalse();
    expect(legacyDecrypt(payload, 'secret')).toEqual({ fruits: ['🍌'] });
    expect(service.decrypt(payload, 'secret')).toEqual({ fruits: ['🍌'] });
  });

  it('uses the configured iteration count and defaults to 1000', () => {
    TestBed.configureTestingModule({ providers: [provideNgCryptoStore({ storageType: 'memory' })] });
    expect(TestBed.inject(CryptoService).iterations).toBe(1000);

    TestBed.resetTestingModule();
    expect(createService({ iterations: 7 }).iterations).toBe(7);
  });
});
