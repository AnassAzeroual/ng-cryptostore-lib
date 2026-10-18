/**
 * JSON codec with support for types that `JSON.stringify()` usually destroys.
 *
 * Round trips: `Date`, `BigInt`, `Map`, `Set`, `undefined`, `NaN`, `Infinity` and `-0`.
 * Plain JSON stays identical to what `JSON.parse()` produces, so values written by
 * older versions of the library keep being readable.
 */
const TAG_KEY = '__ngcs';

const TAGS = ['undefined', 'bigint', 'number', 'date', 'map', 'set'] as const;
type Tag = (typeof TAGS)[number];

function isTag(value: unknown): value is Tag {
  return typeof value === 'string' && (TAGS as readonly string[]).includes(value);
}

function replacer(this: unknown, key: string, value: unknown): unknown {
  // `Date.prototype.toJSON()` runs before the replacer, so the original value has to be
  // read from the holder object to detect dates.
  const original = (this as Record<string, unknown> | undefined)?.[key];

  if (original instanceof Date) {
    return { [TAG_KEY]: 'date', value: Number.isNaN(original.getTime()) ? null : original.toISOString() };
  }
  if (value === undefined) {
    // `JSON.stringify` would drop the property / turn it into null (array holes).
    return { [TAG_KEY]: 'undefined' };
  }
  if (typeof value === 'bigint') {
    return { [TAG_KEY]: 'bigint', value: value.toString() };
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { [TAG_KEY]: 'number', value: 'NaN' };
    if (!Number.isFinite(value)) return { [TAG_KEY]: 'number', value: value > 0 ? 'Infinity' : '-Infinity' };
    if (Object.is(value, -0)) return { [TAG_KEY]: 'number', value: '-0' };
    return value;
  }
  if (value instanceof Map) {
    return { [TAG_KEY]: 'map', value: Array.from(value.entries()) };
  }
  if (value instanceof Set) {
    return { [TAG_KEY]: 'set', value: Array.from(value.values()) };
  }
  return value;
}

/**
 * A tagged object has at most two keys, `__ngcs` (a known tag) and optionally `value`.
 * Anything else is treated as user data and left untouched.
 */
function isTaggedObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length > 2) return false;
  for (const key of keys) {
    if (key !== TAG_KEY && key !== 'value') return false;
  }
  return isTag((value as Record<string, unknown>)[TAG_KEY]);
}

function reviver(_key: string, value: unknown): unknown {
  if (!isTaggedObject(value)) return value;
  const tag = value[TAG_KEY] as Tag;
  const inner = value['value'];
  try {
    switch (tag) {
      case 'undefined':
        return undefined;
      case 'bigint':
        return typeof inner === 'string' ? BigInt(inner) : value;
      case 'number':
        if (inner === 'NaN') return Number.NaN;
        if (inner === '-0') return -0;
        if (inner === 'Infinity') return Number.POSITIVE_INFINITY;
        if (inner === '-Infinity') return Number.NEGATIVE_INFINITY;
        return value;
      case 'date':
        if (inner === null) return new Date(Number.NaN);
        return typeof inner === 'string' ? new Date(inner) : value;
      case 'map':
        return Array.isArray(inner) ? new Map(inner as [unknown, unknown][]) : value;
      case 'set':
        return Array.isArray(inner) ? new Set(inner) : value;
    }
  } catch {
    return value;
  }
}

/** Serializes any value to a JSON string. Always returns a string, even for `undefined`. */
export function encodeJson(value: unknown): string {
  const text = JSON.stringify(value, replacer);
  return text === undefined ? JSON.stringify({ [TAG_KEY]: 'undefined' }) : text;
}

/** Parses a JSON string produced by {@link encodeJson}. Plain JSON is fully supported. */
export function decodeJson<T = unknown>(text: string): T {
  return JSON.parse(text, reviver) as T;
}
