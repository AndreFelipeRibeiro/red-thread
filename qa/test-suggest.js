const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const items = page => page.evaluate(() => [...document.querySelectorAll('.ss-pop > li')].map(li => li.classList.contains('ss-head') ? '# ' + li.textContent : (li.classList.contains('on') ? '> ' : '  ') + li.querySelector('.ss-main').textContent + ' | ' + li.querySelector('.ss-sub').textContent));
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, ART + SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  const box = page.locator('.search-wrap input');
  await box.click(); await box.type('t'); out.oneChar = await items(page);
  await box.type('om'); out.tom = await items(page);
  await page.screenshot({ path: path.join(S, 'shots', 'suggest-d1440-tom.png'), clip: { x: 0, y: 0, width: 1440, height: 560 } });
  await box.press('ArrowDown'); await box.press('ArrowDown'); out.active = (await items(page)).find(x => x.startsWith('>'));
  await box.press('Enter'); await page.waitForTimeout(500);
  out.afterEnter = { value: await box.inputValue(), open: await page.locator('.ss-pop').count(), ctx: await page.locator('.ctx-count').textContent() };
  await box.fill(''); await box.type('tommy'); await page.locator('.ss-item').first().click(); await page.waitForTimeout(400);
  out.afterClick = { value: await box.inputValue(), focused: await page.evaluate(() => document.activeElement.tagName) };
  await box.fill(''); await box.type('endg'); out.endg = await items(page);
  await page.locator('.ss-item', { hasText: 'Endgame' }).first().click(); await page.waitForTimeout(1200);
  out.titlePick = await page.evaluate(() => ({ value: document.querySelector('.search-wrap input').value, drawer: (document.querySelector('.drawer.open .drawer-title') || {}).textContent, selected: (document.querySelector('.card.selected .card-title') || {}).textContent, focus: document.activeElement.tagName, cards: document.querySelectorAll('.card').length }));
  // Picking a title navigates to it; it must not leave a text filter behind.
  // That used to strand the title alone on the canvas with nothing to connect to.
  if (out.titlePick.value !== '') errors.push('picking a title left "' + out.titlePick.value + '" filtering the catalog');
  if (out.titlePick.cards < 60) errors.push('only ' + out.titlePick.cards + ' cards left on the canvas after picking a title');
  if (!out.titlePick.selected) errors.push('the picked title is not selected, so its connections are not shown');
  await box.click(); await box.fill('lok'); out.escBefore = await page.locator('.ss-pop').count(); await box.press('Escape'); out.escAfter = await page.locator('.ss-pop').count();
  await box.type('i'); out.reopen = await page.locator('.ss-pop').count();
  await page.mouse.click(700, 600); await page.waitForTimeout(200); out.blurClosed = await page.locator('.ss-pop').count();
  out.aria = await page.evaluate(() => { const i = document.querySelector('.search-wrap input'); return [i.getAttribute('role'), i.getAttribute('aria-expanded')]; });
  out.errors = errors; await ctx.close();
  // pt-BR: names in either language
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1100, height: 900 }, locale: 'pt-BR' }, ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.search-wrap input').click(); await page.locator('.search-wrap input').type('iron');
  out.ptIron = await items(page);
  await page.locator('.search-wrap input').fill(''); await page.locator('.search-wrap input').type('vinga'); out.ptVinga = await items(page);
  await page.screenshot({ path: path.join(S, 'shots', 'suggest-d1100-pt.png'), clip: { x: 0, y: 0, width: 1100, height: 600 } });
  out.ptErrors = errors; await ctx.close();
  // mobile
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
  const mb = page.locator('.m-searchbar input');
  await mb.tap(); await mb.type('tom'); await page.waitForTimeout(300);
  out.mPop = await page.evaluate(() => { const p = document.querySelector('.ss-pop'); if (!p) return null; const r = p.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, n: p.querySelectorAll('.ss-item').length }; });
  await page.screenshot({ path: path.join(S, 'shots', 'suggest-m390-tom.png'), clip: { x: 0, y: 0, width: 390, height: 600 } });
  await page.locator('.ss-item').first().tap(); await page.waitForTimeout(500);
  out.mPick = { value: await mb.inputValue(), rows: await page.locator('.m-lrow-open').count(), open: await page.locator('.ss-pop').count() };
  await mb.fill(''); await mb.type('wakanda'); await page.waitForTimeout(300);
  await page.locator('.ss-item', { hasText: 'Forever' }).first().tap(); await page.waitForTimeout(800);
  out.mTitle = { sheet: await page.evaluate(() => (document.querySelector('.m-sh-title, .m-sheet h2, [class*="sheet"] h2') || {}).textContent || null), focus: await page.evaluate(() => document.activeElement.tagName) };
  out.mErrors = errors; await ctx.close();
  // Enter with typed text and no suggestion highlighted, on Guides (Notion
  // "Search: Enter on the Guides page does nothing"): Guides has nothing to
  // filter, so it opens Titles with that search, the text kept as the filter.
  // Then the same search with a person picked, below.
  for (const [label, opts, sel] of [['desktop', { viewport: { width: 1440, height: 900 } }, '.search-wrap input'], ['phone', { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, '.m-searchbar input']]) {
    ({ ctx, page, errors } = await ctxPage(browser, opts, ART + SEED));
    await page.goto('http://127.0.0.1:' + QA_PORT + '/guides'); await require('./ready').appReady(page);
    if (label === 'phone') { await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150); }
    const b = page.locator(sel);
    await b.click(); await b.type('peter parker'); await page.waitForTimeout(200);
    const before = await page.evaluate(() => location.pathname);
    await b.press('Enter'); await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({ path: location.pathname, rows: document.querySelectorAll('[data-row-id]').length, guidesPage: document.querySelectorAll('.g-page').length, pop: document.querySelectorAll('.ss-pop').length, focus: document.activeElement.tagName }));
    r.before = before; r.value = await b.inputValue().catch(() => null);
    out[label + 'GuidesEnter'] = r;
    if (r.before !== '/guides') errors.push(label + ': the check did not start on Guides (' + r.before + ')');
    // Titles is /titles on desktop; on a phone it is the default view, so /.
    const want = label === 'phone' ? '/' : '/titles';
    if (r.path !== want) errors.push(label + ': Enter on Guides left the address at ' + r.path + ', not ' + want);
    if (r.guidesPage) errors.push(label + ': the Guides page is still showing after Enter');
    if (r.value !== 'peter parker') errors.push(label + ': Enter on Guides did not keep the search as the filter (' + r.value + ')');
    if (!r.rows || r.rows > 30) errors.push(label + ': Titles shows ' + r.rows + ' rows for "peter parker"');
    if (r.pop) errors.push(label + ': the suggestions stayed open after Enter');
    // Picking Peter Parker from the suggestions on Guides pins him and opens
    // Titles on his titles (Andre, 2026-11-24): Guides shows nothing of a
    // pinned character. Keyboard on desktop, a tap on the phone.
    await page.goto('http://127.0.0.1:' + QA_PORT + '/guides'); await require('./ready').appReady(page);
    if (label === 'phone') { await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150); }
    await b.click(); await b.type('peter parker'); await page.waitForTimeout(300);
    const first = await page.evaluate(() => (document.querySelector('.ss-item .ss-main') || {}).textContent);
    if (label === 'phone') await page.locator('.ss-item').first().tap();
    else { await b.press('ArrowDown'); await b.press('Enter'); }
    await page.waitForTimeout(800);
    const p = await page.evaluate(() => ({ address: location.pathname + location.search, guidesPage: document.querySelectorAll('.g-page').length, rows: document.querySelectorAll('[data-row-id]').length, card: (document.querySelector('.char-card') || {}).textContent || null }));
    p.first = first; p.value = await b.inputValue().catch(() => null);
    out[label + 'GuidesPick'] = p;
    const wantPick = label === 'phone' ? '/characters/peter' : '/characters/peter?view=list';
    if (p.first !== 'Peter Parker') errors.push(label + ': the first suggestion for "peter parker" is ' + p.first);
    if (p.address !== wantPick) errors.push(label + ': picking Peter Parker on Guides left the address at ' + p.address + ', not ' + wantPick);
    if (p.guidesPage) errors.push(label + ': the Guides page is still showing after picking Peter Parker');
    if (!p.rows) errors.push(label + ': Titles shows no rows after picking Peter Parker');
    if (p.value) errors.push(label + ': picking a person left "' + p.value + '" in the box');
    out[label + 'GuidesEnterErrors'] = errors; await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); process.exit(1); });
`);
