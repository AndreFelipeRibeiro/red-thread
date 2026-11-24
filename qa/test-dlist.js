const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
const { setColl } = require('./coll');
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const T = page => page.evaluate(() => { const c = document.querySelector('.canvas'); return c && c.style.transform; });
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__o = out;
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, locale: 'en-US' }, SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  const fresh = await T(page);
  out.defaultSpatial = !!(await page.$('.viewport')) && !(await page.$('.dlist'));
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(600);
  // The order (Notion "Titles 1/5", after Andre's review): the header's Sort
  // menu, as on Connections, and the list's column headers are one state, so
  // after every step they must agree.
  const st = () => page.evaluate(() => ({
    rows: document.querySelectorAll('.dl-row[data-row-id]').length,
    activeHead: [...document.querySelectorAll('.dl-h.on')].map(h => h.textContent.replace(/[↑↓↕]/g, '').trim() + ':' + h.getAttribute('aria-sort')).join(','),
    chips: ([...document.querySelectorAll('.toolbar .sort-menu-trigger .sort-menu-label')].find(e => e.getClientRects().length) || {}).textContent || null,
    toolbarSort: !!document.querySelector('.toolbar .sort-menu'), toolbarFilters: !!document.querySelector('.toolbar .filters-pill'),
    listFilters: document.querySelectorAll('.filters-pill').length > 1,
    first: (document.querySelector('.dl-row[data-row-id] .dl-open') || {}).textContent,
    rank1: (document.querySelector('.dl-row[data-row-id] .c-rank') || {}).textContent || null,
    groups: [...document.querySelectorAll('.dl-group-label')].map(b => b.textContent.trim()),
    drawer: (document.querySelector('.drawer.open .drawer-title') || {}).textContent || null,
    onRow: (document.querySelector('.dl-row.on .dl-open') || {}).textContent || null,
    hscroll: (() => { const d = document.querySelector('.dlist'); return d ? d.scrollWidth > d.clientWidth + 1 : null; })(),
    ctx: (document.querySelector('.dlist .ctx-count') || {}).textContent || null,
    url: (location.search + ((p) => ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] && p[2] ? (location.search ? '&' : '?') + ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] + '=' + p[2] : '')(location.pathname.split('/'))),
  }));
  const fails = [];
  // Picks an order from the header's Sort menu.
  // The Sort menu (option A): a sort row applies its usual direction and
  // closes; the other direction is the Order switch, which keeps it open.
  const pickSort = async (k, d) => {
    await page.locator('.toolbar .sort-menu-trigger').click(); await page.waitForTimeout(250);
    const row = page.locator('.sort-menu-pop [data-sort="' + k + '"]');
    const usual = await row.getAttribute('data-dir');
    await row.click(); await page.waitForTimeout(400);
    if (usual !== d) {
      await page.locator('.toolbar .sort-menu-trigger').click(); await page.waitForTimeout(250);
      await page.locator('.sort-menu-pop [data-order="' + d + '"]').click(); await page.waitForTimeout(300);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    }
  };
  const expect = (cond, msg) => { if (!cond) fails.push(msg); };
  out.list = await st();
  expect(out.list.toolbarSort && out.list.toolbarFilters && !out.list.listFilters, 'Titles: Sort and Filters belong in the header, as on Connections');
  expect(out.list.chips === 'Release date · Oldest first' && out.list.activeHead === 'Released:ascending', 'Release date: chip ' + out.list.chips + ', header ' + out.list.activeHead);
  expect(out.list.groups.length === 6 && /^Phase 1/.test(out.list.groups[0]), 'Release date is not grouped by phase: ' + out.list.groups.join(' | '));
  out.prefs = await page.evaluate(() => localStorage.getItem('mcu.prefs.v1'));
  await page.locator('.dl-h.c-imdb button').click(); await page.waitForTimeout(400); out.imdb = await st();
  expect(out.imdb.chips === 'IMDb rating · Highest first' && out.imdb.activeHead === 'IMDb:descending' && !out.imdb.groups.length && /sort=imdb/.test(out.imdb.url), 'IMDb: ' + JSON.stringify(out.imdb));
  await page.locator('.dl-h.c-imdb button').click(); await page.waitForTimeout(400); out.imdbRev = await st();
  expect(out.imdbRev.chips === 'IMDb rating · Lowest first' && out.imdbRev.activeHead === 'IMDb:ascending' && /order=asc/.test(out.imdbRev.url), 'IMDb reversed: ' + JSON.stringify(out.imdbRev));
  // The order is in the address (sort, order) and survives a reload.
  await page.reload(); await require('./ready').appReady(page); await page.waitForTimeout(300); out.imdbReload = await st();
  expect(out.imdbReload.chips === 'IMDb rating · Lowest first' && out.imdbReload.activeHead === 'IMDb:ascending', 'a reload lost the IMDb order: ' + JSON.stringify(out.imdbReload));
  await pickSort('release', 'asc'); out.cleared = await st();
  expect(out.cleared.chips === 'Release date · Oldest first' && out.cleared.activeHead === 'Released:ascending' && !/sort=|order=/.test(out.cleared.url), 'back to Release date: ' + JSON.stringify(out.cleared));
  await page.locator('.dl-h.c-title button').click(); await page.waitForTimeout(400); out.title = await st();
  expect(out.title.chips === 'Title · A–Z' && out.title.activeHead === 'Title:ascending' && !out.title.groups.length, 'Title: ' + JSON.stringify(out.title));
  await pickSort('chrono', 'asc'); out.chrono = await st();
  expect(out.chrono.chips === 'Story order · Start to end' && out.chrono.activeHead === '' && out.chrono.groups.length >= 5 && /^Before 2008/.test(out.chrono.groups[0]), 'Story order: ' + JSON.stringify(out.chrono));
  await pickSort('phase', 'desc'); out.phaseDesc = await st();
  expect(/^Phase 6/.test(out.phaseDesc.groups[0] || '') && out.phaseDesc.chips === 'Phase · Phase 6 → 1', 'Phase 6 → 1: ' + JSON.stringify(out.phaseDesc));
  // Release date, newest first: the menu and the header agree.
  await pickSort('release', 'desc'); out.releaseDesc = await st();
  expect(out.releaseDesc.chips === 'Release date · Newest first' && out.releaseDesc.activeHead === 'Released:descending' && /^Phase 6/.test(out.releaseDesc.groups[0] || ''), 'Release date, newest first: ' + JSON.stringify(out.releaseDesc));
  await page.locator('.dl-h.c-release button').click(); await page.waitForTimeout(400); out.backRelease = await st();
  expect(out.backRelease.activeHead === 'Released:ascending' && out.backRelease.chips === 'Release date · Oldest first', 'the Released header did not flip back: ' + JSON.stringify(out.backRelease));
  // Andre's review (2026-11-15): groups are plain headings, not folds; seen
  // rows are not dimmed but carry the poster's seen mark; "64 titles" shows
  // only when a search or filter narrows the list; nothing in the list is
  // pinned; the status tabs are the header's second row; the compact card
  // (All titles, Up next) sits in the list's bottom-right corner.
  await page.locator('.dlist').evaluate(el => { el.scrollTop = 0; }); await page.waitForTimeout(300);
  out.look = await page.evaluate(() => {
    const seenRow = document.querySelector('.dl-row.seen[data-row-id="iron-man"]'), other = document.querySelector('.dl-row[data-row-id]:not(.seen)');
    const ink = (r) => r && getComputedStyle(r.querySelector('.dl-open')).color;
    return { folds: document.querySelectorAll('.dl-group button, .dl-group [aria-expanded]').length, ironMan: !!seenRow,
      mark: !!(seenRow && seenRow.querySelector('.dl-thumb .dl-seen')), sameInk: ink(seenRow) === ink(other),
      thumbOpacity: seenRow && getComputedStyle(seenRow.querySelector('.dl-thumb')).opacity, summary: !!document.querySelector('.dlist .ctx-count'),
      divider: !!document.querySelector('.coll-div'), pinned: ['.dl-top', '.dl-head', '.dl-group'].filter(sel => { const e = document.querySelector(sel); return e && getComputedStyle(e).position === 'sticky'; }),
      subNav: !!document.querySelector('.toolbar .status-counts') };
  });
  expect(!out.look.folds && out.look.ironMan && out.look.mark && out.look.sameInk && out.look.thumbOpacity === '1' && !out.look.summary && !out.look.divider && !out.look.pinned.length && out.look.subNav,
    'the list at rest: ' + JSON.stringify(out.look));
  // The card sits top right, as on Connections (14px down, 16px in), and
  // stays there while the list scrolls.
  const cardAt = () => page.evaluate(() => { const c = document.querySelector('.dlist .spatial-overall'); const d = document.querySelector('.dlist').getBoundingClientRect();
    if (!c) return null; const b = c.getBoundingClientRect(); return { top: Math.round(b.top - d.top), right: Math.round(innerWidth - b.right) }; });
  out.cardTop = await cardAt();
  await page.locator('.dlist').evaluate(el => { el.scrollTop = 1500; }); await page.waitForTimeout(400); out.cardMid = await cardAt();
  expect(out.cardTop && out.cardTop.top === 14 && out.cardTop.right === 16 && out.cardMid && out.cardMid.top === 14, 'the compact card in Titles: ' + JSON.stringify({ top: out.cardTop, mid: out.cardMid }));
  await page.locator('.dlist').evaluate(el => { el.scrollTop = 0; }); await page.waitForTimeout(300);
  // open a row, toggle seen from a row without opening
  await page.locator('.dl-row:not(.dl-head)', { hasText: 'Doctor Strange' }).first().locator('.c-release').click(); await page.waitForTimeout(500);
  out.opened = await st();
  const before = await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor: Ragnarok' }).first().getAttribute('class');
  await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor: Ragnarok' }).first().locator('.tsa-btn').first().click(); await page.waitForTimeout(400);
  out.toggleSeen = { before, after: await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor: Ragnarok' }).first().getAttribute('class'), drawer: (await st()).drawer };
  // character highlight from drawer dims rows
  // A person opens their trail (Notion "Explore E 4/5"); its pin pins them.
  await page.locator('.drawer.open .cast-row').first().click().catch(() => {}); await page.waitForTimeout(300);
  await page.locator('.drawer.open .trail-pin').click().catch(() => {}); await page.waitForTimeout(300);
  out.dimmed = await page.evaluate(() => document.querySelectorAll('.dl-row.dim').length);
  // switch to Spatial with the drawer open: that card is selected
  await page.locator('.nav-tabs button', { hasText: 'Connections' }).click(); await page.waitForTimeout(1200);
  out.toSpatial = await page.evaluate(() => ({ selected: (document.querySelector('.card.selected .card-title') || {}).textContent || null, drawer: (document.querySelector('.drawer.open .drawer-title') || {}).textContent || null }));
  await page.locator('.drawer-close').click(); await page.waitForTimeout(1200);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(400);
  // filters
  await page.fill('.search-wrap input', 'man'); await setColl(page, 'unseen'); await page.waitForTimeout(500);
  out.filtered = { ...(await st()), matchBadges: await page.evaluate(() => document.querySelectorAll('.dl-row .match-badge, .dl-row [class*="match"]').length), ctxChips: await page.evaluate(() => [...document.querySelectorAll('.dlist .ctx-chip')].map(c => c.textContent)) };
  await page.fill('.search-wrap input', 'zzzz'); await page.waitForTimeout(400);
  out.empty = await page.evaluate(() => ({ empty: !!document.querySelector('.dl-empty'), ctx: (document.querySelector('.dlist .ctx-count') || {}).textContent }));
  await page.locator('.dlist .ctx-clear, .dlist .ctx-chip').first().click(); await page.waitForTimeout(300);
  await page.locator('.dlist .ctx-chip').first().click().catch(() => {}); await page.waitForTimeout(300);
  // reload remembers List; back to Spatial frames like a fresh load
  await page.reload(); await require('./ready').appReady(page);
  out.reload = { list: !!(await page.$('.dlist')), prefs: await page.evaluate(() => localStorage.getItem('mcu.prefs.v1')) };
  await page.locator('.nav-tabs button', { hasText: 'Connections' }).click(); await page.waitForTimeout(800);
  out.reenter = { fresh, now: await T(page) };
  out.errors = errors.concat(fails); await ctx.close();
  // widths, PT, drawer open
  out.widths = {};
  for (const w of [900, 1000, 1100, 1279, 1280, 1440, 1600, 1920]) {
    ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: w, height: 900 }, locale: 'pt-BR' }, SEED + "localStorage.setItem('mcu.prefs.v1', JSON.stringify({version:1, desktopView:'list', sort:'imdb', sortDir:'desc'}));"));
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    const a = await st();
    await page.locator('.dl-row[data-row-id]').nth(2).click(); await page.waitForTimeout(500);
    const b = await st();
    const cover = await page.evaluate(() => { const d = document.querySelector('.drawer.open'); if (!d) return null; const dl = d.getBoundingClientRect().left; return [...document.querySelectorAll('.dl-row[data-row-id] .c-actions')].slice(0, 5).some(c => c.getBoundingClientRect().right > dl + 1); });
    out.widths[w] = { hs: a.hscroll, hsDrawer: b.hscroll, actionsUnderDrawer: cover, head: a.activeHead, rank1: a.rank1, errors: errors.length };
    // Desktop widths (from 1280 the drawer sits beside the list): no
    // sideways scroll, and the row actions never sit under the drawer.
    if (w >= 1280 && (a.hscroll || b.hscroll || cover)) fails.push(w + 'px: ' + JSON.stringify(out.widths[w]));
    if (w === 1440 || w === 1100) { await page.screenshot({ path: path.join(S, 'shots', 'dlist-pt-' + w + '-drawer.png') }); }
    await ctx.close();
  }
  out.fails = fails;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o, null, 1)); process.exit(1); });
`);
