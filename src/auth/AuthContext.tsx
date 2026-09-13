import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as Storage from './backend';
import { Profile } from './types';
import { Avatar } from '../data/avatar';
import { unregisterPushToken } from '../notifications/pushTokens';
import { RoundConfig } from '../quiz/types';
import { categoryStatsKey, modeStatsKey } from '../quiz/statsKey';
import { ModeId } from '../data/modes';
import { ACHIEVEMENTS, Achievement, isUnlocked } from '../data/achievements';
import { todayDateStr } from '../quiz/today';

export { AuthError } from './backend';

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  register: (username: string, password: string, recoveryEmail?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateAvatar: (patch: { avatar?: Avatar; favoriteCharacterId?: string | null }) => Promise<void>;
  rename: (username: string) => Promise<void>;
  recordRoundResult: (config: RoundConfig, modeId: ModeId | null, score: number, total: number) => Promise<Achievement[]>;
  resetPassword: (username: string) => Promise<{ ok: boolean; reason?: string }>;
  completePasswordReset: (accessToken: string, refreshToken: string, newPassword: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  completeGoogleSession: (accessToken: string, refreshToken: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Storage.getSessionProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  // When a Supabase backend is configured, pick up changes made on other
  // devices logged into the same account (no-op for the local-only backend).
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = Storage.subscribeProfile(profile.id, setProfile);
    return unsubscribe;
  }, [profile?.id]);

  const register = async (username: string, password: string, recoveryEmail?: string) => {
    const p = await Storage.register(username, password, recoveryEmail);
    setProfile(p);
  };

  const deleteAccount = async () => {
    if (!profile) return;
    await Storage.deleteAccount(profile.id);
    setProfile(null);
  };

  const resetPassword = (username: string) => Storage.requestPasswordReset(username);

  const completePasswordReset = async (accessToken: string, refreshToken: string, newPassword: string) => {
    await Storage.completeRecoverySession(accessToken, refreshToken);
    await Storage.updatePassword(newPassword);
    const p = await Storage.getSessionProfile();
    setProfile(p);
  };

  const loginWithGoogle = async () => {
    const p = await Storage.signInWithGoogle();
    if (p) setProfile(p);
  };

  // Completes the round-trip for the web OAuth flow: `signInWithGoogle`
  // there just navigates the page away, so the tokens come back later as a
  // URL fragment that App.tsx's deep-link listener hands to this instead.
  const completeGoogleSession = async (accessToken: string, refreshToken: string) => {
    await Storage.completeRecoverySession(accessToken, refreshToken);
    const p = await Storage.getSessionProfile();
    setProfile(p);
  };

  const login = async (username: string, password: string) => {
    const p = await Storage.login(username, password);
    setProfile(p);
  };

  const logout = async () => {
    // Before the session goes, while the row is still ours to delete: the
    // next person on this device should not get the previous one's pushes.
    if (profile) await unregisterPushToken(profile.id);
    await Storage.logout();
    setProfile(null);
  };

  const updateAvatar = async (patch: { avatar?: Avatar; favoriteCharacterId?: string | null }) => {
    if (!profile) return;
    const p = await Storage.updateAccount(profile.id, patch);
    setProfile(p);
  };

  const rename = async (username: string) => {
    if (!profile) return;
    const p = await Storage.renameAccount(profile.id, username);
    setProfile(p);
  };

  const recordRoundResult = async (config: RoundConfig, modeId: ModeId | null, score: number, total: number) => {
    if (!profile) return [];
    const keys = [categoryStatsKey(config.categoryId, config.tier)];
    if (modeId) keys.push(modeStatsKey(modeId));

    const nextStats = { ...profile.stats };
    for (const key of keys) {
      nextStats[key] = Storage.mergeStat(nextStats[key], score, total);
    }

    const nextStreak = Storage.bumpStreak(profile.streak);

    const unlockedBefore = new Set(ACHIEVEMENTS.filter((a) => isUnlocked(a, profile)).map((a) => a.id));

    const today = todayDateStr();
    const nextDailyChallenge =
      modeId === 'daily' && profile.dailyChallenge?.date !== today
        ? { date: today, score, total }
        : profile.dailyChallenge;

    // The round has to be banked before the unlocks are read: an
    // achievement is a question about the profile after this round, not
    // before it.
    const afterRound: Profile = { ...profile, stats: nextStats, streak: nextStreak, dailyChallenge: nextDailyChallenge };
    const unlocked = ACHIEVEMENTS.filter((a) => !unlockedBefore.has(a.id) && isUnlocked(a, afterRound));

    const nextDates = { ...profile.achievementDates };
    for (const achievement of unlocked) nextDates[achievement.id] = today;
    // The id list is what other people see on our profile, so it is banked
    // too — unlocks are derived from our own stats, which friends cannot read.
    // Deduped: a streak achievement can re-unlock after the streak breaks.
    const nextIds = [...new Set([...profile.achievements, ...unlocked.map((a) => a.id)])];

    const p = await Storage.updateAccount(profile.id, {
      stats: nextStats,
      streak: nextStreak,
      dailyChallenge: nextDailyChallenge,
      ...(unlocked.length ? { achievements: nextIds, achievementDates: nextDates } : null),
    });
    setProfile(p);
    Storage.logRoundResult(profile.id, score, total);

    return unlocked;
  };

  const value = useMemo(
    () => ({
      profile,
      loading,
      register,
      login,
      logout,
      deleteAccount,
      updateAvatar,
      rename,
      recordRoundResult,
      resetPassword,
      completePasswordReset,
      loginWithGoogle,
      completeGoogleSession,
    }),
    [profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
