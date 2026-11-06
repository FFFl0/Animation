// Checking a purchase with the store that took the money.
//
// The app sends a receipt; this asks Google or Apple whether it is real. The
// receipt itself is never the proof — a rooted phone can forge one, and the
// whole point of the exercise is that the item is granted on the store's
// word rather than the client's.
//
// Both stores want a signed JWT to let us ask, and neither accepts the
// other's shape, so there are two of nearly everything below: Google signs
// with a service account (RS256) and answers with plain JSON; Apple signs
// with an App Store Connect key (ES256) and answers with a signed blob.
//
// Nothing here is reachable without the secrets; with none set, every check
// answers 'notConfigured' and the app sells for medals only.

// ---------------------------------------------------------------- utilities

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlJson(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

/** The middle segment of a JWS, as an object. */
function decodeJwsPayload(jws: string): Record<string, unknown> | null {
  const middle = jws.split('.')[1];
  if (!middle) return null;
  try {
    const padded = middle.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * A PEM private key as bytes. Secrets are pasted by hand as often as not,
 * so a key whose newlines arrived as the two characters `\n` is accepted
 * too rather than failing with an unhelpful crypto error.
 */
function pemToBytes(pem: string): Uint8Array | null {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----[A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  if (!body) return null;
  try {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export type VerifyResult =
  | {
      ok: true;
      productId: string;
      storeOrderId: string | null;
      /**
       * The tag the app put on the purchase when it started, as the store
       * gives it back: who was buying. Null when the purchase carries none,
       * which happens for anything bought before this was added.
       */
      accountToken: string | null;
    }
  | { ok: false; reason: 'notConfigured' | 'notFound' | 'notPaid' | 'mismatch' | 'storeError' };

/** The same hash the app uses for Google's account tag. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Whether a receipt belongs to the account claiming it.
 *
 * A receipt the store hands back carries the tag the app set when the
 * purchase began, so this is what stops one person's payment being redeemed
 * on another person's account. A purchase with no tag at all is let through
 * — it cannot be checked, and refusing every one of them would break
 * anything bought before the tag existed — but it is the unique purchase
 * key in the database that keeps even those to one grant each.
 */
export async function accountMatches(accountToken: string | null, userId: string): Promise<boolean> {
  if (!accountToken) return true;
  if (accountToken === userId) return true;
  return accountToken === (await sha256Hex(userId));
}

// ---------------------------------------------------------------- Google

const PLAY_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

type ServiceAccount = { client_email: string; private_key: string };

function serviceAccount(): ServiceAccount | null {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    return parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    return null;
  }
}

export function androidPackage(): string {
  return Deno.env.get('ANDROID_PACKAGE_NAME') ?? 'com.animequiz.app';
}

/** One token lasts an hour; a warm function instance reuses it. */
let playToken: { value: string; expiresAt: number } | null = null;

async function playAccessToken(): Promise<string | null> {
  if (playToken && playToken.expiresAt > Date.now() + 60_000) return playToken.value;

  const account = serviceAccount();
  if (!account) return null;
  const keyBytes = pemToBytes(account.private_key);
  if (!keyBytes) return null;

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: account.client_email,
    scope: PLAY_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64urlJson({ alg: 'RS256', typ: 'JWT' })}.${base64urlJson(claims)}`;

  let signature: ArrayBuffer;
  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyBytes as unknown as ArrayBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  } catch {
    return null;
  }

  const assertion = `${unsigned}.${base64url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) return null;

  const body = await response.json();
  const value = body?.access_token;
  if (typeof value !== 'string') return null;
  playToken = { value, expiresAt: Date.now() + Math.max(0, Number(body.expires_in ?? 3600)) * 1000 };
  return value;
}

/**
 * Asks Google about one purchase.
 *
 * `purchaseState` 0 is a real purchase; 1 is cancelled or refunded and 2 is
 * pending — somebody who chose to pay in cash at a counter and has not
 * done it yet. Neither of the latter two earns an item, and 2 turns into 0
 * by itself if the money arrives, which the restore pass then picks up.
 */
export async function verifyPlayPurchase(productId: string, purchaseToken: string): Promise<VerifyResult> {
  const token = await playAccessToken();
  if (!token) return { ok: false, reason: 'notConfigured' };

  const url = `${PLAY_API}/${encodeURIComponent(androidPackage())}/purchases/products/${encodeURIComponent(
    productId
  )}/tokens/${encodeURIComponent(purchaseToken)}`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404 || response.status === 400) return { ok: false, reason: 'notFound' };
  if (!response.ok) return { ok: false, reason: 'storeError' };

  const purchase = await response.json();
  if (Number(purchase?.purchaseState) !== 0) return { ok: false, reason: 'notPaid' };

  return {
    ok: true,
    productId,
    storeOrderId: typeof purchase?.orderId === 'string' ? purchase.orderId : null,
    accountToken:
      typeof purchase?.obfuscatedExternalAccountId === 'string' ? purchase.obfuscatedExternalAccountId : null,
  };
}

/**
 * Tells Google we have handed the item over. Left undone, Google refunds
 * the purchase after three days, so this happens on our side as soon as the
 * item is granted rather than waiting on the app to come back.
 */
export async function acknowledgePlayPurchase(productId: string, purchaseToken: string): Promise<void> {
  const token = await playAccessToken();
  if (!token) return;
  const url = `${PLAY_API}/${encodeURIComponent(androidPackage())}/purchases/products/${encodeURIComponent(
    productId
  )}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    // An acknowledgement that did not go through is retried by the next
    // claim of the same purchase; failing the grant over it would be worse.
  }
}

// ---------------------------------------------------------------- Apple

const APPLE_PRODUCTION = 'https://api.storekit.itunes.apple.com/inApps/v1/transactions';
const APPLE_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions';

export function iosBundleId(): string {
  return Deno.env.get('IOS_BUNDLE_ID') ?? 'com.animequiz.app';
}

async function appleToken(): Promise<string | null> {
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID');
  const issuer = Deno.env.get('APPLE_IAP_ISSUER_ID');
  const pem = Deno.env.get('APPLE_IAP_PRIVATE_KEY');
  if (!keyId || !issuer || !pem) return null;
  const keyBytes = pemToBytes(pem);
  if (!keyBytes) return null;

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    `${base64urlJson({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.` +
    `${base64urlJson({
      iss: issuer,
      iat: now,
      exp: now + 1800,
      aud: 'appstoreconnect-v1',
      bid: iosBundleId(),
    })}`;

  try {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyBytes as unknown as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    // ECDSA here produces the raw r‖s pair, which is exactly what a JWS
    // wants — no DER unwrapping needed.
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
    return `${unsigned}.${base64url(new Uint8Array(signature))}`;
  } catch {
    return null;
  }
}

/**
 * Asks Apple about one transaction.
 *
 * The answer is a signed blob, and its signature is not checked here on
 * purpose: it came back over TLS from Apple's own endpoint, authenticated
 * with our key, so the transport is what is being trusted — not something
 * the phone handed us. A receipt posted straight by a client would need the
 * full certificate-chain check instead, which is why we never take one.
 *
 * TestFlight and the simulator live in the sandbox, which is a different
 * host, so a transaction missing from production is looked for there.
 */
export async function verifyAppleTransaction(transactionId: string): Promise<VerifyResult> {
  const token = await appleToken();
  if (!token) return { ok: false, reason: 'notConfigured' };

  const ask = (base: string) =>
    fetch(`${base}/${encodeURIComponent(transactionId)}`, { headers: { Authorization: `Bearer ${token}` } });

  let response = await ask(APPLE_PRODUCTION);
  if (response.status === 404) response = await ask(APPLE_SANDBOX);
  if (response.status === 404) return { ok: false, reason: 'notFound' };
  if (!response.ok) return { ok: false, reason: 'storeError' };

  const signed = (await response.json())?.signedTransactionInfo;
  if (typeof signed !== 'string') return { ok: false, reason: 'storeError' };
  const info = decodeJwsPayload(signed);
  if (!info) return { ok: false, reason: 'storeError' };

  if (info.bundleId !== iosBundleId()) return { ok: false, reason: 'mismatch' };
  // A refunded or family-revoked transaction keeps its id and loses its
  // entitlement; granting on it would be giving the item away for free.
  if (info.revocationDate) return { ok: false, reason: 'notPaid' };
  if (typeof info.productId !== 'string') return { ok: false, reason: 'storeError' };

  return {
    ok: true,
    productId: info.productId,
    storeOrderId: typeof info.originalTransactionId === 'string' ? info.originalTransactionId : null,
    accountToken: typeof info.appAccountToken === 'string' ? info.appAccountToken : null,
  };
}
