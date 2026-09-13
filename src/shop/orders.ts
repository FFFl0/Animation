import { ApparelSize } from './catalogue';

/** Where a parcel goes. Kept on the device until there is a server to take it. */
export type Delivery = {
  name: string;
  phone: string;
  city: string;
  address: string;
  comment?: string;
};

export type OrderLine = {
  itemId: string;
  quantity: number;
  size?: ApparelSize;
};

export type OrderStatus = 'awaitingPayment' | 'paid' | 'shipped';

export type Order = {
  id: string;
  createdAt: string;
  lines: OrderLine[];
  /** Whole roubles, 0 for an order paid with medals. */
  totalRub: number;
  /** Medal points, 0 for an order paid with money. */
  totalPoints: number;
  delivery: Delivery;
  status: OrderStatus;
};

export function newOrderId(): string {
  return `o_${Date.now().toString(36)}_${Math.round(Math.random() * 1e6).toString(36)}`;
}

/** Everything a courier needs before an order can be placed. */
export function deliveryProblems(delivery: Delivery): (keyof Delivery)[] {
  const problems: (keyof Delivery)[] = [];
  if (delivery.name.trim().length < 2) problems.push('name');
  // Ten digits after stripping the punctuation people type into phone fields.
  if (delivery.phone.replace(/\D/g, '').length < 10) problems.push('phone');
  if (delivery.city.trim().length < 2) problems.push('city');
  if (delivery.address.trim().length < 5) problems.push('address');
  return problems;
}
