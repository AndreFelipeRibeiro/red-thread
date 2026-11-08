// The sliding selection in segmented groups (Notion V4 Tasks, "Interface
// animation: sliding selection in the segmented controls"):
// - in every group that has one (sort, type, collection, view, and the phone
//   collection row), the pill sits exactly on the selected button, in English
//   and Portuguese and at the Large text size;
// - choosing another item slides it there (it is caught between the two) and
//   it ends on the new button;
// - with Reduce motion (the Settings choice or the system's), it moves at once;
// - the selected button's own background is clear, so only the pill shows.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
process.env.PORT = process.env.PORT || '8306';
{
  const fs0 = require('fs');
  const base = fs0.readFileSync(__dirname + '/test-refocus.js', 'utf8');
  const me = fs0.readFileSync(__filename, 'utf8');
  eval(base.slice(0, base.indexOf('(async () => {')) + me.slice(me.indexOf('// ' + '---- body')));
}
return;
// ---- body

// Where a group's pill and its selected button are, in screen px.
const PILL = (sel) => {
  const g = document.querySelector(sel);
  if (!g) return null;
  const pl = g.querySelector(':scope > .seg-pill'), on = g.querySelector(':scope > button.on');
  if (!pl || !on) return { pill: !!pl, on: !!on };
  const r = pl.getBoundingClientRect(), o = on.getBoundingClientRect();
  const bg = getComputedStyle(on).backgroundColor;
  return { dx: Math.round(r.left - o.left), dy: Math.round(r.top - o.top), dw: Math.round(r.width - o.width), dh: Math.round(r.height - o.height),
    x: Math.round(r.left), op: getComputedStyle(pl).opacity, onClear: bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' };
};
const aligned = (p) => p && p.dx !== undefined && Math.abs(p.dx) <= 1 && Math.abs(p.dy) <= 1 && Math.abs(p.dw) <= 1 && Math.abs(p.dh) <= 1 && p.op === '1' && p.onClear;
const GROUPS = ['.tb-sort-controls .segmented', '.tb-type-controls .segmented', '.tb-sort-row .coll-switch', '.tb-view-switch'];

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const prefs = { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' };

  // Desktop: every group at rest, in English, Portuguese and at Large text.
  for (const [label, extra] of [['en', ''], ['pt-BR', "localStorage.setItem('mcu.lang.v1','pt-BR');"], ['large', "localStorage.setItem('mcu.textSize.v1','large');"]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, prefs, {}, extra);
    await page.goto(URL); await settle(page);
    for (const g of GROUPS) {
      const p = await page.evaluate(PILL, g);
      out[label + ' ' + g] = p;
      expect(aligned(p), `${label}: the pill in ${g} is not on the selected button: ${JSON.stringify(p)}`);
    }
    errors.push(...e);
    await ctx.close();
  }

  // A change slides: caught on the way, then on the new button.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, prefs, {});
    await page.goto(URL); await settle(page);
    const g = GROUPS[0];
    const start = (await page.evaluate(PILL, g)).x;
    // The pill's place on every frame from the click: a slide shows places
    // between the start and the end, a jump none. (One sample 90ms in could
    // land after the 300ms slide on a loaded machine.)
    await page.evaluate((g) => {
      window.__x = []; const t0 = performance.now();
      const tick = () => { const p = document.querySelector(g + ' > .seg-pill'); window.__x.push(Math.round(p.getBoundingClientRect().left)); if (performance.now() - t0 < 900) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, g);
    await page.locator(g + ' button').nth(4).click();
    await page.waitForTimeout(1000);
    const xs = await page.evaluate(() => window.__x);
    const end = await page.evaluate(PILL, g);
    const between = xs.filter(x => x > start + 10 && x < end.x - 10);
    out.slide = { start, between: between.length, mid: between[0], end: end.x };
    // At least one place in between (about 12 normally; a choked machine may
    // draw only one frame of the slide).
    expect(between.length >= 1, `the pill did not slide: ${JSON.stringify(out.slide)}`);
    expect(aligned(end), 'after the slide the pill is not on the new button: ' + JSON.stringify(end));
    // The collection and view groups follow too.
    await page.locator('.tb-sort-row .coll-switch button').nth(2).click();
    await page.locator('.tb-view-switch button').nth(1).click();
    await page.waitForTimeout(600);
    for (const s of [GROUPS[2], GROUPS[3]]) expect(aligned(await page.evaluate(PILL, s)), `after a change the pill in ${s} is not on the new button`);
    errors.push(...e);
    await ctx.close();
  }

  // Reduce motion: the Settings choice, then the system's.
  for (const [label, opts, extra] of [['setting', DESK, "localStorage.setItem('mcu.motion.v1','reduced');"], ['system', { ...DESK, reducedMotion: 'reduce' }, '']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts, prefs, {}, extra);
    await page.goto(URL); await settle(page);
    const g = GROUPS[0];
    await page.locator(g + ' button').nth(4).click();
    await page.waitForTimeout(40);
    const p = await page.evaluate(PILL, g);
    out['reduced ' + label] = p;
    expect(aligned(p), `reduce motion (${label}): the pill did not move at once: ${JSON.stringify(p)}`);
    errors.push(...e);
    await ctx.close();
  }

  // Phone: the collection row.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, prefs, {});
    await page.goto(URL); await settle(page);
    const g = '.m-appbar .coll-switch';
    out.phone = await page.evaluate(PILL, g);
    expect(aligned(out.phone), 'phone: the pill is not on the selected collection: ' + JSON.stringify(out.phone));
    await page.locator(g + ' button').nth(2).tap(); await page.waitForTimeout(600);
    out.phoneAfter = await page.evaluate(PILL, g);
    expect(aligned(out.phoneAfter), 'phone: after a tap the pill is not on the new collection: ' + JSON.stringify(out.phoneAfter));
    errors.push(...e);
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
