import { STREAK_TIERS } from '../../data/streakTiers';
import { LINE, currentVariant, emWidth, lookFor, raysSvg, sceneGeometry, sceneIntensity, sceneLayout, sceneText, streakScene } from '../streakScene';
import { WIDGET_TEXT } from '../streakWidgetState';

const scene = (count: number, kind: 'done' | 'pending' | 'frozen' | 'start' = 'done', variant = 3) =>
  streakScene({ count, kind, width: 190, height: 88, variant });
const count = (svg: string, pattern: RegExp) => (svg.match(pattern) ?? []).length;

describe('the widget picture', () => {
  it('gets busier at every tier of the streak', () => {
    const sizes = STREAK_TIERS.filter((t) => t.minDays > 0).map((t) => scene(t.minDays).length);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
  });

  it('adds rays from a week, a crown from a month, a gem at a hundred and an orbit beyond', () => {
    const rays = (svg: string) => count(svg, /fill="#FFFFFF" fill-opacity="0\.13"/g);
    expect(rays(scene(6))).toBe(0);
    expect(rays(scene(7))).toBeGreaterThan(0);
    expect(scene(29)).not.toContain('#FFD54A');
    expect(scene(30)).toContain('#FFD54A');
    expect(scene(99)).not.toContain('fill="#60A5FA" stroke="#FFFFFF"');
    expect(scene(100)).toContain('fill="#60A5FA" stroke="#FFFFFF"');
    expect(scene(100)).not.toContain('stroke-opacity="0.55"');
    expect(scene(101)).toContain('stroke-opacity="0.55"');
  });

  it('shows a sprout until there is a streak, and when it is lost', () => {
    expect(lookFor(0, 'start').tier).toBe('seed');
    expect(lookFor(45, 'start').tier).toBe('seed');
    expect(scene(0, 'start')).toContain('#84A86B');
  });

  it('wakes the flame only when today is played', () => {
    // the open happy eyes, and embers rising
    expect(scene(9, 'done')).toContain('rx="3.6" ry="5"');
    expect(scene(9, 'pending')).not.toContain('rx="3.6" ry="5"');
    expect(scene(9, 'pending')).toContain('opacity="0.78"');
  });

  it('ices the flame over while a freeze holds the streak', () => {
    const svg = scene(45, 'frozen');
    expect(svg).toContain('#3B82F6');
    expect(svg).not.toContain('#FFD54A'); // no crown on a frozen flame
  });

  it('moves the sparkles between variants and stays put within one', () => {
    expect(scene(45, 'done', 1)).not.toBe(scene(45, 'done', 2));
    expect(scene(45, 'done', 1)).toBe(scene(45, 'done', 1));
    expect(currentVariant(0)).toBe(0);
    expect(currentVariant(1_800_000 * 5 + 10)).toBe(5);
  });

  it('uses only what AndroidSVG draws, and resolves every reference', () => {
    for (const tier of STREAK_TIERS) {
      for (const kind of ['done', 'pending', 'frozen', 'start'] as const) {
        const svg = scene(tier.minDays, kind);
        expect(svg).not.toMatch(/<filter|<text|<style|style=/);
        expect(svg).not.toContain('${');
        const ids = new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
        for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids.has(ref)).toBe(true);
      }
    }
  });
});

describe('the widget layout', () => {
  it('puts the flame on the right of a 2×1 widget and on top of a square one', () => {
    const wide = sceneLayout(190, 88);
    expect(wide.shape).toBe('wide');
    expect(wide.emblem.x + wide.emblem.size).toBeLessThanOrEqual(190);
    expect(sceneLayout(170, 170).shape).toBe('tall');
  });

  // The sizes from the phone in the bug report: a 2×1 widget and the same
  // widget stretched, in dp.
  const SIZES: [number, number][] = [
    [168, 81],
    [263, 185],
    [110, 40],
    [190, 88],
    [250, 110],
    [320, 120],
    [400, 240],
    [180, 170],
  ];
  const KINDS = ['done', 'pending', 'frozen', 'start'] as const;
  const LANGS = ['ru', 'en'] as const;

  it('fits every line, in height and in width, at every size, state and language', () => {
    for (const [W, H] of SIZES) {
      for (const kind of KINDS) {
        for (const lang of LANGS) {
          for (const n of [1, 4, 45, 365]) {
            const words = WIDGET_TEXT[lang];
            const input = { number: String(n), label: words.label(n), footer: words.footer[kind], footerShort: words.footerShort[kind] };
            const t = sceneText(W, H, input);
            const footer = t.footer === 'long' ? input.footer : input.footerShort;
            const labelHeight = t.labelBeside ? 0 : t.label * LINE;
            const block = t.number * LINE + labelHeight + t.gap + t.pill * LINE + 2 * t.pillPadY;
            if (t.labelBeside) expect(t.labelLines.length * t.label * LINE).toBeLessThanOrEqual(t.number * LINE + 0.5);
            expect(block).toBeLessThanOrEqual(H - t.padTop - t.padBottom + 0.5);
            const room = W - t.padLeft - t.padRight;
            expect(emWidth(footer) * t.pill + 2 * t.pillPadX).toBeLessThanOrEqual(room + 0.5);
            const besideWidth = t.labelBeside && t.label > 0 ? t.number * 0.18 + Math.max(...t.labelLines.map(emWidth)) * t.label : 0;
            expect(emWidth(input.number) * t.number + besideWidth).toBeLessThanOrEqual(room + 0.5);
            if (t.label > 0 && !t.labelBeside) expect(emWidth(input.label) * t.label).toBeLessThanOrEqual(room + 0.5);
          }
        }
      }
    }
  });

  it('keeps the status readable on the reported 2×1 and stretched widgets', () => {
    for (const [W, H] of [SIZES[0], SIZES[1]]) {
      for (const kind of KINDS) {
        const words = WIDGET_TEXT.ru;
        const t = sceneText(W, H, { number: '4', label: words.label(4), footer: words.footer[kind], footerShort: words.footerShort[kind] });
        expect(t.pill).toBeGreaterThanOrEqual(9.5);
        expect(t.label).toBeGreaterThan(0);
      }
    }
  });

  it('measures the words close to what Manrope really draws', () => {
    // Widths taken from the font in a browser, in em; the guess may only err wide.
    const measured: [string, number][] = [
      ['Серия продлена ✓', 7.94],
      ['Заморозка спасёт ❄', 8.47],
      ['дней подряд', 5.26],
      ['Extend your streak!', 7.89],
      ['999', 1.5],
    ];
    for (const [text, em] of measured) {
      expect(emWidth(text)).toBeGreaterThanOrEqual(em);
      expect(emWidth(text)).toBeLessThan(em * 1.4);
    }
  });
});

