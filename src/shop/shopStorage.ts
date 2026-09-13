import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartLine } from './cart';
import { Order } from './orders';

const KEY = 'animequiz.shop';

/**
 * The device-side half. With a cloud account only `cart` is used — the
 * wallet lives on the server; a local-only account keeps everything here.
 */
export type LocalShopState = {
  /** Ids of items already bought — an avatar or a frame is owned once, not stocked. */
  owned: string[];
  /** How many of each consumable are left, by consumable id. */
  counts: Record<string, number>;
  /** Medal points spent so far; the balance is what the shelf is worth minus this. */
  spentPoints: number;
  cart: CartLine[];
  orders: Order[];
};

export const EMPTY_SHOP_STATE: LocalShopState = { owned: [], counts: {}, spentPoints: 0, cart: [], orders: [] };

type Store = Record<string, LocalShopState>;

async function readStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

/** Kept per account, so two people sharing a phone keep their own purchases. */
export async function loadShop(userId: string): Promise<LocalShopState> {
  const store = await readStore();
  return { ...EMPTY_SHOP_STATE, ...store[userId] };
}

export async function saveShop(userId: string, state: LocalShopState): Promise<void> {
  try {
    const store = await readStore();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...store, [userId]: state }));
  } catch {
    // Losing a cart is not worth failing the screen over.
  }
}
