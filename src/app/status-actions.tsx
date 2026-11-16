// Seen and Watchlist: the two toggles every title carries (Notion "shadcn pass
// 2/5: Spatial canvas, cards and threads"), and the static seen marker shown
// in their place at deep zoom.
//
// Moved out of tracking.tsx so they can be built on the design system: this
// file is listed with `@source` in src/index.css. The buttons are shadcn's outline Button.
//
// The group's own look lives here; each surface places and sizes it through
// `className` (merged with the defaults). The class names kept as hooks: `tsa`, `overlay` / `inline`,
// `loading`, `busy`, `has-error`, `tsa-btn`, `seen` / `watch`, `on`, `pop`,
// `tsa-gap`, `tsa-spin`, `tsa-lab`, `tsa-err`, `tsa-bang`.
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Title } from '../types/catalog';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// On a poster the overlay sits on an image, so it stays a dark glass chip in
// both themes (the `dark:` copies outrank the outline button's own).
const ON_POSTER = /\b(card-tsa|m-card-tsa|m-fp-tsa|g-card-tsa)\b/;
const GLASS = 'border-[#ffffff26] bg-[rgba(10,12,20,0.78)] text-(--on-image-dim) shadow-none backdrop-blur-[6px] hover:border-(--on-image-dim) hover:bg-[rgba(10,12,20,0.92)] hover:text-(--on-image) dark:border-[#ffffff26] dark:bg-[rgba(10,12,20,0.78)] dark:hover:bg-[rgba(10,12,20,0.92)]';
const ON = {
  // Seen is quiet (Notion "Simplify the Spatial cards": with real progress a
  // solid green button on most titles was the loudest colour on screen): a
  // soft tint, a tinted border and the check in the seen colour.
  seen: 'border-[color-mix(in_oklab,var(--seen)_55%,var(--border))] bg-[color-mix(in_oklab,var(--seen)_14%,transparent)] text-(--seen-text) hover:bg-[color-mix(in_oklab,var(--seen)_22%,transparent)] hover:text-(--seen-text) dark:border-[color-mix(in_oklab,var(--seen)_55%,var(--border))] dark:bg-[color-mix(in_oklab,var(--seen)_16%,transparent)] dark:hover:bg-[color-mix(in_oklab,var(--seen)_24%,transparent)]',
  watch: 'border-(--status-watch) bg-(--status-watch) text-(--on-color) hover:bg-(--status-watch) hover:text-(--on-color) dark:border-(--status-watch) dark:bg-(--status-watch) dark:hover:bg-(--status-watch)',
};
// Seen on a poster: the filled seen-green disc with a white check, the
// card's seen mark (Andre, 2026-11-16).
const ON_GLASS_SEEN = 'border-(--seen) bg-(--seen) text-(--seen-foreground) hover:bg-[color-mix(in_oklab,var(--seen)_88%,black)] hover:text-(--seen-foreground) dark:border-(--seen) dark:bg-(--seen) dark:hover:bg-[color-mix(in_oklab,var(--seen)_88%,black)]';
// The button just switched on pops, and a ring in its colour spreads from it
// (Notion V4 Tasks, "Micro-interaction: the Seen check pops in…"); lifted
// above its neighbour so the ring is never hidden. Keyframes: src/index.css.
const POP = 'z-2 animate-[tsa-pop_440ms_cubic-bezier(.2,1.6,.4,1)] after:pointer-events-none after:absolute after:-inset-[2px] after:rounded-[inherit] after:border-2 after:border-(--pop) after:content-[\'\'] after:animate-[tsa-ring_560ms_ease-out_forwards] motion-reduce:animate-none motion-reduce:after:animate-none';
/** The labelled buttons (the details' wider CTAs): a smaller pop and a tight
 *  halo that fades out a few pixels from the edge, instead of the icon
 *  buttons' ring that grows to twice their size. */
const POP_INLINE = 'z-2 animate-[tsa-pop-sm_380ms_cubic-bezier(.2,1.3,.4,1)] after:pointer-events-none after:absolute after:-inset-px after:rounded-[inherit] after:content-[\'\'] after:animate-[tsa-halo_520ms_ease-out_forwards] motion-reduce:animate-none motion-reduce:after:animate-none';

// The saving spinner, on the corner of the button being saved, out of the
// row's layout, so the buttons never move while a mark saves. Published for
// test-micro, which places one exactly as it renders here.
export const TSA_SPIN = 'tsa-spin pointer-events-none absolute -top-[5px] -right-[5px] z-3 size-3 animate-[tsa-spin_700ms_linear_infinite] rounded-full border-2 border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))] border-t-foreground bg-background';

