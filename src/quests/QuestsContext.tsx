import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useShop } from '../shop/ShopContext';
import { ConsumableId } from '../shop/consumables';
import { todayDateStr } from '../quiz/today';
import { Quest, QuestProgress, RoundFacts, allDone, applyRound, questsForDay, rewardForDay } from './quests';
import { QuestDay, loadQuestDay, saveQuestDay } from './questStorage';
import { nextQuestReset } from './questClock';
import { AppState } from 'react-native';

type QuestsValue = {
  ready: boolean;
  quests: Quest[];
  progress: QuestProgress;
  reward: ConsumableId;
  /** All three done and the reward not yet collected. */
  canClaim: boolean;
  claimed: boolean;
  /** Feeds a finished round to today's quests. */
  noteRound: (round: RoundFacts) => void;
  /** Collects the reward; resolves to whether it was handed over. */
  claim: () => Promise<boolean>;
};

const QuestsContext = createContext<QuestsValue | null>(null);

export function QuestsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { claimDailyReward } = useShop();
  const [state, setState] = useState<QuestDay | null>(null);
  // The latest state, for a round that finishes between two renders: two
  // rounds noted back to back must both count, not both start from the
  // same stale copy.
  const latest = useRef<QuestDay | null>(null);
  latest.current = state;

  const userId = profile?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    setState(null);
    if (!userId) return;
    loadQuestDay(userId, todayDateStr()).then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Today's record — a fresh one if the date has moved on since it was loaded. */
  const current = useCallback((): QuestDay => {
    const today = todayDateStr();
    const held = latest.current;
    return held && held.day === today ? held : { day: today, progress: {}, claimed: false };
  }, []);

  // Midnight UTC while the app is open, or while it sat in the background:
  // without this the card would keep showing yesterday's quests until the
  // next round happened to replace them.
  useEffect(() => {
    if (!userId) return;
    const roll = () => {
      const fresh = current();
      if (latest.current && fresh !== latest.current) {
        latest.current = fresh;
        setState(fresh);
      }
    };
    const timer = setTimeout(roll, nextQuestReset().getTime() - Date.now() + 1000);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') roll();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [userId, current, state?.day]);

  const commit = useCallback(
    (next: QuestDay) => {
      latest.current = next;
      setState(next);
      if (userId) saveQuestDay(userId, next);
    },
    [userId]
  );

  const noteRound = useCallback(
    (round: RoundFacts) => {
      if (!userId) return;
      const now = current();
      commit({ ...now, progress: applyRound(questsForDay(now.day), now.progress, round) });
    },
    [userId, current, commit]
  );

  const claim = useCallback(async () => {
    const now = current();
    if (now.claimed || !allDone(questsForDay(now.day), now.progress)) return false;
    const result = await claimDailyReward(now.day);
    // "Already claimed" is also an answer: the reward was collected on
    // another device, and this one should stop offering it.
    if (result === 'granted' || result === 'alreadyClaimed') commit({ ...current(), claimed: true });
    return result === 'granted';
  }, [current, commit, claimDailyReward]);

  const value = useMemo<QuestsValue>(() => {
    const day = state?.day ?? todayDateStr();
    const quests = questsForDay(day);
    const progress = state?.progress ?? {};
    const claimed = state?.claimed ?? false;
    return {
      ready: state !== null,
      quests,
      progress,
      reward: rewardForDay(day),
      canClaim: state !== null && !claimed && allDone(quests, progress),
      claimed,
      noteRound,
      claim,
    };
  }, [state, noteRound, claim]);

  return <QuestsContext.Provider value={value}>{children}</QuestsContext.Provider>;
}

export function useQuests(): QuestsValue {
  const ctx = useContext(QuestsContext);
  if (!ctx) throw new Error('useQuests must be used within QuestsProvider');
  return ctx;
}
