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
// One surface shows them: the compact card (AllTitlesWidget), the same
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
import { cn } from '@/lib/utils';
import * as B from './banners';
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
    <div className={cn('un-tag text-label font-medium text-foreground [&_span]:text-muted-foreground', className)}
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
    <button type="button" className={cn('un-hide', B.W_CLOSE, className)}
      onClick={(e) => { e.stopPropagation(); info.onHide(); }}
      aria-label={untr('upnext.hideAria')} title={untr('upnext.hide')}>×</button>
  );
}

// Seen (and Watchlist outside the Watchlist tab) through the usual controls,
// laid out in the row rather than on a poster.
function UpNextStatus({ info, title, variant, className = '' }: { info: UpNextInfo; title: Title; variant?: 'overlay' | 'inline'; className?: string }) {
  return (
    <window.TitleStatusActions title={title} variant={variant}
      className={cn('un-tsa', variant !== 'inline' && 'static flex-row gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(36px,2.25rem)] [&_.tsa-btn:not(.on)]:border-(--border-strong) [&_.tsa-btn:not(.on)]:bg-muted',
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

// The compact All titles card, on Connections and in Titles: top right on
// desktop, docked above the bottom bar on phones (Notion "Titles 3/5" and
// "4/5"). The same layout as an open guide's card (B.W_*, Andre 2026-11-16):
// Up next's poster, "All titles · 37/60 · Up next" over its name (a tap opens
// its details, where it is marked seen: no ✓ here) and × in the corner,
// which hides the card for this visit; under them the catalog's progress.
// By Phase has no All titles meter (the phase pills carry it), so the card
// is Up next alone; with everything seen it is the meter alone.
type AllCount = { seen: number; released: number; upcoming?: number };
function AllTitlesWidget({ info, all, label, onClose, collapsed = false, offScreen = null }: {
  info: UpNextInfo | null; all: AllCount | null; label: string; onClose: () => void;
  /** Phone Connections with the Up next card on screen: the header and bar alone (E 5/5). */
  collapsed?: boolean;
  /** Panned away from the Up next card: an arrow pointing to it ("↖ off screen"). */
  offScreen?: string | null;
}) {
  const PosterArt = window.PosterArt;
  const t = info && info.result.kind === 'next' ? info.result.title : null;
  const done = !!all && all.released > 0 && all.seen >= all.released;
  const count = all && <>
    {/* "All titles · 40/60 seen": words, not a bare "40/60 +4"
        (docs/glossary.md). The titles still to come are left to the Titles
        meters, which have the room to say "4 coming". */}
    {/* When the line runs out of room (Portuguese), only the label gives
        way: the count and the Up next tag always show in full. */}
    <span className="pgh-label min-w-0 truncate">{label}</span><span className="shrink-0 whitespace-pre"> · </span><span className={cn('pgh-count shrink-0 tabular-nums', done && 'text-(--seen-text)')}>{untr('progress.count', { seen: all.seen, n: all.released })}</span>
  </>;
  const close = (
    <button type="button" className={cn('un-hide', B.W_CLOSE)} onClick={(e) => { e.stopPropagation(); onClose(); }}
      aria-label={untr('upnext.hideCardAria')} title={untr('upnext.hide')}>×</button>
  );
  return (
    <>
      {t && info && !collapsed ? (
        <section className="un-mrow pointer-events-auto flex min-w-0 items-center gap-2.5" aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
          <UpNextSlide id={t.id} className="un-mrow-body">
            {/* w-full: a button sizes to its text, so without it a long
                kicker (Portuguese) pushes the row past the card instead of
                truncating. */}
            <button type="button" className={cn(OPEN, B.W_OPEN, 'w-full')} onClick={() => info.onOpen(t.id)}>
              <span className={cn('un-mposter', B.W_POSTER, THUMB)} aria-hidden="true"><PosterArt title={t}/></span>
              <span className={cn('un-mtext', B.W_TEXT)}>
                <span className={cn(B.W_KICKER, 'flex min-w-0')}>
                  {count}{count && <span className="shrink-0 whitespace-pre"> · </span>}
                  <span className="un-tag shrink-0" title={`${info.lead} · ${info.detail}. ${untr('upnext.rule')}`}>{info.lead}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={cn('un-title min-w-0', B.W_TITLE_2)} title={UpNI18N.titleName(t)}>{UpNI18N.titleName(t)}</span>
                  {offScreen && <span className="un-off inline-flex flex-none items-center gap-0.5 rounded-full bg-(--brand)/10 px-1.5 py-px text-label font-semibold whitespace-nowrap text-(--brand)">
                    <span aria-hidden="true">{offScreen}</span>{untr('upnext.offScreen')}</span>}
                </span>
              </span>
            </button>
          </UpNextSlide>
          {close}
        </section>
      ) : (
        <div className={cn(B.W_ROW, 'pointer-events-auto')}>
          <span className={cn(B.W_TITLE, 'flex min-w-0 flex-1')}>{count}</span>
          {close}
        </div>
      )}
      {all && all.released > 0 && (
        <div className={cn(B.W_FOOT, 'pgh pointer-events-auto', done && 'done')} role="img"
          aria-label={untr('progress.seen', { seen: all.seen, n: all.released })}>
          <span className={B.W_BAR}><span className={cn('pgh-fill block h-full rounded-full transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none', done ? 'bg-(--progress-done)' : 'bg-(--progress)')} style={{ width: Math.round(all.seen / all.released * 100) + '%' }}/></span>
        </div>
      )}
    </>
  );
}

Object.assign(window, { UpNextTag, UpNextHide, AllTitlesWidget });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { UpNextTag, UpNextHide, AllTitlesWidget };
