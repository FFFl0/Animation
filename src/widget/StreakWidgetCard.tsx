import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useShop } from '../shop/ShopContext';
import { isLayoutCheck } from '../monitoring/layoutCheck';
import { todayDateStr } from '../quiz/today';
import { STREAK_TIERS } from '../data/streakTiers';
import { pinStreakWidget, widgetSupported } from './platform';
import { widgetStateOf } from './streakWidgetState';
import { streakScene } from './streakScene';
import StreakWidgetPreview from './StreakWidgetPreview';

/** A 2×1 widget on a typical phone, in points. */
const ASPECT = 88 / 190;
const THUMB_W = 104;
const THUMB_H = Math.round(THUMB_W * ASPECT);

/**
 * The offer to put the streak widget on the home screen, on the profile.
 *
 * It shows the player's own widget as it would look right now, moving, and
 * under it the ladder of what the widget turns into as the streak grows —
 * the reason to keep it going. The button asks the launcher to place it;
 * where the launcher cannot, or after it has asked, the card says how to
 * do it by hand, because nothing comes back to say whether the widget was
 * actually added.
 */
export default function StreakWidgetCard() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { countOf } = useShop();
  const { width: screenWidth } = useWindowDimensions();
  const [note, setNote] = useState<'added' | 'manual' | null>(null);

  if (!widgetSupported && !isLayoutCheck) return null;

  const state = widgetStateOf(
    profile
      ? {
          count: profile.streak.count,
          lastPlayedDate: profile.streak.lastPlayedDate,
          freezes: countOf('streakFreeze'),
          language,
        }
      : null,
    todayDateStr()
  );
  // The card's inner width on this screen, kept to a widget's real size.
  const previewWidth = Math.min(300, Math.max(200, Math.min(screenWidth, 520) - 32 - 34));
  const previewHeight = Math.round(previewWidth * ASPECT);
  const add = async () => setNote(await pinStreakWidget());
  const tiers = STREAK_TIERS.filter((tier) => tier.minDays > 0);

  return (
    <View style={styles.card} testID="streak-widget-card">
      <Text style={styles.title}>{t('profile.widget.title')}</Text>
      <Text style={styles.hint}>{t('profile.widget.hint')}</Text>

      <View style={styles.previewWrap}>
        <StreakWidgetPreview state={state} language={language} width={previewWidth} height={previewHeight} twinkle />
      </View>

      <Text style={styles.ladderTitle}>{t('profile.widget.ladder')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ladder}>
        {tiers.map((tier, i) => {
          const reached = state.count >= tier.minDays;
          const isLast = i === tiers.length - 1;
          return (
            <View key={tier.id} style={styles.step} testID={`widget-tier-${tier.id}`}>
              <View style={[styles.thumb, !reached && styles.thumbLocked]}>
                <SvgXml
                  xml={streakScene({ count: tier.minDays, kind: 'done', width: THUMB_W, height: THUMB_H, variant: 3 })}
                  width={THUMB_W}
                  height={THUMB_H}
                />
              </View>
              <Text style={[styles.stepLabel, reached && styles.stepLabelReached]}>
                {isLast ? t('profile.widget.beyond') : t('profile.widget.days', tier.minDays)}
              </Text>
              {!reached && (
                <Text style={styles.stepLeft}>{t('profile.widget.left', tier.minDays - state.count)}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <SoundTouchable style={styles.button} onPress={() => void add()} accessibilityRole="button" testID="streak-widget-add">
        <Text style={styles.buttonText}>{t('profile.widget.add')}</Text>
      </SoundTouchable>
      {note && <Text style={styles.note}>{t(note === 'added' ? 'profile.widget.confirm' : 'profile.widget.manual')}</Text>}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
    },
    title: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('700'), color: theme.text },
    hint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    previewWrap: { alignItems: 'center', marginTop: 14 },
    ladderTitle: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.text, marginTop: 16, marginBottom: 8 },
    ladder: { gap: 10, paddingRight: 4 },
    step: { width: THUMB_W, alignItems: 'center' },
    thumb: { width: THUMB_W, height: THUMB_H, borderRadius: 14, overflow: 'hidden' },
    thumbLocked: { opacity: 0.4 },
    stepLabel: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted, marginTop: 5 },
    stepLabelReached: { color: theme.text },
    stepLeft: { fontSize: 10, fontFamily: fontFamily('500'), color: theme.textMuted },
    button: {
      marginTop: 16,
      paddingVertical: 11,
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    buttonText: { fontSize: 14, fontFamily: fontFamily('800'), color: theme.onPrimary },
    note: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 10 },
  });
}
