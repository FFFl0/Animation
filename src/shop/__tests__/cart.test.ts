import { MAX_PER_LINE, addToCart, cartCount, cartItems, cartTotalPoints, cartTotalRub, setQuantity } from '../cart';
import { shopItem } from '../catalogue';
import { pointsPrice } from '../economy';

const tee = shopItem('merch-tee')!;
const mug = shopItem('merch-mug')!;
const frame = shopItem('frame-aurora')!;

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
    expect(cartTotalRub(lines)).toBe(tee.priceRub * 2 + mug.priceRub);
  });

  it('prices the same basket both ways, because either is allowed', () => {
    const lines = addToCart(addToCart([], mug.id), frame.id);
    expect(cartTotalRub(lines)).toBe(mug.priceRub + frame.priceRub);
    expect(cartTotalPoints(lines)).toBe(pointsPrice(mug.priceRub) + pointsPrice(frame.priceRub));
  });

  it('ignores a line whose item has left the catalogue', () => {
    const lines = [{ itemId: 'gone-forever', quantity: 3 }];
    expect(cartItems(lines)).toEqual([]);
    expect(cartTotalRub(lines)).toBe(0);
  });
});
