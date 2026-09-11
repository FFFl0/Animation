import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';

type HeroProps = {
  size?: number;
  accent: string;
  ink: string;
};

/** Torii gate silhouette in front of a soft sun circle, with a few petals. */
export function ToriiHero({ size = 220, accent, ink }: HeroProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Circle cx="110" cy="120" r="78" fill={accent} opacity={0.55} />
        <Petal x={40} y={40} rotate={-20} scale={1} color={accent} />
        <Petal x={175} y={55} rotate={35} scale={0.8} color={accent} />
        <Petal x={30} y={150} rotate={70} scale={0.7} color={accent} />
        <Petal x={185} y={165} rotate={-45} scale={0.9} color={accent} />
        {/* Torii gate: upswept kasagi over a thinner shimagi, tapered pillars, one nuki. */}
        <Path d="M8 54 Q110 66 212 54 L212 68 Q110 74 8 68 Z" fill={ink} />
        <Path d="M20 72 Q110 80 200 72 L200 79 Q110 87 20 79 Z" fill={ink} />
        <Path d="M36 80 L54 80 L56 198 L32 198 Z" fill={ink} />
        <Path d="M184 80 L166 80 L164 198 L188 198 Z" fill={ink} />
        <Rect x="30" y="110" width="160" height="16" rx="2" fill={ink} />
      </Svg>
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

/** A small torii glyph used as a header/section icon. */
export function ToriiIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M1 10 Q24 13 47 10 L47 16 Q24 20 1 16 Z" fill={color} />
      <Path d="M5 18.5 Q24 22 43 18.5 L43 22.5 Q24 26 5 22.5 Z" fill={color} />
      <Path d="M9 23 L16 23 L17.5 45 L7 45 Z" fill={color} />
      <Path d="M39 23 L32 23 L30.5 45 L41 45 Z" fill={color} />
      <Rect x="6" y="30" width="36" height="5" rx="1" fill={color} />
    </Svg>
  );
}
