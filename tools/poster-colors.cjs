#!/usr/bin/env node
// Each official poster's dominant colour (Notion "Extract each official
// poster's dominant colour (for the Monogram fallback)"). For every title with
// a poster in window.MEDIA.posters (src/data/media-data.ts), fetch the poster
// at TMDB's smallest size (w92), shrink it to 40×60, and work out:
//   - posterColor: the colour that reads as the poster's own, not its
//     background: near-black, near-white and greyish pixels are left out
//     (unless they are all there is), the rest are grouped into 24 hue bins
//     weighted by how colourful each pixel is (chroma squared), and the
//     heaviest bin (with its two neighbours) wins; its pixels are averaged
//     by the same weight.
//   - posterColorRaw: the plain most common colour (4 bits a channel), for
//     comparison.
// Both go into media-data.ts as `poster_color` and `poster_color_raw` (title
// id → "#rrggbb"), so the app reads them with no network call. Re-run after a
// media sync changes posters.
//
// The images are decoded by the headless Chromium the QA tooling already
// installs (qa/, `bash qa/setup.sh`), drawn on a canvas, so the site gains no
// image library (the ticket suggested sharp; installing it was not approved
// for this run). Run from the repository root:
//   node tools/poster-colors.cjs
// Also writes a review table to tools/poster-colors-report.html (not
// committed): each poster, the picked and raw colours, and the title's accent.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '../qa/node_modules/playwright'));

const ROOT = path.join(__dirname, '..');
const MEDIA_FILE = path.join(ROOT, 'src/data/media-data.ts');
const src = fs.readFileSync(MEDIA_FILE, 'utf8');
const m = src.match(/^window\.MEDIA = (\{.*\});$/m);
if (!m) throw new Error('media-data.ts: no `window.MEDIA = {...};` line');
const MEDIA = JSON.parse(m[1]);
const BASE = 'https://image.tmdb.org/t/p/w92';

// Runs in the page: the pixels of one image, shrunk to 40×60.
async function pixelsInPage(b64) {
  const img = new Image();
  img.src = 'data:image/jpeg;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 40; c.height = 60;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 40, 60);
  return Array.from(ctx.getImageData(0, 0, 40, 60).data);
}

const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const avg = (px) => { const t = [0, 0, 0]; px.forEach(p => { t[0] += p[0]; t[1] += p[1]; t[2] += p[2]; }); return t.map(v => v / px.length); };

function colours(rgba) {
  const px = [];
  for (let i = 0; i < rgba.length; i += 4) px.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  const buckets = new Map();
  px.forEach(p => { const k = (p[0] >> 4) << 8 | (p[1] >> 4) << 4 | (p[2] >> 4); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(p); });
  const raw = avg([...buckets.values()].sort((a, b) => b.length - a.length)[0]);
  // Colourfulness (chroma) decides: a pixel counts by its chroma squared, so
  // a vivid suit beats a large dull background.
  const keep = px.map(p => { const h = hsl(...p); return { p, h, w: Math.pow(h[1] * (1 - Math.abs(2 * h[2] - 1)), 2) }; })
    .filter(x => x.h[2] > 0.14 && x.h[2] < 0.86 && x.h[1] > 0.3);
  let picked = raw;
  if (keep.length >= px.length * 0.03) {
    const bins = Array.from({ length: 24 }, () => []);
    keep.forEach(x => bins[Math.floor(x.h[0] / 15) % 24].push(x));
    const sum = (i) => bins[i].reduce((a, x) => a + x.w, 0);
    const score = (i) => sum(i) + 0.5 * (sum((i + 23) % 24) + sum((i + 1) % 24));
    let best = 0;
    for (let i = 1; i < 24; i++) if (score(i) > score(best)) best = i;
    const group = bins[(best + 23) % 24].concat(bins[best], bins[(best + 1) % 24]);
    const tw = group.reduce((a, x) => a + x.w, 0);
    picked = [0, 1, 2].map(k => group.reduce((a, x) => a + x.p[k] * x.w, 0) / tw);
  }
  return { picked: hex(...picked), raw: hex(...raw) };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = {}, outRaw = {}, rows = [], byPath = new Map();
  for (const t of Object.keys(MEDIA.posters)) {
    const p = MEDIA.posters[t];
    try {
      if (!byPath.has(p)) {
        const res = await fetch(BASE + p);
        if (!res.ok) throw new Error(res.status + ' ' + BASE + p);
        const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
        byPath.set(p, colours(await page.evaluate(pixelsInPage, b64)));
      }
      const c = byPath.get(p);
      out[t] = c.picked; outRaw[t] = c.raw;
      rows.push({ t, p, ...c });
      process.stdout.write('.');
    } catch (e) {
      console.warn('\n' + t + ': ' + e.message);
    }
  }
  await browser.close();
  MEDIA.poster_color = out;
  MEDIA.poster_color_raw = outRaw;
  fs.writeFileSync(MEDIA_FILE, src.replace(m[0], () => 'window.MEDIA = ' + JSON.stringify(MEDIA) + ';'));
  const accents = {};
  const data = fs.readFileSync(path.join(ROOT, 'src/data/data.ts'), 'utf8');
  for (const a of data.matchAll(/\{ id: '([^']+)'[^\n]*?accent: '(#[0-9a-f]{6})'/gi)) accents[a[1]] = a[2];
  const sw = (c) => `<td><span style="display:inline-block;width:56px;height:28px;border-radius:4px;background:${c}"></span><br><code>${c}</code></td>`;
  fs.writeFileSync(path.join(__dirname, 'poster-colors-report.html'), `<!doctype html><meta charset="utf-8"><title>Poster colours</title>
<style>body{font:13px system-ui;margin:24px}td{padding:6px 10px;vertical-align:middle;border-bottom:1px solid #ddd}img{width:46px;border-radius:3px}</style>
<table><tr><th>Title</th><th>Poster</th><th>Picked</th><th>Raw</th><th>accent</th></tr>
${rows.map(r => `<tr><td>${r.t}</td><td><img src="${BASE + r.p}"></td>${sw(r.picked)}${sw(r.raw)}${sw(accents[r.t] || '#000')}</tr>`).join('\n')}
</table>`);
  console.log(`\n${rows.length} posters; wrote media-data.ts and tools/poster-colors-report.html`);
})();
