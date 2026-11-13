"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookFor = lookFor;
exports.sceneLayout = sceneLayout;
exports.streakScene = streakScene;
exports.sceneText = sceneText;
exports.pillColors = pillColors;
exports.currentVariant = currentVariant;
const streakTiers_1 = require('./streakTiers');
const LOOKS = {
    seed: {
        sky: ['#EEF2F6', '#DCE4EC'],
        glow: '#B8C6D4',
        flame: ['#9AA8B5', '#B9C4CE', '#DDE3E9'],
        embers: 0, rays: 0, stars: 0, crown: false, gem: false, orbit: false,
        ink: '#334155', inkSoft: '#64748B',
    },
    spark: {
        sky: ['#FFE4EA', '#FFC9D4'],
        glow: '#FF8FA6',
        flame: ['#F4556B', '#FF8A80', '#FFD6A5'],
        embers: 2, rays: 0, stars: 0, crown: false, gem: false, orbit: false,
        ink: '#7A1730', inkSoft: '#B4415B',
    },
    rolling: {
        sky: ['#FFD1E6', '#F9A8D4'],
        glow: '#FF6FAE',
        flame: ['#EC4899', '#FB7185', '#FFE0A3'],
        embers: 4, rays: 0, stars: 0, crown: false, gem: false, orbit: false,
        ink: '#6B0F3A', inkSoft: '#A3285F',
    },
    week: {
        sky: ['#FF9A62', '#F0508A'],
        glow: '#FFD08A',
        flame: ['#FF6A2B', '#FFA43A', '#FFF1B8'],
        embers: 6, rays: 8, stars: 0, crown: false, gem: false, orbit: false,
        ink: '#FFFFFF', inkSoft: '#FFE9DE',
    },
    fortnight: {
        sky: ['#FFC53D', '#FF7A2F'],
        glow: '#FFF3B0',
        flame: ['#FF5A1F', '#FFB020', '#FFFBE0'],
        embers: 8, rays: 12, stars: 0, crown: false, gem: false, orbit: false,
        ink: '#FFFFFF', inkSoft: '#FFF4D6',
    },
    month: {
        sky: ['#4C1D95', '#9D4EDD'],
        glow: '#FFB86B',
        flame: ['#FF5E3A', '#FFB347', '#FFF6C9'],
        embers: 8, rays: 10, stars: 10, crown: true, gem: false, orbit: false,
        ink: '#FFFFFF', inkSoft: '#E9D8FF',
    },
    iron: {
        sky: ['#3B0A45', '#C2185B'],
        glow: '#FF8AD8',
        flame: ['#FF2E88', '#FF9F43', '#FFF3D6'],
        embers: 10, rays: 14, stars: 14, crown: true, gem: false, orbit: false,
        ink: '#FFFFFF', inkSoft: '#FFD6EC',
    },
    legend: {
        sky: ['#0B1D51', '#2563EB'],
        glow: '#7DD3FC',
        flame: ['#38BDF8', '#A5F3FC', '#FFFFFF'],
        embers: 12, rays: 16, stars: 18, crown: true, gem: true, orbit: false,
        ink: '#FFFFFF', inkSoft: '#D6E8FF',
    },
    beyond: {
        sky: ['#140A3A', '#5B21B6'],
        glow: '#C4B5FD',
        flame: ['#A855F7', '#F472B6', '#FFF1FB'],
        embers: 14, rays: 20, stars: 24, crown: true, gem: true, orbit: true,
        ink: '#FFFFFF', inkSoft: '#E4DBFF',
    },
};
const FROZEN_FLAME = ['#3B82F6', '#93C5FD', '#EFF6FF'];
function lookFor(count, kind) {
    const tier = kind === 'start' ? 'seed' : (0, streakTiers_1.tierForStreak)(count).id;
    return { ...LOOKS[tier], tier };
}
/** A small repeatable random sequence, so a variant always draws the same. */
function random(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return ((s >>> 0) % 10000) / 10000;
    };
}
const n = (x) => Math.round(x * 10) / 10;
/** Flame outline in a 100×100 box, base at the bottom centre. */
const FLAME = 'M50 4 C60 22 80 34 80 60 C80 81 66 95 50 95 C34 95 20 81 20 60 C20 45 29 36 35 28 C37 41 42 47 47 49 C43 33 45 18 50 4 Z';
const CORE = 'M50 40 C58 52 68 60 68 74 C68 86 60 93 50 93 C40 93 32 86 32 74 C32 62 43 55 50 40 Z';
function sparkle(x, y, r, color, opacity) {
    const k = r * 0.28;
    return `<path d="M${n(x)} ${n(y - r)} L${n(x + k)} ${n(y - k)} L${n(x + r)} ${n(y)} L${n(x + k)} ${n(y + k)} L${n(x)} ${n(y + r)} L${n(x - k)} ${n(y + k)} L${n(x - r)} ${n(y)} L${n(x - k)} ${n(y - k)} Z" fill="${color}" fill-opacity="${opacity}"/>`;
}
function sceneLayout(width, height) {
    if (height > width * 0.75) {
        const size = Math.min(width * 0.62, height * 0.5);
        return { shape: 'tall', emblem: { x: (width - size) / 2, y: height * 0.06, size } };
    }
    const size = Math.min(height * 0.9, width * 0.45);
    return { shape: 'wide', emblem: { x: width - size - height * 0.08, y: (height - size) / 2, size } };
}
function streakScene({ count, kind, width, height, variant }) {
    const W = Math.max(60, width);
    const H = Math.max(40, height);
    const look = lookFor(count, kind);
    const { emblem } = sceneLayout(W, H);
    const radius = Math.min(28, H / 2);
    const rand = random(variant + count * 7 + 1);
    const lit = kind === 'done';
    const frozen = kind === 'frozen';
    const flame = frozen ? FROZEN_FLAME : look.flame;
    const cx = emblem.x + emblem.size / 2;
    const cy = emblem.y + emblem.size * 0.58;
    // Ids unique to this picture, should two ever share a document.
    const id = `s${look.tier}${kind}${variant % 97}w${Math.round(W)}h${Math.round(H)}`;
    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(H)}" viewBox="0 0 ${n(W)} ${n(H)}">`, '<defs>', `<linearGradient id="${id}sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${look.sky[0]}"/><stop offset="1" stop-color="${look.sky[1]}"/></linearGradient>`, `<radialGradient id="${id}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${frozen ? '#BFDBFE' : look.glow}" stop-opacity="${lit ? 0.95 : 0.5}"/><stop offset="1" stop-color="${frozen ? '#BFDBFE' : look.glow}" stop-opacity="0"/></radialGradient>`, `<linearGradient id="${id}fOuter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${flame[1]}"/><stop offset="1" stop-color="${flame[0]}"/></linearGradient>`, `<linearGradient id="${id}fCore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${flame[2]}"/><stop offset="1" stop-color="${flame[1]}"/></linearGradient>`, `<clipPath id="${id}card"><rect x="0" y="0" width="${n(W)}" height="${n(H)}" rx="${n(radius)}" ry="${n(radius)}"/></clipPath>`, '</defs>', `<g clip-path="url(#${id}card)">`, `<rect x="0" y="0" width="${n(W)}" height="${n(H)}" fill="url(#${id}sky)"/>`);
    // Night tiers: a field of stars over the whole card.
    const { shape } = sceneLayout(W, H);
    // On a wide card the text sits on the left, so the stars keep to the right.
    const starFrom = shape === 'wide' ? emblem.x - emblem.size * 0.35 : 0;
    for (let i = 0; i < look.stars; i++) {
        const x = starFrom + rand() * (W - starFrom);
        const y = rand() * H;
        const big = rand() > 0.8;
        out.push(big ? sparkle(x, y, 2.6 + rand() * 1.6, '#FFFFFF', 0.9) : `<circle cx="${n(x)}" cy="${n(y)}" r="${n(0.6 + rand() * 0.9)}" fill="#FFFFFF" fill-opacity="${n(0.4 + rand() * 0.5)}"/>`);
    }
    // Rays fanning out from behind the flame, longer the higher the tier.
    if (look.rays && !frozen) {
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
    out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(glowR)}" fill="url(#${id}glow)"/>`);
    // An orbit round the top tier, with a little moon on it.
    if (look.orbit) {
        const rx = emblem.size * 0.62;
        const ry = emblem.size * 0.2;
        const a = ((variant % 6) / 6) * Math.PI * 2;
        out.push(`<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.6" transform="rotate(-18 ${n(cx)} ${n(cy)})"/>`);
        const mx = cx + Math.cos(a) * rx;
        const my = cy + Math.sin(a) * ry;
        out.push(`<circle cx="${n(mx)}" cy="${n(my)}" r="${n(emblem.size * 0.045)}" fill="#FDE68A" transform="rotate(-18 ${n(cx)} ${n(cy)})"/>`);
    }
    if (look.tier === 'seed') {
        // Nothing burning yet: a sprout in a little mound.
        const s = emblem.size / 100;
        const ox = emblem.x;
        const oy = emblem.y;
        const p = (x, y) => `${n(ox + x * s)} ${n(oy + y * s)}`;
        out.push(`<path d="M${p(18, 92)} C${p(30, 74)} ${p(70, 74)} ${p(82, 92)} Z" fill="#A3B18A"/>`, `<path d="M${p(50, 86)} C${p(50, 70)} ${p(50, 60)} ${p(50, 50)}" stroke="#6B8F4E" stroke-width="${n(4 * s)}" fill="none" stroke-linecap="round"/>`, `<path d="M${p(50, 58)} C${p(36, 58)} ${p(26, 48)} ${p(28, 36)} C${p(42, 36)} ${p(52, 44)} ${p(50, 58)} Z" fill="#84A86B"/>`, `<path d="M${p(50, 52)} C${p(62, 50)} ${p(72, 40)} ${p(70, 28)} C${p(58, 30)} ${p(48, 38)} ${p(50, 52)} Z" fill="#9CC17F"/>`);
    }
    else {
        // The flame: full and bright once today is played, smaller and dimmer
        // while it waits for a round.
        // With a crown the flame sits lower and smaller, so the crown fits under the top edge.
        const scale = (lit || frozen ? 1 : 0.86) * (look.crown && !frozen ? 0.88 : 1);
        const size = emblem.size * scale;
        const fx = cx - size / 2;
        const fy = emblem.y + emblem.size - size;
        const t = `translate(${n(fx)} ${n(fy)}) scale(${n(size / 100)})`;
        const dim = lit || frozen ? 1 : 0.78;
        out.push(`<g transform="${t}" opacity="${dim}">`, `<path d="${FLAME}" fill="url(#${id}fOuter)"/>`, `<path d="${CORE}" fill="url(#${id}fCore)"/>`);
        // A face, the way the app draws its characters: awake and happy, dozing,
        // or chattering with cold.
        if (lit) {
            out.push('<ellipse cx="42" cy="70" rx="3.6" ry="5" fill="#3A1A12"/>', '<ellipse cx="58" cy="70" rx="3.6" ry="5" fill="#3A1A12"/>', '<circle cx="43.2" cy="68" r="1.4" fill="#FFFFFF"/>', '<circle cx="59.2" cy="68" r="1.4" fill="#FFFFFF"/>', '<path d="M44 80 Q50 86 56 80" stroke="#3A1A12" stroke-width="2.6" fill="none" stroke-linecap="round"/>', '<ellipse cx="36" cy="79" rx="4" ry="2.4" fill="#FF6F91" fill-opacity="0.55"/>', '<ellipse cx="64" cy="79" rx="4" ry="2.4" fill="#FF6F91" fill-opacity="0.55"/>');
        }
        else if (frozen) {
            out.push('<path d="M38 70 L46 70" stroke="#1E3A8A" stroke-width="2.6" stroke-linecap="round"/>', '<path d="M54 70 L62 70" stroke="#1E3A8A" stroke-width="2.6" stroke-linecap="round"/>', '<path d="M42 82 L46 79 L50 82 L54 79 L58 82" stroke="#1E3A8A" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>');
        }
        else {
            out.push('<path d="M37 71 Q42 74 47 71" stroke="#3A1A12" stroke-width="2.4" fill="none" stroke-linecap="round"/>', '<path d="M53 71 Q58 74 63 71" stroke="#3A1A12" stroke-width="2.4" fill="none" stroke-linecap="round"/>', '<ellipse cx="50" cy="82" rx="3" ry="2.2" fill="#3A1A12"/>');
        }
        out.push('</g>');
        // Crown on top from a month on; a gem set in it at a hundred.
        if (look.crown && !frozen) {
            const cw = size * 0.36;
            const ch = cw * 0.62;
            const kx = cx - cw / 2;
            const ky = fy + size * 0.02 - ch * 0.55;
            const pt = (x, y) => `${n(kx + x * cw)} ${n(ky + y * ch)}`;
            out.push(`<path d="M${pt(0, 1)} L${pt(0.02, 0.25)} L${pt(0.27, 0.6)} L${pt(0.5, 0)} L${pt(0.73, 0.6)} L${pt(0.98, 0.25)} L${pt(1, 1)} Z" fill="#FFD54A" stroke="#E6A700" stroke-width="1.2" stroke-linejoin="round"/>`, `<circle cx="${pt(0.5, 0.02).split(' ')[0]}" cy="${pt(0.5, 0.02).split(' ')[1]}" r="${n(cw * 0.06)}" fill="#FFF3B0"/>`);
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
    if (lit) {
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
function sceneText(width, height) {
    const { shape, emblem } = sceneLayout(width, height);
    const unit = shape === 'wide' ? height : height * 0.42;
    return {
        shape,
        padLeft: shape === 'wide' ? Math.round(unit * 0.2) : 0,
        padRight: shape === 'wide' ? Math.round(width - emblem.x) : 0,
        padTop: shape === 'wide' ? 0 : Math.round(emblem.y + emblem.size),
        number: Math.max(18, Math.round(unit * 0.36)),
        label: Math.max(9, Math.round(unit * 0.12)),
        pill: Math.max(9, Math.round(unit * 0.105)),
        pillPadX: Math.round(unit * 0.08),
        pillPadY: Math.max(2, Math.round(unit * 0.03)),
        gap: Math.round(unit * 0.06),
    };
}
/** The status pill's colours, by state, on this tier's sky. */
function pillColors(count, kind) {
    const look = lookFor(count, kind);
    switch (kind) {
        case 'done':
            return { background: 'rgba(255, 255, 255, 0.3)', text: look.ink };
        case 'frozen':
            return { background: '#DBEAFE', text: '#1D4ED8' };
        case 'start':
            return { background: '#FADDE1', text: '#D94A7B' };
        default:
            return { background: '#F06292', text: '#FFFFFF' };
    }
}
/** Which arrangement of sparkles to draw now: a new one every half hour. */
function currentVariant(now = Date.now()) {
    return Math.floor(now / 1_800_000);
}
