// Supabase Edge Function: what ЮKassa tells us about a payment.
//
// This endpoint is public — ЮKassa has no Supabase token to send — so the
// body it posts is treated as a rumour, not as fact. All it is used for is
// the payment id; the real status is then read back from the ЮKassa API
// with our own credentials. Anybody can post here, and the worst they can
// achieve is making us re-check a payment.
//
// Deploy with: supabase functions deploy yookassa-webhook --no-verify-jwt
// and point ЮKassa's notification URL at it (payment.succeeded and
// payment.canceled).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';

function auth(): string | null {
  const shop = Deno.env.get('YOOKASSA_SHOP_ID');
  const secret = Deno.env.get('YOOKASSA_SECRET_KEY');
  if (!shop || !secret) return null;
  return `Basic ${btoa(`${shop}:${secret}`)}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  let paymentId: string | null = null;
  try {
    const body = await req.json();
    const id = body?.object?.id;
    if (typeof id === 'string') paymentId = id;
  } catch {
    // fall through
  }
  // A body we cannot read is answered 200 all the same: retrying it would
  // not help either side, and a non-200 makes ЮKassa keep knocking.
  if (!paymentId) return new Response('ok');

  const header = auth();
  if (!header) return new Response('not configured', { status: 500 });

  const lookup = await fetch(`${YOOKASSA_API}/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: header },
  });
  // A lookup that failed is worth retrying, so this one does say so.
  if (!lookup.ok) return new Response('lookup failed', { status: 502 });

  const payment = await lookup.json();
  const status = String(payment?.status ?? '');
  const orderId = payment?.metadata?.order_id;
  if (typeof orderId !== 'string') return new Response('ok');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Only an order still waiting is touched, so a notification delivered
  // twice — which ЮKassa does on purpose — settles it once.
  if (status === 'succeeded') {
    await admin
      .from('shop_orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('payment_id', paymentId)
      .eq('status', 'awaitingPayment');
  } else if (status === 'canceled') {
    await admin
      .from('shop_orders')
      .update({ status: 'canceled' })
      .eq('id', orderId)
      .eq('payment_id', paymentId)
      .eq('status', 'awaitingPayment');
  }

  return new Response('ok');
});
