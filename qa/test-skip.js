// Skipping a guide stop (V3 Tasks, "Guides: skip a stop, and bring it back"):
// - desktop List: Skip beside Seen (by keyboard), the row minimized with
//   Unskip, focus moving to Unskip and back, announcements;
// - the stop leaves the path: the meter (1/4, "1 skipped"), the next stop and
//   Continue, "Mark N more seen", the stepper count and ← →, Up next in
//   Spatial and the canvas badge;
// - remembered per guide across a reload, not in another guide;
// - seen wins: marking a skipped stop seen counts it and drops the skip;
// - skipping the last unseen essential completes the guide, and finishing a
//   guide with a stop skipped bursts the green confetti either way;
// - Spatial: Skip in the details (by keyboard, focus to Unskip), Skip and
//   Unskip on zoomed-in cards, Skip in the phone's tapped-card popup;
// - phone List and Grid; Portuguese.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8234; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
const V = path.join(S, 'vendor');
const VENDOR = {
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
const URL = `http://127.0.0.1:${QA_PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const G = '?guide=before-doomsday';
// Counts confetti canvases added from now on.
const COUNT_BURSTS = "window.__bursts = 0; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('mcu-confetti')) window.__bursts++; }))).observe(document.body, { childList: true });";

async function ctxPage(browser, opts, { seen = [], skips = null, lang = 'en' } = {}) {
  const ctx = await browser.newContext(opts);
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.lang.v1'," + JSON.stringify(lang) + ");"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states })) + ");"
    + (skips ? "localStorage.setItem('mcu.guideSkips.v1', " + JSON.stringify(JSON.stringify(skips)) + ");" : "localStorage.removeItem('mcu.guideSkips.v1');")
    + "}");
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
// Two guide layouts, so most of these take two selectors.
//
// Phones keep the original meter row (GuideMeter -> .g-meter, with the shared
// ProgressHeader inside it). Desktop replaced it in Batch 10 with one taller
// card, GuideModule, which draws its own progress as .gm-count / .gm-notes and
// puts the bulk action in its footer. This check was written before that card
// existed and still read only the phone markup, so on desktop it found nothing
// and reported `count null` / `meter: null / null` / `bulk action reads "null"`
// as though the guide were broken. Updated 2026-10-31; the app was right.
// Since Notion "Guides 3/4" the open guide's header (desktop and phone) reads
// "1 of 5 stops · 3 optional · 1 skipped" in one line (.g-meter .pgh-count):
// `count` is normalised to "1/5" and `skipNote` is that line when it names a
// skipped stop. There is no stepper in the list any more; the Spatial pill
// keeps one.
const STATE = () => {
  const a = document.activeElement;
  const line = (document.querySelector('.g-meter .pgh-count, .gm-count') || {}).textContent || null;
  const m = line && /^(\d+)(?:\/| of | de )(\d+)/.exec(line);
  return {
    skipped: [...document.querySelectorAll('.g-stop.skipped, .g-card.skipped')].map(e => e.getAttribute('data-row-id')),
    count: m ? m[1] + '/' + m[2] : line,
    // Desktop joins the optional and skipped notes into one line, so this is a
    // substring test at the call sites, not an equality one.
    skipNote: (document.querySelector('.g-meter .g-skip-count, .gm-notes') || {}).textContent || (line && /skipped|pulad/.test(line) ? line : null),
    next: (document.querySelector('.g-stop.next, .g-card.next') || { getAttribute: () => null }).getAttribute('data-row-id'),
    bulk: (document.querySelector('.g-meter .pgh-action, .gm-foot .pgh-action, .g-meter button') || {}).textContent || null,
    stops: (document.querySelector('.guide-banner .cb-pos, .g-pill .cb-pos, .g-pill [aria-live]') || {}).textContent
      || (document.querySelector('.g-desk') ? document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest):not(.skipped)').length + ' stops' : null),
    // The control by its hook class (shadcn-styled buttons carry many classes).
    focus: a ? (['g-unskip', 'g-skip'].find(c => a.classList && a.classList.contains(c)) || a.className || a.tagName) + '@' + ((a.closest && a.closest('[data-row-id]')) ? a.closest('[data-row-id]').getAttribute('data-row-id') : '') : null,
    live: [...document.querySelectorAll('[aria-live="polite"]')].map(e => e.textContent).filter(Boolean),
    stored: localStorage.getItem('mcu.guideSkips.v1'),
    // Complete: phones say so in a .g-ready line; the desktop card says it by
    // turning green (.done) and showing where the guide leads instead.
    ready: !!document.querySelector('.g-ready, .g-module.done, .g-kind.done'),
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- Desktop List: skip by keyboard, the path, reload, unskip ---------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['endgame'] });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page);
    let s = await page.evaluate(STATE);
    expect(s.next === 'loki-s2' && s.count === '1/5', `before: next ${s.next}, count ${s.count}`);
    expect(!(await page.locator('.g-stop[data-row-id="endgame"] .g-skip').count()), 'a seen stop offers Skip');
    const skip = page.locator('.g-stop[data-row-id="loki-s2"] .g-skip');
    expect((await skip.getAttribute('aria-label')) === 'Skip Loki: Season 2 in this guide', 'Skip has no clear name');
    await skip.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    s = await page.evaluate(STATE);
    out.afterSkip = s;
    expect(s.skipped.join() === 'loki-s2', `not minimized: ${s.skipped}`);
    expect(/g-unskip\s*@loki-s2/.test(s.focus || ''), `focus did not move to Unskip: ${s.focus}`);
    expect(s.live.includes('Skipped Loki: Season 2'), `no announcement: ${JSON.stringify(s.live)}`);
    expect(s.count === '1/4' && /1 skipped/.test(s.skipNote || ''), `meter: ${s.count} / ${s.skipNote}`);
    expect(s.next === 'cap-brave', `next stop is ${s.next}, expected cap-brave`);
    expect(/Mark 3 more seen/.test(s.bulk || ''), `bulk action reads "${s.bulk}"`);
    expect(/4 stops/.test(s.stops || ''), `stepper count "${s.stops}"`);
    const rowH = await page.evaluate(() => [...document.querySelectorAll('.g-stop[data-row-id]')].map(r => [r.getAttribute('data-row-id'), Math.round(r.getBoundingClientRect().height)]));
    const h = Object.fromEntries(rowH);
    expect(h['loki-s2'] < h['thunderbolts'] - 10, `the skipped row isn't shorter: ${JSON.stringify(h)}`);
    // The stepper passes over it: from Endgame, → goes to Brave New World.
    await page.locator('.g-stop[data-row-id="endgame"] .g-open').click(); await page.waitForTimeout(500);
    await page.locator('body').press('ArrowRight'); await page.waitForTimeout(500);
    const drawer = await page.evaluate(() => (document.querySelector('.drawer.open #drawer-title') || {}).textContent);
    expect(/Brave New World/.test(drawer || ''), `→ from Endgame opened "${drawer}"`);
    // Remembered across a reload, and only in this guide.
    await page.reload(); await appReady(page);
    s = await page.evaluate(STATE);
    expect(s.skipped.join() === 'loki-s2', `not remembered after reload: ${s.skipped}`);
    await page.goto(URL + '?view=list&guide=multiverse-saga'); await appReady(page);
    s = await page.evaluate(STATE);
    expect(!s.skipped.length, `skipped in another guide too: ${s.skipped}`);
    // Unskip: back in the path, focus back on Skip.
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page);
    await page.locator('.g-stop[data-row-id="loki-s2"] .g-unskip').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    s = await page.evaluate(STATE);
    out.afterUnskip = s;
    expect(!s.skipped.length && s.next === 'loki-s2' && s.count === '1/5' && !s.skipNote, `unskip: ${JSON.stringify(s)}`);
    expect(/g-skip\s*@loki-s2/.test(s.focus || ''), `focus did not return to Skip: ${s.focus}`);
    expect(s.live.includes('Loki: Season 2 is back in the guide'), `no unskip announcement: ${JSON.stringify(s.live)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Seen wins; skipping the last unseen essential completes the guide ----
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['endgame'], skips: { 'before-doomsday': ['loki-s2'] } });
    await page.goto(URL + '?view=list&guide=before-doomsday&title=loki-s2'); await appReady(page);
    await page.locator('.drawer .tsa-btn.seen').click(); await page.waitForTimeout(600);
    const s = await page.evaluate(STATE);
    expect(!s.skipped.length && s.count === '2/5', `seen did not win: ${JSON.stringify(s)}`);
    expect(!(s.stored || '').includes('loki-s2'), `the skip was not dropped: ${s.stored}`);
    errors.push(...e);
    await ctx.close();
  }
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { seen: ['endgame', 'cap-brave', 'thunderbolts', 'fantastic-four'] });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page);
    await page.evaluate(COUNT_BURSTS);
    let s = await page.evaluate(STATE);
    expect(!s.ready, 'complete before the last stop was skipped');
    await page.locator('.g-stop[data-row-id="loki-s2"] .g-skip').tap(); await page.waitForTimeout(600);
    s = await page.evaluate(STATE);
    out.completeBySkip = s;
    expect(s.ready && s.skipped.join() === 'loki-s2', `skipping the last one did not complete the guide: ${JSON.stringify(s)}`);
    expect(await page.evaluate(() => window.__bursts) === 1, 'completing the guide by skipping did not burst confetti');
    errors.push(...e);
    await ctx.close();
  }
  {
    // A stop skipped, then the last other stop marked seen: complete, with confetti.
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['endgame', 'cap-brave', 'thunderbolts'], skips: { 'before-doomsday': ['loki-s2'] } });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page);
    await page.evaluate(COUNT_BURSTS);
    await page.locator('.g-desk .g-stop[data-row-id="fantastic-four"] .tsa-btn.seen').click(); await page.waitForTimeout(600);
    const s = await page.evaluate(STATE);
    out.completeWithSkip = { ready: s.ready, bursts: await page.evaluate(() => window.__bursts) };
    expect(s.ready && out.completeWithSkip.bursts === 1, `finishing with a stop skipped: ${JSON.stringify(out.completeWithSkip)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Spatial: the badge and Up next ---------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['endgame'], skips: { 'before-doomsday': ['loki-s2'] } });
    await page.goto(URL + G); await appReady(page);
    const r = await page.evaluate(() => {
      const b = document.querySelector('.card[data-id="loki-s2"] .card-gnum');
      return { badge: b && b.textContent, cls: b && b.className, label: b && b.getAttribute('aria-label'), // With a guide open, Spatial's own Up next row gives way to the
      // guide card, which names the next stop itself.
      up: (document.querySelector('.un-mrow .un-open, .gm-next .gm-ntitle') || {}).textContent || null };
    });
    out.spatial = r;
    expect(r.badge === '–' && /skip/.test(r.cls || '') && r.label === 'Stop 2, skipped', `Spatial badge: ${JSON.stringify(r)}`);
    expect(/Brave New World/.test(r.up || ''), `Up next in the guide is "${r.up}"`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Spatial: Skip in the details, on a zoomed-in card, in the phone popup ---
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['endgame'] });
    await page.goto(URL + '?guide=before-doomsday&title=cap-brave'); await appReady(page); await page.waitForTimeout(800);
    const b = page.locator('.drawer.open .g-dskip-btn');
    expect((await b.getAttribute('aria-label')) === 'Skip Captain America: Brave New World in this guide', `details Skip name: ${await b.getAttribute('aria-label')}`);
    await b.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    let r = await page.evaluate(() => ({ note: (document.querySelector('.drawer.open .g-dskip-note') || {}).textContent,
      focus: document.activeElement && document.activeElement.className, stored: localStorage.getItem('mcu.guideSkips.v1'),
      card: !!document.querySelector('.card.g-skipped[data-id="cap-brave"]') }));
    out.detailsSkip = r;
    expect(r.note === 'Skipped in this guide' && /g-unskip/.test(r.focus || '') && (r.stored || '').includes('cap-brave') && r.card, `details Skip: ${JSON.stringify(r)}`);
    // Cards on the canvas carry no Skip or Unskip (Notion "Cards: one card
    // design at rest, selected and on the phone"): the details and the
    // guide's list hold them.
    for (let i = 0; i < 4; i++) { await page.locator('.zoom-ctl button, .zoom button').last().click().catch(() => {}); await page.waitForTimeout(300); }
    await page.waitForTimeout(700);
    r = await page.evaluate(() => ({ unskip: !!document.querySelector('.card[data-id="cap-brave"] .g-skipctl .g-unskip'),
      skip: !!document.querySelector('.card[data-id="thunderbolts"] .g-skipctl .g-skip, .card[data-id="fantastic-four"] .g-skipctl .g-skip') }));
    out.cardSkip = r;
    expect(!r.unskip && !r.skip, `zoomed-in cards: ${JSON.stringify(r)}`);
    await page.locator('.drawer.open .g-unskip').click(); await page.waitForTimeout(500);
    r = await page.evaluate(() => ({ stored: localStorage.getItem('mcu.guideSkips.v1'), card: !!document.querySelector('.card.g-skipped[data-id="cap-brave"]'),
      drawer: !!document.querySelector('.drawer.open .g-dskip-btn') }));
    expect(!(r.stored || '').includes('cap-brave') && !r.card && r.drawer, `card Unskip: ${JSON.stringify(r)}`);
    errors.push(...e);
    await ctx.close();
  }
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { seen: ['endgame'] });
    await page.goto(URL + '?view=spatial&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(600);
    // A phone guide opens framed on its next stop (Loki: Season 2): tap it.
    await page.locator('.card[data-id="loki-s2"]').click({ force: true }); await page.waitForTimeout(900);
    await page.locator('.m-focuspop .g-skip').tap(); await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ unskip: !!document.querySelector('.m-focuspop .g-unskip'), tsa: !!document.querySelector('.m-focuspop .card-acts-tsa'),
      stored: localStorage.getItem('mcu.guideSkips.v1') }));
    out.popupSkip = r;
    expect(r.unskip && !r.tsa && (r.stored || '').includes('loki-s2'), `phone popup Skip: ${JSON.stringify(r)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone List, in Portuguese (an old Grid link opens the List) --------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, { lang: 'pt-BR' });
    await page.goto(URL + '?view=grid&guide=before-doomsday'); await appReady(page);
    const b = page.locator('.g-stop[data-row-id="loki-s2"] .g-skip');
    expect((await b.getAttribute('aria-label')) === 'Pular Loki – Temporada 2 neste guia', `pt-BR Skip name: ${await b.getAttribute('aria-label')}`);
    await b.tap(); await page.waitForTimeout(500);
    let s = await page.evaluate(STATE);
    const tag = await page.evaluate(() => (document.querySelector('.g-stop[data-row-id="loki-s2"] .g-skiptag-inline') || {}).textContent);
    expect(s.skipped.join() === 'loki-s2' && tag === 'Pulado' && /1 pulado/.test(s.skipNote || ''), `pt-BR list: ${JSON.stringify(s)} tag ${tag}`);
    await page.locator('.g-stop[data-row-id="loki-s2"] .g-unskip').tap(); await page.waitForTimeout(500);
    s = await page.evaluate(STATE);
    expect(!s.skipped.length, `list unskip: ${s.skipped}`);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(!wide, 'the phone guide List scrolls sideways');
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
