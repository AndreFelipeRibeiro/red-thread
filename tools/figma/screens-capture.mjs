#!/usr/bin/env node
// screens-capture.mjs — screenshots of the app at the views tools/figma/
// screens.json names, in both themes, to set beside the App Screens frames
// (Notion "Figma ⇄ code check 2/2"). Same seeded collection as
// components-capture.mjs; uses the QA checks' Playwright and the dev server.
//
//   node tools/figma/screens-capture.mjs <out folder> [--site http://localhost:8126/]
//
// Writes <out folder>/<frame id>.png (the id of the matching Light or Dark
// frame), so each pairs with that frame's get_screenshot.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'qa/package.json'));
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const outDir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--site');
if (!outDir) { console.error('usage: node tools/figma/screens-capture.mjs <out folder> [--site URL]'); process.exit(2); }
const site = (args.includes('--site') ? args[args.indexOf('--site') + 1] : 'http://localhost:8126/').replace(/\/?$/, '/');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/figma/screens.json'), 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const SEED = (theme) => `try {
  localStorage.setItem('mcu.collection.v1', JSON.stringify({version:1, states:{'iron-man':'seen','incredible-hulk':'seen','iron-man-2':'seen','thor':'seen','cap-first-avenger':'seen','avengers':'seen','iron-man-3':'seen','thor-dark-world':'seen','cap-winter-soldier':'seen','gotg':'seen','aou':'seen','civil-war':'seen','loki-s1':'watchlist','shang-chi':'watchlist','thunderbolts':'watchlist','agatha':'watchlist'}}));
  localStorage.setItem('mcu.welcome.v1', 'check');
  localStorage.setItem('mcu.signInNudge.v1', '2');
  localStorage.setItem('mcu.theme', '${theme}');
} catch (e) {}`;
const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
};

const browser = await chromium.launch();
const written = [];
try {
  for (const s of reg.frames.filter((x) => x.url)) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ ...DEVICES[s.device], colorScheme: theme });
      await ctx.addInitScript(SEED(theme));
      const page = await ctx.newPage();
      await page.goto(site + s.url);
      await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 30000 });
      await page.waitForTimeout(1500);
      for (let i = 0; i < 2 && (await page.$('[role=dialog]')) && !/title=/.test(s.url); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
      const file = path.join(outDir, `${s[theme].replace(':', '-')}.png`);
      await page.screenshot({ path: file });
      written.push(`${s.name} · ${theme}: ${file}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(written.join('\n'));
