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
// its own copy of the table, because Vercel runs it on its own; qa/test-addresses.js
// checks that the two agree.

export type ThingKind = 'title' | 'guide' | 'char';

/** In the order a link's path takes them. */
export const THING_KINDS: readonly ThingKind[] = ['title', 'guide', 'char'];

/** The path segment for each kind. */
export const SEGMENT: Record<ThingKind, string> = { title: 'titles', guide: 'guides', char: 'characters' };

/** What an id may look like; anything else stays in the query, as before. */
export const THING_ID = /^[a-z0-9-]{1,80}$/;

const PATH = /^\/(titles|guides|characters)\/([^/]+)\/?$/;
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
 *  its key, so code that reads ?guide= reads /guides/<id> the same way. */
export function stateParams(pathname: string, search: string): URLSearchParams {
  const q = new URLSearchParams(search);
  const thing = parseThingPath(pathname);
  if (thing) q.set(thing.kind, thing.id);
  return q;
}

/** The address for a state given as one query: the first thing (title,
 *  guide, character) becomes the path, the rest stays in the query. */
export function addressFor(params: URLSearchParams): { pathname: string; search: URLSearchParams } {
  const rest = new URLSearchParams(params);
  for (const kind of THING_KINDS) {
    const id = rest.get(kind);
    if (id === null || !THING_ID.test(id)) continue;
    rest.delete(kind);
    return { pathname: thingPath(kind, id), search: rest };
  }
  return { pathname: '/', search: rest };
}
