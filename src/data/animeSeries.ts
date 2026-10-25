import { Language } from '../i18n/LanguageContext';
import { pick } from './localize';

export type AnimeSeries = {
  id: string;
  title: string;
  year: number;
  tags: string[];
};

export const ANIME_SERIES: AnimeSeries[] = [
  { id: 'naruto', title: 'Наруто', year: 2002, tags: ['сёнен', 'ниндзя'] },
  { id: 'aot', title: 'Атака титанов', year: 2013, tags: ['экшен', 'драма'] },
  { id: 'onepiece', title: 'Ван-Пис', year: 1999, tags: ['сёнен', 'приключения'] },
  { id: 'deathnote', title: 'Тетрадь смерти', year: 2006, tags: ['психология', 'триллер'] },
  { id: 'mha', title: 'Моя геройская академия', year: 2016, tags: ['сёнен', 'супергерои'] },
  { id: 'demonslayer', title: 'Клинок, рассекающий демонов', year: 2019, tags: ['сёнен', 'демоны'] },
  { id: 'jjk', title: 'Магическая битва', year: 2020, tags: ['сёнен', 'мистика'] },
  { id: 'fma', title: 'Стальной алхимик', year: 2009, tags: ['сёнен', 'приключения'] },
  { id: 'bleach', title: 'Блич', year: 2004, tags: ['сёнен', 'духи'] },
  { id: 'hxh', title: 'Охотник x Охотник', year: 2011, tags: ['сёнен', 'приключения'] },
  { id: 'opm', title: 'Ванпанчмен', year: 2015, tags: ['пародия', 'экшен'] },
  { id: 'csm', title: 'Человек-бензопила', year: 2022, tags: ['сёнен', 'ужасы'] },
  { id: 'spyfamily', title: 'Семья шпиона', year: 2022, tags: ['комедия', 'экшен'] },
  { id: 'sao', title: 'Мастера меча онлайн', year: 2012, tags: ['виртуальная реальность'] },
  { id: 'codegeass', title: 'Код Гиас', year: 2006, tags: ['меха', 'драма'] },
  { id: 'frieren', title: 'Провожающая в последний путь Фрирен', year: 2023, tags: ['фэнтези', 'драма'] },
  { id: 'rezero', title: 'Re:Zero', year: 2016, tags: ['исекай', 'драма'] },
  { id: 'konosuba', title: 'Этот замечательный мир!', year: 2016, tags: ['исекай', 'комедия'] },
  { id: 'evangelion', title: 'Евангелион', year: 1995, tags: ['меха', 'психология'] },
  { id: 'tokyoghoul', title: 'Токийский гуль', year: 2014, tags: ['ужасы', 'драма'] },
  { id: 'saekano', title: 'Saekano', year: 2015, tags: ['романтика', 'комедия'] },
  { id: 'violet', title: 'Вайолет Эвергарден', year: 2018, tags: ['драма', 'фэнтези'] },
  { id: 'spicewolf', title: 'Волчица и пряности', year: 2008, tags: ['фэнтези', 'романтика'] },
  { id: 'kaguya', title: 'Госпожа Кагуя: В любви как на войне', year: 2019, tags: ['романтика', 'комедия'] },
  { id: 'drstone', title: 'Доктор Стоун', year: 2019, tags: ['приключения', 'наука'] },
  { id: 'bebop', title: 'Ковбой Бибоп', year: 1998, tags: ['космос', 'нуар'] },
  { id: 'mobpsycho', title: 'Моб Психо 100', year: 2016, tags: ['экшен', 'комедия'] },
  { id: 'apothecary', title: 'Монолог фармацевта', year: 2023, tags: ['детектив', 'исторический'] },
  { id: 'monster', title: 'Монстр', year: 2004, tags: ['триллер', 'психология'] },
  { id: 'oregairu', title: 'Моя подростковая романтическая комедия', year: 2013, tags: ['романтика', 'школа'] },
  { id: 'nana', title: 'Нана', year: 2006, tags: ['драма', 'музыка'] },
  { id: 'nagatoro', title: 'Не издевайся, Нагаторо', year: 2021, tags: ['романтика', 'комедия'] },
  { id: 'vinland', title: 'Сага о Винланде', year: 2019, tags: ['исторический', 'драма'] },
  { id: 'blueexorcist', title: 'Синий экзорцист', year: 2011, tags: ['сёнен', 'мистика'] },
  { id: 'trigun', title: 'Триган', year: 1998, tags: ['вестерн', 'экшен'] },
  { id: 'hellsing', title: 'Хеллсинг', year: 2001, tags: ['ужасы', 'вампиры'] },
  { id: 'horimiya', title: 'Хоримия', year: 2021, tags: ['романтика', 'школа'] },
  { id: 'blacklagoon', title: 'Чёрная лагуна', year: 2006, tags: ['экшен', 'криминал'] },
  { id: 'blackclover', title: 'Чёрный клевер', year: 2017, tags: ['сёнен', 'магия'] },
];

