const base = require('fs').readFileSync(__dirname + '/test-jit2-env.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
const ART = "Object.defineProperty(window, 'MEDIA', { configurable: true, set(v) { v.posters = {}; this.__m = v; }, get() { return this.__m; } });";
const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); } catch (e) {}";
const PORT = +process.env.PORT || 8282;
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const scan = async (page, name, out) => {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => { const res = await axe.run(document, { resultTypes: ['violations'] }); return res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 3).map(n => n.target.join(' ') + (n.any[0] ? ' :: ' + n.any[0].message.slice(0, 120) : '')) })); });
  out[name] = r;
};
(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const out = {};
  // SCHEME picks the system colour scheme. Since the first re-skin pass the
  // app follows it, and a browser left at its default only shows the light
  // theme, so the regression scans dark as well (qa/checks.json).
  const LOCALE = process.env.LOC || 'en-US', SCHEME = process.env.SCHEME || 'light';
  const D = { viewport: { width: 1440, height: 900 }, locale: LOCALE, colorScheme: SCHEME }, M = { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, locale: LOCALE, colorScheme: SCHEME };
  const open = async (opts, prefs, q = '') => { const x = await ctxPage(browser, opts, NOWELCOME + ART + SEED + "localStorage.setItem('mcu.prefs.v1', '" + JSON.stringify(prefs) + "');"); await x.page.goto('http://127.0.0.1:' + PORT + '/' + q); await require('./ready').appReady(x.page, 1200); return x; };
  let x = await open(D, {version:1, viewMode:'list', desktopView:'spatial', sort:'release'});
  await scan(x.page, 'desktop spatial', out);
  const c = await x.page.evaluate(() => { const r = [...document.querySelectorAll('.card')].map(c => c.getBoundingClientRect()).find(r => r.left > 50 && r.top > 100 && r.right < 1000 && r.bottom < 870); return { x: r.left + r.width / 2, y: r.top + r.height * 0.8 }; });
  await x.page.mouse.click(c.x, c.y); await x.page.waitForTimeout(1500);
  await scan(x.page, 'desktop spatial + details drawer', out);
  await x.ctx.close();
  x = await open(D, {version:1, viewMode:'list', desktopView:'list', sort:'release'});
  await scan(x.page, 'desktop list', out);
  await x.page.locator('.acct-pill, .account-btn').first().click().catch(() => {}); await x.page.waitForTimeout(600);
  await scan(x.page, 'desktop account menu', out);
  await x.ctx.close();
  // By Phase: the phase headers carry a select-this-phase checkbox and the
  // "Mark N more seen" button (Batch 9), which Release order never shows.
  x = await open(D, {version:1, viewMode:'list', desktopView:'list', sort:'phase'});
  await scan(x.page, 'desktop list, By Phase', out);
  await x.ctx.close();
  // Guides: the desktop Guides tab with a guide open, then its gallery.
  x = await open(D, {version:1, viewMode:'list', desktopView:'list', sort:'release'}, '?guide=before-doomsday');
  await scan(x.page, 'desktop guide', out);
  await x.page.goto(x.page.url().split('?')[0] + '?view=guides'); await x.page.waitForTimeout(1200);
  await scan(x.page, 'desktop guides gallery', out);
  await x.ctx.close();
  // The guide's module floating over desktop Spatial.
  x = await open(D, {version:1, viewMode:'list', desktopView:'spatial', sort:'release'}, '?guide=before-doomsday');
  await scan(x.page, 'desktop guide spatial', out);
  await x.ctx.close();
  // "What have you seen?": the desktop dialog and the phone sheet, opened
  // from My list with some titles already seen.
  x = await open(D, {version:1, viewMode:'list', desktopView:'list', sort:'release'});
  await x.page.locator('.ml-pick').click(); await x.page.waitForTimeout(700);
  await scan(x.page, 'desktop picker', out);
  await x.ctx.close();
  x = await open(M, {version:1, viewMode:'list', desktopView:'list', sort:'release'});
  await x.page.locator('.m-pick').click(); await x.page.waitForTimeout(700);
  await scan(x.page, 'phone picker', out);
  await x.ctx.close();
  x = await open(M, {version:1, viewMode:'list', desktopView:'list', sort:'release'}, '?guide=before-doomsday');
  await scan(x.page, 'phone guide', out);
  await x.ctx.close();
  x = await open(M, {version:1, viewMode:'list', desktopView:'list', sort:'release'}, '?view=guides');
  await scan(x.page, 'phone guides page', out);
  await x.ctx.close();
  x = await open(M, {version:1, viewMode:'list', desktopView:'list', sort:'release'});
  await scan(x.page, 'phone list', out);
  await x.page.locator('.m-lrow-open').nth(2).tap(); await x.page.waitForTimeout(900);
  await scan(x.page, 'phone details sheet', out);
  await x.ctx.close();
  x = await open(M, {version:1, viewMode:'spatial', desktopView:'list', sort:'release'});
  await scan(x.page, 'phone spatial', out);
  await x.ctx.close();
  // The guide promotion (Option C) on desktop and phone, on a fixed date inside
  // Doomsday's window. The app offers none to automated browsers, so the scan
  // clears navigator.webdriver for these two.
  const PERSON = "Object.defineProperty(navigator, 'webdriver', { get: () => false });";
  for (const [opts, name] of [[D, 'desktop guide promotion'], [M, 'phone guide promotion']]) {
    x = await ctxPage(browser, opts, NOWELCOME + ART + SEED + PERSON);
    await x.page.clock.setFixedTime(new Date('2026-11-01T12:00:00'));
    await x.page.goto('http://127.0.0.1:' + PORT + '/'); await x.page.waitForTimeout(4200);
    out[name + ' shown'] = (await x.page.locator('.gp').count()) ? [] : [{ id: 'promotion-missing', impact: 'critical', n: 1, help: 'the promotion did not appear', sample: [] }];
    await scan(x.page, name, out);
    await x.ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
  // A violation fails the run. This scan used to exit 0 whatever it found, so a
  // critical ARIA error reached production behind a clean exit code.
  const found = Object.values(out).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  if (found) { console.error('!! ' + found + ' accessibility violation type(s) above'); process.exitCode = 1; }
})();
`);
