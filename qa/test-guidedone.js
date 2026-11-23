// A completed guide as the library's v2 draws it (Notion "Guide complete v2
// in code: the guide card's seen mark, and "Guide complete" said once in the
// guide header", 2026-11-22):
// - the guide card's "All N seen" has the seen mark in front: a 16px circle
//   in the seen color with the check in seen-foreground, light and dark;
// - the guide header of a guide with no done line (Thor) reads only "You've
//   seen every essential stop." (the eyebrow already says Guide complete),
//   desktop and phone, English and Portuguese; a guide with a done line
//   (Before Doomsday) keeps it bold in front.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8247; // regress/quick give each check its own port
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
const BASE = `http://127.0.0.1:${QA_PORT}/`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

async function open(browser, opts, { lang = 'en', theme = 'light', url }) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript("if (!sessionStorage.getItem('qa-seeded')) { sessionStorage.setItem('qa-seeded', '1');"
    + "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.lang.v1'," + JSON.stringify(lang) + ");localStorage.setItem('mcu.theme'," + JSON.stringify(theme) + ");"
    + "localStorage.setItem('mcu.promoted.v1', JSON.stringify((window.GUIDES || []).map(g => g.id)));}");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1') ? route.continue() : route.abort()));
  await page.clock.setFixedTime(new Date('2026-11-22T12:00:00'));
  await page.goto(BASE + url);
  await appReady(page);
  // Every essential stop of Thor's and Before Doomsday's guides seen.
  await page.evaluate(() => ['thor', 'before-doomsday'].forEach(id => {
    window.MCU_GUIDE.stops(window.MCU_GUIDE.get(id), false).forEach(s => window.MCU_COLLECTION.setStatus(s.id, 'seen'));
  }));
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}

const readHeader = () => {
  const p = document.querySelector('.g-head .g-ready');
  return p && { text: p.textContent.trim(), bold: p.querySelector('b') ? p.querySelector('b').textContent.trim() : null };
};
const readCard = (name) => {
  const card = [...document.querySelectorAll('.g-gcard.done')].find(c => c.querySelector('.g-card-open').textContent === name);
  if (!card) return null;
  const mark = card.querySelector('.g-card-seen');
  const probe = (v) => { const s = document.createElement('span'); s.style.color = `var(${v})`; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
  const cs = mark && getComputedStyle(mark);
  const svg = mark && mark.querySelector('svg');
  return mark && {
    size: [Math.round(mark.getBoundingClientRect().width), Math.round(mark.getBoundingClientRect().height)],
    round: cs.borderRadius, bgSeen: cs.backgroundColor === probe('--seen'), fgSeen: cs.color === probe('--seen-foreground'),
    check: svg && Math.round(svg.getBoundingClientRect().width), label: mark.parentElement.textContent.trim(),
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = {};
  try {
    // The card's seen mark, light and dark.
    for (const theme of ['light', 'dark']) {
      const { ctx, page, errors: e } = await open(browser, DESK, { theme, url: '?view=guides' });
      const c = await page.evaluate(readCard, 'Thor');
      out['card_' + theme] = c;
      if (!c) errors.push(`${theme}: no completed Thor card with a seen mark`);
      else {
        if (c.size[0] !== 16 || c.size[1] !== 16 || !/^(50%|9999px|8px)$/.test(c.round) && parseFloat(c.round) < 8) errors.push(`${theme}: mark is ${c.size.join('×')}, radius ${c.round}`);
        if (!c.bgSeen || !c.fgSeen) errors.push(`${theme}: mark colors (seen ${c.bgSeen}, seen-foreground ${c.fgSeen})`);
        if (c.check !== 10) errors.push(`${theme}: check is ${c.check}px, expected 10`);
        if (!/^All \d+ seen$/.test(c.label)) errors.push(`${theme}: card label "${c.label}"`);
      }
      errors.push(...e.map(x => theme + ' console: ' + x));
      await ctx.close();
    }
    // The header, desktop and phone, English and Portuguese.
    const WANT = { en: { none: "You've seen every essential stop.", done: 'Ready for Doomsday.' }, 'pt-BR': { none: 'Você viu todas as paradas essenciais.' } };
    for (const [label, opts, lang] of [['desk-en', DESK, 'en'], ['phone-en', PHONE, 'en'], ['desk-pt', DESK, 'pt-BR'], ['phone-pt', PHONE, 'pt-BR']]) {
      const { ctx, page, errors: e } = await open(browser, opts, { lang, url: '?view=guides&guide=thor' });
      const h = await page.evaluate(readHeader);
      out['thor_' + label] = h;
      if (!h || h.text !== WANT[lang].none || h.bold) errors.push(`${label}: Thor's header reads ${JSON.stringify(h)}`);
      if (lang === 'en') {
        await page.goto(BASE + '?view=guides&guide=before-doomsday'); await appReady(page); await page.waitForTimeout(300);
        const d = await page.evaluate(readHeader);
        out['doomsday_' + label] = d;
        if (!d || d.bold !== WANT.en.done || d.text !== WANT.en.done + ' ' + WANT.en.none) errors.push(`${label}: Before Doomsday's header reads ${JSON.stringify(d)}`);
      }
      errors.push(...e.map(x => label + ' console: ' + x));
      await ctx.close();
    }
  } catch (e) {
    errors.push('crash: ' + e.message);
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify({ ...out, errors }, null, 1));
  process.exit(errors.length ? 1 : 0);
})();
