export type HairStyle = 'long' | 'twin' | 'bob' | 'wavy' | 'odango' | 'animalEars' | 'horns' | 'wild';

export type Avatar = {
  hairColor: string;
  hairStyle: HairStyle;
  eyeColor: string;
  accent: string;
  badge: string;
};

export type Character = {
  id: string;
  name: string;
  nameEn: string;
  series: string;
  description: string;
  question: string;
  answer: string;
  distractors: [string, string, string];
  avatar: Avatar;
};

export const CHARACTERS: Character[] = [
  {
    id: 'nezuko', name: 'Незуко Камадо', nameEn: 'Nezuko Kamado', series: 'Demon Slayer',
    description: 'Младшая сестра Танджиро, превращённая в демона, но сохранившая человечность. Носит бамбуковый намордник.',
    question: 'Почему Незуко носит бамбук во рту?', answer: 'Чтобы не укусить человека',
    distractors: ['Чтобы не терять голос', 'Это было приказом Хашибиры', 'Чтобы не чувствовать голод'],
    avatar: { hairColor: '#F5967A', hairStyle: 'long', eyeColor: '#E85D8A', accent: '#FCD9CE', badge: '🎋' },
  },
  {
    id: 'mikasa', name: 'Микаса Аккерман', nameEn: 'Mikasa Ackerman', series: 'Attack on Titan',
    description: 'Приёмная сестра Эрена и лучший боец своего выпуска. Красный шарф — её символ.',
    question: 'Кто подарил Микасе красный шарф?', answer: 'Эрен Йегер',
    distractors: ['Леви Аккерман', 'Армин Арлерт', 'Ханджи Зоэ'],
    avatar: { hairColor: '#2B2B33', hairStyle: 'bob', eyeColor: '#7C8C99', accent: '#DCE3E8', badge: '🧣' },
  },
  {
    id: 'usagi', name: 'Усаги Цукино', nameEn: 'Usagi Tsukino', series: 'Sailor Moon',
    description: 'Плаксивая школьница, оказавшаяся воином в матроске и принцессой Луны.',
    question: 'Как зовут говорящую кошку, которая нашла Усаги?', answer: 'Луна',
    distractors: ['Артемис', 'Диана', 'Мяу'],
    avatar: { hairColor: '#FBD34D', hairStyle: 'odango', eyeColor: '#4A6FE0', accent: '#FFF3C4', badge: '🌙' },
  },
  {
    id: 'rem', name: 'Рем', nameEn: 'Rem', series: 'Re:Zero',
    description: 'Горничная-они с голубыми волосами, беззаветно преданная Субару.',
    question: 'Как зовут сестру-близнеца Рем?', answer: 'Рам',
    distractors: ['Эмилия', 'Петра', 'Фредерика'],
    avatar: { hairColor: '#5FB8E0', hairStyle: 'bob', eyeColor: '#4A6FE0', accent: '#D6F0FA', badge: '🎀' },
  },
  {
    id: 'asuka', name: 'Аска Лэнгли Сорью', nameEn: 'Asuka Langley Soryu', series: 'Neon Genesis Evangelion',
    description: 'Гордая и вспыльчивая пилот, за резкостью прячущая детскую травму.',
    question: 'Каким номером обозначена Ева, которой управляет Аска?', answer: 'Ева-02',
    distractors: ['Ева-00', 'Ева-01', 'Ева-03'],
    avatar: { hairColor: '#E8632E', hairStyle: 'twin', eyeColor: '#3E7BD6', accent: '#FCDCCB', badge: '⚡' },
  },
  {
    id: 'rei', name: 'Рей Аянами', nameEn: 'Rei Ayanami', series: 'Neon Genesis Evangelion',
    description: 'Молчаливая девушка с голубыми волосами и красными глазами, связанная с тайной NERV.',
    question: 'Пилотом какой Евы является Рей?', answer: 'Ева-00',
    distractors: ['Ева-01', 'Ева-02', 'Ева-03'],
    avatar: { hairColor: '#A9C9E8', hairStyle: 'bob', eyeColor: '#D0362B', accent: '#E4EEF7', badge: '❄️' },
  },
  {
    id: 'hinata', name: 'Хината Хьюга', nameEn: 'Hinata Hyuga', series: 'Naruto',
    description: 'Застенчивая наследница клана Хьюга, влюблённая в Наруто с детства.',
    question: 'Какой техникой глаз владеет клан Хьюга?', answer: 'Бьякуган',
    distractors: ['Шаринган', 'Ринненган', 'Тенсейган'],
    avatar: { hairColor: '#2E2A4A', hairStyle: 'long', eyeColor: '#D8CBEF', accent: '#E9E1F7', badge: '👁️' },
  },
  {
    id: 'sakura', name: 'Сакура Харуно', nameEn: 'Sakura Haruno', series: 'Naruto',
    description: 'Участница 7-й команды, ставшая выдающимся медиком-ниндзя с чудовищной силой удара.',
    question: 'Кто обучал Сакуру медицинскому ниндзюцу?', answer: 'Цунаде',
    distractors: ['Какаши Хатаке', 'Ирука Умино', 'Шизуне'],
    avatar: { hairColor: '#F2A0C4', hairStyle: 'bob', eyeColor: '#5FA96B', accent: '#FCE3F0', badge: '👊' },
  },
  {
    id: 'nami', name: 'Нами', nameEn: 'Nami', series: 'One Piece',
    description: 'Рыжеволосая воровка и картограф, мечтающая нарисовать карту всего мира.',
    question: 'Какую роль Нами выполняет в команде Соломенной Шляпы?', answer: 'Навигатор',
    distractors: ['Кок', 'Врач', 'Снайпер'],
    avatar: { hairColor: '#E8862E', hairStyle: 'wavy', eyeColor: '#7A5230', accent: '#CDEBF5', badge: '🗺️' },
  },
  {
    id: 'erza', name: 'Эрза Скарлет', nameEn: 'Erza Scarlet', series: 'Fairy Tail',
    description: 'Маг-перевоплощенец, меняющая доспехи в бою; строгая, но заботливая.',
    question: 'Каким прозвищем известна Эрза?', answer: 'Титания (Королева фей)',
    distractors: ['Алая Дева', 'Стальная Магия', 'Огненная Королева'],
    avatar: { hairColor: '#C4293A', hairStyle: 'long', eyeColor: '#5B3A2A', accent: '#F3D3D6', badge: '⚔️' },
  },
  {
    id: 'tohru', name: 'Тохру Хонда', nameEn: 'Tohru Honda', series: 'Fruits Basket',
    description: 'Добрая сирота, поселившаяся в доме семьи Сома и раскрывшая их проклятие.',
    question: 'В кого превращаются члены семьи Сома?', answer: 'В животных китайского зодиака',
    distractors: ['В демонов', 'В призраков', 'В драконов'],
    avatar: { hairColor: '#7A5230', hairStyle: 'bob', eyeColor: '#6B4A2F', accent: '#F5E7D3', badge: '🍚' },
  },
  {
    id: 'violet', name: 'Виолет Эвергарден', nameEn: 'Violet Evergarden', series: 'Violet Evergarden',
    description: 'Бывшее оружие войны, учащаяся понимать чувства через чужие письма.',
    question: 'Кем работает Виолет после войны?', answer: 'Авто-мемуарной куклой (пишет письма)',
    distractors: ['Учительницей', 'Медсестрой', 'Телохранителем'],
    avatar: { hairColor: '#D9B24C', hairStyle: 'long', eyeColor: '#5A9BD6', accent: '#F6EBC9', badge: '✉️' },
  },
  {
    id: 'marin', name: 'Марин Китагава', nameEn: 'Marin Kitagawa', series: 'My Dress-Up Darling',
    description: 'Яркая и открытая школьница, которой Годзё шьёт костюмы.',
    question: 'Каким хобби увлечена Марин?', answer: 'Косплеем',
    distractors: ['Вязанием', 'Каллиграфией', 'Фотографией'],
    avatar: { hairColor: '#E85D9C', hairStyle: 'twin', eyeColor: '#D6893E', accent: '#FBDCEA', badge: '🧵' },
  },
  {
    id: 'anya', name: 'Анья Форджер', nameEn: 'Anya Forger', series: 'Spy x Family',
    description: 'Приёмная дочь шпиона, тайно читающая мысли окружающих.',
    question: 'Какой способностью обладает Анья?', answer: 'Телепатия (чтение мыслей)',
    distractors: ['Телекинез', 'Невидимость', 'Предвидение'],
    avatar: { hairColor: '#EFAFD0', hairStyle: 'bob', eyeColor: '#6BAE6B', accent: '#DFF2DD', badge: '🥜' },
  },
  {
    id: 'yor', name: 'Йор Форджер', nameEn: 'Yor Forger', series: 'Spy x Family',
    description: 'Скромная служащая мэрии и заботливая «мама» — с очень опасной второй жизнью.',
    question: 'Какая тайная профессия у Йор?', answer: 'Наёмная убийца («Принцесса шипов»)',
    distractors: ['Шпионка', 'Полицейский детектив', 'Телохранитель'],
    avatar: { hairColor: '#241F26', hairStyle: 'long', eyeColor: '#8A2B3A', accent: '#E7D2D6', badge: '🗡️' },
  },
  {
    id: 'makima', name: 'Макима', nameEn: 'Makima', series: 'Chainsaw Man',
    description: 'Хладнокровная кураторша Дэндзи из Общественной безопасности.',
    question: 'Демоном чего оказывается Макима?', answer: 'Демон Контроля',
    distractors: ['Демон Бензопилы', 'Демон Ужаса', 'Демон Оружия'],
    avatar: { hairColor: '#A8452E', hairStyle: 'long', eyeColor: '#D6A23E', accent: '#F0DCC9', badge: '⛓️' },
  },
  {
    id: 'power', name: 'Пауэр', nameEn: 'Power', series: 'Chainsaw Man',
    description: 'Наглая и эгоистичная демоница с рогами, напарница Дэндзи.',
    question: 'Демоном чего является Пауэр?', answer: 'Демон Крови',
    distractors: ['Демон Огня', 'Демон Тьмы', 'Демон Смерти'],
    avatar: { hairColor: '#F2C6D6', hairStyle: 'horns', eyeColor: '#D6C23E', accent: '#FBE6EE', badge: '🩸' },
  },
  {
    id: 'zerotwo', name: 'Зеро Ту', nameEn: 'Zero Two', series: 'Darling in the FranXX',
    description: 'Девушка с рогами и красной кожей в форме пилота, называющая Хиро «дорогой».',
    question: 'Какой кодовый номер носит Зеро Ту?', answer: '002',
    distractors: ['001', '015', '090'],
    avatar: { hairColor: '#E8577A', hairStyle: 'horns', eyeColor: '#3EC7C7', accent: '#FAD6DE', badge: '👹' },
  },
  {
    id: 'holo', name: 'Холо', nameEn: 'Holo', series: 'Spice and Wolf',
    description: 'Мудрая волчица-богиня урожая в облике девушки, спутница торговца Лоуренса.',
    question: 'В кого может обращаться Холо?', answer: 'В огромную волчицу',
    distractors: ['В лису', 'В медведя', 'В сову'],
    avatar: { hairColor: '#B5622E', hairStyle: 'animalEars', eyeColor: '#D6A23E', accent: '#F2DFC4', badge: '🐺' },
  },
  {
    id: 'san', name: 'Сан', nameEn: 'San', series: 'Princess Mononoke',
    description: 'Девушка, выросшая в лесу и защищающая его от людей.',
    question: 'Кто вырастил Сан?', answer: 'Волчица Моро',
    distractors: ['Бог леса', 'Леди Эбоси', 'Дух дерева'],
    avatar: { hairColor: '#EDEDED', hairStyle: 'wild', eyeColor: '#B5342B', accent: '#DCEBDA', badge: '🐾' },
  },
  {
    id: 'chihiro', name: 'Тихиро Огино', nameEn: 'Chihiro Ogino', series: 'Spirited Away',
    description: 'Обычная девочка, попавшая в мир духов и работающая в купальнях.',
    question: 'Какое имя дала Тихиро колдунья Юбаба?', answer: 'Сэн',
    distractors: ['Тихи', 'Огино', 'Рин'],
    avatar: { hairColor: '#5B3A2A', hairStyle: 'bob', eyeColor: '#4A3A2A', accent: '#CDE7DF', badge: '♨️' },
  },
  {
    id: 'kurisu', name: 'Курису Макисэ', nameEn: 'Kurisu Makise', series: 'Steins;Gate',
    description: 'Юный гений-нейробиолог, помогающая разобраться с путешествиями во времени.',
    question: 'В каком районе Токио разворачивается действие Steins;Gate?', answer: 'Акихабара',
    distractors: ['Сибуя', 'Синдзюку', 'Икебукуро'],
    avatar: { hairColor: '#C4293A', hairStyle: 'twin', eyeColor: '#5FA96B', accent: '#F0D9DC', badge: '🔬' },
  },
  {
    id: 'kaori', name: 'Каори Миядзоно', nameEn: 'Kaori Miyazono', series: 'Your Lie in April',
    description: 'Свободолюбивая исполнительница, вернувшая Косэю музыку.',
    question: 'На каком инструменте играет Каори?', answer: 'На скрипке',
    distractors: ['На фортепиано', 'На флейте', 'На виолончели'],
    avatar: { hairColor: '#D9B24C', hairStyle: 'bob', eyeColor: '#5FA96B', accent: '#FBF0C9', badge: '🎻' },
  },
  {
    id: 'shinobu', name: 'Шинобу Кочо', nameEn: 'Shinobu Kocho', series: 'Demon Slayer',
    description: 'Столп насекомых: не может рубить головы демонам, поэтому побеждает ядом.',
    question: 'Из какого растения сделан яд Шинобу?', answer: 'Из глицинии (вистерии)',
    distractors: ['Из аконита', 'Из белладонны', 'Из лотоса'],
    avatar: { hairColor: '#7C5CB8', hairStyle: 'long', eyeColor: '#8A6BC7', accent: '#E9E0F5', badge: '🦋' },
  },
  {
    id: 'toga', name: 'Химико Тога', nameEn: 'Himiko Toga', series: 'My Hero Academia',
    description: 'Улыбчивая злодейка из Лиги, одержимая кровью.',
    question: 'Что позволяет делать причуда Тоги?', answer: 'Принимать облик того, чьей кровью она напилась',
    distractors: ['Читать мысли жертвы', 'Управлять кровью на расстоянии', 'Становиться невидимой'],
    avatar: { hairColor: '#F2C93E', hairStyle: 'twin', eyeColor: '#D6A23E', accent: '#FBF0C4', badge: '🩸' },
  },
];
