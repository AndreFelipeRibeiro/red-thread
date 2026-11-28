// The share images: the progress, milestone and guide cards the app draws on
// the visitor's device (1080×1350) when they share (Notion V4 Tasks, "Share
// 2/3"). Redrawn in the app's light style in V5 (Notion "Share images:
// re-create every share card in the new style"; Figma: Social Media and OG
// link preview file, page "4. Share cards – new style", round 1, approved by
// Andre in chat on 2026-11-28).
//
// One layout for every card, as in the link previews: the logo at the top
// left, a message under it (kicker, headline, support line), redthread.tv at
// the bottom, and the red thread climbing to the top right through posters.
// Stops already seen are lit (red thread, red ring); stops still ahead are
// faded, on a gray thread. Two pictures:
//   - phases: six large posters, one per phase, lit as far as the visitor's
//     share of released titles reaches (the progress and all-caught-up
//     cards);
//   - climb: every stop of a guide or a phase, small, then the destination
//     larger at the top right; an event guide's release that is still ahead
//     gets its date chip.
//
// Plain data in (text already translated, colors from the tokens, posters as
// data URIs or none), a Satori layout out: nothing here reads the catalog,
// the language or the network, so it runs in the browser and in tests alike.
import { lineCount } from './link-cards';
import type { Brand, PosterArt } from './link-cards';
import type { ShareColors } from './tokens';

/** A Satori node: the shape of a React element, without React. */
export interface Node {
  type: string;
  props: { style?: Record<string, string | number>; children?: Child | Child[]; src?: string; width?: number; height?: number };
}
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

export interface Fonts { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700; style: 'normal' }

export const CARD = { width: 1080, height: 1350 };

// ---------------------------------------------------------------------------
// What the app hands in
// ---------------------------------------------------------------------------

/** A stop on the thread: its poster (src '' when it couldn't be fetched: the
 *  poster's own color stands in), and whether the visitor has seen it. */
export interface ShareStop { poster: PosterArt; lit: boolean }

export type ShareHeadline =
  /** "34 of 60": the count large, "of 60" beside it. */
  | { kind: 'count'; n: string; of: string }
  /** A guide's name or a milestone's sentence. */
  | { kind: 'line'; text: string };

export type ShareArt =
  | { layout: 'phases'; stops: ShareStop[] }
  | { layout: 'climb'; stops: ShareStop[]; last: ShareStop; chip?: string };

export interface ShareInput {
  site: string;
  kicker: string;
  /** The green seen check before the kicker (a finished guide). */
  check?: boolean;
  headline: ShareHeadline;
  support: string;
  /** The support line's width: 700, or 640 on the all-caught-up card. */
  supportWidth?: number;
  art: ShareArt;
}

// ---------------------------------------------------------------------------
// The canvas, the logo, the message and the address
// ---------------------------------------------------------------------------

