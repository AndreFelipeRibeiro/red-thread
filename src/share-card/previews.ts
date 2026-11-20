// What each link preview says and shows (Notion V4 Tasks, "Share 3/3";
// redesigned in V5, Notion "Link preview images: redesign the Open Graph
// cards to match the current app and brand"): one entry per title, character
// and guide, plus the app-wide card, with the tag text (og:title,
// og:description, alt) and the picture's content. The build fetches the
// posters and portraits and passes them in through `images`, renders each
// entry with link-cards.ts and writes the /og/… images and pages
// (vite.config.js). This file only reads what it is given, so it stays plain
// data in, plain data out.
import type { Character, Guide, Title } from '../types/catalog';
import type { CardInfo, LinkInput, PosterArt, Satellite } from './link-cards';
import type { PreviewColors } from './tokens';

type Plural = { one?: string; other: string };
export interface LocaleTables {
  strings: Record<string, string | Plural>;
  titles?: Record<string, string>;
  characters?: Record<string, string>;
  synopses?: Record<string, string>;
}

/** The app's tr() (i18n.js), for a build that has no page: plain strings
 *  with {placeholders}, or { one, other } chosen by n. English only. */
export function makeTr(loc: LocaleTables) {
  return (key: string, vars: Record<string, string | number> = {}): string => {
    let v = loc.strings[key];
    if (v === undefined) throw new Error('share-card: missing locale key ' + key);
    if (typeof v === 'object') v = (vars.n === 1 && v.one) || v.other;
    return String(v).replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] != null ? String(vars[k]) : m));
  };
}

/** The pictures, fetched by the build: a title's poster over its color, and
 *  a character's portrait. Either throws when it has none (the design's
 *  rule: no placeholder art, a missing image fails the build). */
export interface Images {
  poster(titleId: string): PosterArt;
  portrait(charId: string): string;
}

export interface PreviewEntry {
  kind: 'default' | 'title' | 'char' | 'guide';
  id: string;
  /** og:title */
  title: string;
  /** og:description */
  description: string;
  /** og:image:alt */
  alt: string;
  input: LinkInput;
}

export interface Catalog {
  titles: Title[];
  characters: Record<string, Character>;
  guides: Guide[];
}


const shorten = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Dec 18" for a dated release, "Dec 2027" for a month, the year alone else. */
function chipDate(release: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(release || '');
  if (!m) return release;
  if (!m[2]) return m[1];
  return m[3] ? `${MONTHS[+m[2] - 1]} ${+m[3]}` : `${MONTHS[+m[2] - 1]} ${m[1]}`;
}
/** The most stops a guide preview draws (the design's long-guide layout).
 *  More needs a new layout: ask Andre before the build squeezes further. */
const MAX_STOPS = 10;

