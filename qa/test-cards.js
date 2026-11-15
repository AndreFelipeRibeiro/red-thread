// The simplified Spatial card (Notion "Simplify the Spatial cards"):
// - at rest nothing shows on the poster art (no badges, scores or buttons);
//   under it, the title, the phase as a coloured dot, the year, and a quiet
//   check once seen;
// - hovering the card brings up a band over the foot of the poster with the
//   scores and Seen / Watchlist, without moving anything; Tab reaching the
//   card's buttons shows it too;
// - far zoomed out the band stays away (its buttons would be too small);
// - Seen, once on, is a tint with the check in the seen colour, not a fill.
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

const CARD = (id) => {
  const c = document.querySelector(`.card[data-id="${id}"]`);
  if (!c) return null;
  const poster = c.querySelector('.card-poster').getBoundingClientRect();
  const band = c.querySelector('.card-hover');
  // Anything painted over the art: visible elements inside the poster other
  // than the art itself and the (transparent at rest) band.
  const over = [...c.querySelectorAll('.card-poster *')].filter(e => !e.closest('.card-hover') && !e.closest('.card-poster > :first-child') && e.getClientRects().length
    && getComputedStyle(e).opacity !== '0' && getComputedStyle(e).visibility !== 'hidden');
  return {
    band: band ? Number(getComputedStyle(band).opacity) : null,
    over: over.map(e => e.className && String(e.className).split(' ')[0]),
    posterTop: Math.round(poster.top), metaTop: Math.round(c.querySelector('.card-meta').getBoundingClientRect().top),
    phase: !!c.querySelector('.card-meta .card-phase'), year: (c.querySelector('.card-year') || {}).textContent || '',
    check: !!c.querySelector('.card-meta .card-seen'),
    seenBg: (() => { const b = c.querySelector('.card-tsa .tsa-btn.seen.on'); return b ? getComputedStyle(b).backgroundColor : null; })(),
  };
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const prefs = { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' };
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, { 'iron-man': 'seen' });
    await page.goto(URL); await settle(page);
    let a = await page.evaluate(CARD, 'iron-man-2');
    out.rest = a;
    expect(a && a.band === 0 && !a.over.length, `at rest something shows on the poster: ${JSON.stringify(a)}`);
    expect(a && a.phase && /2010/.test(a.year) && !a.check, `the meta line: ${JSON.stringify(a)}`);
    const seen = await page.evaluate(CARD, 'iron-man');
    out.seen = seen;
    expect(seen && seen.check, `a seen card has no quiet check: ${JSON.stringify(seen)}`);
    // Hover: the band comes up; nothing moves.
    const box = await page.locator('.card[data-id="iron-man-2"] .card-poster').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 30); await page.waitForTimeout(400);
    const h = await page.evaluate(CARD, 'iron-man-2');
    out.hover = h;
    expect(h.band === 1 && h.posterTop === a.posterTop && h.metaTop === a.metaTop, `hover: ${JSON.stringify(h)}`);
    expect(await page.locator('.card[data-id="iron-man-2"] .card-hover .rating-row .card-rating').count() >= 1, 'the band has no scores');
    // Seen from the band: a tint, not a fill.
    await page.locator('.card[data-id="iron-man-2"] .card-tsa .tsa-btn.seen').click(); await page.waitForTimeout(700);
    const s = await page.evaluate(CARD, 'iron-man-2');
    out.marked = s;
    expect(s.check && s.seenBg && !/rgb\(95, 168, 86\)/.test(s.seenBg), `Seen on: ${JSON.stringify(s)}`);
    await page.mouse.move(5, 500); await page.waitForTimeout(300);
    // Keyboard: Tab onto the card's buttons shows the band.
    await page.evaluate(() => document.querySelector('.card[data-id="thor"] .card-tsa .tsa-btn').focus());
    await page.waitForTimeout(300);
    const k = await page.evaluate(CARD, 'thor');
    out.keyboard = k;
    expect(k.band === 1, `keyboard focus did not show the band: ${JSON.stringify(k)}`);
    errors.push(...e);
    await ctx.close();
  }
  // Zoomed far out: no band.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, {});
    await page.goto(URL); await settle(page);
    const Z = () => page.evaluate(() => ({ scale: Number((document.querySelector('.canvas').style.transform.match(/scale\(([\d.]+)\)/) || [])[1]), bands: document.querySelectorAll('.card-hover').length }));
    let z = await Z();
    for (let i = 0; i < 12 && !(z.scale < 0.45); i++) { await page.locator('.zoom-ctl button').first().click(); await page.waitForTimeout(250); z = await Z(); }
    await page.waitForTimeout(300); z = await Z();
    out.zoomedOut = z;
    expect(z.scale < 0.5 && z.bands === 0, `zoomed out to ${z.scale}: ${z.bands} bands`);
    errors.push(...e);
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
