// One landing for every strip (Notion "Spatial: one landing for every strip
// (fly over the whole row, then zoom in to the reading zoom)", 2026-11-18): a
// pinned character and a guide opened onto Connections (in the app or from a
// shared link) fly out over the whole strip, then in to their anchor at the
// landing zoom (about 2.5 titles across on phones, 7.5 on desktop), and
// stepping stays at that zoom. Reduce motion lands straight away.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8254; // regress/quick give each check its own port
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

async function ctxPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');"
    + "localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: {} }));}");
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





// Samples the canvas zoom on every frame for `ms`, after `act` runs.
async function track(page, act, ms = 3200) {
  await page.evaluate(() => {
    window.__zooms = [];
    const t0 = performance.now();
    const tick = () => {
      const cv = document.querySelector('.canvas');
      const m = cv && /scale\(([\d.]+)\)/.exec(cv.style.transform);
      if (m) window.__zooms.push(+m[1]);
      if (performance.now() - t0 < 6000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await act();
  await page.waitForTimeout(ms);
  return page.evaluate(() => window.__zooms);
}
// Where a card sits: its centre against the room it lands in (left of the
// details panel on desktop, above the docked card on phones).
const place = (page, id) => page.evaluate((id) => {
  const vpEl = document.querySelector('.viewport');
  const el = document.querySelector(`.card[data-id="${id}"]`);
  if (!el) return { missing: id, url: (location.search + ((p) => ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] && p[2] ? (location.search ? '&' : '?') + ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] + '=' + p[2] : ({ titles: 'list', guides: 'guides' })[p[1]] && !p[2] ? (location.search ? '&' : '?') + 'view=' + ({ titles: 'list', guides: 'guides' })[p[1]] : '')(location.pathname.split('/'))), cards: document.querySelectorAll('.card').length, vp: !!document.querySelector('.viewport') };
  const c = el.getBoundingClientRect(), vp = vpEl.getBoundingClientRect();
  const drawer = document.querySelector('.drawer.open');
  const right = drawer && innerWidth >= 768 ? drawer.getBoundingClientRect().left : vp.right;
  const dock = document.querySelector('.char-card.docked, .g-dock');
  const bottom = dock ? dock.getBoundingClientRect().top : vp.bottom;
  const m = /scale\(([\d.]+)\)/.exec(document.querySelector('.canvas').style.transform);
  return { scale: m ? +m[1] : null, dx: Math.round((c.left + c.right) / 2 - (vp.left + right) / 2),
    inView: c.left >= vp.left && c.right <= right && c.top >= vp.top && c.bottom <= bottom + 1, w: Math.round(c.width) };
}, id);
const phoneLand = (w) => Math.min(1, w / (170 * 1.15 * 2.5));
const deskLand = (w) => Math.min(1, w / (170 * 1.15 * 7.5));
const near = (a, b) => Math.abs(a - b) <= 0.02;

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // Desktop: Tony Stark picked in Iron Man's cast flies out over his row,
  // then in to Iron Man at the landing zoom, left of the details panel.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?title=iron-man'); await appReady(page); await page.waitForTimeout(1500);
    const z = await track(page, async () => { await page.locator('.drawer button', { hasText: 'Tony Stark' }).first().click(); await page.mouse.move(400, 860); });
    const land = deskLand(1440), at = await place(page, 'iron-man');
    out.deskPin = { min: Math.min(...z), end: at };
    expect(Math.min(...z) < land * 0.6, `desktop pin: the camera should first show Tony's whole row (lowest zoom ${Math.min(...z)})`);
    expect(near(at.scale, land) && at.inView && Math.abs(at.dx) <= 40, `desktop pin: should land on Iron Man at the landing zoom, left of the panel: ${JSON.stringify(at)}`);
    // A step stays at the landing zoom.
    await page.locator('.char-card button[aria-label="Next title"]').click(); await page.waitForTimeout(1200);
    const s = await page.evaluate(() => +/scale\(([\d.]+)\)/.exec(document.querySelector('.canvas').style.transform)[1]);
    out.deskStep = s;
    expect(near(s, land), `desktop step: the zoom should stay at the landing zoom (${s})`);
    errors.push(...e.map(x => 'desktop pin: ' + x));
    await ctx.close();
  }
  // Desktop: a guide opened onto Connections flies over its route to its
  // next stop (Infinity War, nothing seen; Endgame until 2026-11-23).
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(1200);
    const z = await track(page, () => page.locator('.g-head .g-connections').click());
    const at = await place(page, 'infinity-war');
    out.deskGuide = { min: Math.min(...z), end: at };
    // Its route nearly fits beside the panel (about 73% at 1440px): a short
    // first leg.
    expect(Math.min(...z) < deskLand(1440) * 0.85, `desktop guide: the camera should first show the whole route (lowest zoom ${Math.min(...z)})`);
    expect(near(at.scale, Math.max(deskLand(1440), 0.5)) && at.inView && Math.abs(at.dx) <= 40, `desktop guide: should land on Infinity War at the landing zoom, left of the panel: ${JSON.stringify(at)}`);
    errors.push(...e.map(x => 'desktop guide: ' + x));
    await ctx.close();
  }
  // Phones: Bruce Banner picked in The Incredible Hulk's cast: the sheet
  // closes, the row shows whole, then the camera lands on the Hulk at the
  // landing zoom above the card; › steps at that zoom (it was 60%).
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(URL + '?view=spatial&title=incredible-hulk'); await appReady(page); await page.waitForTimeout(1500);
    // A cast row opens the character's trail in the sheet; its pin pins them.
    await page.locator('.m-crow', { hasText: 'Bruce Banner' }).first().tap(); await page.waitForTimeout(600);
    const z = await track(page, () => page.locator('.m-sheet .trail-pin').tap());
    const land = phoneLand(390), at = await place(page, 'incredible-hulk');
    out.phonePin = { min: Math.min(...z), end: at };
    expect(Math.min(...z) < land * 0.6, `phone pin: the camera should first show Bruce's whole row (lowest zoom ${Math.min(...z)})`);
    expect(near(at.scale, land) && at.inView && Math.abs(at.dx) <= 40, `phone pin: should land on The Incredible Hulk at the landing zoom: ${JSON.stringify(at)}`);
    await page.locator('.char-card button[aria-label="Next title"]').tap(); await page.waitForTimeout(1200);
    const s = await page.evaluate(() => +/scale\(([\d.]+)\)/.exec(document.querySelector('.canvas').style.transform)[1]);
    out.phoneStep = s;
    expect(near(s, land), `phone step: the zoom should stay at the landing zoom (${s})`);
    errors.push(...e.map(x => 'phone pin: ' + x));
    await ctx.close();
  }
  // A shared ?char= link flies in the same way, to their first title.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.addInitScript("window.__zooms = []; setInterval(() => { const c = document.querySelector('.canvas'); const m = c && /scale\\(([\\d.]+)\\)/.exec(c.style.transform); if (m) window.__zooms.push(+m[1]); }, 40);");
    await page.goto(URL + '?view=spatial&char=tony'); await appReady(page); await page.waitForTimeout(3500);
    const z = await page.evaluate(() => window.__zooms), land = deskLand(1440), at = await place(page, 'iron-man');
    out.deskLink = { min: Math.min(...z), end: at };
    expect(Math.min(...z) < land * 0.6 && near(at.scale, land) && at.inView, `desktop ?char= link: should fly over Tony's row, then land on Iron Man: ${JSON.stringify(out.deskLink)}`);
    errors.push(...e.map(x => 'desktop link: ' + x));
    await ctx.close();
  }
  // Reduce motion: the same pin lands straight on its title, no flight.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(URL + '?title=iron-man'); await appReady(page); await page.waitForTimeout(1500);
    const z = await track(page, async () => { await page.locator('.drawer button', { hasText: 'Tony Stark' }).first().click(); await page.mouse.move(400, 860); }, 1500);
    const land = deskLand(1440);
    // No leg out: the zoom never drops below where it started or landed.
    out.reduced = { start: z[0], min: Math.min(...z), end: z[z.length - 1] };
    expect(Math.min(...z) >= Math.min(z[0], land) - 0.01 && near(z[z.length - 1], land), `reduce motion: the pin should land without the flight: ${JSON.stringify(out.reduced)}`);
    errors.push(...e.map(x => 'reduced: ' + x));
    await ctx.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
