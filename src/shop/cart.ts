import { ApparelSize, ShopItem, isMedalPriced, shopItem } from './catalogue';

export type CartLine = {
  itemId: string;
  quantity: number;
  size?: ApparelSize;
};

/** One row per item-and-size: two sizes of the same tee are two lines. */
function sameLine(a: CartLine, b: { itemId: string; size?: ApparelSize }): boolean {
  return a.itemId === b.itemId && a.size === b.size;
}

export const MAX_PER_LINE = 9;

export function addToCart(lines: CartLine[], itemId: string, size?: ApparelSize): CartLine[] {
  const existing = lines.find((line) => sameLine(line, { itemId, size }));
  if (!existing) return [...lines, { itemId, quantity: 1, size }];
  return lines.map((line) =>
    sameLine(line, { itemId, size }) ? { ...line, quantity: Math.min(MAX_PER_LINE, line.quantity + 1) } : line
  );
}

export function setQuantity(lines: CartLine[], itemId: string, size: ApparelSize | undefined, quantity: number): CartLine[] {
  const clamped = Math.max(0, Math.min(MAX_PER_LINE, Math.floor(quantity)));
  if (clamped === 0) return lines.filter((line) => !sameLine(line, { itemId, size }));
  return lines.map((line) => (sameLine(line, { itemId, size }) ? { ...line, quantity: clamped } : line));
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Resolves the lines, dropping any whose item has left the catalogue. */
export function cartItems(lines: CartLine[]): { line: CartLine; item: ShopItem }[] {
  return lines.flatMap((line) => {
    const item = shopItem(line.itemId);
    return item ? [{ line, item }] : [];
  });
}

export function cartTotalRub(lines: CartLine[]): number {
  return cartItems(lines).reduce((sum, { line, item }) => sum + (item.priceRub ?? 0) * line.quantity, 0);
}

export function cartTotalPoints(lines: CartLine[]): number {
  return cartItems(lines).reduce((sum, { line, item }) => sum + (item.pricePoints ?? 0) * line.quantity, 0);
}

/**
 * A cart never mixes the two currencies: a basket that is part roubles and
 * part medals has no single total to show, let alone charge.
 */
export function cartCurrency(lines: CartLine[]): 'rub' | 'points' | null {
  const items = cartItems(lines);
  if (!items.length) return null;
  return isMedalPriced(items[0].item) ? 'points' : 'rub';
}

export function wouldMixCurrencies(lines: CartLine[], item: ShopItem): boolean {
  const current = cartCurrency(lines);
  if (current === null) return false;
  return current !== (isMedalPriced(item) ? 'points' : 'rub');
}
