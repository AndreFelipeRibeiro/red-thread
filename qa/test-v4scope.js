// The design system's seam with V3 (Notion V4 Tasks, "Phase 4 — wire the
// design system into the app"). Through Phase 4 the app is part V3 and part
// design system, and this check holds the line between them:
//   1. The reset stays out of V3. Tailwind's preflight is scoped to .v4
//      (src/preflight-v4.css); applied to the whole page it changed 166
//      computed properties on V3 elements. Outside .v4 the page must keep the
//      browser defaults V3 was written against.
//   2. The reset works inside .v4, which is how every surface ticket opts in.
//   3. The two token sets don't collide, and V3's follow the design system's.
//      V3's colour tokens are --v3-*, so shadcn's --border and --accent keep
//      their own values; since the first re-skin pass each --v3-* token is
//      defined from its design-system counterpart, so V3's rules follow the
//      theme, and so do native controls (color-scheme).
//   4. The theme is wired: the class follows the system before the bundle
//      arrives, an override survives a reload, and clearing it goes back to
//      following the system.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8297;
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
// qa/serve-site.js wraps this and serves the built tree; the fallback below is
// for running the check by hand without it.
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL_BASE = 'http://127.0.0.1:' + QA_PORT + '/';
const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";
// V3's old hardcoded values. If shadcn's tokens ever read these, the rename
// has been undone somewhere.
const V3_BORDER = '#232838', V3_ACCENT = '#4a8de8';

async function open(browser, opts, errors, label) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(NOWELCOME);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(label + ': pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(label + ': console: ' + m.text()); });
  await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  return { ctx, page };
}

