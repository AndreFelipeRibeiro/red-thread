// Keyboard shortcuts (Notion "Keyboard shortcuts for sections, views, sorts
// and status, with a visible shortcut list", 2026-11-18), desktop:
// - 2 opens Titles, 1 Connections, 3 Guides;
// - R sorts by release, R again flips it; I sorts by IMDb;
// - S shows Seen, S again all; ? opens the list of keys, Escape closes it;
// - the Sort menu shows each sort's key;
// - nothing fires while typing in search;
// - Settings → Keyboard shortcuts off: 2 and / do nothing, and the Sort menu
//   drops its keys; D and L too.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8253; // regress/quick give each check its own port
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



const ST = () => ({
  titles: !!document.querySelector('.dl-table'), canvas: !!document.querySelector('.canvas') && !document.querySelector('.dl-table'),
  guides: !!document.querySelector('.g-page'), said: (document.querySelector('.theme-announce') || {}).textContent || '',
  dialog: !!document.querySelector('.keys-dialog'), dark: document.documentElement.classList.contains('dark'),
});
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
  await page.goto(URL + '?view=spatial'); await appReady(page); await page.waitForTimeout(800);
  const key = async (k, wait = 500) => { await page.locator('body').press(k); await page.waitForTimeout(wait); return page.evaluate(ST); };
  out.two = await key('2'); expect(out.two.titles, `2 should open Titles: ${JSON.stringify(out.two)}`);
  out.three = await key('3'); expect(out.three.guides, `3 should open Guides: ${JSON.stringify(out.three)}`);
  out.one = await key('1', 900); expect(out.one.canvas, `1 should open Connections: ${JSON.stringify(out.one)}`);
  await key('2');
  out.i = await key('i'); expect(/IMDb/.test(out.i.said), `I should sort by IMDb: ${out.i.said}`);
  out.r = await key('r'); out.r2 = await key('r');
  expect(/Oldest first/.test(out.r.said) && /Newest first/.test(out.r2.said), `R should sort by release, oldest first, and R again flip it: ${out.r.said} / ${out.r2.said}`);
  out.s = await key('s'); expect(out.s.said === 'Seen', `S should show Seen: ${out.s.said}`);
  out.s2 = await key('s'); expect(out.s2.said === 'All titles', `S again should show all titles: ${out.s2.said}`);
  out.q = await key('Shift+?'); expect(out.q.dialog, `? should open the list of keys`);
  out.esc = await key('Escape'); expect(!out.esc.dialog, `Escape should close the list`);
  // The Sort menu shows the keys.
  await page.locator('button[aria-label^="Sort:"], button[aria-label*="IMDb"]').first().click().catch(() => {});
  await page.waitForTimeout(400);
  out.menuKeys = await page.evaluate(() => [...document.querySelectorAll('.sort-key')].map(k => k.textContent).join(''));
  expect(out.menuKeys.length === 6, `the Sort menu should show six keys: ${out.menuKeys}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Typing in search is typing.
  await page.locator('.search-wrap input').first().click(); await page.keyboard.type('s1'); await page.waitForTimeout(400);
  out.typing = await page.evaluate(ST);
  expect(!out.typing.canvas && !out.typing.guides && out.typing.said === 'All titles' && /s1/.test(await page.locator('.search-wrap input').first().inputValue()), `keys typed in search should not fire: ${JSON.stringify(out.typing)}`);
  await page.locator('.search-wrap input').first().fill(''); await page.locator('body').click({ position: { x: 700, y: 880 } }).catch(() => {});
  // Off in Settings.
  await page.evaluate(() => window.MCU_KEYS.set(false));
  await page.waitForTimeout(200);
  const before = await page.evaluate(ST);
  out.off = await key('1', 700);
  const dark = await key('d');
  expect(!out.off.canvas && out.off.said === before.said && dark.dark === before.dark, `with the keys off, 1 and D should do nothing: ${JSON.stringify({ before, off: out.off, dark })}`);
  await page.locator('body').press('/'); await page.waitForTimeout(200);
  out.slashOff = await page.evaluate(() => document.activeElement && document.activeElement.matches('.search-wrap input'));
  expect(!out.slashOff, `with the keys off, / should not focus search`);
  // The switch itself, in Settings.
  await page.locator('.settings-btn').click(); await page.waitForTimeout(500);
  out.switch = await page.evaluate(() => { const s = document.querySelector('#settings-keys-on'); return s ? s.getAttribute('aria-checked') || String(s.checked) : null; });
  expect(out.switch === 'false', `Settings should show the switch off: ${out.switch}`);
  errors.push(...e);
  await ctx.close();
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
