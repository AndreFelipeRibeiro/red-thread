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

  // ---- "the Seen check pops in and the counters tick" ------------------------
  // Already in the app since V3 (TitleStatusActions' `pop`, CountBadge's
  // up / down): marking a title plays the button's pop and the Seen counter's
  // bump and roll; with Reduce motion they are cut to nothing.
  for (const [label, extra] of [['motion', ''], ['reduced', REDUCED]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, { ...prefs, desktopView: 'list' }, seenBefore('she-hulk'), extra);
    await page.goto(URL); await settle(page);
    // Record every frame from the click on (a slow machine can't skip it):
    // the button's pop, the counter's class, and how long "up" lasted.
    await page.evaluate(() => {
      window.__frames = [];
      const t0 = performance.now();
      const tick = () => {
        const b = document.querySelector('.tsa-btn.seen.pop'), c = document.querySelector('.tb-sort-row .coll-count.seen');
        const a = (el) => el ? { name: getComputedStyle(el).animationName, dur: parseFloat(getComputedStyle(el).animationDuration) } : null;
        window.__frames.push({ t: performance.now() - t0, pop: a(b), count: a(c), countCls: c ? c.className : '' });
        if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator('.dl-tsa .tsa-btn.seen:not(.on)').first().click();
    await page.waitForTimeout(1600);
    const frames = await page.evaluate(() => window.__frames);
    const popped = frames.find(f => f.pop);
    const ups = frames.filter(f => /\bup\b/.test(f.countCls));
    const r = { pop: popped ? popped.pop : null, count: ups.length ? ups[0].count : null,
      countCls: ups.length ? ups[0].countCls : '', upForMs: ups.length ? Math.round(ups[ups.length - 1].t - ups[0].t) : 0 };
    // The counter's "up" has to last most of its 420ms bump: it used to be
    // dropped by the next render, about 20ms in.
    r.countLater = r.upForMs >= 250 ? r.countCls : '';
    out['pop ' + label] = r;
    if (label === 'motion') {
      expect(r.pop && /tsa-pop/.test(r.pop.name) && r.pop.dur > 0.3, 'the Seen button did not pop: ' + JSON.stringify(r.pop));
      expect(r.count && /count-bump/.test(r.count.name) && /\bup\b/.test(r.countCls), 'the Seen counter did not tick up: ' + JSON.stringify(r));
      expect(/\bup\b/.test(r.countLater || ''), 'the Seen counter stopped ticking early: ' + JSON.stringify(r));
    } else {
      expect(!r.pop || r.pop.dur < 0.01, 'Reduce motion: the Seen button still pops: ' + JSON.stringify(r.pop));
      expect(!r.count || r.count.dur < 0.01, 'Reduce motion: the counter still bumps: ' + JSON.stringify(r.count));
    }
    errors.push(...e.map(x => label + ': ' + x));
    await ctx.close();
  }

  // ---- "cards fade softly when a filter changes" -----------------------------
  // A type filter set back to All brings Iron Man back: it fades in. The first
  // paint and switching from List back to Spatial fade nothing. A collection
  // change fades a card to its dimmed look. Reduce motion: no fade-in.
  for (const [label, extra] of [['motion', ''], ['reduced', REDUCED]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, DESK, prefs, seenBefore('she-hulk'), extra);
    await page.goto(URL); await settle(page);
    const OP = () => { const c = document.querySelector('.card[data-id="iron-man"]'); return c ? { enter: c.classList.contains('enter'), op: Number(getComputedStyle(c).opacity) } : null; };
    const r = out['cards ' + label] = {};
    r.firstPaint = await page.evaluate(() => document.querySelectorAll('.card.enter').length);
    expect(r.firstPaint === 0, `${label}: ${r.firstPaint} cards fade in on first paint`);
    await page.locator('.tb-type-controls .segmented button:nth-of-type(3)').click(); await page.waitForTimeout(900);
    // Every frame from the click on: Iron Man's opacity as it comes back.
    await page.evaluate((OPs) => {
      const op = eval('(' + OPs + ')');
      window.__f = []; const t0 = performance.now();
      const tick = () => { window.__f.push(op()); if (performance.now() - t0 < 900) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, OP.toString());
    await page.locator('.tb-type-controls .segmented button:nth-of-type(1)').click(); await page.waitForTimeout(1000);
    const seen = (await page.evaluate(() => window.__f)).filter(Boolean);
    r.back = seen.find(f => f.enter && f.op > 0.05 && f.op < 0.9) || seen[0] || null;
    r.fadeFrames = seen.filter(f => f.op > 0.05 && f.op < 0.9).length;
    r.settled = await page.evaluate(OP);
    // At least one frame mid-fade (about 13 normally); none with Reduce motion.
    if (label === 'motion') expect(r.back && r.back.enter && r.fadeFrames >= 1, 'a card brought back did not fade in: ' + JSON.stringify({ back: r.back, frames: r.fadeFrames }));
    else expect(r.fadeFrames === 0, 'Reduce motion: a card brought back faded in: ' + JSON.stringify({ frames: r.fadeFrames }));
    expect(r.settled && !r.settled.enter && r.settled.op > 0.95, 'a card brought back did not settle: ' + JSON.stringify(r.settled));
    // List and back: every card at once.
    await page.locator('.tb-view-switch button').nth(1).click(); await page.waitForTimeout(600);
    await page.locator('.tb-view-switch button').nth(0).click(); await page.waitForTimeout(120);
    r.afterList = await page.evaluate(() => document.querySelectorAll('.card.enter').length);
    expect(r.afterList === 0, `${label}: ${r.afterList} cards fade in when Spatial opens again`);
    // The collection dim (Unseen: Iron Man is seen, so it dims).
    if (label === 'motion') {
      await page.waitForTimeout(800);
      // Record the card's opacity every frame, so a slow frame can't skip the fade.
      await page.evaluate(() => {
        window.__ops = [];
        const t0 = performance.now();
        const tick = () => { const c = document.querySelector('.card[data-id="iron-man"]'); window.__ops.push(Number(getComputedStyle(c).opacity)); if (performance.now() - t0 < 700) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      await page.locator('.tb-sort-row .coll-switch button:nth-of-type(2)').click(); await page.waitForTimeout(800);
      const ops = await page.evaluate(() => window.__ops);
      r.dimSteps = ops.filter(o => o > 0.3 && o < 0.95).length;
      r.dimEnd = ops[ops.length - 1];
      expect(r.dimSteps >= 1 && r.dimEnd < 0.5, 'a collection change did not fade the card: ' + JSON.stringify({ steps: r.dimSteps, end: r.dimEnd }));
    }
    errors.push(...e.map(x => label + ': ' + x));
    await ctx.close();
  }

  // ---- "Up next slides to the next title when one is marked seen" -----------
  // Desktop Spatial's meter row and the phone chip: right after marking, the
  // old title is on its way out (inert, hidden from screen readers) and the
  // next one on its way in; then only the next one is left. Reduce motion:
  // an instant swap with nothing leaving.
  for (const [label, opts, extra, row] of [
    ['desktop', DESK, '', '.un-mrow'], ['phone', PHONE, '', '.un-chip'], ['reduced', DESK, REDUCED, '.un-mrow']]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts, opts === PHONE ? { ...prefs, viewMode: 'spatial' } : prefs, seenBefore('she-hulk'), extra);
    await page.goto(URL); await settle(page);
    const READ = (row) => {
      const r = document.querySelector(row);
      if (!r) return null;
      const leave = r.querySelector('.un-leave'), cur = r.querySelector('.un-slide > :not(.un-leave)');
      return {
        leaving: leave ? leave.querySelector('.un-title').textContent : null,
        leaveInert: leave ? leave.hasAttribute('inert') && leave.getAttribute('aria-hidden') === 'true' : null,
        current: cur ? cur.querySelector('.un-title').textContent : null,
        entering: !!(cur && cur.classList.contains('un-enter')),
        rowH: Math.round(r.getBoundingClientRect().height),
      };
    };
    const before = await page.evaluate(READ, row);
    // Record every frame from the press on, so a slow machine can't skip the
    // slide: `mid` is the first frame with a title leaving (or, if none ever
    // left, the first frame after the swap).
    await page.evaluate(([row, READ]) => {
      const read = eval('(' + READ + ')');
      window.__frames = [];
      const t0 = performance.now();
      const tick = () => { window.__frames.push(read(row)); if (performance.now() - t0 < 900) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, [row, READ.toString()]);
    const btn = page.locator(row + ' .tsa-btn.seen').first();
    if (opts === PHONE) await btn.tap(); else await btn.click();
    await page.waitForTimeout(950);
    const frames = await page.evaluate(() => window.__frames);
    const mid = frames.find(f => f && f.leaving) || frames.find(f => f && f.current !== before.current) || null;
    const end = await page.evaluate(READ, row);
    out['upnext ' + label] = { before, mid, end };
    if (label === 'reduced') {
      expect(mid && !mid.leaving && mid.current !== before.current, 'Reduce motion: Up next did not swap at once: ' + JSON.stringify(mid));
    } else {
      expect(mid && mid.leaving === before.current && mid.leaveInert && mid.current !== before.current && mid.entering,
        `${label}: Up next did not slide (${JSON.stringify({ before, mid })})`);
      expect(mid && Math.abs(mid.rowH - before.rowH) <= 2, `${label}: the Up next row changed height while sliding (${before.rowH} → ${mid && mid.rowH})`);
    }
    expect(end && !end.leaving && end.current === (mid && mid.current), `${label}: Up next did not settle: ${JSON.stringify(end)}`);
    errors.push(...e.map(x => label + ': ' + x));
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
