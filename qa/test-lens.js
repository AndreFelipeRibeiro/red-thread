// The filter lens on Connections (Notion "Filter lens", 2026-11-17):
// - desktop, Release order: Seen packs the seen titles into one row in order
//   and hides the rest; the camera flies out, then lands on the last seen
//   title, centred, at the reading zoom;
// - unmarking a title while the lens is on moves nothing (V3-SPEC §7.1's
//   reason): the lens took its titles when the filter changed;
// - Watchlist: its titles in one row, landing on the first;
// - turning the filter off brings every title back;
// - phone: Seen lands on the last seen title at a readable size;
// - Reduce motion: no flight, the camera is on the anchor at once.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8241; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
const V = path.join(S, 'vendor');
const VENDOR = {
  '@supabase/supabase-js@2.112.2/dist/umd/supabase.js': 'x-supabase-supabase-js-2.112.2/package/dist/umd/supabase.js',
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL = `http://127.0.0.1:${QA_PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

// From the catalog, in release order: every other one of the first 30
// released titles is Seen (about 15, too many to fit at reading size, so the
// landing has a flight out to show), and two later ones are on the Watchlist.
const { loadCatalog } = require('./load-catalog');
const RELEASED = loadCatalog().TITLES.filter(t => t.release && t.release <= new Date().toISOString().slice(0, 10))
  .sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : a.id.localeCompare(b.id)));
const SEEN = RELEASED.slice(0, 30).filter((_, i) => i % 2 === 0).map(t => t.id);
const WATCH = [RELEASED[33].id, RELEASED[37].id];
const LAST_SEEN = SEEN[SEEN.length - 1];

async function ctxPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  const states = {};
  SEEN.forEach(id => { states[id] = 'seen'; });
  WATCH.forEach(id => { states[id] = 'watchlist'; });
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states })) + ");}");
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

// What the canvas shows: the cards not hidden, left to right, their rows, the
// camera's scale and where the anchor sits against the viewport's centre.
const SHOWN = (anchor) => {
  const vp = document.querySelector('.viewport').getBoundingClientRect();
  const cards = [...document.querySelectorAll('.card')].filter(c => !c.classList.contains('ring-hidden'))
    .map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), cx: (r.left + r.right) / 2 }; })
    .sort((a, b) => a.x - b.x);
  const m = (document.querySelector('.canvas').style.transform || '').match(/scale\(([\d.]+)\)/);
  const a = cards.find(c => c.id === anchor);
  return { ids: cards.map(c => c.id), rows: new Set(cards.map(c => c.y)).size, scale: m ? +m[1] : null,
    anchorOff: a ? Math.round(a.cx - (vp.left + vp.right) / 2) : null, anchorW: a ? a.w : null };
};
const positions = () => Object.fromEntries([...document.querySelectorAll('.card')].map(c => [c.dataset.id, c.style.transform || c.style.left + ',' + c.style.top]));

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const seenBtn = (page) => page.getByRole('button', { name: /^Seen: / }).first();
  const watchBtn = (page) => page.getByRole('button', { name: /^Watchlist: / }).first();

  // ---- Desktop ---------------------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=spatial'); await appReady(page); await page.waitForTimeout(800);
    const all = await page.evaluate(SHOWN, null);
    await seenBtn(page).click();
    await page.waitForTimeout(400);
    const flying = await page.evaluate(SHOWN, LAST_SEEN);
    await page.waitForTimeout(2200);
    const seen = await page.evaluate(SHOWN, LAST_SEEN);
    out.desk = { allCount: all.ids.length, flyingScale: flying.scale, seen };
    expect(seen.ids.length === SEEN.length && SEEN.every(id => seen.ids.includes(id)), `Seen lens: expected the ${SEEN.length} seen titles: ${JSON.stringify(seen.ids)}`);
    expect(seen.rows === 1, `Seen lens: not one row: ${JSON.stringify(seen)}`);
    expect(Math.abs(seen.anchorOff) <= 40 && seen.scale >= 0.5, `Seen lens: did not land on the last seen title at the reading zoom: ${JSON.stringify(seen)}`);
    expect(flying.scale !== null && flying.scale < seen.scale, `Seen lens: no flight out before landing: ${JSON.stringify({ flying: flying.scale, landed: seen.scale })}`);

    // Unmark a title under the lens: nothing moves (§7.1), it just dims.
    const before = await page.evaluate(positions);
    await page.evaluate((id) => window.MCU_COLLECTION.setStatus(id, 'none'), SEEN[1]);
    await page.waitForTimeout(800);
    const after = await page.evaluate(positions);
    const moved = Object.keys(before).filter(id => before[id] !== after[id]);
    const un = await page.evaluate((id) => { const c = document.querySelector(`.card[data-id="${id}"]`); return { id, hidden: c.classList.contains('ring-hidden'), dim: c.classList.contains('coll-dim') }; }, SEEN[1]);
    out.desk.unmark = { moved, un };
    expect(!moved.length && !un.hidden && un.dim, `unmarking under the lens moved cards or hid the title: ${JSON.stringify(out.desk.unmark)}`);

    await watchBtn(page).click();
    await page.waitForTimeout(2600);
    const watch = await page.evaluate(SHOWN, WATCH[0]);
    out.desk.watch = watch;
    expect(watch.ids.join() === WATCH.join() && watch.rows === 1, `Watchlist lens: expected its titles in one row: ${JSON.stringify(watch)}`);
    expect(Math.abs(watch.anchorOff) <= 40 && watch.scale >= 0.5, `Watchlist lens: did not land on the first title: ${JSON.stringify(watch)}`);

    await watchBtn(page).click();
    await page.waitForTimeout(1200);
    const back = await page.evaluate(SHOWN, null);
    out.desk.cleared = back.ids.length;
    expect(back.ids.length === all.ids.length, `turning the filter off left titles hidden: ${back.ids.length} of ${all.ids.length}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone -------------------------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE);
    await page.goto(URL + '?view=spatial'); await appReady(page); await page.waitForTimeout(800);
    await seenBtn(page).tap();
    await page.waitForTimeout(2600);
    const seen = await page.evaluate(SHOWN, LAST_SEEN);
    out.phone = seen;
    expect(seen.ids.length === SEEN.length && seen.rows === 1, `phone Seen lens: ${JSON.stringify(seen)}`);
    expect(Math.abs(seen.anchorOff) <= 40 && seen.scale >= 0.6, `phone Seen lens: did not land on the last seen title at the reading zoom: ${JSON.stringify(seen)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Reduce motion: straight to the anchor -----------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { ...DESK, reducedMotion: 'reduce' });
    await page.goto(URL + '?view=spatial'); await appReady(page); await page.waitForTimeout(800);
    await seenBtn(page).click();
    // No flight: the camera is at the reading zoom from the first frames (the
    // cards still take their usual layout glide into the row, so where the
    // anchor sits is read once they have landed).
    const early = [];
    for (let i = 0; i < 4; i++) { await page.waitForTimeout(100); early.push((await page.evaluate(SHOWN, LAST_SEEN)).scale); }
    await page.waitForTimeout(700);
    const now = await page.evaluate(SHOWN, LAST_SEEN);
    out.reduced = { early, landed: now };
    expect(early.every(sc => sc >= 0.5), `reduce motion: the camera flew out instead of going straight to the reading zoom: ${JSON.stringify(early)}`);
    expect(Math.abs(now.anchorOff) <= 40 && now.scale >= 0.5, `reduce motion: not on the anchor: ${JSON.stringify(now)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