// Toggles, not checkboxes — so <button aria-pressed> rather than <input>.
//
// `variant` is 'overlay' (icon-only, sits on a poster) or 'inline' (icon plus
// text label, for drawers and sheets where there is room).
// `upNext`: the title is Up next (the desktop List's marked row, Notion
// "Titles 2/5"): while it is unseen, Seen is a filled red "Mark seen" button.
export function TitleStatusActions({ title, variant = 'overlay', className, upNext = false }: { title: Title; variant?: 'overlay' | 'inline'; className?: string; upNext?: boolean }) {
  const { states, statusOf, pendingOf, errorOf, toggleSeen, toggleWatchlist, loading } = window.useCollection() as unknown as {
    states: unknown; statusOf: (id: string) => string; pendingOf: (id: string) => boolean; errorOf: (id: string) => string | null;
    toggleSeen: (id: string) => void; toggleWatchlist: (id: string) => void; loading: boolean;
  };
  const I18N = window.MCU_I18N;
  // The button just switched on pops, until its animation ends.
  const [pop, setPop] = React.useState<string | null>(null);
  const status = statusOf(title.id);
  const seen = status === 'seen';
  const listed = status === 'watchlist';
  // `busy` is a write in flight — deliberately NOT disabling, because the write
  // queue exists precisely so that toggling faster than the network settles on
  // the right value. `loading` is the initial load, where the state genuinely
  // isn't known yet, so the controls are inert until it resolves.
  const busy = pendingOf(title.id);
  const error = errorOf(title.id);
  const inline = variant === 'inline';
  const onPoster = !inline && ON_POSTER.test(className || '');
  // Not out yet (and not within a week of release): no Seen button, only the
  // Watchlist one. A title already marked seen keeps it, so it can be
  // unmarked. Overlays keep the empty slot so rows and cards don't shift.
  const offerSeen = seen || window.MCU_canMarkSeen(title);

  // The desktop Card starts a drag on mousedown and then decides "was that a
  // click?" by comparing mousedown/click coordinates. Stopping only the click
  // would still leave the card being dragged out from under the pointer, so
  // both have to be swallowed. Touch is stopped too, because the spatial
  // viewport begins a pan from touchstart.
  const swallow = (e: React.SyntheticEvent) => { e.stopPropagation(); };
  // The saving spinner sits on the corner of the button just pressed (or the
  // first button while the collection loads) instead of after the buttons,
  // where it took room and pushed them aside while a signed-in mark was being
  // saved (Notion V4 Tasks, "Signed in: marking a title briefly pushes the
  // Seen / Watchlist buttons left").
  const [lastKind, setLastKind] = React.useState<string | null>(null);
  const act = (fn: (id: string) => void, kind: 'seen' | 'watch') => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    const from = statusOf(title.id);
    const on = kind === 'seen' ? 'seen' : 'watchlist';
    const to = from === on ? 'none' : on;
    fn(title.id);
    setPop(to === 'none' ? null : kind);
    setLastKind(kind);
    window.MCU_emitStatusChange({ title, from, to, states });
  };

  const firstKind = offerSeen ? 'seen' : 'watch';
  const pressed = lastKind === 'watch' || (lastKind === 'seen' && offerSeen) ? lastKind : firstKind;
  const spinOn = busy ? pressed : loading ? firstKind : null;

  const size = inline
    ? 'h-auto min-h-[max(40px,2.5rem)] gap-[7px] px-2.5 text-label [&_svg]:size-[14px] [&_svg]:flex-[0_0_14px]'
    : 'size-8 p-0 text-muted-foreground [&_svg]:size-[15px]';
  const btn = (kind: 'seen' | 'watch', on: boolean) => cn('tsa-btn relative transition-[color,border-color,background-color,scale] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100',
    size, onPoster && GLASS, on && (onPoster && kind === 'seen' ? ON_GLASS_SEEN : ON[kind]), busy && 'opacity-75', error && 'border-destructive dark:border-destructive',
    kind === 'seen' ? '[--pop:var(--seen)]' : '[--pop:var(--status-watch)]', kind, on && 'on', pop === kind && cn('pop', inline ? POP_INLINE : POP));
  const spinner = <span className={TSA_SPIN} aria-hidden="true"/>;
  // Up next's call to action: the label and the brand fill, until it is seen.
  const markNext = upNext && !seen && !inline;
  const NEXT = 'tsa-next h-[max(34px,2.125rem)] w-auto gap-1.5 border-primary bg-primary px-3 text-label font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:border-primary dark:bg-primary dark:hover:bg-primary/90 [&_svg]:size-[13px]';

  // `flex!`: the hook class `inline` is also Tailwind's display utility.
  // A host's own utilities in `className` win over the defaults here (they are
  // merged); the hook classes go on after, unmerged, because `inline` is also
  // Tailwind's display utility.
  const root = cn('tsa flex! items-center gap-[6px]',
    inline ? 'mt-[10px] flex-wrap gap-1.5' : 'absolute top-1/2 right-[8px] z-3 flex-col [transform:translateY(-50%)]',
    loading && 'pointer-events-none opacity-45', className) + (inline ? ' inline' : ' overlay')
    + (loading ? ' loading' : '') + (busy ? ' busy' : '') + (error ? ' has-error' : '');

  return (
    <div className={root} onMouseDown={swallow} onClick={swallow} onTouchStart={swallow}
         title={error ? tr('status.notSaved', { error }) : undefined}>
      {!offerSeen && !inline && <span className={cn('tsa-btn seen tsa-gap pointer-events-none invisible order-2 flex', size)} aria-hidden="true"/>}
      {offerSeen && <Button
        variant="outline"
        className={cn(btn('seen', seen), markNext && NEXT)}
        onAnimationEnd={(e) => { if (e.animationName === 'tsa-ring' || e.animationName === 'tsa-halo') setPop(null); }}
        disabled={loading}
        aria-busy={loading || busy}
        aria-pressed={loading ? undefined : seen}
        aria-label={tr(loading ? 'status.loadingSeen' : seen ? 'status.unmarkSeenAria' : 'status.markSeenAria', { title: I18N.titleName(title) })}
        title={tr(seen ? 'status.markedSeen' : 'status.markSeenTip')}
        onMouseDown={swallow}
        onClick={act(toggleSeen, 'seen')}
      >
        <window.CheckIcon/>
        {spinOn === 'seen' && spinner}
        {(inline || markNext) && <span className="tsa-lab">{tr(seen ? 'status.seen' : 'status.markSeen')}</span>}
      </Button>}
      <Button
        variant="outline"
        className={btn('watch', listed)}
        onAnimationEnd={(e) => { if (e.animationName === 'tsa-ring' || e.animationName === 'tsa-halo') setPop(null); }}
        disabled={loading}
        aria-busy={loading || busy}
        aria-pressed={loading ? undefined : listed}
        aria-label={tr(loading ? 'status.loadingWatch' : listed ? 'status.removeWatchAria' : 'status.addWatchAria', { title: I18N.titleName(title) })}
        title={tr(listed ? 'status.onWatchTip' : 'status.addWatchTip')}
        onMouseDown={swallow}
        onClick={act(toggleWatchlist, 'watch')}
      >
        <window.BookmarkIcon filled={listed}/>
        {spinOn === 'watch' && spinner}
        {inline && <span className="tsa-lab">{tr(listed ? 'status.onWatch' : 'status.watchlist')}</span>}
      </Button>
      {/* The overlay variant has no room for a message; it carries the red
          treatment plus a tooltip, and the drawer/sheet spells it out. */}
      {error && inline && <span className="tsa-err basis-full text-label text-destructive" role="status">{tr('status.notSaved', { error })}</span>}
      {error && !inline && <span className="tsa-bang flex size-4 items-center justify-center rounded-full bg-destructive text-label in-[.card]:text-card-meta leading-none font-bold text-(--on-color)" role="status" aria-label={tr('status.notSaved', { error })}>!</span>}
    </div>
  );
}