function canvas(c: ShareColors): Node {
  // The app's canvas: its gradient, and a dot every 40px (Figma's tile).
  const dots: string[] = [];
  for (let y = 20; y < CARD.height; y += 40) for (let x = 20; x < CARD.width; x += 40) dots.push(`<circle cx="${x}" cy="${y}" r="1.5"/>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.width}" height="${CARD.height}" viewBox="0 0 ${CARD.width} ${CARD.height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.canvasTop}"/><stop offset="1" stop-color="${c.canvasBottom}"/></linearGradient></defs>
    <rect width="${CARD.width}" height="${CARD.height}" fill="url(#g)"/><g fill="${esc(c.dot)}">${dots.join('')}</g></svg>`;
  return img(svgURI(svg), CARD.width, CARD.height, { position: 'absolute', left: 0, top: 0 });
}

/** A sentence headline at 84 (Figma), stepping down when a long name or a
 *  long translation would take more than three lines in 904. */
function lineSize(s: string): number {
  for (const size of [84, 76, 68]) if (lineCount(s, size, 904) <= 3) return size;
  return 60;
}

function message(input: ShareInput, c: ShareColors): Node {
  const kicker = h('div', { display: 'flex', fontSize: 30, fontWeight: 600, letterSpacing: 2.4, textTransform: 'uppercase', color: c.brand }, input.kicker);
  const check = input.check
    ? h('div', { display: 'flex', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.seen },
      // The check is drawn: Inter's Latin subset has no ✓.
      img(svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="${esc(c.seenForeground)}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`), 24, 24))
    : null;
  const hl = input.headline;
  const headline = hl.kind === 'count'
    // Satori has no baseline alignment: both sit on the box's bottom, and "of
    // 60" rises by the difference of their descents at line-height 1 (Inter:
    // 0.136 em), so the two share a baseline as in Figma.
    ? h('div', { display: 'flex', alignItems: 'flex-end', color: c.foreground },
      h('div', { display: 'flex', fontSize: 240, fontWeight: 600, lineHeight: 1, letterSpacing: -9.6 }, hl.n),
      h('div', { display: 'flex', fontSize: 88, fontWeight: 600, lineHeight: 1, letterSpacing: -1.76, color: c.muted, marginLeft: 24, marginBottom: Math.round((240 - 88) * 0.136) }, hl.of))
    : (() => {
      const size = lineSize(hl.text);
      // Room under the last line, so a descender ("y" in Doomsday) never clips.
      return h('div', { display: 'flex', width: 904, fontSize: size, fontWeight: 600, lineHeight: 1.04, letterSpacing: -0.03 * size,
        color: c.foreground, paddingBottom: Math.round(size * 0.06) }, hl.text);
    })();
  return h('div', { position: 'absolute', left: 88, top: 280, display: 'flex', flexDirection: 'column', gap: 24 },
    check ? h('div', { display: 'flex', alignItems: 'center', gap: 14 }, check, kicker) : kicker,
    headline,
    h('div', { display: 'flex', width: input.supportWidth || 700, fontSize: 40, lineHeight: 1.28, color: c.muted }, input.support));
}

function chrome(input: ShareInput, c: ShareColors, brand: Brand): Node[] {
  // Inter has no →: draw it, as the link previews do.
  const arrow = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="${esc(c.brand)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const dot = svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="${esc(c.brand)}"/></svg>`);
  return [
    h('div', { position: 'absolute', left: 88, top: 88, display: 'flex', alignItems: 'center', gap: 11 },
      img(brand.mark, 32, 60),
      img(brand.word, 305, 57)),
    message(input, c),
    h('div', { position: 'absolute', left: 88, top: 1218, height: 44, display: 'flex', alignItems: 'center', gap: 16 },
      img(dot, 20, 20),
      h('div', { display: 'flex', fontSize: 36, fontWeight: 500, letterSpacing: -0.36, color: c.foreground }, input.site),
      img(arrow, 36, 36)),
  ];
}

// ---------------------------------------------------------------------------
// The thread and its stops
// ---------------------------------------------------------------------------

/** A stop's poster: its color under the image (alone when the image couldn't
 *  be fetched), with the app's elevation-pop shadow; faded while ahead. */
function poster(p: PosterArt, x: number, y: number, w: number, hgt: number, lit: boolean): Node {
  const art: Child[] = p.src ? [img(p.src, w, hgt, { objectFit: 'cover' })] : [];
  return h('div', { position: 'absolute', left: x, top: y, width: w, height: hgt, display: 'flex', borderRadius: Math.max(2, Math.round(w * 0.03)),
    overflow: 'hidden', backgroundColor: p.color, boxShadow: '0 10px 22px rgba(0, 0, 0, 0.32)', opacity: lit ? 1 : 0.35 }, ...art);
}

// The thread, 4.5 px, and the rings at its stops, 4 px: half the old 6 px
// would be the app's 3 px guide line, but a 1080 px card is seen at about a
// third of its size, where 3 px read too thin (Andre, 2026-11-28; Notion
// "Social images: thinner thread lines, as in the app").
const THREAD = 4.5, RING = 4;

/** The ring at a stop's foot: red once seen, gray while ahead. */
function ring(cx: number, cy: number, size: number, lit: boolean, c: ShareColors): Node {
  const stroke = RING, r = (size - stroke) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${esc(c.card)}" stroke="${esc(lit ? c.brand : c.borderStrong)}" stroke-width="${stroke}"/></svg>`;
  return img(svgURI(svg), size, size, { position: 'absolute', left: r1(cx - size / 2), top: r1(cy - size / 2) });
}

/** The thread through the nodes: red up to the last stop seen, gray on. It
 *  enters steeply from below the card, so it never crosses redthread.tv. */
function thread(nodes: [number, number][], litUpTo: number, c: ShareColors): Node {
  const first = nodes[0];
  const start: [number, number] = [r1(first[0] - (1430 - first[1]) * 0.35), 1430];
  const pts = [start, ...nodes];
  // pts[k] is node k-1: the lit part runs from the entry to the last lit node.
  const cut = litUpTo + 1;
  const line = (from: number, to: number, color: string) => (to > from
    ? `<polyline points="${pts.slice(from, to + 1).map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ')}" fill="none" stroke="${esc(color)}" stroke-width="${THREAD}" stroke-linecap="round" stroke-linejoin="round"/>` : '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD.width}" height="${CARD.height}" viewBox="0 0 ${CARD.width} ${CARD.height}">${
    line(cut, pts.length - 1, c.borderStrong)}${line(0, cut, c.brand)}</svg>`;
  return img(svgURI(svg), CARD.width, CARD.height, { position: 'absolute', left: 0, top: 0 });
}

/** The index of the last lit stop before the first one ahead, or -1: the red
 *  thread stops there (a lit stop after a gap stays lit, on gray). */
function litRun(stops: ShareStop[]): number {
  let k = -1;
  while (k + 1 < stops.length && stops[k + 1].lit) k++;
  return k;
}

// Phases: Figma "progress · 34 of 60": six 112 × 168 posters, 104 apart,
// climbing 64, the first at (420, 1028).
function phasesArt(art: Extract<ShareArt, { layout: 'phases' }>, c: ShareColors): Node[] {
  const w = 112, hgt = 168, node = 29;
  const at = (i: number): [number, number] => [420 + i * 104, 1028 - i * 64];
  const nodes = art.stops.map((_, i) => { const [x, y] = at(i); return [x + w / 2, y + hgt] as [number, number]; });
  const out: Node[] = [thread(nodes, litRun(art.stops), c)];
  art.stops.forEach((s, i) => {
    const [x, y] = at(i);
    out.push(poster(s.poster, x, y, w, hgt, s.lit), ring(nodes[i][0], nodes[i][1], node, s.lit, c));
  });
  return out;
}

// Climb: Figma "guide complete · event" (12 stops, 76 × 114, 38 apart,
// climbing 30, the first one's top at 1116 and the last small one's at 786)
// and "phase complete" (14 stops, smaller and closer). Every climb keeps that
// diagonal: the first stop at x 420, the last small one 418 further right, so
// a short guide spreads out with larger posters (at most 96 wide, 104 apart)
// and a long one packs closer with smaller ones (at least 48). The
// destination (136 × 204) sits at the top right, its left edge 0.3 of a small
// poster past the last small one. More than eighteen small stops: the
// earliest are left out (the thread still enters from below, as if they were
// there).
const MAX_CLIMB = 18;
function climbArt(art: Extract<ShareArt, { layout: 'climb' }>, c: ShareColors): Node[] {
  const stops = art.stops.slice(-MAX_CLIMB);
  const n = stops.length;
  const dx = n > 1 ? Math.min(104, 418 / (n - 1)) : 104;
  // The first stop's top stays at 1116 and the last small one's at 786, so
  // the thread always enters below the address, however few the stops.
  const dy = n > 1 ? 330 / (n - 1) : 0;
  const w = Math.min(96, Math.max(48, Math.round(dx * 2)));
  const hgt = Math.round(w * 1.5), node = Math.round(w * 0.27);
  const at = (i: number): [number, number] => [420 + i * dx, 1116 - i * dy];
  const nodes = stops.map((_, i) => { const [x, y] = at(i); return [x + w / 2, y + hgt] as [number, number]; });
  const big = { x: (n ? at(n - 1)[0] : 420) + Math.round(w * 0.3), y: 654, w: 136, h: 204, node: 35 };
  const bigNode: [number, number] = [big.x + big.w / 2, big.y + big.h];
  const all = [...stops, art.last];
  const out: Node[] = [thread([...nodes, bigNode], litRun(all), c)];
  stops.forEach((s, i) => {
    const [x, y] = at(i);
    out.push(poster(s.poster, x, y, w, hgt, s.lit), ring(nodes[i][0], nodes[i][1], node, s.lit, c));
  });
  // The destination is never faded: it is what the guide is for, even ahead.
  out.push(poster(art.last.poster, big.x, big.y, big.w, big.h, true), ring(bigNode[0], bigNode[1], big.node, art.last.lit, c));
  if (art.chip) {
    out.push(h('div', { position: 'absolute', left: big.x + 20, top: big.y - 22, display: 'flex', padding: '10px 20px', borderRadius: 999,
      backgroundColor: c.brand, color: c.onColor, fontSize: 28, fontWeight: 600, lineHeight: 1.21 }, art.chip));
  }
  return out;
}

export function shareCard(input: ShareInput, c: ShareColors, brand: Brand): Node {
  const art = input.art.layout === 'phases' ? phasesArt(input.art, c) : climbArt(input.art, c);
  return h('div', { position: 'relative', display: 'flex', width: CARD.width, height: CARD.height, overflow: 'hidden', fontFamily: 'Inter', color: c.foreground },
    canvas(c), ...art, ...chrome(input, c, brand));
}
