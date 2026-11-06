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
