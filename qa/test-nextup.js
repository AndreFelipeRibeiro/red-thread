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
  await page.locator('.coll-switch button[data-coll="watchlist"]').click(); await page.waitForTimeout(700);
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
    await page.locator('.coll-switch button[data-coll="watchlist"]').click(); await page.waitForTimeout(700);
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

  // 9. An old phone Grid link opens the List: no Grid cards (Notion "Phone:
  // remove the Grid view").
  await page.goto(URL + '?view=grid'); await settle(page);
  r = await page.evaluate(() => ({ cards: document.querySelectorAll('.m-card').length, rows: document.querySelectorAll('.m-lrow').length }));
  if (r.cards || !r.rows) err(`?view=grid on a phone: ${JSON.stringify(r)}, expected the List`);

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

  // 12. Desktop: the compact card in Titles and on Connections, whose Up next
  //     selects the card and opens the drawer.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({})));
  await page.goto(URL + '?view=list'); await settle(page);
  // Titles has the compact card too (Notion "Titles 3/5"), bottom right: a
  // new visitor's Up next is the first title out.
  r = await page.evaluate(() => ({ title: (document.querySelector('.dlist .spatial-overall .un-title') || {}).textContent || null, region: !!document.querySelector('.dlist .spatial-overall section.un-mrow[aria-label]'),
    pick: !!document.querySelector('.toolbar .ml-status .ml-pick') }));
  if (r.title !== name(out.expect.release) || !r.region || !r.pick) err(`desktop List card, new visitor: ${JSON.stringify(r)}`);
  await page.goto(URL + '?view=spatial'); await settle(page);
  await page.locator('.spatial-overall .un-open').click(); await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ drawer: (document.querySelector('.drawer.open .td-title') || {}).textContent,
    selected: (document.querySelector('.card.selected') || { dataset: {} }).dataset.id, row: !!document.querySelector('.spatial-overall .un-mrow') }));
  out.deskSpatial = r;
  if (r.drawer !== name(out.expect.release) || r.selected !== out.expect.release) err(`desktop Spatial row should select and open ${out.expect.release}: ${JSON.stringify(r)}`);
  if (r.row) err('the meter row should stand down while a title is selected');
  errors.forEach(e => err('desktop console: ' + e));
  await ctx.close();

  // 12b. The desktop List marks Up next in its row (Notion "Titles 2/5"):
  //      the first released, unseen title of the list in its own order and
  //      direction and tab; none on Seen; never a title not out yet. The list
  //      opens scrolled to it, just under the pinned header, and marking it
  //      seen moves the mark on.
  {
    const seenIds = byRelease.slice(0, 8).map(t => t.id);
    const watchIds = [byRelease[20].id, byRelease[14].id];
    const states = Object.fromEntries(seenIds.map(id => [id, 'seen']).concat(watchIds.map(id => [id, 'watchlist'])));
    const isSeen = (t) => seenIds.includes(t.id);
    ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(states)));
    await page.goto(URL + '?view=list'); await settle(page); await page.waitForTimeout(800);
    const mark = () => page.evaluate(() => {
      const rows = [...document.querySelectorAll('.dl-table .dl-row.up-next')];
      const r = rows[0];
      const dl = document.querySelector('.dlist').getBoundingClientRect();
      const head = document.querySelector('.dl-head').getBoundingClientRect();
      const box = r && r.getBoundingClientRect();
      return { ids: rows.map(x => x.dataset.rowId), pill: !!(r && r.querySelector('.dl-next-pill')), bar: !!(r && r.querySelector('.dl-next-bar')),
        button: r ? (r.querySelector('.tsa-next') || {}).textContent || null : null, scrolled: document.querySelector('.dlist').scrollTop > 0,
        underHead: box ? box.top >= head.bottom - 1 && box.bottom <= dl.bottom : null,
        // Nothing in the list is pinned; the row lands below the compact card
        // in the top-right corner (its scroll margin, 168px).
        nearHead: box ? Math.round(box.top - dl.top) : null };
    });
    const pick = async (fn) => { await page.evaluate(fn); await page.waitForTimeout(1300); return mark(); };
    const firstUnseen = (list) => (list.find(t => !isSeen(t)) || {}).id;
    r = await mark();
    out.deskList = { release: r };
    if (r.ids.join() !== firstUnseen(byRelease)) err(`desktop List, release order: Up next ${r.ids.join()}, expected ${firstUnseen(byRelease)}`);
    if (!r.pill || !r.bar || r.button !== 'Mark seen') err(`the Up next row lacks its pill, bar or "Mark seen": ${JSON.stringify(r)}`);
    if (!r.scrolled || !r.underHead || Math.abs(r.nearHead - 168) > 3) err(`the List did not open scrolled to Up next under the header: ${JSON.stringify(r)}`);
    // Orders come from the header's Sort menu, as on Connections.
    r = await page.evaluate(async () => { document.querySelector('.toolbar .sort-menu-trigger').click(); await new Promise(res => setTimeout(res, 300)); document.querySelector('.sort-menu-pop [data-sort="release"][data-dir="desc"]').click(); }).then(() => page.waitForTimeout(1300)).then(mark);
    out.deskList.newest = r;
    const newest = firstUnseen(byRelease.slice().reverse());
    if (r.ids.join() !== newest) err(`Release date, newest first: Up next ${r.ids.join()}, expected ${newest}`);
    r = await page.evaluate(async () => { document.querySelector('.toolbar .sort-menu-trigger').click(); await new Promise(res => setTimeout(res, 300)); document.querySelector('.sort-menu-pop [data-sort="chrono"][data-dir="asc"]').click(); }).then(() => page.waitForTimeout(1300)).then(mark);
    out.deskList.story = r;
    if (r.ids.join() !== firstUnseen(byStory)) err(`Story order: Up next ${r.ids.join()}, expected ${firstUnseen(byStory)}`);
    r = await pick(() => document.querySelector('.dl-head .c-imdb button').click());
    out.deskList.imdb = r;
    if (r.ids.join() !== firstUnseen(byImdb)) err(`IMDb: Up next ${r.ids.join()}, expected ${firstUnseen(byImdb)}`);
    r = await page.evaluate(async () => { document.querySelector('.toolbar .sort-menu-trigger').click(); await new Promise(res => setTimeout(res, 300)); document.querySelector('.sort-menu-pop [data-sort="release"][data-dir="asc"]').click(); }).then(() => page.waitForTimeout(1300)).then(mark);
    r = await pick(() => document.querySelector('.ml-status .coll-switch button[data-coll="watchlist"]').click());
    out.deskList.watchlist = r;
    const firstWatch = byRelease.find(t => watchIds.includes(t.id)).id;
    if (r.ids.join() !== firstWatch) err(`Watchlist tab: Up next ${r.ids.join()}, expected its first title ${firstWatch}`);
    r = await pick(() => document.querySelector('.ml-status .coll-switch button[data-coll="seen"]').click());
    if (r.ids.length) err(`the Seen tab marks ${r.ids.join()} as Up next`);
    r = await pick(() => document.querySelector('.ml-status .coll-switch button[data-coll="all"]').click());
    // Marking it seen moves the mark to the next unseen title.
    await page.locator('.dl-table .dl-row.up-next .tsa-next').click(); await page.waitForTimeout(1200);
    r = await mark();
    out.deskList.afterMark = r;
    const second = byRelease.filter(t => !isSeen(t))[1].id;
    if (r.ids.join() !== second) err(`after marking Up next seen, the mark is on ${r.ids.join()}, expected ${second}`);
    if (unreleased.some(t => r.ids.includes(t.id))) err('an unreleased title is Up next');
    errors.forEach(e => err('desktop List console: ' + e));
    await ctx.close();
  }

  // 12c. The compact card (Notion "Titles 3/5", after Andre's review), on
  //      Connections and in Titles: "All titles 5/60 +N" and Up next; ✓ marks
  //      seen and Up next moves on; ✕ dismisses the card for the visit on
  //      both views, while the list keeps marking Up next; a reload brings it
  //      back.
  {
    const seenIds = byRelease.slice(0, 5).map(t => t.id);
    const states = Object.fromEntries(seenIds.map(id => [id, 'seen']));
    const notOut = T.length - byRelease.length;
    ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(states)));
    await page.goto(URL + '?view=spatial'); await settle(page); await page.waitForTimeout(600);
    const card = () => page.evaluate(() => {
      const c = document.querySelector('.spatial-overall');
      if (!c) return null;
      const cur = c.querySelector('.un-mrow .un-slide > :not(.un-leave) .un-title');
      return { text: c.innerText.replace(/\s+/g, ' '), next: cur ? cur.textContent : null, inList: !!c.closest('.dlist') };
    });
    r = await card();
    out.widget = { start: r };
    if (!r) err('no compact card on desktop Connections');
    else {
      if (!r.text.includes(`${seenIds.length}/${byRelease.length}`) || !r.text.includes(`+${notOut}`)) err(`the compact card should read ${seenIds.length}/${byRelease.length} and +${notOut}: ${r.text}`);
      if (r.next !== name(byRelease[5].id)) err(`the card's Up next is ${r.next}, expected ${name(byRelease[5].id)}`);
    }
    await page.locator('.spatial-overall .un-mrow .tsa-btn.seen').click(); await page.waitForTimeout(900);
    r = await card(); out.widget.marked = r;
    if (!r || r.next !== name(byRelease[6].id)) err(`after ✓ the card's Up next is ${r && r.next}, expected ${name(byRelease[6].id)}`);
    // Titles: the same card, bottom right, with the same Up next as the list.
    await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(1200);
    r = await card(); out.widget.titles = r;
    const row = await page.evaluate(() => (document.querySelector('.dl-table .dl-row.up-next') || { dataset: {} }).dataset.rowId || null);
    if (!r || !r.inList || r.next !== name(byRelease[6].id) || row !== byRelease[6].id) err(`Titles: the card says ${r && r.next} (in the list: ${r && r.inList}) and the list marks ${row}; expected ${byRelease[6].id}`);
    // ✕ dismisses the card, on both views, and the list still marks Up next.
    await page.locator('.dlist .spatial-overall .un-mrow .un-hide').click(); await page.waitForTimeout(500);
    r = await page.evaluate(() => ({ card: !!document.querySelector('.spatial-overall'), row: (document.querySelector('.dl-table .dl-row.up-next') || { dataset: {} }).dataset.rowId || null }));
    out.widget.dismissed = r;
    if (r.card || r.row !== byRelease[6].id) err(`after ✕ in Titles: ${JSON.stringify(r)}`);
    await page.locator('.nav-tabs button', { hasText: 'Connections' }).click(); await page.waitForTimeout(1200);
    if (await card()) err('the dismissed card came back on Connections');
    await page.reload(); await settle(page); await page.waitForTimeout(600);
    if (!(await card())) err('a reload did not bring the card back');
    errors.forEach(e => err('card console: ' + e));
    await ctx.close();
  }

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
