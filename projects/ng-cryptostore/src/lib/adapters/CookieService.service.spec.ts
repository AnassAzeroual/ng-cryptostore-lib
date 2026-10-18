import { TestBed } from '@angular/core/testing';
import { provideNgCryptoStore } from '../Storage.module';
import { StorageService } from '../storage.service';
import { CookieService } from './CookieService.service';

function clearCookies(): void {
  for (const entry of document.cookie.split(';')) {
    const separator = entry.indexOf('=');
    const name = separator === -1 ? entry : entry.slice(0, separator);
    if (name.trim()) {
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

function rawCookie(name: string): string | null {
  for (const entry of document.cookie.split(';')) {
    const trimmed = entry.trimStart();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return null;
}

function createService(options?: { keyPrefix?: string }): CookieService {
  TestBed.configureTestingModule({
    providers: [
      provideNgCryptoStore({
        storageType: 'cookies',
        encryption: { iterations: 10 },
        keyPrefix: options?.keyPrefix
      })
    ]
  });
  return TestBed.inject(CookieService);
}

describe('CookieService', () => {
  beforeEach(() => clearCookies());
  afterEach(() => {
    clearCookies();
    TestBed.resetTestingModule();
  });

  it('round trips values containing special characters', () => {
    const service = createService();
    const value = 'a;b=c%20 d=é ü 🍓 plus+slash/';

    service.setItem('special', value);

    expect(service.getItem('special')).toBe(value);
    expect(rawCookie('special')).toBe(encodeURIComponent(value));
  });

  it('splits large values into chunks and reassembles them transparently', () => {
    const service = createService();
    const value = 'a'.repeat(9000);

    service.setItem('big', value);

    expect(service.getItem('big')).toBe(value);
    expect(rawCookie('big')).toBe('__ngcs_chunked__:3');
    expect(rawCookie('big.__ngcs_0')!.length).toBe(3800);
    expect(service.keys()).toContain('big');
    expect(service.keys().some((key) => key.includes('.__ngcs_'))).toBeFalse();

    service.removeItem('big');
    expect(service.getItem('big')).toBeNull();
    expect(rawCookie('big.__ngcs_0')).toBeNull();
  });

  it('cleans up stale chunks when a chunked value shrinks', () => {
    const service = createService();

    service.setItem('k', 'x'.repeat(9000));
    service.setItem('k', 'small');

    expect(service.getItem('k')).toBe('small');
    expect(rawCookie('k.__ngcs_0')).toBeNull();
    expect(rawCookie('k')).toBe(encodeURIComponent('small'));
  });

  it('reads cookies written by earlier versions (unencoded values)', () => {
    const service = createService();
    document.cookie = 'legacy=U2FsdGVkX18lKfMIr8dpIGGLy+abc/def==; path=/';

    expect(service.getItem('legacy')).toBe('U2FsdGVkX18lKfMIr8dpIGGLy+abc/def==');
    expect(service.read('legacy')).toBe('U2FsdGVkX18lKfMIr8dpIGGLy+abc/def==');
  });

  it('handles missing and empty values', () => {
    const service = createService();

    expect(service.getItem('missing')).toBeNull();
    expect(service.read('missing')).toBe('');

    service.setItem('empty', '');
    expect(service.getItem('empty')).toBe('');
  });

  it('only clears cookies matching the configured prefix', () => {
    const service = createService({ keyPrefix: 'app:' });
    service.setItem('app:a', '1');
    service.setItem('app:b', '2');
    document.cookie = 'foreign=keep; path=/';

    service.clear();

    expect(service.getItem('app:a')).toBeNull();
    expect(service.getItem('app:b')).toBeNull();
    expect(rawCookie('foreign')).toBe('keep');
  });

  it('clears every cookie when no prefix is configured (historical behaviour)', () => {
    const service = createService();
    service.setItem('a', '1');
    service.setItem('b', '2');

    service.clear();

    expect(service.keys()).toEqual([]);
  });

  it('supports the deprecated expires argument and API', () => {
    const service = createService();

    service.create('expired', 'value', -1);
    expect(service.getItem('expired')).toBeNull();

    service.create('k', 'v');
    expect(service.read('k')).toBe('v');
    service.update('k', 'v2');
    expect(service.read('k')).toBe('v2');
    service.delete('k');
    expect(service.read('k')).toBe('');

    service.create('a', '1');
    service.create('b', '2');
    service.deleteAll();
    expect(service.read('a')).toBe('');
  });

  it('works end to end through StorageService', async () => {
    TestBed.configureTestingModule({
      providers: [provideNgCryptoStore({ storageType: 'cookies', encryption: { iterations: 10 } })]
    });
    const store = TestBed.inject(StorageService);

    await store.set('fruits', [{ name: 'fraise', icons: '🍓' }]);

    expect(store.storageType).toBe('cookies');
    expect(store.get('fruits')).toEqual([{ name: 'fraise', icons: '🍓' }]);
    expect(store.check('fruits')).toBeTrue();

    await store.remove('fruits');
    expect(store.check('fruits')).toBeFalse();
  });
});
