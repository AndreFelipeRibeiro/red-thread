// The guide countdown (Notion "Guides: a live countdown to the release
// (rolling numbers), kept after the guide is complete"; src/app/countdown.tsx),
// with Playwright's clock frozen or stepped:
// - the Guides hero and the guide header count to the release at local
//   midnight ("28d 12h 00m 00s" at noon on 2026-11-19 for Doomsday), and the
//   kickers no longer say "29 days to go";
// - the seconds are brand-text while the guide is in progress, seen-text once
//   it is complete (the eyebrow reads "Guide complete" and the ticker stays);
// - the last day drops the days, release day reads "In theaters today", and
//   the day after the ticker is gone;
// - screen readers get one line that changes by the day, never the digits;
// - Portuguese: "min", the phone label "Até Vingadores: Doutor Destino · 17 de dez.",
//   counting to Brazil's release day, a day earlier (Notion "Findability 6")
//   and "Mark 1 more seen" in the phone actions row (not under the progress);
// - only a changed digit rolls, and Reduce motion changes it in place;
// - desktop: beside See connections while it fits (no overflow at 1100 in
//   Portuguese), under the buttons with no divider when it doesn't.
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
  if (p === '/qa-blank') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>blank</title>'); }
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
const DOOM = ['infinity-war', 'endgame', 'loki-s1', 'shang-chi', 'no-way-home', 'multiverse-madness', 'wakanda-forever', 'loki-s2', 'deadpool-3', 'cap-brave', 'thunderbolts', 'fantastic-four'];
const GUIDE = URL + '?view=guides&guide=before-doomsday';

const errors = [];
const out = {};
const expect = (ok, msg) => { if (!ok) errors.push(msg); };

function storage({ lang = 'en', seen = DOOM.slice(0, -1), extra = {} } = {}) {
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  return {
    'mcu.signInNudge.v1': '2', 'mcu.welcome.v1': 'test', 'mcu.lang.v1': lang,
    'mcu.collection.v1': JSON.stringify({ version: 1, states }),
    'mcu.guidesFollowed.v1': JSON.stringify([{ id: 'before-doomsday', at: 1 }]),
    ...extra,
  };
}

// `time`: a fixed moment (setFixedTime), or { install } to step the clock.
async function open(browser, opts, set, time, url, { reduce = false } = {}) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  if (time.install) await page.clock.install({ time: new Date(time.install) });
  else await page.clock.setFixedTime(new Date(time));
  await page.route('**/*', route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  await page.goto(URL + 'qa-blank');
  await page.evaluate((s) => { localStorage.clear(); Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v)); }, set);
  await page.goto(url);
  await require('./ready').appReady(page, 2000);
  await page.waitForTimeout(400);
  return { ctx, page };
}

