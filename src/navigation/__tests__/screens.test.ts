import { SCREEN_DEPTH, Screen, TAB_SCREENS, transitionDirection } from '../screens';

describe('screen depth', () => {
  it('puts every tab at the surface', () => {
    for (const tab of TAB_SCREENS) expect(SCREEN_DEPTH[tab]).toBe(0);
  });

  it('gives every screen a depth, so nothing falls through to NaN', () => {
    for (const [screen, depth] of Object.entries(SCREEN_DEPTH)) {
      expect(Number.isInteger(depth)).toBe(true);
      expect(depth).toBeGreaterThanOrEqual(0);
      expect(screen.length).toBeGreaterThan(0);
    }
  });
});

describe('transitionDirection', () => {
  it('slides forward when the player goes deeper', () => {
    expect(transitionDirection('home', 'categoryDetail')).toBe('forward');
    expect(transitionDirection('stats', 'categoryStats')).toBe('forward');
    expect(transitionDirection('chats', 'chat')).toBe('forward');
    expect(transitionDirection('friends', 'friendProfile')).toBe('forward');
    expect(transitionDirection('friendProfile', 'compare')).toBe('forward');
    expect(transitionDirection('categoryDetail', 'quiz')).toBe('forward');
  });

  it('slides back on the way out', () => {
    expect(transitionDirection('categoryDetail', 'home')).toBe('back');
    expect(transitionDirection('categoryStats', 'stats')).toBe('back');
    expect(transitionDirection('compare', 'friendProfile')).toBe('back');
    expect(transitionDirection('result', 'home')).toBe('back');
    expect(transitionDirection('chat', 'chats')).toBe('back');
  });

  it('calls a move between tabs sideways', () => {
    expect(transitionDirection('home', 'stats')).toBe('swap');
    expect(transitionDirection('shop', 'profile')).toBe('swap');
  });

  it('calls a move between screens at the same depth sideways', () => {
    expect(transitionDirection('quiz', 'result')).toBe('swap');
    expect(transitionDirection('categoryStats', 'categoryDetail')).toBe('swap');
  });

  it('just appears for the first screen of a session', () => {
    expect(transitionDirection(null, 'home')).toBe('swap');
  });

  it('does not animate a screen into itself', () => {
    expect(transitionDirection('home', 'home')).toBe('swap');
  });

  // Backing out of anything should be the reverse of the way in.
  it('is symmetric: every forward move reverses to a back move', () => {
    const pairs: [Screen, Screen][] = [
      ['home', 'categoryDetail'],
      ['stats', 'leaderboard'],
      ['chats', 'friends'],
      ['friends', 'friendProfile'],
      ['shop', 'shopItem'],
      ['shopItem', 'cart'],
      ['profile', 'about'],
      ['about', 'privacy'],
    ];
    for (const [outer, inner] of pairs) {
      expect(transitionDirection(outer, inner)).toBe('forward');
      expect(transitionDirection(inner, outer)).toBe('back');
    }
  });
});
