// expo-linking reads the app manifest through expo-constants, which jest has
// no access to, so it stands in for the shape a build actually produces:
// createURL('battle/ABCDE') returns 'animequiz://battle/ABCDE'.
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `animequiz://${path}`,
}));

import {
  battleInviteUrl,
  looksLikeInviteLink,
  parseBattleInviteUrl,
  roomCodeFromInput,
} from '../battleLink';

describe('battleInviteUrl', () => {
  it('points at the room with the scheme the app registers', () => {
    expect(battleInviteUrl('ABCDE')).toBe('animequiz://battle/ABCDE');
  });

  it('builds a link the parser reads back', () => {
    expect(parseBattleInviteUrl(battleInviteUrl('QW7XK'))).toBe('QW7XK');
  });

  it('uses the web address when one is configured, so the link is tappable in a chat', () => {
    jest.resetModules();
    const previous = process.env.EXPO_PUBLIC_BATTLE_LINK_BASE;
    process.env.EXPO_PUBLIC_BATTLE_LINK_BASE = 'https://example.com/b/';
    try {
      // Read at module load, like every other EXPO_PUBLIC_ value.
      const fresh = require('../battleLink');
      expect(fresh.battleInviteUrl('ABCDE')).toBe('https://example.com/b/battle/ABCDE');
      expect(fresh.parseBattleInviteUrl(fresh.battleInviteUrl('ABCDE'))).toBe('ABCDE');
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_BATTLE_LINK_BASE;
      else process.env.EXPO_PUBLIC_BATTLE_LINK_BASE = previous;
      jest.resetModules();
    }
  });
});

describe('parseBattleInviteUrl', () => {
  // Every shape the same invite can arrive in: the app's own scheme, the
  // three-slash form createURL produces for a path that starts with one, a
  // development client, a web redirect, and what a chat app does to the end
  // of a URL.
  it.each([
    ['animequiz://battle/ABCDE', 'ABCDE'],
    ['animequiz:///battle/ABCDE', 'ABCDE'],
    ['exp://192.168.1.14:8081/--/battle/ABCDE', 'ABCDE'],
    ['https://example.com/b/battle/ABCDE', 'ABCDE'],
    ['https://example.com/b/battle/ABCDE/', 'ABCDE'],
    ['animequiz://battle/abcde', 'ABCDE'],
    ['animequiz://Battle/ABCDE', 'ABCDE'],
    ['animequiz://battle/ABCDE?from=chat', 'ABCDE'],
    ['animequiz://battle?code=ABCDE', 'ABCDE'],
    ['animequiz://battle/%41BCDE', 'ABCDE'],
  ])('reads the code out of %s', (url, code) => {
    expect(parseBattleInviteUrl(url)).toBe(code);
  });

  it.each([
    [''],
    ['animequiz://'],
    // Password recovery and the Google callback come through the same event.
    ['animequiz://#access_token=abc&refresh_token=def&type=recovery'],
    ['animequiz://chat/ABCDE'],
    ['https://example.com/anything'],
    // No battle marker, so a `code` parameter is somebody else's.
    ['https://example.com/promo?code=ABCDE'],
    ['animequiz://battle'],
    ['animequiz://battle/ABC'],
    ['animequiz://battle/ABCDEFGH'],
  ])('is not fooled by %s', (url) => {
    expect(parseBattleInviteUrl(url)).toBeNull();
  });

  it('ignores a fragment appended to an invite', () => {
    expect(parseBattleInviteUrl('animequiz://battle/ABCDE#anything')).toBe('ABCDE');
  });
});

describe('roomCodeFromInput', () => {
  it('takes a pasted link', () => {
    expect(roomCodeFromInput('https://example.com/b/battle/QW7XK')).toBe('QW7XK');
  });

  it('takes a link a chat app wrapped in spaces', () => {
    expect(roomCodeFromInput('  animequiz://battle/QW7XK  ')).toBe('QW7XK');
  });

  it('still takes a code typed by hand', () => {
    expect(roomCodeFromInput('qw7xk')).toBe('QW7XK');
    expect(roomCodeFromInput(' QW 7XK ')).toBe('QW7XK');
  });

  it('rejects anything that is neither', () => {
    expect(roomCodeFromInput('')).toBeNull();
    expect(roomCodeFromInput('QW7')).toBeNull();
    expect(roomCodeFromInput('https://example.com/b/battle/QW7')).toBeNull();
    expect(roomCodeFromInput('посмотри это видео')).toBeNull();
  });
});

describe('looksLikeInviteLink', () => {
  it('tells a link apart from a code, so the join field can hold both', () => {
    expect(looksLikeInviteLink('animequiz://battle/ABCDE')).toBe(true);
    expect(looksLikeInviteLink('https://example.com/b/battle/ABCDE')).toBe(true);
    expect(looksLikeInviteLink('ABCDE')).toBe(false);
    expect(looksLikeInviteLink('AB')).toBe(false);
  });
});
