// Full pass: picking ANY actor or character from the search suggestions has to
// open the pinned widget, with a count that matches the catalogue. Every
// character and every actor is exercised, not a sample.
const QA_PORT = +process.env.PORT || 8204; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
// data.js moved into the bundle (src/data/data.js) in Phase 2, so it is no
// longer a file in the served site. Expectations come from the source tree,
// which is where they belong: they describe the catalog, not the build.
const { loadCatalog } = require('./load-catalog');
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
const reload = async page => { await page.reload(); await settle(page); };

// Expectations come from the catalog source, the same one the app loads.
const data = loadCatalog();
const { TITLES, CHARACTERS } = data;
const exact = {};
TITLES.forEach(t => t.cast.forEach(c => { (exact[c] = exact[c] || new Set()).add(t.id); }));
const chars = Object.keys(CHARACTERS).filter(id => exact[id]);
// What pinning a character lights: its whole identity thread, so Captain
// Carter takes in Peggy Carter's titles (decided 2026-11-01, docs/decisions.md;
// it replaced the exact-portrayal rule this check was written for).
const primeOf = id => (CHARACTERS[id] && CHARACTERS[id].prime) || id;
const ident = {};
TITLES.forEach(t => t.cast.forEach(c => { const p = primeOf(c); (ident[p] = ident[p] || new Set()).add(t.id); }));
const identOf = id => ident[primeOf(id)];
// Performers are resolved per title, because a part can change hands: Rhodes is
// Terrence Howard in Iron Man and Don Cheadle after it, so each name gets the
// titles they were actually credited in.
const byActor = {}, actorTitles = {};
TITLES.forEach(t => t.cast.forEach(id => {
  if (!CHARACTERS[id]) return;
  const name = data.MCU_credit(t, id);
  (byActor[name] = byActor[name] || []);
  if (byActor[name].indexOf(id) === -1) byActor[name].push(id);
  (actorTitles[name] = actorTitles[name] || new Set()).add(t.id);
}));

// Who carries most of each character's run, which is the row a character
// search offers first and therefore the one this check clicks.
const topOf = {};
const tallyOf = {};
Object.keys(exact).forEach(id => {
  const tally = {};
  TITLES.forEach(t => { if (t.cast.indexOf(id) !== -1) { const n = data.MCU_credit(t, id); tally[n] = (tally[n] || 0) + 1; } });
  topOf[id] = Object.keys(tally).sort((x, y) => tally[y] - tally[x] || x.localeCompare(y))[0];
  tallyOf[id] = tally;
});
const performersOf = id => new Set(TITLES.filter(t => t.cast.indexOf(id) !== -1).map(t => data.MCU_credit(t, id))).size;

