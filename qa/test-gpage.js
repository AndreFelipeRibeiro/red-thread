// "Part of" in the details (V3 Tasks, "Make 'Part of' a collapsible section in
// the details, closed while a guide is open"):
// - a DetailSection with a count in its label and a real button heading, on
//   the desktop drawer and the phone sheet;
// - open when the details come from anywhere but a guide, closed while a guide
//   is open; each context keeps its own state for the visit, a reload restores
//   the defaults;
// - titles in no guide show no section; rows still open their guide;
// - Enter and Space toggle; Portuguese label.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
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
const PORT = +process.env.PORT || 8247;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');" + (init || ''));
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
const seed = (states) => `localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;

// The Guides page (Notion "Guides 1/4"): the hero for the guide in focus (or,
// with nothing followed, the guide the promotion rules pick, not started),
// then shelves of guide cards. Following lives on the device
// (mcu.guidesFollowed.v1). Checked: the hero and its call to action (Start
// guide follows, Mark seen marks the next stop), the cards' status rows
// (bar only when followed; "+ Follow"; "All N seen"), no orphan shelf, card
// heights in a row, a card opening its guide, the old single remembered guide
// becoming the first followed one, and phones from 320px with a large text
// size in Portuguese (nothing past an edge).
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  const READ = () => {
    const G = window.MCU_GUIDE;
    const hero = document.querySelector('.g-hero');
    const cards = [...document.querySelectorAll('.g-gcard')];
    const nameOf = (c) => c.querySelector('.g-card-open').textContent;
    return {
      hero: hero ? hero.querySelector('.g-hero-title').textContent : null,
      kicker: hero ? hero.querySelector('.g-hero-kicker').textContent : null,
      cta: (document.querySelector('.g-cta') || {}).textContent || null,
      heroBar: !!(hero && hero.querySelector('.g-hero-bar')),
      shelves: [...document.querySelectorAll('.g-shelf:not(.g-continue)')].map(sh => sh.querySelectorAll('.g-gcard').length),
      cards: cards.map(c => ({ name: nameOf(c), status: c.querySelector('.g-card-status').innerText.replace(/\n/g, ' '),
        follow: !!c.querySelector('.g-follow'), bar: !!c.querySelector('.g-card-bar'), h: Math.round(c.getBoundingClientRect().height),
        top: Math.round(c.getBoundingClientRect().top) })),
      rows: document.querySelectorAll('.g-page .g-row').length,
      guides: G.all().length,
      followed: JSON.parse(localStorage.getItem('mcu.guidesFollowed.v1') || 'null'),
    };
  };

  // 1. A new visitor on desktop.
  let { ctx, page, errors } = await ctxPage(browser, DESK, seed({}));
  await page.goto(URL + '?view=guides'); await settle(page);
  let r = await page.evaluate(READ);
  out.newVisitor = r;
  if (!r.hero) err('no hero on the Guides page');
  if (r.cta !== 'Start guide') err(`a new visitor's hero should offer "Start guide", offers "${r.cta}"`);
  if (r.heroBar) err('the hero shows a progress bar for a guide not followed');
  if (r.rows !== r.guides) err(`the page lists ${r.rows} guides, expected ${r.guides}`);
  if (r.cards.some(c => c.name === r.hero)) err('the hero guide also appears on a shelf');
  if (r.shelves.length > 1 && r.shelves.some(n => n < 4)) err(`a shelf holds fewer than 4 guides: ${JSON.stringify(r.shelves)}`);
  if (r.cards.some(c => c.bar)) err('a card not followed shows a progress bar');
  if (!r.cards.every(c => c.follow && /None seen yet/.test(c.status))) err(`new visitor cards should read "None seen yet" with + Follow: ${JSON.stringify(r.cards.map(c => c.status))}`);
  const rowTops = {};
  r.cards.forEach(c => { (rowTops[c.top] = rowTops[c.top] || []).push(c.h); });
  if (Object.values(rowTops).some(hs => Math.max(...hs) - Math.min(...hs) > 1)) err(`card heights differ within a row: ${JSON.stringify(rowTops)}`);

  // 2. Start guide follows the hero's guide; its call to action becomes Mark
  //    seen, and the progress bar appears.
  const heroName = r.hero;
  await page.locator('.g-cta').click(); await page.waitForTimeout(500);
  r = await page.evaluate(READ);
  out.started = { cta: r.cta, followed: r.followed, bar: r.heroBar };
  const heroId = await page.evaluate((n) => window.MCU_GUIDE.all().find(g => window.MCU_GUIDE.name(g) === n).id, heroName);
  if (!r.followed || r.followed[0].id !== heroId) err(`Start guide did not follow ${heroId}: ${JSON.stringify(r.followed)}`);
  if (r.cta !== 'Mark seen' || !r.heroBar) err(`after Start guide: ${JSON.stringify(out.started)}`);

  // 3. Mark seen marks the next stop, with the usual toast and Undo.
  const nextId = await page.evaluate((id) => { const G = window.MCU_GUIDE; return G.next(G.get(id), false, (t) => (JSON.parse(localStorage.getItem('mcu.collection.v1')).states[t] || 'none')).id; }, heroId);
  await page.locator('.g-cta').click(); await page.waitForTimeout(800);
  r = await page.evaluate((id) => ({ state: JSON.parse(localStorage.getItem('mcu.collection.v1')).states[id], toast: !!document.querySelector('.mcu-toast .mt-undo'), seen: document.querySelectorAll('.g-hstop.seen').length }), nextId);
  out.marked = r;
  if (r.state !== 'seen' || !r.toast || r.seen < 1) err(`Mark seen on ${nextId}: ${JSON.stringify(r)}`);

  // 4. + Follow on a card: the bar and "· Following", no button.
  const firstName = await page.evaluate(() => document.querySelector('.g-gcard .g-card-open').textContent);
  await page.locator('.g-gcard').first().locator('.g-follow').click(); await page.waitForTimeout(400);
  r = await page.evaluate((n) => { const c = [...document.querySelectorAll('.g-gcard')].find(x => x.querySelector('.g-card-open').textContent === n);
    return { status: c.querySelector('.g-card-status').innerText.replace(/\n/g, ' '), bar: !!c.querySelector('.g-card-bar'), follow: !!c.querySelector('.g-follow'), hero: document.querySelector('.g-hero-title').textContent }; }, firstName);
  out.followCard = r;
  if (!/Following/.test(r.status) || !r.bar || r.follow) err(`following ${firstName}: ${JSON.stringify(r)}`);

  // 5. A card opens its guide.
  await page.locator('.g-gcard .g-card-open').first().click(); await page.waitForTimeout(700);
  r = await page.evaluate(() => new URLSearchParams(location.search).get('guide'));
  if (!r) err('a card did not open its guide');
  errors.forEach(e => err('desktop console: ' + e));
  await ctx.close();

  // 6. Every essential stop seen, not followed: "✓ All N seen", no button.
  ({ ctx, page, errors } = await ctxPage(browser, DESK, ''));
  await page.goto(URL); await settle(page);
  const avengers = await page.evaluate(() => { const G = window.MCU_GUIDE; const g = G.all().find(x => !x.target && x.id !== 'animated'); return { id: g.id, name: G.name(g), ids: G.stops(g, false).filter(s => window.MCU_isReleased(s.title)).map(s => s.id) }; });
  await ctx.close();
  ({ ctx, page, errors } = await ctxPage(browser, DESK, seed(Object.fromEntries(avengers.ids.map(id => [id, 'seen'])))));
  await page.goto(URL + '?view=guides'); await settle(page);
  r = await page.evaluate((n) => { const c = [...document.querySelectorAll('.g-gcard')].find(x => x.querySelector('.g-card-open').textContent === n);
    return c ? { status: c.querySelector('.g-card-status').innerText.replace(/\n/g, ' '), follow: !!c.querySelector('.g-follow') } : null; }, avengers.name);
  out.allSeen = r;
  if (!r || !/^All \d+ seen$/.test(r.status.trim()) || r.follow) err(`${avengers.name} fully seen: ${JSON.stringify(r)}`);
  await ctx.close();

  // 7. The old single remembered guide becomes the first followed one and
  //    the guide in focus (no event guide is followed). The app still reopens
  //    it on arrival, as before.
  ({ ctx, page, errors } = await ctxPage(browser, DESK, seed({}) + "localStorage.setItem('mcu.guide.v1','spider-man');"));
  await page.goto(URL); await settle(page);
  r = await page.evaluate(() => { const G = window.MCU_GUIDE; const f = G.focus(() => 'none', window.todayISO()); return { ids: G.followed(), focus: f && f.id }; });
  out.migrated = r;
  if (r.ids[0] !== 'spider-man' || r.focus !== 'spider-man') err(`the remembered guide: ${JSON.stringify(r)}`);
  await ctx.close();

  // 8. Phones: nothing past an edge, the strip inside the hero, the shelf
  //    scrolling sideways; 320 to 430px, and 320px in Portuguese at Large.
  for (const [w, init, label] of [[320, '', '320'], [390, '', '390'], [430, '', '430'], [320, "localStorage.setItem('mcu.lang.v1','pt-BR');localStorage.setItem('mcu.textSize.v1','large');", '320 pt-BR large']]) {
    ({ ctx, page, errors } = await ctxPage(browser, { ...PHONE, viewport: { width: w, height: 844 } }, seed({}) + init));
    await page.goto(URL + '?view=guides'); await settle(page);
    r = await page.evaluate(() => {
      const hero = document.querySelector('.g-hero').getBoundingClientRect();
      const past = (sel, box) => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).filter(e => { const b = e.getBoundingClientRect(); return b.right > box.right + 0.5 || b.left < box.left - 0.5; }).length;
      const row = document.querySelector('.g-shelf-row');
      return { hScroll: document.documentElement.scrollWidth > innerWidth, stripOut: past('.g-strip > li', hero), introOut: past('.g-hero-intro *', hero),
        rowScrolls: row ? row.scrollWidth > row.clientWidth : null,
        cardOut: [...document.querySelectorAll('.g-gcard')].filter(c => { const b = c.getBoundingClientRect(); return [...c.querySelectorAll('*')].some(e => e.getClientRects().length && e.getBoundingClientRect().right > b.right + 0.5); }).length };
    });
    out['phone ' + label] = r;
    if (r.hScroll || r.stripOut || r.introOut || r.cardOut) err(`phone ${label}: ${JSON.stringify(r)}`);
    // Show all (Andre, 2026-11-16: three across squeezed the cards and pushed
    // Follow out): two a row, one under 360px, nothing past a card's edge.
    await page.locator('.g-shelf-all').first().click();
    await page.waitForTimeout(250);
    r = await page.evaluate(() => {
      const grid = document.querySelector('.g-shelf-row.grid');
      if (!grid) return { grid: false };
      return { cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        cardOut: [...grid.querySelectorAll('.g-gcard')].filter(c => { const b = c.getBoundingClientRect(); return [...c.querySelectorAll('*')].some(e => e.getClientRects().length && e.getBoundingClientRect().right > b.right + 0.5); }).length };
    });
    out['phone ' + label + ' show all'] = r;
    if (r.cols !== (w < 360 ? 1 : 2) || r.cardOut) err(`phone ${label} show all: ${JSON.stringify(r)}`);
    errors.forEach(e => err(`phone ${label} console: ` + e));
    await ctx.close();
  }

  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
