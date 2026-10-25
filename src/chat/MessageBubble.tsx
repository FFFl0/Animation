import { useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';
import { Attachment } from './attachments';
import { formatClock } from './messageGroups';

/** The shape a bubble needs. Direct messages and group messages both satisfy
 * it, so one bubble renders either. */
export type BubbleMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  replyToId: string | null;
  /** Direct messages only — a group message has no single recipient to have
   * read it, and the delivery check is hidden when this is absent. */
  read?: boolean;
  /** Set once the message has been rewritten; shows the "edited" marker. */
  editedAt?: string | null;
  /** Name of the original author, when this is a forwarded copy. */
  forwardedFrom?: string | null;
  /** A photo or file sent with the message; the body is then its caption. */
  attachment?: Attachment | null;
};

/** How far the bubble must travel before releasing counts as "reply". */
const REPLY_THRESHOLD = 55;
const MAX_DRAG = 90;
const DOUBLE_TAP_MS = 280;

export type ReactionGroup = { emoji: string; count: number; mine: boolean };

/** Shown when a file arrived without a name — rare, but a nameless row with
 * nothing in it reads as broken. */
const fileFallbackName = '\u2014';

/**
 * How tall a photo's bubble is drawn.
 *
 * The real ratio comes from the row, so the space is reserved before the
 * picture arrives and the history does not jump when it does. A file picked
 * through the document picker has no dimensions recorded, so it falls back to
 * something close to a phone photo and is corrected by `resizeMode="cover"`.
 * Very tall or very wide pictures are clamped: a panorama should not become a
 * two-pixel strip, and a tower should not fill three screens.
 */
function aspectRatioOf(attachment: Attachment): number {
  const { width, height } = attachment;
  if (!width || !height) return 4 / 3;
  return Math.min(Math.max(width / height, 0.6), 2.2);
}

type Props<T extends BubbleMessage> = {
  message: T;
  isMine: boolean;
  /** The message this one answers, when it's still in the loaded history. */
  repliedTo: BubbleMessage | null;
  /** Display name of whoever wrote `repliedTo` ("You" / the sender's name). */
  repliedToLabel: string;
  /** Who wrote this one, shown above the bubble in a group where "not me"
   * isn't enough to identify them. Omitted in a one-to-one chat. */
  authorLabel?: string;
  reactions: ReactionGroup[];
  /** First of a run from the same author: carries the name in a group. */
  isFirstInGroup: boolean;
  /** Last of the run: the only one with the pointed "tail" corner. */
  isLastInGroup: boolean;
  /** Localised "edited" marker, shown next to the time. */
  editedLabel: string;
  /** Localised "Forwarded from <name>" line. */
  forwardedLabel: (name: string) => string;
  /** Signed link to the attachment, or null while it is still being fetched
   * (or when it could not be signed at all). */
  attachmentUrl: string | null;
  /** Size under a file's name, already localised. */
  attachmentSizeLabel: string;
  /** Opens a photo full screen, or hands a file to the system. */
  onOpenAttachment: (message: T) => void;
  /** Whether this message's voice note is the one currently playing. */
  voicePlaying: boolean;
  /** How far through it playback is, 0 to 1. */
  voiceProgress: number;
  /** Elapsed time while it plays, its full length otherwise. */
  voiceTimeLabel: string;
  /** What the attachment's control does, for a screen reader — opening a
   * photo, downloading a file, or playing and pausing a voice note. */
  attachmentActionLabel: string;
  onToggleVoice: (message: T) => void;
  onReply: (message: T) => void;
  onQuickReact: (message: T) => void;
  onToggleReaction: (message: T, emoji: string) => void;
  onLongPress: (message: T) => void;
  onJumpToReplied: (messageId: string) => void;
  highlighted: boolean;
};

