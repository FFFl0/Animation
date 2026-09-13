import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EMPTY_RECORD, TournamentRecord } from '../tournament/medals';
import { loadRecord } from '../tournament/medalStorage';
import { balanceOf } from './economy';
import { ApparelSize, ShopItem, isMedalPriced, needsDelivery } from './catalogue';
import * as Cart from './cart';
import { CartLine } from './cart';
import { Delivery, Order, deliveryProblems, newOrderId } from './orders';
import { EMPTY_SHOP_STATE, ShopState, loadShop, saveShop } from './shopStorage';
import { payRubles } from './payment';

export type BuyResult =
  | { ok: true }
  | { ok: false; reason: 'owned' | 'notEnoughPoints' | 'paymentUnavailable' | 'needsDelivery' };

export type OrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: 'emptyCart' | 'notEnoughPoints' | 'paymentUnavailable'; missing?: (keyof Delivery)[] };

type ShopContextValue = {
  ready: boolean;
  /** Medal points still to spend. */
  balance: number;
  medals: TournamentRecord;
  owned: string[];
  cart: CartLine[];
  orders: Order[];
  ownsItem: (id: string) => boolean;
  buyDigital: (item: ShopItem) => Promise<BuyResult>;
  addToCart: (item: ShopItem, size?: ApparelSize) => void;
  setQuantity: (itemId: string, size: ApparelSize | undefined, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (delivery: Delivery) => Promise<OrderResult>;
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

  const buyDigital = async (item: ShopItem): Promise<BuyResult> => {
    if (needsDelivery(item)) return { ok: false, reason: 'needsDelivery' };
    if (ownsItem(item.id)) return { ok: false, reason: 'owned' };

    if (isMedalPriced(item)) {
      const price = item.pricePoints ?? 0;
      if (balance < price) return { ok: false, reason: 'notEnoughPoints' };
      commit({ ...state, owned: [...state.owned, item.id], spentPoints: state.spentPoints + price });
      return { ok: true };
    }

    const outcome = await payRubles({ amount: item.priceRub ?? 0, physical: false, items: [{ item, quantity: 1 }] });
    if (outcome.status !== 'paid') return { ok: false, reason: 'paymentUnavailable' };
    commit({ ...state, owned: [...state.owned, item.id] });
    return { ok: true };
  };

  const addToCart = (item: ShopItem, size?: ApparelSize) => {
    // A basket that is part roubles and part medals has no total to show, so
    // the newer item starts a fresh one.
    const base = Cart.wouldMixCurrencies(state.cart, item) ? [] : state.cart;
    commit({ ...state, cart: Cart.addToCart(base, item.id, size) });
  };

  const setQuantity = (itemId: string, size: ApparelSize | undefined, quantity: number) => {
    commit({ ...state, cart: Cart.setQuantity(state.cart, itemId, size, quantity) });
  };

  const clearCart = () => commit({ ...state, cart: [] });

  const placeOrder = async (delivery: Delivery): Promise<OrderResult> => {
    const lines = Cart.cartItems(state.cart);
    if (!lines.length) return { ok: false, reason: 'emptyCart' };

    const totalRub = Cart.cartTotalRub(state.cart);
    const totalPoints = Cart.cartTotalPoints(state.cart);
    const inPoints = Cart.cartCurrency(state.cart) === 'points';

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
      status: inPoints ? 'paid' : 'awaitingPayment',
    };

    // Anything digital in the basket is granted here too, so a mixed order
    // does not leave a frame unpaid-for in the cart.
    const grantedIds = lines.filter(({ item }) => !needsDelivery(item)).map(({ item }) => item.id);

    commit({
      owned: [...new Set([...state.owned, ...grantedIds])],
      spentPoints: state.spentPoints + (inPoints ? totalPoints : 0),
      cart: [],
      orders: [order, ...state.orders],
    });
    return { ok: true, order };
  };

  const value = useMemo(
    () => ({
      ready,
      balance,
      medals,
      owned: state.owned,
      cart: state.cart,
      orders: state.orders,
      ownsItem,
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
