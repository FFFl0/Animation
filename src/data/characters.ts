import { Avatar, makeAvatar } from './avatar';
import { TierId } from './difficulty';
import { Language } from '../i18n/LanguageContext';
import { pick } from './localize';

export type Gender = 'male' | 'female' | 'other';

export type Character = {
  id: string;
  name: string;
  seriesId: string;
  gender: Gender;
  tier: TierId;
  quote: string;
  ability: string;
  faction: string;
  avatar: Avatar;
};

function c(
  id: string,
  name: string,
  seriesId: string,
  gender: Gender,
  tier: TierId,
  quote: string,
  ability: string,
  faction: string,
  overrides: Partial<Avatar> = {}
): Character {
  return { id, name, seriesId, gender, tier, quote, ability, faction, avatar: makeAvatar(id, overrides) };
}

export const CHARACTERS: Character[] = [
  // Наруто
  c('naruto-1', 'Наруто Удзумаки', 'naruto', 'male', 'novice', 'Я никогда не сдаюсь — это мой путь ниндзя!', 'Расенган', 'Деревня Скрытого Листа', { hairStyle: 'spiky', hairColor: '#D9B24C' }),
  c('naruto-2', 'Саске Учиха', 'naruto', 'male', 'fan', 'Месть — единственное, что у меня осталось.', 'Шаринган и Сусаноо', 'Клан Учиха'),
  c('naruto-3', 'Какаши Хатаке', 'naruto', 'male', 'otaku', 'Те, кто нарушает правила, — отбросы.', 'Тысяча птиц', 'Деревня Скрытого Листа'),

  // Атака титанов
  c('aot-1', 'Эрен Йегер', 'aot', 'male', 'novice', 'Я буду продолжать сражаться, пока не уничтожу всех врагов.', 'Титан-Атакующий', 'Разведкорпус'),
  c('aot-2', 'Микаса Аккерман', 'aot', 'female', 'fan', 'Этот мир жесток, но и прекрасен.', 'Клинки Аккерманов', 'Разведкорпус'),
  c('aot-3', 'Леви Аккерман', 'aot', 'male', 'otaku', 'Выбирай сам, о чём потом будешь жалеть.', 'Молниеносная атака клинками', 'Разведкорпус'),

  // Ван-Пис
  c('op-1', 'Монки Д. Луффи', 'onepiece', 'male', 'novice', 'Я стану королём пиратов!', 'Плод Гому-Гому', 'Пираты Соломенной Шляпы', { hairStyle: 'short', hairColor: '#2B2B33' }),
  c('op-2', 'Ророноа Зоро', 'onepiece', 'male', 'fan', 'Заблудиться — тоже часть пути.', 'Стиль трёх мечей', 'Пираты Соломенной Шляпы'),
  c('op-3', 'Нами', 'onepiece', 'female', 'otaku', 'Деньги и карты — вот что важно.', 'Погодный жезл Клима-Такт', 'Пираты Соломенной Шляпы'),

  // Тетрадь смерти
  c('dn-1', 'Лайт Ягами', 'deathnote', 'male', 'novice', 'В этом новом мире я стану богом.', 'Тетрадь смерти', 'Кira'),
  c('dn-2', 'Л', 'deathnote', 'male', 'fan', 'Вероятность того, что я неправ, крайне мала.', 'Дедукция и стратегия', 'Международная полиция'),
  c('dn-3', 'Рюк', 'deathnote', 'male', 'otaku', 'Мне просто было скучно в мире шинигами.', 'Глаза шинигами', 'Мир шинигами'),

  // Моя геройская академия
  c('mha-1', 'Изуку Мидория', 'mha', 'male', 'novice', 'Я тоже могу стать героем!', 'Единственное для всех (One For All)', 'Академия Юэй'),
  c('mha-2', 'Кацуки Бакуго', 'mha', 'male', 'fan', 'Я стану героем номер один, никак не меньше.', 'Взрывной пот', 'Академия Юэй'),
  c('mha-3', 'Очако Урарака', 'mha', 'female', 'otaku', 'Я хочу быть героем, который делает людей счастливыми.', 'Невесомость', 'Академия Юэй'),

  // Клинок, рассекающий демонов
  c('ds-1', 'Танджиро Камадо', 'demonslayer', 'male', 'novice', 'Я никому не позволю больше страдать.', 'Дыхание воды', 'Корпус истребителей демонов'),
  c('ds-2', 'Незуко Камадо', 'demonslayer', 'female', 'fan', 'Она защищает брата, даже не произнося ни слова.', 'Демоническое пламя крови', 'Семья Камадо'),
  c('ds-3', 'Зенитsu Агацума', 'demonslayer', 'male', 'otaku', 'Я боюсь всего, но всё равно иду вперёд.', 'Дыхание грома', 'Корпус истребителей демонов'),

  // Магическая битва
  c('jjk-1', 'Юджи Итадори', 'jjk', 'male', 'novice', 'Я просто хочу, чтобы люди умирали по-человечески.', 'Проклятая энергия и сила Сукуны', 'Техническая школа Токио'),
  c('jjk-2', 'Сатору Годзё', 'jjk', 'male', 'fan', 'Не переживай, я самый сильный.', 'Безграничность и Шесть глаз', 'Техническая школа Токио'),
  c('jjk-3', 'Мегуми Фушигуро', 'jjk', 'male', 'legend', 'Я использую то, что у меня есть, чтобы защитить других.', 'Десять теней', 'Техническая школа Токио'),

  // Стальной алхимик
  c('fma-1', 'Эдвард Элрик', 'fma', 'male', 'novice', 'Человечество не может ничего получить, не отдав что-то взамен.', 'Алхимия без круга', 'Государственные алхимики'),
  c('fma-2', 'Альфонс Элрик', 'fma', 'male', 'fan', 'Мы вернём наши тела во что бы то ни стало.', 'Алхимия трансмутации', 'Братья Элрик'),
  c('fma-3', 'Рой Мустанг', 'fma', 'male', 'expert', 'В один прекрасный день я стану во главе страны.', 'Пламенная алхимия', 'Государственные алхимики'),

  // Блич
  c('bleach-1', 'Ичиго Куросаки', 'bleach', 'male', 'novice', 'Я защищаю всех, кто мне дорог, своим мечом.', 'Гецуга Теншо', 'Синигами-заместитель'),
  c('bleach-2', 'Рукия Кучики', 'bleach', 'female', 'otaku', 'Сила без сострадания — ничто.', 'Танцующий белый клинок', 'Готей 13'),
  c('bleach-3', 'Тоширо Хицугая', 'bleach', 'male', 'expert', 'Не путай моё звание с моим возрастом.', 'Ледяное бандзюцу', 'Готей 13'),

  // Охотник х Охотник
  c('hxh-1', 'Гон Фрикс', 'hxh', 'male', 'novice', 'Я найду отца и стану охотником, как он.', 'Джаджанкен', 'Лицензированные охотники'),
  c('hxh-2', 'Киллуа Золдик', 'hxh', 'male', 'otaku', 'Дружба важнее, чем то, чему меня учили.', 'Молниеносные атаки электричеством', 'Семья убийц Золдик'),
  c('hxh-3', 'Хисока Морроу', 'hxh', 'male', 'expert', 'Мне просто интересно, насколько ты силён.', 'Резинка (Бунги Гам)', 'Труппа Фантомов'),

  // Ванпанчмен
  c('opm-1', 'Сайтама', 'opm', 'male', 'fan', 'Я просто герой ради развлечения.', 'Удар одним кулаком', 'Ассоциация героев'),
  c('opm-2', 'Генос', 'opm', 'male', 'expert', 'Я стану достаточно сильным, чтобы отомстить.', 'Кибернетическая пушка', 'Ассоциация героев'),

  // Человек-бензопила
  c('csm-1', 'Дэндзи', 'csm', 'male', 'fan', 'Я просто хочу нормальную жизнь с тостом по утрам.', 'Трансформация в дьявола бензопилы', 'Служба безопасности Токио'),
  c('csm-2', 'Пауэр', 'csm', 'female', 'expert', 'Кровь — моя стихия, бойся меня.', 'Контроль над кровью', 'Служба безопасности Токио'),

  // Семья шпиона
  c('sf-1', 'Лойд Форджер', 'spyfamily', 'male', 'fan', 'Мир начинается с крепкой семьи.', 'Мастер маскировки и боевых искусств', 'Разведка Вестализа'),
  c('sf-2', 'Аня Форджер', 'spyfamily', 'female', 'expert', 'Аня, кажется, поняла!', 'Телепатия', 'Семья Форджер'),
  c('sf-3', 'Йор Форджер', 'spyfamily', 'female', 'legend', 'Хорошая жена всегда защитит свою семью.', 'Скрытые навыки убийцы', 'Семья Форджер'),

  // Мастера меча онлайн
  c('sao-1', 'Кирито', 'sao', 'male', 'novice', 'Пока я жив, я буду защищать тех, кто мне дорог.', 'Стиль двух мечей', 'Игроки SAO'),
  c('sao-2', 'Асуна', 'sao', 'female', 'otaku', 'Я не буду просто ждать, я тоже сражаюсь.', 'Рапира и молниеносные удары', 'Гильдия Клинок Рассвета'),

  // Код Гиас
  c('cg-1', 'Лелуш Ламперуж', 'codegeass', 'male', 'legend', 'Я, Лелуш, приказываю тебе!', 'Гиас — сила абсолютного приказа', 'Орден Чёрных Рыцарей'),
  c('cg-2', 'Ц.Ц.', 'codegeass', 'female', 'expert', 'Пицца — единственное, что имеет значение.', 'Бессмертие и код Гиаса', 'Орден Чёрных Рыцарей'),

  // Фрирен
  c('fr-1', 'Фрирен', 'frieren', 'female', 'otaku', 'Человеческая жизнь так коротка, а я лишь начинаю её понимать.', 'Древняя магия эльфов', 'Странствующие маги'),
  c('fr-2', 'Ферн', 'frieren', 'female', 'legend', 'Я буду учиться магии, чтобы идти рядом с ней.', 'Боевая магия', 'Странствующие маги'),

  // Re:Zero
  c('rz-1', 'Субару Нацуки', 'rezero', 'male', 'expert', 'Я снова и снова буду возвращаться, чтобы всех спасти.', '«Возвращение смертью»', 'Особняк Розваль'),
  c('rz-2', 'Рем', 'rezero', 'female', 'expert', 'Для меня лишь ты, Субару, значишь всё.', 'Ледяная магия и боевой цеп', 'Особняк Розваль'),
  c('rz-3', 'Эмилия', 'rezero', 'female', 'legend', 'Я хочу стать доброй правительницей для всех.', 'Магия льда полуэльфов', 'Кандидаты в правители'),

  // Konosuba
  c('ks-1', 'Казума Сато', 'konosuba', 'male', 'expert', 'В другом мире я просто хочу спокойной жизни.', 'Кража и побег', 'Отряд Казумы'),
  c('ks-2', 'Аква', 'konosuba', 'female', 'legend', 'Я богиня, меня следует почитать!', 'Очищение и создание воды', 'Богиня-проводник'),
  c('ks-3', 'Мегумин', 'konosuba', 'female', 'legend', 'Взрыв — единственная магия, достойная меня!', 'Взрыв (Explosion)', 'Клан кризодов'),

  // Евангелион
  c('eva-1', 'Синдзи Икари', 'evangelion', 'male', 'otaku', 'Мне нельзя убегать, мне нельзя убегать...', 'Пилот Евангелиона-01', 'НЕРВ'),
  c('eva-2', 'Рей Аянами', 'evangelion', 'female', 'legend', 'Я не понимаю, что значит бояться.', 'Пилот Евангелиона-00', 'НЕРВ'),
  c('eva-3', 'Аска Лэнгли Сорю', 'evangelion', 'female', 'legend', 'Я лучшая пилотесса, и не смей забывать это.', 'Пилот Евангелиона-02', 'НЕРВ'),

  // Токийский гуль
  c('tg-1', 'Кэн Канеки', 'tokyoghoul', 'male', 'expert', 'Раньше я был человеком.', 'Регенерация гуля и кагуне', 'Кафе Antique'),
  c('tg-2', 'Тоука Киришима', 'tokyoghoul', 'female', 'legend', 'Даже гуль может хотеть жить как человек.', 'Крыло-кагуне', 'Кафе Antique'),
];

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((ch) => ch.id === id);
}

