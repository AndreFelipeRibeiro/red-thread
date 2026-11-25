// Every guide, title and character has an address of its own (Notion
// "Findability 3", option B1): /guides/<id>, /titles/<id>, /characters/<id>.
// The path names the thing a link is about; everything else the address
// carries (the view, the sort, the filters, a second thing) stays in the query
// under the keys app.tsx's readURLState already knows. So
//   /?guide=before-doomsday&view=list      → /guides/before-doomsday?view=list
//   /?title=endgame&guide=before-doomsday  → /titles/endgame?guide=before-doomsday
// When a link carries more than one thing, the path takes them in the order
// the link previews always have (title, then guide, then character), so a
// shared link still previews as the same card.
//
// Plain functions of strings, no window: the app, the build
// (scripts/og-previews.js) and the QA checks all use them. middleware.ts keeps
// its own copy of the table, because Vercel runs it on its own; qa/test-previews.js
// checks that the two agree.
//
// The index addresses (Notion "Findability 4") name a whole section:
//   /guides  is the Guides tab (?view=guides), both ways;
//   /titles  is the Titles list (?view=list), both ways where the list is
//            asked for (on phones it is the default view, so the address
//            there stays /);
//   /characters  opens the home view; the app has no characters section, so
//            nothing in the app writes it. Its HTML lists every character.
// A thing's path wins over an index: /titles/endgame?view=list.
//
// Portuguese (Notion "Findability 6"; Andre chose Portuguese words,
// 2026-11-24): the same addresses under /pt, with Portuguese segments and
// slugs: /pt, /pt/guias, /pt/titulos/homem-de-ferro,
// /pt/personagens/peter-parker. The slugs are frozen in pt-slugs.ts. Reading
// an address takes either language; writing one takes the language to write
// it in (the app passes the one on screen).

import { PT_SLUGS } from './pt-slugs';

export type ThingKind = 'title' | 'guide' | 'char';
/** The languages with addresses of their own. English has no prefix. */
export type AddressLang = 'en' | 'pt-BR';

/** In the order a link's path takes them. */
export const THING_KINDS: readonly ThingKind[] = ['title', 'guide', 'char'];

/** The path segment for each kind. */
export const SEGMENT: Record<ThingKind, string> = { title: 'titles', guide: 'guides', char: 'characters' };

/** What an id may look like; anything else stays in the query, as before. */
export const THING_ID = /^[a-z0-9-]{1,80}$/;

const PATH = /^\/(titles|guides|characters)\/([^/]+)\/?$/;

/** The index addresses, by path segment, and the view each one opens. */
export const INDEX_VIEW: Record<string, string | null> = { guides: 'guides', titles: 'list', characters: null };
const INDEX = /^\/(titles|guides|characters)\/?$/;

/** The Portuguese path segment for each English one. */
export const PT_SEGMENT: Record<string, string> = { titles: 'titulos', guides: 'guias', characters: 'personagens' };
const EN_SEGMENT: Record<string, string> = { titulos: 'titles', guias: 'guides', personagens: 'characters' };
const PT_PATH = /^\/pt\/(titulos|guias|personagens)\/([^/]+)\/?$/;
const PT_INDEX = /^\/pt\/(titulos|guias|personagens)\/?$/;
/** Slug → id, per kind, from the frozen table. */
const PT_ID: Record<ThingKind, Record<string, string>> = { title: {}, guide: {}, char: {} };
(Object.keys(PT_SLUGS) as ThingKind[]).forEach((kind) => {
  Object.entries(PT_SLUGS[kind]).forEach(([id, slug]) => { PT_ID[kind][slug] = id; });
});

/** The language an address is in: 'pt-BR' under /pt, else 'en'. */
export function langOfPath(pathname: string): AddressLang {
  return /^\/pt(\/|$)/.test(pathname) ? 'pt-BR' : 'en';
}

/** The home page in a language: / or /pt. */
export function homePath(lang: AddressLang = 'en'): string {
  return lang === 'pt-BR' ? '/pt' : '/';
}

/** An index page in a language: /guides, /pt/guias. */
export function indexPath(segment: string, lang: AddressLang = 'en'): string {
  return lang === 'pt-BR' ? `/pt/${PT_SEGMENT[segment]}` : `/${segment}`;
}

/** A Portuguese slug for an id (the id itself if the table has none yet). */
export function ptSlug(kind: ThingKind, id: string): string {
  return (PT_SLUGS[kind] && PT_SLUGS[kind][id]) || id;
}

/** The index an address's path names ('guides', 'titles', 'characters'), or null. */
export function parseIndexPath(pathname: string): string | null {
  const m = INDEX.exec(pathname);
  if (m) return m[1];
  const p = PT_INDEX.exec(pathname);
  return p ? EN_SEGMENT[p[1]] : null;
}
const KIND_OF: Record<string, ThingKind> = { titles: 'title', guides: 'guide', characters: 'char' };

/** /guides/before-doomsday for ('guide', 'before-doomsday'). */
export function thingPath(kind: ThingKind, id: string, lang: AddressLang = 'en'): string {
  if (lang === 'pt-BR') return `/pt/${PT_SEGMENT[SEGMENT[kind]]}/${ptSlug(kind, id)}`;
  return `/${SEGMENT[kind]}/${id}`;
}

/** The thing an address's path names, or null for any other path. */
export function parseThingPath(pathname: string): { kind: ThingKind; id: string } | null {
  const m = PATH.exec(pathname);
  if (m) return THING_ID.test(m[2]) ? { kind: KIND_OF[m[1]], id: m[2] } : null;
  const p = PT_PATH.exec(pathname);
  if (!p || !THING_ID.test(p[2])) return null;
  const kind = KIND_OF[EN_SEGMENT[p[1]]];
  const id = PT_ID[kind][p[2]];
  return id ? { kind, id } : null;
}

/** An address's whole state as one query: the path's thing put back under
 *  its key (and an index's view under view), so code that reads ?guide=
 *  reads /guides/<id> the same way. */
export function stateParams(pathname: string, search: string): URLSearchParams {
  const q = new URLSearchParams(search);
  const thing = parseThingPath(pathname);
  if (thing) q.set(thing.kind, thing.id);
  const index = parseIndexPath(pathname);
  const view = index && INDEX_VIEW[index];
  if (view) q.set('view', view);
  return q;
}

/** The address for a state given as one query: the first thing (title,
 *  guide, character) becomes the path, else the view's index (/guides,
 *  /titles); the rest stays in the query. */
export function addressFor(params: URLSearchParams, lang: AddressLang = 'en'): { pathname: string; search: URLSearchParams } {
  const rest = new URLSearchParams(params);
  for (const kind of THING_KINDS) {
    const id = rest.get(kind);
    if (id === null || !THING_ID.test(id)) continue;
    rest.delete(kind);
    return { pathname: thingPath(kind, id, lang), search: rest };
  }
  // No thing: the Guides tab and the Titles list have index addresses.
  for (const segment of Object.keys(INDEX_VIEW)) {
    if (!INDEX_VIEW[segment] || rest.get('view') !== INDEX_VIEW[segment]) continue;
    rest.delete('view');
    return { pathname: indexPath(segment, lang), search: rest };
  }
  return { pathname: homePath(lang), search: rest };
}
