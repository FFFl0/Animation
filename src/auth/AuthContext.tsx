import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Profile } from './types';
import { QuizMode } from '../quiz/generateQuiz';
import * as store from './storage';

type AuthContextValue = {
  profile: Profile | null;
  loading: boolean;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAvatar: (changes: Partial<Pick<Profile, 'avatar' | 'favoriteCharacterId'>>) => Promise<void>;
  recordQuizResult: (mode: QuizMode, score: number, total: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getSessionProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      register: async (username, password) => setProfile(await store.register(username, password)),
      login: async (username, password) => setProfile(await store.login(username, password)),
      logout: async () => {
        await store.logout();
        setProfile(null);
      },
      updateAvatar: async (changes) => {
        if (!profile) return;
        setProfile(await store.updateProfile(profile.id, changes));
      },
      recordQuizResult: async (mode, score, total) => {
        if (!profile) return;
        setProfile(await store.recordQuizResult(profile.id, mode, score, total));
      },
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

export { AuthError } from './storage';
