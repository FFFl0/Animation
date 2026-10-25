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
  c('naruto-4', 'Мадара Учиха', 'naruto', 'male', 'novice', 'Где есть свет, там всегда будет тень.', 'Вечный Мангекё Шаринган, Риннеган', 'Клан Учиха'),
  c('naruto-1', 'Наруто Удзумаки', 'naruto', 'male', 'novice', 'Я никогда не сдаюсь — это мой путь ниндзя!', 'Расенган', 'Деревня Скрытого Листа', { hairStyle: 'spiky', hairColor: '#D9B24C' }),
  c('naruto-5', 'Нагато', 'naruto', 'male', 'fan', 'Боль — единственный общий язык.', 'Риннеган, Шесть Путей Пейна', 'Акацуки'),
  c('naruto-2', 'Саске Учиха', 'naruto', 'male', 'fan', 'Месть — единственное, что у меня осталось.', 'Шаринган и Сусаноо', 'Клан Учиха'),
  c('naruto-6', 'Джирайя', 'naruto', 'male', 'otaku', 'Настоящий ниндзя — тот, кто не сдаётся.', 'Режим отшельника, призыв жаб', 'Деревня Скрытого Листа'),
  c('naruto-3', 'Какаши Хатаке', 'naruto', 'male', 'otaku', 'Те, кто нарушает правила, — отбросы.', 'Тысяча птиц', 'Деревня Скрытого Листа'),
  c('naruto-7', 'Хината Хьюга', 'naruto', 'female', 'otaku', 'Я тоже хочу стать сильнее.', 'Бьякуган', 'Клан Хьюга'),
  c('naruto-8', 'Цунаде', 'naruto', 'female', 'expert', 'Ставка сделана — отступать я не стану.', 'Медицинское ниндзюцу, Печать Инь', 'Деревня Скрытого Листа'),
  c('naruto-9', 'Шикамару Нара', 'naruto', 'male', 'expert', 'Как же хлопотно…', 'Теневое подражание', 'Деревня Скрытого Листа'),
  c('naruto-10', 'Гаара', 'naruto', 'male', 'expert', 'Я нашёл своих людей — и защищаю их.', 'Управление песком', 'Деревня Скрытого Песка'),
  c('naruto-11', 'Орочимару', 'naruto', 'male', 'expert', 'Знание стоит любой цены.', 'Змеиное ниндзюцу, переселение души', 'Деревня Скрытого Звука'),
  c('naruto-12', 'Итачи Учиха', 'naruto', 'male', 'legend', 'Люди живут, опираясь на свои знания и восприятие.', 'Мангекё Шаринган', 'Анбу / клан Учиха'),

  // Атака титанов
  c('aot-1', 'Эрен Йегер', 'aot', 'male', 'novice', 'Я буду продолжать сражаться, пока не уничтожу всех врагов.', 'Титан-Атакующий', 'Разведкорпус'),
  c('aot-2', 'Микаса Аккерман', 'aot', 'female', 'fan', 'Этот мир жесток, но и прекрасен.', 'Клинки Аккерманов', 'Разведкорпус'),
  c('aot-3', 'Леви Аккерман', 'aot', 'male', 'otaku', 'Выбирай сам, о чём потом будешь жалеть.', 'Молниеносная атака клинками', 'Разведкорпус'),
  c('aot-4', 'Ханджи Зоэ', 'aot', 'female', 'otaku', 'Титаны невероятно интересны!', 'Исследования титанов', 'Разведкорпус'),
  c('aot-5', 'Армин Арлерт', 'aot', 'male', 'expert', 'Если мы ничего не сделаем, ничего не изменится.', 'Колоссальный титан', 'Разведкорпус'),
  c('aot-6', 'Эрвин Смит', 'aot', 'male', 'legend', 'Татакэ!', 'Стратегическое командование', 'Разведкорпус'),

  // Ван-Пис
  c('op-1', 'Монки Д. Луффи', 'onepiece', 'male', 'novice', 'Я стану королём пиратов!', 'Плод Гому-Гому', 'Пираты Соломенной Шляпы', { hairStyle: 'short', hairColor: '#2B2B33' }),
  c('onepiece-2', 'Портгас Д. Эйс', 'onepiece', 'male', 'novice', 'Спасибо, что любили меня.', 'Плод Мера-Мера', 'Пираты Белоуса'),
  c('onepiece-3', 'Санджи', 'onepiece', 'male', 'novice', 'Я никогда не ударю женщину.', 'Чёрная нога', 'Пираты Соломенной Шляпы'),
  c('op-2', 'Ророноа Зоро', 'onepiece', 'male', 'fan', 'Заблудиться — тоже часть пути.', 'Стиль трёх мечей', 'Пираты Соломенной Шляпы'),
  c('onepiece-5', 'Тони Тони Чоппер', 'onepiece', 'male', 'fan', 'Я не хочу быть героем!', 'Хито Хито но Ми', 'Пираты Соломенной Шляпы'),
  c('onepiece-6', 'Шанкс', 'onepiece', 'male', 'fan', 'Вернёшь шляпу, когда станешь великим пиратом.', 'Королевская воля, мастер меча', 'Пираты Рыжеволосого'),
  c('onepiece-7', 'Маршалл Д. Тич', 'onepiece', 'male', 'otaku', 'Мечты людей не имеют конца!', 'Плоды Ями-Ями и Гура-Гура', 'Пираты Чёрной Бороды'),
  c('op-3', 'Нами', 'onepiece', 'female', 'otaku', 'Деньги и карты — вот что важно.', 'Погодный жезл Клима-Такт', 'Пираты Соломенной Шляпы'),
  c('onepiece-9', 'Нико Робин', 'onepiece', 'female', 'otaku', 'Я хочу жить!', 'Хана Хана но Ми', 'Пираты Соломенной Шляпы'),
  c('onepiece-10', 'Донкихот Дофламинго', 'onepiece', 'male', 'expert', 'Правила пишет победитель.', 'Плод Ито-Ито', 'Семья Донкихот'),
  c('onepiece-11', 'Трафальгар Ло', 'onepiece', 'male', 'expert', 'Я не спасаю тех, кто сдался сам.', 'Плод Опе-Опе', 'Пираты Сердца'),

  // Тетрадь смерти
  c('dn-1', 'Лайт Ягами', 'deathnote', 'male', 'novice', 'В этом новом мире я стану богом.', 'Тетрадь смерти', 'Кира'),
  c('dn-2', 'L', 'deathnote', 'male', 'fan', 'Вероятность того, что я неправ, крайне мала.', 'Дедукция и стратегия', 'Международная полиция'),
  c('deathnote-3', 'Миса Аманэ', 'deathnote', 'female', 'fan', 'Я люблю Лайта!', 'Глаза синигами', 'Кира'),
  c('dn-3', 'Рюк', 'deathnote', 'male', 'otaku', 'Мне просто было скучно в мире шинигами.', 'Глаза шинигами', 'Мир шинигами'),
  c('deathnote-5', 'Ниар', 'deathnote', 'male', 'expert', 'Я не проигрываю.', 'Аналитический интеллект', 'SPK'),
  c('deathnote-6', 'Мелло', 'deathnote', 'male', 'legend', 'Я должен действовать первым.', 'Тактика и расследование', 'Мафия'),

  // Моя геройская академия
  c('mha-1', 'Изуку Мидория', 'mha', 'male', 'novice', 'Я тоже могу стать героем!', 'Единственное для всех (One For All)', 'Академия Юэй'),
  c('mha-4', 'Шото Тодороки', 'mha', 'male', 'novice', 'Я использую свою силу по-своему.', 'Полухолод-полужара', 'Класс 1-А'),
  c('mha-5', 'Аидзава Сёта', 'mha', 'male', 'fan', 'Логичная подстава — часть обучения.', 'Стирание причуд', 'Академия Юэй'),
  c('mha-2', 'Кацуки Бакуго', 'mha', 'male', 'fan', 'Я стану героем номер один, никак не меньше.', 'Взрывной пот', 'Академия Юэй'),
  c('mha-6', 'Олл Майт', 'mha', 'male', 'fan', 'Я здесь!', 'Один за всех', 'Герои'),
  c('mha-3', 'Очако Урарака', 'mha', 'female', 'otaku', 'Я хочу быть героем, который делает людей счастливыми.', 'Невесомость', 'Академия Юэй'),
  c('mha-7', 'Тога Химико', 'mha', 'female', 'expert', 'Любить — значит стать тем, кого любишь.', 'Трансформация по крови', 'Лига злодеев'),
  c('mha-8', 'Шигараки Томура', 'mha', 'male', 'legend', 'Я уничтожу всё.', 'Распад', 'Лига злодеев'),

  // Клинок, рассекающий демонов
  c('demonslayer-1', 'Мицури Канродзи', 'demonslayer', 'female', 'novice', 'Любовь делает сильнее.', 'Дыхание любви', 'Столпы'),
  c('demonslayer-2', 'Музан Кибуцудзи', 'demonslayer', 'male', 'novice', 'Совершенство не терпит слабости.', 'Прародитель демонов, регенерация', 'Двенадцать лун'),
  c('ds-1', 'Танджиро Камадо', 'demonslayer', 'male', 'novice', 'Я никому не позволю больше страдать.', 'Дыхание воды', 'Корпус истребителей демонов'),
  c('demonslayer-4', 'Гию Томиока', 'demonslayer', 'male', 'fan', 'Не проявляй ко мне дружелюбия.', 'Дыхание воды', 'Столп Воды'),
  c('demonslayer-5', 'Муичиро Токито', 'demonslayer', 'male', 'fan', 'Я вспомнил, ради кого сражаюсь.', 'Дыхание тумана', 'Столпы'),
  c('ds-2', 'Незуко Камадо', 'demonslayer', 'female', 'fan', 'Она защищает брата, даже не произнося ни слова.', 'Демоническое пламя крови', 'Семья Камадо'),
  c('demonslayer-7', 'Аказа', 'demonslayer', 'male', 'otaku', 'Становись сильнее или исчезни.', 'Техника разрушения, боевые искусства', 'Двенадцать лун'),
  c('ds-3', 'Зеницу Агацума', 'demonslayer', 'male', 'otaku', 'Я боюсь всего, но всё равно иду вперёд.', 'Дыхание грома', 'Корпус истребителей демонов'),
  c('demonslayer-9', 'Тандзюро Камадо', 'demonslayer', 'male', 'otaku', 'Этот танец передаётся из поколения в поколение.', 'Танец бога огня', 'Семья Камадо'),
  c('demonslayer-10', 'Шинобу Кочо', 'demonslayer', 'female', 'expert', 'Улыбайся, пожалуйста.', 'Дыхание насекомого', 'Столп Насекомого'),
  c('demonslayer-11', 'Кёджуро Ренгоку', 'demonslayer', 'male', 'legend', 'Будь сильным сердцем!', 'Дыхание пламени', 'Столп Пламени'),

  // Магическая битва
  c('jjk-4', 'Махито', 'jjk', 'male', 'novice', 'Душа первична, тело — лишь её форма.', 'Праздная трансфигурация', 'Проклятые духи'),
  c('jjk-1', 'Юджи Итадори', 'jjk', 'male', 'novice', 'Я просто хочу, чтобы люди умирали по-человечески.', 'Проклятая энергия и сила Сукуны', 'Техническая школа Токио'),
  c('jjk-5', 'Маки Зенин', 'jjk', 'female', 'fan', 'Я сама выберу свой путь.', 'Мастерство оружия', 'Токийский колледж магии'),
  c('jjk-2', 'Сатору Годзё', 'jjk', 'male', 'fan', 'Не переживай, я самый сильный.', 'Безграничность и Шесть глаз', 'Техническая школа Токио'),
  c('jjk-6', 'Тодзи Фусигуро', 'jjk', 'male', 'fan', 'Против магов проклятая энергия мне не нужна.', 'Небесное ограничение, арсенал проклятых орудий', 'Наёмный убийца'),
  c('jjk-7', 'Кэнто Нанами', 'jjk', 'male', 'otaku', 'Работа есть работа, и её надо делать хорошо.', 'Техника соотношения 7:3', 'Токийский колледж магии'),
  c('jjk-8', 'Нобара Кугисаки', 'jjk', 'female', 'otaku', 'Я люблю себя за то, что я собой являюсь.', 'Техника соломенной куклы', 'Токийский колледж магии'),
  c('jjk-9', 'Сугуру Гэто', 'jjk', 'male', 'otaku', 'Мир станет чище, когда останутся одни маги.', 'Манипуляция проклятыми духами', 'Секта Гэто'),
  c('jjk-10', 'Мэй Мэй', 'jjk', 'female', 'expert', 'Я иду туда, где платят.', 'Управление воронами', 'Маги первого ранга'),
  c('jjk-3', 'Мегуми Фушигуро', 'jjk', 'male', 'legend', 'Я использую то, что у меня есть, чтобы защитить других.', 'Десять теней', 'Техническая школа Токио'),
  c('jjk-11', 'Рёмен Сукуна', 'jjk', 'male', 'legend', 'Знай своё место.', 'Расщепление и рассечение', 'Проклятия'),

  // Стальной алхимик
  c('fma-1', 'Эдвард Элрик', 'fma', 'male', 'novice', 'Человечество не может ничего получить, не отдав что-то взамен.', 'Алхимия без круга', 'Государственные алхимики'),
  c('fma-2', 'Альфонс Элрик', 'fma', 'male', 'fan', 'Мы вернём наши тела во что бы то ни стало.', 'Алхимия трансмутации', 'Братья Элрик'),
  c('fma-4', 'Винри Рокбелл', 'fma', 'female', 'fan', 'Я не позволю тебе сдаться.', 'Механика автоброней', 'Рокбелл'),
  c('fma-5', 'Оливье Мира Армстронг', 'fma', 'female', 'fan', 'Я не отступлю ни на шаг.', 'Мастер меча, командование', 'Крепость Бриггс'),
  c('fma-6', 'Алекс Луи Армстронг', 'fma', 'male', 'otaku', 'Это техника, передаваемая в нашей семье поколениями!', 'Алхимия армстронгов', 'Армия Аместриса'),
  c('fma-7', 'Энви', 'fma', 'male', 'otaku', 'Зависть — именно то, что я такое.', 'Смена облика', 'Гомункулы'),
  c('fma-8', 'Люст', 'fma', 'female', 'expert', 'Я не человек — и не притворяюсь им.', 'Ультимативное копьё', 'Гомункулы'),
  c('fma-9', 'Маэс Хьюз', 'fma', 'male', 'expert', 'Я люблю свою семью.', 'Военная разведка', 'Армия Аместриса'),
  c('fma-3', 'Рой Мустанг', 'fma', 'male', 'expert', 'В один прекрасный день я стану во главе страны.', 'Пламенная алхимия', 'Государственные алхимики'),

  // Блич
  c('bleach-1', 'Ичиго Куросаки', 'bleach', 'male', 'novice', 'Я защищаю всех, кто мне дорог, своим мечом.', 'Гецуга Теншо', 'Синигами-заместитель'),
  c('bleach-4', 'Кенпачи Дзараки', 'bleach', 'male', 'novice', 'Драка ради драки — вот это жизнь.', 'Огромная духовная сила', '11-й отряд Готэй-13'),
  c('bleach-5', 'Ренджи Абарай', 'bleach', 'male', 'fan', 'Я стану сильнее ради неё.', 'Забимару', '13 отрядов Готэй'),
  c('bleach-2', 'Рукия Кучики', 'bleach', 'female', 'otaku', 'Сила без сострадания — ничто.', 'Танцующий белый клинок', 'Готей 13'),
  c('bleach-6', 'Бьякуя Кучики', 'bleach', 'male', 'expert', 'Правила существуют не просто так.', 'Сэнбонзакура', '13 отрядов Готэй'),
  c('bleach-7', 'Соскэ Айдзэн', 'bleach', 'male', 'expert', 'Никто не стоял на вершине с самого начала.', 'Кёка Суйгэцу, полный гипноз', 'Предатель Сообщества душ'),
  c('bleach-3', 'Тоширо Хицугая', 'bleach', 'male', 'expert', 'Не путай моё звание с моим возрастом.', 'Ледяное бандзюцу', 'Готей 13'),
  c('bleach-8', 'Урахара Киске', 'bleach', 'male', 'legend', 'Всё всегда происходит не просто так.', 'Бенихимэ', 'Общество душ / магазин Урахары'),

  // Охотник x Охотник
  c('hxh-1', 'Гон Фрикс', 'hxh', 'male', 'novice', 'Я найду отца и стану охотником, как он.', 'Джаджанкен', 'Лицензированные охотники'),
  c('hxh-4', 'Леорио Парадинайт', 'hxh', 'male', 'fan', 'Я стану врачом!', 'Эмиттерная техника', 'Охотники'),
  c('hxh-2', 'Киллуа Золдик', 'hxh', 'male', 'otaku', 'Дружба важнее, чем то, чему меня учили.', 'Молниеносные атаки электричеством', 'Семья убийц Золдик'),
  c('hxh-5', 'Курапика', 'hxh', 'male', 'expert', 'Я не позволю им уйти.', 'Алые глаза и цепи', 'Охотники'),
  c('hxh-3', 'Хисока Мороу', 'hxh', 'male', 'expert', 'Мне просто интересно, насколько ты силён.', 'Резинка (Бунги Гам)', 'Труппа Фантомов'),
  c('hxh-6', 'Иллуми Золдик', 'hxh', 'male', 'expert', 'Семья — это прежде всего работа.', 'Иглы-манипуляции', 'Семья Золдиков'),
  c('hxh-7', 'Меруэм', 'hxh', 'male', 'legend', 'Я король.', 'Невероятная физическая сила', 'Химерные муравьи'),

  // Ванпанчмен
  c('opm-1', 'Сайтама', 'opm', 'male', 'fan', 'Я просто герой ради развлечения.', 'Удар одним кулаком', 'Ассоциация героев'),
  c('opm-2', 'Генос', 'opm', 'male', 'expert', 'Я стану достаточно сильным, чтобы отомстить.', 'Кибернетическая пушка', 'Ассоциация героев'),
  c('opm-3', 'Тацумаки', 'opm', 'female', 'expert', 'Я справлюсь и без вашей помощи.', 'Телекинез', 'Ассоциация героев, класс S'),
  c('opm-4', 'Гаро', 'opm', 'male', 'expert', 'Я — охотник на героев.', 'Боевое предвидение, единоборства', 'Ассоциация монстров'),

  // Человек-бензопила
  c('csm-3', 'Ангел-Дьявол', 'csm', 'male', 'novice', 'Прикосновение ко мне стоит лет жизни.', 'Похищение продолжительности жизни', 'Общественная безопасность'),
  c('csm-1', 'Дэндзи', 'csm', 'male', 'fan', 'Я просто хочу нормальную жизнь с тостом по утрам.', 'Трансформация в дьявола бензопилы', 'Служба безопасности Токио'),
  c('csm-4', 'Макима', 'csm', 'female', 'otaku', 'Людям нужен тот, за кем можно идти.', 'Дьявол контроля', 'Общественная безопасность'),
  c('csm-5', 'Аки Хаякава', 'csm', 'male', 'expert', 'Я живу ради мести.', 'Контракты с Дьяволом проклятия и Дьяволом-лисом', 'Общественная безопасность'),
  c('csm-6', 'Кобэни Хигасияма', 'csm', 'female', 'expert', 'Я просто хочу уволиться.', 'Контракт с дьяволом, невероятная ловкость', 'Общественная безопасность'),
  c('csm-2', 'Пауэр', 'csm', 'female', 'expert', 'Кровь — моя стихия, бойся меня.', 'Контроль над кровью', 'Служба безопасности Токио'),
  c('csm-7', 'Кишибэ', 'csm', 'male', 'expert', 'Я учу вас выживать, а не побеждать.', 'Мастер ножей и рукопашного боя', 'Общественная безопасность'),

  // Семья шпиона
  c('sf-1', 'Лойд Форджер', 'spyfamily', 'male', 'fan', 'Мир начинается с крепкой семьи.', 'Мастер маскировки и боевых искусств', 'Разведка Вестализа'),
  c('sf-2', 'Аня Форджер', 'spyfamily', 'female', 'expert', 'Аня, кажется, поняла!', 'Телепатия', 'Семья Форджер'),
  c('sf-3', 'Йор Форджер', 'spyfamily', 'female', 'legend', 'Хорошая жена всегда защитит свою семью.', 'Скрытые навыки убийцы', 'Семья Форджер'),

  // Мастера меча онлайн
  c('sao-1', 'Кирито', 'sao', 'male', 'novice', 'Пока я жив, я буду защищать тех, кто мне дорог.', 'Стиль двух мечей', 'Игроки SAO'),
  c('sao-3', 'Сино Асада', 'sao', 'female', 'novice', 'За прицелом я спокойна.', 'Снайперская стрельба', 'Gun Gale Online'),
  c('sao-2', 'Асуна Юки', 'sao', 'female', 'otaku', 'Я не буду просто ждать, я тоже сражаюсь.', 'Рапира и молниеносные удары', 'Гильдия Клинок Рассвета'),

  // Код Гиас
  c('codegeass-1', 'Судзаку Куруруги', 'codegeass', 'male', 'novice', 'Мир меняют только изнутри.', 'Пилот «Ланселота»', 'Британская империя'),
  c('cg-2', 'Ц.Ц.', 'codegeass', 'female', 'expert', 'Пицца — единственное, что имеет значение.', 'Бессмертие и код Гиаса', 'Орден Чёрных Рыцарей'),
  c('cg-1', 'Лелуш Ламперуж', 'codegeass', 'male', 'legend', 'Я, Лелуш, приказываю тебе!', 'Гиас — сила абсолютного приказа', 'Орден Чёрных Рыцарей'),

  // Провожающая в последний путь Фрирен
  c('frieren-1', 'Штарк', 'frieren', 'male', 'novice', 'Мне страшно — и я всё равно иду вперёд.', 'Мастерство боевого топора', 'Отряд Фрирен'),
  c('fr-1', 'Фрирен', 'frieren', 'female', 'otaku', 'Человеческая жизнь так коротка, а я лишь начинаю её понимать.', 'Древняя магия эльфов', 'Странствующие маги'),
  c('fr-2', 'Ферн', 'frieren', 'female', 'legend', 'Я буду учиться магии, чтобы идти рядом с ней.', 'Боевая магия', 'Странствующие маги'),

  // Re:Zero
  c('rz-2', 'Рем', 'rezero', 'female', 'expert', 'Для меня лишь ты, Субару, значишь всё.', 'Ледяная магия и боевой цеп', 'Особняк Розваль'),
  c('rz-1', 'Субару Нацуки', 'rezero', 'male', 'expert', 'Я снова и снова буду возвращаться, чтобы всех спасти.', '«Возвращение смертью»', 'Особняк Розваль'),
  c('rezero-3', 'Рам', 'rezero', 'female', 'expert', 'У меня остался один рог — и этого достаточно.', 'Магия ветра, ясновидение', 'Поместье Розваля'),
  c('rz-3', 'Эмилия', 'rezero', 'female', 'legend', 'Я хочу стать доброй правительницей для всех.', 'Магия льда полуэльфов', 'Кандидаты в правители'),

  // Этот замечательный мир!
  c('ks-1', 'Казума Сато', 'konosuba', 'male', 'expert', 'В другом мире я просто хочу спокойной жизни.', 'Кража и побег', 'Отряд Казумы'),
  c('ks-2', 'Аква', 'konosuba', 'female', 'legend', 'Я богиня, меня следует почитать!', 'Очищение и создание воды', 'Богиня-проводник'),
  c('ks-3', 'Мегумин', 'konosuba', 'female', 'legend', 'Взрыв — единственная магия, достойная меня!', 'Взрыв (Explosion)', 'Клан кризодов'),

  // Евангелион
  c('eva-1', 'Синдзи Икари', 'evangelion', 'male', 'otaku', 'Мне нельзя убегать, мне нельзя убегать...', 'Пилот Евангелиона-01', 'НЕРВ'),
  c('eva-3', 'Аска Лэнгли Сорю', 'evangelion', 'female', 'legend', 'Я лучшая пилотесса, и не смей забывать это.', 'Пилот Евангелиона-02', 'НЕРВ'),
  c('eva-2', 'Рей Аянами', 'evangelion', 'female', 'legend', 'Я не понимаю, что значит бояться.', 'Пилот Евангелиона-00', 'НЕРВ'),

  // Токийский гуль
  c('tg-1', 'Кэн Канеки', 'tokyoghoul', 'male', 'expert', 'Раньше я был человеком.', 'Регенерация гуля и кагуне', 'Кафе Antique'),
  c('tg-2', 'Тоука Киришима', 'tokyoghoul', 'female', 'legend', 'Даже гуль может хотеть жить как человек.', 'Крыло-кагуне', 'Кафе Antique'),

  // Saekano
  c('saekano-1', 'Томоя Аки', 'saekano', 'male', 'novice', 'Я сделаю игру, которая тронет людей.', 'Продюсирование, отаку-эрудиция', 'Кружок Blessing Software'),
  c('saekano-2', 'Мэгуми Като', 'saekano', 'female', 'expert', 'Я самая обычная — в этом и смысл.', 'Незаметность и здравый смысл', 'Кружок Blessing Software'),

  // Вайолет Эвергарден
  c('violet-1', 'Вайолет Эвергарден', 'violet', 'female', 'otaku', 'Я хочу понять, что значит «я люблю тебя».', 'Боевая подготовка, автопамять-кукла', 'Почтовая компания Ходжинса'),
  c('violet-2', 'Гилберт Бугенвилья', 'violet', 'male', 'expert', 'Живи свободно.', 'Командование, владение мечом', 'Армия Лейденшафтлих'),

  // Волчица и пряности
  c('spicewolf-1', 'Лоуренс Крафт', 'spicewolf', 'male', 'novice', 'Хорошая сделка честнее хорошей речи.', 'Торговля и расчёт', 'Странствующие торговцы'),
  c('spicewolf-2', 'Холо', 'spicewolf', 'female', 'expert', 'Я мудрая волчица из Йойцу.', 'Облик гигантской волчицы, мудрость', 'Спутница Лоуренса'),

  // Госпожа Кагуя: В любви как на войне
  c('kaguya-1', 'Кагуя Синомия', 'kaguya', 'female', 'fan', 'Признаться первой — значит проиграть.', 'Стратегия и разносторонние таланты', 'Студсовет академии Сютиин'),
  c('kaguya-2', 'Миюки Сироганэ', 'kaguya', 'male', 'otaku', 'Я не гений, я просто много работаю.', 'Работоспособность и учёба', 'Студсовет академии Сютиин'),
  c('kaguya-3', 'Чика Фудзивара', 'kaguya', 'female', 'expert', 'Игра только начинается!', 'Непредсказуемость, музыка и игры', 'Студсовет академии Сютиин'),

  // Доктор Стоун
  c('drstone-1', 'Сэнку Исигами', 'drstone', 'male', 'novice', 'Вот это по-настоящему заводит!', 'Научные знания, изобретательство', 'Королевство науки'),
  c('drstone-2', 'Цукаса Сисио', 'drstone', 'male', 'fan', 'Новый мир должен принадлежать молодым.', 'Сверхчеловеческая сила', 'Империя силы'),

  // Ковбой Бибоп
  c('bebop-1', 'Эдвард Вонг', 'bebop', 'female', 'fan', 'Эд знает про сети всё!', 'Хакерство', 'Экипаж «Бибопа»'),
  c('bebop-2', 'Фэй Валентайн', 'bebop', 'female', 'otaku', 'Долги я отдаю по-своему.', 'Азартные игры и стрельба', 'Экипаж «Бибопа»'),
  c('bebop-3', 'Джету Блэк', 'bebop', 'male', 'expert', 'У каждого дела остаётся след.', 'Опыт полицейского, бионическая рука', 'Экипаж «Бибопа»'),

  // Моб Психо 100
  c('mobpsycho-1', 'Тэруки Ханадзава', 'mobpsycho', 'male', 'fan', 'Раньше я думал, что сила делает особенным.', 'Телекинез', 'Ученики-эсперы'),
  c('mobpsycho-2', 'Моб', 'mobpsycho', 'male', 'expert', 'Применять силу против людей — это предел.', 'Колоссальная эсперская сила', 'Консультация по духам и прочему'),
  c('mobpsycho-3', 'Рэйгэн Аратака', 'mobpsycho', 'male', 'expert', 'Я обычный человек — и этого достаточно.', 'Красноречие, соль и массаж', 'Консультация по духам и прочему'),

  // Монолог фармацевта
  c('apothecary-1', 'Маомао', 'apothecary', 'female', 'fan', 'Яд — то же лекарство, вопрос лишь в дозе.', 'Фармакология, устойчивость к ядам', 'Задний дворец'),
  c('apothecary-2', 'Джинши', 'apothecary', 'male', 'otaku', 'Красивое лицо порой действует лучше приказа.', 'Влияние при дворе', 'Императорский дворец'),

  // Монстр
  c('monster-1', 'Йохан Либерт', 'monster', 'male', 'otaku', 'Имя — единственное, что можно отнять до конца.', 'Манипуляция людьми', 'Действует в одиночку'),
  c('monster-2', 'Кэндзо Тэнма', 'monster', 'male', 'expert', 'Все жизни равны.', 'Нейрохирургия', 'Больница Эйслер'),

  // Моя подростковая романтическая комедия
  c('oregairu-1', 'Юкино Юкиносита', 'oregairu', 'female', 'novice', 'Я не ищу лёгких путей.', 'Ум и прямота', 'Клуб волонтёров'),
  c('oregairu-2', 'Харуно Юкиносита', 'oregairu', 'female', 'fan', 'Все носят маски — интересно, чья треснет первой.', 'Обаяние и манипуляция', 'Семья Юкиносита'),
  c('oregairu-3', 'Хачиман Хикигая', 'oregairu', 'male', 'expert', 'Настоящее никогда не бывает удобным.', 'Наблюдательность, самопожертвование', 'Клуб волонтёров'),

  // Нана
  c('nana-1', 'Нана Комацу', 'nana', 'female', 'novice', 'Я просто хочу быть рядом с любимым.', 'Искренность и обаяние', 'Окружение Black Stones'),
  c('nana-2', 'Нана Осаки', 'nana', 'female', 'expert', 'Я пою, чтобы меня услышали.', 'Вокал панк-группы', 'Группа Black Stones'),

  // Не издевайся, Нагаторо
  c('nagatoro-2', 'Хаясэ Нагаторо', 'nagatoro', 'female', 'expert', 'Что, сэмпай, опять расклеился?', 'Дзюдо и подначки', 'Клуб дзюдо'),

  // Сага о Винланде
  c('vinland-1', 'Аскеладд', 'vinland', 'male', 'novice', 'Настоящий король служит своим людям.', 'Тактика и владение мечом', 'Отряд Аскеладда'),
  c('vinland-2', 'Канут', 'vinland', 'male', 'fan', 'Я построю рай на этой земле.', 'Королевская власть, стратегия', 'Датское королевство'),
  c('vinland-3', 'Торфинн', 'vinland', 'male', 'expert', 'У меня нет врагов.', 'Бой на кинжалах', 'Отряд Аскеладда'),

  // Синий экзорцист
  c('blueexorcist-1', 'Рин Окумура', 'blueexorcist', 'male', 'fan', 'Сын Сатаны или нет — я стану экзорцистом.', 'Синее пламя, меч Курикара', 'Истинный крест'),

  // Триган
  c('trigun-1', 'Вэш Ураган', 'trigun', 'male', 'expert', 'Любовь и мир!', 'Сверхточная стрельба', 'Странник'),

  // Хеллсинг
  c('hellsing-1', 'Виктория Серас', 'hellsing', 'female', 'novice', 'Я всё ещё пытаюсь остаться человеком.', 'Вампирская сила, тяжёлое вооружение', 'Организация «Хеллсинг»'),
  c('hellsing-2', 'Алукард', 'hellsing', 'male', 'expert', 'Я умею дарить только смерть.', 'Вампирская регенерация, безграничные формы', 'Организация «Хеллсинг»'),

  // Хоримия
  c('horimiya-1', 'Хоримия Кёко', 'horimiya', 'female', 'otaku', 'Дома я совсем другая.', 'Хозяйственность и забота', 'Старшая школа Катагири'),
  c('horimiya-2', 'Миямура Идзуми', 'horimiya', 'male', 'expert', 'Меня знают не таким, какой я есть.', 'Шитьё, скрытая внешность', 'Старшая школа Катагири'),

  // Чёрная лагуна
  c('blacklagoon-1', 'Реви', 'blacklagoon', 'female', 'novice', 'Разговоры кончаются, когда начинаю я.', 'Стрельба с двух рук', 'Компания «Лагуна»'),
  c('blacklagoon-2', 'Рок', 'blacklagoon', 'male', 'fan', 'Я всё ещё выбираю оставаться человеком.', 'Переговоры, языки', 'Компания «Лагуна»'),

  // Чёрный клевер
  c('blackclover-1', 'Аста', 'blackclover', 'male', 'novice', 'У меня нет магии — зато есть упорство.', 'Антимагические мечи', 'Орден Чёрного быка'),
  c('blackclover-2', 'Юно', 'blackclover', 'male', 'fan', 'Я стану Королём магов.', 'Магия ветра, дух Сильф', 'Орден Золотого рассвета'),
  c('blackclover-3', 'Ноэль Сильва', 'blackclover', 'female', 'otaku', 'Я больше не прячусь за чужими спинами.', 'Магия воды', 'Орден Чёрного быка'),
  c('blackclover-4', 'Ями Сукэхиро', 'blackclover', 'male', 'expert', 'Переступи через свой предел.', 'Магия тьмы', 'Орден Чёрного быка'),
];

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((ch) => ch.id === id);
}

