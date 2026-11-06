import { ShopItem, isStackable, needsDelivery, shopItem } from './catalogue';
import { DIGITAL_RUB_ENABLED } from './payment';

/**
 * Which rail an item's money price runs on.
 *
 * This is the one place the store rules live, and they are not a matter of
 * taste: a digital good sold inside an app from Google Play or the App Store
 * has to go through that store's own billing, and a physical good must not —
 * it needs an ordinary acquirer. So the rail follows the kind of thing being
 * sold, never the screen it is being sold on.
 *
 *   'store'    — Play Billing / StoreKit, for cosmetics and consumables
 *   'acquirer' — ЮKassa, for merch
 */
export type MoneyRail = 'store' | 'acquirer';

export function moneyRail(item: ShopItem): MoneyRail {
  if (needsDelivery(item)) return 'acquirer';
  // The escape hatch for a build that is not distributed through a store
  // with such a rule — a direct APK. There the acquirer may take digital
  // goods too, and the stores' billing is not available anyway.
  return DIGITAL_RUB_ENABLED ? 'acquirer' : 'store';
}

/**
 * What an item is called in Google Play and App Store Connect.
 *
 * Written out rather than derived from the item id, because a store product
 * id is permanent: once it has been sold under one name it can never be
 * renamed or reused, so it must not quietly follow a rename on our side.
 * A test keeps the two lists in step — every digital item has an id here,
 * every id is unique, and every id is one both stores accept.
 *
 * Both stores take the same ids, so there is one list rather than two.
 */
const SKUS: Record<string, string> = {
  'avatar-sakura': 'avatar_sakura',
  'avatar-shadow': 'avatar_shadow',
  'avatar-frost': 'avatar_frost',
  'avatar-ember': 'avatar_ember',
  'avatar-mint': 'avatar_mint',
  'avatar-violet': 'avatar_violet',
  'avatar-sunny': 'avatar_sunny',
  'avatar-neko': 'avatar_neko',
  'frame-aurora': 'frame_aurora',
  'frame-petals': 'frame_petals',
  'frame-ember': 'frame_ember',
  'frame-circuit': 'frame_circuit',
  'frame-champion': 'frame_champion',
  'frame-eternal': 'frame_eternal',
  'item-hint-1': 'item_hint_1',
  'item-hint-5': 'item_hint_5',
  'item-skip-3': 'item_skip_3',
  'item-freeze': 'item_freeze',
};

/** Store product ids may be lowercase letters, digits, dots and underscores. */
export const SKU_PATTERN = /^[a-z0-9][a-z0-9_.]{2,99}$/;

export function skuOf(itemId: string): string | undefined {
  return SKUS[itemId];
}

/** Every product the app asks the store about when the shop opens. */
export const ALL_SKUS: string[] = Object.values(SKUS);

const ITEM_BY_SKU = new Map(Object.entries(SKUS).map(([itemId, sku]) => [sku, itemId]));

export function itemIdOfSku(sku: string): string | undefined {
  return ITEM_BY_SKU.get(sku);
}

/**
 * Consumables are bought again and again, so the store has to be told the
 * purchase was used up; a cosmetic is owned once and must not be.
 *
 * Getting this backwards is the classic in-app purchase bug in both
 * directions: an unconsumed consumable can never be re-bought, and a
 * consumed cosmetic stops being restorable on a new phone.
 */
export function isConsumableSku(sku: string): boolean {
  const itemId = itemIdOfSku(sku);
  const item = itemId ? shopItem(itemId) : undefined;
  return item ? isStackable(item) : false;
}

/** Only for the tests and the console checklist — the catalogue is the source. */
export type SkuEntry = { itemId: string; sku: string; consumable: boolean };

export function skuEntries(): SkuEntry[] {
  return Object.entries(SKUS).map(([itemId, sku]) => ({ itemId, sku, consumable: isConsumableSku(sku) }));
}
