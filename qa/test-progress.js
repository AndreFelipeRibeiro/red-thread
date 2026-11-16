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
  const label = n === 'Spatial' ? 'Connections' : n === 'List' ? 'Titles' : n;
  const b = [...document.querySelectorAll('.nav-tabs button')].find(x => x.textContent.trim() === label);
  if (b) b.click();
  await new Promise(r => setTimeout(r, 1800));
  return !!b;
}, name);
const phoneSort = (page, key) => pickSort(page, key, 2200);
// Phones: Spatial is the Explore tab, the List is My list (Notion "Phone:
// bottom bar becomes Explore, My list and Guides"; the Grid is gone).
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
// The desktop List groups by itself (Notion "Titles 1/5"): Release date and
// Phase by phase, Story order by era, each group header with its own
// progress; the column sorts (Title, IMDb, RT) are one flat list. The
// catalogue-wide count is the heading's (the progress widget, Titles 3/5).
const readDeskList = (page) => page.evaluate(() => ({
  groups: document.querySelectorAll('.dl-group').length,
  meters: document.querySelectorAll('.dl-group .dl-group-marks').length,
  phases: [...document.querySelectorAll('.dl-group-label')].filter(b => /^Phase \d/.test(b.textContent.trim())).length,
}));
const checkDeskList = (sort, got, errors) => {
  const flat = sort === 'title' || sort === 'imdb' || sort === 'rt';
  const ok = flat ? got.groups === 0
    : sort === 'chrono' ? got.groups >= 5 && got.phases === 0 && got.meters === got.groups
    : got.groups === 6 && got.phases === 6 && got.meters === 6;
  if (!ok) errors.push(`desktop List in ${sort} order shows ${JSON.stringify(got)}`);
};
// Titles sorts from the header's Sort menu, as Connections does.
const deskListSort = (page, key) => deskSort(page, key);
// The phone List follows the desktop List (Notion "Titles 4/5"): the same
// group headings with their marks, and All titles in the compact card docked
// above the bottom bar (none in By Phase, where the headings carry it).
const readPhoneList = (page) => page.evaluate(() => ({
  groups: document.querySelectorAll('.m-scrollarea .m-ghead').length,
  meters: document.querySelectorAll('.m-scrollarea .m-ghead .dl-group-marks').length,
  phases: [...document.querySelectorAll('.m-scrollarea .m-ghead .dl-group-label')].filter(b => /^Phase \d/.test(b.textContent.trim())).length,
  overall: !!document.querySelector('.spatial-overall.docked .pgh'),
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
    await deskListSort(page, sort);
    const got = await readDeskList(page);
    R.rule['desktop list ' + sort] = got;
    checkDeskList(sort, got, errors);
  }

  // ---- The numbers, in By Phase -------------------------------------------
  await deskListSort(page, 'phase');
  const dividers = () => page.evaluate(() =>
    [...document.querySelectorAll('.dl-group-head')].map(b => ({
      label: (b.querySelector('.dl-group-label') || b).textContent.trim(),
      count: (b.querySelector('.dl-group-count') || {}).textContent || null,
    })));
  R.start = await dividers();
  if (R.start.length !== 6) errors.push(`expected 6 phase headers in By Phase, got ${R.start.length}`);
  // Nothing seen yet: an empty track and "0 of 6 seen", not a hidden header.
  if (R.start[0] && R.start[0].count !== '0 of 6 seen') errors.push(`Phase 1 opened at "${R.start[0].count}", expected 0 of 6 seen`);
  // The denominator counts released titles only: Phase 6 has unreleased ones,
  // so its total must be smaller than its number of titles.
  R.phase6 = R.start[5] || null;
  if (!R.phase6) errors.push('no Phase 6 header');
  else {
    const total = Number(((R.phase6.count || '').match(/of (\d+)/) || [])[1]);
    const inCatalog = await page.evaluate(() => window.TITLES.filter(t => t.phase === 6).length);
    if (!(total < inCatalog)) errors.push(`Phase 6 counts ${total} of ${inCatalog} titles; unreleased ones should be left out`);
  }
  // Marking a title seen moves its phase's count, live, in words (colour and
  // digits alone are not the signal).
  await page.evaluate(async () => {
    const first = window.TITLES.filter(t => t.phase === 1)[0];
    const row = document.querySelector(`[data-row-id="${first.id}"]`);
    const btn = [...row.querySelectorAll('button')].find(b => /seen|visto/i.test(b.getAttribute('aria-label') || ''));
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 900));
  });
  R.afterMark = (await dividers())[0];
  if (!R.afterMark || R.afterMark.count !== '1 of 6 seen') {
    errors.push(`after marking one title Phase 1 reads "${R.afterMark && R.afterMark.count}", expected 1 of 6 seen`);
  }
  // The collection tab must NOT feed the fraction. On the Seen tab only seen
  // titles are listed, so a count taken from the visible set would read 1/1.
  await page.evaluate(async () => {
    const b = document.querySelector('.ml-status .coll-switch button[data-coll="seen"]');
    if (b) b.click();
    await new Promise(r => setTimeout(r, 1200));
  });
  R.onSeenTab = (await dividers())[0] || null;
  if (!R.onSeenTab || R.onSeenTab.count !== '1 of 6 seen') {
    errors.push(`the Seen tab changed Phase 1 to "${R.onSeenTab && R.onSeenTab.count}"; the collection tab must not feed its own numbers`);
  }
  await page.evaluate(async () => {
    const b = document.querySelector('.ml-status .coll-switch button[data-coll="all"]');
    if (b) b.click();
    await new Promise(r => setTimeout(r, 1000));
  });
  // A text search narrows the catalog, so the counts stand down entirely
  // (the groups stay, without numbers).
  await page.fill('.search-wrap input', 'iron');
  await page.waitForTimeout(900);
  R.duringSearch = (await dividers()).filter(d => d.count).length;
  if (R.duringSearch !== 0) errors.push(`${R.duringSearch} group counts survived a text search; they should be hidden`);
  await page.fill('.search-wrap input', '');
  await page.waitForTimeout(900);
  R.afterSearch = (await dividers()).filter(d => d.count).length;
  if (R.afterSearch !== 6) errors.push(`group counts did not come back after the search (${R.afterSearch})`);

  // The catalogue-wide count (the compact card in Titles) counts the same
  // way, over everything released.
  await deskListSort(page, 'release');
  R.overallList = await page.evaluate(() => {
    const el = document.querySelector('.dlist .spatial-overall .pgh-count');
    const released = window.TITLES.filter(t => window.MCU_isReleased(t)).length;
    return { text: el ? el.textContent : null, released };
  });
  if (R.overallList.text !== `1/${R.overallList.released}`) {
    errors.push(`the All titles card in Titles reads "${R.overallList.text}"; with one title seen it should be 1/${R.overallList.released}`);
  }

  // ---- Nothing in the List pins (By Phase) ----------------------------------
  // Andre's review (2026-11-15): the column headers and group headings scroll
  // with the list; the status tabs are the header's second row; the compact
  // card stays in the list's top-right corner.
  await deskListSort(page, 'phase');
  R.deskScroll = await page.evaluate(async () => {
    const dl = document.querySelector('.dlist');
    const sticky = ['.dl-head', '.dl-group'].filter(sel => { const e = document.querySelector(sel); return e && getComputedStyle(e).position === 'sticky'; });
    dl.scrollTop = 3000;
    await new Promise((r) => setTimeout(r, 600));
    const card = document.querySelector('.dlist .spatial-overall');
    const out = { sticky, tabs: !!document.querySelector('.toolbar .tb-sub-row .coll-switch'),
      card: card ? Math.round(card.getBoundingClientRect().top - dl.getBoundingClientRect().top) : null,
      rowgroups: document.querySelectorAll('.dl-table > [role="rowgroup"]').length };
    dl.scrollTop = 0;
    return out;
  });
  {
    const d = R.deskScroll;
    if (d.sticky.length) errors.push(`still pinned in the List: ${d.sticky.join(', ')}`);
    if (!d.tabs) errors.push('the status tabs are not the header\'s second row');
    if (d.card !== 14) errors.push(`the compact card is not in the list's top-right corner after scrolling (${d.card})`);
    if (d.rowgroups !== 6) errors.push(`${d.rowgroups} rowgroups in By Phase; expected one per phase`);
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
      const got = view === 'Spatial' ? await readCanvas(m) : await readPhoneList(m);
      R.rule['phone ' + view.toLowerCase() + ' ' + sort] = got;
      if (view === 'Spatial') checkRule('phone ' + view, sort, got, errors);
      else {
        checkDeskList(sort, got, errors);
        if (got.overall !== expectFor(sort).overall) errors.push(`phone List in ${sort} order ${got.overall ? 'shows' : 'has no'} All titles in the docked card`);
      }
    }
  }
  // Phone canvas: the card docked at the bottom stays clear of the count pill
  // and the zoom control, and the first band pill and cards stay on screen
  // above it.
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

  // ---- Phone: the List in By Phase: one heading per phase, with its marks ---
  // Plain headings (no sticky dividers, no folding; Notion "Titles 4/5"): one
  // mark per released title, as many filled as are seen.
  await phoneView(m, 'List');
  await phoneSort(m, PHONE_SORT.phase);
  R.listPhase = await m.evaluate(() => {
    const heads = [...document.querySelectorAll('.m-scrollarea .m-ghead')];
    const st = JSON.parse(localStorage.getItem('mcu.collection.v1') || '{"states":{}}').states;
    return heads.map(h => {
      const marks = [...h.querySelectorAll('.dl-group-marks > span')];
      return { label: h.querySelector('.dl-group-label').textContent.trim(), marks: marks.length,
        filled: marks.filter(x => /bg-\(--brand\)/.test(x.className)).length,
        sticky: getComputedStyle(h).position === 'sticky' };
    }).concat([{ seenTotal: Object.values(st).filter(v => v === 'seen').length }]);
  });
  const heads = R.listPhase.slice(0, -1);
  if (heads.length !== 6) errors.push(`the List in By Phase shows ${heads.length} phase headings, expected 6`);
  if (heads.some(h => h.sticky)) errors.push('a phone List heading is sticky again');
  if (heads.some(h => !h.marks)) errors.push(`a phase heading has no marks: ${JSON.stringify(heads)}`);

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