const SERIES_EN: Record<string, { title: string; tags: string[] }> = {
  naruto: { title: 'Naruto', tags: ['shonen', 'ninja'] },
  aot: { title: 'Attack on Titan', tags: ['action', 'drama'] },
  onepiece: { title: 'One Piece', tags: ['shonen', 'adventure'] },
  deathnote: { title: 'Death Note', tags: ['psychological', 'thriller'] },
  mha: { title: 'My Hero Academia', tags: ['shonen', 'superheroes'] },
  demonslayer: { title: 'Demon Slayer', tags: ['shonen', 'demons'] },
  jjk: { title: 'Jujutsu Kaisen', tags: ['shonen', 'supernatural'] },
  fma: { title: 'Fullmetal Alchemist', tags: ['shonen', 'adventure'] },
  bleach: { title: 'Bleach', tags: ['shonen', 'spirits'] },
  hxh: { title: 'Hunter x Hunter', tags: ['shonen', 'adventure'] },
  opm: { title: 'One Punch Man', tags: ['parody', 'action'] },
  csm: { title: 'Chainsaw Man', tags: ['shonen', 'horror'] },
  spyfamily: { title: 'Spy x Family', tags: ['comedy', 'action'] },
  sao: { title: 'Sword Art Online', tags: ['virtual reality'] },
  codegeass: { title: 'Code Geass', tags: ['mecha', 'drama'] },
  frieren: { title: "Frieren: Beyond Journey's End", tags: ['fantasy', 'drama'] },
  rezero: { title: 'Re:Zero', tags: ['isekai', 'drama'] },
  konosuba: { title: 'KonoSuba', tags: ['isekai', 'comedy'] },
  evangelion: { title: 'Evangelion', tags: ['mecha', 'psychological'] },
  tokyoghoul: { title: 'Tokyo Ghoul', tags: ['horror', 'drama'] },
  saekano: { title: 'Saekano: How to Raise a Boring Girlfriend', tags: ['romance', 'comedy'] },
  violet: { title: 'Violet Evergarden', tags: ['drama', 'fantasy'] },
  spicewolf: { title: 'Spice and Wolf', tags: ['fantasy', 'romance'] },
  kaguya: { title: 'Kaguya-sama: Love Is War', tags: ['romance', 'comedy'] },
  drstone: { title: 'Dr. Stone', tags: ['adventure', 'science'] },
  bebop: { title: 'Cowboy Bebop', tags: ['space', 'noir'] },
  mobpsycho: { title: 'Mob Psycho 100', tags: ['action', 'comedy'] },
  apothecary: { title: 'The Apothecary Diaries', tags: ['mystery', 'historical'] },
  monster: { title: 'Monster', tags: ['thriller', 'psychological'] },
  oregairu: { title: 'My Teen Romantic Comedy SNAFU', tags: ['romance', 'school'] },
  nana: { title: 'Nana', tags: ['drama', 'music'] },
  nagatoro: { title: "Don't Toy with Me, Miss Nagatoro", tags: ['romance', 'comedy'] },
  vinland: { title: 'Vinland Saga', tags: ['historical', 'drama'] },
  blueexorcist: { title: 'Blue Exorcist', tags: ['shonen', 'supernatural'] },
  trigun: { title: 'Trigun', tags: ['western', 'action'] },
  hellsing: { title: 'Hellsing', tags: ['horror', 'vampires'] },
  horimiya: { title: 'Horimiya', tags: ['romance', 'school'] },
  blacklagoon: { title: 'Black Lagoon', tags: ['action', 'crime'] },
  blackclover: { title: 'Black Clover', tags: ['shonen', 'magic'] },
};

export function seriesTitle(series: AnimeSeries, lang: Language): string {
  return pick(series.title, SERIES_EN[series.id]?.title, lang);
}

/** The genre tags, in the reader's language. The English table already
 * carries them; this is the only way out of the module. */
export function seriesTags(series: AnimeSeries, lang: Language): string[] {
  const english = SERIES_EN[series.id]?.tags;
  return lang === 'en' && english ? english : series.tags;
}

export function seriesTitleById(id: string, lang: Language): string {
  const series = ANIME_SERIES.find((s) => s.id === id);
  return series ? seriesTitle(series, lang) : id;
}
