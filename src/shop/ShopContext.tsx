import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EMPTY_RECORD, TournamentRecord, applyRun } from '../tournament/medals';
import { loadRecord, saveRecord } from '../tournament/medalStorage';
import { balanceOf, earnedPoints, pointsPrice } from './economy';
import { ApparelSize, ShopItem, isStackable, needsDelivery } from './catalogue';
import { ConsumableId } from './consumables';
import * as Cart from './cart';
import { CartLine } from './cart';
import { Delivery, Order, PaidWith, deliveryProblems, newOrderId } from './orders';
import { EMPTY_SHOP_STATE, LocalShopState, loadShop, saveShop } from './shopStorage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ShopError, ShopState, buyItem, claimDaily, claimStorePurchase, fetchShop, isCloudShop, placeOrderRemote, spendItem } from './shopApi';
import { rewardForDay } from '../quests/quests';
import { isPaymentConfigured, payRubles } from './payment';
import { ALL_SKUS, isConsumableSku, moneyRail, skuOf } from './products';
import {
  StorePurchase,
  buyFromStore,
  disconnectStore,
  finishStorePurchase,
  isStoreBillingSupported,
  storeAccount,
  storePrices,
  unfinishedPurchases,
} from './iap';

/** Roubles or medal points — every item takes either. */
export type Currency = PaidWith;

export type BuyResult =
  /** `granted` is false when the item was already there — a receipt claimed twice. */
  | { ok: true; granted?: boolean }
  | { ok: false; reason: string };

export type OrderResult =
  | { ok: true; order?: Order }
  | { ok: false; reason: string };

const EMPTY_WALLET: ShopState = {
  medals: EMPTY_RECORD,
  earnedPoints: 0,
  balance: 0,
  owned: [],
  counts: {},
  orders: [],
};

