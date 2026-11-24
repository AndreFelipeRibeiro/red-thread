// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 47 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import ReactDOM from 'react-dom';

// The suggestion list is on the design system since Notion "shadcn pass 5/5"
// (listed with `@source` in src/index.css): the menu's look (popover surface,
// ring, accent on the active row). It stays a listbox driven from the input
// (combobox keys, focus kept in the box). Hook classes kept: `ss-*`, `on`.

// Search input with suggestions (desktop toolbar and mobile app bar). From two
// characters it previews matching guides, actors, characters and titles under the box
// (an empty box lists the guides),
// matching names in every language. Picking an actor or character searches for
// that name; picking a title also opens its details. Typing without picking
// keeps today's free-text search. Combobox pattern: arrows move, Enter picks,
// Escape closes.

const SS_LIMIT = { guide: 2, actor: 4, character: 4, title: 4 };

// Lower-case and strip accents, keeping the length so match offsets map back
// onto the displayed (NFC) name.
const ssFold = s => window.MCU_I18N.fold(s);

// 0: the name or one of its words starts with the query ("vinga" matches
// "Os Vingadores"), 1: it appears inside a word.
function ssScore(name, q) {
  const f = ssFold(name);
  const i = f.indexOf(q);
  if (i < 0) return null;
  return i === 0 || /[\s\-:'’(.]/.test(f[i - 1]) ? 0 : 1;
}

function ssBest(names, q) {
  let best = null;
  names.forEach(n => { const s = ssScore(n, q); if (s !== null && (best === null || s < best)) best = s; });
  return best;
}

function ssBuild(query) {
  const I = window.MCU_I18N;
  const q = ssFold(query.trim());
  // An empty, focused box offers the guides, the way to find them without
  // knowing their names.
  if (!q) return (window.GUIDES || []).map(g => ({ kind: 'guide', key: 'g:' + g.id, id: g.id, guide: g, label: window.MCU_GUIDE.name(g), score: 0, n: 0 }));
  if (q.length < 2) return [];
  const titlesOf = {};
  window.TITLES.forEach(t => t.cast.forEach(c => { (titlesOf[c] = titlesOf[c] || new Set()).add(t.id); }));
  // What picking a character lights: its whole identity (Captain Carter takes
  // in Peggy Carter's titles), so the row's count matches the cards.
  const primeOf = (id) => (window.CHARACTERS[id] && window.CHARACTERS[id].prime) || id;
  const identityTitles = {};
  window.TITLES.forEach(t => t.cast.forEach(c => { const p = primeOf(c); (identityTitles[p] = identityTitles[p] || new Set()).add(t.id); }));
  // Built per title, not per character, because a part can change hands: Rhodes
  // is Terrence Howard in Iron Man and Don Cheadle after it, so searching
  // either name has to return that performer's own titles and no others.
  const actors = {};
  window.TITLES.forEach(t => t.cast.forEach(id => {
    if (!window.CHARACTERS[id]) return;
    const name = window.MCU_credit(t, id);
    const a = actors[name] || (actors[name] = { name, chars: [], titles: new Set() });
    if (a.chars.indexOf(id) === -1) a.chars.push(id);
    a.titles.add(t.id);
  }));
  const out = [];
  // Guides match their full and short names in every language ("doomsday",
  // "aranha"); picking one opens it.
  (window.GUIDES || []).forEach(g => {
    const names = [].concat(Object.values(g.name || {}), Object.values(g.short || {}));
    const s = ssBest(names, q);
    if (s !== null) out.push({ kind: 'guide', key: 'g:' + g.id, id: g.id, guide: g, label: window.MCU_GUIDE.name(g), score: s, n: 0 });
  });
  Object.values(actors).forEach(a => {
    const s = ssScore(a.name, q);
    if (s !== null) out.push({ kind: 'actor', key: 'a:' + a.name, label: a.name, score: s, n: a.titles.size, chars: a.chars });
  });
  // A part that changed hands gets one row per performer, so searching the
  // character's own name finds Edward Norton's Banner as well as Mark
  // Ruffalo's — not just the default. They stay character rows (same heading,
  // same shape); the performer is what the row names underneath. Picking one
  // pins the whole character and starts on that performer's first title, so
  // the run stays grouped in the stepper. The count on the row is still the
  // performer's own, which is the part worth telling apart.
  Object.keys(window.CHARACTERS).forEach(id => {
    if (!titlesOf[id]) return;
    const s = ssBest(I.charNames(id), q);
    if (s === null) return;
    const roster = window.MCU_creditRoster()[id] || [];
    if (roster.length < 2) {
      out.push({ kind: 'character', key: 'c:' + id, id, label: I.charName(id), score: s, n: identityTitles[primeOf(id)].size });
      return;
    }
    roster.forEach(r => out.push({
      kind: 'character', key: 'c:' + id + '|' + r.name, id, label: I.charName(id),
      actor: r.name, score: s, n: r.n,
    }));
  });
  window.TITLES.forEach(t => {
    const s = ssBest(I.titleNames(t), q);
    if (s !== null) out.push({ kind: 'title', key: 't:' + t.id, id: t.id, title: t, label: I.titleName(t), score: s, n: 0, year: t.year });
  });
  // People: best match, then most titles. Titles: best match, then release order.
  const rank = (a, b) => a.score - b.score || (a.kind === 'title' ? a.year - b.year : b.n - a.n) || I.compare(a.label, b.label);
  const people = ['guide', 'actor', 'character'].flatMap(kind => out.filter(o => o.kind === kind).sort(rank).slice(0, SS_LIMIT[kind]));
  // Titles get the room people don't use, up to eight rows in all.
  const titles = out.filter(o => o.kind === 'title').sort(rank).slice(0, Math.max(SS_LIMIT.title, 8 - people.length));
  return people.concat(titles);
}

// Bold the matched part; when the shown name matched only in another language,
// show it plain.
function SsLabel({ text, query }) {
  const q = ssFold(query.trim());
  const i = ssFold(text).indexOf(q);
  if (!q || i < 0) return text;
  return <>{text.slice(0, i)}<b>{text.slice(i, i + q.length)}</b>{text.slice(i + q.length)}</>;
}

function SsThumb({ item }) {
  const media = window.MEDIA;
  const [failed, setFailed] = React.useState(false);
  if (item.kind === 'title') return <span className="ss-thumb inline-flex flex-none items-center justify-center overflow-hidden text-caption font-bold text-(--on-color) [&_img]:block [&_img]:size-full [&_img]:object-cover poster h-9 w-6 rounded-[4px] bg-muted"><window.PosterArt title={item.title}/></span>;
  if (item.kind === 'guide') return <span className="ss-thumb inline-flex flex-none items-center justify-center overflow-hidden text-caption font-bold text-(--on-color) [&_img]:block [&_img]:size-full [&_img]:object-cover guide size-8 rounded-full"><window.GuideArt guide={item.guide} size={32} round/></span>;
  const id = item.kind === 'actor' ? item.chars[0] : item.id;
  const c = window.CHARACTERS[id] || {};
  // A row naming a specific performer shows that performer's face, so the
  // recast rows are told apart by more than their text.
  const url = item.actor ? window.performerPortrait(item.actor, id) : (() => {
    const path = media && media.actors && media.actors[id];
    return path && (window.mediaURL ? window.mediaURL('a', id, media.profile_base + path) : media.profile_base + path);
  })();
  return (
    <span className="ss-thumb inline-flex flex-none items-center justify-center overflow-hidden text-caption font-bold text-(--on-color) [&_img]:block [&_img]:size-full [&_img]:object-cover face size-8 rounded-full" style={{ background: c.color || '#555' }}>
      {url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)}/> : <span aria-hidden="true">{c.initials}</span>}
    </span>
  );
}

