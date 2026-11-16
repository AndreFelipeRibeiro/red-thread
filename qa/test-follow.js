// Following guides (Notion "Guides 2/4"): the Continue shelf, auto-follow
// with Undo, auto-unfollow on finishing, and Up next following the guide in
// focus. Checked:
// - the Continue shelf lists the followed guides other than the hero (none
//   with nothing else followed), and its Mark seen marks that guide's next stop;
// - marking a stop seen inside an open guide follows it, with a toast whose
//   Undo stops following and takes back the mark; marks in Titles never follow;
// - the mark that finishes a followed guide stops following it;
// - Titles' Up next is the focused guide's next stop, and the view's own
//   order once nothing is followed;
// - phones: the Continue card's button reads "Seen", nothing past an edge.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
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
const PORT = +process.env.PORT || 8251;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');" + (init || ''));
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
const settle = (page) => require('./ready').appReady(page, 1000);
const seed = (states) => `localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;

const states = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mcu.collection.v1') || '{"states":{}}').states);
const follow = (ids) => `localStorage.setItem('mcu.guidesFollowed.v1', JSON.stringify(${JSON.stringify(ids)}.map((id, i) => ({ id, at: 1000 + i }))));`;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);

  // 1. Nothing followed: no Continue shelf.
  let { ctx, page, errors } = await ctxPage(browser, DESK, seed({}));
  await page.goto(URL + '?view=guides'); await settle(page);
  if (await page.locator('.g-continue').count()) err('a Continue shelf with nothing followed');
  await ctx.close();

  // 2. Two followed guides besides the hero (the Doomsday guide, coming up):
  //    both on the Continue shelf, the most recent first; Mark seen marks that
  //    guide's next stop.
  ({ ctx, page, errors } = await ctxPage(browser, DESK, seed({}) + follow(['multiverse-saga', 'spider-man', 'before-doomsday'])));
  await page.goto(URL + '?view=guides'); await settle(page);
  let r = await page.evaluate(() => ({
    hero: document.querySelector('.g-hero-title').textContent,
    cards: [...document.querySelectorAll('.g-ccard')].map(c => c.querySelector('.g-ccard-open').textContent),
    head: document.querySelector('.g-continue') && document.querySelector('.g-continue .g-shelf-head').innerText.replace(/\n/g, ' '),
  }));
  out.shelf = r;
  if (r.cards.length !== 2 || r.cards[0] !== 'Spider-Man') err(`Continue shelf: ${JSON.stringify(r)}`);
  if (r.cards.indexOf(r.hero) !== -1) err('the hero guide is also on the Continue shelf');
  if (!/2 guides you follow/.test(r.head || '') || !/Manage/.test(r.head || '')) err(`Continue head: ${r.head}`);
  const next = await page.evaluate(() => { const G = window.MCU_GUIDE; return G.next(G.get('spider-man'), false, () => 'none').id; });
  await page.locator('.g-ccard').first().locator('.g-cta').click(); await page.waitForTimeout(600);
  if ((await states(page))[next] !== 'seen') err(`Continue's Mark seen did not mark ${next}`);
  // Manage opens the guide list.
  await page.locator('.g-manage').click(); await page.waitForTimeout(400);
  if (!(await page.locator('.g-switch-pop .g-sw-item').count())) err('Manage did not open the guide list');
  await page.keyboard.press('Escape');
  errors.forEach(e => err('shelf console: ' + e));
  await ctx.close();

  // 3. Auto-follow: a stop marked seen in the open guide follows it; the
  //    toast says so; Undo stops following and takes back the mark (Andre,
  //    2026-11-16: keeping it made Undo look broken).
  ({ ctx, page, errors } = await ctxPage(browser, DESK, seed({})));
  await page.goto(URL + '?view=list&guide=multiverse-saga'); await settle(page);
  await page.locator('.g-stop .tsa-btn').first().click(); await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ followed: window.MCU_GUIDE.isFollowed('multiverse-saga'), toast: (document.querySelector('.mcu-toast') || {}).innerText || '' }));
  out.autoFollow = r;
  if (!r.followed || !/Following/.test(r.toast)) err(`auto-follow: ${JSON.stringify(r)}`);
  await page.locator('.mcu-toast .mt-undo').click(); await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ followed: window.MCU_GUIDE.isFollowed('multiverse-saga'), seen: Object.values(JSON.parse(localStorage.getItem('mcu.collection.v1')).states).filter(v => v === 'seen').length }));
  out.undo = r;
  if (r.followed || r.seen !== 0) err(`Undo after auto-follow: ${JSON.stringify(r)}`);
  // A mark in Titles (no guide open) never follows a guide.
  await page.goto(URL + '?view=list'); await settle(page);
  await page.locator('.dl-row .tsa-btn').first().click(); await page.waitForTimeout(400);
  r = await page.evaluate(() => window.MCU_GUIDE.followed());
  if (r.length) err(`a mark in Titles followed ${JSON.stringify(r)}`);
  errors.forEach(e => err('auto-follow console: ' + e));
  await ctx.close();

  // 4. Finishing a followed guide stops following it.
  ({ ctx, page, errors } = await ctxPage(browser, DESK, ''));
  await page.goto(URL); await settle(page);
  const av = await page.evaluate(() => window.MCU_GUIDE.stops(window.MCU_GUIDE.get('avengers'), false).filter(s => window.MCU_isReleased(s.title)).map(s => s.id));
  await ctx.close();
  ({ ctx, page, errors } = await ctxPage(browser, DESK, seed(Object.fromEntries(av.slice(0, -1).map(id => [id, 'seen']))) + follow(['avengers'])));
  await page.goto(URL + '?view=list&guide=avengers'); await settle(page);
  const last = av[av.length - 1];
  await page.locator(`.g-stop[data-row-id="${last}"] .tsa-btn`).first().click(); await page.waitForTimeout(500);
  r = await page.evaluate(() => window.MCU_GUIDE.isFollowed('avengers'));
  if (r) err('finishing a followed guide did not stop following it');
  errors.forEach(e => err('finish console: ' + e));
  await ctx.close();

  // 5. Up next in Titles is the focused guide's next stop; with nothing
  //    followed, the list's own first unseen title.
  ({ ctx, page, errors } = await ctxPage(browser, DESK, seed({}) + follow(['spider-man'])));
  await page.goto(URL + '?view=list'); await settle(page);
  r = await page.evaluate(() => { const G = window.MCU_GUIDE; const want = G.next(G.get('spider-man'), false, () => 'none').title;
    return { want: window.MCU_I18N.titleName(want), card: (document.querySelector('.spatial-overall .un-mrow') || {}).innerText || '' }; });
  out.upNext = r;
  if (!r.card.includes(r.want)) err(`Up next with Spider-Man followed: ${JSON.stringify(r)}`);
  await page.evaluate(() => window.MCU_GUIDE.unfollow('spider-man')); await page.waitForTimeout(400);
  r = await page.evaluate(() => (document.querySelector('.spatial-overall .un-mrow') || {}).innerText || '');
  if (!/Iron Man/.test(r)) err(`Up next with nothing followed: ${r}`);
  errors.forEach(e => err('up next console: ' + e));
  await ctx.close();

  // 6. Phones: "Seen" on the Continue card, nothing past an edge (320, 390).
  for (const w of [320, 390]) {
    ({ ctx, page, errors } = await ctxPage(browser, { ...PHONE, viewport: { width: w, height: 844 } }, seed({}) + follow(['spider-man', 'multiverse-saga'])));
    await page.goto(URL + '?view=guides'); await settle(page);
    r = await page.evaluate(() => {
      const card = document.querySelector('.g-ccard');
      const b = card.getBoundingClientRect();
      return { cta: [...card.querySelectorAll('.g-cta span')].filter(s => s.getClientRects().length).map(s => s.textContent).join(''),
        hScroll: document.documentElement.scrollWidth > innerWidth,
        out: [...card.querySelectorAll('*')].filter(e => e.getClientRects().length && e.getBoundingClientRect().right > b.right + 0.5).length };
    });
    out['phone ' + w] = r;
    if (r.cta !== 'Seen' || r.hScroll || r.out) err(`phone ${w}: ${JSON.stringify(r)}`);
    errors.forEach(e => err(`phone ${w} console: ` + e));
    await ctx.close();
  }

  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
