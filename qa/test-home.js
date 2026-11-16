// Back to home (V3 Tasks, "MCU Logo: Back to home"): the logo and name are one
// link that resets the app in place to its first state.
// - From a guide, a pinned character with details open, and a search with
//   filters and the Watchlist tab, on desktop and phone: the logo clears them
//   all, puts the sort back to Release (earliest first) and keeps the view.
// - Spatial frames the map again; the List scrolls to the top; Up next comes
//   back; "Back to the start" is announced.
// - The address becomes "/" as one history step and Back restores what was
//   there; the collection and the remembered-guide memory are as decided.
// - It is a real link (href "/", an accessible name, reachable with Tab and
//   Enter); Cmd/Ctrl-click doesn't reset this page.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const { chromium } = require('playwright');
const { setColl } = require('./coll');
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
const PORT = +process.env.PORT || 8230;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const COLLECTION = JSON.stringify({ version: 1, states: { 'iron-man': 'seen', 'thor': 'watchlist', 'avengers': 'watchlist' } });
const INIT = "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
  + "if (!localStorage.getItem('mcu.collection.v1')) localStorage.setItem('mcu.collection.v1', " + JSON.stringify(COLLECTION) + ");";

async function ctxPage(browser, opts, prefs) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(INIT + (prefs ? "localStorage.setItem('mcu.prefs.v1', " + JSON.stringify(JSON.stringify(prefs)) + ");" : ''));
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

