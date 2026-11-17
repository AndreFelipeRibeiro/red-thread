// Explore direction E (Notion "Phone Explore: design a native way to follow
// connections", sub-tasks E 2/5 to 5/5), on desktop (the right-hand panel)
// and phone (the bottom sheet):
//   E 2/5  one details component: Where to watch and "Part of · N guides"
//          start collapsed; a hop pushes a back stack whose ‹ names the
//          previous title and goes back; ✕ closes the whole stack.
//   E 3/5  Cast and connections: the heading names the connected titles; each
//          person says "in N more" and their chevron opens that many posters
//          (everyone closed to start); a poster hops the details (‹ comes
//          back); on desktop, hovering a poster marks its card on the canvas.
//   E 4/5  Follow the thread: the button counts the connected titles; a row
//          opens that title's details and ‹ comes back to the thread; Escape
//          or ‹ leaves; the desktop canvas follows. A person opens their
//          trail (7 titles for Pepper Potts, the title you came from marked),
//          a row opens its details (‹ back to the trail), and the pin pins
//          them.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8401;
const { chromium } = require('playwright');
const http = require('http');
const { appReady } = require('./ready');

const URL = `http://127.0.0.1:${QA_PORT}/`;
const SEED = "localStorage.setItem('mcu.welcome.v1','test');localStorage.setItem('mcu.signInNudge.v1','2');";
const errors = [];
const out = {};
const expect = (ok, msg) => { if (!ok) errors.push(msg); };

const SURFACES = [
  ['desktop', { viewport: { width: 1440, height: 900 } }, '.drawer.open'],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '.m-sheet'],
];

