import { CATEGORIES } from '../../data/categories';
import { CONSUMABLE_IDS } from '../../shop/consumables';
import {
  ACCURACY_SHARE,
  QUESTS_PER_DAY,
  Quest,
  allDone,
  applyRound,
  dayNumber,
  isDone,
  progressAfter,
  questsForDay,
  rewardForDay,
} from '../quests';

const round = (score: number, total: number, categoryId = 'mixed') =>
  ({ score, total, categoryId } as Parameters<typeof progressAfter>[2]);

describe('the day’s quests', () => {
  it('are the same three for everybody on the same day', () => {
    expect(questsForDay('2026-11-10')).toEqual(questsForDay('2026-11-10'));
    expect(questsForDay('2026-11-10')).toHaveLength(QUESTS_PER_DAY);
  });

  it('change from day to day', () => {
    const days = Array.from({ length: 30 }, (_, i) => JSON.stringify(questsForDay(`2026-11-${String(i + 1).padStart(2, '0')}`)));
    expect(new Set(days).size).toBeGreaterThan(10);
  });

  it('always mix effort, place and skill, and never repeat an id', () => {
    for (let d = 1; d <= 60; d++) {
      const quests = questsForDay(`2027-01-${String((d % 28) + 1).padStart(2, '0')}-${d}`);
      const [effort, where, skill] = quests;
      expect(['rounds', 'correct']).toContain(effort.kind);
      expect(where.kind).toBe('category');
      expect(['accuracy', 'perfect']).toContain(skill.kind);
      expect(new Set(quests.map((q) => q.id)).size).toBe(QUESTS_PER_DAY);
    }
  });

  it('only ever send a player to a category that exists', () => {
    const ids = CATEGORIES.map((category) => category.id);
    for (let d = 1; d <= 28; d++) {
      const where = questsForDay(`2026-12-${String(d).padStart(2, '0')}`)[1];
      if (where.kind === 'category') expect(ids).toContain(where.categoryId);
    }
  });
});

describe('progress', () => {
  it('counts a round as a round whatever the score', () => {
    const quest: Quest = { id: 'rounds', kind: 'rounds', target: 2 };
    expect(progressAfter(quest, 0, round(0, 6))).toBe(1);
    expect(progressAfter(quest, 1, round(6, 6))).toBe(2);
  });

  it('adds up right answers and stops at the target', () => {
    const quest: Quest = { id: 'correct', kind: 'correct', target: 15 };
    expect(progressAfter(quest, 4, round(7, 10))).toBe(11);
    expect(progressAfter(quest, 11, round(10, 10))).toBe(15);
  });

  it('counts a category round only in that category', () => {
    const quest: Quest = { id: 'category', kind: 'category', target: 1, categoryId: 'quotes' };
    expect(progressAfter(quest, 0, round(5, 6, 'anime'))).toBe(0);
    expect(progressAfter(quest, 0, round(0, 6, 'quotes'))).toBe(1);
  });

  it('wants eighty percent, of a round long enough to mean it', () => {
    const quest: Quest = { id: 'accuracy', kind: 'accuracy', target: 1 };
    expect(ACCURACY_SHARE).toBe(0.8);
    expect(progressAfter(quest, 0, round(7, 10))).toBe(0);
    expect(progressAfter(quest, 0, round(8, 10))).toBe(1);
    // Three out of three is a hundred percent of nothing much.
    expect(progressAfter(quest, 0, round(3, 3))).toBe(0);
  });

  it('wants no mistakes at all for a perfect round', () => {
    const quest: Quest = { id: 'perfect', kind: 'perfect', target: 1 };
    expect(progressAfter(quest, 0, round(5, 6))).toBe(0);
    expect(progressAfter(quest, 0, round(6, 6))).toBe(1);
    expect(progressAfter(quest, 0, round(2, 2))).toBe(0);
  });

  it('never goes backwards or past the target', () => {
    const quest: Quest = { id: 'rounds', kind: 'rounds', target: 2 };
    expect(progressAfter(quest, 2, round(6, 6))).toBe(2);
    expect(progressAfter(quest, -5, round(6, 6))).toBe(1);
  });

  it('moves every quest with one round and knows when all are done', () => {
    const quests: Quest[] = [
      { id: 'rounds', kind: 'rounds', target: 1 },
      { id: 'category', kind: 'category', target: 1, categoryId: 'anime' },
      { id: 'perfect', kind: 'perfect', target: 1 },
    ];
    const after = applyRound(quests, {}, round(6, 6, 'anime'));
    expect(after).toEqual({ rounds: 1, category: 1, perfect: 1 });
    expect(allDone(quests, after)).toBe(true);
    expect(allDone(quests, applyRound(quests, {}, round(5, 6, 'anime')))).toBe(false);
    expect(isDone(quests[0], {})).toBe(false);
  });
});

describe('the reward', () => {
  it('is always something that exists, and takes turns', () => {
    const week = Array.from({ length: 6 }, (_, i) => rewardForDay(`2026-11-${String(10 + i).padStart(2, '0')}`));
    for (const reward of week) expect(CONSUMABLE_IDS).toContain(reward);
    expect(new Set(week).size).toBe(CONSUMABLE_IDS.length);
    expect(week[0]).toBe(week[3]);
  });

  it('counts days the way the server does', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('2026-11-10') - dayNumber('2026-11-09')).toBe(1);
  });
});
