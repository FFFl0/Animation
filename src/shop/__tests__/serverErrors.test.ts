import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';

/**
 * Every refusal the shop function can answer with has to be sayable in
 * both languages.
 *
 * This matters more than it looks. A missing translation does not throw —
 * the translator hands back the path it was given — so the screen shows
 * the buyer "shop.buyError.receiptRejected" and nobody notices until it
 * happens on a real payment.
 */
const SOURCE = readFileSync(join(__dirname, '../../../supabase/functions/shop/index.ts'), 'utf8');

/** Every string the function puts in an `error` field, ternaries included. */
function serverErrorCodes(): string[] {
  const codes = new Set<string>();
  for (const [, body] of SOURCE.matchAll(/error:\s*([^,}\n]+(?:\n[^,}]+)*)/g)) {
    for (const [, code] of body.matchAll(/'([A-Za-z][A-Za-z ]*)'/g)) codes.add(code);
  }
  // `error: error.message...` and the like are not codes; only the literals
  // above are, and this keeps the list honest if one is ever added.
  return [...codes].sort();
}

describe('every refusal the server can give', () => {
  const codes = serverErrorCodes();

  it('finds the codes at all', () => {
    expect(codes.length).toBeGreaterThan(10);
    // A spot check, so a regex that silently stops matching is caught.
    expect(codes).toContain('notEnoughPoints');
    expect(codes).toContain('receiptRejected');
    expect(codes).toContain('storeBillingUnavailable');
  });

  it('is spelled in camelCase, so it can be a translation key', () => {
    for (const code of codes) {
      expect(code).toMatch(/^[a-z][A-Za-z]*$/);
    }
  });

  /** Only the cart can produce these; a single item has no cart to be empty. */
  const CART_ONLY = ['emptyCart', 'orderFailed'];

  for (const language of ['ru', 'en'] as const) {
    it(`says all of them in ${language}`, () => {
      const t = getT(language);
      for (const code of codes) {
        // A missing key comes back as the path itself, which is what the
        // buyer would end up reading.
        expect(t(`shop.orderError.${code}`)).not.toContain('shop.orderError');
        if (CART_ONLY.includes(code)) continue;
        expect(t(`shop.buyError.${code}`)).not.toContain('shop.buyError');
      }
    });
  }

  it('keeps the cart-only list honest', () => {
    // If one of these stops being cart-only, the exemption above is hiding
    // a missing translation rather than describing the code.
    for (const code of CART_ONLY) {
      expect(codes).toContain(code);
    }
  });

  it('also says the ones only the app can decide', () => {
    for (const language of ['ru', 'en'] as const) {
      const t = getT(language);
      for (const code of ['network', 'cancelled', 'paymentPending', 'paymentFailed']) {
        expect(t(`shop.buyError.${code}`)).not.toContain('shop.buyError');
      }
    }
  });
});
