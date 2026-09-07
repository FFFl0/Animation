import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import SoundTouchable from '../sound/SoundTouchable';
import Icon, { IconName } from './Icon';
import { useT } from '../i18n/strings';

export type TabKey = 'home' | 'friends' | 'stats' | 'achievements' | 'profile';

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  theme: Theme;
};

export default function BottomTabBar({ active, onChange, theme }: Props) {
  const styles = makeStyles(theme);
  const t = useT();

  const TABS: { key: TabKey; label: string; icon: IconName }[] = [
    { key: 'home', label: t('tabs.home'), icon: 'home' },
    { key: 'friends', label: t('tabs.friends'), icon: 'users' },
    { key: 'stats', label: t('tabs.stats'), icon: 'stats' },
    { key: 'achievements', label: t('tabs.achievements'), icon: 'medal' },
    { key: 'profile', label: t('tabs.profile'), icon: 'user' },
  ];

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <SoundTouchable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)} activeOpacity={0.7}>
            <Icon name={tab.icon} size={20} color={isActive ? theme.primary : theme.textMuted} strokeWidth={isActive ? 2 : 1.7} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </SoundTouchable>
        );
      })}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      paddingBottom: 22,
    },
    tab: { flex: 1, alignItems: 'center', gap: 3 },
    label: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted },
    labelActive: { color: theme.primary },
  });
}
