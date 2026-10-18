import { Injectable, inject } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { DecryptionError, IntegrityError } from './errors';
import { decodeJson, encodeJson } from './json-codec';
import { STORAGE_CONFIG } from './StorageConfig';

/**
 * Passphrase used when neither the API call nor the configuration provides one.
 * Kept identical to previous versions so existing data stays readable.
 */
export const DEFAULT_SECRET =
  'kQ-ND4EZF421S@DF84FQZ634§/4FSQ1C6§!Q5Q4F@E1SDQ!F84G68TH451BBF3SFD64R9!EG6DG';

/** Marker prefix of the modern, authenticated payload format. */
const V2_PREFIX = 'v2.';

const SALT_BYTES = 16;
const IV_BYTES = 16;
const ENCRYPTION_KEY_BYTES = 32;
const MAC_KEY_BYTES = 32;
const DEFAULT_ITERATIONS = 1000;

/**
 * Handles every cryptographic operation of the library.
 *
 * ### Payload formats
 *
 * `v2` (written by default since 21.1) is a five part string:
 *
 * ```
 * v2.<salt>.<iv>.<ciphertext>.<mac>
 * ```
 *
 * - `salt` (16 bytes, random per value) feeds PBKDF2-SHA256 to derive a 256 bit AES key
 *   and a 256 bit HMAC key from the secret.
 * - `iv` (16 bytes, random per value) feeds AES-256-CBC.
 * - `mac` is HMAC-SHA256 over `salt.iv.ciphertext` so tampering is detected before decryption.
 *
 * Parts are base64url encoded, which makes payloads safe for any storage backend
 * (cookies, URLs, JSON) without escaping.
 *
 * `legacy` payloads (anything not starting with `v2.`) written by older versions are still
 * readable; they are re-encrypted with the modern format on the next write.
 */
@Injectable({ providedIn: 'root' })
export class CryptoService {
  private readonly config = inject(STORAGE_CONFIG);

  /** PBKDF2 iteration count of the `v2` format. */
  get iterations(): number {
    return Math.max(1, Math.trunc(this.config.encryption?.iterations ?? DEFAULT_ITERATIONS));
  }

  /** True when new payloads are written with the authenticated `v2` format. */
  get usesModernFormat(): boolean {
    return (this.config.encryption?.format ?? 'v2') !== 'legacy';
  }

  /** Encrypts a string and returns the serialized payload. */
  encryptString(plainText: string, secret?: string): string {
    const passphrase = secret || DEFAULT_SECRET;
    return this.usesModernFormat ? this.encryptV2(plainText, passphrase) : this.encryptLegacy(plainText, passphrase);
  }

  /** Decrypts a payload produced by {@link encryptString} (any format). */
  decryptString(payload: string, secret?: string): string {
    const passphrase = secret || DEFAULT_SECRET;
    return payload.startsWith(V2_PREFIX)
      ? this.decryptV2(payload, passphrase)
      : this.decryptLegacy(payload, passphrase);
  }

  /** Serializes and encrypts any value. */
  encrypt(value: unknown, secret?: string): string {
    return this.encryptString(encodeJson(value), secret);
  }

  /** Decrypts and deserializes any value. Throws {@link DecryptionError} on failure. */
  decrypt<T = unknown>(payload: string, secret?: string): T {
    const plainText = this.decryptString(payload, secret);
    try {
      return decodeJson<T>(plainText);
    } catch (error) {
      throw new DecryptionError('The decrypted value is not valid JSON: wrong secret or corrupted data.', {
        cause: error
      });
    }
  }

