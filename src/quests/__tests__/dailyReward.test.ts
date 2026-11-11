import { readFileSync } from 'fs';
import { join } from 'path';
import { CONSUMABLE_IDS } from '../../shop/consumables';
import { getT } from '../../i18n/strings';

/**
 * The reward for the day's quests is the one part of them the server
 * keeps, and the only thing it can enforce is how big it is: one item a
 * day, chosen by the date. These hold the app and the server to the same
 * rotation and the server to its own limit.
 */
const FUNCTION = readFileSync(join(__dirname, '../../../supabase/functions/shop/index.ts'), 'utf8');
const SCHEMA = readFileSync(join(__dirname, '../../../supabase/schema.sql'), 'utf8');

const daily = FUNCTION.slice(FUNCTION.indexOf("if (payload.action === 'daily')"), FUNCTION.indexOf("if (payload.action === 'spend')"));

describe('the daily reward', () => {
  it('rotates through the same items in the same order on both sides', () => {
    const block = FUNCTION.slice(FUNCTION.indexOf('// DAILY-BEGIN'), FUNCTION.indexOf('// DAILY-END'));
    const onServer = [...block.matchAll(/'(\w+)'/g)].map((m) => m[1]);
    // Order matters as much as membership: the app shows what today's
    // reward is, and the server decides what it actually hands over.
    expect(onServer).toEqual(CONSUMABLE_IDS);
    expect(daily).toContain('DAILY_REWARDS[dayNo % DAILY_REWARDS.length]');
  });

  it('is chosen by the server from the date, never taken from the request', () => {
    expect(daily).not.toMatch(/payload\.consumable/);
  });

  it('only accepts a day next to the server’s own', () => {
    // Without this the calendar could be walked backwards to collect a
    // year of rewards in an afternoon.
    expect(daily).toContain('Math.abs(dayNo - todayNo) > 1');
    expect(daily.indexOf('Math.abs(dayNo - todayNo) > 1')).toBeLessThan(daily.indexOf("admin.rpc('shop_claim_daily'"));
  });

  it('is handed out once per player per day by the table itself', () => {
    const table = SCHEMA.slice(SCHEMA.indexOf('create table if not exists public.daily_rewards'));
    expect(table).toContain('primary key (user_id, day)');
    expect(table).toContain('alter table public.daily_rewards enable row level security');
    expect(SCHEMA).not.toMatch(/on public\.daily_rewards\s+for/);

    const fn = SCHEMA.slice(SCHEMA.indexOf('create or replace function public.shop_claim_daily'));
    expect(fn).toMatch(/on conflict \(user_id, day\) do nothing;\s+if not found then\s+return false;/);
  });

  it('calls the stored function with the arguments it declares', () => {
    const signature = SCHEMA.slice(
      SCHEMA.indexOf('create or replace function public.shop_claim_daily('),
      SCHEMA.indexOf('returns boolean', SCHEMA.indexOf('create or replace function public.shop_claim_daily('))
    );
    const declared = [...signature.matchAll(/(p_[a-z]+)\s+\w+/g)].map((m) => m[1]);
    const passed = [...daily.slice(daily.indexOf("admin.rpc('shop_claim_daily'")).split('});')[0].matchAll(/(p_[a-z]+):/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(passed.sort());
  });

  it.each(['ru', 'en'] as const)('has words for every quest in %s', (language) => {
    const t = getT(language);
    for (const key of ['title', 'hint', 'accuracy', 'perfect', 'claim', 'claimed', 'failed']) {
      expect(t(`quests.${key}`)).not.toContain('quests.');
    }
    expect(t('quests.rounds', 3)).toContain('3');
    expect(t('quests.correct', 20)).toContain('20');
    expect(t('quests.category', 'X')).toContain('X');
    for (const id of CONSUMABLE_IDS) expect(t('quests.reward', t(`shop.consumable.${id}`))).not.toContain('shop.');
  });
});
