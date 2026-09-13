import { StyleSheet, Text, View } from 'react-native';
import { Tier } from '../data/difficulty';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import Icon from './Icon';

export default function LevelBadge({ tier }: { tier: Tier }) {
  return (
    <View style={[styles.badge, { backgroundColor: tier.colorBg }]}>
      <Icon name={tier.icon} size={14} color={tier.color} />
      <Text style={[styles.label, { color: tier.color }]}>{tier.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontFamily: fontFamily('700') },
});
