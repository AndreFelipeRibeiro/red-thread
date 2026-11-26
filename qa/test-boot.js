// The startup screen (boot.js) under every way a start can go wrong: normal,
// a bundle that is blocked, one that will not parse, and one that never
// arrives. Run by hand, not part of qa/regress.sh, and it needs a built site:
//   npm run build && node qa/test-boot.js
const QA_PORT = +process.env.PORT || 8194; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = path.join(S, process.env.SITE || '../dist');
const V = path.join(S, 'vendor');
// React, ReactDOM and Babel came from unpkg until the app became a bundle;
// supabase-js is the only CDN script left.
const VENDOR = {
  '@supabase/supabase-js@2.112.2/dist/umd/supabase.js': 'x-supabase-supabase-js-2.112.2/package/dist/umd/supabase.js',
};
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};
// The bundle's name is fingerprinted, so the scenarios below match on shape.
const BUNDLE = '**/assets/main-*.js';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL = 'http://127.0.0.1:' + QA_PORT + '/';
const MOBILE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

async function ctxPage(browser, opts, init) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init);
  // The sign-in reminder would cover the page after a few marks: off unless a
  // test asks for it (NUDGE=1).
  if (!process.env.NUDGE) await ctx.addInitScript("try { if (!localStorage.getItem('mcu.signInNudge.v1')) localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}");
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route('**/*', route => {
    const u = route.request().url();
    const m = u.match(/^https:\/\/unpkg\.com\/(.+)$/);
    if (m && VENDOR[m[1]]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(V, VENDOR[m[1]])) });
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  return { ctx, page, errors };
}
const settle = page => page.waitForTimeout(2200);
const go = async page => { await page.goto(URL); await settle(page); };
const reload = async page => { await page.reload(); await settle(page); };
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {};
  const bootState = p => p.evaluate(() => { const b = document.getElementById('mcu-boot'); if (!b) return null; const btn = b.querySelector('.boot-reload'); return { state: b.dataset.state, msg: b.querySelector('.boot-msg').textContent, btn: btn.hidden ? null : btn.textContent }; });
  const run = async (name, opts, setup, after) => {
    const { ctx, page, errors } = await ctxPage(browser, opts, "localStorage.setItem('mcu.welcome.v1','test');");
    if (setup) await setup(page);
    let early = null;
    page.on('domcontentloaded', async () => { try { early = await bootState(page); } catch (e) {} });
    await page.goto('http://127.0.0.1:' + QA_PORT + '/', { waitUntil: 'commit' }); await page.waitForSelector('#root', { state: 'attached' });
    const r = { early };
    if (after) await after(page, r);
    await page.waitForFunction(() => !!document.querySelector('.toolbar, .m-appbar'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    r.appRendered = await page.evaluate(() => !!document.querySelector('.toolbar, .m-appbar'));
    r.final = await bootState(page);
    r.errors = errors.length;
    R[name] = r;
    await ctx.close();
  };
  await run('normal-en', DESKTOP, null, async (p, r) => { await p.waitForTimeout(100); r.shortlyAfter = await bootState(p); });
  await run('normal-pt-phone', { ...MOBILE, locale: 'pt-BR' }, async p => {
    // Hold the bundle back briefly so the loading screen is observable after
    // the locales have run and can give it words.
    await p.route(BUNDLE, async route => { await new Promise(r => setTimeout(r, 1500)); route.fallback(); });
  }, async (p, r) => { await p.waitForTimeout(1000); r.whileWaiting = await bootState(p); await p.screenshot({ path: 'shots/boot-phone.png' }); });
  // Blocked outright (offline, a filter, a bad deploy): the script element
  // fails to load and boot.js catches it in the capture phase.
  await run('bundle-blocked', DESKTOP, async p => { await p.route(BUNDLE, route => route.abort()); });
  // Served but corrupt. This replaces the old SRI-mismatch scenario: Vite's
  // assets carry no integrity hash, so a damaged bundle is caught when it
  // fails to parse rather than before it runs.
  await run('bundle-tampered', { ...MOBILE, locale: 'pt-BR' }, async p => { await p.route(BUNDLE, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'const x = ;' })); }, async p => { await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/boot-failed-phone.png' }); });
  await run('slow', DESKTOP, async p => {
    await p.clock.install();
    await p.route(BUNDLE, () => {});   // never answers
  }, async (p, r) => { await p.waitForTimeout(500); await p.clock.fastForward(26000); await p.waitForTimeout(300); r.afterSlow = await bootState(p); });

  // The bouncing pin (Notion "Startup loader: a branded Lottie animation
  // instead of the plain spinner"), with the bundle held back so the screen
  // stays up. "Bounce" is CSS keyframes (src/index.css), so nothing is
  // downloaded for it. It bounces when motion is allowed, with the Lottie
  // design's keys (sampled with the animation paused); the still pin and the
  // ring show when motion is reduced (system or Settings) or startup failed.
  const problems = [];
  const expect = (ok, msg) => { if (!ok) problems.push(msg); };
  const animState = p => p.evaluate(() => {
    const h = document.documentElement;
    const ring = document.querySelector('.boot-spinner');
    const mark = document.querySelector('.boot-mark');
    const ripple = document.querySelector('.boot-ripple');
    // The pin's lift at a few moments of the loop, read off the paused animation.
    const bounce = mark && mark.getAnimations().find(a => a.animationName === 'boot-bounce');
    const lift = {};
    if (bounce) {
      bounce.pause();
      for (const ms of [0, 400, 600, 760, 1000]) { bounce.currentTime = ms; lift[ms] = +new DOMMatrix(getComputedStyle(mark).transform).m42.toFixed(1); }
    }
    const r = mark && mark.getBoundingClientRect();
    return {
      anim: h.getAttribute('data-boot-anim'),
      markAnim: mark && getComputedStyle(mark).animationName, rippleAnim: ripple && getComputedStyle(ripple).animationName,
      lift, markH: r && Math.round(r.height),
      ring: ring && getComputedStyle(ring).display, reduceClass: h.classList.contains('reduce-motion'),
    };
  });
  const holdBundle = p => p.route(BUNDLE, () => {});   // never answers
  const extraAsked = p => { p._extra = []; p.on('request', q => { if (/lottie|boot-loader/.test(q.url())) p._extra.push(q.url()); }); };
  const animRun = (name, opts, setup) => run(name, opts, async p => { extraAsked(p); await holdBundle(p); if (setup) await setup(p); },
    async (p, r) => { await p.waitForTimeout(1500); r.anim = await animState(p); r.boot = await bootState(p); r.extraRequests = p._extra; });
  await animRun('anim-plays', DESKTOP, null);
  await animRun('anim-system-reduced', { ...MOBILE, reducedMotion: 'reduce' }, null);
  await animRun('anim-setting-reduced', DESKTOP, p => p.addInitScript("localStorage.setItem('mcu.motion.v1','reduced');"));
  {
    const a = R['anim-plays'];
    expect(a.anim.anim === 'playing' && a.anim.markAnim === 'boot-bounce' && a.anim.rippleAnim === 'boot-ripple-fade' && a.anim.ring === 'none', 'anim-plays: ' + JSON.stringify(a.anim));
    const want = { 0: 0, 400: -7.3, 600: 1.8, 760: 0, 1000: 0 };
    for (const ms in want) expect(Math.abs((a.anim.lift[ms] ?? 99) - want[ms]) <= 0.15, 'anim-plays: at ' + ms + ' ms the pin is at ' + a.anim.lift[ms] + 'px, expected ' + want[ms]);
    expect(a.anim.markH === 48, 'anim-plays: the pin is ' + a.anim.markH + 'px tall, expected 48');
    expect(a.extraRequests.length === 0, 'anim-plays: asked for ' + a.extraRequests.join(', '));
    for (const n of ['anim-system-reduced', 'anim-setting-reduced']) {
      const r = R[n].anim;
      expect(r.anim === 'off' && r.markAnim === 'none' && r.rippleAnim === 'none' && r.ring === 'block', n + ': ' + JSON.stringify(r));
    }
    expect(R['anim-setting-reduced'].anim.reduceClass, 'anim-setting-reduced: <html> lacks .reduce-motion');
    const f = R['bundle-blocked'].final;
    expect(f && f.state === 'failed', 'bundle-blocked: ' + JSON.stringify(f));
  }
  R.errors = problems;
  console.log(JSON.stringify(R, null, 1));
  if (problems.length) { problems.forEach(m => console.log('!! ' + m)); process.exitCode = 1; }
  await browser.close(); server.close();
})();
