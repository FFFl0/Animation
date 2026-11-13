import { StreakTierId, tierForStreak } from '../data/streakTiers';
import { WidgetKind } from './streakWidgetState';
import type { FlameAccessory } from '../holidays/holidays';

/**
 * The picture behind the streak widget, as one SVG.
 *
 * The scene grows with the streak: a sprout before anything is played, a
 * small flame on day one, and from there each tier of data/streakTiers
 * adds something — embers, a glow, rays, a night sky, a crown, a gem, an
 * orbit — so a hundred-day widget is plainly a bigger thing than a
 * three-day one. Today's state changes the flame itself: lit when the day
 * is played, low and sleepy while it waits, iced over when a freeze is
 * holding the streak.
 *
 * Android cannot animate a home-screen widget, so instead the loose
 * sparkles move between redraws (`variant`, the half-hour slot), and the
 * widget looks a little different each time the phone is unlocked.
 *
 * Written for AndroidSVG (what the widget library draws with): gradients,
 * clip paths, opacity and transforms only — no filters, no CSS, no text.
 */

type Look = {
  sky: [string, string];
  glow: string;
  flame: [string, string, string];
  embers: number;
  rays: number;
  stars: number;
  crown: boolean;
  gem: boolean;
  orbit: boolean;
  /** Text colour that reads on this sky. */
  ink: string;
  inkSoft: string;
  /** The tier's own deep colour, for words on the white status pill. */
  pillInk: string;
};

const LOOKS: Record<StreakTierId, Look> = {
  seed: {
    sky: ['#EEF2F6', '#DCE4EC'],
    glow: '#B8C6D4',
    flame: ['#9AA8B5', '#B9C4CE', '#DDE3E9'],
    embers: 0, rays: 0, stars: 0, crown: false, gem: false, orbit: false,
    ink: '#334155', inkSoft: '#64748B',
    pillInk: '#334155',
  },
  spark: {
    sky: ['#FFE4EA', '#FFC9D4'],
    glow: '#FF8FA6',
    flame: ['#F4556B', '#FF8A80', '#FFD6A5'],
    embers: 2, rays: 0, stars: 0, crown: false, gem: false, orbit: false,
    ink: '#7A1730', inkSoft: '#B4415B',
    pillInk: '#BE123C',
  },
  rolling: {
    sky: ['#FFD1E6', '#F9A8D4'],
    glow: '#FF6FAE',
    flame: ['#EC4899', '#FB7185', '#FFE0A3'],
    embers: 4, rays: 0, stars: 0, crown: false, gem: false, orbit: false,
    ink: '#6B0F3A', inkSoft: '#A3285F',
    pillInk: '#9D174D',
  },
  week: {
    sky: ['#FF9A62', '#F0508A'],
    glow: '#FFD08A',
    flame: ['#FF6A2B', '#FFA43A', '#FFF1B8'],
    embers: 6, rays: 8, stars: 0, crown: false, gem: false, orbit: false,
    ink: '#FFFFFF', inkSoft: '#FFE9DE',
    pillInk: '#C2410C',
  },
  fortnight: {
    sky: ['#FFC53D', '#FF7A2F'],
    glow: '#FFF3B0',
    flame: ['#FF5A1F', '#FFB020', '#FFFBE0'],
    embers: 8, rays: 12, stars: 0, crown: false, gem: false, orbit: false,
    ink: '#FFFFFF', inkSoft: '#FFF4D6',
    pillInk: '#B45309',
  },
  month: {
    sky: ['#4C1D95', '#9D4EDD'],
    glow: '#FFB86B',
    flame: ['#FF5E3A', '#FFB347', '#FFF6C9'],
    embers: 8, rays: 10, stars: 10, crown: true, gem: false, orbit: false,
    ink: '#FFFFFF', inkSoft: '#E9D8FF',
    pillInk: '#5B21B6',
  },
  iron: {
    sky: ['#3B0A45', '#C2185B'],
    glow: '#FF8AD8',
    flame: ['#FF2E88', '#FF9F43', '#FFF3D6'],
    embers: 10, rays: 14, stars: 14, crown: true, gem: false, orbit: false,
    ink: '#FFFFFF', inkSoft: '#FFD6EC',
    pillInk: '#9D174D',
  },
  legend: {
    sky: ['#0B1D51', '#2563EB'],
    glow: '#7DD3FC',
    flame: ['#38BDF8', '#A5F3FC', '#FFFFFF'],
    embers: 12, rays: 16, stars: 18, crown: true, gem: true, orbit: false,
    ink: '#FFFFFF', inkSoft: '#D6E8FF',
    pillInk: '#1D4ED8',
  },
  beyond: {
    sky: ['#140A3A', '#5B21B6'],
    glow: '#C4B5FD',
    flame: ['#A855F7', '#F472B6', '#FFF1FB'],
    embers: 14, rays: 20, stars: 24, crown: true, gem: true, orbit: true,
    ink: '#FFFFFF', inkSoft: '#E4DBFF',
    pillInk: '#5B21B6',
  },
};

