import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EMPTY_RECORD, TournamentRecord } from '../tournament/medals';
import { loadRecord } from '../tournament/medalStorage';
import { balanceOf, pointsPrice } from './economy';
import { ApparelSize, ShopItem, isStackable, needsDelivery } from './catalogue';
import { ConsumableId } from './consumables';
import * as Cart from './cart';
import { CartLine } from './cart';
import { Delivery, Order, PaidWith, deliveryProblems, newOrderId } from './orders';
import { EMPTY_SHOP_STATE, ShopState, loadShop, saveShop } from './shopStorage';
import { payRubles } from './payment';

/** Roubles or medal points — every item takes either. */
export type Currency = PaidWith;

export type BuyResult =
  | { ok: true }
  | { ok: false; reason: 'owned' | 'notEnoughPoints' | 'paymentUnavailable' | 'needsDelivery' };

export type OrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: 'emptyCart' | 'notEnoughPoints' | 'paymentUnavailable' };

type ShopContextValue = {
  ready: boolean;
  /** Medal points still to spend. */
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
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [state, setState] = useState<ShopState>(EMPTY_SHOP_STATE);
  const [medals, setMedals] = useState<TournamentRecord>(EMPTY_RECORD);
  const [ready, setReady] = useState(false);

  // Both halves of the wallet: what was bought is ours, what was won is the
  // tournament's, and the balance is the difference.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!profile) {
      setState(EMPTY_SHOP_STATE);
      setMedals(EMPTY_RECORD);
      return;
    }
    Promise.all([loadShop(profile.id), loadRecord(profile.id)]).then(([shop, record]) => {
      if (cancelled) return;
      setState(shop);
      setMedals(record);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  // Medals are won on another screen, so the balance is re-read whenever the
  // profile changes rather than only once at sign-in.
  useEffect(() => {
    if (!profile || !ready) return;
    loadRecord(profile.id).then(setMedals);
  }, [profile?.id, profile?.stats, ready]);

  const commit = (next: ShopState) => {
    setState(next);
    if (profile) saveShop(profile.id, next);
  };

  const balance = balanceOf(medals, state.spentPoints);
  const ownsItem = (id: string) => state.owned.includes(id);
  const countOf = (consumable: ConsumableId) => state.counts[consumable] ?? 0;

  const spendConsumable = (consumable: ConsumableId): boolean => {
    const left = countOf(consumable);
    if (left <= 0) return false;
    commit({ ...state, counts: { ...state.counts, [consumable]: left - 1 } });
    return true;
  };

  /** Adds what an item grants to the shelf — stacking it if it stacks. */
  const granted = (base: ShopState, items: ShopItem[]): ShopState => {
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

    if (currency === 'points') {
      const price = pointsPrice(item.priceRub);
      if (balance < price) return { ok: false, reason: 'notEnoughPoints' };
      commit(granted({ ...state, spentPoints: state.spentPoints + price }, [item]));
      return { ok: true };
    }

    const outcome = await payRubles({ amount: item.priceRub, physical: false, items: [{ item, quantity: 1 }] });
    if (outcome.status !== 'paid') return { ok: false, reason: 'paymentUnavailable' };
    commit(granted(state, [item]));
    return { ok: true };
  };

  const addToCart = (item: ShopItem, size?: ApparelSize) => {
    commit({ ...state, cart: Cart.addToCart(state.cart, item.id, size) });
  };

  const setQuantity = (itemId: string, size: ApparelSize | undefined, quantity: number) => {
    commit({ ...state, cart: Cart.setQuantity(state.cart, itemId, size, quantity) });
  };

  const clearCart = () => commit({ ...state, cart: [] });

  const placeOrder = async (delivery: Delivery, currency: Currency): Promise<OrderResult> => {
    const lines = Cart.cartItems(state.cart);
    if (!lines.length) return { ok: false, reason: 'emptyCart' };

    const totalRub = Cart.cartTotalRub(state.cart);
    const totalPoints = Cart.cartTotalPoints(state.cart);
    const inPoints = currency === 'points';

    if (inPoints) {
      if (balance < totalPoints) return { ok: false, reason: 'notEnoughPoints' };
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
      lines: state.cart,
      totalRub: inPoints ? 0 : totalRub,
      totalPoints: inPoints ? totalPoints : 0,
      delivery,
      paidWith: currency,
      status: inPoints ? 'paid' : 'awaitingPayment',
    };

    // Anything digital in the basket is granted here too, so a mixed order
    // does not leave a frame unpaid-for in the cart.
    const digital = lines.filter(({ item }) => !needsDelivery(item)).map(({ item }) => item);

    commit(
      granted(
        {
          ...state,
          spentPoints: state.spentPoints + (inPoints ? totalPoints : 0),
          cart: [],
          orders: [order, ...state.orders],
        },
        digital
      )
    );
    return { ok: true, order };
  };

  const value = useMemo(
    () => ({
      ready,
      balance,
      spent: state.spentPoints,
      medals,
      owned: state.owned,
      counts: state.counts,
      cart: state.cart,
      orders: state.orders,
      ownsItem,
      countOf,
      spendConsumable,
      buyDigital,
      addToCart,
      setQuantity,
      clearCart,
      placeOrder,
    }),
    [ready, balance, medals, state]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}

export { deliveryProblems };