type CharacterEn = { name: string; quote: string; ability: string; faction: string };

const CHARACTER_EN: Record<string, CharacterEn> = {
  'naruto-1': { name: 'Naruto Uzumaki', quote: "I never give up — that's my ninja way!", ability: 'Rasengan', faction: 'Hidden Leaf Village' },
  'naruto-2': { name: 'Sasuke Uchiha', quote: 'Revenge is all I have left.', ability: 'Sharingan and Susanoo', faction: 'Uchiha Clan' },
  'naruto-3': { name: 'Kakashi Hatake', quote: 'Those who break the rules are scum.', ability: 'Chidori', faction: 'Hidden Leaf Village' },

  'aot-1': { name: 'Eren Yeager', quote: "I'll keep fighting until every enemy is wiped out.", ability: 'Attack Titan', faction: 'Survey Corps' },
  'aot-2': { name: 'Mikasa Ackerman', quote: 'This world is cruel, but also beautiful.', ability: 'Ackerman blade mastery', faction: 'Survey Corps' },
  'aot-3': { name: 'Levi Ackerman', quote: "Choose for yourself what you'll regret later.", ability: 'Lightning-fast blade combos', faction: 'Survey Corps' },

  'op-1': { name: 'Monkey D. Luffy', quote: "I'm gonna be King of the Pirates!", ability: 'Gum-Gum Fruit', faction: 'Straw Hat Pirates' },
  'op-2': { name: 'Roronoa Zoro', quote: 'Getting lost is part of the journey too.', ability: 'Three-Sword Style', faction: 'Straw Hat Pirates' },
  'op-3': { name: 'Nami', quote: "Money and maps — that's what matters.", ability: 'Clima-Tact weather staff', faction: 'Straw Hat Pirates' },

  'dn-1': { name: 'Light Yagami', quote: 'In this new world, I will become a god.', ability: 'Death Note', faction: 'Kira' },
  'dn-2': { name: 'L', quote: "The probability that I'm wrong is extremely low.", ability: 'Deduction and strategy', faction: 'International task force' },
  'dn-3': { name: 'Ryuk', quote: 'I was just bored in the Shinigami world.', ability: 'Shinigami eyes', faction: 'Shinigami realm' },

  'mha-1': { name: 'Izuku Midoriya', quote: 'I can become a hero too!', ability: 'One For All', faction: 'U.A. Academy' },
  'mha-2': { name: 'Katsuki Bakugo', quote: "I'll become the number one hero, nothing less.", ability: 'Explosive sweat', faction: 'U.A. Academy' },
  'mha-3': { name: 'Ochako Uraraka', quote: 'I want to be a hero who makes people smile.', ability: 'Zero Gravity', faction: 'U.A. Academy' },

  'ds-1': { name: 'Tanjiro Kamado', quote: "I won't let anyone suffer any longer.", ability: 'Water Breathing', faction: 'Demon Slayer Corps' },
  'ds-2': { name: 'Nezuko Kamado', quote: 'She protects her brother without saying a word.', ability: 'Blood Demon Art: flame', faction: 'Kamado Family' },
  'ds-3': { name: 'Zenitsu Agatsuma', quote: "I'm scared of everything, but I still move forward.", ability: 'Thunder Breathing', faction: 'Demon Slayer Corps' },

  'jjk-1': { name: 'Yuji Itadori', quote: 'I just want people to die a proper death.', ability: "Cursed energy and Sukuna's power", faction: 'Tokyo Jujutsu High' },
  'jjk-2': { name: 'Satoru Gojo', quote: "Don't worry, I'm the strongest.", ability: 'Limitless and Six Eyes', faction: 'Tokyo Jujutsu High' },
  'jjk-3': { name: 'Megumi Fushiguro', quote: 'I use what I have to protect others.', ability: 'Ten Shadows Technique', faction: 'Tokyo Jujutsu High' },

  'fma-1': { name: 'Edward Elric', quote: "Humanity can't gain anything without sacrificing something first.", ability: 'Alchemy without a transmutation circle', faction: 'State Alchemists' },
  'fma-2': { name: 'Alphonse Elric', quote: "We'll get our bodies back no matter what.", ability: 'Transmutation alchemy', faction: 'Elric Brothers' },
  'fma-3': { name: 'Roy Mustang', quote: "One day, I'll stand at the top of this country.", ability: 'Flame Alchemy', faction: 'State Alchemists' },

  'bleach-1': { name: 'Ichigo Kurosaki', quote: 'I protect everyone I care about with this blade.', ability: 'Getsuga Tensho', faction: 'Substitute Soul Reaper' },
  'bleach-2': { name: 'Rukia Kuchiki', quote: 'Power without compassion is nothing.', ability: 'Dancing white blade', faction: 'Gotei 13' },
  'bleach-3': { name: 'Toshiro Hitsugaya', quote: "Don't mistake my rank for my age.", ability: 'Ice Bankai', faction: 'Gotei 13' },

  'hxh-1': { name: 'Gon Freecss', quote: "I'll find my father and become a Hunter like him.", ability: 'Jajanken', faction: 'Licensed Hunters' },
  'hxh-2': { name: 'Killua Zoldyck', quote: 'Friendship matters more than what I was trained for.', ability: 'Lightning-fast electric strikes', faction: 'Zoldyck Assassin Family' },
  'hxh-3': { name: 'Hisoka Morow', quote: "I'm just curious how strong you really are.", ability: 'Bungee Gum', faction: 'Phantom Troupe' },

  'opm-1': { name: 'Saitama', quote: "I'm just a hero for fun.", ability: 'One Punch', faction: 'Hero Association' },
  'opm-2': { name: 'Genos', quote: "I'll become strong enough for my revenge.", ability: 'Cyborg cannon', faction: 'Hero Association' },

  'csm-1': { name: 'Denji', quote: 'I just want a normal life with toast in the morning.', ability: 'Chainsaw Devil transformation', faction: 'Tokyo Public Safety' },
  'csm-2': { name: 'Power', quote: 'Blood is my element, fear me.', ability: 'Blood control', faction: 'Tokyo Public Safety' },

  'sf-1': { name: 'Loid Forger', quote: 'A strong family is where the world begins.', ability: 'Master of disguise and combat', faction: 'Westalis Intelligence' },
  'sf-2': { name: 'Anya Forger', quote: 'Anya thinks she gets it!', ability: 'Telepathy', faction: 'Forger Family' },
  'sf-3': { name: 'Yor Forger', quote: 'A good wife always protects her family.', ability: 'Hidden assassin skills', faction: 'Forger Family' },

  'sao-1': { name: 'Kirito', quote: "As long as I'm alive, I'll protect the ones I love.", ability: 'Dual Blades style', faction: 'SAO Players' },
  'sao-2': { name: 'Asuna', quote: "I won't just wait around, I fight too.", ability: 'Rapier and lightning-fast strikes', faction: 'Knights of the Blood Oath' },

  'cg-1': { name: 'Lelouch Lamperouge', quote: 'I, Lelouch, command you!', ability: 'Geass — absolute obedience', faction: 'Order of the Black Knights' },
  'cg-2': { name: 'C.C.', quote: 'Pizza is the only thing that matters.', ability: 'Immortality and the Geass code', faction: 'Order of the Black Knights' },

  'fr-1': { name: 'Frieren', quote: "Human life is so short, and I'm only beginning to understand it.", ability: 'Ancient elven magic', faction: 'Traveling mages' },
  'fr-2': { name: 'Fern', quote: "I'll study magic so I can walk beside her.", ability: 'Combat magic', faction: 'Traveling mages' },

  'rz-1': { name: 'Subaru Natsuki', quote: "I'll come back again and again until everyone is saved.", ability: '"Return by Death"', faction: 'Roswaal Mansion' },
  'rz-2': { name: 'Rem', quote: 'For me, only you matter, Subaru.', ability: 'Ice magic and morning star', faction: 'Roswaal Mansion' },
  'rz-3': { name: 'Emilia', quote: 'I want to become a kind ruler for everyone.', ability: 'Half-elf ice magic', faction: 'Royal candidates' },

  'ks-1': { name: 'Kazuma Sato', quote: 'In another world, I just want a quiet life.', ability: 'Steal and Escape', faction: "Kazuma's Party" },
  'ks-2': { name: 'Aqua', quote: "I'm a goddess, you should worship me!", ability: 'Water purification and creation', faction: 'Guide Goddess' },
  'ks-3': { name: 'Megumin', quote: 'Explosion is the only magic worthy of me!', ability: 'Explosion', faction: 'Crimson Demon Clan' },

  'eva-1': { name: 'Shinji Ikari', quote: "I mustn't run away, I mustn't run away...", ability: 'Evangelion Unit-01 pilot', faction: 'NERV' },
  'eva-2': { name: 'Rei Ayanami', quote: "I don't understand what it means to be afraid.", ability: 'Evangelion Unit-00 pilot', faction: 'NERV' },
  'eva-3': { name: 'Asuka Langley Soryu', quote: "I'm the best pilot, don't you forget it.", ability: 'Evangelion Unit-02 pilot', faction: 'NERV' },

  'tg-1': { name: 'Ken Kaneki', quote: 'I used to be human.', ability: 'Ghoul regeneration and kagune', faction: 'Anteiku Café' },
  'tg-2': { name: 'Touka Kirishima', quote: 'Even a ghoul can want to live like a human.', ability: 'Wing kagune', faction: 'Anteiku Café' },
};

export function localizeCharacter(c: Character, lang: Language): CharacterEn {
  const en = CHARACTER_EN[c.id];
  return {
    name: pick(c.name, en?.name, lang),
    quote: pick(c.quote, en?.quote, lang),
    ability: pick(c.ability, en?.ability, lang),
    faction: pick(c.faction, en?.faction, lang),
  };
}

export function characterName(c: Character, lang: Language): string {
  return pick(c.name, CHARACTER_EN[c.id]?.name, lang);
}
