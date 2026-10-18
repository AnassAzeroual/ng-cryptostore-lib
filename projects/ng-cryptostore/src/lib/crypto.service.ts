import { Injectable, inject } from '@angular/core';
import { cbc } from '@noble/ciphers/aes.js';
import { hmac } from '@noble/hashes/hmac.js';
import { md5 } from '@noble/hashes/legacy.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';
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
const AES_BLOCK_BYTES = 16;
const DEFAULT_ITERATIONS = 1000;

/** OpenSSL envelope of the legacy format: 8 magic bytes + 8 salt bytes + ciphertext. */
const LEGACY_MAGIC = 'Salted__';
const LEGACY_SALT_BYTES = 8;

/** Chunk size for converting byte arrays to binary strings without hitting argument limits. */
const BINARY_CHUNK = 0x8000;

/** UTF-8 decoder that rejects malformed byte sequences instead of silently replacing them. */
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

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
 *
 * The primitives (AES, HMAC, PBKDF2, MD5, CSPRNG) are provided by the audited
 * `@noble/ciphers` and `@noble/hashes` packages; the byte layout is unchanged, so payloads
 * written by previous versions remain readable in both directions.
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
    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const keys = this.deriveKeys(passphrase, salt);

    const ciphertext = cbc(keys.encryption, iv).encrypt(utf8ToBytes(plainText));

    const header = `${toBase64Url(salt)}.${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
    const mac = hmac(sha256, keys.mac, utf8ToBytes(header));
    return `${V2_PREFIX}${header}.${toBase64Url(mac)}`;
  }

  private decryptV2(payload: string, passphrase: string): string {
    const parts = payload.slice(V2_PREFIX.length).split('.');
    if (parts.length !== 4) {
      throw new DecryptionError('Malformed v2 payload: expected 5 dot separated parts.');
    }
    const [saltPart, ivPart, cipherPart, macPart] = parts as [string, string, string, string];

    let salt: Uint8Array;
    let iv: Uint8Array;
    let ciphertext: Uint8Array;
    let mac: Uint8Array;
    try {
      salt = fromBase64Url(saltPart);
      iv = fromBase64Url(ivPart);
      ciphertext = fromBase64Url(cipherPart);
      mac = fromBase64Url(macPart);
    } catch (error) {
      throw new DecryptionError('Malformed v2 payload: invalid base64url segment.', { cause: error });
    }

    if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES || mac.length !== MAC_KEY_BYTES) {
      throw new DecryptionError('Malformed v2 payload: unexpected salt, iv or mac length.');
    }

    const keys = this.deriveKeys(passphrase, salt);
    const expectedMac = hmac(sha256, keys.mac, utf8ToBytes(`${saltPart}.${ivPart}.${cipherPart}`));
    if (!constantTimeEquals(expectedMac, mac)) {
      throw new IntegrityError(
        'The stored value failed its integrity check. It was tampered with, or it was encrypted with a different secret.'
      );
    }

    if (ciphertext.length === 0 || ciphertext.length % AES_BLOCK_BYTES !== 0) {
      throw new DecryptionError('Malformed v2 payload: invalid ciphertext length.');
    }

    try {
      return UTF8_DECODER.decode(cbc(keys.encryption, iv).decrypt(ciphertext));
    } catch (error) {
      throw new DecryptionError('Unable to decrypt the stored value.', { cause: error });
    }
  }

  /**
   * Historical format: the OpenSSL `Salted__` envelope with a random 8 byte salt and keys
   * derived through EVP_BytesToKey (MD5). Kept only to read data written by
   * ng-cryptostore <= 21.0.x (and to write it when `encryption.format` is set to `'legacy'`).
   */
  private encryptLegacy(plainText: string, passphrase: string): string {
    const salt = randomBytes(LEGACY_SALT_BYTES);
    const { key, iv } = evpBytesToKey(passphrase, salt);
    const ciphertext = cbc(key, iv).encrypt(utf8ToBytes(plainText));
    return bytesToBase64(concatBytes(utf8ToBytes(LEGACY_MAGIC), salt, ciphertext));
  }

  private decryptLegacy(payload: string, passphrase: string): string {
    try {
      const envelope = base64ToBytes(payload);
      const magic = utf8ToBytes(LEGACY_MAGIC);
      const minimumLength = magic.length + LEGACY_SALT_BYTES + AES_BLOCK_BYTES;
      if (envelope.length < minimumLength || !magic.every((byte, index) => envelope[index] === byte)) {
        throw new Error('Missing OpenSSL Salted__ envelope.');
      }

      const { key, iv } = evpBytesToKey(passphrase, envelope.subarray(magic.length, magic.length + LEGACY_SALT_BYTES));
      return UTF8_DECODER.decode(cbc(key, iv).decrypt(envelope.subarray(magic.length + LEGACY_SALT_BYTES)));
    } catch (error) {
      throw new DecryptionError('Unable to decrypt the stored value (legacy format).', { cause: error });
    }
  }

  private deriveKeys(passphrase: string, salt: Uint8Array): { encryption: Uint8Array; mac: Uint8Array } {
    const material = pbkdf2(sha256, utf8ToBytes(passphrase), salt, {
      c: this.iterations,
      dkLen: ENCRYPTION_KEY_BYTES + MAC_KEY_BYTES
    });
    return {
      encryption: material.subarray(0, ENCRYPTION_KEY_BYTES),
      mac: material.subarray(ENCRYPTION_KEY_BYTES)
    };
  }
}

/**
 * OpenSSL-compatible key derivation of the legacy format:
 * `D_i = MD5(D_{i-1} || passphrase || salt)`, concatenated until key and iv are covered.
 */
function evpBytesToKey(passphrase: string, salt: Uint8Array): { key: Uint8Array; iv: Uint8Array } {
  const passphraseBytes = utf8ToBytes(passphrase);
  const material = new Uint8Array(ENCRYPTION_KEY_BYTES + IV_BYTES);
  let previous = new Uint8Array(0);
  let offset = 0;
  while (offset < material.length) {
    previous = md5(concatBytes(previous, passphraseBytes, salt));
    material.set(previous, offset);
    offset += previous.length;
  }
  return { key: material.subarray(0, ENCRYPTION_KEY_BYTES), iv: material.subarray(ENCRYPTION_KEY_BYTES) };
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): Uint8Array {
  return base64ToBytes(value.replaceAll('-', '+').replaceAll('_', '/'));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += BINARY_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BINARY_CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const padded = value.length % 4 === 0 ? value : value + '='.repeat(4 - (value.length % 4));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Compares two byte arrays without leaking their difference position through timing. */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a[index]! ^ b[index]!;
  }
  return diff === 0;
}
