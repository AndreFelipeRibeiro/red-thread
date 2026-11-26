// Text that doesn't fit (Notion "Portuguese copy pass: find text that
// overflows its container, and set the fallback"; Andre's rule, 2026-11-24:
// a name too long for its box wraps to two lines, then "…", with the full
// name on hover). Opens every surface in English and Portuguese at desktop
// and phone widths and measures each piece of visible text:
//   runs past  the text's box ends beyond its card, row, button or panel;
//   cut        an element clips its text without "…" (the stepper's
//              "Homem-Aran" before Batch 27);
//   ellipsis   an element ends its text in "…" (fine for a label; a title
//              should take its two lines first). Reported, not failed.
// Writes qa/shots/overflow-<surface>-<lang>-<width>.png for each surface that
// has a finding, and prints one JSON report. Development only, like all of
// qa/. `FAIL=1` exits non-zero on any "runs past" or "cut" (the check form).
const QA_PORT = +process.env.PORT || 8197;
const base = require('fs').readFileSync(__dirname + '/test-jit2.js', 'utf8');
const head = base.slice(0, base.indexOf('(async () => {'));
eval(head + `
(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const browser = await chromium.launch();
  const URL0 = 'http://127.0.0.1:' + QA_PORT;
  const ready = require('./ready').appReady;
  const report = { findings: [], surfaces: 0 };

  // Measures the page as it is now. Ignores the canvas threads' labels (they
  // are drawn on the canvas and may sit anywhere), hidden and sr-only text.
  const measure = () => {
    const out = [];
    const W = document.documentElement.clientWidth;
    const boxy = (el) => {
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (a !== el && (cs.overflowX !== 'visible' || a.tagName === 'BUTTON' || a.getAttribute('role') === 'dialog'
          || /(^|\\s)(card|char-card|m-lrow|drawer|settings-panel|un-mrow|g-stop|g-head|widget|acct-pop|m-sheet)(\\s|$)/.test(a.className || '')
          || (parseFloat(cs.borderRightWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0))) return a;
      }
      return document.documentElement;
    };
    const label = (el) => {
      const c = (el.className && typeof el.className === 'string' ? el.className.split(/\\s+/).filter(x => !/[\\[:]/.test(x)).slice(0, 3).join('.') : '') || el.tagName.toLowerCase();
      return c;
    };
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      if (!text || text.length < 2) continue;
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      // Not text to read: drawn art (the Monogram's initials fill its poster
      // on purpose, clipped by it), screen-reader-only text, the crawlers' copy.
      if (el.closest('svg, script, style, .story-sr, .sr-only, #mcu-page-text, .thread-label, .tl-lab, .poster-mono')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      // A label hidden at this width the sr-only way (max-[899px]:sr-only): 1px wide, clipped.
      if (el.getBoundingClientRect().width <= 2) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const rect = r.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > W) continue;
      seen.add(el);
      // cut / ellipsis: the element (or its nearest clipping block) is narrower than its text.
      let clip = el;
      while (clip && clip !== document.body && getComputedStyle(clip).overflowX === 'visible' && getComputedStyle(clip).display.startsWith('inline')) clip = clip.parentElement;
      const ccs = getComputedStyle(clip);
      const over = clip.scrollWidth > clip.clientWidth + 1 || clip.scrollHeight > clip.clientHeight + 2 && ccs.webkitLineClamp && ccs.webkitLineClamp !== 'none';
      if (over && ccs.overflowX !== 'visible') {
        const ell = ccs.textOverflow === 'ellipsis' || (ccs.webkitLineClamp && ccs.webkitLineClamp !== 'none');
        out.push({ kind: ell ? 'ellipsis' : 'cut', text: text.slice(0, 60), el: label(clip), by: Math.round(clip.scrollWidth - clip.clientWidth) });
        continue;
      }
      // runs past: the text's rectangle leaves its box.
      const box = boxy(el);
      const b = box === document.documentElement ? { left: 0, right: W } : box.getBoundingClientRect();
      const past = Math.max(rect.right - b.right, b.left - rect.left);
      if (past > 1.5) out.push({ kind: 'runs past', text: text.slice(0, 60), el: label(el), box: label(box), by: Math.round(past) });
    }
    return out;
  };

  const DESK = (w) => ({ viewport: { width: w, height: 900 } });
  const PHONE = (w) => ({ viewport: { width: w, height: 812 }, isMobile: true, hasTouch: true });
  // Each surface: how to get there from a fresh page. ph: phone only, dk: desktop only.
  const SURFACES = [
    { id: 'titles', go: '/titles' },
    { id: 'connections', go: '/?view=spatial', dk: true },
    { id: 'guides', go: '/guides' },
    { id: 'guide-doomsday', go: '/guides/before-doomsday' },
    { id: 'guide-spidey', go: '/guides/spider-man' },
    { id: 'details-long', go: '/titles/friendly-spidey' },
    { id: 'details-multiverse', go: '/titles/multiverse-madness' },
    { id: 'stepper-peter', go: '/characters/peter?view=list', steps: 11 },
    { id: 'thread', go: '/titles/endgame?explore=thread' },
    { id: 'settings', go: '/titles', click: '.settings-btn' },
    { id: 'filters', go: '/titles', click: '.filters-btn, .m-filter-btn, button[aria-label*="ilt"]' },
    { id: 'search', go: '/titles', type: 'homem' },
  ];
  const langs = (process.env.LANGS || 'en,pt-BR').split(',');
  const only = (process.env.WIDTHS || '').split(',').filter(Boolean).map(Number);
  const widths = [['desktop', 1440, DESK], ['desktop', 1024, DESK], ['phone', 375, PHONE], ['phone', 320, PHONE]]
    .filter(([, w]) => !only.length || only.includes(w));
  for (const lang of langs) {
    for (const [form, w, mk] of widths) {
      const { ctx, page } = await ctxPage(browser, mk(w), SEED + "localStorage.setItem('mcu.lang.v1','" + lang + "');");
      for (const s of SURFACES) {
        if ((s.ph && form !== 'phone') || (s.dk && form !== 'desktop')) continue;
        try {
          await page.goto(URL0 + s.go); await ready(page);
          if (s.click) { const b = page.locator(s.click).first(); if (await b.count()) { await b.click(); await page.waitForTimeout(600); } else continue; }
          if (s.type) { const i = page.locator('.search-wrap input, input[type=search]').first(); if (await i.count()) { await i.click(); await i.fill(s.type); await page.waitForTimeout(600); } else continue; }
          const found = [];
          const steps = s.steps || 1;
          for (let k = 0; k < steps; k++) {
            (await page.evaluate(measure)).forEach(f => { if (!found.some(x => x.kind === f.kind && x.text === f.text && x.el === f.el)) found.push(f); });
            if (k < steps - 1) {
              const n = page.locator('.char-card .cb-step button').last();
              if (!(await n.count()) || !(await n.isVisible())) break;
              await n.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300);
            }
          }
          report.surfaces++;
          if (found.length) {
            const shot = 'overflow-' + s.id + '-' + lang + '-' + w + '.png';
            await page.screenshot({ path: path.join(S, 'shots', shot) });
            found.forEach(f => report.findings.push({ surface: s.id, lang, width: w, ...f, shot }));
          }
        } catch (e) { report.findings.push({ surface: s.id, lang, width: w, kind: 'error', text: String(e.message).slice(0, 120) }); }
      }
      await ctx.close();
    }
  }
  const by = k => report.findings.filter(f => f.kind === k).length;
  report.counts = { runsPast: by('runs past'), cut: by('cut'), ellipsis: by('ellipsis'), errors: by('error') };
  report.errors = process.env.FAIL ? report.findings.filter(f => f.kind === 'runs past' || f.kind === 'cut' || f.kind === 'error').map(f => f.surface + ' ' + f.lang + ' ' + f.width + ': ' + f.kind + ' "' + f.text + '" (' + f.el + ')') : [];
  console.log(JSON.stringify(report, null, 1));
  await browser.close(); server.close();
})();
`);
