import { decodeJson, encodeJson } from './json-codec';

describe('json-codec', () => {
  it('round trips plain JSON without changes', () => {
    const value = { fruits: [{ name: 'fraise', icons: '🍓' }], count: 3, ok: true, nothing: null };
    const text = encodeJson(value);
    expect(text).toBe(JSON.stringify(value));
    expect(decodeJson(text)).toEqual(value);
  });

  it('round trips dates, bigints, maps and sets', () => {
    const date = new Date('2026-10-18T12:34:56.789Z');
    const value = {
      date,
      big: 9_007_199_254_740_993n,
      map: new Map<string, unknown>([
        ['a', 1],
        ['nested', new Date('2020-01-01T00:00:00.000Z')]
      ]),
      set: new Set([1, 'two', { three: 3 }])
    };

    const decoded = decodeJson<typeof value>(encodeJson(value));

    expect(decoded.date).toEqual(date);
    expect(decoded.date instanceof Date).toBeTrue();
    expect(decoded.big).toBe(9_007_199_254_740_993n);
    expect(decoded.map instanceof Map).toBeTrue();
    expect(decoded.map.get('a')).toBe(1);
    expect((decoded.map.get('nested') as Date).toISOString()).toBe('2020-01-01T00:00:00.000Z');
    expect(decoded.set instanceof Set).toBeTrue();
    expect(decoded.set.size).toBe(3);
    expect(decoded.set.has(1)).toBeTrue();
  });

  it('round trips special numbers and undefined', () => {
    expect(decodeJson(encodeJson(Number.NaN))).toBeNaN();
    expect(decodeJson(encodeJson(Number.POSITIVE_INFINITY))).toBe(Infinity);
    expect(decodeJson(encodeJson(Number.NEGATIVE_INFINITY))).toBe(-Infinity);
    expect(Object.is(decodeJson(encodeJson(-0)), -0)).toBeTrue();
    expect(decodeJson(encodeJson(undefined))).toBeUndefined();
    expect(decodeJson<Date>(encodeJson(new Date(Number.NaN))).getTime()).toBeNaN();
  });

  it('keeps undefined entries inside arrays (object properties are dropped, as with JSON)', () => {
    const decoded = decodeJson<{ list: unknown[] }>(encodeJson({ list: [undefined, 1] }));
    expect(decoded.list[0]).toBeUndefined();
    expect(decoded.list[1]).toBe(1);

    // `JSON.stringify` and `JSON.parse` cannot preserve `undefined` object properties
    // (the reviver deletes them), so they stay dropped exactly like with plain JSON.
    const withProperty = decodeJson<Record<string, unknown>>(encodeJson({ a: undefined, b: 1 }));
    expect('a' in withProperty).toBeFalse();
    expect(withProperty['b']).toBe(1);
  });

  it('does not misinterpret user objects that look like tags', () => {
    const userObject = { __ngcs: 'date', value: 'not a real date', extra: true };
    expect(decodeJson(encodeJson(userObject))).toEqual(userObject);

    const unknownTag = { __ngcs: 'something-else', value: 42 };
    expect(decodeJson(encodeJson(unknownTag))).toEqual(unknownTag);

    const nullDate = decodeJson<Date>(encodeJson(new Date(Number.NaN)));
    expect(nullDate instanceof Date).toBeTrue();
    expect(nullDate.getTime()).toBeNaN();
  });

  it('decodes JSON written by older library versions (plain JSON.stringify output)', () => {
    expect(decodeJson('{"a":1,"b":[1,2,3]}')).toEqual({ a: 1, b: [1, 2, 3] });
    expect(decodeJson('"a string"')).toBe('a string');
    expect(decodeJson('123')).toBe(123);
  });
});
