export type Theme = {
  background: string;
  card: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  text: string;
  textMuted: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  border: string;
};

// "primary" is the ink color used for headings, primary CTA buttons, and
// plain emphasis numbers. "accent" is the dusty-rose color reserved for
// active/selected states, progress, and in-flow progression buttons.
export const lightTheme: Theme = {
  background: '#F7F1E7',
  card: '#FFFFFF',
  primary: '#211D18',
  primaryDark: '#000000',
  primarySoft: '#FBE7EB',
  onPrimary: '#FFFFFF',
  accent: '#DE8797',
  text: '#2A241E',
  textMuted: '#90867A',
  success: '#3E9A5C',
  successBg: '#E7F5EA',
  danger: '#D9636E',
  dangerBg: '#FBE9EB',
  border: '#EBE1D2',
};

export const darkTheme: Theme = {
  background: '#1B1712',
  card: '#262019',
  primary: '#F3ECE1',
  primaryDark: '#D8CFC0',
  primarySoft: '#3A262C',
  onPrimary: '#211D18',
  accent: '#E7909E',
  text: '#F3ECE1',
  textMuted: '#A99E8E',
  success: '#5FC57F',
  successBg: '#1E3324',
  danger: '#E2828C',
  dangerBg: '#3A2226',
  border: '#3A332A',
};
