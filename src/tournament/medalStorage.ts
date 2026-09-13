import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_RECORD, TournamentRecord } from './medals';

const KEY = 'animequiz.tournamentMedals';

type Store = Record<string, TournamentRecord>;

async function readStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

/** Kept per account, so two people sharing a phone keep their own shelf. */
export async function loadRecord(userId: string): Promise<TournamentRecord> {
  const store = await readStore();
  return { ...EMPTY_RECORD, ...store[userId] };
}

export async function saveRecord(userId: string, record: TournamentRecord): Promise<void> {
  try {
    const store = await readStore();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...store, [userId]: record }));
  } catch {
    // A lost medal is not worth failing the run over.
  }
}
