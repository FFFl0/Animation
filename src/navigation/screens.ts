export type Screen =
  | 'home'
  | 'categoryDetail'
  | 'categoryStats'
  | 'quiz'
  | 'result'
  | 'stats'
  | 'achievements'
  | 'profile'
  | 'leaderboard'
  | 'battle'
  | 'tournament'
  | 'shop'
  | 'shopItem'
  | 'cart'
  | 'orders'
  | 'chats'
  | 'friends'
  | 'friendProfile'
  | 'compare'
  | 'chat'
  | 'groups'
  | 'groupChat'
  | 'about'
  | 'privacy';

export const TAB_SCREENS: Screen[] = ['home', 'chats', 'stats', 'shop', 'profile'];

/**
 * How deep into the app a screen sits.
 *
 * This is not a strict tree — a few screens are reachable from more than
 * one place, and a category can be opened from the home grid or from its
 * own stats page. It only has to answer one question: did the player just
 * go deeper, come back out, or move sideways. Where two screens genuinely
 * sit at the same level, a move between them is sideways, which is exactly
 * how it feels.
 */
export const SCREEN_DEPTH: Record<Screen, number> = {
  // The tabs: nothing is behind them.
  home: 0,
  chats: 0,
  stats: 0,
  shop: 0,
  profile: 0,

  // One step in from a tab.
  categoryDetail: 1,
  categoryStats: 1,
  achievements: 1,
  leaderboard: 1,
  friends: 1,
  groups: 1,
  battle: 1,
  tournament: 1,
  shopItem: 1,
  orders: 1,
  about: 1,

  // Two steps: opened from something that was itself opened.
  quiz: 2,
  result: 2,
  friendProfile: 2,
  chat: 2,
  groupChat: 2,
  cart: 2,
  privacy: 2,

  // The deepest thing in the app.
  compare: 3,
};

export type TransitionDirection = 'forward' | 'back' | 'swap';

/**
 * Which way the app just moved, which is what decides where the incoming
 * screen slides in from. The first screen of a session has nothing behind
 * it, so it simply appears.
 */
export function transitionDirection(from: Screen | null, to: Screen): TransitionDirection {
  if (!from || from === to) return 'swap';
  const before = SCREEN_DEPTH[from];
  const after = SCREEN_DEPTH[to];
  if (after > before) return 'forward';
  if (after < before) return 'back';
  return 'swap';
}
