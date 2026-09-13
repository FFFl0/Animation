import { forwardRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import AnimeAvatar from '../components/AnimeAvatar';
import { ToriiIcon } from '../components/SakuraDecor';
import { Avatar } from '../data/avatar';

/** Fixed pixel size rather than a responsive one: this is captured to an
 * image, so it must look the same on a small phone and a tablet. */
export const SHARE_CARD_SIZE = { width: 340, height: 400 };

type Props = {
  theme: Theme;
  username: string;
  avatar: Avatar;
  /** Which category, tier or mode the round was — the bragging context. */
  contextLabel: string;
  score: number;
  total: number;
  percent: number;
  correctLabel: string;
  ofLabel: string;
  recordLabel: string | null;
};

/**
 * The image a player shares. Rendered off-screen and snapshotted, so it takes
 * every colour explicitly instead of reading the theme context — the capture
 * happens outside the normal render tree.
 */
const ShareCard = forwardRef<View, Props>(function ShareCard(
  { theme, username, avatar, contextLabel, score, total, percent, correctLabel, ofLabel, recordLabel },
  ref
) {
  const styles = makeStyles(theme);
  return (
    // `collapsable={false}` keeps Android from flattening the view away
    // before it can be snapshotted; on web it is not a real DOM attribute.
    <View ref={ref} {...(Platform.OS === 'web' ? {} : { collapsable: false })} style={styles.card}>
      <View style={styles.header}>
        <ToriiIcon size={22} color={theme.primary} />
        <Text style={styles.brand}>AnimeQuiz</Text>
      </View>

      <View style={styles.playerRow}>
        <AnimeAvatar avatar={avatar} size={44} name={username} />
        <View style={styles.playerText}>
          <Text style={styles.username} numberOfLines={1}>{username}</Text>
          <Text style={styles.context} numberOfLines={1}>{contextLabel}</Text>
        </View>
      </View>

      <View style={styles.scoreBlock}>
        <Text style={styles.percent}>{percent}%</Text>
        <Text style={styles.score}>
          {score} {ofLabel} {total} {correctLabel}
        </Text>
      </View>

      {recordLabel && (
        <View style={styles.recordPill}>
          <Text style={styles.recordText}>{recordLabel}</Text>
        </View>
      )}
    </View>
  );
});

export default ShareCard;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      ...SHARE_CARD_SIZE,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: theme.primary,
      padding: 24,
      justifyContent: 'space-between',
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brand: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text },
    playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    playerText: { flex: 1 },
    username: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text },
    context: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 1 },
    scoreBlock: { alignItems: 'center' },
    percent: { fontSize: 76, lineHeight: 84, fontFamily: fontFamily('800'), color: theme.primary },
    score: { fontSize: 15, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 2 },
    recordPill: {
      alignSelf: 'center',
      backgroundColor: theme.primaryLight,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    recordText: { fontSize: 13, fontFamily: fontFamily('800'), color: theme.primary },
  });
}