type ShopContextValue = {
  ready: boolean;
  /** True when the wallet lives on the server rather than on this device. */
  cloud: boolean;
  balance: number;
  /** Medal points already spent — the other half of the wallet's arithmetic. */
  spent: number;
  medals: TournamentRecord;
  owned: string[];
  counts: Record<string, number>;
  cart: CartLine[];
  orders: Order[];
  ownsItem: (id: string) => boolean;
  countOf: (consumable: ConsumableId) => number;
  /** Uses one up, and says whether there was one to use. */
  /** Uses up `amount` of an item; false, and nothing spent, if there are fewer than that. */
  spendConsumable: (consumable: ConsumableId, amount?: number) => boolean;
  buyDigital: (item: ShopItem, currency: Currency) => Promise<BuyResult>;
  /** True when this item can be paid for with money on this device, right now. */
  takesMoney: (item: ShopItem) => boolean;
  /** True where the store's own till can be reached at all. */
  storeBilling: boolean;
  /** Claims anything paid for but never received; returns how many arrived. */
  restorePurchases: () => Promise<number>;
  /**
   * What the store charges for an item, in the buyer's own currency and
   * wording — "399,00 ₽", "$4.99". Null before the store has answered, or
   * for an item it does not sell, and then the rouble price is shown
   * instead.
   */
  storePriceOf: (item: ShopItem) => string | null;
  addToCart: (item: ShopItem, size?: ApparelSize) => void;
  setQuantity: (itemId: string, size: ApparelSize | undefined, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (delivery: Delivery, currency: Currency) => Promise<OrderResult>;
  /**
   * Hands over the reward for the day's quests: one consumable, and which
   * one follows from the date. 'alreadyClaimed' means the day's reward is
   * gone — collected here earlier or on another device.
   */
  claimDailyReward: (day: string) => Promise<'granted' | 'alreadyClaimed' | 'failed'>;
  /** Banks a finished tournament run. A no-op in the cloud, which did it already. */
  recordTournamentRun: (place: number, runId: string) => void;
  refresh: () => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

/** The local wallet, shaped the same way the server shapes the cloud one. */
function localWallet(local: LocalShopState, record: TournamentRecord): ShopState {
  return {
    medals: record,
    earnedPoints: earnedPoints(record),
    balance: balanceOf(record, local.spentPoints),
    owned: local.owned,
    counts: local.counts,
    orders: local.orders,
  };
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const cloud = isCloudShop;
  const [local, setLocal] = useState<LocalShopState>(EMPTY_SHOP_STATE);
  const [wallet, setWallet] = useState<ShopState>(EMPTY_WALLET);
  const [ready, setReady] = useState(false);
  /** Store product id to the price the store itself shows for it. */
  const [prices, setPrices] = useState<Record<string, string>>({});

  const load = async (userId: string) => {
    // The cart is a draft and stays on the device either way; only the
    // wallet moves to the server.
    const saved = await loadShop(userId);
    setLocal(saved);
    if (cloud) {
      setWallet(await fetchShop().catch(() => EMPTY_WALLET));
    } else {
      setWallet(localWallet(saved, await loadRecord(userId)));
    }
    setReady(true);
  };

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!profile) {
      setLocal(EMPTY_SHOP_STATE);
      setWallet(EMPTY_WALLET);
      return;
    }
    load(profile.id).catch(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Medals are won on another screen, so the wallet is re-read whenever the
  // profile changes rather than only once at sign-in.
  useEffect(() => {
    if (!profile || !ready) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.stats]);

  const refresh = () => {
    if (!profile) return;
    if (cloud) fetchShop().then(setWallet).catch(() => {});
    else loadRecord(profile.id).then((record) => setWallet(localWallet(local, record)));
  };

  /** Saves the device-side half and keeps the local wallet in step with it. */
  const commitLocal = (next: LocalShopState) => {
    setLocal(next);
    if (profile) saveShop(profile.id, next);
    if (!cloud) setWallet((current) => localWallet(next, current.medals));
  };

  const ownsItem = (id: string) => wallet.owned.includes(id);
  const countOf = (consumable: ConsumableId) => wallet.counts[consumable] ?? 0;

  const spendConsumable = (consumable: ConsumableId, amount = 1): boolean => {
    if (amount < 1 || countOf(consumable) < amount) return false;
    // Spent on the spot so the quiz does not wait on the network; the
    // server is told straight after and its answer replaces this guess.
    setWallet((w) => ({ ...w, counts: { ...w.counts, [consumable]: (w.counts[consumable] ?? amount) - amount } }));
    if (cloud) {
      // The server takes one at a time. In order, so its last answer is the
      // count after all of them; more than one only happens for freezes
      // covering several missed days.
      void (async () => {
        try {
          let latest: ShopState | null = null;
          for (let i = 0; i < amount; i++) latest = await spendItem(consumable);
          if (latest) setWallet(latest);
        } catch {
          refresh();
        }
      })();
    } else {
      commitLocal({ ...local, counts: { ...local.counts, [consumable]: countOf(consumable) - amount } });
    }
    return true;
  };

  /**
   * Takes a store receipt to the server and, if the item was granted, tells
   * the store we are done with the purchase.
   *
   * The order matters both ways round. Finishing before the grant would
   * throw away the only proof of payment if the grant then failed; never
   * finishing at all makes Google refund the purchase after three days. So
   * it is grant first, finish second — and a receipt the server rejects
   * outright is finished too, because re-sending it on every visit would
   * only repeat the same answer for ever.
   */
  const claimStore = async (purchase: StorePurchase): Promise<BuyResult> => {
    try {
      const next = await claimStorePurchase(purchase);
      setWallet(next);
      await finishStorePurchase(purchase, isConsumableSku(purchase.sku));
      return { ok: true, granted: next.claimed !== 'duplicate' };
    } catch (e) {
      const reason = e instanceof ShopError ? e.reason : 'claimFailed';
      // These three are final answers: sending the same receipt again can
      // only earn the same refusal, so the transaction is closed rather
      // than retried on every visit for ever.
      if (reason === 'receiptRejected' || reason === 'receiptIncomplete' || reason === 'unknownItem') {
        await finishStorePurchase(purchase, isConsumableSku(purchase.sku));
      }
      return { ok: false, reason: reason === 'unknownItem' ? 'receiptRejected' : reason };
    }
  };

  /**
   * Opens the store, learns its prices, and hands over anything already
   * paid for.
   *
   * The second half is what makes the money rail honest: a purchase that
   * went through while the app was being killed, or on a slow payment
   * method that settled days later, is sitting with the store unfinished.
   * It gets claimed here, on the next visit, rather than being lost.
   */
  useEffect(() => {
    if (!profile || !cloud || !isStoreBillingSupported()) return;
    let cancelled = false;
    (async () => {
      const quoted = await storePrices(ALL_SKUS);
      if (cancelled) return;
      if (quoted.length) {
        setPrices(Object.fromEntries(quoted.map((price) => [price.sku, price.displayPrice])));
      }
      for (const purchase of await unfinishedPurchases()) {
        if (cancelled) return;
        await claimStore(purchase);
      }
    })().catch(() => {
      // A store that will not talk leaves the shop selling for medals.
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, cloud]);

  // The billing connection lives as long as the shop does.
  useEffect(() => () => void disconnectStore(), []);

  /** Adds what an item grants to the local shelf — stacking it if it stacks. */
  const grantedLocally = (base: LocalShopState, items: ShopItem[]): LocalShopState => {
    const owned = [...base.owned];
    const counts = { ...base.counts };
    for (const item of items) {
      if (item.grant.kind === 'consumable') {
        counts[item.grant.consumable] = (counts[item.grant.consumable] ?? 0) + item.grant.amount;
      } else if (!owned.includes(item.id)) {
        owned.push(item.id);
      }
    }
    return { ...base, owned, counts };
  };

  const buyDigital = async (item: ShopItem, currency: Currency): Promise<BuyResult> => {
    if (needsDelivery(item)) return { ok: false, reason: 'needsDelivery' };
    if (!isStackable(item) && ownsItem(item.id)) return { ok: false, reason: 'owned' };

    // Money for a cosmetic goes through the store's own till, which is
    // both the stores' rule and the only way the app may charge for one.
    if (currency === 'rub' && moneyRail(item) === 'store') {
      const sku = skuOf(item.id);
      if (!sku) return { ok: false, reason: 'storeBillingUnavailable' };
      // Without a server there is nobody to check the receipt with, and an
      // item granted on the phone's word alone would be lost on the next
      // install — so the money rail waits for the cloud wallet.
      if (!cloud || !profile) return { ok: false, reason: 'storeBillingUnavailable' };

      // The purchase carries who is buying, and the server checks the
      // receipt says the same — so a receipt cannot be redeemed on
      // somebody else's account.
      const outcome = await buyFromStore(sku, await storeAccount(profile.id));
      switch (outcome.status) {
        case 'bought':
          return claimStore(outcome.purchase);
        case 'cancelled':
          return { ok: false, reason: 'cancelled' };
        case 'pending':
          return { ok: false, reason: 'paymentPending' };
        case 'unavailable':
          return { ok: false, reason: 'storeBillingUnavailable' };
        default:
          return { ok: false, reason: 'paymentFailed' };
      }
    }

    if (cloud) {
      try {
        setWallet(await buyItem(item.id, currency));
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: e instanceof ShopError ? e.reason : 'buyFailed' };
      }
    }

    if (currency === 'points') {
      const price = pointsPrice(item.priceRub);
      if (wallet.balance < price) return { ok: false, reason: 'notEnoughPoints' };
      commitLocal(grantedLocally({ ...local, spentPoints: local.spentPoints + price }, [item]));
      return { ok: true };
    }

    const outcome = await payRubles({ amount: item.priceRub, physical: false, items: [{ item, quantity: 1 }] });
    if (outcome.status !== 'paid') return { ok: false, reason: 'paymentUnavailable' };
    commitLocal(grantedLocally(local, [item]));
    return { ok: true };
  };

  /**
   * Hands over everything already paid for but not yet received.
   *
   * It runs by itself when the shop opens, and this is the same pass behind
   * a button — which Apple expects an app selling non-consumables to offer,
   * and which is the honest answer to "I paid and got nothing".
   */
  const restorePurchases = async (): Promise<number> => {
    if (!cloud || !isStoreBillingSupported()) return 0;
    let granted = 0;
    for (const purchase of await unfinishedPurchases()) {
      const result = await claimStore(purchase);
      if (result.ok && result.granted) granted += 1;
    }
    return granted;
  };

  const storePriceOf = (item: ShopItem): string | null => {
    const sku = skuOf(item.id);
    return sku ? prices[sku] ?? null : null;
  };

  /**
   * Whether a money price is worth showing. A price nobody can pay would be
   * a lie, so merch asks about the acquirer and a cosmetic about the store
   * — and in the shop's case about whether the store knows the product at
   * all, which it does not until the products are published in the console.
   */
  const takesMoney = (item: ShopItem): boolean => {
    if (moneyRail(item) === 'acquirer') return cloud || isPaymentConfigured;
    return cloud && isStoreBillingSupported() && storePriceOf(item) !== null;
  };

  const addToCart = (item: ShopItem, size?: ApparelSize) => {
    commitLocal({ ...local, cart: Cart.addToCart(local.cart, item.id, size) });
  };

  const setQuantity = (itemId: string, size: ApparelSize | undefined, quantity: number) => {
    commitLocal({ ...local, cart: Cart.setQuantity(local.cart, itemId, size, quantity) });
  };

  const clearCart = () => commitLocal({ ...local, cart: [] });

  const placeOrder = async (delivery: Delivery, currency: Currency): Promise<OrderResult> => {
    const lines = Cart.cartItems(local.cart);
    if (!lines.length) return { ok: false, reason: 'emptyCart' };

    const totalRub = Cart.cartTotalRub(local.cart);
    const totalPoints = Cart.cartTotalPoints(local.cart);
    const inPoints = currency === 'points';

    if (cloud) {
      try {
        // The card page comes back here when it is done, so the app can
        // re-read the order instead of leaving the buyer in a browser.
        const returnUrl = Linking.createURL('order');
        const next = await placeOrderRemote(local.cart, delivery, currency, returnUrl);
        setWallet(next);
        commitLocal({ ...local, cart: [] });

        if (next.confirmation) {
          await WebBrowser.openAuthSessionAsync(next.confirmation.url, returnUrl);
          // Whether they paid is the webhook's business, not the browser's:
          // coming back is not proof of anything, so the state is re-read.
          refresh();
        }
        return { ok: true, order: next.orders[0] };
      } catch (e) {
        return { ok: false, reason: e instanceof ShopError ? e.reason : 'orderFailed' };
      }
    }

    if (inPoints) {
      if (wallet.balance < totalPoints) return { ok: false, reason: 'notEnoughPoints' };
    } else {
      const outcome = await payRubles({
        amount: totalRub,
        physical: lines.some(({ item }) => needsDelivery(item)),
        items: lines.map(({ item, line }) => ({ item, quantity: line.quantity })),
      });
      if (outcome.status !== 'paid') return { ok: false, reason: 'paymentUnavailable' };
    }

    const order: Order = {
      id: newOrderId(),
      createdAt: new Date().toISOString(),
      lines: local.cart,
      totalRub: inPoints ? 0 : totalRub,
      totalPoints: inPoints ? totalPoints : 0,
      delivery,
      paidWith: currency,
      status: inPoints ? 'paid' : 'awaitingPayment',
    };

    // Anything digital in the basket is granted here too, so a mixed order
    // does not leave a frame unpaid-for in the cart.
    const digital = lines.filter(({ item }) => !needsDelivery(item)).map(({ item }) => item);

    commitLocal(
      grantedLocally(
        {
          ...local,
          spentPoints: local.spentPoints + (inPoints ? totalPoints : 0),
          cart: [],
          orders: [order, ...local.orders],
        },
        digital
      )
    );
    return { ok: true, order };
  };

  const claimDailyReward = async (day: string): Promise<'granted' | 'alreadyClaimed' | 'failed'> => {
    if (cloud) {
      try {
        setWallet(await claimDaily(day));
        return 'granted';
      } catch (e) {
        return e instanceof ShopError && e.reason === 'dailyClaimed' ? 'alreadyClaimed' : 'failed';
      }
    }
    // On a local account the device is the only record there is, and the
    // quests' own "claimed" flag is what stops a second helping.
    const consumable = rewardForDay(day);
    commitLocal({ ...local, counts: { ...local.counts, [consumable]: (local.counts[consumable] ?? 0) + 1 } });
    return 'granted';
  };

  const recordTournamentRun = (place: number, runId: string) => {
    // In the cloud the tournament function already wrote the medal when the
    // bracket finished; the app only has to re-read it.
    if (cloud) {
      refresh();
      return;
    }
    if (!profile) return;
    const updated = applyRun(wallet.medals, place, runId);
    if (updated === wallet.medals) return;
    saveRecord(profile.id, updated);
    setWallet(localWallet(local, updated));
  };

  const value = useMemo(
    () => ({
      ready,
      cloud,
      balance: wallet.balance,
      spent: Math.max(0, wallet.earnedPoints - wallet.balance),
      medals: wallet.medals,
      owned: wallet.owned,
      counts: wallet.counts,
      cart: local.cart,
      orders: wallet.orders,
      ownsItem,
      countOf,
      spendConsumable,
      buyDigital,
      takesMoney,
      storeBilling: cloud && isStoreBillingSupported(),
      restorePurchases,
      storePriceOf,
      addToCart,
      setQuantity,
      clearCart,
      placeOrder,
      claimDailyReward,
      recordTournamentRun,
      refresh,
    }),
    [ready, cloud, wallet, local, prices]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}

export { deliveryProblems };
