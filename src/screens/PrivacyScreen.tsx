import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import SoundTouchable from '../sound/SoundTouchable';
import { POLICY_UPDATED, privacyPolicy } from '../legal/privacyPolicy';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  onBack: () => void;
};

/** The policy rendered from the app's own copy, so it reads offline and in
 * whichever language the player picked. */
export default function PrivacyScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const sections = privacyPolicy(language);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <SoundTouchable onPress={onBack} accessibilityRole="button">
          <Text style={styles.backText}>{`‹ ${t('chat.back')}`}</Text>
        </SoundTouchable>
        <Text style={styles.title}>{t('legal.privacyTitle')}</Text>
        <Text style={styles.updated}>{t('legal.updated', POLICY_UPDATED)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph, i) => (
              <Text key={i} style={styles.paragraph}>{paragraph}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 10 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700'), marginBottom: 12 },
    title: { fontSize: 24, fontFamily: fontFamily('800'), color: theme.text },
    updated: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4 },
    content: { paddingHorizontal: 24, paddingBottom: 40 },
    section: { marginTop: 22 },
    sectionTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 8 },
    paragraph: {
      fontSize: 13,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      lineHeight: 20,
      marginBottom: 8,
    },
  });
}
