const QA_PORT = +process.env.PORT || 8192; // regress/quick give each check its own port
const { setColl } = require('./coll');
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
// Count running flip animations shortly after an action, and whether a leaving layer exists (and where).
const probe = (page) => page.evaluate(() => new Promise(res => requestAnimationFrame(() => setTimeout(() => {
  const anims = document.getAnimations().filter(a => a.playState === 'running');
  const flips = anims.filter(a => a.id === 'm-flip').length;
  const layer = document.querySelector('.m-flip-layer');
  let ghostCols = null, liveCols = null, ghostThumb = null, liveThumb = null;
  if (layer && layer.firstElementChild && layer.firstElementChild.classList.contains('dl-row')) {
    ghostCols = getComputedStyle(layer.firstElementChild).gridTemplateColumns;
    const live = document.querySelector('.dl-table .dl-row:not(.dl-head)');
    liveCols = live && getComputedStyle(live).gridTemplateColumns;
    // The copies keep the List's sizes (its --dl-* variables), or they flash
    // unstyled with full-size posters (Andre, 2026-11-15). A copy leaving with
    // nowhere to go shrinks a little (scale .97), so posters get 4px of slack.
    const gt = layer.firstElementChild.querySelector('.dl-thumb'), lt = live && live.querySelector('.dl-thumb');
    ghostThumb = gt && Math.round(gt.getBoundingClientRect().width); liveThumb = lt && Math.round(lt.getBoundingClientRect().width);
  }
  res({ flips, ghosts: layer ? layer.childElementCount : 0, layerIn: layer ? layer.parentElement.className.split(' ')[0] : null, ghostCols, liveCols, ghostThumb, liveThumb });
}, 60))));
const settled = (page) => page.evaluate(() => ({ layer: !!document.querySelector('.m-flip-layer'), running: document.getAnimations().filter(a => a.playState === 'running' && a.id === 'm-flip').length }));
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__o = out;
  // phone
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, ART + SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await page.waitForTimeout(1800);
  const coll = async (k) => { await setColl(page, k); return probe(page); };
  out.mSeen = await coll('seen'); await page.waitForTimeout(900); out.mSeenAfter = await settled(page);
  out.mRows = await page.locator('.m-lrow').count();
  out.mWatch = await coll('watchlist'); await page.waitForTimeout(900);
  out.mAll = await coll('all'); await page.waitForTimeout(900);
  // Phones (Notion "Phone: bottom bar becomes Explore, My list and Guides"):
  // Spatial is the Explore tab, the List is My list (the Grid is gone).
  const phoneView = async (page, v) => {
    if (v === 'spatial') { await page.locator('.m-tab[data-section="explore"]').click(); return; }
    if (!(await page.locator('.m-tab.on[data-section="mylist"]').count())) { await page.locator('.m-tab[data-section="mylist"]').click(); await page.waitForTimeout(400); }
  };
  const view = async (label) => { await phoneView(page, label.toLowerCase()); return probe(page); };
  await page.screenshot({ path: path.join(S, 'shots', 'anim-m-mid.png') });
  out.mToList = await view('List'); await page.waitForTimeout(900); out.mListAfter = await settled(page);
  out.mToSpatial = await view('Spatial'); await page.waitForTimeout(900);
  out.mFromSpatial = await view('List'); await page.waitForTimeout(900);
  out.mSort = await (async () => { await page.locator('.sort-menu-trigger').tap(); await page.waitForTimeout(250); await page.locator('.sort-menu-pop [data-sort="imdb"][data-dir="desc"]').tap(); return probe(page); })(); await page.waitForTimeout(900);
  out.mErrors = errors; await ctx.close();
  // desktop list
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await page.waitForTimeout(1800);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(800);
  const dcoll = async (k) => { await setColl(page, k); return probe(page); };
  out.dUnseen = await dcoll('unseen'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(S, 'shots', 'anim-d-mid.png') });
  await page.waitForTimeout(800); out.dUnseenAfter = await settled(page);
  out.dAll = await dcoll('all'); await page.waitForTimeout(900);
  // Titles sorts from its own column headers (Notion "Titles 1/5").
  out.dSortImdb = await (async () => { await page.locator('.dl-head .c-imdb button').click(); return probe(page); })(); await page.waitForTimeout(900);
  out.dHeader = await (async () => { await page.locator('.dl-head button', { hasText: 'Title' }).first().click(); return probe(page); })(); await page.waitForTimeout(900);
  // scrolled list: ghosts must sit where rows were
  await page.locator('.dlist').evaluate(el => el.scrollTop = 1500); await page.waitForTimeout(300);
  out.dScrolled = await dcoll('seen'); await page.waitForTimeout(900); out.dScrolledAfter = await settled(page);
  ['dUnseen', 'dAll', 'dSortImdb', 'dHeader', 'dScrolled'].forEach(k => {
    const r = out[k];
    if (r && r.ghostCols != null && (r.ghostCols !== r.liveCols || Math.abs(r.ghostThumb - r.liveThumb) > 4)) errors.push(k + ': a leaving row lost the List sizes: ' + JSON.stringify(r));
  });
  out.dErrors = errors; await ctx.close();
  console.log(JSON.stringify(out, null, 0));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
