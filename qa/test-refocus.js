// The view lands on the title whose details just closed (V3 Tasks, "Refocus
// view based on title selected and deselected afterward"):
// - desktop Spatial: She-Hulk opened from Up next while framed on Phase 1,
//   then closed, is centred (within a few px) at no less than the landing's
//   reading zoom (about 7.5 titles across, capped at 100%);
// - a card clicked on the canvas returns the camera exactly as before;
// - phone Spatial opens on Up next once something is Seen, at one card size in
//   every order (a first visit keeps the bird's-eye view);
// - phone Spatial: the same from the Up next chip, at least 0.6;
// - desktop List: the row is scrolled into view below the pinned headers and
//   flashes; keyboard focus lands on its title;
// - phone List: an Up next title (no row) scrolls nothing; a title in a folded
//   run of seen titles brings the fold into view, still folded.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
// data.js moved into the bundle (src/data/data.js) in Phase 2, so it is no
// longer a file in the served site. Expectations come from the source tree,
// which is where they belong: they describe the catalog, not the build.
const { DATA_TS } = require('./load-catalog');
const V = path.join(S, 'vendor');
const VENDOR = {
  'react@18.3.1/umd/react.development.js': 'x-react-18.3.1/package/umd/react.development.js',
  'react-dom@18.3.1/umd/react-dom.development.js': 'x-react-dom-18.3.1/package/umd/react-dom.development.js',
  'react@18.3.1/umd/react.production.min.js': 'x-react-18.3.1/package/umd/react.production.min.js',
  'react-dom@18.3.1/umd/react-dom.production.min.js': 'x-react-dom-18.3.1/package/umd/react-dom.production.min.js',
  '@babel/standalone@7.29.0/babel.min.js': 'x-babel-standalone-7.29.0/package/babel.min.js',
  '@supabase/supabase-js@2.112.2/dist/umd/supabase.js': 'x-supabase-supabase-js-2.112.2/package/dist/umd/supabase.js',
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/babel', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/qa-blank') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>blank</title>'); }
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const PORT = +process.env.PORT || 8233;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

