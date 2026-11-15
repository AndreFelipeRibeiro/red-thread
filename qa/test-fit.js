// Fit: the desktop toolbar and the phone app bar at every width, in the
// language LOC gives (regress runs English and Portuguese). Since Notion
// "Top nav (PT) / content overflowing" it FAILS on anything that doesn't fit:
// a control past the screen edge, a control past its row, overlapping
// toolbar controls, a label running past its own button, or sideways scroll.
// (It used to only report them, which is how a Portuguese overflow passed.)
// Count badges sit over their button's corner on purpose and don't count.
const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = path.join(S, '..');
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
// MODE=watch (as regress.sh runs it in Portuguese) measures with Watchlist
// selected, the longest label; it was read only from argv before, so the
// full run never used it.
const MODE = process.env.MODE || process.argv[2] || 'all';
// TEXT=small|large measures at that Text size (Settings; Notion
// "Font size increase"); unset is the default size.
const TEXT = process.env.TEXT || '';
const TEXT_SEED = TEXT ? `localStorage.setItem('mcu.textSize.v1', '${TEXT}');` : '';
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



const SEED = "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','incredible-hulk':'seen','iron-man-2':'seen','thor':'seen','cap-first-avenger':'seen','avengers':'seen','iron-man-3':'seen','thor-dark-world':'seen','cap-winter-soldier':'seen','gotg':'seen','aou':'seen','civil-war':'seen','loki-s1':'watchlist','shang-chi':'watchlist','thunderbolts':'watchlist','agatha':'watchlist'}}));";

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const fit = () => {
    const over = [...document.querySelectorAll('.toolbar button, .toolbar input, .m-appbar button, .m-appbar input')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.right > innerWidth + 0.5 || r.left < -0.5); }).length;
    // A row overflows when one of its controls runs past it (measured by box,
    // so count badges overhanging a button's corner don't count).
    const past = (inner, outer) => Math.max(inner.right - outer.right, outer.left - inner.left);
    const rows = [...document.querySelectorAll('.tb-top-row, .tb-filter-row, .tb-sort-row, .tb-sort-controls, .ctx-float, .ctx-line, .ctx-pill, .tb-view-switch, .m-searchrow, .m-viewrow')]
      .filter(r => r.offsetParent).map(r => { const box = r.getBoundingClientRect(); return Math.max(0, ...[...r.children].filter(c => c.getClientRects().length).map(c => past(c.getBoundingClientRect(), box))); })
      .filter(d => d > 1).map(d => Math.round(d));
    const search = document.querySelector('.search-wrap, .m-searchbar');
    // overlapping toolbar controls
    const els = [...document.querySelectorAll('.toolbar .segmented, .toolbar .coll-switch, .toolbar .filters-pill, .toolbar .search-wrap, .toolbar .acct-wrap, .toolbar .sort-order')].map(e => e.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], b = els[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++; }
    return { offscreen: over, rowOverflow: rows, overlaps, searchW: search ? Math.round(search.getBoundingClientRect().width) : null, hScroll: document.documentElement.scrollWidth > innerWidth, tbH: (document.querySelector('.toolbar')||{}).offsetHeight,
      // A label running past its own button (absolutely placed extras, the
      // count badges and screen-reader text, excluded).
      clipped: [...document.querySelectorAll('.toolbar button, .m-appbar button')].filter(b => b.offsetParent).filter(b => {
        const box = b.getBoundingClientRect();
        // Anything inside an absolutely placed element is that element's: the
        // count badge's number sits in the badge (shadcn pass 1/5).
        const placed = (e) => { for (let a = e; a && a !== b; a = a.parentElement) if (getComputedStyle(a).position === 'absolute') return true; return false; };
        return [...b.querySelectorAll('*')].some(e => e.getClientRects().length && !placed(e) && !e.closest('[style*="position: absolute"]') && past(e.getBoundingClientRect(), box) > 1);
      }).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 30)),
      // Both a full and a short label showing at once (the short one is only
      // for the phone row's last step).
      doubled: [...document.querySelectorAll('.coll-switch button')].filter(b => [...b.querySelectorAll('.cl-full, .cl-short')].filter(x => x.getClientRects().length).length > 1).length,
      labels: [...document.querySelectorAll('.coll-switch .coll-label')].filter(l => l.offsetParent).map(l => l.innerText).join('/') };
  };
  for (const w of [900, 999, 1000, 1100, 1199, 1200, 1250, 1279, 1280, 1300, 1301, 1439, 1440, 1600, 1919, 1920, 2199, 2200, 2559, 2560]) {
    const { ctx, page, errors } = await ctxPage(browser, { viewport: { width: w, height: 900 }, locale: process.env.LOC || 'en-US' }, SEED + TEXT_SEED);
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    if (MODE === 'watch') { await page.locator('.coll-switch button').nth(3).click(); await page.waitForTimeout(300); }
    out['d' + w] = { ...(await page.evaluate(fit)), errors: errors.length };
    if ([900, 1279, 1280, 1440, 1920].includes(w)) await page.screenshot({ path: path.join(S, 'shots', 'fit-' + (process.env.LOC||'en') + '-d' + w + (MODE === 'watch' ? 'watch' : '') + (TEXT ? '-' + TEXT : '') + '.png'), clip: { x: 0, y: 0, width: w, height: 200 } });
    await ctx.close();
  }
  for (const w of [320, 360, 375, 390, 430]) {
    const { ctx, page, errors } = await ctxPage(browser, { viewport: { width: w, height: 760 }, hasTouch: true, isMobile: true, locale: process.env.LOC || 'en-US' }, SEED + TEXT_SEED);
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    if (MODE === 'watch') { await page.locator('.coll-switch button').nth(3).click(); await page.waitForTimeout(300); }
    out['m' + w] = { ...(await page.evaluate(fit)), errors: errors.length };
    await ctx.close();
  }
  // Everything that doesn't fit is a failure.
  const failures = [];
  for (const [k, v] of Object.entries(out)) {
    if (v.offscreen) failures.push(`${k}: ${v.offscreen} control(s) past the screen edge`);
    if (v.rowOverflow.length) failures.push(`${k}: a control runs ${v.rowOverflow.join(', ')}px past its row`);
    if (v.overlaps) failures.push(`${k}: ${v.overlaps} toolbar controls overlap`);
    if (v.hScroll) failures.push(`${k}: the page scrolls sideways`);
    if (v.doubled) failures.push(`${k}: ${v.doubled} switch option(s) show both their full and short label`);
    if (v.clipped.length) failures.push(`${k}: label past its button: ${v.clipped.join(' | ')}`);
  }
  out.errors = failures;
  console.log(JSON.stringify(out));
  await browser.close(); server.close();
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
