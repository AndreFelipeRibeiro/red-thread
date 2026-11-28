// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 17 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DIALOG } from './about';

// On the design system since Notion "shadcn pass 5/5" (listed with `@source`
// in src/index.css): ModalDialog / Sheet with the shared dialog recipes,
// shadcn's Buttons and Input. Hook classes kept for the app and the QA
// checks: `pk`, `pk-*`, `picker-go`, `nudge-later`, `on`, `un`.

// "What have you seen?" (V3 Tasks, First-visit picker; redrawn as the poster
// wall of Notion "Rethink What have you seen modal", direction A, 2026-11-16):
// every released title, grouped by phase in release order, to mark many as
// seen in one go. Offered by the first-visit welcome, Titles and the Seen
// empty state (window.MCU_openPicker, set in app.tsx).
//
// Picks live in this component until Save; nothing else is stored. Titles
// already seen start marked and can be unmarked, which marks them unseen as
// part of the same change. Save goes through applyPicks (tracking.tsx): one
// change, one toast with Undo, one celebration at most, one write per title
// when signed in. No extra confirmation: the button names the numbers.
// Closing with unsaved picks asks first. A full-height sheet on phones, a
// 760px dialog on desktop.
//
// The wall: no titles over the art (the name is the button's accessible name
// and its tooltip); an unmarked poster is in full color with an empty ring, a
// marked one is dimmed with the one filled green check the app uses for seen.
// The big count and its red bar, and each phase's count and bar, fill as you
// tap. Mark all turns into Undo for that phase until you touch it again, so a
// stray Mark all is one tap to reverse.

const PkI18N = window.MCU_I18N;
const pktr = (key: string, vars?: Record<string, unknown>) => PkI18N.tr(key, vars);

// Smaller posters than the app's w342: 60 of them stay light on a phone.
function PickPoster({ title }) {
  const media = window.MEDIA;
  const path = media && media.posters && media.posters[title.id];
  const url = path ? (window.mediaURL ? window.mediaURL('p', title.id, media.poster_base.replace('/w342', '/w185') + path) : media.poster_base + path) : null;
  const [failed, setFailed] = React.useState(false);
  if (url && !failed) return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)}/>;
  return <window.PosterArt title={title}/>;
}

// A thin progress bar: red fill on its track, the app's --progress tokens.
function PkBar({ value, className }) {
  return (
    <span aria-hidden="true" className={cn('pk-bar block overflow-hidden rounded-full bg-(--brand-tint-strong)', className)}>
      <span className="block h-full rounded-full bg-(--progress) transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none" style={{ width: `${Math.round(value * 1000) / 10}%` }}/>
    </span>
  );
}

