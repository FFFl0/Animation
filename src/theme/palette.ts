export type Theme = {
  background: string;
  card: string;
  // "ink" = heading color + solid background for the one hero CTA on a
  // screen (Начать / Пройти ещё раз). "primary" = the single pink accent
  // used for progress, selection, lives, streaks and badges everywhere else.
  ink: string;
  onInk: string;
  primary: string;
  primaryLight: string;
  onPrimary: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
};

export const lightTheme: Theme = {
  background: '#FDF9F6',
  card: '#FFFFFF',
  ink: '#1F2937',
  onInk: '#FFFFFF',
  primary: '#F06292',
  primaryLight: '#FADDE1',
  onPrimary: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#ECE7EB',
  success: '#22C55E',
  successBg: '#E8F9EE',
  danger: '#EF4444',
  dangerBg: '#FDEAEA',
};

export const darkTheme: Theme = {
  background: '#18151A',
  card: '#242028',
  ink: '#F5F1EC',
  onInk: '#1F1B22',
  primary: '#F4789F',
  primaryLight: '#4A2F3B',
  onPrimary: '#1F1B22',
  text: '#F5F1EC',
  textMuted: '#9C94A0',
  border: '#332E38',
  success: '#4ADE80',
  successBg: '#173321',
  danger: '#F87171',
  dangerBg: '#3A1E1E',
};
