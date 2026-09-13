import { AnimatedFrameId } from './animatedFrames';

/** Which of the three shelves an item sits on. */
export type ShopSection = 'digital' | 'merch' | 'rewards';

export const SHOP_SECTIONS: ShopSection[] = ['digital', 'merch', 'rewards'];

/**
 * What buying the item actually gives you. A digital item is granted on the
 * spot; a physical one becomes an order to be packed and posted.
 */
export type ShopGrant =
  | { kind: 'animatedFrame'; frameId: AnimatedFrameId }
  | { kind: 'physical' };

/** Sizes only apply to things people wear. */
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
  /** Price in roubles, for anything bought with money. */
  priceRub?: number;
  /** Price in medal points, for anything bought with tournament medals. */
  pricePoints?: number;
  /** Asks for a size at checkout. */
  sizes?: boolean;
  /** Shown with a "limited" mark — a reward that will not come back. */
  limited?: boolean;
};

export const SHOP_ITEMS: ShopItem[] = [
  // ---- digital: cosmetics, bought with money, no effect on play
  {
    id: 'frame-aurora',
    section: 'digital',
    title: 'Рамка «Аврора»',
    titleEn: 'Aurora frame',
    description: 'Переливающееся кольцо, которое медленно вращается вокруг аватарки.',
    descriptionEn: 'A shifting ring that turns slowly around your avatar.',
    grant: { kind: 'animatedFrame', frameId: 'aurora' },
    priceRub: 149,
  },
  {
    id: 'frame-petals',
    section: 'digital',
    title: 'Рамка «Лепестки»',
    titleEn: 'Petals frame',
    description: 'Лепестки сакуры кружат по орбите вокруг портрета.',
    descriptionEn: 'Sakura petals drifting in orbit around your portrait.',
    grant: { kind: 'animatedFrame', frameId: 'petals' },
    priceRub: 199,
  },
  {
    id: 'frame-ember',
    section: 'digital',
    title: 'Рамка «Уголёк»',
    titleEn: 'Ember frame',
    description: 'Тёплое свечение, которое дышит в такт.',
    descriptionEn: 'A warm glow that breathes in and out.',
    grant: { kind: 'animatedFrame', frameId: 'ember' },
    priceRub: 149,
  },
  {
    id: 'frame-circuit',
    section: 'digital',
    title: 'Рамка «Контур»',
    titleEn: 'Circuit frame',
    description: 'Бегущий пунктир — киберпанк для профиля.',
    descriptionEn: 'A marching dash — cyberpunk for your profile.',
    grant: { kind: 'animatedFrame', frameId: 'circuit' },
    priceRub: 179,
  },

  // ---- merch: real things, posted to a real address
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

  // ---- rewards: bought with medals only, and only won at the tournament
  {
    id: 'reward-frame-champion',
    section: 'rewards',
    title: 'Рамка чемпиона',
    titleEn: 'Champion frame',
    description: 'Золотое кольцо навстречу самому себе. Только за медали.',
    descriptionEn: 'Two gold rings turning against each other. Medals only.',
    grant: { kind: 'animatedFrame', frameId: 'champion' },
    pricePoints: 150,
  },
  {
    id: 'reward-frame-eternal',
    section: 'rewards',
    title: 'Рамка «Вечность»',
    titleEn: 'Eternal frame',
    description: 'Две встречные орбиты. Лимитированная — второй раз в магазин не вернётся.',
    descriptionEn: 'Two opposing orbits. Limited — it will not come back.',
    grant: { kind: 'animatedFrame', frameId: 'eternal' },
    pricePoints: 400,
    limited: true,
  },
  {
    id: 'reward-stickers',
    section: 'rewards',
    title: 'Стикеры победителя',
    titleEn: "Winner's stickers",
    description: 'Тот же набор, что в мерче, но с турнирной печатью. Приедет почтой.',
    descriptionEn: 'The merch sticker pack with a tournament stamp. Posted to you.',
    grant: { kind: 'physical' },
    pricePoints: 60,
  },
  {
    id: 'reward-mug',
    section: 'rewards',
    title: 'Кружка призёра',
    titleEn: "Winner's mug",
    description: 'Кружка с вашим местом и неделей турнира. Приедет почтой.',
    descriptionEn: 'A mug with your place and the tournament week on it. Posted to you.',
    grant: { kind: 'physical' },
    pricePoints: 250,
  },
  {
    id: 'reward-hoodie',
    section: 'rewards',
    title: 'Худи чемпиона',
    titleEn: 'Champion hoodie',
    description: 'Худи с именной вышивкой. Двенадцать золотых медалей — и оно ваше.',
    descriptionEn: 'A hoodie embroidered with your name. Twelve golds and it is yours.',
    grant: { kind: 'physical' },
    pricePoints: 900,
    sizes: true,
    limited: true,
  },
];

const BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

export function shopItem(id: string): ShopItem | undefined {
  return BY_ID.get(id);
}

export function itemsOf(section: ShopSection): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.section === section);
}

/** Rewards are paid in medal points; everything else in roubles. */
export function isMedalPriced(item: ShopItem): boolean {
  return item.pricePoints !== undefined;
}

export function needsDelivery(item: ShopItem): boolean {
  return item.grant.kind === 'physical';
}
