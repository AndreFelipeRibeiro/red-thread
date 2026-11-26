// A guide's page links to its place on the canvas (Notion "Guides: a See
// connections button that opens the guide on Connections", 2026-11-18):
// See connections, beside Following and Share, opens Connections with the
// guide open, landing as a shared ?guide= link does (desktop: the guide's card
// top right, its next stop's details open; phones: the guide's dock).
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8251; // regress/quick give each check its own port
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




(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const read = (page) => page.evaluate(() => ({
    url: ('?' + window.MCU_stateParams(location.pathname, location.search).toString()), page: !!document.querySelector('.g-head'),
    card: !!document.querySelector('.guide-banner.spatial'), dock: !!document.querySelector('.g-dock'),
    spatial: !!document.querySelector('.viewport'), details: (document.querySelector('.drawer.open h2') || {}).textContent || null,
  }));

  // Desktop: the guide's page → Connections, the guide's card top right and
  // its next stop (Infinity War, nothing seen) open in the details.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(1200);
    const btn = page.locator('.g-head .g-connections');
    expect(await btn.count() === 1, 'desktop: the guide page has no See connections button');
    expect((await btn.innerText()).trim() === 'See connections', 'desktop: the button reads ' + JSON.stringify(await btn.innerText()));
    await btn.click(); await page.waitForTimeout(2500);
    const a = out.desktop = await read(page);
    expect(/guide=before-doomsday/.test(a.url) && !/view=list/.test(a.url) && a.card && a.spatial && !a.page, `desktop: See connections should open Connections with the guide: ${JSON.stringify(a)}`);
    expect(a.details === 'Avengers: Infinity War', `desktop: the next stop's details should be open: ${JSON.stringify(a)}`);
    errors.push(...e.map(x => 'desktop: ' + x));
    await ctx.close();
  }
  // Phones, in Portuguese: the same button in the guide's head, to the
  // phone's Connections with the guide's dock.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.addInitScript("localStorage.setItem('mcu.lang.v1','pt-BR')");
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(1200);
    const btn = page.locator('.g-head .g-connections');
    expect(await btn.count() === 1, 'phone: the guide page has no See connections button');
    expect((await btn.innerText()).trim() === 'Ver conexões', 'phone: the button reads ' + JSON.stringify(await btn.innerText()));
    const fits = await page.evaluate(() => { const r = document.querySelector('.g-head .g-connections').getBoundingClientRect(); return r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; });
    expect(fits, 'phone: the button runs past the screen edge');
    await btn.tap(); await page.waitForTimeout(2000);
    const b = out.phone = await read(page);
    expect(/guide=before-doomsday/.test(b.url) && b.dock && !b.page, `phone: See connections should open Connections with the guide's dock: ${JSON.stringify(b)}`);
    errors.push(...e.map(x => 'phone: ' + x));
    await ctx.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
