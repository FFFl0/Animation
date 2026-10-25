import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import MessageBubble, { BubbleMessage, ReactionGroup } from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import ForwardSheet from './ForwardSheet';
import { ChatSummary, sendToChat } from './chatsApi';
import {
  Attachment,
  MAX_ATTACHMENT_BYTES,
  MediaScope,
  PendingAttachment,
  formatFileSize,
} from './attachments';
import { pickChatFile, pickChatPhoto } from './attachmentPicker';
import { uploadAttachment } from './attachmentStorage';
import { useAttachmentUrls } from './useAttachmentUrls';
import { buildChatItems, firstUnreadIdOf, formatDayLabel } from './messageGroups';

/** Offered in the long-press menu and by double-tap (the first one). */
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

/** How far from the bottom the history has to be scrolled before the
 * jump-to-latest button appears. */
const AT_BOTTOM_SLACK = 140;

type Props<T extends BubbleMessage> = {
  /** Rendered under the back button — an avatar and a name, or a group title. */
  header: ReactNode;
  /** The line under the name: presence, or who is typing. Hidden when empty. */
  subtitle?: string | null;
  onBack: () => void;
  /**
   * Identifies the conversation on screen. Changing it resets the unread
   * line and the scroll position, and it names the channel the typing
   * indicator rides on — a friend's id for a direct chat, the group's id
   * for a group.
   */
  conversationKey: string;
  /** Which folder this conversation's attachments are stored under. */
  mediaScope: MediaScope;
  messages: T[];
  meId: string;
  /** The current user's own display name, used when forwarding something
   * they wrote — the quote line needs a name, not "You". */
  myName: string;
  /** Display name for a sender, used for quote lines and (in groups) above
   * other people's bubbles. */
  labelFor: (senderId: string) => string;
  /** Groups need the author on every incoming bubble; a one-to-one chat
   * doesn't, since "not mine" already says who wrote it. */
  showAuthors?: boolean;
  emptyText: string;
  reactionsFor: (messageId: string) => ReactionGroup[];
  myReactionFor: (messageId: string) => string | null;
  onSend: (text: string, replyToId: string | null, attachment: Attachment | null) => void | Promise<void>;
  /** Rewrites a message in place. */
  onEdit: (message: T, text: string) => void | Promise<void>;
  canEdit: (message: T) => boolean;
  onToggleReaction: (messageId: string, emoji: string) => void | Promise<void>;
  onDelete: (message: T) => void | Promise<void>;
  canDelete: (message: T) => boolean;
  /** Called as the composer is typed into, so the other side can be told. */
  onTyping?: () => void;
};

/**
 * The chat surface itself — history, swipe-to-reply, reactions, the composer
 * and the long-press menu. It owns no data: direct and group chats each keep
 * their own state and hand it in, so the two stay one screen's worth of code
 * instead of two nearly identical ones.
 */
