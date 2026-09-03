import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { View } from 'react-native';
import { Avatar } from '../data/characters';

type Props = {
  avatar: Avatar;
  size?: number;
};

const SKIN = '#FFE1C4';

function Eye({ cx, color }: { cx: number; color: string }) {
  return (
    <>
      <Ellipse cx={cx} cy="100" rx="30" ry="22" fill="#FFFFFF" stroke="#00000022" strokeWidth="1.5" />
      <Circle cx={cx} cy="100" r="16" fill={color} />
      <Circle cx={cx} cy="100" r="6.5" fill="#1A1A1A" />
      <Circle cx={cx - 5} cy="93" r="4" fill="#FFFFFF" opacity={0.9} />
      <Path d={`M${cx - 32} 85 Q${cx} 68 ${cx + 32} 85`} stroke="#1A1A1A" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  );
}

export default function EyesPreview({ avatar, size = 140 }: Props) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: avatar.accent }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle cx="100" cy="100" r="100" fill={avatar.accent} />
        <Ellipse cx="100" cy="104" rx="82" ry="68" fill={SKIN} />
        <Eye cx={64} color={avatar.eyeColor} />
        <Eye cx={136} color={avatar.eyeColor} />
      </Svg>
    </View>
  );
}
