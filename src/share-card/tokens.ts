// Colours for the share images (Notion V4 Tasks, "Share 2/3" and "Share 3/3"),
// read from the design-system token file, src/index.css, so the cards never
// keep copies of their own. The images always use the dark theme's values:
// they leave the app and have no light or dark mode, and the dark tile reads
// in any chat app, as the icons do (tools/make-icons.js).
//
// The build (vite.config.js, link previews) passes the file's text from disk;
// the app imports it with `?raw` (the share card). The tokens are oklch(),
// which neither Satori nor resvg understand, so they are converted to hex here.

export type Tokens = Record<string, string>;

/** The custom properties of the `.dark` block, with var() references inside
 *  them resolved (one level is all the file uses). */
export function readDarkTokens(css: string): Tokens {
  const start = css.indexOf('.dark {');
  if (start === -1) throw new Error('share-card: no .dark block in src/index.css');
  const body = css.slice(start, css.indexOf('}', start));
  const out: Tokens = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out[m[1]] = m[2].trim();
  Object.keys(out).forEach((k) => {
    out[k] = out[k].replace(/var\(--([a-z0-9-]+)\)/g, (_, name: string) => out[name] || '');
  });
  return out;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const hex2 = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');

/** oklch(L C H [/ A]) or #hex to '#rrggbb' (or 'rgba(...)' with alpha). */
export function toHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  const m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/i.exec(v);
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

/** The handful of colours the cards use, as hex. */
export interface CardColors {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  border: string;
  brand: string;
  /** The logo mark's colour (--logo). */
  logo: string;
  seen: string;
  phases: string[];
}

export function cardColors(tokens: Tokens): CardColors {
  const t = (name: string) => toHex(tokens[name]);
  return {
    background: t('background'),
    card: t('card'),
    foreground: t('foreground'),
    muted: t('muted-foreground'),
    border: t('border'),
    brand: t('brand'),
    logo: t('logo'),
    seen: t('seen'),
    phases: [1, 2, 3, 4, 5, 6].map((n) => t('phase-' + n)),
  };
}
