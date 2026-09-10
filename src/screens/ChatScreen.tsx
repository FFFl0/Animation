import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { PlayerSummary } from '../friends/friendsApi';
import {
  ChatMessage,
  MessageReaction,
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
import MessageBubble, { ReactionGroup } from '../chat/MessageBubble';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';

type Props = {
  friend: PlayerSummary;
  onBack: () => void;
};

const EMOJI = [
  '😀', '😂', '😍', '😎', '🤔', '😭', '😡', '😱',
  '🥳', '😴', '👀', '🙌', '👍', '👎', '🙏', '👋',
  '❤️', '🔥', '✨', '🎉', '💯', '⚡', '🌸', '😊',
];

/** Offered in the long-press menu and by double-tap (the first one). */
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function ChatScreen({ friend, onBack }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menuFor, setMenuFor] = useState<ChatMessage | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const meId = profile?.id ?? '';

  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;

    const loadAll = async () => {
      const list = await getConversation(meId, friend.id);
      setMessages(list);
      setReactions(await getReactions(list.map((m) => m.id)));
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
        getReactions(prev.map((m) => m.id)).then(setReactions);
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

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (!profile) return null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    const replyId = replyTo?.id ?? null;
    setDraft('');
    setReplyTo(null);
    const sent = await sendMessage(meId, friend.id, text, replyId);
    if (sent) setMessages((prev) => [...prev, sent]);
  };

  const handlePickEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const myReactionFor = (messageId: string): string | null =>
    reactions.find((r) => r.messageId === messageId && r.userId === meId)?.emoji ?? null;

  const applyReaction = async (message: ChatMessage, emoji: string) => {
    const current = myReactionFor(message.id);
    // Optimistic: reacting is the one action that should feel instant.
    const next = current === emoji ? null : emoji;
    setReactions((prev) => {
      const without = prev.filter((r) => !(r.messageId === message.id && r.userId === meId));
      return next ? [...without, { messageId: message.id, userId: meId, emoji: next }] : without;
    });
    await toggleReaction(message.id, meId, emoji, current);
  };

  const handleDelete = async (message: ChatMessage) => {
    setMenuFor(null);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    await deleteMessage(message.id);
  };

  const jumpToMessage = (messageId: string) => {
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId((id) => (id === messageId ? null : id)), 1200);
  };

  const groupedReactions = (messageId: string): ReactionGroup[] => {
    const forMessage = reactions.filter((r) => r.messageId === messageId);
    const byEmoji = new Map<string, ReactionGroup>();
    for (const r of forMessage) {
      const existing = byEmoji.get(r.emoji);
      if (existing) {
        existing.count += 1;
        existing.mine = existing.mine || r.userId === meId;
      } else {
        byEmoji.set(r.emoji, { emoji: r.emoji, count: 1, mine: r.userId === meId });
      }
    }
    return Array.from(byEmoji.values());
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('chat.back')} style={styles.backButton}>
            <Text style={styles.backText}>{`‹ ${t('chat.back')}`}</Text>
          </SoundTouchable>
          <View style={styles.headerRow}>
            <AnimeAvatar avatar={friend.avatar} size={36} />
            <Text style={styles.headerName} numberOfLines={1}>{friend.username}</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.list}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>{t('chat.empty')}</Text>
          ) : (
            messages.map((m) => {
              const repliedTo = m.replyToId ? messages.find((x) => x.id === m.replyToId) ?? null : null;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={m.senderId === meId}
                  repliedTo={repliedTo}
                  repliedToLabel={repliedTo?.senderId === meId ? t('chat.you') : friend.username}
                  reactions={groupedReactions(m.id)}
                  highlighted={highlightedId === m.id}
                  onReply={handleReply}
                  onQuickReact={(msg) => applyReaction(msg, QUICK_REACTIONS[0])}
                  onToggleReaction={applyReaction}
                  onLongPress={setMenuFor}
                  onJumpToReplied={jumpToMessage}
                />
              );
            })
          )}
        </ScrollView>

        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarAccent} />
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarTitle}>
                {t('chat.replyingTo', replyTo.senderId === meId ? t('chat.you') : friend.username)}
              </Text>
              <Text style={styles.replyBarBody} numberOfLines={1}>{replyTo.body}</Text>
            </View>
            <SoundTouchable onPress={() => setReplyTo(null)} accessibilityRole="button" accessibilityLabel={t('chat.cancelReply')}>
              <Icon name="close" size={16} color={theme.textMuted} />
            </SoundTouchable>
          </View>
        )}

        {showEmoji && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
            {EMOJI.map((emoji) => (
              <SoundTouchable key={emoji} onPress={() => handlePickEmoji(emoji)} style={styles.emojiButton}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </SoundTouchable>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <SoundTouchable
            style={styles.emojiToggle}
            onPress={() => setShowEmoji((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t('chat.emojiLabel')}
          >
            <Icon name="smile" size={26} color={showEmoji ? theme.primary : theme.textMuted} />
          </SoundTouchable>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={theme.textMuted}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setShowEmoji(false)}
            onSubmitEditing={handleSend}
            multiline
          />
          <SoundTouchable style={styles.sendButton} onPress={handleSend} accessibilityRole="button">
            <Icon name="send" size={17} color={theme.onPrimary} />
          </SoundTouchable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuFor(null)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            {menuFor && (
              <>
                <View style={styles.menuReactions}>
                  {QUICK_REACTIONS.map((emoji) => {
                    const mine = myReactionFor(menuFor.id) === emoji;
                    return (
                      <Pressable
                        key={emoji}
                        onPress={() => {
                          applyReaction(menuFor, emoji);
                          setMenuFor(null);
                        }}
                        style={[styles.menuReactionButton, mine && styles.menuReactionButtonActive]}
                      >
                        <Text style={styles.menuReactionEmoji}>{emoji}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.menuPreview} numberOfLines={2}>{menuFor.body}</Text>

                <SoundTouchable
                  style={styles.menuAction}
                  onPress={() => {
                    handleReply(menuFor);
                    setMenuFor(null);
                  }}
                >
                  <Icon name="reply" size={18} color={theme.text} />
                  <Text style={styles.menuActionText}>{t('chat.reply')}</Text>
                </SoundTouchable>

                {menuFor.senderId === meId && (
                  <SoundTouchable style={styles.menuAction} onPress={() => handleDelete(menuFor)}>
                    <Icon name="trash" size={18} color={theme.danger} />
                    <Text style={[styles.menuActionText, { color: theme.danger }]}>{t('chat.delete')}</Text>
                  </SoundTouchable>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    backButton: { marginBottom: 10 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerName: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, flexShrink: 1 },
    list: { paddingHorizontal: 16, paddingVertical: 16, gap: 10, flexGrow: 1 },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', marginTop: 40 },
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.card,
    },
    replyBarAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: theme.primary },
    replyBarText: { flex: 1 },
    replyBarTitle: { fontSize: 11, fontFamily: fontFamily('800'), color: theme.primary },
    replyBarBody: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
    emojiRow: { gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
    emojiButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: { fontSize: 20 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    emojiToggle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.text,
      maxHeight: 100,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    menuCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
    },
    menuReactions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    menuReactionButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    menuReactionButtonActive: { backgroundColor: theme.primaryLight, borderWidth: 1.5, borderColor: theme.primary },
    menuReactionEmoji: { fontSize: 22 },
    menuPreview: {
      fontSize: 12,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    menuActionText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
  });
}
