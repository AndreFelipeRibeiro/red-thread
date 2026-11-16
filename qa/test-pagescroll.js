// The phone app never scrolls as a page (Notion "Phone, Large text: Titles is
// taller than the window and pushes the header up"): at every text size, on
// Titles, Connections and Guides, the document is one screen tall and stays
// at the top, and Titles still brings a far-down Up next row into view inside
// its list. A page made scrollable on purpose (as iOS Safari's can be) is put
// back at the top after a scroll. 320 and 390px, English and Portuguese.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
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
const PORT = +process.env.PORT || 8252;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');" + (init || ''));
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
const settle = (page) => require('./ready').appReady(page, 1000);
const seed = (states) => `localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  // Most of Phases 1–3 seen, so Up next sits far down the release-order list.
  let ids = [];
  {
    const { ctx, page } = await ctxPage(browser, PHONE, '');
    await page.goto(URL); await settle(page);
    ids = await page.evaluate(() => window.TITLES.filter(t => t.phase <= 3).map(t => t.id));
    await ctx.close();
  }
  const seen = seed(Object.fromEntries(ids.map(id => [id, 'seen'])));
  for (const [w, h, size, lang] of [[390, 664, 'large', 'en'], [320, 568, 'large', 'pt-BR'], [390, 664, 'small', 'en'], [390, 664, '', 'en']]) {
    const init = seen + (size ? `localStorage.setItem('mcu.textSize.v1','${size}');` : '') + (lang !== 'en' ? `localStorage.setItem('mcu.lang.v1','${lang}');` : '');
    const { ctx, page, errors } = await ctxPage(browser, { ...PHONE, viewport: { width: w, height: h } }, init);
    const label = `${w}x${h} ${size || 'default'} ${lang}`;
    for (const view of ['list', 'explore', 'guides']) {
      await page.goto(URL + '?view=' + view); await settle(page);
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const up = document.querySelector('.m-lrow.up-next, .m-lrow[data-up-next="true"]') || [...document.querySelectorAll('.m-lrow')].find(x => /Up next|A seguir/.test(x.innerText));
        const area = up && up.closest('[class*="overflow-y"]');
        const a = area && area.getBoundingClientRect(), b = up && up.getBoundingClientRect();
        return { y: window.scrollY, tall: document.documentElement.scrollHeight - innerHeight,
          upVisible: up ? (b.top >= a.top - 1 && b.bottom <= a.bottom + 1) : null,
          headerTop: Math.round((document.querySelector('.m-appbar') || document.body).getBoundingClientRect().top) };
      });
      out[label + ' ' + view] = r;
      if (r.y !== 0 || r.tall > 0 || r.headerTop < 0) err(`${label} ${view}: the page scrolls ${JSON.stringify(r)}`);
      if (view === 'list' && r.upVisible === false) err(`${label}: Up next is not in view in its list`);
    }
    // A page that can scroll is put back at the top.
    const back = await page.evaluate(async () => {
      document.body.style.minHeight = '200vh';
      window.scrollTo(0, 120);
      await new Promise(r => setTimeout(r, 200));
      const y = window.scrollY; document.body.style.minHeight = ''; return y;
    });
    if (back !== 0) err(`${label}: a scrolled page was left at ${back}`);
    errors.forEach(e => err(`${label} console: ` + e));
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
