import { Pressable, Text, View } from 'react-native';

type Props = { onRetry: () => void };

/**
 * The last resort, for when a provider itself is what broke.
 *
 * Everything here is hard-coded because nothing it would normally ask is
 * available: no theme to read colours from, no language context to translate
 * with. The colours match the light palette's background and ink, which are
 * also what the font-loading splash uses, so this never flashes as something
 * from a different app. The text is Russian because that is the app's primary
 * language and there is no way left to find out the player's.
 *
 * The themed screen covers everything below the providers, which is where
 * crashes actually happen; this exists so that even the unlikely case ends in
 * a button rather than a closed app.
 */
export default function BareCrashScreen({ onRetry }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: '#FDF9F6',
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1F2937', textAlign: 'center' }}>
        Что-то пошло не так
      </Text>
      <Text
        style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 10, lineHeight: 20 }}
      >
        Приложение не смогло запуститься. Прогресс сохранён — попробуйте ещё раз.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={{
          marginTop: 22,
          backgroundColor: '#E8537F',
          borderRadius: 999,
          paddingHorizontal: 26,
          paddingVertical: 14,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Попробовать снова</Text>
      </Pressable>
    </View>
  );
}
