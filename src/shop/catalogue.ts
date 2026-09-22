import { AnimatedAvatarId } from './animatedAvatars';
import { AnimatedFrameId } from './animatedFrames';
import { ConsumableId } from './consumables';

/** Which shelf an item sits on. Sorted by what the thing is, not how it is paid for. */
export type ShopSection = 'merch' | 'avatars' | 'frames' | 'items';

export const SHOP_SECTIONS: ShopSection[] = ['merch', 'avatars', 'frames', 'items'];

/** What buying it actually gives you. */
export type ShopGrant =
  | { kind: 'animatedAvatar'; avatarId: AnimatedAvatarId }
  | { kind: 'animatedFrame'; frameId: AnimatedFrameId }
  | { kind: 'consumable'; consumable: ConsumableId; amount: number }
  | { kind: 'physical' };

export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type ApparelSize = (typeof APPAREL_SIZES)[number];

export type ShopItem = {
  id: string;
  section: ShopSection;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  grant: ShopGrant;
  /**
   * The one price. Every item can be paid for either way — in roubles, or in
   * the medal points that stand for the same value (see economy.ts), so there
   * is nothing to keep in step between two numbers.
   */
  priceRub: number;
  /** Asks for a size at checkout. */
  sizes?: boolean;
  /** Shown with a "limited" mark. */
  limited?: boolean;
  /** Shown in the "popular" row at the top of the shop. */
  popular?: boolean;
};

