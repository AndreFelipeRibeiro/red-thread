// Checks saved display preferences (mcu.prefs.v1) on mobile and desktop.
const QA_PORT = +process.env.PORT || 8190; // regress/quick give each check its own port
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
  const Q = ['Capitao', 'Capitão', 'CAPITÃO', 'capitao america', 'Viuva', 'Viúva', 'Larson', 'gamora', 'Homem-Formiga', 'homem formiga'];
  const sugg = p => p.locator('.ss-item').count();
  for (const [dev, opts, prefs, box, count] of [
    ['deskSpatial', DESKTOP, {version:1, desktopView:'spatial'}, '.search-wrap input', p => p.locator('.canvas .card').count()],
    ['deskList', DESKTOP, {version:1, desktopView:'list'}, '.search-wrap input', p => p.locator('.dl-row, tbody tr').count()],
    ['phoneList', MOBILE, {version:1, viewMode:'list'}, '.m-searchbar input', p => p.locator('.m-lrow-open').count()],
    ['phoneGrid', MOBILE, {version:1, viewMode:'grid'}, '.m-searchbar input', p => p.locator('.m-card').count()],
  ]) {
    for (const lang of ['en', 'pt-BR']) {
      const { ctx, page, errors } = await ctxPage(browser, { ...opts, locale: lang === 'en' ? 'en-US' : 'pt-BR' }, "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.prefs.v1', JSON.stringify(" + JSON.stringify(prefs) + "));");
      await go(page);
      // Phones: search opens from its button (Notion "Phone: bottom bar…").
      if (box.startsWith('.m-')) { await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150); }
      const row = {};
      for (const q of Q) {
        const b = page.locator(box).first();
        await b.fill(q); await page.waitForTimeout(450);
        row[q] = { n: await count(page), s: await sugg(page), marks: await page.locator('mark.hl').count() };
      }
      R[dev + ':' + lang] = { row, errors };
      await ctx.close();
    }
  }
  console.log(JSON.stringify(R));
  await browser.close(); server.close();
})();
