// No "Mark seen" before release (V3 Tasks, "Movies not yet release: no Hide
// seen CTA"), with the date fixed by Playwright's clock. The Seen button
// appears 7 days before a day-precision release date (canMarkSeen); a
// month-only date never opens it; Watchlist stays; rows don't shift; a title
// already seen keeps its button; progress counts the title only from release
// day. Checked on the desktop List, Spatial and the details drawer, and the
// phone List and details sheet.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
const V = path.join(S, 'vendor');
const VENDOR = {
  'react@18.3.1/umd/react.development.js': 'x-react-18.3.1/package/umd/react.development.js',
  'react-dom@18.3.1/umd/react-dom.development.js': 'x-react-dom-18.3.1/package/umd/react-dom.development.js',
  'react@18.3.1/umd/react.production.min.js': 'x-react-18.3.1/package/umd/react.production.min.js',
  'react-dom@18.3.1/umd/react-dom.production.min.js': 'x-react-dom-18.3.1/package/umd/react-dom.production.min.js',
  '@babel/standalone@7.29.0/babel.min.js': 'x-babel-standalone-7.29.0/package/babel.min.js',
  '@supabase/supabase-js@2.112.2/dist/umd/supabase.js': 'x-supabase-supabase-js-2.112.2/package/dist/umd/supabase.js',
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/babel', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const PORT = +process.env.PORT || 8231;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function ctxPage(browser, opts, date, states) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states: states || {} })) + ");");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.clock.setFixedTime(new Date(date + 'T12:00:00'));
  await page.route('**/*', route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  return { ctx, page, errors };
}
const settle = (page) => require('./ready').appReady(page, 1000);

// The Seen and Watchlist buttons for a title in one container.
const BUTTONS = (sel) => {
  const box = document.querySelector(sel);
  if (!box) return { missing: true };
  const seen = box.querySelector('button.tsa-btn.seen');
  const watch = box.querySelector('button.tsa-btn.watch');
  const gap = box.querySelector('.tsa-gap');
  const w = watch && watch.getBoundingClientRect();
  return { seen: !!seen, seenOn: !!(seen && seen.classList.contains('on')), watch: !!watch, gap: !!gap, watchX: w ? Math.round(w.left) : null };
};
// "All titles 0/60": the meter's released count.
const RELEASED = () => {
  const c = document.querySelector('.dl-phase-divider.lead .pgh-count, .dl-overall-cell .pgh-count');
  return c ? Number(c.textContent.split('/')[1]) : null;
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- Desktop List: before, inside the window, release day ---------------
  for (const [date, seenBtn, counted] of [['2026-12-10', false, false], ['2026-12-11', true, false], ['2026-12-17', true, false], ['2026-12-18', true, true]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, date);
    await page.goto(URL + '?view=list'); await settle(page);
    const doom = await page.evaluate(BUTTONS, '.dl-row[data-row-id="doomsday"]');
    const ref = await page.evaluate(BUTTONS, '.dl-row[data-row-id="iron-man"]');
    const released = await page.evaluate(RELEASED);
    out['list_' + date] = { doom, ref, released };
    expect(doom.seen === seenBtn, `${date}: Doomsday's Seen button ${doom.seen ? 'shown' : 'missing'}`);
    expect(doom.watch, `${date}: Doomsday has no Watchlist button`);
    expect(doom.watchX === ref.watchX, `${date}: the row's Watchlist button shifted (${doom.watchX} vs ${ref.watchX})`);
    out['released_' + date] = released;
    errors.push(...e);
    await ctx.close();
  }
  expect(out['released_2026-12-18'] === out['released_2026-12-17'] + 1,
    `progress should count Doomsday only from release day: ${out['released_2026-12-17']} then ${out['released_2026-12-18']}`);

  // ---- Inside the window, marking works, with the usual toast and Undo -----
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-12-11');
    await page.goto(URL + '?view=list'); await settle(page);
    await page.locator('.dl-row[data-row-id="doomsday"] button.tsa-btn.seen').click(); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ on: !!document.querySelector('.dl-row[data-row-id="doomsday"] button.tsa-btn.seen.on'), toast: !!document.querySelector('.mcu-toast') }));
    expect(r.on && r.toast, `marking Doomsday inside the window: ${JSON.stringify(r)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Spatial card and the details drawer ----------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-12-10');
    // The card on the plain canvas carries no Seen or Watchlist buttons (Notion
    // "Cards: one card design at rest, selected and on the phone"); the
    // details do.
    await page.goto(URL); await settle(page);
    const card = await page.evaluate(() => {
      const c = document.querySelector('.card[data-id="doomsday"]');
      const ref = document.querySelector('.card[data-id="iron-man"]');
      return c ? { seen: !!c.querySelector('button.tsa-btn.seen'), watch: !!c.querySelector('button.tsa-btn.watch'), refButtons: ref ? ref.querySelectorAll('button.tsa-btn').length : -1 } : null;
    });
    await page.goto(URL + '?title=doomsday'); await settle(page);
    const drawer = await page.evaluate(BUTTONS, '.drawer');
    out.spatial = { card, drawer };
    expect(card && !card.seen && !card.watch && card.refButtons === 0, `Spatial card: ${JSON.stringify(card)}`);
    expect(!drawer.missing && !drawer.seen && drawer.watch && !drawer.gap, `details drawer: ${JSON.stringify(drawer)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- A month-only date never opens it ----------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2027-06-01');
    await page.goto(URL + '?view=list'); await settle(page);
    const dd = await page.evaluate(BUTTONS, '.dl-row[data-row-id="daredevil-born-again-s3"]');
    out.daredevil = dd;
    expect(!dd.missing && !dd.seen && dd.watch, `Daredevil S3 (March 2027, no day): ${JSON.stringify(dd)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Already marked seen before release: kept, and can be unmarked --------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-12-01', { doomsday: 'seen' });
    await page.goto(URL + '?view=list'); await settle(page);
    let b = await page.evaluate(BUTTONS, '.dl-row[data-row-id="doomsday"]');
    expect(b.seen && b.seenOn, `an early mark lost its button: ${JSON.stringify(b)}`);
    await page.locator('.dl-row[data-row-id="doomsday"] button.tsa-btn.seen').click(); await page.waitForTimeout(600);
    b = await page.evaluate(BUTTONS, '.dl-row[data-row-id="doomsday"]');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mcu.collection.v1')).states.doomsday || 'none');
    expect(!b.seen && stored !== 'seen', `unmarking an early mark: ${JSON.stringify(b)}, stored ${stored}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone List and details sheet -------------------------------------------
  for (const [date, seenBtn] of [['2026-12-10', false], ['2026-12-11', true]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, date);
    await page.goto(URL + '?view=list&sort=title'); await settle(page);
    await page.evaluate(() => { const r = document.querySelector('[data-row-id="doomsday"]'); if (r) r.scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(300);
    const row = await page.evaluate(BUTTONS, '.m-lrow[data-row-id="doomsday"]');
    await page.locator('.m-lrow[data-row-id="doomsday"] .m-lrow-open').tap(); await page.waitForTimeout(900);
    const sheet = await page.evaluate(BUTTONS, '.m-sheet');
    out['phone_' + date] = { row, sheet };
    expect(row.seen === seenBtn && row.watch, `phone row on ${date}: ${JSON.stringify(row)}`);
    expect(sheet.seen === seenBtn && sheet.watch, `phone details on ${date}: ${JSON.stringify(sheet)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
