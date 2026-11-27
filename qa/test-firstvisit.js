// The first visit (Notion "First visit: a graphic welcome on Connections,
// and coach marks that build on today's hints", design B · v5, 2026-11-27):
// - the welcome shows once per browser with "Show me around", never over a
//   shared link, and not again after a reload;
// - the tour: step 1 ends on a scroll of the map, step 2 on opening a title;
//   steps 3–5 put a spotlight on the cast, the open Sort menu and the counts;
//   Next on step 4 closes the menu without changing the sort; Finish opens
//   the finish with three choices; no hint shows while it runs, and it marks
//   hint.canvas and hint.ring done;
// - Escape skips to the finish;
// - a phone in Portuguese: the card docks above the nav bar, stays live over
//   the details sheet on step 3, sits below the app bar on steps 4–5, and the
//   finish is a sheet;
// - Dark: the 70% spotlight and the #1f1f1f surface; Reduce motion: the
//   card doesn't glide and the map doesn't nudge.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8403; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
const V = path.join(S, 'vendor');
const VENDOR = {
  '@supabase/supabase-js@2.112.2/dist/umd/supabase.js': 'x-supabase-supabase-js-2.112.2/package/dist/umd/supabase.js',
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
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

// A first visit: nothing stored but the language and the QA opt-in for hints
// (so the check can see that none shows during the tour).
async function ctxPage(browser, opts, lang = 'en') {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(`if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');`
    + `localStorage.setItem('mcu.hints.qa','1'); sessionStorage.setItem('qa-lang', '${lang}'); }`
    // The language is chosen in the browser for a first visit (no stored
    // key, which would make it a returning visit).
    + `Object.defineProperty(navigator, 'languages', { get: () => ['${lang}'] }); Object.defineProperty(navigator, 'language', { get: () => '${lang}' });`);
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

// The tour's state, read in the page.
const T = () => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
  const q = (s) => [...document.querySelectorAll(s)].find(e => e.getClientRects().length) || null;
  const card = document.querySelector('.tour-card');
  const spot = document.querySelector('[data-tour-spotlight][data-on="1"]');
  const pad = (b) => b && { l: b.l - 10, t: b.t - 10, r: b.r + 10, b: b.b + 10 };
  const within = (a, b) => !!a && !!b && a.l >= b.l - 1 && a.t >= b.t - 1 && a.r <= b.r + 1 && a.b <= b.b + 1;
  const sp = box(spot);
  return {
    step: card ? +card.dataset.tourStep : null,
    card: box(card), inert: !!(card && card.closest('[inert]')),
    cardInside: !!card && (() => { const r = card.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })(),
    spot: sp, spotShadow: spot ? getComputedStyle(spot).boxShadow : null,
    hint: !!document.querySelector('.first-hint.opacity-100'),
    finish: !!document.querySelector('.tour-finish'), choices: [...document.querySelectorAll('.tour-choice')].map(c => c.dataset.choice),
    welcome: !!document.querySelector('.welcome-tour'),
    menu: !!q('.sort-menu-pop'), drawer: !!q('.drawer.open'), sheet: !!q('.m-sheet .td-acc-cast'),
    sortLabel: (q('.sort-menu-trigger') || {}).getAttribute ? q('.sort-menu-trigger').getAttribute('aria-label') : null,
    hints: JSON.parse(localStorage.getItem('mcu.hints.v1') || '{}'),
    // Is what the step points at inside the spotlight's cutout?
    ironMan: within(box(q('.card[data-id="iron-man"]')) || box(q('.un-mrow')), pad(sp)),
    cast: !!sp && !!box(q('.td-acc-cast')) && (() => { const c = box(q('.td-acc-cast')); return c.l >= sp.l - 1 && (c.r <= sp.r + 1 || sp.r >= innerWidth - 6) && Math.abs(Math.max(c.t, 0) - sp.t) < 12; })(),
    sortIn: within(box(q('.sort-menu-pop')), pad(sp)),
    endIn: within(box(q('.tb-end')), pad(sp)),
    phoneSort: within(box(q('.mobile-sort .sort-menu-trigger')), pad(sp)),
    navTop: (() => { const n = q('.m-navbar'); return n ? n.getBoundingClientRect().top : null; })(),
    upnext: !!q('.un-mrow'),
    title: (q('.tour-title') || {}).textContent || null, next: (q('.tour-next') || {}).textContent || null,
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const st = (page) => page.evaluate(T);
  // A step has arrived when its words are on the card (phase "in").
  const arrive = async (page, n) => {
    await page.waitForFunction((n) => { const c = document.querySelector('.tour-card'); return c && +c.dataset.tourStep === n && c.dataset.tourPhase === 'in'; }, n, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
  };
  // Moving to a step is five beats (Andre, 2026-11-27): the card fades out,
  // the dim fades out, the page changes, the ring and dim fade in, then the
  // card fades in. Nothing glides: the card only moves while it is hidden.
  const beats = (page) => page.evaluate(() => new Promise((res) => {
    const c = document.querySelector('.tour-card'); const r0 = c.getBoundingClientRect();
    const seen = []; const t0 = performance.now();
    const tick = () => {
      const r = c.getBoundingClientRect(); const sp = document.querySelector('[data-tour-spotlight]');
      // (The 6px sink as it fades isn't a move.)
      seen.push({ ph: c.dataset.tourPhase, moved: Math.abs(r.left - r0.left) + Math.abs(r.top - r0.top) > 8,
        card: +getComputedStyle(c).opacity, spot: sp ? +getComputedStyle(sp).opacity : 0,
        fill: sp && sp.firstElementChild ? +getComputedStyle(sp.firstElementChild).opacity : 1 });
      if (performance.now() - t0 < 5000 && !(c.dataset.tourPhase === 'in' && seen.some(x => x.ph === 'light'))) setTimeout(tick, 30); else res(seen);
    };
    tick();
  }));
  const beatErrors = (b) => {
    const order = b.map(x => x.ph).filter((p, i, a) => p !== a[i - 1]).join('>');
    const bad = [];
    if (!/^(in>)?out>dark>light>in$/.test(order)) bad.push('order ' + order);
    // (Once back in, it is at its new place by design.)
    if (b.some(x => x.ph !== 'in' && x.moved && x.card > 0.1)) bad.push('the card moved while showing');
    // The dim stays throughout; between steps its cutout closes (fills) and opens again.
    if (b.some(x => x.spot < 0.9)) bad.push('the dim faded (it should stay, its cutout closing)');
    if (!b.some(x => x.ph === 'dark' && x.fill > 0.9)) bad.push('the cutout never closed');
    if (!b.some(x => x.ph === 'out' && x.card < 0.2 && x.fill < 0.1)) bad.push('the cutout closed with the card, not after it');
    // The dim starts coming back before the card does (sampling slows under load, so compare first rises).
    const after = b.findIndex(y => y.ph === 'dark');
    const opened = b.findIndex((x, i) => i > after && x.fill < 0.9), shownAt = b.findIndex((x, i) => i > after && x.card > 0.1);
    if (opened < 0 || (shownAt >= 0 && opened > shownAt)) bad.push('the cutout did not open before the card came back');
    return bad;
  };

  // ---- Desktop, English: the whole tour -----------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL); await appReady(page); await page.waitForTimeout(1600);
    const w = out.welcome = await page.evaluate(() => ({ dialog: !!document.querySelector('.welcome-dialog .welcome-tour'),
      title: (document.querySelector('.welcome-title') || {}).textContent, flag: localStorage.getItem('mcu.welcome.v1'),
      art: (() => { const i = document.querySelector('.welcome-hero img'); return i ? i.complete && i.naturalWidth > 0 : false; })() }));
    expect(w.dialog && w.title === 'An interactive map of how every Marvel film and series connects.' && w.flag === 'shown' && w.art,
      `first visit: the welcome should show with its drawing and the descriptor: ${JSON.stringify(w)}`);
    await page.locator('.welcome-tour').click(); await arrive(page, 1);
    let s = out.d1 = await st(page);
    expect(s.step === 1 && s.cardInside && !s.welcome && !s.hint && !s.spot, `step 1: the card alone, inside the screen, no hint: ${JSON.stringify(s)}`);
    // Scrolling the map is "looking around".
    // (After the map's own nudge, which step 1 doesn't count as looking around.)
    await page.waitForTimeout(900);
    // A big scroll, so Iron Man leaves the screen: step 2 must bring him back.
    await page.mouse.move(720, 600); await page.mouse.wheel(0, 1600); await page.waitForTimeout(500);
    // Not straight away: step 1 waits for the map to rest, so there's time to explore.
    const still1 = out.still1 = await page.evaluate(() => +document.querySelector('.tour-card').dataset.tourStep);
    expect(still1 === 1, `step 1 should wait while the visitor explores, not end on the first move: step ${still1} a second later`);
    await arrive(page, 2);
    s = out.d2 = await st(page);
    expect(s.step === 2 && s.ironMan && !s.hint, `step 2: after scrolling the map, a spotlight on Iron Man: ${JSON.stringify(s)}`);
    const im = out.ironManBack = await page.evaluate(() => { const c = document.querySelector('.card[data-id="iron-man"]'), sp = document.querySelector('[data-tour-spotlight][data-on="1"]');
      if (!c || !sp) return null; const a = c.getBoundingClientRect(), b = sp.getBoundingClientRect(); return a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.top >= 0 && a.bottom <= innerHeight; });
    expect(im === true, `step 2: the map brings Iron Man's card back into view, inside the spotlight: ${im}`);
    const ring2 = out.ring2 = await page.evaluate(() => { const sp = document.querySelector('[data-tour-spotlight][data-on="1"]'); const c = document.querySelector('.card[data-id="iron-man"]');
      const r = sp && sp.lastElementChild; return { ring: r ? getComputedStyle(r).borderTopWidth + ' ' + getComputedStyle(r).opacity : 'no spotlight', own: c ? c.classList.contains('up-next') : null }; });
    expect(ring2.ring === '2px 1' && ring2.own === false, `step 2: the spotlight's ring, and not Iron Man's own outline too: ${JSON.stringify(ring2)}`);
    // The dim is a shield: another title, clicked through it, doesn't open.
    const other = await page.evaluate(() => { const c = document.querySelector('.card[data-id="thor"]'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (other) { await page.mouse.click(other.x, other.y); await page.waitForTimeout(500); }
    const shielded = out.shielded = await st(page);
    expect(!other || (shielded.step === 2 && !shielded.drawer), `step 2: a title outside the spotlight should not open: ${JSON.stringify({ other, step: shielded.step, drawer: shielded.drawer })}`);
    expect(s.hints.canvas === 1, 'step 2 should mark hint.canvas done');
    // The card fades where it is: it never moves while it can be seen.
    const still = page.evaluate(() => new Promise((res) => { const c = document.querySelector('.tour-card'); const r0 = c.getBoundingClientRect(); const bad = [];
      const t0 = performance.now(); const tick = () => { const r = c.getBoundingClientRect(), o = +getComputedStyle(c).opacity;
        if (o > 0.05 && Math.abs(r.left - r0.left) + Math.abs(r.top - r0.top) > 8) bad.push(Math.round(r.left) + ',' + Math.round(r.top) + '@' + o.toFixed(2));
        if (performance.now() - t0 > 150 && performance.now() - t0 < 200 && document.querySelector('.drawer.open')) bad.early = true;
        if (performance.now() - t0 < 600) setTimeout(tick, 16); else res({ bad, early: !!bad.early }); }; tick(); }));
    await page.evaluate(() => { const c = document.querySelector('.card[data-id="iron-man"]'); if (c) c.click(); else document.querySelector('.un-open').click(); });
    const { bad: jumped, early } = out.jumped23 = await still;
    expect(!jumped.length, `step 2 → 3: the card should fade where it is, not jump: ${jumped.slice(0, 4).join(' ')}`);
    // The details wait for step 2 to go before they open.
    expect(!early, 'step 2 → 3: the details should open after the card and highlight have gone, not at once');
    await arrive(page, 3);
    s = out.d3 = await st(page);
    expect(s.step === 3 && s.drawer && s.cast && s.hints.ring === 1 && !s.hint, `step 3: the details open, the spotlight on the cast, hint.ring done: ${JSON.stringify(s)}`);
    const sortBefore = s.sortLabel;
    const watch = beats(page); await page.locator('.tour-next').click();
    const b = out.beats4 = await watch; await arrive(page, 4);
    // While "out", the card hasn't moved; it moves only once the words are gone.
    const bad = beatErrors(b);
    expect(!bad.length, `step 3 → 4 should go card out, dim out, page, dim in, card in: ${bad.join('; ')}`);
    s = out.d4 = await st(page);
    expect(s.step === 4 && s.menu && !s.drawer && s.sortIn, `step 4: the Sort menu open inside the spotlight, the details closed: ${JSON.stringify(s)}`);
    await page.locator('.tour-next').click(); await arrive(page, 5);
    s = out.d5 = await st(page);
    expect(s.step === 5 && !s.menu && s.sortLabel === sortBefore && s.endIn && s.next === 'Finish', `step 5: menu closed, sort unchanged, the counts spotlit, Finish: ${JSON.stringify(s)}`);
    // Back returns to step 4 (the menu opens again); a dash jumps to its step.
    await page.locator('.tour-back').click(); await arrive(page, 4);
    s = out.dBack = await st(page);
    expect(s.step === 4 && s.menu && s.sortIn, `Back from step 5: step 4 with the menu open: ${JSON.stringify(s)}`);
    await page.locator('.tour-dot-hit').nth(4).click(); await arrive(page, 5);
    s = out.dDot = await st(page);
    expect(s.step === 5 && !s.menu && s.endIn, `the fifth dash goes to step 5: ${JSON.stringify(s)}`);
    await page.locator('.tour-next').click(); await page.waitForTimeout(800);
    s = out.dFinish = await st(page);
    expect(s.finish && !s.step && !s.spot && s.choices.join() === 'guide,seen,explore', `finish: three choices, the card and spotlight gone: ${JSON.stringify(s)}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    s = out.dClosed = await st(page);
    expect(!s.finish && !s.step && !s.hint, `Escape closes the finish; the canvas hint stays done: ${JSON.stringify(s)}`);
    await page.reload(); await appReady(page); await page.waitForTimeout(700);
    s = out.dReload = await st(page);
    expect(!s.welcome && !s.step && !s.finish, `a reload shows neither the welcome nor the tour: ${JSON.stringify(s)}`);
    // The wheel on the map logs Chromium's passive-listener notice (run.js NOISE).
    const PASSIVE = 'Unable to preventDefault inside passive event listener';
    out.knownWarning = e.filter(x => x.includes(PASSIVE)).length;
    errors.push(...e.filter(x => !x.includes(PASSIVE)).map(x => 'desktop: ' + x));
    await ctx.close();
  }

  // ---- Escape skips to the finish; Explore closes it ----------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL); await appReady(page); await page.waitForTimeout(1600);
    await page.locator('.welcome-tour').click(); await arrive(page, 1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    let s = out.escape = await st(page);
    expect(s.finish && !s.step, `Escape on the tour should skip to the finish: ${JSON.stringify(s)}`);
    await page.locator('.tour-choice[data-choice="explore"]').click(); await page.waitForTimeout(600);
    s = out.explore = await st(page);
    expect(!s.finish && !s.step, `Explore on your own closes the finish: ${JSON.stringify(s)}`);
    errors.push(...e.map(x => 'escape: ' + x));
    await ctx.close();
  }

  // ---- Step 3 on desktop: picking a character moves on to step 4 --------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL); await appReady(page); await page.waitForTimeout(1600);
    await page.locator('.welcome-tour').click(); await arrive(page, 1);
    await page.locator('.tour-dot-hit').nth(2).click(); await arrive(page, 3);
    await page.locator('.drawer.open .cast-row').first().click(); await page.waitForTimeout(500);
    // Desktop: the character's view floats over the map, so picking one is
    // doing step 3: after a moment the tour goes on, letting go of the
    // character under the dim.
    await arrive(page, 4);
    const s = out.resumed = await st(page);
    const pinned = await page.evaluate(() => !!document.querySelector('.char-card'));
    expect(s.step === 4 && s.menu && !pinned, `picking a character moves on to step 4, the character let go so every title re-sorts: ${JSON.stringify({ step: s.step, menu: s.menu, pinned })}`);
    errors.push(...e.map(x => 'character: ' + x));
    await ctx.close();
  }

  // ---- A shared link on a first visit: no welcome, no tour ---------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?title=iron-man'); await appReady(page); await page.waitForTimeout(700);
    const s = out.shared = await st(page);
    expect(!s.welcome && !s.step && !s.finish, `a shared link lands on what it points to: ${JSON.stringify(s)}`);
    errors.push(...e.map(x => 'shared: ' + x));
    await ctx.close();
  }

  // ---- Dark and Reduce motion --------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { ...DESK, colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto(URL); await appReady(page); await page.waitForTimeout(900);
    const welcomeBg = await page.evaluate(() => getComputedStyle(document.querySelector('.welcome-dialog')).backgroundColor);
    await page.locator('.welcome-tour').click(); await page.waitForTimeout(400);
    const a = await page.evaluate(() => {
      const c = document.querySelector('.tour-card');
      const layer = document.querySelector('.spatial-canvas, .canvas, [data-canvas]');
      return { glide: getComputedStyle(c).transitionProperty, bg: getComputedStyle(c).backgroundColor, t: layer ? getComputedStyle(layer).transform : null };
    });
    await page.waitForTimeout(500);
    const b = await page.evaluate(() => { const layer = document.querySelector('.spatial-canvas, .canvas, [data-canvas]'); return layer ? getComputedStyle(layer).transform : null; });
    await page.locator('.tour-next').click(); await arrive(page, 2);
    const s = await st(page);
    out.dark = { welcomeBg, ...a, still: a.t === b, spot: s.spotShadow };
    expect(/0\.239/.test(welcomeBg) && /0\.239/.test(a.bg), `Dark: the welcome and card on surface-raised (#1f1f1f): ${JSON.stringify(out.dark)}`);
    expect(/0\.7\)/.test(s.spotShadow || ''), `Dark: the spotlight dims at 70%: ${s.spotShadow}`);
    expect(a.glide === 'none' && out.dark.still, `Reduce motion: no glide, no nudge: ${JSON.stringify(out.dark)}`);
    errors.push(...e.map(x => 'dark: ' + x));
    await ctx.close();
  }

  // ---- Phone, Portuguese ---------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, 'pt-BR');
    await page.goto(URL); await appReady(page); await page.waitForTimeout(1600);
    const w = out.mWelcome = await page.evaluate(() => ({ sheet: !!document.querySelector('.welcome-sheet .welcome-tour'), cta: (document.querySelector('.welcome-tour') || {}).textContent }));
    expect(w.sheet && w.cta === 'Fazer o tour', `phone: the welcome sheet, in Portuguese: ${JSON.stringify(w)}`);
    await page.locator('.welcome-tour').tap(); await arrive(page, 1);
    let s = out.m1 = await st(page);
    expect(s.step === 1 && s.title === 'Explore o mapa' && s.card && s.navTop != null && s.card.b <= s.navTop && !s.upnext && !s.hint,
      `phone step 1: docked above the nav bar, Up next stepped aside: ${JSON.stringify(s)}`);
    await page.waitForTimeout(900);
    const row = out.mRow = await page.evaluate(() => { const c = document.querySelector('.card[data-id="iron-man"]'), t = document.querySelector('.tour-card'); return c && t ? { card: c.getBoundingClientRect().bottom, tour: t.getBoundingClientRect().top } : null; });
    expect(row && row.card <= row.tour, `phone step 1: the first row of titles whole above the tour card: ${JSON.stringify(row)}`);
    await page.locator('.tour-next').tap(); await arrive(page, 2);
    s = out.m2 = await st(page);
    expect(s.step === 2 && s.title === 'Toque em um título' && s.ironMan, `phone step 2: tap a title, Iron Man spotlit: ${JSON.stringify(s)}`);
    await page.locator('.tour-next').tap(); await arrive(page, 3);
    s = out.m3 = await st(page);
    expect(s.step === 3 && s.sheet && !s.inert && s.cardInside, `phone step 3: the details sheet open, the card live above it: ${JSON.stringify(s)}`);
    await page.locator('.tour-next').tap(); await arrive(page, 4);
    s = out.m4 = await st(page);
    expect(s.step === 4 && !s.sheet && s.phoneSort && s.card && s.spot && s.card.t >= s.spot.b, `phone step 4: the sort control spotlit, the card below it: ${JSON.stringify(s)}`);
    // The map glided down so Iron Man sits whole between the card and the
    // nav bar, near the middle of that space.
    const mid = out.m4Row = await page.evaluate(() => { const c = document.querySelector('.card[data-id="iron-man"]').getBoundingClientRect(), t = document.querySelector('.tour-card').getBoundingClientRect(), n = document.querySelector('.m-navbar').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, card: t.bottom, nav: n.top, off: Math.round((c.top + c.bottom) / 2 - (t.bottom + n.top) / 2) }; });
    expect(mid.top >= mid.card && mid.bottom <= mid.nav && Math.abs(mid.off) <= 40, `phone step 4: Iron Man centered below the tour card: ${JSON.stringify(mid)}`);
    // Tapping Sort opens its sheet: the tour steps aside at once; closing
    // the sheet goes on to step 5.
    await page.locator('.mobile-sort .sort-menu-trigger').tap(); await page.waitForTimeout(500);
    const ps = out.mSortPause = await page.evaluate(() => { const c = document.querySelector('.tour-card'), sp = document.querySelector('[data-tour-spotlight][data-on="1"]');
      return { sheet: !!document.querySelector('.m-sheet .sort-menu-pop, .sort-menu-pop.m-sheet'), card: c ? +getComputedStyle(c).opacity : null, dim: !!sp }; });
    expect(ps.sheet && ps.card === 0 && !ps.dim, `phone step 4: opening Sort hides the tour: ${JSON.stringify(ps)}`);
    // Picking a sort there reframes the map on its new first row, under the
    // top bar: step 5 brings that row out from under the card.
    await page.locator('.m-sheet [data-sort="imdb"]').first().tap(); await page.waitForTimeout(400);
    if (await page.locator('.m-sheet .sort-menu-pop, .sort-menu-pop.m-sheet').count()) await page.locator('.m-sheet-x').last().tap();
    await arrive(page, 5); await page.waitForTimeout(500);
    const row5 = out.m5Row = await page.evaluate(() => {
      const t = document.querySelector('.tour-card').getBoundingClientRect(), bar = document.querySelector('.m-toolrow').getBoundingClientRect().bottom;
      const tops = [...document.querySelectorAll('.card[data-id]')].map(c => c.getBoundingClientRect()).filter(r => r.width && r.right > 0 && r.left < innerWidth && r.bottom > bar && r.top < innerHeight).map(r => r.top);
      return { card: t.bottom, row: tops.length ? Math.min(...tops) : null };
    });
    expect(row5.row !== null && row5.row >= row5.card, `phone step 5 after an IMDb sort: the first row below the tour card: ${JSON.stringify(row5)}`);
    s = out.m5 = await st(page);
    expect(s.step === 5 && s.next === 'Concluir', `phone step 5: Concluir: ${JSON.stringify(s)}`);
    await page.locator('.tour-next').tap(); await page.waitForTimeout(900);
    s = out.mFinish = await page.evaluate(() => ({ sheet: !!document.querySelector('.m-sheet.tour-finish'), choices: [...document.querySelectorAll('.tour-choice')].map(c => c.dataset.choice), title: (document.querySelector('#tour-finish-title') || {}).textContent }));
    expect(s.sheet && s.choices.length === 3 && s.title === 'Por onde você quer começar?', `phone finish: a sheet with three choices: ${JSON.stringify(s)}`);
    await page.locator('.tour-choice[data-choice="explore"]').tap(); await page.waitForTimeout(700);
    const after = out.mAfter = await st(page);
    expect(!after.finish && !after.step && after.upnext, `phone: Explore closes the finish and Up next returns: ${JSON.stringify(after)}`);
    errors.push(...e.map(x => 'phone: ' + x));
    await ctx.close();
  }

  // A phone in Story order (Andre, 2026-11-27): step 1 lifts the first row
  // on screen above the card, not Iron Man, who isn't on it, which left the
  // map on an empty patch.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE);
    await page.goto(URL + '?sort=chrono'); await appReady(page); await page.waitForTimeout(1600);
    await page.locator('.welcome-tour').tap(); await arrive(page, 1); await page.waitForTimeout(900);
    const r = out.storyRow = await page.evaluate(() => {
      const t = document.querySelector('.tour-card').getBoundingClientRect(), bar = document.querySelector('.m-toolrow').getBoundingClientRect().bottom;
      const vis = [...document.querySelectorAll('.card[data-id]')].map(c => c.getBoundingClientRect()).filter(r => r.width && r.right > 0 && r.left < innerWidth && r.bottom > bar && r.top < t.top);
      return { cardTop: t.top, bar, whole: vis.filter(r => r.top >= bar && r.bottom <= t.top).length };
    });
    expect(r.whole >= 2, `phone, Story order, step 1: a row of titles whole above the tour card: ${JSON.stringify(r)}`);
    errors.push(...e.map(x => 'phone story: ' + x));
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
