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

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
