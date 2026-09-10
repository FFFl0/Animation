import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';
import MessageBubble, { BubbleMessage, ReactionGroup } from './MessageBubble';

const EMOJI = [
  '😀', '😂', '😍', '😎', '🤔', '😭', '😡', '😱',
  '🥳', '😴', '👀', '🙌', '👍', '👎', '🙏', '👋',
  '❤️', '🔥', '✨', '🎉', '💯', '⚡', '🌸', '😊',
];

/** Offered in the long-press menu and by double-tap (the first one). */
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

type Props<T extends BubbleMessage> = {
  /** Rendered under the back button — an avatar and a name, or a group title. */
  header: ReactNode;
  onBack: () => void;
  messages: T[];
  meId: string;
  /** Display name for a sender, used for quote lines and (in groups) above
   * other people's bubbles. */
  labelFor: (senderId: string) => string;
  /** Groups need the author on every incoming bubble; a one-to-one chat
   * doesn't, since "not mine" already says who wrote it. */
  showAuthors?: boolean;
  emptyText: string;
  reactionsFor: (messageId: string) => ReactionGroup[];
  myReactionFor: (messageId: string) => string | null;
  onSend: (text: string, replyToId: string | null) => void | Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => void | Promise<void>;
  onDelete: (message: T) => void | Promise<void>;
  canDelete: (message: T) => boolean;
};

/**
 * The chat surface itself — history, swipe-to-reply, reactions, the composer
 * and the long-press menu. It owns no data: direct and group chats each keep
 * their own state and hand it in, so the two stay one screen's worth of code
 * instead of two nearly identical ones.
 */
export default function ChatRoom<T extends BubbleMessage>({
  header,
  onBack,
  messages,
  meId,
  labelFor,
  showAuthors = false,
  emptyText,
  reactionsFor,
  myReactionFor,
  onSend,
  onToggleReaction,
  onDelete,
  canDelete,
}: Props<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<T | null>(null);
  const [menuFor, setMenuFor] = useState<T | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const replyId = replyTo?.id ?? null;
    setDraft('');
    setReplyTo(null);
    onSend(text, replyId);
  };

  const handleReply = (message: T) => {
    setReplyTo(message);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  /** Flashes the quoted message's border so a tapped quote is findable
   * without scrolling the list programmatically. */
  const jumpToMessage = (messageId: string) => {
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId((id) => (id === messageId ? null : id)), 1200);
  };

  const nameFor = (senderId: string) => (senderId === meId ? t('chat.you') : labelFor(senderId));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('chat.back')} style={styles.backButton}>
            <Text style={styles.backText}>{`‹ ${t('chat.back')}`}</Text>
          </SoundTouchable>
          {header}
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.list}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>{emptyText}</Text>
          ) : (
            messages.map((m) => {
              const repliedTo = m.replyToId ? messages.find((x) => x.id === m.replyToId) ?? null : null;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={m.senderId === meId}
                  repliedTo={repliedTo}
                  repliedToLabel={repliedTo ? nameFor(repliedTo.senderId) : ''}
                  authorLabel={showAuthors ? labelFor(m.senderId) : undefined}
                  reactions={reactionsFor(m.id)}
                  highlighted={highlightedId === m.id}
                  onReply={handleReply}
                  onQuickReact={(msg) => onToggleReaction(msg.id, QUICK_REACTIONS[0])}
                  onToggleReaction={(msg, emoji) => onToggleReaction(msg.id, emoji)}
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
              <Text style={styles.replyBarTitle}>{t('chat.replyingTo', nameFor(replyTo.senderId))}</Text>
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
              <SoundTouchable key={emoji} onPress={() => setDraft((prev) => prev + emoji)} style={styles.emojiButton}>
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
                          onToggleReaction(menuFor.id, emoji);
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

                {canDelete(menuFor) && (
                  <SoundTouchable
                    style={styles.menuAction}
                    onPress={() => {
                      setMenuFor(null);
                      onDelete(menuFor);
                    }}
                  >
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
    emojiToggle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
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
    menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 28 },
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