const FROZEN_FLAME: [string, string, string] = ['#3B82F6', '#93C5FD', '#EFF6FF'];

export function lookFor(count: number, kind: WidgetKind): Look & { tier: StreakTierId } {
  const tier = kind === 'start' ? 'seed' : tierForStreak(count).id;
  return { ...LOOKS[tier], tier };
}

/** A small repeatable random sequence, so a variant always draws the same. */
function random(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const n = (x: number) => Math.round(x * 10) / 10;

/** Flame outline in a 100×100 box, base at the bottom centre. */
const FLAME =
  'M50 4 C60 22 80 34 80 60 C80 81 66 95 50 95 C34 95 20 81 20 60 C20 45 29 36 35 28 C37 41 42 47 47 49 C43 33 45 18 50 4 Z';
const CORE = 'M50 40 C58 52 68 60 68 74 C68 86 60 93 50 93 C40 93 32 86 32 74 C32 62 43 55 50 40 Z';

/** Holiday accessories, drawn in the flame's 100×100 box. */
const ACCESSORY: Record<FlameAccessory, string> = {
  santa: [
    '<path d="M24 38 C27 20 38 4 52 -3 C63 -8 76 -2 84 12 L77 16 C71 8 65 8 61 12 C67 21 72 29 76 38 Z" fill="#E53935"/>',
    '<path d="M24 38 C27 20 38 4 52 -3 C46 8 42 22 42 38 Z" fill="#FF6F6B" fill-opacity="0.45"/>',
    '<rect x="19" y="32" width="62" height="12" rx="6" fill="#FFFFFF"/>',
    '<circle cx="82" cy="15" r="7" fill="#FFFFFF"/>',
  ].join(''),
  witch: [
    '<ellipse cx="50" cy="37" rx="36" ry="7" fill="#3B2A4F"/>',
    '<path d="M31 37 L44 6 C47 -2 54 -6 62 -2 C57 0 54 4 56 10 L69 37 Z" fill="#4C3566"/>',
    '<path d="M33 31 L67 31 L69 37 L31 37 Z" fill="#F97316"/>',
    '<rect x="46" y="30" width="8" height="8" rx="1.5" fill="#FDE68A"/>',
  ].join(''),
  heart: [
    '<path d="M84 78 C84 78 70 70 70 61 C70 56 74 53 78 54 C81 55 83 57 84 59 C85 57 87 55 90 54 C94 53 98 56 98 61 C98 70 84 78 84 78 Z" fill="#FF3D71" stroke="#FFFFFF" stroke-width="2"/>',
    '<ellipse cx="76" cy="59" rx="2.4" ry="1.6" fill="#FFFFFF" fill-opacity="0.8"/>',
  ].join(''),
  flower: [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="22" cy="28" rx="5.5" ry="9" fill="#FFC1D9" stroke="#FFFFFF" stroke-width="1" transform="rotate(${a} 22 37)"/>`)
    .join('') + '<circle cx="22" cy="37" r="4" fill="#F472B6"/><circle cx="22" cy="37" r="1.6" fill="#FDE68A"/>',
};

function sparkle(x: number, y: number, r: number, color: string, opacity: number): string {
  const k = r * 0.28;
  return `<path d="M${n(x)} ${n(y - r)} L${n(x + k)} ${n(y - k)} L${n(x + r)} ${n(y)} L${n(x + k)} ${n(y + k)} L${n(x)} ${n(y + r)} L${n(x - k)} ${n(y + k)} L${n(x - r)} ${n(y)} L${n(x - k)} ${n(y - k)} Z" fill="${color}" fill-opacity="${opacity}"/>`;
}

export type SceneInput = {
  count: number;
  kind: WidgetKind;
  width: number;
  height: number;
  /** Which arrangement of the loose sparkles; any whole number. */
  variant: number;
  /**
   * One layer of the picture rather than all of it, so the app can move the
   * parts separately (StreakHero): `back` is the sky, stars, glow and
   * orbit; `rays` the rays alone; `flame` the flame, face, crown and frost.
   * The widget always draws `all`, which also has the embers and the moon.
   */
  layer?: SceneLayer;
  /** Corner rounding; the widget's own when left out. */
  cornerRadius?: number;
  /** What the flame wears for a holiday (holidays/holidays), if anything. */
  accessory?: FlameAccessory | null;
};

export type SceneLayer = 'all' | 'back' | 'rays' | 'flame';

export type SceneLayout = {
  /** Wide (2×1 and wider) puts the flame on the right; tall puts it on top. */
  shape: 'wide' | 'tall';
  /** The box the flame is drawn in, in widget points. */
  emblem: { x: number; y: number; size: number };
};

export function sceneLayout(width: number, height: number): SceneLayout {
  if (height > width * 0.75) {
    const size = Math.min(width * 0.62, height * 0.5);
    return { shape: 'tall', emblem: { x: (width - size) / 2, y: height * 0.06, size } };
  }
  const size = Math.min(height * 0.9, width * 0.45);
  return { shape: 'wide', emblem: { x: width - size - height * 0.08, y: (height - size) / 2, size } };
}

/**
 * Where the moving parts of a picture are, in its own points: what the app
 * turns the rays about, scales the flame from, and runs the moon round.
 */
export function sceneGeometry(count: number, kind: WidgetKind, width: number, height: number) {
  const W = Math.max(60, width);
  const H = Math.max(40, height);
  const look = lookFor(count, kind);
  const { emblem } = sceneLayout(W, H);
  const lit = kind === 'done';
  const frozen = kind === 'frozen';
  const scale = (lit || frozen ? 1 : 0.86) * (look.crown && !frozen ? 0.88 : 1);
  const size = emblem.size * scale;
  return {
    emblem,
    /** Centre of the glow and the rays. */
    cx: emblem.x + emblem.size / 2,
    cy: emblem.y + emblem.size * 0.58,
    /** The flame's box: it stands on the bottom of the emblem. */
    flame: { x: emblem.x + emblem.size / 2 - size / 2, y: emblem.y + emblem.size - size, size },
    orbit: look.orbit ? { rx: emblem.size * 0.62, ry: emblem.size * 0.2, tilt: -18, moon: emblem.size * 0.045 } : null,
  };
}

export function streakScene({ count, kind, width, height, variant, layer = 'all', cornerRadius, accessory = null }: SceneInput): string {
  const W = Math.max(60, width);
  const H = Math.max(40, height);
  const look = lookFor(count, kind);
  const { emblem } = sceneLayout(W, H);
  const radius = cornerRadius ?? Math.min(28, H / 2);
  const has = (part: SceneLayer) => layer === 'all' || layer === part;
  const rand = random(variant + count * 7 + 1);
  const lit = kind === 'done';
  const frozen = kind === 'frozen';
  const flame = frozen ? FROZEN_FLAME : look.flame;
  const cx = emblem.x + emblem.size / 2;
  const cy = emblem.y + emblem.size * 0.58;
  // Ids unique to this picture, should two ever share a document.
  const id = `s${look.tier}${kind}${variant % 97}w${Math.round(W)}h${Math.round(H)}`;
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(H)}" viewBox="0 0 ${n(W)} ${n(H)}">`,
    '<defs>',
    `<linearGradient id="${id}sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${look.sky[0]}"/><stop offset="1" stop-color="${look.sky[1]}"/></linearGradient>`,
    `<radialGradient id="${id}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${frozen ? '#BFDBFE' : look.glow}" stop-opacity="${lit ? 0.95 : 0.5}"/><stop offset="1" stop-color="${frozen ? '#BFDBFE' : look.glow}" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="${id}fOuter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${flame[1]}"/><stop offset="1" stop-color="${flame[0]}"/></linearGradient>`,
    `<linearGradient id="${id}fCore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${flame[2]}"/><stop offset="1" stop-color="${flame[1]}"/></linearGradient>`,
    `<clipPath id="${id}card"><rect x="0" y="0" width="${n(W)}" height="${n(H)}" rx="${n(radius)}" ry="${n(radius)}"/></clipPath>`,
    '</defs>',
    `<g clip-path="url(#${id}card)">`
  );
  if (has('back')) out.push(`<rect x="0" y="0" width="${n(W)}" height="${n(H)}" fill="url(#${id}sky)"/>`);

  // Night tiers: a field of stars over the whole card.
  const { shape } = sceneLayout(W, H);
  // On a wide card the text sits on the left, so the stars keep to the right.
  const starFrom = shape === 'wide' ? emblem.x - emblem.size * 0.35 : 0;
  for (let i = 0; i < (has('back') ? look.stars : 0); i++) {
    const x = starFrom + rand() * (W - starFrom);
    const y = rand() * H;
    const big = rand() > 0.8;
    out.push(big ? sparkle(x, y, 2.6 + rand() * 1.6, '#FFFFFF', 0.9) : `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.6 + rand() * 0.9)}" fill="#FFFFFF" fill-opacity="${n(0.4 + rand() * 0.5)}"/>`);
  }

  // Rays fanning out from behind the flame, longer the higher the tier.
  if (has('rays') && look.rays && !frozen) {
    const reach = Math.max(W, H) * 1.1;
    const turn = variant % 2 ? Math.PI / look.rays / 2 : 0;
    for (let i = 0; i < look.rays; i++) {
      const a = (i / look.rays) * Math.PI * 2 + turn;
      const spread = Math.PI / look.rays / 2.6;
      const x1 = cx + Math.cos(a - spread) * reach;
      const y1 = cy + Math.sin(a - spread) * reach;
      const x2 = cx + Math.cos(a + spread) * reach;
      const y2 = cy + Math.sin(a + spread) * reach;
      out.push(`<path d="M${n(cx)} ${n(cy)} L${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)} Z" fill="#FFFFFF" fill-opacity="${lit ? 0.13 : 0.06}"/>`);
    }
  }

  // The glow behind the flame.
  const glowR = emblem.size * (0.55 + 0.1 * Math.min(1, look.rays / 12));
  if (has('back')) out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(glowR)}" fill="url(#${id}glow)"/>`);

  // An orbit round the top tier, with a little moon on it.
  if (has('back') && look.orbit) {
    const rx = emblem.size * 0.62;
    const ry = emblem.size * 0.2;
    const a = ((variant % 6) / 6) * Math.PI * 2;
    out.push(
      `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.6" transform="rotate(-18 ${n(cx)} ${n(cy)})"/>`
    );
    const mx = cx + Math.cos(a) * rx;
    const my = cy + Math.sin(a) * ry;
    // The app runs its own moon round the ring.
    if (layer === 'all') out.push(`<circle cx="${n(mx)}" cy="${n(my)}" r="${n(emblem.size * 0.045)}" fill="#FDE68A" transform="rotate(-18 ${n(cx)} ${n(cy)})"/>`);
  }

  if (!has('flame')) {
    // The flame is drawn in its own layer.
  } else if (look.tier === 'seed') {
    // Nothing burning yet: a sprout in a little mound.
    const s = emblem.size / 100;
    const ox = emblem.x;
    const oy = emblem.y;
    const p = (x: number, y: number) => `${n(ox + x * s)} ${n(oy + y * s)}`;
    out.push(
      `<path d="M${p(18, 92)} C${p(30, 74)} ${p(70, 74)} ${p(82, 92)} Z" fill="#A3B18A"/>`,
      `<path d="M${p(50, 86)} C${p(50, 70)} ${p(50, 60)} ${p(50, 50)}" stroke="#6B8F4E" stroke-width="${n(4 * s)}" fill="none" stroke-linecap="round"/>`,
      `<path d="M${p(50, 58)} C${p(36, 58)} ${p(26, 48)} ${p(28, 36)} C${p(42, 36)} ${p(52, 44)} ${p(50, 58)} Z" fill="#84A86B"/>`,
      `<path d="M${p(50, 52)} C${p(62, 50)} ${p(72, 40)} ${p(70, 28)} C${p(58, 30)} ${p(48, 38)} ${p(50, 52)} Z" fill="#9CC17F"/>`
    );
  } else {
    // The flame: full and bright once today is played, smaller and dimmer
    // while it waits for a round.
    // With a crown the flame sits lower and smaller, so the crown fits under the top edge.
    const scale = (lit || frozen ? 1 : 0.86) * (look.crown && !frozen ? 0.88 : 1);
    const size = emblem.size * scale;
    const fx = cx - size / 2;
    const fy = emblem.y + emblem.size - size;
    const t = `translate(${n(fx)} ${n(fy)}) scale(${Math.round((size / 100) * 1000) / 1000})`;
    const dim = lit || frozen ? 1 : 0.78;
    out.push(
      `<g transform="${t}" opacity="${dim}">`,
      `<path d="${FLAME}" fill="url(#${id}fOuter)"/>`,
      `<path d="${CORE}" fill="url(#${id}fCore)"/>`
    );
    // A face, the way the app draws its characters: awake and happy, dozing,
    // or chattering with cold.
    if (lit) {
      out.push(
        '<ellipse cx="42" cy="70" rx="3.6" ry="5" fill="#3A1A12"/>',
        '<ellipse cx="58" cy="70" rx="3.6" ry="5" fill="#3A1A12"/>',
        '<circle cx="43.2" cy="68" r="1.4" fill="#FFFFFF"/>',
        '<circle cx="59.2" cy="68" r="1.4" fill="#FFFFFF"/>',
        '<path d="M44 80 Q50 86 56 80" stroke="#3A1A12" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="36" cy="79" rx="4" ry="2.4" fill="#FF6F91" fill-opacity="0.55"/>',
        '<ellipse cx="64" cy="79" rx="4" ry="2.4" fill="#FF6F91" fill-opacity="0.55"/>'
      );
    } else if (frozen) {
      out.push(
        '<path d="M38 70 L46 70" stroke="#1E3A8A" stroke-width="2.6" stroke-linecap="round"/>',
        '<path d="M54 70 L62 70" stroke="#1E3A8A" stroke-width="2.6" stroke-linecap="round"/>',
        '<path d="M42 82 L46 79 L50 82 L54 79 L58 82" stroke="#1E3A8A" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
      );
    } else {
      out.push(
        '<path d="M37 71 Q42 74 47 71" stroke="#3A1A12" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
        '<path d="M53 71 Q58 74 63 71" stroke="#3A1A12" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
        '<ellipse cx="50" cy="82" rx="3" ry="2.2" fill="#3A1A12"/>'
      );
    }
    // A holiday hat goes on top of the flame, in its own box so it breathes
    // and jumps with it; a heart or a flower is tucked in beside it.
    if (accessory) out.push(ACCESSORY[accessory]);
    out.push('</g>');

    // Crown on top from a month on; a gem set in it at a hundred. A holiday
    // hat takes its place for the holiday.
    const hat = accessory === 'santa' || accessory === 'witch';
    if (look.crown && !frozen && !hat) {
      const cw = size * 0.36;
      const ch = cw * 0.62;
      const kx = cx - cw / 2;
      const ky = fy + size * 0.02 - ch * 0.55;
      const pt = (x: number, y: number) => `${n(kx + x * cw)} ${n(ky + y * ch)}`;
      out.push(
        `<path d="M${pt(0, 1)} L${pt(0.02, 0.25)} L${pt(0.27, 0.6)} L${pt(0.5, 0)} L${pt(0.73, 0.6)} L${pt(0.98, 0.25)} L${pt(1, 1)} Z" fill="#FFD54A" stroke="#E6A700" stroke-width="1.2" stroke-linejoin="round"/>`,
        `<circle cx="${pt(0.5, 0.02).split(' ')[0]}" cy="${pt(0.5, 0.02).split(' ')[1]}" r="${n(cw * 0.06)}" fill="#FFF3B0"/>`
      );
      if (look.gem) {
        const gx = kx + cw * 0.5;
        const gy = ky + ch * 0.7;
        const g = cw * 0.13;
        out.push(`<path d="M${n(gx)} ${n(gy - g)} L${n(gx + g)} ${n(gy)} L${n(gx)} ${n(gy + g)} L${n(gx - g)} ${n(gy)} Z" fill="#60A5FA" stroke="#FFFFFF" stroke-width="0.8"/>`);
      }
    }

    // Snowflakes over a frozen streak.
    if (frozen) {
      for (let i = 0; i < 7; i++) {
        out.push(sparkle(rand() * W, rand() * H, 2 + rand() * 2.5, '#FFFFFF', 0.85));
      }
    }
  }

  // Embers rising off the flame — only while it is lit.
  if (layer === 'all' && lit) {
    for (let i = 0; i < look.embers; i++) {
      const x = cx + (rand() - 0.5) * emblem.size * 1.1;
      const y = emblem.y + rand() * emblem.size * 0.55;
      const r = 1 + rand() * 1.8;
      out.push(rand() > 0.6 ? sparkle(x, y, r * 2.2, '#FFFFFF', 0.9) : `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${look.flame[2]}" fill-opacity="${n(0.6 + rand() * 0.4)}"/>`);
    }
  }

  out.push('</g></svg>');
  return out.join('');
}

/**
 * Where the words go and how big they are, for the widget and the in-app
 * preview alike, so the two never drift apart.
 *
 * Sized to fit rather than to a fixed share of the height: every line is
 * measured (roughly, from Manrope ExtraBold's widths) against the room left
 * of the flame, and the whole block is scaled down until its height fits
 * too. Android pads each line of text by the font's full height (about
 * 1.55 of its size), so that is what is counted. When even that is not
 * enough — a very flat widget — the "days in a row" line goes first, and the
 * status takes its short form before it is squeezed.
 */
export type SceneText = {
  shape: 'wide' | 'tall';
  /** Padding round the text block, in widget points. */
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  number: number;
  /** 0 when there is no room for the line at all. */
  label: number;
  /**
   * On a flat widget the "days in a row" words stand beside the number, one
   * word a line, instead of under it — the only way three things fit in a
   * 2×1 cell at a readable size.
   */
  labelBeside: boolean;
  /** The label as it is set: one line under the number, or its words beside it. */
  labelLines: string[];
  pill: number;
  pillPadX: number;
  pillPadY: number;
  /**
   * How much of the pill's vertical padding moves from top to bottom. Android
   * leaves more room above Manrope's letters than below them, so evenly padded
   * words sit low; this lifts them back to the middle.
   */
  pillLift: number;
  gap: number;
  /** Which wording of the status fits. */
  footer: 'long' | 'short';
};

export type SceneWords = { number: string; label: string; footer: string; footerShort: string };

/** Android's line box for Manrope, as a share of the font size. */
export const LINE = 1.55;

/**
 * A safe guess at a string's width in em, for Manrope ExtraBold. Generous on
 * purpose: on a phone the same words came out wider than the font's own
 * widths in a browser (pixel rounding per letter, and the ✓ ❄ symbols drawn
 * from the system font), and a status cut to "Серия продле…" is worse than
 * one a size smaller.
 */
export function emWidth(text: string): number {
  let em = 0;
  for (const ch of text) em += /[✓❄✨🔥]/u.test(ch) ? 1.15 : /\s/.test(ch) ? 0.3 : 0.58;
  return em;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Below this height a wide widget sets the label beside the number. */
const BESIDE_BELOW = 140;

export function sceneText(width: number, height: number, words: SceneWords): SceneText {
  const W = Math.max(60, width);
  const H = Math.max(40, height);
  const { shape, emblem } = sceneLayout(W, H);
  const padX = Math.round(clamp(Math.min(W, H) * 0.11, 10, 18));
  const padV = Math.round(clamp(H * 0.08, 5, 14));
  const wide = shape === 'wide';
  // The flame's box has empty sides; the words may run a little into them.
  const room = wide ? emblem.x + emblem.size * 0.1 - padX : W - padX * 2;
  const top = wide ? padV : Math.round(emblem.y + emblem.size);
  const tall = H - top - padV;
  const unit = wide ? H : tall * 2.4;
  const beside = wide && H < BESIDE_BELOW;
  const space = words.label.indexOf(' ');
  const besideLines = space > 0 ? [words.label.slice(0, space), words.label.slice(space + 1)] : [words.label];
  const longestWord = Math.max(...besideLines.map(emWidth));

  const fit = (withLabel: boolean, footer: string) => {
    let pill = Math.min(unit * (beside ? 0.17 : 0.12), 15, room / (emWidth(footer) + 1.5));
    let number: number;
    let label: number;
    let height: () => number;
    if (beside) {
      // Two short lines beside the number take no more height than it does.
      const share = withLabel ? 0.36 : 0;
      number = Math.min(unit * 0.38, 56, room / (emWidth(words.number) + (withLabel ? 0.18 + longestWord * share : 0)));
      label = number * share;
      height = () => number * LINE + pill * 0.4 + pill * LINE + pill * 0.5;
    } else {
      number = Math.min(unit * 0.34, 56, room / emWidth(words.number));
      label = withLabel ? Math.min(unit * 0.13, 17, room / emWidth(words.label)) : 0;
      height = () => number * LINE + label * LINE + pill * 0.4 + pill * LINE + pill * 0.5;
    }
    const k = Math.min(1, tall / height());
    number *= k;
    label *= k;
    pill *= k;
    return { number, label, pill };
  };

  // The long status unless the short one is plainly bigger and the long
  // one small; the label only while the status stays readable.
  let footer: 'long' | 'short' = 'long';
  let sizes = fit(true, words.footer);
  const short = fit(true, words.footerShort);
  if (sizes.pill < 11 && short.pill > sizes.pill + 0.5) {
    footer = 'short';
    sizes = short;
  }
  if (sizes.pill < 9) {
    const noLabel = fit(false, footer === 'long' ? words.footer : words.footerShort);
    if (noLabel.pill > sizes.pill) sizes = noLabel;
  }
  const r = (x: number) => Math.round(x * 10) / 10;
  return {
    shape,
    padLeft: padX,
    padRight: wide ? Math.round(W - emblem.x - emblem.size * 0.1) : padX,
    padTop: top,
    padBottom: padV,
    number: r(sizes.number),
    label: r(sizes.label),
    labelBeside: beside,
    labelLines: beside ? besideLines : [words.label],
    pill: r(sizes.pill),
    pillPadX: r(sizes.pill * 0.75),
    pillPadY: r(sizes.pill * 0.25),
    pillLift: r(sizes.pill * 0.12),
    gap: r(sizes.pill * 0.4),
    footer,
  };
}

/**
 * The status pill: white on every sky, so it reads on the palest and the
 * darkest alike, with the words in the colour of what it says — the tier's
 * own when the day is done, urgent pink while it waits, ice blue under a
 * freeze.
 */
export function pillColors(count: number, kind: WidgetKind): { background: string; text: string } {
  const look = lookFor(count, kind);
  switch (kind) {
    case 'done':
      return { background: '#FFFFFF', text: look.pillInk };
    case 'frozen':
      return { background: '#FFFFFF', text: '#1D4ED8' };
    case 'start':
      return { background: '#FFFFFF', text: '#D94A7B' };
    default:
      return { background: '#FFFFFF', text: '#E11D48' };
  }
}

/** Which arrangement of sparkles to draw now: a new one every half hour. */
export function currentVariant(now = Date.now()): number {
  return Math.floor(now / 1_800_000);
}

/**
 * The rays on their own, as a square of side 2·`reach` with the rays
 * meeting in its middle — so the app can spin it about its centre without
 * the corners of a card-shaped layer swinging into view.
 */
export function raysSvg(count: number, kind: WidgetKind, reach: number): string | null {
  const look = lookFor(count, kind);
  if (!look.rays || kind === 'frozen') return null;
  const c = reach;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${n(2 * reach)}" height="${n(2 * reach)}" viewBox="0 0 ${n(2 * reach)} ${n(2 * reach)}">`];
  const spread = Math.PI / look.rays / 2.6;
  for (let i = 0; i < look.rays; i++) {
    const a = (i / look.rays) * Math.PI * 2;
    parts.push(
      `<path d="M${n(c)} ${n(c)} L${n(c + Math.cos(a - spread) * reach)} ${n(c + Math.sin(a - spread) * reach)} L${n(c + Math.cos(a + spread) * reach)} ${n(c + Math.sin(a + spread) * reach)} Z" fill="#FFFFFF" fill-opacity="${kind === 'done' ? 0.14 : 0.06}"/>`
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

/** What each tier adds to the picture, in the order the streak reaches them. */
export function sceneIntensity(count: number, kind: WidgetKind): number {
  const order: StreakTierId[] = ['seed', 'spark', 'rolling', 'week', 'fortnight', 'month', 'iron', 'legend', 'beyond'];
  return order.indexOf(lookFor(count, kind).tier) / (order.length - 1);
}
