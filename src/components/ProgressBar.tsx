import { View } from 'react-native';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  progress: number; // 0..1
  color?: string;
  height?: number;
};

export default function ProgressBar({ progress, color, height = 8 }: Props) {
  const { theme } = useTheme();
  const fillColor = color ?? theme.primary;
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: theme.border, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: fillColor }} />
    </View>
  );
}

export function ProgressDots({ total, current, theme }: { total: number; current: number; theme: Theme }) {
  const dots = Array.from({ length: total }, (_, i) => i);
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {dots.map((i) => (
        <View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: i <= current ? theme.primary : theme.border,
          }}
        />
      ))}
    </View>
  );
}
