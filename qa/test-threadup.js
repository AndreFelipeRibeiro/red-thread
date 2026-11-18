// Up next's outline follows the strip on screen (Notion "Connections: Up
// next's outline follows the open strip (Follow the thread too)",
// 2026-11-18). With Before Doomsday followed and seven titles seen, All
// titles outlines the guide's next stop (Endgame); a pinned character
// outlines their first unseen title (Tony: Iron Man 2; Loki: Thor), and so
// does Follow the thread from Iron Man 3 (Iron Man 2, not Endgame).
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const SEEN = { 'iron-man': 'seen', 'incredible-hulk': 'seen', avengers: 'seen', aou: 'seen', 'civil-war': 'seen', homecoming: 'seen', 'infinity-war': 'seen' };
const QA_PORT = +process.env.PORT || 8256; // regress/quick give each check its own port
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
  await ctx.addInitScript("const SEEN = " + JSON.stringify(SEEN) + ";if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');localStorage.setItem('mcu.lang.v1','en');"
    + "localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: SEEN }));localStorage.setItem('mcu.guidesFollowed.v1', JSON.stringify([{ id: 'before-doomsday', at: 1 }]));}");
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
  for (const [q, want] of [['?view=spatial', 'endgame'], ['?view=spatial&char=tony', 'iron-man-2'], ['?view=spatial&char=loki', 'thor'],
    ['?title=iron-man-3&explore=thread', 'iron-man-2'], ['?view=spatial&guide=before-doomsday', 'endgame']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.goto(URL + q); await appReady(page); await page.waitForTimeout(2200);
    const up = out[q] = await page.evaluate(() => [...document.querySelectorAll('.card.up-next')].map(c => c.dataset.id));
    expect(up.length === 1 && up[0] === want, `${q}: Up next should outline ${want}, got ${JSON.stringify(up)}`);
    errors.push(...e.map(x => q + ': ' + x));
    await ctx.close();
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
