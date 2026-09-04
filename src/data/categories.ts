export type QuestionType =
  | 'guessSeries'
  | 'guessCharacterFull'
  | 'guessCharacterSilhouette'
  | 'guessCharacterEyes'
  | 'guessQuote'
  | 'guessAbility'
  | 'guessFaction'
  | 'openingTrivia';

export type CategoryId =
  | 'anime'
  | 'characters'
  | 'openings'
  | 'quotes'
  | 'battles'
  | 'world'
  | 'hard'
  | 'mixed';

export type Category = {
  id: CategoryId;
  title: string;
  description: string;
  icon: string;
  color: string;
  colorBg: string;
  questionTypes: QuestionType[];
  hardOnly?: boolean;
};

export const CATEGORIES: Category[] = [
  {
    id: 'anime',
    title: 'Аниме',
    description: 'Угадывай аниме по персонажу, сюжету и символам',
    icon: '🎌',
    color: '#22C55E',
    colorBg: '#E8F9EE',
    questionTypes: ['guessSeries'],
  },
  {
    id: 'characters',
    title: 'Персонажи',
    description: 'Имя героя, способности, команда и детали',
    icon: '👤',
    color: '#3B82F6',
    colorBg: '#E7F0FE',
    questionTypes: ['guessCharacterFull', 'guessCharacterSilhouette', 'guessCharacterEyes'],
  },
  {
    id: 'openings',
    title: 'Опенинги и эндинги',
    description: 'Угадай аниме по заставке и её деталям',
    icon: '🎵',
    color: '#A855F7',
    colorBg: '#F1E7FB',
    questionTypes: ['openingTrivia'],
  },
  {
    id: 'quotes',
    title: 'Цитаты',
    description: 'Кто сказал фразу и из какого аниме',
    icon: '💬',
    color: '#F06292',
    colorBg: '#FADDE1',
    questionTypes: ['guessQuote'],
  },
  {
    id: 'battles',
    title: 'Бои и способности',
    description: 'Владелец способности, техники и оружие',
    icon: '⚔️',
    color: '#EF4444',
    colorBg: '#FDEAEA',
    questionTypes: ['guessAbility'],
  },
  {
    id: 'world',
    title: 'Мир аниме',
    description: 'Кланы, организации, школы и фракции',
    icon: '🌸',
    color: '#EC4899',
    colorBg: '#FCE4F1',
    questionTypes: ['guessFaction'],
  },
  {
    id: 'hard',
    title: 'Сложные',
    description: 'Для опытных фанатов — детали и мелочи',
    icon: '🧠',
    color: '#D4A017',
    colorBg: '#FBF0C9',
    questionTypes: ['guessCharacterFull', 'guessQuote', 'guessAbility', 'guessFaction', 'guessSeries'],
    hardOnly: true,
  },
  {
    id: 'mixed',
    title: 'Смешанный квиз',
    description: 'Вопросы из всех категорий вперемешку',
    icon: '🔥',
    color: '#F97316',
    colorBg: '#FDECDC',
    questionTypes: ['guessSeries', 'guessCharacterFull', 'guessQuote', 'guessAbility', 'guessFaction', 'openingTrivia'],
  },
];

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((cat) => cat.id === id)!;
}
