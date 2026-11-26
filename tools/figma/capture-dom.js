// Reads a rendered piece of the app into a compact spec that
// tools/figma/build.js turns into a Figma component bound to the design
// system's variables (Notion "Build the Red Thread component library in
// Figma"). Development only: the dev server serves this file, and nothing in
// the app imports it.
//
// In the browser (the app running on the dev server):
//   const X = await import('/tools/figma/capture-dom.js');
//   X.capture(document.querySelector('.card'), { name: 'Spatial card' })
//
// The element is read twice, in the light and the dark theme, and every color
// is matched to the one token that gives the same color in both themes (with
// the same opacity), every shadow to an elevation token, every text to its
// type role (the nearest text-* class) and every padding, gap and radius to a
// spacing or radius step. What has no token is kept as a raw value and listed
// in `warnings`, so a gap between the code and the tokens shows up instead of
// being copied silently.

import { iconName } from './icons.js';

const COLOR_TOKENS = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
  'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring', 'brand',
  'logo', 'progress', 'progress-track', 'seen', 'seen-foreground', 'seen-text',
  'status-watch', 'on-color', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6',
  'on-image', 'on-image-dim', 'on-image-muted', 'on-image-ground', 'on-image-base', 'imdb', 'rt',
  'rt-text', 'canvas-top', 'canvas-bottom', 'canvas-dot', 'field', 'button-outline',
  'destructive-tint', 'switch-track', 'switch-thumb', 'invalid-border', 'invalid-ring',
  'dim', 'brand-text', 'status-watch-text', 'status-watch-tint', 'status-watch-tint-strong', 'seen-hover',
  'secondary-hover', 'highlight-border', 'control-surface', 'chip', 'chip-border', 'chip-imdb', 'chip-rt',
  'chip-muted', 'brand-tint', 'brand-tint-strong', 'seen-tint', 'seen-tint-strong', 'neutral-tint', 'veil',
  'veil-light', 'border-strong', 'seen-border', 'seen-line', 'brand-border', 'status-watch-border',
  'destructive-border', 'field-hover', 'segment-on',
];
// When several tokens give the same colors, the first that fits the property wins
// (unless the element's own classes name one).
const PREFER = {
  fill: ['field', 'button-outline', 'switch-thumb', 'background', 'card', 'popover', 'muted', 'secondary', 'accent', 'primary', 'brand', 'seen', 'border', 'input'],
  text: ['foreground', 'card-foreground', 'popover-foreground', 'muted-foreground', 'primary-foreground', 'secondary-foreground', 'accent-foreground', 'brand', 'seen-text'],
  stroke: ['invalid-border', 'invalid-ring', 'border', 'input', 'ring', 'brand'],
};
const ELEVATIONS = ['mark', 'mark-lg', 'card', 'card-hover', 'float', 'pop', 'lift'];
const TW_SHADOWS = {
  'shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};
const TEXT_ROLES = ['display', 'title', 'heading', 'body', 'label', 'caption', 'card-title-lg', 'card-title-pop',
  'card-title-ov', 'card-title', 'card-meta-lg', 'card-meta-pop', 'card-meta', 'card-micro', 'tag', 'numeral-word', 'numeral'];
const ART = new Set(['card-title', 'card-title-lg', 'card-title-pop', 'card-title-ov', 'card-meta', 'card-meta-lg',
  'card-meta-pop', 'card-micro', 'tag', 'numeral', 'numeral-word']);
const RADII = { 'radius-sm': 6, 'radius-md': 8, 'radius-lg': 10, 'radius-xl': 14, 'radius-2xl': 18, 'radius-3xl': 22, 'radius-4xl': 26 };
const SPACING = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16];

const r1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Colors: any CSS color (oklch, color-mix, …) to 8-bit RGBA through a canvas.
// ---------------------------------------------------------------------------
const cv = document.createElement('canvas');
cv.width = cv.height = 1;
const cx = cv.getContext('2d', { willReadFrequently: true });
function rgba(css) {
  if (!css || css === 'transparent' || css === 'none') return null;
  cx.clearRect(0, 0, 1, 1);
  cx.fillStyle = '#000';
  cx.fillStyle = css;
  cx.fillRect(0, 0, 1, 1);
  const d = cx.getImageData(0, 0, 1, 1).data;
  if (d[3] === 0) return null;
  return [d[0], d[1], d[2], Math.round((d[3] / 255) * 100) / 100];
}
// A faint color reads back from the canvas with a coarse RGB: allow for it.
const near = (a, b, t = Math.max(2, 1.5 / Math.max(0.05, Math.min(a[3], b[3])))) => Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t && Math.abs(a[2] - b[2]) <= t;

