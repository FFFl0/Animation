import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES, CategoryId, categoryTitle } from '../data/categories';
import { CATEGORY_BACKGROUNDS } from '../data/categoryImages';
import { STATS_HEADER, STATS_QUOTE } from '../data/statsImages';
import { TIERS } from '../data/difficulty';
import { GAME_MODES, modeTitle } from '../data/modes';
import { categoryStatsKey, modeStatsKey } from '../quiz/statsKey';
import { ModeStat } from '../auth/types';
import Icon, { IconName } from '../components/Icon';
import ImageScrim from '../components/ImageScrim';
import StatRing from '../components/StatRing';
import SoundTouchable from '../sound/SoundTouchable';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

const EMPTY: ModeStat = { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };
/** How many flames the streak row draws before it just shows the number. */
const STREAK_PIPS = 5;

function sumStats(stats: ModeStat[]): ModeStat {
  return stats.reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      bestScore: Math.max(acc.bestScore, s.bestScore),
      totalCorrect: acc.totalCorrect + s.totalCorrect,
      totalQuestions: acc.totalQuestions + s.totalQuestions,
    }),
    EMPTY
  );
}

function accuracyOf(stat: ModeStat): number {
  return stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0;
}

/** What the list under "by category" is showing. */
type Grouping = 'categories' | 'modes';

type Row = {
  key: string;
  title: string;
  icon: IconName;
  color: string;
  colorBg: string;
  art?: CategoryId;
  stat: ModeStat;
};

type Props = {
  onOpenLeaderboard: () => void;
  onOpenCategory: (id: CategoryId) => void;
};

