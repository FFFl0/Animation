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
  editMessage,
  getConversation,
  getReactions,
  isSupabaseConfigured,
  markConversationRead,
  sendMessage,
  subscribeIncomingMessages,
  subscribeMessageDeletes,
  subscribeMessageUpdates,
  subscribeReactions,
  toggleReaction,
} from '../chat/chatApi';
import ChatRoom from '../chat/ChatRoom';
import { Attachment, MediaScope } from '../chat/attachments';
import { removeAttachment } from '../chat/attachmentStorage';
import { useReactions } from '../chat/useReactions';
import { useTyping, usePeerPresence } from '../chat/presence';
import { formatLastSeen } from '../chat/messageGroups';
import AnimeAvatar from '../components/AnimeAvatar';
import SoundTouchable from '../sound/SoundTouchable';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  friend: PlayerSummary;
  onBack: () => void;
  /** Tapping the name at the top opens who you are talking to. */
  onOpenProfile: () => void;
};

export default function ChatScreen({ friend, onBack, onOpenProfile }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const meId = profile?.id ?? '';

  // Both sides have to land on the same channel name, so it is built from the
  // pair rather than from "me and them".
  const typingKey = useMemo(() => [meId, friend.id].sort().join('-'), [meId, friend.id]);
  const { typingNames, notifyTyping } = useTyping(typingKey, meId, profile?.username ?? '');
  const presence = usePeerPresence(friend.id, friend.lastSeenAt);
  const mediaScope = useMemo<MediaScope>(
    () => ({ kind: 'direct', meId, peerId: friend.id }),
    [meId, friend.id]
  );

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
      // The conversation is on screen, so anything arriving into it has been
      // seen — otherwise the chat list would keep counting it as unread while
      // the person is reading it.
      markConversationRead(meId, friend.id);
    });
    // Edits and read receipts both arrive as updates to a row already on
    // screen, so the local copy is patched rather than refetched.
    const unsubUpdates = subscribeMessageUpdates(meId, friend.id, (m) => {
      setMessages((prev) => prev.map((p) => (p.id === m.id ? m : p)));
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
      unsubUpdates();
      unsubDeletes();
      unsubReactions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, friend.id]);

  if (!profile) return null;

  const handleSend = async (text: string, replyToId: string | null, attachment: Attachment | null) => {
    const sent = await sendMessage(meId, friend.id, text, replyToId, null, attachment);
    if (sent) setMessages((prev) => [...prev, sent]);
  };

  const handleEdit = async (message: ChatMessage, text: string) => {
    const editedAt = await editMessage(message.id, text);
    if (!editedAt) return;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, body: text, editedAt } : m)));
  };

  const handleDelete = async (message: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    await deleteMessage(message.id);
    // After the row, not before: while the message still exists its bubble
    // would be left pointing at an object that is already gone.
    await removeAttachment(message.attachment?.path);
  };

  const subtitle = typingNames.length > 0 ? t('chat.typing') : formatLastSeen(presence.lastSeenAt, presence.online, language);

  return (
    <ChatRoom
      onBack={onBack}
      conversationKey={friend.id}
      mediaScope={mediaScope}
      subtitle={subtitle}
      header={
        <SoundTouchable
          style={styles.headerRow}
          onPress={onOpenProfile}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <AnimeAvatar avatar={friend.avatar} size={36} name={friend.username} />
          <Text style={styles.headerName} numberOfLines={1}>{friend.username}</Text>
        </SoundTouchable>
      }
      messages={messages}
      meId={meId}
      myName={profile.username}
      labelFor={() => friend.username}
      emptyText={t('chat.empty')}
      reactionsFor={grouped}
      myReactionFor={mineFor}
      onSend={handleSend}
      onEdit={handleEdit}
      canEdit={(m) => m.senderId === meId}
      onToggleReaction={apply}
      onDelete={handleDelete}
      canDelete={(m) => m.senderId === meId}
      onTyping={notifyTyping}
    />
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerName: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, flexShrink: 1 },
  });
}
