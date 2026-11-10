import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { TournamentRecord } from '../tournament/medals';
import { ApparelSize } from './catalogue';
import { ConsumableId } from './consumables';
import { CartLine } from './cart';
import { Delivery, Order } from './orders';
import { StorePurchase } from './iap';
import { reasonOf } from '../auth/functionReason';

export { reasonOf };

/** Where to send the buyer to pay, when an order needs paying for. */
export type PaymentConfirmation = { url: string; orderId: string };

/** The wallet as the server sees it. The balance is computed there, never here. */
export type ShopState = {
  medals: TournamentRecord;
  earnedPoints: number;
  balance: number;
  owned: string[];
  counts: Record<string, number>;
  orders: Order[];
  /** Present only on an order that still has to be paid for by card. */
  confirmation?: PaymentConfirmation;
  /** Present on a claimed store purchase: 'granted' the first time, then 'duplicate'. */
  claimed?: 'granted' | 'duplicate';
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
  if (error) throw new ShopError(await reasonOf(error));
  if (data?.error) throw new ShopError(String(data.error));
  return data as ShopState;
}

export const fetchShop = () => call({ action: 'state' });

export const buyItem = (itemId: string, currency: 'points' | 'rub') =>
  call({ action: 'buy', itemId, currency });

export const spendItem = (consumable: ConsumableId) => call({ action: 'spend', consumable });

export const placeOrderRemote = (
  lines: CartLine[],
  delivery: Delivery,
  currency: 'points' | 'rub',
  returnUrl: string
) =>
  call({
    action: 'order',
    currency,
    delivery,
    returnUrl,
    lines: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, size: line.size as ApparelSize })),
  });

/**
 * Hands a store receipt to the server, which asks Google or Apple about it
 * before granting anything. Safe to call twice with the same receipt — the
 * server keys the grant on the store's own token.
 */
export const claimStorePurchase = (purchase: StorePurchase) =>
  call({
    action: 'claim',
    platform: purchase.platform,
    productId: purchase.sku,
    purchaseToken: purchase.token,
    transactionId: purchase.transactionId,
  });
