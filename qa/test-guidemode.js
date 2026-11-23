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
// - phones: a guide in the list is the Guides tab, with no toolbar row; the
//   last card scrolls clear of the dock, the dock's arrows reach the
//   destination, and closing brings the gallery back (My list has its row);
//   on the Explore canvas Sort is on and Filters dimmed with the hint, the dock
//   shows the next stop with Seen (no meter or Up next card), the next stop is
//   framed at a readable size, and the zoom control rests hidden until a
//   double-tap.
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
// The phone's toolbar row (Notion "Phone: bottom bar becomes Explore, My list
// and Guides"): Sort and Filters, under the header.
const PHONE_SELS = { sort: '.m-toolrow .sort-menu-trigger', filters: '.m-toolrow .m-fpill' };
const CANVAS = () => {
  const cards = [...document.querySelectorAll('.card')].filter(c => c.querySelector('.card-gnum'));
  return { stops: cards.length, dimmed: cards.filter(c => c.classList.contains('dimmed') || c.classList.contains('coll-dim')).length,
    films: cards.filter(c => (window.TITLES.find(t => t.id === c.dataset.id) || {}).type === 'film').length,
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
    await page.locator('.nav-tabs button', { hasText: 'Connections' }).click(); await page.waitForTimeout(1200);
    s = await page.evaluate(OFF, DESK_SELS);
    out.deskSpatial = s;
    expect(s.sort === 'on' && s.filters === 'off', `desktop Explore: ${JSON.stringify(s)}`);
    const hint = await page.evaluate(() => (document.getElementById('guide-off-hint') || {}).textContent);
    expect(hint === HINT, `hint: ${hint}`);
    await page.locator('.filters-pop-wrap > .filters-pill').click({ force: true }); await page.waitForTimeout(300);
    expect(!(await page.locator('.filters-pop').count()), 'a dimmed Filters opened');
    let c = await page.evaluate(CANVAS);
    out.deskCanvas = c;
    expect(c.stops === 12 && c.dimmed === 0 && c.films >= 9, `Explore with a guide: ${JSON.stringify(c)}`);
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
    await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(900);
    after.url = await page.evaluate(() => location.search);
    out.deskClosed = { s, after };
    expect(Object.values(s).every(v => v === 'on'), `after closing, controls still off: ${JSON.stringify(s)}`);
    expect(after.title === 'Filters' && /type=series/.test(after.url) && !/guide=/.test(after.url), `after closing: ${JSON.stringify(after)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone: the Guides tab, then Explore; Portuguese ----------------------
  // A guide in the list is the Guides tab: no toolbar row. On the canvas
  // (Explore) Sort stays on and Filters is dimmed. The guide's dock replaces
  // the meter, Up next and the old pill.
  const BAR = () => ({ toolrow: !!document.querySelector('.m-toolrow'), tab: (document.querySelector('.m-tab.on') || { dataset: {} }).dataset.section || null,
    gallery: document.querySelectorAll('.g-page .g-row').length });
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { lang: 'pt-BR' });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(700);
    let b = await page.evaluate(BAR);
    out.phoneList = { b };
    expect(!b.toolrow && b.tab === 'guides', `phone guide list: ${JSON.stringify(b)}`);
    // In Guides the guide has no dock (Notion "Guides 3/4": its header does
    // that job); scrolled to the end, "Where it leads" sits wholly above the
    // bottom bar.
    const clear = await page.evaluate(async () => {
      const sa = document.querySelector('.m-scrollarea'); sa.scrollTop = 1e6;
      await new Promise(r => setTimeout(r, 300));
      const last = document.querySelector('.g-stop.dest').getBoundingClientRect();
      const bar = document.querySelector('.m-navbar').getBoundingClientRect();
      return { lastBottom: Math.round(last.bottom), barTop: Math.round(bar.top), dock: !!document.querySelector('.g-dock') };
    });
    out.phoneListEnd = clear;
    expect(!clear.dock && clear.lastBottom <= clear.barTop, `phone List: ${JSON.stringify(clear)}`);
    // "‹ Guides" brings the Guides list back.
    await page.locator('.g-back').tap(); await page.waitForTimeout(900);
    b = await page.evaluate(BAR);
    out.phoneClosed = { b };
    expect(b.tab === 'guides' && b.gallery >= 5 && !b.toolrow, `phone, guide closed: ${JSON.stringify(out.phoneClosed)}`);
    // My list: the toolbar row is back, with Portuguese labels.
    await page.locator('.m-tab[data-section="mylist"]').tap(); await page.waitForTimeout(700);
    b = await page.evaluate(BAR);
    expect(b.toolrow && b.tab === 'mylist', `phone My list: ${JSON.stringify(b)}`);
    errors.push(...e);
    await ctx.close();
  }
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { lang: 'en' });
    await page.goto(URL + '?view=spatial&type=series&guide=infinity-saga'); await appReady(page); await page.waitForTimeout(900);
    const s = await page.evaluate(OFF, PHONE_SELS);
    const b = await page.evaluate(BAR);
    const hint = await page.evaluate(() => (document.getElementById('guide-off-hint') || {}).textContent);
    out.phoneSpatial = { s, b, hint };
    expect(s.sort === 'on' && s.filters === 'off' && b.tab === 'explore' && hint === HINT, `phone Explore: ${JSON.stringify(out.phoneSpatial)}`);
    const c = await page.evaluate(CANVAS);
    out.phoneCanvas = c;
    expect(c.stops === 12 && c.dimmed === 0 && !c.summary, `phone Spatial with Series set: ${JSON.stringify(c)}`);
    // The dock: the next stop (no ✓: it is marked in its details); no separate meter or Up next card.
    const d = await page.evaluate(() => {
      const next = (window.MCU_GUIDE.next(window.MCU_GUIDE.get('infinity-saga'), false, () => 'none') || {}).id;
      const card = document.querySelector(`.card[data-id="${next}"]`).getBoundingClientRect();
      const vp = document.querySelector('.viewport').getBoundingClientRect(), dock = document.querySelector('.g-dock').getBoundingClientRect();
      return { next, sub: (document.querySelector('.g-dock .g-dock-next .gm-ntitle') || {}).textContent, seen: !!document.querySelector('.g-dock .tsa-btn.seen'),
        segs: document.querySelectorAll('.g-dock-meter i').length, chip: !!document.querySelector('.un-mrow'), meter: !!document.querySelector('.spatial-overall'),
        inView: card.top >= vp.top && card.bottom <= dock.top + 1,
        // The phone opens on the next stop at the reading zoom, centred, with
        // the stop selected (Andre, 2026-11-17: the fit-the-whole-path view of
        // Notion "Explore E 5/5" was a row of thumbnails on the guide line).
        centred: Math.abs((card.left + card.right) / 2 - (vp.left + vp.right) / 2) <= 40,
        cardW: Math.round(card.width),
        // The landing zoom every strip lands at (Notion "Spatial: one landing
        // for every strip", 2026-11-18): about 2.5 titles across.
        landW: Math.round(170 * Math.min(1, vp.width / (170 * 1.15 * 2.5))), at: [...document.querySelectorAll('.card.up-next, .card.guide-at')].map(c => c.dataset.id) };
    });
    out.phoneDock = d;
    expect(d.sub === 'Iron Man' && !d.seen && d.segs === 12 && !d.chip && !d.meter, `phone dock: ${JSON.stringify(d)}`);
    expect(d.inView && d.centred && Math.abs(d.cardW - d.landW) <= 2, `phone guide should open on its next stop, centred at a readable size: ${JSON.stringify(d)}`);
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

  // A short phone (375×667): stepping through a guide frames each stop above
  // the dock, as landing does (Andre, 2026-11-16: the stepper parked the
  // card behind the guide's card).
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true }, { lang: 'en' });
    await page.goto(URL + '?view=spatial&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(900);
    const steps = [];
    for (let i = 0; i < 3; i++) {
      await page.locator('.g-dock .cb-step button').last().tap(); await page.waitForTimeout(1300);
      steps.push(await page.evaluate(() => {
        const name = document.querySelector('.g-dock .cb-pos').textContent.split(' · ').slice(1).join(' · ');
        const t = window.TITLES.find(x => window.MCU_I18N.titleName(x) === name);
        const card = t && document.querySelector(`.card[data-id="${t.id}"]`);
        if (!card) return { name, missing: true };
        return { id: t.id, bottom: Math.round(card.getBoundingClientRect().bottom), dock: Math.round(document.querySelector('.g-dock').getBoundingClientRect().top) };
      }));
    }
    out.shortPhoneSteps = steps;
    steps.forEach(s => expect(!s.missing && s.bottom <= s.dock, `short phone: stepping parked a card under the guide's card: ${JSON.stringify(s)}`));
    errors.push(...e);
    await ctx.close();
  }

  // Desktop Connections, the guide line (Notion "Guide line", 2026-11-17):
  // only the guide's stops and its target stand on the canvas, in one row in
  // guide order; a ?guide= link lands on the next stop with its details open;
  // Mark seen moves on to the next stop, whose card carries the gray
  // current-stop outline while Up next keeps the red one; Undo takes the mark
  // back and steps back to the title.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { lang: 'en' });
    await page.goto(URL + '?guide=before-doomsday'); await appReady(page);
    await page.waitForFunction(() => /title=infinity-war/.test(location.search), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const line = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('.card')].filter(c => !c.classList.contains('ring-hidden'));
      const ids = shown.map(c => ({ id: c.dataset.id, x: Math.round(c.getBoundingClientRect().left), y: Math.round(c.getBoundingClientRect().top) })).sort((a, b) => a.x - b.x);
      return { ids: ids.map(c => c.id), rows: new Set(ids.map(c => c.y)).size, url: location.search };
    });
    out.guideLine = line;
    expect(line.ids.length === 13 && line.ids[0] === 'infinity-war' && line.ids[1] === 'endgame' && line.ids[12] === 'doomsday', `guide line: expected the 12 stops in order, then Doomsday: ${JSON.stringify(line)}`);
    expect(line.rows === 1, `guide line: the stops are not in one row: ${JSON.stringify(line)}`);
    expect(/title=infinity-war/.test(line.url), `guide landing: the first stop's details did not open: ${line.url}`);
    await page.locator('.drawer.open button', { hasText: 'Mark seen' }).first().click();
    await page.waitForFunction(() => /title=endgame/.test(location.search), null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    const moved = await page.evaluate(() => ({ url: location.search, at: [...document.querySelectorAll('.card.guide-at')].map(c => c.dataset.id), next: [...document.querySelectorAll('.card.up-next')].map(c => c.dataset.id) }));
    out.guideSeenNext = moved;
    expect(/title=endgame/.test(moved.url), `Mark seen did not move on to the next stop: ${moved.url}`);
    expect(!moved.at.length || moved.at.join() === 'endgame', `the current-stop outline is on the wrong card: ${JSON.stringify(moved)}`);
    await page.locator('.mt-undo').first().click();
    await page.waitForFunction(() => /title=infinity-war/.test(location.search), null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    const back = await page.evaluate(() => ({ url: location.search, first: (JSON.parse(localStorage.getItem('mcu.collection.v1')).states || {})['infinity-war'] || 'unseen' }));
    out.guideUndo = back;
    expect(/title=infinity-war/.test(back.url) && back.first !== 'seen', `Undo after Mark seen did not step back to the title: ${JSON.stringify(back)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
