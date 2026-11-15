const QA_PORT = +process.env.PORT || 8218; // regress/quick give each check its own port
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
const URL = 'http://127.0.0.1:' + QA_PORT + '/';
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init);
  // The sign-in reminder would cover the page after a few marks: off unless a
  // test asks for it (NUDGE=1).
  if (!process.env.NUDGE) await ctx.addInitScript("try { if (!localStorage.getItem('mcu.signInNudge.v1')) localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}");
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
const settle = page => require('./ready').appReady(page);
const go = async page => { await page.goto(URL); await settle(page); };

// The rule this check exists for: per-phase meters belong to the By Phase tab
// alone, and every other order shows ONE meter over the whole catalogue. The
// two tabs used to repeat each other; now they do different jobs.
const SORTS = ['release', 'chrono', 'phase', 'title', 'imdb', 'rt'];
const expectFor = (sort) => (sort === 'phase' ? { phaseMeters: 6, overall: false } : { phaseMeters: 0, overall: true });
// Sorts are picked from the Sort menu by key, each in its usual direction
// (Notion "Merge sort and order into one Sort menu").
const DESK_SORT = { release: 'release', chrono: 'chrono', phase: 'phase', title: 'title', imdb: 'imdb', rt: 'rt' };
const PHONE_SORT = DESK_SORT;
const USUAL_DIR = { release: 'asc', chrono: 'asc', phase: 'asc', title: 'asc', imdb: 'desc', rt: 'desc' };
const pickSort = (page, key, wait) => page.evaluate(async ([k, d, w]) => {
  const t = document.querySelector('.sort-menu-trigger');
  if (!t) return false;
  t.click();
  await new Promise(r => setTimeout(r, 300));
  const b = document.querySelector(`.sort-menu-pop [data-sort="${k}"][data-dir="${d}"]`);
  if (b) b.click();
  await new Promise(r => setTimeout(r, w));
  return !!b;
}, [key, USUAL_DIR[key], wait]);
const deskSort = (page, key) => pickSort(page, key, 1800);
// Spatial and List are the Explore and My list tabs (Notion "Desktop:
// navigation for Explore, My list and Guides").
const deskView = (page, name) => page.evaluate(async (n) => {
  const label = n === 'Spatial' ? 'Explore' : n === 'List' ? 'My list' : n;
  const b = [...document.querySelectorAll('.nav-tabs button')].find(x => x.textContent.trim() === label);
  if (b) b.click();
  await new Promise(r => setTimeout(r, 1800));
  return !!b;
}, name);
const phoneSort = (page, key) => pickSort(page, key, 2200);
// Phones: Spatial is the Explore tab; List and Grid are My list's layout
// buttons (Notion "Phone: bottom bar becomes Explore, My list and Guides").
const phoneView = (page, name) => page.evaluate(async (n) => {
  const tab = (v) => document.querySelector(`.m-tab[data-section="${v}"]`);
  if (!tab('explore')) return 'no bottom bar';
  if (/Spatial|Espacial/.test(n)) { tab('explore').click(); await new Promise(r => setTimeout(r, 2200)); return 'ok'; }
  if (!document.querySelector('.m-listbar')) { tab('mylist').click(); await new Promise(r => setTimeout(r, 700)); }
  await new Promise(r => setTimeout(r, 2200));
  return 'ok';
}, name);

