/**
 * Draws the shop's placeholder artwork.
 *
 * These are stand-ins until real photographs exist (assets/shop/README.md),
 * and they used to be loose binaries nobody could regenerate. That is how
 * the backdrop ended up an ellipse: a circle sized as a fraction of a 4:3
 * canvas in both axes comes out squashed, and once it is baked into a JPEG
 * there is nothing the app can do about it — the cart showed the squash
 * faithfully.
 *
 * So the pictures are generated instead of drawn by hand. The backdrop is
 * a circle because its radius is one number, not two.
 *
 *   node scripts/generate-shop-art.mjs
 *
 * Needs Playwright's Chromium, which renders the SVG and saves the JPEG.
 * It is pulled in through createRequire because Playwright lives outside
 * this project, where a bare ESM import cannot reach it.
 * Nothing in the app depends on this script at runtime.
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets', 'shop');

/** 4:3, as the README requires: the shop and the cart both lay out to it. */
const W = 480;
const H = 360;

const CREAM = '#FDF6F3';
const PINK = '#F06292';
const PALE = '#FADDE1';
const WHITE = '#FFFDFD';

/** The backdrop: one radius, so it cannot come out as an ellipse again. */
const DISC = `<circle cx="${W / 2}" cy="${H / 2}" r="${H * 0.42}" fill="${PALE}" />`;

const GLYPHS = {
  'merch-tee': `
    <path d="M190 96 h100 a46 46 0 0 0 0 0 l56 26 -18 50 -30 -12 v102 a12 12 0 0 1 -12 12 h-92
             a12 12 0 0 1 -12 -12 v-102 l-30 12 -18 -50 z" fill="${PINK}"/>
    <path d="M212 96 h56 a28 20 0 0 1 -56 0 z" fill="${WHITE}"/>`,

  'merch-hoodie': `
    <path d="M186 110 l-54 26 20 52 32 -13 v96 a12 12 0 0 0 12 12 h88 a12 12 0 0 0 12 -12 v-96
             l32 13 20 -52 -54 -26 z" fill="${PINK}"/>
    <!-- the hood sits ON the shoulders: its flat base is below the neckline,
         so it reads as part of the garment rather than hovering over it -->
    <path d="M198 132 a42 44 0 0 1 84 0 z" fill="${WHITE}"/>
    <rect x="212" y="214" width="56" height="34" rx="8" fill="${WHITE}" opacity="0.55"/>
    <path d="M230 134 v30 M250 134 v30" stroke="${WHITE}" stroke-width="7" stroke-linecap="round"/>`,

  'merch-mug': `
    <rect x="148" y="96" width="132" height="168" rx="14" fill="${PINK}"/>
    <rect x="158" y="118" width="112" height="136" rx="8" fill="${WHITE}"/>
    <path d="M296 136 a52 52 0 0 1 0 88" stroke="${PINK}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M178 160 h72 M190 160 v46 M238 160 v46 M184 178 h60" stroke="${PINK}" stroke-width="11"/>`,

  'merch-poster': `
    <rect x="156" y="84" width="168" height="196" rx="10" fill="${WHITE}"/>
    <rect x="156" y="84" width="168" height="196" rx="10" fill="none" stroke="${PINK}" stroke-width="10"/>
    <circle cx="214" cy="140" r="22" fill="${PINK}"/>
    <path d="M170 248 l50 -62 34 40 26 -28 44 50 z" fill="${PINK}"/>`,

  'merch-stickers': `
    <g fill="${WHITE}" stroke="${PINK}" stroke-width="9">
      <rect x="150" y="104" width="68" height="68" rx="14" transform="rotate(-9 184 138)"/>
      <rect x="248" y="96" width="68" height="68" rx="14" transform="rotate(8 282 130)"/>
      <rect x="166" y="196" width="68" height="68" rx="14" transform="rotate(6 200 230)"/>
      <rect x="258" y="188" width="68" height="68" rx="14" transform="rotate(-7 292 222)"/>
    </g>
    <g fill="${PINK}">
      <circle cx="184" cy="136" r="13"/>
      <path d="M282 112 l10 22 -20 0 z"/>
      <circle cx="200" cy="228" r="13"/>
      <rect x="280" y="208" width="26" height="26" rx="6"/>
    </g>`,

  'merch-figure': `
    <ellipse cx="240" cy="272" rx="72" ry="14" fill="${PINK}" opacity="0.28"/>
    <rect x="178" y="252" width="124" height="20" rx="9" fill="${PINK}"/>
    <!-- a dress rather than a box: wider at the hem, so the silhouette
         reads as a figurine and not as a plinth with a head on it -->
    <path d="M216 176 h48 l22 76 h-92 z" fill="${PINK}"/>
    <circle cx="240" cy="130" r="42" fill="${WHITE}"/>
    <!-- the hair is the top half of the same circle, so it sits on the head
         instead of floating above it as a crescent -->
    <path d="M198 130 a42 42 0 0 1 84 0 z" fill="${PINK}"/>
    <path d="M198 130 v26 a10 10 0 0 0 20 0 v-26 z" fill="${PINK}"/>
    <path d="M262 130 v26 a10 10 0 0 0 20 0 v-26 z" fill="${PINK}"/>
    <circle cx="226" cy="146" r="6" fill="${PINK}"/>
    <circle cx="254" cy="146" r="6" fill="${PINK}"/>
    <path d="M232 160 a10 8 0 0 0 16 0" stroke="${PINK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
};

function page(glyph) {
  return `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:${CREAM}}svg{display:block}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  ${DISC}
  ${glyph}
</svg>`;
}

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

await mkdir(OUT, { recursive: true });
for (const [id, glyph] of Object.entries(GLYPHS)) {
  await tab.setContent(page(glyph));
  const jpeg = await tab.screenshot({ type: 'jpeg', quality: 88 });
  const file = join(OUT, `${id}.jpg`);
  await writeFile(file, jpeg);
  console.log(`${id}.jpg  ${W}x${H}  ${(jpeg.length / 1024).toFixed(1)} KB`);
}

await browser.close();
