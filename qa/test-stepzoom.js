// Stepping zoom on desktop Spatial (Notion V4 Tasks, "Desktop Spatial:
// character and guide stepping zoom to 70%, smaller than the landing"):
// - stepping through a pinned character or a guide lands on each stop at the
//   landing's reading zoom (about 7.5 titles across the canvas, capped at
//   100%), not the old fixed 70%: 100% on a wide window, less on a narrow one;
// - a zoom the visitor chose that is bigger than that is kept from stop to stop.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
// Borrows test-refocus's server and page helpers: its header, then the body
// below the marker, run as one script (consts made inside an eval stay there).
process.env.PORT = process.env.PORT || '8305';
{
  const fs0 = require('fs');
  const base = fs0.readFileSync(__dirname + '/test-refocus.js', 'utf8');
  const me = fs0.readFileSync(__filename, 'utf8');
  eval(base.slice(0, base.indexOf('(async () => {')) + me.slice(me.indexOf('// ' + '---- body')));
}
return;
// ---- body

const SCALE = page => page.evaluate(() => {
  const m = /scale\(([\d.]+)\)/.exec(document.querySelector('.canvas').style.transform);
  return m ? Number(m[1]) : null;
});
// The reading zoom for this canvas width, as the app works it out.
const READ = page => page.evaluate(() => Math.min(1, document.querySelector('.viewport').getBoundingClientRect().width / (170 * 1.15 * 7.5)));
const near = (a, b) => a !== null && Math.abs(a - b) < 0.01;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const prefs = { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' };

  for (const [w, h] of [[1600, 900], [1280, 800]]) {
    const key = w + 'x' + h;
    const r = out[key] = {};
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: w, height: h } }, prefs, {});

    // A pinned character: Tony Stark, two steps.
    await page.goto(URL + '?char=tony'); await settle(page);
    const read = await READ(page);
    r.read = Math.round(read * 1000) / 1000;
    const next = '.char-card .cb-step button';
    await page.locator(next).last().click(); await page.waitForTimeout(1200);
    r.charStep1 = await SCALE(page);
    await page.locator(next).last().click(); await page.waitForTimeout(1200);
    r.charStep2 = await SCALE(page);
    expect(near(r.charStep1, read) && near(r.charStep2, read), `${key} character steps at ${r.charStep1}, ${r.charStep2}; expected the reading zoom ${r.read}`);

    // Zoomed in by hand past the reading zoom: the next step keeps it.
    await page.locator('.zoom-btn').last().click(); await page.waitForTimeout(500);
    await page.locator('.zoom-btn').last().click(); await page.waitForTimeout(500);
    const chosen = await SCALE(page);
    await page.locator(next).last().click(); await page.waitForTimeout(1200);
    r.keptChosen = { chosen, after: await SCALE(page) };
    expect(chosen > read + 0.05 && near(r.keptChosen.after, chosen), `${key} a chosen zoom of ${chosen} became ${r.keptChosen.after} on the next step`);

    // A guide: Before Doomsday, two steps.
    await page.goto(URL + '?guide=before-doomsday'); await settle(page);
    const gnext = '.guide-banner .cb-step button';
    await page.locator(gnext).last().click(); await page.waitForTimeout(1200);
    r.guideStep1 = await SCALE(page);
    await page.locator(gnext).last().click(); await page.waitForTimeout(1200);
    r.guideStep2 = await SCALE(page);
    expect(near(r.guideStep1, read) && near(r.guideStep2, read), `${key} guide steps at ${r.guideStep1}, ${r.guideStep2}; expected the reading zoom ${r.read}`);

    r.errors = e;
    errors.push(...e.map(x => key + ': ' + x));
    await ctx.close();
  }
  expect(out['1600x900'] && out['1600x900'].read === 1, 'a 1600px window should read at 100%');
  expect(out['1280x800'] && out['1280x800'].read < 0.95 && out['1280x800'].read > 0.7, 'a 1280px window should read between 70% and 95%');

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
