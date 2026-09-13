import { Image, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';

type Props = {
  /** Public URL of the group's picture, or null for the default badge. */
  url: string | null;
  size: number;
};

/** A group's picture, falling back to a tinted badge when it has none —
 * a group has no name initial worth showing the way a player does. */
export default function GroupAvatar({ url, size }: Props) {
  const { theme } = useTheme();

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="users" size={Math.round(size * 0.45)} color={theme.primary} />
    </View>
  );
}
