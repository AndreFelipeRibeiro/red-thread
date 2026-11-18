// Vercel Web Analytics (Notion "Analytics: Vercel Web Analytics on
// production", 2026-11-18; src/analytics.ts): nothing loads off production,
// and on redthread.tv each page view keeps only where a visit landed (an open
// guide, the view, a post's `ref`), dropping a repeat of the same address.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8257; // regress/quick give each check its own port
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

const window_hits = [];
async function ctxPage(browser, opts) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');"
    + "localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: {} }));}");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', async route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    // Production's address, served from this check's own server; the
    // analytics script is a stub, so nothing is sent anywhere.
    if (u.startsWith('https://redthread.tv/_vercel/insights/')) { window_hits.push(u); return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); }
    if (u.startsWith('https://redthread.tv/')) {
      const r = await route.fetch({ url: u.replace('https://redthread.tv/', URL) });
      return route.fulfill({ response: r });
    }
    return route.abort();
  });
  return { ctx, page, errors };
}





(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // Anywhere but production: no analytics script, nothing queued.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    const asked = [];
    page.on('request', r => { if (/_vercel\/insights|vercel-scripts/.test(r.url())) asked.push(r.url()); });
    await page.goto(URL + '?guide=before-doomsday'); await appReady(page); await page.waitForTimeout(800);
    const a = out.local = await page.evaluate(() => ({ queued: (window.vaq || []).length, script: !!document.querySelector('script[src*="insights"]') }));
    expect(!asked.length && !a.queued && !a.script, `off production, analytics should load nothing: ${JSON.stringify({ asked, ...a })}`);
    errors.push(...e.map(x => 'local: ' + x));
    await ctx.close();
  }
  // Production (redthread.tv, served here): the script loads from our own
  // domain, and page views keep only guide, view and ref, once each.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto('https://redthread.tv/?title=iron-man&guide=before-doomsday&ref=linkedin'); await appReady(page); await page.waitForTimeout(800);
    const b = out.prod = await page.evaluate(() => {
      const q = (window.vaq || []).find(x => x[0] === 'beforeSend');
      if (!q) return { hook: false };
      const send = q[1];
      const r1 = send({ type: 'pageview', url: 'https://redthread.tv/?title=iron-man&char=tony&guide=before-doomsday&ref=linkedin#top' });
      const r2 = send({ type: 'pageview', url: 'https://redthread.tv/?title=thor&guide=before-doomsday&ref=linkedin' });
      const r3 = send({ type: 'pageview', url: 'https://redthread.tv/?view=list' });
      const r4 = send({ type: 'event', url: 'https://redthread.tv/?view=list&title=thor' });
      return { hook: true, script: !!document.querySelector('script[src="/_vercel/insights/script.js"]'),
        r1: r1 && r1.url, r2, r3: r3 && r3.url, r4: r4 && r4.url };
    });
    expect(b.hook && b.script, `production: the analytics script and its beforeSend should be set up: ${JSON.stringify(b)}`);
    expect(b.r1 === 'https://redthread.tv/?guide=before-doomsday&ref=linkedin', `production: a page view should keep only guide and ref: ${b.r1}`);
    expect(b.r2 === null, `production: a second view of the same kept address should be dropped: ${JSON.stringify(b.r2)}`);
    expect(b.r3 === 'https://redthread.tv/?view=list' && b.r4 === 'https://redthread.tv/?view=list', `production: view is kept, title dropped: ${JSON.stringify(b)}`);
    out.scriptHits = window_hits.length;
    expect(window_hits.length >= 1, 'production: the script was never requested from /_vercel/insights/');
    errors.push(...e.map(x => 'production: ' + x));
    await ctx.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
