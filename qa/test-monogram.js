// The poster fallback (Notion "Replace the poster fallback art with something
// less generic", A · Monogram), with every poster image blocked:
// - the initials rule across the whole catalogue (the table below is the
//   reviewed result; a change to the rule or a new title shows up here);
// - no generated shapes left (no SVG art in a poster box);
// - each fallback is an image named after its title, its initials and year
//   hidden from screen readers; its colour is a fixed palette hue per title
//   (Andre, 2026-11-16), never the same as its release-order neighbour's;
// - the year shows on a large poster and hides under 64px (list thumbnails);
// - desktop canvas, Titles list and phone list, in light and dark.
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
const PORT = +process.env.PORT || 8253;
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
    if (/image\.tmdb\.org/.test(u)) return route.abort();
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  return { ctx, page, errors };
}
const settle = (page) => require('./ready').appReady(page, 1000);
const seed = (states) => `localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: ${JSON.stringify(states)} }));`;

const WANT = {"iron-man":"IM","incredible-hulk":"IH","iron-man-2":"IM2","thor":"T","cap-first-avenger":"CA","avengers":"A","iron-man-3":"IM3","thor-dark-world":"TD","cap-winter-soldier":"CA","gotg":"GG","aou":"AA","ant-man":"AM","civil-war":"CA","doctor-strange":"DS","gotg-2":"GG2","homecoming":"SM","thor-ragnarok":"TR","black-panther":"BP","infinity-war":"AI","ant-man-wasp":"AMW","captain-marvel":"CM","endgame":"AE","far-from-home":"SM","wandavision":"WV","falcon-winter":"FWS","loki-s1":"L","black-widow":"BW","what-if":"WI","shang-chi":"SCL","eternals":"E","hawkeye":"H","no-way-home":"SM","ms-marvel":"MM","multiverse-madness":"DSI","thor-love":"TL","moon-knight":"MK","she-hulk":"SH","wakanda-forever":"BP","quantumania":"AMW","gotg-3":"GG3","secret-invasion":"SI","loki-s2":"L2","marvels":"M","what-if-s2":"WI2","echo":"E","deadpool-3":"DW","agatha":"AAA","what-if-s3":"WI3","friendly-spidey":"YFN","cap-brave":"CA","daredevil-born-again":"DB","thunderbolts":"T","ironheart":"I","fantastic-four":"FF","eyes-of-wakanda":"EW","marvel-zombies":"MZ","wonder-man":"WM","daredevil-born-again-s2":"DB2","brand-new-day":"SM","visionquest":"VQ","friendly-spidey-s2":"YF2","doomsday":"AD","daredevil-born-again-s3":"DB3","secret-wars":"AS"};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = { errors: [] };
  const err = (m) => out.errors.push(m);
  for (const [label, opts, init, url] of [
    ['desktop canvas', DESK, '', ''], ['desktop list dark', DESK, "localStorage.setItem('mcu.theme','dark');", '?view=list'],
    ['phone list', PHONE, '', '?view=list'],
  ]) {
    const { ctx, page, errors } = await ctxPage(browser, opts, seed({}) + init);
    await page.goto(URL + url); await settle(page); await page.waitForTimeout(1200);
    const r = await page.evaluate((want) => {
      const titles = window.TITLES;
      const rule = titles.filter(t => window.MCU_monogram(t.title) !== want[t.id]).map(t => `${t.id}: ${window.MCU_monogram(t.title)} (want ${want[t.id]})`);
      const missing = titles.filter(t => !(t.id in want)).map(t => t.id);
      const monos = [...document.querySelectorAll('.poster-mono')];
      const svgs = document.querySelectorAll('.card-poster > svg, .m-lthumb > svg, .poster-mono svg, [class*="thumb"] > svg').length;
      const named = monos.filter(m => m.getAttribute('role') === 'img' && m.getAttribute('aria-label')).length;
      const hiddenText = monos.filter(m => [...m.querySelectorAll('span')].every(s => s.closest('[aria-hidden="true"]'))).length;
      const yearShown = (m) => { const y = m.querySelector('.poster-mono-year'); return !!(y && y.getClientRects().length && getComputedStyle(y).display !== 'none'); };
      const small = monos.filter(m => m.getBoundingClientRect().width > 0 && m.getBoundingClientRect().width < 64 && yearShown(m)).length;
      // Colour (Andre, 2026-11-16): a hue from a fixed palette per title, so
      // titles next to each other in release order never share one, and the
      // same title always gets the same hue (every fallback of it agrees).
      const hueOf = new Map();
      let disagree = 0;
      monos.forEach(m => { const h = m.style.getPropertyValue('--mh'); const k = m.getAttribute('aria-label');
        if (hueOf.has(k) && hueOf.get(k) !== h) disagree++; hueOf.set(k, h); });
      const order = window.TITLES.map(t => hueOf.get(window.MCU_I18N.titleName(t))).filter(Boolean);
      const sameNext = order.filter((h, i) => i && h === order[i - 1]).length;
      const bg = monos[0] ? getComputedStyle(monos[0]).backgroundColor : '';
      return { rule, missing, monos: monos.length, svgs, named, hiddenText, small,
        colourOk: hueOf.size > 0 && [...hueOf.values()].every(h => /^\d+$/.test(h.trim())) && !disagree && !sameNext && new Set(hueOf.values()).size >= 8 && !/rgba?\(0, 0, 0, 0\)/.test(bg),
        hues: new Set(hueOf.values()).size, sameNext, disagree,
        imgs: document.querySelectorAll('.poster-image-wrap img').length };
    }, WANT);
    out[label] = { ...r, rule: r.rule.length, missing: r.missing.length };
    if (r.rule.length) err(`initials: ${r.rule.join('; ')}`);
    if (r.missing.length) err(`titles with no reviewed initials: ${r.missing.join(', ')}`);
    if (!r.monos) err(`${label}: no fallback posters with images blocked`);
    if (r.svgs) err(`${label}: ${r.svgs} generated SVG shapes in poster boxes`);
    if (r.named !== r.monos) err(`${label}: ${r.monos - r.named} fallbacks without an image name`);
    if (r.hiddenText !== r.monos) err(`${label}: initials or year read out`);
    if (r.small) err(`${label}: the year shows on ${r.small} posters under 64px`);
    if (!r.colourOk) err(`${label}: fallback colours: ${r.hues} hues, ${r.sameNext} neighbours alike, ${r.disagree} titles in two colours`);
    errors.forEach(e => err(`${label} console: ` + e));
    await ctx.close();
  }
  // The year on a large poster: the details drawer's 66px thumbnail.
  {
    const { ctx, page } = await ctxPage(browser, DESK, seed({}));
    await page.goto(URL + '?title=iron-man'); await settle(page); await page.waitForTimeout(900);
    const r = await page.evaluate(() => { const m = document.querySelector('.td-thumb .poster-mono'); const y = m && m.querySelector('.poster-mono-year');
      return { w: m ? Math.round(m.getBoundingClientRect().width) : 0, year: !!(y && getComputedStyle(y).display !== 'none'), text: y && y.textContent }; });
    out.details = r;
    if (r.w >= 64 && !r.year) err(`the year is hidden on a ${r.w}px poster`);
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
