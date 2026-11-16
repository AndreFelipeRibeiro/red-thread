// Phone lists: swipe a row (Notion "Phone lists: swipe a row to mark it seen
// or add it to the Watchlist", and direction B for the rows, Andre
// 2026-11-16). Real touch input (the DevTools protocol), on Titles and on a
// guide's list:
//   - right past the threshold marks the title seen; the toast's Undo puts it
//     back (on a guide's stop too, where the mark follows the guide and Undo
//     takes back both); left adds it to the Watchlist; left again takes it off;
//   - a short swipe springs back and changes nothing; a vertical drag scrolls
//     and changes nothing;
//   - the rows carry Seen as their one button (Watchlist only where Seen
//     can't be offered, a title not out yet) and no rank in a score order.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8399;
const { chromium } = require('playwright');
const http = require('http');
const { appReady } = require('./ready');

const URL = `http://127.0.0.1:${QA_PORT}/`;
const SEED = "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
  + "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen'}}));";
const errors = [];
const out = {};
const expect = (ok, msg) => { if (!ok) errors.push(msg); };

(async () => {
  const server = http.createServer((q, r) => r.end());
  await new Promise((r) => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const stateOf = (id) => page.evaluate((i) => (JSON.parse(localStorage.getItem('mcu.collection.v1') || '{}').states || {})[i] || 'none', id);
  // Drags the row's middle by (dx, dy) in small steps, as a finger would.
  const swipe = async (sel, dx, dy = 0) => {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await page.waitForTimeout(300);
    const b = await page.locator(sel).boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await touch('touchStart', x, y);
    for (let i = 1; i <= 12; i++) { await touch('touchMove', x + (dx * i) / 12, y + (dy * i) / 12); await page.waitForTimeout(16); }
    await touch('touchEnd', x + dx, y + dy);
    await page.waitForTimeout(600);
  };

  // ---- Titles
  await page.goto(URL + '?view=list&sort=imdb'); await appReady(page); await page.waitForTimeout(800);
  const rows = await page.evaluate(() => {
    const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).display !== 'none';
    const all = [...document.querySelectorAll('.m-lrow[data-row-id]')];
    const released = all.filter((r) => r.querySelector('.tsa-btn.seen:not(.tsa-gap)'));
    return {
      n: all.length, rank: document.querySelectorAll('.m-rank').length,
      watchShown: released.filter((r) => vis(r.querySelector('.tsa-btn.watch'))).length,
      scoreInMeta: !!document.querySelector('.m-lrow .m-lmeta .m-score'),
      unreleasedWatch: all.filter((r) => !r.querySelector('.tsa-btn.seen:not(.tsa-gap)')).every((r) => vis(r.querySelector('.tsa-btn.watch'))),
      wrapped: all.every((r) => r.parentElement.classList.contains('swipe-layer')),
      id: (released.find((r) => r.querySelector('.tsa-btn.seen[aria-pressed="false"]')) || {}).dataset?.rowId,
    };
  });
  out.rows = rows;
  expect(rows.n > 10 && rows.rank === 0 && rows.watchShown === 0 && rows.scoreInMeta && rows.unreleasedWatch && rows.wrapped, `Titles rows (direction B): ${JSON.stringify(rows)}`);
  const id = rows.id;
  const sel = `.m-lrow[data-row-id="${id}"]`;
  const steps = {};
  await swipe(sel, 170); steps.right = await stateOf(id);
  steps.toast = await page.evaluate(() => (document.querySelector('.mcu-toast') || {}).textContent || null);
  await page.locator('.mcu-toast .mt-undo').click(); await page.waitForTimeout(500); steps.undo = await stateOf(id);
  await swipe(sel, -170); steps.left = await stateOf(id);
  await swipe(sel, -170); steps.leftAgain = await stateOf(id);
  await swipe(sel, -40); steps.short = await stateOf(id);
  const top0 = await page.evaluate(() => document.querySelector('.m-main .m-scrollarea').scrollTop);
  await swipe(sel, 12, -220); steps.vertical = await stateOf(id);
  steps.scrolled = (await page.evaluate(() => document.querySelector('.m-main .m-scrollarea').scrollTop)) !== top0;
  steps.settled = await page.evaluate((s) => getComputedStyle(document.querySelector(s).closest('.swipe-layer')).transform, sel);
  out.titles = { id, ...steps };
  expect(steps.right === 'seen', `swipe right should mark seen: ${JSON.stringify(steps)}`);
  expect(steps.undo === 'none', `the toast's Undo should put it back: ${JSON.stringify(steps)}`);
  expect(steps.left === 'watchlist' && steps.leftAgain === 'none', `swipe left should toggle the Watchlist: ${JSON.stringify(steps)}`);
  expect(steps.short === 'none', `a short swipe should change nothing: ${JSON.stringify(steps)}`);
  expect(steps.vertical === 'none' && steps.scrolled, `a vertical drag should scroll and change nothing: ${JSON.stringify(steps)}`);
  expect(steps.settled === 'none' || steps.settled === 'matrix(1, 0, 0, 1, 0, 0)', `the row should spring back: ${steps.settled}`);

  // ---- A guide's list
  await page.goto(URL + '?view=guides&guide=infinity-saga'); await appReady(page); await page.waitForTimeout(800);
  const g = await page.evaluate(() => {
    const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).display !== 'none';
    const stops = [...document.querySelectorAll('.g-stop[data-row-id]:not(.dest)')];
    const open = stops.find((r) => r.querySelector('.tsa-btn.seen[aria-pressed="false"]'));
    return { n: stops.length, watchShown: stops.filter((r) => r.querySelector('.tsa-btn.seen:not(.tsa-gap)') && vis(r.querySelector('.tsa-btn.watch'))).length,
      wrapped: stops.filter((r) => r.parentElement.classList.contains('swipe-layer')).length, id: open && open.dataset.rowId };
  });
  out.guide = g;
  expect(g.n > 5 && g.watchShown === 0 && g.wrapped === g.n, `guide stops (direction B): ${JSON.stringify(g)}`);
  if (g.id) {
    await swipe(`.g-stop[data-row-id="${g.id}"]`, 170);
    out.guide.right = await stateOf(g.id);
    out.guide.toast = await page.evaluate(() => (document.querySelector('.mcu-toast') || {}).textContent || null);
    expect(out.guide.right === 'seen', `guide stop: swipe right should mark seen, got ${out.guide.right}`);
    // The mark follows the guide; that toast's Undo takes the mark back too
    // (Andre, 2026-11-16: it kept the mark and looked broken).
    await page.locator('.mcu-toast .mt-undo').click(); await page.waitForTimeout(500);
    out.guide.undo = await stateOf(g.id);
    out.guide.followed = await page.evaluate(() => window.MCU_GUIDE.isFollowed('infinity-saga'));
    expect(out.guide.undo === 'none' && !out.guide.followed, `guide stop: Undo after the swipe: ${JSON.stringify(out.guide)}`);
  } else errors.push('guide: no stop left to mark');

  await browser.close(); server.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