// Non-interactive marker. Used where the controls themselves are too small to
// hit (deep zoom on the spatial canvas) but the state still needs to read.
export function SeenMarker({ seen }: { seen: boolean }) {
  if (!seen) return null;
  return (
    <span className="seen-marker flex size-[26px] items-center justify-center rounded-[7px] bg-(--seen) text-(--seen-foreground) [&_svg]:size-[14px]"
      title={tr('status.seen')} aria-hidden="true"><window.CheckIcon/></span>
  );
}

// ---------------------------------------------------------------------------
// Phones: swipe a row (Notion "Phone lists: swipe a row to mark it seen or add
// it to the Watchlist", Andre 2026-11-16)
// ---------------------------------------------------------------------------

/** A phone list row that slides sideways: right marks the title seen, left
 *  adds it to the Watchlist; on a title already in that state it undoes it.
 *  Past the threshold the action runs on release, through the same toggle as
 *  the buttons (the toast, Undo and sync); short of it the row springs back.
 *  Vertical scrolling wins: the row moves only once the finger has gone
 *  sideways more than down (the layer is `touch-action: pan-y`). With Reduce
 *  motion the row stays put and only the action's color shows. The details
 *  keep Seen and Watchlist, so nothing depends on the gesture. */
export function SwipeRow({ title, className, children }: { title: Title; className?: string; children: React.ReactNode }) {
  const { states, statusOf, toggleSeen, toggleWatchlist, loading } = window.useCollection() as unknown as {
    states: Record<string, string>; statusOf: (id: string) => string;
    toggleSeen: (id: string) => void; toggleWatchlist: (id: string) => void; loading: boolean;
  };
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const swiped = React.useRef(false);
  const [dx, setDx] = React.useState(0);
  const [held, setHeld] = React.useState(false);
  const status = statusOf(title.id);
  const canSeen = status === 'seen' || window.MCU_canMarkSeen(title);
  const limit = () => Math.min(104, (ref.current ? ref.current.offsetWidth : 360) * 0.28);
  const run = (kind: 'seen' | 'watch') => {
    const from = statusOf(title.id);
    const on = kind === 'seen' ? 'seen' : 'watchlist';
    (kind === 'seen' ? toggleSeen : toggleWatchlist)(title.id);
    window.MCU_emitStatusChange({ title, from, to: from === on ? 'none' : on, states });
  };
  // Release commits past the threshold; a canceled gesture (the browser took
  // it over) never does.
  const end = (commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    setHeld(false);
    if (commit && d && d.axis === 'x') {
      swiped.current = true;
      const t = limit();
      if (!loading && dx >= t && canSeen) run('seen');
      else if (!loading && dx <= -t) run('watch');
    }
    setDx(0);
  };
  const reduced = !!(window.MCU_MOTION && window.MCU_MOTION.reduced());
  const past = Math.abs(dx) >= limit();
  const side = dx > 0 ? 'seen' : dx < 0 ? 'watch' : null;
  const undo = side === 'seen' ? status === 'seen' : side === 'watch' ? status === 'watchlist' : false;
  return (
    <div ref={ref} className={cn('swipe-row relative', className)} data-swipe={side || undefined}>
      {side && (
        <div aria-hidden="true" className={cn('swipe-under absolute inset-0 flex items-center rounded-xl px-5 text-label font-semibold',
          side === 'seen' ? 'justify-start bg-(--seen) text-(--seen-foreground)' : 'justify-end bg-(--status-watch) text-(--on-color)',
          !past && 'opacity-70')}>
          <span className={cn('inline-flex items-center gap-2 transition-transform duration-150 [&_svg]:size-5', past && !reduced && 'scale-110')}>
            {side === 'seen' ? <window.CheckIcon/> : <window.BookmarkIcon filled={!undo}/>}
            {tr(side === 'seen' ? (undo ? 'swipe.unseen' : 'swipe.seen') : (undo ? 'swipe.unwatch' : 'swipe.watch'))}
          </span>
        </div>
      )}
      <div className={cn('swipe-layer relative touch-pan-y select-none [&_img]:[-webkit-user-drag:none]', !held && 'transition-transform duration-200 ease-out motion-reduce:transition-none')}
        style={dx && !reduced ? { transform: `translateX(${dx}px)` } : undefined}
        onPointerDown={(e) => { if (e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, axis: null }; swiped.current = false; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const mx = e.clientX - d.x, my = e.clientY - d.y;
          if (!d.axis) {
            if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
            d.axis = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
            if (d.axis === 'y') { drag.current = null; return; }
            setHeld(true);
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the gesture still works without capture */ }
          }
          // No seen side on a title not out yet; past the threshold the row
          // resists, so the commit point can be felt.
          const t = limit();
          let v = mx > 0 && !canSeen ? 0 : mx;
          if (Math.abs(v) > t) v = Math.sign(v) * (t + (Math.abs(v) - t) * 0.35);
          setDx(v);
        }}
        onPointerUp={() => end(true)} onPointerCancel={() => end(false)}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; } }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { TitleStatusActions, SeenMarker, SwipeRow, TSA_SPIN });
