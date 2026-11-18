const QA_PORT = +process.env.PORT || 8196; // regress/quick give each check its own port
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
  const st = (page) => page.evaluate(() => ({ dialog: !!document.querySelector('.about-dialog'), sheet: !!document.querySelector('.m-sheet .about'),
    title: (document.querySelector('.about-title') || {}).textContent || null, cta: !!document.querySelector('.welcome-start, .about-cta'), flag: localStorage.getItem('mcu.welcome.v1'),
    cols: (() => { const u = document.querySelector('.about-ways'); return u ? getComputedStyle(u).gridTemplateColumns.split(' ').length : null; })(),
    scroll: (() => { const d = document.querySelector('.about-dialog'); return d ? d.scrollHeight > d.clientHeight : null; })(), url: location.search }));
  // 1. first visit (desktop): welcome shows, CTA closes, reload doesn't show again
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, ART);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.first = await st(page); out.firstFocus = await page.evaluate(() => document.activeElement.className);
  await page.keyboard.press('Tab'); out.tab1 = await page.evaluate(() => document.activeElement.className); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); out.shiftTab = await page.evaluate(() => document.activeElement.className);
  await page.screenshot({ path: path.join(S, 'shots', 'welcome-d.png') });
  await page.locator('.welcome-start').click(); await page.waitForTimeout(400);
  out.afterCta = await st(page);
  await page.reload(); await require('./ready').appReady(page); out.reload = await st(page);
  // About from the menu: not the welcome variant
  await page.locator('.acct-pill').click(); await page.locator('.acct-foot-link').click(); await page.waitForTimeout(400);
  out.menuAbout = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'about-d-grid.png') });
  await page.keyboard.press('Escape');
  // ?welcome forces it, and the param is removed from the address
  await page.goto('http://127.0.0.1:' + QA_PORT + '/?welcome'); await require('./ready').appReady(page); out.forced = await st(page);
  out.dErrors = errors; await ctx.close();
  // 2. returning visitor (has a collection): never shown
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page); out.returning = await st(page);
  await ctx.close();
  // 3. phone first visit (pt-BR)
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, locale: 'pt-BR' }, ART));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.mFirst = await st(page); out.mFocus = await page.evaluate(() => document.activeElement.className);
  await page.screenshot({ path: path.join(S, 'shots', 'welcome-m.png') });
  await page.locator('.m-sheet-body').evaluate(el => el.scrollTop = 9999); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(S, 'shots', 'welcome-m-end.png') });
  await page.locator('.welcome-start').tap(); await page.waitForTimeout(500);
  out.mAfter = await st(page);
  await page.reload(); await require('./ready').appReady(page); out.mReload = await st(page);
  out.mErrors = errors; await ctx.close();
  // 4. storage blocked: no welcome, no errors
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, "Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });"));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.blocked = await page.evaluate(() => ({ dialog: !!document.querySelector('.about-dialog') }));
  out.blockedErrors = errors.filter(e => !/blocked/.test(e)); await ctx.close();
  // 5. a shared link on a first visit lands on its content: no welcome, the
  // visit recorded as decided, no promotion (Notion "Shared links: the
  // welcome no longer covers the guide or title a first-time visitor came for")
  out.sharedErrors = [];
  const LANDS = { '?guide=before-doomsday': '.g-head, .g-title-h, .guide-banner, .g-module', '?title=iron-man': '.drawer h2, .m-sheet h2, .td-title', '?char=tony': '.char-banner, .char-pill' };
  for (const [kind, opts] of [['d', { viewport: { width: 1440, height: 900 } }], ['m', { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }]]) {
    for (const [q, sel] of Object.entries(LANDS)) {
      ({ ctx, page, errors } = await ctxPage(browser, opts, ART));
      await page.goto('http://127.0.0.1:' + QA_PORT + '/' + q); await require('./ready').appReady(page); await page.waitForTimeout(600);
      const s = await st(page); const lands = await page.evaluate((sel) => !!document.querySelector(sel), sel);
      const promo = await page.evaluate(() => !!document.querySelector('.gp'));
      if (s.dialog || s.sheet) out.sharedErrors.push(kind + ' ' + q + ': the welcome shows');
      if (s.flag !== 'shared') out.sharedErrors.push(kind + ' ' + q + ': welcome flag is ' + s.flag);
      if (!lands) out.sharedErrors.push(kind + ' ' + q + ': ' + sel + ' not shown');
      if (promo) out.sharedErrors.push(kind + ' ' + q + ': a promotion shows on a first visit');
      await page.reload(); await require('./ready').appReady(page);
      const r = await st(page); if (r.dialog || r.sheet) out.sharedErrors.push(kind + ' ' + q + ': the welcome shows after a reload');
      out.sharedErrors.push(...errors.map(e => kind + ' ' + q + ': ' + e)); await ctx.close();
    }
  }
  console.log(JSON.stringify(out));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
