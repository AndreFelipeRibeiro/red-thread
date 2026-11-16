// Guest sign-in reminder vs Undo: the reminder waits a moment before it shows,
// so undoing the mark that reached the threshold in that gap must call it off
// instead of opening with a count the collection no longer has.
const QA_PORT = +process.env.PORT || 8202; // regress/quick give each check its own port
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

const NUDGE_KEY = 'mcu.signInNudge.v1';

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {};
  // NUDGE=1 keeps ctxPage from pre-dismissing the reminder, and the stage is
  // cleared so this visitor is due the first one at three marks.
  process.env.NUDGE = '1';
  const { page, errors } = await ctxPage(browser, DESKTOP,
    "localStorage.setItem('mcu.welcome.v1','test'); try { localStorage.removeItem('mcu.signInNudge.v1'); } catch (e) {}");
  await go(page);
  await page.locator('.nav-tabs button', { hasText: 'Titles' }).click();
  await page.waitForTimeout(700);
  const row = (name) => page.locator('.dl-row', { hasText: name }).first();
  const stage = () => page.evaluate(k => localStorage.getItem(k), NUDGE_KEY);
  const nudge = () => page.evaluate(() => {
    const el = document.querySelector('.about.nudge');
    if (!el) return { open: false };
    return { open: true, lead: (el.querySelector('.about-lead') || {}).textContent };
  });
  // What the guest collection actually holds, which is what the reminder's
  // count has to agree with.
  const marked = () => page.evaluate(() => {
    try { return Object.values(JSON.parse(localStorage.getItem('mcu.collection.v1') || '{}').states || {}).filter(v => v && v !== 'none').length; }
    catch (e) { return null; }
  });

  // Three marks reaches the first threshold; Undo lands well inside the wait.
  await row('Ant-Man').locator('.tsa-btn.seen').click(); await page.waitForTimeout(200);
  await row('Shang-Chi').locator('.tsa-btn.seen').click(); await page.waitForTimeout(200);
  await row('Thunderbolts*').locator('.tsa-btn.seen').click(); await page.waitForTimeout(250);
  R.atThreshold = { marked: await marked(), stage: await stage(), nudge: await nudge() };

  // Undo the third mark straight away, then wait out the reminder's delay.
  await page.locator('.mt-undo').click();
  await page.waitForTimeout(2600);
  R.afterUndo = { marked: await marked(), stage: await stage(), nudge: await nudge() };
  R.cancelled = R.afterUndo.nudge.open === false;
  R.stageGivenBack = R.afterUndo.stage === null || R.afterUndo.stage === '0';

  // Back over the threshold for real: the reminder is still due, and its count
  // matches what is actually saved.
  await row('Thunderbolts*').locator('.tsa-btn.seen').click();
  await page.waitForTimeout(2800);
  R.afterRemark = { marked: await marked(), stage: await stage(), nudge: await nudge() };
  R.showsOnce = R.afterRemark.nudge.open === true;
  R.countMatches = R.showsOnce && R.afterRemark.nudge.lead.includes(String(R.afterRemark.marked));

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
