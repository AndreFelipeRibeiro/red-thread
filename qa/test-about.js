const QA_PORT = +process.env.PORT || 8195; // regress/quick give each check its own port
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
  for (const loc of ['en-US', 'pt-BR']) {
    let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, locale: loc }, ART + SEED);
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    await page.locator('.acct-pill').click(); await page.waitForTimeout(300);
    out[loc + 'link'] = await page.locator('.acct-foot-link').innerText();
    await page.screenshot({ path: path.join(S, 'shots', 'about-menu-' + loc + '.png'), clip: { x: 1000, y: 0, width: 440, height: 520 } });
    await page.locator('.acct-foot-link').click(); await page.waitForTimeout(400);
    out[loc + 'dialog'] = await page.evaluate(() => { const d = document.querySelector('.about-dialog'); const r = d && d.getBoundingClientRect();
      return d && { focus: document.activeElement.className, h: Math.round(r.height), w: Math.round(r.width), scroll: d.scrollHeight > d.clientHeight, menuOpen: !!document.querySelector('.acct-pop'), inertToolbar: document.querySelector('.toolbar').closest('[inert]') !== null || !!document.querySelector('.toolbar').inert }; });
    await page.screenshot({ path: path.join(S, 'shots', 'about-d-' + loc + '.png') });
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    out[loc + 'trap'] = await page.evaluate(() => !!document.activeElement.closest('.about-dialog'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    out[loc + 'afterEsc'] = await page.evaluate(() => ({ open: !!document.querySelector('.about-dialog'), focus: document.activeElement.className }));
    await page.locator('.acct-pill').click(); await page.locator('.acct-foot-link').click(); await page.waitForTimeout(300);
    await page.mouse.click(40, 450); await page.waitForTimeout(300);
    out[loc + 'scrimClose'] = !(await page.locator('.about-dialog').count());
    // About as designed (Notion "About: the new style…", B · v3): the
    // drawing and descriptor, three rows each led by its drawing (loaded),
    // credits; "Take the tour again" closes About and starts the tour.
    await page.locator('.acct-pill').click(); await page.locator('.acct-foot-link').click(); await page.waitForTimeout(600);
    const ab = out[loc + 'v3'] = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('.about-dialog .about-row')].map(r => r.dataset.row),
      art: [...document.querySelectorAll('.about-dialog .fv-drawing')].filter(i => i.getClientRects().length).map(i => i.complete && i.naturalWidth > 0),
      title: (document.querySelector('.about-dialog .about-title') || {}).textContent,
      sources: document.querySelectorAll('.about-dialog .about-sources dt').length,
      notice: !!document.querySelector('.about-dialog .about-notice'),
      bg: getComputedStyle(document.querySelector('.about-dialog')).backgroundColor }));
    if (ab.rows.join() !== 'tour,news,share' || ab.art.length !== 4 || ab.art.includes(false) || !ab.title || ab.sources !== 4 || !ab.notice)
      errors.push('About is not as designed: ' + JSON.stringify(ab));
    await page.locator('.about-tour').click(); await page.waitForTimeout(1200);
    const tr = out[loc + 'tour'] = await page.evaluate(() => ({ about: !!document.querySelector('.about-dialog'), card: !!document.querySelector('.tour-card'), step: (document.querySelector('.tour-card') || { dataset: {} }).dataset.tourStep }));
    if (tr.about || !tr.card || tr.step !== '1') errors.push('Take the tour again did not close About and start the tour: ' + JSON.stringify(tr));
    out[loc + 'errors'] = errors; await ctx.close();
  }
  for (const [loc, w] of [['pt-BR', 390], ['en-US', 320]]) {
    let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: w, height: 760 }, hasTouch: true, isMobile: true, locale: loc }, ART + SEED);
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    await page.locator('.m-acct').tap(); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(S, 'shots', 'about-m-acct-' + w + '.png') });
    await page.locator('.acct-foot-link').tap(); await page.waitForTimeout(600);
    out['m' + w] = await page.evaluate(() => { const s = document.querySelectorAll('.m-sheet'); const a = document.querySelector('.m-sheet .about');
      const x = document.querySelector('.m-sheet-x').getBoundingClientRect(), logo = a && a.querySelector('.logo-word').getBoundingClientRect();
      return { sheets: s.length, about: !!a, hOverflow: a ? a.scrollWidth > a.clientWidth + 1 : null, title: a && a.querySelector('.about-title').textContent,
        rows: a ? a.querySelectorAll('.about-row').length : 0, xBeside: !!logo && Math.abs((x.top + x.bottom) / 2 - (logo.top + logo.bottom) / 2) < 8,
        labelsOneLine: a ? [...a.querySelectorAll('.about-sources dt')].every(d => { const r = document.createRange(); r.selectNodeContents(d); return new Set([...r.getClientRects()].map(q => Math.round(q.top))).size === 1; }) : false }; });
    if (!out['m' + w].about || out['m' + w].hOverflow || out['m' + w].rows !== 3 || !out['m' + w].xBeside || !out['m' + w].labelsOneLine) errors.push('phone ' + w + ': About sheet not as designed: ' + JSON.stringify(out['m' + w]));
    await page.screenshot({ path: path.join(S, 'shots', 'about-m-' + w + '.png') });
    await page.locator('.m-sheet-body').evaluate(el => el.scrollTop = 9999); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(S, 'shots', 'about-m-' + w + '-end.png') });
    await page.locator('.m-sheet-x').tap(); await page.waitForTimeout(400);
    out['m' + w + 'closed'] = !(await page.locator('.m-sheet').count());
    out['m' + w + 'errors'] = errors; await ctx.close();
  }
  console.log(JSON.stringify(out));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
