const QA_PORT = +process.env.PORT || 8224; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
// data.js moved into the bundle (src/data/data.js) in Phase 2, so it is no
// longer a file in the served site. Expectations come from the source tree,
// which is where they belong: they describe the catalog, not the build.
const { loadCatalog } = require('./load-catalog');
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


// Up next (MCU_nextUp in tracking.jsx, upnext.jsx): the earliest released
// title not marked seen, in the order being browsed. Every expectation is
// worked out from the catalogue and today's date at run time, never a fixed
// list: Avengers: Doomsday becomes suggestible on its release day, and a
// check that named it would start failing that morning.
const seedJs = (states, folds) => `localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));` + (folds ? `localStorage.setItem('mcu.seenFolds.v1', ${JSON.stringify(JSON.stringify(folds))});` : '');
const PHONE320 = { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  // The phone card sits at the top of the List and Grid (above the meter),
  // and the suggested title's own row or card is left out of the list.
  const phoneCard = () => page.evaluate(() => {
    const c = document.querySelector('.un-gcard');
    const scroll = document.querySelector('.m-scrollarea');
    const kids = scroll ? [...scroll.children] : [];
    const at = kids.findIndex(k => k.contains(c));
    const meter = kids.findIndex(k => k.matches('.m-phase-divider.overall') || k.querySelector('.m-phase-divider.overall'));
    return { id: c ? c.dataset.titleId : null, n: document.querySelectorAll('.un-gcard').length,
      region: c && c.getAttribute('aria-label'), aboveMeter: c ? (meter === -1 || at < meter) : false,
      dupe: c ? !!document.querySelector(`[data-row-id="${c.dataset.titleId}"]:not(.un-inline)`) : false,
      live: [...document.querySelectorAll('[aria-live="polite"]')].map(e => e.textContent).filter(Boolean) };
  });

  // What the rule should say, from the data. Released = a full date on or
  // before today (month windows never count), as MCU_isReleased decides.
  const T = loadCatalog().TITLES;
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const isOut = t => /^\d{4}-\d{2}-\d{2}$/.test(t.release) && t.release <= today;
  const byRelease = T.filter(isOut).sort((a, b) => a.release.localeCompare(b.release));
  const byStory = T.filter(isOut).sort((a, b) => a.chronOrder - b.chronOrder);
  const unreleased = T.filter(t => !isOut(t)).sort((a, b) => a.release.localeCompare(b.release));
  const name = (id) => T.find(t => t.id === id).title;
  out.expect = { release: byRelease[0].id, story: byStory[0].id, firstUnreleased: unreleased[0] && unreleased[0].id };

  // 1. A new guest: the first title out, in release and story order, on the
  //    phone List; never a title not out yet.
  let { ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({}));
  await page.goto(URL + '?view=list'); await settle(page);
  let r = await phoneCard();
  out.newRelease = r;
  if (r.id !== out.expect.release) err(`new guest, release order: suggested ${r.id}, expected ${out.expect.release}`);
  if (r.n !== 1) err(`expected exactly one Up next card, found ${r.n}`);
  if (!r.region) err('the Up next card has no accessible name');
  if (!r.aboveMeter) err('the Up next card should sit at the top, above the All titles meter');
  if (r.dupe) err('the suggested title also appears as a normal row');
  await page.goto(URL + '?view=list&sort=chrono'); await settle(page);
  r = (await phoneCard()).id;
  out.newStory = r;
  if (r !== out.expect.story) err(`new guest, story order: suggested ${r}, expected ${out.expect.story}`);
  if (unreleased.some(t => t.id === r || t.id === out.newRelease.id)) err('an unreleased title was suggested');

  // 2. Mark seen from the row moves on; Undo brings it back; the new
  //    suggestion is announced politely.
  await page.goto(URL + '?view=list'); await settle(page);
  await page.locator('.un-gcard .tsa-btn.seen').click(); await page.waitForTimeout(900);
  r = await phoneCard();
  out.afterMark = r;
  if (r.id !== byRelease[1].id) err(`after marking ${out.expect.release} seen, suggested ${r.id}, expected ${byRelease[1].id}`);
  if (!r.live.some(t => t.includes(name(byRelease[1].id)))) err('the new suggestion was not announced in a polite live region');
  await page.locator('.mt-undo').click(); await page.waitForTimeout(900);
  r = (await phoneCard()).id;
  if (r !== out.expect.release) err(`Undo should bring back ${out.expect.release}, got ${r}`);

  // 3. The × hides Up next for now (user decision, 2026-10-29): it closes
  //    rather than moving on, comes back on reload, and never touches the
  //    collection.
  const before = await page.evaluate(() => localStorage.getItem('mcu.collection.v1'));
  await page.locator('.un-gcard .un-hide').click(); await page.waitForTimeout(600);
  const gone = () => page.evaluate(() => !document.querySelector('.un-card, .un-chip, .un-mrow'));
  if (!(await gone())) err('the × should close Up next, not move to another title');
  if (await page.evaluate(() => localStorage.getItem('mcu.collection.v1')) !== before) err('hiding Up next changed the stored collection');
  await page.reload(); await settle(page);
  if (await gone()) err('Up next should come back after a reload');

  // 4. A-Z, IMDb and RT follow the list itself, in its direction (user
  //    decision, 2026-10-29): the first released, unseen title of that list.
  const byTitle = T.filter(isOut).slice().sort((x, y) => x.title.localeCompare(y.title, 'en'));
  const byImdb = T.filter(isOut).slice().sort((x, y) => (x.imdb == null) - (y.imdb == null) || (y.imdb || 0) - (x.imdb || 0));
  for (const [q, want, label] of [['sort=title', byTitle[0], /A–Z order/], ['sort=title&order=desc', byTitle[byTitle.length - 1], /Z–A order/], ['sort=imdb', byImdb[0], /highest IMDb first/]]) {
    await page.goto(URL + '?view=list&' + q); await settle(page);
    r = await page.evaluate(() => ({ tag: (document.querySelector('.un-gcard .un-tag') || {}).textContent,
      id: (document.querySelector('.un-gcard') || { dataset: {} }).dataset.titleId,
      dupes: document.querySelectorAll(`[data-row-id="${(document.querySelector('.un-gcard') || { dataset: {} }).dataset.titleId}"]:not(.un-inline)`).length }));
    (out.listOrders = out.listOrders || {})[q] = r;
    if (r.id !== want.id) err(`${q}: suggested ${r.id}, expected ${want.id}`);
    if (!label.test(r.tag || '')) err(`${q}: the card should name the order, says "${r.tag}"`);
    if (r.dupes) err(`${q}: the suggested title also appears as a normal row`);
  }

  // 5. Search and the Seen tab hide it.
  await page.goto(URL + '?view=list'); await settle(page);
  await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
  await page.locator('.m-search-input input').fill('iron'); await page.waitForTimeout(800);
  if (await page.evaluate(() => !!document.querySelector('.un-card'))) err('Up next shows during a search');
  errors.forEach(e => err('phone console: ' + e));
  await ctx.close();

  // 6. Caught up: everything out is seen, so the card names the next arrival
  //    at its real precision, after the seen titles.
  if (unreleased.length) {
    const allSeen = Object.fromEntries(byRelease.map(t => [t.id, 'seen']));
    ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs(allSeen)));
    await page.goto(URL + '?view=list'); await settle(page);
    r = await page.evaluate(() => {
      const c = document.querySelector('.un-state');
      return { head: c && c.querySelector('.un-head').textContent, arrival: c && (c.querySelector('.un-arrival-title') || {}).textContent,
        release: c && (c.querySelector('.release-line') || {}).textContent, top: !!document.querySelector('.m-scrollarea > .un-inline.top .un-state') };
    });
    out.caughtUp = r;
    if (r.head !== "You're caught up") err(`caught up should say "You're caught up", said ${r.head}`);
    if (r.arrival !== name(unreleased[0].id)) err(`next arrival should be ${name(unreleased[0].id)}, was ${r.arrival}`);
    if (!r.top) err('the caught-up card should sit at the top of the list');
    errors.forEach(e => err('caught-up console: ' + e));
    await ctx.close();
  }

  // 7. Watchlist tab: empty says so and offers everything; with only titles
  //    not out yet it says when the next one arrives.
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({})));
  await page.goto(URL + '?view=list'); await settle(page);
  await page.locator('.coll-switch button').nth(3).click(); await page.waitForTimeout(700);
  r = await page.evaluate(() => ({ head: (document.querySelector('.un-head') || {}).textContent, btn: (document.querySelector('.un-state .un-btn') || {}).textContent }));
  out.watchEmpty = r;
  if (r.head !== 'Nothing on your Watchlist to watch yet') err(`empty Watchlist reads "${r.head}"`);
  await page.locator('.un-state .un-btn').click(); await page.waitForTimeout(700);
  if (!(await page.evaluate(() => !!document.querySelector('.un-gcard')))) err('Show from everything did not switch back to all titles');
  errors.forEach(e => err('watchlist console: ' + e));
  await ctx.close();
  if (unreleased.length) {
    ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({ [unreleased[0].id]: 'watchlist' })));
    await page.goto(URL + '?view=list'); await settle(page);
    await page.locator('.coll-switch button').nth(3).click(); await page.waitForTimeout(700);
    r = await page.evaluate(() => ({ head: (document.querySelector('.un-head') || {}).textContent, arrival: (document.querySelector('.un-arrival-title') || {}).textContent, top: !!document.querySelector('.un-inline.top .un-state') }));
    out.watchNotOut = r;
    if (r.head !== 'Nothing on your Watchlist is out yet' || r.arrival !== name(unreleased[0].id)) err(`Watchlist with nothing out reads "${r.head}" / "${r.arrival}"`);
    if (!r.top) err('the Watchlist message should sit at the top of the list');
    await ctx.close();
  }

  // 8. Filters narrow it and the card names them.
  const firstSeries = T.filter(isOut).filter(t => t.type === 'series').sort((a, b) => a.release.localeCompare(b.release))[0];
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({})));
  await page.goto(URL + '?view=list&type=series'); await settle(page);
  r = await page.evaluate(() => ({ id: (document.querySelector('.un-gcard') || { dataset: {} }).dataset.titleId, tag: (document.querySelector('.un-tag') || {}).textContent }));
  out.series = r;
  if (r.id !== firstSeries.id) err(`Series filter: suggested ${r.id}, expected ${firstSeries.id}`);
  if (!/Series/.test(r.tag || '')) err(`the card should name the Series filter: "${r.tag}"`);

  // 9. Phone Grid: one full-width card at the top, the title's own card left out.
  await page.goto(URL + '?view=grid'); await settle(page);
  r = await page.evaluate(() => ({ cards: document.querySelectorAll('.un-gcard').length, title: (document.querySelector('.un-gcard .un-title') || {}).textContent,
    own: [...document.querySelectorAll('.m-card .m-ctitle')].map(e => e.textContent) }));
  if (r.cards !== 1 || r.title !== name(out.expect.release)) err(`Grid: ${r.cards} Up next cards, title ${r.title}`);
  if (r.own.includes(r.title)) err('Grid: the suggested title also appears as a normal card');

  // 10. Phone Spatial: a chip that opens the details.
  await page.goto(URL + '?view=spatial'); await settle(page);
  const chip = await page.evaluate(() => (document.querySelector('.un-chip .un-title') || {}).textContent);
  if (chip !== name(out.expect.release)) err(`phone Spatial chip shows ${chip}`);
  await page.locator('.un-chip .un-open').click(); await page.waitForTimeout(1200);
  const sheet = await page.evaluate(() => (document.querySelector('.m-sheet .td-title') || {}).textContent);
  if (sheet !== name(out.expect.release)) err(`the chip should open ${name(out.expect.release)}'s details, opened ${sheet}`);
  errors.forEach(e => err('phone views console: ' + e));
  await ctx.close();

  // 11. 320px: nothing runs past the edge.
  ({ ctx, page, errors } = await ctxPage(browser, PHONE320, seedJs({})));
  await page.goto(URL + '?view=list&sort=title'); await settle(page);
  r = await page.evaluate(() => { const c = document.querySelector('.un-gcard'); if (!c) return 'missing'; const box = c.getBoundingClientRect();
    return [...c.querySelectorAll('*')].some(e => e.getBoundingClientRect().right > box.right + 0.5) ? 'overflow' : 'ok'; });
  if (r !== 'ok') err(`320px card: ${r}`);
  await ctx.close();

  // 12. Desktop: the List strip, and the Spatial meter row that selects the
  //     card and opens the drawer.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({})));
  await page.goto(URL + '?view=list'); await settle(page);
  r = await page.evaluate(() => ({ title: (document.querySelector('.un-strip .un-title') || {}).textContent, region: !!document.querySelector('section.un-strip[aria-label]') }));
  if (r.title !== name(out.expect.release) || !r.region) err(`desktop List strip: ${JSON.stringify(r)}`);
  await page.goto(URL + '?view=spatial'); await settle(page);
  await page.locator('.spatial-overall .un-open').click(); await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ drawer: (document.querySelector('.drawer.open .td-title') || {}).textContent,
    selected: (document.querySelector('.card.selected') || { dataset: {} }).dataset.id, row: !!document.querySelector('.spatial-overall .un-mrow') }));
  out.deskSpatial = r;
  if (r.drawer !== name(out.expect.release) || r.selected !== out.expect.release) err(`desktop Spatial row should select and open ${out.expect.release}: ${JSON.stringify(r)}`);
  if (r.row) err('the meter row should stand down while a title is selected');
  errors.forEach(e => err('desktop console: ' + e));
  await ctx.close();

  // 13. Portuguese.
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({}) + "localStorage.setItem('mcu.lang.v1','pt-BR');"));
  await page.goto(URL + '?view=list'); await settle(page);
  r = await page.evaluate(() => ({ tag: (document.querySelector('.un-tag') || {}).textContent, hide: (document.querySelector('.un-gcard .un-hide') || { getAttribute: () => null }).getAttribute('aria-label') }));
  out.pt = r;
  if (r.tag !== 'A seguir · ordem de lançamento' || r.hide !== 'Ocultar A seguir por enquanto') err(`Portuguese reads "${r.tag}" / "${r.hide}"`);
  await ctx.close();

  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
