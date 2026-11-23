// A long title never overflows the guide promo's Continue button (Notion
// "Guide promo: a long title must never overflow the Continue button",
// 2026-11-23: "Continue: Shang-Chi and the Legend of the Ten Rings" ran past
// both edges of the button on a phone). At 320 and 390px phones and on
// desktop, in English and Portuguese:
// - the promo as offered (Before Doomsday, Shang-Chi next) fits;
// - then the real button is given the Continue label of every title in the
//   catalog, at full length (the promo shortens "Name: Subtitle" titles, so
//   the full name is the worst case), plus one unbreakable 60-letter word:
//   nothing shows outside the button, and the button never spills out of the
//   sheet or dialog (a label too long for three lines ends in an ellipsis);
// - the label as the promo really shows it (MCU_GUIDE.coverName, the short
//   name) fits whole, in three lines at most, for every title;
// - every other button in the promo fits its own label.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8248; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
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
const SIZES = {
  p320: { viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true },
  p390: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  desk: { viewport: { width: 1440, height: 900 } },
};

async function open(browser, opts, lang) {
  const ctx = await browser.newContext(opts);
  // The app offers no promotion to automated browsers; look like a person.
  await ctx.addInitScript("Object.defineProperty(navigator, 'webdriver', { get: () => false });"
    + "if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.lang.v1'," + JSON.stringify(lang) + ");"
    + "localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: { endgame: 'seen' } }));}");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1') ? route.continue() : route.abort()));
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00'));
  await page.goto(URL);
  await appReady(page);
  await page.waitForSelector('.gp .gp-go-label', { timeout: 8000 });
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}

// Gives the real Continue button each label in turn and measures it.
const measure = () => {
  const I = window.MCU_I18N;
  const go = document.querySelector('.gp .gp-go');
  const label = go.querySelector('.gp-go-label');
  const frame = go.closest('[role="dialog"]').getBoundingClientRect();
  const lineH = parseFloat(getComputedStyle(label).lineHeight);
  const fit = (text) => {
    label.textContent = text;
    const b = go.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    const clamped = label.scrollHeight > label.clientHeight + 1;
    const out = [];
    // A cut label's ellipsis sits in the clipped overflow; only what shows counts.
    if (!clamped && label.scrollWidth > label.clientWidth + 1) out.push(`label ${label.scrollWidth}px wide in ${label.clientWidth}px`);
    if (l.left < b.left - 0.5 || l.right > b.right + 0.5 || l.top < b.top - 0.5 || l.bottom > b.bottom + 0.5) out.push('label outside its button');
    if (b.left < frame.left - 0.5 || b.right > frame.right + 0.5) out.push(`button ${Math.round(b.left)}–${Math.round(b.right)} outside ${Math.round(frame.left)}–${Math.round(frame.right)}`);
    const lines = Math.round(l.height / lineH);
    if (lines > 3) out.push(`${lines} lines`);
    return { out, lines, clamped };
  };
  const before = { text: label.textContent, ...fit(label.textContent) };
  const all = Array.isArray(window.TITLES) ? window.TITLES : Object.values(window.TITLES);
  const bad = []; let wrapped = 0; const clamped = []; let longest = '';
  for (const t of all) {
    const full = fit(I.tr('guide.continue', { title: I.titleName(t) }));
    if (full.out.length) bad.push('full name of ' + I.titleName(t) + ': ' + full.out.join(', '));
    const text = I.tr('guide.continue', { title: window.MCU_GUIDE.coverName(t, true) });
    const r = fit(text);
    if (text.length > longest.length) longest = text;
    if (r.lines > 1) wrapped++;
    if (r.clamped) clamped.push(text);
    if (r.out.length) bad.push(text + ': ' + r.out.join(', '));
  }
  const word = fit(I.tr('guide.continue', { title: 'W'.repeat(60) }));
  if (word.out.length) bad.push('60-letter word: ' + word.out.join(', '));
  const start = fit(I.tr('guide.promoStart'));
  if (start.out.length) bad.push('Start: ' + start.out.join(', '));
  label.textContent = before.text;
  // Every other button in the promo fits its own label.
  const others = [...go.closest('[role="dialog"]').querySelectorAll('button')].filter(x => x !== go && x.offsetParent)
    .filter(x => x.scrollWidth > x.clientWidth + 1).map(x => (x.textContent || x.getAttribute('aria-label')).trim());
  return { before, titles: all.length, wrapped, clamped, bad, others, longest };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = {};
  try {
    for (const [size, opts] of Object.entries(SIZES)) {
      for (const lang of ['en', 'pt-BR']) {
        const label = size + '-' + lang;
        const { ctx, page, errors: e } = await open(browser, opts, lang);
        const r = await page.evaluate(measure);
        out[label] = { offered: r.before.text, lines: r.before.lines, titles: r.titles, wrapped: r.wrapped, longest: r.longest };
        if (!/Shang-Chi/.test(r.before.text)) errors.push(`${label}: the promo offered "${r.before.text}", not Shang-Chi next`);
        if (r.before.out.length) errors.push(`${label}: the offered label: ${r.before.out.join(', ')}`);
        if (r.titles < 50) errors.push(`${label}: only ${r.titles} titles in the catalog`);
        r.bad.forEach(b => errors.push(`${label}: ${b}`));
        if (r.clamped.length) errors.push(`${label}: too long for three lines: ${r.clamped.join(' | ')}`);
        r.others.forEach(b => errors.push(`${label}: button "${b}" overflows`));
        errors.push(...e.map(x => label + ' console: ' + x));
        await ctx.close();
      }
    }
  } catch (e) {
    errors.push('crash: ' + e.message);
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify({ ...out, errors }, null, 1));
  process.exit(errors.length ? 1 : 0);
})();
