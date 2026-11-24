// The character view (Notion "Character view: one view, their titles in a
// row" and "Connections with a character pinned", 2026-11-18), desktop
// Connections, where each surface has one job:
// - a character picked in a title's cast pins them (`?char=`): their titles in
//   one row (the timeline), their card top right (the stepper), and the panel
//   keeps the details of the title you came from as the current one;
// - no full-width banner, no All titles card;
// - the stepper's card has the quiet gray outline (no lift), the others are
//   not dimmed; stepping moves the card, the details and the address;
// - the card's photo opens their trail in the panel, marking the current
//   title; a row opens that title's details, ‹ (the character) comes back to
//   the trail, ‹ (the title) closes it, still pinned;
// - × on the card unpins: the title's ring again.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8249; // regress/quick give each check its own port
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



const ST = () => {
  const cards = [...document.querySelectorAll('.card')].filter(c => !c.classList.contains('ring-hidden') && getComputedStyle(c).visibility !== 'hidden');
  const cur = document.querySelector('.card.current');
  return {
    url: (location.search + ((p) => ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] && p[2] ? (location.search ? '&' : '?') + ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] + '=' + p[2] : ({ titles: 'list', guides: 'guides' })[p[1]] && !p[2] ? (location.search ? '&' : '?') + 'view=' + ({ titles: 'list', guides: 'guides' })[p[1]] : '')(location.pathname.split('/'))), trail: !!document.querySelector('.drawer .ex-trail'), pin: !!document.querySelector('.drawer .trail-pin'),
    here: (document.querySelector('.drawer .ex-row.here') || {}).dataset?.title || null,
    current: cur ? cur.dataset.id : null, quiet: cur ? cur.classList.contains('guide-at') || cur.classList.contains('up-next') : null,
    lifted: cur ? /scale\((?!1\))/.test(getComputedStyle(cur).transform) && getComputedStyle(cur).getPropertyValue('--lift').trim() === '1.08' : null,
    dimmed: cards.filter(c => parseFloat((getComputedStyle(c).filter.match(/brightness\(([\d.]+)\)/) || [0, 1])[1]) < 0.9).length,
    rows: new Set(cards.map(c => Math.round(c.getBoundingClientRect().top / 40))).size, shown: cards.length,
    title: (document.querySelector('.drawer h2') || {}).textContent || null,
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
  await page.goto(URL + '?title=iron-man'); await appReady(page); await page.waitForTimeout(1500);
  await page.locator('.drawer button', { hasText: 'Tony Stark' }).first().click(); await page.mouse.move(400, 860); await page.waitForTimeout(2200);
  const card = () => page.evaluate(() => {
    const c = document.querySelector('.char-card');
    return c ? { pos: c.querySelector('.cb-pos').textContent, title: (c.querySelector('.cc-title') || {}).textContent || null,
      cur: [...c.querySelectorAll('.cc-segs i')].findIndex(i => i.classList.contains('cur')), banner: !!document.querySelector('.char-banner'),
      allCard: !!document.querySelector('.spatial-overall') } : null;
  });
  const a = out.pinned = await page.evaluate(ST);
  const ca = out.pinnedCard = await card();
  expect(/char=tony/.test(a.url) && !a.trail && a.title === 'Iron Man', `the cast should pin Tony Stark and keep Iron Man's details in the panel: ${JSON.stringify(a)}`);
  expect(ca && /^1 of \d+$/.test(ca.pos) && ca.title === 'Iron Man' && ca.cur === 0 && !ca.banner && !ca.allCard,
    `the card should read "1 of N" over Iron Man, with no banner and no All titles card: ${JSON.stringify(ca)}`);
  expect(a.rows === 1 && a.shown >= 10, `their titles should sit in one row: ${JSON.stringify(a)}`);
  expect(a.current === 'iron-man', `the stepper should start on the title you came from: ${JSON.stringify(a)}`);
  expect(a.dimmed === 0, `no title should be dimmed in the row: ${JSON.stringify(a)}`);
  await page.locator('.char-card').getByRole('button', { name: 'Next title' }).click(); await page.waitForTimeout(800);
  const b = out.step = await page.evaluate(ST);
  const cb = out.stepCard = await card();
  expect(b.current === 'incredible-hulk' && b.title === 'The Incredible Hulk' && /title=incredible-hulk/.test(b.url), `a step should move the stepper, the details and the address: ${JSON.stringify(b)}`);
  expect(cb && /^2 of /.test(cb.pos) && cb.title === 'The Incredible Hulk' && cb.cur === 1, `the card should follow the step: ${JSON.stringify(cb)}`);
  expect(b.quiet === true && b.dimmed === 0, `the stepper's card should have the quiet outline, the others undimmed: ${JSON.stringify(b)}`);
  // ⋯ opens the menu (who plays them, the curated path, Show all titles,
  // Share); Escape closes the menu alone, the pin stays.
  await page.locator('.char-card .cb-more').click(); await page.waitForTimeout(400);
  const menu = out.menu = await page.evaluate(() => ({ who: (document.querySelector('.cc-menu .cc-who') || {}).textContent || null,
    items: [...document.querySelectorAll('.cc-menu [role^="menuitem"]')].map(e => e.textContent.trim()) }));
  expect(/^Robert Downey Jr\. · \d+ titles$/.test(menu.who || '') && menu.items.includes('Show all titles') && menu.items.includes('Share'), `the card's menu: ${JSON.stringify(menu)}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const esc = out.menuEsc = await page.evaluate(() => ({ open: [...document.querySelectorAll('.cc-menu')].some(m => !m.hasAttribute('data-closed')), card: !!document.querySelector('.char-card'), char: new URLSearchParams((location.search + ((p) => ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] && p[2] ? (location.search ? '&' : '?') + ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] + '=' + p[2] : ({ titles: 'list', guides: 'guides' })[p[1]] && !p[2] ? (location.search ? '&' : '?') + 'view=' + ({ titles: 'list', guides: 'guides' })[p[1]] : '')(location.pathname.split('/')))).get('char') }));
  expect(!esc.open && esc.card && esc.char === 'tony', `Escape should close the menu and keep the pin: ${JSON.stringify(esc)}`);
  // The photo opens the trail, on the current title.
  await page.locator('.char-card .cc-badge').click(); await page.waitForTimeout(800);
  const t = out.trail = await page.evaluate(ST);
  expect(t.trail && !t.pin && t.here === 'incredible-hulk', `the card's photo should open the trail on the current title, with no pin button: ${JSON.stringify(t)}`);
  await page.locator('.drawer .ex-row[data-title="avengers"]').click(); await page.waitForTimeout(1000);
  const c = out.row = await page.evaluate(ST);
  expect(c.title === 'The Avengers' && c.current === 'avengers' && /char=tony/.test(c.url) && c.rows === 1, `a trail row should open its details, still in the row: ${JSON.stringify(c)}`);
  await page.locator('.drawer button[aria-label="Back to Tony Stark"]').first().click(); await page.waitForTimeout(800);
  const d = out.back = await page.evaluate(ST);
  expect(d.trail && d.here === 'avengers', `‹ Tony Stark should come back to the trail: ${JSON.stringify(d)}`);
  await page.locator('.drawer .ex-trail .ex-top button').first().click(); await page.waitForTimeout(800);
  const g = out.closeTrail = await page.evaluate(ST);
  expect(!g.trail && /char=tony/.test(g.url) && g.title, `‹ on the trail should close it back to the details, still pinned: ${JSON.stringify(g)}`);
  // × unpins: the title's ring again.
  await page.locator('.char-card .cb-close').click(); await page.waitForTimeout(1200);
  const f = out.leave = await page.evaluate(ST);
  expect(!/char=/.test(f.url) && !f.trail && f.shown > 12 && !(await card()), `× should unpin, back to the title's ring: ${JSON.stringify(f)}`);
  errors.push(...e);
  await ctx.close();
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
