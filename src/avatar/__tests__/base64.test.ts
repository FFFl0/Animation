import { base64ToBytes } from '../base64';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Textbook base64 encoder, written out here so the decoder under test is
 * checked against something other than itself. */
function encode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = bytes.slice(i, i + 3);
    const word = (chunk[0] << 16) | ((chunk[1] ?? 0) << 8) | (chunk[2] ?? 0);
    const chars = [word >> 18, (word >> 12) & 63, (word >> 6) & 63, word & 63].map((n) => ALPHABET[n]);
    if (chunk.length < 3) chars[3] = '=';
    if (chunk.length < 2) chars[2] = '=';
    out += chars.join('');
  }
  return out;
}

describe('base64ToBytes', () => {
  it('decodes each padding case', () => {
    // Lengths 3/4/5 cover no padding, "==" and "=" respectively.
    for (const bytes of [[1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5]]) {
      expect(Array.from(base64ToBytes(encode(bytes)))).toEqual(bytes);
    }
  });

  it('decodes an empty string', () => {
    expect(base64ToBytes('')).toHaveLength(0);
  });

  it('covers the whole byte range, including the high bit', () => {
    const bytes = Array.from({ length: 256 }, (_, i) => i);
    expect(Array.from(base64ToBytes(encode(bytes)))).toEqual(bytes);
  });

  it('never leaves slack at the end of the buffer', () => {
    // React Native uploads a typed array by its buffer, not its view bounds.
    for (const length of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const bytes = Array.from({ length }, (_, i) => i + 1);
      const decoded = base64ToBytes(encode(bytes));
      expect(decoded.byteLength).toBe(length);
      expect(decoded.buffer.byteLength).toBe(length);
    }
  });

  it('ignores whitespace and line breaks', () => {
    const bytes = [0xde, 0xad, 0xbe, 0xef];
    const wrapped = encode(bytes).split('').join('\n');
    expect(Array.from(base64ToBytes(wrapped))).toEqual(bytes);
  });
});
