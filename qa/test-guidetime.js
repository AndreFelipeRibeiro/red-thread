// Batch 15's guide additions (Notion "Time to finish", "Avengers: Endgame
// Encore", "Welcome: offer to start the Doomsday guide"):
// - runtimes: a film's in its details ("2 h 6 min"), a season's with its
//   episodes; the Doomsday guide's page says how long is left, rounded to the
//   half hour ("about 14 h 30 min left"), in Portuguese too ("cerca de");
// - the Encore: Endgame's details say "Also available: Encore", its Titles
//   row says "Encore on Disney+", the Doomsday guide recommends the cut, and
//   once Endgame is seen its stop shows the quiet seen line;
// - the welcome on a first visit offers the promoted guide first (one button,
//   "Get ready for …", Notion "Welcome: streamline the first moment"); Start the
//   guide follows it and opens it.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8245; // regress/quick give each check its own port
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
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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

async function ctxPage(browser, opts, { seen = [], lang = 'en', welcome = false } = {}) {
  const ctx = await browser.newContext(opts);
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + (welcome ? "" : "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states })) + ");")
    + "localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1'," + JSON.stringify(lang) + ");}");
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

const text = (sel) => (document.querySelector(sel) || {}).textContent || null;

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const DESK = { viewport: { width: 1440, height: 900 } };

  // ---- Runtimes and the Encore in the details and the Titles row ------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list&title=iron-man'); await appReady(page); await page.waitForTimeout(600);
    out.ironMan = await page.evaluate(text, '.drawer.open .td-runtime');
    expect(out.ironMan === '2 h 6 min', `Iron Man's runtime: ${out.ironMan}`);
    await page.goto(URL + '?view=list&title=loki-s2'); await appReady(page); await page.waitForTimeout(600);
    out.loki = await page.evaluate(text, '.drawer.open .td-runtime');
    expect(/^6 episodes · 5 h \d+ min$/.test(out.loki || ''), `Loki season 2's runtime: ${out.loki}`);
    await page.goto(URL + '?view=list&title=endgame'); await appReady(page); await page.waitForTimeout(600);
    out.encore = await page.evaluate(text, '.drawer.open .td-edition');
    expect(/Also available: Encore \(2026\)/.test(out.encore || '') && /Disney\+/.test(out.encore || ''), `Endgame's Encore line: ${out.encore}`);
    out.row = await page.evaluate(() => { const r = document.querySelector('.dl-row[data-row-id="endgame"]'); return r && r.innerText; });
    expect(/Encore on Disney\+/.test(out.row || ''), `Endgame's row tag: ${out.row}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- The Doomsday guide: time left, the Encore line, the seen note --------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(800);
    out.meter = await page.evaluate(text, '.pgh-count');
    expect(/about \d+ h( 30 min)? left/.test(out.meter || ''), `the guide page's time left: ${out.meter}`);
    out.why = await page.evaluate(() => (document.querySelector('.g-stop[data-row-id="endgame"]') || {}).innerText || '');
    expect(/Encore cut/.test(out.why), `the Endgame stop recommends the Encore: ${out.why}`);
    expect(!/Seen the original/.test(out.why), 'the seen note shows before Endgame is seen');
    errors.push(...e);
    await ctx.close();
  }
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { seen: ['endgame'] });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(800);
    out.seenNote = await page.evaluate(text, '.g-stop[data-row-id="endgame"] .g-seen-note');
    expect(/Seen the original\?/.test(out.seenNote || ''), `the seen note on Endgame: ${out.seenNote}`);
    errors.push(...e);
    await ctx.close();
  }
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { lang: 'pt-BR' });
    await page.goto(URL + '?view=list&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(800);
    out.meterPt = await page.evaluate(text, '.pgh-count');
    expect(/cerca de \d+ h( 30 min)? restantes/.test(out.meterPt || ''), `the guide page's time left in Portuguese: ${out.meterPt}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- The welcome offers the promoted guide --------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { welcome: true });
    await page.goto(URL + '?welcome'); await appReady(page); await page.waitForTimeout(800);
    const w = await page.evaluate(() => ({ q: (document.querySelector('.welcome-guide-q') || {}).textContent || null,
      first: (() => { const b = [...document.querySelectorAll('.welcome-pick button')]; return b.length ? (b[0].classList.contains('welcome-guide-go') ? (() => { const c = b[0].cloneNode(true); c.querySelectorAll('.welcome-guide-art').forEach(n => n.remove()); return c.textContent; })() : b[0].textContent) : null; })() }));
    out.welcome = w;
    expect(!!w.q && /Get ready for Avengers: Doomsday/.test(w.first || '') && /Start the guide/.test(w.first || ''), `the welcome should offer the guide first, as its primary button: ${JSON.stringify(w)}`);
    if (w.q) {
      await page.locator('.welcome-guide-go').click(); await page.waitForTimeout(900);
      const after = await page.evaluate(() => ({ url: (location.search + ((p) => ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] && p[2] ? (location.search ? '&' : '?') + ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] + '=' + p[2] : ({ titles: 'list', guides: 'guides' })[p[1]] && !p[2] ? (location.search ? '&' : '?') + 'view=' + ({ titles: 'list', guides: 'guides' })[p[1]] : '')(location.pathname.split('/'))), followed: window.MCU_GUIDE.followed(), open: !!document.querySelector('.welcome-pick') }));
      out.welcomeStart = after;
      expect(/guide=/.test(after.url) && after.followed.length === 1 && !after.open, `Start the guide should close the welcome, follow and open the guide: ${JSON.stringify(after)}`);
    }
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
