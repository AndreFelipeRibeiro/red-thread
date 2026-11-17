const QA_PORT = +process.env.PORT || 8189; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
// Offset (screen px) between the current card's centre and its layout position's centre.
const off = page => page.evaluate(() => {
  const c = document.querySelector('.card.current'); if (!c) return null;
  const m = /translate(?:3d)?\\(([-\\d.]+)px, ([-\\d.]+)px/.exec(c.style.transform);
  const cv = new DOMMatrix(getComputedStyle(document.querySelector('.canvas')).transform);
  const W = c.offsetWidth, H = c.offsetHeight;
  const ex = cv.a * (+m[1] + W / 2) + cv.e, ey = cv.d * (+m[2] + H / 2) + cv.f;
  const vp = document.querySelector('.canvas').parentElement.getBoundingClientRect();
  const r = c.getBoundingClientRect();
  return { title: c.querySelector('.card-title').textContent, dx: Math.round(r.left + r.width / 2 - vp.left - ex), dy: Math.round(r.top + r.height / 2 - vp.top - ey), w: Math.round(r.width), expW: Math.round(W * cv.a * 1.08) };
});
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = { d: [], m: [] }; globalThis.__o = out;
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, ART + SEED);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.fill('.search-wrap input', 'Iron Man'); await page.waitForTimeout(400);
  await page.locator('.ss-item[data-kind="title"]', { hasText: 'Iron Man' }).first().click(); await page.waitForTimeout(1200);
  await page.fill('.search-wrap input', ''); await page.locator('.search-wrap input').evaluate(el => el.blur()); await page.waitForTimeout(900);
  // A person opens their trail (Notion "Explore E 4/5"); its pin pins them.
  await page.locator('.drawer.open .cast-row', { hasText: 'Tony Stark' }).click(); await page.waitForTimeout(500);
  await page.locator('.drawer.open .trail-pin').click(); await page.waitForTimeout(2500);
  for (let k = 0; k < 11; k++) { out.d.push(await off(page)); await page.locator('.cb-step button').last().click(); await page.waitForTimeout(900); }
  out.d.push(await off(page));
  await page.screenshot({ path: path.join(S, 'shots', 'align-d-last.png') });
  out.dErrors = errors; await ctx.close();
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.m-lrow-open', { hasText: 'Iron Man' }).first().tap(); await page.waitForTimeout(700);
  await page.locator('.m-crow', { hasText: 'James Rhodes' }).tap(); await page.waitForTimeout(500);
  await page.locator('.m-sheet .trail-pin').tap(); await page.waitForTimeout(800);
  out.mPill = await page.evaluate(() => { const p = document.querySelector('.char-pill'); return { text: p.innerText.replace(/\\n/g, ' | '), h: Math.round(p.getBoundingClientRect().height), switch: !!document.querySelector('.cb-mode'), rows: document.querySelectorAll('.m-lrow').length, overflow: p.scrollWidth > p.clientWidth + 1 }; });
  await page.screenshot({ path: path.join(S, 'shots', 'align-m-list.png') });
  await page.locator('.m-lrow-open', { hasText: 'Iron Man 2' }).first().tap(); await page.waitForTimeout(700);
  await page.locator('.m-apply.ghost', { hasText: 'See connections' }).tap(); await page.waitForTimeout(1400);
  for (let k = 0; k < 9; k++) { out.m.push(await off(page)); await page.locator('.char-pill .cb-step button').last().tap(); await page.waitForTimeout(900); }
  await page.screenshot({ path: path.join(S, 'shots', 'align-m-spatial.png') });
  out.mErrors = errors; await ctx.close();
  console.log(JSON.stringify(out));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 2500)); process.exit(1); });
`);
