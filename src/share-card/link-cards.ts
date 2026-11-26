// The link previews, 1200×630 (Notion "Link preview images: redesign the Open
// Graph cards to match the current app and brand"; Figma: Launch carousel
// file, section "OG · Link previews · 1200 × 630": Default 86:16925, Guide
// 86:16954, Guide · long 109:166, Guide · longer 139:184, Title 86:16985,
// Character 107:156).
//
// Light, on the app's canvas (its gradient and dot grid), with the real logo,
// the real posters and the character threads. Every preview shares one copy
// column on the left (logo, kicker, headline, redthread.tv) and puts its
// picture on the right:
//   - hub: a title's Spatial card in the middle, the titles its characters
//     connect it to around it, one thread per shared character (the
//     app-wide card is Iron Man's).
//   - guide: the stops climbing the red thread, the last one larger; an event
//     guide ends on its release with a date chip.
//   - char: the actor's portrait, then every title in release order, strung
//     on one thread in the character's color over two rows.
//
// Plain data in (text already written, colors from the tokens, images as
// data URIs the build fetched), a Satori layout out: nothing here reads the
// catalog or the network.
import type { Node } from './cards';
import type { PreviewColors } from './tokens';

type Child = Node | string;
type Style = Record<string, string | number>;

function h(type: string, style: Style, ...children: Child[]): Node {
  return { type, props: { style, children: children.length === 1 ? children[0] : children } };
}
function img(src: string, width: number, height: number, style: Style = {}): Node {
  return { type: 'img', props: { src, width, height, style: { width, height, ...style } } };
}
const svgURI = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const r1 = (n: number) => Math.round(n * 10) / 10;

export const LINK = { width: 1200, height: 630 };

// ---------------------------------------------------------------------------
// What the build hands in
// ---------------------------------------------------------------------------

/** A title's poster: the image (a data URI) over its own color. */
export interface PosterArt { src: string; color: string }

export interface Copy {
  kicker: string;
  heading: string;
  /** 'name' is a title's or character's name (112, stepping down when long);
   *  'line' is a sentence (60). */
  headingKind: 'name' | 'line';
  sub?: string;
  /** The support line's width: 430 on a title, 520 on a character. */
  subWidth?: number;
}

export interface CardInfo {
  poster: PosterArt;
  name: string;
  year: number;
  phaseColor: string;
  connections: number;
}

export interface Satellite {
  card: CardInfo;
  /** One thread per shared character, in its color (at most three drawn). */
  threads: string[];
  /** Colors for the threads that run on out of the frame. */
  onward: string[];
}

export type LinkArt =
  | { layout: 'hub'; center: CardInfo; satellites: Satellite[] }
  | { layout: 'guide'; stops: PosterArt[]; last: PosterArt; chip?: string; long: boolean }
  | { layout: 'char'; portrait: string; color: string; posters: PosterArt[] };

export interface LinkInput { copy: Copy; site: string; art: LinkArt }

export interface Brand { mark: string; word: string }

// ---------------------------------------------------------------------------
// Text sizes
// ---------------------------------------------------------------------------

/** About how wide `s` sets in Inter Semi Bold, in em (with the headline's
 *  tracking): enough to choose a size, not to lay text out. */
function emWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    if (/[ il.,:;'’!|*]/.test(ch)) w += 0.27;
    else if (/[fjrt()\-]/.test(ch)) w += 0.36;
    else if (/[mwMW]/.test(ch)) w += 0.86;
    else if (/[A-Z]/.test(ch)) w += 0.68;
    else w += 0.56;
  }
  return w;
}
/** How many lines `s` wraps to at `size` in `width`, word by word. */
function lineCount(s: string, size: number, width: number): number {
  let lines = 1, cur = 0;
  for (const word of s.split(/\s+/)) {
    const w = emWidth(word) * size, space = 0.27 * size;
    if (cur === 0) cur = w;
    else if (cur + space + w <= width) cur += space + w;
    else { lines += 1; cur = w; }
  }
  return lines;
}
/** A name at 112 on one line, else the largest step that fits, down to 60 at
 *  three lines (the design's rule for long titles). */