export default function ChatRoom<T extends BubbleMessage>({
  header,
  subtitle,
  onBack,
  conversationKey,
  mediaScope,
  messages,
  meId,
  myName,
  labelFor,
  showAuthors = false,
  emptyText,
  reactionsFor,
  myReactionFor,
  onSend,
  onEdit,
  canEdit,
  onToggleReaction,
  onDelete,
  canDelete,
  onTyping,
}: Props<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<T | null>(null);
  const [editing, setEditing] = useState<T | null>(null);
  const [menuFor, setMenuFor] = useState<T | null>(null);
  const [forwarding, setForwarding] = useState<T | null>(null);
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [attachSheet, setAttachSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; name: string | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadAnchor, setUnreadAnchor] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const searchRef = useRef<TextInput>(null);
  // Where each message sits in the scroll view, so a search hit can be
  // scrolled to. Filled as rows lay out; a message that has never been on
  // screen simply isn't in here yet, and the scroll is skipped.
  const positionsRef = useRef(new Map<string, number>());
  // Which conversation the unread line was already placed for. The line is
  // decided once, from the history as it was when the chat opened — messages
  // that arrive while it is open belong below the fold, not behind a second
  // divider.
  const anchoredRef = useRef('');

  useEffect(() => {
    // Jumping to the bottom while reading a search hit would undo the jump
    // that just put it on screen, and jumping while the person has scrolled
    // up to read history would yank the page out from under them.
    if (!searching && atBottom) scrollRef.current?.scrollToEnd({ animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, searching]);

  useEffect(() => {
    setUnreadAnchor(null);
    setReplyTo(null);
    setEditing(null);
    setPending(null);
    setAtBottom(true);
    positionsRef.current.clear();
  }, [conversationKey]);

  useEffect(() => {
    if (anchoredRef.current === conversationKey) return;
    if (messages.length === 0) return;
    anchoredRef.current = conversationKey;
    setUnreadAnchor(firstUnreadIdOf(messages, meId));
  }, [conversationKey, messages, meId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () => (needle ? messages.filter((m) => m.body.toLowerCase().includes(needle)).map((m) => m.id) : []),
    [messages, needle]
  );

  // Newest first: a search in a chat is usually looking for something recent.
  const orderedMatches = useMemo(() => [...matches].reverse(), [matches]);
  const currentMatchId = orderedMatches[matchIndex] ?? null;

  const items = useMemo(() => buildChatItems(messages, unreadAnchor), [messages, unreadAnchor]);
  const attachmentPaths = useMemo(
    () => messages.map((m) => m.attachment?.path).filter((path): path is string => !!path),
    [messages]
  );
  const attachmentUrls = useAttachmentUrls(attachmentPaths);
  const unreadCount = useMemo(
    () => messages.filter((m) => m.senderId !== meId && m.read === false).length,
    [messages, meId]
  );

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

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const fromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setAtBottom(fromBottom < AT_BOTTOM_SLACK);
  };

  const jumpToBottom = () => {
    setAtBottom(true);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    const text = draft.trim();

    if (editing) {
      if (!text) return;
      const target = editing;
      setDraft('');
      setEditing(null);
      onEdit(target, text);
      return;
    }

    // Either half is enough to be a message: a photo needs no caption, and a
    // caption needs no photo.
    if (!text && !pending) return;
    if (uploading) return;

    let attachment: Attachment | null = null;
    if (pending) {
      setUploading(true);
      attachment = await uploadAttachment(mediaScope, pending);
      setUploading(false);
      // The draft and the picked file are deliberately left in place, so a
      // failed upload can be retried without picking it all over again.
      if (!attachment) {
        setToast(t('chat.attachFailed'));
        return;
      }
    }

    const replyId = replyTo?.id ?? null;
    setDraft('');
    setReplyTo(null);
    setPending(null);
    onSend(text, replyId, attachment);
  };

  const pickAttachment = async (what: 'photo' | 'file') => {
    setAttachSheet(false);
    const result = what === 'photo' ? await pickChatPhoto() : await pickChatFile();

    if (result.status === 'ok') {
      setEditing(null);
      setPending(result.attachment);
      return;
    }
    if (result.status === 'canceled') return;
    if (result.status === 'tooLarge') {
      setToast(t('chat.attachTooLarge', formatFileSize(MAX_ATTACHMENT_BYTES, language)));
      return;
    }
    setToast(result.status === 'permissionDenied' ? t('chat.attachNoPermission') : t('chat.attachFailed'));
  };

  /**
   * A photo opens in the viewer; anything else is handed to the system by its
   * signed link, which downloads it — the app has no business rendering an
   * arbitrary file, and the object is stored opaque for exactly that reason.
   */
  const openAttachment = (message: T) => {
    const attachment = message.attachment;
    if (!attachment) return;
    const url = attachmentUrls.get(attachment.path);
    if (!url) {
      setToast(t('chat.attachUnavailable'));
      return;
    }
    if (attachment.kind === 'image') {
      setViewer({ url, name: attachment.name });
      return;
    }
    Linking.openURL(url).catch(() => setToast(t('chat.attachOpenFailed')));
  };

  const handleDraftChange = (text: string) => {
    setDraft(text);
    if (text.length > 0) onTyping?.();
  };

  const handleReply = (message: T) => {
    setEditing(null);
    setReplyTo(message);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const startEditing = (message: T) => {
    setReplyTo(null);
    setEditing(message);
    setDraft(message.body);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const cancelEditing = () => {
    setEditing(null);
    setDraft('');
  };

  const copyMessage = async (message: T) => {
    await Clipboard.setStringAsync(message.body);
    setToast(t('chat.copied'));
  };

  /** A forward keeps the original author's name, so passing one along a chain
   * still credits whoever actually wrote it rather than the last relay. */
  const forwardTo = async (chat: ChatSummary) => {
    const message = forwarding;
    setForwarding(null);
    if (!message) return;
    const origin = message.forwardedFrom ?? (message.senderId === meId ? myName : labelFor(message.senderId));
    const ok = await sendToChat(chat, meId, message.body, origin, message.attachment ?? null);
    setToast(ok ? t('chat.forwarded', chat.title) : t('chat.forwardFailed'));
  };

  /** Flashes the quoted message's border so a tapped quote is findable
   * without scrolling the list programmatically. */
  const jumpToMessage = (messageId: string) => {
    setHighlightedId(messageId);
    const y = positionsRef.current.get(messageId);
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(y - 80, 0), animated: true });
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
              <View style={styles.headerContent}>
                {header}
                {!!subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
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

        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.list}
            onScroll={handleScroll}
            scrollEventThrottle={64}
          >
            {items.length === 0 ? (
              <Text style={styles.emptyText}>{emptyText}</Text>
            ) : (
              items.map((item) => {
                if (item.kind === 'date') {
                  return (
                    <View key={item.key} style={styles.dayRow}>
                      <View style={styles.dayPill}>
                        <Text style={styles.dayText}>{formatDayLabel(item.at, language)}</Text>
                      </View>
                    </View>
                  );
                }

                if (item.kind === 'unread') {
                  return (
                    <View key={item.key} style={styles.unreadRow}>
                      <View style={styles.unreadLine} />
                      <Text style={styles.unreadText}>{t('chat.unreadDivider')}</Text>
                      <View style={styles.unreadLine} />
                    </View>
                  );
                }

                const m = item.message;
                const repliedTo = m.replyToId ? messages.find((x) => x.id === m.replyToId) ?? null : null;
                return (
                  <View
                    key={item.key}
                    style={item.isFirstInGroup ? styles.blockStart : styles.blockContinues}
                    onLayout={(e) => positionsRef.current.set(m.id, e.nativeEvent.layout.y)}
                  >
                    <MessageBubble
                      message={m}
                      isMine={m.senderId === meId}
                      repliedTo={repliedTo}
                      repliedToLabel={repliedTo ? nameFor(repliedTo.senderId) : ''}
                      authorLabel={showAuthors ? labelFor(m.senderId) : undefined}
                      reactions={reactionsFor(m.id)}
                      isFirstInGroup={item.isFirstInGroup}
                      isLastInGroup={item.isLastInGroup}
                      editedLabel={t('chat.edited')}
                      forwardedLabel={(name: string) => t('chat.forwardedFrom', name)}
                      attachmentUrl={m.attachment ? attachmentUrls.get(m.attachment.path) ?? null : null}
                      attachmentSizeLabel={formatFileSize(m.attachment?.size ?? null, language)}
                      onOpenAttachment={openAttachment}
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

          {!atBottom && (
            <SoundTouchable
              style={styles.jumpButton}
              onPress={jumpToBottom}
              accessibilityRole="button"
              accessibilityLabel={t('chat.jumpToLatest')}
            >
              <Icon name="chevronRight" size={18} color={theme.text} />
              {unreadCount > 0 && (
                <View style={[styles.jumpBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.jumpBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </SoundTouchable>
          )}

          {!!toast && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}
        </View>

        {pending && (
          <View style={styles.replyBar}>
            {pending.kind === 'image' ? (
              <Image source={{ uri: pending.uri }} style={styles.pendingThumb} resizeMode="cover" />
            ) : (
              <View style={styles.pendingIcon}>
                <Icon name="file" size={18} color={theme.primary} />
              </View>
            )}
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarTitle}>
                {pending.kind === 'image' ? t('chat.attachPhoto') : t('chat.attachFile')}
              </Text>
              <Text style={styles.replyBarBody} numberOfLines={1}>
                {[pending.name, formatFileSize(pending.size, language)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <SoundTouchable
              onPress={() => setPending(null)}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachCancel')}
            >
              <Icon name="close" size={16} color={theme.textMuted} />
            </SoundTouchable>
          </View>
        )}

        {editing && (
          <View style={styles.replyBar}>
            <View style={styles.replyBarAccent} />
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarTitle}>{t('chat.editingTitle')}</Text>
              <Text style={styles.replyBarBody} numberOfLines={1}>
                {/* A photo sent without a caption has no body to preview, so
                    the bar names the attachment instead of showing a gap. */}
                {editing.body ||
                  (editing.attachment?.kind === 'image' ? t('chat.attachPhoto') : t('chat.attachFile'))}
              </Text>
            </View>
            <SoundTouchable onPress={cancelEditing} accessibilityRole="button" accessibilityLabel={t('chat.cancelEdit')}>
              <Icon name="close" size={16} color={theme.textMuted} />
            </SoundTouchable>
          </View>
        )}

        {replyTo && !editing && (
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
            style={styles.attachToggle}
            onPress={() => {
              Keyboard.dismiss();
              setShowEmoji(false);
              setAttachSheet(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('chat.attachLabel')}
          >
            <Icon name="paperclip" size={21} color={theme.textMuted} />
          </SoundTouchable>
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
            onChangeText={handleDraftChange}
            onFocus={() => setShowEmoji(false)}
            onSubmitEditing={handleSend}
            multiline
          />
          <SoundTouchable
            style={styles.sendButton}
            onPress={handleSend}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel={editing ? t('chat.saveEdit') : t('chat.send')}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <Icon name={editing ? 'check' : 'send'} size={17} color={theme.onPrimary} />
            )}
          </SoundTouchable>
        </View>

        {showEmoji && <EmojiPicker onPick={(emoji) => setDraft((prev) => prev + emoji)} />}
      </KeyboardAvoidingView>

      <Modal visible={attachSheet} transparent animationType="fade" onRequestClose={() => setAttachSheet(false)}>
        <Pressable style={styles.attachBackdrop} onPress={() => setAttachSheet(false)}>
          <Pressable style={styles.attachCard} onPress={() => {}}>
            <SoundTouchable style={styles.menuAction} onPress={() => pickAttachment('photo')}>
              <Icon name="image" size={18} color={theme.text} />
              <Text style={styles.menuActionText}>{t('chat.attachPhoto')}</Text>
            </SoundTouchable>
            <SoundTouchable style={styles.menuAction} onPress={() => pickAttachment('file')}>
              <Icon name="file" size={18} color={theme.text} />
              <Text style={styles.menuActionText}>{t('chat.attachFile')}</Text>
            </SoundTouchable>
            <Text style={styles.attachHint}>{t('chat.attachLimit', formatFileSize(MAX_ATTACHMENT_BYTES, language))}</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerRoot}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)} />
          {viewer && <Image source={{ uri: viewer.url }} style={styles.viewerImage} resizeMode="contain" />}
          <View style={styles.viewerBar}>
            <SoundTouchable
              style={styles.viewerButton}
              onPress={() => setViewer(null)}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachClose')}
            >
              <Icon name="close" size={18} color="#FFFFFF" />
            </SoundTouchable>
            <SoundTouchable
              style={styles.viewerButton}
              onPress={() => {
                if (viewer) Linking.openURL(viewer.url).catch(() => setToast(t('chat.attachOpenFailed')));
              }}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachSave')}
            >
              <Icon name="download" size={18} color="#FFFFFF" />
            </SoundTouchable>
          </View>
        </View>
      </Modal>

      <ForwardSheet
        visible={!!forwarding}
        meId={meId}
        excludeId={conversationKey}
        onClose={() => setForwarding(null)}
        onPick={forwardTo}
      />

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

                <SoundTouchable
                  style={styles.menuAction}
                  onPress={() => {
                    const target = menuFor;
                    setMenuFor(null);
                    void copyMessage(target);
                  }}
                >
                  <Icon name="quote" size={18} color={theme.text} />
                  <Text style={styles.menuActionText}>{t('chat.copy')}</Text>
                </SoundTouchable>

                <SoundTouchable
                  style={styles.menuAction}
                  onPress={() => {
                    const target = menuFor;
                    setMenuFor(null);
                    setForwarding(target);
                  }}
                >
                  <Icon name="send" size={18} color={theme.text} />
                  <Text style={styles.menuActionText}>{t('chat.forward')}</Text>
                </SoundTouchable>

                {canEdit(menuFor) && (
                  <SoundTouchable
                    style={styles.menuAction}
                    onPress={() => {
                      const target = menuFor;
                      setMenuFor(null);
                      startEditing(target);
                    }}
                  >
                    <Icon name="edit" size={18} color={theme.text} />
                    <Text style={styles.menuActionText}>{t('chat.edit')}</Text>
                  </SoundTouchable>
                )}

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
    subtitle: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.primary, marginTop: 2 },
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
    // No `gap` here: spacing is per row, so a run of messages from one person
    // can sit tighter than the space between two separate ones.
    list: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
    blockStart: { marginTop: 10 },
    blockContinues: { marginTop: 2 },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', marginTop: 40 },
    dayRow: { alignItems: 'center', marginVertical: 12 },
    dayPill: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    dayText: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted },
    unreadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 4 },
    unreadLine: { flex: 1, height: 1.5, backgroundColor: theme.primary, opacity: 0.35 },
    unreadText: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.primary, textTransform: 'uppercase' },
    jumpButton: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      // The icon is a right chevron turned to point down — the icon set has
      // no downward one, and adding a variant for one button is not worth it.
      transform: [{ rotate: '90deg' }],
    },
    jumpBadge: {
      position: 'absolute',
      top: -6,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      // Cancels the parent's rotation so the number reads upright.
      transform: [{ rotate: '-90deg' }],
    },
    jumpBadgeText: { fontSize: 10, fontFamily: fontFamily('800'), color: '#FFFFFF' },
    toast: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 16,
      alignItems: 'center',
    },
    toastText: {
      fontSize: 12,
      fontFamily: fontFamily('700'),
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.78)',
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 8,
      overflow: 'hidden',
    },
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
    attachToggle: { width: 38, height: 48, alignItems: 'center', justifyContent: 'center' },
    emojiToggle: { width: 42, height: 48, alignItems: 'center', justifyContent: 'center' },
    pendingThumb: { width: 34, height: 34, borderRadius: radius.sm },
    pendingIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'flex-end', padding: 20 },
    attachCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 14,
      marginBottom: 20,
    },
    attachHint: {
      fontSize: 11,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    viewerRoot: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
    // Behind the picture rather than over it, so a tap on the image itself
    // still dismisses while the buttons above stay reachable.
    viewerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    viewerImage: { width: '100%', height: '82%' },
    viewerBar: { position: 'absolute', top: 44, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
    viewerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.18)',
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
    menuAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    menuActionText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
  });
}
