// Portuguese addresses in the app (Notion "Findability 6"; Andre chose
// Portuguese words, 2026-11-24): src/share-card/addresses.ts, pt-slugs.ts,
// i18n.js (the address's language wins), app.tsx (writing and moving the
// address), share.tsx (links in the sharer's language).
//   - Every guide, title and character has a frozen Portuguese slug, all
//     different within their kind.
//   - /pt/titulos/homem-de-ferro opens the app in Portuguese on Iron Man,
//     desktop and phone, whatever the browser's language; /pt opens the home.
//   - Choosing English moves the address to /titles/iron-man, and back;
//     closing the title leaves /pt; a share link is /pt/… in Portuguese.
//   - An English address in an English browser stays English.
//   - Brazil's names and date: Vingadores: Doutor Destino on 17 December,
//     *Os Novos Vingadores; searching the old name still finds Doomsday.
// The pages crawlers read (lang, hreflang, sitemap) are test-previews' job.
const QA_PORT = +process.env.PORT || 8196; // regress/quick give each check its own port
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const out = {}, errors = [];
  const URL0 = 'http://127.0.0.1:' + QA_PORT;
  const ready = require('./ready').appReady;
  const where = page => page.evaluate(() => location.pathname + location.search);

  // The slug table: one per id, unique per kind.
  {
    const slugs = JSON.parse(/= (\\{[\\s\\S]*\\});/.exec(fs.readFileSync(path.join(__dirname, '..', 'src/share-card/pt-slugs.ts'), 'utf8'))[1]);
    const { ctx, page } = await ctxPage(browser, { viewport: { width: 1440, height: 900 } }, SEED);
    await page.goto(URL0 + '/'); await ready(page);
    const ids = await page.evaluate(() => ({ title: TITLES.map(t => t.id), guide: (GUIDES || []).map(g => g.id), char: Object.keys(CHARACTERS) }));
    for (const kind of ['title', 'guide', 'char']) {
      const missing = ids[kind].filter(id => !slugs[kind][id]);
      if (missing.length) errors.push('pt-slugs.ts: no slug for ' + kind + ' ' + missing.join(', '));
      const vals = Object.values(slugs[kind]);
      if (new Set(vals).size !== vals.length) errors.push('pt-slugs.ts: two ' + kind + 's share a slug');
    }
    out.slugs = { title: Object.keys(slugs.title).length, guide: Object.keys(slugs.guide).length, char: Object.keys(slugs.char).length };
    await ctx.close();
  }

  for (const [form, opts] of [['desktop', { viewport: { width: 1440, height: 900 }, locale: 'en-US' }], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-US' }]]) {
    const { ctx, page, errors: e } = await ctxPage(browser, opts, SEED);
    await page.goto(URL0 + '/pt/titulos/homem-de-ferro'); await ready(page);
    const a = await page.evaluate(() => ({
      lang: MCU_I18N.lang, html: document.documentElement.lang, path: location.pathname,
      open: (document.querySelector('.drawer.open h2, .drawer.open .td-title, .m-sheet h2, [role=dialog] h2') || {}).textContent || null,
      stored: localStorage.getItem('mcu.lang.v1'),
    }));
    out[form + ' open'] = a;
    if (a.lang !== 'pt-BR' || a.html !== 'pt-BR') errors.push(form + ': /pt/titulos/homem-de-ferro did not open in Portuguese in an English browser: ' + JSON.stringify(a));
    if (!/Homem de Ferro/.test(a.open || '')) errors.push(form + ': /pt/titulos/homem-de-ferro did not open Iron Man: ' + JSON.stringify(a));
    if (a.path !== '/pt/titulos/homem-de-ferro') errors.push(form + ': the address moved to ' + a.path);
    if (a.stored) errors.push(form + ': the address saved its language (' + a.stored + '); it should not');
    // Choosing English and back moves the address.
    await page.evaluate(() => MCU_I18N.setLang('en')); await page.waitForTimeout(300);
    const en = await where(page);
    await page.evaluate(() => MCU_I18N.setLang('pt-BR')); await page.waitForTimeout(300);
    const pt = await where(page);
    out[form + ' switch'] = { en, pt };
    if (en !== '/titles/iron-man' || pt !== '/pt/titulos/homem-de-ferro') errors.push(form + ': switching language moved the address to ' + en + ' and ' + pt);
    // A share link in Portuguese.
    const share = await page.evaluate(() => MCU_SHARE.url({ guide: 'before-doomsday' }));
    if (!/\\/pt\\/guias\\/antes-de-doutor-destino$/.test(share)) errors.push(form + ': a Portuguese share link is ' + share);
    if (form === 'desktop') {
      await page.keyboard.press('Escape'); await page.waitForTimeout(700);
      const home = await where(page);
      out.closed = home;
      if (home !== '/pt') errors.push('desktop: closing the title left ' + home + ', not /pt');
      // Brazil's names and date, and the old name still searchable.
      const n = await page.evaluate(() => {
        const t = id => TITLES.find(x => x.id === id);
        return { doom: MCU_I18N.titleName(t('doomsday')), date: MCU_I18N.release(t('doomsday')).date, day: MCU_I18N.releaseDay(t('doomsday')),
          thunder: MCU_I18N.titleName(t('thunderbolts')), oldName: MCU_I18N.titleNames(t('doomsday')).includes('Vingadores: Doomsday') };
      });
      out.names = n;
      if (n.doom !== 'Vingadores: Doutor Destino' || n.day !== '2026-12-17' || !/17 de dezembro de 2026/.test(n.date)) errors.push('Doomsday in Portuguese: ' + JSON.stringify(n));
      if (n.thunder !== '*Os Novos Vingadores') errors.push('Thunderbolts* in Portuguese: ' + n.thunder);
      if (!n.oldName) errors.push('"Vingadores: Doomsday" is no longer searchable');
    }
    await page.screenshot({ path: path.join(S, 'shots', 'ptpages-' + form + '.png') });
    errors.push(...e.map(x => form + ': ' + x));
    await ctx.close();
  }

  // /pt opens the home page in Portuguese; an English address stays English.
  {
    const { ctx, page, errors: e } = await ctxPage(browser, { viewport: { width: 1440, height: 900 }, locale: 'en-US' }, SEED);
    await page.goto(URL0 + '/pt'); await ready(page);
    const h = await page.evaluate(() => ({ lang: MCU_I18N.lang, path: location.pathname }));
    if (h.lang !== 'pt-BR' || h.path !== '/pt') errors.push('/pt: ' + JSON.stringify(h));
    await page.goto(URL0 + '/titles/iron-man'); await ready(page);
    const en = await page.evaluate(() => ({ lang: MCU_I18N.lang, path: location.pathname, day: MCU_I18N.releaseDay(TITLES.find(x => x.id === 'doomsday')) }));
    out.english = en;
    if (en.lang !== 'en' || en.path !== '/titles/iron-man' || en.day !== '2026-12-18') errors.push('an English address: ' + JSON.stringify(en));
    errors.push(...e.map(x => 'home: ' + x));
    await ctx.close();
  }

  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); server.close();
})();
`);
