const { chromium } = require('playwright');
const { setColl } = require('./coll');
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
const PORT = +process.env.PORT || 8227;
const URL = `http://127.0.0.1:${PORT}/`;
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const PHONE320 = { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

async function ctxPage(browser, opts, init, nudge) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init);
  if (!nudge) await ctx.addInitScript("try { if (!localStorage.getItem('mcu.signInNudge.v1')) localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}");
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
const seedJs = (states) => `localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;
const COUNT_CONFETTI = "window.__c=0;document.addEventListener('DOMContentLoaded',()=>new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('mcu-confetti'))window.__c++;}))).observe(document.body,{childList:true}));";
const saved = page => page.evaluate(() => (JSON.parse(localStorage.getItem('mcu.collection.v1') || '{}').states) || {});

// "What have you seen?" (picker.jsx): the first-visit picker. Expectations come
// from the catalogue and today's date: the released titles, by phase, in
// release order. A new guest is a context with nothing stored, opened with
// ?welcome.
const PLAN = () => {
  const rel = window.TITLES.filter(t => window.MCU_isReleased(t)).sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
  const phases = [...new Set(rel.map(t => t.phase))].sort((a, b) => a - b);
  return { order: phases.flatMap(p => rel.filter(t => t.phase === p).map(t => t.id)), phases: phases.map(p => ({ p, ids: rel.filter(t => t.phase === p).map(t => t.id) })),
    unreleased: window.TITLES.filter(t => !window.MCU_isReleased(t)).map(t => t.id) };
};
const grid = page => page.evaluate(() => ({
  ids: [...document.querySelectorAll('.pk-p')].map(b => b.dataset.pick),
  on: [...document.querySelectorAll('.pk-p[aria-pressed="true"]')].map(b => b.dataset.pick),
  count: (document.querySelector('.pk-count') || {}).textContent || '',
  go: (document.querySelector('.pk-go') || {}).textContent || '',
  goDisabled: document.querySelector('.pk-go') ? document.querySelector('.pk-go').disabled : null,
  heads: [...document.querySelectorAll('.pk-ph')].map(h => h.querySelector('.pk-pl').textContent + '|' + h.querySelector('.pk-pa').textContent),
  ask: !!document.querySelector('.pk-ask'),
  open: !!document.querySelector('.pk'),
}));

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  const consoleErrs = [];
  const finish = async (label, ctx, errors) => { errors.forEach(e => consoleErrs.push(`${label}: ${e}`)); await ctx.close(); };

  // ---- Desktop: a new guest, from the welcome ----
  let { ctx, page, errors } = await ctxPage(browser, DESKTOP, COUNT_CONFETTI);
  await page.goto(URL + '?welcome'); await settle(page);
  const plan = await page.evaluate(PLAN);
  out.released = plan.order.length;
  if (!(await page.locator('.about-dialog .welcome-pick .picker-go').count())) err('desktop welcome: no "Mark what I\'ve seen" button');
  await page.locator('.welcome-pick .picker-go').click(); await page.waitForTimeout(600);
  let g = await grid(page);
  if (!g.open) err('desktop: the picker did not open from the welcome');
  if (await page.locator('.about-dialog:not(.pk-dialog)').count()) err('desktop: the welcome stayed open behind the picker');
  if (g.ids.join() !== plan.order.join()) err(`desktop: grid order ${g.ids.length} titles ≠ released by phase in release order (${plan.order.length})`);
  if (g.ids.some(id => plan.unreleased.includes(id))) err('desktop: an unreleased title is in the picker');
  if (g.on.length) err(`desktop: a new guest starts with ${g.on.length} picked`);
  if (!g.goDisabled) err('desktop: the save button is enabled with nothing picked');
  // Select all of the first phase, then three titles of the second.
  const p1 = plan.phases[0].ids, p2 = plan.phases[1].ids;
  await page.locator('.pk-pa').first().click();
  for (const id of p2.slice(0, 3)) await page.locator(`[data-pick="${id}"]`).click();
  g = await grid(page);
  const want = p1.concat(p2.slice(0, 3));
  if (g.on.sort().join() !== want.slice().sort().join()) err(`desktop: picked ${g.on.length}, expected ${want.length}`);
  if (!/^Clear$/.test(g.heads[0].split('|')[1])) err(`desktop: a full phase's button reads "${g.heads[0]}"`);
  if (g.heads[0].indexOf(`${p1.length}/${p1.length}`) === -1) err(`desktop: phase count reads "${g.heads[0]}"`);
  if (g.count.indexOf(String(want.length)) === -1 || g.go.indexOf(String(want.length)) === -1) err(`desktop: footer "${g.count}" / "${g.go}" should name ${want.length}`);
  if ((await page.locator('.pk-count[aria-live="polite"]').count()) !== 1) err('desktop: the count is not a polite live region');
  // Keyboard: Tab onto a poster and Space toggles it.
  const kb = p2[3];
  await page.locator(`[data-pick="${kb}"]`).focus(); await page.keyboard.press('Space'); await page.waitForTimeout(100);
  if ((await page.locator(`[data-pick="${kb}"]`).getAttribute('aria-pressed')) !== 'true') err('desktop: Space did not toggle a poster');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  if ((await page.locator(`[data-pick="${kb}"]`).getAttribute('aria-pressed')) !== 'false') err('desktop: Enter did not toggle a poster back');
  // Save: exactly those, one toast with Undo, one burst for Phase 1 at most.
  await page.locator('.pk-go').click(); await page.waitForTimeout(900);
  let st = await saved(page);
  const seen = Object.keys(st).filter(k => st[k] === 'seen');
  if (seen.sort().join() !== want.slice().sort().join()) err(`desktop save: ${seen.length} seen, expected exactly the ${want.length} picks`);
  if (await page.locator('.pk').count()) err('desktop: the picker stayed open after saving');
  if ((await page.locator('.mcu-toast').count()) !== 1) err('desktop save: expected one toast');
  if ((await page.locator('.bulk-dialog').count())) err('desktop save: asked for confirmation');
  const bursts = await page.evaluate(() => window.__c);
  if (bursts > 1) err(`desktop save: ${bursts} confetti bursts`);
  await page.locator('.mcu-toast .mt-undo').click(); await page.waitForTimeout(500);
  st = await saved(page);
  if (Object.keys(st).length) err(`desktop Undo left ${Object.keys(st).length} marks`);
  await finish('desktop', ctx, errors);

  // Over 20 picks: no confirmation; and the sign-in reminder once, after.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, null, true));
  await page.goto(URL + '?welcome'); await settle(page);
  await page.locator('.welcome-pick .picker-go').click(); await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) await page.locator('.pk-pa').nth(i).click();
  const many = plan.phases.slice(0, 3).reduce((n, x) => n + x.ids.length, 0);
  await page.locator('.pk-go').click(); await page.waitForTimeout(500);
  if (await page.locator('.bulk-dialog').count()) err('over 20: the picker asked for confirmation');
  st = await saved(page);
  if (Object.values(st).filter(v => v === 'seen').length !== many) err(`over 20: ${Object.values(st).length} marked, expected ${many}`);
  await page.waitForTimeout(3200);
  const nudges = await page.locator('.nudge-dialog').count();
  const stage = await page.evaluate(() => localStorage.getItem('mcu.signInNudge.v1'));
  out.nudge = { nudges, stage };
  if (nudges !== 1) err(`reminder: ${nudges} shown after saving, expected 1`);
  if (stage !== '2') err(`reminder: stage ${stage}, expected 2 (both thresholds passed in one save)`);
  await finish('over20', ctx, errors);

  // Opened later from the account menu: seen ticked with a label, unticking
  // marks unseen in the same change, a Watchlist title can be picked, one toast
  // names both, Undo restores both (the Watchlist mark included).
  const [a, b] = p1, c = p2[0];
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({ [a]: 'seen', [b]: 'seen', [c]: 'watchlist' })));
  await page.goto(URL + '?view=list'); await settle(page);
  // "Mark what you've seen" lives in My list (Notion "Take the collection
  // filters out of the Account menu").
  await page.locator('.ml-pick').click(); await page.waitForTimeout(600);
  g = await grid(page);
  if (g.on.sort().join() !== [a, b].sort().join()) err(`later: ${g.on.join()} start ticked, expected ${a},${b}`);
  const lab = await page.locator(`[data-pick="${a}"]`).getAttribute('aria-label');
  const wantLab = await page.evaluate(id => window.MCU_I18N.tr('picker.ariaSeen', { title: window.MCU_I18N.titleName(window.TITLES.find(t => t.id === id)) }), a);
  if (lab !== wantLab) err(`later: a seen poster is named "${lab}"`);
  if (!(await page.locator(`[data-pick="${a}"] .pk-tag`).count())) err('later: no "Seen" label');
  if (!(await page.locator('.pk-note').count())) err('later: no Watchlist note');
  await page.locator(`[data-pick="${a}"]`).click(); await page.locator(`[data-pick="${c}"]`).click();
  g = await grid(page);
  const wantGo = await page.evaluate(() => window.MCU_I18N.tr('picker.save'));
  if (g.go !== wantGo) err(`later: button reads "${g.go}"`);
  if (!/1.*1/.test(g.count)) err(`later: footer "${g.count}" should count 1 seen and 1 unseen`);
  if (!(await page.locator(`[data-pick="${a}"].un .pk-tag.ul`).count())) err('later: an unticked seen title shows no "Unmark" label');
  await page.locator('.pk-go').click(); await page.waitForTimeout(900);
  st = await saved(page);
  if (st[a] || st[b] !== 'seen' || st[c] !== 'seen') err(`later save: ${JSON.stringify(st)}`);
  const toast = await page.locator('.mcu-toast b').first().textContent();
  const wantToast = await page.evaluate(() => window.MCU_I18N.tr('toast.bulk.mixed', { s: 1, u: 1 }));
  if (toast !== wantToast) err(`later: toast "${toast}", expected "${wantToast}"`);
  await page.locator('.mcu-toast .mt-undo').click(); await page.waitForTimeout(500);
  st = await saved(page);
  if (st[a] !== 'seen' || st[b] !== 'seen' || st[c] !== 'watchlist') err(`later Undo: ${JSON.stringify(st)}`);
  // Closing: with no changes × closes at once; with changes it asks.
  await page.locator('.ml-pick').click(); await page.waitForTimeout(500);
  await page.locator('.pk-dialog .about-x').click(); await page.waitForTimeout(300);
  if (await page.locator('.pk').count()) err('close: × with no changes did not close');
  await page.locator('.ml-pick').click(); await page.waitForTimeout(500);
  await page.locator(`[data-pick="${p2[1]}"]`).click();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  g = await grid(page);
  if (!g.ask || !g.open) err('close: Escape with a pick did not ask');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  g = await grid(page);
  if (g.ask || !g.open || !g.on.includes(p2[1])) err('close: a second Escape should close only the prompt and keep the pick');
  await page.locator('.pk-dialog .about-x').click(); await page.waitForTimeout(300);
  await page.locator('.pk-ask .pk-keep').click(); await page.waitForTimeout(200);
  if (!(await grid(page)).open) err('close: Keep picking closed the picker');
  await page.locator('.pk-dialog .about-x').click(); await page.waitForTimeout(300);
  await page.locator('.pk-ask .nudge-later').click(); await page.waitForTimeout(400);
  st = await saved(page);
  if (await page.locator('.pk').count()) err('close: Leave without saving did not close');
  if (st[p2[1]]) err('close: Leave without saving still saved the pick');
  await finish('later', ctx, errors);

  // ---- Phone ----
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE));
  await page.goto(URL + '?welcome'); await settle(page);
  await page.locator('.m-sheet .welcome-pick .picker-go').click(); await page.waitForTimeout(700);
  if (!(await page.locator('.m-sheet.pk-sheet').count())) err('phone: the picker sheet did not open from the welcome');
  // Back with nothing picked closes it.
  await page.goBack(); await page.waitForTimeout(500);
  if (await page.locator('.pk').count()) err('phone: Back with nothing picked did not close');
  await page.locator('.m-pick').click(); await page.waitForTimeout(600);
  await page.locator(`[data-pick="${p1[0]}"]`).click();
  // Back with a pick asks, and the sheet stays (and keeps a Back entry).
  await page.goBack(); await page.waitForTimeout(500);
  g = await grid(page);
  if (!g.open || !g.ask) err('phone: Back with a pick should ask and keep the sheet');
  await page.locator('.pk-ask .pk-keep').click(); await page.waitForTimeout(200);
  await page.goBack(); await page.waitForTimeout(500);
  if (!(await grid(page)).ask) err('phone: a second Back did not ask again');
  await page.locator('.pk-ask .picker-go').click(); await page.waitForTimeout(900);
  st = await saved(page);
  if (st[p1[0]] !== 'seen' || await page.locator('.pk').count()) err('phone: saving from the prompt did not save and close');
  // The footer stays in reach while scrolling.
  await page.locator('.m-pick').click(); await page.waitForTimeout(600);
  await page.evaluate(() => { const b = document.querySelector('.pk-sheet .m-sheet-body'); b.scrollTop = b.scrollHeight / 2; });
  await page.waitForTimeout(200);
  const foot = await page.evaluate(() => { const f = document.querySelector('.pk-foot').getBoundingClientRect(); return f.bottom <= innerHeight + 1 && f.top < innerHeight; });
  if (!foot) err('phone: the footer is not on screen while scrolling');
  // Poster art is clipped by its button, so only the picker's own boxes count.
  const over = await page.evaluate(() => [...document.querySelectorAll('.pk *')].filter(e => !e.closest('.pk-art')).some(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5));
  if (over) err('phone: something in the picker runs past the edge');
  await finish('phone', ctx, errors);

  // The Seen tab's empty state offers the picker.
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.lang.v1','pt-BR');"));
  await page.goto(URL + '?view=list'); await settle(page);
  // The tab's name carries its count ("Vistos, 0"), so pick it by its hook.
  await setColl(page, 'seen').catch(() => {});
  await page.waitForTimeout(500);
  const empty = page.locator('.m-empty .empty-action');
  if ((await empty.count()) !== 1) err('phone Seen empty state: no picker button');
  else {
    await empty.click(); await page.waitForTimeout(600);
    const t = await page.locator('.pk-title').textContent();
    if (t !== 'O que você já viu?') err(`pt-BR: picker title "${t}"`);
  }
  await finish('phone-empty', ctx, errors);

  out.consoleErrors = consoleErrs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
  process.exit(out.errors.length || consoleErrs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
