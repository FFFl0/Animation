import {
  MAX_PER_LINE,
  addToCart,
  cartCount,
  cartCurrency,
  cartItems,
  cartTotalPoints,
  cartTotalRub,
  setQuantity,
  wouldMixCurrencies,
} from '../cart';
import { shopItem } from '../catalogue';

const tee = shopItem('merch-tee')!;
const mug = shopItem('merch-mug')!;
const rewardMug = shopItem('reward-mug')!;

describe('addToCart', () => {
  it('adds a line, then counts up the one already there', () => {
    let lines = addToCart([], tee.id, 'M');
    expect(lines).toEqual([{ itemId: tee.id, quantity: 1, size: 'M' }]);
    lines = addToCart(lines, tee.id, 'M');
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it('keeps two sizes of the same thing apart', () => {
    let lines = addToCart([], tee.id, 'M');
    lines = addToCart(lines, tee.id, 'L');
    expect(lines).toHaveLength(2);
    expect(cartCount(lines)).toBe(2);
  });

  it('stops at the per-line cap', () => {
    let lines: ReturnType<typeof addToCart> = [];
    for (let i = 0; i < MAX_PER_LINE + 4; i++) lines = addToCart(lines, mug.id);
    expect(lines[0].quantity).toBe(MAX_PER_LINE);
  });
});

describe('setQuantity', () => {
  it('drops the line at zero and clamps a silly number', () => {
    const lines = addToCart([], mug.id);
    expect(setQuantity(lines, mug.id, undefined, 0)).toEqual([]);
    expect(setQuantity(lines, mug.id, undefined, -3)).toEqual([]);
    expect(setQuantity(lines, mug.id, undefined, 99)[0].quantity).toBe(MAX_PER_LINE);
  });
});

describe('totals', () => {
  it('multiplies each line by its price', () => {
    let lines = addToCart([], tee.id, 'M');
    lines = addToCart(lines, tee.id, 'M');
    lines = addToCart(lines, mug.id);
    expect(cartTotalRub(lines)).toBe(tee.priceRub! * 2 + mug.priceRub!);
    expect(cartTotalPoints(lines)).toBe(0);
  });

  it('totals a medal cart in points', () => {
    const lines = addToCart([], rewardMug.id);
    expect(cartTotalPoints(lines)).toBe(rewardMug.pricePoints);
    expect(cartTotalRub(lines)).toBe(0);
  });

  it('ignores a line whose item has left the catalogue', () => {
    const lines = [{ itemId: 'gone-forever', quantity: 3 }];
    expect(cartItems(lines)).toEqual([]);
    expect(cartTotalRub(lines)).toBe(0);
  });
});

describe('currency', () => {
  it('is nothing for an empty cart', () => {
    expect(cartCurrency([])).toBeNull();
    expect(wouldMixCurrencies([], rewardMug)).toBe(false);
  });

  it('spots a basket that would end up part roubles and part medals', () => {
    const roubles = addToCart([], tee.id, 'M');
    expect(cartCurrency(roubles)).toBe('rub');
    expect(wouldMixCurrencies(roubles, rewardMug)).toBe(true);
    expect(wouldMixCurrencies(roubles, mug)).toBe(false);

    const points = addToCart([], rewardMug.id);
    expect(cartCurrency(points)).toBe('points');
    expect(wouldMixCurrencies(points, tee)).toBe(true);
  });
});
