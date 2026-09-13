import { Image, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { CategoryId } from '../data/categories';
import { CATEGORY_BACKGROUNDS } from '../data/categoryImages';
import ImageScrim from './ImageScrim';

type Props = {
  id: CategoryId;
  title: string;
  subtitle: string;
  startLabel: string;
  onPress: () => void;
};

/**
 * A category is a picture with the name on it, not a white card with an
 * icon: the artwork fills the tile and the text sits on top of it. The
 * "start" pill is part of the same touchable rather than a button of its
 * own — the whole tile opens the category, so a nested touchable would
 * only add a second tap target doing the same thing.
 */
export default function CategoryTile({ id, title, subtitle, startLabel, onPress }: Props) {
  return (
    <SoundTouchable style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <Image source={CATEGORY_BACKGROUNDS[id]} style={styles.background} resizeMode="cover" />
      <ImageScrim />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        <View style={styles.spacer} />
        <View style={styles.startPill}>
          <Text style={styles.startText}>{startLabel}</Text>
        </View>
      </View>
    </SoundTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    aspectRatio: 1.12,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  content: { flex: 1, padding: 14 },
  title: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: fontFamily('800'),
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily('600'),
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  spacer: { flex: 1, minHeight: 8 },
  startPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  startText: { fontSize: 13, fontFamily: fontFamily('800'), color: '#1F2937' },
});
