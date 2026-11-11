/**
 * Looks at the app the way a phone does, before a build is made.
 *
 * Three layout bugs in a row were found the slow way: a build, an install,
 * a screenshot from a phone, and only then a fix made blind. Tab labels
 * cut in half, names broken mid-word with a single letter on the next
 * line, a strip squeezed until it cropped itself. None of them is visible
 * to a type checker or a unit test, and all of them are visible in a
 * browser that is 360 points wide.
 *
 * So this exports the web build, walks it at phone widths, and does two
 * things on every screen: saves a screenshot for a person to look at, and
 * asks the page itself the questions those bugs would have answered "yes"
 * to —
 *
 *   - is any word broken across two lines?
 *   - is any text cut off, top or bottom, by a box that does not scroll?
 *   - does any text run off the side of the screen?
 *   - does the page itself scroll sideways?
 *
 *   node scripts/check-layout.mjs            build, walk, report
 *   node scripts/check-layout.mjs --dist D   walk an export that is already built
 *
 * Screenshots and report.json land in layout-shots/. The exit code is 1
 * when anything was found, so it can gate a build.
 *
 * What it cannot see, said plainly: it runs with no server, as a local
 * account, so the screens that need one — the tournament bracket, chats,
 * leaderboards — show their offline state and are not really checked. And
 * a browser is not Android: fonts are measured a little differently, so
 * this catches what is wrong by a margin, not by a pixel.
 *
 * Needs Playwright with Chromium (`npm i -D playwright && npx playwright
 * install chromium` on a machine that does not have it).
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const OUT = flag('--out') ?? join(ROOT, 'layout-shots');
/** The narrow one is where things break; the wide one is where most phones are. */
const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 412, height: 915 },
];

// ------------------------------------------------------------------ build

function build() {
  const given = flag('--dist');
  if (given) return given;
  const dist = mkdtempSync(join(tmpdir(), 'animequiz-web-'));
  console.log('Exporting the web build…');
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', dist], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
    // No server on purpose: the walk signs up a local account, and a
    // configured backend would send it looking for one that is not there.
    env: { ...process.env, EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_ANON_KEY: '', EXPO_PUBLIC_LAYOUT_CHECK: '1' },
  });
  if (result.status !== 0) {
    console.error('The web export failed.');
    process.exit(2);
  }
  return dist;
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
};

function serve(root) {
  const server = createServer((req, res) => {
    let file = join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() }))
  );
}

// ------------------------------------------------------------------ audit

/**
 * Runs inside the page. Returns what looks wrong, as plain data.
 *
 * Every check is about text, because text is what broke each time: boxes
 * were the right size and the words in them were not.
 */