// What the page looks like from inside: V3's elements, a probe opted into
// .v4, the tokens and the theme.
const SNAPSHOT = () => {
  const root = document.documentElement, cs = getComputedStyle(root);
  const outside = el => !el.closest('.v4');
  // V3 icons the reset would move: V3 makes them block itself but leaves their
  // vertical-align at the browser's baseline, which the reset sets to middle.
  // The toolbar's icons moved inside .v4 with shadcn pass 1/5, and the cards,
  // Seen / Watchlist and Up next with 2/5, and the phone List rows with 4/5,
  // which left no V3 icon on the phone page. So the sample is the canvas's
  // thread layer where there is one (desktop) plus an icon of the check's
  // own, placed outside .v4 the way any V3 icon sits: it says whether the
  // reset reaches V3 whatever the page still holds.
  const own = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  own.setAttribute('class', 'v3-probe');
  document.body.appendChild(own);
  const svgs = [...document.querySelectorAll('svg.connection-layer, svg.v3-probe')].filter(outside);
  const probe = document.createElement('div');
  probe.className = 'v4';
  probe.innerHTML = '<button type="button">probe</button><svg width="10" height="10"></svg><ul><li>x</li></ul>';
  document.body.appendChild(probe);
  const p = getComputedStyle(probe), pb = getComputedStyle(probe.querySelector('button'));
  const out = {
    dark: root.classList.contains('dark'),
    choice: window.MCU_THEME ? window.MCU_THEME.getChoice() : null,
    stored: localStorage.getItem('mcu.theme'),
    htmlLineHeight: cs.lineHeight,
    htmlColorScheme: cs.colorScheme,
    v3Svgs: svgs.map(el => el.getAttribute('class') + ':' + getComputedStyle(el).verticalAlign),
    v3Border: cs.getPropertyValue('--v3-border').trim(),
    v3Accent: cs.getPropertyValue('--v3-accent').trim(),
    v3Text: cs.getPropertyValue('--v3-text').trim(),
    primary: cs.getPropertyValue('--primary').trim(),
    border: cs.getPropertyValue('--border').trim(),
    accent: cs.getPropertyValue('--accent').trim(),
    foreground: cs.getPropertyValue('--foreground').trim(),
    probeLineHeight: p.lineHeight, probeFontSize: p.fontSize,
    probeButtonBg: pb.backgroundColor,
    probeSvg: getComputedStyle(probe.querySelector('svg')).display,
    probeList: getComputedStyle(probe.querySelector('ul')).listStyleType,
    probeColor: p.color,
  };
  // The probe's colour should be --foreground, resolved by the same engine.
  const ref = document.createElement('div'); ref.style.color = 'var(--foreground)'; document.body.appendChild(ref);
  out.foregroundResolved = getComputedStyle(ref).color;
  ref.remove(); probe.remove(); own.remove();
  return out;
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const seen = {};

  // The built page carries the pre-paint rule as an inline classic script in
  // <head>. Where it sits among the tags doesn't matter: a classic script runs
  // as it is parsed, before <body> paints, and the bundle is a module, which
  // only runs once parsing is done.
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const pre = [...head.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].find(m => m[2].includes("getItem('mcu.theme')"));
  if (!pre) errors.push('index.html: no inline pre-paint theme script in <head>');
  else if (/type="module"/.test(pre[1])) errors.push('index.html: the pre-paint script is a module, so it runs too late to paint with');

  for (const [label, opts] of [
    ['desktop', { viewport: { width: 1440, height: 900 } }],
    ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) for (const scheme of ['dark', 'light']) {
    const tag = label + ' ' + scheme;
    const { ctx, page } = await open(browser, { ...opts, colorScheme: scheme }, errors, tag);
    await page.goto(URL_BASE);
    await require('./ready').appReady(page, 300);
    const s = await page.evaluate(SNAPSHOT);
    seen[tag] = s;

    // 1. V3 keeps the browser's defaults.
    if (s.htmlLineHeight !== 'normal') errors.push(tag + ': <html> line-height is ' + s.htmlLineHeight + ', not normal — the reset reached V3');
    if (s.htmlColorScheme !== scheme) errors.push(tag + ': <html> color-scheme is ' + s.htmlColorScheme + ', not ' + scheme + ' — native controls do not follow the theme');
    if (!s.v3Svgs.length) errors.push(tag + ': none of the V3 icons this check reads is on the page');
    for (const v of s.v3Svgs) if (!v.endsWith(':baseline')) errors.push(tag + ': V3 icon vertical-align ' + v + ', not baseline');
    // 2. Inside .v4 the reset applies.
    const lh = parseFloat(s.probeLineHeight) / parseFloat(s.probeFontSize);
    if (Math.abs(lh - 1.5) > 0.01) errors.push(tag + ': .v4 line-height ratio is ' + lh.toFixed(2) + ', not 1.5');
    if (s.probeButtonBg !== 'rgba(0, 0, 0, 0)') errors.push(tag + ': a .v4 button background is ' + s.probeButtonBg + ', not transparent');
    if (s.probeSvg !== 'block') errors.push(tag + ': a .v4 svg is display ' + s.probeSvg + ', not block');
    if (s.probeList !== 'none') errors.push(tag + ': a .v4 list keeps its bullets');
    if (s.probeColor !== s.foregroundResolved) errors.push(tag + ': a .v4 root inherits ' + s.probeColor + ' instead of --foreground ' + s.foregroundResolved);
    // 3. No collision.
    if (!s.border || s.border.toLowerCase() === V3_BORDER) errors.push(tag + ': --border is ' + (s.border || 'missing') + ' — V3\'s value, or none');
    if (!s.accent || s.accent.toLowerCase() === V3_ACCENT) errors.push(tag + ': --accent is ' + (s.accent || 'missing') + ' — V3\'s value, or none');
    if (s.v3Border !== s.border) errors.push(tag + ': --v3-border is ' + s.v3Border + ', not the design system\'s --border ' + s.border);
    if (s.v3Accent !== s.primary) errors.push(tag + ': --v3-accent is ' + s.v3Accent + ', not --primary ' + s.primary);
    if (s.v3Text !== s.foreground) errors.push(tag + ': --v3-text is ' + s.v3Text + ', not --foreground ' + s.foreground);
    // 4. The theme follows the system, with no override stored.
    if (s.dark !== (scheme === 'dark')) errors.push(tag + ': <html> dark class is ' + s.dark + ' under a ' + scheme + ' system');
    if (s.choice !== 'system' || s.stored !== null) errors.push(tag + ': starts with choice ' + s.choice + ' / stored ' + s.stored + ', not system / none');
    await ctx.close();
  }

  // 4, continued: an override wins over the system and survives a reload, and
  // clearing it goes back to following the system.
  {
    const tag = 'override';
    const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }, errors, tag);
    await page.goto(URL_BASE);
    await require('./ready').appReady(page, 300);
    if (!(await page.evaluate(() => !!window.MCU_THEME))) {
      errors.push(tag + ': window.MCU_THEME is missing, so the app never started the theme');
      await ctx.close();
      console.log(JSON.stringify({ seen, errors }, null, 1));
      await browser.close(); server.close(); process.exitCode = 1; return;
    }
    await page.evaluate(() => window.MCU_THEME.setChoice('light'));
    const a = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), stored: localStorage.getItem('mcu.theme') }));
    if (a.dark || a.stored !== 'light') errors.push(tag + ': choosing light under a dark system left dark=' + a.dark + ', stored=' + a.stored);
    await page.reload();
    // Read before the bundle runs: what the pre-paint rule decided.
    const b = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (b) errors.push(tag + ': after a reload the light override was not honoured');
    await require('./ready').appReady(page, 300);
    await page.evaluate(() => window.MCU_THEME.setChoice('system'));
    const c = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), stored: localStorage.getItem('mcu.theme') }));
    if (!c.dark || c.stored !== null) errors.push(tag + ': clearing the override left dark=' + c.dark + ', stored=' + c.stored);
    seen[tag] = { afterChoose: a, afterReloadDark: b, afterClear: c };
    await ctx.close();
  }

  console.log(JSON.stringify({ seen, errors }, null, 1));
  await browser.close();
  server.close();
  if (errors.length) process.exitCode = 1;
})();
