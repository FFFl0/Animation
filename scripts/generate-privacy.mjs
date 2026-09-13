// Regenerates PRIVACY.md from the policy the app itself shows, so a store
// reviewer reading the file and a player reading the screen see the same text.
// Run: node scripts/generate-privacy.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The policy is TypeScript, so rather than compiling it, pull the two
 * section arrays out of the source. They are plain data by design. */
export function renderPrivacyMarkdown() {
  const source = readFileSync(join(root, 'src/legal/privacyPolicy.ts'), 'utf8');
  const updated = source.match(/POLICY_UPDATED = '([\d-]+)'/)[1];

  const parse = (name) => {
    const start = source.indexOf(`const ${name}: PolicySection[] = [`);
    const end = source.indexOf('\n];', start);
    const block = source.slice(start, end);
    return [...block.matchAll(/title: '((?:[^'\\]|\\.)*)',\s*body: \[([\s\S]*?)\],\s*\}/g)].map((m) => ({
      title: unescape(m[1]),
      body: [...m[2].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map((b) => unescape(b[1] ?? b[2])),
    }));
  };
  const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  const render = (heading, sections) =>
    [`## ${heading}`, '', ...sections.flatMap((s) => [`### ${s.title}`, '', ...s.body.flatMap((p) => [p, ''])])];

  return [
    '# Политика конфиденциальности AnimeQuiz',
    '',
    '<!-- Этот файл генерируется из src/legal/privacyPolicy.ts.',
    '     Правьте там и запускайте node scripts/generate-privacy.mjs. -->',
    '',
    `Обновлено: ${updated}`,
    '',
    ...render('Русский', parse('RU')),
    '---',
    '',
    ...render('English', parse('EN')),
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(root, 'PRIVACY.md'), renderPrivacyMarkdown());
  console.log('PRIVACY.md written');
}