type CharacterEn = { name: string; quote: string; ability: string; faction: string };

const CHARACTER_EN: Record<string, CharacterEn> = {
  'naruto-4': { name: 'Madara Uchiha', quote: 'Where there is light, there are shadows.', ability: 'Eternal Mangekyo Sharingan, Rinnegan', faction: 'Uchiha Clan' },
  'naruto-1': { name: 'Naruto Uzumaki', quote: "I never give up — that's my ninja way!", ability: 'Rasengan', faction: 'Hidden Leaf Village' },
  'naruto-5': { name: 'Nagato', quote: 'Pain is the only shared language.', ability: 'Rinnegan, Six Paths of Pain', faction: 'Akatsuki' },
  'naruto-2': { name: 'Sasuke Uchiha', quote: 'Revenge is all I have left.', ability: 'Sharingan and Susanoo', faction: 'Uchiha Clan' },
  'naruto-6': { name: 'Jiraiya', quote: 'A true ninja is one who never gives up.', ability: 'Sage Mode, toad summoning', faction: 'Hidden Leaf Village' },
  'naruto-3': { name: 'Kakashi Hatake', quote: 'Those who break the rules are scum.', ability: 'Chidori', faction: 'Hidden Leaf Village' },
  'naruto-7': { name: 'Hinata Hyuga', quote: 'I want to become stronger too.', ability: 'Byakugan', faction: 'Hyuga Clan' },
  'naruto-8': { name: 'Tsunade', quote: "I've placed my bet, I won't back down.", ability: 'Medical ninjutsu, Byakugo Seal', faction: 'Hidden Leaf Village' },
  'naruto-9': { name: 'Shikamaru Nara', quote: 'What a drag...', ability: 'Shadow Imitation', faction: 'Hidden Leaf Village' },
  'naruto-10': { name: 'Gaara', quote: 'I found my people, and I protect them.', ability: 'Sand manipulation', faction: 'Hidden Sand Village' },
  'naruto-11': { name: 'Orochimaru', quote: 'Knowledge is worth any price.', ability: 'Snake ninjutsu, body transfer', faction: 'Hidden Sound Village' },
  'naruto-12': { name: 'Itachi Uchiha', quote: 'People live relying on their knowledge and perception.', ability: 'Mangekyo Sharingan', faction: 'ANBU / Uchiha Clan' },

  'aot-1': { name: 'Eren Yeager', quote: "I'll keep fighting until every enemy is wiped out.", ability: 'Attack Titan', faction: 'Survey Corps' },
  'aot-2': { name: 'Mikasa Ackerman', quote: 'This world is cruel, but also beautiful.', ability: 'Ackerman blade mastery', faction: 'Survey Corps' },
  'aot-3': { name: 'Levi Ackerman', quote: "Choose for yourself what you'll regret later.", ability: 'Lightning-fast blade combos', faction: 'Survey Corps' },
  'aot-4': { name: 'Hange Zoe', quote: 'Titans are incredibly fascinating!', ability: 'Titan research', faction: 'Survey Corps' },
  'aot-5': { name: 'Armin Arlert', quote: 'If we do nothing, nothing will change.', ability: 'Colossal Titan', faction: 'Survey Corps' },
  'aot-6': { name: 'Erwin Smith', quote: 'Advance!', ability: 'Strategic command', faction: 'Survey Corps' },

  'op-1': { name: 'Monkey D. Luffy', quote: "I'm gonna be King of the Pirates!", ability: 'Gum-Gum Fruit', faction: 'Straw Hat Pirates' },
  'onepiece-2': { name: 'Portgas D. Ace', quote: 'Thank you for loving me.', ability: 'Mera Mera no Mi', faction: 'Whitebeard Pirates' },
  'onepiece-3': { name: 'Sanji', quote: 'I would never kick a woman.', ability: 'Black Leg', faction: 'Straw Hat Pirates' },
  'op-2': { name: 'Roronoa Zoro', quote: 'Getting lost is part of the journey too.', ability: 'Three-Sword Style', faction: 'Straw Hat Pirates' },
  'onepiece-5': { name: 'Tony Tony Chopper', quote: "I don't want to be a hero!", ability: 'Hito Hito no Mi', faction: 'Straw Hat Pirates' },
  'onepiece-6': { name: 'Shanks', quote: "Return the hat when you're a great pirate.", ability: "Conqueror's Haki, swordsmanship", faction: 'Red Hair Pirates' },
  'onepiece-7': { name: 'Marshall D. Teach', quote: "People's dreams never end!", ability: 'Yami Yami and Gura Gura no Mi', faction: 'Blackbeard Pirates' },
  'op-3': { name: 'Nami', quote: "Money and maps — that's what matters.", ability: 'Clima-Tact weather staff', faction: 'Straw Hat Pirates' },
  'onepiece-9': { name: 'Nico Robin', quote: 'I want to live!', ability: 'Hana Hana no Mi', faction: 'Straw Hat Pirates' },
  'onepiece-10': { name: 'Donquixote Doflamingo', quote: 'The winner writes the rules.', ability: 'Ito Ito no Mi', faction: 'Donquixote Family' },
  'onepiece-11': { name: 'Trafalgar Law', quote: "I don't save people who've given up.", ability: 'Ope Ope no Mi', faction: 'Heart Pirates' },

  'dn-1': { name: 'Light Yagami', quote: 'In this new world, I will become a god.', ability: 'Death Note', faction: 'Kira' },
  'dn-2': { name: 'L', quote: "The probability that I'm wrong is extremely low.", ability: 'Deduction and strategy', faction: 'International task force' },
  'deathnote-3': { name: 'Misa Amane', quote: 'I love Light!', ability: 'Shinigami Eyes', faction: 'Kira' },
  'dn-3': { name: 'Ryuk', quote: 'I was just bored in the Shinigami world.', ability: 'Shinigami eyes', faction: 'Shinigami realm' },
  'deathnote-5': { name: 'Near', quote: "I don't lose.", ability: 'Analytical intelligence', faction: 'SPK' },
  'deathnote-6': { name: 'Mello', quote: 'I have to make the first move.', ability: 'Tactics and investigation', faction: 'Mafia' },

  'mha-1': { name: 'Izuku Midoriya', quote: 'I can become a hero too!', ability: 'One For All', faction: 'U.A. Academy' },
  'mha-4': { name: 'Shoto Todoroki', quote: 'I use my power my own way.', ability: 'Half-Cold Half-Hot', faction: 'Class 1-A' },
  'mha-5': { name: 'Shota Aizawa', quote: 'A logical ruse is part of the lesson.', ability: 'Erasure', faction: 'U.A. High School' },
  'mha-2': { name: 'Katsuki Bakugo', quote: "I'll become the number one hero, nothing less.", ability: 'Explosive sweat', faction: 'U.A. Academy' },
  'mha-6': { name: 'All Might', quote: 'I am here!', ability: 'One For All', faction: 'Pro Heroes' },
  'mha-3': { name: 'Ochako Uraraka', quote: 'I want to be a hero who makes people smile.', ability: 'Zero Gravity', faction: 'U.A. Academy' },
  'mha-7': { name: 'Himiko Toga', quote: 'To love someone is to become them.', ability: 'Transform', faction: 'League of Villains' },
  'mha-8': { name: 'Tomura Shigaraki', quote: 'I will destroy everything.', ability: 'Decay', faction: 'League of Villains' },

  'demonslayer-1': { name: 'Mitsuri Kanroji', quote: 'Love makes you stronger.', ability: 'Love Breathing', faction: 'Hashira' },
  'demonslayer-2': { name: 'Muzan Kibutsuji', quote: 'Perfection tolerates no weakness.', ability: 'Progenitor of demons, regeneration', faction: 'Twelve Kizuki' },
  'ds-1': { name: 'Tanjiro Kamado', quote: "I won't let anyone suffer any longer.", ability: 'Water Breathing', faction: 'Demon Slayer Corps' },
  'demonslayer-4': { name: 'Giyu Tomioka', quote: "Don't be friendly with me.", ability: 'Water Breathing', faction: 'Water Hashira' },
  'demonslayer-5': { name: 'Muichiro Tokito', quote: "I remembered who I'm fighting for.", ability: 'Mist Breathing', faction: 'Hashira' },
  'ds-2': { name: 'Nezuko Kamado', quote: 'She protects her brother without saying a word.', ability: 'Blood Demon Art: flame', faction: 'Kamado Family' },
  'demonslayer-7': { name: 'Akaza', quote: 'Grow stronger or perish.', ability: 'Destructive Death techniques', faction: 'Twelve Kizuki' },
  'ds-3': { name: 'Zenitsu Agatsuma', quote: "I'm scared of everything, but I still move forward.", ability: 'Thunder Breathing', faction: 'Demon Slayer Corps' },
  'demonslayer-9': { name: 'Tanjuro Kamado', quote: 'This dance passes from father to son.', ability: 'Hinokami Kagura', faction: 'Kamado family' },
  'demonslayer-10': { name: 'Shinobu Kocho', quote: 'Please smile.', ability: 'Insect Breathing', faction: 'Insect Hashira' },
  'demonslayer-11': { name: 'Kyojuro Rengoku', quote: 'Set your heart ablaze!', ability: 'Flame Breathing', faction: 'Flame Hashira' },

  'jjk-4': { name: 'Mahito', quote: 'The soul comes first, the body is its shape.', ability: 'Idle Transfiguration', faction: 'Cursed spirits' },
  'jjk-1': { name: 'Yuji Itadori', quote: 'I just want people to die a proper death.', ability: "Cursed energy and Sukuna's power", faction: 'Tokyo Jujutsu High' },
  'jjk-5': { name: 'Maki Zenin', quote: "I'll choose my own path.", ability: 'Weapon mastery', faction: 'Tokyo Jujutsu High' },
  'jjk-2': { name: 'Satoru Gojo', quote: "Don't worry, I'm the strongest.", ability: 'Limitless and Six Eyes', faction: 'Tokyo Jujutsu High' },
  'jjk-6': { name: 'Toji Fushiguro', quote: "I don't need cursed energy to beat sorcerers.", ability: 'Heavenly Restriction, cursed tools', faction: 'Freelance assassin' },
  'jjk-7': { name: 'Kento Nanami', quote: 'Work is work, and it should be done well.', ability: 'Ratio Technique', faction: 'Tokyo Jujutsu High' },
  'jjk-8': { name: 'Nobara Kugisaki', quote: 'I love myself for being myself.', ability: 'Straw Doll Technique', faction: 'Tokyo Jujutsu High' },
  'jjk-9': { name: 'Suguru Geto', quote: 'The world gets cleaner with only sorcerers left.', ability: 'Cursed Spirit Manipulation', faction: "Geto's cult" },
  'jjk-10': { name: 'Mei Mei', quote: 'I go where the money is.', ability: 'Black Bird Manipulation', faction: 'Grade 1 sorcerers' },
  'jjk-3': { name: 'Megumi Fushiguro', quote: 'I use what I have to protect others.', ability: 'Ten Shadows Technique', faction: 'Tokyo Jujutsu High' },
  'jjk-11': { name: 'Sukuna', quote: 'Know your place.', ability: 'Dismantle and Cleave', faction: 'Curses' },

  'fma-1': { name: 'Edward Elric', quote: "Humanity can't gain anything without sacrificing something first.", ability: 'Alchemy without a transmutation circle', faction: 'State Alchemists' },
  'fma-2': { name: 'Alphonse Elric', quote: "We'll get our bodies back no matter what.", ability: 'Transmutation alchemy', faction: 'Elric Brothers' },
  'fma-4': { name: 'Winry Rockbell', quote: "I won't let you give up.", ability: 'Automail engineering', faction: 'Rockbell' },
  'fma-5': { name: 'Olivier Mira Armstrong', quote: "I don't retreat a single step.", ability: 'Master swordswoman, command', faction: 'Briggs Fortress' },
  'fma-6': { name: 'Alex Louis Armstrong', quote: 'This technique has been passed down in my family for generations!', ability: 'Armstrong Alchemy', faction: 'Amestris Military' },
  'fma-7': { name: 'Envy', quote: 'Envy is exactly what I am.', ability: 'Shapeshifting', faction: 'Homunculi' },
  'fma-8': { name: 'Lust', quote: "I'm not human, and I don't pretend to be.", ability: 'Ultimate Spear', faction: 'Homunculi' },
  'fma-9': { name: 'Maes Hughes', quote: 'I love my family.', ability: 'Military intelligence', faction: 'Amestris Military' },
  'fma-3': { name: 'Roy Mustang', quote: "One day, I'll stand at the top of this country.", ability: 'Flame Alchemy', faction: 'State Alchemists' },

  'bleach-1': { name: 'Ichigo Kurosaki', quote: 'I protect everyone I care about with this blade.', ability: 'Getsuga Tensho', faction: 'Substitute Soul Reaper' },
  'bleach-4': { name: 'Kenpachi Zaraki', quote: "Fighting for its own sake — that's living.", ability: 'Immense spiritual pressure', faction: '11th Division, Gotei 13' },
  'bleach-5': { name: 'Renji Abarai', quote: "I'll become stronger for her.", ability: 'Zabimaru', faction: 'Gotei 13' },
  'bleach-2': { name: 'Rukia Kuchiki', quote: 'Power without compassion is nothing.', ability: 'Dancing white blade', faction: 'Gotei 13' },
  'bleach-6': { name: 'Byakuya Kuchiki', quote: 'Rules exist for a reason.', ability: 'Senbonzakura', faction: 'Gotei 13' },
  'bleach-7': { name: 'Sosuke Aizen', quote: 'No one has stood at the top from the start.', ability: 'Kyoka Suigetsu, complete hypnosis', faction: 'Traitor of Soul Society' },
  'bleach-3': { name: 'Toshiro Hitsugaya', quote: "Don't mistake my rank for my age.", ability: 'Ice Bankai', faction: 'Gotei 13' },
  'bleach-8': { name: 'Kisuke Urahara', quote: 'Nothing ever happens without a reason.', ability: 'Benihime', faction: 'Soul Society / Urahara Shop' },

  'hxh-1': { name: 'Gon Freecss', quote: "I'll find my father and become a Hunter like him.", ability: 'Jajanken', faction: 'Licensed Hunters' },
  'hxh-4': { name: 'Leorio Paradinight', quote: "I'll become a doctor!", ability: 'Emission technique', faction: 'Hunters' },
  'hxh-2': { name: 'Killua Zoldyck', quote: 'Friendship matters more than what I was trained for.', ability: 'Lightning-fast electric strikes', faction: 'Zoldyck Assassin Family' },
  'hxh-5': { name: 'Kurapika', quote: "I won't let them get away.", ability: 'Scarlet Eyes and chains', faction: 'Hunters' },
  'hxh-3': { name: 'Hisoka Morow', quote: "I'm just curious how strong you really are.", ability: 'Bungee Gum', faction: 'Phantom Troupe' },
  'hxh-6': { name: 'Illumi Zoldyck', quote: 'Family is a job first.', ability: 'Manipulation needles', faction: 'Zoldyck family' },
  'hxh-7': { name: 'Meruem', quote: 'I am the king.', ability: 'Immense physical power', faction: 'Chimera Ants' },

  'opm-1': { name: 'Saitama', quote: "I'm just a hero for fun.", ability: 'One Punch', faction: 'Hero Association' },
  'opm-2': { name: 'Genos', quote: "I'll become strong enough for my revenge.", ability: 'Cyborg cannon', faction: 'Hero Association' },
  'opm-3': { name: 'Tatsumaki', quote: "I'll handle it without your help.", ability: 'Telekinesis', faction: 'Hero Association, Class S' },
  'opm-4': { name: 'Garou', quote: "I'm the hero hunter.", ability: 'Martial arts, combat foresight', faction: 'Monster Association' },

  'csm-3': { name: 'Angel Devil', quote: 'Touching me costs you years of your life.', ability: 'Lifespan absorption', faction: 'Public Safety' },
  'csm-1': { name: 'Denji', quote: 'I just want a normal life with toast in the morning.', ability: 'Chainsaw Devil transformation', faction: 'Tokyo Public Safety' },
  'csm-4': { name: 'Makima', quote: 'People need someone to follow.', ability: 'Control Devil', faction: 'Public Safety' },
  'csm-5': { name: 'Aki Hayakawa', quote: 'I live for revenge.', ability: 'Curse Devil and Fox Devil contracts', faction: 'Public Safety' },
  'csm-6': { name: 'Kobeni Higashiyama', quote: 'I just want to quit.', ability: 'Devil contract, extreme agility', faction: 'Public Safety' },
  'csm-2': { name: 'Power', quote: 'Blood is my element, fear me.', ability: 'Blood control', faction: 'Tokyo Public Safety' },
  'csm-7': { name: 'Kishibe', quote: 'I teach you to survive, not to win.', ability: 'Master of knives and hand-to-hand', faction: 'Public Safety' },

  'sf-1': { name: 'Loid Forger', quote: 'A strong family is where the world begins.', ability: 'Master of disguise and combat', faction: 'Westalis Intelligence' },
  'sf-2': { name: 'Anya Forger', quote: 'Anya thinks she gets it!', ability: 'Telepathy', faction: 'Forger Family' },
  'sf-3': { name: 'Yor Forger', quote: 'A good wife always protects her family.', ability: 'Hidden assassin skills', faction: 'Forger Family' },

  'sao-1': { name: 'Kirito', quote: "As long as I'm alive, I'll protect the ones I love.", ability: 'Dual Blades style', faction: 'SAO Players' },
  'sao-3': { name: 'Shino Asada', quote: "Behind a scope I'm calm.", ability: 'Sniping', faction: 'Gun Gale Online' },
  'sao-2': { name: 'Asuna', quote: "I won't just wait around, I fight too.", ability: 'Rapier and lightning-fast strikes', faction: 'Knights of the Blood Oath' },

  'codegeass-1': { name: 'Suzaku Kururugi', quote: 'You can only change the world from within.', ability: 'Lancelot pilot', faction: 'Britannian Empire' },
  'cg-2': { name: 'C.C.', quote: 'Pizza is the only thing that matters.', ability: 'Immortality and the Geass code', faction: 'Order of the Black Knights' },
  'cg-1': { name: 'Lelouch Lamperouge', quote: 'I, Lelouch, command you!', ability: 'Geass — absolute obedience', faction: 'Order of the Black Knights' },

  'frieren-1': { name: 'Stark', quote: "I'm scared, and I go anyway.", ability: 'Battle axe mastery', faction: "Frieren's party" },
  'fr-1': { name: 'Frieren', quote: "Human life is so short, and I'm only beginning to understand it.", ability: 'Ancient elven magic', faction: 'Traveling mages' },
  'fr-2': { name: 'Fern', quote: "I'll study magic so I can walk beside her.", ability: 'Combat magic', faction: 'Traveling mages' },

  'rz-2': { name: 'Rem', quote: 'For me, only you matter, Subaru.', ability: 'Ice magic and morning star', faction: 'Roswaal Mansion' },
  'rz-1': { name: 'Subaru Natsuki', quote: "I'll come back again and again until everyone is saved.", ability: '"Return by Death"', faction: 'Roswaal Mansion' },
  'rezero-3': { name: 'Ram', quote: 'One horn is enough for me.', ability: 'Wind magic, clairvoyance', faction: 'Roswaal Manor' },
  'rz-3': { name: 'Emilia', quote: 'I want to become a kind ruler for everyone.', ability: 'Half-elf ice magic', faction: 'Royal candidates' },

  'ks-1': { name: 'Kazuma Sato', quote: 'In another world, I just want a quiet life.', ability: 'Steal and Escape', faction: "Kazuma's Party" },
  'ks-2': { name: 'Aqua', quote: "I'm a goddess, you should worship me!", ability: 'Water purification and creation', faction: 'Guide Goddess' },
  'ks-3': { name: 'Megumin', quote: 'Explosion is the only magic worthy of me!', ability: 'Explosion', faction: 'Crimson Demon Clan' },

  'eva-1': { name: 'Shinji Ikari', quote: "I mustn't run away, I mustn't run away...", ability: 'Evangelion Unit-01 pilot', faction: 'NERV' },
  'eva-3': { name: 'Asuka Langley Soryu', quote: "I'm the best pilot, don't you forget it.", ability: 'Evangelion Unit-02 pilot', faction: 'NERV' },
  'eva-2': { name: 'Rei Ayanami', quote: "I don't understand what it means to be afraid.", ability: 'Evangelion Unit-00 pilot', faction: 'NERV' },

  'tg-1': { name: 'Ken Kaneki', quote: 'I used to be human.', ability: 'Ghoul regeneration and kagune', faction: 'Anteiku Café' },
  'tg-2': { name: 'Touka Kirishima', quote: 'Even a ghoul can want to live like a human.', ability: 'Wing kagune', faction: 'Anteiku Café' },

  'saekano-1': { name: 'Tomoya Aki', quote: "I'll make a game that moves people.", ability: 'Producing, otaku knowledge', faction: 'Blessing Software' },
  'saekano-2': { name: 'Megumi Kato', quote: "I'm completely ordinary, and that's the point.", ability: 'Unassuming presence, common sense', faction: 'Blessing Software' },

  'violet-1': { name: 'Violet Evergarden', quote: "I want to understand what 'I love you' means.", ability: 'Combat training, Auto Memory Doll', faction: 'CH Postal Company' },
  'violet-2': { name: 'Gilbert Bougainvillea', quote: 'Live free.', ability: 'Military command, swordsmanship', faction: 'Leidenschaftlich Army' },

  'spicewolf-1': { name: 'Kraft Lawrence', quote: 'A good deal beats a good speech.', ability: 'Trade and negotiation', faction: 'Travelling merchants' },
  'spicewolf-2': { name: 'Holo', quote: 'I am the wise wolf of Yoitsu.', ability: 'Giant wolf form, wisdom', faction: "Lawrence's companion" },

  'kaguya-1': { name: 'Kaguya Shinomiya', quote: 'Confessing first means losing.', ability: 'Strategy and versatile talent', faction: 'Shuchiin Student Council' },
  'kaguya-2': { name: 'Miyuki Shirogane', quote: "I'm no genius, I just work hard.", ability: 'Relentless studying', faction: 'Shuchiin Student Council' },
  'kaguya-3': { name: 'Chika Fujiwara', quote: "The game's just getting started!", ability: 'Unpredictability, music, games', faction: 'Shuchiin Student Council' },

  'drstone-1': { name: 'Senku Ishigami', quote: 'Now this is exhilarating!', ability: 'Scientific knowledge, invention', faction: 'Kingdom of Science' },
  'drstone-2': { name: 'Tsukasa Shishio', quote: 'The new world belongs to the young.', ability: 'Superhuman strength', faction: 'Empire of Might' },

  'bebop-1': { name: 'Edward Wong', quote: 'Ed knows everything about networks!', ability: 'Hacking', faction: 'Bebop crew' },
  'bebop-2': { name: 'Faye Valentine', quote: 'I pay my debts my own way.', ability: 'Gambling and gunplay', faction: 'Bebop crew' },
  'bebop-3': { name: 'Jet Black', quote: 'Every case leaves a trail.', ability: 'Ex-cop skills, bionic arm', faction: 'Bebop crew' },

  'mobpsycho-1': { name: 'Teruki Hanazawa', quote: 'I used to think power made me special.', ability: 'Psychic power', faction: 'Esper students' },
  'mobpsycho-2': { name: 'Mob (Shigeo Kageyama)', quote: 'Using my powers on people is where I stop.', ability: 'Immense psychic power', faction: 'Spirits and Such Consultation' },
  'mobpsycho-3': { name: 'Arataka Reigen', quote: "I'm an ordinary man, and that's enough.", ability: 'Persuasion, salt splash, massage', faction: 'Spirits and Such Consultation' },

  'apothecary-1': { name: 'Maomao', quote: "Poison is medicine — it's a matter of dose.", ability: 'Pharmacology, poison tolerance', faction: 'Rear Palace' },
  'apothecary-2': { name: 'Jinshi', quote: 'A pretty face sometimes beats an order.', ability: 'Court influence', faction: 'Imperial Palace' },

  'monster-1': { name: 'Johan Liebert', quote: 'A name is the one thing you can take completely.', ability: 'Manipulation', faction: 'Acts alone' },
  'monster-2': { name: 'Kenzo Tenma', quote: 'All lives are equal.', ability: 'Neurosurgery', faction: 'Eisler Memorial Hospital' },

  'oregairu-1': { name: 'Yukino Yukinoshita', quote: "I don't look for easy ways out.", ability: 'Intellect and bluntness', faction: 'Service Club' },
  'oregairu-2': { name: 'Haruno Yukinoshita', quote: 'Everyone wears a mask; I watch for the cracks.', ability: 'Charm and manipulation', faction: 'Yukinoshita family' },
  'oregairu-3': { name: 'Hachiman Hikigaya', quote: 'Something genuine is never convenient.', ability: 'Observation, self-sacrifice', faction: 'Service Club' },

  'nana-1': { name: 'Nana Komatsu', quote: 'I just want to be with the one I love.', ability: 'Sincerity and charm', faction: 'Black Stones circle' },
  'nana-2': { name: 'Nana Osaki', quote: "I sing so I'll be heard.", ability: 'Punk vocals', faction: 'Black Stones' },

  'nagatoro-2': { name: 'Hayase Nagatoro', quote: 'Aww, falling apart again, senpai?', ability: 'Judo and teasing', faction: 'Judo club' },

  'vinland-1': { name: 'Askeladd', quote: 'A true king serves his people.', ability: 'Tactics and swordsmanship', faction: "Askeladd's band" },
  'vinland-2': { name: 'Canute', quote: "I'll build paradise on this earth.", ability: 'Royal authority, strategy', faction: 'Danish kingdom' },
  'vinland-3': { name: 'Thorfinn', quote: 'I have no enemies.', ability: 'Dagger combat', faction: "Askeladd's band" },

  'blueexorcist-1': { name: 'Rin Okumura', quote: "Son of Satan or not, I'll be an exorcist.", ability: 'Blue flames, Kurikara', faction: 'True Cross Order' },

  'trigun-1': { name: 'Vash the Stampede', quote: 'Love and peace!', ability: 'Superhuman marksmanship', faction: 'Wanderer' },

  'hellsing-1': { name: 'Seras Victoria', quote: "I'm still trying to stay human.", ability: 'Vampiric strength, heavy weapons', faction: 'Hellsing Organization' },
  'hellsing-2': { name: 'Alucard', quote: 'I only know how to deal death.', ability: 'Vampiric regeneration, released forms', faction: 'Hellsing Organization' },

  'horimiya-1': { name: 'Kyoko Hori', quote: "At home I'm someone else entirely.", ability: 'Housekeeping and care', faction: 'Katagiri High School' },
  'horimiya-2': { name: 'Izumi Miyamura', quote: "People don't know the real me.", ability: 'Sewing, hidden appearance', faction: 'Katagiri High School' },

  'blacklagoon-1': { name: 'Revy', quote: 'Talking ends when I start.', ability: 'Dual-wielding gunplay', faction: 'Lagoon Company' },
  'blacklagoon-2': { name: 'Rock', quote: 'I still choose to stay human.', ability: 'Negotiation, languages', faction: 'Lagoon Company' },

  'blackclover-1': { name: 'Asta', quote: 'No magic, just guts.', ability: 'Anti-Magic swords', faction: 'Black Bulls' },
  'blackclover-2': { name: 'Yuno', quote: "I'll become the Wizard King.", ability: 'Wind magic, spirit Sylph', faction: 'Golden Dawn' },
  'blackclover-3': { name: 'Noelle Silva', quote: "I don't hide behind anyone anymore.", ability: 'Water magic', faction: 'Black Bulls' },
  'blackclover-4': { name: 'Yami Sukehiro', quote: 'Surpass your limits.', ability: 'Dark magic', faction: 'Black Bulls' },
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
