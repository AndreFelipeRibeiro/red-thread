// supabase-js on demand (Notion "Findability 8"; src/supabase-client.ts and
// index.html's head script). A guest's first load never asks unpkg for it,
// and Sign in fetches it and goes on to Google. A saved session gets it at
// once (preloaded from <head>) and is restored. A CDN that fails leaves the
// app working as a guest, with sync marked unavailable.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8259; // regress/quick give each check its own port
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
const DESKTOP = { viewport: { width: 1440, height: 900 } };

// `seed` runs before the page's own scripts; `cdn` is 'ok' or 'fail'.
async function ctxPage(browser, seed, cdn) {
  const ctx = await browser.newContext(DESKTOP);
  // In a try: after Sign in the page leaves for Google (stopped here), and
  // that error page has no localStorage.
  await ctx.addInitScript("try { localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');" + (seed || '') + " } catch (e) {}");
  const page = await ctx.newPage();
  const errors = [], unpkg = [], supabase = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED') && !/integrity|preload/i.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m) {
      unpkg.push(u);
      if (cdn === 'fail' || !VENDOR[m[1]]) return route.abort();
      return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    }
    // The Supabase project: record what was asked and answer nothing, so no
    // request leaves this machine (sign-in's redirect stops here).
    if (/\.supabase\.co\//.test(u)) { supabase.push(u); return route.abort(); }
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  return { ctx, page, errors, unpkg, supabase };
}

const state = page => page.evaluate(() => ({
  client: !!window.mcuSupabase,
  status: window.MCU_SUPABASE_STATUS,
  early: !!(window.MCU_SUPABASE_JS && window.MCU_SUPABASE_JS.early),
  preload: !!document.querySelector('link[rel="preload"][href*="supabase-js"]'),
  offDot: !!document.querySelector('.acct-off'),
  label: (document.querySelector('.acct-wrap button') || { getAttribute: () => null }).getAttribute('aria-label'),
}));

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // 1. A guest: nothing from unpkg at load; Sign in fetches it, then heads to Google.
  {
    const { ctx, page, errors: e, unpkg, supabase } = await ctxPage(browser, '', 'ok');
    await page.goto(URL); await appReady(page);
    const a = out.guest = { ...(await state(page)), unpkgAtLoad: unpkg.length };
    expect(a.unpkgAtLoad === 0 && !a.client && !a.early && !a.preload, `guest: supabase-js should not load until Sign in: ${JSON.stringify(a)}`);
    expect(a.status && a.status.ok && !a.offDot && a.label === 'Sign in with Google', `guest: sync should be on offer, with Sign in: ${JSON.stringify(a)}`);
    await page.click('.acct-wrap button');
    await page.locator('.acct-pop').getByRole('button', { name: 'Sign in with Google' }).click();
    // The page leaves for Google once the client exists, so judge by the
    // requests: one fetch of supabase-js, then Supabase's Google authorize.
    for (let i = 0; i < 40 && !supabase.some(u => /\/auth\/v1\/authorize/.test(u)); i++) await page.waitForTimeout(250);
    const b = out.guestSignIn = { unpkg: unpkg.length, authorize: supabase.filter(u => /\/auth\/v1\/authorize\?.*provider=google/.test(u)).length };
    expect(b.unpkg === 1, `guest Sign in: supabase-js should load once: ${JSON.stringify(b)}`);
    expect(b.authorize >= 1, `guest Sign in: should go on to Google through Supabase: ${JSON.stringify({ ...b, asked: supabase.slice(0, 3) })}`);
    errors.push(...e.map(x => 'guest: ' + x));
    await ctx.close();
  }
  // 2. A saved session: preloaded from <head>, the client is made at startup
  // and asked for the session (this fake one is not valid, so it ends as
  // signed out, with sync still on offer).
  {
    const seed = "localStorage.setItem('mcu.auth.v1', JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 1, user: { id: 'qa' } }));";
    const { ctx, page, errors: e, unpkg } = await ctxPage(browser, seed, 'ok');
    await page.goto(URL); await appReady(page); await page.waitForTimeout(800);
    const c = out.saved = { ...(await state(page)), unpkg: unpkg.length };
    expect(c.early && c.preload && c.client && c.unpkg >= 1, `saved session: supabase-js should load at once: ${JSON.stringify(c)}`);
    expect(c.status && c.status.ok && !c.offDot, `saved session: sync should stay on offer: ${JSON.stringify(c)}`);
    errors.push(...e.map(x => 'saved: ' + x));
    await ctx.close();
  }
  // 3. A saved session with the CDN down: the app still starts, as a guest,
  // and the account button shows sync is unavailable.
  {
    const seed = "localStorage.setItem('mcu.auth.v1', '{}');";
    const { ctx, page, errors: e } = await ctxPage(browser, seed, 'fail');
    await page.goto(URL); await appReady(page); await page.waitForTimeout(800);
    const d = out.cdnDown = await state(page);
    expect(!d.client && d.status && !d.status.ok && d.offDot, `CDN down: the app should run as a guest with sync marked unavailable: ${JSON.stringify(d)}`);
    errors.push(...e.map(x => 'cdn down: ' + x));
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
