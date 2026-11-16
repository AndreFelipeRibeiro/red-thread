const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1100, height: 860 } }, ART + SEED + "localStorage.setItem('mcu.prefs.v1', JSON.stringify({version:1, desktopView:'list'}));");
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  const tx = () => page.evaluate(() => { const d = document.querySelector('.drawer'); return d ? { open: d.classList.contains('open'), x: Math.round(d.getBoundingClientRect().left), top: Math.round(d.getBoundingClientRect().top) } : null; });
  await page.locator('.dl-row:not(.dl-head)', { hasText: 'Thor' }).first().click();
  const samples = [];
  for (let i = 0; i < 6; i++) { samples.push(await tx()); await page.waitForTimeout(70); }
  out.slideIn = samples;
  await page.locator('.drawer-close').click();
  const s2 = [];
  for (let i = 0; i < 6; i++) { s2.push(await tx()); await page.waitForTimeout(80); }
  await page.waitForTimeout(400); s2.push(await tx());
  out.slideOut = s2;
  // search Sam: badge under titles, highlight in drawer
  await page.fill('.search-wrap input', 'Sam'); await page.waitForTimeout(500);
  out.badges = await page.evaluate(() => [...document.querySelectorAll('.dl-row')].filter(r => /Winter Soldier|Falcon/.test(r.textContent)).map(r => r.querySelector('.dl-open').textContent + ' -> ' + r.querySelector('.card-match').textContent));
  await page.locator('.dl-row:not(.dl-head)').nth(1).click(); await page.waitForTimeout(700);
  out.drawerMarks = await page.evaluate(() => [...document.querySelectorAll('.drawer .cast-row mark.hl')].map(m => m.textContent + ':' + getComputedStyle(m).textDecorationLine));
  await page.screenshot({ path: path.join(S, 'shots', 'panel-1100-sam.png') });
  // switching titles while open keeps it open
  await page.locator('.dl-row:not(.dl-head)').nth(2).click(); await page.waitForTimeout(150);
  out.swap = await tx();
  out.errors = errors; await ctx.close();
  // spatial: open a card, drawer animates too
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  const card = page.locator('.card', { hasText: 'Iron Man' }).first(); const r = await card.boundingBox();
  await page.mouse.click(r.x + r.width / 2, r.y + r.height * 0.8);
  const s3 = []; for (let i = 0; i < 5; i++) { s3.push(await tx()); await page.waitForTimeout(80); }
  out.spatialSlide = s3; out.spatialErrors = errors; await ctx.close();
  // mobile sheet highlight
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
  await page.fill('.m-searchbar input', 'Sam'); await page.waitForTimeout(400);
  await page.locator('.m-lrow-open').first().tap(); await page.waitForTimeout(700);
  out.mobileMarks = await page.evaluate(() => [...document.querySelectorAll('.m-crow mark.hl')].map(m => m.textContent));
  out.mobileErrors = errors; await ctx.close();
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); process.exit(1); });
`);
