#!/usr/bin/env node
// screens-check.mjs — the App Screens half of the Figma ⇄ code check (part
// 2/2). Report only.
//
//   node tools/figma/screens-check.mjs <desktop.json> <phone.json> [--json]
//
// Each file is what tools/figma/screens-dump.js returns for one page. Checks
// every frame tools/figma/screens.json lists: that it exists, that it is built
// from library instances (no retired, local or missing components, and no
// layers drawn by hand beyond its `loose` allowance), and that every frame on
// the pages is listed. What a screen shows against the live app is compared
// by eye from screenshots (screens-capture.mjs and the Figma MCP's
// get_screenshot): the figma-components skill says how.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) { console.error('usage: node tools/figma/screens-check.mjs <page.json>… [--json]'); process.exit(2); }
const frames = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).frames);
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/figma/screens.json'), 'utf8'));
const byId = new Map(frames.map((f) => [f.id, f]));

const problems = [];
const listed = new Set();
for (const s of reg.frames) {
  for (const mode of ['light', 'dark']) {
    const id = s[mode];
    listed.add(id);
    const f = byId.get(id);
    const where = `${s.name} · ${mode} (${id})`;
    if (!f) { problems.push(`${where}: not on the pages read (moved, deleted, or its page wasn't dumped)`); continue; }
    if (f.retired.length) problems.push(`${where}: uses retired components: ${f.retired.join(', ')}`);
    if (f.local.length) problems.push(`${where}: uses components that aren't from the library: ${f.local.join(', ')}`);
    if (f.missing.length) problems.push(`${where}: instances whose component is gone: ${f.missing.join(', ')}`);
    const allow = s.loose || {};
    for (const [type, n] of Object.entries(f.loose)) {
      if (n > (allow[type] || 0)) problems.push(`${where}: ${n} ${type} layer(s) drawn by hand, ${allow[type] || 0} expected`);
    }
  }
}
for (const f of frames) if (!listed.has(f.id)) problems.push(`${f.name} (${f.id}): a frame tools/figma/screens.json doesn't list`);

if (process.argv.includes('--json')) console.log(JSON.stringify({ problems }, null, 2));
else {
  console.log([`Figma ⇄ code check, App Screens: ${reg.frames.length * 2} frames listed, ${frames.length} on the pages read.`,
    ...(problems.length ? ['', ...problems.map((p) => `  - ${p}`)] : []),
    '', problems.length ? `${problems.length} problem(s).` : 'Every screen is built from current library instances.'].join('\n'));
}
process.exit(problems.length ? 1 : 0);
