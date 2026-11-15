const QA_PORT = +process.env.PORT || 8192; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
// Count running flip animations shortly after an action, and whether a leaving layer exists (and where).
const probe = (page) => page.evaluate(() => new Promise(res => requestAnimationFrame(() => setTimeout(() => {
  const anims = document.getAnimations().filter(a => a.playState === 'running');
  const flips = anims.filter(a => a.id === 'm-flip').length;
  const layer = document.querySelector('.m-flip-layer');
  let ghostCols = null, liveCols = null;
  if (layer && layer.firstElementChild && layer.firstElementChild.classList.contains('dl-row')) {
    ghostCols = getComputedStyle(layer.firstElementChild).gridTemplateColumns.split(' ').length;
    const live = document.querySelector('.dl-table .dl-row:not(.dl-head)');
    liveCols = live && getComputedStyle(live).gridTemplateColumns.split(' ').length;
  }
  res({ flips, ghosts: layer ? layer.childElementCount : 0, layerIn: layer ? layer.parentElement.className.split(' ')[0] : null, ghostCols, liveCols });
}, 60))));
const settled = (page) => page.evaluate(() => ({ layer: !!document.querySelector('.m-flip-layer'), running: document.getAnimations().filter(a => a.playState === 'running' && a.id === 'm-flip').length }));
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__o = out;
  // phone
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, ART + SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await page.waitForTimeout(1800);
  const coll = async (i) => { await page.locator('.coll-switch button').nth(i).tap(); return probe(page); };
  out.mSeen = await coll(2); await page.waitForTimeout(900); out.mSeenAfter = await settled(page);
  out.mRows = await page.locator('.m-lrow').count();
  out.mWatch = await coll(3); await page.waitForTimeout(900);
  out.mAll = await coll(0); await page.waitForTimeout(900);
  const view = async (label) => { await page.locator('.view-menu .sort-order-trigger').tap(); await page.waitForTimeout(250); await page.locator('.sort-order-pop button', { hasText: label }).tap(); return probe(page); };
  out.mToGrid = await view('Grid'); await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(S, 'shots', 'anim-m-mid.png') });
  await page.waitForTimeout(700); out.mGridAfter = await settled(page); out.mCards = await page.locator('.m-card').count();
  out.mToList = await view('List'); await page.waitForTimeout(900); out.mListAfter = await settled(page);
  out.mToSpatial = await view('Spatial'); await page.waitForTimeout(900);
  out.mFromSpatial = await view('List'); await page.waitForTimeout(900);
  out.mSort = await (async () => { await page.locator('.sort-menu-trigger').tap(); await page.waitForTimeout(250); await page.locator('.sort-menu-pop [data-sort="imdb"][data-dir="desc"]').tap(); return probe(page); })(); await page.waitForTimeout(900);
  out.mErrors = errors; await ctx.close();
  // desktop list
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await page.waitForTimeout(1800);
  await page.locator('.nav-tabs button', { hasText: 'My list' }).click(); await page.waitForTimeout(800);
  const dcoll = async (i) => { await page.locator('.coll-switch button').nth(i).click(); return probe(page); };
  out.dUnseen = await dcoll(1); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(S, 'shots', 'anim-d-mid.png') });
  await page.waitForTimeout(800); out.dUnseenAfter = await settled(page);
  out.dAll = await dcoll(0); await page.waitForTimeout(900);
  out.dSortImdb = await (async () => { await page.locator('.sort-menu-trigger').click(); await page.waitForTimeout(250); await page.locator('.sort-menu-pop [data-sort="imdb"][data-dir="desc"]').click(); return probe(page); })(); await page.waitForTimeout(900);
  out.dHeader = await (async () => { await page.locator('.dl-head button', { hasText: 'Title' }).first().click(); return probe(page); })(); await page.waitForTimeout(900);
  // scrolled list: ghosts must sit where rows were
  await page.locator('.dlist').evaluate(el => el.scrollTop = 1500); await page.waitForTimeout(300);
  out.dScrolled = await dcoll(2); await page.waitForTimeout(900); out.dScrolledAfter = await settled(page);
  out.dErrors = errors; await ctx.close();
  console.log(JSON.stringify(out, null, 0));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
