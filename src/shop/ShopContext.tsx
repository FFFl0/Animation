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
import { ShopError, ShopState, buyItem, fetchShop, isCloudShop, placeOrderRemote, spendItem } from './shopApi';
import { payRubles } from './payment';

/** Roubles or medal points — every item takes either. */
export type Currency = PaidWith;

export type BuyResult =
  | { ok: true }
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
  spendConsumable: (consumable: ConsumableId) => boolean;
  buyDigital: (item: ShopItem, currency: Currency) => Promise<BuyResult>;
  addToCart: (item: ShopItem, size?: ApparelSize) => void;
  setQuantity: (itemId: string, size: ApparelSize | undefined, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (delivery: Delivery, currency: Currency) => Promise<OrderResult>;
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

  const spendConsumable = (consumable: ConsumableId): boolean => {
    if (countOf(consumable) <= 0) return false;
    // Spent on the spot so the quiz does not wait on the network; the
    // server is told straight after and its answer replaces this guess.
    setWallet((w) => ({ ...w, counts: { ...w.counts, [consumable]: (w.counts[consumable] ?? 1) - 1 } }));
    if (cloud) {
      spendItem(consumable).then(setWallet).catch(() => refresh());
    } else {
      commitLocal({ ...local, counts: { ...local.counts, [consumable]: countOf(consumable) - 1 } });
    }
    return true;
  };

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
      addToCart,
      setQuantity,
      clearCart,
      placeOrder,
      recordTournamentRun,
      refresh,
    }),
    [ready, cloud, wallet, local]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}

export { deliveryProblems };
