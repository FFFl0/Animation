import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import { EMPTY_RECORD, addOutcome, battlesPlayed, loadBattleRecord, outcomeOf, saveBattleOutcome } from '../battleRecord';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      },
    },
  };
});

describe('who won a battle', () => {
  it('goes to more right answers, and an equal score is a draw', () => {
    expect(outcomeOf(7, 5)).toBe('win');
    expect(outcomeOf(5, 7)).toBe('loss');
    expect(outcomeOf(6, 6)).toBe('draw');
  });

  it('agrees with what the result screen announces', () => {
    // The screen decides win/lose/draw on its own; the record must match it.
    const screen = readFileSync(join(__dirname, '../../screens/BattleScreen.tsx'), 'utf8');
    expect(screen).toContain('localResult.score > opponentFinish.score');
    expect(screen).toContain("outcomeOf(localResult.score, opponentFinish.score)");
  });
});

describe('the record', () => {
  it('adds each outcome to its own column', () => {
    const record = ['win', 'win', 'loss', 'draw'].reduce(
      (r, o) => addOutcome(r, o as 'win' | 'loss' | 'draw'),
      EMPTY_RECORD
    );
    expect(record).toEqual({ wins: 2, losses: 1, draws: 1 });
    expect(battlesPlayed(record)).toBe(4);
  });

  it('is kept per account on the device', async () => {
    await saveBattleOutcome('a', 'win');
    await saveBattleOutcome('a', 'loss');
    await saveBattleOutcome('b', 'draw');
    expect(await loadBattleRecord('a')).toEqual({ wins: 1, losses: 1, draws: 0 });
    expect(await loadBattleRecord('b')).toEqual({ wins: 0, losses: 0, draws: 1 });
    expect(await loadBattleRecord('nobody')).toEqual(EMPTY_RECORD);
  });

  it('counts a battle once, and not one the rival left before finishing', () => {
    const screen = readFileSync(join(__dirname, '../../screens/BattleScreen.tsx'), 'utf8');
    expect(screen).toContain('if (!profile || !localResult || !opponentFinish || recorded.current) return;');
    expect(screen).toMatch(/setLocalResult\(null\);\n\s+recorded\.current = false;/);
  });
});

describe('the battle page', () => {
  it.each(['ru', 'en'] as const)('has all its words in %s', (lang) => {
    const t = getT(lang);
    for (const key of ['ruleDuel', 'ruleNoItems', 'ruleLive', 'howTitle', 'step1', 'step2', 'step3', 'kindsTitle', 'recordTitle', 'wins', 'losses', 'draws', 'recordEmpty']) {
      expect(t(`battle.${key}`)).not.toBe(`battle.${key}`);
    }
    expect(getT('ru')('battle.ruleQuestions', 10)).toBe('10 вопросов');
  });
});