export const SHOP_ITEMS: ShopItem[] = [
  // ---- аватарки: a still picture with the motion added in code
  {
    id: 'avatar-sakura',
    section: 'avatars',
    title: 'Сакура',
    titleEn: 'Sakura',
    description: 'Розовые хвостики и лепестки, которые кружат вокруг портрета.',
    descriptionEn: 'Pink twintails with petals drifting around the portrait.',
    grant: { kind: 'animatedAvatar', avatarId: 'sakura' },
    priceRub: 250,
    popular: true,
  },
  {
    id: 'avatar-shadow',
    section: 'avatars',
    title: 'Тень',
    titleEn: 'Shadow',
    description: 'Тёмный силуэт, по которому медленно проходит блик.',
    descriptionEn: 'A dark silhouette with a highlight sweeping slowly across it.',
    grant: { kind: 'animatedAvatar', avatarId: 'shadow' },
    priceRub: 300,
    popular: true,
  },
  {
    id: 'avatar-frost',
    section: 'avatars',
    title: 'Иней',
    titleEn: 'Frost',
    description: 'Снежные искры вокруг ледяных волос.',
    descriptionEn: 'Snow sparks around icy hair.',
    grant: { kind: 'animatedAvatar', avatarId: 'frost' },
    priceRub: 300,
    popular: true,
  },
  {
    id: 'avatar-ember',
    section: 'avatars',
    title: 'Уголёк',
    titleEn: 'Ember',
    description: 'Тёплое свечение, которое дышит вокруг рыжей макушки.',
    descriptionEn: 'A warm glow breathing around a ginger head.',
    grant: { kind: 'animatedAvatar', avatarId: 'ember' },
    priceRub: 250,
    popular: true,
  },
  {
    id: 'avatar-mint',
    section: 'avatars',
    title: 'Мята',
    titleEn: 'Mint',
    description: 'Мятные хвостики и блик, идущий по кругу.',
    descriptionEn: 'Mint twintails and a highlight going round.',
    grant: { kind: 'animatedAvatar', avatarId: 'mint' },
    priceRub: 250,
  },
  {
    id: 'avatar-violet',
    section: 'avatars',
    title: 'Аметист',
    titleEn: 'Amethyst',
    description: 'Фиолетовое сияние, которое то разгорается, то гаснет.',
    descriptionEn: 'A violet halo that brightens and fades.',
    grant: { kind: 'animatedAvatar', avatarId: 'violet' },
    priceRub: 300,
    popular: true,
  },
  {
    id: 'avatar-sunny',
    section: 'avatars',
    title: 'Солнце',
    titleEn: 'Sunny',
    description: 'Золотые искры вокруг светлых волос.',
    descriptionEn: 'Golden sparks around fair hair.',
    grant: { kind: 'animatedAvatar', avatarId: 'sunny' },
    priceRub: 250,
  },
  {
    id: 'avatar-neko',
    section: 'avatars',
    title: 'Котик',
    titleEn: 'Kitty',
    description: 'Кот, который дышит. Просто кот.',
    descriptionEn: 'A cat that breathes. Just a cat.',
    grant: { kind: 'animatedAvatar', avatarId: 'neko' },
    priceRub: 200,
    popular: true,
  },

  // ---- рамки: drawn and animated in code, no files at all
  {
    id: 'frame-aurora',
    section: 'frames',
    title: 'Аврора',
    titleEn: 'Aurora',
    description: 'Переливающееся кольцо, которое медленно вращается вокруг аватарки.',
    descriptionEn: 'A shifting ring that turns slowly around your avatar.',
    grant: { kind: 'animatedFrame', frameId: 'aurora' },
    priceRub: 149,
    popular: true,
  },
  {
    id: 'frame-petals',
    section: 'frames',
    title: 'Лепестки',
    titleEn: 'Petals',
    description: 'Лепестки сакуры кружат по орбите вокруг портрета.',
    descriptionEn: 'Sakura petals drifting in orbit around your portrait.',
    grant: { kind: 'animatedFrame', frameId: 'petals' },
    priceRub: 199,
  },
  {
    id: 'frame-ember',
    section: 'frames',
    title: 'Уголёк',
    titleEn: 'Ember',
    description: 'Тёплое свечение, которое дышит в такт.',
    descriptionEn: 'A warm glow that breathes in and out.',
    grant: { kind: 'animatedFrame', frameId: 'ember' },
    priceRub: 149,
  },
  {
    id: 'frame-circuit',
    section: 'frames',
    title: 'Контур',
    titleEn: 'Circuit',
    description: 'Бегущий пунктир — киберпанк для профиля.',
    descriptionEn: 'A marching dash — cyberpunk for your profile.',
    grant: { kind: 'animatedFrame', frameId: 'circuit' },
    priceRub: 179,
  },
  {
    id: 'frame-champion',
    section: 'frames',
    title: 'Рамка чемпиона',
    titleEn: 'Champion frame',
    description: 'Золотые кольца навстречу друг другу.',
    descriptionEn: 'Two gold rings turning against each other.',
    grant: { kind: 'animatedFrame', frameId: 'champion' },
    priceRub: 300,
    popular: true,
  },
  {
    id: 'frame-eternal',
    section: 'frames',
    title: 'Вечность',
    titleEn: 'Eternal',
    description: 'Две встречные орбиты. Лимитированная — второй раз не вернётся.',
    descriptionEn: 'Two opposing orbits. Limited — it will not come back.',
    grant: { kind: 'animatedFrame', frameId: 'eternal' },
    priceRub: 400,
    limited: true,
  },

  // ---- игровые предметы: used up inside a quiz
  {
    id: 'item-hint-1',
    section: 'items',
    title: 'Подсказка 50/50',
    titleEn: '50/50 hint',
    description: 'Убирает два неверных варианта. Одна штука.',
    descriptionEn: 'Removes two wrong answers. One of them.',
    grant: { kind: 'consumable', consumable: 'hint5050', amount: 1 },
    priceRub: 49,
  },
  {
    id: 'item-hint-5',
    section: 'items',
    title: 'Подсказки 50/50 ×5',
    titleEn: '50/50 hints ×5',
    description: 'Пять подсказок пачкой — дешевле, чем по одной.',
    descriptionEn: 'Five hints in a pack — cheaper than one at a time.',
    grant: { kind: 'consumable', consumable: 'hint5050', amount: 5 },
    priceRub: 199,
    popular: true,
  },
  {
    id: 'item-skip-3',
    section: 'items',
    title: 'Пропуск вопроса ×3',
    titleEn: 'Skip question ×3',
    description: 'Пропускает вопрос без ошибки. Три штуки.',
    descriptionEn: 'Skips a question without getting it wrong. Three of them.',
    grant: { kind: 'consumable', consumable: 'skipQuestion', amount: 3 },
    priceRub: 129,
  },
  {
    id: 'item-freeze',
    section: 'items',
    title: 'Заморозка серии',
    titleEn: 'Streak freeze',
    description: 'Сохраняет серию дней, если вы пропустили день.',
    descriptionEn: 'Keeps your day streak alive if you miss a day.',
    grant: { kind: 'consumable', consumable: 'streakFreeze', amount: 1 },
    priceRub: 99,
    popular: true,
  },

  // ---- мерч в реале
  {
    id: 'merch-tee',
    section: 'merch',
    title: 'Футболка AnimeQuiz',
    titleEn: 'AnimeQuiz T-shirt',
    description: 'Хлопок 100%, плотность 190 г/м². Принт с тории на груди.',
    descriptionEn: '100% cotton, 190 gsm. Torii print on the chest.',
    grant: { kind: 'physical' },
    priceRub: 1990,
    sizes: true,
    popular: true,
  },
  {
    id: 'merch-hoodie',
    section: 'merch',
    title: 'Худи AnimeQuiz',
    titleEn: 'AnimeQuiz hoodie',
    description: 'Футер трёхнитка с начёсом, карман-кенгуру, вышивка на груди.',
    descriptionEn: 'Brushed fleece, kangaroo pocket, embroidered chest logo.',
    grant: { kind: 'physical' },
    priceRub: 4490,
    sizes: true,
  },
  {
    id: 'merch-mug',
    section: 'merch',
    title: 'Кружка «Аниме сегодня»',
    titleEn: '"Anime today" mug',
    description: 'Керамика, 330 мл, можно в посудомойку.',
    descriptionEn: 'Ceramic, 330 ml, dishwasher safe.',
    grant: { kind: 'physical' },
    priceRub: 890,
  },
  {
    id: 'merch-poster',
    section: 'merch',
    title: 'Постер «Тории»',
    titleEn: '"Torii" poster',
    description: 'A2, плотная матовая бумага 200 г/м².',
    descriptionEn: 'A2, heavy matte paper, 200 gsm.',
    grant: { kind: 'physical' },
    priceRub: 690,
  },
  {
    id: 'merch-stickers',
    section: 'merch',
    title: 'Набор стикеров',
    titleEn: 'Sticker pack',
    description: '12 виниловых стикеров с персонажами и котами.',
    descriptionEn: 'Twelve vinyl stickers — characters and cats.',
    grant: { kind: 'physical' },
    priceRub: 390,
    popular: true,
  },
  {
    id: 'merch-figure',
    section: 'merch',
    title: 'Фигурка талисмана',
    titleEn: 'Mascot figure',
    description: 'ПВХ, 12 см, на подставке с логотипом.',
    descriptionEn: 'PVC, 12 cm, on a branded stand.',
    grant: { kind: 'physical' },
    priceRub: 3290,
  },
];

const BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

export function shopItem(id: string): ShopItem | undefined {
  return BY_ID.get(id);
}

export function itemsOf(section: ShopSection): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.section === section);
}

export const POPULAR_ITEMS = SHOP_ITEMS.filter((item) => item.popular);

export function needsDelivery(item: ShopItem): boolean {
  return item.grant.kind === 'physical';
}

/** A consumable stacks; everything else is owned once and only once. */
export function isStackable(item: ShopItem): boolean {
  return item.grant.kind === 'consumable';
}