// ---------------------------------------------------------------------------
// Themes: everything is read with transitions off, in light then dark.
// ---------------------------------------------------------------------------
const html = document.documentElement;
function withTheme(dark, fn) {
  const had = html.classList.contains('dark');
  html.classList.toggle('dark', dark);
  try { return fn(); } finally { html.classList.toggle('dark', had); }
}
function freeze() {
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(s);
  return () => s.remove();
}

let TOKENS = null;
function tokens() {
  if (TOKENS) return TOKENS;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:-99px;top:0;width:4px;height:4px';
  document.body.appendChild(probe);
  const read = () => {
    const colors = {};
    for (const t of COLOR_TOKENS) { probe.style.color = `var(--${t})`; colors[t] = rgba(getComputedStyle(probe).color); }
    const shadows = {};
    for (const e of ELEVATIONS) { probe.style.boxShadow = `var(--elevation-${e})`; shadows['elevation-' + e] = cleanShadow(getComputedStyle(probe).boxShadow); }
    for (const [k, v] of Object.entries(TW_SHADOWS)) { probe.style.boxShadow = v; shadows['tailwind/' + k] = cleanShadow(getComputedStyle(probe).boxShadow); }
    probe.style.boxShadow = '';
    return { colors, shadows };
  };
  const undo = freeze();
  const L = withTheme(false, read), D = withTheme(true, read);
  undo();
  probe.remove();
  TOKENS = { L, D };
  return TOKENS;
}

/** The token for a color seen as `l` in light and `d` in dark, or null. */
function matchColor(l, d, kind, el) {
  if (!l && !d) return null;
  const T = tokens();
  const hits = [];
  for (const t of COLOR_TOKENS) {
    const tl = T.L.colors[t], td = T.D.colors[t];
    // A transparent value (null) only matches a transparent token.
    const eq = (x, y) => (!x && !y) || (!!x && !!y && near(x, y));
    if (!eq(l, tl) || !eq(d, td) || (!tl && !td)) continue;
    const ol = l && tl ? l[3] / tl[3] : null, od = d && td ? d[3] / td[3] : null;
    if (ol != null && od != null && Math.abs(ol - od) > 0.03) continue;
    const o = ol != null ? ol : od;
    if (o > 1.02) continue;
    hits.push({ v: t, o: Math.round(o * 100) / 100 });
  }
  if (!hits.length) return null;
  const cls = String(el && el.getAttribute && el.getAttribute('class') || '');
  const sty = String(el && el.getAttribute && el.getAttribute('style') || '');
  const named = hits.find((h) => new RegExp(`(^|\\s)(bg|text|border|ring|fill|stroke|from|to)-(\\(--)?${h.v}(\\))?(/|\\s|$)`).test(cls)
    || new RegExp(`var\\(--${h.v}\\)`).test(sty));
  if (named) return named;
  for (const p of PREFER[kind] || []) { const h = hits.find((x) => x.v === p); if (h) return h; }
  return hits[0];
}

function paint(l, d, kind, el, warnings, where) {
  if (!l && !d) return undefined;
  const m = matchColor(l, d, kind, el);
  if (m) return m.o >= 0.995 ? { v: m.v } : m;
  warnings.push(`${where}: ${kind} ${JSON.stringify(l)} / ${JSON.stringify(d)} has no token`);
  return { c: l || d, cd: d || l };
}

// Tailwind writes empty ring layers into every box-shadow; they draw nothing.
const cleanShadow = (v) => !v || v === 'none' ? 'none'
  : v.split(/,(?![^(]*\))/).map((x) => x.trim()).filter((x) => !/^rgba\(0, 0, 0, 0\) 0px 0px 0px 0px$/.test(x)).join(', ') || 'none';
