// The share images (Notion V4 Tasks, "Share 2/3"): the progress and guide
// cards the app renders on the visitor's device (1080×1350). Each template
// takes text that is already translated and colours from the token file
// (tokens.ts), and returns a layout for Satori, which turns it into an SVG
// with the text as outlines. Nothing here reads the catalog, the language or
// the page, so the same code runs in Node and in the browser. The link
// previews (1200×630) have their own templates since V5: link-cards.ts.
//
// No studio imagery: titles are drawn as the app's own cards in their phase
// colours.
import type { CardColors } from './tokens';

/** A Satori node: the shape of a React element, without React. */
export interface Node {
  type: string;
  props: { style?: Record<string, string | number>; children?: Child | Child[]; src?: string; width?: number; height?: number };
}
type Child = Node | string;

function h(type: string, style: Record<string, string | number>, ...children: Child[]): Node {
  return { type, props: { style, children: children.length === 1 ? children[0] : children } };
}
function img(src: string, width: number, height: number, style: Record<string, string | number> = {}): Node {
  return { type: 'img', props: { src, width, height, style: { width, height, ...style } } };
}
const svgURI = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** The logo mark (src/assets/logo-mark.svg) painted in one colour. The app
 *  uses the file as a mask, so only its shape matters: every fill and stroke
 *  becomes the colour, and shapes with no paint of their own get it too. The
 *  cards draw it in a square box, which stretches a mark that isn't square
 *  (the push pin is tall), so its viewBox is widened to a centred square. */
export function logoMark(svgText: string, color: string): string {
  const painted = svgText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${color}"`)
    .replace(/<svg\b/, `<svg fill="${color}"`)
    .replace(/viewBox="([^"]+)"/, (all, box: string) => {
      const [x, y, w, h] = box.trim().split(/[\s,]+/).map(Number);
      if (![x, y, w, h].every(Number.isFinite) || w === h) return all;
      const side = Math.max(w, h);
      return `viewBox="${x - (side - w) / 2} ${y - (side - h) / 2} ${side} ${side}"`;
    });
  return svgURI(painted);
}

export interface Fonts { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' }

// ---------------------------------------------------------------------------
// The share card, 1080×1350 (Stories and chat): my progress, finished a guide
// ---------------------------------------------------------------------------

export const CARD = { width: 1080, height: 1350 };

function cardFrame(c: CardColors, logo: string, appName: string, site: string, ...body: Child[]): Node {
  return h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 1080, height: 1350,
    padding: '84px 88px', background: c.background, color: c.foreground, fontFamily: 'Inter' },
    h('div', { display: 'flex', alignItems: 'center', gap: 20 },
      img(logo, 64, 64),
      h('div', { fontSize: 44, fontWeight: 600, letterSpacing: -0.5 }, appName)),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }, ...body),
    h('div', { display: 'flex', justifyContent: 'center', fontSize: 34, fontWeight: 600, color: c.muted }, site));
}

function ringSVG(fraction: number, color: string, track: string, size = 520, stroke = 44): string {
  const r = (size - stroke) / 2, len = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${esc(track)}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${esc(color)}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${f * len} ${len}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export interface ProgressInput {
  appName: string; site: string;
  seen: number; total: number;
  /** "of 60 released titles seen" */
  caption: string;
  /** "Marvel films and series" */
  footnote: string;
}

export function progressCard(p: ProgressInput, c: CardColors, logo: string): Node {
  const ring = h('div', { display: 'flex', position: 'relative', width: 520, height: 520, alignItems: 'center', justifyContent: 'center' },
    img(svgURI(ringSVG(p.total ? p.seen / p.total : 0, c.seen, c.card)), 520, 520, { position: 'absolute', left: 0, top: 0 }),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      h('div', { fontSize: 168, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }, String(p.seen)),
      h('div', { fontSize: 40, fontWeight: 600, color: c.muted, marginTop: 8 }, '/ ' + p.total)));
  return cardFrame(c, logo, p.appName, p.site,
    ring,
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
      h('div', { fontSize: 56, fontWeight: 700, letterSpacing: -1, textAlign: 'center' }, p.caption),
      h('div', { fontSize: 36, color: c.muted, textAlign: 'center' }, p.footnote)));
}

export interface GuideDoneInput {
  appName: string; site: string;
  guideColor: string;
  /** "Complete" */
  label: string;
  name: string;
  /** "47 days to Avengers: Doomsday", or the guide's kind and size. */
  line: string;
  /** Phase colours of the guide's stops, in order, for the strip of cards. */
  stops: string[];
}

function guideArtSVG(color: string, size: number): string {
  const d = size / 7;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${esc(color)}"/><stop offset="1" stop-color="#14121a"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>
    <circle cx="${d * 1.8}" cy="${size - d * 1.8}" r="${d * 0.55}" fill="#fff" opacity="0.7"/>
    <circle cx="${d * 3.3}" cy="${size - d * 2.8}" r="${d * 0.55}" fill="#fff" opacity="0.5"/>
    <circle cx="${d * 4.8}" cy="${size - d * 3.8}" r="${d * 0.55}" fill="#fff" opacity="0.35"/>
  </svg>`;
}

export function guideDoneCard(g: GuideDoneInput, c: CardColors, logo: string): Node {
  const strip = h('div', { display: 'flex', gap: 14, justifyContent: 'center' },
    ...g.stops.slice(0, 8).map((col) => h('div', { display: 'flex', flexDirection: 'column', width: 84, height: 118, borderRadius: 12,
      background: c.card, border: `2px solid ${c.border}`, overflow: 'hidden' },
      h('div', { display: 'flex', height: 52, background: col }),
      h('div', { display: 'flex', margin: '14px 10px 0', height: 9, borderRadius: 5, background: c.foreground, opacity: 0.8 }))));
  return cardFrame(c, logo, g.appName, g.site,
    img(svgURI(guideArtSVG(g.guideColor, 260)), 260, 260),
    h('div', { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px 14px 26px', borderRadius: 999, background: c.seen, color: c.background, fontSize: 38, fontWeight: 700 },
      // The check is drawn: Inter's Latin subset has no ✓.
      img(svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="${esc(c.background)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`), 40, 40),
      g.label),
    h('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 },
      h('div', { fontSize: g.name.length > 34 ? 62 : 76, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5, textAlign: 'center' }, g.name),
      h('div', { fontSize: 38, color: c.muted, textAlign: 'center' }, g.line)),
    strip);
}