(async () => {
  const server = http.createServer((q, r) => r.end());
  await new Promise((r) => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  for (const [label, opts, root] of SURFACES) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(SEED);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${label}: pageerror: ${e.message}`));
    await page.goto(URL + '?view=list&title=iron-man'); await appReady(page); await page.waitForTimeout(1200);
    const read = () => page.evaluate((root) => {
      const r = document.querySelector(root);
      if (!r) return null;
      const sec = (id) => { const s = r.querySelector('.td-acc-' + id); return s ? s.classList.contains('open') : null; };
      return { title: (r.querySelector('.td-title') || {}).textContent || null, back: (r.querySelector('.td-back') || {}).textContent || null,
        watch: sec('watch'), guides: sec('guides') };
    }, root);
    const start = await read();
    out[label] = { start };
    expect(start && start.title === 'Iron Man', `${label}: the details did not open on Iron Man: ${JSON.stringify(start)}`);
    expect(start && start.watch === false && start.guides === false, `${label}: Where to watch and Part of should start collapsed: ${JSON.stringify(start)}`);
    // E 3/5: Cast and connections.
    const cast = out[label].cast = await page.evaluate((root) => {
      const r = document.querySelector(root);
      const people = [...r.querySelectorAll('.cast-person')].map((p) => ({
        char: (p.querySelector('[data-char]') || { dataset: {} }).dataset.char,
        more: (p.querySelector('.cast-more') || {}).textContent || null,
        open: (p.querySelector('.cast-chev') || { getAttribute: () => null }).getAttribute('aria-expanded'),
        posters: p.querySelectorAll('.cast-title').length,
      }));
      return { label: (r.querySelector('.td-acc-cast .td-acc-label') || {}).textContent || null,
        note: (r.querySelector('.td-acc-cast .td-acc-note') || {}).textContent || null, people };
    }, root);
    expect(cast.label === 'Cast and connections · 4' && /^\d+ connected titles$/.test(cast.note || ''), `${label}: cast heading: ${JSON.stringify(cast)}`);
    expect(cast.people.length === 4 && cast.people.every((p) => p.open === 'false' && p.posters === 0),
      `${label}: everyone should start closed (Andre, 2026-11-16): ${JSON.stringify(cast.people)}`);
    // Open the first person: as many posters as "in N more".
    await page.locator(`${root} .cast-person .cast-chev`).first().click(); await page.waitForTimeout(300);
    const first = out[label].first = await page.evaluate((root) => { const p = document.querySelector(root + ' .cast-person');
      return { more: p.querySelector('.cast-more').textContent, posters: p.querySelectorAll('.cast-title').length, open: p.querySelector('.cast-chev').getAttribute('aria-expanded') }; }, root);
    expect(first.open === 'true' && first.posters > 0 && first.more === `in ${first.posters} more`, `${label}: "in N more" should count the posters: ${JSON.stringify(first)}`);
    if (label === 'desktop') {
      // Hovering a poster marks its card on the canvas (in Connections).
      await page.goto(URL + '?view=spatial&title=iron-man'); await appReady(page); await page.waitForTimeout(1500);
      await page.locator(`${root} .cast-person .cast-chev`).first().click(); await page.waitForTimeout(300);
      const id = await page.evaluate((root) => document.querySelector(root + ' .cast-title').dataset.title, root);
      await page.locator(`${root} .cast-title`).first().hover(); await page.waitForTimeout(400);
      const peek = out.peek = await page.evaluate((id) => { const c = document.querySelector(`.card[data-id="${id}"]`); return { id, marked: !!c && /\bz-29\b/.test(c.className) }; }, id);
      expect(peek.marked, `desktop: hovering a poster did not mark its card: ${JSON.stringify(peek)}`);
      // The gap between two posters keeps the person's thread lit (the
      // hover banner names them); leaving the block lets it go.
      const gap = await page.evaluate((root) => { const t = [...document.querySelectorAll(root + ' .cast-title')];
        const a = t[0].getBoundingClientRect(), b2 = t[1].getBoundingClientRect(); return { x: (a.right + b2.left) / 2, y: a.top + a.height / 2 }; }, root);
      await page.mouse.move(gap.x, gap.y); await page.waitForTimeout(300);
      const inGap = out.inGap = await page.evaluate(() => ({ banner: (document.querySelector('.char-banner') || {}).textContent || '', peek: !!document.querySelector('.card.z-29') }));
      expect(/Tony Stark/.test(inGap.banner) && !inGap.peek, `desktop: in the gap between posters the thread should stay lit and no card marked: ${JSON.stringify(inGap)}`);
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const left = await page.evaluate(() => /Tony Stark/.test((document.querySelector('.char-banner') || {}).textContent || ''));
      expect(!left, 'desktop: leaving the person block should let their thread go');
      await page.goto(URL + '?view=list&title=iron-man'); await appReady(page); await page.waitForTimeout(1200);
      await page.locator(`${root} .cast-person .cast-chev`).first().click(); await page.waitForTimeout(300);
    }
    // A poster hops; ‹ names Iron Man.
    const firstPoster = await page.evaluate((root) => document.querySelector(root + ' .cast-person .cast-title').dataset.title, root);
    await page.locator(`${root} .cast-person .cast-title`).first().click(); await page.waitForTimeout(800);
    const posterHop = out[label].posterHop = await read();
    expect(posterHop && posterHop.back === 'Iron Man' && posterHop.title !== 'Iron Man', `${label}: a poster (${firstPoster}) did not hop: ${JSON.stringify(posterHop)}`);
    await page.locator(`${root} .td-back`).click(); await page.waitForTimeout(800);
    // Back from the hop the row is closed again (a new title); open it, then
    // the chevron closes it.
    await page.locator(`${root} .cast-person .cast-chev`).first().click(); await page.waitForTimeout(300);
    await page.locator(`${root} .cast-person .cast-chev`).first().click(); await page.waitForTimeout(300);
    const closedRow = await page.evaluate((root) => document.querySelector(root + ' .cast-person .cast-chev').getAttribute('aria-expanded') + ':' + document.querySelectorAll(root + ' .cast-title').length, root);
    expect(closedRow === 'false:0', `${label}: the chevron did not close the row (${closedRow})`);
    // A hop, as a poster in Cast and connections makes it.
    await page.evaluate(() => window.MCU_hopTitle('avengers')); await page.waitForTimeout(800);
    const hop = out[label].hop = await read();
    expect(hop && hop.title === 'The Avengers' && hop.back === 'Iron Man', `${label}: after a hop: ${JSON.stringify(hop)}`);
    await page.evaluate(() => window.MCU_hopTitle('civil-war')); await page.waitForTimeout(800);
    const hop2 = out[label].hop2 = await read();
    expect(hop2 && hop2.back === 'The Avengers', `${label}: after a second hop ‹ should name The Avengers: ${JSON.stringify(hop2)}`);
    await page.locator(`${root} .td-back`).click(); await page.waitForTimeout(800);
    const back = out[label].back = await read();
    expect(back && back.title === 'The Avengers' && back.back === 'Iron Man', `${label}: ‹ should go back to The Avengers: ${JSON.stringify(back)}`);
    // ✕ closes the whole stack; opening again starts with no ‹.
    await page.locator(label === 'phone' ? '.m-sheet .m-sheet-x' : '.drawer.open .drawer-close').click(); await page.waitForTimeout(900);
    out[label].closed = await page.evaluate((root) => !document.querySelector(root), root);
    expect(out[label].closed, `${label}: ✕ did not close the details`);
    await page.goto(URL + '?view=list&title=thor'); await appReady(page); await page.waitForTimeout(1000);
    const fresh = out[label].fresh = await read();
    expect(fresh && fresh.title === 'Thor' && !fresh.back, `${label}: a fresh open should have no ‹: ${JSON.stringify(fresh)}`);

    // E 4/5: Follow the thread. Desktop in Connections, so the canvas can be
    // seen following; the phone from Titles.
    await page.goto(URL + (label === 'desktop' ? '?view=spatial&title=iron-man' : '?view=list&title=iron-man')); await appReady(page); await page.waitForTimeout(1500);
    const ex = () => page.evaluate((root) => {
      const r = document.querySelector(root);
      if (!r) return null;
      const v = r.querySelector('.ex-thread, .ex-trail');
      return { view: v ? (v.classList.contains('ex-thread') ? 'thread' : 'trail') : null, title: (r.querySelector(v ? '.ex-title' : '.td-title') || {}).textContent || null,
        count: (r.querySelector('.ex-count') || {}).textContent || null, rows: r.querySelectorAll('.ex-row').length,
        crumbs: [...r.querySelectorAll('.ex-crumb')].map((c) => c.textContent + (c.getAttribute('aria-current') ? '*' : '')),
        meta: (r.querySelector('.ex-meta') || {}).textContent || null, here: (r.querySelector('.ex-row[aria-current]') || { dataset: {} }).dataset.title || null,
        backLabel: (r.querySelector('.ex-back') || {}).textContent || null, pin: (r.querySelector('.trail-pin') || {}).textContent || null,
        tdBack: (r.querySelector('.td-back') || {}).textContent || null };
    }, root);
    const btn = await page.evaluate((root) => ({ text: (document.querySelector(root + ' .td-thread') || {}).textContent || null,
      note: (document.querySelector(root + ' .td-acc-cast .td-acc-note') || {}).textContent || null }), root);
    const n = +(btn.note || '').replace(/\D/g, '');
    expect(n > 0 && btn.text === `Follow the thread · ${n} titles`, `${label}: the Follow the thread button should count the connected titles: ${JSON.stringify(btn)}`);
    await page.locator(`${root} .td-thread`).click(); await page.waitForTimeout(700);
    const t0 = out[label].thread = await ex();
    expect(t0 && t0.view === 'thread' && t0.title === 'Iron Man' && t0.count === `${n} connected` && t0.rows === n && t0.crumbs.length === 0,
      `${label}: the thread should open on Iron Man with ${n} rows: ${JSON.stringify(t0)}`);
    if (label === 'desktop') {
      // Connections lines the thread up: one row, in release order (Andre,
      // 2026-11-16); leaving brings the ring back.
      await page.waitForTimeout(700);
      const row = out.threadRow = await page.evaluate(() => {
        const at = (id) => { const c = document.querySelector(`.card[data-id="${id}"]`); const m = c && /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(c.style.transform); return m ? { x: +m[1], y: +m[2] } : null; };
        return { im: at('iron-man'), hulk: at('incredible-hulk'), av: at('avengers'), im3: at('iron-man-3') };
      });
      const ys = [row.im, row.hulk, row.av, row.im3].map((p) => p && p.y);
      expect(ys.every((y) => y === ys[0]) && row.im.x < row.av.x && row.av.x < row.im3.x,
        `desktop: the thread should line Iron Man's titles up in one row by release: ${JSON.stringify(row)}`);
    }
    // A row opens that title's details (no path inside the panel, Andre
    // 2026-11-16); ‹ comes back to the thread.
    await page.locator(`${root} .ex-row[data-title="avengers"]`).click(); await page.waitForTimeout(900);
    const t1 = out[label].threadOpen = await ex();
    expect(t1 && !t1.view && t1.title === 'The Avengers' && t1.tdBack === 'Iron Man', `${label}: a thread row should open The Avengers with ‹ Iron Man: ${JSON.stringify(t1)}`);
    if (label === 'desktop') {
      const sel = out.threadCanvas = await page.evaluate(() => { const c = document.querySelector('.card[data-id="avengers"]'); return !!c && /\bz-2[57]\b/.test(c.className); });
      expect(sel, 'desktop: the canvas should follow to The Avengers');
    }
    await page.locator(`${root} .td-back`).click(); await page.waitForTimeout(800);
    const t2 = await ex();
    expect(t2 && t2.view === 'thread' && t2.title === 'Iron Man', `${label}: ‹ should come back to Iron Man's thread: ${JSON.stringify(t2)}`);
    // Leaving the thread: Escape on desktop (one layer), ‹ on the phone.
    if (label === 'desktop') await page.keyboard.press('Escape'); else await page.locator(`${root} .ex-back`).click();
    await page.waitForTimeout(700);
    const t4 = await ex();
    expect(t4 && !t4.view && t4.title === 'Iron Man', `${label}: leaving the thread should come back to Iron Man's details (still open): ${JSON.stringify(t4)}`);

    // The trail: a person opens it.
    await page.locator(`${root} [data-char="pepper"]`).click(); await page.waitForTimeout(800);
    const tr0 = out[label].trail = await ex();
    expect(tr0 && tr0.view === 'trail' && tr0.title === 'Pepper Potts' && /^Gwyneth Paltrow · 7 titles · 2008–2019$/.test(tr0.meta || '') && tr0.rows === 7 && tr0.here === 'iron-man' && tr0.backLabel === 'Iron Man',
      `${label}: Pepper Potts's trail: ${JSON.stringify(tr0)}`);
    expect(tr0 && tr0.pin === (label === 'desktop' ? 'See on canvas' : 'Highlight in Titles'), `${label}: the trail's pin reads ${tr0 && tr0.pin}`);
    if (label === 'desktop') {
      const lit = out.trailLit = await page.evaluate(() => /Pepper Potts/.test((document.querySelector('.char-banner') || {}).textContent || ''));
      expect(lit, 'desktop: the trail should keep Pepper Potts lit on the canvas');
    }
    // A row opens that title's details; ‹ (naming Pepper Potts) comes back to the trail.
    await page.locator(`${root} .ex-row[data-title="iron-man-2"]`).click(); await page.waitForTimeout(900);
    const tr1 = await ex();
    expect(tr1 && !tr1.view && tr1.title === 'Iron Man 2' && tr1.tdBack === 'Pepper Potts', `${label}: a trail row should open Iron Man 2 with ‹ Pepper Potts: ${JSON.stringify(tr1)}`);
    await page.locator(`${root} .td-back`).click(); await page.waitForTimeout(800);
    const tr2 = await ex();
    expect(tr2 && tr2.view === 'trail' && tr2.title === 'Pepper Potts', `${label}: ‹ should come back to the trail: ${JSON.stringify(tr2)}`);
    // The pin pins them (the address says so).
    await page.locator(`${root} .trail-pin`).click(); await page.waitForTimeout(1200);
    const pinned = out[label].trailPin = await page.evaluate(() => new URLSearchParams(location.search).get('char'));
    expect(pinned === 'pepper', `${label}: the trail's pin should pin Pepper Potts (char=${pinned})`);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(JSON.stringify({ ...out, errors, errorCount: errors.length }, null, 1));
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