// `portalTo` (optional element) renders the list there instead of beside the
// input: the mobile box is too small to anchor it, so it spans the search row.
// `onSubmit` (optional) is Enter with no suggestion highlighted: it gets the
// typed text and returns true when it acted on it (on Guides, where there is
// nothing to filter, it opens Titles with that search: Notion "Search: Enter
// on the Guides page does nothing"). Anywhere else the text keeps filtering
// as you type and Enter does nothing more.
function SearchInput({ value, onChange, onPickTitle, onPickPerson, onSubmit, placeholder, ariaLabel, portalTo }) {
  const I = window.MCU_I18N;
  const { tr, lang } = window.useI18n();
  const [focused, setFocused] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const inputRef = React.useRef(null);
  const listId = React.useId();
  const items = React.useMemo(() => ssBuild(value), [value, lang]);
  const open = focused && !dismissed && items.length > 0;
  React.useEffect(() => { setActive(-1); }, [value]);

  const pick = (item, viaKeyboard = false) => {
    if (item.kind === 'guide' && window.MCU_openGuide) {
      onChange('');
      if (inputRef.current) inputRef.current.blur();
      setDismissed(true);
      setActive(-1);
      window.MCU_openGuide(item.id);
      return;
    }
    // A character (or an actor who plays one) opens the character view, with
    // its stepper, instead of becoming a text search; the box is cleared.
    if ((item.kind === 'actor' || item.kind === 'character') && onPickPerson && onPickPerson(item, { viaKeyboard })) {
      onChange('');
      if (inputRef.current) inputRef.current.blur();
      setDismissed(true);
      setActive(-1);
      return;
    }
    // Picking a title NAVIGATES to it rather than filtering by its name.
    // Putting the name in the box left a text filter behind, which narrowed the
    // canvas to that one title and stranded it with nothing to connect to —
    // the one thing the Spatial view is for. Opening it selected also brings
    // up its rings, so it lands among its neighbours.
    // Typing text and not picking still filters, exactly as before, and the
    // phase, type and collection filters are left alone either way.
    if (item.kind === 'title' && onPickTitle) {
      onChange('');
      onPickTitle(item.id);
      // Details open now: let go of the box (and the phone keyboard).
      if (inputRef.current) inputRef.current.blur();
    } else {
      onChange(item.label);
    }
    setDismissed(true);
    setActive(-1);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { if (open) { e.preventDefault(); setDismissed(true); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      setDismissed(false);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // Cycle through the options and back to the box itself (-1).
      setActive(i => {
        const next = i + step;
        if (next >= items.length) return -1;
        if (next < -1) return items.length - 1;
        return next;
      });
      return;
    }
    if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); pick(items[active], true); return; }
    if (e.key === 'Enter' && onSubmit && value.trim() && onSubmit(value)) {
      e.preventDefault();
      // The results take over: let go of the box (and the phone keyboard).
      if (inputRef.current) inputRef.current.blur();
      setDismissed(true);
      setActive(-1);
    }
  };
  const secondary = (item) => {
    if (item.kind === 'guide') return `${window.MCU_GUIDE.kind(item.guide)} · ${window.MCU_GUIDE.size(item.guide)}`;
    if (item.kind === 'actor') return tr('suggest.as', { names: item.chars.map(id => I.charName(id)).join(', ') });
    if (item.kind === 'character') return item.actor || window.MCU_creditRoster()[item.id][0].name;
    return `${tr(item.title.type === 'film' ? 'type.film.one' : 'type.series.one')} · ${item.year}`;
  };

  let lastKind = null;
  const pop = open ? (
    <ul className="ss-pop absolute top-[calc(100%+6px)] left-0 z-80 m-0 max-h-[min(60vh,520px)] w-full max-w-[520px] min-w-80 list-none overflow-y-auto rounded-md bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 in-[.m-searchrow]:max-w-none in-[.m-searchrow]:min-w-0" id={listId} role="listbox" aria-label={tr('suggest.label')}>
      {items.map((item, i) => {
        const head = item.kind !== lastKind ? tr('suggest.' + item.kind + 's') : null;
        lastKind = item.kind;
        return (
          <React.Fragment key={item.key}>
            {head && <li className="ss-head px-2 py-1.5 text-label font-medium text-muted-foreground" role="presentation">{head}</li>}
            <li id={`${listId}-${i}`} role="option" aria-selected={i === active} data-kind={item.kind}
              className={`ss-item flex min-h-[max(44px,2.75rem)] cursor-pointer items-center gap-2.5 rounded-sm px-2 py-[5px]${i === active ? ' on bg-accent text-accent-foreground' : ''}`}
              onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(item)}>
              <SsThumb item={item}/>
              <span className="ss-text flex min-w-0 flex-1 flex-col">
                <span className="ss-main truncate text-body text-(--dim) [&_b]:font-bold [&_b]:text-foreground"><SsLabel text={item.label} query={value}/></span>
                <span className="ss-sub truncate text-caption text-muted-foreground">{secondary(item)}</span>
              </span>
              {item.kind !== 'title' && item.kind !== 'guide' && <span className="ss-count flex-none text-caption tabular-nums text-muted-foreground">{tr('header.count', { n: item.n })}</span>}
            </li>
          </React.Fragment>
        );
      })}
    </ul>
  ) : null;
  return (
    <>
      <input ref={inputRef} value={value} placeholder={placeholder} aria-label={ariaLabel}
        role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={e => { onChange(e.target.value); setDismissed(false); }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown}/>
      {portalTo ? ReactDOM.createPortal(pop, portalTo) : pop}
    </>
  );
}
window.SearchInput = SearchInput;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { SearchInput };
