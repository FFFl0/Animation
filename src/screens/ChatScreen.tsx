import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { PlayerSummary } from '../friends/friendsApi';
import {
  ChatMessage,
  deleteMessage,
  getConversation,
  getReactions,
  isSupabaseConfigured,
  markConversationRead,
  sendMessage,
  subscribeIncomingMessages,
  subscribeMessageDeletes,
  subscribeReactions,
  toggleReaction,
} from '../chat/chatApi';
import ChatRoom from '../chat/ChatRoom';
import { useReactions } from '../chat/useReactions';
import AnimeAvatar from '../components/AnimeAvatar';
import { useT } from '../i18n/strings';

type Props = {
  friend: PlayerSummary;
  onBack: () => void;
};

export default function ChatScreen({ friend, onBack }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const meId = profile?.id ?? '';

  const toggle = useCallback(
    (messageId: string, userId: string, emoji: string, current: string | null) =>
      toggleReaction(messageId, userId, emoji, current),
    []
  );
  const { refresh, grouped, mineFor, apply } = useReactions(meId, { fetch: getReactions, toggle });

  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;

    const loadAll = async () => {
      const list = await getConversation(meId, friend.id);
      setMessages(list);
      refresh(list.map((m) => m.id));
    };
    loadAll();
    markConversationRead(meId, friend.id);

    const unsubMessages = subscribeIncomingMessages(meId, friend.id, (m) => {
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
    });
    const unsubDeletes = subscribeMessageDeletes(meId, friend.id, (id) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });
    const unsubReactions = subscribeReactions(() => {
      setMessages((prev) => {
        refresh(prev.map((m) => m.id));
        return prev;
      });
    });

    return () => {
      unsubMessages();
      unsubDeletes();
      unsubReactions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, friend.id]);

  if (!profile) return null;

  const handleSend = async (text: string, replyToId: string | null) => {
    const sent = await sendMessage(meId, friend.id, text, replyToId);
    if (sent) setMessages((prev) => [...prev, sent]);
  };

  const handleDelete = async (message: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    await deleteMessage(message.id);
  };

  return (
    <ChatRoom
      onBack={onBack}
      header={
        <View style={styles.headerRow}>
          <AnimeAvatar avatar={friend.avatar} size={36} name={friend.username} />
          <Text style={styles.headerName} numberOfLines={1}>{friend.username}</Text>
        </View>
      }
      messages={messages}
      meId={meId}
      labelFor={() => friend.username}
      emptyText={t('chat.empty')}
      reactionsFor={grouped}
      myReactionFor={mineFor}
      onSend={handleSend}
      onToggleReaction={apply}
      onDelete={handleDelete}
      canDelete={(m) => m.senderId === meId}
    />
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerName: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, flexShrink: 1 },
  });
}
