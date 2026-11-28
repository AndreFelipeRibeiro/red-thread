// Dragging a card on desktop Connections (Notion "Connections: dragging a
// card by its poster starts the browser's image drag" and "Connections:
// smooth card dragging", 2026-11-28).
//   - Grabbed by its poster, a card follows every move: no native image
//     drag starts, the release is seen, and after it a move with no button
//     held leaves the card where it was dropped.
//   - The card's own lines follow it while it moves (each ends at the card's
//     center), and the drop keeps the card there.
//   - In a selected title's ring, dragging a card changes no other card's
//     state and no line's opacity on the way (hover is frozen while a card
//     is held).
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8405;
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { appReady } = require('./ready');

const S = __dirname;
const SITE = process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
// qa/serve-site.js wraps this and serves the built tree; the fallback below is
// for running the check by hand without it.
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL_BASE = 'http://127.0.0.1:' + QA_PORT + '/';
const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(NOWELCOME);
  const page = await ctx.newPage();
  const errors = [];
  const out = {};
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  const go = async (q) => { await page.goto(URL_BASE + q); await appReady(page, 600); };
  // Where a card is on screen: a point on its poster, and its center.
  const box = (id) => page.evaluate((id) => { const r = document.querySelector('.card[data-id="' + id + '"]').getBoundingClientRect(); return { px: r.left + r.width / 2, py: r.top + r.height * 0.35, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height }; }, id);
  const state = (id) => page.evaluate((id) => { const c = document.querySelector('.card[data-id="' + id + '"]'); return { dragging: c.classList.contains('dragging'), tf: c.style.transform }; }, id);

  // 1. Grabbed by the poster.
  await go('');
  await page.evaluate(() => { window.__ev = { dragstart: 0 }; addEventListener('dragstart', () => window.__ev.dragstart++, true); });
  const a = await box('avengers');
  await page.mouse.move(a.px, a.py); await page.waitForTimeout(150);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) { await page.mouse.move(a.px + i * 6, a.py + i * 3); await page.waitForTimeout(16); }
  await page.waitForTimeout(60);
  const mid = await box('avengers');
  // The card's lines end at its center (the canvas is scaled: compare on screen).
  const lineEnds = await page.evaluate(({ cx, cy }) => {
    let worst = 0, n = 0;
    document.querySelectorAll('path[data-a="avengers"], path[data-b="avengers"]').forEach(p => {
      const L = p.getTotalLength(); if (!L) return;
      const m = p.getScreenCTM();
      const end = p.getAttribute('data-a') === 'avengers' ? p.getPointAtLength(0) : p.getPointAtLength(L);
      const x = end.x * m.a + end.y * m.c + m.e, y = end.x * m.b + end.y * m.d + m.f;
      worst = Math.max(worst, Math.hypot(x - cx, y - cy)); n++;
    });
    return { n, worst: Math.round(worst) };
  }, mid);
  const off = Math.hypot((mid.px) - (a.px + 180), (mid.py) - (a.py + 90));
  out.poster = { dragstart: await page.evaluate(() => window.__ev.dragstart), offPointer: Math.round(off), lineEnds };
  if (out.poster.dragstart) errors.push('a poster grab started the browser\'s image drag');
  if (off > 3) errors.push('the card did not follow the pointer: ' + Math.round(off) + 'px off');
  if (!lineEnds.n || lineEnds.worst > 3) errors.push('the card\'s lines did not follow it: ' + JSON.stringify(lineEnds));
  await page.mouse.up(); await page.waitForTimeout(250);
  const dropped = await state('avengers');
  if (dropped.dragging) errors.push('the card is still dragging after the release');
  for (let i = 1; i <= 8; i++) { await page.mouse.move(a.px - i * 12, a.py + 220); await page.waitForTimeout(16); }
  await page.waitForTimeout(100);
  const after = await state('avengers');
  out.dropped = { dropped: dropped.tf, afterMove: after.tf };
  if (after.tf !== dropped.tf || after.dragging) errors.push('the card moved with no button held after the release: ' + JSON.stringify(out.dropped));
  // The drop is kept: a render (hovering another card) leaves it in place.
  const h = await box('iron-man');
  await page.mouse.move(h.px, h.py); await page.waitForTimeout(200); await page.mouse.move(5, 500); await page.waitForTimeout(200);
  if ((await state('avengers')).tf !== dropped.tf) errors.push('the dropped card did not keep its place after a render');

  // 2. In a selected title's ring, a drag disturbs nothing else.
  await go('?title=what-if'); await page.waitForTimeout(900);
  const r = await box('avengers');
  await page.mouse.move(r.px, r.py); await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.move(r.px + 5, r.py + 5); await page.waitForTimeout(60);
  await page.evaluate(() => {
    window.__mut = { cards: 0, lines: 0 };
    window.__mo = new MutationObserver(list => list.forEach(m => {
      const el = m.target;
      if (el.classList && el.classList.contains('card') && m.attributeName === 'class' && el.getAttribute('data-id') !== 'avengers') window.__mut.cards++;
      if (el.tagName === 'path' && m.attributeName !== 'd') window.__mut.lines++;
    }));
    window.__mo.observe(document.querySelector('.canvas'), { subtree: true, attributes: true });
  });
  for (let i = 1; i <= 40; i++) { await page.mouse.move(r.px + 5 + i * 9, r.py + 5 + Math.sin(i / 4) * 120); await page.waitForTimeout(16); }
  const ring = out.ring = await page.evaluate(() => { window.__mo.disconnect(); return window.__mut; });
  await page.mouse.up(); await page.waitForTimeout(200);
  if (ring.cards || ring.lines) errors.push('dragging in the ring changed other cards or lines: ' + JSON.stringify(ring));

  console.log(JSON.stringify({ ...out, errors }, null, 1));
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
