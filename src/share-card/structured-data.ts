// Structured data (JSON-LD) for every page the build writes (Notion
// "Findability 5"): what search engines and assistants read to know that a
// page is a film, a series, an ordered watch guide or a list, without
// guessing from the text. It says only what the page's own text says
// (page-text.ts), from the same catalog.
//
//   home          WebSite, Organization and WebApplication (free, in a browser)
//   guide         an ordered ItemList of its stops, each a Movie or TVSeries
//   title         a Movie or TVSeries with its cast as PerformanceRoles
//   character     an ordered ItemList of their appearances
//   index pages   an ItemList of everything they list
// and every page but home a BreadcrumbList (Home › Guides › the guide).
//
// Left out on purpose: FAQPage (the guides have no questions and answers, and
// Google shows FAQ results only for government and health sites), and the
// Organization's sameAs until Red Thread has profiles elsewhere (Findability
// 10). English, like the rest of each page's HTML.
// Plain data in, JSON objects out; meta.ts puts them in the page.
import type { Guide, Localized, Title } from '../types/catalog';
import { makeTr, type Catalog, type LocaleTables } from './previews';
import { homePath, indexPath, thingPath, type AddressLang } from './addresses';

type Json = Record<string, unknown>;
const CONTEXT = 'https://schema.org';

/** ISO 8601 for a runtime in minutes: PT2H6M. */
const duration = (min: number) => `PT${Math.floor(min / 60) ? Math.floor(min / 60) + 'H' : ''}${min % 60 ? (min % 60) + 'M' : ''}`;

/** `lang` writes the Portuguese pages' data (Notion "Findability 6"): their
 *  addresses, names and Brazil's release days, `inLanguage` pt-BR, and a
 *  title's English name as `alternateName` where Brazil's differs. */
