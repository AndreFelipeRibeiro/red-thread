const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const T = page => page.evaluate(() => document.querySelector('.canvas').style.transform);
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__o = out;
  // ---- Desktop
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, locale: 'en-US' }, SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  const bar = () => page.evaluate(() => { const fl = document.querySelector('.ctx-float'); const fr = fl.getBoundingClientRect(); const over = [...document.querySelectorAll('.card:not(.coll-dim)')].filter(c => { const r = c.getBoundingClientRect(); return r.left < fr.right && r.right > fr.left && r.top < fr.bottom && r.bottom > fr.top; }).length; return { text: fl.querySelector('.ctx-count').textContent, chips: [...fl.querySelectorAll('.ctx-chip')].map(c => c.textContent), clear: !!fl.querySelector('.ctx-clear'), recenter: !!document.querySelector('.ctx-recenter, .ctx-bar'), coversCards: over, h: Math.round(fr.height) }; });
  out.dInitial = await bar();
  await page.fill('.search-wrap input', 'man');
  // Type is in Filters; Explore has no collection switch (it lives in My list).
  await page.click('.filters-pill:not(.g-btn)'); await page.locator('.filters-pop .tb-type-controls button').nth(1).click();
  await page.locator('.filters-pop .control-group').first().locator('button', { hasText: '3' }).click();
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  out.dFiltered = await bar();
  out.dUndimmedCards = await page.evaluate(() => document.querySelectorAll('.card:not(.coll-dim)').length);
  await page.locator('.ctx-chip', { hasText: 'Films' }).click(); await page.waitForTimeout(500);
  await page.click('.filters-pill:not(.g-btn)'); await page.waitForTimeout(250);
  out.dAfterRemoveFilms = { ...(await bar()), filmsBtnOn: await page.locator('.filters-pop .tb-type-controls button.on').innerText() };
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.locator('.ctx-float .ctx-clear').click(); await page.waitForTimeout(700);
  out.dAfterClearAll = { ...(await bar()), search: await page.inputValue('.search-wrap input') };
  await page.click('.filters-pill:not(.g-btn)'); await page.locator('.filters-pop .control-group').first().locator('button', { hasText: '3' }).click();
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  out.dSingleChip = await bar();
  await page.locator('.ctx-chip', { hasText: 'Phase 3' }).click(); await page.waitForTimeout(500);
  out.dAfterSingle = { ...(await bar()), phaseAll: await page.evaluate(() => document.querySelectorAll('.card').length) };
  out.dErrors = errors; await ctx.close();
  // ---- Mobile
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, locale: 'pt-BR' }, SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  const line = (sel) => page.evaluate(sel => { const e = document.querySelector(sel); return e && { text: e.querySelector('.ctx-text').textContent, clear: !!e.querySelector('.ctx-clear'), trunc: e.querySelector('.ctx-text').scrollWidth > e.querySelector('.ctx-text').clientWidth + 1 }; }, sel);
  out.mInitial = await line('.ctx-line');
  await page.fill('.m-searchbar input', 'man');
  await page.locator('.m-searchbar input').evaluate(el => el.blur());
  await page.locator('.m-viewrow .coll-switch button').nth(1).click(); await page.waitForTimeout(600);
  out.mFiltered = { ...(await line('.ctx-line')), rows: await page.locator('.m-lrow-open').count() };
  await page.locator('.ctx-line .ctx-clear').tap(); await page.waitForTimeout(600);
  out.mAfterClear = { ...(await line('.ctx-line')), search: await page.inputValue('.m-searchbar input') };
  await page.fill('.m-searchbar input', 'zzzz'); await page.waitForTimeout(500);
  out.mEmpty = { ...(await line('.ctx-line')), emptyShown: await page.locator('.m-empty').count() };
  await page.fill('.m-searchbar input', 'man'); await page.locator('.m-searchbar input').evaluate(el => el.blur()); await page.waitForTimeout(400);
  await page.locator('.view-menu .sort-order-trigger').click(); await page.locator('.sort-order-pop button').nth(2).click(); await page.waitForTimeout(900);
  out.mPill = { ...(await line('.ctx-pill')), overlapZoom: await page.evaluate(() => { const a = document.querySelector('.ctx-pill').getBoundingClientRect(), b = document.querySelector('.zoom-ctl').getBoundingClientRect(); return a.right > b.left && a.bottom > b.top && a.top < b.bottom; }) };
  const sel0 = await page.locator('.card.selected').count();
  await page.locator('.ctx-pill .ctx-clear').tap(); await page.waitForTimeout(700);
  out.mPillClear = { ...(await line('.ctx-pill')), search: await page.inputValue('.m-searchbar input'), selectedAfter: await page.locator('.card.selected').count(), sel0 };
  await page.screenshot({ path: path.join(S, 'shots', 'impl-m390-spatial.png'), clip: { x: 0, y: 0, width: 390, height: 420 } });
  out.mErrors = errors; await ctx.close();
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(Object.keys(globalThis.__o).join(',')); process.exit(1); });
`);
