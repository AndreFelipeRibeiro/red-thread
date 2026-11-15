// Up next: the one suggestion of what to watch now. The rule lives in
// tracking.jsx (MCU_nextUp); the app shell (app.jsx) works out the scope and
// hands every surface the same `info`:
//
//   info.result   what MCU_nextUp returned ({ kind: 'next', title, ... }, etc.)
//   info.lead     "Up next" / "Next from your Watchlist" / "Up next for Loki"
//   info.detail   "release order" plus any type, phase or budget filter
//   info.scoped   true when a Watchlist, character or filter narrows it
//   info.watchScope  true on the Watchlist tab
//   info.onOpen(id), info.onHide(), info.onShowAll()
//
// Each surface places these pieces its own way (phone List row and Grid card,
// desktop List strip, desktop Spatial meter row, phone Spatial chip), but the
// words and actions are the same everywhere. Seen and Watchlist reuse
// TitleStatusActions, so marking goes through the usual toast, Undo and sync.
//
// On the design system (Notion "shadcn pass 2/5"): this file is listed with
// `@source` in src/index.css, the card is
// shadcn's Card look and the buttons are Buttons. The `un-` class names stay as
// hooks for the QA checks and the phone lists (`un-inline`); they carry no V3
// styling any more. Keyframes for the slide are in src/index.css.

import React from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { Title, UpNextInfo, UpNextWithTitle } from '../types/catalog';

// A poster thumbnail: the art fills the box.
// (Only the first child: the phone card puts its phase badge on the poster too.)
const THUMB = 'block overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';
// The card around the phone and List layouts.
const CARD = 'rounded-xl border border-border bg-card text-card-foreground shadow-sm';
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