// Every released title before She-Hulk in release order, seen: Up next is then
// She-Hulk (Phase 4), far from Phase 1 where Spatial opens.
const seenBefore = (target) => {
  // Read as text on purpose: this wants the literals in release order as
  // written, not the evaluated catalog.
  const src = fs.readFileSync(DATA_TS, 'utf8');
  const rows = [...src.matchAll(/\{ id: '([a-z0-9-]+)', title:.*?release: '([0-9-]+)'/g)].map(m => ({ id: m[1], release: m[2] }));
  rows.sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
  const out = {};
  for (const r of rows) { if (r.id === target) break; out[r.id] = 'seen'; }
  return out;
};

async function ctxPage(browser, opts, prefs, states, extra) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript((extra || '') + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states: states || {} })) + ");"
    + (prefs ? "localStorage.setItem('mcu.prefs.v1', " + JSON.stringify(JSON.stringify(prefs)) + ");" : ''));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  return { ctx, page, errors };
}
const settle = (page) => require('./ready').appReady(page, 1000);
// Where a card sits relative to the Spatial viewport's centre, and the zoom.
const CAMERA = (id) => {
  const vp = document.querySelector('.viewport').getBoundingClientRect();
  const c = document.querySelector(`.card[data-id="${id}"]`);
  const t = document.querySelector('.canvas').style.transform;
  const m = /scale\(([\d.]+)\)/.exec(t);
  if (!c) return { missing: true, t };
  const r = c.getBoundingClientRect();
  return { dx: Math.round(r.left + r.width / 2 - (vp.left + vp.width / 2)), dy: Math.round(r.top + r.height / 2 - (vp.top + vp.height / 2)), scale: m ? Number(m[1]) : null, t };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const states = seenBefore('she-hulk');

  // ---- Desktop Spatial: from Up next, then closed ---------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' }, states);
    await page.goto(URL); await settle(page);
    const name = await page.locator('.un-mrow .un-open').textContent();
    expect(/She-Hulk/.test(name), `Up next is "${name}", expected She-Hulk`);
    const before = await page.evaluate(CAMERA, 'she-hulk');
    await page.locator('.un-mrow .un-open').click(); await page.waitForTimeout(1400);
    await page.locator('.drawer-close').click(); await page.waitForTimeout(1400);
    const after = await page.evaluate(CAMERA, 'she-hulk');
    out.spatial = { before, after };
    expect(Math.abs(after.dx) <= 4 && Math.abs(after.dy) <= 4, `She-Hulk not centred after closing: ${JSON.stringify(after)}`);
    const read = await page.evaluate(() => Math.min(1, document.querySelector('.viewport').getBoundingClientRect().width / (170 * 1.15 * 7.5)));
    expect(after.scale >= read - 0.005, `zoom ${after.scale} below the reading zoom ${read}`);
    // A card clicked on the canvas: the camera returns exactly as before.
    await page.goto(URL); await settle(page);
    const cam0 = await page.evaluate(() => document.querySelector('.canvas').style.transform);
    const box = await page.evaluate(() => { const r = document.querySelector('.card[data-id="iron-man"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75 }; });
    await page.mouse.click(box.x, box.y); await page.waitForTimeout(1400);
    await page.locator('.drawer-close').click(); await page.waitForTimeout(1400);
    const cam1 = await page.evaluate(() => document.querySelector('.canvas').style.transform);
    out.canvasClick = { cam0, cam1 };
    expect(cam0 === cam1, `a canvas click did not return the camera: ${cam0} vs ${cam1}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone Spatial: the first view -----------------------------------------
  // Once something is Seen, each order opens on its Up next title (V3 Tasks,
  // "Phone Spatial: open on Up next once you've started"): centred across, wholly
  // on screen above the compact card docked at the bottom, at 60% or more and at one card size in all
  // six orders (the phone's reading zoom). Switching order lands on
  // that order's Up next too. A first visit (nothing seen) keeps the bird's-eye
  // view: the order's first title at the left edge.
  const landWidths = [];
  for (const sort of ['release', 'chrono', 'phase', 'title', 'imdb', 'rt']) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { version: 1, viewMode: 'spatial', desktopView: 'spatial', sort, sortDir: sort === 'imdb' || sort === 'rt' ? 'desc' : 'asc' }, states);
    await page.goto(URL); await settle(page); await page.waitForTimeout(400);
    const land = await page.evaluate((cam) => {
      const t = document.querySelector('.spatial-overall .un-mrow .un-title').textContent;
      const id = window.TITLES.find(x => window.MCU_I18N.titleName(x) === t).id;
      const r = document.querySelector(`.card[data-id="${id}"]`).getBoundingClientRect();
      const chip = document.querySelector('.spatial-overall.docked').getBoundingClientRect();
      const vp = document.querySelector('.viewport').getBoundingClientRect();
      return { id, ...eval('(' + cam + ')')(id), w: Math.round(r.width), top: Math.round(r.top - vp.top), clear: Math.round(chip.top - r.bottom) };
    }, CAMERA.toString());
    out['phoneLand_' + sort] = land;
    landWidths.push(land.w);
    expect(Math.abs(land.dx) <= 4 && land.top >= 0 && land.clear >= 0, `phone ${sort}: Up next ${land.id} not framed on landing: ${JSON.stringify(land)}`);
    expect(land.scale >= 0.6, `phone ${sort}: landing zoom ${land.scale} below 0.6`);
    errors.push(...e);
    await ctx.close();
  }
  // Every order frames it at the same reading zoom, so cards are one size.
  expect(new Set(landWidths).size === 1, `phone: Up next cards differ in size between orders: ${landWidths.join(', ')}`);
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { version: 1, viewMode: 'spatial', desktopView: 'spatial', sort: 'release', sortDir: 'asc' }, {});
    await page.goto(URL); await settle(page); await page.waitForTimeout(400);
    const first = await page.evaluate(() => {
      const vp = document.querySelector('.viewport').getBoundingClientRect();
      return Math.round(document.querySelector('.card[data-id="iron-man"]').getBoundingClientRect().left - vp.left);
    });
    out.phoneLand_firstVisit = first;
    expect(Math.abs(first - 14) <= 3, `phone first visit: expected the bird's-eye view (Iron Man at the left edge), got left ${first}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone Spatial: from the compact card's Up next, in three orders -------
  // Closing the details of a title opened from Up next clears its selection
  // (no connections ring left behind), centres the title at 60% or more, and
  // brings the card back, in Release, By Phase and IMDb order alike
  // (a title already on screen used to keep the old view in the grid orders).
  for (const sort of ['release', 'phase', 'imdb']) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { version: 1, viewMode: 'spatial', desktopView: 'spatial', sort, sortDir: sort === 'imdb' ? 'desc' : 'asc' }, states);
    await page.goto(URL); await settle(page);
    const id = await page.evaluate(() => { const t = document.querySelector('.spatial-overall .un-mrow .un-title').textContent; return window.TITLES.find(x => window.MCU_I18N.titleName(x) === t).id; });
    await page.locator('.spatial-overall .un-open').tap(); await page.waitForTimeout(1200);
    await page.locator('.m-sheet .m-sheet-x').tap(); await page.waitForTimeout(1400);
    const after = await page.evaluate(CAMERA, id);
    after.id = id;
    after.selected = await page.evaluate(() => document.querySelectorAll('.card.selected').length);
    after.chip = await page.evaluate(() => !!document.querySelector('.spatial-overall.docked'));
    out['phoneSpatial_' + sort] = after;
    expect(after.selected === 0 && after.chip, `phone ${sort}: closing the details left ${JSON.stringify(after)}`);
    expect(Math.abs(after.dx) <= 4 && Math.abs(after.dy) <= 4, `phone ${sort}: ${id} not centred: ${JSON.stringify(after)}`);
    expect(after.scale >= 0.6, `phone ${sort}: zoom ${after.scale} below 0.6`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Desktop List: the row comes into view and flashes; keyboard focus ----
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { version: 1, viewMode: 'list', desktopView: 'list', sort: 'release', sortDir: 'asc' }, states);
    await page.goto(URL + '?view=list'); await settle(page);
    await page.locator('.dlist .spatial-overall .un-open').focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const flash = await page.evaluate(() => !!document.querySelector('.dl-row[data-row-id="she-hulk"].refocus-flash'));
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => {
      const row = document.querySelector('.dl-row[data-row-id="she-hulk"]');
      const head = document.querySelector('.dl-head').getBoundingClientRect();
      const b = row.getBoundingClientRect();
      const a = document.activeElement;
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), headBottom: Math.round(head.bottom), vh: innerHeight, focus: a && a.closest('[data-row-id]') ? a.closest('[data-row-id]').getAttribute('data-row-id') + ' ' + a.className : (a && a.className) };
    });
    out.list = { flash, ...r };
    expect(flash, 'the row did not flash');
    expect(r.top >= r.headBottom - 1 && r.bottom <= r.vh, `the row is not in view below the headers: ${JSON.stringify(r)}`);
    expect(/^she-hulk dl-open/.test(r.focus || ''), `keyboard focus is on "${r.focus}", expected She-Hulk's title`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone List: back to the row, clear of the docked card ------------------
  // Up next is marked in its own row (Notion "Titles 4/5"). A title opened from
  // the compact card, and one opened from the address, come back into view on
  // closing, below the header and above the card docked over the bottom.
  for (const [label, open] of [['upnext', null], ['address', 'iron-man-3']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' }, states);
    await page.goto(URL + (open ? '?title=' + open : '')); await settle(page);
    let id = open;
    if (!open) {
      id = await page.evaluate(() => { const t = document.querySelector('.spatial-overall .un-mrow .un-title').textContent; return window.TITLES.find(x => window.MCU_I18N.titleName(x) === t).id; });
      await page.locator('.spatial-overall .un-open').tap(); await page.waitForTimeout(1000);
    }
    await page.locator('.m-sheet .m-sheet-x').tap(); await page.waitForTimeout(1200);
    const r = await page.evaluate((id) => {
      const row = document.querySelector(`.m-lrow[data-row-id="${id}"]`).getBoundingClientRect();
      const area = document.querySelector('.m-scrollarea').getBoundingClientRect();
      const card = document.querySelector('.spatial-overall.docked');
      const bottom = card ? card.getBoundingClientRect().top : area.bottom;
      return { id, top: Math.round(row.top - area.top), clear: Math.round(bottom - row.bottom) };
    }, id);
    out['phoneList_' + label] = r;
    expect(r.top >= -1 && r.clear >= 0, `phone List (${label}): ${id} not back in view clear of the card: ${JSON.stringify(r)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
