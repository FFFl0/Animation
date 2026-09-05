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
  { id: 'hxh', title: 'Охотник х Охотник', year: 2011, tags: ['сёнен', 'приключения'] },
  { id: 'opm', title: 'Ванпанчмен', year: 2015, tags: ['пародия', 'экшен'] },
  { id: 'csm', title: 'Человек-бензопила', year: 2022, tags: ['сёнен', 'ужасы'] },
  { id: 'spyfamily', title: 'Семья шпиона', year: 2022, tags: ['комедия', 'экшен'] },
  { id: 'sao', title: 'Мастера меча онлайн', year: 2012, tags: ['виртуальная реальность'] },
  { id: 'codegeass', title: 'Код Гиас', year: 2006, tags: ['меха', 'драма'] },
  { id: 'frieren', title: 'Фрирен: Прощание с магией', year: 2023, tags: ['фэнтези', 'драма'] },
  { id: 'rezero', title: 'Re:Zero', year: 2016, tags: ['исекай', 'драма'] },
  { id: 'konosuba', title: 'Конобаба', year: 2016, tags: ['исекай', 'комедия'] },
  { id: 'evangelion', title: 'Евангелион', year: 1995, tags: ['меха', 'психология'] },
  { id: 'tokyoghoul', title: 'Токийский гуль', year: 2014, tags: ['ужасы', 'драма'] },
];
