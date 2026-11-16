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
const PORT = +process.env.PORT || 8226;
const URL = `http://127.0.0.1:${PORT}/`;
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const PHONE320 = { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init);
  await ctx.addInitScript("try { if (!localStorage.getItem('mcu.signInNudge.v1')) localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}");
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
// Counts confetti canvases from the moment the page loads.
const COUNT_CONFETTI = "window.__c=0;document.addEventListener('DOMContentLoaded',()=>new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('mcu-confetti'))window.__c++;}))).observe(document.body,{childList:true}));";
const seedJs = (states) => `localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;

// Guides (guides.js, guides-ui.jsx): curated paths through the catalogue.
// Part one checks the data itself (every stop a real title, both languages,
// viewing order, a reason per stop). Part two drives the UI on desktop and
// phone. Expectations come from window.GUIDES and today's date at run time,
// so the check keeps working when a guide is edited or a title comes out.
const DATA = () => {
  const I = window.MCU_I18N, G = window.MCU_GUIDE;
  const errs = [];
  const ids = new Set(window.TITLES.map(t => t.id));
  const seenIds = new Set();
  const langs = ['en', 'pt-BR'];
  const groups = ['coming', 'stories', 'characters', 'teams', 'corners', 'animation'];
  (window.GUIDES || []).forEach(g => {
    if (seenIds.has(g.id)) errs.push(`guide id ${g.id} is used twice`);
    seenIds.add(g.id);
    if (!/^[a-z0-9-]+$/.test(g.id)) errs.push(`${g.id}: ids are lower-case words joined by hyphens (they go in addresses)`);
    if (groups.indexOf(g.group) === -1) errs.push(`${g.id}: unknown menu group "${g.group}"`);
    ['name', 'short', 'blurb'].forEach(f => langs.forEach(l => { if (!g[f] || !g[f][l]) errs.push(`${g.id}: no ${f} in ${l}`); }));
    if (g.done) langs.forEach(l => { if (!g.done[l]) errs.push(`${g.id}: no "done" line in ${l}`); });
    if (g.kind === 'character' && !window.CHARACTERS[g.character]) errs.push(`${g.id}: character "${g.character}" does not exist`);
    if (g.target && !ids.has(g.target)) errs.push(`${g.id}: target "${g.target}" is not a title`);
    if (g.target && g.stops.some(s => s.id === g.target)) errs.push(`${g.id}: the target is also a stop`);
    if (!g.stops.some(s => s.weight === 'essential')) errs.push(`${g.id}: no essential stop`);
    const stopIds = new Set();
    let last = '';
    g.stops.forEach(s => {
      if (!ids.has(s.id)) errs.push(`${g.id}: stop "${s.id}" is not a title`);
      if (stopIds.has(s.id)) errs.push(`${g.id}: stop "${s.id}" appears twice`);
      stopIds.add(s.id);
      if (['essential', 'optional'].indexOf(s.weight) === -1) errs.push(`${g.id}/${s.id}: weight "${s.weight}"`);
      langs.forEach(l => { if (!s.why || !s.why[l] || s.why[l].length < 8) errs.push(`${g.id}/${s.id}: no reason in ${l}`); });
      const t = window.TITLES.find(x => x.id === s.id);
      if (t && !g.order && t.release < last) errs.push(`${g.id}: ${s.id} is out of release order`);
      if (t) last = t.release;
    });
    // The numbering: essential stops 1..n, optional unnumbered, the same with
    // optional stops shown or hidden.
    const a = G.stops(g, false).map(s => s.n).join(','), b = G.stops(g, true).filter(s => !s.optional).map(s => s.n).join(',');
    if (a !== b) errs.push(`${g.id}: essential numbers change when optional stops are shown (${a} vs ${b})`);
    if (a !== G.stops(g, false).map((s, i) => i + 1).join(',')) errs.push(`${g.id}: essential numbers are not 1..n (${a})`);
  });
  Object.entries(window.CONTINUITY || {}).forEach(([id, v]) => {
    if (!ids.has(id)) errs.push(`continuity: "${id}" is not a title`);
    if (['main', 'alternate', 'anthology'].indexOf(v) === -1) errs.push(`continuity: ${id} is "${v}"`);
  });
  window.TITLES.forEach(t => { if (!t.continuity) errs.push(`${t.id} has no continuity`); });
  return { errs, guides: (window.GUIDES || []).map(g => g.id) };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  const consoleErrs = [];
  const finish = async (label, ctx, errors) => { errors.forEach(e => consoleErrs.push(`${label}: ${e}`)); await ctx.close(); };

  // ---- Data ----
  let { ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({}));
  await page.goto(URL + '?view=list'); await settle(page);
  const data = await page.evaluate(DATA);
  data.errs.forEach(e => err('data: ' + e));
  out.guides = data.guides;
  if (!data.guides.length) err('no guides loaded');
  // The drafts awaiting approval (Guides 4/4) follow the same rules; they
  // only show where QA or a preview asks for them.
  {
    const d = await ctxPage(browser, DESKTOP, seedJs({}) + 'window.__GUIDE_DRAFTS = true;');
    await d.page.goto(URL + '?view=list'); await settle(d.page);
    const dd = await d.page.evaluate(DATA);
    dd.errs.forEach(e => err('draft data: ' + e));
    out.draftGuides = dd.guides.length;
    if (dd.guides.length <= data.guides.length) err('the drafts did not load with window.__GUIDE_DRAFTS');
    await d.ctx.close();
  }

  // The guide under test: the first event guide, else the first one. Its
  // expectations, worked out from the data and today's date.
  const plan = await page.evaluate(() => {
    const G = window.MCU_GUIDE;
    const g = G.all().find(x => x.target) || G.all()[0];
    const ess = G.stops(g, false), all = G.stops(g, true);
    const rel = (s) => window.MCU_isReleased(s.title);
    const essRel = ess.filter(rel);
    const charGuide = G.all().find(x => x.kind === 'character');
    const plain = Object.keys(window.CHARACTERS).find(c => !G.forChar(c) && window.TITLES.some(t => t.cast.indexOf(c) !== -1));
    return {
      id: g.id, name: G.name(g), short: G.short(g), target: g.target || null,
      ess: ess.map(s => s.id), all: all.map(s => s.id), essRel: essRel.map(s => s.id),
      optRel: all.filter(s => s.optional && rel(s)).map(s => s.id),
      charGuide: charGuide ? { id: charGuide.id, character: charGuide.character } : null, plain,
      // A title in at least one guide, and the query that finds this guide by
      // its short name in search.
      query: G.short(g).split(/\s+/).sort((a, b) => b.length - a.length)[0].slice(0, 5),
    };
  });
  out.plan = { id: plan.id, ess: plan.ess.length, all: plan.all.length, released: plan.essRel.length };
  await finish('data', ctx, errors);
  if (!plan.essRel.length) { err(`${plan.id} has no released essential stop to test with`); }

  // Seed: the first essential released stop seen, so there is progress and a
  // next stop that is not the first row.
  const seed1 = { [plan.essRel[0]]: 'seen' };
  const nextExpected = plan.essRel[1] || null;

  // ---- Desktop: menu, banner, List view ----
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(seed1)));
  await page.goto(URL + '?view=list'); await settle(page);
  // The Guides tab's gallery (Notion "Desktop: navigation for Explore, My list
  // and Guides") lists every guide, grouped.
  await page.locator('.nav-tabs button', { hasText: 'Guides' }).click(); await page.waitForTimeout(500);
  const menu = await page.evaluate(() => ({
    rows: document.querySelectorAll('.g-page .g-row').length,
    groups: [...document.querySelectorAll('.g-page .g-group-h')].map(h => h.textContent),
    url: location.search,
  }));
  out.menu = menu;
  if (menu.rows !== data.guides.length) err(`desktop Guides lists ${menu.rows} guides, expected ${data.guides.length}`);
  if (!/view=guides/.test(menu.url)) err('the Guides tab is not in the address: ' + menu.url);
  await page.locator('.g-page .g-row', { hasText: plan.name }).click(); await page.waitForTimeout(700);
  const desk = await page.evaluate(() => ({
    url: new URLSearchParams(location.search).get('guide'),
    pop: !!document.querySelector('.g-page'),
    banner: !!document.querySelector('.g-desk .g-head'),
    charBanner: !!document.querySelector('.char-banner:not(.guide-banner)'),
    rows: [...document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest)')].map(r => r.dataset.rowId),
    nums: [...document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest) .g-num')].map(n => n.textContent),
    dest: (document.querySelector('.g-desk .g-stop.dest') || {}).dataset ? document.querySelector('.g-desk .g-stop.dest').dataset.rowId : null,
    next: (document.querySelector('.g-desk .g-stop.next') || { dataset: {} }).dataset.rowId || null,
    meter: (document.querySelector('.g-desk .g-meter .pgh-count') || {}).textContent || '',
    // The guide's header heads the List, its title the switcher (Notion
    // "Guides 3/4"); seen stops follow the Titles list: full strength with the
    // seen mark on the poster.
    module: !!document.querySelector('.g-desk .g-head .g-sw-btn'),
    compact: [...document.querySelectorAll('.g-desk .g-stop.seen')].map(r => ({ mark: !!r.querySelector('.g-seen') })),
    mains: document.querySelectorAll('[role="main"]').length,
  }));
  out.desk = { rows: desk.rows.length, next: desk.next, dest: desk.dest };
  if (desk.url !== plan.id) err(`desktop: address says guide=${desk.url}, expected ${plan.id}`);
  if (desk.pop) err('desktop: the gallery stayed after picking a guide');
  if (!desk.banner) err('desktop: no guide header');
  if (desk.charBanner) err('desktop: a character banner shows beside the guide');
  if (desk.rows.join(',') !== plan.ess.join(',')) err(`desktop List rows ${desk.rows.join(',')} ≠ essential stops ${plan.ess.join(',')}`);
  if (desk.dest !== plan.target) err(`desktop: destination row is ${desk.dest}, expected ${plan.target}`);
  if (desk.next !== nextExpected) err(`desktop: next stop is ${desk.next}, expected ${nextExpected}`);
  if (desk.mains !== 1) err(`desktop: ${desk.mains} main landmarks`);
  if (desk.meter.indexOf(`1 of ${plan.essRel.length} `) !== 0) err(`desktop meter reads "${desk.meter}", expected 1 of ${plan.essRel.length}`);
  if (!desk.module) err('desktop List: the guide header (with its switcher) does not head the List');
  if (!desk.compact.length || desk.compact.some(r => !r.mark)) err(`desktop List: a seen stop has no seen mark: ${JSON.stringify(desk.compact)}`);

  // Include optional: every stop, essential numbers unchanged.
  if (plan.all.length > plan.ess.length) {
    await page.locator('.g-desk .g-optrow [role="switch"]').click(); await page.waitForTimeout(400);
    const opt = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest)')].map(r => r.dataset.rowId),
      nums: [...document.querySelectorAll('.g-desk .g-stop[data-row-id]:not(.dest):not(.optional) .g-num')].map(n => n.textContent),
    }));
    if (opt.rows.join(',') !== plan.all.join(',')) err(`desktop with optional: rows ${opt.rows.join(',')} ≠ ${plan.all.join(',')}`);
    if (opt.nums.join(',') !== desk.nums.join(',')) err(`desktop: essential numbers changed with optional stops shown (${desk.nums} → ${opt.nums})`);
    await page.locator('.g-desk .g-optrow [role="switch"]').click(); await page.waitForTimeout(300);
  }

  // "Mark N more seen" on the guide's meter: the released stops left, with Undo.
  const bulkBtn = page.locator('.g-desk .g-meter .pgh-action');
  const wantN = plan.essRel.length - 1;
  if (!wantN) { if (await bulkBtn.count()) err('desktop: a bulk button on a guide with nothing left'); }
  else if (!(await bulkBtn.count())) err('desktop: no "Mark N more seen" on the guide meter');
  else {
    const label = await bulkBtn.textContent();
    if (label.indexOf(String(wantN)) === -1) err(`desktop: bulk button says "${label}", expected ${wantN}`);
    await bulkBtn.click(); await page.waitForTimeout(600);
    const after = await page.evaluate(ids => ids.filter(id => (JSON.parse(localStorage.getItem('mcu.collection.v1') || '{}').states || {})[id] === 'seen').length, plan.essRel);
    if (after !== plan.essRel.length) err(`desktop: bulk marked ${after} of ${plan.essRel.length} released stops`);
    const undo = page.locator('.mcu-toast .mt-undo').first();
    if (await undo.count()) { await undo.click(); await page.waitForTimeout(600); }
    else err('desktop: no Undo after the guide bulk mark');
    const back = await page.evaluate(ids => ids.filter(id => (JSON.parse(localStorage.getItem('mcu.collection.v1') || '{}').states || {})[id] === 'seen').length, plan.essRel);
    if (back !== 1) err(`desktop: after Undo ${back} stops are seen, expected 1`);
  }

  // A guide shows only its own titles: no Guide titles / All titles switch.
  const allMode = await page.evaluate(() => ({ modeSwitch: !!document.querySelector('.guide-banner .cb-mode'), gdesk: !!document.querySelector('.g-desk'), dlist: !!document.querySelector('.dlist:not(.g-desk)') }));
  if (allMode.modeSwitch || !allMode.gdesk || allMode.dlist) err(`desktop guide should show only its titles, with no switch: ${JSON.stringify(allMode)}`);

  // Moving between guides (Notion "Guides 3/4"): the title switcher opens
  // another guide in one step (its list: Following, More guides, All guides);
  // "‹ Guides" and the Guides tab go back to the list.
  await page.locator('.g-desk .g-sw-btn').click(); await page.waitForTimeout(400);
  const sw = await page.evaluate(() => ({
    items: document.querySelectorAll('.g-switch-list .g-sw-item').length,
    current: (document.querySelector('.g-switch-list .g-sw-item[aria-current]') || {}).textContent || null,
    all: !!document.querySelector('.g-switch-list .g-sw-all'),
  }));
  out.switcher = sw;
  if (sw.items !== data.guides.length || !sw.current || !sw.all) err(`desktop switcher: ${JSON.stringify(sw)}`);
  await page.locator('.g-switch-list .g-sw-item:not([aria-current])').first().click(); await page.waitForTimeout(700);
  const swTo = await page.evaluate(() => new URLSearchParams(location.search).get('guide'));
  if (!swTo || swTo === plan.id) err(`the switcher did not open another guide (${swTo})`);
  await page.locator('.g-desk .g-back').click(); await page.waitForTimeout(600);
  let backTo = await page.evaluate(() => ({ page: !!document.querySelector('.g-page'), url: location.search }));
  if (!backTo.page || /guide=/.test(backTo.url)) err(`"‹ Guides" did not go back to the list: ${JSON.stringify(backTo)}`);
  await page.locator('.g-page .g-row', { hasText: plan.name }).click(); await page.waitForTimeout(600);
  await page.locator('.nav-tabs button', { hasText: 'Guides' }).click(); await page.waitForTimeout(600);
  backTo = await page.evaluate(() => ({ page: !!document.querySelector('.g-page'), url: location.search }));
  if (!backTo.page || /guide=/.test(backTo.url)) err(`the Guides tab did not close the open guide: ${JSON.stringify(backTo)}`);
  await finish('desktop', ctx, errors);

  // Escape closes the guide (one layer) and the address forgets it.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(seed1)));
  await page.goto(URL + `?view=list&guide=${plan.id}`); await settle(page);
  const restored = await page.evaluate(() => !!document.querySelector('.g-desk .g-head'));
  if (!restored) err('desktop: ?guide= did not open the guide on load');
  await page.mouse.click(1420, 880); await page.waitForTimeout(100); // empty margin, beside the list
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const esc = await page.evaluate(() => ({ banner: !!document.querySelector('.g-desk'), url: location.search }));
  if (esc.banner) err('desktop: Escape did not close the guide');
  if (/guide=/.test(esc.url)) err(`desktop: the address still names the guide after closing (${esc.url})`);
  await page.goto(URL + '?view=list&guide=no-such-guide'); await settle(page);
  if (await page.locator('.g-desk').count()) err('desktop: an unknown ?guide= opened something');
  await finish('desktop-esc', ctx, errors);

  // Search: the guide is a suggestion under "Guides"; picking it opens it and
  // clears the box.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({})));
  await page.goto(URL + '?view=list'); await settle(page);
  // An empty, focused box lists every guide under Guides.
  await page.locator('.toolbar input').first().focus(); await page.waitForTimeout(300);
  const empty = await page.evaluate(() => ({ heads: [...document.querySelectorAll('.ss-pop .ss-head')].map(h => h.textContent), rows: document.querySelectorAll('.ss-pop .ss-item').length }));
  if (empty.heads.join() !== (await page.evaluate(() => window.MCU_I18N.tr('suggest.guides'))) || empty.rows !== data.guides.length) err(`search: an empty box shows ${JSON.stringify(empty)}, expected the ${data.guides.length} guides`);
  await page.locator('.toolbar input').first().fill(plan.query); await page.waitForTimeout(400);
  const sug = await page.evaluate(() => ({
    heads: [...document.querySelectorAll('.ss-pop .ss-head')].map(h => h.textContent),
    want: window.MCU_I18N.tr('suggest.guides'),
    first: (document.querySelector('.ss-pop .ss-item .ss-main') || {}).textContent || '',
  }));
  out.search = { query: plan.query, heads: sug.heads };
  if (sug.heads[0] !== sug.want) err(`search "${plan.query}": the first group is ${sug.heads[0]}, expected ${sug.want}`);
  if (sug.first !== plan.name) err(`search "${plan.query}": first suggestion is "${sug.first}", expected "${plan.name}"`);
  await page.locator('.ss-pop .ss-item').first().click(); await page.waitForTimeout(600);
  const picked = await page.evaluate(() => ({ banner: !!document.querySelector('.guide-banner, .g-desk .g-head'), box: document.querySelector('.toolbar input').value }));
  if (!picked.banner) err('search: picking the guide did not open it');
  if (picked.box) err(`search: the box kept "${picked.box}" after picking a guide`);
  // Keyboard: arrow down + Enter picks it too.
  await page.locator('.guide-banner .cb-close, .g-desk .g-back').first().click(); await page.waitForTimeout(300);
  await page.locator('.toolbar input').first().fill(plan.query); await page.waitForTimeout(400);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  if (!(await page.locator('.guide-banner, .g-desk .g-head').count())) err('search: ArrowDown + Enter did not open the guide');
  await finish('search', ctx, errors);

  // A character with a guide offers it from the banner; one without does not.
  if (plan.charGuide) {
    ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({})));
    await page.goto(URL + `?view=list&char=${plan.charGuide.character}`); await settle(page);
    const has = await page.locator('.char-banner .cb-guide').count();
    if (has !== 1) err(`desktop: the ${plan.charGuide.character} banner has ${has} "See the curated path" buttons`);
    if (has) {
      await page.locator('.char-banner .cb-guide').click(); await page.waitForTimeout(600);
      const r = await page.evaluate(() => ({ url: new URLSearchParams(location.search), guide: !!document.querySelector('.guide-banner, .g-desk .g-head'), pin: !!document.querySelector('.char-banner:not(.guide-banner)') }));
      if (!r.guide || r.pin) err('desktop: "See the curated path" did not swap the pin for the guide');
    }
    if (plan.plain) {
      await page.goto(URL + `?view=list&char=${plan.plain}`); await settle(page);
      if (await page.locator('.cb-guide').count()) err(`desktop: ${plan.plain} has no guide but offers one`);
    }
    await finish('char', ctx, errors);
  }

  // Details: "Part of" lists every guide the title is in, and opens it.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs({})));
  await page.goto(URL + `?view=list&title=${plan.ess[0]}`); await settle(page);
  const part = await page.evaluate(id => ({ rows: document.querySelectorAll('.td-slot-guides .g-partof-row').length, want: window.MCU_GUIDE.forTitle(id).length }), plan.ess[0]);
  if (part.rows !== part.want) err(`details: Part of shows ${part.rows} guides for ${plan.ess[0]}, expected ${part.want}`);
  if (part.rows) {
    await page.locator('.td-slot-guides .g-partof-row', { hasText: plan.name }).click(); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ guide: new URLSearchParams(location.search).get('guide'), cur: (document.querySelector('.g-stop.current') || { dataset: {} }).dataset.rowId }));
    if (r.guide !== plan.id) err(`details: Part of opened ${r.guide}, expected ${plan.id}`);
    if (r.cur !== plan.ess[0]) err(`details: Part of should start the guide at ${plan.ess[0]} (current row ${r.cur})`);
  }
  await finish('details', ctx, errors);

  // Desktop Spatial: one badge per stop (numbers, ✓ when seen, → for the
  // destination) and the route drawn.
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(seed1)));
  await page.goto(URL + `?guide=${plan.id}`); await settle(page); await page.waitForTimeout(800);
  const sp = await page.evaluate(() => ({
    badges: [...document.querySelectorAll('.card-gnum')].map(b => b.textContent),
    route: document.querySelectorAll('.guide-route path').length,
    meter: (document.querySelector('.g-module.spatial .gm-meter') || {}).textContent || '',
    overall: !!document.querySelector('.spatial-overall'),
  }));
  out.spatial = sp;
  const wantBadges = plan.ess.length + (plan.target ? 1 : 0);
  if (sp.badges.length !== wantBadges) err(`desktop Spatial: ${sp.badges.length} stop badges, expected ${wantBadges}`);
  if (sp.badges.filter(b => b === '✓').length !== 1) err(`desktop Spatial: expected one ✓ badge (${sp.badges.join(' ')})`);
  if (plan.target && sp.badges.indexOf('→') === -1) err('desktop Spatial: no → badge on the destination');
  if (!sp.route) err('desktop Spatial: no guide route drawn');
  if (!sp.meter) err('desktop Spatial: no guide meter in the floating module');
  if (sp.overall) err('desktop Spatial: the catalogue meter shows beside the guide module');
  await finish('spatial', ctx, errors);

  // Completion: marking the last released essential stop bursts confetti, and
  // again each time it becomes complete; never on opening a guide that is
  // already complete.
  const almost = {}; plan.essRel.slice(0, -1).forEach(id => { almost[id] = 'seen'; });
  const lastStop = plan.essRel[plan.essRel.length - 1];
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(almost)));
  await page.goto(URL + `?view=list&guide=${plan.id}`); await settle(page);
  await page.evaluate(() => { window.__confetti = 0; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('mcu-confetti')) window.__confetti++; }))).observe(document.body, { childList: true }); });
  await page.locator(`.g-desk .g-stop[data-row-id="${lastStop}"] .tsa-btn.seen`).click(); await page.waitForTimeout(600);
  const done1 = await page.evaluate(() => ({ n: window.__confetti, ready: !!document.querySelector('.g-desk .g-kind.done') }));
  if (done1.n !== 1) err(`completion: ${done1.n} confetti bursts, expected 1`);
  if (!done1.ready) err('completion: the guide module did not turn complete after the last essential stop');
  // Unmark and mark again: it becomes complete again, so it bursts again.
  await page.locator(`.g-desk .g-stop[data-row-id="${lastStop}"] .tsa-btn.seen`).click(); await page.waitForTimeout(400);
  if ((await page.evaluate(() => window.__confetti)) !== 1) err('completion: unmarking a stop burst confetti');
  await page.locator(`.g-desk .g-stop[data-row-id="${lastStop}"] .tsa-btn.seen`).click(); await page.waitForTimeout(600);
  if ((await page.evaluate(() => window.__confetti)) !== 2) err('completion: completing the guide again did not burst confetti');
  await finish('complete', ctx, errors);
  // Opening an already-complete guide: no burst.
  const full = Object.assign({}, almost, { [lastStop]: 'seen' });
  ({ ctx, page, errors } = await ctxPage(browser, DESKTOP, seedJs(full) + COUNT_CONFETTI));
  await page.goto(URL + `?view=list&guide=${plan.id}`); await settle(page);
  if ((await page.evaluate(() => window.__c)) !== 0) err('completion: opening a complete guide burst confetti');
  await finish('complete-open', ctx, errors);
  // Reduced motion: remembered, no canvas.
  ({ ctx, page, errors } = await ctxPage(browser, { ...DESKTOP, reducedMotion: 'reduce' }, seedJs(almost) + COUNT_CONFETTI));
  await page.goto(URL + `?view=list&guide=${plan.id}`); await settle(page);
  await page.locator(`.g-desk .g-stop[data-row-id="${lastStop}"] .tsa-btn.seen`).click(); await page.waitForTimeout(600);
  if ((await page.evaluate(() => window.__c)) !== 0) err('completion: confetti with reduced motion');
  await finish('complete-rm', ctx, errors);

  // ---- Phone ----
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs(seed1)));
  await page.goto(URL + '?view=list'); await settle(page);
  // The Guides tab in the bottom bar (Notion "Phone: bottom bar becomes
  // Explore, My list and Guides") shows the gallery.
  await page.locator('.m-tab[data-section="guides"]').click(); await page.waitForTimeout(500);
  const sheet = await page.evaluate(() => ({ rows: document.querySelectorAll('.g-page .g-row').length }));
  if (sheet.rows !== data.guides.length) err(`phone Guides lists ${sheet.rows} guides, expected ${data.guides.length}`);
  await page.locator('.g-page .g-row', { hasText: plan.name }).click(); await page.waitForTimeout(700);
  const ph = await page.evaluate(() => ({
    sheet: !!document.querySelector('.m-sheet'),
    head: !!document.querySelector('.g-head'),
    rows: [...document.querySelectorAll('.g-stops .g-stop[data-row-id]:not(.dest)')].map(r => r.dataset.rowId),
    next: (document.querySelector('.g-stops .g-stop.next') || { dataset: {} }).dataset.rowId || null,
    pill: !!document.querySelector('.guide-pill'),
    sw: document.querySelector('.g-switch') && document.querySelector('.g-switch').getAttribute('aria-checked'),
    upcard: document.querySelectorAll('.spatial-overall .un-mrow').length,
  }));
  if (ph.sheet) err('phone: the sheet stayed open after picking a guide');
  // In Guides the header does the dock's job ("‹ Guides", progress, the
  // switcher; Notion "Guides 3/4"): the dock is Connections' only.
  if (!ph.head || ph.pill) err(`phone: header ${ph.head}, dock ${ph.pill}`);
  if (ph.rows.join(',') !== plan.ess.join(',')) err(`phone List rows ${ph.rows.join(',')} ≠ ${plan.ess.join(',')}`);
  if (ph.next !== nextExpected) err(`phone: next stop ${ph.next}, expected ${nextExpected}`);
  if (ph.upcard) err('phone: the Up next card shows inside the guide view');
  if (plan.all.length > plan.ess.length) {
    if (ph.sw !== 'false') err(`phone: the optional switch starts ${ph.sw}`);
    await page.locator('.g-switch').click(); await page.waitForTimeout(400);
    const n = await page.evaluate(() => ({ rows: document.querySelectorAll('.g-stops .g-stop[data-row-id]:not(.dest)').length, sw: document.querySelector('.g-switch').getAttribute('aria-checked') }));
    if (n.rows !== plan.all.length || n.sw !== 'true') err(`phone: with optional on, ${n.rows} rows (expected ${plan.all.length}), switch ${n.sw}`);
  }
  // Guides in the bottom bar with the guide open goes back to the list (Notion
  // "Phone: tapping Guides in the bottom bar closes the open guide"), and the
  // guide keeps its Include optional when opened again.
  await page.locator('.m-tab[data-section="guides"]').click(); await page.waitForTimeout(500);
  const closed = await page.evaluate(() => ({ g: !!document.querySelector('.g-head'), pill: !!document.querySelector('.guide-pill'), gallery: document.querySelectorAll('.g-page .g-row').length }));
  if (closed.g || closed.pill || !closed.gallery) err(`phone: Guides with the guide open left ${JSON.stringify(closed)}`);
  if (plan.all.length > plan.ess.length) {
    await page.locator('.g-page .g-row', { hasText: plan.name }).click(); await page.waitForTimeout(600);
    const kept = await page.evaluate(() => document.querySelector('.g-switch') && document.querySelector('.g-switch').getAttribute('aria-checked'));
    if (kept !== 'true') err(`phone: Include optional was not kept (${kept})`);
    await page.locator('.g-back').click(); await page.waitForTimeout(500);
    if (!(await page.locator('.g-page').count())) err('phone: "‹ Guides" did not go back to the list');
  }
  await finish('phone', ctx, errors);

  // Phone: an old Grid link opens the guide's List; Spatial: the guide's dock carrying the next stop
  // (the separate Up next chip steps aside while a guide is open).
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs(seed1)));
  await page.goto(URL + `?view=grid&guide=${plan.id}`); await settle(page);
  const grid = await page.evaluate(() => ({ cards: document.querySelectorAll('.g-grid, .g-card').length, stops: document.querySelectorAll('.g-stop').length }));
  if (grid.cards || !grid.stops) err(`phone ?view=grid: ${JSON.stringify(grid)}, expected the guide's List`);
  await page.goto(URL + `?view=spatial&guide=${plan.id}`); await settle(page); await page.waitForTimeout(600);
  const chip = await page.evaluate(() => ({
    pill: !!document.querySelector('.guide-pill.g-dock'), chip: !!document.querySelector('.spatial-overall'),
    next: !!document.querySelector('.g-dock .g-dock-next'), seen: !!document.querySelector('.g-dock .g-dock-tsa .tsa-btn.seen') }));
  if (!chip.pill) err('phone Spatial: no guide dock');
  if (chip.chip) err('phone Spatial: the compact card shows beside the guide dock');
  if (nextExpected && !(chip.next && chip.seen)) err('phone Spatial: the dock does not offer the next stop with Seen');
  await finish('phone-grid', ctx, errors);

  // A character with a guide: an icon button on the pill.
  if (plan.charGuide) {
    ({ ctx, page, errors } = await ctxPage(browser, MOBILE, seedJs({})));
    await page.goto(URL + `?view=list&char=${plan.charGuide.character}`); await settle(page);
    const b = page.locator('.char-pill .cp-guide');
    if ((await b.count()) !== 1) err('phone: the character pill has no curated path button');
    else {
      const name = await b.getAttribute('aria-label');
      if (!name) err('phone: the curated path button has no name');
      await b.click(); await page.waitForTimeout(600);
      if (!(await page.locator('.guide-pill, .g-head').count())) err('phone: the pill button did not open the guide');
    }
    await finish('phone-char', ctx, errors);
  }

  // 320px and Portuguese: nothing past the edge, translated labels.
  ({ ctx, page, errors } = await ctxPage(browser, PHONE320, seedJs(seed1) + "localStorage.setItem('mcu.lang.v1','pt-BR');"));
  await page.goto(URL + `?view=list&guide=${plan.id}`); await settle(page);
  const narrow = await page.evaluate(() => {
    const G = window.MCU_GUIDE, g = G.get(new URLSearchParams(location.search).get('guide'));
    const W = document.documentElement.clientWidth;
    const over = [...document.querySelectorAll('.g-head *, .g-stop *, .guide-pill *')].filter(e => e.getBoundingClientRect().right > W + 0.5 && e.getClientRects().length).map(e => e.className);
    return { over: over.slice(0, 5), name: (document.querySelector('.g-name') || {}).textContent, want: g.name['pt-BR'], lang: document.documentElement.lang,
      tag: (document.querySelector('.g-stop.next .g-next-pill') || {}).textContent || null, wantTag: window.MCU_I18N.tr('upnext.label') };
  });
  if (narrow.over.length) err(`320px: past the edge: ${narrow.over.join(' | ')}`);
  if (narrow.name !== narrow.want) err(`pt-BR: the guide is called "${narrow.name}", expected "${narrow.want}"`);
  if (nextExpected && narrow.tag !== narrow.wantTag) err(`pt-BR: next stop tag "${narrow.tag}", expected "${narrow.wantTag}"`);
  await finish('phone-pt', ctx, errors);

  out.consoleErrors = consoleErrs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
  process.exit(out.errors.length || consoleErrs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
