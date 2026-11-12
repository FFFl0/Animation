import { StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from './Icon';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useT } from '../i18n/strings';
import { QuestionType } from '../data/categories';

/** What each kind of question is drawn with. */
export const KIND_ICON: Record<QuestionType, IconName> = {
  guessSeries: 'book',
  guessCharacterFull: 'character',
  guessCharacterSilhouette: 'user',
  guessCharacterEyes: 'eye',
  guessQuote: 'quote',
  guessAbility: 'swords',
  guessFaction: 'globe',
  openingTrivia: 'music',
  guessSeriesByVideo: 'film',
};

/** The kinds of question a round mixes, as a row of tinted chips. */
export default function QuestionKindChips({
  kinds,
  color,
  background,
}: {
  kinds: QuestionType[];
  color: string;
  background: string;
}) {
  const t = useT();
  return (
    <View style={styles.row}>
      {kinds.map((kind) => (
        <View key={kind} style={[styles.chip, { backgroundColor: background }]}>
          <Icon name={KIND_ICON[kind]} size={13} color={color} />
          <Text style={[styles.text, { color }]}>{t(`categoryDetail.kind.${kind}`)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  text: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily('700') },
});
