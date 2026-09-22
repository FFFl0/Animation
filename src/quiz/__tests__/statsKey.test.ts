import { categoryStatsKey, modeStatsKey, getStat } from '../statsKey';
import { Profile } from '../../auth/types';

describe('statsKey helpers', () => {
  it('builds category keys with and without a tier', () => {
    expect(categoryStatsKey('characters', 'novice')).toBe('cat:characters:novice');
    expect(categoryStatsKey('mixed')).toBe('cat:mixed');
  });

  it('builds mode keys', () => {
    expect(modeStatsKey('quick')).toBe('mode:quick');
  });

  it('getStat returns a zeroed stat when the key is missing', () => {
    const profile = { stats: {} } as Profile;
    expect(getStat(profile, 'cat:anime:novice')).toEqual({
      gamesPlayed: 0,
      bestScore: 0,
      totalCorrect: 0,
      totalQuestions: 0,
    });
  });

  it('getStat returns the stored stat when present', () => {
    const stat = { gamesPlayed: 2, bestScore: 15, totalCorrect: 25, totalQuestions: 40 };
    const profile = { stats: { 'cat:anime:novice': stat } } as unknown as Profile;
    expect(getStat(profile, 'cat:anime:novice')).toBe(stat);
  });
});