export default function MessageBubble<T extends BubbleMessage>({
  message,
  isMine,
  repliedTo,
  repliedToLabel,
  authorLabel,
  reactions,
  isFirstInGroup,
  isLastInGroup,
  editedLabel,
  forwardedLabel,
  attachmentUrl,
  attachmentSizeLabel,
  onOpenAttachment,
  voicePlaying,
  voiceProgress,
  voiceTimeLabel,
  attachmentActionLabel,
  onToggleVoice,
  onReply,
  onQuickReact,
  onToggleReaction,
  onLongPress,
  onJumpToReplied,
  highlighted,
}: Props<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const translateX = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);

  // PanResponder rather than a gesture library: this only needs a single
  // horizontal drag, and claiming the gesture solely when it is clearly
  // sideways leaves the parent ScrollView's vertical scrolling untouched.
  // It has to claim on the *capture* phase, otherwise the Pressable holding
  // the bubble content becomes the responder first and the drag never starts.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        if (g.dx <= 0) return;
        // Resistance past the threshold so the bubble never slides far.
        const eased = g.dx > REPLY_THRESHOLD ? REPLY_THRESHOLD + (g.dx - REPLY_THRESHOLD) * 0.35 : g.dx;
        translateX.setValue(Math.min(eased, MAX_DRAG));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx >= REPLY_THRESHOLD) onReply(message);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false, friction: 7, tension: 70 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false, friction: 7, tension: 70 }).start();
      },
    })
  ).current;

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onQuickReact(message);
      return;
    }
    lastTapRef.current = now;
  };

  const replyHintOpacity = translateX.interpolate({
    inputRange: [0, REPLY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.replyHint, { opacity: replyHintOpacity }]}>
        <Icon name="reply" size={16} color={theme.primary} />
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        <Pressable
          onPress={handlePress}
          onLongPress={() => onLongPress(message)}
          delayLongPress={280}
          style={[styles.row, isMine && styles.rowMine]}
        >
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
              // Only the bubble that closes a run gets the tail; the ones
              // above it stay fully rounded, so a run reads as one block.
              isLastInGroup && (isMine ? styles.tailMine : styles.tailTheirs),
              highlighted && styles.bubbleHighlighted,
            ]}
          >
            {authorLabel && !isMine && isFirstInGroup && <Text style={styles.author}>{authorLabel}</Text>}

            {!!message.forwardedFrom && (
              <Text style={[styles.forwarded, isMine && styles.forwardedMine]} numberOfLines={1}>
                {forwardedLabel(message.forwardedFrom)}
              </Text>
            )}

            {repliedTo && (
              <Pressable onPress={() => onJumpToReplied(repliedTo.id)} style={styles.quote}>
                <View style={[styles.quoteBar, { backgroundColor: isMine ? theme.onPrimary : theme.primary }]} />
                <View style={styles.quoteTextWrap}>
                  <Text style={[styles.quoteAuthor, isMine && styles.textOnPrimary]} numberOfLines={1}>
                    {repliedToLabel}
                  </Text>
                  <Text style={[styles.quoteBody, isMine && styles.textOnPrimary]} numberOfLines={1}>
                    {repliedTo.body}
                  </Text>
                </View>
              </Pressable>
            )}

            {message.attachment?.kind === 'image' && (
              // The ratio goes on the wrapper and the picture fills it: an
              // aspectRatio set on an Image is read as its whole size on
              // Android, so the bubble would be sized by the ratio alone.
              <Pressable
                onPress={() => onOpenAttachment(message)}
                accessibilityRole="button"
                accessibilityLabel={attachmentActionLabel}
                style={[
                  styles.photo,
                  !message.body && styles.photoAlone,
                  { aspectRatio: aspectRatioOf(message.attachment) },
                ]}
              >
                {attachmentUrl ? (
                  <Image source={{ uri: attachmentUrl }} style={styles.photoImage} resizeMode="cover" />
                ) : (
                  <View style={styles.photoLoading}>
                    <ActivityIndicator color={isMine ? theme.onPrimary : theme.primary} />
                  </View>
                )}
              </Pressable>
            )}

            {message.attachment?.kind === 'voice' && (
              <Pressable
                onPress={() => onToggleVoice(message)}
                accessibilityRole="button"
                accessibilityLabel={attachmentActionLabel}
                style={styles.voice}
              >
                <View style={[styles.voiceButton, isMine && styles.voiceButtonMine]}>
                  <Icon
                    name={voicePlaying ? 'pause' : 'play'}
                    size={14}
                    color={isMine ? theme.primary : theme.onPrimary}
                  />
                </View>
                <View style={styles.voiceTrack}>
                  <View style={[styles.voiceTrackBase, isMine && styles.voiceTrackBaseMine]} />
                  <View
                    style={[
                      styles.voiceTrackFill,
                      isMine && styles.voiceTrackFillMine,
                      // Clamped rather than trusted: a status update can
                      // report a position past a duration that is still being
                      // read, which would push the fill out of its track.
                      { width: `${Math.min(100, Math.max(0, voiceProgress * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.voiceTime, isMine && styles.voiceTimeMine]}>{voiceTimeLabel}</Text>
              </Pressable>
            )}

            {message.attachment?.kind === 'file' && (
              <Pressable
                onPress={() => onOpenAttachment(message)}
                accessibilityRole="button"
                accessibilityLabel={attachmentActionLabel}
                style={[styles.file, isMine ? styles.fileMine : styles.fileTheirs]}
              >
                <View style={[styles.fileIcon, isMine && styles.fileIconMine]}>
                  <Icon name="file" size={17} color={isMine ? theme.onPrimary : theme.primary} />
                </View>
                <View style={styles.fileText}>
                  <Text style={[styles.fileName, isMine && styles.textOnPrimary]} numberOfLines={1}>
                    {message.attachment.name ?? fileFallbackName}
                  </Text>
                  {!!attachmentSizeLabel && (
                    <Text style={[styles.fileSize, isMine && styles.fileSizeMine]}>{attachmentSizeLabel}</Text>
                  )}
                </View>
                <Icon name="download" size={16} color={isMine ? theme.onPrimary : theme.textMuted} />
              </Pressable>
            )}

            {!!message.body && <Text style={[styles.body, isMine && styles.textOnPrimary]}>{message.body}</Text>}

            <View style={styles.metaRow}>
              {!!message.editedAt && (
                <Text style={[styles.time, isMine && styles.timeMine]}>{editedLabel}</Text>
              )}
              <Text style={[styles.time, isMine && styles.timeMine]}>{formatClock(message.createdAt)}</Text>
              {isMine && message.read !== undefined && (
                // One tick means it reached the server, two mean the other
                // side has opened the conversation — the second is tucked
                // behind the first the way a messenger draws it.
                <View style={styles.ticks}>
                  <Icon name="check" size={11} color={theme.onPrimary} strokeWidth={2.6} />
                  {message.read && (
                    <View style={styles.tickSecond}>
                      <Icon name="check" size={11} color={theme.onPrimary} strokeWidth={2.6} />
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </Pressable>

        {reactions.length > 0 && (
          <View style={[styles.reactionsRow, isMine && styles.reactionsRowMine]}>
            {reactions.map((r) => (
              <Pressable
                key={r.emoji}
                onPress={() => onToggleReaction(message, r.emoji)}
                style={[styles.reactionChip, r.mine && styles.reactionChipMine]}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                {r.count > 1 && <Text style={[styles.reactionCount, r.mine && styles.reactionCountMine]}>{r.count}</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { justifyContent: 'center' },
    replyHint: {
      position: 'absolute',
      left: 4,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    row: { flexDirection: 'row', justifyContent: 'flex-start' },
    rowMine: { justifyContent: 'flex-end' },
    // userSelect matters on web only: without it the browser starts
    // selecting the message text instead of letting the drag through.
    bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingVertical: 8, paddingHorizontal: 14, userSelect: 'none' },
    bubbleTheirs: { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border },
    bubbleMine: { backgroundColor: theme.primary },
    tailTheirs: { borderBottomLeftRadius: 4 },
    tailMine: { borderBottomRightRadius: 4 },
    bubbleHighlighted: { borderWidth: 2, borderColor: theme.ink },
    author: { fontSize: 11, fontFamily: fontFamily('800'), color: theme.primary, marginBottom: 2 },
    quote: { flexDirection: 'row', gap: 6, marginBottom: 5, opacity: 0.85 },
    quoteBar: { width: 2.5, borderRadius: 2 },
    quoteTextWrap: { flex: 1 },
    quoteAuthor: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.primary },
    quoteBody: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted },
    body: { fontSize: 14, fontFamily: fontFamily('500'), color: theme.text, lineHeight: 19 },
    textOnPrimary: { color: theme.onPrimary },
    // A fixed width, not a share of the bubble: the bubble shrinks to fit its
    // content, so an aspect-ratio box inside it has no width to be a share of
    // and would collapse. 232 is the widest photo that still leaves the
    // bubble inside its 78% cap on a phone.
    photo: {
      width: 232,
      marginBottom: 6,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: theme.background,
    },
    photoAlone: { marginBottom: 0 },
    photoImage: { width: '100%', height: '100%' },
    photoLoading: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    voice: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 190, paddingVertical: 2, marginBottom: 2 },
    voiceButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    voiceButtonMine: { backgroundColor: theme.onPrimary },
    voiceTrack: { flex: 1, height: 4, justifyContent: 'center' },
    voiceTrackBase: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: theme.border },
    voiceTrackBaseMine: { backgroundColor: 'rgba(255,255,255,0.35)' },
    voiceTrackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: theme.primary },
    voiceTrackFillMine: { backgroundColor: theme.onPrimary },
    voiceTime: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted, minWidth: 32, textAlign: 'right' },
    voiceTimeMine: { color: 'rgba(255,255,255,0.85)' },
    file: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: radius.md,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 4,
      minWidth: 180,
    },
    fileTheirs: { backgroundColor: theme.background },
    fileMine: { backgroundColor: 'rgba(255,255,255,0.18)' },
    fileIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryLight,
    },
    fileIconMine: { backgroundColor: 'rgba(255,255,255,0.22)' },
    fileText: { flex: 1 },
    fileName: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text },
    fileSize: { fontSize: 10, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    fileSizeMine: { color: 'rgba(255,255,255,0.8)' },
    forwarded: { fontSize: 10, fontFamily: fontFamily('700'), color: theme.primary, marginBottom: 3 },
    forwardedMine: { color: 'rgba(255,255,255,0.9)' },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
    ticks: { flexDirection: 'row', alignItems: 'center' },
    // Pulled left so the two ticks overlap instead of reading as two
    // separate marks.
    tickSecond: { marginLeft: -6 },
    time: { fontSize: 9, fontFamily: fontFamily('500'), color: theme.textMuted },
    timeMine: { color: 'rgba(255,255,255,0.75)' },
    reactionsRow: { flexDirection: 'row', gap: 4, marginTop: -4, marginLeft: 8 },
    reactionsRowMine: { justifyContent: 'flex-end', marginLeft: 0, marginRight: 8 },
    reactionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    reactionChipMine: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    reactionEmoji: { fontSize: 12 },
    reactionCount: { fontSize: 10, fontFamily: fontFamily('700'), color: theme.textMuted },
    reactionCountMine: { color: theme.primary },
  });
}