  private encryptV2(plainText: string, passphrase: string): string {
    const salt = CryptoJS.lib.WordArray.random(SALT_BYTES);
    const iv = CryptoJS.lib.WordArray.random(IV_BYTES);
    const keys = this.deriveKeys(passphrase, salt);

    const cipherParams = CryptoJS.AES.encrypt(plainText, keys.encryption, { iv });
    const ciphertext = cipherParams.ciphertext;

    const header = `${toBase64Url(salt)}.${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
    const mac = CryptoJS.HmacSHA256(header, keys.mac).toString(CryptoJS.enc.Base64);
    return `${V2_PREFIX}${header}.${toBase64Url(CryptoJS.enc.Base64.parse(mac))}`;
  }

  private decryptV2(payload: string, passphrase: string): string {
    const parts = payload.slice(V2_PREFIX.length).split('.');
    if (parts.length !== 4) {
      throw new DecryptionError('Malformed v2 payload: expected 5 dot separated parts.');
    }
    const [saltPart, ivPart, cipherPart, macPart] = parts as [string, string, string, string];

    let salt: CryptoJS.lib.WordArray;
    let iv: CryptoJS.lib.WordArray;
    let ciphertext: CryptoJS.lib.WordArray;
    let mac: CryptoJS.lib.WordArray;
    try {
      salt = fromBase64Url(saltPart);
      iv = fromBase64Url(ivPart);
      ciphertext = fromBase64Url(cipherPart);
      mac = fromBase64Url(macPart);
    } catch (error) {
      throw new DecryptionError('Malformed v2 payload: invalid base64url segment.', { cause: error });
    }

    if (salt.sigBytes !== SALT_BYTES || iv.sigBytes !== IV_BYTES || mac.sigBytes !== 32) {
      throw new DecryptionError('Malformed v2 payload: unexpected salt, iv or mac length.');
    }

    const keys = this.deriveKeys(passphrase, salt);
    const expectedMac = CryptoJS.HmacSHA256(`${saltPart}.${ivPart}.${cipherPart}`, keys.mac);
    if (!constantTimeEquals(expectedMac, mac)) {
      throw new IntegrityError(
        'The stored value failed its integrity check. It was tampered with, or it was encrypted with a different secret.'
      );
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext }), keys.encryption, {
        iv
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new DecryptionError('Unable to decrypt the stored value.', { cause: error });
    }
  }

  /**
   * Historical format: the secret is used as the key material and as the IV.
   * Kept only to read data written by ng-cryptostore <= 21.0.x (and to write it when
   * `encryption.format` is set to `'legacy'`).
   */
  private encryptLegacy(plainText: string, passphrase: string): string {
    return CryptoJS.AES.encrypt(plainText, passphrase, {
      keySize: 128 / 8,
      iv: CryptoJS.enc.Utf8.parse(passphrase),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
  }

  private decryptLegacy(payload: string, passphrase: string): string {
    try {
      return CryptoJS.AES.decrypt(payload, passphrase, {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(passphrase),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new DecryptionError('Unable to decrypt the stored value (legacy format).', { cause: error });
    }
  }

  private deriveKeys(passphrase: string, salt: CryptoJS.lib.WordArray): {
    encryption: CryptoJS.lib.WordArray;
    mac: CryptoJS.lib.WordArray;
  } {
    const material = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: (ENCRYPTION_KEY_BYTES + MAC_KEY_BYTES) / 4,
      iterations: this.iterations,
      hasher: CryptoJS.algo.SHA256
    });
    const encryptionWords = material.words.slice(0, ENCRYPTION_KEY_BYTES / 4);
    const macWords = material.words.slice(ENCRYPTION_KEY_BYTES / 4);
    return {
      encryption: CryptoJS.lib.WordArray.create(encryptionWords, ENCRYPTION_KEY_BYTES),
      mac: CryptoJS.lib.WordArray.create(macWords, MAC_KEY_BYTES)
    };
  }
}

function toBase64Url(wordArray: CryptoJS.lib.WordArray): string {
  // `=` only ever appears as trailing base64 padding, so blanket replacement is equivalent to stripping the suffix.
  return wordArray
    .toString(CryptoJS.enc.Base64)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function fromBase64Url(value: string): CryptoJS.lib.WordArray {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padding = base64.length % 4;
  return CryptoJS.enc.Base64.parse(padding === 0 ? base64 : base64 + '='.repeat(4 - padding));
}

/** Compares two word arrays without leaking their difference position through timing. */
function constantTimeEquals(a: CryptoJS.lib.WordArray, b: CryptoJS.lib.WordArray): boolean {
  if (a.sigBytes !== b.sigBytes) return false;
  const left = a.words;
  const right = b.words;
  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
