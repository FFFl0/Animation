import { StyleSheet, Text, View } from 'react-native';
import { Poster } from '../data/animePosters';

type Props = {
  poster: Poster;
  width?: number;
};

export default function AnimePoster({ poster, width = 160 }: Props) {
  const height = Math.round(width * 1.3);

  return (
    <View style={[styles.wrap, { width, height, borderRadius: width * 0.1, backgroundColor: poster.accent }]}>
      <View style={[styles.stripe, { backgroundColor: poster.accentDark, height: height * 0.22 }]} />
      <View style={[styles.stripe, styles.stripeBottom, { backgroundColor: poster.accentDark, height: height * 0.16 }]} />
      <View style={styles.emojiWrap}>
        <Text style={{ fontSize: width * 0.42 }}>{poster.emoji}</Text>
      </View>
      <View style={styles.reel}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.reelHole, { backgroundColor: poster.accentDark }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  stripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.35,
  },
  stripeBottom: { top: undefined, bottom: 0 },
  emojiWrap: { alignItems: 'center', justifyContent: 'center' },
  reel: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  reelHole: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
});