export default function StatsScreen({ onOpenLeaderboard, onOpenCategory }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const [grouping, setGrouping] = useState<Grouping>('categories');
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!profile) return null;

  const overall = sumStats(Object.values(profile.stats));
  const overallAccuracy = accuracyOf(overall);

  const categoryRows: Row[] = CATEGORIES.map((cat) => {
    const keys =
      cat.hardOnly || cat.id === 'mixed'
        ? [categoryStatsKey(cat.id)]
        : TIERS.map((tier) => categoryStatsKey(cat.id, tier.id));
    return {
      key: cat.id,
      title: categoryTitle(cat, language),
      icon: cat.icon,
      color: cat.color,
      colorBg: cat.colorBg,
      art: cat.id,
      stat: sumStats(keys.map((k) => profile.stats[k] ?? EMPTY)),
    };
  });

  const modeRows: Row[] = GAME_MODES.map((mode) => ({
    key: mode.id,
    title: modeTitle(mode, language),
    icon: mode.icon,
    color: theme.primary,
    colorBg: theme.primaryLight,
    stat: profile.stats[modeStatsKey(mode.id)] ?? EMPTY,
  }));

  const rows = grouping === 'categories' ? categoryRows : modeRows;
  const best = Math.max(1, ...rows.map((r) => r.stat.bestScore));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image source={STATS_HEADER} style={styles.heroImage} resizeMode="cover" />
          <ImageScrim direction="left" />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{t('stats.pageTitle')}</Text>
            <Text style={styles.heroNote}>{t('stats.heroNote')}</Text>
          </View>
        </View>

        <SoundTouchable style={styles.leaderboardCard} onPress={onOpenLeaderboard} activeOpacity={0.85}>
          <View style={styles.leaderboardIcon}>
            <Icon name="trophy" size={22} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.leaderboardTitle}>{t('stats.leaderboardTitle')}</Text>
            <Text style={styles.leaderboardSub}>{t('stats.leaderboardSub')}</Text>
          </View>
          <Icon name="chevronRight" size={18} color={theme.textMuted} />
        </SoundTouchable>

        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Icon name="play" size={20} color={theme.primary} />
            <Text style={styles.tileValue}>{overall.gamesPlayed}</Text>
            <Text style={styles.tileLabel}>{t('stats.gamesPlayed')}</Text>
            <View style={styles.tileCorner}>
              <Icon name="stats" size={14} color={theme.textMuted} />
            </View>
          </View>

          <View style={styles.tile}>
            <Icon name="target" size={20} color={theme.primary} />
            <Text style={styles.tileValue}>{overallAccuracy}%</Text>
            <Text style={styles.tileLabel}>{t('stats.accuracy')}</Text>
            <View style={styles.tileCorner}>
              <StatRing percent={overallAccuracy} size={26} color={theme.primary} trackColor={theme.border} />
            </View>
          </View>

          <View style={styles.tile}>
            <Icon name="flame" size={20} color={theme.primary} />
            <Text style={styles.tileValue}>{profile.streak.count}</Text>
            <Text style={styles.tileLabel}>{t('stats.streakDays')}</Text>
            <View style={styles.pips}>
              {Array.from({ length: STREAK_PIPS }, (_, i) => (
                <Icon
                  key={i}
                  name="flame"
                  size={10}
                  color={i < Math.min(profile.streak.count, STREAK_PIPS) ? theme.primary : theme.border}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            {grouping === 'categories' ? t('stats.byCategory') : t('stats.byMode')}
          </Text>
          <SoundTouchable style={styles.picker} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
            <Text style={styles.pickerText}>{t(`stats.grouping.${grouping}`)}</Text>
            <Text style={styles.pickerCaret}>⌄</Text>
          </SoundTouchable>
        </View>

        {rows.map((row) => (
          <StatRow
            key={row.key}
            row={row}
            best={best}
            styles={styles}
            theme={theme}
            t={t}
            onPress={row.art ? () => onOpenCategory(row.art as CategoryId) : undefined}
          />
        ))}

        <View style={styles.quoteCard}>
          <Image source={STATS_QUOTE} style={styles.heroImage} resizeMode="cover" />
          <ImageScrim />
          <Text style={styles.quoteText}>{t('stats.quote')}</Text>
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            {(['categories', 'modes'] as Grouping[]).map((key) => (
              <SoundTouchable
                key={key}
                style={styles.pickerOption}
                onPress={() => {
                  setGrouping(key);
                  setPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerOptionText, grouping === key && styles.pickerOptionActive]}>
                  {t(`stats.grouping.${key}`)}
                </Text>
                {grouping === key && <Icon name="check" size={16} color={theme.primary} />}
              </SoundTouchable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatRow({
  row,
  best,
  styles,
  theme,
  t,
  onPress,
}: {
  row: Row;
  best: number;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  onPress?: () => void;
}) {
  const accuracy = accuracyOf(row.stat);
  const Container: typeof SoundTouchable | typeof View = onPress ? SoundTouchable : View;

  return (
    <Container style={styles.row} onPress={onPress} activeOpacity={0.85}>
      {row.art && (
        <View style={styles.rowArtWrap} pointerEvents="none">
          <Image source={CATEGORY_BACKGROUNDS[row.art]} style={styles.rowArtImage} resizeMode="cover" />
          {/* dissolves the artwork into the card instead of ending on a hard
              edge, which is what made it look like a pasted rectangle */}
          <Svg style={styles.rowArtImage} width="100%" height="100%">
            <Defs>
              <LinearGradient id="statRowFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.card} stopOpacity="1" />
                <Stop offset="0.5" stopColor={theme.card} stopOpacity="0.6" />
                <Stop offset="1" stopColor={theme.card} stopOpacity="0.38" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#statRowFade)" />
          </Svg>
        </View>
      )}

      <View style={[styles.rowIcon, { backgroundColor: row.colorBg }]}>
        <Icon name={row.icon} size={17} color={row.color} />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{row.title}</Text>
        <Text style={styles.rowSub}>{t('stats.gamesAccuracy', row.stat.gamesPlayed, accuracy)}</Text>
        <View style={styles.rowTrack}>
          <View style={[styles.rowFill, { width: `${Math.round((row.stat.bestScore / best) * 100)}%`, backgroundColor: row.color }]} />
        </View>
      </View>

      <Text style={styles.rowBest}>{row.stat.bestScore}</Text>
      {onPress && <Icon name="chevronRight" size={15} color={theme.textMuted} />}
    </Container>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingBottom: 40 },
    hero: { width: '100%', aspectRatio: 2.15, overflow: 'hidden', justifyContent: 'flex-end' },
    heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    heroText: { paddingHorizontal: 20, paddingBottom: 18 },
    heroTitle: {
      fontSize: 34,
      fontFamily: fontFamily('800'),
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    heroNote: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: fontFamily('500'),
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.92)',
      marginTop: 4,
      maxWidth: '78%',
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    leaderboardCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
      marginHorizontal: 20,
      marginTop: 18,
    },
    leaderboardIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    leaderboardTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text },
    leaderboardSub: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 },
    tile: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      paddingHorizontal: 12,
      minHeight: 108,
    },
    tileValue: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, marginTop: 8 },
    tileLabel: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 1 },
    tileCorner: { position: 'absolute', right: 10, bottom: 10 },
    pips: { flexDirection: 'row', gap: 2, marginTop: 8 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      marginTop: 26,
      marginBottom: 12,
    },
    sectionTitle: { flex: 1, fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    pickerText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.text },
    pickerCaret: { fontSize: 12, color: theme.textMuted, marginTop: -4 },
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 40 },
    pickerSheet: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingHorizontal: 16,
    },
    pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
    pickerOptionText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
    pickerOptionActive: { color: theme.primary },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 12,
      marginHorizontal: 20,
      marginBottom: 8,
      overflow: 'hidden',
    },
    rowArtWrap: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '52%' },
    rowArtImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 14, fontFamily: fontFamily('800'), color: theme.text },
    rowSub: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    rowTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.border,
      marginTop: 8,
      overflow: 'hidden',
    },
    rowFill: { height: '100%', borderRadius: 3 },
    rowBest: {
      fontSize: 19,
      fontFamily: fontFamily('800'),
      color: theme.primary,
      textShadowColor: theme.card,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
    },
    quoteCard: {
      aspectRatio: 2.85,
      marginHorizontal: 20,
      marginTop: 18,
      borderRadius: radius.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    quoteText: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: fontFamily('600'),
      fontStyle: 'italic',
      color: '#FFFFFF',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
  });
}
