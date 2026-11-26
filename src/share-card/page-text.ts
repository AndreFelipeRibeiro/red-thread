// The readable text of each guide, title and character page (Notion
// "Findability 3", option B1). Search engines and AI assistants mostly read a
// page without running its scripts, and until now every address served the
// same empty startup screen. The build (scripts/og-previews.js) puts this
// text in each page's HTML, inside #root: it is visually hidden behind the
// startup screen, and React replaces it the moment the app starts, so a
// visitor sees exactly what they always have. It says only what the app's own
// panels say about the same thing (the stops and their reasons, the cast, the
// appearances), never more, so it is the page's content, not hidden extras.
//
// Findability 4 adds what the app's panels say about connections (a title's
// thread, a character's most frequent co-stars), the index pages (/guides,
// /titles, /characters) and the home page's text, so every page links to the
// others in plain HTML and a crawler can reach all of them from the home page.
//
// English, like the link previews: the address is the same in every language.
// Plain data in, an HTML string out.
import type { Guide, Localized, Title } from '../types/catalog';
import { makeTr, type Catalog, type LocaleTables } from './previews';
import { homePath, indexPath, thingPath, type AddressLang } from './addresses';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Visually hidden, still read: the standard screen-reader-only pattern. */
const HIDDEN = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

/** One page's text, keyed `<kind>/<id>` as the preview entries are. */
export type PageTexts = Map<string, string>;

/** `lang` writes the Portuguese pages (Notion "Findability 6"): their links,
 *  names, guide text and dates in Portuguese, and loc must be the Portuguese
 *  tables over the English ones. */
