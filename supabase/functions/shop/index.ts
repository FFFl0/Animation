// Supabase Edge Function: the wallet and the shop.
//
// Everything that costs something happens here, with the service role. The
// client says "I want to buy this item with points" and never says what the
// item costs or what its balance is — both are read on this side.
//
// PRICES below mirrors src/shop/catalogue.ts, which is the readable source
// of truth for the catalogue. They are kept in step by a test
// (src/shop/__tests__/cataloguePriceParity.test.ts) that reads this file, so
// adding an item there and forgetting it here fails the build rather than
// silently selling something for nothing.
//
// Deploy with: supabase functions deploy shop

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------- catalogue

type Price = {
  rub: number;
  /** Set for a consumable: which one, and how many the item grants. */
  consumable?: string;
  amount?: number;
  /** Physical goods go through an order, never a straight buy. */
  physical?: boolean;
};

// PRICES-BEGIN
const PRICES: Record<string, Price> = {
  'avatar-sakura': { rub: 250 },
  'avatar-shadow': { rub: 300 },
  'avatar-frost': { rub: 300 },
  'avatar-ember': { rub: 250 },
  'avatar-mint': { rub: 250 },
  'avatar-violet': { rub: 300 },
  'avatar-sunny': { rub: 250 },
  'avatar-neko': { rub: 200 },
  'frame-aurora': { rub: 149 },
  'frame-petals': { rub: 199 },
  'frame-ember': { rub: 149 },
  'frame-circuit': { rub: 179 },
  'frame-champion': { rub: 300 },
  'frame-eternal': { rub: 400 },
  'item-hint-1': { rub: 49, consumable: 'hint5050', amount: 1 },
  'item-hint-5': { rub: 199, consumable: 'hint5050', amount: 5 },
  'item-skip-3': { rub: 129, consumable: 'skipQuestion', amount: 3 },
  'item-freeze': { rub: 99, consumable: 'streakFreeze', amount: 1 },
  'merch-tee': { rub: 1990, physical: true },
  'merch-hoodie': { rub: 4490, physical: true },
  'merch-mug': { rub: 890, physical: true },
  'merch-poster': { rub: 690, physical: true },
  'merch-stickers': { rub: 390, physical: true },
  'merch-figure': { rub: 3290, physical: true },
};
// PRICES-END

/** A point stands for a rouble of the same value — see src/shop/economy.ts. */
function pointsPrice(rub: number): number {
  return rub;
}

const MAX_PER_LINE = 9;

/**
 * Selling digital goods for money inside an app distributed through Google
 * Play has to go through Play Billing — an alternative payment method for
 * them is grounds for removal, whether it replaces the store's or sits
 * beside it. Physical goods are the opposite: the store's billing is
 * forbidden and an acquirer is required.
 *
 * So merch goes through ЮKassa and cosmetics do not. Flip this only if the
 * app stops being distributed through a store that has such a rule — a
 * direct APK or a channel whose terms allow it.
 */
const DIGITAL_RUB_ENABLED = false;

// ---------------------------------------------------------------- ЮKassa

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';

function yookassaAuth(): string | null {
  const shop = Deno.env.get('YOOKASSA_SHOP_ID');
  const secret = Deno.env.get('YOOKASSA_SECRET_KEY');
  if (!shop || !secret) return null;
  return `Basic ${btoa(`${shop}:${secret}`)}`;
}

/** Roubles as ЮKassa wants them: a string with two decimal places. */
function amountValue(rub: number): string {
  return `${rub}.00`;
}

type PaymentCreated = { id: string; confirmationUrl: string };

/**
 * Creates a payment and hands back the page to send the buyer to. The
 * order id doubles as the idempotence key, so a retried request cannot
 * charge somebody twice for one basket.
 */
