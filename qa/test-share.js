// Sharing (Notion V4 Tasks, "Share 1/3 — Share buttons and links").
//   - Desktop copies the link and says "Link copied"; phones open the system
//     share sheet (navigator.share, stubbed here) with the link and message.
//   - Every share point: a title (drawer, phone sheet), a pinned character
//     (banner, phone pill), a guide (card, Spatial row, phone header), my
//     progress (account), the app (About, Settings), and a milestone toast
//     (beside Undo, which stays first).
//   - Links always point at production, carry only what opens the same
//     thing, and open it; sharing adds no history entry; a cancelled share
//     sheet shows nothing.
//   - Portuguese messages; accessible names ("Share Iron Man").
//   - The phone pill still fits "Peggy Carter" at 375px.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8303;
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
const PUBLIC = 'https://redthread.tv/';
const NOWELCOME = "try { if (!localStorage.getItem('mcu.welcome.v1')) localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";
// Seeds a small collection once; later loads keep whatever the check stored.
const SEEN = "if (!localStorage.getItem('mcu.collection.v1')) localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states: { 'iron-man': 'seen', 'hulk': 'seen' } }));";
// The phone share sheet, recorded instead of opened. window.__shareMode
// 'cancel' makes it reject the way a dismissed sheet does.
const SHEET = `window.__shared = [];
  navigator.canShare = function (data) { return !!data; };
  navigator.share = function (data) {
    if (window.__shareMode === 'cancel') return Promise.reject(new DOMException('cancelled', 'AbortError'));
    window.__shared.push({ title: data.title, text: data.text, url: data.url,
      files: data.files ? data.files.map(f => ({ name: f.name, type: f.type, size: f.size })) : null });
    return Promise.resolve();
  };`;
