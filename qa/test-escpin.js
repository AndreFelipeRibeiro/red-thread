// Escape closes the pinned character/performer widget, and does it last: the
// search suggestions, menus, sheets, the pair view and the open details all
// claim Escape first, so one press never closes two layers.
const QA_PORT = +process.env.PORT || 8206; // regress/quick give each check its own port
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

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {};

  // ---- Desktop
  const { ctx, page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await go(page);

  const pin = async (label) => {
    await page.fill('.search-wrap input', '');
    await page.fill('.search-wrap input', label);
    await page.waitForFunction(l => [...document.querySelectorAll('.ss-item .ss-main')].some(n => n.textContent.trim() === l), label, { timeout: 5000 });
    await page.evaluate(l => {
      for (const li of document.querySelectorAll('.ss-item')) {
        const m = li.querySelector('.ss-main');
        if (m && m.textContent.trim() === l) { li.click(); return; }
      }
    }, label);
    await page.waitForTimeout(1400);
  };
  const st = () => page.evaluate(() => ({
    banner: !!document.querySelector('.char-banner.pinned'),
    drawer: !!document.querySelector('.drawer.open'),
    suggestions: !!document.querySelector('.ss-pop'),
    cards: document.querySelectorAll('.card').length,
  }));
  const esc = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(600); };

  // 1. Escape clears a pin and gives the catalogue back.
  await pin('Peter Parker');
  R.pinned = await st();
  await esc();
  R.afterEscape = await st();
  R.escapeClears = R.pinned.banner && !R.afterEscape.banner && R.afterEscape.cards === 64;

  // 2. Details over a pin: the first Escape takes only the details.
  await pin('Peter Parker');
  await page.locator('.card').first().click();
  await page.waitForTimeout(900);
  R.withDetails = await st();
  await esc();
  R.afterFirstEscape = await st();
  await esc();
  R.afterSecondEscape = await st();
  R.oneLayerPerPress = R.withDetails.drawer && R.withDetails.banner
    && !R.afterFirstEscape.drawer && R.afterFirstEscape.banner
    && !R.afterSecondEscape.banner;

  // 3. Escape in the search box belongs to the suggestions, not the pin.
  await pin('Peter Parker');
  await page.fill('.search-wrap input', 'Avengers');
  await page.waitForTimeout(700);
  R.withSuggestions = await st();
  await esc();
  R.afterSuggestEscape = await st();
  R.suggestionsFirst = R.withSuggestions.suggestions
    && !R.afterSuggestEscape.suggestions && R.afterSuggestEscape.banner;
  await ctx.close();

  // ---- Phone: the pill answers Escape too.
  const { page: m } = await ctxPage(browser, PHONE, "localStorage.setItem('mcu.welcome.v1','test');");
  m.on('pageerror', e => errors.push('phone pageerror: ' + e.message));
  await go(m);
  // The phone has no toolbar search, so pin the way a visitor would: open a
  // title and tap a cast row.
  await m.locator('.m-lrow').first().click();
  await m.waitForTimeout(1100);
  R.phoneSheet = await m.evaluate(() => !!document.querySelector('.m-sheet'));
  const row = await m.$('.m-crow');
  R.phoneCastRow = !!row;
  // A person opens their trail (Notion "Explore E 4/5"); its pin pins them.
  if (row) { await row.click(); await m.waitForTimeout(600); await m.locator('.m-sheet .trail-pin').click(); await m.waitForTimeout(1400); }
  R.phonePinned = await m.evaluate(() => !!document.querySelector('.char-pill'));
  await m.keyboard.press('Escape'); await m.waitForTimeout(700);
  R.phoneAfterEscape = await m.evaluate(() => !!document.querySelector('.char-pill'));
  R.phoneEscapeClears = R.phonePinned && !R.phoneAfterEscape;

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
