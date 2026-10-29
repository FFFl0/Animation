import {
  BATTLE_CAP,
  BATTLE_POINTS,
  EMPTY_VICTORIES,
  TOURNAMENT_POINTS,
  applyBattleWin,
  applyTournamentRun,
  battlePoints,
  tournamentPoints,
  victoryPoints,
} from '../victories';

describe('tournamentPoints', () => {
  it('pays the podium by its place', () => {
    expect(tournamentPoints({ ...EMPTY_VICTORIES, runs: 1, gold: 1 })).toBe(TOURNAMENT_POINTS.gold);
    expect(tournamentPoints({ ...EMPTY_VICTORIES, runs: 1, silver: 1 })).toBe(TOURNAMENT_POINTS.silver);
    expect(tournamentPoints({ ...EMPTY_VICTORIES, runs: 1, bronze: 1 })).toBe(TOURNAMENT_POINTS.bronze);
  });

  // Sixteen players, three medals: the rest still played a tournament out.
  it('pays something for a run that ended off the podium', () => {
    expect(tournamentPoints({ ...EMPTY_VICTORIES, runs: 3, gold: 1 })).toBe(
      TOURNAMENT_POINTS.gold + 2 * TOURNAMENT_POINTS.played
    );
  });

  it('is nothing before a tournament has been finished', () => {
    expect(tournamentPoints(EMPTY_VICTORIES)).toBe(0);
  });
});

describe('battlePoints', () => {
  it('pays each win', () => {
    expect(battlePoints({ ...EMPTY_VICTORIES, battles: 4 })).toBe(4 * BATTLE_POINTS);
  });

  // A battle is played against whoever you like as often as you like, so
  // this is the one half of the rating that has to stop somewhere.
  it('stops at the ceiling however many are won', () => {
    expect(battlePoints({ ...EMPTY_VICTORIES, battles: 1000 })).toBe(BATTLE_CAP);
  });

  // The tournament runs once a week, so it is bounded by the calendar and
  // needs no ceiling of its own.
  it('does not cap the tournament along with it', () => {
    const many = { ...EMPTY_VICTORIES, runs: 40, gold: 40, battles: 1000 };
    expect(victoryPoints(many)).toBe(40 * TOURNAMENT_POINTS.gold + BATTLE_CAP);
  });
});

describe('applyTournamentRun', () => {
  it('banks a finished run by its place', () => {
    const after = applyTournamentRun(EMPTY_VICTORIES, 1, 'week-1');
    expect(after).toMatchObject({ runs: 1, gold: 1, lastRunId: 'week-1' });
  });

  // The finished bracket is re-read every few seconds.
  it('ignores a run it has already banked', () => {
    const once = applyTournamentRun(EMPTY_VICTORIES, 2, 'week-1');
    expect(applyTournamentRun(once, 2, 'week-1')).toBe(once);
  });

  it('banks the next week on top', () => {
    const first = applyTournamentRun(EMPTY_VICTORIES, 1, 'week-1');
    const second = applyTournamentRun(first, 5, 'week-2');
    expect(second).toMatchObject({ runs: 2, gold: 1, silver: 0, bronze: 0 });
    expect(tournamentPoints(second)).toBe(TOURNAMENT_POINTS.gold + TOURNAMENT_POINTS.played);
  });
});

describe('applyBattleWin', () => {
  it('counts the win', () => {
    expect(applyBattleWin(applyBattleWin(EMPTY_VICTORIES)).battles).toBe(2);
  });

  it('leaves the tournament record alone', () => {
    const won = applyTournamentRun(EMPTY_VICTORIES, 1, 'week-1');
    expect(applyBattleWin(won)).toMatchObject({ gold: 1, lastRunId: 'week-1', battles: 1 });
  });
});
