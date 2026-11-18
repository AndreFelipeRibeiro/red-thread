// First-use hints (Notion "First-use hints", 2026-11-18): small bubbles
// whose arrow points at what they're about, once per device.
// - Connections' first visit points at a card; opening one marks it done;
// - a title's ring points at Cast and connections; picking a character marks
//   it done;
// - the character view points at the step arrows; Escape dismisses the hint
//   alone (the character stays pinned);
// - a guide on Connections points at its ×;
// - hints stay away from the welcome, and from a shared link's landing;
// - Show the welcome again resets them; Portuguese; a phone shows the canvas
//   hint above the cards, inside the screen.
// Automated browsers get hints only with localStorage `mcu.hints.qa` = '1'.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8251; // regress/quick give each check its own port
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
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');localStorage.setItem('mcu.hints.qa','1');"
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



const H = () => {
  const h = document.querySelector('.first-hint');
  if (!h || getComputedStyle(h).opacity !== '1') return null;
  const r = h.getBoundingClientRect();
  return { id: h.dataset.hint, text: h.textContent, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
};
const wait = (page) => page.waitForTimeout(1300);

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?view=spatial'); await appReady(page); await wait(page);
    const a = out.canvas = await page.evaluate(H);
    expect(a && a.id === 'canvas' && a.inside, `Connections' first visit should show the canvas hint: ${JSON.stringify(a)}`);
    await page.locator('.card[data-id="iron-man"]').click(); await page.waitForTimeout(1800);
    const b = out.ring = await page.evaluate(H);
    expect(b && b.id === 'ring', `a title's ring should show the cast hint: ${JSON.stringify(b)}`);
    await page.locator('.drawer button', { hasText: 'Tony Stark' }).first().click(); await page.waitForTimeout(1800);
    const c = out.char = await page.evaluate(H);
    expect(c && c.id === 'char', `the character view should show the step hint: ${JSON.stringify(c)}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    const d = out.esc = await page.evaluate(() => ({ hint: !!document.querySelector('.first-hint'), url: location.search, done: JSON.parse(localStorage.getItem('mcu.hints.v1') || '{}') }));
    expect(!d.hint && /char=tony/.test(d.url) && d.done.canvas && d.done.ring && d.done.char, `Escape should dismiss the hint alone, and the three be done: ${JSON.stringify(d)}`);
    await page.reload(); await appReady(page); await wait(page);
    out.afterReload = await page.evaluate(H);
    expect(!out.afterReload, `done hints should not come back: ${JSON.stringify(out.afterReload)}`);
    await page.goto(URL + '?view=spatial&guide=before-doomsday'); await appReady(page); await wait(page);
    const g = out.guide = await page.evaluate(H);
    expect(g && g.id === 'guide', `a guide on Connections should show its hint: ${JSON.stringify(g)}`);
    errors.push(...e);
    await ctx.close();
  }
  {
    // The welcome and a shared link's landing keep the canvas hint away.
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + '?view=spatial&welcome'); await appReady(page); await wait(page);
    out.underWelcome = await page.evaluate(H);
    expect(!out.underWelcome, `no hint over the welcome: ${JSON.stringify(out.underWelcome)}`);
    errors.push(...e);
    await ctx.close();
    const s = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await s.page.goto(URL + '?view=spatial&char=tony'); await appReady(s.page); await wait(s.page);
    const sh = out.sharedChar = await s.page.evaluate(H);
    expect(!sh || sh.id === 'char', `a shared link should not get the canvas hint: ${JSON.stringify(sh)}`);
    errors.push(...s.errors);
    await s.ctx.close();
  }
  {
    // Portuguese, on a phone.
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.addInitScript(() => localStorage.setItem('mcu.lang.v1', 'pt-BR'));
    await page.goto(URL + '?view=spatial'); await appReady(page); await wait(page);
    const m = out.phone = await page.evaluate(H);
    expect(m && m.id === 'canvas' && /Escolha um título/.test(m.text) && m.inside, `the phone should show the canvas hint in Portuguese, inside the screen: ${JSON.stringify(m)}`);
    errors.push(...e);
    await ctx.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
