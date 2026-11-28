// Colors for the share images (Notion V4 Tasks, "Share 2/3" and "Share 3/3"),
// read from the design-system token file, src/index.css, so the cards never
// keep copies of their own. Both use the light theme's values, on the app's
// canvas: the link previews since V5 (Notion "Link preview images"), and the
// share card since V5 Batch 32 (Notion "Share images: re-create every share
// card in the new style"; it used the dark theme's before).
//
// The build (vite.config.js, link previews) passes the file's text from disk;
// the app imports it with `?raw` (the share card). The tokens are oklch(),
// which neither Satori nor resvg understand, so they are converted to hex here.

export type Tokens = Record<string, string>;

/** The custom properties of one `{ … }` block, starting at `from`. */
function readBlock(css: string, from: number): Tokens {
  const open = css.indexOf('{', from);
  const body = css.slice(open + 1, css.indexOf('}', open));
  const out: Tokens = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out[m[1]] = m[2].trim();
  return out;
}

/** One theme block's custom properties, with var() references inside them
 *  resolved: to the palette (the `@primitives` block, Notion "Build the Figma
 *  foundations") or to another token of the block. */
function readTheme(css: string, start: number, which: string): Tokens {
  if (start === -1) throw new Error(`share-card: no ${which} block in src/index.css`);
  const prim = css.indexOf('@primitives');
  const palette = prim === -1 ? {} : readBlock(css, css.indexOf(':root', prim));
  const out = readBlock(css, start);
  const resolve = (v: string, depth = 0): string => v.replace(/var\(--([a-z0-9-]+)\)/g, (_, name: string) =>
    depth > 3 ? '' : resolve(palette[name] ?? out[name] ?? '', depth + 1));
  Object.keys(out).forEach((k) => { out[k] = resolve(out[k]); });
  return out;
}

/** The light theme's tokens: the `:root` block after the palette's own
 *  (the link previews, which are light, like the app's default). */
export function readLightTokens(css: string): Tokens {
  const prim = css.indexOf('@primitives');
  const paletteRoot = prim === -1 ? -1 : css.indexOf(':root', prim);
  return readTheme(css, paletteRoot === -1 ? -1 : css.indexOf(':root {', css.indexOf('}', paletteRoot)), 'light :root');
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const hex2 = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');

/** oklch(L C H [/ A]) or #hex to '#rrggbb' (or 'rgba(...)' with alpha). */
export function toHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)$/i.exec(v);
  if (rgb) {
    const [r, g, b] = [1, 2, 3].map((i) => +rgb[i]);
    if (rgb[4] !== undefined && +rgb[4] < 1) return `rgba(${r}, ${g}, ${b}, ${+rgb[4]})`;
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const m =/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/i.exec(v);
  if (!m) throw new Error('share-card: cannot read colour ' + value);
  const L = parseFloat(m[1]) / (m[2] ? 100 : 1);
  const C = parseFloat(m[3]);
  const h = (parseFloat(m[4]) * Math.PI) / 180;
  const alpha = m[5] === undefined ? 1 : parseFloat(m[5]) / (m[6] ? 100 : 1);
  // OKLCH -> OKLab -> linear sRGB (Björn Ottosson's matrices) -> sRGB.
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const lin = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ];
  const srgb = lin.map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  if (alpha < 1) return `rgba(${srgb.map((c) => Math.round(clamp01(c) * 255)).join(', ')}, ${alpha})`;
  return '#' + srgb.map(hex2).join('');
}

/** The link previews' colors (light), as hex or rgba(). */
export interface PreviewColors {
  canvasTop: string;
  canvasBottom: string;
  /** The canvas's dot grid: the text color at 10%, as --canvas-dot mixes it. */
  dot: string;
  card: string;
  border: string;
  foreground: string;
  muted: string;
  brand: string;
  onColor: string;
  logo: string;
  /** Text on the dark marks that sit on posters, and the mark's ground. */
  onImage: string;
  onImageBase: string;
  phases: string[];
}

/** '#rrggbb' at an opacity, as rgba(). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error('share-card: cannot fade colour ' + hex);
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

export function previewColors(tokens: Tokens): PreviewColors {
  const t = (name: string) => toHex(tokens[name]);
  return {
    canvasTop: t('canvas-top'),
    canvasBottom: t('canvas-bottom'),
    dot: withAlpha(t('foreground'), 0.1),
    card: t('card'),
    border: t('border'),
    foreground: t('foreground'),
    muted: t('muted-foreground'),
    brand: t('brand'),
    onColor: t('on-color'),
    logo: t('logo'),
    onImage: t('on-image'),
    onImageBase: t('on-image-base'),
    phases: [1, 2, 3, 4, 5, 6].map((n) => t('phase-' + n)),
  };
}

/** The share card's colors (light since V5, Notion "Share images: re-create
 *  every share card in the new style"): the link previews' set, plus the seen
 *  check and the thread still ahead. */
export interface ShareColors extends PreviewColors {
  seen: string;
  seenForeground: string;
  /** The thread and the rings of the stops still ahead. */
  borderStrong: string;
}

/** A token's color, including color-mix(in …, A p%, B), mixed in sRGB: close
 *  enough for a thread's gray (--border-strong is one). */
function tokenHex(value: string): string {
  const m = /^color-mix\(\s*in\s+[\w-]+\s*,\s*(.+?\))\s+([\d.]+)%\s*,\s*(.+\))\s*\)$/i.exec(value.trim());
  if (!m) return toHex(value);
  const [a, b] = [toHex(m[1]), toHex(m[3])];
  const p = parseFloat(m[2]) / 100;
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(ch(a, i) * p + ch(b, i) * (1 - p)).toString(16).padStart(2, '0')).join('');
}

export function shareColors(tokens: Tokens): ShareColors {
  return {
    ...previewColors(tokens),
    seen: toHex(tokens['seen']),
    seenForeground: toHex(tokens['seen-foreground']),
    borderStrong: tokenHex(tokens['border-strong']),
  };
}

