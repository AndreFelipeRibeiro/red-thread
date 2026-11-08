// Batch 8 micro-interactions (Notion V4 Tasks, the "Micro-interaction: …"
// tickets). Each section names its ticket.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
process.env.PORT = process.env.PORT || '8307';
{
  const fs0 = require('fs');
  const base = fs0.readFileSync(__dirname + '/test-refocus.js', 'utf8');
  const me = fs0.readFileSync(__filename, 'utf8');
  eval(base.slice(0, base.indexOf('(async () => {')) + me.slice(me.indexOf('// ' + '---- body')));
}
return;
// ---- body

const REDUCED = "localStorage.setItem('mcu.motion.v1','reduced');";
const prefs = { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: 'asc' };

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- "a press effect on icon buttons" -------------------------------------
  // Pressed, an icon button shrinks (scale under 1); released, it returns;
  // with Reduce motion it never shrinks.
  {
    const press = async (page, sel) => {
      const box = await page.locator(sel).first().boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down(); await page.waitForTimeout(150);
      const down = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).scale, sel);
      await page.mouse.up(); await page.waitForTimeout(250);
      const up = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).scale, sel);
      return { down, up };
    };
    for (const [label, extra] of [['motion', ''], ['reduced', REDUCED]]) {
      const { ctx, page, errors: e } = await ctxPage(browser, DESK, prefs, {}, extra);
      await page.goto(URL); await settle(page);
      for (const sel of ['.settings-btn', '.zoom-btn']) {
        const r = await press(page, sel);
        out['press ' + label + ' ' + sel] = r;
        await page.keyboard.press('Escape'); await page.waitForTimeout(400); // close what it opened
        if (label === 'motion') expect(parseFloat(r.down) < 0.97 && (r.up === 'none' || r.up === '1'), `${sel}: pressed scale ${r.down}, released ${r.up}`);
        else expect(r.down === 'none' || r.down === '1', `${sel}: shrinks with Reduce motion (${r.down})`);
      }
      errors.push(...e.map(x => label + ': ' + x));
      await ctx.close();
    }
  }

  // ---- "progress bars fill smoothly" ----------------------------------------
  // Marking the Up next title seen: the All titles bar is caught part-way
  // through its fill, then ends at the new width; with Reduce motion it is
  // already there. The guide segments and the Guides menu bars carry their
  // transitions (none with Reduce motion).
  for (const [label, extra] of [['motion', ''], ['reduced', REDUCED]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, prefs, seenBefore('she-hulk'), extra);
    await page.goto(URL); await settle(page);
    const FILL = () => { const f = [...document.querySelectorAll('.pgh-fill')].find(el => el.offsetParent); return f ? Math.round(f.getBoundingClientRect().width * 10) / 10 : null; };
    const before = await page.evaluate(FILL);
    // Every frame's width from the click on: a fill shows widths between the
    // old and the new one; a jump shows none.
    await page.evaluate((FILLs) => {
      const fill = eval('(' + FILLs + ')');
      window.__w = []; const t0 = performance.now();
      const tick = () => { window.__w.push(fill()); if (performance.now() - t0 < 1300) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, FILL.toString());
    await page.locator('.un-mrow button[aria-pressed]').first().click();
    await page.waitForTimeout(1400);
    const widths = await page.evaluate(() => window.__w);
    const after = widths[widths.length - 1];
    const between = widths.filter(w => w > before + 0.3 && w < after - 0.3).length;
    const r = out['fill ' + label] = { before, after, between };
    expect(after > before, `${label}: the All titles bar did not grow (${JSON.stringify(r)})`);
    // A fill shows at least one width in between (about 16 normally; a choked
    // machine may draw only one frame of it); Reduce motion shows none.
    if (label === 'motion') expect(between >= 1, `the All titles bar jumped instead of filling: ${JSON.stringify(r)}`);
    else expect(between === 0, `Reduce motion: the All titles bar animated: ${JSON.stringify(r)}`);
    // The guide meters' transitions, read from a guide's card.
    await page.goto(URL + '?guide=before-doomsday'); await settle(page);
    const tr = await page.evaluate(() => { const i = document.querySelector('.gm-segs i'); return i ? getComputedStyle(i).transitionDuration : null; });
    out['guide segs ' + label] = tr;
    if (label === 'motion') expect(tr && /0\.26s/.test(tr), 'the guide segments have no fade: ' + tr);
    // The Reduce motion rule shortens every transition to a few microseconds.
    else expect(!tr || tr.split(',').every(d => parseFloat(d) < 0.01), 'Reduce motion: the guide segments still fade: ' + tr);
    errors.push(...e.map(x => label + ': ' + x));
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
