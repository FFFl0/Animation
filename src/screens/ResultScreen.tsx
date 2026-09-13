import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useAuth } from '../auth/AuthContext';
import FadeIn from '../components/FadeIn';
import FallingPetals from '../components/FallingPetals';
import ScoreRing from '../components/ScoreRing';
import PillButton from '../components/PillButton';
import ShareCard from '../share/ShareCard';
import { canShareImage, shareViewAsImage } from '../share/shareImage';
import { useT } from '../i18n/strings';

/** From this share of correct answers the round counts as a celebration. */
const CELEBRATE_AT = 0.8;

type Props = {
  score: number;
  total: number;
  /** Beat the previous best for this category and tier. */
  isRecord: boolean;
  /** Category, tier or mode this round was — shown on the shared image. */
  contextLabel: string;
  onRestart: () => void;
  onChooseCategory: () => void;
};

function getMessage(ratio: number, t: ReturnType<typeof useT>) {
  if (ratio === 1) return t('result.messagePerfect');
  if (ratio >= 0.7) return t('result.messageGreat');
  if (ratio >= 0.4) return t('result.messageOk');
  return t('result.messageLow');
}

export default function ResultScreen({ score, total, isRecord, contextLabel, onRestart, onChooseCategory }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { buzz } = useSound();
  const { profile } = useAuth();
  const t = useT();
  const cardRef = useRef<View>(null);
  const [canShare, setCanShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const wrong = Math.max(total - score, 0);
  const ratio = total > 0 ? score / total : 0;
  const percent = Math.round(ratio * 100);
  const celebrate = ratio >= CELEBRATE_AT;

  useEffect(() => {
    canShareImage().then(setCanShare);
  }, []);

  useEffect(() => {
    // Fires once the ring has had time to sweep, so the buzz lands with the
    // number rather than before it.
    if (!celebrate) return;
    const timer = setTimeout(() => buzz('heavy'), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate]);

  const handleShare = async () => {
    setShareError(null);
    const result = await shareViewAsImage(cardRef, t('result.shareTitle'));
    if (result === 'failed') setShareError(t('result.shareFailed'));
  };

  const stats = [
    { value: score, label: t('result.correct'), color: theme.success },
    { value: wrong, label: t('result.wrong'), color: theme.danger },
    { value: `${percent}%`, label: t('result.score'), color: theme.primary },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {celebrate && <FallingPetals color={theme.primaryLight} />}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <FadeIn offsetY={16}>
          <ScoreRing
            ratio={ratio}
            size={168}
            stroke={14}
            trackColor={theme.border}
            fillColor={celebrate ? theme.success : theme.primary}
            textColor={theme.text}
            mutedColor={theme.textMuted}
            // The fraction rather than "score" again: the stat cards below
            // already carry the percentage.
            label={`${score} / ${total}`}
          />
        </FadeIn>

        <FadeIn delay={140}>
          <Text style={styles.title}>{ratio >= 0.7 ? t('result.titleGreat') : t('result.titleGoodStart')}</Text>
        </FadeIn>

        {isRecord && (
          <FadeIn delay={260}>
            <View style={styles.recordPill}>
              <Text style={styles.recordText}>{t('result.newRecord')}</Text>
            </View>
          </FadeIn>
        )}

        <FadeIn delay={200}>
          <Text style={styles.subtitle}>{t('result.answered', score, total)}</Text>
          <Text style={styles.message}>{getMessage(ratio, t)}</Text>
        </FadeIn>

        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={320 + i * 90} style={styles.statFlex}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </FadeIn>
          ))}
        </View>

        <FadeIn delay={600} style={styles.actions}>
          <PillButton title={t('result.restart')} icon="↻" variant="ink" onPress={onRestart} />
          <View style={{ height: 12 }} />
          <PillButton title={t('result.chooseCategory')} variant="outline" onPress={onChooseCategory} />
          {canShare && (
            <>
              <View style={{ height: 12 }} />
              <PillButton title={t('result.share')} variant="outline" onPress={handleShare} />
            </>
          )}
          {shareError && <Text style={styles.shareError}>{shareError}</Text>}
        </FadeIn>
      </ScrollView>

      {/* Laid out off-screen: react-native-view-shot can only capture a view
          that actually rendered, so this can't be hidden with `display`. */}
      {profile && (
        <View style={styles.offscreen} pointerEvents="none">
          <ShareCard
            ref={cardRef}
            theme={theme}
            username={profile.username}
            avatar={profile.avatar}
            contextLabel={contextLabel}
            score={score}
            total={total}
            percent={percent}
            correctLabel={t('result.correct').toLowerCase()}
            ofLabel={t('result.shareOf')}
            recordLabel={isRecord ? t('result.newRecord') : null}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 24,
    },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginTop: 18, textAlign: 'center' },
    recordPill: {
      backgroundColor: theme.primaryLight,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginTop: 8,
    },
    recordText: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.primary },
    subtitle: { fontSize: 15, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 8, textAlign: 'center' },
    message: {
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 6,
      marginBottom: 22,
    },
    statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 26 },
    statFlex: { flex: 1 },
    statCard: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statValue: { fontSize: 20, fontFamily: fontFamily('800'), marginBottom: 2 },
    statLabel: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted },
    actions: { width: '100%' },
    shareError: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, textAlign: 'center', marginTop: 10 },
    offscreen: { position: 'absolute', left: -9999, top: 0 },
  });
}
