// Keep the highlighted title in view (Notion "Keep the highlighted title in
// view: re-frame the canvas as you step through titles", 2026-11-17):
// - stepping through every title of a character with many (Happy Hogan) keeps
//   each outlined card wholly inside the visible canvas, at 1440x900, at
//   1100 wide and on a phone (390), the details panel and the phone's pill
//   taken off the room;
// - Follow the thread: focusing a row in the panel (keyboard) brings its card
//   into view, for rows at both ends and the middle of the list;
// - Reduce motion: the camera jumps (no transition on the canvas) when it
//   has to move.
// The camera's target is read from the canvas transform, so a glide still in
// flight counts as where it will land.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8243; // regress/quick give each check its own port
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

async function ctxPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');"
    + "localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: {} }));}");
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

// Where a card will sit once the camera lands, against the room it has: the
// viewport less the details panel (desktop) and the phone's pill.
const PLACE = (id) => {
  const cv = document.querySelector('.canvas');
  const t = cv.style.transform.match(/translate(?:3d)?\(([-\d.]+)px, ([-\d.]+)px(?:, [-\d.]+px)?\) scale\(([\d.]+)\)/);
  const [vx, vy, s] = [+t[1], +t[2], +t[3]];
  const c = id ? document.querySelector(`.card[data-id="${id}"]`) : document.querySelector('.card.current');
  if (!c) return { missing: id || 'current' };
  const m = c.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
  const vp = document.querySelector('.viewport').getBoundingClientRect();
  const drawer = document.querySelector('.drawer.open') && innerWidth > 700 ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--drawer-w')) || 380) : 0;
  const pill = document.querySelector('.char-pill');
  const bottom = pill && pill.getBoundingClientRect().height ? pill.getBoundingClientRect().top - vp.top : vp.height;
  const w = c.offsetWidth, h = c.offsetHeight;
  const l = vx + +m[1] * s, tp = vy + +m[2] * s, r = l + w * s, b = tp + h * s;
  return { id: c.dataset.id, inside: l >= -1 && tp >= -1 && r <= vp.width - drawer + 1 && b <= bottom + 1, rect: [l, tp, r, b].map(Math.round), room: [Math.round(vp.width - drawer), Math.round(bottom)], glide: !!cv.style.transition };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- Stepping through Happy Hogan's titles ----------------------------------
  for (const [name, opts, url] of [
    ['desk1440', { viewport: { width: 1440, height: 900 } }, '?title=iron-man-3&char=happy'],
    ['desk1100', { viewport: { width: 1100, height: 800 } }, '?title=iron-man-3&char=happy'],
    ['phone390', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, '?view=spatial&char=happy'],
  ]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts);
    await page.goto(URL + url); await appReady(page); await page.waitForTimeout(1200);
    const steps = [];
    for (let i = 0; i < 12; i++) {
      await page.getByRole('button', { name: 'Next title' }).first().click();
      await page.waitForTimeout(450);
      steps.push(await page.evaluate(PLACE, null));
    }
    out[name] = steps.map(st => `${st.id} ${st.inside ? 'in' : 'OUT'} ${st.rect} room=${st.room}`);
    const off = steps.filter(st => !st.inside);
    expect(!off.length, `${name}: stepping left the outlined card cropped: ${JSON.stringify(off)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Follow the thread: focusing rows ----------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?title=iron-man&explore=thread'); await appReady(page); await page.waitForTimeout(1500);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.ex-row[data-title]')].filter(r => r.getAttribute('aria-current') !== 'true').map(r => r.dataset.title));
    const pick = [rows[rows.length - 1], rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 2]];
    const seen = [];
    for (const id of pick) {
      await page.locator(`.ex-row[data-title="${id}"]`).focus();
      await page.waitForTimeout(500);
      seen.push(await page.evaluate(PLACE, id));
    }
    out.thread = seen.map(st => `${st.id} ${st.inside ? 'in' : 'OUT'} ${st.rect} room=${st.room}`);
    const off = seen.filter(st => !st.inside);
    expect(rows.length > 4 && !off.length, `thread: focusing a row left its card out of view: ${JSON.stringify(off)} (rows ${rows.length})`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Reduce motion: no glide ---------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(URL + '?title=iron-man&explore=thread'); await appReady(page); await page.waitForTimeout(1500);
    const last = await page.evaluate(() => { const r = [...document.querySelectorAll('.ex-row[data-title]')]; return r[r.length - 1].dataset.title; });
    await page.locator(`.ex-row[data-title="${last}"]`).focus();
    await page.waitForTimeout(300);
    const st = await page.evaluate(PLACE, last);
    out.reduced = st;
    expect(st.inside && !st.glide, `reduce motion: the camera should jump to the card: ${JSON.stringify(st)}`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
