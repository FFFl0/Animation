import { IconName } from '../components/Icon';
import { Language } from '../i18n/LanguageContext';
import { pick } from './localize';

export type QuestionType =
  | 'guessSeries'
  | 'guessCharacterFull'
  | 'guessCharacterSilhouette'
  | 'guessCharacterEyes'
  | 'guessQuote'
  | 'guessAbility'
  | 'guessFaction'
  | 'openingTrivia'
  | 'guessSeriesByVideo';

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
  icon: IconName;
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
    icon: 'book',
    color: '#22C55E',
    colorBg: '#E8F9EE',
    questionTypes: ['guessSeries'],
  },
  {
    id: 'characters',
    title: 'Персонажи',
    description: 'Имя героя, способности, команда и детали',
    icon: 'character',
    color: '#3B82F6',
    colorBg: '#E7F0FE',
    questionTypes: ['guessCharacterFull', 'guessCharacterSilhouette', 'guessCharacterEyes'],
  },
  {
    id: 'openings',
    title: 'Опенинги и эндинги',
    description: 'Смотри заставку и угадывай, из какого она аниме',
    icon: 'music',
    color: '#A855F7',
    colorBg: '#F1E7FB',
    questionTypes: ['guessSeriesByVideo'],
  },
  {
    id: 'quotes',
    title: 'Цитаты',
    description: 'Кто сказал фразу и из какого аниме',
    icon: 'quote',
    color: '#F06292',
    colorBg: '#FADDE1',
    questionTypes: ['guessQuote'],
  },
  {
    id: 'battles',
    title: 'Бои и способности',
    description: 'Владелец способности, техники и оружие',
    icon: 'swords',
    color: '#EF4444',
    colorBg: '#FDEAEA',
    questionTypes: ['guessAbility'],
  },
  {
    id: 'world',
    title: 'Мир аниме',
    description: 'Кланы, организации, школы и фракции',
    icon: 'globe',
    color: '#EC4899',
    colorBg: '#FCE4F1',
    questionTypes: ['guessFaction'],
  },
  {
    id: 'hard',
    title: 'Сложные',
    description: 'Для опытных фанатов — детали и мелочи',
    icon: 'star',
    color: '#D4A017',
    colorBg: '#FBF0C9',
    questionTypes: ['guessCharacterFull', 'guessQuote', 'guessAbility', 'guessFaction', 'guessSeries'],
    hardOnly: true,
  },
  {
    id: 'mixed',
    title: 'Смешанный квиз',
    description: 'Вопросы из всех категорий вперемешку',
    icon: 'shuffle',
    color: '#F97316',
    colorBg: '#FDECDC',
    questionTypes: ['guessSeries', 'guessCharacterFull', 'guessQuote', 'guessAbility', 'guessFaction', 'openingTrivia'],
  },
];

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((cat) => cat.id === id)!;
}

const CATEGORY_EN: Record<CategoryId, { title: string; description: string }> = {
  anime: { title: 'Anime', description: 'Guess the anime by character, plot and symbols' },
  characters: { title: 'Characters', description: 'Hero names, abilities, teams and details' },
  openings: { title: 'Openings & Endings', description: 'Watch the theme and name the anime it belongs to' },
  quotes: { title: 'Quotes', description: 'Who said it and from which anime' },
  battles: { title: 'Battles & Abilities', description: 'Who owns the ability, technique or weapon' },
  world: { title: 'Anime World', description: 'Clans, organizations, schools and factions' },
  hard: { title: 'Hard Mode', description: 'For seasoned fans — details and trivia' },
  mixed: { title: 'Mixed Quiz', description: 'Questions from every category, shuffled' },
};

export function categoryTitle(cat: Category, lang: Language): string {
  return pick(cat.title, CATEGORY_EN[cat.id]?.title, lang);
}

export function categoryDescription(cat: Category, lang: Language): string {
  return pick(cat.description, CATEGORY_EN[cat.id]?.description, lang);
}
