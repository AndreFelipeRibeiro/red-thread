// Guide promotion and resuming a guide (V3 Tasks, "Promote guide: Coming
// soon"), with the date fixed by Playwright's clock:
// - a returning visitor is offered one guide: the one leading to a release in
//   the next 60 days (Doomsday on 2026-11-01, the animated series on
//   2026-12-20), once a day until release day and no other guide meanwhile,
//   else the evergreen guide (2027-02-01); other guides once per guide per
//   device; never on a first visit, after a link or for a completed guide;
// - Option C: countdown, numbered covers, the dated tile, Start or Continue;
//   Not now, ×, Escape and phone Back close it; labels never overlap at 320,
//   390 and desktop widths, in English and Portuguese;
// - a finished guide is never offered: titles seen after ready (a session
//   restoring) count, a guide finished while on screen is swapped for the
//   next, the unfinished guide closest to finished comes after the evergreen
//   one; finishing the guide for a release in the next 60 days earns the
//   caught-up moment for that release even with other guides unfinished, and
//   with every guide finished it shows too, however far off the release (or
//   with none); once per release (countdown, confetti, Share; Escape and Back
//   close it);
// - the guide a person opens is reopened on the home page, forgotten when they
//   close it or finish it, and a link in the address wins without forgetting.
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
  // A blank page on the same origin, to seed storage before the app loads.
  if (p === '/qa-blank') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>blank</title>'); }
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const PORT = +process.env.PORT || 8229;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const P320 = { viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true };
const DOOM_ESS = ['endgame', 'shang-chi', 'wakanda-forever', 'quantumania', 'loki-s2', 'cap-brave', 'thunderbolts', 'fantastic-four'];

// Storage as a returning visitor (or a first one), set before the app loads.
// `extra` is raw localStorage to add: { key: value }.
// A first visit has nothing stored (a saved language or collection already
// counts as history), so `returning: false` stores nothing of the app's.
function storage({ returning = true, lang = 'en', seen = [], extra = {} } = {}) {
  if (!returning) return { 'mcu.signInNudge.v1': '2' };
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  return { 'mcu.signInNudge.v1': '2', 'mcu.welcome.v1': 'test', 'mcu.lang.v1': lang, 'mcu.collection.v1': JSON.stringify({ version: 1, states }), ...extra };
}