function nameSize(s: string): number {
  for (const [size, max] of [[112, 1], [96, 1], [80, 2], [68, 2], [60, 3]] as const) {
    if (lineCount(s, size, 520) <= max) return size;
  }
  return 52;
}
/** A sentence at 60, at most four lines. */
function lineSize(s: string): number {
  for (const size of [60, 54, 48]) if (lineCount(s, size, 520) <= 4) return size;
  return 44;
}

// ---------------------------------------------------------------------------
// The canvas and the copy column
// ---------------------------------------------------------------------------

function canvas(c: PreviewColors): Node {
  // The app's canvas: its gradient, and a dot every 40px (Figma's tile).
  const dots: string[] = [];
  for (let y = 20; y < LINK.height; y += 40) for (let x = 20; x < LINK.width; x += 40) dots.push(`<circle cx="${x}" cy="${y}" r="1.5"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LINK.width}" height="${LINK.height}" viewBox="0 0 ${LINK.width} ${LINK.height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.canvasTop}"/><stop offset="1" stop-color="${c.canvasBottom}"/></linearGradient></defs>
    <rect width="${LINK.width}" height="${LINK.height}" fill="url(#g)"/><g fill="${esc(c.dot)}">${dots.join('')}</g></svg>`;
  return img(svgURI(svg), LINK.width, LINK.height, { position: 'absolute', left: 0, top: 0 });
}

function copyColumn(input: LinkInput, c: PreviewColors, brand: Brand): Node {
  const { copy } = input;
  const name = copy.headingKind === 'name';
  const size = name ? nameSize(copy.heading) : lineSize(copy.heading);
  // Inter has no →: draw it, as the share card draws its check.
  const arrow = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="${esc(c.brand)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const dot = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="${esc(c.brand)}"/></svg>`);
  const message: Child[] = [
    h('div', { display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 1.76, textTransform: 'uppercase', color: c.brand }, copy.kicker),
    // Room under the last line, so a descender ("y" in Doomsday) never clips.
    h('div', { display: 'flex', fontSize: size, fontWeight: 600, lineHeight: name && size >= 96 ? 1 : 1.04,
      letterSpacing: -0.03 * size, color: c.foreground, paddingBottom: Math.round(size * 0.08) }, copy.heading),
  ];
  if (copy.sub) {
    message.push(h('div', { display: 'flex', width: copy.subWidth || 520, fontSize: 30, lineHeight: 1.28, letterSpacing: -0.15, color: c.muted }, copy.sub));
  }
  return h('div', { position: 'absolute', left: 72, top: 56, width: 520, height: 518, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    h('div', { display: 'flex', alignItems: 'center', gap: 8 },
      img(brand.mark, 23.347, 44),
      img(brand.word, 221.712, 41.5)),
    h('div', { display: 'flex', flexDirection: 'column', gap: name ? 18 : 20 }, ...message),
    h('div', { display: 'flex', alignItems: 'center', gap: 14 },
      img(dot, 16, 16),
      h('div', { display: 'flex', fontSize: 28, fontWeight: 500, letterSpacing: -0.28, color: c.foreground }, input.site),
      img(arrow, 28, 28)));
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

/** A poster on its own (guide and character previews): its color under the
 *  image, rounded, with the app's elevation-pop shadow. */
function poster(p: PosterArt, x: number, y: number, w: number, hgt: number, radius: number): Node {
  return h('div', { position: 'absolute', left: x, top: y, width: w, height: hgt, display: 'flex', borderRadius: radius,
    overflow: 'hidden', backgroundColor: p.color, boxShadow: '0 10px 22px rgba(0, 0, 0, 0.45)' },
  img(p.src, w, hgt, { objectFit: 'cover' }));
}

function nodeDot(cx: number, cy: number, size: number, stroke: number, ring: string, fill: string): Node {
  const r = (size - stroke) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${esc(fill)}" stroke="${esc(ring)}" stroke-width="${stroke}"/></svg>`;
  return img(svgURI(svg), size, size, { position: 'absolute', left: cx - size / 2, top: cy - size / 2 });
}

function threadsLayer(paths: { d: string; color: string }[]): Node {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LINK.width}" height="${LINK.height}" viewBox="0 0 ${LINK.width} ${LINK.height}">${
    paths.map((p) => `<path d="${p.d}" fill="none" stroke="${esc(p.color)}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
  return img(svgURI(svg), LINK.width, LINK.height, { position: 'absolute', left: 0, top: 0 });
}

/** A smooth line through points (Catmull-Rom as cubic Béziers). */
function smooth(pts: [number, number][]): string {
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}
/** The Spatial view's link: leaves and arrives level. */
const level = (a: [number, number], b: [number, number]) => {
  const mx = r1((a[0] + b[0]) / 2);
  return `M${r1(a[0])} ${r1(a[1])} C${mx} ${r1(a[1])} ${mx} ${r1(b[1])} ${r1(b[0])} ${r1(b[1])}`;
};

// The Spatial card (src/app/spatial-card.tsx; Figma "Spatial card", 170 ×
// 330 at rest), at a scale: poster at 2:3, the connections count, the title
// on two lines at most, and the phase dot with the year.
const CONN_ICON = '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/>';

function spatialCard(card: CardInfo, x: number, y: number, s: number, c: PreviewColors): Node {
  const veil = c.onImageBase.startsWith('#')
    ? `rgba(${parseInt(c.onImageBase.slice(1, 3), 16)}, ${parseInt(c.onImageBase.slice(3, 5), 16)}, ${parseInt(c.onImageBase.slice(5, 7), 16)}, 0.78)` : c.onImageBase;
  const icon = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${esc(c.onImage)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${CONN_ICON}</svg>`);
  const b = s;
  const w = 170 * s, inner = w - 2 * b;
  const chip = card.connections > 0
    ? h('div', { position: 'absolute', left: 8 * s, top: 8 * s, height: 24 * s, display: 'flex', alignItems: 'center', gap: 4 * s, padding: `0 ${8 * s}px`,
      borderRadius: 12 * s, backgroundColor: veil, boxShadow: `0 ${2 * s}px ${8 * s}px rgba(0, 0, 0, 0.45)` },
    img(icon, 11 * s, 11 * s),
    h('div', { display: 'flex', fontSize: 11 * s, fontWeight: 600, lineHeight: 1.5, color: c.onImage }, String(card.connections)))
    : h('div', { display: 'none' });
  return h('div', { position: 'absolute', left: x, top: y, width: w, height: 330 * s, display: 'flex', flexDirection: 'column',
    backgroundColor: c.card, border: `${b}px solid ${c.border}`, borderRadius: 10 * s, overflow: 'hidden',
    boxShadow: `0 ${8 * s}px ${20 * s}px ${-12 * s}px rgba(20, 24, 40, 0.25), 0 ${s}px ${2 * s}px rgba(20, 24, 40, 0.06)` },
  h('div', { position: 'relative', display: 'flex', width: inner, height: 252 * s, backgroundColor: card.poster.color },
    img(card.poster.src, inner, 252 * s, { objectFit: 'cover' }),
    chip),
  h('div', { display: 'flex', flexDirection: 'column', gap: 4 * s, padding: `${8 * s}px ${12 * s}px` },
    h('div', { display: 'block', width: 128 * s, fontSize: 15 * s, fontWeight: 500, lineHeight: 1.3, letterSpacing: -0.4 * s, color: c.foreground, lineClamp: 2 }, card.name),
    h('div', { display: 'flex', alignItems: 'center', gap: 5 * s },
      h('div', { display: 'flex', width: 7 * s, height: 7 * s, borderRadius: 3.5 * s, backgroundColor: card.phaseColor }),
      h('div', { display: 'flex', fontSize: 11 * s, lineHeight: 1.35, color: c.muted }, String(card.year)))));
}

// ---------------------------------------------------------------------------
// The three pictures
// ---------------------------------------------------------------------------

// Hub: Figma OG · Title. The middle card at 1.04, the satellites at 0.7:
// top left, bottom left, right. Parallel threads 26px apart, center to
// center, so each stays distinct at feed size.
const CENTER = { x: 836, y: 126, s: 1.04 };
const SATS = [
  { x: 650, y: 40, from: [924.4, 224.4], to: [709.5, 106] },
  { x: 652, y: 360, from: [924.4, 284], to: [711.5, 427.6] },
  { x: 1062, y: 214, from: [924.4, 280.4], to: [1121.5, 300] },
] as const;
// Threads that run on out of the frame from each satellite: the titles
// connect further than the picture shows.
const ONWARD: [number, number][][] = [
  [[709.5, 118], [900, -40]],
  [[711.5, 450], [880, 700], [711.5, 468], [560, 700]],
  [[1121.5, 300], [1290, 150], [1121.5, 314], [1290, 580]],
];

function hubArt(art: Extract<LinkArt, { layout: 'hub' }>, c: PreviewColors): Node[] {
  const paths: { d: string; color: string }[] = [];
  art.satellites.slice(0, 3).forEach((sat, i) => {
    const slot = SATS[i];
    sat.threads.slice(0, i === 2 ? 2 : 3).forEach((color, k) => {
      paths.push({ d: level([slot.from[0], slot.from[1] + 26 * k], [slot.to[0], slot.to[1] + 26 * k]), color });
    });
    const out = ONWARD[i];
    for (let j = 0; j + 1 < out.length; j += 2) {
      const color = sat.onward[j / 2] || sat.threads[0];
      if (color) paths.push({ d: level(out[j], out[j + 1]), color });
    }
  });
  const sats = art.satellites.slice(0, 3).map((sat, i) => spatialCard(sat.card, SATS[i].x, SATS[i].y, 0.7, c));
  return [threadsLayer(paths), ...sats, spatialCard(art.center, CENTER.x, CENTER.y, CENTER.s, c)];
}

// Guide: Figma OG · Guide (up to 5 stops: 92 × 138, 78 apart, climbing 56)
// and OG · Guide · long (6 to 10: 76 × 114, 46 apart, climbing 36). The last
// poster is larger (140 × 210, or 120 × 180) and ends the climb at the top
// right; an event guide's release gets the date chip. Each stop is pinned at
// its bottom center.
//
// More than nine climbing stops (OG · Guide · longer, 11 to 14 stops): the
// same climb as the long layout, from its first stop's corner to its last, cut
// into more steps. Steps, posters and nodes shrink by 8 ÷ (stops − 1), and the
// last small poster keeps the long layout's right edge (Notion "Guide link
// preview: a layout for more than ten stops", 2026-11-23).
const LONG_STEPS = 9;
function guideArt(art: Extract<LinkArt, { layout: 'guide' }>, c: PreviewColors): Node[] {
  const n = art.stops.length;
  const long = { w: 76, h: 114, dx: 46, dy: 36, lastX: 980, lastY: 164, node: 18, ring: 4.5, big: { x: 1020, y: 44, w: 120, h: 180, node: 24, ring: 6 } };
  const k = n > LONG_STEPS ? (LONG_STEPS - 1) / (n - 1) : 1;
  const g = n > LONG_STEPS
    ? { ...long, w: Math.round(long.w * k), h: Math.round(long.h * k), dx: long.dx * k, dy: long.dy * k,
      lastX: long.lastX + long.w - Math.round(long.w * k), node: Math.round(long.node * k), ring: Math.round(long.ring * k * 2) / 2 }
    : art.long ? long
      : { w: 92, h: 138, dx: 78, dy: 56, lastX: 924, lastY: 206, node: 20, ring: 5, big: { x: 1000, y: 44, w: 140, h: 210, node: 26, ring: 6 } };
  const at = (i: number): [number, number] => [g.lastX - (n - 1 - i) * g.dx, g.lastY + (n - 1 - i) * g.dy];
  const nodes = art.stops.map((_, i) => { const [x, y] = at(i); return [x + g.w / 2, y + g.h] as [number, number]; });
  const bigNode: [number, number] = [g.big.x + g.big.w / 2, g.big.y + g.big.h];
  const first = nodes[0] || bigNode;
  const path = smooth([[first[0] - 100, first[1] + 115], ...nodes, bigNode]);
  const out: Node[] = [threadsLayer([{ d: path, color: c.brand }])];
  art.stops.forEach((p, i) => {
    const [x, y] = at(i);
    out.push(poster(p, x, y, g.w, g.h, 10), nodeDot(nodes[i][0], nodes[i][1], g.node, g.ring, c.brand, c.card));
  });
  out.push(poster(art.last, g.big.x, g.big.y, g.big.w, g.big.h, 10), nodeDot(bigNode[0], bigNode[1], g.big.node, g.big.ring, c.brand, c.card));
  if (art.chip) {
    out.push(h('div', { position: 'absolute', left: g.big.x + 10, top: g.big.y + 10, display: 'flex', padding: '6px 12px', borderRadius: 999,
      backgroundColor: c.brand, color: c.onColor, fontSize: 22, fontWeight: 600 }, art.chip));
  }
  return out;
}

// Character: Figma OG · Character. Two rows of ceil((titles + 1) / 2) slots
// in 520 (80 × 120 posters, 88 apart, at most), the portrait in the first;
// the first row runs left to right, the thread turns down on the right, and
// the second row runs back. The thread sags slightly between nodes. A
// character in five titles or fewer takes one row, mid-height (the design
// shows a long career; a short one would leave a lone poster on row two).
function charArt(art: Extract<LinkArt, { layout: 'char' }>, c: PreviewColors): Node[] {
  // Up to five titles fit one row with the portrait: it sits mid-height.
  const oneRow = art.posters.length + 1 <= 6;
  const perRow = oneRow ? 6 : Math.ceil((art.posters.length + 1) / 2);
  const w = Math.min(80, 520 / (perRow * 1.1 - 0.1)), hgt = w * 1.5, pitch = w * 1.1, k = w / 80;
  const rowCenter = oneRow ? [315, 315] : [200, 430];
  const slot = (j: number): [number, number] => {
    const row = j < perRow ? 0 : 1;
    const col = row === 0 ? j : perRow - 1 - (j - perRow);
    return [620 + col * pitch, rowCenter[row] - hgt / 2];
  };
  const portrait = 84 * k;
  const p0 = slot(0);
  const pcx = p0[0] + w / 2, pcy = rowCenter[0];
  const start: [number, number] = [pcx, pcy + portrait / 2 + 4 * k];
  const nodes = art.posters.map((_, i) => { const [x, y] = slot(i + 1); return [x + w / 2, y + hgt] as [number, number]; });
  let d = `M${r1(start[0])} ${r1(start[1])}`;
  let prev = start;
  nodes.forEach((nd, i) => {
    if (i === 0) d += ` C${r1(prev[0])} ${r1(prev[1] + 18 * k)} ${r1(nd[0] - 40 * k)} ${r1(nd[1] + 16 * k)} ${r1(nd[0])} ${r1(nd[1])}`;
    else if (Math.abs(nd[1] - prev[1]) > 1) {
      const bulge = Math.max(prev[0], nd[0]) + 90 * k;
      d += ` C${r1(bulge)} ${r1(prev[1])} ${r1(bulge)} ${r1(nd[1])} ${r1(nd[0])} ${r1(nd[1])}`;
    } else {
      const third = (nd[0] - prev[0]) / 3;
      d += ` C${r1(prev[0] + third)} ${r1(prev[1] + 16 * k)} ${r1(nd[0] - third)} ${r1(nd[1] + 16 * k)} ${r1(nd[0])} ${r1(nd[1])}`;
    }
    prev = nd;
  });
  const out: Node[] = [threadsLayer([{ d, color: art.color }])];
  art.posters.forEach((p, i) => {
    const [x, y] = slot(i + 1);
    out.push(poster(p, x, y, w, hgt, Math.min(10, w / 8)), nodeDot(nodes[i][0], nodes[i][1], 16 * k, 4 * k, art.color, c.card));
  });
  out.push(h('div', { position: 'absolute', left: pcx - portrait / 2, top: pcy - portrait / 2, width: portrait, height: portrait, display: 'flex',
    borderRadius: portrait / 2, border: `${5 * k}px solid ${art.color}`, overflow: 'hidden', backgroundColor: c.card, boxShadow: '0 10px 22px rgba(0, 0, 0, 0.45)' },
  img(art.portrait, portrait - 10 * k, portrait - 10 * k, { objectFit: 'cover' })));
  return out;
}

export function linkCard(input: LinkInput, c: PreviewColors, brand: Brand): Node {
  const art = input.art.layout === 'hub' ? hubArt(input.art, c) : input.art.layout === 'guide' ? guideArt(input.art, c) : charArt(input.art, c);
  return h('div', { position: 'relative', display: 'flex', width: LINK.width, height: LINK.height, overflow: 'hidden', fontFamily: 'Inter', color: c.foreground },
    canvas(c), ...art, copyColumn(input, c, brand));
}

/** An SVG file painted in one color (the logo mark and wordmark, which the
 *  app uses as CSS masks: only their shape matters). */
export function paintSVG(svgText: string, color: string): string {
  return svgURI(svgText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${color}"`)
    .replace(/<svg\b/, `<svg fill="${color}"`));
}
