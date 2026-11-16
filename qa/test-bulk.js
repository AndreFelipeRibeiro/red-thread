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

// Bulk marking: the phone section headers ("Mark all seen", "Mark N more
// seen"), the confirmation, Undo, and the rules every bulk action follows —
// exactly the right titles (never an unreleased one marked seen), one
// guest-storage write and one announcement per action, and Undo restoring
// each title as it was, a watchlist that a seen mark replaced included.
// The desktop List lost its row checkboxes and bulk bar (Notion "Titles 1/5":
// marking many at once is "Mark what you've seen"); the first block checks
// they stay gone and that Escape now goes straight to the details.
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
      picker: !!document.querySelector('.toolbar .ml-status .ml-pick'),
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

  // ---- Phones, a phase at a time: exact titles, one write, Undo ------------
  // Iron Man starts on the Watchlist, so Undo has a replaced watchlist to
  // restore.
  {
    const { page: m } = await ctxPage(browser, MOBILE, seed({ 'iron-man': 'watchlist' }) + SPY);
    m.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await m.goto(URL + '?sort=phase'); await require('./ready').appReady(m);
    const st = () => m.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{"states":{}}').states, KEY);
    await m.evaluate(() => { window.__writes = 0; window.__events = []; });
    R.mark = await m.evaluate(async () => {
      const p1div = [...document.querySelectorAll('.m-phase-divider')].find(d => /Phase 1/i.test(d.textContent));
      const btn = p1div && p1div.querySelector('.pgh-action');
      if (!btn) return { error: 'no action on the Phase 1 header' };
      const ids = window.TITLES.filter(t => t.phase === 1).map(t => t.id);
      const expect = ids.filter(id => window.MCU_isReleased(window.TITLES.find(t => t.id === id)));
      btn.click(); await new Promise(r => setTimeout(r, 1200));
      return { ids, expect, toast: (document.querySelector('.mcu-toast b') || {}).textContent || null };
    });
    if (R.mark.error) errors.push(R.mark.error);
    else {
      R.afterMark = await st();
      R.writes = await m.evaluate(() => window.__writes);
      R.events = await m.evaluate(() => window.__events);
      const marked = R.mark.ids.filter(id => R.afterMark[id] === 'seen');
      if (marked.length !== R.mark.expect.length) errors.push(`${marked.length} titles were marked seen; expected ${R.mark.expect.length}`);
      const outside = Object.keys(R.afterMark).filter(id => R.afterMark[id] === 'seen' && !R.mark.ids.includes(id));
      if (outside.length) errors.push(`titles outside Phase 1 were marked: ${outside.join(', ')}`);
      if (R.writes !== 1) errors.push(`the bulk action wrote the guest collection ${R.writes} times; expected once`);
      if (R.events.length !== 1 || !/^bulk:seen:/.test(R.events[0])) errors.push(`expected one bulk announcement, got ${JSON.stringify(R.events)}`);
      // Finishing a whole phase shows the celebration ("Phase 1 complete!")
      // in place of "6 titles marked as seen"; either way the toast has Undo.
      if (!/as seen|complete/.test(R.mark.toast || '')) errors.push(`no bulk toast (${R.mark.toast})`);
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
    // ---- Over 20 titles asks first, and Cancel marks nothing ---------------
    await m.goto(URL); await require('./ready').appReady(m);
    R.confirm = await m.evaluate(async () => {
      const btn = document.querySelector('.m-phase-divider.overall .pgh-action');
      if (!btn) return { error: 'no action on the All titles header' };
      btn.click(); await new Promise(r => setTimeout(r, 900));
      const sheet = document.querySelector('.m-sheet');
      const cancel = sheet && [...sheet.querySelectorAll('button')].find(b => /Cancel/.test(b.textContent));
      if (cancel) cancel.click();
      await new Promise(r => setTimeout(r, 600));
      return { asked: !!sheet };
    });
    R.afterCancel = await st();
    if (R.confirm.error) errors.push(R.confirm.error);
    else if (!R.confirm.asked) errors.push('marking more than 20 titles did not ask first');
    if (Object.keys(R.afterCancel).filter(k => R.afterCancel[k] === 'seen').length) errors.push('Cancel still marked titles seen');
    await m.context().close();
  }

  // ---- Phones: the section header action ----------------------------------
  const { page: m } = await ctxPage(browser, MOBILE, seed({}) + SPY);
  await m.goto(URL + '?sort=phase'); await require('./ready').appReady(m);
  R.phone = await m.evaluate(async () => {
    const p1div = [...document.querySelectorAll('.m-phase-divider')].find(d => /Phase 1/i.test(d.textContent));
    const btn = p1div && p1div.querySelector('.pgh-action');
    if (!btn) return { error: 'no action on the Phase 1 header' };
    const label = btn.textContent.trim();
    const p1 = window.TITLES.filter(t => t.phase === 1 && window.MCU_isReleased(t)).length;
    window.__events = [];
    btn.click(); await new Promise(r => setTimeout(r, 1200));
    const st = JSON.parse(localStorage.getItem('mcu.collection.v1')).states;
    const seen = window.TITLES.filter(t => t.phase === 1 && st[t.id] === 'seen').length;
    const after = p1div.querySelector('.pgh-action');
    return { label, p1, seen, events: window.__events, buttonAfter: after ? after.textContent.trim() : null };
  });
  if (R.phone.error) errors.push(R.phone.error);
  else {
    if (R.phone.label !== 'Mark all seen') errors.push(`the Phase 1 header reads "${R.phone.label}"`);
    if (R.phone.seen !== R.phone.p1) errors.push(`the Phase 1 action marked ${R.phone.seen} of ${R.phone.p1}`);
    if (R.phone.events.length !== 1) errors.push(`the Phase 1 action announced ${R.phone.events.length} times`);
    if (R.phone.buttonAfter) errors.push(`the Phase 1 header still offers "${R.phone.buttonAfter}" with nothing left to mark`);
  }
  // Release order: one All titles header; more than 20 to mark, so it asks.
  await m.goto(URL); await require('./ready').appReady(m);
  R.phoneAll = await m.evaluate(async () => {
    const btn = document.querySelector('.m-phase-divider.overall .pgh-action');
    if (!btn) return { error: 'no action on the All titles header' };
    const label = btn.textContent.trim();
    btn.click(); await new Promise(r => setTimeout(r, 900));
    const sheet = document.querySelector('.m-sheet');
    const go = sheet && [...sheet.querySelectorAll('button')].find(b => /^Mark \d+ as seen$/.test(b.textContent.trim()));
    if (!go) return { label, error: 'no confirmation sheet' };
    go.click(); await new Promise(r => setTimeout(r, 1500));
    const st = JSON.parse(localStorage.getItem('mcu.collection.v1')).states;
    const released = window.TITLES.filter(t => window.MCU_isReleased(t));
    const unreleased = window.TITLES.filter(t => !window.MCU_isReleased(t));
    return { label, allSeen: released.every(t => st[t.id] === 'seen'), unreleasedMarked: unreleased.filter(t => st[t.id]).map(t => t.id) };
  });
  if (R.phoneAll.error) errors.push(R.phoneAll.error);
  else {
    // The init script reseeds an empty collection on every load, so nothing is
    // seen yet here and the header offers to mark them all.
    if (R.phoneAll.label !== 'Mark all seen') errors.push(`the All titles header reads "${R.phoneAll.label}"`);
    if (!R.phoneAll.allSeen) errors.push('confirming did not mark every released title seen');
    if (R.phoneAll.unreleasedMarked.length) errors.push(`unreleased titles were marked: ${R.phoneAll.unreleasedMarked.join(', ')}`);
  }

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
