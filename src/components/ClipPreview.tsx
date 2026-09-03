import { StyleSheet, Text, View } from 'react-native';
import { Poster } from '../data/animePosters';

type Props = {
  poster: Poster;
  width?: number;
  // Deterministic per-question "timestamp" and scrub position, purely for
  // flavor — has no bearing on the answer.
  seed?: number;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function ClipPreview({ poster, width = 280, seed = 0 }: Props) {
  const height = Math.round(width * 0.5625); // 16:9
  const bar = Math.round(height * 0.14);
  const minutes = seed % 20;
  const seconds = (seed * 7) % 60;
  const scrub = 0.2 + ((seed * 37) % 60) / 100;

  return (
    <View style={[styles.wrap, { width, height: height + bar * 2, borderRadius: width * 0.05 }]}>
      <View style={[styles.letterbox, { height: bar }]} />
      <View style={[styles.screen, { height, backgroundColor: poster.accent }]}>
        <View style={[styles.vignette, { backgroundColor: poster.accentDark }]} />
        <Text style={{ fontSize: height * 0.5 }}>{poster.emoji}</Text>
      </View>
      <View style={[styles.letterbox, styles.controls, { height: bar }]}>
        <View style={styles.playButton}>
          <View style={styles.playTriangle} />
        </View>
        <View style={styles.scrubTrack}>
          <View style={[styles.scrubFill, { width: `${scrub * 100}%` }]} />
        </View>
        <Text style={styles.timestamp}>{pad(minutes)}:{pad(seconds)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  letterbox: { backgroundColor: '#000000' },
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vignette: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  playButton: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 2,
  },
  scrubTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  scrubFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  timestamp: {
    color: '#FFFFFF',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    opacity: 0.85,
  },
});
