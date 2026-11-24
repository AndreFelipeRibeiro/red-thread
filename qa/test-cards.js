// One title card (Notion "Cards: one card design at rest, selected and on the
// phone", after "Simplify the Spatial cards" and "Show posters uncropped at
// their standard 2:3 ratio"):
// - the poster is whole, at 2:3, its art untouched (no seen wash); its
//   top-left corner says how many titles it connects to, and at most one mark
//   sits in its top-right corner: a check in a circle once seen, or in a guide
//   the stop's mark, never both (Andre, 2026-11-15);
// - hovering only lifts the card (no band);
// - under the poster: the title, then one meta line (phase dot, then what the
//   sort or filter is about: the year, "Set in", a score, the budget, or
//   nothing); the connections count is the size of its ring;
// - selected, it is the same card at the same size, with no action row;
// - the phone's selected card is the same card, larger: the title at 15px or
//   more and the meta at 13px or more; a tap opens the details.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
process.env.PORT = process.env.PORT || '8312';
{
  const fs0 = require('fs');
  const base = fs0.readFileSync(__dirname + '/test-refocus.js', 'utf8');
  const me = fs0.readFileSync(__filename, 'utf8');
  eval(base.slice(0, base.indexOf('(async () => {')) + me.slice(me.indexOf('// ' + '---- body')));
}
return;
// ---- body