function audit() {
  const findings = [];
  const seen = new Set();
  const add = (kind, text, detail) => {
    const key = `${kind}|${text}|${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ kind, text, detail });
  };

  const viewport = window.innerWidth;
  if (document.scrollingElement.scrollWidth > viewport + 1) {
    add('pageScrollsSideways', '', `${document.scrollingElement.scrollWidth}px of page in a ${viewport}px window`);
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) continue;
    const element = node.parentElement;
    if (!element) continue;

    // Nothing that is not actually on show: a screen mid-fade, a closed
    // sheet, a measuring copy.
    let shown = true;
    for (let a = element; a && a !== document.body; a = a.parentElement) {
      const style = getComputedStyle(a);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) {
        shown = false;
        break;
      }
    }
    if (!shown) continue;

    const whole = document.createRange();
    whole.selectNodeContents(node);
    const rects = [...whole.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const label = raw.trim().replace(/\s+/g, ' ').slice(0, 60);

    // 1. A word on two lines. Split on spaces and on the places a word may
    //    properly break, so "смешанный-квиз" wrapping at its hyphen is not
    //    mistaken for one.
    const words = /[^\s\-–—/·•]+/g;
    for (let match = words.exec(raw); match; match = words.exec(raw)) {
      if (match[0].length < 2) continue;
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
      if (lines.size > 1) add('wordBrokenAcrossLines', label, `"${match[0]}"`);
    }

    // 2 and 3. Cut off by a box. Walk outwards: a box that scrolls is
    //    allowed to hide what is in it — that is what scrolling is — so the
    //    search stops there. A box that merely hides is the suspect.
    let scrollsX = false;
    let checkedY = false;
    for (let a = element.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const style = getComputedStyle(a);
      const box = a.getBoundingClientRect();
      if (!checkedY) {
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          checkedY = true;
        } else if (style.overflowY === 'hidden' || style.overflowY === 'clip') {
          const over = Math.max(bottom - box.bottom, box.top - top);
          if (over > 2 && box.height > 0) add('textCutOff', label, `${Math.round(over)}px hidden by a ${Math.round(box.height)}px box`);
          checkedY = true;
        }
      }
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') scrollsX = true;
    }
    if (!scrollsX && (right > viewport + 1 || left < -1)) {
      add('textOffScreen', label, `${Math.round(Math.max(right - viewport, -left))}px past the edge`);
    }
  }

  return findings;
}

// ------------------------------------------------------------------ walk

/**
 * The route through the app. Each step gets to a screen and names it; the
 * check and the screenshot happen after every one.
 *
 * A step that cannot find what it wants to tap is reported and skipped
 * rather than ending the run: one renamed button should cost one screen,
 * not all the screens after it.
 */
const STEPS = [
  ['welcome', async () => {}],
  ['sign-up', async (h) => {
    await h.tap('Начать');
    await h.tap('Регистрация');
    const inputs = h.page.locator('input');
    await inputs.nth(0).fill(`layout${Date.now() % 100000}`);
    await inputs.nth(1).fill('Passw0rd!x');
    await inputs.nth(2).fill('Passw0rd!x');
  }],
  ['tour', async (h) => {
    await h.tap('Создать аккаунт', 'last');
    await h.settle(1200);
  }],
  ['home', async (h) => h.tap('Пропустить')],
  ['home-lower', async (h) => h.scrollDown()],
  ['category', async (h) => {
    await h.scrollTop();
    await h.tap('Персонажи');
  }],
  ['quiz-question', async (h) => h.tap('Новичок', 'first')],
  ['quiz-answered', async (h) => h.tapFirstOption()],
  ['quiz-report', async (h) => h.tap('Ошибка в вопросе?')],
  ['stats', async (h) => {
    await h.tap('Отмена');
    await h.leaveQuiz();
    // Out of the quiz lands on the category it was started from, which has
    // no tab bar; one step further back does.
    await h.tapIfThere('Назад');
    await h.tap('Статистика', 'last');
  }],
  ['shop', async (h) => h.tap('Магазин', 'last')],
  ['shop-lower', async (h) => h.scrollDown()],
  ['shop-frames', async (h) => {
    await h.scrollTop();
    await h.tap('Рамки', 'first');
  }],
  ['shop-items', async (h) => h.tap('Игровые предметы', 'first')],
  ['shop-merch', async (h) => h.tap('Мерч в реале', 'first')],
  ['item-page', async (h) => h.tap('Футболка AnimeQuiz', 'first')],
  ['cart', async (h) => h.tap('В корзину')],
  ['profile', async (h) => {
    await h.tap('Назад', 'first');
    await h.tap('Назад', 'first');
    await h.tap('Профиль', 'last');
  }],
  ['profile-lower', async (h) => h.scrollDown()],
  ['profile-notifications', async (h) => h.scrollDown()],
  ['chats', async (h) => h.tap('Чаты', 'last')],
];

function helpers(page, problems) {
  const h = {
    page,
    settle: (ms = 900) => page.waitForTimeout(ms),
    async tap(text, which = 'last') {
      const found = page.getByText(text, { exact: false });
      const count = await found.count();
      if (!count) {
        problems.push(`could not find "${text}" to tap`);
        return;
      }
      await (which === 'first' ? found.first() : found.last()).click({ timeout: 4000 }).catch(() => {
        problems.push(`"${text}" was there but could not be tapped`);
      });
      await h.settle();
    },
    /** For a step that may or may not be needed, where absence is not a problem. */
    async tapIfThere(text) {
      const found = page.getByText(text, { exact: false });
      if (await found.count()) {
        await found.first().click({ timeout: 3000 }).catch(() => {});
        await h.settle();
      }
    },
    /** Scrolls the tallest scrolling box on the page — the screen's own. */
    async scroll(to) {
      await page.evaluate((target) => {
        const boxes = [...document.querySelectorAll('*')].filter((el) => {
          const style = getComputedStyle(el);
          return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20;
        });
        const main = boxes.sort((a, b) => b.clientHeight - a.clientHeight)[0];
        if (main) main.scrollTop = target === 'top' ? 0 : main.scrollTop + main.clientHeight * 0.85;
      }, to);
      await h.settle(500);
    },
    scrollDown: () => h.scroll('down'),
    scrollTop: () => h.scroll('top'),
    /** Any answer will do: the point is what the screen looks like after one. */
    async tapFirstOption() {
      const options = page.locator('[data-testid^="answer-option"]');
      if (await options.count()) await options.first().click();
      else problems.push('no answer options found on the quiz screen');
      await h.settle(700);
    },
    async leaveQuiz() {
      const close = page.locator('[data-testid="quiz-close"]');
      if (await close.count()) await close.first().click();
      else problems.push('no way out of the quiz found');
      await h.settle();
      // Leaving mid-round may ask first.
      const confirm = page.getByText('Выйти', { exact: false });
      if (await confirm.count()) {
        await confirm.last().click().catch(() => {});
        await h.settle();
      }
    },
  };
  return h;
}

// ------------------------------------------------------------------ self-test

/**
 * A check that finds nothing is only worth something if it would have
 * found something. So before the app is looked at, the checks are run
 * against a page with each defect planted in it, and against a clean one —
 * and the run stops if they miss a plant or cry wolf.
 */
async function selfTest(browser) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const body = (inner) => `<!doctype html><meta charset="utf-8"><body style="margin:0;font:14px sans-serif">${inner}</body>`;

  await page.setContent(
    body(`
      <div style="width:46px;overflow-wrap:break-word">Лепестки</div>
      <div style="height:9px;overflow:hidden"><div style="font-size:20px;line-height:24px">Сетка</div></div>
      <div style="white-space:nowrap;width:700px">text that runs a long way past the right-hand edge of the screen</div>
    `)
  );
  const planted = new Set((await page.evaluate(audit)).map((f) => f.kind));
  const missed = ['wordBrokenAcrossLines', 'textCutOff', 'textOffScreen', 'pageScrollsSideways'].filter((k) => !planted.has(k));

  await page.setContent(
    body(`
      <div style="width:200px">Рамка чемпиона</div>
      <div style="height:300px;overflow-y:auto"><div style="height:900px">a long list inside a box that scrolls<br>and is allowed to hide its own tail</div></div>
      <div style="overflow-x:auto;white-space:nowrap"><span>a strip of tabs that scrolls sideways and may run off the edge by design, as strips do</span></div>
    `)
  );
  const falseAlarms = await page.evaluate(audit);
  await page.close();

  if (missed.length || falseAlarms.length) {
    console.error('The layout checks failed their own test.');
    if (missed.length) console.error('  planted but not found:', missed.join(', '));
    for (const f of falseAlarms) console.error(`  false alarm: ${f.kind} "${f.text}" ${f.detail}`);
    process.exit(2);
  }
}

// ------------------------------------------------------------------ run

const dist = build();
const { url, close } = await serve(dist);
const browser = await chromium.launch();
await selfTest(browser);
const report = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'ru-RU' });
  const page = await context.newPage();
  const crashes = [];
  page.on('pageerror', (error) => crashes.push(String(error).split('\n')[0]));
  await page.goto(url);
  await page.waitForTimeout(3000);

  const dir = join(OUT, String(viewport.width));
  mkdirSync(dir, { recursive: true });
  const problems = [];
  const h = helpers(page, problems);

  for (const [index, [name, go]] of STEPS.entries()) {
    problems.length = 0;
    await go(h).catch((error) => problems.push(String(error).split('\n')[0]));
    await h.settle(600);
    const findings = await page.evaluate(audit);
    const shot = join(dir, `${String(index + 1).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: shot });
    report.push({ width: viewport.width, screen: name, shot, findings, walk: [...problems], crashes: crashes.splice(0) });
  }
  await context.close();
}

await browser.close();
close();

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

let bad = 0;
for (const entry of report) {
  const lines = [
    ...entry.findings.map((f) => `    ${f.kind}: ${f.text ? `"${f.text}" — ` : ''}${f.detail}`),
    ...entry.walk.map((w) => `    walk: ${w}`),
    ...entry.crashes.map((c) => `    crash: ${c}`),
  ];
  if (!lines.length) continue;
  bad += lines.length;
  console.log(`\n${entry.width}px · ${entry.screen}`);
  for (const line of lines) console.log(line);
}

console.log(`\n${report.length} screens looked at, ${bad} thing(s) to check. Screenshots: ${OUT}`);
process.exit(bad ? 1 : 0);
