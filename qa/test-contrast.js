// The contrast calculation. AGENTS.md has always asked for "axe-core and a
// contrast calculation"; only the axe half was ever running, and the half that
// was missing is the half that catches things axe cannot see.
//
// axe reports text it cannot resolve a background for as *incomplete*, not as
// a violation — "Element's background color could not be determined due to a
// pseudo element" — and qa/a11y-scan.js fails only on violations. So any text
// sitting over a pseudo-element, a gradient or an image has been unchecked
// since the scan was written. That is exactly where the Spatial band labels
// live, and they have been below AA in phases 3 and 6 since V3 shipped.
//
// Three parts:
//   1. tokens    the declared text pairs in src/index.css, in both themes,
//                read through the real theme mechanism (window.MCU_THEME).
//   2. preview   every piece of text on design.html, in both themes, measured
//                against the background actually painted behind it.
//   3. app       the app's own text that axe leaves incomplete, measured the
//                same way.
//
// Parts 2 and 3 measure the painted background rather than computing it from
// the ancestor chain: the text is made transparent, the page is photographed,
// and the most common colour inside each text box is its background. That is
// what the eye gets, pseudo-elements and all.
//
// Not covered: non-text contrast (WCAG 1.4.11 — borders, focus rings, the
// switch's track). Those need measuring where they render against what they
// sit on, not at the token level, and they are nobody's ticket yet.
const QA_PORT = +process.env.PORT || 8296;
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
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const SEED = "localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','iron-man-2':'seen','thor':'seen','avengers':'seen','civil-war':'seen','loki-s1':'watchlist','shang-chi':'watchlist'}}));";
const NOWELCOME = "try { localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";

// Text pairs declared in src/index.css. Every one of these is used as text on
// that surface somewhere, so every one needs 4.5:1.
const TOKEN_PAIRS = [
  ['foreground', 'background'], ['foreground', 'card'], ['foreground', 'muted'],
  ['foreground', 'secondary'], ['foreground', 'accent'],
  ['muted-foreground', 'background'], ['muted-foreground', 'card'],
  ['muted-foreground', 'popover'], ['muted-foreground', 'muted'],
  ['muted-foreground', 'secondary'], ['muted-foreground', 'accent'],
  ['card-foreground', 'card'], ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'], ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  // Vega paints --destructive as text, never as a surface, so these are the
  // backgrounds it lands on.
  ['destructive', 'background'], ['destructive', 'card'],
  // Collection status as text, and the ink set on status and phase fills
  // (badges, the filter's phase buttons, the Seen and Watchlist buttons).
  ['seen-text', 'background'], ['seen-text', 'card'],
  ['status-watch', 'background'], ['status-watch', 'card'],
  ['seen-foreground', 'seen'], ['on-color', 'status-watch'],
  ['on-color', 'phase-1'], ['on-color', 'phase-2'], ['on-color', 'phase-3'],
  ['on-color', 'phase-4'], ['on-color', 'phase-5'], ['on-color', 'phase-6'],
];

// Shortfalls that have been looked at and accepted, each with the ratio
// measured when it was accepted. A worse ratio still fails, and one that now
// passes is reported so the entry can go: an allowlist nobody prunes stops
// being a record of decisions and becomes a place failures hide.
// Phases 3 and 6 were lightened on 2026-11-01 (Notion, "Spatial band labels
// fail WCAG AA in phases 3 and 6"); phase 4 on a card was not part of that.
const PHASE_DEFERRED = 'the dark phase-4 token keeps V3\'s own value; adjusting it is art '
  + 'direction, left for the Phase 4 re-skin by the user\'s decision of 2026-10-31';
const KNOWN = [
  { where: 'tokens dark', what: 'phase-4 on card', fg: 'rgb(160,92,208)', ratio: 4.21, why: PHASE_DEFERRED },
  { where: 'preview dark', what: 'div.font-mono.text-[10px].uppercase', text: 'Phase 4', fg: 'rgb(160,92,208)', ratio: 4.21, why: PHASE_DEFERRED },
];

