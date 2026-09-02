export type Character = {
  id: string;
  name: string;
  series: string;
  hint: string;
  color: string;
};

export const CHARACTERS: Character[] = [
  { id: 'sakura', name: 'Sakura Haruno', series: 'Naruto', hint: 'Ученица легендарной целительницы, обладает нечеловеческой силой удара', color: '#F7A8C4' },
  { id: 'hinata', name: 'Hinata Hyuga', series: 'Naruto', hint: 'Наследница клана с белыми глазами и техникой Byakugan', color: '#B39DDB' },
  { id: 'mikasa', name: 'Mikasa Ackerman', series: 'Attack on Titan', hint: 'Носит красный шарф и считается одним из сильнейших бойцов человечества', color: '#EF9A9A' },
  { id: 'asuka', name: 'Asuka Langley Soryu', series: 'Neon Genesis Evangelion', hint: 'Пилот EVA-02, рыжая и невероятно гордая собой', color: '#FF8A65' },
  { id: 'rei', name: 'Rei Ayanami', series: 'Neon Genesis Evangelion', hint: 'Пилот EVA-00 с голубыми волосами и почти безэмоциональным взглядом', color: '#90CAF9' },
  { id: 'nami', name: 'Nami', series: 'One Piece', hint: 'Штурман пиратской команды, обожает деньги и рисует карты', color: '#FFD54F' },
  { id: 'robin', name: 'Nico Robin', series: 'One Piece', hint: 'Археолог команды, умеет размножать части своего тела', color: '#CE93D8' },
  { id: 'usagi', name: 'Usagi Tsukino', series: 'Sailor Moon', hint: 'Превращается в лунного воина в двух хвостиках-одангах', color: '#FFF176' },
  { id: 'rem', name: 'Rem', series: 'Re:Zero', hint: 'Голубоволосая горничная-демон, сражается двуручным цепом', color: '#4FC3F7' },
  { id: 'emilia', name: 'Emilia', series: 'Re:Zero', hint: 'Полуэльфийка с серебристыми волосами, мечтает стать правительницей королевства', color: '#B0BEC5' },
  { id: 'zerotwo', name: 'Zero Two', series: 'Darling in the Franxx', hint: 'Рогатый пилот-гибрид, зовёт напарника "Дорогой"', color: '#EC407A' },
  { id: 'violet', name: 'Violet Evergarden', series: 'Violet Evergarden', hint: 'Бывший солдат с протезами рук, пишет письма за других людей', color: '#9FA8DA' },
  { id: 'chihiro', name: 'Chihiro Ogino', series: 'Spirited Away', hint: 'Попадает в мир духов и устраивается работать в баню', color: '#A5D6A7' },
  { id: 'kagome', name: 'Kagome Higurashi', series: 'Inuyasha', hint: 'Школьница, провалившаяся сквозь колодец в эпоху Сэнгоку', color: '#80CBC4' },
  { id: 'lucy', name: 'Lucy Heartfilia', series: 'Fairy Tail', hint: 'Волшебница, призывающая духов ключами Врат Зодиака', color: '#FFCC80' },
  { id: 'erza', name: 'Erza Scarlet', series: 'Fairy Tail', hint: 'Рыцарь с алыми волосами, меняет броню в бою', color: '#E57373' },
  { id: 'winry', name: 'Winry Rockbell', series: 'Fullmetal Alchemist', hint: 'Гениальный механик протезов из Ризенбурга', color: '#FFE082' },
  { id: 'cc', name: 'C.C.', series: 'Code Geass', hint: 'Бессмертная девушка с зелёными волосами, обожает пиццу', color: '#AED581' },
  { id: 'mikoto', name: 'Mikoto Misaka', series: 'A Certain Scientific Railgun', hint: 'Электрический эспер, известна ударом "рельсотрон"', color: '#FFF59D' },
  { id: 'yuno', name: 'Yuno Gasai', series: 'Future Diary', hint: 'Одержимо влюблённая участница смертельной игры дневников', color: '#F48FB1' },
  { id: 'homura', name: 'Homura Akemi', series: 'Puella Magi Madoka Magica', hint: 'Девушка-волшебница с чёрными волосами, умеющая управлять временем', color: '#9575CD' },
  { id: 'madoka', name: 'Madoka Kaname', series: 'Puella Magi Madoka Magica', hint: 'Розоволосая школьница, чьё желание меняет саму суть магии', color: '#F8BBD0' },
  { id: 'asuna', name: 'Asuna Yuuki', series: 'Sword Art Online', hint: 'Заместитель командира гильдии, известна как "Вспышка молнии"', color: '#FFAB91' },
  { id: 'rin', name: 'Rin Tohsaka', series: 'Fate/stay night', hint: 'Гордая наследница школы магии, использует драгоценные камни как оружие', color: '#64B5F6' },
];
