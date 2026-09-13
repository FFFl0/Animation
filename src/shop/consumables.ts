/** Things that get used up. Bought in the shop, spent inside a quiz. */
export type ConsumableId = 'hint5050' | 'skipQuestion' | 'streakFreeze';

export const CONSUMABLE_IDS: ConsumableId[] = ['hint5050', 'skipQuestion', 'streakFreeze'];

export function isConsumableId(value: unknown): value is ConsumableId {
  return typeof value === 'string' && (CONSUMABLE_IDS as string[]).includes(value);
}
