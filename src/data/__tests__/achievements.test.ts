import { ACHIEVEMENTS, isUnlocked, progressOf, unlockedCount } from '../achievements';
import { Profile } from '../../auth/types';
import { categoryStatsKey, modeStatsKey } from '../../quiz/statsKey';

function emptyProfile(): Profile {
  return {
    id: 'p1',
    username: 'tester',
    createdAt: new Date().toISOString(),
    avatar: { hairStyle: 'bob', hairColor: '#000', eyeColor: '#000', skinTone: '#fff', accent: '#fff' },
    favoriteCharacterId: null,
    stats: {},
    streak: { count: 0, lastPlayedDate: null },
    achievements: [],
    achievementDates: {},
    dailyChallenge: null,
  };
}

function findAchievement(id: string) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) throw new Error(`missing achievement ${id}`);
  return a;
}

describe('achievements', () => {
  it('first-steps stays locked with zero games and unlocks after one', () => {
    const a = findAchievement('first-steps');
    const p = emptyProfile();
    expect(isUnlocked(a, p)).toBe(false);
    p.stats[categoryStatsKey('mixed')] = { gamesPlayed: 1, bestScore: 5, totalCorrect: 5, totalQuestions: 10 };
    expect(isUnlocked(a, p)).toBe(true);
  });

  // A mode round is banked under its category as well, so adding up every
  // key would pay for it twice and unlock this at fifty real answers.
  it('does not count a mode round twice towards a hundred answers', () => {
    const a = findAchievement('hundred-correct');
    const p = emptyProfile();
    p.stats[categoryStatsKey('mixed')] = { gamesPlayed: 10, bestScore: 10, bestOutOf: 10, totalCorrect: 60, totalQuestions: 100 };
    p.stats[modeStatsKey('quick')] = { gamesPlayed: 10, bestScore: 10, bestOutOf: 10, totalCorrect: 60, totalQuestions: 100 };
    expect(progressOf(a, p)).toBe(60);
    expect(isUnlocked(a, p)).toBe(false);
  });

  // The same round, from the other side: it belongs to the category it was
  // about, difficulty or no difficulty.
  it('counts a mode round towards its own category', () => {
    const a = findAchievement('character-expert');
    const p = emptyProfile();
    p.stats[categoryStatsKey('characters')] = { gamesPlayed: 4, bestScore: 14, bestOutOf: 15, totalCorrect: 50, totalQuestions: 60 };
    p.stats[modeStatsKey('silhouette')] = { gamesPlayed: 4, bestScore: 14, bestOutOf: 15, totalCorrect: 50, totalQuestions: 60 };
    expect(progressOf(a, p)).toBe(50);
    expect(isUnlocked(a, p)).toBe(true);
  });

  it('character-expert requires 50 total correct answers across character tiers', () => {
    const a = findAchievement('character-expert');
    const p = emptyProfile();
    p.stats[categoryStatsKey('characters', 'novice')] = { gamesPlayed: 3, bestScore: 18, totalCorrect: 49, totalQuestions: 60 };
    expect(isUnlocked(a, p)).toBe(false);
    expect(progressOf(a, p)).toBe(49);
    p.stats[categoryStatsKey('characters', 'fan')] = { gamesPlayed: 1, bestScore: 1, totalCorrect: 1, totalQuestions: 20 };
    expect(isUnlocked(a, p)).toBe(true);
  });

  it('week-streak and month-streak key off profile.streak.count', () => {
    const week = findAchievement('week-streak');
    const month = findAchievement('month-streak');
    const p = emptyProfile();
    p.streak.count = 6;
    expect(isUnlocked(week, p)).toBe(false);
    p.streak.count = 7;
    expect(isUnlocked(week, p)).toBe(true);
    expect(isUnlocked(month, p)).toBe(false);
    p.streak.count = 30;
    expect(isUnlocked(month, p)).toBe(true);
  });

  it('perfect-ten unlocks only once the perfect10 mode best score hits 10', () => {
    const a = findAchievement('perfect-ten');
    const p = emptyProfile();
    p.stats[modeStatsKey('perfect10')] = { gamesPlayed: 2, bestScore: 9, totalCorrect: 17, totalQuestions: 20 };
    expect(isUnlocked(a, p)).toBe(false);
    p.stats[modeStatsKey('perfect10')].bestScore = 10;
    expect(isUnlocked(a, p)).toBe(true);
  });

  it('progress never reads below zero or past the target', () => {
    const a = findAchievement('marathon');
    const p = emptyProfile();
    expect(progressOf(a, p)).toBe(0);
    p.stats[categoryStatsKey('mixed')] = { gamesPlayed: 400, bestScore: 5, totalCorrect: 5, totalQuestions: 10 };
    expect(progressOf(a, p)).toBe(a.target);
  });

  it('every achievement has a positive target and starts locked', () => {
    const p = emptyProfile();
    for (const a of ACHIEVEMENTS) {
      expect(a.target).toBeGreaterThan(0);
      expect(isUnlocked(a, p)).toBe(false);
    }
    expect(unlockedCount(p)).toBe(0);
  });

  it('the completionist counts every other achievement', () => {
    const a = findAchievement('secret-completionist');
    expect(a.secret).toBe(true);
    expect(a.target).toBe(ACHIEVEMENTS.length - 1);

    const p = emptyProfile();
    p.stats[categoryStatsKey('mixed')] = { gamesPlayed: 1, bestScore: 5, totalCorrect: 5, totalQuestions: 10 };
    // One unlock ("first steps") is one step towards the completionist.
    expect(progressOf(a, p)).toBe(1);
  });

  it('secret-tier-master takes the best category, not the sum of all of them', () => {
    const a = findAchievement('secret-tier-master');
    const p = emptyProfile();
    expect(progressOf(a, p)).toBe(0);
    p.stats[categoryStatsKey('anime', 'novice')] = { gamesPlayed: 1, bestScore: 20, totalCorrect: 20, totalQuestions: 20 };
    p.stats[categoryStatsKey('quotes', 'fan')] = { gamesPlayed: 1, bestScore: 20, totalCorrect: 20, totalQuestions: 20 };
    expect(progressOf(a, p)).toBe(1);
  });

  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
