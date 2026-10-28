// friendsApi reaches the push-token module, and through it the Sentry SDK,
// which ships untransformed ESM. None of that matters to the pure helpers
// under test here.
jest.mock('../../monitoring/sentry', () => ({
  isCrashReportingEnabled: false,
  reportHandledError: () => {},
  leaveBreadcrumb: () => {},
}));

import { Friendship, NO_RELATION, PlayerSummary, friendState, relationsByPlayer } from '../friendsApi';
import { makeAvatar } from '../../data/avatar';

function player(id: string): PlayerSummary {
  return {
    id,
    username: id,
    avatar: makeAvatar(id),
    streakCount: 0,
    achievements: [],
    stats: {},
    totalScore: 0,
    rating: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    totalGames: 0,
    lastSeenAt: null,
  };
}

function friendship(id: string, over: Partial<Friendship> = {}): Friendship {
  return {
    friendshipId: `f-${id}`,
    status: 'accepted',
    isOutgoing: true,
    player: player(id),
    ...over,
  };
}

describe('friendState', () => {
  it('calls somebody with no friendship a stranger', () => {
    expect(friendState(null)).toBe('none');
    expect(friendState(undefined)).toBe('none');
  });

  it('calls an accepted friendship a friend, whoever asked first', () => {
    expect(friendState(friendship('a', { status: 'accepted', isOutgoing: true }))).toBe('accepted');
    expect(friendState(friendship('a', { status: 'accepted', isOutgoing: false }))).toBe('accepted');
  });

  // The whole point of the distinction: one is waiting on them, the other is
  // waiting on you, and only the second one has a button worth pressing.
  it('keeps the two directions of a pending request apart', () => {
    expect(friendState(friendship('a', { status: 'pending', isOutgoing: true }))).toBe('pending-out');
    expect(friendState(friendship('a', { status: 'pending', isOutgoing: false }))).toBe('pending-in');
  });
});

describe('relationsByPlayer', () => {
  it('keys the friendship by the other player, which is what a list row knows', () => {
    const relations = relationsByPlayer([friendship('bob'), friendship('ann', { status: 'pending', isOutgoing: false })]);
    expect(relations.get('bob')).toEqual({ state: 'accepted', friendshipId: 'f-bob' });
    expect(relations.get('ann')).toEqual({ state: 'pending-in', friendshipId: 'f-ann' });
  });

  it('leaves out everyone it was not told about, so a stranger stays a stranger', () => {
    const relations = relationsByPlayer([friendship('bob')]);
    expect(relations.get('nobody')).toBeUndefined();
    expect(relations.get('nobody') ?? NO_RELATION).toEqual({ state: 'none', friendshipId: null });
  });

  it('is empty when there are no friendships at all', () => {
    expect(relationsByPlayer([]).size).toBe(0);
  });

  it('carries the friendship id an accept has to act on', () => {
    const relations = relationsByPlayer([friendship('ann', { status: 'pending', isOutgoing: false })]);
    expect(relations.get('ann')?.friendshipId).toBe('f-ann');
  });
});
