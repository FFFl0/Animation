import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { ToriiHero } from '../components/SakuraDecor';
import PillButton from '../components/PillButton';

type Props = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <ToriiHero size={180} accent={theme.primaryLight} ink={theme.ink} />
        </View>

        <Text style={styles.title}>
          Anime<Text style={{ color: theme.primary }}>Quiz</Text>
        </Text>
        <Text style={styles.jp}>アニメクイズ</Text>

        <Text style={styles.tagline}>TEST YOUR KNOWLEDGE{'\n'}LIVE THE ANIME</Text>

        <View style={styles.spacer} />

        <PillButton title="Начать" icon="→" variant="ink" onPress={onStart} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 64, paddingBottom: 32 },
    hero: { marginBottom: 12 },
    title: { fontSize: 34, fontFamily: fontFamily('800'), color: theme.text },
    jp: { fontSize: 14, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    tagline: {
      marginTop: 18,
      fontSize: 12,
      fontFamily: fontFamily('700'),
      color: theme.textMuted,
      textAlign: 'center',
      letterSpacing: 2,
      lineHeight: 20,
    },
    spacer: { flex: 1 },
  });
}