function shadowOf(sl, sd, warnings, where) {
  sl = cleanShadow(sl); sd = cleanShadow(sd);
  if (sl === 'none' && sd === 'none') return undefined;
  const T = tokens();
  for (const k of Object.keys(T.L.shadows)) if (T.L.shadows[k] === sl && T.D.shadows[k] === sd) return { v: k };
  warnings.push(`${where}: shadow "${sl}" / "${sd}" has no token`);
  return { raw: sl, rawD: sd };
}

// ---------------------------------------------------------------------------
// Reading one element in one theme.
// ---------------------------------------------------------------------------
function look(el) {
  const s = getComputedStyle(el);
  return {
    bg: rgba(s.backgroundColor), img: s.backgroundImage !== 'none' ? s.backgroundImage : null,
    color: rgba(s.color), shadow: s.boxShadow,
    bt: parseFloat(s.borderTopWidth), br: parseFloat(s.borderRightWidth), bb: parseFloat(s.borderBottomWidth), bl: parseFloat(s.borderLeftWidth),
    bc: rgba(s.borderTopColor) || rgba(s.borderLeftColor) || rgba(s.borderBottomColor),
    stroke: el instanceof SVGElement ? rgba(s.stroke) : null, fill: el instanceof SVGElement ? rgba(s.fill) : null,
    opacity: parseFloat(s.opacity),
  };
}

function textRole(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const cls = String(e.getAttribute('class') || '');
    for (const r of TEXT_ROLES) if (new RegExp(`(^|\\s)text-${r}(/\\S+)?(\\s|$)`).test(cls)) return r;
  }
  return null;
}

const visible = (el) => {
  const s = getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0;
};
const isText = (n) => n.nodeType === 3 && n.textContent.replace(/\s+/g, '').length > 0;
const inlineOnly = (el) => [...el.childNodes].every((n) => n.nodeType === 3 || (n.nodeType === 1 && ['inline', 'contents'].includes(getComputedStyle(n).display) && !n.querySelector('svg,img') && n.tagName !== 'SVG' && n.tagName !== 'IMG' && inlineOnly(n)));

function spaceStep(px) {
  if (!px) return null;
  const u = px / 4;
  return SPACING.includes(u) ? 'spacing-' + String(u).replace('.', '_') : null;
}
function radiusStep(px) {
  for (const [k, v] of Object.entries(RADII)) if (Math.abs(v - px) < 0.3) return k;
  return null;
}

function fontOf(s) {
  const fam = /Instrument Serif|Georgia/.test(s.fontFamily) ? 'display' : 'sans';
  const lh = s.lineHeight === 'normal' ? null : r1(parseFloat(s.lineHeight));
  return {
    fam, fs: r1(parseFloat(s.fontSize)), fw: parseInt(s.fontWeight, 10), lh,
    ls: s.letterSpacing === 'normal' ? 0 : r1(parseFloat(s.letterSpacing)),
    up: s.textTransform === 'uppercase', ta: s.textAlign, it: s.fontStyle === 'italic',
    tab: /tabular-nums/.test(s.fontVariantNumeric), ul: /underline/.test(s.textDecorationLine),
  };
}

function textNode(el, root, warnings, path, chars, rect) {
  const s = getComputedStyle(el);
  const f = fontOf(s);
  const lc = withTheme(false, () => rgba(getComputedStyle(el).color));
  const dc = withTheme(true, () => rgba(getComputedStyle(el).color));
  const nowrap = s.whiteSpace === 'nowrap' || s.whiteSpace === 'pre';
  const trunc = s.textOverflow === 'ellipsis' || /line-clamp/.test(String(el.getAttribute('class') || '')) || parseInt(s.webkitLineClamp, 10) > 0;
  const lines = f.lh ? Math.round(rect.height / root.k / f.lh) : 1;
  const node = {
    t: 'T', n: nameOf(el) === el.tagName.toLowerCase() ? 'text' : nameOf(el), where: undefined, x: r1((rect.left - root.left) / root.k), y: r1((rect.top - root.top) / root.k), w: r1(rect.width / root.k), h: r1(rect.height / root.k),
    s: chars.replace(/\s+/g, ' ').trim(), role: textRole(el), ...f,
    fill: paint(lc, dc, 'text', el, warnings, path),
    wrap: !nowrap && lines > 1, trunc, maxLines: parseInt(s.webkitLineClamp, 10) || undefined,
  };
  return node;
}