async function createPayment(
  orderId: string,
  rub: number,
  description: string,
  returnUrl: string,
  phone: string | null
): Promise<PaymentCreated | null> {
  const auth = yookassaAuth();
  if (!auth) return null;

  const body: Record<string, unknown> = {
    amount: { value: amountValue(rub), currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: returnUrl },
    description,
    metadata: { order_id: orderId },
  };

  // Receipts are a legal requirement for selling to individuals, but they
  // only go through once a receipt solution is connected on the ЮKassa
  // side and the VAT code matches the tax regime — so this is opt-in
  // rather than a guess that breaks every payment. See BUILD.md.
  if (Deno.env.get('YOOKASSA_RECEIPTS') === '1' && phone) {
    body.receipt = {
      customer: { phone },
      items: [
        {
          description: description.slice(0, 128),
          quantity: '1.00',
          amount: { value: amountValue(rub), currency: 'RUB' },
          vat_code: Number(Deno.env.get('YOOKASSA_VAT_CODE') ?? 1),
          payment_mode: 'full_payment',
          payment_subject: 'commodity',
        },
      ],
    };
  }

  const response = await fetch(YOOKASSA_API, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Idempotence-Key': orderId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return null;
  const payment = await response.json();
  const url = payment?.confirmation?.confirmation_url;
  return url ? { id: String(payment.id), confirmationUrl: String(url) } : null;
}

// ---------------------------------------------------------------- state

async function readState(admin: SupabaseClient, userId: string) {
  const [{ data: medals }, { data: purchases }, { data: inventory }, { data: orders }] = await Promise.all([
    admin.from('tournament_medals').select('medal, place, points').eq('user_id', userId),
    admin.from('shop_purchases').select('item_id').eq('user_id', userId),
    admin.from('shop_inventory').select('consumable, count').eq('user_id', userId),
    admin
      .from('shop_orders')
      .select('id, lines, total_rub, total_points, paid_with, delivery, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const rows = (medals ?? []) as { medal: string | null; place: number; points: number }[];
  const record = {
    runs: rows.length,
    gold: rows.filter((r) => r.medal === 'gold').length,
    silver: rows.filter((r) => r.medal === 'silver').length,
    bronze: rows.filter((r) => r.medal === 'bronze').length,
    bestPlace: rows.length ? Math.min(...rows.map((r) => r.place)) : 0,
  };

  const earned = rows.reduce((sum, r) => sum + r.points, 0);
  const { data: balance } = await admin.rpc('shop_balance', { p_user: userId });

  const counts: Record<string, number> = {};
  for (const row of (inventory ?? []) as { consumable: string; count: number }[]) {
    counts[row.consumable] = row.count;
  }

  return {
    medals: record,
    earnedPoints: earned,
    balance: (balance as number) ?? 0,
    owned: [...new Set(((purchases ?? []) as { item_id: string }[]).map((p) => p.item_id))],
    counts,
    orders: ((orders ?? []) as Record<string, unknown>[]).map((o) => ({
      id: o.id,
      createdAt: o.created_at,
      lines: o.lines,
      totalRub: o.total_rub,
      totalPoints: o.total_points,
      paidWith: o.paid_with,
      delivery: o.delivery,
      status: o.status,
    })),
  };
}

// ---------------------------------------------------------------- handler

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  // The caller is whoever the bearer token says, never whoever the body says.
  const { data: userData } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'not signed in' }, 401);

  let payload: {
    action?: string;
    itemId?: string;
    currency?: string;
    consumable?: string;
    lines?: { itemId: string; quantity: number; size?: string }[];
    delivery?: Record<string, unknown>;
    /** Where ЮKassa sends the buyer back to once the page is done. */
    returnUrl?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid request body' }, 400);
  }

  if (payload.action === 'state') {
    return json(await readState(admin, user.id));
  }

  if (payload.action === 'buy') {
    const price = payload.itemId ? PRICES[payload.itemId] : undefined;
    if (!price) return json({ error: 'unknown item' }, 400);
    if (price.physical) return json({ error: 'needsDelivery' }, 400);

    const currency = payload.currency === 'points' ? 'points' : 'rub';
    if (currency === 'rub' && !DIGITAL_RUB_ENABLED) return json({ error: 'digitalRubDisabled' }, 409);

    // A one-off item cannot be bought twice; a consumable stacks.
    if (!price.consumable) {
      const { data: already } = await admin
        .from('shop_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', payload.itemId!)
        .limit(1);
      if (already?.length) return json({ error: 'owned' }, 409);
    }

    const { error } = await admin.rpc('shop_buy', {
      p_user: user.id,
      p_item: payload.itemId,
      p_points: pointsPrice(price.rub),
      p_rub: price.rub,
      p_paid: currency,
      p_consumable: price.consumable ?? null,
      p_amount: price.amount ?? 0,
    });
    if (error) {
      return json({ error: error.message.includes('not enough points') ? 'notEnoughPoints' : 'buyFailed' }, 409);
    }
    return json(await readState(admin, user.id));
  }

  if (payload.action === 'order') {
    const lines = payload.lines ?? [];
    if (!lines.length) return json({ error: 'emptyCart' }, 400);

    let totalRub = 0;
    for (const line of lines) {
      const price = PRICES[line.itemId];
      if (!price) return json({ error: 'unknown item' }, 400);
      const quantity = Math.max(1, Math.min(MAX_PER_LINE, Math.floor(line.quantity)));
      totalRub += price.rub * quantity;
    }

    const currency = payload.currency === 'points' ? 'points' : 'rub';
    if (currency === 'rub' && !yookassaAuth()) return json({ error: 'paymentUnavailable' }, 409);

    const { data: orderId, error } = await admin.rpc('shop_place_order', {
      p_user: user.id,
      p_lines: lines,
      p_delivery: payload.delivery ?? {},
      p_points: pointsPrice(totalRub),
      p_rub: totalRub,
      p_paid: currency,
    });
    if (error) {
      return json({ error: error.message.includes('not enough points') ? 'notEnoughPoints' : 'orderFailed' }, 409);
    }

    // Paid with points there is nothing to charge: the order is already
    // settled and the state below shows it.
    if (currency === 'points') return json(await readState(admin, user.id));

    const phone = typeof payload.delivery?.phone === 'string' ? payload.delivery.phone : null;
    const payment = await createPayment(
      String(orderId),
      totalRub,
      `AnimeQuiz — заказ №${String(orderId).slice(0, 8)}`,
      typeof payload.returnUrl === 'string' ? payload.returnUrl : 'https://example.com/',
      phone
    );

    if (!payment) {
      // The order stays in the list as unpaid rather than vanishing, so a
      // buyer whose payment never started can see what happened.
      return json({ ...(await readState(admin, user.id)), error: 'paymentFailed' }, 502);
    }

    await admin.from('shop_orders').update({ payment_id: payment.id }).eq('id', orderId);

    return json({
      ...(await readState(admin, user.id)),
      confirmation: { url: payment.confirmationUrl, orderId: String(orderId) },
    });
  }

  if (payload.action === 'spend') {
    if (!payload.consumable) return json({ error: 'unknown item' }, 400);
    const { data: spent } = await admin.rpc('shop_spend', {
      p_user: user.id,
      p_consumable: payload.consumable,
    });
    if (!spent) return json({ error: 'nothingLeft' }, 409);
    return json(await readState(admin, user.id));
  }

  return json({ error: 'unknown action' }, 400);
});
