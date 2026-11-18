// A stepper's dashes jump (Notion "Steppers: tap a dash to jump to that title
// (character and guide cards)", 2026-11-18): on the pinned character's card
// and an open guide's card (desktop top right, the phone's dock), pressing a
// dash steps straight to that title, as ‹ › would: the card names it, its
// dash is outlined, and desktop opens its details.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8255; // regress/quick give each check its own port
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





(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const read = (page, card) => page.evaluate((card) => {
    const c = document.querySelector(card);
    const segs = c ? [...c.querySelectorAll('.w-seg')] : [];
    return { segs: segs.length, cur: segs.findIndex(b => b.querySelector('i.cur')), tip: segs.map(b => b.title),
      pos: c ? (c.querySelector('.cb-pos, .gm-where') || {}).textContent : null,
      title: c ? (c.querySelector('.cc-title, .gm-ntitle') || {}).textContent : null,
      details: (document.querySelector('.drawer.open h2') || {}).textContent || null };
  }, card);

  // Desktop: Tony Stark's card; the fourth dash steps to his fourth title.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?view=spatial&char=tony'); await appReady(page); await page.waitForTimeout(2500);
    const before = await read(page, '.char-card');
    await page.locator('.char-card .w-seg').nth(3).click(); await page.waitForTimeout(900);
    const a = out.deskChar = await read(page, '.char-card');
    expect(before.segs > 5 && a.cur === 3 && /^4 of \d+$/.test(a.pos) && a.title === a.tip[3] && a.details === a.tip[3],
      `desktop character: the fourth dash should step to Tony's fourth title, its details open: ${JSON.stringify({ before, a })}`);
    // Hidden from screen readers and out of the tab order: ‹ › do that job.
    const ax = await page.evaluate(() => [...document.querySelectorAll('.char-card .w-seg')].every(b => b.tabIndex === -1 && b.getAttribute('aria-hidden') === 'true'));
    expect(ax, 'desktop character: the dashes should stay out of the tab order and hidden from screen readers');
    errors.push(...e.map(x => 'desktop character: ' + x));
    await ctx.close();
  }
  // Desktop: Before Doomsday's card; the third dash goes to stop 3.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?view=spatial&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(2500);
    await page.locator('.guide-banner.spatial .w-seg').nth(2).click(); await page.waitForTimeout(900);
    const a = out.deskGuide = await read(page, '.guide-banner.spatial');
    expect(a.cur === 2 && /Stop 3 of \d+/.test(a.pos) && a.title === a.tip[2] && a.details === a.tip[2],
      `desktop guide: the third dash should step to stop 3, its details open: ${JSON.stringify(a)}`);
    errors.push(...e.map(x => 'desktop guide: ' + x));
    await ctx.close();
  }
  // Phones: the guide's dock and the character's card, by tap.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(URL + '?view=spatial&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(2500);
    await page.locator('.g-dock .w-seg').nth(3).tap(); await page.waitForTimeout(900);
    const a = out.phoneGuide = await read(page, '.g-dock');
    expect(a.cur === 3 && /Stop 4 of \d+/.test(a.pos) && a.title === a.tip[3], `phone guide: the fourth dash should step to stop 4: ${JSON.stringify(a)}`);
    await page.goto(URL + '?view=spatial&char=loki'); await appReady(page); await page.waitForTimeout(2500);
    await page.locator('.char-card .w-seg').nth(5).tap(); await page.waitForTimeout(900);
    const b = out.phoneChar = await read(page, '.char-card');
    expect(b.cur === 5 && /^6 of \d+$/.test(b.pos) && b.title === b.tip[5], `phone character: the sixth dash should step to Loki's sixth title: ${JSON.stringify(b)}`);
    // Each dash is at least 16px tall to press, though it draws 4px.
    const h = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.char-card .w-seg')].map(b => b.getBoundingClientRect().height)));
    expect(h >= 16, `phone character: a dash's press area is only ${h}px tall`);
    errors.push(...e.map(x => 'phone: ' + x));
    await ctx.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
