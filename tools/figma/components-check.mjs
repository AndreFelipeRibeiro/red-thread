#!/usr/bin/env node
// components-check.mjs — compare the library components with the app
// (Notion "Figma ⇄ code check 2/2: components and App Screens"). Report only.
//
//   node tools/figma/components-check.mjs <figma.json> <code.json> [--json]
//
// <figma.json> is what tools/figma/components-dump.js returns from use_figma;
// <code.json> is what tools/figma/components-capture.mjs prints. Both hold one
// fingerprint per entry of tools/figma/components.json
// (components-fingerprint.mjs says what a fingerprint holds). Exits 1 when a
// component differs, 0 when every one agrees.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRANSLUCENT } from './components-fingerprint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (args.length < 2) {
  console.error('usage: node tools/figma/components-check.mjs <figma.json> <code.json> [--json]');
  process.exit(2);
}
const [figma, code] = args.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/figma/components.json'), 'utf8'));
const asJson = process.argv.includes('--json');

const tok = (t) => TRANSLUCENT[t] || t;
const set = (a) => [...new Set(a.map(tok))].sort();
const same = (a, b, tol = 1) => (Array.isArray(a) || Array.isArray(b)
  ? JSON.stringify([].concat(a)) === JSON.stringify([].concat(b)) || ([].concat(a).length === [].concat(b).length && [].concat(a).every((x, i) => Math.abs(x - [].concat(b)[i]) <= tol))
  : typeof a === 'number' ? Math.abs(a - b) <= tol : a === b);

const results = [];
for (const e of reg.entries) {
  const f = figma.entries.find((x) => x.figma === e.figma && x.name === e.name);
  const c = code.entries.find((x) => x.figma === e.figma && x.name === e.name);
  const r = { name: e.name, figma: e.figma, diffs: [], error: null };
  if (!f || f.error) r.error = `Figma: ${f ? f.error : 'not in the dump'}`;
  else if (!c || c.error) r.error = `app: ${c ? c.error : 'not captured'}`;
  else {
    const F = f.fp; const C = c.fp;
    const d = (what, fv, cv) => r.diffs.push({ what, figma: fv, code: cv });
    if (e.size.includes('w') && !same(F.w, C.w)) d('width', F.w, C.w);
    if (e.size.includes('h') && !same(F.h, C.h)) d('height', F.h, C.h);
    if (F.layout !== C.layout) d('layout', F.layout, C.layout);
    if (!same(F.padding, C.padding)) d('padding', F.padding, C.padding);
    if (!same(F.gap, C.gap)) d('gap', F.gap, C.gap);
    if (!same(F.radius, C.radius)) d('radius', F.radius, C.radius);
    for (const k of ['fill', 'stroke', 'elevation']) if (tok(F[k]) !== tok(C[k])) d(k, F[k], C[k]);
    for (const k of ['colors', 'type', 'icons']) {
      const fs_ = k === 'colors' ? set(F[k]) : F[k]; const cs = k === 'colors' ? set(C[k]) : C[k];
      const onlyF = fs_.filter((x) => !cs.includes(x)); const onlyC = cs.filter((x) => !fs_.includes(x));
      if (onlyF.length || onlyC.length) d(k, onlyF.length ? `only in Figma: ${onlyF.join(', ')}` : '—', onlyC.length ? `only in code: ${onlyC.join(', ')}` : '—');
    }
  }
  results.push(r);
}

const differing = results.filter((r) => r.error || r.diffs.length);
if (asJson) console.log(JSON.stringify({ differing: differing.length, results }, null, 2));
else {
  const out = [`Figma ⇄ code check, components: ${results.length} compared (tools/figma/components.json).`];
  for (const r of differing) {
    out.push(`\n${r.name} (${r.figma}):`);
    if (r.error) out.push(`  - couldn't compare: ${r.error}`);
    for (const x of r.diffs) out.push(`  - ${x.what}: Figma ${JSON.stringify(x.figma)}; code ${JSON.stringify(x.code)}`);
  }
  const ok = results.length - differing.length;
  out.push(`\n${ok} agree, ${differing.length} differ.`);
  console.log(out.join('\n'));
}
process.exit(differing.length ? 1 : 0);
