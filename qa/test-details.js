const QA_PORT = +process.env.PORT || 8223; // regress/quick give each check its own port
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

// Title details (TitleDetailsBody in mobile.jsx): the desktop drawer and the
// phone sheet render the same sections in the same order, with the same hero.
// The sample titles are chosen at run time (released with scores, not out yet
// without scores, budget unknown), so the check keeps working as release
// dates pass and the catalogue changes.
// Seen and Watchlist sit in one row with Share (td-actrow, Notion "Share 1/3").
const HEAD = ['td-hero', 'td-scores', 'td-facts', 'td-actrow', 'synopsis'];
// The "watch" slot is filled by watch.jsx (Where to watch) and "guides" by
// guides-ui.jsx (Part of): right after Where to watch, and only for a title
// that is a stop in some guide.
const SLOT_PROBE = null;

const inspect = () => {
  const I = window.MCU_I18N;
  const root = document.querySelector('.drawer.open') || document.querySelector('.m-sheet');
  if (!root) return { open: false };
  const head = root.querySelector('.td-head');
  if (!head) return { open: true, shared: false };
  // The app's own class, wherever it sits: a shadcn Button lists the
  // library's classes before the app's (shadcn pass 3/5).
  const hook = (el) => (el.dataset.slot && [...el.classList].find(c => /^(td|m|un|drawer|cast)-/.test(c))) || el.classList[0];
  const after = [];
  for (let n = head.nextElementSibling; n; n = n.nextElementSibling) after.push(hook(n));
  const thumb = root.querySelector('.td-hero .td-thumb').getBoundingClientRect();
  const hero = [...root.querySelectorAll('.td-hero-text > *')];
  const close = root.querySelector('.drawer-close, .m-sheet-x').getBoundingClientRect();
  const box = root.getBoundingClientRect();
  return {
    open: true,
    head: [...head.children].map(hook),
    after,
    heroText: hero.map(e => e.className.split(' ')[0]),
    thumb: [Math.round(thumb.width), Math.round(thumb.height)],
    title: root.querySelector('.td-title').textContent,
    marks: [...root.querySelectorAll('.td-title mark.hl')].map(m => m.textContent),
    scores: root.querySelectorAll('.td-scores .m-sc:not(.none)').length,
    pending: (root.querySelector('.td-pending') || {}).textContent || null,
    budget: root.querySelector('.td-fact dd').textContent,
    budgetLabel: root.querySelector('.td-fact dt').textContent,
    closeOverlap: hero.some(e => { const r = e.getBoundingClientRect(); return r.right > close.left && r.left < close.right && r.bottom > close.top && r.top < close.bottom; }),
    overflow: [...root.querySelectorAll('.td-head *')].some(e => e.getBoundingClientRect().right > box.right + 0.5),
    probe: (() => { const p = root.querySelector('.td-slot-watch .wtw'); if (!p) return null;
      const order = [...head.children]; const syn = order.findIndex(e => e.classList.contains('synopsis'));
      return order.indexOf(root.querySelector('.td-slot-watch')) - syn; })(),
    guides: (() => { const order = [...head.children]; const g = root.querySelector('.td-slot-guides');
      const id = new URLSearchParams(location.search).get('title');
      return { at: g ? order.indexOf(g) - order.indexOf(root.querySelector('.td-slot-watch')) : null,
        rows: root.querySelectorAll('.g-partof-row').length, expected: window.MCU_GUIDE ? window.MCU_GUIDE.forTitle(id).length : 0 }; })(),
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);

  // Pick the samples from the live catalogue.
  let { ctx, page, errors } = await ctxPage(browser, DESKTOP);
  await go(page);
  const pick = await page.evaluate(() => {
    const I = window.MCU_I18N;
    const T = window.TITLES;
    const released = T.find(t => I.release(t).status === 'released' && t.imdb != null && t.rt != null && t.budget != null && t.story);
    const upcoming = T.find(t => I.release(t).status !== 'released' && t.imdb == null && t.rt == null);
    const noBudget = T.find(t => t.budget == null);
    // Two long casts: both overflow the drawer, so a missing reset would leave
    // the second one scrolled instead of the browser clamping it to the top.
    const [longCast, longCast2] = T.slice().sort((a, b) => b.cast.length - a.cast.length);
    return {
      released: released && { id: released.id, budget: I.budget(released.budget), name: I.titleName(released) },
      upcoming: upcoming && { id: upcoming.id },
      noBudget: noBudget && { id: noBudget.id },
      longCast: longCast.id, longCast2: { id: longCast2.id, name: I.titleName(longCast2) },
      strings: { after: I.tr('details.ratingsAfterRelease'), none: I.tr('score.none'), unknown: I.tr('details.budgetUnknown'), budget: I.tr('details.budget') },
    };
  });
  out.samples = { released: pick.released && pick.released.id, upcoming: pick.upcoming && pick.upcoming.id, noBudget: pick.noBudget && pick.noBudget.id };
  if (!pick.released) err('no released title with scores, budget and story to test with');
  await ctx.close();

  const surfaces = [['desktop', DESKTOP], ['phone390', MOBILE], ['phone320', { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true }]];
  const heads = {};
  for (const [name, opts] of surfaces) {
    ({ ctx, page, errors } = await ctxPage(browser, opts, SLOT_PROBE));
    const phone = name !== 'desktop';
    const open = async (id) => { await page.goto(URL + '?title=' + id); await settle(page); return page.evaluate(inspect); };

    const r = await open(pick.released.id);
    out[name] = { released: r };
    if (!r.open) { err(`${name}: details did not open for ${pick.released.id}`); await ctx.close(); continue; }
    if (r.shared === false) { err(`${name}: the details do not use the shared body (no .td-head)`); await ctx.close(); continue; }
    heads[name] = r.head.join(',');
    if (r.head.filter(c => c !== 'td-slot').join(',') !== HEAD.join(',')) err(`${name}: sections are ${r.head.join(', ')}, expected ${HEAD.join(', ')} (plus the slot)`);
    if (r.probe !== 1) err(`${name}: Where to watch should sit right after the synopsis (got offset ${r.probe})`);
    if (r.guides.rows !== r.guides.expected) err(`${name}: Part of lists ${r.guides.rows} guides, expected ${r.guides.expected}`);
    if (r.guides.expected ? r.guides.at !== 1 : r.guides.at !== null) err(`${name}: the Guides slot should ${r.guides.expected ? 'follow Where to watch' : 'be absent'} (got ${r.guides.at})`);
    // The cast is a collapsible section (open by default) after the details,
    // then Follow the thread (Notion "Explore E 4/5") for a title with one.
    const castAfter = phone ? ['td-acc', 'td-thread-wrap', 'm-apply'] : ['td-acc', 'td-thread-wrap'];
    if (r.after.join(',') !== castAfter.join(',')) err(`${name}: after the details came ${r.after.join(', ')}, expected ${castAfter.join(', ')}`);
    if (r.heroText.join(',') !== 'td-eyebrow,td-title,release-line,story-year') err(`${name}: hero text is ${r.heroText.join(', ')}`);
    if (r.thumb[0] !== 66 || r.thumb[1] !== 99) err(`${name}: poster thumbnail is ${r.thumb.join('×')}, expected 66×99`);
    if (r.scores !== 2) err(`${name}: expected IMDb and RT badges for ${pick.released.id}, saw ${r.scores}`);
    if (r.budget !== pick.released.budget || r.budgetLabel !== pick.strings.budget) err(`${name}: budget reads "${r.budgetLabel} ${r.budget}", expected "${pick.strings.budget} ${pick.released.budget}"`);
    if (r.closeOverlap) err(`${name}: the close button overlaps the title text`);
    // Accordions: the cast starts open, Where to watch closed; each heading
    // is a button that toggles its own section only.
    const acc = await page.evaluate(async () => {
      const root = document.querySelector('.drawer.open') || document.querySelector('.m-sheet');
      const btn = (sel) => root.querySelector(sel + ' .td-acc-btn');
      const castBtn = btn('.td-acc-cast'), watchBtn = btn('.td-acc-watch');
      const first = { cast: castBtn && castBtn.getAttribute('aria-expanded'), watch: watchBtn && watchBtn.getAttribute('aria-expanded'),
        rowsVisible: [...root.querySelectorAll('.cast-row, .m-crow')].filter(e => e.getClientRects().length).length };
      castBtn.click(); await new Promise(r => setTimeout(r, 150));
      const closed = { cast: castBtn.getAttribute('aria-expanded'), rowsVisible: [...root.querySelectorAll('.cast-row, .m-crow')].filter(e => e.getClientRects().length).length,
        watch: watchBtn && watchBtn.getAttribute('aria-expanded') };
      castBtn.click(); await new Promise(r => setTimeout(r, 150));
      return { first, closed, controls: castBtn.getAttribute('aria-controls') && !!document.getElementById(castBtn.getAttribute('aria-controls')) };
    });
    out[name].accordion = acc;
    if (acc.first.cast !== 'true' || acc.first.watch !== 'false' || !acc.first.rowsVisible) err(`${name}: the cast should start open and Where to watch closed: ${JSON.stringify(acc.first)}`);
    if (acc.closed.cast !== 'false' || acc.closed.rowsVisible || acc.closed.watch !== 'false') err(`${name}: closing the cast should hide its rows and leave Where to watch alone: ${JSON.stringify(acc.closed)}`);
    if (!acc.controls) err(`${name}: the cast heading's aria-controls does not point at its body`);
    if (r.overflow) err(`${name}: something in the details runs past the panel's right edge`);

    if (pick.upcoming) {
      const u = await open(pick.upcoming.id);
      out[name].upcoming = { pending: u.pending, scores: u.scores };
      if (u.pending !== pick.strings.after) err(`${name}: an unreleased title without scores should say "${pick.strings.after}", said "${u.pending}"`);
    }
    if (pick.noBudget) {
      const b = await open(pick.noBudget.id);
      out[name].noBudget = b.budget;
      if (b.budget !== pick.strings.unknown) err(`${name}: an unknown budget should read "${pick.strings.unknown}", read "${b.budget}"`);
      if (/\$\s*0\b|—/.test(b.budget)) err(`${name}: unknown budget shows a placeholder figure`);
    }

    // Desktop: details and cast scroll as one, and a new title starts at the top.
    if (!phone) {
      await page.goto(URL + '?title=' + pick.longCast); await settle(page);
      const before = await page.evaluate(() => { const sc = document.querySelector('.drawer-scroll'); sc.scrollTop = sc.scrollHeight; return sc.scrollTop; });
      await page.evaluate((id) => document.querySelector(`.card[data-id="${id}"] .card-open`).click(), pick.longCast2.id);
      await page.waitForTimeout(1200);
      const sw = await page.evaluate(() => { const sc = document.querySelector('.drawer-scroll'); return { title: document.querySelector('.drawer.open .td-title').textContent, top: sc.scrollTop, room: sc.scrollHeight - sc.clientHeight }; });
      out[name].switchScroll = { before, after: sw.top, title: sw.title };
      if (sw.title !== pick.longCast2.name) err(`${name}: switching titles left "${sw.title}" in the drawer`);
      else if (before === 0 || sw.room === 0) err(`${name}: ${pick.longCast} did not scroll, so the reset went untested`);
      else if (sw.top !== 0) err(`${name}: switching titles kept the drawer scrolled to ${sw.top}px`);
    }

    // Search highlight on the title, on both surfaces.
    const word = pick.released.name.split(/\s+/)[0];
    if (phone) {
      await page.goto(URL); await settle(page);
      await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
      await page.locator('.m-search-input input').fill(word); await page.waitForTimeout(900);
      // Escape closes the suggestions first (one layer per press), uncovering the list.
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      await page.locator('.m-lrow-open').first().click(); await page.waitForTimeout(900);
    } else {
      await page.goto(URL + '?title=' + pick.released.id); await settle(page);
      await page.locator('.search-wrap input').fill(word); await page.waitForTimeout(900);
    }
    const h = await page.evaluate(inspect);
    out[name].search = { word, title: h.title, marks: h.marks };
    if (!h.marks || !h.marks.length) err(`${name}: searching "${word}" does not highlight the details title`);
    errors.forEach(e => err(`${name} console: ${e}`));
    await ctx.close();
  }
  if (heads.desktop && heads.phone390 && heads.desktop !== heads.phone390) err(`desktop and phone sections differ: ${heads.desktop} / ${heads.phone390}`);

  // Portuguese labels.
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, "localStorage.setItem('mcu.lang.v1','pt-BR');"));
  if (pick.noBudget) {
    await page.goto(URL + '?title=' + pick.noBudget.id); await settle(page);
    const pt = await page.evaluate(() => !document.querySelector('.td-fact') ? { dt: null, dd: null } : ({ dt: document.querySelector('.td-fact dt').textContent, dd: document.querySelector('.td-fact dd').textContent, want: [window.MCU_I18N.tr('details.budget'), window.MCU_I18N.tr('details.budgetUnknown')] }));
    out.pt = pt;
    if (pt.dt !== 'Orçamento' || pt.dd !== 'Não divulgado') err(`Portuguese budget reads "${pt.dt} ${pt.dd}"`);
  }
  errors.forEach(e => err(`pt console: ${e}`));
  await ctx.close();

  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
