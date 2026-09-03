export type Theme = {
  background: string;
  card: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  text: string;
  textMuted: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  border: string;
};

export const lightTheme: Theme = {
  background: '#F4F5F9',
  card: '#FFFFFF',
  primary: '#4F5FCE',
  primaryDark: '#3A47A8',
  primarySoft: '#EAEBFA',
  accent: '#0EA5A0',
  text: '#20232E',
  textMuted: '#6B7280',
  success: '#22C55E',
  successBg: '#E9F9EE',
  danger: '#E5484D',
  dangerBg: '#FCEBEC',
  border: '#E2E4EC',
};

export const darkTheme: Theme = {
  background: '#14161F',
  card: '#1E2130',
  primary: '#6C77E0',
  primaryDark: '#4A54B8',
  primarySoft: '#282C4A',
  accent: '#14B8A6',
  text: '#F1F2F6',
  textMuted: '#9AA0B4',
  success: '#4ADE80',
  successBg: '#1B2E22',
  danger: '#F87171',
  dangerBg: '#3A2023',
  border: '#2B2F42',
};
