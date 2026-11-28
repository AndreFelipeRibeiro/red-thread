// The Guides page hero at narrow desktop widths (Notion "Guides page hero: the
// title is cut off at narrow desktop widths", 2026-11-28). Desktop starts at
// 900px; at 920px the strip of posters took its full width and left the
// intro column ~130px, so "Catch up before Avengers: Doomsday" wrapped to four
// lines and "Doomsday" ran under the posters ("Doomsda"), the blurb a sliver.
// With the clock fixed in Doomsday's lead-up, for the hero's widest strips
// (not started; followed with the next stop mid-guide, seven stops and the
// destination; complete, with the big release poster), in English and
// Portuguese, at 900, 960, 1024, 1100 and 1280px, Light and Dark:
// - no text in the intro (kicker, title, blurb, progress, About and the
//   countdown) is wider than its box or past the intro's right edge;
// - the intro ends before the strip starts (nothing hidden under a poster);
// - the intro column stays readable (at least 280px wide);
// - every poster in the strip sits wholly inside the hero (none clipped by
//   its rounded edge).
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8291; // regress/quick give each check its own port
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
const URL = `http://127.0.0.1:${QA_PORT}/?view=guides`;
const WIDTHS = [900, 960, 1024, 1100, 1280];
const TIME = '2026-11-28T12:00:00';
const GUIDE = ['infinity-war', 'endgame', 'loki-s1', 'shang-chi', 'no-way-home', 'multiverse-madness', 'wakanda-forever', 'loki-s2', 'deadpool-3', 'cap-brave', 'thunderbolts', 'fantastic-four'];
const MIN_INTRO = 280;
const STATES = [
  { name: 'not started', seen: [], followed: [] },
  { name: 'mid-guide', seen: GUIDE.slice(0, 5), followed: [{ id: 'before-doomsday', at: 1 }] },
  { name: 'complete', seen: GUIDE, followed: [{ id: 'before-doomsday', at: 1 }] },
];

async function open(browser, width, { seen, followed }, lang, theme) {
  const ctx = await browser.newContext({ viewport: { width, height: 1021 }, colorScheme: theme });
  const states = {};
  seen.forEach(id => { states[id] = 'seen'; });
  await ctx.addInitScript("localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');"
    + "localStorage.setItem('mcu.lang.v1'," + JSON.stringify(lang) + ");"
    + "localStorage.setItem('mcu.collection.v1', " + JSON.stringify(JSON.stringify({ version: 1, states })) + ");"
    + "localStorage.setItem('mcu.guidesFollowed.v1', " + JSON.stringify(JSON.stringify(followed)) + ");");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => (route.request().url().startsWith('http://127.0.0.1') ? route.continue() : route.abort()));
  await page.clock.setFixedTime(new Date(TIME));
  await page.goto(URL);
  await appReady(page);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  return { ctx, page, errors };
}

const measure = (minIntro) => {
  const hero = document.querySelector('.g-hero');
  if (!hero) return { problems: ['no hero'] };
  const intro = hero.querySelector('.g-hero-intro');
  const strip = hero.querySelector('.g-strip');
  const H = hero.getBoundingClientRect(), I = intro.getBoundingClientRect(), St = strip.getBoundingClientRect();
  const problems = [];
  const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const label = (el) => (el.className && typeof el.className === 'string' ? el.className.split(' ').find(c => /^g-/.test(c)) : '') || el.tagName.toLowerCase();
  // Text boxes in the intro: nothing wider than its box, nothing past the edge.
  const boxes = [intro, ...intro.querySelectorAll('*')].filter(el => vis(el) && !el.closest('.story-sr'));
  for (const el of boxes) {
    const r = el.getBoundingClientRect();
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      problems.push(`${label(el)} text is ${el.scrollWidth}px in a ${Math.round(r.width)}px box ("${el.textContent.trim().slice(0, 40)}")`);
    }
    if (r.right > I.right + 1) problems.push(`${label(el)} ends ${Math.round(r.right - I.right)}px past the intro ("${el.textContent.trim().slice(0, 40)}")`);
  }
  // Words longer than the title's line: a Range per text node catches a word
  // that overflows its inline box even when the box itself doesn't scroll.
  const title = hero.querySelector('.g-hero-title');
  const range = document.createRange(); range.selectNodeContents(title);
  for (const rr of range.getClientRects()) if (rr.right > I.right + 1) { problems.push(`a title line ends ${Math.round(rr.right - I.right)}px past the intro`); break; }
  // Same for the blurb.
  const blurb = hero.querySelector('.g-hero-blurb');
  if (blurb && vis(blurb)) {
    range.selectNodeContents(blurb);
    for (const rr of range.getClientRects()) if (rr.right > I.right + 1) { problems.push(`a blurb line ends ${Math.round(rr.right - I.right)}px past the intro`); break; }
  }
  const visibleStops = [...strip.querySelectorAll('.g-hstop')].filter(vis);
  const firstStop = visibleStops.length ? Math.min(...visibleStops.map(s => s.getBoundingClientRect().left)) : St.left;
  if (I.right > firstStop + 1) problems.push(`the intro runs ${Math.round(I.right - firstStop)}px under the first poster`);
  if (I.width < minIntro) problems.push(`the intro is ${Math.round(I.width)}px wide (under ${minIntro}px)`);
  for (const s of visibleStops) {
    const r = s.getBoundingClientRect();
    if (r.left < H.left - 1 || r.right > H.right + 1 || r.top < H.top - 1 || r.bottom > H.bottom + 1) { problems.push(`a poster (${s.getAttribute('aria-label') || 'next stop'}) is clipped by the hero's edge`); break; }
  }
  return {
    problems,
    intro: Math.round(I.width), strip: Math.round(St.width), hero: Math.round(H.width),
    titleLines: Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)),
    stops: visibleStops.length,
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = {};
  try {
    for (const lang of ['en', 'pt-BR']) {
      for (const st of STATES) {
        for (const w of WIDTHS) {
          for (const theme of (w === 900 || w === 1024 ? ['light', 'dark'] : ['light'])) {
            const { ctx, page, errors: e } = await open(browser, w, st, lang, theme);
            const r = await page.evaluate(measure, MIN_INTRO);
            const key = `${lang} ${st.name} ${w}${theme === 'dark' ? ' dark' : ''}`;
            out[key] = { intro: r.intro, strip: r.strip, titleLines: r.titleLines, stops: r.stops };
            const title = await page.evaluate(() => (document.querySelector('.g-hero-title') || {}).textContent);
            if (!/Doomsday|Doutor Destino/.test(title || '')) errors.push(`${key}: the hero is "${title}", not the Doomsday guide`);
            (r.problems || []).slice(0, 4).forEach(p => errors.push(`${key}: ${p}`));
            errors.push(...e.map(x => `${key} console: ${x}`));
            await ctx.close();
          }
        }
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
