// One title card (Notion "Cards: one card design at rest, selected and on the
// phone", after "Simplify the Spatial cards" and "Show posters uncropped at
// their standard 2:3 ratio"):
// - the poster is whole, at 2:3, its art untouched (no seen wash), with at
//   most one mark in its top-right corner: a check in a circle once seen, or
//   in a guide the stop's mark, never both (Andre, 2026-11-15);
// - hovering only lifts the card (no band);
// - under the poster: the title, then two meta lines (phase dot, year; how
//   many titles it connects to, which is the size of its ring), no "Set in"
//   or budget (Andre, 2026-11-15);
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
  const over = [...poster.querySelectorAll('*')].filter(e => !e.closest('.card-poster > :first-child, .m-fp-poster > :first-child, .card-mark') && e.getClientRects().length
    && getComputedStyle(e).opacity !== '0' && getComputedStyle(e).visibility !== 'hidden');
  const mark = c.querySelector('.card-mark');
  const art = poster.querySelector(':scope > :first-child');
  const wash = getComputedStyle(poster, '::after').content;
  return {
    washed: (wash && wash !== 'none' && wash !== 'normal') || /saturate/.test(getComputedStyle(art).filter) || Number(getComputedStyle(art).opacity) < 1,
    markCorner: mark ? (() => { const m = mark.getBoundingClientRect(); return Math.round(pr.right - m.right) < 16 && Math.round(m.top - pr.top) < 16; })() : null,
    lines: c.querySelectorAll('.card-line > span').length, w: Math.round(c.getBoundingClientRect().width),
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
    expect(a && a.phase && /2010/.test(a.line) && /\d+ connections?/.test(a.line) && !/Set in|\$/.test(a.line) && a.marks === 0, `${scheme}: the meta line: ${JSON.stringify(a)}`);
    const seen = await page.evaluate(CARD, '.card[data-id="iron-man"]');
    out[scheme + ' seen'] = seen;
    expect(seen && seen.seenMark && seen.marks === 1 && seen.markCorner && !seen.washed && seen.lines === 2, `${scheme}: a seen card: ${JSON.stringify(seen)}`);
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
    errors.push(...e);
    await ctx.close();
  }
  // The phone: the selected card is the same card, at phone sizes, with Cast.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, { ...prefs, viewMode: 'spatial' }, {});
    await page.goto(URL); await settle(page); await page.waitForTimeout(600);
    // A card fully on screen, away from the chrome.
    const pt = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.card')].map(c => c.getBoundingClientRect()).find(r => r.left > 10 && r.right < innerWidth - 10 && r.top > 220 && r.bottom < innerHeight - 160);
      return c && { x: c.left + c.width / 2, y: c.top + 40 };
    });
    await page.touchscreen.tap(pt.x, pt.y); await page.waitForTimeout(900);
    const p = await page.evaluate(CARD, '.m-focuspop');
    out.phone = p;
    expect(p && !p.over.length && !p.washed && Math.abs(p.ratio - 2 / 3) < 0.01 && p.titlePx >= 15 && p.linePx >= 13 && !p.acts,
      `phone: the selected card: ${JSON.stringify(p)}`);
    await page.locator('.m-focuspop .m-fp-open').tap(); await page.waitForTimeout(900);
    expect(await page.locator('.m-sheet .td-title').count() >= 1, 'phone: a tap on the selected card did not open the details');
    errors.push(...e);
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
