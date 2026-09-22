import { useCallback, useState } from 'react';
import { ReactionGroup } from './MessageBubble';

export type Reaction = { messageId: string; userId: string; emoji: string };

type Options = {
  fetch: (messageIds: string[]) => Promise<Reaction[]>;
  /** Reacting with the emoji already picked clears it; a different one
   * replaces it. Implementations differ only in which table they write. */
  toggle: (messageId: string, userId: string, emoji: string, current: string | null) => Promise<unknown>;
};

/**
 * Reaction state for one conversation, shared by direct and group chats.
 *
 * The toggle applies locally before the write lands: reacting is the one chat
 * action that has to feel instant, and the realtime subscription re-syncs the
 * truth a moment later either way.
 */
export function useReactions(meId: string, { fetch, toggle }: Options) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const refresh = useCallback(
    async (messageIds: string[]) => {
      setReactions(await fetch(messageIds));
    },
    [fetch]
  );

  const mineFor = useCallback(
    (messageId: string): string | null =>
      reactions.find((r) => r.messageId === messageId && r.userId === meId)?.emoji ?? null,
    [reactions, meId]
  );

  const apply = useCallback(
    async (messageId: string, emoji: string) => {
      const current = reactions.find((r) => r.messageId === messageId && r.userId === meId)?.emoji ?? null;
      const next = current === emoji ? null : emoji;
      setReactions((prev) => {
        const without = prev.filter((r) => !(r.messageId === messageId && r.userId === meId));
        return next ? [...without, { messageId, userId: meId, emoji: next }] : without;
      });
      await toggle(messageId, meId, emoji, current);
    },
    [reactions, meId, toggle]
  );

  /** Collapsed to one chip per emoji, with a count and whether I'm in it. */
  const grouped = useCallback(
    (messageId: string): ReactionGroup[] => {
      const byEmoji = new Map<string, ReactionGroup>();
      for (const r of reactions) {
        if (r.messageId !== messageId) continue;
        const existing = byEmoji.get(r.emoji);
        if (existing) {
          existing.count += 1;
          existing.mine = existing.mine || r.userId === meId;
        } else {
          byEmoji.set(r.emoji, { emoji: r.emoji, count: 1, mine: r.userId === meId });
        }
      }
      return Array.from(byEmoji.values());
    },
    [reactions, meId]
  );

  return { refresh, grouped, mineFor, apply };
}
