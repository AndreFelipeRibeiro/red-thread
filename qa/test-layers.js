const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
const PORT = +(process.env.PORT || 8191);
// Sample a 5x5 grid inside the element; report points where something else is on top.
const covered = (page, sel) => page.evaluate((sel) => {
  const els = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length);
  if (!els.length) return 'missing';
  const el = els[0]; const r = el.getBoundingClientRect(); const bad = {}; const pe = el.style.pointerEvents; el.style.pointerEvents = 'auto';
  for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) {
    const x = r.left + r.width * i / 6, y = r.top + r.height * j / 6;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    const t = document.elementFromPoint(x, y);
    if (t && !el.contains(t)) { const k = (t.className && String(t.className).split(' ')[0]) || t.tagName; bad[k] = (bad[k] || 0) + 1; }
  }
  el.style.pointerEvents = pe;
  return Object.keys(bad).length ? bad : 'ok';
}, sel);
const MENUS = {
  settings: ['.settings-btn', '.settings-panel.open'],
  sort: ['.sort-menu-trigger', '.sort-menu-pop'],
  filters: ['.filters-pill:not(.g-btn)', '.filters-pop'],
  account: ['.acct-pill', '.acct-pop'],
};
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__o = out;
  for (const vw of [1440, 1100]) {
    let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: vw, height: 900 } }, ART + SEED);
    await page.goto('http://127.0.0.1:' + PORT + '/'); await require('./ready').appReady(page);
    // Landing (release order): no card under the zoom control, bottom-left
    // (Notion "Spatial: the zoom control overlaps title cards").
    await page.waitForTimeout(800);
    const under = await page.evaluate(() => {
      const z = document.querySelector('.zoom-ctl').getBoundingClientRect();
      return [...document.querySelectorAll('.card[data-id]')].filter((c) => {
        const r = c.getBoundingClientRect();
        return +getComputedStyle(c).opacity > 0.05 && r.right > z.left - 4 && r.left < z.right + 4 && r.bottom > z.top - 4 && r.top < z.bottom + 4;
      }).map((c) => c.dataset.id);
    });
    out['d' + vw + 'landingUnderZoom'] = under;
    if (under.length) errors.push('landing: cards under the zoom control: ' + under.join(', '));
    // details open + character pinned
    await page.fill('.search-wrap input', 'Iron Man'); await page.waitForTimeout(400);
    await page.locator('.ss-item[data-kind="title"]', { hasText: 'Iron Man' }).first().click(); await page.waitForTimeout(1200);
    await page.fill('.search-wrap input', ''); await page.locator('.search-wrap input').evaluate(el => el.blur()); await page.waitForTimeout(600);
    await page.locator('.drawer.open .cast-row', { hasText: 'Tony Stark' }).click(); await page.waitForTimeout(500);
    await page.locator('.drawer.open .trail-pin').click(); await page.waitForTimeout(1300);
    for (const view of ['Spatial', 'List']) {
      await page.locator('.nav-tabs button', { hasText: view === 'Spatial' ? 'Connections' : 'Titles' }).click(); await page.waitForTimeout(900);
      const r = {};
      for (const [k, [trig, pop]] of Object.entries(MENUS)) {
        await page.locator(trig).first().click(); await page.waitForTimeout(350);
        r[k] = await covered(page, pop);
        if (k === 'filters' && vw === 1440 && view === 'Spatial') await page.screenshot({ path: path.join(S, 'shots', 'layers-filters-' + (process.env.TAG || 'x') + '.png') });
        await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.waitForTimeout(250);
      }
      await page.fill('.search-wrap input', 'tom'); await page.waitForTimeout(400);
      r.suggest = await covered(page, '.ss-pop');
      await page.fill('.search-wrap input', ''); await page.locator('.search-wrap input').evaluate(el => el.blur()); await page.waitForTimeout(300);
      r.zoom = view === 'Spatial' ? await covered(page, '.zoom-ctl') : '-';
      r.ctx = await covered(page, '.ctx-float');
      r.bannerClose = await covered(page, '.char-banner .cb-close');
      r.bannerNext = await covered(page, '.char-banner .cb-step button:last-child');
      r.drawerClose = await covered(page, '.drawer.open .drawer-close, .drawer.open [aria-label="Close"]');
      if (view === 'List') r.dlHead = await covered(page, '.dl-head');
      out['d' + vw + view] = r;
    }
    out['d' + vw + 'errors'] = errors; await ctx.close();
  }
  // mobile
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, ART + SEED);
  await page.goto('http://127.0.0.1:' + PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.m-lrow-open', { hasText: 'Iron Man' }).first().tap(); await page.waitForTimeout(700);
  await page.locator('.m-crow', { hasText: 'Tony Stark' }).tap(); await page.waitForTimeout(500);
  await page.locator('.m-sheet .trail-pin').tap(); await page.waitForTimeout(900);
  for (const view of ['list', 'spatial']) {
    if (view === 'spatial') { await page.locator('.m-lrow-open', { hasText: 'Iron Man 2' }).first().tap(); await page.waitForTimeout(700); await page.locator('.m-apply.ghost', { hasText: 'See connections' }).tap(); await page.waitForTimeout(1300); }
    const r = {};
    // The phone's language menu moved into Settings, a sheet rather than a
    // popover, so only Sort is left in the bar.
    for (const k of ['sort']) {
      const [trig, pop] = MENUS[k];
      await page.locator(trig).first().tap(); await page.waitForTimeout(350);
      r[k] = await covered(page, pop);
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    }
    if (!(await page.locator('.m-searchrow input').count())) { await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150); }
    await page.locator('.m-search input, .m-searchrow input').first().fill('to'); await page.waitForTimeout(400);
    r.suggest = await covered(page, '.ss-pop');
    await page.locator('.m-search input, .m-searchrow input').first().fill(''); await page.locator('.m-search input, .m-searchrow input').first().evaluate(el => el.blur()); await page.waitForTimeout(300);
    await page.locator('.m-clear').click().catch(() => {}); await page.waitForTimeout(200);
    r.pill = await covered(page, '.char-pill');
    r.ctx = await covered(page, view === 'list' ? '.ctx-line' : '.ctx-pill');
    if (view === 'spatial') r.zoom = await covered(page, '.zoom-ctl');
    out['m' + view] = r;
  }
  out.mErrors = errors; await ctx.close();
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
