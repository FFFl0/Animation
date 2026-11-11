import { ConsumableId } from './consumables';

/** The picture each item is shown with — the single-item pack's artwork. */
export const CONSUMABLE_ART: Record<ConsumableId, string> = {
  hint5050: 'item-hint-1',
  skipQuestion: 'item-skip-3',
  streakFreeze: 'item-freeze',
};

/** The shop item a "get more" tap opens for each. */
export const CONSUMABLE_SHOP_ITEM: Record<ConsumableId, string> = {
  hint5050: 'item-hint-5',
  skipQuestion: 'item-skip-3',
  streakFreeze: 'item-freeze',
};