const DESK = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const errors = [];
  const out = { links: {} };
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
  const go = async (page, q) => { await page.goto(URL_BASE + q); await ready(page); };
  // The share card opened, drew a 1080×1350 image and described it.
  const cardOpen = async (page, where, alt) => {
    await page.waitForSelector('.share-image-frame img', { timeout: 15000 }).catch(() => {});
    const img = await page.evaluate(async () => {
      const i = document.querySelector('.share-image-frame img');
      if (!i) return null;
      await i.decode().catch(() => {});
      return { w: i.naturalWidth, h: i.naturalHeight, alt: i.getAttribute('alt'), heading: document.querySelector('#share-image-title').textContent };
    });
    out['card ' + where] = img;
    expect(img && img.w === 1080 && img.h === 1350, where + ': the share card did not draw a 1080×1350 image ' + JSON.stringify(img));
    expect(img && alt.test(img.alt), where + ': card description is ' + JSON.stringify(img && img.alt));
  };
  const goodLink = (url, expectSearch, where) => {
    out.links[where] = url;
    expect(typeof url === 'string' && url.indexOf(PUBLIC) === 0, where + ': link is not the production address: ' + url);
    expect(url === PUBLIC + expectSearch, where + ': link is ' + url + ', expected ' + PUBLIC + expectSearch);
  };

  // ---- Desktop: copy the link ---------------------------------------------
  {
    const { ctx, page } = await open(DESK, SEEN);
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL_BASE });
    const clip = () => page.evaluate(() => navigator.clipboard.readText());
    const reset = () => page.evaluate(() => navigator.clipboard.writeText(''));
    const copiedShown = async (where) => {
      await page.waitForTimeout(250);
      const t = await page.evaluate(() => { const el = document.querySelector('.share-toast'); return el ? { show: el.classList.contains('show'), text: el.textContent, role: el.getAttribute('role') } : null; });
      expect(t && t.show && t.text === 'Link copied' && t.role === 'status', where + ': no announced "Link copied" toast ' + JSON.stringify(t));
    };

    await go(page, '?title=iron-man');
    const hist = await page.evaluate(() => history.length);
    const btn = page.locator('.drawer .td-share');
    expect(await btn.getAttribute('aria-label') === 'Share Iron Man', 'drawer: Share has no "Share Iron Man" name');
    await reset(); await btn.click(); await copiedShown('drawer');
    goodLink(await clip(), 'titles/iron-man', 'desktop title');
    expect(await page.evaluate(() => history.length) === hist, 'drawer: sharing added a history entry');

    await go(page, '?char=peggy');
    await page.locator('.char-card .cb-more').click(); await page.waitForTimeout(300);
    await reset(); await page.locator('.cc-menu .cb-share').click(); await copiedShown('banner');
    goodLink(await clip(), 'characters/peggy', 'desktop character');

    await go(page, '?guide=before-doomsday&view=list');
    await reset(); await page.locator('.g-desk .g-head .g-share').click(); await copiedShown('guide card');
    goodLink(await clip(), 'guides/before-doomsday', 'desktop guide');
    await go(page, '?guide=before-doomsday');
    // Share lives on the guide's page, not on the Spatial guide card (Andre, 2026-11-16).
    expect(await page.locator('.g-module.spatial .gm-share').count() === 0, 'Spatial guide card still has Share');

    // My progress opens the share card (Share 2/3): the image, Download, Copy link.
    await page.locator('.acct-pill').click(); await page.waitForTimeout(400);
    await page.locator('.acct-share').click();
    await cardOpen(page, 'desktop progress', /^A Red Thread card: \d+ of \d+ released Marvel titles seen$/);
    const dl = await page.evaluate(() => { const a = document.querySelector('.share-image-actions a[download]'); return a && { name: a.getAttribute('download'), href: a.getAttribute('href').slice(0, 5) }; });
    expect(dl && dl.name === 'red-thread-progress.png' && dl.href === 'blob:', 'desktop progress card: no Download image link ' + JSON.stringify(dl));
    expect(await page.locator('.share-image-actions button', { hasText: 'Share image' }).count() === 0, 'desktop progress card: offers Share image on desktop');
    await reset(); await page.locator('.share-image-actions button', { hasText: 'Copy link' }).click(); await copiedShown('progress card');
    goodLink(await clip(), '', 'desktop progress');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    expect(await page.locator('.share-image').count() === 0, 'desktop progress card: Escape did not close it');

    // About is in the account menu's footer.
    await page.locator('.acct-pill').click(); await page.waitForTimeout(400);
    await page.locator('.acct-foot-link').click(); await page.waitForTimeout(400);
    await reset(); await page.locator('.about-share-row .share-btn').click(); await copiedShown('about');
    goodLink(await clip(), '', 'desktop about');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    await page.locator('.toolbar .settings-btn').click(); await page.waitForTimeout(500);
    await reset(); await page.locator('.settings-panel button', { hasText: 'Share Red Thread' }).click(); await copiedShown('settings');
    goodLink(await clip(), '', 'desktop settings');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    // Keyboard: Tab reaches the drawer's Share and Enter shares.
    await go(page, '?title=iron-man');
    await page.locator('.drawer .tsa-btn.watch').focus(); await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('td-share')), 'keyboard: Tab after Watchlist does not reach Share');
    await reset(); await page.keyboard.press('Enter'); await copiedShown('keyboard');

    // A milestone toast: every released Phase 1 title seen but one, then Seen.
    const last = await page.evaluate(() => {
      const p1 = window.TITLES.filter(t => t.phase === 1 && window.MCU_isReleased(t));
      const states = {}; p1.slice(0, -1).forEach(t => { states[t.id] = 'seen'; });
      localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states }));
      return p1[p1.length - 1].id;
    });
    await go(page, '?title=' + last);
    await page.locator('.drawer .tsa-btn.seen').click();
    await page.waitForSelector('.mcu-toast.milestone', { timeout: 3000 }).catch(() => {});
    // Each button by its hook class (shadcn's Buttons list the library's
    // classes first, so the first class is not the hook any more).
    const order = await page.evaluate(() => [...document.querySelectorAll('.mcu-toast.milestone button')]
      .map(b => ['mt-undo', 'share-btn', 'mt-x'].find(c => b.classList.contains(c)) || b.className.split(' ')[0]));
    out.toastButtons = order;
    expect(order.indexOf('mt-undo') === 0 && order.indexOf('share-btn') === 1, 'milestone toast: expected Undo then Share, got ' + JSON.stringify(order));
    await page.locator('.mcu-toast .mt-share').click();
    expect(await page.locator('.mcu-toast .mt-undo').count() === 1, 'milestone toast: sharing closed the toast before Undo could be used');
    await cardOpen(page, 'milestone', /released Marvel titles seen/);
    await reset(); await page.locator('.share-image-actions button', { hasText: 'Copy link' }).click(); await copiedShown('milestone card');
    goodLink(await clip(), '', 'desktop milestone');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    // A finished guide shares its card; an unfinished one shares its link (above).
    await page.evaluate(() => {
      const g = window.GUIDES.find(x => x.id === 'before-doomsday');
      const states = {}; g.stops.filter(s => s.weight === 'essential').forEach(s => { states[s.id] = 'seen'; });
      localStorage.setItem('mcu.collection.v1', JSON.stringify({ version: 1, states }));
    });
    await go(page, '?guide=before-doomsday&view=list');
    await page.locator('.g-desk .g-head .g-share').click();
    await cardOpen(page, 'finished guide', /^A Red Thread card: Catch up before Avengers: Doomsday, complete$/);
    await reset(); await page.locator('.share-image-actions button', { hasText: 'Copy link' }).click(); await copiedShown('guide card');
    goodLink(await clip(), 'guides/before-doomsday', 'desktop finished guide');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await ctx.close();
  }

  // ---- Phone: the share sheet ---------------------------------------------
  {
    const { ctx, page } = await open(PHONE, SEEN + SHEET);
    const last = () => page.evaluate(() => window.__shared[window.__shared.length - 1] || null);

    await go(page, '?title=iron-man');
    await page.locator('.m-sheet .td-share').click(); await page.waitForTimeout(200);
    let d = await last();
    out.phoneTitle = d;
    goodLink(d && d.url, 'titles/iron-man', 'phone title');
    expect(d && d.text === 'Iron Man (2008), and how it connects to the rest of the MCU', 'phone title: message ' + JSON.stringify(d && d.text));
    expect(d && d.title === 'Red Thread', 'phone title: share title is not Red Thread');
    expect(!(await page.evaluate(() => document.querySelector('.share-toast').classList.contains('show'))), 'phone: a "Link copied" toast showed after the share sheet');

    // Cancelled: nothing at all.
    await page.evaluate(() => { window.__shareMode = 'cancel'; });
    await page.locator('.m-sheet .td-share').click(); await page.waitForTimeout(250);
    expect(!(await page.evaluate(() => document.querySelector('.share-toast').classList.contains('show'))), 'phone: a cancelled share sheet showed a toast');
    await page.evaluate(() => { window.__shareMode = ''; });

    await go(page, '?char=peggy');
    const fit = await page.evaluate(() => { const e = document.querySelector('.cc-name'); return { sw: e.scrollWidth, cw: e.clientWidth }; });
    out.pillName = fit;
    expect(fit.sw <= fit.cw, 'phone pill: "Peggy Carter" is cut short at 375px ' + JSON.stringify(fit));
    await page.locator('.char-card .cb-more').tap(); await page.waitForTimeout(300);
    await page.locator('.cc-menu .cb-share').click(); await page.waitForTimeout(200);
    d = await last();
    goodLink(d && d.url, 'characters/peggy', 'phone character');
    expect(d && /^Follow Peggy Carter across \d+ titles$/.test(d.text), 'phone character: message ' + JSON.stringify(d && d.text));

    await go(page, '?guide=before-doomsday&view=list');
    await page.locator('.g-head .g-share').click(); await page.waitForTimeout(200);
    d = await last();
    goodLink(d && d.url, 'guides/before-doomsday', 'phone guide');
    expect(d && /essential titles to watch/.test(d.text), 'phone guide: message ' + JSON.stringify(d && d.text));

    // My progress on a phone: the card in a sheet, and Share image sends the
    // image with the message and the link.
    await go(page, '');
    await page.locator('.m-acct').click(); await page.waitForTimeout(500);
    await page.locator('.m-sheet .acct-share').click(); await page.waitForTimeout(600);
    await cardOpen(page, 'phone progress', /released Marvel titles seen/);
    expect(await page.locator('.m-sheet .share-image').count() === 1, 'phone progress card: not in a sheet');
    await page.locator('.share-image-actions button', { hasText: 'Share image' }).click(); await page.waitForTimeout(300);
    d = await last();
    out.phoneCard = d;
    goodLink(d && d.url, '', 'phone progress card');
    expect(d && d.files && d.files.length === 1 && d.files[0].type === 'image/png' && d.files[0].name === 'red-thread-progress.png' && d.files[0].size > 10000,
      'phone progress card: Share image did not send the PNG ' + JSON.stringify(d && d.files));
    expect(d && /^I’ve seen \d+ of \d+ released Marvel titles$/.test(d.text), 'phone progress card: message ' + JSON.stringify(d && d.text));
    expect(await page.locator('.share-image').count() === 0, 'phone progress card: the sheet stayed open after sharing');
    await ctx.close();
  }

  // ---- Portuguese ---------------------------------------------------------
  {
    const { ctx, page } = await open(PHONE, SEEN + SHEET + "localStorage.setItem('mcu.lang.v1','pt-BR');");
    await go(page, '?title=iron-man');
    const btn = page.locator('.m-sheet .td-share');
    // Icon-only in the details: its name (label and tooltip) carries the text.
    expect(/^Compartilhar /.test(await btn.getAttribute('aria-label') || ''), 'pt-BR: the button is not named Compartilhar');
    await btn.click(); await page.waitForTimeout(200);
    const d = await page.evaluate(() => window.__shared[0] || null);
    out.ptTitle = d && d.text;
    expect(d && /^Homem de Ferro \(2008\) e como se conecta ao resto do MCU$/.test(d.text), 'pt-BR: message ' + JSON.stringify(d && d.text));
    await ctx.close();
  }

  // ---- Each link opens what it shared --------------------------------------
  {
    const { ctx, page } = await open(DESK);
    await go(page, '?title=iron-man');
    expect((await page.locator('#drawer-title').textContent()).trim() === 'Iron Man', 'link: ?title=iron-man did not open Iron Man');
    await go(page, '?char=peggy');
    expect(await page.locator('.char-card').count() === 1, 'link: ?char=peggy did not pin Peggy Carter');
    await go(page, '?guide=before-doomsday');
    expect(await page.locator('.g-module, .g-desk .g-head').count() === 1, 'link: ?guide=before-doomsday did not open the guide');
    await ctx.close();
  }

  console.log(JSON.stringify({ ...out, errors }, null, 1));
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