async function ctxPage(browser, opts, date) {
  const ctx = await browser.newContext(opts);
  // The app offers no promotion to automated browsers; look like a person.
  await ctx.addInitScript("Object.defineProperty(navigator, 'webdriver', { get: () => false });");
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
// Seeds storage once, on a blank page of the same origin, so later reloads
// keep whatever the app writes (unlike an init script, which would reseed).
async function seed(page, set) {
  await page.goto(URL + 'qa-blank');
  await page.evaluate((s) => { localStorage.clear(); Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v)); }, set);
}
const settle = (page) => require('./ready').appReady(page, 2000);
const promoState = (page) => page.evaluate(() => {
  const d = document.querySelector('.gp');
  const box = d && d.closest('[role="dialog"]');
  const lab = box && document.getElementById(box.getAttribute('aria-labelledby'));
  const desc = box && document.getElementById(box.getAttribute('aria-describedby'));
  return d ? {
    guide: lab ? lab.textContent : null,
    countdown: desc ? desc.textContent : null,
    covers: d.querySelectorAll('.gp-st:not(.dest):not(.more)').length,
    more: (d.querySelector('.gp-st.more .gp-p') || {}).textContent || null,
    dest: (d.querySelector('.gp-st.dest .story-sr') || {}).textContent || null,
    go: d.querySelector('.gp-go').textContent,
    meter: !!d.querySelector('.gp-meter'),
    done: d.querySelectorAll('.gp-n.done').length,
    cur: d.querySelectorAll('.gp-n.cur').length,
    stripName: (d.querySelector('.gp-strip') || {}).getAttribute ? d.querySelector('.gp-strip').getAttribute('aria-label') : null,
  } : null;
});
const guideOpen = (page) => page.evaluate(() => {
  const b = document.querySelector('.guide-banner b, .g-pill .gp-name, .g-pill b');
  return { banner: !!document.querySelector('.guide-banner, .g-pill, .g-scroll'), url: new URLSearchParams(location.search).get('guide'), kept: localStorage.getItem('mcu.guide.v1'), name: b ? b.textContent : null };
});
const labelsOverlap = (page) => page.evaluate(() => {
  const labels = [...document.querySelectorAll('.gp .gp-t')];
  const bad = [];
  labels.forEach((a, i) => labels.slice(i + 1).forEach(b => {
    const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
    if (x.right > y.left + 0.5 && x.left < y.right - 0.5 && x.bottom > y.top + 0.5 && x.top < y.bottom - 0.5) bad.push(a.textContent + ' / ' + b.textContent);
  }));
  const lines = labels.map(l => Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)));
  return { bad, maxLines: Math.max(0, ...lines), wide: document.documentElement.scrollWidth > innerWidth };
});

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- Which guide, by date ------------------------------------------------
  for (const [date, want, days] of [['2026-11-01', 'Catch up before Avengers: Doomsday', 47], ['2026-12-20', 'The animated series', 24], ['2027-02-01', 'The Infinity Saga essentials', null]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, date);
    await seed(page, storage());
    await page.goto(URL); await settle(page);
    const p = await promoState(page);
    out['date_' + date] = p;
    expect(p && p.guide === want, `${date}: promoted ${p && p.guide}, expected ${want}`);
    if (days) expect(p && p.countdown && p.countdown.startsWith(days + ' days'), `${date}: countdown "${p && p.countdown}"`);
    else expect(p && !p.dest, `${date}: the evergreen guide has a destination tile`);
    expect(p && p.stripName === 'Stops', `${date}: the strip is not a list named Stops`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Once a day in the lead-up, once per guide after it; Start opens and
  // remembers it; resume; close forgets ---------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-11-01');
    const day = (d) => page.clock.setFixedTime(new Date(d + 'T12:00:00'));
    await seed(page, storage());
    await page.goto(URL); await settle(page);
    let p = await promoState(page);
    expect(p && p.dest && /December 18, in 47 days/.test(p.dest), `doomsday tile reads "${p && p.dest}"`);
    // Eight stops since 2026-11-22: four covers and a "+4" tile, then the date.
    expect(p && p.covers === 4 && p.more === '+4', `doomsday: ${p && p.covers} covers and "${p && p.more}", expected 4 and +4`);
    // Escape closes it (one layer). The same day nothing else is offered.
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    expect(!(await promoState(page)), 'Escape did not close the promotion');
    await page.reload(); await settle(page);
    p = await promoState(page);
    out.sameDay = p && p.guide;
    expect(!p, `same day in the lead-up: promoted ${p && p.guide}, expected nothing`);
    // The next day, Doomsday's guide again (the day's key replaces the old one).
    await day('2026-11-02');
    await page.reload(); await settle(page);
    p = await promoState(page);
    out.nextDay = p && p.guide;
    expect(p && p.guide === 'Catch up before Avengers: Doomsday', `next day in the lead-up: promoted ${p && p.guide}, expected Doomsday's guide`);
    const keys = await page.evaluate(() => localStorage.getItem('mcu.promoted.v1'));
    expect(keys === '["before-doomsday@2026-11-02"]', `promoted memory after two days: ${keys}`);
    await page.locator('.gp-later').click(); await page.waitForTimeout(400);
    // After the lead-up: the evergreen guide, then the other unfinished
    // guides, closest to finished first, each once, then nothing.
    await day('2027-02-01');
    const offered = [];
    const total = await page.evaluate(() => window.GUIDES.length);
    for (let visit = 1; visit <= total + 1; visit++) {
      await page.reload(); await settle(page);
      p = await promoState(page);
      if (!p) break;
      if (visit === 1) expect(p.guide === 'The Infinity Saga essentials', `after the lead-up: promoted ${p.guide}, expected the evergreen guide`);
      expect(offered.indexOf(p.guide) === -1, `visit ${visit}: offered ${p.guide} again`);
      offered.push(p.guide);
      await page.locator('.gp-later').click(); await page.waitForTimeout(400);
    }
    out.offeredInTurn = offered;
    expect(offered.length === total, `offered ${offered.length} of ${total} guides before stopping: ${offered.join(' | ')}`);
    await page.reload(); await settle(page);
    expect(!(await promoState(page)), 'promoted again although every guide was offered');
    await day('2026-11-01');
    // Start from a fresh device: opens the guide, remembers it, reopens it.
    await seed(page, storage());
    await page.goto(URL); await settle(page);
    await page.locator('.gp-go').click(); await page.waitForTimeout(800);
    let g = await guideOpen(page);
    out.started = g;
    expect(g.banner && g.url === 'before-doomsday' && g.kept === 'before-doomsday', `Start: ${JSON.stringify(g)}`);
    await page.goto(URL); await settle(page);
    g = await guideOpen(page);
    out.resumed = g;
    expect(g.banner && g.url === 'before-doomsday', `home page did not reopen the guide: ${JSON.stringify(g)}`);
    expect(!(await promoState(page)), 'a promotion showed over a resumed guide');
    // A link wins, without forgetting.
    await page.goto(URL + '?title=iron-man'); await settle(page);
    g = await guideOpen(page);
    expect(!g.url && g.kept === 'before-doomsday', `?title= link: ${JSON.stringify(g)}`);
    await page.goto(URL + '?guide=spider-man'); await settle(page);
    g = await guideOpen(page);
    expect(g.url === 'spider-man' && g.kept === 'before-doomsday', `?guide= link: ${JSON.stringify(g)}`);
    // Closing the followed guide forgets it.
    await page.goto(URL); await settle(page);
    await page.locator('.guide-banner .cb-close').click(); await page.waitForTimeout(400);
    g = await guideOpen(page);
    expect(!g.kept, `closing did not forget the guide: ${JSON.stringify(g)}`);
    await page.goto(URL); await settle(page);
    g = await guideOpen(page);
    expect(!g.url, `the closed guide came back: ${JSON.stringify(g)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Never on a first visit, after a link, or for a completed guide ------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-11-01');
    await seed(page, storage({ returning: false }));
    await page.goto(URL); await settle(page);
    const first = await page.evaluate(() => ({ welcome: !!document.querySelector('.welcome-pick'), promo: !!document.querySelector('.gp') }));
    expect(first.welcome && !first.promo, `first visit: ${JSON.stringify(first)}`);
    await seed(page, storage());
    await page.goto(URL + '?title=iron-man'); await settle(page);
    expect(!(await promoState(page)), 'promoted on a visit that started from a ?title= link');
    // Doomsday's guide finished, the others not (Andre's account, 2026-11-02):
    // the caught-up moment for Doomsday, once, then the evergreen guide.
    await seed(page, storage({ seen: DOOM_ESS, extra: { 'mcu.celebrations.v1': 'off' } }));
    await page.goto(URL); await settle(page);
    let p = await promoState(page);
    const ready = await page.evaluate(() => {
      const d = document.querySelector('.gp.caught');
      return d && { body: d.querySelector('.gp-b').textContent, share: (d.querySelector('.gp-share') || {}).getAttribute ? d.querySelector('.gp-share').getAttribute('aria-label') : null };
    });
    out.readyMoment = ready;
    expect(ready && ready.body === "You've seen everything you need before Avengers: Doomsday.", `with Doomsday's guide complete: ${JSON.stringify(ready || p)}`);
    expect(ready && ready.share === 'Share that you finished this guide', `ready moment's Share label: ${ready && ready.share}`);
    await page.reload(); await settle(page);
    p = await promoState(page);
    expect(p && p.guide === 'The Infinity Saga essentials', `after the ready moment, promoted ${p && p.guide}`);
    // A completed remembered guide is forgotten rather than reopened.
    await seed(page, storage({ seen: DOOM_ESS, extra: { 'mcu.guide.v1': 'before-doomsday', 'mcu.promoted.v1': '["infinity-saga"]' } }));
    await page.goto(URL); await settle(page);
    const g = await guideOpen(page);
    expect(!g.url && !g.kept, `a completed guide was reopened or kept: ${JSON.stringify(g)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Started guide: checks, the next stop, the meter, Continue ------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, '2026-11-01');
    await seed(page, storage({ seen: ['endgame', 'shang-chi'] }));
    await page.goto(URL); await settle(page);
    const p = await promoState(page);
    out.startedPromo = p;
    expect(p && p.done === 2 && p.cur === 1 && p.meter, `started: ${JSON.stringify(p)}`);
    expect(p && p.go === 'Continue: Wakanda Forever', `started button reads "${p && p.go}"`);
    // Phone Back closes it.
    await page.goBack(); await page.waitForTimeout(600);
    expect(!(await promoState(page)), 'phone Back did not close the promotion');
    errors.push(...e);
    await ctx.close();
  }

  // ---- The last day reads Tomorrow; release day ends it ----------------------
  for (const [date, want] of [['2026-12-17', 'Tomorrow'], ['2026-12-18', null]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, date);
    await seed(page, storage({ extra: { 'mcu.promoted.v1': '["infinity-saga"]' } }));
    await page.goto(URL); await settle(page);
    const p = await promoState(page);
    if (want) expect(p && p.countdown && p.countdown.startsWith(want), `${date}: countdown "${p && p.countdown}"`);
    else expect(!p || p.guide !== 'Catch up before Avengers: Doomsday', `${date}: Doomsday still promoted on release day`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Labels never overlap: 320, 390 and desktop, English and Portuguese --
  for (const [label, opts, lang, date] of [
    ['320-en', P320, 'en', '2026-11-01'], ['390-en', PHONE, 'en', '2026-11-01'], ['390-pt', PHONE, 'pt-BR', '2026-11-01'],
    ['desk-en', DESK, 'en', '2026-11-01'], ['desk-pt', DESK, 'pt-BR', '2026-12-20'], ['320-pt-anim', P320, 'pt-BR', '2026-12-20'],
  ]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts, date);
    await seed(page, storage({ lang }));
    await page.goto(URL); await settle(page);
    const p = await promoState(page);
    const o = await labelsOverlap(page);
    out['labels_' + label] = o;
    expect(!!p, `${label}: no promotion`);
    expect(!o.bad.length, `${label}: cover labels overlap: ${o.bad.join(', ')}`);
    expect(o.maxLines <= (opts === DESK ? 2 : 1), `${label}: a cover label takes ${o.maxLines} lines`);
    expect(!o.wide, `${label}: the page scrolls sideways`);
    if (lang === 'pt-BR' && p) expect(/^Começar o guia$|^Continuar/.test(p.go), `${label}: button reads "${p.go}"`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- A finished guide is never offered (Notion V4 Tasks, "Don't promote a
  // guide that the user has already finished") ---------------------------------
  const guideName = (page, id) => page.evaluate((g) => window.MCU_GUIDE.name(window.MCU_GUIDE.get(g)), id);
  const markSeen = (page, ids) => page.evaluate((list) => list.forEach(id => window.MCU_COLLECTION.setStatus(id, 'seen')), ids);
  const QUIET = { 'mcu.celebrations.v1': 'off' };
  // Seen titles arriving after ready but before the pick (a session restoring,
  // a sync landing): the pick reads them when it fires, not when it started.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-11-01');
    await seed(page, storage({ extra: QUIET }));
    await page.goto(URL); await require('./ready').appReady(page, 0);
    await markSeen(page, DOOM_ESS);
    await page.waitForTimeout(2200);
    const p = await promoState(page);
    out.lateArrival = p && p.guide;
    expect(p && p.guide === "You're all caught up", `titles seen after ready: showed ${p && p.guide}, expected the caught-up moment for Doomsday`);
    errors.push(...e);
    await ctx.close();
  }
  // Finished while it is on screen (signing in, a sync): swapped for the next.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2026-11-01');
    await seed(page, storage({ extra: QUIET }));
    await page.goto(URL); await settle(page);
    let p = await promoState(page);
    expect(p && p.guide === 'Catch up before Avengers: Doomsday', `swap: first promoted ${p && p.guide}`);
    await markSeen(page, DOOM_ESS); await page.waitForTimeout(500);
    p = await promoState(page);
    out.swapped = p && p.guide;
    expect(p && p.guide === "You're all caught up", `finished while shown: now ${p && p.guide}, expected the caught-up moment for Doomsday`);
    errors.push(...e);
    await ctx.close();
  }
  // Nothing coming up and the evergreen guide finished: the unfinished guide
  // closest to finished. With the Infinity Saga's essentials seen, several
  // guides have one stop left (The Avengers, Hulk since Guides 4/4): the
  // promoted one has the fewest left of any unfinished guide.
  {
    const INFINITY_ESS = ['iron-man', 'cap-first-avenger', 'avengers', 'cap-winter-soldier', 'gotg', 'aou', 'civil-war', 'doctor-strange', 'thor-ragnarok', 'black-panther', 'infinity-war', 'endgame'];
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, '2027-02-01');
    await seed(page, storage({ seen: INFINITY_ESS }));
    await page.goto(URL); await settle(page);
    const p = await promoState(page);
    const left = await page.evaluate((name) => {
      const G = window.MCU_GUIDE;
      const st = JSON.parse(localStorage.getItem('mcu.collection.v1') || '{"states":{}}').states;
      const statusOf = (id) => st[id] || 'none';
      const open = G.all().filter(g => !g.evergreen && !G.finished(g, statusOf));
      const got = open.find(g => G.name(g) === name);
      return { min: Math.min(...open.map(g => G.remaining(g, statusOf))), got: got ? G.remaining(got, statusOf) : null };
    }, p && p.guide);
    out.closest = { guide: p && p.guide, ...left };
    expect(p && left.got != null && left.got === left.min, `closest to finished: promoted ${p && p.guide} (${left.got} left), the fewest is ${left.min}`);
    expect(p && p.countdown === 'Guide · picked for you', `closest to finished: band reads "${p && p.countdown}"`);
    errors.push(...e);
    await ctx.close();
  }
  // Every guide finished: the caught-up moment, once per release, with the
  // countdown to Doomsday, confetti and Share; Escape closes it and focus
  // returns; phones close it with Back; Portuguese.
  for (const [label, opts, lang] of [['desk-en', DESK, 'en'], ['phone-pt', PHONE, 'pt-BR']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts, '2026-11-01');
    await seed(page, storage({ lang }));
    await page.goto(URL); await require('./ready').appReady(page, 0);
    const all = await page.evaluate(() => [...new Set(window.GUIDES.flatMap(g => g.stops.filter(s => s.weight === 'essential').map(s => s.id)))]);
    await seed(page, storage({ lang, seen: all }));
    await page.goto(URL); await require('./ready').appReady(page, 0);
    const confetti = await page.waitForSelector('.mcu-confetti', { timeout: 4000 }).then(() => true, () => false);
    await page.waitForTimeout(800);
    const c = await page.evaluate(() => {
      const d = document.querySelector('.gp.caught');
      return d ? {
        h: d.querySelector('.gp-h').textContent, band: d.querySelector('.gp-cd').textContent,
        done: d.querySelectorAll('.gp-n.done').length, covers: d.querySelectorAll('.gp-st:not(.dest):not(.more)').length,
        dest: !!d.querySelector('.gp-st.dest'), share: !!d.querySelector('.gp-share'), key: localStorage.getItem('mcu.promoted.v1'),
        body: d.querySelector('.gp-b').textContent,
      } : null;
    });
    out['caughtUp_' + label] = { ...c, confetti };
    const h = lang === 'en' ? "You're all caught up" : 'Você está em dia';
    expect(c && c.h === h, `${label}: caught-up heading "${c && c.h}"`);
    expect(c && /^47 /.test(c.band), `${label}: caught-up countdown "${c && c.band}"`);
    expect(c && c.covers > 0 && c.done === c.covers && c.dest, `${label}: the featured guide is not shown complete with its destination: ${JSON.stringify(c)}`);
    expect(c && c.share, `${label}: no Share button`);
    expect(c && /caught-up:doomsday/.test(c.key || ''), `${label}: not remembered per release: ${c && c.key}`);
    const body = lang === 'en' ? "You've seen everything you need before Avengers: Doomsday." : 'Você já viu tudo o que precisa antes de Vingadores: Doomsday.';
    expect(c && c.body === body, `${label}: caught-up body "${c && c.body}"`);
    expect(confetti, `${label}: no confetti`);
    if (opts === DESK) {
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    } else {
      await page.goBack(); await page.waitForTimeout(600);
    }
    expect(!(await page.$('.gp.caught')), `${label}: ${opts === DESK ? 'Escape' : 'Back'} did not close the caught-up moment`);
    await page.reload(); await settle(page);
    expect(!(await page.$('.gp')), `${label}: the caught-up moment came back on the next visit`);
    errors.push(...e);
    await ctx.close();
  }

  // Every guide finished with no guide's release in the next 60 days: the
  // caught-up moment still comes, naming the next release, or none.
  // Since Guides 4/4, "Before Secret Wars" dates the next release in 2027; the
  // no-release case is after its date (the last dated release).
  for (const [date, want] of [['2026-10-01', "You've finished every guide. Get ready for Avengers: Doomsday."],
                              ['2027-02-01', "You've finished every guide. Get ready for Avengers: Secret Wars."],
                              ['2028-01-15', "You've finished every guide. We'll have a new one for the next release."]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, date);
    await seed(page, storage());
    await page.goto(URL); await require('./ready').appReady(page, 0);
    const all = await page.evaluate(() => [...new Set(window.GUIDES.flatMap(g => g.stops.filter(s => s.weight === 'essential').map(s => s.id)))]);
    await seed(page, storage({ seen: all, extra: { 'mcu.celebrations.v1': 'off' } }));
    await page.goto(URL); await settle(page);
    const body = await page.evaluate(() => { const b = document.querySelector('.gp.caught .gp-b'); return b && b.textContent; });
    out['allDone_' + date] = body;
    expect(body === want, `every guide finished on ${date}: "${body}"`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- An automated browser is not offered a promotion ----------------------
  {
    const ctx = await browser.newContext(DESK);
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-11-01T12:00:00'));
    await page.route('**/*', route => {
      const u = route.request().url();
      const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
      if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
      if (u.startsWith('http://127.0.0.1')) return route.continue();
      return route.abort();
    });
    await seed(page, storage());
    await page.goto(URL); await settle(page);
    expect(!(await promoState(page)), 'an automated browser (navigator.webdriver) was offered a promotion');
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
