import { ShopItem } from './catalogue';

/**
 * The one seam where money would change hands.
 *
 * Nothing is wired up yet, and that is deliberate rather than unfinished:
 * a store's own billing is mandatory for digital goods and forbidden for
 * physical ones, so this ends up being two providers (Google Play Billing
 * for the cosmetics, an acquirer such as ЮKassa for the merch). Both need
 * accounts, keys and a signed offer before a single request can be made.
 *
 * Everything above this file is finished: the catalogue, the cart, the
 * delivery details and the order are all real. Turning payment on means
 * replacing the body of `payRubles` — no caller changes.
 */
export type PaymentOutcome =
  | { status: 'paid'; reference: string }
  | { status: 'unavailable' }
  | { status: 'failed'; reason: string };

export type PaymentRequest = {
  /** Whole roubles. */
  amount: number;
  /** Physical goods must not go through a store's billing, digital ones must. */
  physical: boolean;
  items: { item: ShopItem; quantity: number }[];
};

export const isPaymentConfigured = false;

/**
 * Whether cosmetics can be paid for in roubles. Mirrors DIGITAL_RUB_ENABLED
 * in supabase/functions/shop/index.ts, which is the one that decides — this
 * copy only stops the app offering a button the server will refuse. A test
 * keeps the two in step.
 *
 * It is off because an app distributed through Google Play has to sell
 * digital goods through Play Billing; merch is the opposite and must not.
 * Cosmetics are sold for medals instead, which no store has a rule about.
 */
export const DIGITAL_RUB_ENABLED = false;

export async function payRubles(_request: PaymentRequest): Promise<PaymentOutcome> {
  return { status: 'unavailable' };
}
