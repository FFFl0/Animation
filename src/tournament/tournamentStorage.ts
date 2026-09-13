import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bracket } from './bracket';

const KEY = 'animequiz.tournament';

type Saved = {
  /** Whose run this is — a different account on the same phone starts fresh. */
  userId: string;
  bracket: Bracket;
};

/**
 * A run is five matches long, so it has to survive the app being closed
 * between them. One tournament at a time per device; starting a new one
 * replaces whatever was there.
 */
export async function loadTournament(userId: string): Promise<Bracket | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return saved.userId === userId ? saved.bracket : null;
  } catch {
    return null;
  }
}

export async function saveTournament(userId: string, bracket: Bracket): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ userId, bracket } satisfies Saved));
  } catch {
    // Losing the save only costs the run, never the app.
  }
}

export async function clearTournament(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