const CARD = (sel) => {
  const c = document.querySelector(sel);
  if (!c) return null;
  const poster = c.querySelector('.card-poster, .m-fp-poster');
  const pr = poster.getBoundingClientRect();
  // Anything painted over the art other than the art itself and the corner mark.
  const over = [...poster.querySelectorAll('*')].filter(e => !e.closest('.card-poster > :first-child, .m-fp-poster > :first-child, .card-mark, .card-conn-pill') && e.getClientRects().length
    && getComputedStyle(e).opacity !== '0' && getComputedStyle(e).visibility !== 'hidden');
  const mark = c.querySelector('.card-mark');
  const art = poster.querySelector(':scope > :first-child');
  const wash = getComputedStyle(poster, '::after').content;
  return {
    washed: (wash && wash !== 'none' && wash !== 'normal') || /saturate/.test(getComputedStyle(art).filter) || Number(getComputedStyle(art).opacity) < 1,
    markCorner: mark ? (() => { const m = mark.getBoundingClientRect(); return Math.round(pr.right - m.right) < 16 && Math.round(m.top - pr.top) < 16; })() : null,
    conn: Number(((c.querySelector('.card-conn-pill .card-conn') || {}).textContent || '').replace(/\D+/g, '')) || 0,
    connCorner: (() => { const p = c.querySelector('.card-conn-pill'); if (!p) return null; const m = p.getBoundingClientRect(); return Math.round(m.left - pr.left) < 16 && Math.round(m.top - pr.top) < 16; })(),
    w: Math.round(c.getBoundingClientRect().width),
    ratio: Math.round((pr.width / pr.height) * 1000) / 1000,
    over: over.map(e => e.className && String(e.className).split(' ')[0]),
    band: !!c.querySelector('.card-hover'),
    line: (c.querySelector('.card-line') || {}).textContent || '',
    phase: !!c.querySelector('.card-line .card-phase'),
    marks: mark ? mark.querySelectorAll('.card-seen, .card-gnum').length : 0,
    seenMark: !!c.querySelector('.card-mark .card-seen'), gnum: (c.querySelector('.card-mark .card-gnum') || {}).textContent || null,
    acts: !!c.querySelector('.card-acts'), tsa: c.querySelectorAll('.card-acts .tsa-btn').length, scores: c.querySelectorAll('.card-acts .card-rating').length,
    cast: !!c.querySelector('.card-acts .card-cast'),
    titlePx: parseFloat(getComputedStyle(c.querySelector('.card-title')).fontSize), linePx: parseFloat(getComputedStyle(c.querySelector('.card-year')).fontSize),
    seenBg: (() => { const b = c.querySelector('.card-acts .tsa-btn.seen.on'); return b ? getComputedStyle(b).backgroundColor : null; })(),
  };
};
const SCALE = () => Number((document.querySelector('.canvas').style.transform.match(/scale\(([\d.]+)\)/) || [])[1]);
// Every card's meta line stays inside its padding (Notion "Connections cards:
// the Coming soon pill runs into a series card's right edge", 2026-11-24): a
// title not out yet shows its release pill, and a series drops "Series" for
// it. Measured in the card's own pixels, whatever the canvas zoom.
const LINEFIT = () => {
  const cards = [...document.querySelectorAll('.canvas .card')];
  const over = [], series = [];
  for (const c of cards) {
    const line = c.querySelector('.card-year');
    if (!line) continue;
    const s = c.getBoundingClientRect().width / c.offsetWidth;
    const meta = c.querySelector('.card-meta'), edge = meta.getBoundingClientRect().right - parseFloat(getComputedStyle(meta).paddingRight) * s;
    const right = Math.max(...[...line.children].map(e => e.getBoundingClientRect().right));
    if (line.scrollWidth > line.clientWidth + 0.5 || right > edge + 0.5) over.push(c.dataset.id + ' ' + ((right - edge) / s).toFixed(1));
    if (line.querySelector('.card-release') && line.querySelector('.card-type')) series.push(c.dataset.id);
  }
  return { cards: cards.length, pills: cards.filter(c => c.querySelector('.card-year .card-release')).map(c => c.dataset.id), over, series };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const prefs = { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' };
  for (const scheme of ['dark', 'light']) {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: scheme }, prefs, { 'iron-man': 'seen' });
    await page.goto(URL); await settle(page);
    const a = await page.evaluate(CARD, '.card[data-id="iron-man-2"]');
    out[scheme + ' rest'] = a;
    expect(a && Math.abs(a.ratio - 2 / 3) < 0.01 && !a.over.length && !a.band && !a.acts, `${scheme}: at rest: ${JSON.stringify(a)}`);
    expect(a && a.phase && /2010/.test(a.line) && !/Set in|\$|connection/.test(a.line) && a.marks === 0 && a.conn > 0 && a.connCorner, `${scheme}: the meta line and corners: ${JSON.stringify(a)}`);
    const fit = out[scheme + ' line fit'] = await page.evaluate(LINEFIT);
    expect(fit.cards > 40 && !fit.over.length && !fit.series.length, `${scheme}: a card's meta line runs past its padding, or keeps "Series" beside its release pill: ${JSON.stringify(fit)}`);
    const seen = await page.evaluate(CARD, '.card[data-id="iron-man"]');
    out[scheme + ' seen'] = seen;
    expect(seen && seen.seenMark && seen.marks === 1 && seen.markCorner && !seen.washed, `${scheme}: a seen card: ${JSON.stringify(seen)}`);
    // Up next is the one card with the red outline (Andre, 2026-11-16).
    const up = await page.evaluate(() => ({ ids: [...document.querySelectorAll('.card.up-next')].map(c => c.dataset.id),
      row: (document.querySelector('.spatial-overall .un-title') || {}).textContent || null,
      outline: (() => { const c = document.querySelector('.card.up-next'); return c ? getComputedStyle(c).outlineStyle + ' ' + getComputedStyle(c).outlineWidth : null; })() }));
    out[scheme + ' up next'] = up;
    expect(up.ids.length === 1 && up.ids[0] === 'incredible-hulk' && /Hulk/.test(up.row || '') && /^solid [1-9]/.test(up.outline || ''), `${scheme}: the Up next card: ${JSON.stringify(up)}`);
    // Hover: no band, nothing on the art.
    const box = await page.locator('.card[data-id="iron-man-2"] .card-poster').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 30); await page.waitForTimeout(400);
    const h = await page.evaluate(CARD, '.card[data-id="iron-man-2"]');
    out[scheme + ' hover'] = h;
    expect(!h.band && !h.over.length && !h.acts, `${scheme}: hover shows something: ${JSON.stringify(h)}`);
    await page.mouse.move(5, 500);
    // Selected (the ring's centre): the same card, same size, nothing added.
    const restW = await page.evaluate(() => Math.round(document.querySelector('.card[data-id="thor"]').getBoundingClientRect().width));
    const restScale = await page.evaluate(SCALE);
    await page.locator('.card[data-id="thor"]').click(); await page.waitForTimeout(1500);
    const sel = await page.evaluate(CARD, '.card[data-id="thor"]');
    const selScale = await page.evaluate(SCALE);
    out[scheme + ' selected'] = { ...sel, restW, restScale, selScale };
    expect(!sel.acts && !sel.over.length && Math.abs(sel.ratio - 2 / 3) < 0.01 && Math.abs(sel.w / selScale - restW / restScale) < 2,
      `${scheme}: the selected card: ${JSON.stringify(out[scheme + ' selected'])}`);
    errors.push(...e);
    await ctx.close();
  }
  // The connections count is the ring's size: selecting a title shows exactly
  // as many other titles as its card says (Andre, 2026-11-15).
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, {});
    await page.goto(URL); await settle(page);
    out.count = {};
    for (const id of ['thor', 'iron-man', 'avengers', 'gotg']) {
      await page.goto(URL); await settle(page);
      const said = await page.evaluate((id) => Number(((document.querySelector(`.card[data-id="${id}"] .card-conn`) || {}).textContent || '').replace(/\D+/g, '')), id);
      await page.goto(URL + '?title=' + id); await settle(page); await page.waitForTimeout(900);
      const ring = await page.evaluate(() => document.querySelectorAll('.card:not(.ring-hidden)').length - 1);
      out.count[id] = { said, ring };
      expect(said > 0 && said === ring, `${id}: the card says ${said} connections, its ring shows ${ring}`);
    }
    errors.push(...e);
    await ctx.close();
  }
  // A guide: one mark per card; a watched stop shows the stop's check only.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, { 'iron-man': 'seen' });
    await page.goto(URL + '?guide=infinity-saga&view=spatial'); await settle(page); await page.waitForTimeout(800);
    const g = await page.evaluate(() => [...document.querySelectorAll('.card')].map(c => ({ id: c.dataset.id, marks: c.querySelectorAll('.card-mark .card-seen, .card-mark .card-gnum').length,
      seen: !!c.querySelector('.card-mark .card-seen'), gnum: (c.querySelector('.card-mark .card-gnum') || {}).textContent || null })));
    const im = g.find(x => x.id === 'iron-man');
    out.guide = { ironMan: im, many: g.filter(x => x.marks > 1).map(x => x.id) };
    expect(im && im.marks === 1 && !im.seen && im.gnum === '✓', `guide: Iron Man's marks: ${JSON.stringify(im)}`);
    expect(!out.guide.many.length, `guide: cards with two marks: ${out.guide.many.join()}`);
    const gUp = await page.evaluate(() => [...document.querySelectorAll('.card.up-next')].map(c => c.dataset.id));
    out.guide.upNext = gUp;
    expect(gUp.length === 1 && gUp[0] === 'cap-first-avenger', `guide: the next stop's outline: ${JSON.stringify(gUp)}`);
    errors.push(...e);
    await ctx.close();
  }
  // The phone: the selected card is the same card, at phone sizes, with Cast.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, { ...prefs, viewMode: 'spatial' }, {});
    await page.goto(URL); await settle(page); await page.waitForTimeout(600);
    // Phone canvas cards: a 17px title and a 12px line (Andre, 2026-11-16),
    // inside the card's fixed size on every card.
    const TEXT = () => {
      const cards = [...document.querySelectorAll('.canvas .card')];
      const c0 = cards[0];
      const line = c0.querySelector('.card-year');
      return { title: getComputedStyle(c0.querySelector('.card-title')).fontSize, line: line ? getComputedStyle(line).fontSize : null,
        out: cards.filter(c => { const b = c.getBoundingClientRect(), l = c.querySelector('.card-meta').lastElementChild.getBoundingClientRect(); return l.bottom > b.bottom + 0.5; }).map(c => c.dataset.id) };
    };
    const pc = await page.evaluate(TEXT);
    out.phoneCards = pc;
    expect(pc.title === '17px' && pc.line === '12px' && !pc.out.length, `phone: canvas card text: ${JSON.stringify(pc)}`);
    const pfit = out.phoneLineFit = await page.evaluate(LINEFIT);
    expect(pfit.cards > 40 && !pfit.over.length && !pfit.series.length, `phone: a card's meta line runs past its padding, or keeps "Series" beside its release pill: ${JSON.stringify(pfit)}`);
    // Double-tap on empty canvas: the overview (Notion "Explore E 5/5"), where
    // each card shows its title alone, larger; again, back to reading.
    const bg = await page.evaluate(() => { for (let y = 200; y < innerHeight - 200; y += 20) for (let x = 20; x < innerWidth - 20; x += 20) { const e = document.elementFromPoint(x, y); if (e && !e.closest('.card') && e.closest('.viewport')) return { x, y }; } return null; });
    await page.touchscreen.tap(bg.x, bg.y); await page.waitForTimeout(120); await page.touchscreen.tap(bg.x, bg.y); await page.waitForTimeout(900);
    const ov = out.phoneOverview = await page.evaluate(TEXT);
    expect(ov.title === '24px' && !ov.line && !ov.out.length, `phone: overview card text after a double-tap: ${JSON.stringify(ov)}`);
    await page.touchscreen.tap(bg.x, bg.y); await page.waitForTimeout(120); await page.touchscreen.tap(bg.x, bg.y); await page.waitForTimeout(900);
    // A card fully on screen, away from the chrome: a tap opens its details
    // straight away, with no pop card or ring; it is outlined and what it
    // doesn't connect to dims behind the sheet.
    const pt = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.card')].find(c => { const r = c.getBoundingClientRect(); return r.left > 10 && r.right < innerWidth - 10 && r.top > 160 && r.bottom < innerHeight - 160; });
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { id: c.dataset.id, x: r.left + r.width / 2, y: r.top + 30 };
    });
    await page.touchscreen.tap(pt.x, pt.y); await page.waitForTimeout(900);
    const tap = out.phoneTap = await page.evaluate((id) => {
      const c = document.querySelector(`.card[data-id="${id}"]`);
      return { pop: !!document.querySelector('.m-focuspop'), sheet: (document.querySelector('.m-sheet .td-title') || {}).textContent || null,
        name: window.MCU_I18N.titleName(window.TITLES.find(t => t.id === id)), outlined: /border-\(--phase-color\)/.test(c.className),
        dimmed: document.querySelectorAll('.card.opacity-22').length };
    }, pt.id);
    expect(!tap.pop && tap.sheet === tap.name && tap.outlined && tap.dimmed > 0, `phone: a tap should open the details, outline the card and dim the rest: ${JSON.stringify(tap)}`);
    errors.push(...e);
    await ctx.close();
  }
  // What the meta line shows follows the sort and filters (Notion "Cards show
  // what the current sort and filters are about"): Release, the year; Story
  // order, where it is set; IMDb, the year and the score on the poster's
  // corner; A–Z and By Phase, the year (Andre, 2026-11-16); the Budget filter,
  // the budget. The card keeps its height.
  {
    const cases = [['release', '', 'year'], ['chrono', '', 'story'], ['imdb', '', 'imdb'], ['rt', '', 'imdb'], ['title', '', 'year'], ['phase', '', 'year'], ['release', '?budget=mid', 'budget']];
    for (const [sort, q, want] of cases) {
      const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, { ...prefs, sort }, {});
      await page.goto(URL + q); await settle(page); await page.waitForTimeout(500);
      const r = await page.evaluate(() => { const c = [...document.querySelectorAll('.card:not(.coll-dim):not(.dimmed)')].find(x => x.querySelector('.card-title')) || document.querySelector('.card');
        const line = c.querySelector('.card-year');
        const has = (sel) => !!line.querySelector(sel);
        const year = [...line.children].some(x => /^\d{4}$/.test(x.textContent.trim()) && !x.classList.contains('card-story'));
        const sc = c.querySelector('.card-poster .card-score .card-rating');
        return { year, story: has('.card-story'), imdb: !!sc, inLine: has('.card-rating'), scoreLeft: sc ? Math.round(sc.getBoundingClientRect().left - c.getBoundingClientRect().left) : null,
          budget: has('.card-budget'), dot: has('.card-phase'), h: c.offsetHeight, text: line.innerText.replace(/\n/g, ' ') }; });
      out['facet ' + sort + q] = r;
      const got = r.budget ? 'budget' : r.story ? 'story' : r.imdb ? 'imdb' : r.year ? 'year' : 'none';
      expect(got === want && r.dot && !r.inLine && (want !== 'imdb' || (r.year && r.scoreLeft < 20)), `cards with sort ${sort}${q}: expected ${want}, got ${JSON.stringify(r)}`);
      errors.push(...e);
      await ctx.close();
    }
    const hs = new Set(Object.keys(out).filter(k => k.startsWith('facet ')).map(k => out[k].h));
    expect(hs.size === 1, `the card height changes with the sort: ${[...hs].join(', ')}`);
  }
  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
