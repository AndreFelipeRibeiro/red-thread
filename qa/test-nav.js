// The desktop sections (Notion "Desktop: navigation for Explore, My list and
// Guides"):
// - the sections read Connections / Titles / Guides (Notion "Rename the
//   top-level sections"); Titles' tabs read All | Unseen, Watchlist, Seen,
//   each with its count, and Unseen leaves out titles not released yet;
// - one header row: the wordmark, the Explore / My list / Guides tabs, search
//   with a "/" hint, Sort and Filters, then sync, Settings and Account; no
//   second row, view switch, type switch or Guides button;
// - Explore is the canvas, My list the List with the collection tabs at its
//   top (the collection filter exists nowhere else), Guides the gallery of
//   guides, with no Sort or Filters;
// - Explore and My list keep their own sort and filters;
// - picking a guide in the gallery opens it in the Guides tab; closing it
//   brings the gallery back; My list with a guide open closes the guide;
// - "See connections" in the details (Titles) selects the title on the
//   canvas; ?view=guides opens the gallery; "/" puts the cursor in search;
// - the header fits in one row from 900px, in English and Portuguese;
// - the Account menu has no collection actions; "Mark what you've seen" is in
//   My list (Notion "Take the collection filters out of the Account menu").
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
process.env.PORT = process.env.PORT || '8311';
{
  const fs0 = require('fs');
  const base = fs0.readFileSync(__dirname + '/test-refocus.js', 'utf8');
  const me = fs0.readFileSync(__filename, 'utf8');
  eval(base.slice(0, base.indexOf('(async () => {')) + me.slice(me.indexOf('// ' + '---- body')));
}
return;
// ---- body

