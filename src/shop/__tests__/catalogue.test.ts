import { ANIMATED_AVATARS } from '../animatedAvatars';
import { ANIMATED_FRAMES } from '../animatedFrames';
import { POPULAR_ITEMS, SHOP_ITEMS, SHOP_SECTIONS, isStackable, itemsOf, needsDelivery, shopItem } from '../catalogue';
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
});
