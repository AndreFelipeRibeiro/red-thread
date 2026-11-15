// An open guide sets aside the view options it doesn't use (V3 Tasks, "Guide
// disables other view options"):
// - desktop: a guide in the list is the Guides tab (Notion "Desktop:
//   navigation for Explore, My list and Guides"), which shows no Sort or
//   Filters; search stays live;
// - desktop Explore: Sort is on and arranges the guide, Filters is dimmed and
//   inert (aria-disabled, a tooltip, a described-by hint), a click on it opens
//   nothing; every stop of the guide is laid out and lit, and the count
//   summary is hidden;
// - closing the guide brings every control on again, and My list kept the
//   link's Series filter;
// - phones: the bar shortens (Filters and the collection row fold away, the
//   view menu sits beside search; Sort dimmed outside Spatial), the List's
//   last card scrolls clear of the dock, the dock's
//   arrows reach the destination, and closing brings it all back; in Spatial the dock shows the
//   next stop with Seen (no meter or Up next card), the next stop is framed at
//   a readable size, and the zoom control rests hidden until a double-tap;
//   Portuguese hint.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8236; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
const V = path.join(S, 'vendor');
const VENDOR = {
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
const URL = `http://127.0.0.1:${QA_PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const HINT = 'Not used in a guide. Close the guide to use it.';

async function ctxPage(browser, opts, { seen = [], skips = null, lang = 'en' } = {}) {
  const ctx = await browser.newContext(opts);
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.lang.v1'," + JSON.stringify(lang) + ");"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states })) + ");"
    + (skips ? "localStorage.setItem('mcu.guideSkips.v1', " + JSON.stringify(JSON.stringify(skips)) + ");" : "localStorage.removeItem('mcu.guideSkips.v1');")
    + "}");
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
// Which controls are off: [label, aria-disabled] for a set of selectors.
const OFF = (sels) => {
  const r = {};
  Object.entries(sels).forEach(([k, sel]) => {
    const els = [...document.querySelectorAll(sel)];
    r[k] = !els.length ? 'missing' : els.every(b => b.getAttribute('aria-disabled') === 'true' && b.getAttribute('aria-describedby') === 'guide-off-hint') ? 'off'
      // "on" is aria-disabled absent or "false": the design system's toggles
      // (shadcn pass 1/5) always write the attribute, as "false" when enabled.
      : els.every(b => b.getAttribute('aria-disabled') !== 'true') ? 'on' : 'mixed';
  });
  return r;
};
// Desktop (Notion "Desktop: navigation for Explore, My list and Guides"): the
// guide's list is the Guides tab, which has no Sort or Filters; on the Explore
// canvas Sort still arranges the guide and Filters is dimmed.
const DESK_SELS = { sort: '.tb-sort-control .sort-menu-trigger', filters: '.filters-pop-wrap > .filters-pill', tabs: '.nav-tabs button' };
// The phone's Sort menu (it replaced the Order toggle and the sort tabs).
const PHONE_SELS = { sort: '.m-searchrow .sort-menu-trigger', filters: '.m-fpill', collection: '.m-viewrow .coll-switch button' };
const CANVAS = () => {
  const cards = [...document.querySelectorAll('.card')].filter(c => c.querySelector('.card-gnum'));
  return { stops: cards.length, dimmed: cards.filter(c => c.classList.contains('dimmed') || c.classList.contains('coll-dim')).length,
    films: cards.filter(c => /FILM/.test((c.querySelector('.type-badge') || {}).textContent || '')).length,
    summary: !!document.querySelector('.ctx-float, .ctx-pill') };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- Desktop: List, then Spatial, then closing the guide -----------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['iron-man'] });
    await page.goto(URL + '?view=list&type=series&guide=infinity-saga'); await appReady(page);
    let s = await page.evaluate(OFF, DESK_SELS);
    out.deskList = s;
    const tabOn = () => page.evaluate(() => (document.querySelector('.nav-tabs button.on') || {}).textContent);
    expect(s.sort === 'missing' && s.filters === 'missing' && s.tabs === 'on', `desktop Guides tab: ${JSON.stringify(s)}`);
    expect(await tabOn() === 'Guides', 'a guide in the list is not the Guides tab');
    expect(await page.evaluate(() => !document.querySelector('.search-wrap input').disabled), 'search is disabled in a guide');

    // Explore: Sort arranges the guide; Filters is dimmed and does nothing.
    await page.locator('.nav-tabs button', { hasText: 'Explore' }).click(); await page.waitForTimeout(1200);
    s = await page.evaluate(OFF, DESK_SELS);
    out.deskSpatial = s;
    expect(s.sort === 'on' && s.filters === 'off', `desktop Explore: ${JSON.stringify(s)}`);
    const hint = await page.evaluate(() => (document.getElementById('guide-off-hint') || {}).textContent);
    expect(hint === HINT, `hint: ${hint}`);
    await page.locator('.filters-pop-wrap > .filters-pill').click({ force: true }); await page.waitForTimeout(300);
    expect(!(await page.locator('.filters-pop').count()), 'a dimmed Filters opened');
    let c = await page.evaluate(CANVAS);
    out.deskCanvas = c;
    expect(c.stops === 10 && c.dimmed === 0 && c.films >= 9, `Explore with a guide: ${JSON.stringify(c)}`);
    expect(!c.summary, 'the count summary shows during a guide');
    await page.locator('.sort-menu-trigger').click(); await page.waitForTimeout(250);
    await page.locator('.sort-menu-pop [data-sort="chrono"][data-dir="asc"]').click(); await page.waitForTimeout(400);
    const sortNow = await page.evaluate(() => (document.querySelector('.sort-menu-trigger') || {}).textContent);
    expect(/^Story order/.test(sortNow || ''), `Sort did not work in Explore: ${sortNow}`);

    // Closing the guide: every control is on again; My list kept the link's
    // Series filter (each section keeps its own).
    await page.locator('.guide-banner .cb-close, .cb-close').first().click(); await page.waitForTimeout(1200);
    s = await page.evaluate(OFF, DESK_SELS);
    const after = await page.evaluate(() => ({ title: document.querySelector('.filters-pop-wrap > .filters-pill').getAttribute('title') }));
    await page.locator('.nav-tabs button', { hasText: 'My list' }).click(); await page.waitForTimeout(900);
    after.url = await page.evaluate(() => location.search);
    out.deskClosed = { s, after };
    expect(Object.values(s).every(v => v === 'on'), `after closing, controls still off: ${JSON.stringify(s)}`);
    expect(after.title === 'Filters' && /type=series/.test(after.url) && !/guide=/.test(after.url), `after closing: ${JSON.stringify(after)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone: List, then Spatial; Portuguese ---------------------------------
  // A guide shortens the phone bar: Filters and the collection row fold away
  // (inert), and the view menu sits beside search; Order stays, dimmed outside
  // Spatial. The guide's dock replaces the meter, Up next and the old pill.
  const BAR = () => {
    const ok = (sel) => { const el = document.querySelector(sel); return !!el && el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true'; };
    return { short: !!document.querySelector('.m-appbar.guide'), filtersAway: ok('.m-fslot'), rowAway: ok('.m-row3'),
      viewBeside: !!document.querySelector('.m-searchrow .m-vslot .view-menu'), row3H: Math.round(document.querySelector('.m-row3').getBoundingClientRect().height) };
  };
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { lang: 'pt-BR' });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(700);
    let s = await page.evaluate(OFF, { sort: PHONE_SELS.sort });
    let b = await page.evaluate(BAR);
    out.phoneList = { s, b };
    expect(s.sort === 'off', `phone List, Sort: ${JSON.stringify(s)}`);
    expect(b.short && b.filtersAway && b.rowAway && b.viewBeside && b.row3H === 0, `phone List, short bar: ${JSON.stringify(b)}`);
    const hint = await page.evaluate(() => (document.getElementById('guide-off-hint') || {}).textContent);
    expect(hint === 'Não se aplica a um guia. Feche o guia para usar.', `pt-BR hint: ${hint}`);
    // Scrolled to the end, the destination card sits wholly above the dock.
    const clear = await page.evaluate(async () => {
      const sa = document.querySelector('.m-scrollarea'); sa.scrollTop = 1e6;
      await new Promise(r => setTimeout(r, 300));
      const last = document.querySelector('.g-stop.dest').getBoundingClientRect();
      const dock = document.querySelector('.g-dock .g-dock-card').getBoundingClientRect();
      return { lastBottom: Math.round(last.bottom), dockTop: Math.round(dock.top) };
    });
    out.phoneListEnd = clear;
    expect(clear.lastBottom <= clear.dockTop - 8, `phone List: the last card hides behind the dock: ${JSON.stringify(clear)}`);
    // The dock's arrows step past the last stop to the destination, then wrap.
    const stops = await page.locator('.g-stop[data-row-id]:not(.dest)').count();
    for (let i = 0; i <= stops; i++) { await page.locator('.g-dock .cb-step button').last().tap(); await page.waitForTimeout(150); }
    const atDest = await page.evaluate(() => ({ cur: !!document.querySelector('.g-stop.dest.current'), pos: document.querySelector('.g-dock .cb-pos').textContent }));
    out.phoneListDest = atDest;
    expect(atDest.cur && /Aonde leva/.test(atDest.pos), `phone List: the arrows did not reach the destination: ${JSON.stringify(atDest)}`);
    await page.locator('.g-dock .cb-step button').last().tap(); await page.waitForTimeout(150);
    expect(!(await page.locator('.g-stop.dest.current').count()), 'phone List: the arrows did not wrap past the destination');
    await page.locator('.m-fpill').tap({ force: true }).catch(() => {}); await page.waitForTimeout(400);
    expect(!(await page.locator('.m-sheet').count()), 'the folded-away Filters button opened its sheet');
    // Closing the guide brings the full bar back.
    await page.locator('.guide-pill .cb-close').tap(); await page.waitForTimeout(900);
    b = await page.evaluate(BAR);
    const back = await page.evaluate(() => ({ views: document.querySelectorAll('.view-menu').length }));
    out.phoneClosed = { b, back };
    expect(!b.short && !b.filtersAway && !b.rowAway && !b.viewBeside && b.row3H > 30 && back.views === 1, `phone, guide closed: ${JSON.stringify(out.phoneClosed)}`);
    errors.push(...e);
    await ctx.close();
  }
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { lang: 'en' });
    await page.goto(URL + '?view=spatial&type=series&guide=infinity-saga'); await appReady(page); await page.waitForTimeout(900);
    const s = await page.evaluate(OFF, { sort: PHONE_SELS.sort });
    const b = await page.evaluate(BAR);
    out.phoneSpatial = { s, b };
    expect(s.sort === 'on' && b.short && b.filtersAway && b.rowAway, `phone Spatial: ${JSON.stringify(out.phoneSpatial)}`);
    const c = await page.evaluate(CANVAS);
    out.phoneCanvas = c;
    expect(c.stops === 10 && c.dimmed === 0 && !c.summary, `phone Spatial with Series set: ${JSON.stringify(c)}`);
    // The dock: the next stop with Seen; no separate meter or Up next card.
    const d = await page.evaluate(() => {
      const next = (window.MCU_GUIDE.next(window.MCU_GUIDE.get('infinity-saga'), false, () => 'none') || {}).id;
      const card = document.querySelector(`.card[data-id="${next}"]`).getBoundingClientRect();
      const vp = document.querySelector('.viewport').getBoundingClientRect(), dock = document.querySelector('.g-dock').getBoundingClientRect();
      return { next, sub: (document.querySelector('.g-dock .g-dock-sub') || {}).textContent, seen: !!document.querySelector('.g-dock .g-dock-tsa .tsa-btn.seen'),
        segs: document.querySelectorAll('.g-dock-meter i').length, chip: !!document.querySelector('.un-chip'), meter: !!document.querySelector('.spatial-overall'),
        cx: Math.round(card.left + card.width / 2 - innerWidth / 2), inView: card.top >= vp.top && card.bottom <= dock.top + 1, readable: card.width >= 140 };
    });
    out.phoneDock = d;
    expect(d.sub === 'Next: Iron Man' && d.seen && d.segs === 10 && !d.chip && !d.meter, `phone dock: ${JSON.stringify(d)}`);
    expect(Math.abs(d.cx) < 4 && d.inView && d.readable, `phone guide not framed on its next stop: ${JSON.stringify(d)}`);
    // The zoom control rests hidden and shows while zooming (a double-tap here).
    const z0 = await page.evaluate(() => document.querySelector('.zoom-ctl').classList.contains('rest'));
    const vp = await page.evaluate(() => { const r = document.querySelector('.viewport').getBoundingClientRect(); return { x: r.left + 12, y: r.top + 12 }; });
    await page.touchscreen.tap(vp.x, vp.y); await page.waitForTimeout(120); await page.touchscreen.tap(vp.x, vp.y); await page.waitForTimeout(300);
    const z1 = await page.evaluate(() => document.querySelector('.zoom-ctl').classList.contains('rest'));
    await page.waitForTimeout(1900);
    const z2 = await page.evaluate(() => document.querySelector('.zoom-ctl').classList.contains('rest'));
    out.phoneZoom = { rest: z0, afterDoubleTap: z1, later: z2 };
    expect(z0 && !z1 && z2, `phone zoom control: ${JSON.stringify(out.phoneZoom)}`);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(!wide, 'the phone page scrolls sideways');
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
