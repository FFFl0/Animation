import { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';
import { ChatMessage } from './chatApi';

/** How far the bubble must travel before releasing counts as "reply". */
const REPLY_THRESHOLD = 55;
const MAX_DRAG = 90;
const DOUBLE_TAP_MS = 280;

export type ReactionGroup = { emoji: string; count: number; mine: boolean };

type Props = {
  message: ChatMessage;
  isMine: boolean;
  /** The message this one answers, when it's still in the loaded history. */
  repliedTo: ChatMessage | null;
  /** Display name of whoever wrote `repliedTo` ("You" / the friend's name). */
  repliedToLabel: string;
  reactions: ReactionGroup[];
  onReply: (message: ChatMessage) => void;
  onQuickReact: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
  onLongPress: (message: ChatMessage) => void;
  onJumpToReplied: (messageId: string) => void;
  highlighted: boolean;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function MessageBubble({
  message,
  isMine,
  repliedTo,
  repliedToLabel,
  reactions,
  onReply,
  onQuickReact,
  onToggleReaction,
  onLongPress,
  onJumpToReplied,
  highlighted,
}: Props) {
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
              highlighted && styles.bubbleHighlighted,
            ]}
          >
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

            <Text style={[styles.body, isMine && styles.textOnPrimary]}>{message.body}</Text>

            <View style={styles.metaRow}>
              <Text style={[styles.time, isMine && styles.timeMine]}>{formatTime(message.createdAt)}</Text>
              {isMine && (
                <Icon name="check" size={11} color={message.read ? theme.onPrimary : 'rgba(255,255,255,0.55)'} strokeWidth={2.6} />
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
    bubbleTheirs: { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border, borderBottomLeftRadius: 4 },
    bubbleMine: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
    bubbleHighlighted: { borderWidth: 2, borderColor: theme.ink },
    quote: { flexDirection: 'row', gap: 6, marginBottom: 5, opacity: 0.85 },
    quoteBar: { width: 2.5, borderRadius: 2 },
    quoteTextWrap: { flex: 1 },
    quoteAuthor: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.primary },
    quoteBody: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted },
    body: { fontSize: 14, fontFamily: fontFamily('500'), color: theme.text, lineHeight: 19 },
    textOnPrimary: { color: theme.onPrimary },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
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
