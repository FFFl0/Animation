import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  /**
   * 'vertical' darkens the top, where a title sits, and again a little at
   * the bottom. 'left' darkens one end instead, for a wide card whose
   * artwork belongs in the middle and whose text runs along the side.
   */
  direction?: 'vertical' | 'left';
};

const STOPS = {
  vertical: [
    { offset: '0', opacity: '0.52' },
    { offset: '0.55', opacity: '0.16' },
    { offset: '1', opacity: '0.28' },
  ],
  left: [
    { offset: '0', opacity: '0.72' },
    { offset: '0.62', opacity: '0.25' },
    { offset: '1', opacity: '0.18' },
  ],
};

/** Keeps white text legible over artwork of any brightness. */
export default function ImageScrim({ direction = 'vertical' }: Props) {
  const vertical = direction === 'vertical';
  const id = vertical ? 'scrimVertical' : 'scrimLeft';

  return (
    <Svg style={styles.fill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
          {STOPS[direction].map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor="#000000" stopOpacity={stop.opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
