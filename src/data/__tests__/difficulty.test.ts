import { isTierUnlocked, getTier } from '../difficulty';

describe('difficulty tier unlocking', () => {
  it('novice and fan are always unlocked', () => {
    expect(isTierUnlocked('novice', {})).toBe(true);
    expect(isTierUnlocked('fan', {})).toBe(true);
  });

  it('otaku has no prerequisite either', () => {
    expect(isTierUnlocked('otaku', {})).toBe(true);
  });

  it('expert requires clearing 60% of otaku', () => {
    const threshold = Math.ceil(getTier('otaku').questionsPerRound * 0.6);
    expect(isTierUnlocked('expert', { otaku: threshold - 1 })).toBe(false);
    expect(isTierUnlocked('expert', { otaku: threshold })).toBe(true);
  });

  it('legend requires clearing 60% of expert', () => {
    const threshold = Math.ceil(getTier('expert').questionsPerRound * 0.6);
    expect(isTierUnlocked('legend', { expert: threshold - 1 })).toBe(false);
    expect(isTierUnlocked('legend', { expert: threshold })).toBe(true);
  });

  it('missing prerequisite score defaults to zero (locked)', () => {
    expect(isTierUnlocked('expert', {})).toBe(false);
  });
});
