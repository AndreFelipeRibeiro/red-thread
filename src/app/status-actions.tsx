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
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { Title } from '../types/catalog';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// On a poster the overlay sits on an image, so it stays a dark glass chip in
// both themes (the `dark:` copies outrank the outline button's own).
const ON_POSTER = /\b(card-tsa|m-card-tsa|m-fp-tsa|g-card-tsa)\b/;
const GLASS = 'border-[#ffffff26] bg-[rgba(10,12,20,0.78)] text-(--on-image-dim) shadow-none backdrop-blur-[6px] hover:border-(--on-image-dim) hover:bg-[rgba(10,12,20,0.92)] hover:text-(--on-image) dark:border-[#ffffff26] dark:bg-[rgba(10,12,20,0.78)] dark:hover:bg-[rgba(10,12,20,0.92)]';
const ON = {
  seen: 'border-(--status-seen) bg-(--status-seen) text-(--on-color) hover:bg-(--status-seen) hover:text-(--on-color) dark:border-(--status-seen) dark:bg-(--status-seen) dark:hover:bg-(--status-seen)',
  watch: 'border-(--status-watch) bg-(--status-watch) text-(--on-color) hover:bg-(--status-watch) hover:text-(--on-color) dark:border-(--status-watch) dark:bg-(--status-watch) dark:hover:bg-(--status-watch)',
};
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
export function TitleStatusActions({ title, variant = 'overlay', className }: { title: Title; variant?: 'overlay' | 'inline'; className?: string }) {
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
    ? 'h-auto min-h-[max(40px,2.5rem)] gap-[7px] px-2.5 text-xs [&_svg]:size-[14px] [&_svg]:flex-[0_0_14px]'
    : 'size-8 p-0 text-muted-foreground [&_svg]:size-[15px]';
  const btn = (kind: 'seen' | 'watch', on: boolean) => cn('tsa-btn relative transition-[color,border-color,background-color,scale] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100',
    size, onPoster && GLASS, on && ON[kind], busy && 'opacity-75', error && 'border-destructive dark:border-destructive',
    kind === 'seen' ? '[--pop:var(--status-seen)]' : '[--pop:var(--status-watch)]', kind, on && 'on', pop === kind && cn('pop', inline ? POP_INLINE : POP));
  const spinner = <span className={TSA_SPIN} aria-hidden="true"/>;

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
        className={btn('seen', seen)}
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
        {inline && <span className="tsa-lab">{tr(seen ? 'status.seen' : 'status.markSeen')}</span>}
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
      {error && inline && <span className="tsa-err basis-full text-xs text-destructive" role="status">{tr('status.notSaved', { error })}</span>}
      {error && !inline && <span className="tsa-bang flex size-4 items-center justify-center rounded-full bg-destructive text-xs in-[.card]:text-[11px] leading-none font-bold text-(--on-color)" role="status" aria-label={tr('status.notSaved', { error })}>!</span>}
    </div>
  );
}

// Non-interactive marker. Used where the controls themselves are too small to
// hit (deep zoom on the spatial canvas) but the state still needs to read.
export function SeenMarker({ seen }: { seen: boolean }) {
  if (!seen) return null;
  return (
    <span className="seen-marker flex size-[26px] items-center justify-center rounded-[7px] bg-(--status-seen) text-(--on-color) [&_svg]:size-[14px]"
      title={tr('status.seen')} aria-hidden="true"><window.CheckIcon/></span>
  );
}

Object.assign(window, { TitleStatusActions, SeenMarker, TSA_SPIN });