const REQUIRED = (size, weight) => ((size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5);
const lum = (c) => {
  const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const ratio = (f, b) => {
  const l1 = lum(f), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};

// ---- in-page helpers -------------------------------------------------------

// Resolve any colour syntax to RGB, composited over the colours under it.
// getComputedStyle hands back oklch() verbatim in Chromium, so reading the
// numbers out of the string is not an option; a canvas pixel is exact, and
// painting the stack in order is what makes a token with alpha come out right.
const RESOLVE = `window.__rgb = (stack) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const g = cv.getContext('2d', { willReadFrequently: true });
  for (const c of stack) {
    if (!c) return null;
    g.fillStyle = c;
    g.fillRect(0, 0, 1, 1);
  }
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
};`;

// Every element with text of its own, visible and big enough to read.
const COLLECT = `window.__collect = () => {
  const out = [];
  window.__hidden = [];
  for (const el of document.body.querySelectorAll('*')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    // Text that is part of a picture (role="img", such as the generated poster
    // art) or marked as decoration has no contrast requirement: WCAG 1.4.3
    // exempts both. SVG text also paints with fill, not color, so it could not
    // be measured this way anyway.
    if (el.closest('[role="img"], [aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const text = el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40);
    const sel = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
    window.__hidden.push(el);
    out.push({
      sel, text, i: window.__hidden.length - 1,
      x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height,
      color: window.__rgb([cs.color]),
      size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400,
      axe: el.dataset.qaAxe === '1',
    });
  }
  return out;
};
window.__hideText = () => {
  window.__saved = window.__hidden.map(el => el.getAttribute('style'));
  for (const el of window.__hidden) {
    el.style.setProperty('color', 'transparent', 'important');
    el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
  }
};
window.__showText = () => {
  window.__hidden.forEach((el, i) => {
    const s = window.__saved[i];
    if (s === null) el.removeAttribute('style'); else el.setAttribute('style', s);
  });
};
// The most common colour inside each box of the photograph: with the text
// transparent, that is the background behind it.
window.__sample = (src, boxes) => new Promise((done) => {
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const scale = img.width / document.documentElement.clientWidth;
    done(boxes.map((b) => {
      const x0 = Math.max(0, Math.round(b.x * scale)), y0 = Math.max(0, Math.round(b.y * scale));
      const x1 = Math.min(img.width, Math.round((b.x + b.w) * scale));
      const y1 = Math.min(img.height, Math.round((b.y + b.h) * scale));
      if (x1 <= x0 || y1 <= y0) return null;
      const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      const count = new Map();
      const step = Math.max(1, Math.floor(Math.sqrt((x1 - x0) * (y1 - y0) / 4000)));
      for (let y = 0; y < y1 - y0; y += step) {
        for (let x = 0; x < x1 - x0; x += step) {
          const o = (y * (x1 - x0) + x) * 4;
          const k = d[o] + ',' + d[o + 1] + ',' + d[o + 2];
          count.set(k, (count.get(k) || 0) + 1);
        }
      }
      let best = null, n = 0;
      for (const [k, v] of count) if (v > n) { n = v; best = k; }
      return best ? best.split(',').map(Number) : null;
    }));
  };
  img.onerror = () => done(boxes.map(() => null));
  img.src = src;
});`;

// ---- measuring a page ------------------------------------------------------

// Text whose box lands outside the photograph cannot be measured, and in the
// Spatial canvas that is most of it: the timeline runs 10,000px wide, so five
// of the six band labels sit off screen at the opening camera. Those are
// counted and reported rather than quietly dropped — a check that skips what
// it cannot see is the same trap as a scan that passes what it cannot resolve.
async function measureRendered(page, label, only) {
  await page.evaluate(RESOLVE + COLLECT);
  let items = await page.evaluate(() => window.__collect());
  if (only) items = items.filter(it => only(it));
  if (!items.length) return { rows: [], unmeasured: 0 };
  await page.evaluate(() => window.__hideText());
  const shot = (await page.screenshot({ fullPage: true })).toString('base64');
  const boxes = items.map(({ x, y, w, h }) => ({ x, y, w, h }));
  const backs = await page.evaluate(
    ({ src, boxes }) => window.__sample(src, boxes),
    { src: 'data:image/png;base64,' + shot, boxes },
  );
  await page.evaluate(() => window.__showText());
  let unmeasured = 0;
  const seen = new Set();
  const rows = items.map((it, i) => {
    const bg = backs[i];
    if (!bg || !it.color) { unmeasured++; return null; }
    return {
      where: label, what: it.sel, text: it.text,
      ratio: ratio(it.color, bg), min: REQUIRED(it.size, it.weight),
      fg: 'rgb(' + it.color.join(',') + ')', bg: 'rgb(' + bg.join(',') + ')',
      size: it.size, weight: it.weight,
    };
  }).filter(Boolean).filter((r) => {
    // Now that each row carries what it renders as, identical rows really are
    // one finding: 64 list rows in the same two colours collapse, eight
    // swatches in eight colours do not.
    const k = keyOf(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { rows, unmeasured };
}

async function measureTokens(page, theme) {
  await page.evaluate(RESOLVE);
  return page.evaluate(({ pairs, theme }) => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue('--' + n).trim();
    const out = [];
    // Tokens can carry alpha, so each one is painted over --background (and a
    // foreground over its own surface) rather than read on its own.
    const base = v('background');
    const pair = (fg, bg) => {
      const back = window.__rgb([base, v(bg)]);
      const front = window.__rgb([base, v(bg), v(fg)]);
      if (back && front) out.push({ where: 'tokens ' + theme, what: fg + ' on ' + bg, fg: front, bg: back });
    };
    for (const [fg, bg] of pairs) pair(fg, bg);
    for (let n = 1; n <= 6; n++) { pair('phase-' + n, 'background'); pair('phase-' + n, 'card'); }
    return out;
  }, { pairs: TOKEN_PAIRS, theme });
}

// ---- the run ---------------------------------------------------------------

// Place, element, wording and the colour itself. Nothing shorter identifies a
// finding: the six band labels share a class and differ only in their text,
// and the token swatches share a class *and* their text and differ only in
// their colours. An earlier version of this check deduplicated on class and
// wording alone and so measured one swatch out of eight, missing a real
// failure — the same mistake as a scan that passes what it cannot resolve.
const keyOf = (f) => [f.where, f.what, f.text, f.fg].filter(Boolean).join(' :: ');

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const found = [];
  const notes = [];

  const context = async (opts, init) => {
    const ctx = await browser.newContext(opts);
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    // Nothing off this machine, as every check does.
    await page.route('**/*', r => (r.request().url().startsWith('http://127.0.0.1') || r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    return { ctx, page };
  };

  // --- the design system: tokens, then the preview as it renders ---
  {
    // Tall enough that the whole preview is in one photograph.
    const { ctx, page } = await context({ viewport: { width: 1280, height: 2600 } });
    await page.goto(URL_BASE + 'design.html');
    await page.waitForSelector('main', { timeout: 15000 });
    await page.waitForTimeout(600);
    for (const theme of ['light', 'dark']) {
      const applied = await page.evaluate((t) => {
        // Through the real mechanism, not by toggling the class behind it.
        window.MCU_THEME.setChoice(t);
        return { choice: window.MCU_THEME.getChoice(), dark: document.documentElement.classList.contains('dark') };
      }, theme);
      if (applied.choice !== theme || applied.dark !== (theme === 'dark')) {
        errors.push('MCU_THEME.setChoice("' + theme + '") left ' + JSON.stringify(applied));
      }
      await page.waitForTimeout(250);
      for (const t of await measureTokens(page, theme)) {
        found.push({ where: t.where, what: t.what, text: '', ratio: ratio(t.fg, t.bg), min: 4.5, fg: 'rgb(' + t.fg.join(',') + ')', bg: 'rgb(' + t.bg.join(',') + ')' });
      }
      const r = await measureRendered(page, 'preview ' + theme);
      found.push(...r.rows);
      if (r.unmeasured) notes.push({ view: 'preview ' + theme, unmeasured: r.unmeasured });
    }
    // And the mechanism itself: no override until one is made, the system
    // followed while there is none, and the override kept once there is one.
    const mech = await page.evaluate(() => {
      const r = {};
      window.MCU_THEME.setChoice('system');
      r.clearedChoice = window.MCU_THEME.getChoice();
      r.storedAfterClear = localStorage.getItem(window.MCU_THEME.STORAGE_KEY);
      r.followsSystem = window.MCU_THEME.getTheme() === window.MCU_THEME.systemTheme();
      window.MCU_THEME.setChoice('dark');
      r.storedAfterChoice = localStorage.getItem(window.MCU_THEME.STORAGE_KEY);
      window.MCU_THEME.setChoice('system');
      return r;
    });
    if (mech.clearedChoice !== 'system') errors.push('theme: clearing the override left choice ' + mech.clearedChoice);
    if (mech.storedAfterClear !== null) errors.push('theme: clearing the override left ' + mech.storedAfterClear + ' in storage');
    if (!mech.followsSystem) errors.push('theme: with no override the theme does not follow the system');
    if (mech.storedAfterChoice !== 'dark') errors.push('theme: choosing dark stored ' + mech.storedAfterChoice);
    notes.push({ mechanism: mech });
    await ctx.close();
  }

  // --- the app: the text axe leaves unresolved ---
  const views = [
    ['desktop spatial', { viewport: { width: 1440, height: 900 } }, { version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release' }],
    ['desktop list', { viewport: { width: 1440, height: 900 } }, { version: 1, viewMode: 'list', desktopView: 'list', sort: 'phase' }],
    ['phone list', { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, { version: 1, viewMode: 'list', desktopView: 'list', sort: 'release' }],
  ];
  // Both themes: the app follows the system since the first re-skin pass, and
  // a browser left at its default only ever shows the light one.
  for (const scheme of ['dark', 'light']) for (const [view, opts, prefs] of views) {
    const label = scheme + ' ' + view;
    const { ctx, page } = await context({ ...opts, colorScheme: scheme }, NOWELCOME + SEED + "localStorage.setItem('mcu.prefs.v1', '" + JSON.stringify(prefs) + "');");
    await page.goto(URL_BASE);
    await require('./ready').appReady(page, 1200);
    await page.addScriptTag({ content: AXE });
    // Only the nodes axe gave up on: its violations are qa/a11y-scan.js's job,
    // and this is the gap that scan structurally cannot see. Each one is
    // marked and exactly those are measured. (This used to match by text, so
    // one unresolved "T" measured every "T" on the page, including letters
    // inside the generated poster art.)
    const { unresolved, marked } = await page.evaluate(async () => {
      const res = await axe.run(document, { resultTypes: ['violations', 'incomplete'], runOnly: ['color-contrast'] });
      const nodes = (res.incomplete || []).flatMap(v => v.nodes);
      let marked = 0;
      for (const n of nodes) {
        const e = document.querySelector(n.target.join(' '));
        if (e && [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) { e.dataset.qaAxe = '1'; marked++; }
      }
      return { unresolved: nodes.length, marked };
    });
    notes.push({ view: label, axeIncomplete: unresolved, measurable: marked });
    if (marked) {
      const r = await measureRendered(page, 'app ' + label, (it) => it.axe);
      found.push(...r.rows);
      if (r.unmeasured) notes.push({ view: label, unmeasured: r.unmeasured });
    }
    await ctx.close();
  }

  // The Spatial band labels, one phase at a time. ?phase=N narrows the layout
  // to that phase, which brings its label to the opening camera; otherwise
  // only phase 1's is ever on screen, and phases 2 to 6 are the ones that have
  // been failing since V3.
  for (const scheme of ['dark', 'light']) for (let n = 1; n <= 6; n++) {
    const { ctx, page } = await context(
      { viewport: { width: 1440, height: 900 }, colorScheme: scheme },
      NOWELCOME + SEED + "localStorage.setItem('mcu.prefs.v1', '" + JSON.stringify({ version: 1, viewMode: 'list', desktopView: 'spatial', sort: 'release' }) + "');",
    );
    await page.goto(URL_BASE + '?phase=' + n);
    await require('./ready').appReady(page, 1200);
    const r = await measureRendered(page, 'app ' + scheme + ' spatial band', (it) => it.sel.includes('band-label'));
    found.push(...r.rows);
    if (!r.rows.length) errors.push(scheme + ' phase ' + n + ': no band label measured');
    await ctx.close();
  }

  // --- the verdict ---
  const short = found.filter(f => f.ratio < f.min);
  const knownBy = new Map(KNOWN.map(k => [keyOf(k), k]));
  const hit = new Set();
  for (const f of short) {
    const k = knownBy.get(keyOf(f));
    if (!k) { errors.push(keyOf(f) + ' = ' + f.ratio + ':1, needs ' + f.min + ' (' + f.fg + ' on ' + f.bg + (f.text ? ', "' + f.text + '"' : '') + ')'); continue; }
    hit.add(keyOf(f));
    // Accepted at a measured ratio; getting worse is a new failure.
    if (f.ratio < k.ratio - 0.05) errors.push(keyOf(f) + ' was accepted at ' + k.ratio + ':1 and is now ' + f.ratio + ':1');
  }
  for (const k of KNOWN) {
    const key = keyOf(k);
    if (hit.has(key)) continue;
    const now = found.find(f => keyOf(f) === key);
    if (now) errors.push('known shortfall ' + key + ' now passes at ' + now.ratio + ':1 — remove it from KNOWN');
  }

  console.log(JSON.stringify({
    measured: found.length,
    below: short.map(f => ({ where: f.where, what: f.what, text: f.text || undefined, ratio: f.ratio, min: f.min, fg: f.fg, bg: f.bg })),
    known: KNOWN.map(k => keyOf(k) + ' (' + k.ratio + ':1)'),
    notes,
    errors,
  }, null, 1));
  await browser.close();
  server.close();
  if (errors.length) process.exitCode = 1;
})();
