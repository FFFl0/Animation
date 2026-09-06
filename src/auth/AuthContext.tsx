import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as Storage from './backend';
import { Profile } from './types';
import { Avatar } from '../data/avatar';
import { RoundConfig } from '../quiz/types';
import { categoryStatsKey, modeStatsKey } from '../quiz/statsKey';
import { ModeId } from '../data/modes';
import { ACHIEVEMENTS, Achievement } from '../data/achievements';
import { todayDateStr } from '../quiz/today';

export { AuthError } from './backend';

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  register: (username: string, password: string, recoveryEmail?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAvatar: (patch: { avatar?: Avatar; favoriteCharacterId?: string | null }) => Promise<void>;
  recordRoundResult: (config: RoundConfig, modeId: ModeId | null, score: number, total: number) => Promise<Achievement[]>;
  resetPassword: (username: string) => Promise<{ ok: boolean; reason?: string }>;
  completePasswordReset: (accessToken: string, refreshToken: string, newPassword: string) => Promise<void>;
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

  const resetPassword = (username: string) => Storage.requestPasswordReset(username);

  const completePasswordReset = async (accessToken: string, refreshToken: string, newPassword: string) => {
    await Storage.completeRecoverySession(accessToken, refreshToken);
    await Storage.updatePassword(newPassword);
    const p = await Storage.getSessionProfile();
    setProfile(p);
  };

  const login = async (username: string, password: string) => {
    const p = await Storage.login(username, password);
    setProfile(p);
  };

  const logout = async () => {
    await Storage.logout();
    setProfile(null);
  };

  const updateAvatar = async (patch: { avatar?: Avatar; favoriteCharacterId?: string | null }) => {
    if (!profile) return;
    const p = await Storage.updateAccount(profile.id, patch);
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

    const unlockedBefore = new Set(ACHIEVEMENTS.filter((a) => a.check(profile)).map((a) => a.id));

    const today = todayDateStr();
    const nextDailyChallenge =
      modeId === 'daily' && profile.dailyChallenge?.date !== today
        ? { date: today, score, total }
        : profile.dailyChallenge;

    const p = await Storage.updateAccount(profile.id, { stats: nextStats, streak: nextStreak, dailyChallenge: nextDailyChallenge });
    setProfile(p);

    return ACHIEVEMENTS.filter((a) => !unlockedBefore.has(a.id) && a.check(p));
  };

  const value = useMemo(
    () => ({ profile, loading, register, login, logout, updateAvatar, recordRoundResult, resetPassword, completePasswordReset }),
    [profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
