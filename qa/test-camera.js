// Checks saved display preferences (mcu.prefs.v1) on mobile and desktop.
const QA_PORT = +process.env.PORT || 8192; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = path.join(S, process.env.SITE || '..');
const V = path.join(S, 'vendor');
const VENDOR = {
  'react@18.3.1/umd/react.development.js': 'x-react-18.3.1/package/umd/react.development.js',
  'react-dom@18.3.1/umd/react-dom.development.js': 'x-react-dom-18.3.1/package/umd/react-dom.development.js',
  'react@18.3.1/umd/react.production.min.js': 'x-react-18.3.1/package/umd/react.production.min.js',
  'react-dom@18.3.1/umd/react-dom.production.min.js': 'x-react-dom-18.3.1/package/umd/react-dom.production.min.js',
  '@babel/standalone@7.29.0/babel.min.js': 'x-babel-standalone-7.29.0/package/babel.min.js',
  '@supabase/supabase-js@2.112.2/dist/umd/supabase.js': 'x-supabase-supabase-js-2.112.2/package/dist/umd/supabase.js',
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/babel', '.css': 'text/css' };
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
  await ctx.addInitScript("try { localStorage.setItem('mcu.welcome.v1', 'test'); } catch (e) {}");
  if (init) await ctx.addInitScript(init);
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



const T = page => page.evaluate(() => document.querySelector('.canvas').style.transform);
const TR = page => page.evaluate(() => document.querySelector('.canvas').style.transition || '');
// A drag now ends with a short inertial glide, so a position read straight
// after mouseup is mid-flight. Wait for the canvas to hold still.
const settleCanvas = async (page, timeout = 2500) => {
  let last = null, stable = 0;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const t = await T(page);
    if (t === last) { if (++stable >= 2) return t; } else { stable = 0; last = t; }
    await page.waitForTimeout(60);
  }
  return last;
};
// The canvas's style.transform jumps straight to its end value, so it can't
// say whether the cards are still gliding into a ring. Their on-screen boxes
// can: wait until two samples in a row agree.
const settleCards = async (page, timeout = 2500) => {
  const boxes = () => page.evaluate(() => [...document.querySelectorAll('.card')].slice(0, 80)
    .map(c => { const r = c.getBoundingClientRect(); return Math.round(r.left * 2) + ',' + Math.round(r.top * 2) + ',' + Math.round(r.width * 2); }).join(' '));
  let last = null, stable = 0;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const b = await boxes();
    if (b === last) { if (++stable >= 2) return true; } else { stable = 0; last = b; }
    await page.waitForTimeout(80);
  }
  return false;
};
const parse = t => { const m = t.match(/translate(?:3d)?\(([-\d.]+)px, ([-\d.]+)px.*scale\(([-\d.]+)\)/); return m ? { x: +m[1], y: +m[2], s: +m[3] } : null; };
const near = (a, b, tol = 1.5) => a && b && Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.s - b.s) < 0.002;
async function emptyPoint(page, xs, ys) {
  return page.evaluate(([xs, ys]) => {
    for (const y of ys) for (const x of xs) {
      const el = document.elementFromPoint(x, y);
      if (el && el.closest('.viewport') && !el.closest('.card') && !el.closest('.zoom-ctl') && !el.closest('.drawer')) return { x, y };
    }
    return null;
  }, [xs, ys]);
}
async function centerCard(page, exclude) {
  return page.evaluate((exclude) => {
    const W = innerWidth, H = innerHeight;
    // Cards outside the selected title's ring stay in the page, invisible and
    // not clickable (.ring-hidden): never pick one.
    const cards = [...document.querySelectorAll('.card:not(.ring-hidden)')].map(c => ({ c, r: c.getBoundingClientRect() }))
      .filter(({ r }) => r.left > 20 && r.right < W - 400 && r.top > 140 && r.bottom < H - 20);
    const pick = cards.filter(({ c }) => !exclude || !c.textContent.includes(exclude))
      .sort((a, b) => Math.hypot(a.r.x - W / 2, a.r.y - H / 2) - Math.hypot(b.r.x - W / 2, b.r.y - H / 2))[0];
    if (!pick) return null;
    return { x: pick.r.left + pick.r.width / 2, y: pick.r.top + pick.r.height * 0.8, title: pick.c.querySelector('.card-title, h3, .title') ? pick.c.querySelector('.card-title, h3, .title').textContent : pick.c.textContent.slice(0, 40) };
  }, exclude);
}
// page.mouse.click moves and presses in one go. Hovering a card re-lays the
// canvas out, so in some states the press landed after the cards had shifted
// and selected nothing. Move, let the hover settle, then press.
async function clickCard(page, pt) {
  await page.mouse.move(pt.x, pt.y);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.up();
}
// Click card B in the ring around the selected card A. The press used to land
// on empty canvas now and then, which closes A and leaves nothing selected
// (Notion V4 Tasks, "test-camera fails intermittently"): B could be a card
// hidden outside the ring (centerCard now skips those), picked while the ring
// was still forming, or shifted by the hover. So: wait for the cards to stop,
// pick B, hover it, wait again, find B where it now is, and press only when
// the pointer is on B. Attempts are reported, as for openCentreCard.
async function clickRingCard(page, exclude, tally) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await settleCards(page);
    const b = await centerCard(page, exclude);
    if (!b) break;
    // Hover, let the canvas settle, and find B where it now is; repeat until
    // the pointer sits on B and B has stopped moving under it.
    let at = null, px = b.x, py = b.y;
    for (let step = 0; step < 4; step++) {
      await page.mouse.move(px, py);
      await page.waitForTimeout(step ? 150 : 250);
      await settleCards(page);
      at = await page.evaluate((title) => {
        const card = [...document.querySelectorAll('.card:not(.ring-hidden)')].find(c => {
          const t = c.querySelector('.card-title, h3, .title');
          return (t ? t.textContent : c.textContent.slice(0, 40)) === title;
        });
        if (!card) return null;
        const r = card.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height * 0.8;
        const hit = document.elementFromPoint(x, y);
        return hit && hit.closest('.card') === card ? { x, y, title } : null;
      }, b.title);
      if (!at) break;
      if (Math.abs(at.x - px) <= 1 && Math.abs(at.y - py) <= 1) break;
      px = at.x; py = at.y; at = null;
    }
    if (!at) { tally.push('B moved off the pointer: ' + b.title); continue; }
    await page.mouse.down();
    await page.waitForTimeout(40);
    await page.mouse.up();
    try {
      await page.waitForFunction(() => !!document.querySelector('.card.selected .card-title'), null, { timeout: 2500 });
      tally.push(attempt);
      return at;
    } catch (e) {
      // A was closed: nothing left to retry from. Say what the press hit.
      tally.push('pressed ' + at.title + ', nothing selected; drawer ' + (await page.evaluate(() => !!document.querySelector('.drawer.open'))));
      break;
    }
  }
  tally.push('failed');
  return null;
}
// Select the centre card and make sure it actually opened, re-measuring if the
// press missed. The canvas can still shift between measuring and pressing, and
// the steps after this one click .drawer-close, which has no target if nothing
// opened. Attempts are reported: a run that needs more than one is a signal,
// not something to hide.
async function openCentreCard(page, tally) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const pt = await centerCard(page);
    if (!pt) break;
    await clickCard(page, pt);
    try {
      await page.waitForFunction(() => !!document.querySelector('.drawer.open'), null, { timeout: 2500 });
      tally.push(attempt);
      return pt;
    } catch (e) { /* missed: measure again and retry */ }
  }
  tally.push('failed');
  return null;
}
// Phones (Notion "Phone: bottom bar becomes Explore, My list and Guides"):
// Spatial is the Explore tab, the List is My list (the Grid is gone).
const phoneView = async (page, v) => {
  if (v === 'spatial') { await page.locator('.m-tab[data-section="explore"]').click(); return; }
  if (!(await page.locator('.m-listbar').count())) { await page.locator('.m-tab[data-section="mylist"]').click(); await page.waitForTimeout(400); }
};
const pickView = (page, n) => phoneView(page, ['list', 'list', 'spatial'][n]);
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}; globalThis.__out = out;

  // ---- Desktop: pan toward Phase 6, select, close -> back where we were
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } });
  await go(page);
  out.desktopStart = parse(await T(page));
  for (let i = 0; i < 20; i++) {
    const d = await page.evaluate(() => {
      const card = [...document.querySelectorAll('.card')].filter(c => (window.TITLES.find(t => t.id === c.dataset.id) || {}).phase === 6)[2];
      const r = card.getBoundingClientRect();
      return { dx: innerWidth / 2 - (r.left + r.width / 2), dy: (innerHeight + 100) / 2 - (r.top + r.height / 2) };
    });
    if (Math.abs(d.dx) < 40 && Math.abs(d.dy) < 40) break;
    const mx = Math.max(-500, Math.min(500, d.dx)), my = Math.max(-250, Math.min(250, d.dy));
    const p = await emptyPoint(page, [720, 600, 840, 500, 940, 400, 1040, 300, 1140], [520, 480, 560, 440, 600, 400, 640, 360, 680]);
    if (!p) { out.panFail = i; break; }
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await page.mouse.move(p.x + mx, p.y + my, { steps: 4 }); await page.mouse.up();
  }
  await settleCanvas(page);
  const before = parse(await T(page));
  out.pannedTo = before;
  const a = await centerCard(page);
  out.cardA = a && a.title;
  await page.screenshot({ path: path.join(S, 'shots', 'cam-before-click.png') });
  out.aPoint = a;
  await clickCard(page, a);
  await page.waitForTimeout(900);
  out.drawerCount = await page.locator('.drawer-close').count();
  await page.screenshot({ path: path.join(S, 'shots', 'cam-after-click.png') });
  out.selectedMoved = !near(parse(await T(page)), before);
  await page.locator('.drawer-close').click();
  await page.waitForTimeout(100);
  out.glideDuring = await TR(page);
  await page.waitForTimeout(800);
  out.restored = near(parse(await T(page)), before);
  out.glideAfter = await TR(page);
  await page.screenshot({ path: path.join(S, 'shots', 'cam-desktop-restored.png') });

  // A -> B through the ring, then close: B centred at the original zoom
  const a2 = await centerCard(page);
  await clickCard(page, a2);
  await page.waitForTimeout(900);
  const ringClicks = [];
  const b = await clickRingCard(page, a2.title.slice(0, 12), ringClicks);
  out.ringClickAttempts = ringClicks;
  if (!b) throw new Error('A -> B: no ring card could be clicked (attempts ' + JSON.stringify(ringClicks) + ')');
  await page.waitForTimeout(900);
  // Measure whichever card the click actually selected (tiny ring cards overlap).
  b.title = await page.evaluate(() => document.querySelector('.card.selected .card-title').textContent);
  out.cardB = b.title;
  await page.locator('.drawer-close').click();
  await page.waitForTimeout(1400);
  const after = parse(await T(page));
  out.abScaleKept = after && Math.abs(after.s - before.s) < 0.002;
  out.abCentreOffset = await page.evaluate((name) => {
    const card = [...document.querySelectorAll('.card')].find(c => c.textContent.includes(name));
    const r = card.getBoundingClientRect();
    const vp = document.querySelector('.viewport').getBoundingClientRect();
    return [Math.round(r.left + r.width / 2 - (vp.left + vp.width / 2)), Math.round(r.top + r.height / 2 - (vp.top + vp.height / 2))];
  }, b.title.trim().slice(0, 14));

  // Glide cancels on wheel
  const cardOpens = [];
  await openCentreCard(page, cardOpens); await page.waitForTimeout(400);
  await page.mouse.move(600, 500);
  await page.locator('.drawer-close').click();
  const settle = async (want) => {
    try { await page.waitForFunction(w => (document.querySelector('.canvas').style.transition || '') !== '' === w, want, { timeout: 2000 }); }
    catch (e) { /* report whatever it actually is */ }
  };
  await settle(true);
  out.glideStartedBeforeWheel = (await TR(page)) !== '';
  await page.mouse.move(600, 500); await page.mouse.wheel(0, -100);
  await settle(false);
  out.glideCancelledByWheel = (await TR(page)) === '';

  // Sort change while selected clears the memory (no jump back into an old layout)
  await openCentreCard(page, cardOpens); await page.waitForTimeout(400);
  out.cardOpenAttempts = cardOpens;
  await page.locator('.sort-menu-trigger').first().click(); await page.waitForTimeout(250);
  await page.locator('.sort-menu-pop [data-sort="imdb"][data-dir="desc"]').click();
  await page.waitForTimeout(400);
  const afterSort = parse(await T(page));
  await page.locator('.drawer-close').click(); await page.waitForTimeout(900);
  out.sortWhileSelected_noJump = near(parse(await T(page)), afterSort);
  // The floating pill counts what is actually on the canvas. Selecting a card
  // fades every unconnected title out, so a pill still reporting the whole
  // catalogue would describe a screen nobody is looking at.
  out.pill = await (async () => {
    const before = (await page.locator('.ctx-count').innerText()).trim();
    const pt = await openCentreCard(page, cardOpens);
    if (!pt) return { error: 'no card opened for the pill check' };
    const r = await page.evaluate(() => ({
      pill: document.querySelector('.ctx-count').innerText.replace(/\s+/g, ' ').trim(),
      lit: [...document.querySelectorAll('.card')].filter((c) => {
        const st = getComputedStyle(c);
        return st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.35;
      }).length,
    }));
    await page.locator('.drawer-close').click(); await page.waitForTimeout(900);
    return { before, ...r, after: (await page.locator('.ctx-count').innerText()).trim() };
  })();
  {
    const pl = out.pill;
    if (pl.error) errors.push(pl.error);
    else {
      // Two numbers, in any language: "<shown> of <total>".
      const m = /(\d+)\D+(\d+)/.exec(pl.pill);
      if (!m) errors.push(`the pill reads "${pl.pill}" with a title selected; expected a shown-of-total pair`);
      else if (Number(m[1]) !== pl.lit) errors.push(`the pill says ${m[1]} titles but ${pl.lit} are lit on the canvas`);
      if (pl.after !== pl.before) errors.push(`the pill stayed at "${pl.after}" after closing; it opened at "${pl.before}"`);
    }
  }

  // regress.sh only reads fields whose name contains "errors", so these
  // booleans were decorative: any of them could be false and the run still
  // reported clean. Collect the failures into one, so they gate.
  out.assertErrors = Object.entries({
    selectedMoved: out.selectedMoved, restored: out.restored, abScaleKept: out.abScaleKept,
    glideStartedBeforeWheel: out.glideStartedBeforeWheel,
    glideCancelledByWheel: out.glideCancelledByWheel,
    sortWhileSelected_noJump: out.sortWhileSelected_noJump,
  }).filter(([, v]) => v !== true).map(([k, v]) => k + '=' + JSON.stringify(v));
  out.desktopErrors = errors;
  await ctx.close();

  // ---- Mobile
  ({ ctx, page, errors } = await ctxPage(browser, MOBILE));
  await go(page);
  await pickView(page, 2);
  await page.waitForTimeout(500);
  out.mobileEnterZoom = await page.locator('.zoom-val').first().textContent();
  const mStart = parse(await T(page));
  const mc = await page.evaluate(() => { const r = document.querySelector('.card').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 60 }; });
  await page.touchscreen.tap(mc.x, mc.y);
  await page.waitForTimeout(800);
  out.mobileSelectedMoved = !near(parse(await T(page)), mStart);
  const bg = await emptyPoint(page, [30, 200, 360], [700, 650, 600, 250]);
  await page.touchscreen.tap(bg.x, bg.y);
  await page.waitForTimeout(900);
  out.mobileRestored = near(parse(await T(page)), mStart);
  // List -> sheet -> "See connections in Spatial" -> deselect: normal framing
  await pickView(page, 0);
  await page.waitForTimeout(300);
  out.mobileReenterAfterList = null;
  await page.locator('.m-lrow-open').nth(10).click();
  await page.waitForTimeout(400);
  await page.locator('.m-apply.ghost', { hasText: 'Spatial' }).click();
  await page.waitForTimeout(900);
  const bg2 = await emptyPoint(page, [30, 200, 360], [700, 650, 600, 250]);
  await page.touchscreen.tap(bg2.x, bg2.y);
  await page.waitForTimeout(900);
  out.mobileGoSpatialThenClose = await page.locator('.zoom-val').first().textContent();
  await pickView(page, 1);
  await pickView(page, 2);
  await page.waitForTimeout(400);
  out.mobileReenterZoom = await page.locator('.zoom-val').first().textContent();
  out.mobileErrors = errors;
  await ctx.close();
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error(e.message.split('\n')[0]); console.log(JSON.stringify(globalThis.__out)); process.exit(1); });
