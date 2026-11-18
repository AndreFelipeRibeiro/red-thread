const QA_PORT = +process.env.PORT || 8216; // regress/quick give each check its own port
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const S = __dirname;
const SITE = (process.env.SITE ? path.join(S, process.env.SITE) : path.join(S, '..'));
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
const settle = page => require('./ready').appReady(page);
const go = async page => { await page.goto(URL); await settle(page); };

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const R = {}; const errors = [];
  const { page } = await ctxPage(browser, DESKTOP, "localStorage.setItem('mcu.welcome.v1','test');");
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await go(page);

  R.suggest = await page.evaluate(async () => {
    const inp = document.querySelector('input[role="combobox"]');
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const read = async (q) => {
      inp.focus();
      inp.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      set(inp, q);
      await new Promise(r => setTimeout(r, 400));
      return [...document.querySelectorAll('.ss-pop li')]
        .filter(li => !li.classList.contains('ss-head'))
        .map(li => li.innerText.replace(/\n+/g, ' | '));
    };
    const out = { banner: await read('bruce banner'), tony: await read('tony stark') };
    set(inp, '');
    return out;
  });

  // A part that changed hands offers one row per performer; a part that did not
  // keeps its single row, so the rule does not spray rows over the whole list.
  const rows = R.suggest.banner.filter(r => /Bruce Banner/.test(r));
  if (rows.length !== 2) errors.push(`Bruce Banner offered ${rows.length} rows, expected 2`);
  if (!rows.some(r => /Mark Ruffalo/.test(r))) errors.push('no Mark Ruffalo row for Bruce Banner');
  if (!rows.some(r => /Edward Norton/.test(r))) errors.push('no Edward Norton row for Bruce Banner');
  const tony = R.suggest.tony.filter(r => /Tony Stark/.test(r));
  if (tony.length !== 1) errors.push(`Tony Stark offered ${tony.length} rows, expected 1`);

  // Picking a performer row keeps the character's whole run in the stepper and
  // starts on that performer's title. Scoping to the performer would cut
  // Banner's nine titles to Ruffalo's eight, which test-pickperson guards.
  R.pickRow = await page.evaluate(async () => {
    const inp = document.querySelector('input[role="combobox"]');
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    inp.focus();
    inp.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    set(inp, 'bruce banner');
    await new Promise(r => setTimeout(r, 400));
    const li = [...document.querySelectorAll('.ss-pop li')].find(l => /Edward Norton/.test(l.innerText));
    if (!li) return { error: 'no Edward Norton row to pick' };
    li.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    const b = document.querySelector('.char-card');
    return {
      who: b ? b.querySelector('.cb-who b').textContent.trim() : null,
      sub: b ? b.querySelector('.cb-sub').textContent.trim() : null,
      pos: b ? b.querySelector('.cb-pos').textContent.trim() : null,
    };
  });

  const pr = R.pickRow;
  if (pr.error) errors.push(pr.error);
  else {
    if (pr.who !== 'Bruce Banner') errors.push(`picking the Norton row pinned "${pr.who}", expected the character Bruce Banner`);
    if (!/Edward Norton/.test(pr.sub || '')) errors.push(`picking the Norton row reads "${pr.sub}", expected Edward Norton`);
    if (!/\bof 9\b/.test(pr.pos || '')) errors.push(`picking the Norton row gave "${pr.pos}", expected the whole nine-title run`);
  }

  // The banner names the performer credited in the title the stepper is on.
  R.banner = await page.evaluate(async () => {
    const click = async (el, ms = 900) => { el.click(); await new Promise(r => setTimeout(r, ms)); };
    // The previous case left a character pinned, which narrows the catalog.
    const close = document.querySelector('.char-card .cb-close');
    if (close) await click(close, 600);
    // Rows carry data-row-id only in the desktop List (the Titles section),
    // and Connections is the default, so switch before looking for the title.
    const toList = [...document.querySelectorAll('.nav-tabs button')].find(b => /^(Titles|My list)$/i.test(b.textContent.trim()));
    if (toList) await click(toList, 1200);
    const row = document.querySelector('[data-row-id="incredible-hulk"]');
    if (!row) return { error: 'no Incredible Hulk row in the List view' };
    // A row click toggles the details, so a drawer left open on this title
    // from an earlier case closes instead of opening. Retry once, the way
    // test-camera's openCentreCard does.
    const bruceRow = () => [...document.querySelectorAll('.cast-row')].find(r => r.dataset.char === 'bruce');
    await click(row);
    let attempts = 1;
    if (!bruceRow()) { await click(row); attempts = 2; }
    const cast = bruceRow();
    if (!cast) return { error: 'no Bruce Banner cast row on The Incredible Hulk', attempts };
    // A person opens their trail (Notion "Explore E 4/5"); its pin pins them.
    await click(cast);
    // Desktop Connections pins on the cast click (the character view); the
    // pin is only there elsewhere.
    const pin = document.querySelector('.drawer.open .trail-pin');
    if (pin) await click(pin);
    const sub = () => {
      const el = document.querySelector('.char-card .cb-sub');
      return el ? el.textContent.trim() : null;
    };
    // External images are blocked here, so the rendered <img> never appears.
    // Assert on the resolver that picks the URL instead, or the check would be
    // decorative (see qa/README.md).
    const first = { sub: sub(), photo: window.performerPortrait('Edward Norton', 'bruce') };
    await click(document.querySelector('.char-card .cb-step button:last-child'));
    const second = { sub: sub(), photo: window.performerPortrait('Mark Ruffalo', 'bruce') };
    return { first, second, attempts };
  });

  const b = R.banner;
  if (b.error) errors.push(b.error);
  else {
    if (!/Edward Norton/.test(b.first.sub || '')) errors.push(`banner on The Incredible Hulk reads "${b.first.sub}", expected Edward Norton`);
    if (/Mark Ruffalo/.test(b.first.sub || '')) errors.push('banner on The Incredible Hulk still names Mark Ruffalo');
    if (!/Mark Ruffalo/.test(b.second.sub || '')) errors.push(`banner after stepping reads "${b.second.sub}", expected Mark Ruffalo`);
    if (!b.first.photo) errors.push('no portrait resolves for Edward Norton as Banner');
    if (!b.second.photo) errors.push('no portrait resolves for Mark Ruffalo as Banner');
    if (b.first.photo === b.second.photo) errors.push('the banner portrait does not change with the credited performer');
  }

  // The count beside the performer's name is THEIR share of the chain, not the
  // character's total: the stepper already carries the total. Norton is in one
  // of Banner's nine, and the number has to say one.
  if (b && !b.error) {
    const n = (sub) => { const m = /(\d+)\s+(title|titles|t\u00edtulo|t\u00edtulos)/.exec(sub || ''); return m ? Number(m[1]) : null; };
    const first = n(b.first.sub), second = n(b.second.sub);
    if (first !== 1) errors.push(`the Norton line counts ${first} titles; he is credited on one`);
    if (second !== 8) errors.push(`the Ruffalo line counts ${second} titles; he is credited on eight of Banner's nine`);
  }

  // Every character carries a portrait except the ones TMDB has no photo for,
  // and a character added without one silently falls back to initials.
  R.portraits = await page.evaluate(() => {
    const chars = window.CHARACTERS, M = window.MEDIA;
    const missing = Object.keys(chars).filter(id => !(M.actors && M.actors[id]));
    const used = new Set();
    window.TITLES.forEach(t => t.cast.forEach(id => { if (chars[id]) used.add(window.MCU_credit(t, id)); }));
    const defaults = new Set(Object.keys(chars).map(id => chars[id].actor));
    const missingCredits = [...used].filter(nm => !defaults.has(nm) && !(M.performers && M.performers[nm]));
    return { missing, missingCredits };
  });
  if (R.portraits.missing.length) {
    errors.push(`characters with no portrait: ${R.portraits.missing.join(', ')}`);
  }
  // Mike McGill has no photo on TMDB, so initials are the right answer for him
  // and only for him.
  const unexpected = R.portraits.missingCredits.filter(nm => nm !== 'Mike McGill');
  if (unexpected.length) errors.push(`credited performers with no portrait: ${unexpected.join(', ')}`);

  R.errors = errors;
  console.log(JSON.stringify(R, null, 1));
  await browser.close(); server.close();
})();
