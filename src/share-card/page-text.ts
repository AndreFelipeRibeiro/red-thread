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
// English, like the link previews: the address is the same in every language.
// Plain data in, an HTML string out.
import type { Guide, Title } from '../types/catalog';
import { makeTr, type Catalog, type LocaleTables } from './previews';
import { thingPath } from './addresses';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Visually hidden, still read: the standard screen-reader-only pattern. */
const HIDDEN = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

/** One page's text, keyed `<kind>/<id>` as the preview entries are. */
export type PageTexts = Map<string, string>;

export function pageTexts(cat: Catalog, loc: LocaleTables): PageTexts {
  const tr = makeTr(loc);
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
    return d.toLocaleDateString('en-US', m[3] ? { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' } : { year: 'numeric', month: 'long', timeZone: 'UTC' });
  };
  const titleLink = (t: Title) => `<a href="${thingPath('title', t.id)}">${esc(titleName(t))} (${t.year})</a>`;
  /** A character's titles, as the character preview counts them. */
  const appearances = (id: string) => byRelease.filter((t) => t.cast.some((x) => prime(x) === prime(id)));
  const hasPage = (id: string) => !!cat.characters[id] && appearances(id).length > 0;
  const guidesWith = (pred: (g: Guide) => boolean) => cat.guides.filter(pred);
  const footer = `<p><a href="/">${esc(app)}</a>: ${esc(tr('og.defaultSub'))}</p>`;
  const wrap = (body: string) => `<article id="mcu-page-text" style="${HIDDEN}">${body}${footer}</article>`;
  const guideList = (gs: Guide[]) => (gs.length
    ? `<h2>${esc(tr('page.inGuides'))}</h2><ul>${gs.map((g) => `<li><a href="${thingPath('guide', g.id)}">${esc(g.name.en)}</a></li>`).join('')}</ul>`
    : '');

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
      return `<li>${titleLink(t)}, ${esc(kindWord(t))}${extra}: ${esc(s.why.en)}</li>`;
    }).join('');
    out.set('guide/' + g.id, wrap(
      `<h1>${esc(g.name.en)}</h1><p>${esc(g.blurb.en)}</p><p>${esc(facts.join(' · '))}</p>`
      + `<ol>${items}</ol><p>${esc(tr('page.updated', { date: longDate(g.reviewed) }))}</p>`,
    ));
  }

  for (const t of cat.titles) {
    const facts = [tr('phase.label', { n: t.phase }), kindWord(t), longDate(t.release)];
    if (t.runtime) facts.push(hm(t.runtime));
    const synopsis = loc.synopses && loc.synopses[t.id];
    const cast = t.cast.filter(hasPage);
    const castList = cast.length
      ? `<h2>${esc(tr('page.characters'))}</h2><ul>${cast.map((id) => {
        const actor = (t.credits && t.credits[id]) || cat.characters[id].actor;
        return `<li><a href="${thingPath('char', id)}">${esc(charName(id))}</a> (${esc(actor)})</li>`;
      }).join('')}</ul>`
      : '';
    out.set('title/' + t.id, wrap(
      `<h1>${esc(titleName(t))} (${t.year})</h1><p>${esc(facts.join(' · '))}</p>`
      + (synopsis ? `<p>${esc(synopsis)}</p>` : '')
      + castList + guideList(guidesWith((g) => g.stops.some((s) => s.id === t.id))),
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
      + `<h2>${esc(tr('page.appearances'))}</h2><ol>${titles.map((t) => `<li>${titleLink(t)}, ${esc(kindWord(t))}</li>`).join('')}</ol>`
      + guideList(guidesWith((g) => g.character === id)),
    ));
  }
  return out;
}
