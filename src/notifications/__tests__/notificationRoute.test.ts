import { targetOf } from '../notificationRoute';

describe('targetOf', () => {
  it('sends a friend request and a battle invite to the screen holding both', () => {
    expect(targetOf({ kind: 'friendRequest' })).toBe('friends');
    expect(targetOf({ kind: 'battleInvite' })).toBe('friends');
  });

  it('sends both tournament notices to the tournament', () => {
    expect(targetOf({ kind: 'tournamentSignups' })).toBe('tournament');
    expect(targetOf({ kind: 'tournamentStarted' })).toBe('tournament');
  });

  it('sends the streak reminder home, where playing starts', () => {
    expect(targetOf({ kind: 'streak' })).toBe('home');
  });

  // An older notification still in the tray, or one from a newer build:
  // tapping it should open the app and leave it where it was.
  it('asks for nothing it does not recognise', () => {
    expect(targetOf({ kind: 'somethingElse' })).toBeNull();
    expect(targetOf({})).toBeNull();
    expect(targetOf(null)).toBeNull();
    expect(targetOf(undefined)).toBeNull();
    expect(targetOf('friendRequest')).toBeNull();
    expect(targetOf({ kind: 42 })).toBeNull();
  });
});
