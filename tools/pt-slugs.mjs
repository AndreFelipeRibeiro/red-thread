// Writes src/share-card/pt-slugs.ts: the Portuguese address of every guide,
// title and character (Notion "Findability 6"; Andre, 2026-11-24, chose
// Portuguese words: /pt/guias/antes-de-…, /pt/titulos/homem-de-ferro).
//
// Run it when a title, character or guide is ADDED. It keeps every slug
// already in the file, so a later rename never breaks a link someone shared
// or a search engine indexed; only new ids get a slug, from their Portuguese
// name (a guide's short name). To change an existing slug on purpose, edit
// the file by hand and add a redirect.
//
//   node tools/pt-slugs.mjs          write the file
//   node tools/pt-slugs.mjs --check  exit 1 if an id has no slug (qa uses it)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src/share-card/pt-slugs.ts');

async function load() {
  const window = { MCU_LOCALES: {} };
  for (const file of ['src/data/data.ts', 'src/data/guides.ts']) {
    const { code } = await transformWithOxc(readFileSync(join(root, file), 'utf8'), file, { lang: 'ts' });
    vm.runInNewContext(code.replace(/^export \{\};?\s*$/m, ''), { window, console });
  }
  vm.runInNewContext(readFileSync(join(root, 'locales/pt-BR.js'), 'utf8'), { window });
  return { titles: window.TITLES, characters: window.CHARACTERS, guides: window.GUIDES, pt: window.MCU_LOCALES['pt-BR'] };
}

/** "Seu Amigão da Vizinhança: Homem-Aranha" → "seu-amigao-da-vizinhanca-homem-aranha". */
export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
}

function existing() {
  if (!existsSync(OUT)) return { title: {}, guide: {}, char: {} };
  const m = /export const PT_SLUGS[^=]*=\s*(\{[\s\S]*\});/.exec(readFileSync(OUT, 'utf8'));
  return m ? JSON.parse(m[1]) : { title: {}, guide: {}, char: {} };
}

const { titles, characters, guides, pt } = await load();
const names = {
  title: titles.map((t) => [t.id, (pt.titles && pt.titles[t.id]) || t.title, String(t.year || '')]),
  char: Object.keys(characters).map((id) => [id, (pt.characters && pt.characters[id]) || characters[id].name, id]),
  guide: guides.map((g) => [g.id, (g.short && g.short['pt-BR']) || g.name['pt-BR'] || g.name.en, g.id]),
};
const old = existing();
const out = { title: {}, guide: {}, char: {} };
const missing = [];
for (const kind of ['title', 'guide', 'char']) {
  const used = new Set(Object.values(old[kind] || {}));
  for (const [id, name, extra] of names[kind]) {
    if (old[kind] && old[kind][id]) { out[kind][id] = old[kind][id]; continue; }
    missing.push(kind + '/' + id);
    let s = slugify(name) || id;
    // Same name twice (two Peter Parkers; a series' seasons): add the year, then the id.
    if (used.has(s)) s = slugify(name + ' ' + extra);
    if (used.has(s)) s = slugify(name + ' ' + id);
    used.add(s);
    out[kind][id] = s;
  }
}

if (process.argv.includes('--check')) {
  if (missing.length) { console.error('pt-slugs: no Portuguese address yet for ' + missing.join(', ') + '. Run node tools/pt-slugs.mjs.'); process.exit(1); }
  console.log('pt-slugs: every guide, title and character has a Portuguese address');
  process.exit(0);
}

writeFileSync(OUT, `// The Portuguese address of every guide, title and character (Notion
// "Findability 6"): /pt/guias/<slug>, /pt/titulos/<slug>,
// /pt/personagens/<slug>. Written by tools/pt-slugs.mjs from the Portuguese
// names, then frozen: a slug never changes when a name does, so shared and
// indexed links keep working. New ids get one when the tool is run again.
// Plain data: the app, the build and the QA checks import it; middleware.ts
// doesn't need it (each page's file is named by its slug).
import type { ThingKind } from './addresses';

export const PT_SLUGS: Record<ThingKind, Record<string, string>> = ${JSON.stringify(out, null, 2)};
`);
console.log(`pt-slugs: ${missing.length} new, ${Object.values(out).reduce((n, m) => n + Object.keys(m).length, 0)} in all`);
