import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_RECORD, TournamentRecord } from './medals';
import { EMPTY_PRACTICE_RECORD, PracticeRecord } from './practiceRecord';

// The medal shelf moved from the practice bracket to the weekly tournament,
// so it starts from a new key: a shelf full of medals won against bots is not
// the same shelf.
const MEDALS_KEY = 'animequiz.weeklyMedals';
const PRACTICE_KEY = 'animequiz.practiceRecord';

async function readStore<T>(key: string): Promise<Record<string, T>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

async function writeEntry<T>(key: string, userId: string, value: T): Promise<void> {
  try {
    const store = await readStore<T>(key);
    await AsyncStorage.setItem(key, JSON.stringify({ ...store, [userId]: value }));
  } catch {
    // A lost medal is not worth failing the run over.
  }
}

/** Kept per account, so two people sharing a phone keep their own shelf. */
export async function loadRecord(userId: string): Promise<TournamentRecord> {
  const store = await readStore<TournamentRecord>(MEDALS_KEY);
  return { ...EMPTY_RECORD, ...store[userId] };
}

export function saveRecord(userId: string, record: TournamentRecord): Promise<void> {
  return writeEntry(MEDALS_KEY, userId, record);
}

export async function loadPracticeRecord(userId: string): Promise<PracticeRecord> {
  const store = await readStore<PracticeRecord>(PRACTICE_KEY);
  return { ...EMPTY_PRACTICE_RECORD, ...store[userId] };
}

export function savePracticeRecord(userId: string, record: PracticeRecord): Promise<void> {
  return writeEntry(PRACTICE_KEY, userId, record);
}