const TAB = (page, name) => page.locator('.nav-tabs button', { hasText: name }).click();
const STATE = () => ({
  tab: (document.querySelector('.nav-tabs button.on') || {}).textContent || null,
  url: location.search,
  rows: document.querySelectorAll('.toolbar .tb-row').length,
  sort: (document.querySelector('.toolbar .sort-menu-trigger .sort-menu-label:not(.min-\\[1280px\\]\\:hidden)') || document.querySelector('.toolbar .sort-menu-trigger') || {}).textContent || null,
  sortShown: !!document.querySelector('.toolbar .sort-menu-trigger'),
  filtersShown: !!document.querySelector('.toolbar .filters-pill'),
  coll: document.querySelectorAll('.coll-switch').length,
  myColl: !!document.querySelector('.ml-status .coll-switch'),
  gallery: document.querySelectorAll('.g-page .g-row').length,
  guideList: !!document.querySelector('.g-desk'),
  canvas: !!document.querySelector('.viewport'),
  myList: !!document.querySelector('.toolbar .tb-sub-row .ml-status .coll-switch'),
  old: ['.tb-sort-row', '.tb-view-switch', '.g-btn', '.toolbar .tb-type-controls'].filter(s => document.querySelector(s)),
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const prefs = { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' };

  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, { 'iron-man': 'seen', 'incredible-hulk': 'seen' });
    await page.goto(URL); await settle(page);
    let s = await page.evaluate(STATE);
    out.explore = s;
    expect(s.tab === 'Connections' && s.canvas && s.rows === 1 && !s.old.length, `Explore: ${JSON.stringify(s)}`);
    expect(s.coll === 0 && s.sortShown && s.filtersShown, `Explore: no collection switch, Sort and Filters shown: ${JSON.stringify(s)}`);

    // My list: its own sort and collection; Explore keeps its own.
    await TAB(page, 'Titles'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.myList = s;
    expect(s.tab === 'Titles' && s.myList && s.myColl && s.coll === 1 && /view=list/.test(s.url), `My list: ${JSON.stringify(s)}`);
    // Titles has the same header as Connections (Andre, 2026-11-15).
    expect(s.sortShown && s.filtersShown, `Titles: the header should carry Sort and Filters, as on Connections: ${JSON.stringify(s)}`);
    // The status tabs, in their order (the designs' To watch rename was tried
    // and reverted, 2026-11-15; Notion "Rename the top-level sections").
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.ml-status .coll-switch button')].map(b => b.dataset.coll + ':' + (b.querySelector('.cl-full, .coll-label') || b).textContent.trim()));
    out.tabs = tabs;
    expect(tabs.join() === 'all:All,unseen:Unseen,watchlist:Watchlist,seen:Seen', `My list's tabs: ${tabs.join()}`);
    // Each tab's count, catalogue-wide; Unseen is released and not seen, and
    // its list has nothing that is not out yet.
    await page.locator('.ml-status .coll-switch button[data-coll="unseen"]').click(); await page.waitForTimeout(500);
    const counts = await page.evaluate(() => {
      const n = (k) => Number((document.querySelector(`.ml-status .coll-switch button[data-coll="${k}"] .coll-count`) || {}).textContent);
      const released = window.TITLES.filter(t => window.MCU_isReleased(t)).length;
      const rows = [...document.querySelectorAll('.dl-row[data-row-id]')].map(r => r.getAttribute('data-row-id'));
      const byId = Object.fromEntries(window.TITLES.map(t => [t.id, t]));
      return { all: n('all'), unseen: n('unseen'), seen: n('seen'), watchlist: n('watchlist'), total: window.TITLES.length, released,
        unreleasedRows: rows.filter(id => byId[id] && !window.MCU_isReleased(byId[id])), divider: !!document.querySelector('.ml-status .coll-div') };
    });
    out.counts = counts;
    expect(counts.all === counts.total && counts.seen === 2 && counts.unseen === counts.released - 2 && counts.watchlist === 0 && !counts.divider,
      // No divider after All since 2026-11-15 (Andre: the tabs read as one set).
      `tab counts, or a divider came back: ${JSON.stringify(counts)}`);
    expect(!counts.unreleasedRows.length, `Unseen lists titles not released yet: ${counts.unreleasedRows.join()}`);
    await page.locator('.ml-status .coll-switch button[data-coll="all"]').click(); await page.waitForTimeout(400);
    await page.locator('.dl-head .c-imdb button').click(); await page.waitForTimeout(400);
    await page.locator('.ml-status .coll-switch button[data-coll="seen"]').click(); await page.waitForTimeout(400);
    await TAB(page, 'Connections'); await page.waitForTimeout(900);
    s = await page.evaluate(STATE);
    out.exploreAgain = s;
    expect(!/sort=/.test(s.url) && s.coll === 0, `Explore did not keep its own sort: ${JSON.stringify(s)}`);
    await TAB(page, 'Titles'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    const collOn = await page.evaluate(() => (document.querySelector('.ml-status .coll-switch button.on .coll-label') || document.querySelector('.ml-status .coll-switch button.on') || {}).textContent);
    out.myListAgain = { ...s, collOn };
    expect(/sort=imdb/.test(s.url) && /Seen/.test(collOn || ''), `My list did not keep its sort and collection: ${JSON.stringify(out.myListAgain)}`);

    // "/" puts the cursor in search.
    await page.locator('.ml-status').click({ position: { x: 600, y: 10 } });
    await page.keyboard.press('/'); await page.waitForTimeout(100);
    expect(await page.evaluate(() => !!document.activeElement.closest('.search-wrap')), '"/" did not focus search');
    await page.keyboard.press('Escape'); await page.locator('.ml-status').click({ position: { x: 600, y: 10 } });

    // See connections from the details.
    await page.locator('.ml-status .coll-switch button[data-coll="all"]').click(); await page.waitForTimeout(400);
    await page.locator('.dl-row[data-row-id="thor"] .dl-open').click(); await page.waitForTimeout(800);
    await page.locator('.drawer.open .td-explore').click(); await page.waitForTimeout(1500);
    s = await page.evaluate(STATE);
    const sel = await page.evaluate(() => ({ drawer: (document.querySelector('.drawer.open #drawer-title') || {}).textContent, button: !!document.querySelector('.drawer.open .td-explore') }));
    out.showInExplore = { ...s, ...sel };
    expect(s.tab === 'Connections' && s.canvas && /title=thor/.test(s.url) && sel.drawer === 'Thor' && !sel.button, `Show in Explore: ${JSON.stringify(out.showInExplore)}`);

    // Guides: the gallery, a guide, back to the gallery.
    await TAB(page, 'Guides'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.gallery = s;
    expect(s.tab === 'Guides' && s.gallery >= 5 && !s.sortShown && !s.filtersShown && /view=guides/.test(s.url), `Guides gallery: ${JSON.stringify(s)}`);
    await page.locator('.g-page .g-row').first().click(); await page.waitForTimeout(900);
    s = await page.evaluate(STATE);
    out.guide = s;
    expect(s.tab === 'Guides' && s.guideList && /guide=/.test(s.url), `a guide from the gallery: ${JSON.stringify(s)}`);
    await page.locator('.g-desk .g-back').click(); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.guideClosed = s;
    expect(s.tab === 'Guides' && s.gallery >= 5 && !/guide=/.test(s.url), `closing a guide: ${JSON.stringify(s)}`);
    // My list with a guide open closes the guide.
    await page.locator('.g-page .g-row').first().click(); await page.waitForTimeout(900);
    await TAB(page, 'Titles'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.myListClosesGuide = s;
    expect(s.tab === 'Titles' && s.myList && !/guide=/.test(s.url), `My list with a guide open: ${JSON.stringify(s)}`);
    // The Account menu holds account things only (Notion "Take the collection
    // filters out of the Account menu"); "Mark what you've seen" is in My list,
    // in the progress widget's strip since Notion "Titles 3/5".
    expect(await page.locator('.ml-status .ml-pick').count() === 1, 'My list has no "Mark what you\'ve seen"');
    await page.locator('.acct-pill').click(); await page.waitForTimeout(400);
    const acct = await page.evaluate(() => { const p = document.querySelector('.acct-panel'); return p && { links: !!p.querySelector('.acct-links, .acct-pick'), text: p.innerText }; });
    out.account = acct;
    expect(acct && !acct.links && !/Show unseen|Show seen|Show watchlist|Mark what you/.test(acct.text), `Account menu: ${JSON.stringify(acct)}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    errors.push(...e);
    await ctx.close();
  }

  // ?view=guides opens the gallery.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, {});
    await page.goto(URL + '?view=guides'); await settle(page);
    const s = await page.evaluate(STATE);
    out.deepLink = s;
    expect(s.tab === 'Guides' && s.gallery >= 5, `?view=guides: ${JSON.stringify(s)}`);
    errors.push(...e);
    await ctx.close();
  }

  // The header's top row stays one line from 900px, in both languages, and
  // so does Titles' second row (the status tabs, since Andre's review on
  // 2026-11-15).
  for (const lang of ['en', 'pt-BR']) {
    for (const w of [900, 1000, 1280, 1440]) {
      const { ctx, page } = await ctxPage(browser, { viewport: { width: w, height: 800 } }, { ...prefs, desktopView: 'list' }, {}, `localStorage.setItem('mcu.lang.v1','${lang}');`);
      await page.goto(URL); await settle(page);
      const f = await page.evaluate(() => {
        const row = document.querySelector('.tb-top-row'), sub = document.querySelector('.tb-sub-row');
        return { h: Math.round(row.getBoundingClientRect().height), sub: sub ? Math.round(sub.getBoundingClientRect().height) : null,
          overflow: row.scrollWidth > row.clientWidth + 1 || !!(sub && sub.scrollWidth > sub.clientWidth + 1),
          off: [...document.querySelectorAll('.toolbar button, .toolbar input')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.right > innerWidth + 0.5 || r.left < -0.5); }).length };
      });
      out[`fit ${lang} ${w}`] = f;
      expect(f.h <= 48 && f.sub !== null && f.sub <= 56 && !f.overflow && f.off === 0, `header at ${w}px (${lang}): ${JSON.stringify(f)}`);
      await ctx.close();
    }
  }

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
