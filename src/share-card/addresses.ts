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

export type ThingKind = 'title' | 'guide' | 'char';

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

/** The index an address's path names ('guides', 'titles', 'characters'), or null. */
export function parseIndexPath(pathname: string): string | null {
  const m = INDEX.exec(pathname);
  return m ? m[1] : null;
}
const KIND_OF: Record<string, ThingKind> = { titles: 'title', guides: 'guide', characters: 'char' };

/** /guides/before-doomsday for ('guide', 'before-doomsday'). */
export function thingPath(kind: ThingKind, id: string): string {
  return `/${SEGMENT[kind]}/${id}`;
}

/** The thing an address's path names, or null for any other path. */
export function parseThingPath(pathname: string): { kind: ThingKind; id: string } | null {
  const m = PATH.exec(pathname);
  if (!m || !THING_ID.test(m[2])) return null;
  return { kind: KIND_OF[m[1]], id: m[2] };
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
export function addressFor(params: URLSearchParams): { pathname: string; search: URLSearchParams } {
  const rest = new URLSearchParams(params);
  for (const kind of THING_KINDS) {
    const id = rest.get(kind);
    if (id === null || !THING_ID.test(id)) continue;
    rest.delete(kind);
    return { pathname: thingPath(kind, id), search: rest };
  }
  // No thing: the Guides tab and the Titles list have index addresses.
  for (const segment of Object.keys(INDEX_VIEW)) {
    if (!INDEX_VIEW[segment] || rest.get('view') !== INDEX_VIEW[segment]) continue;
    rest.delete('view');
    return { pathname: '/' + segment, search: rest };
  }
  return { pathname: '/', search: rest };
}
