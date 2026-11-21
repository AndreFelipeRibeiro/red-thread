#!/usr/bin/env node
// tokens-check.mjs — compare the Figma Design System's variables, effect
// styles and text styles with the tokens in src/index.css and the map in
// docs/design-tokens.md (Notion "Figma ⇄ code check 1/2: tokens").
//
//   node tools/figma/tokens-check.mjs <dump.json> [--json]
//
// <dump.json> is what tools/figma/tokens-dump.js returns from the Figma MCP's
// use_figma (the "check tokens against Figma" skill saves it). The check only
// reads: it prints every difference with the edit that would bring the code
// in line, and exits 1 when there is one, 0 when Figma and code agree.
//
// How a Figma mode maps to the code: Light is :root, Dark is .dark; Type's
// Phone mode is the (max-width: 899px) override; Size steps' Large is the
// @container (min-width: 84rem) step; the Grid modes are the min-width media
// queries. Values are compared resolved (aliases followed, color-mix and
// calc worked out, rem at 16px), and an alias is also compared by name.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dumpPath = args.find((a) => !a.startsWith('--'));
const asJson = args.includes('--json');
if (!dumpPath) {
  console.error('usage: node tools/figma/tokens-check.mjs <dump.json> [--json]');
  process.exit(2);
}
const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
const doc = fs.readFileSync(path.join(ROOT, 'docs/design-tokens.md'), 'utf8');

// Tokens that exist only in code, on purpose (docs/design-tokens.md says why).
const CODE_ONLY = new Set([
  'fs-chrome-scale', // the phone chrome's half-step of Text size
  'drawer-w', // the details drawer's width, layout not a token
  'radius', // compared through Radius & Spacing, listed for completeness
]);
// Differences that are documented and meant (docs/design-tokens.md says why).
// Each is still printed, under "Known", so a change to it shows.
const KNOWN = {
  'Type · Phone · fs-ticker': 'the guide countdown stays 30px on phones: 1.6875rem at the phone root of 112.5% (design-tokens.md, Type)',
};
// Typeface modes other than the live one are the Theme lab's candidates.
const LIVE_TYPEFACE_MODE = 'Live · Inter';

// ---------------------------------------------------------------- CSS parse
function parseCss(src) {
  const text = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const decls = []; // { name, value, sel, at: [] }
  const stack = [];
  let buf = '';
  let depth = 0; // parentheses inside a value
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === '{' && depth === 0) { stack.push(buf.trim()); buf = ''; continue; }
    if ((ch === ';' || ch === '}') && depth === 0) {
      const m = buf.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]*?)\s*$/);
      if (m && stack.length) {
        const at = stack.filter((h) => h.startsWith('@'));
        const sels = stack.filter((h) => !h.startsWith('@'));
        decls.push({ name: m[1].slice(2), value: m[2], sel: sels[sels.length - 1] || '', at });
      }
      buf = '';
      if (ch === '}') stack.pop();
      continue;
    }
    buf += ch;
  }
  return decls;
}

const decls = parseCss(css);
const isTheme = (d) => d.at.some((a) => a.startsWith('@theme'));
const plainAt = (d) => d.at.every((a) => a.startsWith('@layer') || a.startsWith('@theme'));
const layers = {
  base: decls.filter((d) => plainAt(d) && (isTheme(d) || d.sel === ':root')),
  dark: decls.filter((d) => plainAt(d) && d.sel === '.dark'),
  phone: decls.filter((d) => d.sel === ':root' && d.at.some((a) => /max-width:\s*899px/.test(a))),
  min600: decls.filter((d) => d.sel === ':root' && d.at.some((a) => /min-width:\s*600px/.test(a))),
  min900: decls.filter((d) => d.sel === ':root' && d.at.some((a) => /min-width:\s*900px/.test(a))),
  min1600: decls.filter((d) => d.sel === ':root' && d.at.some((a) => /min-width:\s*1600px/.test(a))),
  steps: decls.filter((d) => d.sel === '.step-sizes' && d.at.length === 0),
  stepsL: decls.filter((d) => d.sel === '.step-sizes' && d.at.some((a) => a.startsWith('@container'))),
};
const toMap = (list) => new Map(list.map((d) => [d.name, d.value]));
const L = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, toMap(v)]));
const CTX = {
  light: ['base'], dark: ['dark', 'base'], phone: ['phone', 'base'],
  gPhone: ['base'], gTablet: ['min600', 'base'], gDesk: ['min900', 'min600', 'base'],
  gWide: ['min1600', 'min900', 'min600', 'base'],
  regular: ['steps', 'base'], large: ['stepsL', 'steps', 'base'],
};
const MODE_CTX = {
  Primitives: { Value: 'light' },
  Color: { Light: 'light', Dark: 'dark' },
  Type: { Desktop: 'light', Phone: 'phone' },
  'Radius & Spacing': { Value: 'light' },
  'Size steps': { Regular: 'regular', Large: 'large' },
  Grid: { Phone: 'gPhone', Tablet: 'gTablet', Desktop: 'gDesk', 'Extra wide': 'gWide' },
  Typeface: { [LIVE_TYPEFACE_MODE]: 'light' },
};
function raw(name, ctx) {
  for (const layer of CTX[ctx]) if (L[layer].has(name)) return { value: L[layer].get(name), layer };
  return null;
}

