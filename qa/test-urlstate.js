const QA_PORT = +process.env.PORT || 8221; // regress/quick give each check its own port
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

// Shareable state in the address. A link opens exactly the state it names, the
// address follows the state as it changes, Back and Forward restore the open
// title and character, and nothing private ever reaches the address.
const OURS = ['view', 'sort', 'order', 'phase', 'type', 'budget', 'release', 'title', 'char'];
const params = (page) => page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)));
const at = async (page, qs) => { await page.goto(URL + qs); await require('./ready').appReady(page); };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {}; const errors = [];
  const { page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // ---- A shared link opens what it says ---------------------------------
  await at(page, '?sort=chrono&phase=3&title=thor-ragnarok');
  R.open = await page.evaluate(() => ({
    drawerOpen: !!document.querySelector('.drawer.open'),
    drawerTitle: (document.querySelector('.drawer.open #drawer-title') || {}).textContent || null,
    selected: (document.querySelector('.card.selected .card-title') || {}).textContent || null,
    sortOn: /^Story order/.test((document.querySelector('.toolbar .sort-menu-trigger') || {}).textContent || ''),
    chips: [...document.querySelectorAll('.ctx-chip')].map(c => c.textContent.replace('×', '').trim()),
    cards: document.querySelectorAll('.card').length,
    phase3: window.TITLES.filter(t => t.phase === 3).length,
  }));
  if (!R.open.drawerOpen || R.open.drawerTitle !== 'Thor: Ragnarok') errors.push(`a link with title=thor-ragnarok opened ${JSON.stringify(R.open.drawerTitle)} (drawer open: ${R.open.drawerOpen})`);
  if (R.open.selected !== 'Thor: Ragnarok') errors.push(`the linked title is not selected on the canvas (${R.open.selected})`);
  if (!R.open.sortOn) errors.push('sort=chrono did not select Chronological');
  if (R.open.cards !== R.open.phase3) errors.push(`phase=3 left ${R.open.cards} cards; Phase 3 has ${R.open.phase3}`);

  // ---- The address follows the state, and survives a reload --------------
  R.follow = {};
  await page.evaluate(async () => { document.querySelector('.drawer-close').click(); await new Promise(r => setTimeout(r, 900)); });
  R.follow.closed = await params(page);
  if (R.follow.closed.title) errors.push('closing the details left title= in the address');
  await page.evaluate(async () => {
    document.querySelector('.toolbar .sort-menu-trigger').click(); await new Promise(r => setTimeout(r, 300));
    document.querySelector('.sort-menu-pop [data-sort="imdb"][data-dir="desc"]').click(); await new Promise(r => setTimeout(r, 1500));
  });
  R.follow.sorted = await params(page);
  if (R.follow.sorted.sort !== 'imdb') errors.push(`changing the sort wrote ${JSON.stringify(R.follow.sorted)}`);
  if ('order' in R.follow.sorted) errors.push('the default order for IMDb was written to the address; defaults stay out');
  await page.reload(); await require('./ready').appReady(page);
  R.follow.reloaded = await page.evaluate(() => ({
    imdbOn: /^IMDb rating, highest first/.test((document.querySelector('.toolbar .sort-menu-trigger') || {}).textContent || ''),
    chips: [...document.querySelectorAll('.ctx-chip')].map(c => c.textContent.replace('×', '').trim()),
  }));
  if (!R.follow.reloaded.imdbOn || !R.follow.reloaded.chips.some(c => /Phase 3/.test(c))) errors.push(`a reload lost the state: ${JSON.stringify(R.follow.reloaded)}`);

  // ---- Bad values are ignored and dropped --------------------------------
  await at(page, '?sort=bogus&title=nope&phase=9&char=nobody');
  R.bad = await params(page);
  if (Object.keys(R.bad).some(k => OURS.includes(k))) errors.push(`invalid values stayed in the address: ${JSON.stringify(R.bad)}`);

  // ---- A pinned character -------------------------------------------------
  await at(page, '?char=bruce&title=incredible-hulk');
  R.char = await page.evaluate(() => ({
    pinned: (document.querySelector('.char-banner.pinned .cb-who b') || {}).textContent || null,
    pos: (document.querySelector('.char-banner.pinned .cb-pos') || {}).textContent || null,
    drawer: (document.querySelector('.drawer.open #drawer-title') || {}).textContent || null,
  }));
  if (R.char.pinned !== 'Bruce Banner') errors.push(`char=bruce pinned ${JSON.stringify(R.char.pinned)}`);
  if (!/^1 of \d+$/.test(R.char.pos || '')) errors.push(`char=bruce&title=incredible-hulk put the stepper at ${JSON.stringify(R.char.pos)}, expected the first title`);
  if (R.char.drawer !== 'The Incredible Hulk') errors.push(`the details show ${JSON.stringify(R.char.drawer)}, expected The Incredible Hulk`);

  // ---- Privacy: only our keys, never anything from the account ------------
  R.keys = Object.keys(await params(page));
  const stray = R.keys.filter(k => !OURS.includes(k));
  if (stray.length) errors.push(`unexpected keys in the address: ${stray.join(', ')}`);

  // ---- Phone: Back closes the details, Forward reopens them ---------------
  const { page: m } = await ctxPage(browser, MOBILE, "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');");
  await m.goto(URL); await require('./ready').appReady(m);
  await m.evaluate(async () => { const row = document.querySelector('.m-lrow-open, .m-card-open'); row.click(); await new Promise(r => setTimeout(r, 1200)); });
  R.phone = { opened: await params(m) };
  await m.goBack(); await m.waitForTimeout(1200);
  R.phone.back = await params(m);
  R.phone.sheetAfterBack = await m.evaluate(() => !!document.querySelector('.m-sheet, [role="dialog"]'));
  await m.goForward(); await m.waitForTimeout(1500);
  R.phone.forward = await params(m);
  R.phone.sheetAfterForward = await m.evaluate(() => !!document.querySelector('.m-sheet, [role="dialog"]'));
  if (!R.phone.opened.title) errors.push('opening a title on a phone did not put it in the address');
  if (R.phone.back.title || R.phone.sheetAfterBack) errors.push(`Back left the details (${JSON.stringify(R.phone.back)}, sheet ${R.phone.sheetAfterBack})`);
  if (R.phone.forward.title !== R.phone.opened.title || !R.phone.sheetAfterForward) errors.push(`Forward did not bring the details back (${JSON.stringify(R.phone.forward)}, sheet ${R.phone.sheetAfterForward})`);

  // ---- Phone: pinning from the details survives the sheet closing ---------
  // Pinning closes the sheet, and the sheet then steps back in history on its
  // own. That step is not the visitor pressing Back: treating it as one read an
  // address with no character and unpinned the character just pinned.
  await m.goto(URL); await require('./ready').appReady(m);
  R.pin = await m.evaluate(async () => {
    const row = [...document.querySelectorAll('.m-lrow-open')].find(r => /Iron Man/.test(r.textContent));
    row.click(); await new Promise(r => setTimeout(r, 900));
    const cast = [...document.querySelectorAll('.m-crow')].find(r => /James Rhodes/.test(r.textContent));
    if (!cast) return { error: 'no James Rhodes cast row' };
    cast.click(); await new Promise(r => setTimeout(r, 1500));
    return { pill: !!document.querySelector('.char-pill'), char: new URLSearchParams(location.search).get('char') };
  });
  if (R.pin.error) errors.push(R.pin.error);
  else {
    if (!R.pin.pill) errors.push('pinning a character from the phone details was undone when the sheet closed');
    if (R.pin.char !== 'rhodey') errors.push(`after pinning, the address has char=${R.pin.char}, expected rhodey`);
  }

  // ---- Phone: closing the filter sheet keeps the filter just chosen -------
  // Closing a sheet is a step back in history; restoring filters on that step
  // would undo the choice. Only the title and character are restored.
  await m.goBack(); await m.waitForTimeout(1000);
  R.filterSheet = await m.evaluate(async () => {
    const f = document.querySelector('button[aria-label*="Filters"], button[aria-label*="Filtros"]');
    if (!f) return { error: 'no phone Filters button' };
    f.click(); await new Promise(r => setTimeout(r, 900));
    const chip = [...document.querySelectorAll('.m-chip')].find(c => c.textContent.trim() === '2');
    if (!chip) return { error: 'no Phase 2 chip' };
    chip.click(); await new Promise(r => setTimeout(r, 600));
    const close = document.querySelector('.m-sheet .m-sheet-close, .m-sheet button[aria-label*="Close"], .m-sheet button[aria-label*="Fechar"]');
    if (close) close.click(); else history.back();
    await new Promise(r => setTimeout(r, 1500));
    return { phase: new URLSearchParams(location.search).get('phase'), sheetOpen: !!document.querySelector('.m-sheet') };
  });
  if (R.filterSheet.error) errors.push(R.filterSheet.error);
  else if (R.filterSheet.phase !== '2') errors.push(`closing the filter sheet reverted the phase (address has phase=${R.filterSheet.phase})`);

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