// What a ticker shows: the face without the rolled-out digits, its moment,
// the screen-reader line, the label, and the accent's color.
const TICKER = (sel) => {
  const t = document.querySelector(sel);
  if (!t) return null;
  const parts = [...t.querySelectorAll('.g-ticker-part')];
  const clean = (e) => { const c = e.cloneNode(true); c.querySelectorAll('.g-ticker-old').forEach(o => o.remove()); return c.textContent; };
  const face = parts.length ? parts.map(clean).join(' ') : clean(t.querySelector('.g-ticker-face'));
  const last = parts.length ? parts[parts.length - 1].firstElementChild : t.querySelector('.g-ticker-today');
  const probe = (v) => { const s = document.createElement('span'); s.style.color = `var(${v})`; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
  const r = t.getBoundingClientRect();
  return {
    face: face.trim(),
    moment: t.dataset.moment,
    sr: (t.querySelector('.g-ticker-sr') || {}).textContent || null,
    srHidden: t.querySelector('.g-ticker-face').getAttribute('aria-hidden') === 'true',
    label: (t.querySelector('.g-ticker-label') || {}).textContent || null,
    accent: last ? getComputedStyle(last).color : null,
    brand: probe('--brand-text'), seenText: probe('--seen-text'),
    visible: r.width > 0 && r.height > 0,
  };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const NOON = '2026-11-19T12:00:00';

  // ---- Desktop, in progress: the hero and the header ------------------------
  {
    const { ctx, page } = await open(browser, DESK, storage(), NOON, URL + '?view=guides');
    out.hero = await page.evaluate(TICKER, '.g-hero .g-ticker');
    out.heroKicker = await page.evaluate(() => (document.querySelector('.g-hero-kicker') || {}).textContent || null);
    const h = out.hero;
    expect(h && h.visible, 'no countdown in the Guides hero');
    if (h) {
      expect(h.face === '28d 12h 00m 00s', `hero countdown reads "${h.face}" at noon, 29 days out`);
      expect(h.sr === '29 days until Avengers: Doomsday', `hero screen-reader line "${h.sr}"`);
      expect(h.srHidden, 'the hero digits are not hidden from screen readers');
      expect(h.accent === h.brand, `in progress, the seconds are ${h.accent}, not brand-text ${h.brand}`);
    }
    expect(out.heroKicker && !/days? to go/i.test(out.heroKicker) && /Dec 18/.test(out.heroKicker), `hero kicker "${out.heroKicker}"`);
    expect(await page.evaluate(() => !!document.querySelector('.g-hero .g-hero-act .g-ticker-div')), 'no divider between About this guide and the countdown');

    await page.goto(GUIDE); await require('./ready').appReady(page, 2000); await page.waitForTimeout(400);
    out.head = await page.evaluate(TICKER, '.g-actions .g-ticker');
    out.headRow = await page.evaluate(() => {
      const a = document.querySelector('.g-actions');
      return {
        kind: (document.querySelector('.g-kind') || {}).textContent || null, fit: a && a.dataset.fit,
        divider: !!(a && a.querySelector('.g-ticker-div') && a.querySelector('.g-ticker-div').getClientRects().length),
        bulkInMeter: !!document.querySelector('.g-meter .pgh-action'), bulkInActions: !!document.querySelector('.g-actions .pgh-action'),
      };
    });
    expect(out.head && out.head.visible, 'no countdown in the desktop guide header');
    if (out.head) expect(out.head.face === '28d 12h 00m 00s', `header countdown reads "${out.head.face}"`);
    expect(out.headRow.kind === 'Event guide · Dec 18', `the eyebrow reads "${out.headRow.kind}"`);
    expect(out.headRow.fit === '0' && out.headRow.divider, `at 1440 the countdown should sit beside the buttons behind a divider: ${JSON.stringify(out.headRow)}`);
    expect(out.headRow.bulkInMeter && !out.headRow.bulkInActions, 'desktop keeps "Mark 1 more seen" in the meter row');
    await ctx.close();
  }

  // ---- Complete: green seconds, the eyebrow, the ticker stays ---------------
  {
    const { ctx, page } = await open(browser, DESK, storage({ seen: DOOM }), NOON, GUIDE);
    out.done = await page.evaluate(TICKER, '.g-actions .g-ticker');
    out.doneKind = await page.evaluate(() => (document.querySelector('.g-kind') || {}).textContent || null);
    expect(out.done && out.done.visible, 'the countdown is gone once the guide is complete');
    if (out.done) expect(out.done.accent === out.done.seenText, `complete, the seconds are ${out.done.accent}, not seen-text ${out.done.seenText}`);
    expect(out.doneKind === 'Guide complete', `complete eyebrow "${out.doneKind}"`);
    await ctx.close();
  }

  // ---- The last day, release day, the day after ------------------------------
  for (const [name, time, want] of [
    ['last day', '2026-12-17T20:00:00', { face: '04h 00m 00s', sr: 'Avengers: Doomsday comes out tomorrow', moment: 'count' }],
    ['release day', '2026-12-18T10:00:00', { face: 'In theaters today', sr: 'Avengers: Doomsday is in theaters today', moment: 'today' }],
    ['the day after', '2026-12-19T10:00:00', null],
  ]) {
    const { ctx, page } = await open(browser, DESK, storage(), time, GUIDE);
    const t = await page.evaluate(TICKER, '.g-actions .g-ticker');
    out[name] = t;
    if (!want) expect(!t, `${name}: the countdown is still there (${t && t.face})`);
    else {
      expect(t, `${name}: no countdown`);
      if (t) {
        expect(t.face === want.face, `${name}: reads "${t.face}", expected "${want.face}"`);
        expect(t.sr === want.sr, `${name}: screen-reader line "${t.sr}"`);
        expect(t.moment === want.moment, `${name}: moment ${t.moment}`);
      }
    }
    await ctx.close();
  }

  // ---- Portuguese phone: units, label, the bulk action in the actions row ---
  {
    const { ctx, page } = await open(browser, PHONE, storage({ lang: 'pt-BR' }), NOON, GUIDE);
    out.ptPhone = await page.evaluate(TICKER, '.g-head .g-ticker');
    out.ptPhoneRow = await page.evaluate(() => {
      const meter = document.querySelector('.g-meter'), t = document.querySelector('.g-head .g-ticker'), acts = document.querySelector('.g-actions');
      const b = document.querySelector('.g-actions .pgh-action'), f = document.querySelector('.g-actions .g-following');
      return {
        bulkInMeter: !!document.querySelector('.g-meter .pgh-action'), bulk: b ? b.textContent.trim() : null,
        bulkH: b ? Math.round(b.getBoundingClientRect().height) : null, followH: f ? Math.round(f.getBoundingClientRect().height) : null,
        order: meter && t && acts ? (meter.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 1 && t.getBoundingClientRect().bottom <= acts.getBoundingClientRect().top + 1) : false,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const p = out.ptPhone;
    expect(p && p.visible, 'no countdown in the Portuguese phone header');
    if (p) {
      expect(p.face === '27d 12h 00min 00s', `Portuguese countdown reads "${p.face}"`);
      expect(p.label === 'Até Vingadores: Doutor Destino · 17 de dez.', `phone label "${p.label}"`);
      expect(p.sr === 'Faltam 28 dias para Vingadores: Doutor Destino', `Portuguese screen-reader line "${p.sr}"`);
    }
    const r = out.ptPhoneRow;
    expect(!r.bulkInMeter && r.bulk === 'Marcar mais 1 como visto', `phone "Mark 1 more seen" belongs in the actions row: ${JSON.stringify(r)}`);
    expect(r.bulkH === r.followH, `the phone bulk action is ${r.bulkH}px tall, the Follow button ${r.followH}px`);
    expect(r.order, 'phone order should be progress, countdown, actions');
    expect(!r.overflow, 'the Portuguese phone guide page scrolls sideways');
    await page.goto(URL + '?view=guides'); await require('./ready').appReady(page, 2000); await page.waitForTimeout(400);
    out.ptHero = await page.evaluate(() => {
      const ts = [...document.querySelectorAll('.g-hero .g-ticker')].filter(t => t.getClientRects().length);
      return { shown: ts.length, kicker: (document.querySelector('.g-hero-kicker') || {}).textContent || null };
    });
    expect(out.ptHero.shown === 1, `the phone hero shows ${out.ptHero.shown} countdowns`);
    expect(out.ptHero.kicker && !/faltam/i.test(out.ptHero.kicker), `Portuguese hero kicker "${out.ptHero.kicker}"`);
    await ctx.close();
  }

  // ---- Motion: a changed digit rolls; Reduce motion changes it in place -----
  for (const reduce of [false, true]) {
    const { ctx, page } = await open(browser, DESK, storage(), { install: NOON }, GUIDE, { reduce });
    const before = await page.evaluate(TICKER, '.g-actions .g-ticker');
    await page.clock.runFor(1500);
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => {
      const t = document.querySelector('.g-actions .g-ticker');
      const anim = [...t.querySelectorAll('*')].filter(e => getComputedStyle(e).animationName !== 'none').map(e => getComputedStyle(e).animationName);
      return { anim };
    });
    const now = await page.evaluate(TICKER, '.g-actions .g-ticker');
    out['motion' + (reduce ? 'Reduced' : '')] = { before: before && before.face, now: now && now.face, anim: after.anim };
    expect(before && now && before.face !== now.face, `the countdown did not tick (${before && before.face} → ${now && now.face})`);
    if (reduce) expect(!after.anim.length, `Reduce motion: digits still animate (${after.anim.join(', ')})`);
    else {
      expect(after.anim.some(a => a === 'ticker-in'), `no roll when a digit changes (${after.anim.join(', ') || 'no animation'})`);
      expect(after.anim.filter(a => a === 'ticker-in').length <= 2, `more than the changed digits roll (${after.anim.length})`);
    }
    await ctx.close();
  }

  // ---- Fit: 1100 in Portuguese fits; Large text moves it under the buttons --
  for (const [name, extra] of [['pt 1100', {}], ['pt 1100 large', { 'mcu.textSize.v1': 'large' }]]) {
    const { ctx, page } = await open(browser, { viewport: { width: 1100, height: 860 } }, storage({ lang: 'pt-BR', extra }), NOON, GUIDE);
    const f = await page.evaluate(() => {
      const a = document.querySelector('.g-actions'), t = a && a.querySelector('.g-ticker'), div = a && a.querySelector('.g-ticker-div');
      const ar = a.getBoundingClientRect();
      const over = [...a.children].some(c => c.getClientRects().length && c.getBoundingClientRect().right > ar.right + 1);
      const btn = a.querySelector('.g-connections, .g-following');
      return {
        fit: a.dataset.fit, over, divider: !!(div && div.getClientRects().length),
        under: !!(t && btn && t.getBoundingClientRect().top >= btn.getBoundingClientRect().bottom - 1),
      };
    });
    out[name] = f;
    expect(!f.over, `${name}: the countdown runs past the header column`);
    if (f.fit === '1') expect(f.under && !f.divider, `${name}: wrapped, but the countdown is not under the buttons without a divider (${JSON.stringify(f)})`);
    else expect(!f.under && f.divider, `${name}: beside the buttons, but ${JSON.stringify(f)}`);
    if (name === 'pt 1100') expect(f.fit === '0', 'at 1100 in Portuguese the countdown should still fit beside the buttons');
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
