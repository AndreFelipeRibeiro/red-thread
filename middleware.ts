// Every guide, title and character at its own address (Notion "Findability
// 3", option B1; before it, Notion V4 Tasks "Share 3/3").
//
// Chat apps, search engines and AI assistants read a page without running its
// scripts. The build writes, for each title, character and guide, a copy of
// the built index.html with that page's preview tags, <title>, canonical and
// readable text (scripts/og-previews.js); this Vercel Routing Middleware
// serves the copy at the page's address. The copy differs from index.html only
// in what crawlers read, so the app behaves exactly as on the home page.
//
//   /guides/<id>, /titles/<id>, /characters/<id>
//       → that page's copy. An id with no page (unknown, removed, misspelt)
//         gets the app's home page with a 404, so a visitor still lands in the
//         app and a search engine drops the address.
//   /?guide=<id>, /?title=<id>, /?char=<id> (every link shared before)
//       → a permanent redirect to the page's address, the rest of the query
//         kept: /?title=endgame&guide=before-doomsday&view=list becomes
//         /titles/endgame?guide=before-doomsday&view=list. An id with no page
//         passes through to the home page untouched, as it always has.
//   Anything else passes through untouched.
//
// The path takes the first of title, guide and character, the order the app
// gives them precedence (a title link may also pin a character, and then it
// is the title that was shared). This table and that order are also in
// src/share-card/addresses.ts, which the app and the build use; Vercel runs
// this file on its own, and qa/test-addresses.js checks the two agree.
// Configured here and in vercel.json only: dashboard settings apply to every
// branch, including main (docs/V4-PLAN.md).

export const config = { matcher: ['/', '/titles/:id', '/guides/:id', '/characters/:id'] };

// The project's own *.vercel.app production address, kept by Vercel through
// the project rename (red-thread.vercel.app belongs to someone else), sends
// visitors to the public one. vercel.json redirects every path on it; this
// covers the pages again in case Vercel runs middleware first, so a shared
// link on the old address still lands on redthread.tv.
const PUBLIC = 'https://redthread.tv';
const OLD_HOSTS = ['mcu-connections.vercel.app'];

const KINDS = ['title', 'guide', 'char'] as const;
type Kind = (typeof KINDS)[number];
const SEGMENT: Record<Kind, string> = { title: 'titles', guide: 'guides', char: 'characters' };
const KIND_OF: Record<string, Kind> = { titles: 'title', guides: 'guide', characters: 'char' };
const ID = /^[a-z0-9-]{1,80}$/;
const PATH = /^\/(titles|guides|characters)\/([^/]+)\/?$/;

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  // As for index.html: always revalidated, so a new deploy shows at once.
  'cache-control': 'public, max-age=0, must-revalidate',
};

const pageFile = (origin: string, kind: Kind, id: string) => new URL(`/og/${kind}/${id}.html`, origin);

// Only production is for search engines (Notion "Findability 1"): staging and
// every preview deployment answer noindex, so their copies never compete with
// redthread.tv. vercel.json says the same for every other file.
const headersFor = (host: string): Record<string, string> =>
  (host === 'redthread.tv' ? HTML_HEADERS : { ...HTML_HEADERS, 'x-robots-tag': 'noindex' });

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (OLD_HOSTS.includes(url.hostname)) return Response.redirect(PUBLIC + url.pathname + url.search, 308);

  const path = PATH.exec(url.pathname);
  if (path) {
    const kind = KIND_OF[path[1]];
    const id = path[2];
    if (ID.test(id)) {
      const page = await fetch(pageFile(url.origin, kind, id));
      if (page.ok) return new Response(page.body, { status: 200, headers: headersFor(url.hostname) });
    }
    const home = await fetch(new URL('/index.html', url.origin));
    if (!home.ok) return undefined;
    return new Response(home.body, { status: 404, headers: headersFor(url.hostname) });
  }

  if (url.pathname !== '/') return undefined;
  for (const kind of KINDS) {
    const id = url.searchParams.get(kind);
    if (id === null) continue;
    if (!ID.test(id)) return undefined;
    const page = await fetch(pageFile(url.origin, kind, id), { method: 'HEAD' });
    if (!page.ok) return undefined;
    const rest = new URLSearchParams(url.searchParams);
    rest.delete(kind);
    const query = rest.toString().replace(/%2C/gi, ',');
    return Response.redirect(`${url.origin}/${SEGMENT[kind]}/${id}${query ? '?' + query : ''}`, 308);
  }
  return undefined;
}
