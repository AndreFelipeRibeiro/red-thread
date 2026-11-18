const QA_PORT = +process.env.PORT || 8217; // regress/quick give each check its own port
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

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {}; const errors = [];
  const { page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await go(page);

  R.hold = await page.evaluate(async () => {
    const click = async (el, ms = 1200) => { el.click(); await new Promise(r => setTimeout(r, ms)); };
    const inp = document.querySelector('input[role="combobox"]');
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    inp.focus();
    inp.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    set(inp, 'steve rogers');
    await new Promise(r => setTimeout(r, 500));
    const li = [...document.querySelectorAll('.ss-pop li')].find(l => /Steve Rogers/.test(l.innerText));
    if (!li) return { error: 'no Steve Rogers suggestion' };
    li.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1200));

    const nextBtn = () => document.querySelector('.char-card .cb-step button:last-child');
    if (!nextBtn()) return { error: 'no character card after picking a character' };
    // Stepping opens the details panel.
    await click(nextBtn());
    const drawer = document.querySelector('.drawer');
    const card = document.querySelector('.char-card');
    const db = drawer.getBoundingClientRect();
    const cb = card.getBoundingClientRect();
    const tb = document.querySelector('.toolbar');
    return {
      drawerTop: Math.round(db.top), drawerLeft: Math.round(db.left),
      drawerBottom: Math.round(db.bottom), viewportH: window.innerHeight,
      toolbarBottom: tb ? Math.round(tb.getBoundingClientRect().bottom) : null,
      cardRight: Math.round(cb.right), cardTop: Math.round(cb.top),
      oldBanner: !!document.querySelector('[class~="char-banner"]'),
    };
  });

  const h = R.hold;
  if (h.error) errors.push(h.error);
  else {
    // The pinned character's card (Notion "Connections with a character
    // pinned", 2026-11-18) floats top right of the canvas, left of the open
    // panel, as the All titles and guide cards do; no full-width banner.
    if (h.oldBanner) errors.push('the old full-width banner is still drawn');
    if (h.cardRight > h.drawerLeft + 1) errors.push(`the card runs to ${h.cardRight}, under the panel at ${h.drawerLeft}`);
    if (h.toolbarBottom !== null && h.cardTop < h.toolbarBottom) errors.push(`the card starts at ${h.cardTop}, under the toolbar (${h.toolbarBottom})`);
    // The panel hangs from the toolbar and runs the full height.
    if (h.toolbarBottom !== null && Math.abs(h.drawerTop - h.toolbarBottom) > 1) {
      errors.push(`the panel starts at ${h.drawerTop} but the toolbar ends at ${h.toolbarBottom}; it should hang from the toolbar`);
    }
    if (h.drawerBottom > h.viewportH + 1) errors.push(`the panel runs past the viewport bottom (${h.drawerBottom} > ${h.viewportH})`);
  }

  // Hovering a character in the cast only lights their thread: no card and
  // no banner until they're pinned, and the panel stays put.
  R.hover = await page.evaluate(async () => {
    const click = async (el, ms = 900) => { el.click(); await new Promise(r => setTimeout(r, ms)); };
    await click(document.querySelector('.char-card .cb-close'), 1200);
    const drawer = document.querySelector('.drawer');
    const topBefore = Math.round(drawer.getBoundingClientRect().top);
    const row = document.querySelector('.cast-row');
    if (!row) return { error: 'no cast row to hover' };
    row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    return {
      topBefore, topAfter: Math.round(drawer.getBoundingClientRect().top),
      card: !!document.querySelector('.char-card, .char-card'),
    };
  });

  const hv = R.hover;
  if (hv.error) errors.push(hv.error);
  else {
    if (hv.topBefore !== hv.topAfter) errors.push(`hovering a cast row moved the panel: ${hv.topBefore} -> ${hv.topAfter}`);
    if (hv.card) errors.push('hovering a cast row showed a character card; it should come only with the pin');
  }

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
