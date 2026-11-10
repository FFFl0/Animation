import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { SHOP_ITEMS, needsDelivery } from '../catalogue';

/**
 * Every product picture has to be 4:3, because every box that shows one is
 * 4:3 and they are drawn with `cover` — which crops, silently, whatever
 * does not match. A photograph dropped in at 16:9 would lose its top and
 * bottom in the cart and nobody would be told.
 *
 * The README invites exactly that: "when real photographs exist, just put
 * them here under the same name". This is the check that makes doing so
 * safe.
 */
const SHOP_DIR = join(__dirname, '../../../assets/shop');

/** Width and height out of a JPEG's frame header. */
function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  let i = 2;
  const FRAME = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (i < bytes.length - 9) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (FRAME.has(marker)) {
      return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  return null;
}

describe('shop artwork', () => {
  /** Every product picture. hero.jpg is the shop's banner, not a product. */
  const files = readdirSync(SHOP_DIR).filter(
    (name) => name.endsWith('.jpg') && (name.startsWith('merch-') || name.startsWith('item-'))
  );

  it('has a picture for every physical item', () => {
    const wanted = SHOP_ITEMS.filter(needsDelivery).map((item) => `${item.id}.jpg`);
    expect(wanted.length).toBeGreaterThan(0);
    for (const name of wanted) expect(files).toContain(name);
  });

  it('has a picture for every game item', () => {
    const wanted = SHOP_ITEMS.filter((item) => item.grant.kind === 'consumable').map((item) => `${item.id}.jpg`);
    expect(wanted.length).toBeGreaterThan(0);
    for (const name of wanted) expect(files).toContain(name);
  });

  it('names nothing the catalogue has never heard of', () => {
    const ids = new Set(SHOP_ITEMS.map((item) => item.id));
    for (const name of files) expect(ids).toContain(name.replace(/\.jpg$/, ''));
  });

  it.each(files)('%s is 4:3, so nothing is cropped off it', (name) => {
    const size = jpegSize(readFileSync(join(SHOP_DIR, name)));
    expect(size).not.toBeNull();
    // A couple of pixels of slack for a photograph cropped by hand;
    // anything further off will visibly lose its edges.
    expect(size!.width / size!.height).toBeCloseTo(4 / 3, 2);
  });

  it('keeps the files small enough to ship', () => {
    for (const name of files) {
      expect(readFileSync(join(SHOP_DIR, name)).length).toBeLessThan(400 * 1024);
    }
  });
});
