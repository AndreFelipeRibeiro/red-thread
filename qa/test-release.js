const QA_PORT = +process.env.PORT || 8220; // regress/quick give each check its own port
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

// Release status: what the catalog knows about a title's release, shown at the
// precision it is known, and a released-only filter. Every expectation is worked
// out from the dates and today's date at run time, never from a fixed list of
// titles: Avengers: Doomsday stops being "upcoming" on 18 December 2026, and a
// check that named it would start failing that day.
const statusOf = `(t, today) => {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(t.release)) return 'expected';
  return t.release <= today ? 'released' : 'upcoming';
}`;

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {}; const errors = [];
  const { page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await go(page);

  // ---- The helper agrees with the dates ----------------------------------
  R.helper = await page.evaluate((fn) => {
    const statusOf = eval(fn);
    const today = window.todayISO();
    const wrong = [], counts = { released: 0, upcoming: 0, expected: 0 };
    window.TITLES.forEach((t) => {
      const want = statusOf(t, today);
      const got = window.MCU_I18N.release(t);
      counts[got.status] += 1;
      if (got.status !== want) wrong.push(`${t.id}: ${got.status}, expected ${want}`);
      // Precision: a month window must never print a day.
      if (want === 'expected' && got.date && /\b\d{1,2},|\b\d{1,2} de\b/.test(got.date)) wrong.push(`${t.id}: a month window printed as a day ("${got.date}")`);
      // The released status and the completion count must never disagree.
      if ((got.status === 'released') !== window.MCU_isReleased(t)) wrong.push(`${t.id}: status and completion count disagree`);
    });
    return { today, wrong, counts };
  }, statusOf);
  errors.push(...R.helper.wrong);
  if (!R.helper.counts.expected) errors.push('no month-window title in the catalog to exercise "expected"; add a case or drop this line');

  // ---- Badges: only titles that are not out yet --------------------------
  const badges = () => page.evaluate(() => ({
    canvas: document.querySelectorAll('.card .release-badge').length,
    released: [...document.querySelectorAll('.card')].filter(c => c.querySelector('.release-badge.released')).length,
  }));
  R.badges = await badges();
  const notOut = R.helper.counts.upcoming + R.helper.counts.expected;
  if (R.badges.canvas !== notOut) errors.push(`${R.badges.canvas} cards carry a release badge; ${notOut} titles are not out yet`);
  if (R.badges.released) errors.push('a released title carries a badge');

  // ---- The details line, for one title of each status --------------------
  R.details = await page.evaluate(async (fn) => {
    const statusOf = eval(fn);
    const today = window.todayISO();
    const out = {};
    for (const s of ['released', 'upcoming', 'expected']) {
      const t = window.TITLES.find(x => statusOf(x, today) === s);
      if (!t) continue;
      const card = [...document.querySelectorAll('.card')].find(c => c.textContent.includes(window.MCU_I18N.titleName(t)));
      if (!card) { out[s] = { error: 'no card for ' + t.id }; continue; }
      card.querySelector('button').click();
      await new Promise(r => setTimeout(r, 1300));
      const line = document.querySelector('.drawer.open .release-line');
      out[s] = { id: t.id, cls: line ? line.className : null, text: line ? line.textContent.replace(/\s+/g, ' ').trim() : null };
      document.querySelector('.drawer-close').click();
      await new Promise(r => setTimeout(r, 900));
    }
    return out;
  }, statusOf);
  Object.entries(R.details).forEach(([s, d]) => {
    if (d.error) errors.push(d.error);
    else if (!d.cls || !d.cls.includes(s)) errors.push(`the details for ${d.id} show "${d.cls}", expected the ${s} line`);
  });
  if (R.details.expected && !/not yet confirmed/.test(R.details.expected.text || '')) {
    errors.push(`an expected title does not say its day is unconfirmed: "${R.details.expected.text}"`);
  }

  // ---- Released only ----------------------------------------------------
  R.filter = await page.evaluate(async () => {
    const f = [...document.querySelectorAll('.toolbar button')].find(b => /Filters/.test(b.textContent));
    f.click();
    await new Promise(r => setTimeout(r, 500));
    // The panel is a popover rendered at the page root (shadcn pass 1/5), not
    // inside the toolbar.
    const opt = [...document.querySelectorAll('.toolbar button, .filters-pop button')].find(b => b.textContent.trim() === 'Released only');
    if (!opt) return { error: 'no Released only option in the Filters panel' };
    opt.click();
    await new Promise(r => setTimeout(r, 1800));
    const cards = document.querySelectorAll('.card').length;
    const badges = document.querySelectorAll('.card .release-badge').length;
    const chip = [...document.querySelectorAll('.ctx-chip')].find(c => /Released only/.test(c.textContent));
    const released = window.TITLES.filter(t => window.MCU_isReleased(t)).length;
    if (chip) chip.click();
    await new Promise(r => setTimeout(r, 1800));
    return { cards, badges, chip: !!chip, released, after: document.querySelectorAll('.card').length, total: window.TITLES.length };
  });
  if (R.filter.error) errors.push(R.filter.error);
  else {
    if (R.filter.cards !== R.filter.released) errors.push(`Released only left ${R.filter.cards} cards; ${R.filter.released} titles are released`);
    if (R.filter.badges) errors.push('Released only still shows titles with a release badge');
    if (!R.filter.chip) errors.push('Released only shows no chip to remove it by');
    if (R.filter.after !== R.filter.total) errors.push(`removing the chip left ${R.filter.after} of ${R.filter.total} cards`);
  }

  // ---- Portuguese --------------------------------------------------------
  R.pt = await page.evaluate((fn) => {
    const statusOf = eval(fn);
    window.MCU_I18N.setLang('pt-BR');
    const today = window.todayISO();
    const t = window.TITLES.find(x => statusOf(x, today) === 'released');
    const r = window.MCU_I18N.release(t);
    const text = window.MCU_I18N.tr('release.' + r.status, { date: r.date });
    window.MCU_I18N.setLang('en-US');
    return { id: t.id, text };
  }, statusOf);
  if (!/^Lançado em \d{1,2} de [a-zç]+ de \d{4}$/.test(R.pt.text)) errors.push(`Portuguese reads "${R.pt.text}" for ${R.pt.id}`);

  // ---- Phone: the filter sheet has the group, the sheet shows the line ----
  const { page: m } = await ctxPage(browser, MOBILE, "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');");
  await go(m);
  R.phone = await m.evaluate(async () => {
    const filt = document.querySelector('.m-topbar button[aria-label*="ilter"], button[aria-label*="Filters"], button[aria-label*="Filtros"]');
    if (!filt) return { error: 'no phone Filters button' };
    filt.click();
    await new Promise(r => setTimeout(r, 900));
    const group = [...document.querySelectorAll('.m-flab')].some(l => /^Release$/i.test(l.textContent.trim()));
    const opt = [...document.querySelectorAll('.m-chip')].some(c => c.textContent.trim() === 'Released only');
    return { group, opt };
  });
  if (R.phone.error) errors.push(R.phone.error);
  else if (!R.phone.group || !R.phone.opt) errors.push('the phone filter sheet has no Released only option');

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
