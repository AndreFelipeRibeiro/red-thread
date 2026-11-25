// The quiet character marker on title rows and Connections cards (Notion
// "Titles: show the picked character on each of their title rows", design
// v2/v3, Andre 2026-11-24): CharMark in src/app/list-parts.tsx, its data
// (charMarks) in src/app/app.tsx.
//   - Typed search: each row names its own matches, the typed part marked;
//     a typed actor names the actor ("Peter Parker · Tom Holland"); several
//     matches list every name on a row, "+1" on a card.
//   - A pick: the character's portrayals in each title, named once (No Way
//     Home's three Peters), the performer only where it isn't the one
//     picked (The Incredible Hulk: Edward Norton).
//   - Cards keep their 330px: the year line becomes the marker and stays
//     inside the card; a title-only match ("iron") keeps its year.
//   - The old pink badge (.card-match) is gone everywhere.
// Desktop, phone, and Portuguese.
const QA_PORT = +process.env.PORT || 8193; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {};
  const URL0 = 'http://127.0.0.1:' + QA_PORT;
  const rows = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-row-id]')].map(r => {
    const m = r.querySelector('.char-mark');
    return [r.getAttribute('data-row-id'), m ? { text: m.querySelector('.char-mark-text').textContent, faces: m.querySelectorAll('.char-mark-face').length, hl: [...m.querySelectorAll('mark.hl')].map(x => x.textContent).join('|'), tip: m.title } : null];
  })));
  const cards = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.card[data-id]')].filter(c => c.querySelector('.card-title')).map(c => {
    const l = c.querySelector('.card-mark-line');
    const cr = c.getBoundingClientRect();
    const id = c.getAttribute('data-id') || c.querySelector('.card-title').textContent;
    return [id, l ? { text: l.querySelector('.char-mark-text').textContent, inside: l.getBoundingClientRect().bottom <= cr.bottom + 0.5, faces: l.querySelectorAll('.char-mark-face').length } : { year: (c.querySelector('.card-year') || {}).textContent || null }];
  })));
  const oldBadges = page => page.evaluate(() => document.querySelectorAll('.card-match').length);
  const search = async (page, sel, text) => { const b = page.locator(sel); await b.fill(text); await b.press('Escape'); await page.waitForTimeout(600); };

  // ---- Desktop ---------------------------------------------------------------
  let { ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, SEED);
  await page.goto(URL0 + '/'); await require('./ready').appReady(page);
  // Connections cards
  await search(page, '.search-wrap input', 'pete');
  let c = await cards(page);
  out.cardsPete = { cw: c['civil-war'], iw: c['infinity-war'], nwh: c['no-way-home'] };
  const marked = Object.entries(c).filter(([, v]) => v && v.text);
  out.cardsMarked = marked.length;
  if (!marked.length) errors.push('cards: no card shows the marker for "pete"');
  marked.filter(([, v]) => !v.inside).forEach(([k]) => errors.push('cards: ' + k + "'s marker runs past the card's bottom"));
  if (!out.cardsPete.cw || out.cardsPete.cw.text !== 'Peter Parker') errors.push('cards: Civil War reads ' + JSON.stringify(out.cardsPete.cw) + ', not "Peter Parker"');
  if (!out.cardsPete.iw || !/\\+1$/.test(out.cardsPete.iw.text) || out.cardsPete.iw.faces !== 2) errors.push('cards: Infinity War reads ' + JSON.stringify(out.cardsPete.iw) + ', not two faces and "+1"');
  if (!out.cardsPete.nwh || out.cardsPete.nwh.text !== 'Peter Parker' || out.cardsPete.nwh.faces !== 3) errors.push('cards: No Way Home reads ' + JSON.stringify(out.cardsPete.nwh) + ', not three faces and "Peter Parker"');
  await page.screenshot({ path: path.join(S, 'shots', 'charmark-d1440-cards-pete.png') });
  await search(page, '.search-wrap input', 'tom holland');
  c = await cards(page); out.cardsTom = c['civil-war'];
  if (!out.cardsTom || out.cardsTom.text !== 'Tom Holland') errors.push('cards: a typed actor reads ' + JSON.stringify(out.cardsTom) + ', not "Tom Holland"');
  await search(page, '.search-wrap input', 'iron');
  c = await cards(page); out.cardsIron = c['iron-man'];
  if (!out.cardsIron || out.cardsIron.text || !/2008/.test(out.cardsIron.year || '')) errors.push('cards: Iron Man, a title-only match, reads ' + JSON.stringify(out.cardsIron) + ', not its year');
  out.oldBadgesCards = await oldBadges(page);
  // Titles rows, typed
  await page.goto(URL0 + '/titles'); await require('./ready').appReady(page);
  await search(page, '.search-wrap input', 'pete');
  let r = await rows(page);
  out.rowsPete = { iw: r['infinity-war'], hc: r['homecoming'], gotg: r['gotg'] };
  if (!r['infinity-war'] || r['infinity-war'].faces !== 2 || !/Peter Parker/.test(r['infinity-war'].text) || !/Peter Quill/.test(r['infinity-war'].text)) errors.push('rows: Infinity War reads ' + JSON.stringify(r['infinity-war']) + ', not both Peters');
  if (!r['homecoming'] || r['homecoming'].text !== 'Peter Parker' || r['homecoming'].hl !== 'Pete') errors.push('rows: Homecoming reads ' + JSON.stringify(r['homecoming']) + ', not "Peter Parker" with "Pete" marked');
  await page.screenshot({ path: path.join(S, 'shots', 'charmark-d1440-rows-pete.png'), clip: { x: 0, y: 0, width: 1440, height: 700 } });
  await search(page, '.search-wrap input', 'tom holland');
  r = await rows(page); out.rowsTom = r['civil-war'];
  if (!r['civil-war'] || r['civil-war'].text !== 'Peter Parker · Tom Holland' || r['civil-war'].hl !== 'Tom Holland') errors.push('rows: a typed actor reads ' + JSON.stringify(r['civil-war']) + ', not "Peter Parker · Tom Holland" with the actor marked');
  out.oldBadgesRows = await oldBadges(page);
  // Titles rows, picked
  await page.goto(URL0 + '/characters/peter?view=list'); await require('./ready').appReady(page); await page.waitForTimeout(400);
  r = await rows(page); out.rowsPeter = { nwh: r['no-way-home'], hc: r['homecoming'] };
  if (!r['no-way-home'] || r['no-way-home'].text !== 'Peter Parker' || r['no-way-home'].faces !== 3) errors.push('pick: No Way Home reads ' + JSON.stringify(r['no-way-home']) + ', not three faces and "Peter Parker" once');
  if (!r['homecoming'] || r['homecoming'].text !== 'Peter Parker' || r['homecoming'].hl) errors.push('pick: Homecoming reads ' + JSON.stringify(r['homecoming']));
  await page.screenshot({ path: path.join(S, 'shots', 'charmark-d1440-rows-peter.png'), clip: { x: 0, y: 0, width: 1440, height: 700 } });
  await page.goto(URL0 + '/characters/bruce?view=list'); await require('./ready').appReady(page); await page.waitForTimeout(400);
  r = await rows(page); out.rowsBruce = { hulk: r['incredible-hulk'], avengers: r['avengers'] };
  if (!r['incredible-hulk'] || r['incredible-hulk'].text !== 'Bruce Banner · Edward Norton') errors.push('pick: The Incredible Hulk reads ' + JSON.stringify(r['incredible-hulk']) + ', not "Bruce Banner · Edward Norton"');
  if (!r['avengers'] || r['avengers'].text !== 'Bruce Banner') errors.push('pick: The Avengers reads ' + JSON.stringify(r['avengers']) + ', not "Bruce Banner"');
  // Connections with the pick: the line of cards
  await page.goto(URL0 + '/characters/peter'); await require('./ready').appReady(page); await page.waitForTimeout(600);
  c = await cards(page);
  const pc = Object.entries(c).filter(([, v]) => v && v.text);
  out.cardsPeter = pc.length;
  if (!pc.length || pc.some(([, v]) => v.text !== 'Peter Parker' || !v.inside)) errors.push('pick: the cards read ' + JSON.stringify(pc.slice(0, 3)));
  await page.screenshot({ path: path.join(S, 'shots', 'charmark-d1440-cards-peter.png') });
  if (out.oldBadgesCards || out.oldBadgesRows) errors.push('the old badge (.card-match) still shows');
  out.errors = errors; await ctx.close();

  // ---- Phone -----------------------------------------------------------------
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true }, SEED));
  await page.goto(URL0 + '/'); await require('./ready').appReady(page);
  await page.locator('.m-search-btn').click().catch(() => {}); await page.waitForTimeout(150);
  await search(page, '.m-searchbar input', 'pete');
  r = await rows(page); out.mRowsPete = { hc: r['homecoming'], iw: r['infinity-war'] };
  if (!r['homecoming'] || r['homecoming'].text !== 'Peter Parker') errors.push('phone: Homecoming reads ' + JSON.stringify(r['homecoming']));
  if (!r['infinity-war'] || r['infinity-war'].faces !== 2) errors.push('phone: Infinity War reads ' + JSON.stringify(r['infinity-war']));
  await page.screenshot({ path: path.join(S, 'shots', 'charmark-m390-rows-pete.png') });
  await page.goto(URL0 + '/characters/peter'); await require('./ready').appReady(page); await page.waitForTimeout(400);
  r = await rows(page); out.mRowsPeter = r['no-way-home'];
  if (!r['no-way-home'] || r['no-way-home'].faces !== 3) errors.push('phone pick: No Way Home reads ' + JSON.stringify(r['no-way-home']));
  out.mErrors = errors; await ctx.close();

  // ---- Portuguese --------------------------------------------------------------
  ({ ctx, page, errors } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, locale: 'pt-BR' }, SEED));
  await page.goto(URL0 + '/characters/bruce?view=list'); await require('./ready').appReady(page); await page.waitForTimeout(400);
  r = await rows(page); out.ptHulk = r['incredible-hulk'];
  if (!r['incredible-hulk'] || !/Edward Norton$/.test(r['incredible-hulk'].text) || !/^Edward Norton como /.test(r['incredible-hulk'].tip)) errors.push('pt-BR: The Incredible Hulk reads ' + JSON.stringify(r['incredible-hulk']));
  out.ptErrors = errors; await ctx.close();
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error('FAIL', e.message.split('\\n')[0]); process.exit(1); });
`);
