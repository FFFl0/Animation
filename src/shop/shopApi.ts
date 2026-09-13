import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { TournamentRecord } from '../tournament/medals';
import { ApparelSize } from './catalogue';
import { ConsumableId } from './consumables';
import { CartLine } from './cart';
import { Delivery, Order } from './orders';

/** The wallet as the server sees it. The balance is computed there, never here. */
export type ShopState = {
  medals: TournamentRecord;
  earnedPoints: number;
  balance: number;
  owned: string[];
  counts: Record<string, number>;
  orders: Order[];
};

export const isCloudShop = isSupabaseConfigured;

/** Errors the function reports by name, so the app can translate them. */
export class ShopError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

async function call(body: Record<string, unknown>): Promise<ShopState> {
  const { data, error } = await supabase!.functions.invoke('shop', { body });
  if (error) throw new ShopError('network');
  if (data?.error) throw new ShopError(String(data.error));
  return data as ShopState;
}

export const fetchShop = () => call({ action: 'state' });

export const buyItem = (itemId: string, currency: 'points' | 'rub') =>
  call({ action: 'buy', itemId, currency });

export const spendItem = (consumable: ConsumableId) => call({ action: 'spend', consumable });

export const placeOrderRemote = (lines: CartLine[], delivery: Delivery, currency: 'points' | 'rub') =>
  call({
    action: 'order',
    currency,
    delivery,
    lines: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, size: line.size as ApparelSize })),
  });