// `starts` is the difference the recast rule makes. A pick that lands on a
// particular performer opens the stepper ON their first title, so `.cb-pos`
// reads "1 of 9"; a pick with no such title stays idle and reads "9 titles".
// Both are correct, so only the idle case has one exact right answer.
// Two different numbers, since the banner names ONE performer: `expect` is the
// stepper's total (the whole chain, "n of expect") and `count` is the figure
// beside the name in the subtitle, which is that performer's own share. For a
// character with a single performer the two are equal.
const subjects = []
  .concat(chars.map(id => ({
    kind: 'character', label: CHARACTERS[id].name, expect: identOf(id).size,
    // A part several people played names one of them and gives their share;
    // a part with one performer gives the titles lit, the whole identity.
    count: performersOf(id) > 1 ? tallyOf[id][topOf[id]] : identOf(id).size,
    who: CHARACTERS[id].name, sub: [topOf[id]],
    starts: performersOf(id) > 1,
  })))
  .concat(Object.keys(byActor).map(a => {
    const s = actorTitles[a];
    const plays = byActor[a].length;
    const only = byActor[a][0];
    // A performer of ONE character pins that character and keeps the whole run,
    // recast or not — Rhodes is Rhodes whoever is playing him. Someone who
    // plays several characters is still named as themselves.
    const single = plays === 1;
    return {
      kind: 'actor', label: a, plays,
      expect: single ? identOf(only).size : s.size,
      // The subtitle counts this performer's own titles; the stepper keeps the
      // whole chain, so a recast performer reads "1 title" beside "6 of 8".
      // Sole performer of a part: the part's whole identity, as above.
      count: single && performersOf(only) === 1 ? identOf(only).size : s.size,
      who: single ? CHARACTERS[only].name : a,
      sub: single ? [a] : byActor[a].map(id => CHARACTERS[id].name),
      starts: single && s.size < identOf(only).size,
    };
  }));

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = { checked: 0, characters: chars.length, actors: Object.keys(byActor).length };
  const { page, errors } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  await go(page);

  const noSuggestion = [], noWidget = [], wrongCount = [];
  for (const s of subjects) {
    // Stop at the first page error rather than reporting it 160 times over.
    if (errors.length) { R.stoppedAfter = R.checked; break; }
    if (!(await page.$('.search-wrap input'))) { R.stoppedAfter = R.checked; R.searchGone = true; break; }
    try {
      await page.fill('.search-wrap input', '', { timeout: 5000 });
      await page.fill('.search-wrap input', s.label, { timeout: 5000 });
    } catch (e) {
      R.stoppedAfter = R.checked;
      R.fillFailed = s.kind + ': ' + s.label;
      break;
    }
    try {
      await page.waitForFunction(
        ([l, k]) => [...document.querySelectorAll(`.ss-item[data-kind="${k}"] .ss-main`)].some(n => n.textContent.trim() === l),
        [s.label, s.kind], { timeout: 4000 });
    } catch (e) { noSuggestion.push(s.kind + ': ' + s.label); continue; }

    // The person's own row: a character guide can share the name (Thor).
    await page.evaluate(([l, k]) => {
      for (const li of document.querySelectorAll(`.ss-item[data-kind="${k}"]`)) {
        const m = li.querySelector('.ss-main');
        if (m && m.textContent.trim() === l) { li.click(); return; }
      }
    }, [s.label, s.kind]);

    let got = null;
    try {
      await page.waitForFunction(() => !!document.querySelector('.char-banner.pinned'), null, { timeout: 4000 });
      got = await page.evaluate(() => {
        const b = document.querySelector('.char-banner.pinned');
        const num = t => { const m = /(\d+)/.exec(t || ''); return m ? Number(m[1]) : null; };
        return {
          who: (b.querySelector('.cb-who b') || {}).textContent,
          sub: (b.querySelector('.cb-sub') || {}).textContent,
          count: num((b.querySelector('.cb-sub') || {}).textContent),
          step: num((b.querySelector('.cb-pos') || {}).textContent),
        };
      });
    } catch (e) {
      noWidget.push(s.kind + ': ' + s.label + (s.plays > 1 ? ' (plays ' + s.plays + ')' : ''));
      // No widget means the pick fell through to a text search, which leaves a
      // chip in the toolbar: clear it so the next subject starts clean.
      const chip = await page.$('.chip-clear, .ctx-chip button, [class*="chip"] button');
      if (chip) { await chip.click().catch(() => {}); }
      await page.keyboard.press('Escape').catch(() => {});
      await page.fill('.search-wrap input', '', { timeout: 5000 }).catch(() => {});
      continue;
    }

    R.checked += 1;
    // A pick that opens on a title leaves that title's details open, and the
    // next pin would then start from it (pinSubject falls back to drawerId).
    // Close it so every subject is judged on its own pick, not on leftovers.
    await page.evaluate(() => {
      const close = document.querySelector('.drawer-close');
      if (close) close.click();
    }).catch(() => {});
    await page.waitForTimeout(150);

    const subOk = !s.sub || s.sub.every(nm => (got.sub || '').indexOf(nm) !== -1);
    const stepOk = s.starts
      ? (got.step >= 1 && got.step <= s.expect)
      : got.step === s.expect;
    if (got.count !== s.count || !stepOk || got.who !== s.who || !subOk) {
      wrongCount.push(s.kind + ': ' + s.label + ' expected count=' + s.count + ' of chain ' + s.expect + '/' + JSON.stringify(s.who) +
        ' got count=' + got.count + ' step=' + got.step + ' who=' + JSON.stringify(got.who) +
        (subOk ? '' : ' sub=' + JSON.stringify(got.sub)));
    }
    const x = await page.$('.cb-close');
    if (x) await x.click();
    await page.waitForTimeout(120);
  }

  R.noSuggestion = noSuggestion;
  R.noWidget = noWidget;
  R.wrongCount = wrongCount;
  // One combined list, so the regression run sees a single pass/fail field.
  R.errors = errors.concat(noSuggestion.map(x => 'no suggestion ' + x))
    .concat(noWidget.map(x => 'no widget ' + x))
    .concat(wrongCount.map(x => 'wrong ' + x));
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
