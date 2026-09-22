import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'ru' | 'en';

const STORAGE_KEY = 'animequiz.language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'ru' || saved === 'en') setLanguageState(saved);
      setLoaded(true);
    });
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  if (!loaded) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
