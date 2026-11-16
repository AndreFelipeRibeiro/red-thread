// Checks saved display preferences (mcu.prefs.v1) on mobile and desktop.
const QA_PORT = +process.env.PORT || 8187; // regress/quick give each check its own port
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



const SEED = "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','incredible-hulk':'seen','iron-man-2':'seen','thor':'seen','cap-first-avenger':'seen','avengers':'seen','iron-man-3':'seen','thor-dark-world':'seen','cap-winter-soldier':'seen','gotg':'seen','aou':'seen','civil-war':'seen','loki-s1':'watchlist','shang-chi':'watchlist','thunderbolts':'watchlist','agatha':'watchlist'}}));";

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const variants = [['new', null, null]];
  for (const sort of ['release', 'chrono', 'phase', 'title', 'imdb', 'rt']) {
    for (const [name, jx, jy] of variants) {
      const init = SEED + `localStorage.setItem('mcu.prefs.v1', JSON.stringify({version:1, sort:'${sort}'}));` + (jx == null ? '' : `window.__JX=${jx};window.__JY=${jy};`);
      const { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, init);
      await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
      const m = await page.evaluate(() => {
        const r = [...document.querySelectorAll('.card')].map(e => e.getBoundingClientRect()).filter(b => b.width);
        const s = r[0] ? r[0].width / 170 : 1;
        let minGap = Infinity, maxGap = -Infinity, overlaps = 0;
        r.forEach(a => {
          // nearest neighbour to the right that shares vertical span
          let best = null;
          r.forEach(b => { if (b === a || b.left <= a.left) return; if (b.top >= a.bottom || a.top >= b.bottom) return; if (!best || b.left < best.left) best = b; });
          if (best) { const g = (best.left - a.right) / s; minGap = Math.min(minGap, g); maxGap = Math.max(maxGap, g); if (g < 0) overlaps++; }
        });
        return { cards: r.length, minGap: Math.round(minGap), maxGap: Math.round(maxGap), overlaps };
      });
      console.log(sort, name, JSON.stringify(m), errors.length);
      await page.screenshot({ path: path.join(S, 'shots', `jit-${sort}-${name}.png`) });
      await ctx.close();
    }
  }
  await browser.close(); server.close();
})().catch(e => { console.error(e.message); process.exit(1); });
