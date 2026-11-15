// Phone shell: the document itself must not scroll. Everything scrolls inside
// the shell (.m-scrollarea, .m-sheet-body), so dragging up from the sort bar
// must not move the page or leave a band of background below it.
const QA_PORT = +process.env.PORT || 8211; // regress/quick give each check its own port
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

const SIZES = {
  w320: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
  w390: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  w430: { viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true },
  landscape: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {};
  const errors = [];

  for (const [name, opts] of Object.entries(SIZES)) {
    const { ctx, page } = await ctxPage(browser, opts, "localStorage.setItem('mcu.welcome.v1','test');");
    page.on('pageerror', e => errors.push(name + ': ' + e.message));
    await go(page);

    const before = await page.evaluate(() => ({
      docScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      overflowY: getComputedStyle(document.body).overflowY,
      overscroll: getComputedStyle(document.body).overscrollBehaviorY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    // Try to scroll the document the way a drag from the bottom bar would.
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(250);
    const moved = await page.evaluate(() => window.scrollY);

    const nav = await page.evaluate(() => {
      const t = document.querySelector('.m-tabs');
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return { bottomGap: Math.round(innerHeight - r.bottom), height: Math.round(r.height) };
    });

    // The internal scroller must still work.
    const inner = await page.evaluate(async () => {
      const sa = document.querySelector('.m-scrollarea');
      if (!sa) return { present: false };
      const can = sa.scrollHeight > sa.clientHeight + 1;
      sa.scrollTop = 200;
      await new Promise(r => setTimeout(r, 120));
      return { present: true, canScroll: can, scrolledTo: Math.round(sa.scrollTop) };
    });

    const row = {
      docScrollable: before.docScrollable,
      overflowY: before.overflowY,
      overscrollY: before.overscroll,
      docMovedBy: moved,
      navBottomGap: nav && nav.bottomGap,
      listScrolls: inner.present ? (inner.canScroll && inner.scrolledTo > 0) : 'no list',
    };
    // The document lock is the part that actually holds on iOS, and the part a
    // headless run can see: before the fix these read visible/auto.
    if (row.overflowY !== 'hidden') errors.push(name + ': body overflow-y is ' + row.overflowY + ', expected hidden');
    if (row.overscrollY !== 'none') errors.push(name + ': body overscroll-behavior-y is ' + row.overscrollY + ', expected none');
    if (row.docScrollable) errors.push(name + ': the document is scrollable');
    if (row.docMovedBy !== 0) errors.push(name + ': the document scrolled to ' + row.docMovedBy);
    // The bottom bar, when the phone has one (the sort tabs moved into the
    // Sort menu; the navigation ticket brings a bar back).
    if (row.navBottomGap != null && row.navBottomGap !== 0) errors.push(name + ': the bottom bar sits ' + row.navBottomGap + 'px off the bottom edge');
    if (row.listScrolls !== true) errors.push(name + ': the list no longer scrolls internally');
    R[name] = row;
    await ctx.close();
  }

  // Desktop must be untouched: it has its own fixed-height shell.
  {
    const { ctx, page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
    await go(page);
    R.desktop = await page.evaluate(() => ({
      overflowY: getComputedStyle(document.body).overflowY,
      cards: document.querySelectorAll('.card').length,
    }));
    // The lock is width-gated; the desktop shell must keep its own behaviour.
    if (R.desktop.overflowY === 'hidden') errors.push('desktop: the phone document lock leaked past 900px');
    if (R.desktop.cards !== 64) errors.push('desktop: ' + R.desktop.cards + ' cards, expected 64');
    await ctx.close();
  }

  // What this check cannot do: reproduce the reported symptom. It is iOS
  // Safari's 100vh (the largest viewport, excluding collapsed browser chrome)
  // that made the body taller than the visible area. Chromium treats 100vh and
  // 100dvh alike, so the band under the sort bar does not appear here either
  // way. This guards the lock and the internal scrollers; the phone is the
  // only place the symptom itself can be confirmed.
  R.note = 'the iOS 100vh symptom is not reproducible headlessly; this guards the lock';
  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
