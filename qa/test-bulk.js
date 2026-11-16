const QA_PORT = +process.env.PORT || 8222; // regress/quick give each check its own port
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

// Bulk marking: a guide's "Mark all seen" / "Mark N more seen", Undo, and
// the rules every bulk action follows —
// exactly the right titles (never an unreleased one marked seen), one
// guest-storage write and one announcement per action, and Undo restoring
// each title as it was, a watchlist that a seen mark replaced included.
// The desktop List lost its row checkboxes and bulk bar (Notion "Titles 1/5":
// marking many at once is "Mark what you've seen"), and the phone List its
// "Mark all seen" headings ("Titles 4/5"); the first blocks check they stay
// gone and that Escape now goes straight to the details.
const KEY = 'mcu.collection.v1';
const seed = (states) => `localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','9');` +
  `localStorage.setItem('${KEY}', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;
// Counts writes of the collection to storage, and status announcements.
const SPY = `(() => {
  const set = Storage.prototype.setItem;
  window.__writes = 0;
  Storage.prototype.setItem = function (k, v) { if (k === '${KEY}') window.__writes += 1; return set.call(this, k, v); };
  window.__events = [];
  const hook = () => { if (window.onStatusChange) window.onStatusChange(e => window.__events.push(e.bulk ? 'bulk:' + e.to + ':' + e.ids.length : 'one')); else setTimeout(hook, 50); };
  hook();
})();`;

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {}; const errors = [];

  // ---- Desktop: no selection, the picker instead -------------------------
  {
    const { page } = await ctxPage(browser, DESKTOP, seed({}));
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.goto(URL + '?view=list'); await require('./ready').appReady(page);
    R.desk = await page.evaluate(() => ({
      checks: document.querySelectorAll('.dlist .dl-check, .dlist input[type="checkbox"]').length,
      bar: !!document.querySelector('.bulk-bar'),
      headerActions: document.querySelectorAll('.dlist .pgh-action').length,
      picker: !!document.querySelector('.toolbar .ml-pick'),
    }));
    if (R.desk.checks) errors.push(`the desktop List still has ${R.desk.checks} checkboxes`);
    if (R.desk.bar) errors.push('the desktop List still shows a bulk bar');
    if (R.desk.headerActions) errors.push(`the desktop List still has ${R.desk.headerActions} "Mark … seen" header buttons`);
    if (!R.desk.picker) errors.push('the desktop List has no "Mark what you\'ve seen"');
    // One Escape closes the details: there is no selection layer before it.
    await page.locator('.dl-row[data-row-id] .dl-open').first().click(); await page.waitForTimeout(900);
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    const open = await page.evaluate(() => !!document.querySelector('.drawer.open'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    R.desk.esc = { open, after: await page.evaluate(() => !!document.querySelector('.drawer.open')) };
    if (!open || R.desk.esc.after) errors.push(`Escape did not close the details in one press: ${JSON.stringify(R.desk.esc)}`);
    await page.context().close();
  }

  // ---- Phone Titles: no bulk buttons, the picker in the toolbar -----------
  // The phone List follows desktop (Notion "Titles 4/5"): plain group
  // headings with no "Mark all seen", and "Mark what you've seen" ending the
  // Sort / Filters row.
  {
    const { page: m } = await ctxPage(browser, MOBILE, seed({}));
    m.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await m.goto(URL + '?view=list&sort=phase'); await require('./ready').appReady(m);
    R.phoneList = await m.evaluate(() => ({
      heads: document.querySelectorAll('.m-scrollarea .m-ghead').length,
      headerActions: document.querySelectorAll('.m-scrollarea .pgh-action').length,
      picker: !!document.querySelector('.m-toolrow .m-pick'),
    }));
    if (!R.phoneList.heads) errors.push('the phone List has no group headings in Phase order');
    if (R.phoneList.headerActions) errors.push(`the phone List still has ${R.phoneList.headerActions} "Mark … seen" header buttons`);
    if (!R.phoneList.picker) errors.push('the phone toolbar has no "Mark what you\'ve seen"');
    await m.context().close();
  }

  // ---- The bulk rules, through a guide's "Mark N more seen" (phone) --------
  // Exactly the guide's stops shown (released only), one guest-storage write,
  // one announcement, and Undo restoring each title as it was: Iron Man starts
  // on the Watchlist, so Undo has a replaced watchlist to restore. (The
  // confirmation above 20 titles has no surface left to test it from: no
  // guide has that many stops.)
  {
    const { page: m } = await ctxPage(browser, MOBILE, seed({ 'iron-man': 'watchlist' }) + SPY);
    m.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await m.goto(URL + '?view=list&guide=infinity-saga'); await require('./ready').appReady(m);
    const st = () => m.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{"states":{}}').states, KEY);
    await m.evaluate(() => { window.__writes = 0; window.__events = []; });
    R.mark = await m.evaluate(async () => {
      const btn = document.querySelector('.g-meter .pgh-action');
      if (!btn) return { error: 'no "Mark all seen" on the guide meter' };
      const label = btn.textContent.trim();
      const ids = window.MCU_GUIDE.stops(window.GUIDES.find(g => g.id === 'infinity-saga'), false).map(s => s.id);
      const expect = ids.filter(id => window.MCU_isReleased(window.TITLES.find(t => t.id === id)));
      btn.click(); await new Promise(r => setTimeout(r, 1200));
      return { label, ids, expect, toast: (document.querySelector('.mcu-toast b') || {}).textContent || null };
    });
    if (R.mark.error) errors.push(R.mark.error);
    else {
      R.afterMark = await st();
      R.writes = await m.evaluate(() => window.__writes);
      R.events = await m.evaluate(() => window.__events);
      if (R.mark.label !== 'Mark all seen') errors.push(`the guide meter reads "${R.mark.label}"`);
      const marked = R.mark.ids.filter(id => R.afterMark[id] === 'seen');
      if (marked.length !== R.mark.expect.length) errors.push(`${marked.length} titles were marked seen; expected ${R.mark.expect.length}`);
      const outside = Object.keys(R.afterMark).filter(id => R.afterMark[id] === 'seen' && !R.mark.ids.includes(id));
      if (outside.length) errors.push(`titles outside the guide were marked: ${outside.join(', ')}`);
      if (R.writes !== 1) errors.push(`the bulk action wrote the guest collection ${R.writes} times; expected once`);
      if (R.events.length !== 1 || !/^bulk:seen:/.test(R.events[0])) errors.push(`expected one bulk announcement, got ${JSON.stringify(R.events)}`);
      // Finishing the guide may celebrate in place of "10 titles marked as
      // seen"; either way the toast has Undo.
      if (!/as seen|complete|finished|Infinity/i.test(R.mark.toast || '')) errors.push(`no bulk toast (${R.mark.toast})`);
      R.after = await m.evaluate(() => { const b = document.querySelector('.g-meter .pgh-action'); return b ? b.textContent.trim() : null; });
      if (R.after) errors.push(`the guide meter still offers "${R.after}" with nothing left to mark`);
      R.undo = await m.evaluate(async () => {
        const b = document.querySelector('.mcu-toast .mt-undo');
        if (!b) return { error: 'no Undo on the bulk toast' };
        b.click(); await new Promise(r => setTimeout(r, 900));
        return {};
      });
      R.afterUndo = await st();
      if (R.undo.error) errors.push(R.undo.error);
      else {
        if (R.afterUndo['iron-man'] !== 'watchlist') errors.push(`Undo left Iron Man as ${R.afterUndo['iron-man']}; it was on the Watchlist`);
        const left = R.mark.ids.filter(id => id !== 'iron-man' && R.afterUndo[id]);
        if (left.length) errors.push(`Undo left marks on ${left.join(', ')}`);
      }
    }
    await m.context().close();
  }

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