function SeenPicker({ touch, onClose }) {
  const { states, applyPicks } = window.useCollection();
  window.useI18n();
  // The released titles by phase, in release order. Worked out once per open:
  // the list does not reshuffle while picking.
  const groups = React.useMemo(() => {
    const released = (window.TITLES || []).filter(t => window.MCU_isReleased(t))
      .sort((a, b) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0));
    const by = {};
    released.forEach(t => { (by[t.phase] = by[t.phase] || []).push(t); });
    return Object.keys(by).map(Number).sort((a, b) => a - b).map(p => {
      const titles = by[p];
      const first = titles[0].release.slice(0, 4), last = titles[titles.length - 1].release.slice(0, 4);
      return { phase: p, titles, ids: titles.map(t => t.id), years: first === last ? first : `${first}–${last}` };
    });
  }, []);
  const total = React.useMemo(() => groups.reduce((n, g) => n + g.ids.length, 0), [groups]);
  // What was seen when the picker opened; picks start from that.
  const initial = React.useMemo(() => new Set(groups.flatMap(g => g.titles).filter(t => states[t.id] === 'seen').map(t => t.id)), []);
  const later = initial.size > 0;
  const [picks, setPicks] = React.useState(() => new Set(initial));
  const [asking, setAsking] = React.useState(false);
  // The phase whose Mark all can still be undone, with what it held before.
  const [phaseUndo, setPhaseUndo] = React.useState(null);
  // The Watchlist title most recently marked: the footer says it moves to Seen.
  const [watchNote, setWatchNote] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const askRef = React.useRef(null);

  const toSeen = [...picks].filter(id => !initial.has(id));
  const toUnseen = [...initial].filter(id => !picks.has(id));
  const dirty = toSeen.length + toUnseen.length > 0;
  const onWatch = id => states[id] === 'watchlist' && !initial.has(id);

  const toggle = (id, phase) => {
    const on = !picks.has(id);
    setPicks(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    if (phaseUndo && phaseUndo.phase === phase) setPhaseUndo(null);
    setWatchNote(on && onWatch(id) ? id : watchNote === id ? null : watchNote);
  };
  const markAll = (g) => {
    const before = g.ids.filter(id => picks.has(id));
    setPicks(prev => { const n = new Set(prev); g.ids.forEach(id => n.add(id)); return n; });
    setPhaseUndo({ phase: g.phase, before });
    const w = g.ids.find(id => !picks.has(id) && onWatch(id));
    if (w) setWatchNote(w);
  };
  const undoPhase = (g) => {
    const keep = new Set(phaseUndo.before);
    setPicks(prev => { const n = new Set(prev); g.ids.forEach(id => (keep.has(id) ? n.add(id) : n.delete(id))); return n; });
    setPhaseUndo(null);
    if (watchNote && g.ids.includes(watchNote) && !keep.has(watchNote)) setWatchNote(null);
  };

  const save = () => {
    const s = toSeen, u = toUnseen;
    onClose();
    // After the picker has gone, so the toast and the sign-in reminder are
    // placed for the page underneath rather than for the sheet.
    setTimeout(() => applyPicks(s, u), 0);
  };
  // ×, Escape, Back, the scrim or a swipe. Returns false while it stays open
  // (Sheet keeps its history entry that way).
  const requestClose = () => {
    if (asking) { setAsking(false); return false; }
    if (!dirty) { onClose(); return true; }
    setAsking(true);
    return false;
  };
  const closeRef = React.useRef(requestClose);
  closeRef.current = requestClose;
  const onShellClose = () => closeRef.current();

  // While the leave prompt is up, everything behind it is inert and the
  // prompt takes focus.
  const headRef = React.useRef(null);
  const gridRef = React.useRef(null);
  const footRef = React.useRef(null);
  React.useEffect(() => {
    [headRef.current, gridRef.current, footRef.current].forEach(el => { if (el) el.inert = asking; });
    if (asking && askRef.current) askRef.current.focus();
  }, [asking]);

  // Search (desktop): every language's names, folded for case and accents.
  const q = PkI18N.fold(query.trim());
  const matches = t => !q || PkI18N.titleNames(t).some(n => PkI18N.fold(n).includes(q));
  const shown = groups.map(g => ({ ...g, visible: g.titles.filter(matches) })).filter(g => g.visible.length);

  const goLabel = later ? pktr('picker.save') : pktr('picker.go', { n: toSeen.length });
  const changeLine = dirty
    ? [toSeen.length && pktr('picker.marked', { n: toSeen.length }), toUnseen.length && pktr('picker.unmarked', { n: toUnseen.length })].filter(Boolean).join(' · ')
    : pktr(touch ? 'picker.hintTouch' : 'picker.hint');
  const noteTitle = watchNote && (window.TITLES || []).find(t => t.id === watchNote);
  const subLine = noteTitle ? pktr('picker.watchMoves', { title: PkI18N.titleName(noteTitle) }) : dirty ? pktr('picker.hintSave') : null;
  const titleKey = later ? 'picker.titleLater' : 'picker.titleFirst';
  const subKey = later ? (touch ? 'picker.subLaterTouch' : 'picker.subLater') : (touch ? 'picker.subTouch' : 'picker.sub');

  const body = (
    <div className={cn('pk relative text-body text-foreground', touch ? 'touch' : 'flex min-h-0 flex-1 flex-col')}>
      <div ref={headRef} className={cn('pk-head', touch ? 'pt-1 pb-4' : 'pt-[26px] pr-[26px] pb-4 pl-[26px]')}>
        {/* Desktop: the title in the guide pages' display size (Andre,
            2026-11-16); the close button keeps its corner. */}
        <h2 id="pk-title" className={cn('pk-title font-semibold tracking-tight', touch ? 'pr-11 text-title' : 'pr-12 text-display leading-[1.12]')}>{pktr(titleKey)}</h2>
        <p className={cn('pk-sub text-body leading-normal text-muted-foreground', touch ? 'mt-1' : 'mt-2 pr-12')}>{pktr(subKey)}</p>
        {/* The count reads like a guide's meter: the bar, then "37 of 60
            seen" in the phase headers' size; the search runs to the edge. */}
        <div className={cn('flex items-center gap-4', touch ? 'mt-3.5' : 'mt-5')}>
          <PkBar value={picks.size / total} className="h-1.5 min-w-12 flex-1"/>
          <p className="pk-total flex-none text-heading whitespace-nowrap text-muted-foreground tabular-nums">
            <b className="font-semibold text-foreground">{picks.size}</b> {pktr('picker.ofSeen', { n: total })}
          </p>
          {!touch && (
            <label className="pk-search relative w-[min(300px,42%)] flex-none">
              <span className="story-sr">{pktr('picker.search')}</span>
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"/>
              <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={pktr('picker.search')}
                className="h-[max(40px,2.5rem)] rounded-lg pl-8"/>
            </label>
          )}
        </div>
      </div>
      <div className={cn('pk-body border-t', touch ? '-mx-[18px] px-[18px] pb-4' : 'min-h-0 flex-1 overflow-y-auto px-[26px] pb-5')} ref={gridRef}>
        {!shown.length && <p className="pk-none py-10 text-center text-body text-muted-foreground">{pktr('picker.noMatch', { q: query.trim() })}</p>}
        {shown.map(g => {
          const n = g.ids.filter(id => picks.has(id)).length;
          const all = n === g.ids.length;
          const name = pktr('phase.label', { n: g.phase });
          const canUndo = all && phaseUndo && phaseUndo.phase === g.phase;
          return (
            <section key={g.phase} className="pk-phase" aria-labelledby={`pk-ph-${g.phase}`}>
              {/* Full bleed, so the posters' shadows don't show at its sides
                  as they scroll under it. On the phone it sticks at the
                  sheet's top edge, above the sheet body's top padding
                  (pt-1.5), so no posters show above it (Notion "Seen picker:
                  posters show above the phone's sticky phase header"). */}
              <div className={cn('pk-ph sticky z-2 flex items-center gap-2.5 bg-popover pt-3.5 pb-2.5', touch ? '-top-1.5 -mx-[18px] px-[18px]' : 'top-0 -mx-[26px] px-[26px]')}>
                <span aria-hidden="true" className="size-2.5 flex-none rounded-full" style={{ background: `var(--phase-${g.phase})` }}/>
                <h3 id={`pk-ph-${g.phase}`} className="pk-pl flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="text-heading font-semibold whitespace-nowrap text-foreground">{name}</span>
                  {!touch && <span className="pk-years truncate text-label text-muted-foreground tabular-nums">{g.years}</span>}
                </h3>
                <span className="pk-pn text-label font-medium whitespace-nowrap text-muted-foreground tabular-nums">{pktr('picker.phaseCount', { seen: n, n: g.ids.length })}</span>
                <PkBar value={n / g.ids.length} className="h-1 w-11 flex-none"/>
                {!q && (canUndo ? (
                  <Button type="button" variant="ghost" size="sm" className="pk-pa pk-undo min-h-[max(32px,2rem)] text-muted-foreground"
                    onClick={() => undoPhase(g)} aria-label={pktr('picker.undoPhaseAria', { group: name })}>{pktr('picker.undoPhase')}</Button>
                ) : all ? (
                  <span className="pk-done inline-flex min-h-[max(32px,2rem)] items-center gap-1 text-label font-semibold whitespace-nowrap text-(--seen-text) [&_svg]:size-3.5"><window.CheckIcon/>{pktr('picker.allSeen')}</span>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="pk-pa min-h-[max(32px,2rem)]"
                    onClick={() => markAll(g)} aria-label={pktr('picker.markAllAria', { group: name })}>{pktr('picker.markAll')}</Button>
                ))}
              </div>
              <div className={cn('pk-grid grid pb-2', touch ? 'grid-cols-3 gap-2' : 'grid-cols-6 gap-3')}>
                {g.visible.map(t => {
                  const on = picks.has(t.id);
                  const had = initial.has(t.id);
                  const watch = states[t.id] === 'watchlist';
                  const tname = PkI18N.titleName(t);
                  const label = had && !on ? pktr('picker.ariaUnmark', { title: tname })
                    : had ? pktr('picker.ariaSeen', { title: tname })
                    : watch ? pktr('picker.ariaWatch', { title: tname }) : tname;
                  return (
                    <button key={t.id} type="button" data-pick={t.id} aria-pressed={on} aria-label={label} title={tname}
                      className={cn('pk-p relative aspect-[2/3] cursor-pointer overflow-hidden rounded-lg bg-muted text-left shadow-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        on && 'on', had && !on && 'un')} onClick={() => toggle(t.id, g.phase)}>
                      <span className="pk-art absolute inset-0 *:block *:size-full [&_img]:object-cover [&_svg]:size-full" aria-hidden="true"><PickPoster title={t}/></span>
                      {on && <span className="pk-dim absolute inset-0 bg-black/45" aria-hidden="true"/>}
                      <span aria-hidden="true" className={cn('pk-tick absolute right-1.5 bottom-1.5 flex items-center justify-center rounded-full shadow-mark',
                        touch ? 'size-[26px]' : 'size-6',
                        on ? 'on bg-(--seen) text-(--seen-foreground) [&_svg]:size-3.5' : 'border-2 border-white/85 bg-black/20')}>{on && <window.CheckIcon/>}</span>
                      {watch && !on && <span className="pk-wl absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-xs bg-black/75 text-(--status-watch) [&_svg]:size-[11px]" aria-hidden="true"><window.BookmarkIcon filled/></span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div ref={footRef} className={cn('pk-foot relative z-3 flex items-center gap-3 border-t bg-popover', touch ? 'sticky bottom-0 -mx-[18px] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))]' : 'py-3.5 pr-5 pl-[26px]')}>
        <div className="pk-count min-w-0 flex-1 leading-[1.35]" role="status" aria-live="polite">
          <span className="block text-body font-semibold text-foreground tabular-nums">{changeLine}</span>
          {subLine && <span className={cn('pk-note block text-label text-muted-foreground', noteTitle && 'pk-wnote')}>{subLine}</span>}
        </div>
        {dirty ? (
          <Button type="button" className={cn('picker-go pk-go h-auto px-[18px]', touch ? 'min-h-[max(48px,3rem)]' : 'min-h-[max(42px,2.625rem)]')} onClick={save}>{goLabel}</Button>
        ) : (
          <Button type="button" variant="outline" className={cn('pk-go pk-close h-auto px-[18px]', touch ? 'min-h-[max(48px,3rem)]' : 'min-h-[max(42px,2.625rem)]')} onClick={onClose}>{pktr(later ? 'picker.done' : 'picker.skip')}</Button>
        )}
      </div>
      {asking && (
        <div className={cn('pk-ask-wrap fixed inset-0 z-130 flex justify-center bg-black/10 backdrop-blur-xs', touch ? 'items-end' : 'items-center')}>
          <div className={cn('pk-ask bg-popover px-[22px] pt-[22px] text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none', touch ? 'w-full rounded-t-xl pb-[calc(22px+env(safe-area-inset-bottom,0px))]' : 'w-[min(440px,calc(100%-40px))] rounded-xl pb-5')} role="alertdialog" aria-modal="true" aria-labelledby="pk-ask-t" aria-describedby="pk-ask-d" tabIndex={-1} ref={askRef}>
            <h3 id="pk-ask-t" className="pk-ask-t text-heading font-semibold">{later ? pktr('picker.leaveTitleLater') : pktr('picker.leaveTitle', { n: toSeen.length })}</h3>
            <p id="pk-ask-d" className="pk-ask-d mt-2 text-body leading-normal text-muted-foreground">{pktr('picker.leaveText')}</p>
            <div className={cn(DIALOG.actions, 'mt-[18px]')}>
              <Button type="button" className="picker-go h-auto min-h-10" onClick={save}>{goLabel}</Button>
              <Button type="button" variant="outline" className={DIALOG.secondary} onClick={() => { setAsking(false); onClose(); }}>{pktr('picker.leave')}</Button>
              <Button type="button" variant="ghost" className="pk-keep h-auto min-h-[max(42px,2.625rem)] text-muted-foreground" onClick={() => setAsking(false)}>{pktr('picker.keep')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  if (touch) return <window.Sheet onClose={onShellClose} tall className="pk-sheet h-[calc(100dvh-32px-env(safe-area-inset-top,0px))] max-h-none [&_.m-sheet-body]:flex-1 [&_.m-sheet-body]:pb-0" labelledBy="pk-title">{body}</window.Sheet>;
  return <window.ModalDialog onClose={onShellClose} labelledBy="pk-title" className="pk-dialog flex h-[min(calc(100vh-64px),880px)] w-[min(760px,calc(100vw-48px))] flex-col overflow-hidden p-0">{body}</window.ModalDialog>;
}

window.SeenPicker = SeenPicker;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { SeenPicker };