// ------------------------------------------------------------- color math
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function srgbToOklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(toLin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToSrgb([Lv, a, b]) {
  const l = (Lv + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (Lv - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (Lv - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => clamp01(toGam(c)));
}
// A color is { lab: [L, a, b], alpha }.
const fromSrgb = (rgb, alpha) => ({ lab: srgbToOklab(rgb), alpha });
const toLch = ([Lv, a, b]) => [Lv, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
const fromLch = ([Lv, C, H]) => [Lv, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
function hex8(c) {
  const rgb = oklabToSrgb(c.lab);
  return '#' + [...rgb, clamp01(c.alpha)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function parseHex(h) {
  let s = h.slice(1);
  if (s.length === 3 || s.length === 4) s = [...s].map((x) => x + x).join('');
  const n = s.match(/../g).map((x) => parseInt(x, 16) / 255);
  return fromSrgb(n.slice(0, 3), n.length === 4 ? n[3] : 1);
}
const num = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s));
function splitTop(s, sep = ',') {
  const out = []; let d = 0; let cur = '';
  for (const ch of s) {
    if (ch === '(') d++;
    if (ch === ')') d--;
    if (ch === sep && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function parseColor(v, ctx, seen = new Set()) {
  v = v.trim();
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) {
    if (seen.has(ref[1])) throw new Error('cycle at ' + ref[1]);
    const r = raw(ref[1], ctx);
    if (!r) throw new Error('unknown token --' + ref[1]);
    return parseColor(r.value, ctx, new Set([...seen, ref[1]]));
  }
  if (v === 'transparent') return { lab: [0, 0, 0], alpha: 0 };
  if (v === 'black') return fromSrgb([0, 0, 0], 1);
  if (v === 'white') return fromSrgb([1, 1, 1], 1);
  if (v.startsWith('#')) return parseHex(v);
  let m = v.match(/^rgba?\((.*)\)$/);
  if (m) {
    const [c, a] = m[1].split('/').map((x) => x.trim());
    const p = c.split(/[\s,]+/).filter(Boolean).map((x) => (x.endsWith('%') ? num(x) : parseFloat(x) / 255));
    return fromSrgb(p, a ? num(a) : 1);
  }
  m = v.match(/^oklch\((.*)\)$/);
  if (m) {
    const [c, a] = m[1].split('/').map((x) => x.trim());
    const [l, ch, h] = c.split(/\s+/);
    const lch = [num(l), parseFloat(ch), h === undefined || h === 'none' ? NaN : parseFloat(h)];
    return { lab: fromLch([lch[0], lch[1], lch[2] || 0]), lch, alpha: a ? num(a) : 1 };
  }
  m = v.match(/^color-mix\(in (oklab|oklch),(.*)\)$/s);
  if (m) {
    const [one, two] = splitTop(m[2]);
    const part = (s) => {
      const pm = s.match(/^(.*?)\s+([\d.]+%)$/);
      return pm ? { c: parseColor(pm[1], ctx, seen), p: num(pm[2]) } : { c: parseColor(s, ctx, seen), p: null };
    };
    const A = part(one); const B = part(two);
    let p1 = A.p; let p2 = B.p;
    if (p1 === null && p2 === null) { p1 = 0.5; p2 = 0.5; }
    else if (p1 === null) p1 = 1 - p2;
    else if (p2 === null) p2 = 1 - p1;
    const sum = p1 + p2; const mult = Math.min(1, sum);
    p1 /= sum; p2 /= sum;
    const alpha = A.c.alpha * p1 + B.c.alpha * p2;
    if (alpha === 0) return { lab: [0, 0, 0], alpha: 0 };
    if (m[1] === 'oklab') {
      const lab = [0, 1, 2].map((i) => (A.c.lab[i] * A.c.alpha * p1 + B.c.lab[i] * B.c.alpha * p2) / alpha);
      return { lab, alpha: alpha * mult };
    }
    // An oklch() color keeps its stated hue, even at zero chroma (CSS Color 4:
    // only `none` is missing); a converted color's hue is missing when it is
    // achromatic, and takes the other color's.
    const lchOf = (c) => {
      if (c.lch) return [...c.lch];
      const x = toLch(c.lab);
      if (x[1] < 1e-4) x[2] = NaN;
      return x;
    };
    const a1 = lchOf(A.c); const a2 = lchOf(B.c);
    if (Number.isNaN(a1[2])) a1[2] = Number.isNaN(a2[2]) ? 0 : a2[2];
    if (Number.isNaN(a2[2])) a2[2] = a1[2];
    let dh = a2[2] - a1[2];
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    const Lm = (a1[0] * A.c.alpha * p1 + a2[0] * B.c.alpha * p2) / alpha;
    const Cm = (a1[1] * A.c.alpha * p1 + a2[1] * B.c.alpha * p2) / alpha;
    const Hm = a1[2] + dh * p2;
    return { lab: fromLch([Lm, Cm, Hm]), alpha: alpha * mult };
  }
  throw new Error('can’t read color: ' + v);
}
function colorDistance(h1, h2) {
  const a = h1.slice(1).match(/../g).map((x) => parseInt(x, 16));
  const b = h2.slice(1).match(/../g).map((x) => parseInt(x, 16));
  if (a[3] === 0 && b[3] === 0) return 0; // fully transparent is one color
  return Math.max(...a.map((x, i) => Math.abs(x - b[i])));
}
function suggestColor(figmaHex, codeValue) {
  if (codeValue.trim().startsWith('#')) return figmaHex.endsWith('ff') ? figmaHex.slice(0, 7) : figmaHex;
  const c = parseHex(figmaHex);
  const [l, ch, h] = toLch(c.lab);
  const a = c.alpha < 1 ? ` / ${Math.round(c.alpha * 100)}%` : '';
  return `oklch(${l.toFixed(3)} ${ch.toFixed(3)} ${h.toFixed(1)}${a})`;
}

// ------------------------------------------------------------ number math
function evalNumber(v, ctx, seen = new Set()) {
  let s = v.trim();
  s = s.replace(/var\(--([\w-]+)\)/g, (_, n) => {
    if (seen.has(n)) throw new Error('cycle at ' + n);
    const r = raw(n, ctx);
    if (!r) throw new Error('unknown token --' + n);
    return String(evalNumber(r.value, ctx, new Set([...seen, n])));
  });
  s = s.replace(/([\d.]+)rem/g, (_, x) => String(parseFloat(x) * 16)).replace(/([\d.]+)px/g, '$1');
  s = s.replace(/\bcalc\(/g, '(').replace(/\bmax\(/g, 'Math.max(').replace(/\bmin\(/g, 'Math.min(');
  if (!/^[\d.\s+\-*/(),Mathmaxin]*$/.test(s)) throw new Error('can’t read number: ' + v);
  return Function('"use strict"; return (' + s + ');')();
}
const family = (v) => v.split(',')[0].trim().replace(/^['"]|['"]$/g, '').replace(/ Variable$/, '');

// --colors: print every color token's resolved value in both themes (for
// checking this file's color math against a browser).
if (args.includes('--colors')) {
  const names = [...new Set([...layers.base, ...layers.dark].filter((d) => !isTheme(d)).map((d) => d.name))];
  const out = {};
  for (const ctx of ['light', 'dark']) {
    out[ctx] = {};
    for (const n of names) { try { out[ctx][n] = hex8(parseColor(raw(n, ctx).value, ctx)); } catch { /* not a color */ } }
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}

// ---------------------------------------------------------------- compare
const report = { known: [], values: [], aliases: [], figmaOnly: [], figmaOnlyByDesign: [], codeOnly: [], effects: [], texts: [], docs: [], errors: [] };
const figmaNames = new Set(dump.variables.map((v) => v.n));

for (const fv of dump.variables) {
  const modes = MODE_CTX[fv.c];
  if (!modes) { report.errors.push(`${fv.c}: a collection this check doesn't know`); continue; }
  const code = fv.code.trim();
  const ref = code.match(/^var\(--([\w-]+)\)$/);
  if (!code) { report.figmaOnlyByDesign.push(`${fv.c} · ${fv.n}`); continue; }
  for (const [mode, ctx] of Object.entries(modes)) {
    const fval = fv.v[mode];
    if (fval === undefined) continue;
    const where = `${fv.c} · ${mode} · ${fv.n}`;
    let codeRaw;
    if (ref) {
      const r = raw(ref[1], ctx);
      if (!r) { report.figmaOnly.push(`${where} (code syntax ${code}, but --${ref[1]} isn't in src/index.css)`); break; }
      codeRaw = r.value;
    } else codeRaw = code; // an expression, e.g. calc(var(--spacing) * 2.5)
    try {
      // Aliases by name.
      const codeAlias = codeRaw.match(/^var\(--([\w-]+)\)$/);
      if (typeof fval === 'string' && fval.startsWith('@')) {
        const target = fval.slice(1);
        if ((!codeAlias || codeAlias[1] !== target) && !(ref && ref[1] === target)) {
          report.aliases.push({ where, figma: `alias of ${target}`, code: codeRaw, fix: `--${ref ? ref[1] : fv.n}: var(--${target})` });
        }
        continue; // the target is compared on its own
      }
      if (fv.t === 'COLOR') {
        const got = hex8(parseColor(codeRaw, ctx));
        if (colorDistance(got, fval) > 3) {
          report.values.push({ where, figma: fval, code: `${got} (${codeRaw})`, fix: codeRaw.includes('color-mix') ? `a mix, which Figma stores as a plain value: if its inputs agree (they're compared on their own), Figma's copy is stale; set it to ${got} in Figma` : `--${ref ? ref[1] : fv.n}: ${suggestColor(fval, codeRaw)}` });
        }
      } else if (fv.t === 'FLOAT') {
        let got = evalNumber(codeRaw, ctx);
        if (Math.abs(got - fval) > 0.01 && got <= 1 && Math.abs(got * 100 - fval) < 0.01) got = fval; // Figma opacity is a percentage
        if (Math.abs(got - fval) > 0.01 && KNOWN[where]) report.known.push(`${where}: Figma ${fval}, code ${got} (${KNOWN[where]})`);
        else if (Math.abs(got - fval) > 0.01) report.values.push({ where, figma: fval, code: `${got} (${codeRaw})`, fix: `--${ref ? ref[1] : fv.n}: ${fval}px` });
      } else if (fv.t === 'STRING') {
        let str = codeRaw;
        for (let i = 0, m; i < 10 && (m = str.match(/^var\(--([\w-]+)\)$/)); i++) {
          const r = raw(m[1], ctx);
          if (!r) throw new Error('unknown token --' + m[1]);
          str = r.value;
        }
        const got = family(str);
        if (got !== fval) report.values.push({ where, figma: fval, code: `${got} (${codeRaw})`, fix: `--${ref ? ref[1] : fv.n}: '${fval}', …` });
      }
    } catch (e) {
      report.errors.push(`${where}: ${e.message}`);
    }
  }
}

// Code tokens Figma doesn't have. Candidates: the primitive and semantic
// color blocks, the type scale, the size steps and the grid.
const figmaCode = new Set(dump.variables.map((v) => (v.code.match(/^var\(--([\w-]+)\)$/) || [])[1]).filter(Boolean));
const candidates = new Set();
for (const d of [...layers.dark, ...layers.phone, ...layers.min600, ...layers.steps, ...layers.base.filter((x) => !isTheme(x) || /^(fs-|font-sans$|font-display$|spacing$)/.test(x.name))]) {
  candidates.add(d.name);
}
for (const n of [...candidates].sort()) {
  if (figmaCode.has(n) || figmaNames.has(n) || CODE_ONLY.has(n) || n.startsWith('elevation-')) continue;
  report.codeOnly.push(n);
}

// Effect styles: the elevation tokens, per mode.
function parseShadows(v) {
  return splitTop(v).map((s) => {
    const cm = s.match(/(rgba?\([^)]*\)|#[0-9a-f]+|oklch\([^)]*\))\s*$/i);
    const color = cm ? hex8(parseColor(cm[1], 'light')) : '#000000ff';
    const n = (cm ? s.slice(0, cm.index) : s).trim().split(/\s+/).map((x) => parseFloat(x));
    return ['DROP_SHADOW', n[0] || 0, n[1] || 0, n[2] || 0, n[3] || 0, color];
  });
}
const effects = new Map(dump.effects.map((e) => [e.n, e.e]));
const elevation = [...new Set(layers.base.concat(layers.dark).map((d) => d.name).filter((n) => n.startsWith('elevation-')))];
for (const n of elevation.sort()) {
  const light = parseShadows(raw(n, 'light').value);
  const dark = parseShadows(raw(n, 'dark').value);
  const same = JSON.stringify(light) === JSON.stringify(dark);
  const want = same ? [[n, light]] : [[`Light/${n}`, light], [`Dark/${n}`, dark]];
  for (const [style, list] of want) {
    const got = effects.get(style);
    if (!got) { report.effects.push({ where: style, figma: 'missing', code: JSON.stringify(list) }); continue; }
    const diff = got.length !== list.length || got.some((e, i) => e.slice(1, 5).some((x, j) => Math.abs(x - list[i][j + 1]) > 0.01) || colorDistance(e[5], list[i][5]) > 3);
    if (diff) report.effects.push({ where: style, figma: JSON.stringify(got), code: JSON.stringify(list) });
  }
}

// Text styles: one per --text-* role.
const texts = new Map(dump.texts.map((t) => [t.n.replace(/^art\//, ''), t]));
for (const d of layers.base.filter((x) => isTheme(x) && /^text-[\w-]+$/.test(x.name) && !x.name.includes('--'))) {
  const t = texts.get(d.name);
  if (!t) { report.texts.push({ where: d.name, figma: 'missing', code: d.value }); continue; }
  try {
    const size = evalNumber(d.value, 'light');
    if (Math.abs(size - t.size) > 0.05) report.texts.push({ where: d.name, figma: `${t.size}px`, code: `${size}px (${d.value})` });
    const lh = raw(`${d.name}--line-height`, 'light');
    if (lh && typeof t.lh === 'number' && Math.abs(parseFloat(lh.value) - t.lh) > 0.01) report.texts.push({ where: `${d.name} line height`, figma: t.lh.toFixed(2), code: lh.value });
  } catch (e) { report.errors.push(`${d.name}: ${e.message}`); }
}

// docs/design-tokens.md: every variable named, alone or in a family.
const ticked = [...doc.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const families = ticked.filter((t) => t.endsWith('-*') || t.endsWith('*')).map((t) => t.replace(/\*$/, ''));
const commonPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); };
const ranges = [...doc.matchAll(/`([\w-]+)`\s*…\s*`([\w-]+)`/g)].map((m) => commonPrefix(m[1], m[2])).filter((p) => p.length > 2);
const named = new Set(ticked);
for (const fv of dump.variables) {
  if (fv.c === 'Typeface') continue; // listed by role in the doc's prose
  const n = fv.n;
  if (named.has(n) || families.some((f) => n.startsWith(f)) || ranges.some((r) => n.startsWith(r))) continue;
  report.docs.push(n);
}

// ----------------------------------------------------------------- output
const problems = report.values.length + report.aliases.length + report.figmaOnly.length + report.codeOnly.length + report.effects.length + report.texts.length + report.docs.length + report.errors.length;
if (asJson) {
  console.log(JSON.stringify({ problems, ...report }, null, 2));
} else {
  const line = (x) => `  - ${x.where}: Figma ${x.figma}; code ${x.code}${x.fix ? `\n      fix in code: ${x.fix}` : ''}`;
  const out = [];
  out.push(`Figma ⇄ code check, tokens: ${dump.variables.length} variables, ${dump.effects.length} effect styles, ${dump.texts.length} text styles.`);
  if (report.values.length) out.push(`\nValues that differ (${report.values.length}):`, ...report.values.map(line));
  if (report.aliases.length) out.push(`\nAliases that differ (${report.aliases.length}):`, ...report.aliases.map(line));
  if (report.figmaOnly.length) out.push(`\nIn Figma, not in code (${report.figmaOnly.length}):`, ...report.figmaOnly.map((x) => `  - ${x}`));
  if (report.codeOnly.length) out.push(`\nIn code, not in Figma (${report.codeOnly.length}):`, ...report.codeOnly.map((x) => `  - --${x}`));
  if (report.effects.length) out.push(`\nEffect styles that differ (${report.effects.length}):`, ...report.effects.map(line));
  if (report.texts.length) out.push(`\nText styles that differ (${report.texts.length}):`, ...report.texts.map(line));
  if (report.docs.length) out.push(`\nNot named in docs/design-tokens.md (${report.docs.length}):`, ...report.docs.map((x) => `  - ${x}`));
  if (report.errors.length) out.push(`\nCouldn't compare (${report.errors.length}):`, ...report.errors.map((x) => `  - ${x}`));
  if (report.known.length) out.push(`\nKnown, documented differences (${report.known.length}):`, ...report.known.map((x) => `  - ${x}`));
  out.push(`\nFigma-only by design (no code syntax: translucent tokens, Typeface weights): ${report.figmaOnlyByDesign.length}.`);
  out.push(problems ? `\n${problems} difference(s).` : '\nNo differences: Figma and code agree.');
  console.log(out.join('\n'));
}
process.exit(problems ? 1 : 0);