// The state the logo is meant to reset, read from the page.
const STATE = () => {
  const q = new URLSearchParams(location.search);
  // The status filter: a pressed header pill (Seen, Watchlist), else All.
  const pill = document.querySelector('.status-counts [aria-pressed="true"]');
  const coll = pill ? { textContent: pill.dataset.coll } : { textContent: 'All' };
  const search = document.querySelector('.search-wrap input, .m-search-input input');
  const canvas = document.querySelector('.canvas');
  return {
    url: location.pathname + location.search,
    search: search ? search.value : null,
    coll: coll ? coll.textContent.trim() : null,
    chips: document.querySelectorAll('.ctx-chip').length,
    pinned: !!document.querySelector('.char-banner.pinned, .char-pill'),
    guide: !!document.querySelector('.guide-banner, .g-pill, .g-scroll, .g-desk .g-head'),
    drawer: !!document.querySelector('.drawer.open'),
    sheet: !!document.querySelector('.m-sheet'),
    sort: q.get('sort'), order: q.get('order'),
    view: q.get('view'),
    upnext: !!document.querySelector('.un-mrow'),
    listTop: (document.querySelector('.dlist, .m-scrollarea') || { scrollTop: -1 }).scrollTop,
    camera: canvas ? canvas.style.transform : null,
    live: [...document.querySelectorAll('[aria-live="polite"]')].map(e => e.textContent).filter(Boolean),
    kept: localStorage.getItem('mcu.guide.v1'),
    collection: localStorage.getItem('mcu.collection.v1'),
  };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const firstState = (s, where, view) => {
    expect(s.url === '/' + (view ? '?view=' + view : ''), `${where}: address ${s.url}`);
    expect(!s.search && s.chips === 0 && !s.pinned && !s.guide && !s.drawer && !s.sheet, `${where}: not reset: ${JSON.stringify(s)}`);
    expect(!s.sort && !s.order, `${where}: sort ${s.sort} ${s.order}, expected Release, earliest first`);
    expect(s.upnext, `${where}: Up next did not come back`);
    expect(s.live.includes('Back to the start'), `${where}: no announcement (${JSON.stringify(s.live)})`);
  };

  // ---- Desktop List: a search, filters, the Watchlist tab ------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { version: 1, viewMode: 'list', desktopView: 'list', sort: 'imdb', sortDir: 'asc' });
    await page.goto(URL + '?view=list&sort=imdb&order=asc&type=film&phase=3'); await settle(page);
    await page.fill('.search-wrap input', 'man'); await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.locator('.dl-row[data-row-id] .dl-open').first().click(); await page.waitForTimeout(700);
    // The link itself.
    const link = await page.evaluate(() => { const a = document.querySelector('.toolbar a.brand'); return a && { href: a.getAttribute('href'), name: a.getAttribute('aria-label'), h1: !!a.querySelector('h1') }; });
    out.link = link;
    expect(link && link.href === '/' && link.name === 'Red Thread, home' && link.h1, `desktop logo is not a home link: ${JSON.stringify(link)}`);
    const before = await page.evaluate(STATE);
    out.deskBefore = before;
    await page.locator('.toolbar a.brand').click(); await page.waitForTimeout(800);
    const after = await page.evaluate(STATE);
    out.deskAfter = after;
    firstState(after, 'desktop List', 'list');
    expect(after.listTop === 0, `desktop List: not scrolled to the top (${after.listTop})`);
    expect(after.collection === before.collection, 'desktop List: the collection changed');
    expect(await page.evaluate(() => document.activeElement && document.activeElement.matches('a.brand')), 'desktop: focus left the logo');
    // Back restores what was there.
    await page.goBack(); await page.waitForTimeout(800);
    const back = await page.evaluate(STATE);
    out.deskBack = back;
    expect(back.search === 'man' && back.sort === 'imdb' && back.chips >= 3, `Back did not restore the search, filters and sort: ${JSON.stringify(back)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Desktop Spatial: a pinned character with details; the camera ---------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' });
    await page.goto(URL); await settle(page);
    const framed = await page.evaluate(() => document.querySelector('.canvas').style.transform);
    await page.goto(URL + '?char=tony&title=iron-man-3'); await settle(page);
    // Pan away too.
    await page.mouse.move(700, 600); await page.mouse.down(); await page.mouse.move(400, 300, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(60); // the drag's momentum glide is still running: home must stop it
    const before = await page.evaluate(STATE);
    expect(before.pinned && before.drawer, `Spatial setup: ${JSON.stringify(before)}`);
    // Keyboard: Tab-reachable link, Enter resets.
    await page.focus('.toolbar a.brand');
    await page.keyboard.press('Enter'); await page.waitForTimeout(1400);
    const after = await page.evaluate(STATE);
    out.spatialAfter = after;
    firstState(after, 'desktop Spatial', null);
    expect(after.camera === framed, `Spatial was not re-framed: ${after.camera} vs ${framed}`);
    // Already home: nothing visible changes.
    await page.locator('.toolbar a.brand').click(); await page.waitForTimeout(900);
    const again = await page.evaluate(STATE);
    expect(again.camera === framed && again.url === '/', `a second click moved something: ${JSON.stringify(again)}`);
    // Cmd/Ctrl-click opens a new tab rather than resetting this page.
    await page.goto(URL + '?view=list&type=film'); await settle(page);
    const popup = ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null);
    await page.locator('.toolbar a.brand').click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] });
    const tab = await popup;
    await page.waitForTimeout(400);
    const kept = await page.evaluate(STATE);
    expect(!!tab, 'Cmd/Ctrl-click did not open a new tab');
    expect(kept.chips >= 1 && kept.url.includes('type=film'), `Cmd/Ctrl-click reset this page: ${JSON.stringify(kept)}`);
    if (tab) await tab.close();
    errors.push(...e);
    await ctx.close();
  }

  // ---- A guide (followed, then forgotten) -----------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { version: 1, viewMode: 'list', desktopView: 'list', sort: 'release', sortDir: 'asc' });
    await page.goto(URL + '?view=list'); await settle(page);
    await page.locator('.nav-tabs button', { hasText: 'Guides' }).click(); await page.waitForTimeout(400);
    await page.locator('.g-page .g-row').first().click(); await page.waitForTimeout(800);
    let s = await page.evaluate(STATE);
    expect(s.guide && s.kept, `guide setup: ${JSON.stringify(s)}`);
    await page.locator('.toolbar a.brand').click(); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    firstState(s, 'desktop guide', 'list');
    expect(!s.kept, 'the remembered guide was not forgotten');
    await page.goto(URL); await settle(page);
    s = await page.evaluate(STATE);
    expect(!s.guide, 'the guide came back on the next visit');
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone: a search, a filter and the Watchlist tab; an old Grid link or
  // setting opens the List (Notion "Phone: remove the Grid view") ----------
  for (const [view, prefsView] of [['list', 'list'], ['grid', 'grid']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { version: 1, viewMode: prefsView, desktopView: 'spatial', sort: 'title', sortDir: 'asc' });
    await page.goto(URL + (view === 'grid' ? '?view=grid&sort=title&phase=2' : '?sort=title&phase=2')); await settle(page);
    await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
    await page.locator('.m-search-input input').fill('iron'); await page.waitForTimeout(300);
    await page.locator('.m-search-input input').blur();
    await setColl(page, 'watchlist'); await page.waitForTimeout(500);
    await page.evaluate(() => { const a = document.querySelector('.m-scrollarea'); if (a) a.scrollTop = 200; });
    const link = await page.evaluate(() => { const a = document.querySelector('a.m-brandrow'); return a && { href: a.getAttribute('href'), name: a.getAttribute('aria-label') }; });
    expect(link && link.href === '/' && link.name === 'Red Thread, home', `phone logo is not a home link: ${JSON.stringify(link)}`);
    await page.locator('a.m-brandrow').tap(); await page.waitForTimeout(900);
    const s = await page.evaluate(STATE);
    out['phone_' + view] = s;
    firstState(s, 'phone ' + view, null);
    expect(await page.locator('.m-lrow').count() > 0 && !(await page.locator('.m-card').count()), `phone ${view}: not the List`);
    expect(s.coll && /All/.test(s.coll) || s.coll === null, `phone ${view}: collection tab ${s.coll}`);
    expect(s.listTop === 0, `phone ${view}: not scrolled to the top (${s.listTop})`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Portuguese ----------------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, null);
    await ctx.addInitScript("localStorage.setItem('mcu.lang.v1','pt-BR');");
    await page.goto(URL + '?type=film'); await settle(page);
    const name = await page.locator('.toolbar a.brand').getAttribute('aria-label');
    await page.locator('.toolbar a.brand').click(); await page.waitForTimeout(800);
    const s = await page.evaluate(STATE);
    expect(name === 'Red Thread, início', `pt-BR link name "${name}"`);
    expect(s.live.includes('De volta ao início'), `pt-BR announcement ${JSON.stringify(s.live)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
