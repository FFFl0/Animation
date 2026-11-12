import AsyncStorage from '@react-native-async-storage/async-storage';

/** How a finished battle went for this player. */
export type BattleOutcome = 'win' | 'loss' | 'draw';

export type BattleRecord = { wins: number; losses: number; draws: number };

export const EMPTY_RECORD: BattleRecord = { wins: 0, losses: 0, draws: 0 };

/** More right answers wins; the same number is a draw — the rule the result screen shows. */
export function outcomeOf(mine: number, theirs: number): BattleOutcome {
  return mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw';
}

export function addOutcome(record: BattleRecord, outcome: BattleOutcome): BattleRecord {
  return {
    wins: record.wins + (outcome === 'win' ? 1 : 0),
    losses: record.losses + (outcome === 'loss' ? 1 : 0),
    draws: record.draws + (outcome === 'draw' ? 1 : 0),
  };
}

export function battlesPlayed(record: BattleRecord): number {
  return record.wins + record.losses + record.draws;
}

/**
 * Kept on the device, per account.
 *
 * A battle is played against whoever you like, as often as you like, so
 * its record is for the player's own interest and earns nothing — the
 * tournament is where results count. That is why it needs no server, and
 * why nothing is lost if it is.
 */
const KEY = 'animequiz.battleRecord';

async function readStore(): Promise<Record<string, BattleRecord>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, BattleRecord>) : {};
  } catch {
    return {};
  }
}

export async function loadBattleRecord(userId: string): Promise<BattleRecord> {
  return { ...EMPTY_RECORD, ...(await readStore())[userId] };
}

export async function saveBattleOutcome(userId: string, outcome: BattleOutcome): Promise<BattleRecord> {
  const store = await readStore();
  const next = addOutcome({ ...EMPTY_RECORD, ...store[userId] }, outcome);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...store, [userId]: next }));
  } catch {
    // The battle itself is over and shown; losing the tally is not worth an error.
  }
  return next;
}
