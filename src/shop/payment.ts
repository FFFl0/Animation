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

export async function payRubles(_request: PaymentRequest): Promise<PaymentOutcome> {
  return { status: 'unavailable' };
}
