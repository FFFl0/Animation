import { levelFromStats, sumTotalCorrect } from '../level';
import { ModeStat } from '../../auth/types';

function stat(totalCorrect: number): ModeStat {
  return { gamesPlayed: 1, bestScore: totalCorrect, totalCorrect, totalQuestions: totalCorrect };
}

describe('sumTotalCorrect', () => {
  it('adds up every category, difficulties and mode rounds alike', () => {
    expect(
      sumTotalCorrect({
        'cat:anime:novice': stat(6),
        'cat:anime:legend': stat(12),
        'cat:characters': stat(10),
      })
    ).toBe(28);
  });

  // A mode round is banked under its category too, so adding up every key
  // would hand out twice the experience for it.
  it('does not pay twice for a round played in a game mode', () => {
    expect(
      sumTotalCorrect({
        'cat:mixed': stat(20),
        'mode:quick': stat(20),
      })
    ).toBe(20);
  });

  it('is nothing for a profile with no rounds', () => {
    expect(sumTotalCorrect({})).toBe(0);
    expect(levelFromStats({}).level).toBe(1);
  });
});
