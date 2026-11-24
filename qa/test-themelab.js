// The dev-only Theme lab (Notion "Theme lab: a dev-only panel to try visual
// directions on the real app"):
// - a production-like host (here 127.0.0.1, a built site) shows no lab and no
//   lab styles;
// - no button (Notion "Theme lab: hide the button; open it with T"): T
//   opens and closes it, Esc closes it, a T typed in search does nothing, and
//   on a phone a long press on the wordmark or `?lab` opens it;
// - forced on (window.__THEME_LAB, as development and Vercel previews are), Editorial and Studio change the theme's
//   variables in both themes, the display face reaches My list's title, the
//   radius and density knobs set --radius and --spacing;
// - the choice survives a reload; "Back to the app's own look" removes every
//   override;
// - a pasted tweakcn / shadcn export becomes a Custom preset.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
process.env.PORT = process.env.PORT || '8313';
{
  const fs0 = require('fs');
  const base = fs0.readFileSync(__dirname + '/test-refocus.js', 'utf8');
  const me = fs0.readFileSync(__filename, 'utf8');
  eval(base.slice(0, base.indexOf('(async () => {')) + me.slice(me.indexOf('// ' + '---- body')));
}
return;
// ---- body

const VARS = () => {
  const cs = getComputedStyle(document.documentElement);
  return { bg: cs.getPropertyValue('--background').trim(), primary: cs.getPropertyValue('--primary').trim(), radius: cs.getPropertyValue('--radius').trim(),
    spacing: cs.getPropertyValue('--spacing').trim(), style: !!document.getElementById('theme-lab-style'), btn: !!document.querySelector('.theme-lab-btn'), panel: !!document.querySelector('.theme-lab'),
    // A display-type target: Up next's title in the compact card (Titles has
    // no page heading since Notion "Titles 3/5").
    title: (() => { const t = document.querySelector('.spatial-overall .un-title'); return t ? getComputedStyle(t).fontFamily : null; })() };
};
const pick = (page, sel, value) => page.evaluate(([s, v]) => {
  const el = document.querySelector(`[data-tl="${s}"]`);
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'INPUT' && el.type === 'range' ? 'input' : 'change', { bubbles: true }));
  if (el.type === 'range') el.dispatchEvent(new Event('change', { bubbles: true }));
}, [sel, value]);

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const prefs = { version: 1, viewMode: 'list', desktopView: 'list', sort: 'release', sortDir: 'asc' };
  // Production-like: nothing.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, prefs, {},
      "localStorage.setItem('mcu.themeLab.v1', JSON.stringify({ preset: 'editorial' }));");
    await page.goto(URL); await settle(page);
    const v = await page.evaluate(VARS);
    out.production = v;
    expect(!v.btn && !v.style, `the lab shows outside development and previews: ${JSON.stringify(v)}`);
    await page.locator('body').press('Shift+T'); await page.waitForTimeout(200);
    expect(!(await page.locator('.theme-lab').count()), 'T opened the lab in production');
    errors.push(...e);
    await ctx.close();
  }
  for (const scheme of ['dark', 'light']) {
    // One title seen, so the card has an Up next (its title takes display type).
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: scheme }, prefs, { 'iron-man': 'seen' }, 'window.__THEME_LAB = true;');
    await page.goto(URL); await settle(page);
    const base = await page.evaluate(VARS);
    out[scheme + ' default'] = base;
    expect(!base.btn && !base.panel && !base.style, `${scheme}: default look, no button, closed: ${JSON.stringify(base)}`);
    // A T typed in search is a T.
    await page.locator('.search-wrap input').first().click(); await page.keyboard.press('t'); await page.waitForTimeout(200);
    expect(!(await page.locator('.theme-lab').count()), `${scheme}: a T typed in search opened the lab`);
    await page.locator('.search-wrap input').first().fill(''); await page.keyboard.press('Escape'); await page.locator('body').click({ position: { x: 5, y: 300 } }).catch(() => {});
    await page.locator('body').press('Shift+T'); await page.waitForTimeout(200);
    expect(await page.locator('.theme-lab').count() === 1, `${scheme}: T did not open the panel`);
    expect(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tl')) === 'preset', `${scheme}: T did not put focus in the panel`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    expect(!(await page.locator('.theme-lab').count()), `${scheme}: Esc did not close the panel`);
    await page.locator('body').press('Shift+T'); await page.waitForTimeout(200);
    await pick(page, 'preset', 'editorial'); await page.waitForTimeout(300);
    const ed = await page.evaluate(VARS);
    out[scheme + ' editorial'] = ed;
    expect(ed.bg === (scheme === 'dark' ? '#0B0B0C' : '#F6F5F2') && ed.primary === '#C42B2F' && /Instrument Serif/.test(ed.title || ''), `${scheme}: Editorial: ${JSON.stringify(ed)}`);
    await pick(page, 'preset', 'studio'); await page.waitForTimeout(300);
    const st = await page.evaluate(VARS);
    out[scheme + ' studio'] = st;
    expect(st.bg === (scheme === 'dark' ? '#0E1116' : '#F7F9FC') && st.radius === '0.875rem', `${scheme}: Studio: ${JSON.stringify(st)}`);
    await pick(page, 'radius', '1'); await pick(page, 'density', '0.875'); await page.waitForTimeout(300);
    const kn = await page.evaluate(VARS);
    out[scheme + ' knobs'] = kn;
    expect(kn.radius === '1rem' && /0\.875/.test(kn.spacing), `${scheme}: radius and density: ${JSON.stringify(kn)}`);
    // Kept across a reload.
    await page.reload(); await settle(page);
    const again = await page.evaluate(VARS);
    out[scheme + ' reload'] = again;
    expect(again.bg === st.bg && again.radius === '1rem', `${scheme}: the choice did not survive a reload: ${JSON.stringify(again)}`);
    // Closed again on every load; Shift+T opens it (T alone sorts by Rotten Tomatoes). A pasted export.
    expect(!(await page.locator('.theme-lab').count()), `${scheme}: the panel reopened on its own after a reload`);
    await page.locator('body').press('Shift+T'); await page.waitForTimeout(200);
    await page.locator('.theme-lab details summary').click();
    await page.fill('[data-tl="paste"]', ':root { --background: #fafaf0; --primary: #8a2be2; }\n.dark { --background: #101010; --primary: #b388ff; }');
    await page.locator('[data-tl="paste-apply"]').click(); await page.waitForTimeout(300);
    const cu = await page.evaluate(VARS);
    out[scheme + ' custom'] = cu;
    expect(cu.bg === (scheme === 'dark' ? '#101010' : '#fafaf0'), `${scheme}: a pasted theme: ${JSON.stringify(cu)}`);
    // Back to the app's own look.
    await page.locator('[data-tl="reset"]').click(); await page.waitForTimeout(300);
    const back = await page.evaluate(VARS);
    out[scheme + ' reset'] = back;
    expect(!back.style && back.bg === base.bg, `${scheme}: reset left overrides: ${JSON.stringify(back)}`);
    errors.push(...e);
    await ctx.close();
  }
  // Phones: no button; a long press on the wordmark opens the panel (above the
  // bottom bar) without following the home link; a short tap does not; ?lab
  // opens it too.
  {
    const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
    const { ctx, page, errors: e } = await ctxPage(browser, PHONE, prefs, {}, 'window.__THEME_LAB = true;');
    await page.goto(URL + '?view=list&sort=title'); await settle(page);
    const press = async (ms) => {
      const b = await page.locator('.m-brandrow').boundingBox();
      await page.mouse.move(b.x + 30, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(400);
    };
    expect(!(await page.locator('.theme-lab-btn, .theme-lab').count()), 'phone: a lab button or panel shows on load');
    await press(150);
    expect(!(await page.locator('.theme-lab').count()), 'phone: a short tap on the wordmark opened the lab');
    await page.goto(URL + '?view=list&sort=title'); await settle(page);
    await press(1200);
    const p = await page.evaluate(() => { const l = document.querySelector('.theme-lab'), n = document.querySelector('.m-tabs'); return { open: !!l, url: (location.search + ((p) => ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] && p[2] ? (location.search ? '&' : '?') + ({ titles: 'title', guides: 'guide', characters: 'char' })[p[1]] + '=' + p[2] : ({ titles: 'list', guides: 'guides' })[p[1]] && !p[2] ? (location.search ? '&' : '?') + 'view=' + ({ titles: 'list', guides: 'guides' })[p[1]] : '')(location.pathname.split('/'))), labBottom: l && Math.round(l.getBoundingClientRect().bottom), barTop: n && Math.round(n.getBoundingClientRect().top) }; });
    out.phone = p;
    expect(p.open && /sort=title/.test(p.url), `phone: the long press did not open the lab, or went home: ${JSON.stringify(p)}`);
    expect(!p.open || p.labBottom <= p.barTop, `phone: the lab sits on the bottom bar: ${JSON.stringify(p)}`);
    await page.goto(URL + '?lab'); await settle(page);
    expect(await page.locator('.theme-lab').count() === 1, 'phone: ?lab did not open the lab');
    errors.push(...e);
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
