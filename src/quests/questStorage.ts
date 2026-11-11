import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuestProgress } from './quests';

const KEY = 'animequiz.quests';

/**
 * One day's worth: how far each quest has got and whether the reward has
 * been collected. Kept on the device — it is worth nothing tomorrow, and
 * the one part that matters, the reward, is the server's to remember.
 */
export type QuestDay = { day: string; progress: QuestProgress; claimed: boolean };

type Store = Record<string, QuestDay>;

async function readStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

/** Today's record for this account, or a blank one — yesterday's is simply dropped. */
export async function loadQuestDay(userId: string, day: string): Promise<QuestDay> {
  const saved = (await readStore())[userId];
  return saved && saved.day === day ? saved : { day, progress: {}, claimed: false };
}

export async function saveQuestDay(userId: string, state: QuestDay): Promise<void> {
  try {
    const store = await readStore();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...store, [userId]: state }));
  } catch {
    // Losing a day's progress is not worth failing a round over.
  }
}
