import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CategoryId, getCategory } from '../data/categories';
import { TIERS, TierId, isTierUnlocked } from '../data/difficulty';
import { categoryStatsKey, getStat } from '../quiz/statsKey';
import { ToriiIcon } from '../components/SakuraDecor';
import PillButton from '../components/PillButton';
import ProgressBar from '../components/ProgressBar';
import Icon from '../components/Icon';

type Props = {
  categoryId: CategoryId;
  onBack: () => void;
  onStartTier: (categoryId: CategoryId, tier: TierId | undefined) => void;
};

export default function CategoryDetailScreen({ categoryId, onBack, onStartTier }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const category = getCategory(categoryId);

  const bestScoreByTier: Partial<Record<TierId, number>> = {};
  if (profile) {
    for (const tier of TIERS) {
      bestScoreByTier[tier.id] = getStat(profile, categoryStatsKey(categoryId, tier.id)).bestScore;
    }
  }

  const showTiers = !category.hardOnly && categoryId !== 'mixed';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SoundTouchable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Назад</Text>
        </SoundTouchable>

        <View style={styles.headerIconWrap}>
          <ToriiIcon size={30} color={theme.text} />
        </View>
        <Text style={styles.title}>{category.title}</Text>
        <Text style={styles.subtitle}>{category.description}</Text>

        {showTiers ? (
          <View style={styles.tierList}>
            {TIERS.map((tier) => {
              const stat = profile ? getStat(profile, categoryStatsKey(categoryId, tier.id)) : undefined;
              const unlocked = isTierUnlocked(tier.id, bestScoreByTier);
              const best = stat?.bestScore ?? 0;
              const total = tier.questionsPerRound;

              return (
                <SoundTouchable
                  key={tier.id}
                  style={[styles.tierCard, !unlocked && styles.tierCardLocked]}
                  onPress={() => unlocked && onStartTier(categoryId, tier.id)}
                  activeOpacity={unlocked ? 0.85 : 1}
                >
                  <View style={[styles.tierIconWrap, { backgroundColor: tier.colorBg }]}>
                    <Icon name={unlocked ? tier.icon : 'lock'} size={19} color={unlocked ? tier.color : theme.textMuted} />
                  </View>
                  <View style={styles.tierText}>
                    <Text style={styles.tierLabel}>{tier.label}</Text>
                    <Text style={styles.tierDesc}>{unlocked ? tier.description : 'Пройди предыдущий уровень'}</Text>
                    {unlocked && (
                      <View style={styles.tierProgressRow}>
                        <View style={styles.tierProgressBar}>
                          <ProgressBar progress={best / total} color={tier.color} height={5} />
                        </View>
                        <Text style={styles.tierScore}>{best}/{total}</Text>
                      </View>
                    )}
                  </View>
                  {unlocked && <Text style={styles.chevron}>›</Text>}
                </SoundTouchable>
              );
            })}
          </View>
        ) : (
          <View style={styles.startWrap}>
            <PillButton title="Начать квиз" variant="ink" onPress={() => onStartTier(categoryId, undefined)} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
    backButton: { marginBottom: 12 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    headerIconWrap: { marginBottom: 8 },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 6 },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 22, lineHeight: 19 },
    tierList: { gap: 12 },
    tierCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
      gap: 12,
    },
    tierCardLocked: { opacity: 0.55 },
    tierIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tierText: { flex: 1 },
    tierLabel: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
    tierDesc: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1, marginBottom: 6 },
    tierProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tierProgressBar: { flex: 1 },
    tierScore: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted, minWidth: 34, textAlign: 'right' },
    chevron: { fontSize: 22, color: theme.textMuted, fontFamily: fontFamily('700') },
    startWrap: { marginTop: 12 },
  });
}
