import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { Product, Purchase } from 'expo-iap';

/**
 * The store's own till.
 *
 * Selling a cosmetic for money inside an app from Google Play or the App
 * Store has to go through that store's billing — see products.ts. This is
 * the whole of the device side of it, and it is deliberately the only file
 * that knows the library exists.
 *
 * Two things shape the code more than anything else:
 *
 * 1. **The native module is often not there.** Expo Go has no billing
 *    module, the web has none, and Jest has none; `expo-iap` throws the
 *    moment it is imported in any of them. So it is pulled in with
 *    `require` inside a try, and everything here answers "unavailable"
 *    rather than throwing when it is missing. The shop stays usable for
 *    medals in every one of those places.
 *
 * 2. **A purchase does not come back from the call that starts it.** The
 *    store sheet is its own flow and the result arrives on a listener, so
 *    `buyFromStore` subscribes first and then waits. A purchase that
 *    arrives after we stopped waiting is not lost: it stays unfinished with
 *    the store and `unfinishedPurchases` picks it up next time the shop
 *    opens.
 */

/** What the store charges, in the buyer's own currency — never converted here. */
export type StorePrice = { sku: string; displayPrice: string; currency: string };

export type StorePurchase = {
  sku: string;
  /** Play's purchase token, or Apple's signed transaction (JWS). */
  token: string;
  /** Apple's transaction id. Android has no equivalent and leaves it out. */
  transactionId?: string;
  platform: 'android' | 'ios';
  /** The library's own object. Needed to finish the transaction, opaque here. */
  raw: Purchase;
};

export type StoreOutcome =
  | { status: 'bought'; purchase: StorePurchase }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'unavailable' }
  | { status: 'failed'; code: string };

/**
 * Who is buying, as the store will remember it.
 *
 * Both stores can carry a tag through a purchase and hand it back with the
 * receipt, and that is what ties a payment to an account. Without it a
 * receipt is a bearer token: anyone holding one could redeem it on their
 * own account, once, before its real owner got round to it.
 *
 * Apple insists the tag is a UUID, so the account id goes through as it is.
 * Google's is visible to the buyer, so it goes through hashed.
 */
export type StoreAccount = {
  /** The account's own id, as a UUID — Apple accepts nothing else. */
  appAccountToken: string;
  /** The same account, hashed, for Google. */
  obfuscatedAccountId: string;
};

/**
 * The tag for one account.
 *
 * Google shows its tag to the buyer in their own purchase history, so that
 * one is a hash rather than the id itself — SHA-256 in hex is 64
 * characters, which is exactly Google's limit. Where the hash cannot be
 * computed the account id goes through unhashed instead: a tag that is
 * merely unobfuscated still ties the payment to the right account, whereas
 * an empty one ties it to nothing at all. The server accepts either form.
 */
export async function storeAccount(userId: string): Promise<StoreAccount> {
  let obfuscated = '';
  try {
    obfuscated = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, userId);
  } catch {
    obfuscated = '';
  }
  return {
    appAccountToken: userId,
    obfuscatedAccountId: /^[0-9a-f]{64}$/.test(obfuscated) ? obfuscated : userId,
  };
}

/** How long to wait on the store sheet before giving up on hearing back. */
const PURCHASE_TIMEOUT_MS = 180_000;

type Iap = typeof import('expo-iap');

let cached: Iap | null | undefined;

/** The library, or null where there is no billing module to talk to. */
function iap(): Iap | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('expo-iap') as Iap;
    cached = typeof loaded?.initConnection === 'function' ? loaded : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function isStoreBillingSupported(): boolean {
  return iap() !== null;
}

let connected = false;

/**
 * Opens the connection to the store, once. Everything else here needs it,
 * so they all call this first rather than trusting somebody else to have.
 */
export async function connectStore(): Promise<boolean> {
  const module = iap();
  if (!module) return false;
  if (connected) return true;
  try {
    await module.initConnection();
    connected = true;
  } catch {
    connected = false;
  }
  return connected;
}

export async function disconnectStore(): Promise<void> {
  const module = iap();
  if (!module || !connected) return;
  connected = false;
  try {
    await module.endConnection();
  } catch {
    // Nothing useful to do about a connection that will not close.
  }
}

/**
 * What the store says these products cost. Unknown ids come back missing
 * rather than as an error, which is what happens before the products have
 * been published in the console — so the shop shows medals-only prices
 * until they are, instead of breaking.
 */
