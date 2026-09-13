import { Image, StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useT } from '../i18n/strings';
import Icon from './Icon';
import ImageScrim from './ImageScrim';
import { STREAK_BACKGROUNDS } from '../data/streakImages';
import { tierForStreak } from '../data/streakTiers';

type Props = {
  days: number;
};

/**
 * The streak on the home screen. Which artwork, icon, colour and wording it
 * shows all come from the tier the run has reached, so the card visibly
 * changes as somebody keeps coming back.
 */
export default function StreakCard({ days }: Props) {
  const t = useT();
  const tier = tierForStreak(days);
  const shown = days > 100 ? '100+' : String(days);

  return (
    <View style={styles.card}>
      <Image source={STREAK_BACKGROUNDS[tier.id]} style={styles.background} resizeMode="cover" />
      <ImageScrim direction="left" />

      <View style={styles.content}>
        <View style={styles.head}>
          <View style={[styles.iconTile, { backgroundColor: `${tier.accent}33`, borderColor: `${tier.accent}66` }]}>
            <Icon name={tier.icon} size={22} color={tier.accent} />
          </View>
          <View>
            <Text style={styles.label}>{t('home.streakLabel')}</Text>
            <Text style={styles.value}>{shown}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: tier.accent }]}>{t(`streak.${tier.id}.title`)}</Text>
        <Text style={styles.body}>{t(`streak.${tier.id}.body`)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 2.05,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 22,
  },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  content: { flex: 1, padding: 16, justifyContent: 'space-between', maxWidth: '68%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: fontFamily('600'),
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  value: {
    fontSize: 30,
    fontFamily: fontFamily('800'),
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  title: {
    fontSize: 15,
    fontFamily: fontFamily('800'),
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily('500'),
    color: 'rgba(255,255,255,0.88)',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