// The states with no title to suggest. One component for the phone lists and
// the desktop List strip; `strip` lays it out in a row.
function UpNextState({ info, strip = false }: { info: UpNextInfo; strip?: boolean }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  let head = null, sub = null, arrival = null, action = null;
  if (r.kind === 'caughtUp') {
    head = untr('upnext.caughtUp');
    sub = untr(info.scoped ? 'upnext.caughtUpSubScoped' : 'upnext.caughtUpSub');
    arrival = r.upcoming;
  } else if (r.kind === 'notOut') {
    head = untr(info.watchScope ? 'upnext.notOutWatch' : 'upnext.notOut');
    arrival = r.upcoming;
  } else if (r.kind === 'allSeen') {
    head = untr('upnext.allSeen');
  } else if (r.kind === 'empty' && info.watchScope) {
    head = untr('upnext.watchEmpty');
  } else {
    return null;
  }
  if (info.watchScope && (r.kind === 'empty' || r.kind === 'notOut')) {
    action = <Button variant="outline" className={cn('un-btn h-auto min-h-[max(36px,2.25rem)] px-3.5 text-xs font-semibold', strip ? 'mt-0' : 'mt-[11px]')} onClick={info.onShowAll}>{untr('upnext.showAll')}</Button>;
  }
  const done = r.kind === 'caughtUp' || r.kind === 'allSeen';
  return (
    <section className={cn('un-card un-state relative', CARD, strip ? 'strip flex items-center gap-4 border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))] px-3.5 py-3 shadow-none' : 'p-3')}
      aria-label={untr('upnext.label')}>
      <UpNextHide info={info} className={cn('un-state-hide size-[max(32px,2rem)] basis-[32px]', strip ? 'static ml-auto' : 'absolute top-2 right-2')}/>
      <div className={cn('un-tag text-xs font-medium [&_span]:text-muted-foreground', done ? 'done flex items-center gap-1.5 text-(--status-seen-text) [&_svg]:size-3' : 'text-foreground', strip && 'flex-[0_0_128px]')}
        title={untr('upnext.rule')}>
        {done && <window.CheckIcon/>}{info.lead}{!done && <span> · {info.detail}</span>}
      </div>
      <div className={cn('un-state-main', strip && 'flex flex-1 flex-wrap items-center gap-4')}>
        <div className="un-state-text">
          <div className={cn('un-head text-base font-bold text-foreground', !strip && 'mt-1.5')}>{head}</div>
          {sub && <div className="un-sub mt-[3px] text-xs leading-[1.45] text-muted-foreground">{sub}</div>}
        </div>
        {arrival && (
          <button type="button" onClick={() => info.onOpen(arrival.id)}
            className={cn('un-arrival flex cursor-pointer items-center gap-[11px] rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              strip ? 'm-0 w-auto border-l border-border pl-4' : 'mt-3 w-full border-t border-border pt-3')}>
            <span className={cn('un-arrival-poster h-[54px] w-9 flex-[0_0_36px] rounded-[5px]', THUMB)} aria-hidden="true"><PosterArt title={arrival}/></span>
            <span className="un-arrival-text flex min-w-0 flex-col">
              <span className="un-kicker text-xs font-medium text-muted-foreground">{untr('upnext.nextArrival')}</span>
              <span className="un-arrival-title mt-[3px] text-base font-semibold">{UpNI18N.titleName(arrival)}</span>
              <window.ReleaseLine title={arrival} className="un-arrival-release mt-[3px] text-xs"/>
            </span>
          </button>
        )}
        {action}
      </div>
    </section>
  );
}

// Meta line shared by the cards: year, budget and, in story order, the note
// that explains an unusual pick (an anthology, another universe).
function UpNextNote({ title }: { title: Title }) {
  const note = UpNI18N.storyNote(title);
  if (!note) return null;
  return <div className="un-note mt-[5px] [&_.story-year]:text-(length:--fs-xs) [&_.story-year]:text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]"><window.StoryYear title={title} detail/></div>;
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

// Phones (List and Grid): a full-width card at the top of the list.
function UpNextCard({ info }: { info: UpNextWithTitle }) {
  const PosterArt = window.PosterArt;
  const t = info.result.title;
  return (
    <section className={cn('un-card un-gcard p-3', CARD)} data-title-id={t.id} aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
      <UpNextSlide id={t.id} className="un-gcard-body">
        <button type="button" className={cn(OPEN, 'w-full items-start')} onClick={() => info.onOpen(t.id)}>
          <span className={cn('un-gposter relative h-[108px] w-[72px] flex-[0_0_72px] rounded-lg', THUMB)} aria-hidden="true">
            <PosterArt title={t}/>
            <window.PhaseBadge phase={t.phase} className="top-1.5 left-1.5"/>
          </span>
          <span className="un-gtext flex min-w-0 flex-1 flex-col [&_.m-scores]:mt-[7px]">
            <UpNextTag info={info}/>
            <span className={cn(TITLE, 'mt-[5px]')}>{UpNI18N.titleName(t)}</span>
            <span className={META}>{t.year}{t.budget != null ? ' · ' + UpNI18N.budget(t.budget) : ''}</span>
            <UpNextNote title={t}/>
            <window.ScoreBadges title={t}/>
          </span>
        </button>
        <div className="un-actions mt-2.5 ml-[84px] flex items-center gap-1.5">
          <UpNextStatus info={info} title={t}/>
          <UpNextHide info={info} className="border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))]"/>
        </div>
      </UpNextSlide>
    </section>
  );
}

// Desktop List: a strip above the list, which does not fold seen titles, so
// the suggestion can be far down the table.
function UpNextStrip({ info }: { info: UpNextInfo }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  if (r.kind !== 'next') return <div className={WRAP}><UpNextState info={info} strip/></div>;
  const t = r.title;
  return (
    <div className={WRAP}>
      <section className={cn('un-card un-strip flex items-center gap-4 px-3.5 py-3 shadow-none', CARD)} aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
        <div className="un-strip-label flex-[0_0_128px] text-xs leading-[1.5] font-medium text-foreground [&_span]:block [&_span]:text-muted-foreground" title={untr('upnext.rule')}>{info.lead}<span>{info.detail}</span></div>
        <UpNextSlide id={t.id} className="un-strip-body flex min-w-0 flex-1 items-center gap-2.5">
          <button type="button" className={cn(OPEN, 'flex-1')} onClick={() => info.onOpen(t.id)}>
            <span className={cn('un-sposter h-[72px] w-12 flex-[0_0_48px] rounded-md', THUMB)} aria-hidden="true"><PosterArt title={t}/></span>
            <span className="un-stext min-w-0">
              <span className={TITLE}>{UpNI18N.titleName(t)}</span>
              <span className={META}>
                {UpNI18N.upper(untr(t.type === 'film' ? 'type.film.one' : 'type.series.one'))} · <span style={{ color: window.MPHASE_COLORS[t.phase] }}>{UpNI18N.upper(untr('phase.label', { n: t.phase }))}</span> · {t.year} · {untr('upnext.rank', { n: r.rank, total: r.released })}
              </span>
              <UpNextNote title={t}/>
            </span>
          </button>
          <UpNextStatus info={info} title={t} variant="inline" className="mt-0 flex-nowrap"/>
          <UpNextHide info={info} className="size-[max(34px,2.125rem)] basis-[34px]"/>
        </UpNextSlide>
      </section>
    </div>
  );
}

// Desktop Spatial: one row inside the floating All titles meter.
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

// Phone Spatial: a chip above the gesture hint.
function UpNextChip({ info }: { info: UpNextInfo }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  if (r.kind !== 'next') return null;
  const t = r.title;
  return (
    <section aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}
      className={cn('un-chip absolute inset-x-3.5 bottom-3 z-21 rounded-[14px] border border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))] bg-background/96 py-1 pr-1 pl-3',
        'shadow-[0_12px_30px_rgba(0,0,0,.5)] not-dark:shadow-[0_1px_2px_rgb(0_0_0/.06),0_10px_28px_-12px_rgb(0_0_0/.2)]',
        // Above a guide's or character's pill; tablets have no gesture hint.
        '[.m-main.has-pill_&]:bottom-[76px] [.app.touch.tablet_&]:bottom-[calc(12px+env(safe-area-inset-bottom,0px))]')}>
      <UpNextSlide id={t.id} className="un-chip-body flex items-center gap-1">
        <button type="button" className={cn(OPEN, 'min-h-[max(44px,2.75rem)] flex-1 gap-[9px]')} onClick={() => info.onOpen(t.id)}>
          <span className={cn('un-cposter h-[39px] w-[26px] flex-[0_0_26px] rounded-[4px]', THUMB)} aria-hidden="true"><PosterArt title={t}/></span>
          <span className="un-ctext min-w-0">
            <UpNextTag info={info} className="truncate"/>
            <span className={cn(TITLE, 'mt-0.5 truncate text-sm')}>{UpNI18N.titleName(t)}</span>
          </span>
          <span className="un-chev ml-auto pr-1.5 text-2xl text-muted-foreground" aria-hidden="true">›</span>
        </button>
        <UpNextStatus info={info} title={t} className="un-chip-tsa [&_.tsa-btn]:size-[max(44px,2.75rem)]! [&_.tsa-btn]:rounded-[10px] [&_.tsa-btn.watch]:hidden"/>
      </UpNextSlide>
    </section>
  );
}

// The title and the meta line, as every layout sets them.
const TITLE = 'un-title block text-base leading-[1.25] font-semibold tracking-tight text-foreground';
const META = 'un-meta mt-1 block text-xs text-muted-foreground tabular-nums';
// The desktop List's strip, centred over the table.
const WRAP = 'un-strip-wrap mx-auto mb-3.5 max-w-[1480px]';

Object.assign(window, { UpNextTag, UpNextHide, UpNextState, UpNextCard, UpNextStrip, UpNextMeterRow, UpNextChip, UpNextNote });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { UpNextTag, UpNextHide, UpNextState, UpNextCard, UpNextStrip,
  UpNextMeterRow, UpNextChip, UpNextNote };
