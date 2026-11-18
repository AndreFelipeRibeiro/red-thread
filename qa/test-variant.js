// Character-variant scope: a selected character means that one portrayal, so
// the suggestion count, the banner count, the stepper total and the narrowed
// catalog all have to agree (scope decided 2026-10-28).
const QA_PORT = +process.env.PORT || 8201; // regress/quick give each check its own port
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
const reload = async page => { await page.reload(); await settle(page); };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {};
  const { page, errors } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  await go(page);

  const num = s => { const m = /(\d+)/.exec(s || ''); return m ? Number(m[1]) : null; };

  // Type a query, then read the suggestion whose label matches `label`.
  const suggest = async (query, label) => {
    await page.fill('.search-wrap input', '');
    await page.fill('.search-wrap input', query);
    await page.waitForTimeout(700);
    return page.evaluate(l => {
      for (const li of document.querySelectorAll('.ss-item')) {
        const main = li.querySelector('.ss-main');
        if (main && main.textContent.trim() === l) {
          const c = li.querySelector('.ss-count');
          return { found: true, count: c ? c.textContent.trim() : null, sub: (li.querySelector('.ss-sub') || {}).textContent };
        }
      }
      return { found: false, labels: [...document.querySelectorAll('.ss-main')].map(n => n.textContent.trim()) };
    }, label);
  };

  // Pick that suggestion and read what the pinned banner then reports.
  const pick = async (label) => {
    await page.evaluate(l => {
      for (const li of document.querySelectorAll('.ss-item')) {
        const main = li.querySelector('.ss-main');
        if (main && main.textContent.trim() === l) { li.click(); return; }
      }
    }, label);
    await page.waitForTimeout(1400);
    return page.evaluate(() => {
      const b = document.querySelector('.char-card');
      if (!b) return { pinned: false };
      return {
        pinned: b.classList.contains('pinned'),
        who: (b.querySelector('.cb-who b') || {}).textContent,
        sub: (b.querySelector('.cb-sub') || {}).textContent,
        pos: (b.querySelector('.cb-pos') || {}).textContent,
        cards: document.querySelectorAll('.card').length,
      };
    });
  };
  const unpin = async () => { const x = await page.$('.cb-close'); if (x) { await x.click(); await page.waitForTimeout(900); } };

  // 1. A variant: one actor, one portrayal. Tobey Maguire's Peter is in one
  // title, and pinning him must not open Tom Holland's thirteen.
  R.raimiSuggest = await suggest('Raimi', 'Peter Parker (Raimi)');
  R.raimiBanner = await pick('Peter Parker (Raimi)');
  R.raimiAgrees = num(R.raimiSuggest.count) === num(R.raimiBanner.sub)
    && num(R.raimiBanner.sub) === num(R.raimiBanner.pos)
    && num(R.raimiBanner.pos) === R.raimiBanner.cards;
  await unpin();

  // 2. The prime identity is untouched: Tom Holland's Peter keeps his own count.
  R.hollandSuggest = await suggest('Peter Parker', 'Peter Parker');
  R.hollandBanner = await pick('Peter Parker');
  R.hollandAgrees = num(R.hollandSuggest.count) === num(R.hollandBanner.sub)
    && num(R.hollandBanner.sub) === num(R.hollandBanner.pos)
    && num(R.hollandBanner.pos) === R.hollandBanner.cards;
  await unpin();

  // 3. Another variant family, to show this is not Spider-Man only.
  R.carterSuggest = await suggest('Captain Carter', 'Captain Carter');
  R.carterBanner = await pick('Captain Carter');
  R.carterAgrees = num(R.carterSuggest.count) === num(R.carterBanner.sub)
    && num(R.carterBanner.sub) === num(R.carterBanner.pos)
    && num(R.carterBanner.pos) === R.carterBanner.cards;
  await unpin();

  // 4. An actor with several portrayals pins as the performer: their own three
  // roles, named as themselves, and never another actor's variant.
  R.majorsSuggest = await suggest('Jonathan Majors', 'Jonathan Majors');
  R.majorsBanner = await pick('Jonathan Majors');
  R.majorsPinsActor = R.majorsBanner.pinned
    && R.majorsBanner.who === 'Jonathan Majors'
    && num(R.majorsBanner.pos) === 3
    && num(R.majorsBanner.sub) === 3
    && ['Kang the Conqueror', 'He Who Remains', 'Victor Timely'].every(n => R.majorsBanner.sub.indexOf(n) !== -1);

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
