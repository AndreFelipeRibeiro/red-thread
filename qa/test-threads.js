// Character threads and lit cards agree (Notion V4 Tasks, "Re-check all the
// title and character connections"). The rule: every lit line ends in two lit
// cards, and the banner's count is the number of cards lit.
//   - Hovering any character (every character, from a title it is in) in the
//     default view, with a phase filter on, and with its title selected.
//   - Pinning each character that has variants, and each performer who plays
//     more than one of them (a performer pin lights their own titles).
//   - A variant lights its whole identity thread: hovering Captain Carter
//     lights Avengers: Doomsday (Peggy), the ticket's own example.
//   - No Way Home's line on to Your Friendly Neighborhood Spider-Man is
//     Holland's Peter, not whichever Peter the cast lists first.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8301;
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

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
const DESK = { viewport: { width: 1440, height: 900 } };

// What is lit right now: the emphasised lines whose ends are not lit cards,
// the number of lit cards, and the count the banner gives.
const lit = (prime, ch) => {
  const primeOf = (id) => (window.CHARACTERS[id] && window.CHARACTERS[id].prime) || id;
  const card = (id) => document.querySelector('.card[data-id="' + id + '"]');
  const isLit = (el) => !!el && el.classList.contains('highlighted') && !el.classList.contains('dimmed') && !el.classList.contains('ring-hidden');
  const lines = [...document.querySelectorAll('path[data-em="1"][data-ch]')];
  const bad = [];
  lines.forEach(l => {
    const a = l.getAttribute('data-a'), b = l.getAttribute('data-b'), ch = l.getAttribute('data-ch');
    if (!isLit(card(a)) || !isLit(card(b))) bad.push(ch + ' ' + a + '→' + b);
    if (prime && primeOf(ch) !== prime) bad.push('off-thread ' + ch + ' ' + a + '→' + b);
  });
  const sub = (document.querySelector('.char-card .cb-sub') || {}).textContent || '';
  const m = sub.match(/(\d+)\s*\S*\s*$/);
  return {
    lines: lines.length, bad,
    cards: document.querySelectorAll('.card.highlighted:not(.dimmed)').length,
    count: m ? +m[1] : null,
    // A part several people played: the banner names one of them and gives
    // that performer's own count (the Mike McGill rule), not the cards lit.
    shared: !!ch && ((window.MCU_creditRoster()[ch] || []).length > 1),
    litIds: [...document.querySelectorAll('.card.highlighted:not(.dimmed)')].map(c => c.getAttribute('data-id')),
  };
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = { hovers: 0, pins: 0 };
  const ctx = await browser.newContext(DESK);
  await ctx.addInitScript(NOWELCOME);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await ctx.addInitScript('window.__lit = ' + JSON.stringify(lit.toString()) + ';');
  const go = async (q) => { await page.goto(URL_BASE + q); await require('./ready').appReady(page, 300); };

  // Titles that between them hold every character, and the variant identities.
  await go('');
  const plan = await page.evaluate(() => {
    const primeOf = (id) => (window.CHARACTERS[id] && window.CHARACTERS[id].prime) || id;
    const left = new Set(); window.TITLES.forEach(t => t.cast.forEach(c => window.CHARACTERS[c] && left.add(c)));
    const cover = [];
    while (left.size) {
      let best = null, n = 0;
      window.TITLES.forEach(t => { const k = t.cast.filter(c => left.has(c)).length; if (k > n) { best = t; n = k; } });
      cover.push({ id: best.id, phase: best.phase }); best.cast.forEach(c => left.delete(c));
    }
    const varied = new Set();
    Object.entries(window.CHARACTERS).forEach(([id, c]) => { if (c.prime) { varied.add(id); varied.add(c.prime); } });
    const home = {};
    varied.forEach(c => { const t = window.TITLES.find(x => x.cast.indexOf(c) !== -1); if (t) home[c] = t.id; });
    const variantTitles = [...new Set(window.TITLES.filter(t => t.cast.some(c => varied.has(c))).map(t => t.id))];
    return { cover, varied: [...varied], home, variantTitles, primes: Object.fromEntries([...varied].map(c => [c, primeOf(c)])) };
  });
  out.coverTitles = plan.cover.length;

  const primeOf = (c) => plan.primes[c] || c;
  const hoverAll = async (label) => {
    const rows = await page.locator('.drawer.open .cast-row').all();
    for (const row of rows) {
      const ch = await row.getAttribute('data-char');
      await row.hover();
      await page.waitForTimeout(40);
      const r = await page.evaluate(([p, c]) => (0, eval)('(' + window.__lit + ')')(p, c), [plan.primes[ch] || null, ch]);
      out.hovers++;
      if (r.bad.length) errors.push(label + ', hover ' + ch + ': lit line into a dim card: ' + r.bad.slice(0, 3).join(', '));
      if (r.count !== null && !r.shared && r.count !== r.cards) errors.push(label + ', hover ' + ch + ': banner says ' + r.count + ', ' + r.cards + ' cards lit');
    }
    await page.mouse.move(5, 450);
  };

  // Every character, hovered, in the default view.
  for (const t of plan.cover) { await go('?title=' + t.id); await hoverAll('default ' + t.id); }
  // With a phase filter, and with the title selected, for the titles with variants.
  for (const id of plan.variantTitles) {
    const ph = plan.cover.find(x => x.id === id) ? plan.cover.find(x => x.id === id).phase : null;
    const phase = ph || await page.evaluate((i) => window.TITLES.find(t => t.id === i).phase, id);
    await go('?phase=' + phase + '&title=' + id); await hoverAll('phase ' + phase + ' ' + id);
    await go('?title=' + id);
    // The card's own button, pressed directly: zoomed out, the poster art of a
    // neighbour can sit over it, and this is about the selection, not the hit.
    await page.locator('.card[data-id="' + id + '"] .card-open').evaluate(b => b.click()); await page.waitForTimeout(900);
    await hoverAll('selected ' + id);
  }

  // Pinning each character that has variants.
  for (const c of plan.varied) {
    await go('?title=' + plan.home[c]);
    await page.locator('.drawer.open .cast-row[data-char="' + c + '"]').click(); await page.waitForTimeout(300);
    // (Desktop Connections: the cast already opens the character view, pinned,
    // since the character view landed; the pin is only there elsewhere.)
    if (await page.locator('.drawer.open .trail-pin').count()) await page.locator('.drawer.open .trail-pin').click();
    await page.waitForTimeout(900);
    const r = await page.evaluate(([p, x]) => (0, eval)('(' + window.__lit + ')')(p, x), [primeOf(c), c]);
    out.pins++;
    if (!(await page.locator('.char-card').count())) errors.push('pin ' + c + ': no pinned banner');
    if (r.bad.length) errors.push('pin ' + c + ': lit line into a dim card: ' + r.bad.slice(0, 3).join(', '));
    if (!r.shared && r.count !== r.cards) errors.push('pin ' + c + ': banner says ' + r.count + ', ' + r.cards + ' cards lit');
    const want = await page.evaluate((p) => window.TITLES.filter(t => t.cast.some(x => ((window.CHARACTERS[x] && window.CHARACTERS[x].prime) || x) === p)).length, primeOf(c));
    if (r.cards !== want) errors.push('pin ' + c + ': ' + r.cards + ' cards lit, its identity has ' + want + ' titles');
  }
  // Performers who play more than one variant: their own titles, nothing more.
  for (const name of ['Hayley Atwell', 'Jonathan Majors']) {
    await go('');
    await page.locator('.search-wrap input').fill(name); await page.waitForTimeout(250);
    const item = page.locator('.ss-item', { has: page.locator('.ss-main', { hasText: name }) }).first();
    if (!(await item.count())) { errors.push('performer ' + name + ': no suggestion'); continue; }
    await item.click(); await page.waitForTimeout(900);
    const r = await page.evaluate(lit, null);
    out.pins++;
    out['performer ' + name] = { lines: r.lines, cards: r.cards };
    if (r.bad.length) errors.push('performer ' + name + ': lit line into a dim card: ' + r.bad.slice(0, 3).join(', '));
    if (!r.lines) errors.push('performer ' + name + ': no line lit');
  }

  // The ticket's example: What If…? in By Phase, hover Captain Carter.
  await go('?sort=phase&title=what-if');
  await page.locator('.drawer.open .cast-row[data-char="captain-carter"]').hover(); await page.waitForTimeout(80);
  {
    const r = await page.evaluate(lit, 'peggy');
    out.example = { cards: r.cards, lines: r.lines };
    if (r.litIds.indexOf('doomsday') === -1) errors.push('example: hovering Captain Carter leaves Avengers: Doomsday dim');
    const toDoom = await page.locator('path[data-em="1"][data-b="doomsday"], path[data-em="1"][data-a="doomsday"]').count();
    if (!toDoom) errors.push('example: no lit line into Avengers: Doomsday');
  }
  // No Way Home → Your Friendly Neighborhood Spider-Man is Holland's Peter.
  // On the canvas with nothing selected: a selected title's ring draws only
  // its own lines (Notion "Connections: a selected title's ring, legible at
  // first sight").
  await go('?sort=phase');
  {
    const chs = await page.$$eval('path[data-a="no-way-home"][data-b="friendly-spidey"]', ps => ps.map(p => p.getAttribute('data-ch')));
    out.nwhLine = chs;
    if (chs.join() !== 'peter') errors.push('No Way Home → Friendly Spider-Man labelled ' + JSON.stringify(chs) + ', expected Holland\'s Peter');
    await go('?title=no-way-home');
    await page.locator('.drawer.open .cast-row[data-char="peter"]').hover(); await page.waitForTimeout(80);
    const em = await page.locator('path[data-em="1"][data-a="no-way-home"][data-b="friendly-spidey"]').count();
    if (!em) errors.push('hovering Holland\'s Peter does not light No Way Home → Friendly Spider-Man');
    // A selected title's lines are drawn quiet, as a pinned character's and a
    // guide's are: no halo, glow or end dots (Notion "Connections: a selected
    // title's lines drop the glow").
    await page.mouse.move(5, 5); await page.waitForTimeout(80);
    const q = out.selectedQuiet = await page.evaluate(() => ({ lit: document.querySelectorAll('path[data-em="1"]').length,
      glow: document.querySelectorAll('.connection-layer [filter], svg [filter^="url(#"]').length,
      // One even, thin width: the spokes no longer thicken with shared characters.
      widths: [...new Set([...document.querySelectorAll('path[data-em="1"]')].map(p => p.getAttribute('stroke-width')))] }));
    if (!q.lit || q.glow) errors.push('a selected title\'s lines should be lit with no glow: ' + JSON.stringify(q));
    if (q.widths.join() !== '2') errors.push('a selected title\'s lines should all be 2px: ' + JSON.stringify(q.widths));
  }

  console.log(JSON.stringify({ ...out, errors }, null, 1));
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
