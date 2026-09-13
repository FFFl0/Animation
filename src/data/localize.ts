import { Language } from '../i18n/LanguageContext';

export function pick<T>(ru: T, en: T | undefined, lang: Language): T {
  return lang === 'en' && en !== undefined ? en : ru;
}
