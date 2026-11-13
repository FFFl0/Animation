import { STREAK_TIERS } from '../../data/streakTiers';
import { currentVariant, lookFor, sceneLayout, sceneText, streakScene } from '../streakScene';

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

  it('keeps the words clear of the flame', () => {
    const text = sceneText(190, 88);
    const { emblem } = sceneLayout(190, 88);
    expect(190 - text.padRight).toBeLessThanOrEqual(emblem.x + 0.5);
    expect(text.number).toBeGreaterThanOrEqual(18);
  });
});
