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
        {/* torii gate */}
        <Rect x="34" y="80" width="14" height="110" rx="2" fill={ink} />
        <Rect x="172" y="80" width="14" height="110" rx="2" fill={ink} />
        <Rect x="24" y="66" width="172" height="16" rx="3" fill={ink} />
        <Rect x="18" y="60" width="184" height="8" rx="3" fill={ink} />
        <Rect x="44" y="104" width="132" height="12" rx="2" fill={ink} />
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
