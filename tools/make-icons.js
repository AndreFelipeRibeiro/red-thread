// Draws favicon.png (64px), favicon-96.png, favicon.ico (48 and 32px) and
// apple-touch-icon.png (180px) from the logo mark, src/assets/logo-mark.svg,
// so the browser tab, search results and the home-screen icon match the mark
// in the app. Run it again after replacing that file:
//
//   node tools/make-icons.js                  every icon
//   node tools/make-icons.js favicon.ico      only the files named
//
// Google shows a site's favicon in search only when it is a multiple of 48px
// square, and asks for /favicon.ico whatever the page links (Notion
// "Findability 13"), hence the 96px PNG and the .ico.
//
// Uses the Playwright that qa/ installs (bash qa/setup.sh), rendering in
// headless Chromium so the SVG is drawn exactly as the app draws it: as a mask.
// Icons have no light or dark mode, so they take the designer's favicon
// colours (Andre, 2026-11-02): the logo red on the navy tile of the
// "dark bg" option, which reads on both light and dark browser chrome. The
// "light bg" option is the same with TILE = '#FFFFFF'.
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(import.meta.url)(path.join(ROOT, 'qa', 'node_modules', 'playwright'));
const svg = fs.readFileSync(path.join(ROOT, 'src', 'assets', 'logo-mark.svg'), 'utf8');
const mask = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
const BRAND = '#C41E3A';   // the logo's red
const TILE = '#0A0E27';    // the favicon's navy (its "dark bg" option)

const ICONS = [
  // The tab icon keeps transparent corners; the tile is the icon.
  // The mark is a tall pin: these sizes are its height.
  { file: 'favicon.png', size: 64, radius: 14, mark: 50 },
  // The same tile, scaled: radius and mark keep favicon.png's proportions.
  { file: 'favicon-96.png', size: 96, radius: 21, mark: 75 },
  { file: 'favicon.ico', ico: [{ size: 48, radius: 10.5, mark: 37.5 }, { size: 32, radius: 7, mark: 25 }] },
  // iOS rounds the corners itself and fills transparency with black, so this
  // one is a full, opaque square.
  { file: 'apple-touch-icon.png', size: 180, radius: 0, mark: 124 },
];

// An .ico of PNG images (every browser and Google read PNG entries): a 6-byte
// header, a 16-byte entry per image, then the images.
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size, e); head.writeUInt8(size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

(async () => {
  const only = process.argv.slice(2);
  const browser = await chromium.launch();
  const draw = async (ic) => {
    const page = await browser.newPage({ viewport: { width: ic.size, height: ic.size } });
    await page.setContent(`<!doctype html><style>
      html, body { margin: 0; background: transparent; }
      .tile { width: ${ic.size}px; height: ${ic.size}px; border-radius: ${ic.radius}px; background: ${TILE};
        display: flex; align-items: center; justify-content: center; }
      .mark { width: ${ic.mark}px; height: ${ic.mark}px; background: ${BRAND};
        -webkit-mask: ${mask} center / contain no-repeat; mask: ${mask} center / contain no-repeat; }
    </style><div class="tile"><div class="mark"></div></div>`);
    const data = await page.screenshot({ omitBackground: ic.radius > 0 });
    await page.close();
    return data;
  };
  for (const ic of ICONS) {
    if (only.length && !only.includes(ic.file)) continue;
    if (ic.ico) {
      const pngs = [];
      for (const one of ic.ico) pngs.push({ size: one.size, data: await draw(one) });
      fs.writeFileSync(path.join(ROOT, ic.file), ico(pngs));
      console.log('wrote ' + ic.file + ' (' + ic.ico.map((x) => x.size + 'px').join(', ') + ')');
      continue;
    }
    fs.writeFileSync(path.join(ROOT, ic.file), await draw(ic));
    console.log('wrote ' + ic.file + ' (' + ic.size + 'px)');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
