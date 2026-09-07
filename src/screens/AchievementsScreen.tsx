import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { ACHIEVEMENTS, achievementTitle, achievementDescription } from '../data/achievements';
import Icon from '../components/Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

export default function AchievementsScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();

  if (!profile) return null;

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.check(profile)).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>{t('achievements.pageTitle')}</Text>
        <Text style={styles.subtitle}>{t('achievements.unlockedOf', unlockedCount, ACHIEVEMENTS.length)}</Text>

        <View style={styles.grid}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.check(profile);
            return (
              <View key={a.id} style={[styles.card, !unlocked && styles.cardLocked]}>
                <View style={[styles.iconWrap, unlocked && { backgroundColor: theme.primaryLight }]}>
                  <Icon name={unlocked ? a.icon : 'lock'} size={18} color={unlocked ? theme.primary : theme.textMuted} />
                </View>
                <Text style={styles.title}>{achievementTitle(a, language)}</Text>
                <Text style={styles.description}>{achievementDescription(a, language)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
    card: {
      width: '48%',
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
    },
    cardLocked: { opacity: 0.55 },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    title: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text, marginBottom: 3 },
    description: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, lineHeight: 15 },
  });
}