export function pageTexts(cat: Catalog, loc: LocaleTables, lang: AddressLang = 'en'): PageTexts {
  const tr = makeTr(loc);
  const pt = lang === 'pt-BR';
  /** A guide's own text in this language, else English. */
  const L = (o: Localized) => (pt && o['pt-BR']) || o.en;
  const path = (kind: 'title' | 'guide' | 'char', id: string) => thingPath(kind, id, lang);
  const releaseOf = (t: Title) => (loc.releases && loc.releases[t.id]) || t.release;
  const app = tr('app.name');
  const titleName = (t: Title) => (loc.titles && loc.titles[t.id]) || t.title;
  const charName = (id: string) => (loc.characters && loc.characters[id]) || (cat.characters[id] ? cat.characters[id].name : id);
  const prime = (id: string) => (cat.characters[id] && cat.characters[id].prime) || id;
  const byId = new Map(cat.titles.map((t) => [t.id, t]));
  const byRelease = [...cat.titles].sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
  const kindWord = (t: Title) => tr(t.type === 'film' ? 'type.film.one' : 'type.series.one');
  const hm = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? tr('runtime.hm', { h, m }) : tr('runtime.h', { h })) : tr('runtime.m', { m });
  };
  const longDate = (iso: string) => {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
    if (!m) return iso;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
    return d.toLocaleDateString(pt ? 'pt-BR' : 'en-US', m[3] ? { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' } : { year: 'numeric', month: 'long', timeZone: 'UTC' });
  };
  const titleLink = (t: Title) => `<a href="${path('title', t.id)}">${esc(titleName(t))} (${t.year})</a>`;
  /** A character's titles, as the character preview counts them. */
  const appearances = (id: string) => byRelease.filter((t) => t.cast.some((x) => prime(x) === prime(id)));
  const hasPage = (id: string) => !!cat.characters[id] && appearances(id).length > 0;
  const guidesWith = (pred: (g: Guide) => boolean) => cat.guides.filter(pred);
  // The descriptor (Findability 11), as the line that names Red Thread on every page.
  const descriptor = tr('site.descriptor');
  const footer = `<p><a href="${homePath(lang)}">${esc(app)}</a>: ${esc(descriptor.charAt(0).toLowerCase() + descriptor.slice(1))}</p>`;
  const wrap = (body: string) => `<article id="mcu-page-text" style="${HIDDEN}">${body}${footer}</article>`;
  const guideList = (gs: Guide[]) => (gs.length
    ? `<h2>${esc(tr('page.inGuides'))}</h2><ul>${gs.map((g) => `<li><a href="${path('guide', g.id)}">${esc(L(g.name))}</a></li>`).join('')}</ul>`
    : '');

  /** threadOf (title-details.tsx) without the window: the other titles
   *  sharing a character, by identity, with this title's own ids for them. */
  const connected = (title: Title) => {
    const mine = new Map<string, string>();
    title.cast.forEach((ch) => { if (!mine.has(prime(ch))) mine.set(prime(ch), ch); });
    return byRelease.filter((o) => o.id !== title.id).map((o) => {
      const via: string[] = [];
      o.cast.forEach((ch) => { const own = mine.get(prime(ch)); if (own && !via.includes(own)) via.push(own); });
      return { t: o, via };
    }).filter((r) => r.via.length);
  };
  /** The characters who share the most titles with this one (five at most,
   *  two titles or more), most first, then by name. */
  const coStarList = (id: string, titles: Title[]) => {
    const count = new Map<string, number>();
    titles.forEach((t) => {
      const seen = new Set<string>();
      t.cast.forEach((ch) => {
        const p = prime(ch);
        if (p === prime(id) || seen.has(p) || !hasPage(p)) return;
        seen.add(p);
        count.set(p, (count.get(p) || 0) + 1);
      });
    });
    const top = [...count].filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || charName(a[0]).localeCompare(charName(b[0]))).slice(0, 5);
    return top.length
      ? `<h2>${esc(tr('page.sharesMost'))}</h2><ul>${top.map(([p, n]) =>
        `<li><a href="${path('char', p)}">${esc(charName(p))}</a>, ${esc(tr('page.sharedTitles', { n }))}</li>`).join('')}</ul>`
      : '';
  };

  const out: PageTexts = new Map();

  for (const g of cat.guides) {
    const stops = g.stops.map((s) => {
      const t = byId.get(s.id);
      if (!t) throw new Error(`page text: guide ${g.id} has no title ${s.id}`);
      return { s, t };
    });
    const minutes = stops.every(({ t }) => t.runtime) ? stops.reduce((sum, { t }) => sum + (t.runtime || 0), 0) : 0;
    const facts = [tr('guide.kind.' + (g.group || 'stories')), tr('guide.stops', { n: stops.length })];
    if (minutes) facts.push(tr('runtime.about', { t: hm(minutes) }));
    const items = stops.map(({ s, t }) => {
      const extra = s.weight === 'essential' ? '' : ` (${esc(tr('guide.optionalTag'))})`;
      return `<li>${titleLink(t)}, ${esc(kindWord(t))}${extra}: ${esc(L(s.why))}</li>`;
    }).join('');
    out.set('guide/' + g.id, wrap(
      `<h1>${esc(L(g.name))}</h1><p>${esc(L(g.blurb))}</p><p>${esc(facts.join(' · '))}</p>`
      + `<ol>${items}</ol><p>${esc(tr('page.updated', { date: longDate(g.reviewed) }))}</p>`,
    ));
  }

  for (const t of cat.titles) {
    const facts = [tr('phase.label', { n: t.phase }), kindWord(t), longDate(releaseOf(t))];
    if (t.runtime) facts.push(hm(t.runtime));
    const synopsis = loc.synopses && loc.synopses[t.id];
    const cast = t.cast.filter(hasPage);
    const castList = cast.length
      ? `<h2>${esc(tr('page.characters'))}</h2><ul>${cast.map((id) => {
        const actor = (t.credits && t.credits[id]) || cat.characters[id].actor;
        return `<li><a href="${path('char', id)}">${esc(charName(id))}</a> (${esc(actor)})</li>`;
      }).join('')}</ul>`
      : '';
    // Follow the thread (title-details.tsx threadOf): every title sharing a
    // character with this one, in release order, with who connects them.
    const thread = connected(t);
    const threadList = thread.length
      ? `<h2>${esc(tr('thread.listLabel', { title: titleName(t) }))}</h2><ol>${thread.map(({ t: o, via }) =>
        `<li>${titleLink(o)}, ${esc(tr('thread.via', { names: via.map(charName).join(', ') }))}</li>`).join('')}</ol>`
      : '';
    out.set('title/' + t.id, wrap(
      `<h1>${esc(titleName(t))} (${t.year})</h1><p>${esc(facts.join(' · '))}</p>`
      // Its English name, where Brazil's differs, so searches for it still
      // find the Portuguese page ("Título original: Avengers: Doomsday").
      + (pt && titleName(t) !== t.title ? `<p>${esc(tr('page.originalTitle', { name: t.title }))}</p>` : '')
      + (synopsis ? `<p>${esc(synopsis)}</p>` : '')
      + castList + threadList + guideList(guidesWith((g) => g.stops.some((s) => s.id === t.id))),
    ));
  }

  for (const id of Object.keys(cat.characters)) {
    const titles = appearances(id);
    if (!titles.length) continue;
    const c = cat.characters[id];
    const name = charName(id);
    const first = `${titleName(titles[0])} (${titles[0].year})`;
    out.set('char/' + id, wrap(
      `<h1>${esc(name)}</h1><p>${esc(tr('og.charEyebrow', { actor: c.actor }))}</p>`
      + `<p>${esc(tr('og.charDesc', { name, n: titles.length, first }))}</p>`
      + `<h2>${esc(tr('page.appearances', { name }))}</h2><ol>${titles.map((t) => `<li>${titleLink(t)}, ${esc(kindWord(t))}</li>`).join('')}</ol>`
      + coStarList(id, titles)
      + guideList(guidesWith((g) => g.character === id)),
    ));
  }

  // The index pages (Findability 4): every guide, title and character with a
  // link, so each page is one step from the home page in plain HTML.
  const nav = `<nav><ul>${INDEXES.map((i) => `<li><a href="${indexPath(i.segment, lang)}">${esc(tr(i.name))}</a></li>`).join('')}</ul></nav>`;
  out.set('index/guides', wrap(
    `<h1>${esc(tr('page.guidesName'))}</h1><p>${esc(tr('page.guidesDesc'))}</p><ul>${cat.guides.map((g) =>
      `<li><a href="${path('guide', g.id)}">${esc(L(g.name))}</a>: ${esc(L(g.blurb))} (${esc(tr('guide.stops', { n: g.stops.length }))})</li>`).join('')}</ul>${nav}`,
  ));
  out.set('index/titles', wrap(
    `<h1>${esc(tr('page.titlesName'))}</h1><p>${esc(tr('page.titlesDesc'))}</p><ol>${byRelease.map((t) =>
      `<li>${titleLink(t)}, ${esc(tr('phase.label', { n: t.phase }))} ${esc(kindWord(t).toLowerCase())}</li>`).join('')}</ol>${nav}`,
  ));
  const chars = Object.keys(cat.characters).filter(hasPage).sort((a, b) => charName(a).localeCompare(charName(b), pt ? 'pt-BR' : 'en'));
  out.set('index/characters', wrap(
    `<h1>${esc(tr('page.charactersName'))}</h1><p>${esc(tr('page.charactersDesc'))}</p><ul>${chars.map((id) =>
      `<li><a href="${path('char', id)}">${esc(charName(id))}</a> (${esc(cat.characters[id].actor)}), ${esc(tr('page.inTitles', { n: appearances(id).length }))}</li>`).join('')}</ul>${nav}`,
  ));
  // The home page: what Red Thread is, the three indexes and every guide.
  out.set('home', wrap(
    `<h1>${esc(app)}</h1><p>${esc(tr('og.defaultTitle', { app }))}</p>${nav}`
    + `<h2>${esc(tr('page.guidesName'))}</h2><ul>${cat.guides.map((g) =>
      `<li><a href="${path('guide', g.id)}">${esc(L(g.name))}</a></li>`).join('')}</ul>`,
  ));
  return out;
}

/** The index addresses (src/share-card/addresses.ts) and their names. */
export const INDEXES = [
  { segment: 'guides', name: 'page.guidesName', description: 'page.guidesDesc' },
  { segment: 'titles', name: 'page.titlesName', description: 'page.titlesDesc' },
  { segment: 'characters', name: 'page.charactersName', description: 'page.charactersDesc' },
] as const;
