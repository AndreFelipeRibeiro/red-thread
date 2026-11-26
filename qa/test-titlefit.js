// Long titles stay inside the floating cards (Notion "Stepper: a long title
// runs past the card's edge (Portuguese and English)", Andre 2026-11-24: two
// lines, then "…", the full name on hover). "Your Friendly Neighborhood
// Spider-Man" and "Seu Amigão da Vizinhança: Homem-Aranha" ran under the
// stepper's ⋯ and × and past its edge.
//   - The character stepper (Peter Parker, all 11 stops) on desktop and
//     phone, in English and Portuguese: the name ends before ⋯ (or the card's
//     edge), takes at most two lines, and its tooltip is the full name.
//   - The phone's All titles card: the next title's name, the same rules.
// B.W_TITLE_2 in src/app/banners.tsx; char-card.tsx, guides-ui.tsx, upnext.tsx.
const QA_PORT = +process.env.PORT || 8194; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const URL0 = 'http://127.0.0.1:' + QA_PORT;
  // The name's box against the card: lines taken, room left before ⋯ (or the
  // card's inner edge), and whether it is cut ("…").
  const measure = (page, sel, card) => page.evaluate(([sel, card]) => {
    const t = document.querySelector(sel);
    if (!t) return null;
    const s = t.querySelector('span') || t;
    const c = document.querySelector(card).getBoundingClientRect();
    const more = document.querySelector(card + ' .cb-more');
    const limit = more ? more.getBoundingClientRect().left : c.right;
    const lh = parseFloat(getComputedStyle(s).lineHeight);
    return {
      text: s.textContent, tip: t.title || s.title,
      lines: Math.round(s.getBoundingClientRect().height / lh),
      room: Math.round(limit - t.getBoundingClientRect().right),
      cut: s.scrollHeight > s.clientHeight + 1,
    };
  }, [sel, card]);
  const PHONE = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const DESK = { viewport: { width: 1440, height: 900 } };

  for (const [form, opts] of [['desktop', DESK], ['phone', PHONE]]) {
    for (const lang of ['en', 'pt-BR']) {
      const key = form + ' ' + lang;
      const { ctx, page, errors: e } = await ctxPage(browser, opts, SEED + "localStorage.setItem('mcu.lang.v1','" + lang + "');");
      await page.goto(URL0 + '/characters/peter'); await require('./ready').appReady(page);
      const seen = [];
      for (let i = 0; i < 11; i++) {
        const m = await measure(page, '.char-card .cc-title', '.char-card');
        if (!m) { errors.push(key + ': no stepper title at stop ' + (i + 1)); break; }
        seen.push(m);
        if (m.lines > 2) errors.push(key + ': "' + m.text + '" takes ' + m.lines + ' lines');
        if (m.room < 0) errors.push(key + ': "' + m.text + '" runs ' + (-m.room) + 'px past the stepper (into ⋯ or the edge)');
        if (m.tip !== m.text) errors.push(key + ': "' + m.text + '" has the tooltip ' + JSON.stringify(m.tip));
        await page.locator('.char-card .cb-step button').last().click(); await page.waitForTimeout(350);
      }
      out[key] = { stops: seen.length, twoLine: seen.filter(m => m.lines === 2).map(m => m.text), minRoom: Math.min(...seen.map(m => m.room)) };
      if (lang === 'pt-BR' && !seen.some(m => /Seu Amigão/.test(m.text))) errors.push(key + ': never reached Seu Amigão da Vizinhança');
      await page.screenshot({ path: path.join(S, 'shots', 'titlefit-' + form + '-' + lang + '.png') });
      // The phone's All titles card.
      if (form === 'phone') {
        await page.goto(URL0 + '/'); await require('./ready').appReady(page);
        const u = await measure(page, '.un-title', '.un-mrow');
        out[key + ' allTitles'] = u;
        if (!u) errors.push(key + ': no All titles card');
        else if (u.lines > 2 || u.room < 0) errors.push(key + ': All titles card name ' + JSON.stringify(u));
      }
      errors.push(...e.map(x => key + ': ' + x));
      await ctx.close();
    }
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
`);
