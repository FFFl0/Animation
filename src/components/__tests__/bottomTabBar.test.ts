// The bar reaches expo-audio through the sound-aware touchable and the
// Sentry SDK through the notifications context, neither of which jest can
// load — and neither of which is involved in working out which tab the
// indicator belongs over.
jest.mock('../../sound/SoundTouchable', () => 'SoundTouchable');
jest.mock('../../monitoring/sentry', () => ({
  isCrashReportingEnabled: false,
  reportHandledError: () => {},
  leaveBreadcrumb: () => {},
  identifyForCrashReports: () => {},
}));

import { TabKey, activeTabIndex } from '../BottomTabBar';

const KEYS: TabKey[] = ['home', 'chats', 'stats', 'shop', 'profile'];

describe('activeTabIndex', () => {
  it('finds each tab where it sits in the bar', () => {
    KEYS.forEach((key, i) => expect(activeTabIndex(KEYS, key)).toBe(i));
  });

  // The bar is only drawn for screens that have a tab, but an unknown key
  // must not send the indicator off the left edge.
  it('falls back to the first tab for a key the bar does not have', () => {
    expect(activeTabIndex(KEYS, 'achievements' as TabKey)).toBe(0);
    expect(activeTabIndex([], 'home')).toBe(0);
  });

  it('never points past the end of the bar', () => {
    for (const key of [...KEYS, 'quiz' as TabKey, '' as TabKey]) {
      const index = activeTabIndex(KEYS, key);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(KEYS.length);
    }
  });
});
