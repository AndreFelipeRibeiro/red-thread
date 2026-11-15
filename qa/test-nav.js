// The desktop sections (Notion "Desktop: navigation for Explore, My list and
// Guides"):
// - one header row: the wordmark, the Explore / My list / Guides tabs, search
//   with a "/" hint, Sort and Filters, then sync, Settings and Account; no
//   second row, view switch, type switch or Guides button;
// - Explore is the canvas, My list the List with the collection tabs at its
//   top (the collection filter exists nowhere else), Guides the gallery of
//   guides, with no Sort or Filters;
// - Explore and My list keep their own sort and filters;
// - picking a guide in the gallery opens it in the Guides tab; closing it
//   brings the gallery back; My list with a guide open closes the guide;
// - "Show in Explore" in the details (My list) selects the title on the
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
  myList: !!document.querySelector('.ml-title'),
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
    expect(s.tab === 'Explore' && s.canvas && s.rows === 1 && !s.old.length, `Explore: ${JSON.stringify(s)}`);
    expect(s.coll === 0 && s.sortShown && s.filtersShown, `Explore: no collection switch, Sort and Filters shown: ${JSON.stringify(s)}`);

    // My list: its own sort and collection; Explore keeps its own.
    await TAB(page, 'My list'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.myList = s;
    expect(s.tab === 'My list' && s.myList && s.myColl && s.coll === 1 && /view=list/.test(s.url), `My list: ${JSON.stringify(s)}`);
    await page.locator('.sort-menu-trigger').click(); await page.waitForTimeout(250);
    await page.locator('.sort-menu-pop [data-sort="imdb"][data-dir="desc"]').click(); await page.waitForTimeout(400);
    await page.locator('.ml-status .coll-switch button').nth(2).click(); await page.waitForTimeout(400);
    await TAB(page, 'Explore'); await page.waitForTimeout(900);
    s = await page.evaluate(STATE);
    out.exploreAgain = s;
    expect(!/sort=/.test(s.url) && s.coll === 0, `Explore did not keep its own sort: ${JSON.stringify(s)}`);
    await TAB(page, 'My list'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    const collOn = await page.evaluate(() => (document.querySelector('.ml-status .coll-switch button.on .coll-label') || document.querySelector('.ml-status .coll-switch button.on') || {}).textContent);
    out.myListAgain = { ...s, collOn };
    expect(/sort=imdb/.test(s.url) && /Seen/.test(collOn || ''), `My list did not keep its sort and collection: ${JSON.stringify(out.myListAgain)}`);

    // "/" puts the cursor in search.
    await page.locator('.ml-title').click();
    await page.keyboard.press('/'); await page.waitForTimeout(100);
    expect(await page.evaluate(() => !!document.activeElement.closest('.search-wrap')), '"/" did not focus search');
    await page.keyboard.press('Escape'); await page.locator('.ml-title').click();

    // Show in Explore from the details.
    await page.locator('.ml-status .coll-switch button').nth(0).click(); await page.waitForTimeout(400);
    await page.locator('.dl-row[data-row-id="thor"] .dl-open').click(); await page.waitForTimeout(800);
    await page.locator('.drawer.open .td-explore').click(); await page.waitForTimeout(1500);
    s = await page.evaluate(STATE);
    const sel = await page.evaluate(() => ({ drawer: (document.querySelector('.drawer.open #drawer-title') || {}).textContent, button: !!document.querySelector('.drawer.open .td-explore') }));
    out.showInExplore = { ...s, ...sel };
    expect(s.tab === 'Explore' && s.canvas && /title=thor/.test(s.url) && sel.drawer === 'Thor' && !sel.button, `Show in Explore: ${JSON.stringify(out.showInExplore)}`);

    // Guides: the gallery, a guide, back to the gallery.
    await TAB(page, 'Guides'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.gallery = s;
    expect(s.tab === 'Guides' && s.gallery >= 5 && !s.sortShown && !s.filtersShown && /view=guides/.test(s.url), `Guides gallery: ${JSON.stringify(s)}`);
    await page.locator('.g-page .g-row').first().click(); await page.waitForTimeout(900);
    s = await page.evaluate(STATE);
    out.guide = s;
    expect(s.tab === 'Guides' && s.guideList && /guide=/.test(s.url), `a guide from the gallery: ${JSON.stringify(s)}`);
    await page.locator('.guide-banner .cb-close').click(); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.guideClosed = s;
    expect(s.tab === 'Guides' && s.gallery >= 5 && !/guide=/.test(s.url), `closing a guide: ${JSON.stringify(s)}`);
    // My list with a guide open closes the guide.
    await page.locator('.g-page .g-row').first().click(); await page.waitForTimeout(900);
    await TAB(page, 'My list'); await page.waitForTimeout(800);
    s = await page.evaluate(STATE);
    out.myListClosesGuide = s;
    expect(s.tab === 'My list' && s.myList && !/guide=/.test(s.url), `My list with a guide open: ${JSON.stringify(s)}`);
    // The Account menu holds account things only (Notion "Take the collection
    // filters out of the Account menu"); "Mark what you've seen" is in My list.
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

  // One header row from 900px, in both languages.
  for (const lang of ['en', 'pt-BR']) {
    for (const w of [900, 1000, 1280, 1440]) {
      const { ctx, page } = await ctxPage(browser, { viewport: { width: w, height: 800 } }, { ...prefs, desktopView: 'list' }, {}, `localStorage.setItem('mcu.lang.v1','${lang}');`);
      await page.goto(URL); await settle(page);
      const f = await page.evaluate(() => {
        const row = document.querySelector('.tb-top-row');
        const tb = document.querySelector('.toolbar').getBoundingClientRect();
        return { h: Math.round(tb.height), overflow: row.scrollWidth > row.clientWidth + 1,
          off: [...document.querySelectorAll('.toolbar button, .toolbar input')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.right > innerWidth + 0.5 || r.left < -0.5); }).length };
      });
      out[`fit ${lang} ${w}`] = f;
      expect(f.h <= 70 && !f.overflow && f.off === 0, `header at ${w}px (${lang}): ${JSON.stringify(f)}`);
      await ctx.close();
    }
  }

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