// Rich text: a run per inline child with its own weight or color.
function runs(el, warnings, path) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) {
      if (!n.textContent) return;
      const p = n.parentElement, s = getComputedStyle(p);
      const lc = withTheme(false, () => rgba(getComputedStyle(p).color));
      const dc = withTheme(true, () => rgba(getComputedStyle(p).color));
      out.push({ s: n.textContent, fw: parseInt(s.fontWeight, 10), fill: paint(lc, dc, 'text', p, warnings, path), it: s.fontStyle === 'italic' });
    } else if (n.nodeType === 1) [...n.childNodes].forEach(walk);
  };
  [...el.childNodes].forEach(walk);
  // Collapse whitespace the way the page does.
  let text = '';
  for (const r of out) { r.s = r.s.replace(/\s+/g, ' '); if (!text.length || text.endsWith(' ')) r.s = r.s.replace(/^ /, ''); text += r.s; }
  return out.filter((r) => r.s.length);
}

function svgNode(el, root, warnings, path) {
  const rect = el.getBoundingClientRect();
  const lc = withTheme(false, () => look(el)), dc = withTheme(true, () => look(el));
  const clone = el.cloneNode(true);
  clone.removeAttribute('class');
  clone.setAttribute('width', r1(rect.width / root.k));
  clone.setAttribute('height', r1(rect.height / root.k));
  const lucide = iconName(el) || (String(el.getAttribute('class') || '').match(/lucide-([a-z0-9-]+)/) || [])[1];
  const known = !!iconName(el);
  const sw = parseFloat(el.getAttribute('stroke-width') || getComputedStyle(el).strokeWidth) || 2;
  // currentColor, or the element's own stroke/fill, decides the paint.
  const colorL = withTheme(false, () => rgba(getComputedStyle(el).color));
  const colorD = withTheme(true, () => rgba(getComputedStyle(el).color));
  const strokeUse = /stroke="currentColor"|stroke:\s*currentColor/.test(el.outerHTML) || (lc.stroke && colorL && near(lc.stroke, colorL));
  const fillUse = /fill="currentColor"/.test(el.outerHTML) || (lc.fill && colorL && near(lc.fill, colorL) && !/fill="none"/.test(el.getAttribute('fill') || ''));
  return {
    t: 'V', n: lucide ? 'icon/' + lucide : 'icon', x: r1((rect.left - root.left) / root.k), y: r1((rect.top - root.top) / root.k), w: r1(rect.width / root.k), h: r1(rect.height / root.k),
    icon: lucide || null, svg: known ? undefined : clone.outerHTML.replace(/\s+/g, ' '), sw: sw !== 2 ? sw : undefined,
    color: paint(colorL, colorD, 'text', el, warnings, path), strokeUse: !!strokeUse, fillUse: !!fillUse,
    opacity: lc.opacity < 1 ? lc.opacity : undefined,
  };
}

