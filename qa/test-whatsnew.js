// What's new (Notion "What's new: a changelog in the app, starting with V1 to
// V5"), opened from About:
// - About shows a What's new row with the current version; it opens What's new
//   in place (newest version first, marked Current), and focus moves to its
//   heading;
// - Escape steps back to About (focus on the row), a second Escape closes;
// - in Portuguese it reads "Novidades" and "Versão";
// - phone: the row opens it in the sheet, and Back steps back to About with
//   the sheet still open.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8247; // regress/quick give each check its own port
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


const state = () => ({
  about: !!document.querySelector('.about-news'),
  news: !!document.querySelector('.whats-new'),
  open: !!document.querySelector('.about-dialog, .m-sheet'),
  focus: document.activeElement ? (document.activeElement.className || '').split(' ')[0] : null,
  versions: [...document.querySelectorAll('.wn-version')].map(h => h.firstChild && h.firstChild.textContent),
  current: !!document.querySelector('.wn-current'),
  title: (document.querySelector('.whats-new h2') || {}).textContent || null,
  row: (document.querySelector('.about-news') || {}).textContent || null,
});

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  for (const [lang, title, word] of [['en', "What's new", 'Version'], ['pt-BR', 'Novidades', 'Versão']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
    await page.addInitScript((l) => localStorage.setItem('mcu.lang.v1', l), lang);
    await page.goto(URL); await appReady(page); await page.waitForTimeout(600);
    await page.locator('.acct-pill').click(); await page.waitForTimeout(300);
    await page.locator('.acct-foot-link').click(); await page.waitForTimeout(500);
    const about = await page.evaluate(state);
    await page.locator('.about-news').click(); await page.waitForTimeout(400);
    const news = await page.evaluate(state);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const back = await page.evaluate(state);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const closed = await page.evaluate(state);
    out[lang] = { about: about.row, news: { title: news.title, versions: news.versions, focus: news.focus }, back: back.focus, closed: closed.open };
    expect(about.about && new RegExp(word + ' 5').test(about.row || ''), `${lang}: About has no What's new row with the version: ${about.row}`);
    expect(news.news && news.title === title && news.focus === 'about-title', `${lang}: What's new did not open with focus on its heading: ${JSON.stringify(news)}`);
    expect(news.versions.length >= 4 && news.versions[0] === word + ' 5' && news.current, `${lang}: expected the versions newest first, the first marked Current: ${JSON.stringify(news.versions)}`);
    expect(back.about && !back.news && back.focus === 'about-news', `${lang}: Escape should step back to About, focus on the row: ${JSON.stringify(back)}`);
    expect(!closed.open, `${lang}: a second Escape should close About`);
    errors.push(...e);
    await ctx.close();
  }

  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(URL); await appReady(page); await page.waitForTimeout(600);
    await page.locator('.m-acct').tap(); await page.waitForTimeout(500);
    await page.locator('.acct-foot-link').tap(); await page.waitForTimeout(600);
    await page.locator('.about-news').tap(); await page.waitForTimeout(500);
    const news = await page.evaluate(state);
    await page.goBack(); await page.waitForTimeout(500);
    const back = await page.evaluate(state);
    const over = await page.evaluate(() => { const a = document.querySelector('.m-sheet .about'); return a ? a.scrollWidth > a.clientWidth + 1 : null; });
    out.phone = { news: news.news, back: { about: back.about, open: back.open }, over };
    expect(news.news && news.versions[0] === 'Version 5', `phone: What's new did not open in the sheet: ${JSON.stringify(news)}`);
    expect(back.about && back.open, `phone: Back should step back to About with the sheet open: ${JSON.stringify(back)}`);
    expect(over === false, 'phone: About runs past the edge');
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