export function structuredData(site: string, cat: Catalog, loc: LocaleTables, lang: AddressLang = 'en'): Map<string, Json> {
  const tr = makeTr(loc);
  const pt = lang === 'pt-BR';
  const L = (o: Localized) => (pt && o['pt-BR']) || o.en;
  const path = (kind: 'title' | 'guide' | 'char', id: string) => thingPath(kind, id, lang);
  const inLanguage = pt ? { inLanguage: 'pt-BR' } : {};
  const app = tr('app.name');
  const titleName = (t: Title) => (loc.titles && loc.titles[t.id]) || t.title;
  const charName = (id: string) => (loc.characters && loc.characters[id]) || (cat.characters[id] ? cat.characters[id].name : id);
  const prime = (id: string) => (cat.characters[id] && cat.characters[id].prime) || id;
  const byId = new Map(cat.titles.map((t) => [t.id, t]));
  const byRelease = [...cat.titles].sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
  const appearances = (id: string) => byRelease.filter((t) => t.cast.some((x) => prime(x) === prime(id)));
  const hasPage = (id: string) => !!cat.characters[id] && appearances(id).length > 0;
  const url = (path: string) => site + path;

  /** A film or series, as a list item or a page of its own. Google's Movie
   *  rich result requires an image on every Movie, a list's items too
   *  (Notion "Findability 16"): the title's own link-preview card, which the
   *  build writes for every title. No director: the catalog has none, and
   *  Google lists it as optional. */
  const work = (t: Title): Json => ({
    '@type': t.type === 'film' ? 'Movie' : 'TVSeries',
    name: `${titleName(t)}`,
    ...(pt && titleName(t) !== t.title ? { alternateName: t.title } : {}),
    url: url(path('title', t.id)),
    image: `${site}/og/title/${t.id}.jpg`,
    datePublished: (loc.releases && loc.releases[t.id]) || t.release,
  });
  const list = (name: string, items: Json[], ordered: boolean): Json => ({
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    ...(ordered ? { itemListOrder: 'https://schema.org/ItemListOrderAscending' } : {}),
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
  });
  const crumbs = (trail: [string, string][]): Json => ({
    '@type': 'BreadcrumbList',
    itemListElement: [[app, homePath(lang)] as [string, string], ...trail].map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url(path) })),
  });
  const page = (...graph: Json[]): Json => ({ '@context': CONTEXT, '@graph': graph });
  const guidesCrumb: [string, string] = [tr('page.guidesName'), indexPath('guides', lang)];
  const titlesCrumb: [string, string] = [tr('page.titlesName'), indexPath('titles', lang)];
  const charsCrumb: [string, string] = [tr('page.charactersName'), indexPath('characters', lang)];

  const out = new Map<string, Json>();

  out.set('home', page(
    { '@type': 'WebSite', '@id': url('/#website'), name: app, url: url(homePath(lang)), description: tr('og.defaultSub'), inLanguage: ['en', 'pt-BR'], publisher: { '@id': url('/#organization') } },
    { '@type': 'Organization', '@id': url('/#organization'), name: app, url: url('/'), logo: url('/apple-touch-icon.png') },
    {
      '@type': 'WebApplication', name: app, url: url(homePath(lang)), description: tr('og.defaultSub'),
      applicationCategory: 'EntertainmentApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript',
      inLanguage: ['en', 'pt-BR'], isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ));

  for (const g of cat.guides as Guide[]) {
    const stops = g.stops.map((s) => byId.get(s.id)).filter((t): t is Title => !!t);
    out.set('guide/' + g.id, page(
      { ...list(L(g.name), stops.map((t) => ({ item: work(t) })), true), description: L(g.blurb), url: url(path('guide', g.id)), dateModified: g.reviewed, ...inLanguage },
      crumbs([guidesCrumb, [L(g.name), path('guide', g.id)]]),
    ));
  }

  for (const t of cat.titles) {
    const synopsis = loc.synopses && loc.synopses[t.id];
    const cast = t.cast.filter(hasPage);
    out.set('title/' + t.id, page(
      {
        ...work(t),
        ...(synopsis ? { description: synopsis } : {}),
        ...(t.type === 'film' && t.runtime ? { duration: duration(t.runtime) } : {}),
        ...(t.type === 'series' && t.episodes ? { numberOfEpisodes: t.episodes } : {}),
        isPartOf: { '@type': 'CreativeWorkSeries', name: 'Marvel Cinematic Universe' },
        ...inLanguage,
        actor: cast.map((id) => ({
          '@type': 'PerformanceRole',
          actor: { '@type': 'Person', name: (t.credits && t.credits[id]) || cat.characters[id].actor },
          characterName: charName(id),
        })),
      },
      crumbs([titlesCrumb, [`${titleName(t)} (${t.year})`, path('title', t.id)]]),
    ));
  }

  for (const id of Object.keys(cat.characters)) {
    if (!hasPage(id)) continue;
    const name = charName(id);
    out.set('char/' + id, page(
      { ...list(tr('page.appearances', { name }), appearances(id).map((t) => ({ item: work(t) })), true), url: url(path('char', id)), ...inLanguage },
      crumbs([charsCrumb, [name, path('char', id)]]),
    ));
  }

  // The index pages list what their HTML lists, by address.
  out.set('index/guides', page(
    { ...list(tr('page.guidesName'), cat.guides.map((g) => ({ name: L(g.name), url: url(path('guide', g.id)) })), false), url: url(indexPath('guides', lang)), ...inLanguage },
    crumbs([guidesCrumb]),
  ));
  out.set('index/titles', page(
    { ...list(tr('page.titlesName'), byRelease.map((t) => ({ item: work(t) })), true), url: url(indexPath('titles', lang)), ...inLanguage },
    crumbs([titlesCrumb]),
  ));
  const chars = Object.keys(cat.characters).filter(hasPage).sort((a, b) => charName(a).localeCompare(charName(b), pt ? 'pt-BR' : 'en'));
  out.set('index/characters', page(
    { ...list(tr('page.charactersName'), chars.map((id) => ({ name: charName(id), url: url(path('char', id)) })), false), url: url(indexPath('characters', lang)), ...inLanguage },
    crumbs([charsCrumb]),
  ));
  return out;
}

/** The block for a page's <head>: JSON with every "<" escaped, so no string
 *  in it can close the script. */
export function jsonLdScript(data: Json): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