function nameOf(el) {
  const slot = el.getAttribute('data-slot');
  if (slot) return slot;
  const cls = String(el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
  // Hook classes are plain words with a dash or a known short name, not utilities.
  const hook = cls.find((c) => /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(c) && !/^(flex|grid|items|justify|text|bg|border|rounded|shadow|gap|p[trblxy]?|m[trblxy]?|w|h|min|max|size|inline|overflow|truncate|font|leading|tracking|whitespace|tabular|pointer|select|cursor|transition|duration|ease|animate|opacity|z|top|left|right|bottom|inset|translate|scale|rotate|origin|object|aspect|line|place|self|order|col|row|basis|grow|shrink|outline|ring|fill|stroke|backdrop|filter|blur|sr|not|group|peer|in|has|data|aria|dark|hover|focus|active|disabled|first|last|odd|even|before|after|space|divide|underline|decoration|shrink|break|hyphens|content|list|appearance|accent|caret|scroll|snap|touch|will|isolation|mix|bg-blend|box|float|clear|columns|hidden|block|visible|invisible|static|fixed|absolute|relative|sticky)-/.test(c));
  return hook || el.tagName.toLowerCase();
}

function frameNode(el, root, warnings, path, depth) {
  const s = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const L = withTheme(false, () => look(el)), D = withTheme(true, () => look(el));
  const node = { t: 'F', n: nameOf(el), x: r1((rect.left - root.left) / root.k), y: r1((rect.top - root.top) / root.k), w: r1(rect.width / root.k), h: r1(rect.height / root.k) };
  const here = path + '/' + node.n;

  // Layout.
  const flex = /flex/.test(s.display);
  if (flex) {
    const col = s.flexDirection.startsWith('column');
    const gap = parseFloat(col ? s.rowGap : s.columnGap) || 0;
    node.al = {
      d: col ? 'V' : 'H', g: r1(gap), gv: spaceStep(gap),
      p: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((v) => r1(parseFloat(v))),
      ai: { 'flex-start': 'MIN', start: 'MIN', center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', baseline: 'BASELINE', stretch: 'STRETCH', normal: 'STRETCH' }[s.alignItems] || 'MIN',
      jc: { 'flex-start': 'MIN', start: 'MIN', normal: 'MIN', center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', 'space-between': 'SPACE_BETWEEN' }[s.justifyContent] || 'MIN',
      wrap: s.flexWrap === 'wrap' || undefined,
      cg: s.flexWrap === 'wrap' ? r1(parseFloat(col ? s.columnGap : s.rowGap) || 0) : undefined,
    };
    if (s.flexDirection.endsWith('reverse')) warnings.push(`${here}: reversed flex direction`);
  } else {
    node.al = { d: 'N', p: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((v) => r1(parseFloat(v))) };
    if (/grid/.test(s.display)) {
      // A one-row grid (a table row: fixed columns) becomes a row of
      // fixed-width cells; anything else keeps its measured positions.
      const kids = [...el.children].filter(visible).map((c) => c.getBoundingClientRect());
      const oneRow = kids.length > 1 && kids.every((r) => r.top < kids[0].bottom - 1 && r.bottom > kids[0].top + 1);
      if (oneRow) {
        node.al = { d: 'H', p: node.al.p, g: r1((parseFloat(s.columnGap) || 0)), ai: { center: 'CENTER', end: 'MAX', 'flex-end': 'MAX', start: 'MIN', 'flex-start': 'MIN' }[s.alignItems] || 'MIN', jc: 'MIN' };
        node.al.gv = spaceStep(node.al.g);
        node.cells = 1;
      } else node.grid = { cols: s.gridTemplateColumns, gap: r1(parseFloat(s.columnGap) || 0), rgap: r1(parseFloat(s.rowGap) || 0) };
    }
  }
  if (node.al.p.every((v) => !v)) delete node.al.p;
  else node.al.pv = node.al.p.map(spaceStep);

  const parent = el.parentElement && getComputedStyle(el.parentElement);
  if (s.position === 'absolute' || s.position === 'fixed') node.abs = true;
  if (parent && /flex/.test(parent.display) && !node.abs) {
    const pcol = parent.flexDirection.startsWith('column');
    if (parseFloat(s.flexGrow) > 0) node.grow = 1;
    const st = s.alignSelf === 'auto' ? parent.alignItems : s.alignSelf;
    if ((st === 'stretch' || st === 'normal') && !(pcol ? s.width !== 'auto' && el.style.width : false)) node.stretch = 1;
    if (!pcol && parseFloat(s.flexShrink) === 0 && !node.grow) node.noShrink = 1;
  }

  // Box.
  const rad = [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map((v) => {
    const n = parseFloat(v);
    return /%/.test(v) ? Math.min(rect.width, rect.height) / root.k * n / 100 : n;
  }).map((v) => Math.min(r1(v), r1(Math.min(rect.width, rect.height) / root.k / 2)));
  if (rad.some((v) => v > 0)) {
    node.r = rad.every((v) => v === rad[0]) ? rad[0] : rad;
    if (typeof node.r === 'number') { const rv = radiusStep(node.r); if (rv) node.rv = rv; if (node.r >= Math.min(rect.width, rect.height) / root.k / 2 - 0.5) node.pill = 1; }
  }
  if (L.bg || D.bg) node.fill = paint(L.bg, D.bg, 'fill', el, warnings, here);
  if (L.img && !/url\(/.test(L.img)) { node.grad = L.img; warnings.push(`${here}: gradient background kept as a note`); }
  if (L.img && /url\(/.test(L.img)) node.image = 1;
  const bw = [L.bt, L.br, L.bb, L.bl];
  if (bw.some((v) => v > 0) && (L.bc || D.bc)) {
    node.stroke = { ...paint(L.bc, D.bc, 'stroke', el, warnings, here), w: bw.every((v) => v === bw[0]) ? bw[0] : bw };
  } else if (bw.some((v) => v > 0)) {
    // A transparent border still takes its width in the box (shadcn's
    // `border border-transparent`): an invisible stroke in the layout.
    node.stroke = { c: [0, 0, 0, 0], cd: [0, 0, 0, 0], w: bw.every((v) => v === bw[0]) ? bw[0] : bw };
  }
  // A ring (box-shadow 0 0 0 Npx) is an outside border: kept as one, apart
  // from the shadow layers that go to an elevation token.
  const split = (v) => cleanShadow(v).split(/,(?![^(]*\))/).map((x) => x.trim()).filter((x) => x && x !== 'none');
  const isRing = (x) => /\s0px 0px 0px [\d.]+px$/.test(x) && !/inset/.test(x);
  const ringL = split(L.shadow).find(isRing), ringD = split(D.shadow).find(isRing);
  if (ringL || ringD) {
    const col = (x) => x && rgba(x.replace(/\s+-?[\d.]+px.*$/, ''));
    const w = parseFloat((ringL || ringD).match(/([\d.]+)px$/)[1]);
    node.ring = { ...paint(col(ringL), col(ringD), 'stroke', el, warnings, here), w };
  }
  const rest = (v) => split(v).filter((x) => !isRing(x)).join(', ') || 'none';
  const sh = shadowOf(rest(L.shadow), rest(D.shadow), warnings, here);
  if (sh) node.fx = sh;
  if (L.opacity < 1) node.op = L.opacity;
  if (s.overflow !== 'visible' || s.overflowX !== 'visible') node.clip = 1;
  if (s.backdropFilter && s.backdropFilter !== 'none') node.blur = parseFloat((s.backdropFilter.match(/blur\(([\d.]+)px\)/) || [])[1]) || undefined;

  // Children.
  if (depth > 14) return node;
  const kids = [];
  const plain = inlineOnly(el) && [...el.childNodes].some(isText);
  if (plain) {
    // The whole element is one text (possibly with styled runs).
    const r = runs(el, warnings, here);
    const tn = textNode(el, root, warnings, here + '/text', el.innerText || el.textContent, rect);
    if (r.length > 1 && r.some((x) => x.fw !== r[0].fw || JSON.stringify(x.fill) !== JSON.stringify(r[0].fill))) tn.runs = r;
    // Text inside a padded box: the text node sits in the content box.
    const pt = parseFloat(s.paddingTop), pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight), pb = parseFloat(s.paddingBottom);
    tn.x = r1((rect.left - root.left) / root.k + pl + L.bl); tn.y = r1((rect.top - root.top) / root.k + pt + L.bt);
    tn.w = r1(rect.width / root.k - pl - pr - L.bl - L.br); tn.h = r1(rect.height / root.k - pt - pb - L.bt - L.bb);
    const hasBox = node.fill || node.stroke || node.fx || node.al.p || node.r || node.abs || node.al.d !== 'N';
    if (!hasBox && el !== root.el) return { ...tn, n: node.n, abs: node.abs, grow: node.grow, stretch: node.stretch };
    if (node.al.d === 'N') node.al = { ...node.al, d: 'H', g: 0, ai: s.textAlign === 'center' ? 'CENTER' : 'MIN', jc: s.textAlign === 'center' ? 'CENTER' : s.textAlign === 'right' || s.textAlign === 'end' ? 'MAX' : 'MIN' };
    kids.push(tn);
  } else {
    // display: contents draws no box: its children belong to this layout.
    const flat = (n) => [...n.childNodes].flatMap((c) => (c.nodeType === 1 && getComputedStyle(c).display === 'contents' ? flat(c) : [c]));
    for (const c of flat(el)) {
      if (c.nodeType === 3) {
        if (!isText(c)) continue;
        const range = document.createRange(); range.selectNodeContents(c);
        const rr = range.getBoundingClientRect();
        if (!rr.width) continue;
        kids.push(textNode(el, root, warnings, here + '/text', c.textContent, rr));
        continue;
      }
      if (c.nodeType !== 1 || !visible(c)) continue;
      // Screen-reader-only text draws nothing.
      if (/(^|\s)(sr-only|story-sr)(\s|$)/.test(String(c.getAttribute('class') || ''))) continue;
      if (c.tagName === 'svg' || c instanceof SVGSVGElement) { kids.push(svgNode(c, root, warnings, here + '/' + nameOf(c))); continue; }
      if (c.tagName === 'IMG') {
        const ir = c.getBoundingClientRect();
        kids.push({ t: 'F', n: 'image', image: 1, x: r1((ir.left - root.left) / root.k), y: r1((ir.top - root.top) / root.k), w: r1(ir.width / root.k), h: r1(ir.height / root.k), alt: c.alt, abs: getComputedStyle(c).position === 'absolute' || undefined, stretch: 1 });
        continue;
      }
      kids.push(frameNode(c, root, warnings, here, depth + 1));
    }
    // Pseudo-elements that draw something (a dot, a ring) are noted, not drawn.
    for (const pe of ['::before', '::after']) {
      const ps = getComputedStyle(el, pe);
      if (ps.content && ps.content !== 'none' && ps.content !== 'normal' && (rgba(ps.backgroundColor) || ps.boxShadow !== 'none' || parseFloat(ps.borderTopWidth) > 0)) {
        node.pseudo = (node.pseudo || []).concat(pe + ' ' + [ps.width, ps.height, ps.backgroundColor, ps.position].join(' '));
      }
    }
  }
  if (node.cells) for (const k of kids) if (!k.abs) k.cell = 1;
  if (kids.length) node.ch = kids;
  return node;
}

/** Reads `el` into a spec: { name, w, h, root, warnings }. */
export function capture(el, { name } = {}) {
  if (!el) throw new Error('capture: no element');
  tokens();
  const undo = freeze();
  try {
    const rect = el.getBoundingClientRect();
    const k = el.offsetWidth ? rect.width / el.offsetWidth : 1;
    const root = { left: rect.left, top: rect.top, el, k };
    const warnings = [];
    const spec = frameNode(el, root, warnings, '', 0);
    delete spec.abs;
    spec.n = name || spec.n;
    return { name: spec.n, w: spec.w, h: spec.h, root: compact(spec, true), warnings: [...new Set(warnings)] };
  } finally { undo(); }
}

// Drops what the builder doesn't need: defaults, and positions inside an
// auto-layout parent (only absolute children and free layouts use them).
function compact(n, parentFree) {
  const out = {};
  for (const [k, v] of Object.entries(n)) {
    if (v === undefined || v === null || v === false) continue;
    if ((k === 'ls' || k === 'g' || k === 'op') && v === 0) continue;
    if (k === 'ta' && (v === 'start' || v === 'left')) continue;
    if (k === 'fam' && v === 'sans') continue;
    if ((k === 'x' || k === 'y') && !parentFree && !n.abs && n.t !== 'F') continue;
    if (k === 'gv' && !v) continue;
    out[k] = v;
  }
  if (out.al && out.al.pv && out.al.pv.every((v) => !v)) delete out.al.pv;
  if (n.ch) out.ch = n.ch.map((c) => compact(c, n.al && n.al.d === 'N'));
  return out;
}

/** The color and shadow tables, for checking a match by hand. */
export function tokenTable() { return tokens(); }

/** The distinct icons (lucide name or a short signature) inside an element. */
export function icons(el) {
  const out = {};
  for (const s of el.querySelectorAll('svg')) {
    const lucide = (String(s.getAttribute('class') || '').match(/lucide-([a-z0-9-]+)/) || [])[1];
    const key = lucide || 'custom:' + s.innerHTML.replace(/\s+/g, '').slice(0, 60);
    if (!out[key]) out[key] = s.outerHTML.replace(/\s+/g, ' ');
  }
  return out;
}
