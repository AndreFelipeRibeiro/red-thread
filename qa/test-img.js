// Checks saved display preferences (mcu.prefs.v1) on mobile and desktop.
const QA_PORT = +process.env.PORT || 8189; // regress/quick give each check its own port
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
  // A 1×1 PNG for "served" mode, built here (the img-ok.png fixture this read
  // was never in the repo).
  const IMG_OK = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const browser = await chromium.launch();
  const R = {};
  for (const mode of ['blocked', 'served']) {
    for (const [dev, opts] of [['desk', DESKTOP], ['phone', MOBILE]]) {
      const { ctx, page, errors } = await ctxPage(browser, opts, "localStorage.setItem('mcu.welcome.v1','test');");
      const hits = {};
      await page.route(/image\.tmdb\.org|\.(jpg|png|webp)(\?|$)/, route => {
        const u = route.request().url(); hits[u] = (hits[u] || 0) + 1;
        if (mode === 'served' && u.startsWith('http://127.0.0.1') && !/tmdb/.test(u)) return route.continue();
        return mode === 'served' ? route.fulfill({ status: 200, contentType: 'image/png', body: IMG_OK }) : route.abort();
      });
      await go(page); await page.waitForTimeout(4000);
      const poster = await page.evaluate(() => ({
        imgs: document.querySelectorAll('.poster-image-wrap img').length,
        generated: [...document.querySelectorAll('.card-poster > .poster-mono, .m-lthumb > .poster-mono, .m-pw > .poster-mono')].length,
        broken: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length,
      }));
      // Open details for the first title.
      if (dev === 'desk') { await page.locator('.card').first().click(); } else { await page.locator('.m-lrow-open').first().click(); }
      await page.waitForTimeout(900);
      const cast = await page.evaluate(() => {
        const ports = [...document.querySelectorAll('.portrait, .m-port')];
        return { ports: ports.length, photos: ports.filter(p => p.querySelector('img')).length, initials: ports.filter(p => p.querySelector('span')).length,
          overflow: ports.filter(p => p.scrollWidth > p.clientWidth + 1 || p.scrollHeight > p.clientHeight + 1).length };
      });
      // Close and reopen: blocked images must not be requested again.
      const before = Object.values(hits).reduce((a, b) => a + b, 0);
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      if (dev === 'desk') { await page.locator('.card').first().click(); } else { await page.locator('.m-lrow-open').first().click(); }
      await page.waitForTimeout(900);
      const after = Object.values(hits).reduce((a, b) => a + b, 0);
      R[mode + ':' + dev] = { poster, cast, requestsBefore: before, requestsAfterReopen: after, maxPerUrl: Math.max(0, ...Object.values(hits)), errors };
      await ctx.close();
    }
  }
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
