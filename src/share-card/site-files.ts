// robots.txt and sitemap.xml (Notion "Findability 1") and llms.txt (Notion
// "Findability 7"), written by the build next to the pages they list
// (scripts/og-previews.js), so they never go stale.
//
// - robots.txt lets everyone crawl everything, and names the search and AI
//   crawlers explicitly, so nobody has to guess whether "*" covers them.
// - llms.txt and llms-full.txt (Notion "Findability 7", the llmstxt.org
//   format): what Red Thread is, then every guide, title and character at its
//   own address; the full file adds every guide's stops and their reasons.
//   No major assistant has said it reads them, so they are a cheap bet beside
//   the pages themselves, which are the real fix.
// - sitemap.xml lists the home page and every guide, title and character at
//   its own address (src/share-card/addresses.ts; Findability 3), never the
//   old ?guide= links, which redirect. A guide's lastmod is its `reviewed`
//   date; titles and characters have no date worth claiming, so they carry
//   none rather than a made-up one.
// Plain data in, text out.
import type { Title } from '../types/catalog';
import { makeTr, type Catalog, type LocaleTables } from './previews';
import { thingPath, type ThingKind } from './addresses';

/** The crawlers named in robots.txt: search first, then AI assistants'. */
export const NAMED_CRAWLERS = [
  'Googlebot', 'Bingbot', 'Applebot', 'DuckDuckBot',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
];

export function robotsTxt(site: string): string {
  return [
    '# Red Thread (https://redthread.tv): every page may be crawled, by search',
    '# engines and AI assistants alike. Written by the build.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    ...NAMED_CRAWLERS.map((ua) => 'User-agent: ' + ua),
    'Allow: /',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
    `# A summary for AI assistants: ${site}/llms.txt (every guide's stops: ${site}/llms-full.txt)`,
    '',
  ].join('\n');
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The pages the build wrote, as `kind/id` keys; the sitemap lists exactly
 *  those, so it never points at an address that 404s. */
export function sitemapXml(site: string, cat: Catalog, pages: Iterable<string>): string {
  const reviewed = new Map(cat.guides.map((g) => [g.id, g.reviewed]));
  const order: ThingKind[] = ['guide', 'title', 'char'];
  const keys = [...pages].map((k) => { const i = k.indexOf('/'); return { kind: k.slice(0, i) as ThingKind, id: k.slice(i + 1) }; })
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const url = (loc: string, lastmod?: string) =>
    `  <url><loc>${xml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(site + '/'),
    ...keys.map(({ kind, id }) => url(site + thingPath(kind, id), kind === 'guide' ? reviewed.get(id) : undefined)),
    '</urlset>',
    '',
  ].join('\n');
}

/** What Red Thread is, for assistants: plain facts about the app, no claims. */
const ABOUT = [
  'Red Thread is a free web app that maps how every Marvel Cinematic Universe (MCU) film and series connects through the characters they share.',
  'Each title is a card on a canvas (Connections), and the lines between cards are characters, so you can follow any character across the titles they appear in, in release or story order.',
  'It has curated watch guides (what to watch before an upcoming release such as Avengers: Doomsday, and orders for sagas, characters and teams), tracks what you have seen and your watchlist (synced when you sign in), and works in English and Brazilian Portuguese.',
];

interface MdHelpers { titleName: (t: Title) => string; charName: (id: string) => string; kind: (t: Title) => string; hm: (m: number) => string }
function helpers(cat: Catalog, loc: LocaleTables): MdHelpers {
  const tr = makeTr(loc);
  return {
    titleName: (t) => (loc.titles && loc.titles[t.id]) || t.title,
    charName: (id) => (loc.characters && loc.characters[id]) || (cat.characters[id] ? cat.characters[id].name : id),
    kind: (t) => tr(t.type === 'film' ? 'type.film.one' : 'type.series.one').toLowerCase(),
    hm: (min) => {
      const h = Math.floor(min / 60), m = min % 60;
      return h ? (m ? tr('runtime.hm', { h, m }) : tr('runtime.h', { h })) : tr('runtime.m', { m });
    },
  };
}

/** `kind/id` keys of the pages the build wrote, grouped by kind in order. */
const pagesOf = (pages: Iterable<string>, kind: ThingKind) =>
  [...pages].filter((k) => k.startsWith(kind + '/')).map((k) => k.slice(kind.length + 1));

export function llmsTxt(site: string, cat: Catalog, loc: LocaleTables, pages: Iterable<string>): string {
  const h = helpers(cat, loc);
  const list = [...pages];
  const byId = new Map(cat.titles.map((t) => [t.id, t]));
  const guides = pagesOf(list, 'guide').map((id) => cat.guides.find((g) => g.id === id)!).filter(Boolean);
  const titles = pagesOf(list, 'title').map((id) => byId.get(id)!).filter(Boolean)
    .sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
  const chars = pagesOf(list, 'char').sort((a, b) => h.charName(a).localeCompare(h.charName(b)));
  return [
    '# Red Thread',
    '',
    '> ' + ABOUT[0],
    '',
    ...ABOUT.slice(1),
    '',
    `Every guide, title and character has its own page; each page's HTML carries its text. Home: ${site}/`,
    '',
    '## Guides',
    '',
    ...guides.map((g) => `- [${g.name.en}](${site}${thingPath('guide', g.id)}): ${g.blurb.en}`),
    '',
    '## Titles, in release order',
    '',
    ...titles.map((t) => `- [${h.titleName(t)} (${t.year})](${site}${thingPath('title', t.id)}): Phase ${t.phase} ${h.kind(t)}`),
    '',
    '## Characters',
    '',
    ...chars.map((id) => `- [${h.charName(id)}](${site}${thingPath('char', id)})`),
    '',
    '## Optional',
    '',
    `- [Every guide's stops, in order, with why each one matters](${site}/llms-full.txt)`,
    '',
  ].join('\n');
}

export function llmsFullTxt(site: string, cat: Catalog, loc: LocaleTables, pages: Iterable<string>): string {
  const h = helpers(cat, loc);
  const byId = new Map(cat.titles.map((t) => [t.id, t]));
  const guides = pagesOf(pages, 'guide').map((id) => cat.guides.find((g) => g.id === id)!).filter(Boolean);
  const out = ['# Red Thread: every watch guide', '', '> ' + ABOUT[0], ''];
  for (const g of guides) {
    const stops = g.stops.map((s) => ({ s, t: byId.get(s.id)! }));
    const minutes = stops.every(({ t }) => t.runtime) ? stops.reduce((n, { t }) => n + (t.runtime || 0), 0) : 0;
    out.push(`## ${g.name.en}`, '', `${site}${thingPath('guide', g.id)}`, '', g.blurb.en, '',
      `${stops.length} titles${minutes ? `, about ${h.hm(minutes)}` : ''}. Updated ${g.reviewed}.`, '');
    stops.forEach(({ s, t }, i) => {
      const extra = s.weight === 'essential' ? '' : ' (optional)';
      out.push(`${i + 1}. ${h.titleName(t)} (${t.year}), ${h.kind(t)}${t.runtime ? ', ' + h.hm(t.runtime) : ''}${extra}: ${s.why.en}`);
    });
    out.push('');
  }
  return out.join('\n');
}
