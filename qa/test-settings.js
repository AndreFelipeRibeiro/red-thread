// Settings (Notion V4 Tasks, "Settings menu").
//   - The gear opens Settings: a panel on desktop, a sheet on phones. The
//     theme control and the language menu are gone from the toolbar, the app
//     bar and the account sheet.
//   - Desktop: Settings takes the details drawer's place and gives it back on
//     close. Keyboard: Enter on the gear focuses the panel's heading; Escape
//     closes an open select first, then the panel, with focus back on the gear.
//   - Opening a title (a card, the card already open behind it, a List row)
//     closes Settings and shows its details: Settings slides out first, then
//     the details slide in.
//   - Desktop: D and L switch to dark and light (not while typing, not on the
//     phone layout), announced to screen readers and mentioned in Settings.
//   - Every setting takes effect at once and survives a reload: theme,
//     language, region, motion, celebrations.
//   - Device actions: reset guide progress, show the welcome again, clear this
//     device (asks first; Cancel keeps everything).
//   - Phone: Back closes the sheet; the app bar's title is not cut short at 375px;
//     the theme control's labels fit at 320px in Portuguese.
//   - The Welcome screen offers a language choice.
//   - axe finds nothing in the open panel or sheet, in light and in dark.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8302;
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
const NOWELCOME = "try { if (!localStorage.getItem('mcu.welcome.v1')) localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = {};
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };
  const open = async (opts, init = '') => {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(NOWELCOME + init);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
    return { ctx, page };
  };
  const ready = (page) => require('./ready').appReady(page, 300);
  const axe = async (page, scope, label) => {
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(async (sel) => {
      const res = await window.axe.run(document.querySelector(sel), { resultTypes: ['violations'] });
      return res.violations.map(x => x.id + ' (' + x.nodes.length + '): ' + x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', '));
    }, scope);
    out['axe ' + label] = v.length;
    v.forEach(x => errors.push('axe ' + label + ': ' + x));
  };

  // ---- Desktop ------------------------------------------------------------
  {
    const { ctx, page } = await open(DESK);
    await page.goto(URL_BASE + '?title=iron-man'); await ready(page);
    expect(await page.locator('.toolbar .settings-btn').count() === 1, 'desktop: no gear in the toolbar');
    expect(await page.locator('.toolbar .theme-toggle, .toolbar .lang-menu').count() === 0, 'desktop: theme control or language menu still in the toolbar');
    expect(await page.locator('.drawer.open').count() === 1, 'desktop: details drawer not open to start with');

    // Keyboard: focus the gear, Enter.
    await page.locator('.settings-btn').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    expect(await page.locator('.settings-panel.open[role="dialog"]').count() === 1, 'desktop: Enter on the gear did not open the panel');
    expect(await page.locator('.drawer.open').count() === 0, 'desktop: the details drawer stayed open under Settings');
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'settings-title', 'desktop: keyboard open did not focus the heading');
    await axe(page, '.settings-panel', 'desktop light');

    // Escape: an open select first, then the panel.
    await page.locator('.settings-panel [data-slot="select-trigger"]').click(); await page.waitForTimeout(300);
    expect(await page.locator('[data-slot="select-content"][data-open]').count() === 1, 'desktop: region select did not open');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    expect(await page.locator('.settings-panel').count() === 1, 'desktop: Escape on the open select closed the panel too');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    expect(await page.locator('.settings-panel').count() === 0, 'desktop: second Escape did not close the panel');
    expect(await page.locator('.drawer.open').count() === 1, 'desktop: the details drawer did not come back');
    expect(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('settings-btn')), 'desktop: focus did not return to the gear');

    // Every setting, then a reload.
    await page.locator('.settings-btn').click(); await page.waitForTimeout(500);
    const panel = page.locator('.settings-panel');
    await panel.getByRole('radio', { name: 'Dark' }).click(); await page.waitForTimeout(150);
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'theme: Dark did not apply at once');
    await axe(page, '.settings-panel', 'desktop dark');
    await panel.getByRole('switch', { name: 'Reduce motion' }).click(); await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion') && window.MCU_MOTION.reduced()), 'motion: Reduce motion did not apply at once');
    // The whole row toggles its switch, not just the knob.
    await panel.getByText('Confetti when you finish a phase or a guide').click(); await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.MCU_PREFS.celebrations() === false), 'celebrations: tapping the row did not switch them off');
    expect(await panel.getByRole('switch', { name: 'Celebrations' }).getAttribute('aria-checked') === 'false', 'celebrations: the switch does not show off');
    await panel.locator('[data-slot="select-trigger"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-slot="select-content"][data-open] [role="option"]', { hasText: 'Brazil' }).click(); await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.MCU_region.get()) === 'BR', 'region: choosing Brazil did not apply');
    await panel.getByRole('radio', { name: 'Português (Brasil)' }).click(); await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.lang) === 'pt-BR', 'language: Português did not apply at once');
    expect(await page.locator('#settings-title').textContent() === 'Configurações', 'language: the panel did not redraw in Portuguese');
    await page.reload(); await ready(page);
    const after = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'), lang: document.documentElement.lang,
      reduced: document.documentElement.classList.contains('reduce-motion'), celebrations: window.MCU_PREFS.celebrations(),
      region: window.MCU_region.get(),
    }));
    out.afterReload = after;
    expect(after.dark && after.lang === 'pt-BR' && after.reduced && after.celebrations === false && after.region === 'BR',
      'a setting did not survive the reload: ' + JSON.stringify(after));

    // Device actions.
    await page.evaluate(() => localStorage.setItem('mcu.guideSkips.v1', JSON.stringify({ x: ['iron-man'] })));
    await page.locator('.settings-btn').click(); await page.waitForTimeout(500);
    await panel.locator('button', { hasText: 'Reiniciar o progresso dos guias' }).click(); await page.waitForTimeout(150);
    expect(await page.evaluate(() => localStorage.getItem('mcu.guideSkips.v1')) === null, 'reset guides: skipped stops still stored');
    await panel.locator('button', { hasText: 'Limpar este dispositivo' }).click(); await page.waitForTimeout(150);
    expect(await panel.locator('[role="alertdialog"]').count() === 1, 'clear device: no confirmation asked');
    await panel.locator('button', { hasText: 'Cancelar' }).click(); await page.waitForTimeout(150);
    expect(await page.evaluate(() => localStorage.getItem('mcu.lang.v1')) === 'pt-BR', 'clear device: Cancel cleared something');
    await panel.locator('button', { hasText: 'Limpar este dispositivo' }).click(); await page.waitForTimeout(150);
    await Promise.all([page.waitForNavigation(), panel.locator('[role="alertdialog"] button', { hasText: 'Limpar este dispositivo' }).click()]);
    await ready(page);
    const left = await page.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('mcu.') === 0 && k !== 'mcu.welcome.v1' && k !== 'mcu.signInNudge.v1'));
    out.leftAfterClear = left;
    expect(left.length === 0, 'clear device: still stored ' + JSON.stringify(left));
    expect(!(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion'))), 'clear device: Reduced motion survived');

    // Show the welcome again.
    await page.locator('.settings-btn').click(); await page.waitForTimeout(500);
    await page.locator('.settings-panel button', { hasText: 'Show the welcome tour again' }).click(); await page.waitForTimeout(500);
    expect(await page.locator('.about-dialog .welcome-tour').count() === 1, 'show welcome: the welcome did not open');
    await ctx.close();
  }

  // ---- Opening a title closes Settings (Notion V4 Tasks, "Close Settings
  // when a title is opened"): Spatial card, the card already open behind it,
  // a List row, and a search pick -------------------------------------------
  {
    const { ctx, page } = await open(DESK);
    const state = () => page.evaluate(() => ({
      settings: !!document.querySelector('.settings-panel'),
      drawer: document.querySelector('.drawer.open') ? (document.querySelector('.drawer.open h2, .drawer.open .td-title') || {}).textContent : null,
    }));
    const gear = async () => { await page.locator('.settings-btn').click(); await page.waitForTimeout(400); };
    // A real click where the card is on screen (the canvas, not the card, takes
    // pointer events once a card is selected). The card is pressed only once
    // it has stopped moving: under a full regression's load the canvas can
    // still be re-laying out when a fixed wait ends, and the press then lands
    // on empty canvas and opens nothing (Notion "test-settings: 'Spatial card
    // click with Settings open' failed once"). One more press if that happens.
    const still = async (id) => {
      let last = null;
      for (let i = 0; i < 30; i++) {
        const b = await page.locator(`.card[data-id="${id}"]`).boundingBox();
        if (b && last && Math.abs(b.x - last.x) < 0.5 && Math.abs(b.y - last.y) < 0.5) return b;
        last = b; await page.waitForTimeout(100);
      }
      return last;
    };
    const clickCard = async (id) => {
      await page.waitForTimeout(300);
      for (let attempt = 0; attempt < 2; attempt++) {
        const b = await still(id);
        await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.8);
        try { await page.waitForSelector('.drawer.open', { timeout: 2500 }); break; } catch (e) { /* missed: press again */ }
      }
      await page.waitForTimeout(500);
    };
    // When each panel slides and when Settings goes, as events with their
    // times. Sampling each panel's position every frame (as this check did)
    // misses a 360 ms slide whenever a loaded machine skips frames; the
    // transitions' own events fire whatever the frame rate.
    const record = () => page.evaluate(() => {
      const log = window.__slide = [];
      const at = () => performance.now();
      const which = (el) => el.classList && (el.classList.contains('settings-panel') ? 's' : el.classList.contains('drawer') ? 'd' : null);
      for (const type of ['transitionrun', 'transitionend']) {
        document.addEventListener(type, (e) => {
          const w = which(e.target);
          if (w && /transform|translate/.test(e.propertyName)) log.push({ w, type, t: at(), left: Math.round(e.target.getBoundingClientRect().left) });
        }, true);
      }
      new MutationObserver(() => {
        const sp = !!document.querySelector('.settings-panel');
        const last = log.filter(x => x.type === 'present').pop();
        if (!last || last.sp !== sp) log.push({ type: 'present', sp, t: at() });
      }).observe(document.body, { childList: true, subtree: true });
      log.push({ type: 'present', sp: !!document.querySelector('.settings-panel'), t: at() });
    });
    await page.goto(URL_BASE); await ready(page);
    await gear();
    await record();
    await clickCard('incredible-hulk');
    let st = await state();
    out.cardClick = st;
    expect(!st.settings && /Incredible Hulk/.test(st.drawer || ''), 'Spatial card click with Settings open: ' + JSON.stringify(st));
    // Settings slid out (a transform transition ran on it), then was removed,
    // and only after that did the details drawer slide in.
    const log = await page.evaluate(() => window.__slide);
    const sRun = log.find(x => x.w === 's' && x.type === 'transitionrun');
    const gone = log.find(x => x.type === 'present' && !x.sp);
    const dRun = log.find(x => x.w === 'd' && x.type === 'transitionrun');
    const settingsSlid = !!sRun;
    const drawerSlid = !!dRun;
    const order = !!(sRun && gone && dRun && sRun.t <= gone.t && gone.t <= dRun.t);
    out.slide = { settingsSlid, drawerSlid, order, ms: sRun && dRun ? Math.round(dRun.t - sRun.t) : null };
    expect(settingsSlid && drawerSlid && order, 'Settings should slide out, then the details slide in: ' + JSON.stringify({ ...out.slide, log }));
    await gear();
    await clickCard('incredible-hulk');
    st = await state();
    out.sameCard = st;
    expect(!st.settings && /Incredible Hulk/.test(st.drawer || ''), 'clicking the card already open behind Settings: ' + JSON.stringify(st));
    await page.goto(URL_BASE + '?view=list'); await ready(page);
    await gear();
    await page.locator('.dl-row', { hasText: 'Iron Man 2' }).first().getByText('Iron Man 2', { exact: true }).click(); await page.waitForTimeout(1000);
    st = await state();
    out.listRow = st;
    expect(!st.settings && /Iron Man 2/.test(st.drawer || ''), 'List row click with Settings open: ' + JSON.stringify(st));
    await ctx.close();
  }

  // ---- D and L switch the theme on desktop (Notion V4 Tasks, "Desktop
  // keyboard shortcut: D for dark mode, L for light mode") --------------------
  {
    const { ctx, page } = await open(DESK);
    await page.goto(URL_BASE); await ready(page);
    const theme = () => page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), choice: localStorage.getItem('mcu.theme'), said: (document.querySelector('.theme-announce') || {}).textContent }));
    await page.locator('body').click({ position: { x: 700, y: 600 } }); await page.keyboard.press('Escape');
    await page.keyboard.press('d'); await page.waitForTimeout(200);
    let t = await theme();
    out.keyD = t;
    expect(t.dark && t.choice === 'dark' && t.said === 'Dark mode', 'D did not switch to dark: ' + JSON.stringify(t));
    await page.keyboard.press('l'); await page.waitForTimeout(200);
    t = await theme();
    out.keyL = t;
    expect(!t.dark && t.choice === 'light' && t.said === 'Light mode', 'L did not switch to light: ' + JSON.stringify(t));
    // Typing in search never switches it.
    await page.locator('.toolbar .search-wrap input').first().click();
    await page.keyboard.type('daredevil'); await page.waitForTimeout(200);
    t = await theme();
    expect(!t.dark, 'typing a d in search switched the theme');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    // Settings mentions it.
    await page.locator('.settings-btn').click(); await page.waitForTimeout(400);
    expect(await page.locator('.settings-panel', { hasText: 'press D for dark or L for light' }).count() === 1, 'Settings does not mention the D / L shortcut');
    await ctx.close();
    // The phone layout too, from a keyboard (Notion V4 Tasks, "D / L theme
    // shortcut on the phone layout too"), announced the same way.
    const ph = await open(PHONE);
    await ph.page.goto(URL_BASE); await ready(ph.page);
    const before = await ph.page.evaluate(() => document.documentElement.classList.contains('dark'));
    await ph.page.keyboard.press(before ? 'l' : 'd'); await ph.page.waitForTimeout(300);
    expect(await ph.page.evaluate(() => document.documentElement.classList.contains('dark')) === !before, 'the phone layout did not switch theme on D / L');
    const phSaid = await ph.page.evaluate(() => (document.querySelector('.theme-announce') || {}).textContent || '');
    expect(/mode/i.test(phSaid), 'the phone layout did not announce the theme: "' + phSaid + '"');
    await ph.page.keyboard.press(before ? 'd' : 'l'); await ph.page.waitForTimeout(300);
    expect(await ph.page.evaluate(() => document.documentElement.classList.contains('dark')) === before, 'the phone layout did not switch back');
    await ph.ctx.close();
  }

  // ---- The Welcome has no language choice (Andre, 2026-11-18: Settings
  // switches it; Notion "Welcome: streamline the first moment") ------------
  {
    const { ctx, page } = await open(DESK);
    await page.goto(URL_BASE + '?welcome'); await ready(page);
    out.welcomeLang = await page.locator('.welcome-lang').count();
    expect(await page.locator('.about-dialog .welcome-tour').count() === 1 && out.welcomeLang === 0, 'welcome: expected the welcome without a language choice');
    await ctx.close();
  }

  // ---- Narrow phone, Portuguese: the theme control's labels fit -----------
  {
    const { ctx, page } = await open({ ...PHONE, viewport: { width: 320, height: 700 } }, "localStorage.setItem('mcu.lang.v1','pt-BR');");
    await page.goto(URL_BASE); await ready(page);
    await page.locator('.m-settings-btn').click(); await page.waitForTimeout(600);
    const segs = await page.evaluate(() => [...document.querySelector('.settings-sheet-body [role="radiogroup"]').querySelectorAll('[role="radio"]')]
      .map(r => ({ t: r.textContent, fits: r.scrollWidth <= r.clientWidth })));
    out.narrowSegments = segs;
    expect(segs.length === 3 && segs.every(x => x.fits), 'phone 320 pt-BR: a theme label does not fit ' + JSON.stringify(segs));
    await ctx.close();
  }

  // ---- Phone --------------------------------------------------------------
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await open(PHONE, "localStorage.setItem('mcu.theme','" + scheme + "');");
    await page.goto(URL_BASE); await ready(page);
    if (scheme === 'light') {
      expect(await page.locator('.m-appbar .m-settings-btn').count() === 1, 'phone: no gear in the app bar');
      expect(await page.locator('.m-appbar .lang-menu').count() === 0, 'phone: language menu still in the app bar');
      const t = await page.evaluate(() => { const h = document.querySelector('.m-btitle'); return { sw: h.scrollWidth, cw: h.clientWidth }; });
      out.phoneTitle = t;
      expect(t.sw <= t.cw, 'phone: the app bar title is cut short at 375px ' + JSON.stringify(t));
      await page.locator('.m-acct').click(); await page.waitForTimeout(500);
      expect(await page.locator('.m-sheet .theme-toggle, .m-sheet .m-theme-row').count() === 0, 'phone: theme control still in the account sheet');
      await page.goBack(); await page.waitForTimeout(500);
    }
    await page.locator('.m-settings-btn').click(); await page.waitForTimeout(600);
    expect(await page.locator('.m-sheet .settings-sheet-body').count() === 1, 'phone ' + scheme + ': the gear did not open the Settings sheet');
    await axe(page, '.m-sheet', 'phone ' + scheme);
    if (scheme === 'light') {
      await page.goBack(); await page.waitForTimeout(600);
      expect(await page.locator('.settings-sheet-body').count() === 0, 'phone: Back did not close the sheet');
    }
    await ctx.close();
  }

  console.log(JSON.stringify({ ...out, errors }, null, 1));
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
