import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Rating } from '../data/rating';
import { EMPTY_VICTORIES, Victories } from '../data/victories';
import { formatSeconds } from '../quiz/answerTiming';
import { useT } from '../i18n/strings';
import Icon from './Icon';
import PillButton from './PillButton';
import ProgressBar from './ProgressBar';
import { useCountUp } from './useCountUp';

type Props = {
  rating: Rating;
  /** Another player's card: the points alone, without the workings. */
  compact?: boolean;
  /** What the victories were, for the line that explains them. */
  victories?: Victories;
  /** Where the other half of the points is earned. Both are left out on
   * another player's card, where there is nothing for the reader to play. */
  onOpenTournament?: () => void;
  onOpenBattle?: () => void;
};

/**
 * The rating, and what it is made of.
 *
 * Both halves are shown because neither is obvious from the number: how
 * much of the game has been beaten, and how quickly it is being answered.
 * A player who wants more points can read off which of the two to go and
 * work on.
 */
export default function RatingCard({
  rating,
  compact = false,
  victories = EMPTY_VICTORIES,
  onOpenTournament,
  onOpenBattle,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const points = useCountUp(rating.points);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Icon name="trophy" size={16} color={theme.primary} />
          <Text style={styles.title}>{t('rating.title')}</Text>
        </View>
        <Text style={styles.points}>{points}</Text>
      </View>

      {!compact && (
        <>
          <ProgressBar
            progress={rating.outOf > 0 ? rating.cleared / rating.outOf : 0}
            color={theme.primary}
            height={7}
          />
          <View style={styles.legend}>
            <Text style={styles.legendText}>{t('rating.cleared', rating.cleared, rating.outOf)}</Text>
            <Text style={styles.legendText}>
              {rating.averageMs === null
                ? t('rating.noAverage')
                : t('rating.average', formatSeconds(rating.averageMs))}
              {'  '}
              <Text style={styles.multiplier}>{t('rating.multiplier', rating.multiplier.toFixed(1))}</Text>
            </Text>
          </View>
          {/* The other half of the points, and the two places it comes
              from. Shown even at nothing, because a player who has never
              played either has no other way of finding out they count. */}
          <View style={styles.victoryRow}>
            <Icon name="swords" size={14} color={theme.primary} />
            <Text style={styles.victoryText}>
              {victories.runs + victories.battles === 0
                ? t('rating.victoriesNone')
                : t('rating.victories', rating.fromVictories, victories.runs, victories.battles)}
            </Text>
          </View>

          <Text style={styles.hint}>{t('rating.hint')}</Text>

          {(onOpenTournament || onOpenBattle) && (
            <View style={styles.actions}>
              {onOpenTournament && (
                <PillButton
                  title={t('rating.playTournament')}
                  variant="ink"
                  fullWidth={false}
                  style={styles.action}
                  onPress={onOpenTournament}
                />
              )}
              {onOpenBattle && (
                <PillButton
                  title={t('rating.playBattle')}
                  variant="outline"
                  fullWidth={false}
                  style={styles.action}
                  onPress={onOpenBattle}
                />
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      gap: 10,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    title: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    points: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.primary },
    legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    legendText: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
    multiplier: { fontFamily: fontFamily('800'), color: theme.primary },
    victoryRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    victoryText: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.text },
    hint: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted },
    actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
    action: { flex: 1 },
  });
}
