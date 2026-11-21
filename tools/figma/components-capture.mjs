#!/usr/bin/env node
// components-capture.mjs — read each component in tools/figma/components.json
// from the running app into a fingerprint (Notion "Figma ⇄ code check 2/2:
// components and App Screens").
//
//   npm run dev            (in another terminal; this reads /tools/figma/ from it)
//   node tools/figma/components-capture.mjs [--site http://localhost:8126/] > code.json
//
// Uses the QA checks' Playwright (bash qa/setup.sh, once per machine). Each
// element is read with capture-dom.js, in both themes, and reduced to the
// same fingerprint tools/figma/components-dump.js makes from Figma; then
// tools/figma/components-check.mjs compares the two.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { fingerprintFromSpec } from './components-fingerprint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'qa/package.json'));
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const site = (args[args.indexOf('--site') + 1] && args.includes('--site') ? args[args.indexOf('--site') + 1] : 'http://localhost:8126/').replace(/\/?$/, '/');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/figma/components.json'), 'utf8'));

// The QA checks' collection: Iron Man to Civil War seen, a few on the Watchlist.
const SEED = `try {
  localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','incredible-hulk':'seen','iron-man-2':'seen','thor':'seen','cap-first-avenger':'seen','avengers':'seen','iron-man-3':'seen','thor-dark-world':'seen','cap-winter-soldier':'seen','gotg':'seen','aou':'seen','civil-war':'seen','loki-s1':'watchlist','shang-chi':'watchlist','thunderbolts':'watchlist','agatha':'watchlist'}}));
  localStorage.setItem('mcu.welcome.v1', 'check');
  localStorage.setItem('mcu.signInNudge.v1', '2');
} catch (e) {}`; // first-use hints stay off for automated browsers (hints.tsx)
const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
};

const browser = await chromium.launch();
const out = { v: 1, site, entries: [] };
try {
  for (const e of reg.entries) {
    if (only && !e.name.includes(only)) continue;
    const ctx = await browser.newContext(DEVICES[e.device]);
    await ctx.addInitScript(SEED);
    if (e.seen) await ctx.addInitScript(`try { const c = JSON.parse(localStorage.getItem('mcu.collection.v1')); ${JSON.stringify(e.seen)}.forEach((id) => { c.states[id] = 'seen'; }); localStorage.setItem('mcu.collection.v1', JSON.stringify(c)); } catch (e) {}`);
    if (e.storage) await ctx.addInitScript(`try { ${Object.entries(e.storage).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join(' ')} } catch (e) {}`);
    const page = await ctx.newPage();
    try {
      await page.goto(site + e.url);
      await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 30000 });
      await page.waitForTimeout(900);
      // A first-visit offer (the promoted guide) can sit over the page.
      for (let i = 0; i < 2 && (await page.$('[role=dialog]')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
      const spec = await page.evaluate(async (sel) => {
        const el = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length);
        if (!el) return { missing: true };
        el.scrollIntoView({ block: 'center' });
        await new Promise((r) => setTimeout(r, 300));
        const X = await import('/tools/figma/capture-dom.js');
        const spec = X.capture(el, {});
        // A field's text (its placeholder or value) isn't a text node: added here.
        spec.fields = [...el.querySelectorAll('input, textarea')].filter((i) => i.getClientRects().length && (i.value || i.placeholder))
          .map((i) => { const s = getComputedStyle(i); return `${Math.round(parseFloat(s.fontSize) * 10) / 10}/${parseInt(s.fontWeight, 10)}`; });
        return spec;
      }, e.selector);
      if (spec.missing) out.entries.push({ name: e.name, figma: e.figma, error: `no visible element for ${e.selector}` });
      else out.entries.push({ name: e.name, figma: e.figma, size: e.size, fp: fingerprintFromSpec(spec), warnings: spec.warnings.length });
    } catch (err) {
      out.entries.push({ name: e.name, figma: e.figma, error: String(err.message || err).split('\n')[0] });
    } finally {
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(out));
