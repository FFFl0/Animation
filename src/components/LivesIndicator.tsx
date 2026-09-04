import { Text, View } from 'react-native';

type Props = {
  lives: number;
  max: number;
  size?: number;
};

export default function LivesIndicator({ lives, max, size = 16 }: Props) {
  const hearts = Array.from({ length: max }, (_, i) => i < lives);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {hearts.map((filled, i) => (
        <Text key={i} style={{ fontSize: size, opacity: filled ? 1 : 0.28 }}>
          {filled ? '❤️' : '🤍'}
        </Text>
      ))}
    </View>
  );
}
