// Checks saved display preferences (mcu.prefs.v1) on mobile and desktop.
const QA_PORT = +process.env.PORT || 8186; // regress/quick give each check its own port
const { chromium } = require('playwright');
const { setColl } = require('./coll');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = path.join(S, '..');
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
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); if (m.type() === 'warning' && m.text().includes('[mcu i18n]')) errors.push('WARN ' + m.text()); });
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


const fs2 = require('fs');
const en = (() => { const w = {}; global.window = w; eval(fs2.readFileSync(path.join(SITE, 'locales/en.js'), 'utf8')); eval(fs2.readFileSync(path.join(SITE, 'locales/pt-BR.js'), 'utf8')); return w.MCU_LOCALES; })();
// English strings that must not appear when Portuguese is active (plain, distinct, no placeholders).
const leftovers = Object.entries(en.en.strings).filter(([k, v]) => typeof v === 'string' && !/\{/.test(v) && v.length > 3 && en['pt-BR'].strings[k] !== v).map(([, v]) => v);
const scan = (list) => (() => {
  const texts = [];
  const walk = (n) => { if (n.nodeType === 3) { const t = n.textContent.trim(); if (t) texts.push(t); } else if (n.nodeType === 1 && !['SCRIPT','STYLE'].includes(n.tagName)) { ['aria-label','title','placeholder','alt'].forEach(a => { const v = n.getAttribute(a); if (v) texts.push(v); }); n.childNodes.forEach(walk); } };
  walk(document.body);
  return texts;
});
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const findLeft = (texts) => [...new Set(leftovers.filter(e => texts.some(t => new RegExp('(^|[^\p{L}])' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\p{L}])', 'u').test(t))))];
  // ---- Portuguese by browser locale, mobile
  for (const [name, opts] of [['ptMobile', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'pt-BR' }], ['ptDesktop', { viewport: { width: 1440, height: 900 }, locale: 'pt-BR' }]]) {
    const { ctx, page, errors } = await ctxPage(browser, opts, SEED);
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    const texts = [];
    texts.push(...await page.evaluate(scan()));
    out[name] = { htmlLang: await page.evaluate(() => document.documentElement.lang) };
    if (name === 'ptMobile') {
      out[name].sortMenu = await page.evaluate(() => (document.querySelector('.sort-menu-trigger') || {}).textContent);
      out[name].sub = await page.evaluate(() => (document.querySelector('.ctx-line, .ctx-pill') || {}).textContent);
      out[name].firstRows = await page.evaluate(() => [...document.querySelectorAll('.m-ltitle')].slice(0, 6).map(e => e.textContent));
      await page.locator('.m-fpill').click(); await page.waitForTimeout(300); texts.push(...await page.evaluate(scan())); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      await page.locator('.m-lrow-open').first().click(); await page.waitForTimeout(350); texts.push(...await page.evaluate(scan())); out[name].sheetTitle = await page.locator('.m-dtitle').textContent(); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      await page.locator('.m-appbar-top .m-acct').click(); await page.waitForTimeout(300); texts.push(...await page.evaluate(scan())); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      await page.locator('.sort-menu-trigger').click(); await page.waitForTimeout(250); texts.push(...await page.evaluate(scan()));
      await page.locator('.sort-menu-pop [data-sort="title"][data-dir="asc"]').click(); await page.waitForTimeout(400);
      out[name].azFirst = await page.evaluate(() => [...document.querySelectorAll('.m-ltitle')].slice(0, 4).map(e => e.textContent));
      await setColl(page, 'watchlist'); await page.waitForTimeout(300); texts.push(...await page.evaluate(scan()));
      await page.screenshot({ path: path.join(S, 'shots', 'pt-mobile-list.png') });
      await setColl(page, 'all');
      await page.locator('.m-tab[data-section="explore"]').click(); await page.waitForTimeout(700); texts.push(...await page.evaluate(scan()));
    } else {
      await page.locator('.filters-pill:not(.g-btn)').click(); await page.waitForTimeout(250); texts.push(...await page.evaluate(scan())); await page.keyboard.press('Escape');
      const c = await page.evaluate(() => { const r = document.querySelector('.card').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.8 }; });
      await page.mouse.click(c.x, c.y); await page.waitForTimeout(800); texts.push(...await page.evaluate(scan()));
      out[name].drawer = await page.evaluate(() => (document.querySelector('.drawer-eyebrow') || {}).textContent + ' | ' + (document.querySelector('.drawer-title') || {}).textContent + ' | ' + (document.querySelector('.drawer-story') || {}).textContent);
      await page.screenshot({ path: path.join(S, 'shots', 'pt-desktop.png'), clip: { x: 0, y: 0, width: 1440, height: 460 } });
      await page.locator('.drawer-close').click(); await page.waitForTimeout(300);
      await page.locator('.acct-pill').click(); await page.waitForTimeout(250); texts.push(...await page.evaluate(scan()));
    }
    out[name].leftoverEnglish = findLeft(texts);
    out[name].errors = errors;
    await ctx.close();
  }
  // ---- English default, switch to PT and persistence
  {
    const { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US' }, SEED);
    await page.goto('http://127.0.0.1:' + QA_PORT + '/'); await require('./ready').appReady(page);
    out.en = { htmlLang: await page.evaluate(() => document.documentElement.lang), tab0: await page.locator('.m-tab[data-section="mylist"]').textContent() };
    await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
    await page.fill('.m-search-input input', 'Vingadores'); await page.waitForTimeout(300);
    out.en.searchPtInEn = await page.evaluate(() => [...document.querySelectorAll('.m-ltitle')].map(e => e.textContent));
    await page.fill('.m-search-input input', 'Visão'); await page.waitForTimeout(300);
    out.en.searchPtCharInEn = await page.evaluate(() => document.querySelectorAll('.m-lrow').length);
    await page.fill('.m-search-input input', ''); await page.waitForTimeout(200);
    // The language choice lives in Settings (Notion "Settings menu").
    await page.locator('.m-settings-btn').click(); await page.waitForTimeout(400);
    out.en.menuOptions = await page.evaluate(() => [...document.querySelectorAll('.m-sheet [role="radiogroup"]')].map(g => g.getAttribute('aria-label') === 'Language' ? [...g.querySelectorAll('[role="radio"]')].map(l => l.textContent) : null).filter(Boolean)[0] || []);
    await page.locator('.m-sheet [role="radio"]', { hasText: 'Português' }).click(); await page.waitForTimeout(400);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    out.en.afterSwitch = { lang: await page.evaluate(() => document.documentElement.lang), tab0: await page.locator('.m-tab[data-section="mylist"]').textContent(), stored: await page.evaluate(() => localStorage.getItem('mcu.lang.v1')) };
    await page.fill('.m-search-input input', 'Avengers'); await page.waitForTimeout(300);
    out.en.searchEnInPt = await page.evaluate(() => [...document.querySelectorAll('.m-ltitle')].map(e => e.textContent));
    await page.reload(); await require('./ready').appReady(page);
    out.en.afterReload = await page.evaluate(() => document.documentElement.lang);
    out.en.errors = errors;
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error(e.message); process.exit(1); });
