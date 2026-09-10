const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes standard base64 into raw bytes. Hand-rolled because `atob` is not
 * guaranteed on every React Native runtime, and the supabase storage client
 * needs real bytes rather than a string.
 *
 * Padding and any whitespace or line breaks are ignored, so this accepts both
 * the compact string an encoder returns and a wrapped one.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array((clean.length * 3) >> 2);
  let buffer = 0;
  let bits = 0;
  let out = 0;
  for (let i = 0; i < clean.length; i++) {
    const value = ALPHABET.indexOf(clean[i]);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (buffer >> bits) & 0xff;
    }
  }
  // `slice`, not `subarray`: React Native's XHR uploads a typed array by
  // reading its whole underlying buffer and ignoring the view bounds, so a
  // view shorter than its buffer would send trailing zero bytes.
  return out === bytes.length ? bytes : bytes.slice(0, out);
}