// What a view is showing right now: how many per-phase meters, and whether the
// whole-catalogue meter is up.
const readCanvas = (page) => page.evaluate(() => ({
  phaseMeters: document.querySelectorAll('.band-label .pgh-bar').length,
  // The floating box can also hold just the Up next row (By Phase has no All
  // titles meter), so look for a meter inside it, not the box itself.
  overall: !!document.querySelector('.spatial-overall .pgh'),
}));
const readDeskList = (page) => page.evaluate(() => ({
  phaseMeters: document.querySelectorAll('.dl-phase-divider:not(.overall) .pgh-bar').length,
  overall: !!document.querySelector('.dl-phase-divider.overall'),
}));
const readPhone = (page) => page.evaluate(() => ({
  phaseMeters: document.querySelectorAll('.m-phase-divider:not(.overall) .pgh-bar').length,
  overall: !!document.querySelector('.m-phase-divider.overall'),
}));
const checkRule = (where, sort, got, errors) => {
  const want = expectFor(sort);
  if (got.phaseMeters !== want.phaseMeters || got.overall !== want.overall) {
    errors.push(`${where} in ${sort} order shows ${got.phaseMeters} phase meters and ${got.overall ? 'an' : 'no'} All titles meter; expected ${want.phaseMeters} and ${want.overall ? 'one' : 'none'}`);
  }
};
const hit = (a, b) => !!(a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom));

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {}; const errors = [];
  const { page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await go(page);

  // ---- The rule, in every desktop view and order --------------------------
  R.rule = {};
  await deskView(page, 'Spatial');
  for (const sort of SORTS) {
    await deskSort(page, DESK_SORT[sort]);
    const got = await readCanvas(page);
    R.rule['desktop spatial ' + sort] = got;
    checkRule('desktop Spatial', sort, got, errors);
  }
  await deskView(page, 'List');
  for (const sort of SORTS) {
    await deskSort(page, DESK_SORT[sort]);
    const got = await readDeskList(page);
    R.rule['desktop list ' + sort] = got;
    checkRule('desktop List', sort, got, errors);
  }

  // ---- The numbers, in By Phase -------------------------------------------
  await deskSort(page, DESK_SORT.phase);
  const dividers = () => page.evaluate(() =>
    [...document.querySelectorAll('.dl-table .dl-phase-divider:not(.overall) .pgh')].map(p => ({
      label: p.querySelector('.pgh-label').textContent.trim(),
      count: (p.querySelector('.pgh-count') || {}).textContent,
      up: (p.querySelector('.pgh-up') || {}).textContent || null,
      sr: (p.querySelector('.story-sr') || {}).textContent.trim(),
    })));
  R.start = await dividers();
  if (R.start.length !== 6) errors.push(`expected 6 phase dividers in By Phase, got ${R.start.length}`);
  // Nothing seen yet: an empty track and 0/N, not a hidden header.
  if (R.start[0] && R.start[0].count !== '0/6') errors.push(`Phase 1 opened at "${R.start[0].count}", expected 0/6`);
  // The denominator counts released titles only. Phase 6 has unreleased ones,
  // so its total must be smaller than its number of titles, and it must say so.
  R.phase6 = R.start[5] || null;
  if (!R.phase6) errors.push('no Phase 6 divider');
  else {
    if (!R.phase6.up) errors.push('Phase 6 has unreleased titles but shows no "+N" hint');
    const total = Number((R.phase6.count || '').split('/')[1]);
    const inCatalog = await page.evaluate(() => window.TITLES.filter(t => t.phase === 6).length);
    if (!(total < inCatalog)) errors.push(`Phase 6 counts ${total} of ${inCatalog} titles; unreleased ones should be left out`);
  }
  // Marking a title seen moves its phase's count, live.
  await page.evaluate(async () => {
    const first = window.TITLES.filter(t => t.phase === 1)[0];
    const row = document.querySelector(`[data-row-id="${first.id}"]`);
    const btn = [...row.querySelectorAll('button')].find(b => /seen|visto/i.test(b.getAttribute('aria-label') || ''));
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 900));
  });
  R.afterMark = (await dividers())[0];
  if (!R.afterMark || R.afterMark.count !== '1/6') {
    errors.push(`after marking one title Phase 1 reads "${R.afterMark && R.afterMark.count}", expected 1/6`);
  }
  if (!/1 of 6|1 de 6/.test((R.afterMark && R.afterMark.sr) || '')) {
    errors.push(`the spoken form reads "${R.afterMark && R.afterMark.sr}" — colour and digits must not be the only signal`);
  }
  // The collection tab must NOT feed the fraction. On the Seen tab only seen
  // titles are listed, so a count taken from the visible set would read 1/1.
  await page.evaluate(async () => {
    const b = [...document.querySelectorAll('button')].find(x => /^(Seen|Vistos)$/i.test(x.textContent.trim()));
    if (b) b.click();
    await new Promise(r => setTimeout(r, 1200));
  });
  R.onSeenTab = (await dividers())[0] || null;
  if (R.onSeenTab && R.onSeenTab.count !== '1/6') {
    errors.push(`the Seen tab changed Phase 1 to "${R.onSeenTab.count}"; the collection tab must not feed its own numbers`);
  }
  await page.evaluate(async () => {
    const b = [...document.querySelectorAll('button')].find(x => /^(All|Todos)$/i.test(x.textContent.trim()));
    if (b) b.click();
    await new Promise(r => setTimeout(r, 1000));
  });
  // A text search narrows the catalog, so the headers stand down entirely.
  await page.fill('.search-wrap input', 'iron');
  await page.waitForTimeout(900);
  R.duringSearch = (await dividers()).length;
  if (R.duringSearch !== 0) errors.push(`${R.duringSearch} dividers survived a text search; they should be hidden`);
  await page.fill('.search-wrap input', '');
  await page.waitForTimeout(900);
  R.afterSearch = (await dividers()).length;
  if (R.afterSearch !== 6) errors.push(`dividers did not come back after the search (${R.afterSearch})`);

  // The whole-catalogue meter counts the same way, over everything released.
  await deskSort(page, DESK_SORT.release);
  R.overallList = await page.evaluate(() => {
    const el = document.querySelector('.dl-phase-divider.overall');
    if (!el) return null;
    const released = window.TITLES.filter(t => window.MCU_isReleased(t)).length;
    return { count: (el.querySelector('.pgh-count') || {}).textContent || null, released };
  });
  if (!R.overallList) errors.push('no All titles meter in the desktop List in Release order');
  else if (R.overallList.count !== `1/${R.overallList.released}`) {
    errors.push(`the All titles meter reads "${R.overallList.count}"; with one title seen it should be 1/${R.overallList.released}`);
  }

  // ---- The desktop phase divider pins (By Phase) ---------------------------
  await deskSort(page, DESK_SORT.phase);
  R.deskSticky = await page.evaluate(async () => {
    const dl = document.querySelector('.dlist');
    const c = dl.getBoundingClientRect();
    const head = document.querySelector('.dl-head');
    // Far enough that the first meter has pinned under My list's title and
    // collection tabs.
    dl.scrollTop = 600;
    await new Promise((r) => setTimeout(r, 500));
    const d = document.querySelector('.dl-phase-divider');
    const cs = getComputedStyle(d);
    const r = d.getBoundingClientRect();
    const headTop = Math.round(head.getBoundingClientRect().top - c.top);
    dl.scrollTop = 3000;
    await new Promise((r2) => setTimeout(r2, 600));
    const all = [...document.querySelectorAll('.dl-phase-divider')];
    const tops = all.map((x) => Math.round(x.getBoundingClientRect().top - c.top));
    // The meter on top at this depth: the last one pinned in the top slot,
    // which paints over the earlier ones there.
    const pinned = all.filter((x, i) => Math.abs(tops[i]) <= 1);
    const hit = document.elementFromPoint(c.left + 60, c.top + 8);
    const onTop = !!(hit && pinned.length && hit.closest('.dl-phase-divider') === pinned[pinned.length - 1]);
    dl.scrollTop = 0;
    return {
      pinnedTop: Math.round(r.top - c.top), pinnedBottom: Math.round(r.bottom - c.top), headTop, onTop,
      position: cs.position, transform: cs.transform,
      flipId: d.getAttribute('data-flip-id'),
      opaque: cs.backgroundColor,
      rowgroups: document.querySelectorAll('[role="rowgroup"]').length,
    };
  });
  {
    const d = R.deskSticky;
    if (d.position !== 'sticky') errors.push(`the desktop phase divider is ${d.position}, not sticky`);
    // The meters sit above the column headers (user decision, 2026-10-29):
    // the phase meter pins at the top and the headers pin right beneath it.
    if (Math.abs(d.pinnedTop) > 1) errors.push(`the pinned phase meter sits at ${d.pinnedTop}, not at the top of the List`);
    if (Math.abs(d.headTop - d.pinnedBottom) > 1) errors.push(`the column headers start at ${d.headTop} but the phase meter above them ends at ${d.pinnedBottom}`);
    if (d.transform && d.transform !== 'none') errors.push(`the desktop divider carries ${d.transform}; it must stay out of the reorder animation`);
    if (d.flipId) errors.push('the desktop sticky divider has a data-flip-id again');
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(d.opaque)) errors.push('the pinned divider is transparent, so rows show through it');
    // One rowgroup per phase is what bounds each sticky divider.
    if (d.rowgroups !== 6) errors.push(`${d.rowgroups} rowgroups in By Phase; expected one per phase`);
    if (!d.onTop) errors.push('deep in the List, the current phase meter is not the one showing in the top slot');
  }

  // The All titles header pins too, in every order but By Phase. It once sat in
  // a rowgroup of its own, which was both invalid ARIA and its whole sticky
  // container, so it scrolled away with the first rows.
  await deskSort(page, DESK_SORT.release);
  R.overallSticky = await page.evaluate(async () => {
    const dl = document.querySelector('.dlist');
    const c = dl.getBoundingClientRect();
    const head = document.querySelector('.dl-head');
    const ov = document.querySelector('.dl-phase-divider.overall');
    if (!ov) return { error: 'no All titles header in Release order' };
    dl.scrollTop = 2500;
    await new Promise((r) => setTimeout(r, 600));
    const out = {
      top: Math.round(ov.getBoundingClientRect().top - c.top),
      bottom: Math.round(ov.getBoundingClientRect().bottom - c.top),
      headTop: Math.round(head.getBoundingClientRect().top - c.top),
      role: ov.getAttribute('role'),
      parentRole: ov.parentElement.getAttribute('role'),
    };
    dl.scrollTop = 0;
    return out;
  });
  {
    const o = R.overallSticky;
    if (o.error) errors.push(o.error);
    else {
      if (Math.abs(o.top) > 1) errors.push(`after scrolling, the All titles meter sits at ${o.top}, not pinned at the top of the List`);
      if (Math.abs(o.headTop - o.bottom) > 1) errors.push(`after scrolling, the column headers start at ${o.headTop}, not right under the All titles meter (${o.bottom})`);
      if (o.role !== 'row' || o.parentRole !== 'table') errors.push(`the All titles header is a ${o.role} inside a ${o.parentRole}; it must be a row owned by the table`);
    }
  }

  // ---- The canvas ---------------------------------------------------------
  await deskView(page, 'Spatial');
  await deskSort(page, DESK_SORT.phase);
  // Connection lines run behind the band labels, so heading and meter sit on
  // an opaque pill, about two and a half cards wide.
  R.bands = await page.evaluate(() => [...document.querySelectorAll('.band-label')].map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.card')].map((c) => c.getBoundingClientRect())
      .filter((c) => c.top > r.bottom - 2 && c.top - r.bottom < 140);
    return {
      w: Math.round(r.width), cardW: cards.length ? Math.round(cards[0].width) : null,
      gapToCards: cards.length ? Math.round(Math.min(...cards.map((c) => c.top)) - r.bottom) : null,
      bg: cs.backgroundColor, radius: parseFloat(cs.borderRadius),
      segs: el.querySelectorAll('.pgh-seg').length,
    };
  }));
  if (!R.bands.length) errors.push('no Spatial band labels in By Phase');
  R.bands.forEach((b, i) => {
    if (/rgba\(0, 0, 0, 0\)|transparent/.test(b.bg)) errors.push(`band ${i} has no background; the lines run straight through it`);
    if (!(b.radius > 0)) errors.push(`band ${i} is not a pill (border-radius ${b.radius})`);
    if (!b.segs) errors.push(`band ${i} has no meter segments`);
    if (b.cardW) {
      const inCards = b.w / b.cardW;
      if (inCards < 2 || inCards > 3) errors.push(`band ${i} is ${inCards.toFixed(2)} cards wide; it should sit between 2 and 3`);
      if (b.gapToCards < 0) errors.push(`band ${i} overlaps the cards beneath it by ${-b.gapToCards}px`);
    }
  });
  // Framing: the camera leaves room for the first pill — not cut off at the
  // top, not under the count pill — in each layout that has bands.
  R.framing = {};
  for (const sort of ['phase', 'chrono', 'release']) {
    await deskSort(page, DESK_SORT[sort]);
    R.framing[sort] = await page.evaluate(() => {
      const vp = document.querySelector('.viewport').getBoundingClientRect();
      const count = document.querySelector('.ctx-count').getBoundingClientRect();
      const first = [...document.querySelectorAll('.band-label')].map(b => b.getBoundingClientRect()).sort((a, b) => a.top - b.top)[0];
      const ov = document.querySelector('.spatial-overall');
      const o = ov && ov.getBoundingClientRect();
      const over = (a, b) => !!(a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom));
      return {
        firstTop: first ? Math.round(first.top - vp.top) : null,
        underCount: over(first, count),
        overallOnBand: [...document.querySelectorAll('.band-label')].some(b => over(b.getBoundingClientRect(), o)),
      };
    });
    const f = R.framing[sort];
    if (f.firstTop === null) errors.push(`no band label to frame in ${sort} order`);
    else if (f.firstTop < 0) errors.push(`the camera cuts the first band pill off at the top in ${sort} order (${f.firstTop}px)`);
    if (f.underCount) errors.push(`the first band pill sits under the count pill in ${sort} order`);
    if (f.overallOnBand) errors.push(`the All titles meter covers a band pill in ${sort} order`);
  }
  // A row name with no meter hugs its text: the space to the right of the
  // words matches the space to the left, rather than trailing off into room
  // kept for a meter that is not there.
  R.plainPills = {};
  for (const sort of ['release', 'chrono']) {
    await deskSort(page, DESK_SORT[sort]);
    R.plainPills[sort] = await page.evaluate(() => [...document.querySelectorAll('.band-label.plain')].map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const bl = parseFloat(cs.borderLeftWidth), br = parseFloat(cs.borderRightWidth);
      return { left: Math.round(t.left - r.left - bl), right: Math.round(r.right - br - t.right) };
    }));
    if (!R.plainPills[sort].length) errors.push(`no plain band pills in ${sort} order`);
    R.plainPills[sort].forEach((g, i) => {
      if (Math.abs(g.left - g.right) > 2) errors.push(`${sort} band ${i} has ${g.left}px of padding on the left but ${g.right}px on the right`);
    });
  }

  // The whole-catalogue meter stands down with the bands while a title is
  // selected, and comes back afterwards.
  await deskSort(page, DESK_SORT.release);
  R.standDown = await page.evaluate(async () => {
    const card = document.querySelector('.card button');
    if (card) card.click();
    await new Promise(r => setTimeout(r, 1800));
    const whileSelected = !!document.querySelector('.spatial-overall');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 1500));
    return { whileSelected, back: !!document.querySelector('.spatial-overall') };
  });
  if (R.standDown.whileSelected) errors.push('the All titles meter stayed up while a title was selected');
  if (!R.standDown.back) errors.push('the All titles meter did not come back after the selection closed');

  // ---- Phone: the rule in every view and order ----------------------------
  const { page: m } = await ctxPage(browser, MOBILE, "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');");
  await go(m);
  for (const view of ['List', 'Spatial']) {
    const sw = await phoneView(m, view);
    if (sw !== 'ok') { errors.push(`could not reach the phone ${view}: ${sw}`); continue; }
    for (const sort of SORTS) {
      await phoneSort(m, PHONE_SORT[sort]);
      const got = view === 'Spatial' ? await readCanvas(m) : await readPhone(m);
      R.rule['phone ' + view.toLowerCase() + ' ' + sort] = got;
      checkRule('phone ' + view, sort, got, errors);
    }
  }
  // Phone canvas: the meter takes its own row, clear of the count pill and the
  // zoom control, and the first band pill stays on screen below it.
  R.phoneCanvas = {};
  for (const sort of ['release', 'chrono', 'phase', 'title']) {
    await phoneSort(m, PHONE_SORT[sort]);
    R.phoneCanvas[sort] = await m.evaluate(() => {
      const box = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const vp = box('.viewport');
      const ov = box('.spatial-overall'), zoom = box('.zoom-ctl'), count = box('.ctx-pill');
      const first = [...document.querySelectorAll('.band-label')].map(b => b.getBoundingClientRect()).sort((a, b) => a.top - b.top)[0] || null;
      const card = [...document.querySelectorAll('.card')].map(c => c.getBoundingClientRect()).sort((a, b) => a.top - b.top)[0] || null;
      const over = (a, b) => !!(a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom));
      return {
        ovOnZoom: over(ov, zoom), ovOnCount: over(ov, count),
        bandClipped: first ? first.top < vp.top : false,
        bandOnChrome: over(first, ov) || over(first, zoom) || over(first, count),
        cardOnMeter: over(card, ov),
      };
    });
    const c = R.phoneCanvas[sort];
    if (c.ovOnZoom) errors.push(`on a phone the All titles meter covers the zoom control (${sort})`);
    if (c.ovOnCount) errors.push(`on a phone the All titles meter covers the count pill (${sort})`);
    if (c.bandClipped) errors.push(`on a phone the first band pill is cut off at the top (${sort})`);
    if (c.bandOnChrome) errors.push(`on a phone the first band pill sits under the floating controls (${sort})`);
    if (c.cardOnMeter) errors.push(`on a phone the first cards sit under the All titles meter (${sort})`);
  }

  // ---- Phone: Grid and List are the same component (By Phase) -------------
  const readDividers = (pg) => pg.evaluate(() => {
    const d = [...document.querySelectorAll('.m-phase-divider.sticky:not(.overall)')];
    const cs = d.length ? getComputedStyle(d[0]) : null;
    const lab = d.length ? d[0].querySelector('.pgh-label') : null;
    return {
      n: d.length, blocks: document.querySelectorAll('.m-gblock').length,
      segs: document.querySelectorAll('.m-phase-divider .pgh-seg').length,
      position: cs && cs.position, top: cs && cs.top,
      labelSize: lab && getComputedStyle(lab).fontSize,
    };
  });
  // My list keeps its own sort (Notion navigation), so By Phase is picked there.
  await phoneView(m, 'List');
  await phoneSort(m, PHONE_SORT.phase);
  // The sticky divider pins flush to the top of the scroll area, and stays out
  // of the reorder animation: a transform on a sticky element left it hanging.
  R.gridSticky = await m.evaluate(async () => {
    const sa = document.querySelector('.m-scrollarea');
    const d = document.querySelector('.m-phase-divider.sticky');
    if (!sa || !d) return null;
    sa.scrollTop = 700;
    await new Promise(r => setTimeout(r, 500));
    const out = {
      pinnedOffset: Math.round(d.getBoundingClientRect().top - sa.getBoundingClientRect().top),
      transform: getComputedStyle(d).transform, flipId: d.getAttribute('data-flip-id'),
    };
    sa.scrollTop = 0;
    return out;
  });
  if (!R.gridSticky) errors.push('no sticky divider in the phone List');
  else {
    if (Math.abs(R.gridSticky.pinnedOffset) > 1) errors.push(`the pinned List divider sits ${R.gridSticky.pinnedOffset}px from the top of the scroll area, not flush`);
    if (R.gridSticky.transform !== 'none') errors.push(`the sticky divider carries ${R.gridSticky.transform}; it must stay out of the reorder animation`);
    if (R.gridSticky.flipId) errors.push('the sticky divider has a data-flip-id again');
  }
  R.listPhase = await readDividers(m);
  if (R.listPhase.n !== 6) errors.push(`the List in By Phase shows ${R.listPhase.n} phase dividers, expected 6`);
  if (R.listPhase.position !== 'sticky') errors.push(`the List divider is ${R.listPhase.position}, not sticky`);
  if (R.listPhase.segs !== R.gridPhase.segs) errors.push(`the List draws ${R.listPhase.segs} segments but the Grid draws ${R.gridPhase.segs}`);
  if (!R.listPhase.segs) errors.push('the meter has no segments');

  // The meter fills when its header comes into view, so the progress is
  // something you watch happen rather than something already sitting there.
  R.reveal = await m.evaluate(async () => {
    const lit = () => [...document.querySelectorAll('.m-phase-divider:not(.overall) .pgh-bar')].map((b) => b.classList.contains('lit'));
    const sa = document.querySelector('.m-scrollarea');
    sa.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 600));
    const atTop = lit();
    sa.scrollTop = sa.scrollHeight;
    await new Promise((r) => setTimeout(r, 1400));
    return { atTop, atBottom: lit(), scrolled: sa.scrollTop > 0 };
  });
  if (!R.reveal.scrolled) errors.push('the List did not scroll, so the reveal was never exercised');
  else {
    if (!R.reveal.atTop[0]) errors.push('the first meter never filled, though its header starts on screen');
    if (R.reveal.atTop[R.reveal.atTop.length - 1]) errors.push('the last meter was already full before it was scrolled to');
    if (!R.reveal.atBottom[R.reveal.atBottom.length - 1]) errors.push('the last meter did not fill after being scrolled to');
  }

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
