import { readFileSync } from 'fs';
import { join } from 'path';
import { SHOP_ITEMS, needsDelivery } from '../catalogue';
import { DIGITAL_RUB_ENABLED } from '../payment';

/**
 * The Edge Function keeps its own copy of the prices, because the client
 * must never be the one that says what something costs. A second copy drifts
 * unless something watches it, so this reads the function's source and
 * checks the two agree — adding an item here and forgetting it there fails
 * the build instead of quietly selling it for nothing.
 */
const SOURCE = join(__dirname, '../../../supabase/functions/shop/index.ts');

type ServerPrice = { rub: number; consumable?: string; amount?: number; physical?: boolean };

function serverPrices(): Record<string, ServerPrice> {
  const text = readFileSync(SOURCE, 'utf8');
  const block = text.slice(text.indexOf('// PRICES-BEGIN'), text.indexOf('// PRICES-END'));
  const prices: Record<string, ServerPrice> = {};

  for (const line of block.split('\n')) {
    const match = line.match(/^\s*'([^']+)':\s*\{(.*)\},\s*$/);
    if (!match) continue;
    const [, id, body] = match;
    const entry: ServerPrice = { rub: Number(body.match(/rub:\s*(\d+)/)?.[1]) };
    const consumable = body.match(/consumable:\s*'([^']+)'/)?.[1];
    if (consumable) entry.consumable = consumable;
    const amount = body.match(/amount:\s*(\d+)/)?.[1];
    if (amount) entry.amount = Number(amount);
    if (/physical:\s*true/.test(body)) entry.physical = true;
    prices[id] = entry;
  }
  return prices;
}

describe('catalogue price parity', () => {
  const server = serverPrices();

  it('parses the function source at all', () => {
    expect(Object.keys(server).length).toBeGreaterThan(0);
  });

  it('lists exactly the same items on both sides', () => {
    expect(Object.keys(server).sort()).toEqual(SHOP_ITEMS.map((item) => item.id).sort());
  });

  it('charges the same price on both sides', () => {
    for (const item of SHOP_ITEMS) {
      expect(server[item.id].rub).toBe(item.priceRub);
    }
  });

  it('agrees on what is posted and what is granted on the spot', () => {
    for (const item of SHOP_ITEMS) {
      expect(server[item.id].physical === true).toBe(needsDelivery(item));
    }
  });

  it('grants the same consumable in the same quantity', () => {
    for (const item of SHOP_ITEMS) {
      const expected = item.grant.kind === 'consumable' ? item.grant : null;
      expect(server[item.id].consumable ?? null).toBe(expected ? expected.consumable : null);
      expect(server[item.id].amount ?? null).toBe(expected ? expected.amount : null);
    }
  });
});

describe('digital rouble switch parity', () => {
  it('agrees with the function about whether cosmetics take money', () => {
    const text = readFileSync(SOURCE, 'utf8');
    const onServer = text.match(/const DIGITAL_RUB_ENABLED = (true|false);/)?.[1];
    // The server decides; the app only mirrors it so it does not offer a
    // button the server will refuse.
    expect(onServer).toBeDefined();
    expect(onServer === 'true').toBe(DIGITAL_RUB_ENABLED);
  });
});
