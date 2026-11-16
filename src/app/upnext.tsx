// Up next: the one suggestion of what to watch now. The rule lives in
// tracking.jsx (MCU_nextUp); the app shell (app.jsx) works out the scope and
// hands every surface the same `info`:
//
//   info.result   what MCU_nextUp returned ({ kind: 'next', title, ... }, etc.)
//   info.lead     "Up next" / "Next from your Watchlist" / "Up next for Loki"
//   info.detail   "release order" plus any type, phase or budget filter
//   info.scoped   true when a Watchlist, character or filter narrows it
//   info.watchScope  true on the Watchlist tab
//   info.onOpen(id), info.onHide() (the card's ✕: hides the card for the visit)
//
// One surface shows them: the compact card's row (UpNextMeterRow), the same
// card in the same place on Connections and in Titles, on desktop and phones;
// the list marks the same title in its row. The desktop List's strip went with
// Notion "Titles 3/5", and the phone List's card and the phone Connections
// chip with "Titles 4/5". Seen reuses TitleStatusActions, so marking goes
// through the usual toast, Undo and sync.
//
// On the design system (Notion "shadcn pass 2/5"): this file is listed with
// `@source` in src/index.css, the card is
// shadcn's Card look and the buttons are Buttons. The `un-` class names stay as
// hooks for the QA checks; they carry no V3 styling any more. Keyframes for the slide are in src/index.css.

import React from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { Title, UpNextInfo } from '../types/catalog';

// A poster thumbnail: the art fills the box.
// (Only the first child: the phone card puts its phase badge on the poster too.)
const THUMB = 'block overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';
// The title opens the details; the whole row is the button.
const OPEN = 'un-open flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

const UpNI18N = window.MCU_I18N;
const untr = (key: string, vars?: Record<string, unknown>) => UpNI18N.tr(key, vars);

// "Up next · release order": the explanation every surface shows. `short`
// keeps only "Up next" where room is tight (the Spatial meter); the order and
// filters then move to the tooltip.
function UpNextTag({ info, short = false, className = '' }: { info: UpNextInfo; short?: boolean; className?: string }) {
  return (
    <div className={cn('un-tag text-xs font-medium text-foreground [&_span]:text-muted-foreground', className)}
      title={short ? `${info.lead} · ${info.detail}. ${untr('upnext.rule')}` : untr('upnext.rule')}>
      {info.lead}{!short && <span> · {info.detail}</span>}
    </div>
  );
}

// The × that hides Up next for now, on every surface, until the page is
// reloaded (nothing is stored). It never moves on to another title: closing
// means "not now", not "something else".
function UpNextHide({ info, className = '' }: { info: UpNextInfo; className?: string }) {
  return (
    <Button variant="outline" className={cn('un-hide size-[max(36px,2.25rem)] flex-[0_0_36px] p-0 text-muted-foreground', className)}
      onClick={(e) => { e.stopPropagation(); info.onHide(); }}
      aria-label={untr('upnext.hideAria')} title={untr('upnext.hide')}>
      <svg className="size-[15px]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </Button>
  );
}

// Seen (and Watchlist outside the Watchlist tab) through the usual controls,
// laid out in the row rather than on a poster.
function UpNextStatus({ info, title, variant, className = '' }: { info: UpNextInfo; title: Title; variant?: 'overlay' | 'inline'; className?: string }) {
  return (
    <window.TitleStatusActions title={title} variant={variant}
      className={cn('un-tsa', variant !== 'inline' && 'static flex-row gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(36px,2.25rem)] [&_.tsa-btn:not(.on)]:border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))] [&_.tsa-btn:not(.on)]:bg-muted',
        info.watchScope && 'un-nowatch [&_.tsa-btn.watch]:hidden', className)}/>
  );
}

// The next title slides in and the one just marked slides out (Notion V4
// Tasks, "Micro-interaction: Up next slides to the next title when one is
// marked seen"), in every Up next layout. The leaving copy is inert (no
// clicks, no focus, hidden from screen readers) and shares one grid cell with
// the new one, so nothing reflows; it is dropped when its slide ends, or after
// half a second at most. Reduce motion: an instant swap, as before.
function UpNextSlide({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const latest = React.useRef<React.ReactNode>(children);
  const [shown, setShown] = React.useState(id);
  const [leaving, setLeaving] = React.useState<{ id: string; node: React.ReactNode } | null>(null);
  if (shown !== id) {
    setShown(id);
    const reduced = !!(window.MCU_MOTION && window.MCU_MOTION.reduced());
    setLeaving(reduced ? null : { id: shown, node: latest.current });
  }
  React.useEffect(() => { latest.current = children; });
  React.useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(null), 500);
    return () => clearTimeout(timer);
  }, [leaving]);
  return (
    <div className="un-slide grid min-w-0 flex-[1_1_auto] [&>*]:min-w-0 [&>*]:[grid-area:1/1]">
      {leaving && (
        <div className={cn(className, 'un-leave pointer-events-none animate-[un-out_240ms_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none')} key={'leave:' + leaving.id} aria-hidden="true"
          ref={(el) => { if (el) el.setAttribute('inert', ''); }}
          onAnimationEnd={(e) => { if (e.animationName === 'un-out') setLeaving(null); }}>
          {leaving.node}
        </div>
      )}
      <div className={cn(className, 'un-fade motion-reduce:animate-none', leaving ? 'un-enter animate-[un-slide-in_320ms_cubic-bezier(.2,.8,.2,1)_both]' : 'animate-[un-in_260ms_ease_both]')} key={id}>{children}</div>
    </div>
  );
}

// One row inside the compact All titles card, on Connections and in Titles:
// top right on desktop, docked above the bottom bar on phones (Notion
// "Titles 3/5" and "4/5").
function UpNextMeterRow({ info }: { info: UpNextInfo }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  if (r.kind !== 'next') return null;
  const t = r.title;
  return (
    <section className="un-mrow pointer-events-auto mt-2 flex items-center gap-1.5 border-t border-border pt-2.5 first:mt-0 first:border-t-0 first:pt-0"
      aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
      <UpNextSlide id={t.id} className="un-mrow-body flex min-w-0 flex-1 items-center gap-1.5">
        <button type="button" className={cn(OPEN, 'flex-1 gap-2.5')} onClick={() => info.onOpen(t.id)}>
          <span className={cn('un-mposter h-[54px] w-9 flex-[0_0_36px] rounded-[5px]', THUMB)} aria-hidden="true"><PosterArt title={t}/></span>
          <span className="un-mtext min-w-0 flex-1 text-xs text-muted-foreground">
            <UpNextTag info={info} short className="truncate"/>
            <span className={cn(TITLE, 'mt-[3px] truncate')}>{UpNI18N.titleName(t)}</span>
          </span>
        </button>
        <UpNextStatus info={info} title={t} variant="inline"
          className="un-compact mt-0 flex-nowrap [&_.tsa-btn]:size-[max(36px,2.25rem)] [&_.tsa-btn]:min-h-[max(36px,2.25rem)] [&_.tsa-btn]:justify-center [&_.tsa-btn]:p-0 [&_.tsa-btn.watch]:hidden [&_.tsa-lab]:hidden"/>
        <UpNextHide info={info}/>
      </UpNextSlide>
    </section>
  );
}

// The title, as the card's row sets it.
const TITLE = 'un-title block text-base leading-[1.25] font-semibold tracking-tight text-foreground';

Object.assign(window, { UpNextTag, UpNextHide, UpNextMeterRow });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { UpNextTag, UpNextHide, UpNextMeterRow };
