import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
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
import EmojiPicker from './EmojiPicker';

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
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const searchRef = useRef<TextInput>(null);
  // Where each message sits in the scroll view, so a search hit can be
  // scrolled to. Filled as rows lay out; a message that has never been on
  // screen simply isn't in here yet, and the scroll is skipped.
  const positionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    // Jumping to the bottom while reading a search hit would undo the jump
    // that just put it on screen.
    if (!searching) scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, searching]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () => (needle ? messages.filter((m) => m.body.toLowerCase().includes(needle)).map((m) => m.id) : []),
    [messages, needle]
  );

  // Newest first: a search in a chat is usually looking for something recent.
  const orderedMatches = useMemo(() => [...matches].reverse(), [matches]);
  const currentMatchId = orderedMatches[matchIndex] ?? null;

  useEffect(() => {
    setMatchIndex(0);
  }, [needle]);

  useEffect(() => {
    if (!currentMatchId) return;
    setHighlightedId(currentMatchId);
    const y = positionsRef.current.get(currentMatchId);
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(y - 80, 0), animated: true });
  }, [currentMatchId]);

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
    setHighlightedId(null);
  };

  const stepMatch = (delta: number) => {
    if (orderedMatches.length === 0) return;
    setMatchIndex((i) => (i + delta + orderedMatches.length) % orderedMatches.length);
  };

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
          {searching ? (
            <View style={styles.searchRow}>
              <Icon name="search" size={15} color={theme.textMuted} />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                placeholder={t('chat.searchPlaceholder')}
                placeholderTextColor={theme.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
              />
              {needle.length > 0 && (
                <>
                  <Text style={styles.searchCount}>
                    {orderedMatches.length === 0
                      ? t('chat.searchNoMatches')
                      : t('chat.searchPosition', matchIndex + 1, orderedMatches.length)}
                  </Text>
                  <SoundTouchable
                    onPress={() => stepMatch(1)}
                    accessibilityRole="button"
                    accessibilityLabel={t('chat.searchOlder')}
                  >
                    <Icon name="chevronRight" size={16} color={theme.textMuted} />
                  </SoundTouchable>
                </>
              )}
              <SoundTouchable onPress={closeSearch} accessibilityRole="button" accessibilityLabel={t('chat.searchClose')}>
                <Icon name="close" size={16} color={theme.textMuted} />
              </SoundTouchable>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <View style={styles.headerContent}>{header}</View>
              <SoundTouchable
                onPress={() => setSearching(true)}
                accessibilityRole="button"
                accessibilityLabel={t('chat.searchLabel')}
                style={styles.searchButton}
              >
                <Icon name="search" size={17} color={theme.textMuted} />
              </SoundTouchable>
            </View>
          )}
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.list}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>{emptyText}</Text>
          ) : (
            messages.map((m) => {
              const repliedTo = m.replyToId ? messages.find((x) => x.id === m.replyToId) ?? null : null;
              return (
                <View key={m.id} onLayout={(e) => positionsRef.current.set(m.id, e.nativeEvent.layout.y)}>
                <MessageBubble
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
                </View>
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

        <View style={styles.inputRow}>
          <SoundTouchable
            style={styles.emojiToggle}
            onPress={() =>
              setShowEmoji((v) => {
                if (!v) Keyboard.dismiss();
                return !v;
              })
            }
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

        {showEmoji && <EmojiPicker onPick={(emoji) => setDraft((prev) => prev + emoji)} />}
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
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerContent: { flex: 1 },
    searchButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: fontFamily('500'), color: theme.text, padding: 0 },
    searchCount: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted },
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
