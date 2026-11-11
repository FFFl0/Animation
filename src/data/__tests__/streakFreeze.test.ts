import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import { CONSUMABLE_IDS } from '../../shop/consumables';
import { SHOP_IMAGES } from '../../shop/shopImages';
import { shopItem } from '../../shop/catalogue';
import { CONSUMABLE_ART, CONSUMABLE_SHOP_ITEM } from '../../shop/consumableLinks';
import { daysBetween, missedDays, streakOutlook } from '../streakFreeze';

const TODAY = '2026-11-11';

describe('counting missed days', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-11-10', TODAY)).toBe(1);
    expect(daysBetween('2026-10-31', TODAY)).toBe(11);
    // across a month and a year
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('misses nothing when the last round was today or yesterday', () => {
    expect(missedDays({ count: 3, lastPlayedDate: TODAY }, TODAY)).toBe(0);
    expect(missedDays({ count: 3, lastPlayedDate: '2026-11-10' }, TODAY)).toBe(0);
    expect(missedDays({ count: 3, lastPlayedDate: '2026-11-09' }, TODAY)).toBe(1);
    expect(missedDays({ count: 0, lastPlayedDate: null }, TODAY)).toBe(0);
  });
});

describe('what the home screen warns about', () => {
  it('has nothing to say before there is a streak', () => {
    expect(streakOutlook({ count: 0, lastPlayedDate: null }, 2, TODAY)).toEqual({ kind: 'none' });
  });

  it('calls a streak safe until a day is missed', () => {
    expect(streakOutlook({ count: 5, lastPlayedDate: '2026-11-10' }, 0, TODAY)).toEqual({ kind: 'safe' });
  });

  it('says the freezes will cover a gap they can cover, and not one they cannot', () => {
    const twoMissed = { count: 5, lastPlayedDate: '2026-11-08' };
    expect(streakOutlook(twoMissed, 2, TODAY)).toEqual({ kind: 'rescuable', missed: 2 });
    expect(streakOutlook(twoMissed, 1, TODAY)).toEqual({ kind: 'broken', missed: 2 });
  });
});

describe('every item can be found, seen and explained', () => {
  it('has a picture and a shop page for each', () => {
    for (const id of CONSUMABLE_IDS) {
      expect(SHOP_IMAGES[CONSUMABLE_ART[id]]).toBeDefined();
      const item = shopItem(CONSUMABLE_SHOP_ITEM[id]);
      expect(item?.grant).toMatchObject({ kind: 'consumable', consumable: id });
    }
  });

  it.each(['ru', 'en'] as const)('says how each is used in %s', (lang) => {
    const t = getT(lang);
    for (const id of CONSUMABLE_IDS) {
      expect(t(`items.how.${id}`)).not.toContain('items.how');
      expect(t(`shop.consumable.${id}`)).not.toContain('shop.consumable');
    }
    expect(t('items.freezeUsed', 1)).not.toBe(t('items.freezeUsed', 2));
  });
});

describe('the quiz', () => {
  const QUIZ = readFileSync(join(__dirname, '../../screens/QuizScreen.tsx'), 'utf8');

  it('shows both item buttons whenever items are allowed, not only when some are owned', () => {
    // The old rule hid them at zero, which is how players never found out
    // the items existed.
    expect(QUIZ).not.toMatch(/hints \+ skips > 0/);
    expect(QUIZ).toContain('testID="quiz-item-hint"');
    expect(QUIZ).toContain('testID="quiz-item-skip"');
  });
});

describe('a round spends the freezes it used', () => {
  const APP = readFileSync(join(__dirname, '../../../App.tsx'), 'utf8');

  it('offers every freeze owned and spends exactly what the streak used, at both places a round ends', () => {
    expect(APP.match(/countOf\('streakFreeze'\)\n/g)?.length).toBe(2);
    expect(APP.match(/spendConsumable\('streakFreeze', freezesUsed\)/g)?.length).toBe(2);
    expect(APP.match(/setFreezeNotice\(freezesUsed\)/g)?.length).toBe(2);
  });
});
