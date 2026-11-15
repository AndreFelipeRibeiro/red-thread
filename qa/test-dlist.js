const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
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
  await page.locator('.nav-tabs button', { hasText: 'My list' }).click(); await page.waitForTimeout(600);
  const st = () => page.evaluate(() => ({
    rows: document.querySelectorAll('.dl-row:not(.dl-head)').length,
    activeHead: [...document.querySelectorAll('.dl-h.on')].map(h => h.textContent + ':' + h.getAttribute('aria-sort')).join(','),
    sortMenu: (document.querySelector('.sort-menu-trigger') || {}).textContent,
    first: (document.querySelector('.dl-row:not(.dl-head) .dl-open') || {}).textContent,
    rank1: (document.querySelector('.dl-row:not(.dl-head) .c-rank') || {}).textContent || null,
    groups: document.querySelectorAll('.dl-glabel').length,
    drawer: (document.querySelector('.drawer.open .drawer-title') || {}).textContent || null,
    onRow: (document.querySelector('.dl-row.on .dl-open') || {}).textContent || null,
    hscroll: (() => { const d = document.querySelector('.dlist'); return d ? d.scrollWidth > d.clientWidth + 1 : null; })(),
    ctx: (document.querySelector('.dlist .ctx-count') || {}).textContent || null,
  }));
  out.list = await st();
  out.prefs = await page.evaluate(() => localStorage.getItem('mcu.prefs.v1'));
  await page.locator('.dl-h.c-imdb button').click(); await page.waitForTimeout(400); out.imdb = await st();
  await page.locator('.dl-h.c-imdb button').click(); await page.waitForTimeout(400); out.imdbRev = await st();
  await page.locator('.dl-h.c-title button').click(); await page.waitForTimeout(400); out.title = await st();
  await page.locator('.dl-h.c-story button').click(); await page.waitForTimeout(400); out.chrono = await st();
  await page.locator('.sort-menu-trigger').click(); await page.waitForTimeout(250);
  await page.locator('.sort-menu-pop [data-sort="release"][data-dir="asc"]').click(); await page.waitForTimeout(400); out.backRelease = await st();
  // open a row, toggle seen from a row without opening
  await page.locator('.dl-row:not(.dl-head)', { hasText: 'The Avengers' }).first().locator('.c-release').click(); await page.waitForTimeout(500);
  out.opened = await st();
  const before = await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor: Ragnarok' }).first().getAttribute('class');
  await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor: Ragnarok' }).first().locator('.tsa-btn').first().click(); await page.waitForTimeout(400);
  out.toggleSeen = { before, after: await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor: Ragnarok' }).first().getAttribute('class'), drawer: (await st()).drawer };
  // character highlight from drawer dims rows
  await page.locator('.drawer .cast-row, .drawer [class*="cast"] button, .drawer .char-row').first().click().catch(() => {}); await page.waitForTimeout(300);
  out.dimmed = await page.evaluate(() => document.querySelectorAll('.dl-row.dim').length);
  // switch to Spatial with the drawer open: that card is selected
  await page.locator('.nav-tabs button', { hasText: 'Explore' }).click(); await page.waitForTimeout(1200);
  out.toSpatial = await page.evaluate(() => ({ selected: (document.querySelector('.card.selected .card-title') || {}).textContent || null, drawer: (document.querySelector('.drawer.open .drawer-title') || {}).textContent || null }));
  await page.locator('.drawer-close').click(); await page.waitForTimeout(1200);
  await page.locator('.nav-tabs button', { hasText: 'My list' }).click(); await page.waitForTimeout(400);
  // filters
  await page.fill('.search-wrap input', 'man'); await page.locator('.ml-status .coll-switch button').nth(1).click(); await page.waitForTimeout(500);
  out.filtered = { ...(await st()), matchedFaces: await page.evaluate(() => document.querySelectorAll('.dl-face.matched').length), chips: await page.evaluate(() => [...document.querySelectorAll('.dlist .ctx-chip')].map(c => c.textContent)) };
  await page.fill('.search-wrap input', 'zzzz'); await page.waitForTimeout(400);
  out.empty = await page.evaluate(() => ({ empty: !!document.querySelector('.dl-empty'), ctx: (document.querySelector('.dlist .ctx-count') || {}).textContent }));
  await page.locator('.dlist .ctx-clear, .dlist .ctx-chip').first().click(); await page.waitForTimeout(300);
  await page.locator('.dlist .ctx-chip').first().click().catch(() => {}); await page.waitForTimeout(300);
  // reload remembers List; back to Spatial frames like a fresh load
  await page.reload(); await require('./ready').appReady(page);
  out.reload = { list: !!(await page.$('.dlist')), prefs: await page.evaluate(() => localStorage.getItem('mcu.prefs.v1')) };
  await page.locator('.nav-tabs button', { hasText: 'Explore' }).click(); await page.waitForTimeout(800);
  out.reenter = { fresh, now: await T(page) };
  out.errors = errors; await ctx.close();
  // widths, PT, drawer open
  out.widths = {};
  for (const w of [900, 1000, 1100, 1279, 1280, 1440, 1600, 1920]) {
    ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: w, height: 900 }, locale: 'pt-BR' }, SEED + "localStorage.setItem('mcu.prefs.v1', JSON.stringify({version:1, desktopView:'list', sort:'imdb', sortDir:'desc'}));"));
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    const a = await st();
    await page.locator('.dl-row:not(.dl-head)').nth(2).click(); await page.waitForTimeout(500);
    const b = await st();
    const cover = await page.evaluate(() => { const d = document.querySelector('.drawer.open'); if (!d) return null; const dl = d.getBoundingClientRect().left; return [...document.querySelectorAll('.dl-row:not(.dl-head) .c-actions')].slice(0, 5).some(c => c.getBoundingClientRect().right > dl + 1); });
    out.widths[w] = { hs: a.hscroll, hsDrawer: b.hscroll, actionsUnderDrawer: cover, head: a.activeHead, rank1: a.rank1, errors: errors.length };
    if (w === 1440 || w === 1100) { await page.screenshot({ path: path.join(S, 'shots', 'dlist-pt-' + w + '-drawer.png') }); }
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o, null, 1)); process.exit(1); });
`);
