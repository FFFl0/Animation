import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The database is not reachable from a test run, so what is checked here is
 * the contract between the two files that have to agree about it: the Edge
 * Function calls a stored function by name with a fixed set of arguments,
 * and schema.sql is what declares it.
 *
 * A mismatch is invisible until somebody pays real money and gets nothing,
 * which is exactly the moment not to find out.
 */
const SCHEMA = readFileSync(join(__dirname, '../../../supabase/schema.sql'), 'utf8');
const FUNCTION = readFileSync(join(__dirname, '../../../supabase/functions/shop/index.ts'), 'utf8');

describe('store purchase schema', () => {
  it('lets a purchase be paid for by the store', () => {
    // The last definition wins: the table was created before 'store'
    // existed, so an ALTER further down the file is what has to carry it.
    const checks = [...SCHEMA.matchAll(/shop_purchases_paid_with_check check \(paid_with in \(([^)]+)\)\)/g)];
    expect(checks.length).toBeGreaterThan(0);
    expect(checks[checks.length - 1][1]).toContain("'store'");
  });

  it('keys the ledger on the store token, uniquely', () => {
    expect(SCHEMA).toContain('create table if not exists public.shop_store_purchases');
    // Without `unique` the whole design falls apart: the app re-sends a
    // receipt on every visit on purpose, and the item would be granted
    // again each time.
    expect(SCHEMA).toMatch(/purchase_key text not null unique/);
  });

  it('keeps the ledger behind row level security', () => {
    const table = SCHEMA.slice(SCHEMA.indexOf('public.shop_store_purchases'));
    expect(table).toContain('alter table public.shop_store_purchases enable row level security');
    expect(table).toMatch(/create policy "See your own store purchases"/);
  });

  it('declares the stored function the shop function calls', () => {
    expect(FUNCTION).toContain("admin.rpc('shop_claim_store_purchase'");
    expect(SCHEMA).toContain('create or replace function public.shop_claim_store_purchase');
  });

  it('declares every argument the shop function passes, and no other', () => {
    const declaration = SCHEMA.slice(
      SCHEMA.indexOf('create or replace function public.shop_claim_store_purchase')
    );
    const signature = declaration.slice(declaration.indexOf('('), declaration.indexOf(')'));
    const declared = [...signature.matchAll(/(p_[a-z_]+)\s+\w+/g)].map((match) => match[1]);

    const call = FUNCTION.slice(FUNCTION.indexOf("admin.rpc('shop_claim_store_purchase'"));
    const passed = [...call.slice(0, call.indexOf('});')).matchAll(/(p_[a-z_]+):/g)].map((match) => match[1]);

    expect(passed.length).toBeGreaterThan(0);
    expect(declared.sort()).toEqual(passed.sort());
  });

  it('takes the money away from nobody: a claim spends no points', () => {
    const body = SCHEMA.slice(
      SCHEMA.indexOf('create or replace function public.shop_claim_store_purchase')
    );
    const grant = body.slice(body.indexOf('insert into public.shop_purchases'), body.indexOf("return 'granted'"));
    expect(grant).toContain("'store'");
    // Paid for with money, so the medal balance must not move.
    expect(grant).toMatch(/values \(p_user, p_item, 'store', 0, 0\)/);
  });
});

/**
 * The acquirer cannot sell a cosmetic, and the code has to refuse rather
 * than improvise.
 *
 * `DIGITAL_RUB_ENABLED` reads like a switch that turns on card payment for
 * cosmetics. It is not: nothing on the straight-buy path creates a payment,
 * because a digital item has no order and so never reaches ЮKassa. If the
 * buy went through on that path it would grant the item and charge nobody.
 *
 * This is here because the switch is exactly what somebody reaches for when
 * shipping to a store with laxer rules than Google's (see BUILD.md →
 * RuStore), and the cost of getting it wrong is every cosmetic, for free.
 */
describe('a cosmetic is never granted for money that was not taken', () => {
  const buyBranch = FUNCTION.slice(
    FUNCTION.indexOf("if (payload.action === 'buy')"),
    FUNCTION.indexOf("if (payload.action === 'order')")
  );

  it('finds the branch at all', () => {
    expect(buyBranch).toContain("admin.rpc('shop_buy'");
  });

  it('refuses roubles before it can grant anything', () => {
    const refusal = buyBranch.indexOf("currency === 'rub'");
    const grant = buyBranch.indexOf("admin.rpc('shop_buy'");
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(grant);
    // And the refusal must be a return, not a condition that falls through.
    const guard = buyBranch.slice(refusal, grant);
    expect(guard).toMatch(/return json\(\{ error: DIGITAL_RUB_ENABLED \? 'digitalRubNotBuilt' : 'digitalRubDisabled' \}/);
  });

  it('never creates a payment on this path, which is why it must refuse', () => {
    // If somebody adds one, this test should be rewritten rather than
    // deleted — the refusal can go only once the money is really taken.
    expect(buyBranch).not.toContain('createPayment');
  });
});
