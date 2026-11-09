import { ANIMATED_AVATARS } from '../animatedAvatars';
import { ANIMATED_FRAMES } from '../animatedFrames';
import {
  POPULAR_ITEMS,
  SHOP_ITEMS,
  SHOP_SECTIONS,
  byPopularity,
  isStackable,
  itemsOf,
  needsDelivery,
  shopItem,
} from '../catalogue';
import { SHOP_IMAGES } from '../shopImages';

describe('catalogue', () => {
  it('has unique ids', () => {
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item one positive price, payable either way', () => {
    for (const item of SHOP_ITEMS) {
      expect(item.priceRub).toBeGreaterThan(0);
      expect(Number.isInteger(item.priceRub)).toBe(true);
    }
  });

  it('has something popular on every shelf, but not the whole shelf', () => {
    for (const section of SHOP_SECTIONS) {
      const items = itemsOf(section);
      const popular = items.filter((item) => item.popular);
      expect(popular.length).toBeGreaterThan(0);
      expect(popular.length).toBeLessThan(items.length);
    }
    expect(POPULAR_ITEMS.length).toBe(SHOP_ITEMS.filter((i) => i.popular).length);
  });

  it('stacks consumables and nothing else', () => {
    for (const item of SHOP_ITEMS) {
      expect(isStackable(item)).toBe(item.grant.kind === 'consumable');
      if (item.grant.kind === 'consumable') expect(item.grant.amount).toBeGreaterThan(0);
    }
  });

  it('gives every section something to show', () => {
    for (const section of SHOP_SECTIONS) {
      expect(itemsOf(section).length).toBeGreaterThan(0);
    }
  });

  it('ships a picture for everything you can hold, and none for what you cannot', () => {
    for (const item of SHOP_ITEMS) {
      expect(SHOP_IMAGES[item.id] !== undefined).toBe(needsDelivery(item));
    }
    // and carries no picture for an item that no longer exists
    for (const id of Object.keys(SHOP_IMAGES)) expect(shopItem(id)).toBeDefined();
  });

  it('grants a frame or an avatar that actually exists', () => {
    for (const item of SHOP_ITEMS) {
      if (item.grant.kind === 'animatedFrame') expect(ANIMATED_FRAMES[item.grant.frameId]).toBeDefined();
      if (item.grant.kind === 'animatedAvatar') expect(ANIMATED_AVATARS[item.grant.avatarId]).toBeDefined();
    }
  });

  it('sells every avatar and every frame that exists, exactly once', () => {
    const avatars = SHOP_ITEMS.flatMap((i) => (i.grant.kind === 'animatedAvatar' ? [i.grant.avatarId] : []));
    const frames = SHOP_ITEMS.flatMap((i) => (i.grant.kind === 'animatedFrame' ? [i.grant.frameId] : []));
    expect(new Set(avatars).size).toBe(Object.keys(ANIMATED_AVATARS).length);
    expect(new Set(frames).size).toBe(Object.keys(ANIMATED_FRAMES).length);
    expect(avatars).toHaveLength(new Set(avatars).size);
    expect(frames).toHaveLength(new Set(frames).size);
  });

  it('only asks for a size on things you wear', () => {
    for (const item of SHOP_ITEMS) {
      if (item.sizes) expect(needsDelivery(item)).toBe(true);
    }
  });

  it('finds an item by id and nothing by a made-up one', () => {
    expect(shopItem('merch-tee')?.section).toBe('merch');
    expect(shopItem('nope')).toBeUndefined();
  });

  /**
   * A shelf used to show only its popular items, which hid four of the six
   * frames behind a link. Popularity orders a shelf now; it never shortens
   * one.
   */
  describe('byPopularity', () => {
    it('keeps every item on the shelf', () => {
      for (const section of SHOP_SECTIONS) {
        const items = itemsOf(section);
        const ordered = byPopularity(items);
        expect(ordered).toHaveLength(items.length);
        expect(new Set(ordered.map((i) => i.id))).toEqual(new Set(items.map((i) => i.id)));
      }
    });

    it('puts the popular ones first', () => {
      for (const section of SHOP_SECTIONS) {
        const flags = byPopularity(itemsOf(section)).map((item) => Boolean(item.popular));
        const firstPlain = flags.indexOf(false);
        if (firstPlain === -1) continue;
        expect(flags.slice(firstPlain).some(Boolean)).toBe(false);
      }
    });

    it('leaves the order within each half alone', () => {
      const items = itemsOf('merch');
      const ordered = byPopularity(items);
      const plain = items.filter((i) => !i.popular).map((i) => i.id);
      expect(ordered.filter((i) => !i.popular).map((i) => i.id)).toEqual(plain);
    });

    it('reaches every item in the shop through its own section', () => {
      const reachable = SHOP_SECTIONS.flatMap((section) => byPopularity(itemsOf(section)).map((i) => i.id));
      expect(new Set(reachable)).toEqual(new Set(SHOP_ITEMS.map((i) => i.id)));
    });
  });
});

/**
 * A name on a round card has one line of about nine characters to live on,
 * and a word that will not fit is broken wherever it runs out — which is
 * how the frames shelf once read "Лепестк / и".
 *
 * Eight is not a round number: it is what the longest name in the shop
 * measures today, checked against Manrope's own advance widths at the size
 * and card width the narrowest supported phone gives. A ninth character
 * would not fail the build any other way — it would just look broken on a
 * shelf nobody opened before shipping.
 *
 * Merch is exempt: those cards are half the screen wide, not a quarter.
 */
describe('names fit the card they are shown on', () => {
  const ROUND_SECTIONS = ['avatars', 'frames'] as const;
  const LONGEST_WORD = 8;

  it('keeps every word on a round card short enough not to be broken', () => {
    // Collected rather than asserted one at a time, so a failure names
    // every offender and the word that caused it.
    const tooLong = ROUND_SECTIONS.flatMap((section) =>
      itemsOf(section).flatMap((item) =>
        [item.title, item.titleEn]
          .flatMap((label) => label.split(/\s+/))
          .filter((word) => word.length > LONGEST_WORD)
          .map((word) => `${item.id}: "${word}" (${word.length})`)
      )
    );
    expect(tooLong).toEqual([]);
  });

  it('is measuring something — the shelves are not empty', () => {
    expect(ROUND_SECTIONS.flatMap((section) => itemsOf(section)).length).toBeGreaterThan(10);
  });
});
