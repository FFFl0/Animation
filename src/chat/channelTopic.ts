let counter = 0;

/**
 * A Realtime topic nobody else is listening on.
 *
 * `supabase.channel(topic)` hands back the *existing* channel when one with
 * that topic is already open — it does not make a second one. Adding a
 * `postgres_changes` handler to a channel that has already subscribed throws,
 * so two independent subscribers sharing a topic name is a crash waiting for
 * whichever one arrives second. The chat list hit exactly that: the badge in
 * the tab bar listens for the whole session, and opening the Chats screen
 * asked for the same topic again.
 *
 * Only safe for `postgres_changes`, where the topic is just an identity. A
 * broadcast or presence channel is the opposite: both sides have to agree on
 * the name, so those are built from the conversation and must stay shared.
 */
export function uniqueChannelTopic(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
