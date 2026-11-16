// "Part of" in the details (V3 Tasks, "Make 'Part of' a collapsible section in
// the details, closed while a guide is open"):
// - a DetailSection with a count in its label and a real button heading, on
//   the desktop drawer and the phone sheet;
// - open when the details come from anywhere but a guide, closed while a guide
//   is open; each context keeps its own state for the visit, a reload restores
//   the defaults;
// - titles in no guide show no section; rows still open their guide;
// - Enter and Space toggle; Portuguese label.
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
const PORT = +process.env.PORT || 8232;
const URL = `http://127.0.0.1:${PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function ctxPage(browser, opts, lang) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + (lang ? "localStorage.setItem('mcu.lang.v1','" + lang + "');" : ''));
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
// The section in the open details (drawer or sheet).
const PART = () => {
  const root = document.querySelector('.drawer.open, .m-sheet');
  const sec = root && root.querySelector('.td-acc-guides');
  if (!sec) return { present: false, title: root && (root.querySelector('#drawer-title, .td-title, h2') || {}).textContent };
  const btn = sec.querySelector('.td-acc-btn');
  const body = sec.querySelector('.td-acc-body');
  return {
    present: true,
    title: (root.querySelector('#drawer-title, .td-title, h2') || {}).textContent,
    label: btn.textContent.trim(),
    isButton: btn.tagName === 'BUTTON',
    expanded: btn.getAttribute('aria-expanded'),
    controls: body && btn.getAttribute('aria-controls') === body.id,
    rowsVisible: [...sec.querySelectorAll('.g-partof-row')].filter(r => r.getClientRects().length).length,
  };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- Desktop -----------------------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK);
    // From the List, no guide: open.
    await page.goto(URL + '?view=list&title=loki-s2'); await settle(page);
    let p = await page.evaluate(PART);
    out.deskList = p;
    expect(p.present && p.isButton && p.controls, `desktop List: ${JSON.stringify(p)}`);
    expect(p.expanded === 'true' && p.rowsVisible >= 1, `desktop List: not open: ${JSON.stringify(p)}`);
    expect(/^Part of · \d+ guides?$/.test(p.label || ''), `desktop label "${p.label}"`);
    // Inside the Doomsday guide: closed.
    await page.goto(URL + '?view=list&guide=before-doomsday&title=loki-s2'); await settle(page);
    p = await page.evaluate(PART);
    out.deskGuide = p;
    expect(p.present && p.expanded === 'false' && p.rowsVisible === 0, `in a guide: not closed: ${JSON.stringify(p)}`);
    // Open it in the guide (Enter), step to the next stop: still open.
    await page.locator('.drawer .td-acc-guides .td-acc-btn').focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    p = await page.evaluate(PART);
    expect(p.expanded === 'true', 'Enter did not open it');
    // The next stop: → steps the guide (the list has no stepper buttons since
    // Notion "Guides 3/4"; the keys still step).
    await page.locator('body').press('ArrowRight'); await page.waitForTimeout(700);
    p = await page.evaluate(PART);
    out.deskGuideNext = p;
    expect(p.present && p.title !== 'Loki: Season 2' && p.expanded === 'true', `the in-guide choice did not hold on the next stop: ${JSON.stringify(p)}`);
    // Close the guide: the other context's default (open) is back.
    // (Closing it leaves the Guides tab on its gallery; Endgame is in My list.)
    await page.locator('.g-desk .g-back').click(); await page.waitForTimeout(500);
    await page.locator('.nav-tabs button', { hasText: 'Titles' }).click(); await page.waitForTimeout(600);
    await page.locator('.dl-row[data-row-id="endgame"] .dl-open').click(); await page.waitForTimeout(700);
    p = await page.evaluate(PART);
    expect(p.present && p.expanded === 'true', `outside the guide it should be open: ${JSON.stringify(p)}`);
    // Close it outside (Space); the in-guide state is untouched (still open).
    await page.locator('.drawer .td-acc-guides .td-acc-btn').focus();
    await page.keyboard.press('Space'); await page.waitForTimeout(300);
    p = await page.evaluate(PART);
    expect(p.expanded === 'false', 'Space did not close it');
    await page.locator('.nav-tabs button', { hasText: 'Guides' }).click(); await page.waitForTimeout(400);
    await page.locator('.g-page .g-row').first().click(); await page.waitForTimeout(700);
    // The second stop: the first (Endgame) has its details open already, and a
    // click on an open title closes it.
    await page.locator('.g-desk .g-stop[data-row-id]:not(.dest) .g-open').nth(1).click(); await page.waitForTimeout(700);
    p = await page.evaluate(PART);
    out.deskGuideAgain = p;
    expect(p.present && p.expanded === 'true', `the in-guide state changed when the other was toggled: ${JSON.stringify(p)}`);
    // A reload restores the defaults.
    await page.goto(URL + '?view=list&title=endgame'); await settle(page);
    p = await page.evaluate(PART);
    expect(p.expanded === 'true', `after a reload, outside a guide: ${JSON.stringify(p)}`);
    // A title in no guide: no section (found from the data, since Guides 4/4
    // put The Incredible Hulk in one).
    const lone = await page.evaluate(() => { const inGuide = new Set(window.GUIDES.flatMap(g => g.stops.map(s => s.id).concat(g.target ? [g.target] : [])));
      const t = window.TITLES.find(x => !inGuide.has(x.id)); return t ? t.id : null; });
    out.lone = lone;
    if (lone) {
      await page.goto(URL + '?view=list&title=' + lone); await settle(page);
      p = await page.evaluate(PART);
      expect(!p.present, `a title in no guide (${lone}) shows a Part of section`);
    }
    // A row still opens its guide.
    await page.goto(URL + '?view=list&title=loki-s2'); await settle(page);
    await page.locator('.drawer .g-partof-row').first().click(); await page.waitForTimeout(700);
    const g = await page.evaluate(() => new URLSearchParams(location.search).get('guide'));
    expect(!!g, 'a Part of row did not open its guide');
    errors.push(...e);
    await ctx.close();
  }

  // ---- Phone sheet ----------------------------------------------------------------
  for (const [q, want] of [['?view=list', 'true'], ['?view=list&guide=before-doomsday', 'false']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE);
    await page.goto(URL + q); await settle(page);
    const row = q.includes('guide') ? '.g-stop[data-row-id="loki-s2"] .g-open' : '.m-lrow[data-row-id="loki-s2"] .m-lrow-open';
    await page.evaluate((s) => { const r = document.querySelector(s); if (r) r.scrollIntoView({ block: 'center' }); }, row);
    await page.locator(row).tap(); await page.waitForTimeout(900);
    const p = await page.evaluate(PART);
    out['phone' + (q.includes('guide') ? 'Guide' : 'List')] = p;
    expect(p.present && p.isButton && p.expanded === want, `phone ${q}: ${JSON.stringify(p)}`);
    errors.push(...e);
    await ctx.close();
  }

  // ---- Portuguese --------------------------------------------------------------
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, 'pt-BR');
    await page.goto(URL + '?view=list&title=loki-s2'); await settle(page);
    const p = await page.evaluate(PART);
    expect(/^Faz parte de · \d+ guias?$/.test(p.label || ''), `pt-BR label "${p.label}"`);
    errors.push(...e);
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