export function previewEntries(cat: Catalog, loc: LocaleTables, colors: PreviewColors, site: string, images: Images): PreviewEntry[] {
  const tr = makeTr(loc);
  const app = tr('app.name');
  const titleName = (t: Title) => (loc.titles && loc.titles[t.id]) || t.title;
  const charName = (id: string) => (loc.characters && loc.characters[id]) || (cat.characters[id] ? cat.characters[id].name : id);
  const phase = (t: Title) => colors.phases[t.phase - 1] || colors.brand;
  const byRelease = [...cat.titles].sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
  const prime = (id: string) => (cat.characters[id] && cat.characters[id].prime) || id;
  const charColor = (id: string) => (cat.characters[id] ? cat.characters[id].color : colors.brand);
  const page = (name: string) => tr('og.pageTitle', { name, app });
  const byId = (id: string) => {
    const t = cat.titles.find((x) => x.id === id);
    if (!t) throw new Error('share-card: no title ' + id);
    return t;
  };

  // Which titles each title's characters connect it to, and through whom: the
  // Spatial view's links, so the cards' counts match the app.
  const links = new Map<string, Map<string, string[]>>();
  for (const t of cat.titles) {
    const m = new Map<string, string[]>();
    for (const o of cat.titles) {
      if (o.id === t.id) continue;
      const shared = t.cast.filter((ch) => o.cast.some((x) => prime(x) === prime(ch)));
      if (shared.length) m.set(o.id, shared);
    }
    links.set(t.id, m);
  }
  const card = (t: Title): CardInfo => ({
    poster: images.poster(t.id), name: titleName(t), year: t.year, phaseColor: phase(t), connections: links.get(t.id)!.size,
  });
  /** The hub around `center`: the three titles it shares the most characters
   *  with (earliest first on a tie), or `prefer` first where a character
   *  really joins them (a picture of connections draws only real ones). */
  const hub = (center: Title, prefer: string[] = []) => {
    const m = links.get(center.id)!;
    const ranked = [...m.keys()].sort((a, b) => m.get(b)!.length - m.get(a)!.length || (byId(a).release < byId(b).release ? -1 : 1));
    const ids = [...new Set([...prefer.filter((id) => m.has(id)), ...ranked])].slice(0, 3);
    const satellites: Satellite[] = ids.map((id) => {
      const t = byId(id);
      const shared = m.get(id) || [];
      // Its other characters carry the threads that run out of the frame.
      const others = t.cast.filter((ch) => !shared.some((s) => prime(s) === prime(ch)) && cat.characters[ch]);
      return { card: card(t), threads: shared.map(charColor), onward: [...others, ...shared].map(charColor) };
    });
    return { layout: 'hub' as const, center: card(center), satellites };
  };
  const out: PreviewEntry[] = [];

  // The app-wide card: Iron Man and the titles around it. The design drew
  // Endgame, The Avengers and Thor; Iron Man and Thor share no character in
  // the catalog, so Thor gives way to Iron Man's next real connection.
  out.push({
    kind: 'default', id: 'default',
    title: tr('og.defaultTitle', { app }),
    description: tr('og.defaultSub'),
    alt: tr('og.defaultAlt'),
    input: {
      site, copy: { kicker: tr('og.defaultKicker'), heading: tr('share.appText'), headingKind: 'line' },
      art: hub(byId('iron-man'), ['endgame', 'avengers', 'thor']),
    },
  });

  // A title: its card in the middle, the titles its characters connect it to around.
  for (const t of cat.titles) {
    const name = titleName(t);
    const n = links.get(t.id)!.size;
    const kindWord = tr(t.type === 'film' ? 'type.film.one' : 'type.series.one');
    out.push({
      kind: 'title', id: t.id,
      title: page(`${name} (${t.year})`),
      description: shorten((loc.synopses && loc.synopses[t.id]) || tr('og.titleSub', { n }), 200),
      alt: tr('og.titleAlt', { title: name }),
      input: {
        site, art: hub(t),
        copy: { kicker: `${tr('phase.label', { n: t.phase })} · ${kindWord} · ${t.year}`, heading: name, headingKind: 'name',
          sub: n ? tr('og.titleSub', { n }) : undefined, subWidth: 430 },
      },
    });
  }

  // A character: the portrait, then its identity's titles in release order on one thread.
  for (const id of Object.keys(cat.characters)) {
    const c = cat.characters[id];
    const titles = byRelease.filter((t) => t.cast.some((x) => prime(x) === prime(id)));
    if (!titles.length) continue;
    const name = charName(id);
    const n = titles.length;
    const first = `${titleName(titles[0])} (${titles[0].year})`;
    out.push({
      kind: 'char', id,
      title: page(name),
      description: tr('og.charDesc', { name, n, first }),
      alt: tr('og.charAlt', { name }),
      input: {
        site,
        copy: { kicker: tr('og.charEyebrow', { actor: c.actor }), heading: name, headingKind: 'name', sub: tr('og.charSub', { n, first }), subWidth: 520 },
        art: { layout: 'char', portrait: images.portrait(id), color: c.color, posters: titles.map((t) => images.poster(t.id)) },
      },
    });
  }

  // A guide: its essential stops climbing the red thread. An event guide ends
  // on its release, with the date; any other on its last stop.
  for (const g of cat.guides) {
    const ess = g.stops.filter((s) => s.weight === 'essential').map((s) => byId(s.id));
    if (ess.length > MAX_STOPS) throw new Error(`share-card: guide ${g.id} has ${ess.length} essential stops; the preview fits ${MAX_STOPS}`);
    const target = g.group === 'coming' && g.target ? byId(g.target) : null;
    const stops = target ? ess : ess.slice(0, -1);
    const last = target || ess[ess.length - 1];
    const name = g.name.en;
    out.push({
      kind: 'guide', id: g.id,
      title: page(name),
      description: shorten(g.blurb.en, 200),
      alt: tr('og.guideAlt', { name }),
      input: {
        site,
        copy: { kicker: `${tr('guide.kind.' + (g.group || 'stories'))} · ${tr('guide.stops', { n: ess.length })}`, heading: name, headingKind: 'line' },
        art: { layout: 'guide', stops: stops.map((t) => images.poster(t.id)), last: images.poster(last.id),
          chip: target ? chipDate(target.release) : undefined, long: ess.length > 5 },
      },
    });
  }
  return out;
}
