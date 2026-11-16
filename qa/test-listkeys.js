// Desktop List keyboard movement (V3 Tasks, "Keyboard arrow navigation"):
// - with a title's details open and no character or guide, ← → open the
//   previous or next title in the order the List shows (sort, filters, search),
//   wrap at the ends and announce the position;
// - ↑ ↓ move focus to the same control in the row above or below, Home / End
//   to the first and last row, and the details follow when they are open;
// - a pinned character keeps its own stepping; typing, modifier keys and the
//   Escape order are unchanged (the List has no row checkboxes since Notion
//   "Titles 1/5", so one Escape closes the details);
// - a row stepped to never sits under the pinned meter or column headers.
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
const PORT = +process.env.PORT || 8228;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const DESK_1280 = { viewport: { width: 1280, height: 800 } };
const BASE_INIT = "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');";

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(BASE_INIT + (init || ''));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  return { ctx, page, errors };
}

// What the page looks like right now, for the List.
const SNAP = () => {
  const rows = [...document.querySelectorAll('.dl-row[data-row-id]')].map(r => r.getAttribute('data-row-id'));
  const a = document.activeElement;
  const row = a && a.closest && a.closest('[data-row-id]');
  const cell = row && [...row.children].find(c => c.contains(a));
  const live = [...document.querySelectorAll('[aria-live="polite"]')].map(e => e.textContent).filter(Boolean);
  const h = document.querySelector('.drawer.open #drawer-title');
  return {
    rows,
    drawer: (document.querySelector('.dl-row.on') || { getAttribute: () => null }).getAttribute('data-row-id'),
    drawerTitle: h ? h.textContent : null,
    focusRow: row ? row.getAttribute('data-row-id') : null,
    focusCell: cell ? cell.className : null,
    focusInDrawer: !!(a && a.closest && a.closest('.drawer')),
    focusTag: a ? a.tagName + (a.className ? '.' + String(a.className).split(' ')[0] : '') : null,
    live,
  };
};
// The row's first visible pixel: elementFromPoint at its top edge must land
// inside it, not on the pinned meter or column headers above.
const COVER = (id) => {
  const r = [...document.querySelectorAll(`[data-row-id="${id}"]`)].find(e => e.getClientRects().length);
  if (!r) return { missing: true };
  const b = r.getBoundingClientRect();
  const x = b.left + Math.min(80, b.width / 2);
  let first = null;
  for (let y = Math.ceil(b.top); y < b.bottom; y++) { const el = document.elementFromPoint(x, y); if (el && r.contains(el)) { first = y; break; } }
  // Measured from the first whole pixel scanned, not the fractional top: rows
  // with fractional heights (text in rem) would otherwise read "1px hidden"
  // when nothing covers them.
  return { top: Math.round(b.top), hidden: first == null ? 999 : first - Math.ceil(b.top), inView: b.top >= 0 && b.bottom <= innerHeight };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const press = async (page, key, wait = 450) => { await page.keyboard.press(key); await page.waitForTimeout(wait); };
  const snap = page => page.evaluate(SNAP);

  // ---- 1. ← → in Release order, with the details open ----------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list'); await require('./ready').appReady(page);
    let s = await snap(page);
    const rows = s.rows;
    out.rows = rows.length;
    expect(rows.length > 40, `release: only ${rows.length} rows`);
    // ← → do nothing while the details are closed.
    await page.focus(`.dl-row[data-row-id="${rows[0]}"] .dl-open`);
    await press(page, 'ArrowRight');
    s = await snap(page);
    expect(!s.drawer, 'closed: → opened the details');
    // Open the first title with the mouse, then put keyboard focus on its title.
    await page.locator(`.dl-row[data-row-id="${rows[0]}"] .dl-open`).click();
    await page.waitForTimeout(700);
    await page.focus(`.dl-row[data-row-id="${rows[0]}"] .dl-open`);
    await press(page, 'ArrowRight');
    s = await snap(page);
    out.right = s;
    expect(s.drawer === rows[1], `→ opened ${s.drawer}, expected ${rows[1]}`);
    expect(s.focusRow === rows[1] && /c-title/.test(s.focusCell || ''), `→ focus went to ${s.focusRow} ${s.focusCell}, expected the title of ${rows[1]}`);
    expect(s.live.some(t => t.endsWith(`, 2 of ${rows.length}`)), `→ announced ${JSON.stringify(s.live)}`);
    await press(page, 'ArrowLeft');
    await press(page, 'ArrowLeft', 1300);
    s = await snap(page);
    out.wrapBack = s;
    expect(s.drawer === rows[rows.length - 1], `← from the first opened ${s.drawer}, expected the last`);
    expect(s.live.some(t => t.endsWith(`, ${rows.length} of ${rows.length}`)), `wrap announced ${JSON.stringify(s.live)}`);
    const lastCover = await page.evaluate(COVER, rows[rows.length - 1]);
    expect(lastCover.inView && lastCover.hidden === 0, `last row after wrap: ${JSON.stringify(lastCover)}`);
    await press(page, 'ArrowRight', 1300);
    s = await snap(page);
    expect(s.drawer === rows[0], `→ from the last opened ${s.drawer}, expected the first`);
    const firstCover = await page.evaluate(COVER, rows[0]);
    out.wrapFirstCover = firstCover;
    expect(firstCover.hidden === 0, `first row after wrap is under the headers: ${JSON.stringify(firstCover)}`);
    // Modifier keys are left alone.
    await press(page, 'Alt+ArrowRight');
    s = await snap(page);
    expect(s.drawer === rows[0], `Alt+→ stepped to ${s.drawer}`);
    // Focus inside the details: → still steps, and focus stays there.
    await page.focus('.drawer .drawer-close');
    await press(page, 'ArrowRight');
    s = await snap(page);
    expect(s.drawer === rows[1] && s.focusInDrawer, `→ from inside the details: ${s.drawer}, focus in details ${s.focusInDrawer}`);
    // Typing in search is untouched.
    const box = page.locator('.toolbar input').first();
    await box.fill('iron');
    await page.waitForTimeout(500);
    const before = (await snap(page)).drawer;
    await box.focus();
    await press(page, 'ArrowLeft');
    s = await snap(page);
    expect(s.drawer === before, `← in the search box stepped from ${before} to ${s.drawer}`);
    // Search: stepping follows the rows shown.
    await page.locator(`.dl-row[data-row-id="${s.rows[0]}"] .dl-open`).click();
    await page.waitForTimeout(600);
    await page.focus(`.dl-row[data-row-id="${s.rows[0]}"] .dl-open`);
    await press(page, 'ArrowRight');
    const s2 = await snap(page);
    out.search = { rows: s.rows, drawer: s2.drawer };
    expect(s2.drawer === s.rows[1], `search: → opened ${s2.drawer}, expected ${s.rows[1]}`);
    expect(s2.live.some(t => t.endsWith(`, 2 of ${s.rows.length}`)), `search announce ${JSON.stringify(s2.live)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 2. ← → follow another sort and a filter ------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list&sort=imdb&type=series'); await require('./ready').appReady(page);
    let s = await snap(page);
    const rows = s.rows;
    out.sortedRows = rows.length;
    await page.locator(`.dl-row[data-row-id="${rows[2]}"] .dl-open`).click();
    await page.waitForTimeout(600);
    await press(page, 'ArrowRight');
    s = await snap(page);
    expect(s.drawer === rows[3], `IMDb + series: → opened ${s.drawer}, expected ${rows[3]}`);
    await press(page, 'ArrowLeft'); await press(page, 'ArrowLeft');
    s = await snap(page);
    expect(s.drawer === rows[1], `IMDb + series: ←← opened ${s.drawer}, expected ${rows[1]}`);
    expect(s.live.some(t => t.endsWith(`, 2 of ${rows.length}`)), `sorted announce ${JSON.stringify(s.live)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 3. ↑ ↓ Home End, Escape ----------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list'); await require('./ready').appReady(page);
    let s = await snap(page);
    const rows = s.rows;
    // Title column, details closed: focus moves, nothing opens.
    await page.focus(`.dl-row[data-row-id="${rows[2]}"] .dl-open`);
    await press(page, 'ArrowDown');
    s = await snap(page);
    expect(s.focusRow === rows[3] && /c-title/.test(s.focusCell || ''), `↓ on a title: focus ${s.focusRow} ${s.focusCell}`);
    expect(!s.drawer, '↓ with details closed opened them');
    await press(page, 'ArrowUp'); await press(page, 'ArrowUp');
    s = await snap(page);
    expect(s.focusRow === rows[1], `↑↑ focus ${s.focusRow}, expected ${rows[1]}`);
    // Seen column: the first status button moves to the same button.
    await page.focus(`.dl-row[data-row-id="${rows[4]}"] .c-actions button`);
    await press(page, 'ArrowDown');
    s = await snap(page);
    expect(s.focusRow === rows[5] && /c-actions/.test(s.focusCell || ''), `↓ on Seen: focus ${s.focusRow} ${s.focusCell}`);
    // Title column, End and Home; they stop at the ends.
    await page.focus(`.dl-row[data-row-id="${rows[3]}"] .dl-open`);
    await press(page, 'End', 700);
    s = await snap(page);
    expect(s.focusRow === rows[rows.length - 1] && /c-title/.test(s.focusCell || ''), `End: focus ${s.focusRow} ${s.focusCell}`);
    const endCover = await page.evaluate(COVER, rows[rows.length - 1]);
    expect(endCover.inView, `End: last row not in view ${JSON.stringify(endCover)}`);
    await press(page, 'ArrowDown');
    s = await snap(page);
    expect(s.focusRow === rows[rows.length - 1], `↓ on the last row moved to ${s.focusRow}`);
    await press(page, 'Home', 700);
    s = await snap(page);
    expect(s.focusRow === rows[0], `Home: focus ${s.focusRow}`);
    const homeCover = await page.evaluate(COVER, rows[0]);
    expect(homeCover.hidden === 0, `Home: first row under the headers ${JSON.stringify(homeCover)}`);
    await press(page, 'ArrowUp');
    s = await snap(page);
    expect(s.focusRow === rows[0], `↑ on the first row moved to ${s.focusRow}`);
    // Details open: ↓ follows, and focus stays on the row.
    await page.locator(`.dl-row[data-row-id="${rows[6]}"] .dl-open`).click();
    await page.waitForTimeout(700);
    await page.focus(`.dl-row[data-row-id="${rows[6]}"] .dl-open`);
    await press(page, 'ArrowDown');
    s = await snap(page);
    out.follow = s;
    expect(s.drawer === rows[7], `↓ with details open: details show ${s.drawer}, expected ${rows[7]}`);
    expect(s.focusRow === rows[7] && !s.focusInDrawer, `↓ with details open: focus ${s.focusRow}, in details ${s.focusInDrawer}`);
    // A mouse click leaves focus on the page (Safari never focuses a clicked
    // button): ↑ ↓ still follow from the open title, and say where they are.
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await press(page, 'ArrowDown');
    s = await snap(page);
    out.followUnfocused = s;
    expect(s.drawer === rows[8], `↓ with focus on the page: details show ${s.drawer}, expected ${rows[8]}`);
    expect(!s.focusRow && !s.focusInDrawer, `↓ with focus on the page moved focus to ${s.focusTag}`);
    expect(s.live.some(t => t.endsWith(`, 9 of ${rows.length}`)), `↓ with focus on the page announced ${JSON.stringify(s.live)}`);
    await press(page, 'ArrowUp'); await press(page, 'ArrowUp');
    s = await snap(page);
    expect(s.drawer === rows[6], `↑↑ with focus on the page: details show ${s.drawer}, expected ${rows[6]}`);
    // Focus inside the details keeps ↑ ↓ for scrolling them.
    await page.focus('.drawer .drawer-close');
    await press(page, 'ArrowDown');
    s = await snap(page);
    expect(s.drawer === rows[6], `↓ inside the details stepped to ${s.drawer}`);
    // At the first row, ↑ stops.
    await page.locator(`.dl-row[data-row-id="${rows[0]}"] .c-release`).click();
    await page.waitForTimeout(600);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await press(page, 'ArrowUp');
    s = await snap(page);
    expect(s.drawer === rows[0], `↑ on the first open title went to ${s.drawer}`);
    // Keyboard Enter on a title still moves focus into the details (unchanged).
    await page.focus(`.dl-row[data-row-id="${rows[9]}"] .dl-open`);
    await press(page, 'Enter', 900);
    s = await snap(page);
    expect(s.drawer === rows[9] && s.focusInDrawer, `Enter: details ${s.drawer}, focus in details ${s.focusInDrawer}`);
    // Escape: no selection layer any more, so one press closes the details.
    await press(page, 'Escape', 700);
    s = await snap(page);
    expect(!s.drawer, `Escape: details still ${s.drawer}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 4. A pinned character keeps its own stepping; wraps clear the headers --
  for (const [label, opts, q] of [
    ['release1440', DESK, '?view=list&char=tony'],
    ['phase1280', DESK_1280, '?view=list&sort=phase&char=tony'],
    ['release1280', DESK_1280, '?view=list&char=tony'],
  ]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts);
    await page.goto(URL + q); await require('./ready').appReady(page);
    const tonyIds = await page.evaluate(() => window.TITLES.filter(t => t.cast.includes('tony')).map(t => t.id));
    const seq = [];
    await page.locator('body').click({ position: { x: 5, y: 400 } });
    await press(page, 'ArrowLeft', 1300);
    seq.push((await snap(page)).drawer);
    await press(page, 'ArrowRight', 1300);
    const s = await snap(page);
    seq.push(s.drawer);
    const cover = await page.evaluate(COVER, s.drawer);
    out['pin_' + label] = { seq, cover };
    expect(seq.every(id => tonyIds.includes(id)), `${label}: pinned stepping left Tony's titles: ${seq}`);
    expect(cover.hidden === 0 && cover.inView, `${label}: wrapped-to row ${s.drawer} covered ${JSON.stringify(cover)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 5. A guide open in the List: its stops, and the wrap clears ----------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list&guide=infinity-saga'); await require('./ready').appReady(page);
    const stops = await page.evaluate(() => [...document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest)')].map(r => r.getAttribute('data-row-id')));
    await page.locator('body').click({ position: { x: 5, y: 600 } });
    await press(page, 'ArrowLeft', 1300);
    await press(page, 'ArrowRight', 1300);
    const cover = await page.evaluate(COVER, stops[0]);
    const cur = await page.evaluate(() => (document.querySelector('.g-stop.current') || { getAttribute: () => null }).getAttribute('data-row-id'));
    out.guide = { first: stops[0], cur, cover };
    expect(cur === stops[0], `guide: wrap landed on ${cur}, expected ${stops[0]}`);
    expect(cover.hidden === 0, `guide: first stop covered ${JSON.stringify(cover)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 5b. ↑ ↓ / Home / End in the Guides table -----------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list&guide=infinity-saga'); await require('./ready').appReady(page);
    const stops = await page.evaluate(() => [...document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest)')].map(r => r.getAttribute('data-row-id')));
    const g = () => page.evaluate(() => {
      const a = document.activeElement;
      const row = a && a.closest && a.closest('[data-row-id]');
      return {
        drawer: (document.querySelector('.drawer.open #drawer-title') || {}).textContent || null,
        drawerId: new URL(location.href).searchParams.get('title'),
        current: (document.querySelector('.g-stop.current') || { getAttribute: () => null }).getAttribute('data-row-id'),
        focusRow: row ? row.getAttribute('data-row-id') : null,
        focusOpen: !!(a && a.classList && a.classList.contains('g-open')),
        live: [...document.querySelectorAll('[aria-live="polite"]')].map(x => x.textContent).filter(Boolean),
      };
    });
    // Mouse open, focus on the page: ↓ follows from the open stop.
    await page.locator(`.g-stop[data-row-id="${stops[1]}"] .g-numcell`).first().click();
    await page.waitForTimeout(400);
    await page.locator(`.g-stop[data-row-id="${stops[1]}"] .g-open`).click();
    await page.waitForTimeout(700);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await press(page, 'ArrowDown');
    let s = await g();
    out.guideDown = s;
    expect(s.drawerId === stops[2] && s.current === stops[2], `guide ↓ (page focus): details ${s.drawerId}, current ${s.current}, expected ${stops[2]}`);
    expect(s.live.includes(`Stop 3 of ${stops.length}`) && !s.live.some(t => t.endsWith(`, 3 of ${stops.length}`)), `guide ↓ announced ${JSON.stringify(s.live)}`);
    await press(page, 'ArrowUp');
    s = await g();
    expect(s.drawerId === stops[1], `guide ↑ (page focus): details ${s.drawerId}, expected ${stops[1]}`);
    // → carries on from the stop ↑ ↓ reached.
    await press(page, 'ArrowRight');
    s = await g();
    expect(s.drawerId === stops[2], `guide → after ↑: details ${s.drawerId}, expected ${stops[2]}`);
    // Focus on a stop's title: ↓ moves focus and the details follow; End, Home.
    await page.focus(`.g-stop[data-row-id="${stops[4]}"] .g-open`);
    await press(page, 'ArrowDown');
    s = await g();
    expect(s.focusRow === stops[5] && s.focusOpen && s.drawerId === stops[5], `guide ↓ (row focus): focus ${s.focusRow}, details ${s.drawerId}, expected ${stops[5]}`);
    await press(page, 'End', 700);
    s = await g();
    expect(s.focusRow === stops[stops.length - 1] && s.drawerId === stops[stops.length - 1], `guide End: focus ${s.focusRow}, details ${s.drawerId}`);
    await press(page, 'ArrowDown');
    s = await g();
    expect(s.focusRow === stops[stops.length - 1], `guide ↓ past the last stop moved to ${s.focusRow}`);
    await press(page, 'Home', 700);
    s = await g();
    expect(s.focusRow === stops[0] && s.drawerId === stops[0], `guide Home: focus ${s.focusRow}, details ${s.drawerId}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 6. Reduced motion: the row is in place at once -----------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { ...DESK, reducedMotion: 'reduce' });
    await page.goto(URL + '?view=list'); await require('./ready').appReady(page);
    const rows = (await snap(page)).rows;
    await page.locator(`.dl-row[data-row-id="${rows[0]}"] .dl-open`).click();
    await page.waitForTimeout(700);
    await page.focus(`.dl-row[data-row-id="${rows[0]}"] .dl-open`);
    await press(page, 'ArrowLeft', 150);
    const cover = await page.evaluate(COVER, rows[rows.length - 1]);
    out.reduced = cover;
    expect(cover.inView, `reduced motion: last row not in place after 150ms ${JSON.stringify(cover)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- 7. Portuguese announcement -------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, "localStorage.setItem('mcu.lang.v1','pt-BR');");
    await page.goto(URL + '?view=list'); await require('./ready').appReady(page);
    const rows = (await snap(page)).rows;
    await page.locator(`.dl-row[data-row-id="${rows[0]}"] .dl-open`).click();
    await page.waitForTimeout(700);
    await press(page, 'ArrowRight');
    const s = await snap(page);
    out.ptLive = s.live;
    expect(s.live.some(t => t.endsWith(`, 2 de ${rows.length}`)), `pt-BR announce ${JSON.stringify(s.live)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
