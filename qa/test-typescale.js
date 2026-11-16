// The type roles (Notion "Set a real type system", 2026-11-16): every font
// size in the app is one of the roles in src/index.css (text-display, -title,
// -heading, -body, -label, -caption) or one of its art sizes (the canvas
// cards, poster tags, the promo countdown). Two halves:
//
//   1. source   no Tailwind default size (text-xs … text-9xl), no pixel or
//               rem size written into a class, no inline fontSize, outside a
//               line marked "type-scale: art"; and the size names cn() knows
//               (src/lib/utils.ts) are exactly the stylesheet's --text-*
//               tokens, so class merging never mistakes one for a color.
//               (Not src/share-card: the share images are drawn in image
//               pixels on the server.)
//   2. screens  on desktop and phone, every piece of visible text renders at
//               a role or art size (measured against probes of each class, so
//               the Text size setting and the phone's scale are included).
//
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8397;
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { appReady } = require('./ready');

const ROOT = path.join(__dirname, '..');
const errors = [];
const out = {};

// ---- 1. source
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : /\.(tsx|ts)$/.test(d.name) ? [path.join(dir, d.name)] : []);
// src/share-card draws the share images (1200×630 PNGs, on the server) in
// image pixels: a picture with its own canvas, not the app's text.
const files = walk(path.join(ROOT, 'src')).filter((f) => !f.includes(path.join('src', 'share-card') + path.sep));
const BAD = [
  [/(^|[\s'"`:(\[])text-(xs|sm|base|lg|[2-9]?xl)(?=[\s'"`/)\]]|$)/, 'a Tailwind default size'],
  [/text-\[(max\(|min\(|clamp\()?[\d.]+(px|rem|em)/, 'a size written into a class'],
  [/text-\[length:(?![^\]]*var\(--fs-)/, 'a length that is not a type role'],
  [/text-\(length:--fs-/, 'an --fs-* variable in place of its role class'],
  [/fontSize[=:]/, 'an inline font size'],
];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  if (rel === path.join('src', 'lib', 'utils.ts')) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    // A marked exception covers its own line and the three after it.
    if (lines.slice(Math.max(0, i - 3), i + 1).some((l) => /type-scale: art/.test(l))) return;
    for (const [re, what] of BAD) if (re.test(line)) errors.push(`${rel}:${i + 1}: ${what}: ${line.trim().slice(0, 140)}`);
  });
}
const css = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const declared = [...css.matchAll(/--text-([a-z][a-z0-9-]*?)\s*:/g)].map((m) => m[1]).filter((n) => !/--/.test(n) && !n.includes('line-height'));
const tokens = [...new Set(declared.map((n) => n.replace(/--line-height$/, '')))].sort();
const utils = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'utils.ts'), 'utf8');
const known = JSON.parse(utils.match(/TEXT_SIZES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']')).sort();
out.tokens = tokens;
if (tokens.join() !== known.join()) errors.push(`cn() knows ${known.join(', ')} but the stylesheet declares ${tokens.join(', ')}`);
if (!/--text-\*:\s*initial/.test(css)) errors.push('Tailwind\'s default text sizes are not cleared (--text-*: initial)');

// ---- 2. screens
const PROBE = (classes) => {
  const sizes = {};
  for (const c of classes) {
    const s = document.createElement('span'); s.className = c; s.textContent = 'x';
    document.body.appendChild(s); sizes[c] = parseFloat(getComputedStyle(s).fontSize); s.remove();
  }
  return sizes;
};
const MEASURE = () => {
  const skip = '.story-sr, .sr-only, .poster-mono-initials, .m-tab, .m-search-input';
  const seen = {};
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length || el.closest(skip)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const px = Math.round(parseFloat(cs.fontSize) * 100) / 100;
    if (!seen[px]) seen[px] = (el.className && el.className.baseVal === undefined ? String(el.className).split(' ').slice(0, 2).join('.') : el.tagName) + ' "' + el.textContent.trim().slice(0, 24) + '"';
  }
  return seen;
};

(async () => {
  const server = http.createServer((q, r) => r.end());
  await new Promise((r) => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const URL = `http://127.0.0.1:${QA_PORT}/`;
  const classes = ['text-display', 'text-title', 'text-heading', 'text-body', 'text-label', 'text-caption', 'text-tag', 'text-numeral', 'text-numeral-word',
    'text-card-title', 'text-card-title-lg', 'text-card-title-pop', 'text-card-meta', 'text-card-meta-lg', 'text-card-meta-pop', 'text-card-micro'];
  const SEED = "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','thor':'seen','avengers':'watchlist'}}));";
  const screens = [
    ['desktop', { width: 1440, height: 900 }, ['', '?view=list', '?view=list&title=thor', '?view=guides', '?view=guides&guide=infinity-saga'], ''],
    ['desktop large', { width: 1280, height: 860 }, ['?view=list', '?view=guides'], "localStorage.setItem('mcu.textSize.v1','large');"],
    ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true }, ['', '?view=list', '?view=guides', '?view=list&title=thor'], ''],
  ];
  for (const [label, viewport, urls, extra] of screens) {
    const { width, height, ...rest } = viewport;
    const ctx = await browser.newContext({ viewport: { width, height }, ...rest });
    await ctx.addInitScript(SEED + extra);
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    for (const u of urls) {
      await page.goto(URL + u); await appReady(page); await page.waitForTimeout(900);
      const allowed = await page.evaluate(PROBE, classes);
      const ok = new Set(Object.values(allowed).map((v) => Math.round(v * 100) / 100));
      const seen = await page.evaluate(MEASURE);
      const stray = Object.entries(seen).filter(([px]) => !ok.has(+px));
      out[`${label} ${u || '/'}`] = { sizes: Object.keys(seen).map(Number).sort((a, b) => a - b), stray: stray.map(([px, where]) => `${px}px ${where}`) };
      for (const [px, where] of stray) errors.push(`${label} ${u || '/'}: text at ${px}px, not a type role or art size: ${where}`);
    }
    errors.push(...pageErrors.map((e) => `${label}: ${e}`));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
