import { SHOP_ITEMS, needsDelivery, isStackable, shopItem } from '../catalogue';
import { ALL_SKUS, SKU_PATTERN, isConsumableSku, itemIdOfSku, moneyRail, skuEntries, skuOf } from '../products';

describe('store products', () => {
  it('gives every digital item a product id and no physical one', () => {
    for (const item of SHOP_ITEMS) {
      if (needsDelivery(item)) {
        // Merch is sold by the acquirer; a product id in a store console
        // would be an invitation to sell a parcel through Play Billing,
        // which is exactly what the stores forbid.
        expect(skuOf(item.id)).toBeUndefined();
      } else {
        expect(skuOf(item.id)).toBeTruthy();
      }
    }
  });

  it('names nothing that is not in the catalogue', () => {
    for (const { itemId } of skuEntries()) {
      expect(shopItem(itemId)).toBeDefined();
    }
  });

  it('keeps product ids unique and acceptable to both stores', () => {
    expect(new Set(ALL_SKUS).size).toBe(ALL_SKUS.length);
    for (const sku of ALL_SKUS) {
      expect(sku).toMatch(SKU_PATTERN);
    }
  });

  it('reads a product id back to its item', () => {
    for (const item of SHOP_ITEMS.filter((candidate) => !needsDelivery(candidate))) {
      expect(itemIdOfSku(skuOf(item.id)!)).toBe(item.id);
    }
    expect(itemIdOfSku('not_a_product')).toBeUndefined();
  });

  it('marks exactly the consumables as consumable', () => {
    // Getting this wrong breaks a purchase in one of two ways: a cosmetic
    // that was consumed stops restoring on a new phone, and a consumable
    // that was not can never be bought a second time.
    for (const item of SHOP_ITEMS.filter((candidate) => !needsDelivery(candidate))) {
      expect(isConsumableSku(skuOf(item.id)!)).toBe(isStackable(item));
    }
    expect(isConsumableSku('not_a_product')).toBe(false);
  });

  it('sends merch to the acquirer and cosmetics to the store till', () => {
    for (const item of SHOP_ITEMS) {
      expect(moneyRail(item)).toBe(needsDelivery(item) ? 'acquirer' : 'store');
    }
  });
});
