// Tapping the selected tab in the phone's bottom bar goes back to the top
// (Notion V4 Tasks, "Mobile: Press twice resets the list"; the bar holds
// Explore / My list / Guides since Notion "Phone: bottom bar becomes Explore,
// My list and Guides").
//   - My list, as List and as Grid: scrolled down, a tap on the selected tab
//     brings the scroll area back to the top, smoothly, or at once with
//     reduced motion.
//   - Nothing else changes: the same tab stays selected, the sort keeps its
//     direction, and the address is untouched.
//   - A tap on a different tab still changes the section.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8298;
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
// qa/serve-site.js wraps this and serves the built tree; the fallback below is
// for running the check by hand without it.
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL_BASE = 'http://127.0.0.1:' + QA_PORT + '/';
const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

const state = () => {
  const area = document.querySelector('.m-main .m-scrollarea');
  const on = document.querySelector('.m-tab.on');
  return {
    top: area ? Math.round(area.scrollTop) : null,
    tab: on ? on.textContent.trim() : null,
    order: (document.querySelector('.m-toolrow .sort-menu-trigger') || {}).getAttribute?.('aria-label') || '',
    search: location.search,
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const seen = {};

  for (const [label, url, motion] of [
    ['list', '', 'no-preference'],
    ['list, reduced motion', '', 'reduce'],
  ]) {
    const ctx = await browser.newContext({ ...PHONE, reducedMotion: motion });
    await ctx.addInitScript(NOWELCOME);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(label + ': pageerror: ' + e.message));
    await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
    await page.goto(URL_BASE + url);
    await require('./ready').appReady(page, 400);
    await page.evaluate(() => { document.querySelector('.m-main .m-scrollarea').scrollTop = 2400; });
    await page.waitForTimeout(150);
    const before = await page.evaluate(state);
    if (!(before.top > 1000)) errors.push(label + ': could not scroll the list down (scrollTop ' + before.top + ')');
    await page.locator('.m-tab.on').click();
    // Smooth scrolling takes a moment; reduced motion must jump at once.
    await page.waitForTimeout(motion === 'reduce' ? 60 : 1200);
    const after = await page.evaluate(state);
    seen[label] = { before, after };
    if (after.top !== 0) errors.push(label + ': after tapping the active tab, scrollTop is ' + after.top + ', not 0');
    if (after.tab !== before.tab) errors.push(label + ': the selected tab changed from ' + before.tab + ' to ' + after.tab);
    if (after.order !== before.order) errors.push(label + ': the order changed from "' + before.order + '" to "' + after.order + '"');
    if (after.search !== before.search) errors.push(label + ': the address changed from ' + before.search + ' to ' + after.search);
    await ctx.close();
  }

  // A different tab still changes the section.
  {
    const ctx = await browser.newContext(PHONE);
    await ctx.addInitScript(NOWELCOME);
    const page = await ctx.newPage();
    await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
    await page.goto(URL_BASE);
    await require('./ready').appReady(page, 400);
    const a = await page.evaluate(state);
    await page.locator('.m-tab:not(.on)').nth(1).click();
    await page.waitForTimeout(800);
    const b = await page.evaluate(state);
    seen['other tab'] = { a, b };
    if (b.tab === a.tab) errors.push('other tab: tapping a different tab did not change the section (still ' + a.tab + ')');
    await ctx.close();
  }

  console.log(JSON.stringify({ seen, errors }, null, 1));
  await browser.close();
  server.close();
  if (errors.length) process.exitCode = 1;
})();
