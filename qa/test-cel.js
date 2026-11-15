const QA_PORT = +process.env.PORT || 8197; // regress/quick give each check its own port
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
  const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); } catch (e) {}";
  const st = (page) => page.evaluate(() => {
    const b = k => { const el = document.querySelector('.coll-count.' + k); return el ? { n: el.textContent, cls: el.className } : null; };
    const t = document.querySelector('.mcu-toast'); const r = t && t.getBoundingClientRect();
    return { seen: b('seen'), watch: b('watchlist'), unseenBadge: !!document.querySelector('.coll-switch button[data-coll="unseen"] .coll-count'),
      toast: t ? { text: t.innerText.replace(/\\n/g, ' | '), cls: t.className, top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom), cx: Math.round(r.left + r.width / 2), w: Math.round(r.width) } : null,
      confetti: !!document.querySelector('.mcu-confetti'), pop: document.querySelectorAll('.tsa-btn.pop').length };
  });
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART + SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.load = await st(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(700);
  const row = (name) => page.locator('.dl-row', { hasText: name }).first();
  await row('Ant-Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(150);
  out.markSeen = await st(page);
  out.ring = await page.evaluate(() => { const b = document.querySelector('.tsa-btn.pop'); const w = b && b.parentElement.querySelector('.tsa-btn.watch');
    return b && { z: getComputedStyle(b).zIndex, neighbourZ: getComputedStyle(w).zIndex }; });
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-toast.png') });
  await page.locator('.mt-undo').click(); await page.waitForTimeout(400);
  out.undo = await st(page); out.antManAfterUndo = await row('Ant-Man').locator('.tsa-btn.seen').getAttribute('aria-pressed');
  await row('Shang-Chi').locator('.tsa-btn.seen').click(); await page.waitForTimeout(150);
  out.fromWatchlist = await st(page);
  await page.locator('.mt-undo').click(); await page.waitForTimeout(300);
  out.undoToWatch = await row('Shang-Chi').locator('.tsa-btn.watch').getAttribute('aria-pressed');
  await row('Doctor Strange').locator('.tsa-btn.watch').click(); await page.waitForTimeout(150);
  out.addWatch = await st(page);
  await page.waitForTimeout(5000); out.autoHide = await st(page);
  // milestone: unmark then re-mark The Avengers (all Phase 1 seen in the seed)
  await row('The Avengers').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.unmark = await st(page);
  await row('The Avengers').locator('.tsa-btn.seen').click(); await page.waitForTimeout(250);
  out.milestone = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-milestone.png') });
  await page.waitForTimeout(2600); out.confettiGone = await st(page);
  // drawer open: toast centred left of the drawer
  await row('Thor: Ragnarok').locator('.dl-open').click(); await page.waitForTimeout(700);
  await page.locator('.drawer.open .tsa-btn.seen').click(); await page.waitForTimeout(200);
  out.drawer = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-drawer.png') });
  // A milestone with the details open: the confetti covers only the space left
  // of the drawer, and the toast sits at its centre, between the two bursts.
  await row('The Avengers').locator('.dl-open').click(); await page.waitForTimeout(700);
  await page.locator('.drawer.open .tsa-btn.seen').click(); await page.waitForTimeout(300);
  await page.locator('.drawer.open .tsa-btn.seen').click(); await page.waitForTimeout(150);
  out.drawerConfetti = await page.evaluate(() => {
    const c = document.querySelector('.mcu-confetti'), t = document.querySelector('.mcu-toast'), d = document.querySelector('.drawer.open');
    if (!c || !t || !d) return { canvas: !!c, toast: !!t, drawer: !!d };
    const cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect(), dr = d.getBoundingClientRect();
    const [ox1, ox2, oy] = (c.dataset.origin || '').split(',').map(Number);
    return { canvasLeft: Math.round(cr.left), canvasRight: Math.round(cr.right), drawerLeft: Math.round(dr.left),
      canvasCx: Math.round(cr.left + cr.width / 2), toastCx: Math.round(tr.left + tr.width / 2),
      toast: [Math.round(tr.left), Math.round(tr.right), Math.round(tr.top), Math.round(tr.bottom)], origin: [ox1, ox2, oy],
      toastZ: +getComputedStyle(t).zIndex, canvasZ: +getComputedStyle(c).zIndex };
  });
  // ...and the bursts start just inside the toast's two ends, behind it.
  { const dc = out.drawerConfetti;
    if (dc.canvasRight == null || dc.canvasLeft !== 0 || Math.abs(dc.canvasRight - dc.drawerLeft) > 2 || Math.abs(dc.canvasCx - dc.toastCx) > 2)
      errors.push('milestone confetti not aligned with the toast beside the details: ' + JSON.stringify(dc));
    else if (!(dc.origin[0] > dc.toast[0] && dc.origin[0] < dc.toast[0] + 40 && dc.origin[1] < dc.toast[1] && dc.origin[1] > dc.toast[1] - 40
      && dc.origin[2] > dc.toast[2] - 20 && dc.origin[2] < dc.toast[3] + 20 && dc.toastZ > dc.canvasZ))
      errors.push('confetti does not start at the ends of the toast, behind it: ' + JSON.stringify(dc)); }
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-drawer-confetti.png') });
  out.dErrors = errors; await ctx.close();
  // fresh visitor: no badges until the first mark
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.fresh = await st(page);
  out.vq = await page.evaluate(() => { const t = window.TITLES.find(x => x.id === 'visionquest'); return { cast: t.cast, paladin: window.CHARACTERS.paladin && window.CHARACTERS.paladin.actor, bnd: window.TITLES.find(x => x.id === 'brand-new-day').imdb, chars: Object.keys(window.CHARACTERS).length, titles: window.TITLES.length }; });
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(600);
  await row('Iron Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(120);
  out.firstMark = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-first.png'), clip: { x: 900, y: 50, width: 540, height: 80 } });
  out.freshErrors = errors; await ctx.close();
  // phone
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, NOWELCOME + ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.mLoad = await st(page);
  const mrow = (name) => page.locator('.m-lrow', { hasText: name }).first();
  await mrow('Captain America: The Winter').locator('.tsa-btn.seen').tap(); await page.waitForTimeout(400);
  await mrow('Guardians of the Galaxy').locator('.tsa-btn.seen').tap(); await page.waitForTimeout(150);
  out.mUnmark = await st(page);
  await page.waitForTimeout(200);
  await mrow('Guardians of the Galaxy').locator('.tsa-btn.seen').tap(); await page.waitForTimeout(150);
  out.mList = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-m-list.png') });
  // inside the details sheet: toast at the top and its Undo still works
  await page.locator('.m-lrow-open', { hasText: 'Ant-Man' }).first().tap(); await page.waitForTimeout(700);
  await page.locator('.m-sheet .tsa-btn.seen').tap(); await page.waitForTimeout(200);
  out.mSheet = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-m-sheet.png') });
  await page.locator('.mt-undo').tap(); await page.waitForTimeout(300);
  out.mSheetUndo = await page.locator('.m-sheet .tsa-btn.seen').getAttribute('aria-pressed');
  out.mErrors = errors; await ctx.close();
  console.log(JSON.stringify(out));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
