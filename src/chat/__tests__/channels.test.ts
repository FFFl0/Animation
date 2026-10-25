/**
 * Guards the crash that shipped with the messenger.
 *
 * `supabase.channel(topic)` returns the *existing* channel when one with that
 * topic is already open, and a channel that has subscribed throws if another
 * `postgres_changes` handler is added to it. The tab-bar badge listens to the
 * chat list for the whole session, so opening the Chats screen asked for the
 * same topic a second time and took the app down with it.
 *
 * These drive the real subscribe functions against a client that behaves the
 * way the library does. The `mock` prefixes are what Jest allows a mock
 * factory to reach.
 */

type MockChannel = { topic: string; subscribed: boolean; on: (type: string) => MockChannel; subscribe: () => MockChannel };

const mockChannels = new Map<string, MockChannel>();
const mockCreated: string[] = [];

// Crash reporting is irrelevant here and drags in a package Jest would have
// to transpile; the chat modules reach it through the friends API.
jest.mock('../../monitoring/sentry', () => ({ reportHandledError: () => {} }));

jest.mock('../../auth/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: (topic: string) => {
      mockCreated.push(topic);
      const existing = mockChannels.get(topic);
      // The library hands back the channel that is already on this topic
      // rather than opening a second one. That is what makes a shared topic
      // fatal, so the fake has to do it too.
      if (existing) return existing;

      const fresh: MockChannel = {
        topic,
        subscribed: false,
        on(type: string) {
          if (fresh.subscribed && (type === 'postgres_changes' || type === 'presence')) {
            throw new Error(`cannot add \`${type}\` callbacks for realtime:${topic} after \`subscribe()\`.`);
          }
          return fresh;
        },
        subscribe() {
          fresh.subscribed = true;
          return fresh;
        },
      };
      mockChannels.set(topic, fresh);
      return fresh;
    },
    removeChannel: (channel: MockChannel) => {
      mockChannels.delete(channel.topic);
    },
  },
}));

import { subscribeChatList } from '../chatsApi';
import { subscribeIncomingMessages, subscribeReactions } from '../chatApi';
import { subscribeGroupMessages, subscribeGroupReactions } from '../groupApi';
import { uniqueChannelTopic } from '../channelTopic';

beforeEach(() => {
  mockChannels.clear();
  mockCreated.length = 0;
});

describe('realtime topics', () => {
  it('lets the chat list be listened to twice at once', () => {
    // The badge subscribes for the whole session; the screen subscribes again
    // when it opens. This threw before the topics were made unique.
    const stopBadge = subscribeChatList(() => {});
    expect(() => subscribeChatList(() => {})).not.toThrow();
    stopBadge();
  });

  it('gives each subscriber its own topic', () => {
    subscribeChatList(() => {});
    subscribeChatList(() => {});
    expect(mockCreated).toHaveLength(2);
    expect(mockCreated[0]).not.toBe(mockCreated[1]);
  });

  it('survives a second listener on every postgres_changes channel', () => {
    const starts = [
      () => subscribeChatList(() => {}),
      () => subscribeIncomingMessages('me', 'them', () => {}),
      () => subscribeReactions(() => {}),
      () => subscribeGroupMessages('g1', () => {}),
      () => subscribeGroupReactions(() => {}),
    ];
    for (const start of starts) {
      const first = start();
      expect(start).not.toThrow();
      first();
    }
  });

  it('opens a fresh channel every time, so none is ever reused', () => {
    subscribeChatList(() => {});
    subscribeIncomingMessages('me', 'them', () => {});
    subscribeGroupMessages('g1', () => {});
    expect(new Set(mockCreated).size).toBe(mockCreated.length);
  });
});

describe('the fake matches the library', () => {
  it('hands back the same channel for a repeated topic, and throws on a late handler', () => {
    // Without this the tests above would pass against a fake that cannot
    // reproduce the bug they exist to catch.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { supabase } = require('../../auth/supabaseClient');
    const first = supabase.channel('shared');
    first.on('postgres_changes', {}, () => {});
    first.subscribe();

    const again = supabase.channel('shared');
    expect(again).toBe(first);
    expect(() => again.on('postgres_changes', {}, () => {})).toThrow(/after `subscribe\(\)`/);
  });
});

describe('uniqueChannelTopic', () => {
  it('keeps the prefix, so a topic still says what it carries', () => {
    expect(uniqueChannelTopic('chat-list').startsWith('chat-list-')).toBe(true);
  });

  it('never repeats', () => {
    const made = Array.from({ length: 100 }, () => uniqueChannelTopic('x'));
    expect(new Set(made).size).toBe(made.length);
  });
});
