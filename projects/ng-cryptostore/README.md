# NgCryptoStore

[![npm version](https://img.shields.io/npm/v/ng-cryptostore.svg)](https://www.npmjs.com/package/ng-cryptostore)
[![license](https://img.shields.io/npm/l/ng-cryptostore.svg)](https://github.com/AnassAzeroual/ng-cryptostore-lib/blob/main/LICENSE)

Encrypted key/value storage for Angular applications. Store strings, objects, arrays and rich
values in `localStorage`, `sessionStorage`, `IndexedDB`, cookies or an in-memory store — encrypted
with **AES-256**, protected by an **HMAC integrity tag** and readable with a familiar API.

## Highlights

- **Modern cryptography** — AES-256-CBC with a random salt and a random IV for every value,
  PBKDF2-SHA256 key derivation and an HMAC-SHA256 authentication tag that detects tampering,
  built on the audited, dependency-free
  [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers) and
  [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) primitives.
- **Backward compatible** — data written by ng-cryptostore <= 21.0.x is decrypted transparently
  and re-encrypted with the modern format on the next write.
- **Familiar API** — `set`, `get`, `asyncGet`, `getEncrypted`, `check`, `remove`, `clearAll`,
  `getItemLength`, `crypt` and `decrypt` keep working exactly like before.
- **Four backends + memory** — `localStorage`, `sessionStorage`, `cookies`, `IndexedDB` (fully
  functional now) and `memory`; plug your own backend with a single injection token.
- **Rich types survive** — `Date`, `Map`, `Set`, `BigInt`, `undefined`, `NaN`, `Infinity` and `-0`
  are serialized and restored.
- **Fast** — decrypted values are cached in memory (invalidated on every write and when another
  tab changes the storage), so repeated reads never re-run the key derivation.
- **SSR friendly** — falls back to an in-memory store on the server instead of throwing.
- **Typed errors** — every failure has a dedicated class (`DecryptionError`, `IntegrityError`,
  `AsyncStorageError`, `CookieLimitError`…).

## Table of Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Storage backends](#storage-backends)
- [API](#api)
- [Rich types](#rich-types)
- [Secrets](#secrets)
- [Security](#security)
- [Performance](#performance)
- [Error handling](#error-handling)
- [Custom backends](#custom-backends)
- [Migrating from <= 21.0.x](#migrating-from--210x)
- [Development](#development)

## Installation

```bash
npm install ng-cryptostore
```

## Quick start

Standalone applications (recommended):

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgCryptoStore } from 'ng-cryptostore';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    // 'localStorage' | 'sessionStorage' | 'IndexedDB' | 'cookies' | 'memory'
    provideNgCryptoStore({ storageType: 'localStorage' })
  ]
});
```

NgModules:

```ts
import { provideNgCryptoStore } from 'ng-cryptostore';

@NgModule({
  providers: [
    provideNgCryptoStore({ storageType: 'localStorage' })
  ],
  bootstrap: [/* ... */]
})
export class AppModule { }
```

Inject the service and use it:

```ts
import { Component, inject } from '@angular/core';
import { StorageService } from 'ng-cryptostore';

@Component({ /* ... */ })
export class AppComponent {
  private store = inject(StorageService);

  async ngOnInit(): Promise<void> {
    await this.store.set('fruits', [{ name: 'fraise', icons: '🍓' }]);
    console.log(this.store.get('fruits')); // [{ name: 'fraise', icons: '🍓' }]
  }
}
```

## Configuration

```ts
provideNgCryptoStore({
  storageType: 'localStorage',       // required: 'localStorage' | 'sessionStorage' | 'IndexedDB' | 'cookies' | 'memory'

  secret: 'my-application-secret',   // optional fallback passphrase for every call
  encryption: {
    format: 'v2',                    // 'v2' (default) or 'legacy' (see Security)
    iterations: 1000                 // PBKDF2 iterations of the 'v2' format
  },
  cache: true,                       // cache decrypted values in memory (default: true)
  keyPrefix: 'app:',                 // prefix every key; also scopes clearAll()

  indexedDB: {
    databaseName: 'myDatabase',      // default: 'myDatabase'
    storeName: 'myObjectStore',      // default: 'myObjectStore'
    version: 2                       // default: 2
  },

  cookies: {
    path: '/',                       // default: '/'
    domain: undefined,               // default: current host
    sameSite: 'Lax',                 // 'Lax' | 'Strict' | 'None'
    secure: undefined,               // default: true when served over HTTPS
    expiresInDays: 1,                // `null` for a session cookie
    maxCookieSize: 3800              // characters per cookie before values are split
  }
})
```

Invalid configuration is rejected at bootstrap with an explicit error (for example
`UnsupportedStorageTypeError`).

## Storage backends

| `storageType`    | Sync / async        | Notes |
| ---------------- | ------------------- | ----- |
| `localStorage`   | synchronous         | Persists until cleared. Falls back to memory when storage is blocked (private mode). |
| `sessionStorage` | synchronous         | Cleared when the tab closes. Same fallback behaviour. |
| `cookies`        | synchronous         | Sent with HTTP requests. Values larger than one cookie are transparently chunked (~4 KB limit). Attributes (`Path`, `SameSite`, `Secure`) are always written. |
| `IndexedDB`      | **asynchronous**    | Only the async APIs work (`asyncGet`, `asyncGetEncrypted`, `asyncCheck`); the sync ones throw `AsyncStorageError`. |
| `memory`         | synchronous         | Never persisted; also used automatically during server-side rendering. |

## API

```ts
// writes (always asynchronous)
set<T>(name: string, data: T, secret?: string): Promise<void>;
remove(name: string): Promise<void>;
clearAll(): Promise<void>;

// reads (synchronous backends)
get<T>(name: string, secret?: string): T | '' | null;
getEncrypted(name: string): string | '' | null;
check(name: string): boolean;

// reads (any backend, including IndexedDB)
asyncGet<T>(name: string, secret?: string): Promise<T | '' | null>;
asyncGetEncrypted(name: string): Promise<string | '' | null>;
asyncCheck(name: string): Promise<boolean>;

// utilities
keys(): Promise<string[]>;
getItemLength(name: string, secret?: string): Promise<number>;
crypt(data: unknown, secret?: string): Promise<string>;
decrypt<T>(payload: string, secret?: string): Promise<T | ''>;

// properties
readonly storageType: StorageType;
readonly isAsyncStorage: boolean;
```

### `set`

Encrypts and stores any value.

```ts
await this.store.set('fruitsArray', [{ name: 'fraise', icons: '🍓' }, { name: 'banana', icons: '🍌' }]);
await this.store.set('fruit', { name: 'orange', icons: '🍊' });
await this.store.set('strings', 'fruits: orange, fraise, banana and ...');
await this.store.set('numbers', 1234567892121);
```

### `get` / `asyncGet`

Reads and decrypts a value. `''` is returned when the key does not exist; a `DecryptionError`
(or `IntegrityError`) is thrown when the payload cannot be decrypted — for example when the value
was written with another secret or was modified by hand.

```ts
console.log(this.store.get('fruitsArray'));        // [{…}, {…}]
console.log(await this.store.asyncGet('fruit'));   // {…}
console.log(this.store.get('does_not_exist'));     // ''
```

### `getEncrypted` / `asyncGetEncrypted`

Returns the raw encrypted payload:

```ts
console.log(this.store.getEncrypted('fruitsArray')); // v2.salt.iv.ciphertext.mac
```

### `check` / `asyncCheck`

```ts
console.log(this.store.check('fruit'));            // true | false
console.log(await this.store.asyncCheck('fruit')); // true | false
```

### `remove` / `clearAll`

```ts
await this.store.remove('fruit');  // one entry
await this.store.clearAll();       // everything owned by this backend
```

`clearAll()` respects `keyPrefix`; when no prefix is configured it clears the whole backend
(`localStorage.clear()`, every cookie, the IndexedDB object store…), matching the historical
behaviour.

### `keys`

Names of the stored entries (the configured `keyPrefix` is stripped):

```ts
console.log(await this.store.keys()); // ['fruits', 'fruit']
```

### `getItemLength`

Decrypts a value and measures its size: characters for strings, items for arrays / maps / sets,
own keys for plain objects.

```ts
await this.store.set('fruits', [{ name: 'orange' }, { name: 'fraise' }]);
console.log(await this.store.getItemLength('fruits')); // 2
```

### `crypt` / `decrypt`

Standalone encryption helpers:

```ts
const payload = await this.store.crypt([{ name: 'fraise', icons: '🍓' }]);
console.log(payload);                               // v2.salt.iv.ciphertext.mac
console.log(await this.store.decrypt(payload));     // [{ name: 'fraise', icons: '🍓' }]
```

## Rich types

Because values are serialized with a dedicated codec, the following types survive a round trip:

```ts
await this.store.set('session', {
  createdAt: new Date(),
  permissions: new Set(['read', 'write']),
  settings: new Map([['theme', 'dark']]),
  revision: 9007199254740993n,
  ratio: Number.NaN
});
```

Plain JSON behaves exactly like `JSON.parse(JSON.stringify(value))`.

## Secrets

The `secret` is optional. When it is omitted, the `secret` from the configuration is used and,
as a last resort, the library's built-in passphrase (kept identical to previous versions so
existing data stays readable).

> **Warning** — a client-side secret only protects data at rest (a stolen disk, a copied
> `localStorage` dump, logs…). It does **not** protect against XSS: any script running on your
> page can call the same API. Prefer deriving the secret from something the user knows or from a
> server-issued token, and see [Security](#security).

```ts
await this.store.set('fruits', [{ name: 'orange' }], '!secret token @123456');
console.log(this.store.get('fruits', '!secret token @123456')); // [{ name: 'orange' }]
```

## Security

The `v2` payload format written since 21.1:

```
v2.<salt>.<iv>.<ciphertext>.<mac>
```

- `salt` — 16 random bytes, unique per value: derives a 256-bit AES key and a 256-bit HMAC key
  from the secret with PBKDF2-SHA256.
- `iv` — 16 random bytes, unique per value: feeds AES-256-CBC. (The historical format reused the
  secret as a static IV, which leaks patterns and produces identical ciphertexts for identical
  values.)
- `mac` — HMAC-SHA256 over `salt.iv.ciphertext`. Anything modified in the storage fails the check
  and raises an `IntegrityError` before decryption is attempted.

Segments are base64url encoded, so payloads are safe in cookies, URLs and JSON.

The primitives (AES, HMAC, PBKDF2, MD5 for the legacy format and the random generator) come from
the audited, dependency-free [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers) and
[`@noble/hashes`](https://github.com/paulmillr/noble-hashes) packages. The byte-level layout is
unchanged, so data written by earlier versions stays readable in both directions.

`encryption.format: 'legacy'` keeps writing the historical format (static IV, no authentication)
— only useful when an application running the old library version must read the data written by
the new one. Reads always accept both formats.

The number of PBKDF2 iterations is configurable (`encryption.iterations`, default `1000`,
≈2 ms per operation on a modern desktop). Raise it when the secret is weak or long-lived.

## Performance

- **Decrypted-value cache** — `get` / `asyncGet` cache the decrypted JSON per key and secret.
  Repeated reads cost a `JSON.parse`, not a PBKDF2 + AES + HMAC round. The cache is invalidated
  on `set`, `remove`, `clearAll`, when another tab writes to `localStorage` / `sessionStorage`
  (via the `storage` event) and on `cache: false` if you prefer fresh reads everywhere.
- **Key derivation only when needed** — the expensive PBKDF2 step happens once per value, then
  never again for the same key while the cache is warm.
- **Cheap backends first** — the library never serializes twice and passes the raw payload
  directly to the backend.
- **Tree-shakable** — `sideEffects: false`; only the code you import ends up in your bundle.

## Error handling

Every error extends `NgCryptoStoreError`:

| Class                         | Raised when |
| ----------------------------- | ----------- |
| `UnsupportedStorageTypeError` | the configured `storageType` is unknown |
| `StorageUnavailableError`     | the backend is unavailable (cookies/IndexedDB/SSR) |
| `StorageWriteError`           | the backend rejects a write (quota exceeded…) |
| `AsyncStorageError`           | a synchronous API is used with `IndexedDB` |
| `CookieLimitError`            | a value is too large for cookies (beyond the chunk limit) |
| `DecryptionError`             | the payload cannot be decrypted (wrong secret, corrupted data) |
| `IntegrityError`              | the payload failed its authentication check (tampered data) |

```ts
import { IntegrityError, NgCryptoStoreError } from 'ng-cryptostore';

try {
  await this.store.asyncGet('token');
} catch (error) {
  if (error instanceof IntegrityError) {
    // the stored value was modified: drop it and ask the user to sign in again
    await this.store.remove('token');
  } else if (error instanceof NgCryptoStoreError) {
    console.error(error.name, error.message);
  }
}
```

## Custom backends

Provide any object implementing `StorageAdapter` to `STORAGE_ADAPTER` — for example to use
native storage on mobile or a remote API:

```ts
import { STORAGE_ADAPTER, AsyncStorageAdapter } from 'ng-cryptostore';

const nativeStorage: AsyncStorageAdapter = {
  isAsync: true,
  kind: 'IndexedDB', // or any StorageType label
  getItem: (key) => NativePlugin.getItem({ key }).then((r) => r.value),
  setItem: (key, value) => NativePlugin.setItem({ key, value }),
  removeItem: (key) => NativePlugin.removeItem({ key }),
  keys: () => NativePlugin.keys(),
  clear: () => NativePlugin.clear()
};

bootstrapApplication(AppComponent, {
  providers: [
    provideNgCryptoStore({ storageType: 'IndexedDB' }),
    { provide: STORAGE_ADAPTER, useValue: nativeStorage }
  ]
});
```

## Migrating from <= 21.0.x

The public API is unchanged, so upgrading is a drop-in replacement. Behaviour notes:

1. **Old data keeps working.** Payloads that do not start with `v2.` are decrypted with the
   historical algorithm and re-encrypted with the modern format on the next `set` of that key.
2. **`getItemLength` is fixed.** It used to return `undefined` for every backend except
   `localStorage`; it now returns the real size (characters, items or keys).
3. **`remove` and `clearAll` return promises** (they still work with `await` or without).
4. **IndexedDB works.** The old object store could never be written to (`add()` on an inline
   keyPath store always throws). The library now recreates that store automatically when the
   database is opened, and `check`, `get` and `getEncrypted` are no longer wrong for it: use the
   async `asyncGet` / `asyncGetEncrypted` / `asyncCheck` variants.
5. **`check` is meaningful for IndexedDB** through `asyncCheck`.
6. **Data written with the new version uses the `v2` format**, which the old versions cannot
   read. During a gradual rollout set `encryption: { format: 'legacy' }` in the new version to
   keep writing the old format until every deployment is upgraded.
7. **Cookies** are written with `Path` / `SameSite` / `Secure` attributes and URI-encoded values;
   large values are chunked. Cookies written by the old version are still read.

## Development

```bash
npm install

npm run build          # build the library (dist/ng-cryptostore)
npm start              # serve the demo application
npm test               # unit tests (watch mode, Chrome)
npm run test:ci        # unit tests, headless, single run
npm run test:coverage  # unit tests + coverage report
npm run pack           # build and create a .tgz of the package
```

## License

MIT
