// Checks saved display preferences (mcu.prefs.v1) on mobile and desktop.
const QA_PORT = +process.env.PORT || 8191; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
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
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL = 'http://127.0.0.1:' + QA_PORT + '/';
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init);
  // The sign-in reminder would cover the page after a few marks: off unless a
  // test asks for it (NUDGE=1).
  if (!process.env.NUDGE) await ctx.addInitScript("try { if (!localStorage.getItem('mcu.signInNudge.v1')) localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}");
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
const settle = page => require('./ready').appReady(page);
const go = async page => { await page.goto(URL); await settle(page); };
const reload = async page => { await page.reload(); await settle(page); };
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {};
  const panel = p => p.evaluate(() => { const e = document.querySelector('.spatial-empty'); if (!e) return null; const r = e.getBoundingClientRect(); const b = e.querySelector('button'); return { text: e.textContent, btn: b && b.textContent, box: [r.left|0, r.top|0, r.width|0, r.height|0], vw: innerWidth }; });
  // Desktop: search only, then search + phase filter.
  {
    const { ctx, page, errors } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
    await go(page);
    const box = page.locator('.search-wrap input');
    await box.fill('zzzz'); await box.press('Escape'); await page.waitForTimeout(500);
    R.dSearch = await panel(page);
    await page.screenshot({ path: 'shots/empty-desk.png' });
    await page.locator('.spatial-empty-btn').click(); await page.waitForTimeout(800);
    R.dAfter = { panel: await panel(page), cards: await page.locator('.canvas .card').count(), value: await box.inputValue() };
    await page.click('.filters-pill:not(.g-btn)'); await page.locator('.filters-pop [data-phase="1"]').click();
    await page.mouse.click(700, 120); await page.waitForTimeout(300);
    await box.fill('Endgame'); await box.press('Escape'); await page.waitForTimeout(500);
    R.dBoth = await panel(page);
    await page.locator('.spatial-empty-btn').click(); await page.waitForTimeout(800);
    R.dBothAfter = { panel: await panel(page), cards: await page.locator('.canvas .card').count(), value: await box.inputValue() };
    // With matches the panel never appears.
    await box.fill('thor'); await box.press('Escape'); await page.waitForTimeout(400);
    R.dMatch = { panel: await panel(page), cards: await page.locator('.canvas .card').count() };
    R.dErrors = errors; await ctx.close();
  }
  // Phone Spatial, Portuguese.
  {
    const { ctx, page, errors } = await ctxPage(browser, { ...MOBILE, locale: 'pt-BR' }, "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.prefs.v1', JSON.stringify({version:1, viewMode:'spatial'}));");
    await go(page);
    await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
    const mb = page.locator('.m-searchbar input');
    await mb.fill('zzzz'); await page.mouse.click(10, 500); await page.waitForTimeout(500);
    R.mSearch = await panel(page);
    await page.screenshot({ path: 'shots/empty-phone.png' });
    await page.locator('.spatial-empty-btn').tap(); await page.waitForTimeout(800);
    R.mAfter = { panel: await panel(page), cards: await page.locator('.canvas .card').count(), value: await mb.inputValue() };
    R.mErrors = errors; await ctx.close();
  }
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
