import Svg, { Path, Rect } from 'react-native-svg';
import { Image, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// The hero gate is artwork (sun + petals baked in), with a light-ink variant
// so the silhouette still reads on the dark background.
const TORII_LIGHT = require('../../assets/brand/torii-hero.png');
const TORII_DARK = require('../../assets/brand/torii-hero-dark.png');

type HeroProps = {
  size?: number;
};

/** Torii gate in front of a sun circle, with sakura petals drifting around it. */
export function ToriiHero({ size = 220 }: HeroProps) {
  const { resolvedScheme } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={resolvedScheme === 'dark' ? TORII_DARK : TORII_LIGHT}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

function Petal({ x, y, rotate, scale, color }: { x: number; y: number; rotate: number; scale: number; color: string }) {
  return (
    <Path
      d="M0 -10 C7 -8 10 -2 10 4 C10 10 5 14 0 10 C-5 14 -10 10 -10 4 C-10 -2 -7 -8 0 -10 Z"
      fill={color}
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}
    />
  );
}

type PetalsProps = {
  size?: number;
  color: string;
  count?: number;
};

const PETAL_LAYOUTS = [
  { x: 0.12, y: 0.18, r: -25, s: 0.9 },
  { x: 0.85, y: 0.12, r: 40, s: 0.7 },
  { x: 0.9, y: 0.55, r: -50, s: 0.85 },
  { x: 0.08, y: 0.7, r: 60, s: 0.75 },
  { x: 0.5, y: 0.05, r: 10, s: 0.6 },
  { x: 0.35, y: 0.9, r: -15, s: 0.8 },
];

/** A handful of sakura petals scattered around a circular area, for accenting badges/circles. */
export function PetalScatter({ size = 200, color, count = 6 }: PetalsProps) {
  const layouts = PETAL_LAYOUTS.slice(0, count);
  return (
    <View style={{ width: size, height: size, position: 'absolute' }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {layouts.map((p, i) => (
          <Petal key={i} x={p.x * 200} y={p.y * 200} rotate={p.r} scale={p.s} color={color} />
        ))}
      </Svg>
    </View>
  );
}

/** A small torii glyph used as a header/section icon — the hero gate, simplified. */
export function ToriiIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* kasagi: sharply upswept, tapering to points at the tips */}
      <Path d="M1 8.5 Q24 15 47 8.5 L47 12.5 Q24 23 1 12.5 Z" fill={color} />
      {/* shimagi */}
      <Path d="M4.5 16.5 Q24 21.5 43.5 16.5 L43.5 20.5 Q24 25.5 4.5 20.5 Z" fill={color} />
      {/* pillars, splaying outwards towards the base */}
      <Path d="M11 22.5 L17 22.5 L14 45 L7 45 Z" fill={color} />
      <Path d="M37 22.5 L31 22.5 L34 45 L41 45 Z" fill={color} />
      {/* nuki */}
      <Rect x="6.5" y="28.5" width="35" height="5" rx="1" fill={color} />
    </Svg>
  );
}
