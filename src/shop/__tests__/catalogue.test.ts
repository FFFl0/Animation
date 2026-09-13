import { ANIMATED_FRAMES } from '../animatedFrames';
import { SHOP_ITEMS, SHOP_SECTIONS, isMedalPriced, itemsOf, needsDelivery, shopItem } from '../catalogue';
import { SHOP_IMAGES } from '../shopImages';

describe('catalogue', () => {
  it('has unique ids', () => {
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prices every item in exactly one currency', () => {
    for (const item of SHOP_ITEMS) {
      const priced = [item.priceRub, item.pricePoints].filter((p) => p !== undefined);
      expect(priced).toHaveLength(1);
      expect(priced[0]).toBeGreaterThan(0);
    }
  });

  it('pays for rewards with medals and for everything else with money', () => {
    for (const item of SHOP_ITEMS) {
      expect(isMedalPriced(item)).toBe(item.section === 'rewards');
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
  });

  it('grants a frame that actually exists', () => {
    for (const item of SHOP_ITEMS) {
      if (item.grant.kind === 'animatedFrame') expect(ANIMATED_FRAMES[item.grant.frameId]).toBeDefined();
    }
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
});
