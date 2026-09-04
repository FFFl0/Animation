import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { Avatar, HairStyle } from '../data/avatar';

type Props = {
  avatar: Avatar;
  size?: number;
  variant?: 'full' | 'silhouette' | 'eyes';
};

function HairBack({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'long':
      return <Path d="M40 70 Q40 150 55 195 L60 130 Q60 70 100 60 Q140 70 140 130 L145 195 Q160 150 160 70 Z" fill={color} />;
    case 'twin':
      return (
        <>
          <Ellipse cx="38" cy="120" rx="16" ry="28" fill={color} />
          <Ellipse cx="162" cy="120" rx="16" ry="28" fill={color} />
        </>
      );
    case 'ponytail':
      return <Path d="M150 65 Q185 80 175 130 Q170 155 150 150 Q165 110 140 75 Z" fill={color} />;
    default:
      return null;
  }
}

function HairFront({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'spiky':
      return (
        <Path
          d="M46 60 Q46 5 100 5 Q154 5 154 60 L154 90 Q145 60 138 90 L124 55 L100 85 L76 55 L62 90 Q55 60 46 90 Z"
          fill={color}
        />
      );
    case 'bob':
      return <Path d="M42 95 Q38 30 100 25 Q162 30 158 95 Q158 60 100 55 Q42 60 42 95 Z" fill={color} />;
    case 'short':
      return <Path d="M48 85 Q45 35 100 32 Q155 35 152 85 Q150 55 100 50 Q50 55 48 85 Z" fill={color} />;
    default:
      return <Path d="M45 90 Q42 25 100 20 Q158 25 155 90 Q152 55 100 50 Q48 55 45 90 Z" fill={color} />;
  }
}

export default function AnimeAvatar({ avatar, size = 96, variant = 'full' }: Props) {
  const viewBox = variant === 'eyes' ? '52 108 96 46' : '0 0 200 200';

  if (variant === 'silhouette') {
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Circle cx="100" cy="100" r="100" fill="#D9D4CC" />
          <HairBack style={avatar.hairStyle} color="#1F2937" />
          <Ellipse cx="100" cy="118" rx="46" ry="50" fill="#1F2937" />
          <HairFront style={avatar.hairStyle} color="#1F2937" />
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', borderRadius: size / 2 }}>
      <Svg width={size} height={size} viewBox={viewBox}>
        <Circle cx="100" cy="100" r="100" fill={avatar.accent} />
        <HairBack style={avatar.hairStyle} color={avatar.hairColor} />
        <Ellipse cx="100" cy="118" rx="46" ry="50" fill={avatar.skinTone} />
        <Ellipse cx="78" cy="128" rx="7" ry="9" fill={avatar.eyeColor} />
        <Ellipse cx="122" cy="128" rx="7" ry="9" fill={avatar.eyeColor} />
        <Path d="M82 152 Q100 162 118 152" stroke="#B9825F" strokeWidth={3} fill="none" strokeLinecap="round" />
        <HairFront style={avatar.hairStyle} color={avatar.hairColor} />
      </Svg>
    </View>
  );
}
