import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { TournamentRecord } from '../tournament/medals';
import { ApparelSize } from './catalogue';
import { ConsumableId } from './consumables';
import { CartLine } from './cart';
import { Delivery, Order } from './orders';
import { StorePurchase } from './iap';

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

/**
 * The reason the function gave, out of the error the client wraps it in.
 *
 * supabase-js treats any non-2xx as one error — "Edge Function returned a
 * non-2xx status code" — and hands the untouched Response over as
 * `context`. Without reading it, every refusal the function spells out
 * (not enough points, this receipt was rejected, the store is not
 * configured) reaches the screen as "no connection to the server", which
 * is both wrong and unhelpful. So the body is read here, and only a
 * genuinely unreadable answer is reported as a network problem.
 */
export async function reasonOf(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Not JSON, or already read — fall through to 'network'.
    }
  }
  return 'network';
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
