// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 17 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DIALOG } from './about';

// On the design system since Notion "shadcn pass 5/5" (listed with `@source`
// in src/index.css): ModalDialog / Sheet with the shared dialog recipes,
// shadcn's Buttons, posters as before. Hook classes kept for the app and the
// QA checks: `pk`, `pk-*`, `picker-go`, `nudge-later`, `on`, `un`.

// "What have you seen?" (V3 Tasks, First-visit picker): a poster grid of every
// released title, grouped by phase in release order, to mark many as seen in
// one go. Offered by the first-visit welcome, the account menu/sheet and the
// Seen tab's empty state (window.MCU_openPicker, set in app.jsx).
//
// Picks live in this component until Save; nothing else is stored. Titles
// already seen start ticked (with a "Seen" label) and can be unticked, which
// marks them unseen as part of the same change. Save goes through
// applyPicks (tracking.jsx): one change, one toast with Undo, one celebration
// at most, one write per title when signed in. No extra confirmation: the
// button names the numbers. Closing with unsaved picks asks first.
// A full-height sheet on phones, a wide dialog on desktop.

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
    return Object.keys(by).map(Number).sort((a, b) => a - b).map(p => ({ phase: p, titles: by[p] }));
  }, []);
  // What was seen when the picker opened; picks start from that.
  const initial = React.useMemo(() => new Set(groups.flatMap(g => g.titles).filter(t => states[t.id] === 'seen').map(t => t.id)), []);
  const later = initial.size > 0;
  const [picks, setPicks] = React.useState(() => new Set(initial));
  const [asking, setAsking] = React.useState(false);
  const askRef = React.useRef(null);

  const toSeen = [...picks].filter(id => !initial.has(id));
  const toUnseen = [...initial].filter(id => !picks.has(id));
  const dirty = toSeen.length + toUnseen.length > 0;
  const hasWatch = groups.some(g => g.titles.some(t => states[t.id] === 'watchlist'));

  const toggle = (id) => setPicks(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setPhase = (ids, on) => setPicks(prev => { const n = new Set(prev); ids.forEach(id => (on ? n.add(id) : n.delete(id))); return n; });

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

  // While the leave prompt is up, the grid and footer behind it are inert
  // and the prompt takes focus.
  const gridRef = React.useRef(null);
  const footRef = React.useRef(null);
  React.useEffect(() => {
    [gridRef.current, footRef.current].forEach(el => { if (el) el.inert = asking; });
    if (asking && askRef.current) askRef.current.focus();
  }, [asking]);

  const goLabel = later ? pktr('picker.save') : pktr('picker.go', { n: toSeen.length });
  const countLine = later ? (
    <>
      <span><b>{toSeen.length}</b> {pktr('picker.toSeenWord', { n: toSeen.length })}</span>
      {toUnseen.length > 0 && <span><b>{toUnseen.length}</b> {pktr('picker.toUnseenWord', { n: toUnseen.length })}</span>}
    </>
  ) : <span><b>{toSeen.length}</b> {pktr('picker.pickedWord', { n: toSeen.length })}</span>;

  const body = (
    <div className={cn('pk relative text-body text-foreground', touch ? 'touch' : 'flex min-h-0 flex-1 flex-col')}>
      <div className={cn('pk-head', touch ? 'pt-1 pr-11' : 'border-b pt-[22px] pr-16 pb-4 pl-[26px]')}>
        <h2 id="pk-title" className={'pk-title text-title font-semibold tracking-tight'}>{pktr('picker.title')}</h2>
        <p className="pk-sub mt-1 text-body leading-normal text-muted-foreground">{later ? pktr('picker.subLater') : pktr(touch ? 'picker.subTouch' : 'picker.sub')}</p>
        {hasWatch && <p className="pk-note mt-3 flex items-start gap-[9px] rounded-lg border bg-muted/50 px-3 py-2.5 text-body leading-[1.45] text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))] [&_svg]:mt-0.5 [&_svg]:size-[13px] [&_svg]:flex-none [&_svg]:text-(--status-watch)"><window.BookmarkIcon filled/><span>{pktr('picker.watchNote')}</span></p>}
      </div>
      <div className={cn('pk-body', touch ? 'pb-4' : 'min-h-0 flex-1 overflow-y-auto px-[26px] pb-5')} ref={gridRef}>
        {groups.map(g => {
          const ids = g.titles.map(t => t.id);
          const n = ids.filter(id => picks.has(id)).length;
          const all = n === ids.length;
          const name = pktr('phase.label', { n: g.phase });
          const action = all ? 'clear' : n > 0 && later ? 'rest' : 'all';
          return (
            <section key={g.phase} className="pk-phase" aria-labelledby={`pk-ph-${g.phase}`}>
              <div className="pk-ph flex items-center gap-3 pt-4 pb-[9px]">
                <h3 id={`pk-ph-${g.phase}`} className="pk-pl flex-1 text-label font-medium text-muted-foreground">{PkI18N.upper(name)}<span className="ml-2 text-caption tabular-nums">{n}/{ids.length}</span></h3>
                <Button type="button" variant={all ? 'ghost' : 'outline'} size="sm" className={cn('pk-pa', all && 'clr text-muted-foreground')} onClick={() => setPhase(ids, !all)}
                  aria-label={pktr(action === 'clear' ? 'picker.clearAria' : action === 'rest' ? 'picker.restAria' : 'picker.allAria', { group: name })}>
                  {pktr(action === 'clear' ? 'picker.clear' : action === 'rest' ? 'picker.rest' : 'picker.all')}
                </Button>
              </div>
              <div className={cn('pk-grid grid', touch ? 'grid-cols-4 gap-2' : 'grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5')}>
                {g.titles.map(t => {
                  const on = picks.has(t.id);
                  const had = initial.has(t.id);
                  const watch = states[t.id] === 'watchlist';
                  const name = PkI18N.titleName(t);
                  const label = had && !on ? pktr('picker.ariaUnmark', { title: name })
                    : had ? pktr('picker.ariaSeen', { title: name })
                    : watch ? pktr('picker.ariaWatch', { title: name }) : name;
                  return (
                    <button key={t.id} type="button" data-pick={t.id} aria-pressed={on} aria-label={label}
                      className={cn('pk-p relative aspect-[2/3] cursor-pointer overflow-hidden rounded-lg bg-muted text-left text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
                        on && 'on shadow-[0_0_0_2px_color-mix(in_oklab,var(--seen)_75%,transparent)]', had && !on && 'un shadow-[0_0_0_2px_var(--status-watch)]')} onClick={() => toggle(t.id)}>
                      <span className={cn('pk-art absolute inset-0 *:block *:size-full [&_img]:object-cover [&_svg]:size-full', had && !on && '[filter:saturate(.4)_brightness(.6)]')} aria-hidden="true"><PickPoster title={t}/></span>
                      <span className="pk-name absolute inset-x-0 bottom-0 line-clamp-3 bg-linear-to-b from-transparent to-[rgba(5,6,10,.92)] to-55% px-[7px] pt-[22px] pb-1.5 text-caption leading-[1.2] font-bold [text-shadow:0_1px_2px_rgba(0,0,0,.6)]" aria-hidden="true">{name}</span>
                      <span className={cn('pk-tick absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full border-[1.5px] border-white/75 bg-[rgba(10,12,20,.5)] text-[#0a0c14] [&_svg]:size-3', on && 'on border-(--seen) bg-(--seen) text-(--seen-foreground)')} aria-hidden="true">{on && <window.CheckIcon/>}</span>
                      {had && <span className={cn('pk-tag absolute top-1.5 left-1.5 rounded-[3px] bg-[rgba(10,12,20,.85)] px-1 py-0.5 text-caption font-bold tracking-[.08em] uppercase', on ? 'text-(--on-image)' : 'ul text-[#f0c890]')} aria-hidden="true">{pktr(on ? 'picker.seenTag' : 'picker.unmarkTag')}</span>}
                      {!had && watch && !on && <span className="pk-wl absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-[5px] bg-[rgba(10,12,20,.8)] text-[#d4a05a] [&_svg]:size-[11px]" aria-hidden="true"><window.BookmarkIcon filled/></span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div ref={footRef} className={cn('pk-foot flex items-center gap-3 border-t bg-popover', touch ? 'sticky bottom-0 -mx-[18px] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))]' : 'py-3.5 pr-5 pl-[26px]')}>
        <div className="pk-count min-w-0 flex-1 text-body leading-[1.35] text-muted-foreground [&_b]:text-heading [&_b]:text-foreground [&>span]:block" role="status" aria-live="polite">{countLine}</div>
        {!touch && <Button type="button" variant="outline" className={cn(DIALOG.secondary, 'pk-skip px-4')} onClick={onShellClose}>{pktr(later ? 'picker.cancel' : 'picker.skip')}</Button>}
        <Button type="button" className={cn('picker-go pk-go h-auto px-[18px]', touch ? 'min-h-[max(48px,3rem)]' : 'min-h-[max(42px,2.625rem)]')} disabled={!dirty} onClick={save}>{goLabel}</Button>
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
  if (touch) return <window.Sheet onClose={onShellClose} tall className="pk-sheet h-[calc(100dvh-24px)] max-h-none [&_.m-sheet-body]:flex-1 [&_.m-sheet-body]:pb-0" label={pktr('picker.title')}>{body}</window.Sheet>;
  return <window.ModalDialog onClose={onShellClose} labelledBy="pk-title" className="pk-dialog flex h-[calc(100vh-64px)] w-[min(1000px,calc(100vw-48px))] flex-col overflow-hidden p-0">{body}</window.ModalDialog>;
}

window.SeenPicker = SeenPicker;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { SeenPicker };