describe('the picture in layers, for the animated card', () => {
  const layer = (l: 'back' | 'rays' | 'flame', count = 45, kind: 'done' | 'pending' | 'frozen' | 'start' = 'done') =>
    streakScene({ count, kind, width: 340, height: 166, variant: 3, layer: l, cornerRadius: 0 });

  it('puts the sky in the back layer only', () => {
    expect(layer('back')).toMatch(/fill="url\(#[^)]*sky\)"/);
    expect(layer('flame')).not.toMatch(/fill="url\(#[^)]*sky\)"/);
    expect(layer('rays')).not.toMatch(/fill="url\(#[^)]*sky\)"/);
  });

  it('puts the flame, its face and crown in the flame layer only', () => {
    expect(layer('flame')).toContain('#FFD54A');
    expect(layer('flame')).toContain('rx="3.6" ry="5"');
    expect(layer('back')).not.toContain('rx="3.6" ry="5"');
    expect(layer('back')).not.toContain('#FFD54A');
  });

  it('leaves the embers and the moon to the app', () => {
    for (const l of ['back', 'rays', 'flame'] as const) {
      expect(layer(l, 150)).not.toContain('fill="#FDE68A"');
    }
    expect(streakScene({ count: 150, kind: 'done', width: 340, height: 166, variant: 3 })).toContain('fill="#FDE68A"');
  });

  it('stands the flame where the geometry says, so the app scales it from its base', () => {
    const geo = sceneGeometry(45, 'done', 340, 166);
    const m = layer('flame').match(/translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeCloseTo(geo.flame.x, 0);
    expect(Number(m![2])).toBeCloseTo(geo.flame.y, 0);
    expect(Number(m![3]) * 100).toBeCloseTo(geo.flame.size, 0);
  });

  it('spins rays only where the picture has them', () => {
    expect(raysSvg(3, 'done', 200)).toBeNull();
    expect(raysSvg(45, 'frozen', 200)).toBeNull();
    expect(count(raysSvg(45, 'done', 200)!, /<path/g)).toBe(10);
    expect(sceneGeometry(150, 'done', 340, 166).orbit).not.toBeNull();
    expect(sceneGeometry(60, 'done', 340, 166).orbit).toBeNull();
  });

  it('turns up as the tiers climb', () => {
    expect(sceneIntensity(0, 'start')).toBe(0);
    expect(sceneIntensity(1, 'done')).toBeLessThan(sceneIntensity(30, 'done'));
    expect(sceneIntensity(150, 'done')).toBe(1);
  });
});

describe('the flame dressed for a holiday', () => {
  const dressed = (count: number, accessory: 'santa' | 'witch' | 'heart' | 'flower' | null) =>
    streakScene({ count, kind: 'done', width: 240, height: 112, variant: 3, accessory });

  it('wears a Santa hat at New Year and a witch hat at Halloween, in place of its crown', () => {
    expect(dressed(4, 'santa')).toContain('#E53935');
    expect(dressed(45, 'santa')).not.toContain('#FFD54A');
    expect(dressed(45, 'witch')).toContain('#4C3566');
    expect(dressed(45, 'witch')).not.toContain('#FFD54A');
  });

  it('keeps its crown beside a heart or a flower', () => {
    expect(dressed(45, 'heart')).toContain('#FF3D71');
    expect(dressed(45, 'heart')).toContain('#FFD54A');
    expect(dressed(45, 'flower')).toContain('#FFC1D9');
    expect(dressed(45, 'flower')).toContain('#FFD54A');
  });

  it('wears nothing outside a holiday, and the sprout never dresses up', () => {
    expect(dressed(45, null)).not.toContain('#E53935');
    expect(streakScene({ count: 0, kind: 'start', width: 240, height: 112, variant: 3, accessory: 'santa' })).not.toContain('#E53935');
  });

  it('puts the accessory in the flame layer, so it moves with the flame', () => {
    const layer = (l: 'back' | 'flame') =>
      streakScene({ count: 9, kind: 'done', width: 340, height: 166, variant: 3, layer: l, accessory: 'santa' });
    expect(layer('flame')).toContain('#E53935');
    expect(layer('back')).not.toContain('#E53935');
  });
});
