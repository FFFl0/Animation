import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../data/characters';

type Props = {
  avatar: Avatar;
  size?: number;
};

const SKIN = '#FFE1C4';
const SKIN_SHADE = '#F2C9A4';

function Hair({ style, color }: { style: Avatar['hairStyle']; color: string }) {
  switch (style) {
    case 'long':
      return (
        <>
          <Path d="M20 45 Q20 -5 100 -5 Q180 -5 180 45 L180 150 Q165 130 165 90 L150 150 Q150 60 100 55 Q50 60 50 150 L35 90 Q35 130 20 150 Z" fill={color} />
          <Circle cx="100" cy="65" r="52" fill={color} />
        </>
      );
    case 'twin':
      return (
        <>
          <Circle cx="100" cy="60" r="50" fill={color} />
          <Ellipse cx="28" cy="110" rx="20" ry="55" fill={color} />
          <Ellipse cx="172" cy="110" rx="20" ry="55" fill={color} />
        </>
      );
    case 'bob':
      return (
        <Path d="M46 55 Q46 5 100 5 Q154 5 154 55 L154 115 Q140 100 140 70 L128 115 L100 60 L72 115 L60 70 Q60 100 46 115 Z" fill={color} />
      );
    case 'wavy':
      return (
        <>
          <Circle cx="100" cy="58" r="50" fill={color} />
          <Path d="M40 90 Q30 120 42 150 Q34 130 50 110 Z" fill={color} />
          <Path d="M160 90 Q170 120 158 150 Q166 130 150 110 Z" fill={color} />
        </>
      );
    case 'odango':
      return (
        <>
          <Circle cx="100" cy="62" r="48" fill={color} />
          <Circle cx="38" cy="42" r="22" fill={color} />
          <Circle cx="162" cy="42" r="22" fill={color} />
          <Rect x="30" y="55" width="16" height="60" rx="8" fill={color} />
          <Rect x="154" y="55" width="16" height="60" rx="8" fill={color} />
        </>
      );
    case 'animalEars':
      return (
        <>
          <Path d="M48 45 Q30 12 52 5 Q66 8 68 40 Z" fill={color} />
          <Path d="M60 30 Q48 12 58 10 Q66 14 66 32 Z" fill={SKIN_SHADE} />
          <Path d="M152 45 Q170 12 148 5 Q134 8 132 40 Z" fill={color} />
          <Path d="M140 30 Q152 12 142 10 Q134 14 134 32 Z" fill={SKIN_SHADE} />
          <Circle cx="100" cy="62" r="48" fill={color} />
        </>
      );
    case 'horns':
      return (
        <>
          <Path d="M65 25 Q58 4 47 2 Q52 22 68 40 Z" fill="#EDEDED" stroke="#D8D8D8" strokeWidth="1" />
          <Path d="M135 25 Q142 4 153 2 Q148 22 132 40 Z" fill="#EDEDED" stroke="#D8D8D8" strokeWidth="1" />
          <Circle cx="100" cy="62" r="48" fill={color} />
        </>
      );
    case 'wild':
    default:
      return (
        <Path d="M100 5 L118 26 L138 10 L146 38 L168 28 L162 58 Q164 108 100 116 Q36 108 38 58 L32 28 L54 38 L62 10 L82 26 Z" fill={color} />
      );
  }
}

export default function AnimeAvatar({ avatar, size = 140 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.accent }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle cx="100" cy="100" r="100" fill={avatar.accent} />
        <Hair style={avatar.hairStyle} color={avatar.hairColor} />
        <Ellipse cx="100" cy="118" rx="46" ry="50" fill={SKIN} />
        <Ellipse cx="78" cy="128" rx="7" ry="9" fill={avatar.eyeColor} />
        <Ellipse cx="122" cy="128" rx="7" ry="9" fill={avatar.eyeColor} />
        <Path d="M70 150 Q100 162 130 150" stroke={SKIN_SHADE} strokeWidth="3" fill="none" strokeLinecap="round" />
        <Hair style={avatar.hairStyle} color={avatar.hairColor} />
      </Svg>
      <View style={[styles.badge, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]}>
        <Text style={{ fontSize: size * 0.18 }}>{avatar.badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
