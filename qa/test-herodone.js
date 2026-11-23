// The Guides page hero in a release's lead-up (Notion "Guides page hero: turn
// green when the guide is complete", 2026-11-21). With the clock fixed:
// - 2026-11-21, Before Doomsday complete and The Infinity Saga followed and in
//   progress: the hero stays on Before Doomsday, green ("Guide complete · Dec
//   18", its done line, a green bar), with no Mark seen; on desktop Doomsday
//   takes the big slot with its date and a Watchlist button that adds and
//   removes it, and the small destination is hidden; on a phone it's the
//   other way round (one row of small posters);
// - release day (2026-12-18): the lead-up is over and the hero moves on;
// - the same day with the guide still in progress: the hero is unchanged
//   (red kicker, no big destination).
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8246; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL = `http://127.0.0.1:${QA_PORT}/?view=guides`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const GUIDE = ['infinity-war', 'endgame', 'loki-s1', 'shang-chi', 'no-way-home', 'multiverse-madness', 'wakanda-forever', 'loki-s2', 'deadpool-3', 'cap-brave', 'thunderbolts', 'fantastic-four'];
const SAGA = ['iron-man', 'cap-first-avenger', 'avengers'];

async function open(browser, opts, { seen, time }) {
  const ctx = await browser.newContext(opts);
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states })) + ");"
    + "localStorage.setItem('mcu.guidesFollowed.v1', " + JSON.stringify(JSON.stringify([{ id: 'infinity-saga', at: 2 }, { id: 'before-doomsday', at: 1 }])) + ");}");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1') ? route.continue() : route.abort()));
  await page.clock.setFixedTime(new Date(time));
  await page.goto(URL);
  await appReady(page);
  return { ctx, page, errors };
}

const read = () => {
  const h = document.querySelector('.g-hero');
  if (!h) return null;
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none';
  const big = h.querySelector('.g-hero-dest');
  const small = h.querySelector('.g-hstop.dest:not(.g-hero-dest)');
  const bar = h.querySelector('.g-hero-bar > span');
  const probe = document.createElement('span'); probe.style.color = 'var(--seen)'; document.body.appendChild(probe);
  const seen = getComputedStyle(probe).color; probe.remove();
  return {
    title: (h.querySelector('.g-hero-title') || {}).textContent,
    kicker: (h.querySelector('.g-hero-kicker') || {}).textContent,
    kickerDone: h.querySelector('.g-hero-kicker').classList.contains('done'),
    blurb: (h.querySelector('.g-hero-blurb') || {}).textContent,
    barSeen: !!bar && getComputedStyle(bar).backgroundColor === seen,
    bigShown: vis(big), smallShown: vis(small),
    markSeen: !!h.querySelector('.g-hstop:not(.g-hero-dest) .g-cta'),
    watch: (h.querySelector('.g-hero-watch') || {}).textContent || null,
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = {};
  try {
    // Desktop, complete in the lead-up.
    {
      const { ctx, page, errors: e } = await open(browser, DESK, { seen: [...GUIDE, ...SAGA], time: '2026-11-21T12:00:00' });
      const r = await page.evaluate(read);
      out.desktop = r;
      if (!r) errors.push('desktop: no hero');
      else {
        if (!/Avengers: Doomsday/.test(r.title)) errors.push('desktop: hero is "' + r.title + '", not the completed Doomsday guide');
        if (r.kicker !== 'Guide complete · Dec 18' || !r.kickerDone) errors.push('desktop: kicker "' + r.kicker + '"');
        if (!/^Ready for Doomsday\. You've seen every essential stop\.$/.test((r.blurb || '').trim())) errors.push('desktop: blurb "' + r.blurb + '"');
        if (!r.barSeen) errors.push('desktop: the bar is not the seen color');
        if (!r.bigShown || r.smallShown) errors.push('desktop: big destination ' + r.bigShown + ', small ' + r.smallShown);
        if (r.markSeen) errors.push('desktop: a Mark seen button is still there');
        if (r.watch !== 'Watchlist') errors.push('desktop: watch button "' + r.watch + '"');
        await page.click('.g-hero-watch');
        const on = await page.evaluate(() => ({ text: document.querySelector('.g-hero-watch').textContent, state: JSON.parse(localStorage.getItem('mcu.collection.v1')).states.doomsday }));
        if (on.text !== 'On Watchlist' || on.state !== 'watchlist') errors.push('desktop: Watchlist did not add Doomsday: ' + JSON.stringify(on));
        await page.click('.g-hero-watch');
        const off = await page.evaluate(() => JSON.parse(localStorage.getItem('mcu.collection.v1')).states.doomsday || 'none');
        if (off !== 'none') errors.push('desktop: Watchlist did not remove Doomsday: ' + off);
      }
      errors.push(...e.map(x => 'desktop console: ' + x));
      await ctx.close();
    }
    // Phone, complete in the lead-up: one row of small posters.
    {
      const { ctx, page, errors: e } = await open(browser, PHONE, { seen: [...GUIDE, ...SAGA], time: '2026-11-21T12:00:00' });
      const r = await page.evaluate(read);
      out.phone = r;
      if (!r || !/Avengers: Doomsday/.test(r.title)) errors.push('phone: hero is not the completed Doomsday guide');
      else {
        if (r.kicker !== 'Guide complete · Dec 18') errors.push('phone: kicker "' + r.kicker + '"');
        if (r.bigShown || !r.smallShown) errors.push('phone: big destination ' + r.bigShown + ', small ' + r.smallShown);
      }
      errors.push(...e.map(x => 'phone console: ' + x));
      await ctx.close();
    }
    // Release day: the lead-up is over, the hero moves on.
    {
      const { ctx, page, errors: e } = await open(browser, DESK, { seen: [...GUIDE, ...SAGA], time: '2026-12-18T12:00:00' });
      const r = await page.evaluate(read);
      out.releaseDay = r && r.title;
      if (r && /Avengers: Doomsday/.test(r.title) && r.kickerDone) errors.push('release day: the completed guide is still the hero');
      errors.push(...e.map(x => 'release day console: ' + x));
      await ctx.close();
    }
    // In progress: unchanged.
    {
      const { ctx, page, errors: e } = await open(browser, DESK, { seen: GUIDE.slice(1), time: '2026-11-21T12:00:00' });
      const r = await page.evaluate(read);
      out.inProgress = r && { title: r.title, kicker: r.kicker, big: r.bigShown };
      if (!r || !/Avengers: Doomsday/.test(r.title)) errors.push('in progress: hero is not the Doomsday guide');
      else if (r.kickerDone || r.bigShown || !r.markSeen) errors.push('in progress: the hero changed: ' + JSON.stringify(out.inProgress));
      errors.push(...e.map(x => 'in progress console: ' + x));
      await ctx.close();
    }
  } catch (e) {
    errors.push('crash: ' + e.message);
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify({ ...out, errors }, null, 1));
  process.exit(errors.length ? 1 : 0);
})();
