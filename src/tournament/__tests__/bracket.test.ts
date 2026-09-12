import {
  Bracket,
  MATCH_QUESTIONS,
  TOURNAMENT_ROUNDS,
  TOURNAMENT_SIZE,
  createBracket,
  isMyTournamentOver,
  matchesInRound,
  myMatch,
  mySeat,
  opponentSeat,
  resolveRound,
  rollBotScore,
} from '../bracket';
import { buildSeats } from '../bots';

const makeBracket = (seed = 42): Bracket => createBracket(buildSeats('Me', [], seed), seed);

describe('buildSeats', () => {
  it('fills all 32 seats with exactly one human', () => {
    const seats = buildSeats('Me', [], 1);
    expect(seats).toHaveLength(TOURNAMENT_SIZE);
    expect(seats.filter((s) => s.kind === 'me')).toHaveLength(1);
    expect(seats.every((s, i) => s.seat === i)).toBe(true);
  });

  it('seats other live players before falling back to bots', () => {
    const seats = buildSeats('Me', [{ name: 'Aiko' }, { name: 'Ren' }], 7);
    expect(seats.filter((s) => s.kind === 'player').map((s) => s.name).sort()).toEqual(['Aiko', 'Ren']);
    expect(seats.filter((s) => s.kind === 'bot')).toHaveLength(TOURNAMENT_SIZE - 3);
  });

  it('is deterministic for a given seed', () => {
    expect(buildSeats('Me', [], 99)).toEqual(buildSeats('Me', [], 99));
  });
});

describe('createBracket', () => {
  it('lays out every round', () => {
    const bracket = makeBracket();
    expect(bracket.matches).toHaveLength(16 + 8 + 4 + 2 + 1);
    for (let round = 0; round < TOURNAMENT_ROUNDS; round++) {
      expect(bracket.matches.filter((m) => m.round === round)).toHaveLength(matchesInRound(round));
    }
  });

  it('pairs neighbouring seats in the first round and leaves later ones open', () => {
    const bracket = makeBracket();
    const first = bracket.matches.filter((m) => m.round === 0);
    expect(first.map((m) => [m.seatA, m.seatB])).toEqual(
      Array.from({ length: 16 }, (_, i) => [i * 2, i * 2 + 1])
    );
    expect(bracket.matches.filter((m) => m.round === 1).every((m) => m.seatA === null)).toBe(true);
  });

  it('refuses a bracket that is not full', () => {
    expect(() => createBracket(buildSeats('Me', [], 1).slice(0, 30), 1)).toThrow();
  });
});

describe('resolveRound', () => {
  it('produces one winner per match and carries them into the next round', () => {
    const next = resolveRound(makeBracket(), MATCH_QUESTIONS);
    const played = next.matches.filter((m) => m.round === 0);
    expect(played.every((m) => m.winner === m.seatA || m.winner === m.seatB)).toBe(true);

    const second = next.matches.filter((m) => m.round === 1);
    expect(second.every((m) => m.seatA !== null && m.seatB !== null)).toBe(true);
    expect(second[0].seatA).toBe(played[0].winner);
    expect(second[0].seatB).toBe(played[1].winner);
  });

  it('advances the player on a perfect score and marks them out on a blank one', () => {
    const won = resolveRound(makeBracket(), MATCH_QUESTIONS);
    expect(won.myExitRound).toBeNull();
    expect(isMyTournamentOver(won)).toBe(false);

    const lost = resolveRound(makeBracket(), 0);
    expect(lost.myExitRound).toBe(0);
    expect(isMyTournamentOver(lost)).toBe(true);
  });

  it('gives a drawn match to the player', () => {
    // Zero-skill bots with a zero score make the draw certain.
    const base = makeBracket(5);
    const bracket = { ...base, seats: base.seats.map((s) => (s.kind === 'bot' ? { ...s, skill: 0 } : s)) };
    const me = mySeat(bracket);

    const resolved = resolveRound(bracket, 0);
    const mine = resolved.matches.find((m) => m.round === 0 && (m.seatA === me || m.seatB === me))!;
    if (mine.scoreA === mine.scoreB) {
      expect(mine.winner).toBe(me);
      expect(resolved.myExitRound).toBeNull();
    }
  });

  it('runs to a single champion over five rounds', () => {
    let bracket = makeBracket(11);
    for (let round = 0; round < TOURNAMENT_ROUNDS; round++) {
      expect(bracket.round).toBe(round);
      bracket = resolveRound(bracket, MATCH_QUESTIONS);
    }
    expect(bracket.round).toBe(TOURNAMENT_ROUNDS);
    expect(bracket.championSeat).toBe(mySeat(bracket));
    expect(myMatch(bracket)).toBeNull();
    expect(resolveRound(bracket, 0)).toBe(bracket);
  });

  it('crowns somebody even when the player goes out first', () => {
    let bracket = resolveRound(makeBracket(3), 0);
    while (bracket.round < TOURNAMENT_ROUNDS) bracket = resolveRound(bracket, null);
    expect(bracket.championSeat).not.toBeNull();
    expect(bracket.championSeat).not.toBe(mySeat(bracket));
  });

  it('keeps the opponent lookup consistent with the match', () => {
    const bracket = makeBracket(21);
    const me = mySeat(bracket);
    const match = myMatch(bracket)!;
    const other = opponentSeat(match, me)!;
    expect(other).not.toBe(me);
    expect([match.seatA, match.seatB].sort()).toEqual([me, other].sort());
  });
});

describe('rollBotScore', () => {
  it('stays within the question count', () => {
    for (const skill of [0, 0.5, 1]) {
      const score = rollBotScore(skill, MATCH_QUESTIONS, () => 0.5);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(MATCH_QUESTIONS);
    }
  });

  it('scales with skill', () => {
    expect(rollBotScore(1, MATCH_QUESTIONS, () => 0.8)).toBeGreaterThan(rollBotScore(0, MATCH_QUESTIONS, () => 0.8));
  });
});
