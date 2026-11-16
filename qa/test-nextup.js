const QA_PORT = +process.env.PORT || 8224; // regress/quick give each check its own port
const { chromium } = require('playwright');
const { setColl } = require('./coll');
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
const seedJs = (states) => `localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;
const PHONE320 = { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  // Phones (Notion "Titles 4/5"): Up next is the compact card's second row,
  // docked above the bottom bar, and the same title is marked in its own row
  // of the List (red edge, "Up next" pill, filled check).
  const phoneCard = () => page.evaluate(() => {
    const c = document.querySelector('.spatial-overall.docked .un-mrow');
    const cur = c && c.querySelector('.un-slide > :not(.un-leave)');
    const t = cur && cur.querySelector('.un-title').textContent;
    const hit = t ? window.TITLES.find(x => window.MCU_I18N.titleName(x) === t) : null;
    const rows = [...document.querySelectorAll('.m-lrow.up-next')];
    const tag = cur && cur.querySelector('.un-tag');
    return { id: hit ? hit.id : null, n: document.querySelectorAll('.spatial-overall .un-mrow').length,
      region: c && c.getAttribute('aria-label'), tag: tag ? tag.getAttribute('title') : null,
      rows: rows.length, rowId: rows.length ? rows[0].dataset.rowId : null, pill: rows.length ? !!rows[0].querySelector('.m-next-pill') : false,
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
  //    phone List; never a title not out yet. The card and the row agree.
  let { ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({}));
  await page.goto(URL + '?view=list'); await settle(page);
  let r = await phoneCard();
  out.newRelease = r;
  if (r.id !== out.expect.release) err(`new guest, release order: suggested ${r.id}, expected ${out.expect.release}`);
  if (r.n !== 1) err(`expected exactly one Up next in the card, found ${r.n}`);
  if (!r.region) err('the Up next row has no accessible name');
  if (r.rows !== 1 || r.rowId !== r.id || !r.pill) err(`the List should mark ${r.id} in its own row with the pill: ${JSON.stringify(r)}`);
  await page.goto(URL + '?view=list&sort=chrono'); await settle(page);
  r = (await phoneCard()).id;
  out.newStory = r;
  if (r !== out.expect.story) err(`new guest, story order: suggested ${r}, expected ${out.expect.story}`);
  if (unreleased.some(t => t.id === r || t.id === out.newRelease.id)) err('an unreleased title was suggested');

  // 2. Mark seen from the row moves on; Undo brings it back; the new
  //    suggestion is announced politely.
  await page.goto(URL + '?view=list'); await settle(page);
  await page.locator('.m-lrow.up-next .tsa-btn.seen').click(); await page.waitForTimeout(900);
  r = await phoneCard();
  out.afterMark = r;
  if (r.id !== byRelease[1].id || r.rowId !== byRelease[1].id) err(`after marking ${out.expect.release} seen, suggested ${r.id} (row ${r.rowId}), expected ${byRelease[1].id}`);
  if (!r.live.some(t => t.includes(name(byRelease[1].id)))) err('the new suggestion was not announced in a polite live region');
  await page.locator('.mt-undo').click(); await page.waitForTimeout(900);
  r = (await phoneCard()).id;
  if (r !== out.expect.release) err(`Undo should bring back ${out.expect.release}, got ${r}`);

  // 3. The card's × hides the card for this visit (Andre, 2026-11-15): the
  //    List keeps marking Up next, a reload brings the card back, and the
  //    collection is never touched.
  const before = await page.evaluate(() => localStorage.getItem('mcu.collection.v1'));
  await page.locator('.spatial-overall .un-hide').click(); await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ card: !!document.querySelector('.spatial-overall'), row: !!document.querySelector('.m-lrow.up-next') }));
  out.hidden = r;
  if (r.card) err('the × should close the card');
  if (!r.row) err('hiding the card should leave Up next marked in the List');
  if (await page.evaluate(() => localStorage.getItem('mcu.collection.v1')) !== before) err('hiding the card changed the stored collection');
  await page.reload(); await settle(page);
  if (!(await page.evaluate(() => !!document.querySelector('.spatial-overall .un-mrow')))) err('the card should come back after a reload');

  // 4. A-Z, IMDb and RT follow the list itself, in its direction (user
  //    decision, 2026-10-29): the first released, unseen title of that list.
  //    The card's tag says "Up next"; its tooltip names the order.
  const byTitle = T.filter(isOut).slice().sort((x, y) => x.title.localeCompare(y.title, 'en'));
  const byImdb = T.filter(isOut).slice().sort((x, y) => (x.imdb == null) - (y.imdb == null) || (y.imdb || 0) - (x.imdb || 0));
  for (const [q, want, label] of [['sort=title', byTitle[0], /A–Z order/], ['sort=title&order=desc', byTitle[byTitle.length - 1], /Z–A order/], ['sort=imdb', byImdb[0], /highest IMDb first/]]) {
    await page.goto(URL + '?view=list&' + q); await settle(page);
    r = await phoneCard();
    (out.listOrders = out.listOrders || {})[q] = { id: r.id, tag: r.tag, rowId: r.rowId };
    if (r.id !== want.id) err(`${q}: suggested ${r.id}, expected ${want.id}`);
    if (!label.test(r.tag || '')) err(`${q}: the card should name the order, says "${r.tag}"`);
    if (r.rowId !== want.id) err(`${q}: the List marks ${r.rowId}, expected ${want.id}`);
  }

  // 5. Search hides it, in the card and in the List.
  await page.goto(URL + '?view=list'); await settle(page);
  await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
  await page.locator('.m-search-input input').fill('iron'); await page.waitForTimeout(800);
  if (await page.evaluate(() => !!document.querySelector('.un-mrow, .m-lrow.up-next'))) err('Up next shows during a search');
  errors.forEach(e => err('phone console: ' + e));
  await ctx.close();

  // 6. Caught up: everything out is seen, so nothing is suggested: the card
  //    keeps All titles alone and no row is marked.
  if (unreleased.length) {
    const allSeen = Object.fromEntries(byRelease.map(t => [t.id, 'seen']));
    ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs(allSeen)));
    await page.goto(URL + '?view=list'); await settle(page);
    r = await page.evaluate(() => ({ meter: !!document.querySelector('.spatial-overall.docked .pgh'), upnext: !!document.querySelector('.un-mrow'), row: !!document.querySelector('.m-lrow.up-next') }));
    out.caughtUp = r;
    if (!r.meter || r.upnext || r.row) err(`caught up: ${JSON.stringify(r)}, expected All titles alone`);
    errors.forEach(e => err('caught-up console: ' + e));
    await ctx.close();
  }

  // 7. Watchlist tab: with nothing on it, nothing is suggested; back on All,
  //    Up next returns.
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({})));
  await page.goto(URL + '?view=list'); await settle(page);
  await setColl(page, 'watchlist'); await page.waitForTimeout(700);
  r = await page.evaluate(() => ({ upnext: !!document.querySelector('.un-mrow'), row: !!document.querySelector('.m-lrow.up-next') }));
  out.watchEmpty = r;
  if (r.upnext || r.row) err(`the empty Watchlist suggests something: ${JSON.stringify(r)}`);
  await setColl(page, 'all'); await page.waitForTimeout(700);
  if (!(await page.evaluate(() => !!document.querySelector('.spatial-overall .un-mrow')))) err('Up next did not come back on All');
  errors.forEach(e => err('watchlist console: ' + e));
  await ctx.close();

  // 8. Filters narrow it and the card names them.
  const firstSeries = T.filter(isOut).filter(t => t.type === 'series').sort((a, b) => a.release.localeCompare(b.release))[0];
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({})));
  await page.goto(URL + '?view=list&type=series'); await settle(page);
  r = await phoneCard();
  out.series = { id: r.id, tag: r.tag };
  if (r.id !== firstSeries.id) err(`Series filter: suggested ${r.id}, expected ${firstSeries.id}`);
  if (!/Series/.test(r.tag || '')) err(`the card should name the Series filter: "${r.tag}"`);

  // 9. An old phone Grid link opens the List: no Grid cards (Notion "Phone:
  // remove the Grid view").
  await page.goto(URL + '?view=grid'); await settle(page);
  r = await page.evaluate(() => ({ cards: document.querySelectorAll('.m-card').length, rows: document.querySelectorAll('.m-lrow').length }));
  if (r.cards || !r.rows) err(`?view=grid on a phone: ${JSON.stringify(r)}, expected the List`);

  // 10. Phone Spatial: the same card, docked in the same place; its Up next
  //     opens the details.
  await page.goto(URL + '?view=spatial'); await settle(page);
  const chip = await page.evaluate(() => (document.querySelector('.spatial-overall.docked .un-slide > :not(.un-leave) .un-title') || {}).textContent);
  if (chip !== name(out.expect.release)) err(`phone Spatial card shows ${chip}`);
  await page.locator('.spatial-overall .un-open').click(); await page.waitForTimeout(1200);
  const sheet = await page.evaluate(() => (document.querySelector('.m-sheet .td-title') || {}).textContent);
  if (sheet !== name(out.expect.release)) err(`the card should open ${name(out.expect.release)}'s details, opened ${sheet}`);
  errors.forEach(e => err('phone views console: ' + e));
  await ctx.close();

  // 11. 320px: nothing in the card or the Up next row runs past its edge.
  ({ ctx, page, errors } = await ctxPage(browser, PHONE320, seedJs({})));
  await page.goto(URL + '?view=list&sort=title'); await settle(page);
  r = await page.evaluate(() => ['.spatial-overall.docked', '.m-lrow.up-next'].map(sel => {
    const c = document.querySelector(sel); if (!c) return sel + ' missing';
    const box = c.getBoundingClientRect();
    return [...c.querySelectorAll('*')].some(e => e.getBoundingClientRect().right > box.right + 0.5) ? sel + ' overflow' : 'ok';
  }).filter(x => x !== 'ok'));
  if (r.length) err(`320px: ${r.join(', ')}`);
  await ctx.close();

  // 12. Desktop: the compact card in Titles and on Connections, whose Up next
  //     selects the card and opens the drawer.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({})));
  await page.goto(URL + '?view=list'); await settle(page);
  // Titles has the compact card too (Notion "Titles 3/5"), bottom right: a
  // new visitor's Up next is the first title out.
  r = await page.evaluate(() => ({ title: (document.querySelector('.dlist .spatial-overall .un-title') || {}).textContent || null, region: !!document.querySelector('.dlist .spatial-overall section.un-mrow[aria-label]'),
    pick: !!document.querySelector('.toolbar .ml-pick') }));
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
    const pickColl = async (k) => { await setColl(page, k); await page.waitForTimeout(1300); return mark(); };
    const firstUnseen = (list) => (list.find(t => !isSeen(t)) || {}).id;
    r = await mark();
    out.deskList = { release: r };
    if (r.ids.join() !== firstUnseen(byRelease)) err(`desktop List, release order: Up next ${r.ids.join()}, expected ${firstUnseen(byRelease)}`);
    if (!r.pill || !r.bar || r.button !== 'Mark seen') err(`the Up next row lacks its pill, bar or "Mark seen": ${JSON.stringify(r)}`);
    if (!r.scrolled || !r.underHead || Math.abs(r.nearHead - 168) > 3) err(`the List did not open scrolled to Up next under the header: ${JSON.stringify(r)}`);
    // Orders come from the header's Sort menu, as on Connections.
    r = await page.evaluate(async () => { document.querySelector('.toolbar .sort-menu-trigger').click(); await new Promise(res => setTimeout(res, 300)); document.querySelector('.sort-menu-pop [data-order="desc"]').click(); await new Promise(res => setTimeout(res, 200)); document.querySelector('.toolbar .sort-menu-trigger').click(); }).then(() => page.waitForTimeout(1300)).then(mark);
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
    r = await pickColl('watchlist');
    out.deskList.watchlist = r;
    const firstWatch = byRelease.find(t => watchIds.includes(t.id)).id;
    if (r.ids.join() !== firstWatch) err(`Watchlist tab: Up next ${r.ids.join()}, expected its first title ${firstWatch}`);
    r = await pickColl('seen');
    if (r.ids.length) err(`the Seen tab marks ${r.ids.join()} as Up next`);
    r = await pickColl('all');
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
    await page.locator('.dlist .spatial-overall .un-hide').click(); await page.waitForTimeout(500);
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
  r = await page.evaluate(() => { const t = document.querySelector('.spatial-overall .un-tag'); return { tag: t && t.textContent, tip: t && t.getAttribute('title'), hide: (document.querySelector('.spatial-overall .un-hide') || { getAttribute: () => null }).getAttribute('aria-label') }; });
  out.pt = r;
  if (r.tag !== 'A seguir' || !/^A seguir · ordem de lançamento/.test(r.tip || '') || r.hide !== 'Ocultar este cartão por enquanto') err(`Portuguese reads "${r.tag}" / "${r.tip}" / "${r.hide}"`);
  await ctx.close();

  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