export async function storePrices(skus: string[]): Promise<StorePrice[]> {
  const module = iap();
  if (!module || !skus.length) return [];
  if (!(await connectStore())) return [];
  try {
    const products = (await module.fetchProducts({ skus, type: 'in-app' })) as Product[] | null;
    return (products ?? []).map((product) => ({
      sku: product.id,
      displayPrice: product.displayPrice,
      currency: product.currency,
    }));
  } catch {
    return [];
  }
}

function asStorePurchase(purchase: Purchase): StorePurchase | null {
  const token = purchase.purchaseToken;
  if (!token) return null;
  const transactionId = 'transactionId' in purchase ? purchase.transactionId : undefined;
  return {
    sku: purchase.productId,
    token,
    transactionId: typeof transactionId === 'string' ? transactionId : undefined,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    raw: purchase,
  };
}

/**
 * Starts the store's purchase sheet and waits for its answer.
 *
 * A purchase still 'pending' — Google's slow payment methods, where money
 * arrives days later at a counter — is reported as such and granted
 * nothing. It becomes a real purchase on its own later, and the restore on
 * the next shop visit is what finally hands the item over.
 */
export async function buyFromStore(sku: string, account: StoreAccount): Promise<StoreOutcome> {
  const module = iap();
  if (!module) return { status: 'unavailable' };
  if (!(await connectStore())) return { status: 'unavailable' };

  return new Promise<StoreOutcome>((resolve) => {
    let done = false;
    const subscriptions: { remove: () => void }[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (outcome: StoreOutcome) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      for (const subscription of subscriptions) {
        try {
          subscription.remove();
        } catch {
          // A listener that will not detach is not worth failing a purchase over.
        }
      }
      resolve(outcome);
    };

    try {
      subscriptions.push(
        module.purchaseUpdatedListener((purchase) => {
          // Another product's event belongs to another call — or to the
          // restore pass — and must not answer this one.
          if (purchase.productId !== sku) return;
          if (purchase.purchaseState === 'pending') return settle({ status: 'pending' });
          if (purchase.purchaseState !== 'purchased') return;
          const mapped = asStorePurchase(purchase);
          settle(mapped ? { status: 'bought', purchase: mapped } : { status: 'failed', code: 'noToken' });
        })
      );
      subscriptions.push(
        module.purchaseErrorListener((error) => {
          if (error.productId && error.productId !== sku) return;
          settle(
            error.code === 'user-cancelled'
              ? { status: 'cancelled' }
              : { status: 'failed', code: String(error.code ?? 'storeError') }
          );
        })
      );
    } catch {
      return settle({ status: 'unavailable' });
    }

    timer = setTimeout(() => settle({ status: 'failed', code: 'timeout' }), PURCHASE_TIMEOUT_MS);

    module
      .requestPurchase({
        request: {
          apple: { sku, appAccountToken: account.appAccountToken },
          google: { skus: [sku], obfuscatedAccountId: account.obfuscatedAccountId },
        },
        type: 'in-app',
      })
      .catch((error: unknown) => {
        const code = (error as { code?: string })?.code;
        settle(code === 'user-cancelled' ? { status: 'cancelled' } : { status: 'failed', code: String(code ?? 'storeError') });
      });
  });
}

/**
 * Tells the store we are done with a purchase. Until this is called the
 * store keeps re-delivering it, and Google refunds an Android purchase that
 * was never finished within three days — so it happens only after the
 * server has granted the item, never before.
 */
export async function finishStorePurchase(purchase: StorePurchase, consumable: boolean): Promise<void> {
  const module = iap();
  if (!module) return;
  try {
    await module.finishTransaction({ purchase: purchase.raw, isConsumable: consumable });
  } catch {
    // Left unfinished on purpose: the restore pass will try again, which is
    // better than losing the item because the last step failed.
  }
}

/**
 * Purchases the store is still holding: paid for, but never granted —
 * because the app was killed mid-flow, the network died after the money
 * left, or a slow payment method finally went through.
 *
 * This is what makes the money rail safe to use at all.
 */
export async function unfinishedPurchases(): Promise<StorePurchase[]> {
  const module = iap();
  if (!module) return [];
  if (!(await connectStore())) return [];
  try {
    const purchases = (await module.getAvailablePurchases()) as Purchase[] | null;
    return (purchases ?? [])
      .filter((purchase) => purchase.purchaseState === 'purchased')
      .flatMap((purchase) => {
        const mapped = asStorePurchase(purchase);
        return mapped ? [mapped] : [];
      });
  } catch {
    return [];
  }
}

/** Only for the tests, which need a clean module between cases. */
export function resetStoreForTests(): void {
  cached = undefined;
  connected = false;
}
