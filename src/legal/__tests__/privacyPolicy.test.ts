import { readFileSync } from 'fs';
import { join } from 'path';
import { POLICY_UPDATED, privacyPolicy } from '../privacyPolicy';

/**
 * PRIVACY.md is what a store reviewer reads and the screen is what a player
 * reads. They are generated from the same source, and this makes sure nobody
 * edited the policy without re-running scripts/generate-privacy.mjs.
 */
describe('privacy policy', () => {
  const markdown = readFileSync(join(__dirname, '../../../PRIVACY.md'), 'utf8');

  it('names the date it was last updated', () => {
    expect(POLICY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(markdown).toContain(POLICY_UPDATED);
  });

  it.each(['ru', 'en'] as const)('has every %s section in the published file', (lang) => {
    const sections = privacyPolicy(lang);
    expect(sections.length).toBeGreaterThan(5);
    for (const section of sections) {
      expect(markdown).toContain(section.title);
      for (const paragraph of section.body) {
        expect(markdown).toContain(paragraph);
      }
    }
  });

  it('says how to delete an account, which both app stores require', () => {
    for (const lang of ['ru', 'en'] as const) {
      const text = privacyPolicy(lang)
        .flatMap((s) => s.body)
        .join(' ')
        .toLowerCase();
      expect(text).toMatch(lang === 'ru' ? /удалить аккаунт/ : /delete the account/);
    }
  });
});
