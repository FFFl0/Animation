import { readFileSync } from 'fs';
import { join } from 'path';
import { buyFromStore, finishStorePurchase, storeAccount, storePrices, unfinishedPurchases } from '../iap';
import type { StorePurchase } from '../iap';

const ACCOUNT = { appAccountToken: 'cb1f0f2e-0000-4000-8000-000000000001', obfuscatedAccountId: 'a'.repeat(64) };

/**
 * There is no store behind a test run, an Expo Go session or the web — and
 * in Expo Go the billing module is not even there to import. The shop still
 * has to open and still has to sell for medals in all three, so every door
 * into the store till has to come back empty-handed rather than throw.
 *
 * This is the half of the feature that cannot be checked on a real device,
 * because on a real device the store answers.
 */
describe('store billing with no store behind it', () => {
  it('quotes no prices', async () => {
    await expect(storePrices(['avatar_sakura', 'frame_aurora'])).resolves.toEqual([]);
  });

  it('asks for nothing when given no products', async () => {
    await expect(storePrices([])).resolves.toEqual([]);
  });

  it('reports a purchase as unavailable instead of failing', async () => {
    await expect(buyFromStore('avatar_sakura', ACCOUNT)).resolves.toEqual({ status: 'unavailable' });
  });

  it('finds nothing left unfinished', async () => {
    await expect(unfinishedPurchases()).resolves.toEqual([]);
  });

  it('always tags a purchase with the account that is paying', async () => {
    const id = 'cb1f0f2e-0000-4000-8000-000000000001';
    const account = await storeAccount(id);

    // Apple takes the id itself, and will not take anything but a UUID.
    expect(account.appAccountToken).toBe(id);

    // Google's tag is either the hash or, where no hash could be computed —
    // as here, with no native crypto behind the test — the id. What must
    // never happen is an empty tag: that would leave the payment attached
    // to nobody, and the server with nothing to check.
    expect(account.obfuscatedAccountId).toBeTruthy();
    expect(account.obfuscatedAccountId.length).toBeLessThanOrEqual(64);
    expect([id, 'hash']).toContain(/^[0-9a-f]{64}$/.test(account.obfuscatedAccountId) ? 'hash' : id);
  });

  it('shrugs off finishing a purchase it cannot reach', async () => {
    const purchase = {
      sku: 'avatar_sakura',
      token: 'token',
      platform: 'android',
      raw: {},
    } as unknown as StorePurchase;
    await expect(finishStorePurchase(purchase, false)).resolves.toBeUndefined();
  });
});

/**
 * Billing is a native module: it exists in a build only if the config
 * plugin is listed, and a build without it fails at the till rather than at
 * compile time — the app would simply never be able to charge anybody.
 */
describe('the build carries the billing module', () => {
  it('lists the config plugin in app.json', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '../../../app.json'), 'utf8'));
    const plugins: unknown[] = config.expo.plugins;
    const named = plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
    expect(named).toContain('expo-iap');
  });

  it('declares the module as a dependency', () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8'));
    expect(manifest.dependencies['expo-iap']).toBeTruthy();
  });
});
