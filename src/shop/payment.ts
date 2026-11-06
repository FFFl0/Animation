import { ShopItem } from './catalogue';

/**
 * The acquirer's seam — the local, device-side half of it.
 *
 * Money changes hands on two rails, because the stores leave no choice: a
 * store's own billing is mandatory for digital goods and forbidden for
 * physical ones. Both rails are built:
 *
 *   merch      → ЮKassa, in the `shop` Edge Function, which creates the
 *                payment and hands back a page to open (`placeOrder` in
 *                ShopContext). Needs keys in the function's secrets.
 *   cosmetics  → the store's own till, in `iap.ts` and `products.ts`,
 *                with the receipt checked server-side before anything is
 *                granted.
 *
 * What is left here is the local-only path: an account with no server
 * behind it, where there is nobody to create a payment with and nobody to
 * check a receipt against. It answers 'unavailable', and the shop sells
 * for medals. Wiring it up would mean replacing the body of `payRubles`.
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
 * Whether cosmetics may be paid for through the ACQUIRER — not whether
 * they can be paid for at all. Mirrors DIGITAL_RUB_ENABLED in
 * supabase/functions/shop/index.ts, which is the one that decides; a test
 * keeps the two in step.
 *
 * It is off because an app distributed through Google Play or the App Store
 * has to sell digital goods through that store's billing, which is what
 * `products.ts` routes them to. Turn it on only for a build that no such
 * store distributes — a direct APK — where the stores' tills are not
 * available anyway.
 */
export const DIGITAL_RUB_ENABLED = false;

export async function payRubles(_request: PaymentRequest): Promise<PaymentOutcome> {
  return { status: 'unavailable' };
}
