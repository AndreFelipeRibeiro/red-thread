const QA_PORT = +process.env.PORT || 8197; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
// Count running flip animations shortly after an action, and whether a leaving layer exists (and where).
const probe = (page) => page.evaluate(() => new Promise(res => requestAnimationFrame(() => setTimeout(() => {
  const anims = document.getAnimations().filter(a => a.playState === 'running');
  const flips = anims.filter(a => a.id === 'm-flip').length;
  const layer = document.querySelector('.m-flip-layer');
  let ghostCols = null, liveCols = null;
  if (layer && layer.firstElementChild && layer.firstElementChild.classList.contains('dl-row')) {
    ghostCols = getComputedStyle(layer.firstElementChild).gridTemplateColumns.split(' ').length;
    const live = document.querySelector('.dl-table .dl-row:not(.dl-head)');
    liveCols = live && getComputedStyle(live).gridTemplateColumns.split(' ').length;
  }
  res({ flips, ghosts: layer ? layer.childElementCount : 0, layerIn: layer ? layer.parentElement.className.split(' ')[0] : null, ghostCols, liveCols });
}, 60))));
const settled = (page) => page.evaluate(() => ({ layer: !!document.querySelector('.m-flip-layer'), running: document.getAnimations().filter(a => a.playState === 'running' && a.id === 'm-flip').length }));
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__o = out;
  const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); } catch (e) {}";
  const st = (page) => page.evaluate(() => {
    const b = k => { const el = document.querySelector('.coll-count.' + k); return el ? { n: el.textContent, cls: el.className } : null; };
    const t = document.querySelector('.mcu-toast'); const r = t && t.getBoundingClientRect();
    return { seen: b('seen'), watch: b('watchlist'),
      toast: t ? { text: t.innerText.replace(/\\n/g, ' | '), cls: t.className, top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom), cx: Math.round(r.left + r.width / 2), w: Math.round(r.width) } : null,
      confetti: !!document.querySelector('.mcu-confetti'), pop: document.querySelectorAll('.tsa-btn.pop').length };
  });
  // The Lottie confetti (celebrate-lottie.ts): its player and files, which
  // must only be fetched near a milestone.
  const LOTTIE = /lottie_light|milestone-(up|down)|small-win/;
  const lottieGets = (page) => { const got = []; page.on('request', r => { if (LOTTIE.test(r.url())) got.push(r.url().split('/').pop()); }); return got; };
  // A small win's toast and star pop (.mcu-starpop), with the icon it starts from.
  const halfProbe = (page) => page.evaluate(() => {
    const t = document.querySelector('.mcu-toast'), p = document.querySelector('.mcu-starpop');
    return { toast: t ? t.innerText.replace(/\\n/g, ' | ') : null, halfway: !!(t && t.classList.contains('halfway')),
      pop: p ? { svg: p.querySelectorAll('svg').length, z: +getComputedStyle(p).zIndex, toastZ: t ? +getComputedStyle(t).zIndex : null, origin: p.dataset.origin } : null,
      icon: (() => { const i = t && t.querySelector('.mt-ic'); if (!i) return null; const r = i.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; })() };
  });
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART + SEED);
  const dLottie = lottieGets(page);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.load = await st(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(700);
  const row = (name) => page.locator('.dl-row', { hasText: name }).first();
  await row('Ant-Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(150);
  out.markSeen = await st(page);
  if (/first-title/.test((out.markSeen.toast || {}).cls || '')) errors.push('a visitor with seen marks got the first title toast');
  out.ring = await page.evaluate(() => { const b = document.querySelector('.tsa-btn.pop'); const w = b && b.parentElement.querySelector('.tsa-btn.watch');
    return b && { z: getComputedStyle(b).zIndex, neighbourZ: getComputedStyle(w).zIndex }; });
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-toast.png') });
  await page.locator('.mt-undo').click(); await page.waitForTimeout(400);
  out.undo = await st(page); out.antManAfterUndo = await row('Ant-Man').locator('.tsa-btn.seen').getAttribute('aria-pressed');
  await row('Shang-Chi').locator('.tsa-btn.seen').click(); await page.waitForTimeout(150);
  out.fromWatchlist = await st(page);
  await page.locator('.mt-undo').click(); await page.waitForTimeout(300);
  out.undoToWatch = await row('Shang-Chi').locator('.tsa-btn.watch').getAttribute('aria-pressed');
  await row('Doctor Strange').locator('.tsa-btn.watch').click(); await page.waitForTimeout(150);
  out.addWatch = await st(page);
  await page.waitForTimeout(5000); out.autoHide = await st(page);
  // milestone: unmark then re-mark The Avengers (all Phase 1 seen in the seed)
  await row('The Avengers').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.unmark = await st(page);
  await row('The Avengers').locator('.tsa-btn.seen').click(); await page.waitForTimeout(250);
  out.milestone = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-milestone.png') });
  await page.waitForTimeout(2600); out.confettiGone = await st(page);
  // drawer open: toast centred left of the drawer
  await row('Thor: Ragnarok').locator('.dl-open').click(); await page.waitForTimeout(700);
  await page.locator('.drawer.open .tsa-btn.seen').click(); await page.waitForTimeout(200);
  out.drawer = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-drawer.png') });
  // A milestone with the details open: the confetti covers only the space left
  // of the drawer, and the toast sits at its centre, between the two bursts.
  await row('The Avengers').locator('.dl-open').click(); await page.waitForTimeout(700);
  await page.locator('.drawer.open .tsa-btn.seen').click(); await page.waitForTimeout(300);
  await page.locator('.drawer.open .tsa-btn.seen').click(); await page.waitForTimeout(150);
  out.drawerConfetti = await page.evaluate(() => {
    const c = document.querySelector('.mcu-confetti'), t = document.querySelector('.mcu-toast'), d = document.querySelector('.drawer.open');
    if (!c || !t || !d) return { canvas: !!c, toast: !!t, drawer: !!d };
    const cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect(), dr = d.getBoundingClientRect();
    const [ox1, ox2, oy] = (c.dataset.origin || '').split(',').map(Number);
    return { renderer: c.dataset.renderer, bursts: c.querySelectorAll('svg').length,
      canvasLeft: Math.round(cr.left), canvasRight: Math.round(cr.right), drawerLeft: Math.round(dr.left),
      canvasCx: Math.round(cr.left + cr.width / 2), toastCx: Math.round(tr.left + tr.width / 2),
      toast: [Math.round(tr.left), Math.round(tr.right), Math.round(tr.top), Math.round(tr.bottom)], origin: [ox1, ox2, oy],
      toastZ: +getComputedStyle(t).zIndex, canvasZ: +getComputedStyle(c).zIndex };
  });
  // ...and the bursts start just inside the toast's two ends, behind it.
  { const dc = out.drawerConfetti;
    if (dc.canvasRight == null || dc.canvasLeft !== 0 || Math.abs(dc.canvasRight - dc.drawerLeft) > 2 || Math.abs(dc.canvasCx - dc.toastCx) > 2)
      errors.push('milestone confetti not aligned with the toast beside the details: ' + JSON.stringify(dc));
    else if (!(dc.origin[0] > dc.toast[0] && dc.origin[0] < dc.toast[0] + 40 && dc.origin[1] < dc.toast[1] && dc.origin[1] > dc.toast[1] - 40
      && dc.origin[2] > dc.toast[2] - 20 && dc.origin[2] < dc.toast[3] + 20 && dc.toastZ > dc.canvasZ))
      errors.push('confetti does not start at the ends of the toast, behind it: ' + JSON.stringify(dc));
    // Unmarking The Avengers left Phase 1 one title short, which fetched the
    // Lottie confetti; by now it has arrived, so this milestone plays it.
    if (dc.renderer !== 'lottie' || dc.bursts !== 2)
      errors.push('milestone did not play the Lottie confetti (two bursts) once it was fetched: ' + JSON.stringify({ renderer: dc.renderer, bursts: dc.bursts, fetched: dLottie })); }
  out.dLottie = dLottie;
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-drawer-confetti.png') });
  // It removes itself when it ends.
  await page.waitForTimeout(2800);
  if (await page.evaluate(() => !!document.querySelector('.mcu-confetti'))) errors.push('the Lottie confetti did not remove itself');
  out.dErrors = errors; await ctx.close();
  // fresh visitor: no badges until the first mark
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART));
  const freshLottie = lottieGets(page);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.fresh = await st(page);
  out.vq = await page.evaluate(() => { const t = window.TITLES.find(x => x.id === 'visionquest'); return { cast: t.cast, paladin: window.CHARACTERS.paladin && window.CHARACTERS.paladin.actor, bnd: window.TITLES.find(x => x.id === 'brand-new-day').imdb, chars: Object.keys(window.CHARACTERS).length, titles: window.TITLES.length }; });
  // Nothing Lottie on the way in: the first-title star pop waits for the
  // visitor's first scroll, tap or key on a screen with Seen buttons.
  out.freshLoadFetched = freshLottie.slice();
  if (freshLottie.length) errors.push('a fresh visit fetched Lottie files before any interaction: ' + freshLottie.join(', '));
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(600);
  await page.mouse.move(700, 500); await page.mouse.wheel(0, 120); await page.waitForTimeout(3500);
  await page.mouse.wheel(0, -120); await page.waitForTimeout(300);
  await row('Iron Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(120);
  out.firstMark = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-first.png'), clip: { x: 900, y: 50, width: 540, height: 80 } });
  // Small win: the first title marked (Notion "Small win: the first title
  // marked"), with the star pop, once.
  await page.waitForTimeout(300);
  out.firstTitle = await halfProbe(page);
  out.firstTitle.cls = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return t && t.className.includes('first-title'); });
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-first-title.png'), clip: { x: 420, y: 640, width: 600, height: 260 } });
  { const f = out.firstTitle;
    if (!f.cls || !/Your first title!/.test(f.toast) || !/Iron Man is marked as seen/.test(f.toast)) errors.push('the first seen mark did not show its toast: ' + JSON.stringify(f));
    else if (!f.pop || f.pop.svg !== 1 || !(f.pop.z > f.pop.toastZ)) errors.push('the first title toast did not play the star pop: ' + JSON.stringify(f)); }
  // Once: Undo, mark again, and it's an ordinary toast; so is a reload and the next one.
  await page.locator('.mt-undo').click(); await page.waitForTimeout(300);
  await row('Iron Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.firstAgain = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return t ? t.className.includes('first-title') : null; });
  await page.reload(); await require('./ready').appReady(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(600);
  await row('The Incredible Hulk').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.firstAfterReload = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return t ? t.className.includes('first-title') : null; });
  if (out.firstAgain !== false || out.firstAfterReload !== false) errors.push('the first title toast showed more than once: ' + JSON.stringify({ again: out.firstAgain, reload: out.firstAfterReload }));
  // Nowhere near a milestone: the confetti itself is never fetched.
  await page.waitForTimeout(1500);
  if (freshLottie.some(u => /milestone/.test(u))) errors.push('a visit far from any milestone fetched the Lottie confetti: ' + freshLottie.join(', '));
  out.freshErrors = errors; await ctx.close();
  // The first title marked and the sign-in reminder (due at 3 marks) never
  // show together: two watchlist titles, then the first seen mark.
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART
    + "localStorage.setItem('mcu.signInNudge.v1', '0'); localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'thor':'watchlist','hawkeye':'watchlist'}}));"));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(600);
  await row('Iron Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(2500);
  out.firstNudge = await page.evaluate(() => ({ first: !!document.querySelector('.mcu-toast.first-title'), nudge: !!document.querySelector('.nudge') }));
  await page.waitForTimeout(6500);
  out.firstNudgeAfter = await page.evaluate(() => ({ first: !!document.querySelector('.mcu-toast.first-title'), nudge: !!document.querySelector('.nudge') }));
  if (!out.firstNudge.first || out.firstNudge.nudge) errors.push('the first title toast and the sign-in reminder showed together: ' + JSON.stringify(out.firstNudge));
  out.firstNudgeErrors = errors; await ctx.close();
  // Small win: halfway through a followed guide (Notion "Small win: halfway
  // through a guide"). Before Doomsday has 12 released essential stops and 5
  // are seen, so the next one is halfway: "Halfway there!" with the star pop,
  // fetched in advance because the visitor is one stop short.
  const HALF_SEEN = ['infinity-war', 'endgame', 'loki-s1', 'shang-chi', 'no-way-home'];
  const halfSeed = (extra) => "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:" + JSON.stringify(Object.fromEntries(HALF_SEEN.map(id => [id, 'seen']))) + "}));"
    + "localStorage.setItem('mcu.guidesFollowed.v1', JSON.stringify([{ id: 'before-doomsday', at: 1 }]));" + (extra || '');
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART + halfSeed()));
  const halfLottie = lottieGets(page);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(3500);
  await row('Doctor Strange in the Multiverse').locator('.tsa-btn.seen').click(); await page.waitForTimeout(450);
  out.halfway = await halfProbe(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-halfway.png'), clip: { x: 420, y: 640, width: 600, height: 260 } });
  { const h = out.halfway;
    if (!h.halfway || !/Halfway there!/.test(h.toast) || !/6 of 12 seen/.test(h.toast))
      errors.push('halfway through a followed guide did not show its toast: ' + JSON.stringify(h));
    else if (!h.pop || h.pop.svg !== 1 || !(h.pop.z > h.pop.toastZ))
      errors.push('the halfway toast did not play the star pop above the toast: ' + JSON.stringify(h));
    else { const [x, y] = h.pop.origin.split(',').map(Number);
      if (Math.abs(x - h.icon[0]) > 8 || Math.abs(y - h.icon[1]) > 16) errors.push('the star pop did not start on the toast icon: ' + JSON.stringify(h)); } }
  if (!halfLottie.some(u => /small-win/.test(u)) || halfLottie.some(u => /milestone/.test(u)))
    errors.push('near halfway, only the star pop should be fetched: ' + halfLottie.join(', '));
  // Undo, mark again: it shows again. One more mark, past halfway: it doesn't.
  await page.locator('.mt-undo').click(); await page.waitForTimeout(300);
  await row('Doctor Strange in the Multiverse').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.halfwayAgain = (await halfProbe(page)).halfway;
  await page.waitForTimeout(1800);
  await row('Black Panther: Wakanda Forever').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.pastHalfway = await halfProbe(page);
  if (!out.halfwayAgain) errors.push('undo and mark again did not show the halfway toast again');
  if (out.pastHalfway.halfway || !/Marked as seen/.test(out.pastHalfway.toast || '')) errors.push('a mark past halfway showed the halfway toast: ' + JSON.stringify(out.pastHalfway));
  out.halfErrors = errors; await ctx.close();
  // Small win: halfway through a phase (Notion "Small win: halfway through a
  // phase"). Phase 1 has 6 titles and 2 are seen, so the third is halfway: the
  // toast with one star pop, and never the confetti with it.
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART
    + "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','incredible-hulk':'seen'}}));"));
  const phaseLottie = lottieGets(page);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(3500);
  await row('Iron Man 2').locator('.tsa-btn.seen').click(); await page.waitForTimeout(450);
  out.phaseHalfway = await halfProbe(page);
  out.phaseHalfway.cls = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return !!(t && t.className.includes('phase-halfway')); });
  out.phaseHalfway.pops = await page.evaluate(() => ({ pops: document.querySelectorAll('.mcu-starpop').length, confetti: !!document.querySelector('.mcu-confetti') }));
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-phasehalf.png'), clip: { x: 420, y: 640, width: 600, height: 260 } });
  { const h = out.phaseHalfway;
    if (!h.cls || !/Halfway through Phase 1!/.test(h.toast) || !/3 of 6 Phase 1 titles seen/.test(h.toast)) errors.push('halfway through a phase did not show its toast: ' + JSON.stringify(h));
    else if (!h.pop || h.pop.svg !== 1 || h.pops.pops !== 1 || h.pops.confetti) errors.push('halfway through a phase did not play exactly one star pop: ' + JSON.stringify(h)); }
  if (!phaseLottie.some(u => /small-win/.test(u))) errors.push('one title short of a phase halfway did not fetch the star pop: ' + phaseLottie.join(', '));
  // Past halfway: an ordinary toast.
  await page.waitForTimeout(1800);
  await row('Thor').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.pastPhaseHalf = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return t ? t.className.includes('small-win') : null; });
  if (out.pastPhaseHalf !== false) errors.push('a mark past a phase halfway showed a small win');
  out.phaseHalfErrors = errors; await ctx.close();
  // Celebrations off: the same mark gets an ordinary toast, and nothing is fetched.
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART + halfSeed("localStorage.setItem('mcu.celebrations.v1', 'off');")));
  const quietLottie = lottieGets(page);
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(3500);
  await row('Doctor Strange in the Multiverse').locator('.tsa-btn.seen').click(); await page.waitForTimeout(400);
  out.halfwayOff = await halfProbe(page);
  if (out.halfwayOff.halfway || out.halfwayOff.pop || quietLottie.length) errors.push('with Celebrations off, halfway still celebrated: ' + JSON.stringify({ p: out.halfwayOff, fetched: quietLottie }));
  out.halfOffErrors = errors; await ctx.close();
  // Small win: up to date with the newest release (Notion "Small win: up to
  // date with the newest release"). On 2026-10-15, VisionQuest (2026-10-13) is
  // the newest release and in its week; the seed has seen marks, so it is not
  // a first title either.
  const upCtx = async (when, init) => {
    const r = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, NOWELCOME + ART + (init || SEED));
    r.fetched = lottieGets(r.page);
    await r.page.clock.setFixedTime(new Date(when));
    await r.page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(r.page);
    return r;
  };
  let upLottie;
  ({ ctx, page, errors, fetched: upLottie } = await upCtx('2026-10-15T15:00:00'));
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(3500);
  await row('VisionQuest').locator('.tsa-btn.seen').click(); await page.waitForTimeout(450);
  out.upToDate = await halfProbe(page);
  out.upToDate.cls = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return !!(t && t.className.includes('up-to-date')); });
  await page.screenshot({ path: path.join(S, 'shots', 'cel-d-uptodate.png'), clip: { x: 420, y: 640, width: 600, height: 260 } });
  { const u = out.upToDate;
    if (!u.cls || !/You're up to date!/.test(u.toast) || !/You've seen VisionQuest, the newest release/.test(u.toast)) errors.push('the newest release in its week did not show its toast: ' + JSON.stringify(u));
    else if (!u.pop || u.pop.svg !== 1 || !(u.pop.z > u.pop.toastZ)) errors.push('the newest release toast did not play the star pop: ' + JSON.stringify(u)); }
  if (!upLottie.some(x => /small-win/.test(x))) errors.push('a release in its week did not fetch the star pop: ' + upLottie.join(', '));
  // Any other title that day: an ordinary toast.
  await page.waitForTimeout(500);
  await row('Wonder Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.notNewest = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return t ? t.className.includes('up-to-date') : null; });
  if (out.notNewest !== false) errors.push('a title that is not the newest release showed the up-to-date toast');
  out.upErrors = errors; await ctx.close();
  // After its week (12 days on): an ordinary toast, and nothing fetched.
  let lateLottie;
  ({ ctx, page, errors, fetched: lateLottie } = await upCtx('2026-10-25T15:00:00'));
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(3500);
  await row('VisionQuest').locator('.tsa-btn.seen').click(); await page.waitForTimeout(300);
  out.upLate = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return t ? t.className.includes('up-to-date') : null; });
  if (out.upLate !== false || lateLottie.some(x => /small-win/.test(x))) errors.push('the newest release celebrated after its week: ' + JSON.stringify({ toast: out.upLate, fetched: lateLottie }));
  out.upLateErrors = errors; await ctx.close();
  // When it is also the last unseen release, the milestone wins.
  // (Every title released by then, from a first visit, seeds a second one.)
  ({ ctx, page, errors } = await upCtx('2026-10-15T15:00:00'));
  const allButVq = await page.evaluate(() => window.TITLES.filter(t => window.MCU_isReleased(t) && t.id !== 'visionquest').map(t => t.id));
  await ctx.close();
  ({ ctx, page, errors } = await upCtx('2026-10-15T15:00:00', "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:" + JSON.stringify(Object.fromEntries(allButVq.map(id => [id, 'seen']))) + "}));"));
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(3500);
  await row('VisionQuest').locator('.tsa-btn.seen').click(); await page.waitForTimeout(350);
  out.upMilestone = await page.evaluate(() => { const t = document.querySelector('.mcu-toast'); return { milestone: !!(t && t.classList.contains('milestone')), upToDate: !!(t && t.className.includes('up-to-date')), pop: !!document.querySelector('.mcu-starpop'), confetti: !!document.querySelector('.mcu-confetti') }; });
  if (!out.upMilestone.milestone || out.upMilestone.upToDate || out.upMilestone.pop || !out.upMilestone.confetti) errors.push('the milestone did not win over the newest release: ' + JSON.stringify(out.upMilestone));
  out.upMilestoneErrors = errors; await ctx.close();
  // ...and on a phone.
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, NOWELCOME + ART + halfSeed()));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  await page.waitForTimeout(3500);
  await page.locator('.m-lrow', { hasText: 'Doctor Strange in the Multiverse' }).first().locator('.tsa-btn.seen').tap(); await page.waitForTimeout(450);
  out.mHalfway = await halfProbe(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-m-halfway.png') });
  if (!out.mHalfway.halfway || !out.mHalfway.pop || out.mHalfway.pop.svg !== 1)
    errors.push('halfway on a phone did not show the toast with the star pop: ' + JSON.stringify(out.mHalfway));
  out.mHalfErrors = errors; await ctx.close();
  // phone
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, NOWELCOME + ART + SEED));
  await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
  out.mLoad = await st(page);
  const mrow = (name) => page.locator('.m-lrow', { hasText: name }).first();
  await mrow('Captain America: The Winter').locator('.tsa-btn.seen').tap(); await page.waitForTimeout(400);
  await mrow('Guardians of the Galaxy').locator('.tsa-btn.seen').tap(); await page.waitForTimeout(150);
  out.mUnmark = await st(page);
  await page.waitForTimeout(200);
  await mrow('Guardians of the Galaxy').locator('.tsa-btn.seen').tap(); await page.waitForTimeout(150);
  out.mList = await st(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cel-m-list.png') });
  // inside the details sheet: the toast stays at the bottom (Andre,
  // 2026-11-26), over the sheet, and its Undo still works
  await page.locator('.m-lrow-open', { hasText: 'Ant-Man' }).first().tap(); await page.waitForTimeout(700);
  await page.locator('.m-sheet .tsa-btn.seen').tap(); await page.waitForTimeout(200);
  out.mSheet = await st(page);
  if (!out.mSheet.toast || out.mSheet.toast.bottom > 120 || out.mSheet.toast.top < 380)
    errors.push('the toast left the bottom while a sheet was open: ' + JSON.stringify(out.mSheet.toast));
  await page.screenshot({ path: path.join(S, 'shots', 'cel-m-sheet.png') });
  await page.locator('.mt-undo').tap(); await page.waitForTimeout(300);
  out.mSheetUndo = await page.locator('.m-sheet .tsa-btn.seen').getAttribute('aria-pressed');
  // A milestone inside a sheet: the toast is at the bottom, and the Lottie
  // burst rises from its ends. Unmarking The Avengers leaves Phase 1 one title
  // short (all of it is seen in the seed), which fetches the Lottie confetti.
  await page.locator('.m-sheet-x').first().tap(); await page.waitForTimeout(500);
  await page.locator('.m-lrow-open', { hasText: 'The Avengers' }).first().tap(); await page.waitForTimeout(700);
  await page.locator('.m-sheet .tsa-btn.seen').tap(); await page.waitForTimeout(4500);
  await page.locator('.m-sheet .tsa-btn.seen').tap(); await page.waitForTimeout(400);
  out.mSheetMilestone = await page.evaluate(() => {
    const c = document.querySelector('.mcu-confetti'), t = document.querySelector('.mcu-toast');
    const [, , oy] = c ? (c.dataset.origin || '').split(',').map(Number) : [];
    const r = t && t.getBoundingClientRect();
    return { renderer: c && c.dataset.renderer, bursts: c ? c.querySelectorAll('svg').length : 0, originY: oy,
      toast: r ? [Math.round(r.top), Math.round(r.bottom)] : null, milestone: !!(t && t.classList.contains('milestone')) };
  });
  await page.screenshot({ path: path.join(S, 'shots', 'cel-m-sheet-milestone.png') });
  { const m = out.mSheetMilestone;
    if (!m.milestone || m.renderer !== 'lottie' || m.bursts !== 2 || !m.toast || m.toast[0] < 380 || !(m.originY > m.toast[0] && m.originY < m.toast[1]))
      errors.push('a milestone in a phone sheet did not burst from the toast at the bottom: ' + JSON.stringify(m)); }
  out.mErrors = errors; await ctx.close();
  console.log(JSON.stringify(out));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); console.log(JSON.stringify(globalThis.__o).slice(0, 3000)); process.exit(1); });
`);
