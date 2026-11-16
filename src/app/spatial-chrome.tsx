// What floats over the Spatial canvas (Notion "shadcn pass 2/5: Spatial
// canvas, cards and threads"): the zoom control, the band labels over each
// row, the whole-catalogue meter, the note shown when nothing matches, and the
// tooltip for a hovered thread.
//
// Moved out of app.tsx so they can be built on the design system: this file is
// listed with `@source` in src/index.css. Same content, same places; the app
// shell still decides when each shows and hands over what it needs.
//
// Class names the canvas code, the Escape ladder and the QA checks read are
// kept as hooks (`zoom-ctl`, `zoom-btn`, `zoom-val`, `band-label`,
// `spatial-overall`, `spatial-empty`, `line-tooltip`, `rest`, `touch`…); they
// carry no V3 styling any more. Inside the canvas (band labels) sizes stay in
// pixels, as the canvas has its own zoom; nothing here uses backdrop-filter.
import React from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// A card floating over the canvas: the band labels, the meter, the empty note.
const FLOAT = 'border border-border bg-background/95 shadow-sm';

/** − / value / +, bottom-right on desktop (clear of the open drawer) and
 *  top-right on phones, where it rests hidden and shows while zooming. The
 *  value is a button: a double-click (desktop) or a tap (phone) types a zoom. */
export function ZoomControl({ scale, min, max, touch, rest, edit, onEdit, onCommit, onCancel, onStep }: {
  scale: number; min: number; max: number; touch: boolean; rest: boolean;
  edit: string | null; onEdit: (v: string | null) => void; onCommit: () => void; onCancel: () => void;
  onStep: (factor: number) => void;
}) {
  const btn = cn('zoom-btn h-auto rounded-none border-0 p-0 leading-none text-muted-foreground shadow-none hover:bg-muted hover:text-foreground focus-visible:ring-inset disabled:opacity-30 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100',
    touch ? 'size-[max(40px,2.5rem)] text-xl' : 'w-6 text-base');
  const val = cn('zoom-val min-w-12 border-x border-border px-1 py-[5px] text-center text-xs text-muted-foreground tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
    touch && 'h-[max(40px,2.5rem)] min-w-[54px]');
  const start = String(Math.round(scale * 100));
  return (
    <div className={cn('zoom-ctl absolute flex items-stretch gap-px overflow-hidden rounded-md border border-border bg-background shadow-xs dark:border-input dark:bg-input/30',
      touch
        ? 'touch top-3 right-3 z-22 rounded-lg transition-opacity duration-250 motion-reduce:transition-none'
        : 'right-4 bottom-4 transition-[right] duration-360 ease-[cubic-bezier(.2,.8,.2,1)] [.app:not(.touch).drawer-open_&]:right-[396px]',
      touch && rest && 'rest pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100')}>
      <Button variant="ghost" className={btn} onClick={() => onStep(1 / 1.15)} disabled={scale <= min + 1e-4} aria-label={tr('canvas.zoomOut')}>&minus;</Button>
      {edit != null
        ? <input className={cn(val, 'edit w-12 bg-foreground/6 text-foreground', touch && 'w-[54px] text-lg')} autoFocus value={edit} inputMode="decimal"
            onChange={(e) => onEdit(e.target.value)} onBlur={onCommit}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}/>
        : <button type="button" className={cn(val, 'cursor-pointer hover:text-foreground')}
            onClick={touch ? () => onEdit(start) : undefined}
            onDoubleClick={touch ? undefined : () => onEdit(start)}
            title={tr(touch ? 'canvas.zoomTypeTouch' : 'canvas.zoomTypeDesktop')}>{start}%</button>}
      <Button variant="ghost" className={btn} onClick={() => onStep(1.15)} disabled={scale >= max - 1e-4} aria-label={tr('canvas.zoomIn')}>+</Button>
    </div>
  );
}

/** A row's name over the Release (phase) and Chronological (era) timelines,
 *  with its progress meter where there is one. In canvas pixels. The labels
 *  wait for the cards after a new layout, then fade in with a small rise
 *  (`lines-settling` / `bands-settling` on the canvas). */
export function BandLabel({ x, y, phase, color, plain, touch, children }: {
  x: number; y: number; phase?: number | null; color?: string; plain: boolean; touch: boolean; children: React.ReactNode;
}) {
  return (
    <div className={cn('band-label pointer-events-none absolute top-0 left-0 z-1 rounded-lg text-sm font-semibold tracking-tight whitespace-nowrap', FLOAT,
      touch ? 'w-[240px] px-[11px] pt-[7px] pb-[8px]' : 'w-[420px] px-[13px] pt-[8px] pb-[9px]', plain && 'plain w-auto',
      phase ? 'phase text-(--band)' : 'text-muted-foreground',
      '[transition:opacity_320ms_ease_60ms,top_420ms_cubic-bezier(.2,.8,.2,1)_60ms] motion-reduce:[transition:opacity_200ms_ease]',
      '[.canvas.lines-settling_&]:top-[10px] [.canvas.lines-settling_&]:opacity-0 [.canvas.lines-settling_&]:transition-none [.canvas.bands-settling_&]:top-[10px] [.canvas.bands-settling_&]:opacity-0 [.canvas.bands-settling_&]:transition-none',
      'motion-reduce:[.canvas.lines-settling_&]:top-0 motion-reduce:[.canvas.bands-settling_&]:top-0')}
      style={{ transform: `translate(${x}px, ${y}px)`, ...(phase && color ? { '--band': color } : {}) } as React.CSSProperties}>
      {children}
    </div>
  );
}

/** The compact card: All titles with its bar (every order but By Phase), then
 *  Up next with ✓ and ✕. The same card in the same place on Connections and
 *  in Titles (Andre, 2026-11-15): top right on desktop, docked above the
 *  bottom bar on phones (Notion "Titles 4/5"), where it is within thumb reach.
 *  `floating`: desktop, placed top right of the canvas; off, the host places
 *  it (the desktop Titles list pins it to its own top-right corner).
 *  On phones it publishes the room it takes as --dock-h on the main area, as
 *  a guide's dock does, so the list's last row scrolls clear of it. */
export function SpatialOverall({ touch, floating = true, children }: { touch: boolean; floating?: boolean; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const main = touch && el ? el.closest<HTMLElement>('.m-main') : null;
    if (!el || !main) return undefined;
    const set = () => main.style.setProperty('--dock-h', Math.ceil(el.offsetHeight + (parseFloat(getComputedStyle(el).bottom) || 0)) + 'px');
    set();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(set);
    if (ro) ro.observe(el);
    return () => { if (ro) ro.disconnect(); main.style.removeProperty('--dock-h'); };
  }, [touch]);
  return (
    <div ref={ref} className={cn('spatial-overall pointer-events-none z-40 rounded-xl px-[13px] pt-[8px] pb-[9px] text-sm font-semibold tracking-tight text-foreground', FLOAT,
      // Desktop: the same card and the floating chrome's small shadow, on
      // Connections and in Titles.
      !touch && (floating ? 'absolute top-3.5 right-4 w-[300px]' : 'w-[300px]'),
      // Phones: docked over the bottom of the main area, the full width less
      // the gutters, with 44px targets for ✓ and ✕.
      touch && 'docked absolute inset-x-3 bottom-3 w-auto bg-background pr-2 min-[600px]:inset-x-5 [&_.tsa-btn]:size-[max(44px,2.75rem)]! [&_.tsa-btn]:min-h-[max(44px,2.75rem)]! [&_.un-hide]:size-[max(44px,2.75rem)] [&_.un-hide]:flex-[0_0_44px]')}>
      {children}
    </div>
  );
}

/** Nothing matches: say so and offer the one action that brings titles back,
 *  instead of an empty canvas. Events stop here so the button never starts a
 *  pan or a background tap. */
export function SpatialEmpty({ actionLabel, onAction }: { actionLabel: string | null; onAction: () => void }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className={cn('spatial-empty absolute top-1/2 left-1/2 z-30 w-max max-w-[min(360px,calc(100%-32px))] -translate-1/2 rounded-xl px-6 py-[22px] text-center', FLOAT)}
      role="status" onMouseDown={stop} onTouchStart={stop} onTouchEnd={stop} onClick={stop}>
      <div className="spatial-empty-t text-base font-semibold text-foreground">{tr('empty.title')}</div>
      <div className="spatial-empty-s mt-1.5 text-sm leading-[1.4] text-muted-foreground">{tr('empty.sub')}</div>
      {actionLabel && <Button variant="outline" className="spatial-empty-btn mt-3.5" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

/** The two titles a hovered thread joins and the characters they share.
 *  Desktop only: phones have no hover. */
export function LineTooltip({ x, y, a, b, characters }: { x: number; y: number; a: string; b: string; characters: string[] }) {
  const I18N = window.MCU_I18N;
  const ta = window.TITLES.find((t) => t.id === a), tb = window.TITLES.find((t) => t.id === b);
  return (
    <div className="line-tooltip pointer-events-none fixed z-100 min-w-[180px] rounded-md bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 [.app.touch_&]:hidden"
      style={{ left: x + 12, top: y + 12 }}>
      {ta && tb && <div className="tt-titles mb-1.5 max-w-[280px] border-b border-border pb-1.5 font-semibold text-foreground">
        {I18N.titleName(ta)} <span className="font-normal text-muted-foreground" aria-hidden="true">↔</span> {I18N.titleName(tb)}
      </div>}
      <div className="tt-label mb-1.5 text-xs font-medium text-muted-foreground">{tr('canvas.sharedCharacters')}</div>
      {characters.map((c) => (
        <div key={c} className="tt-row flex items-center gap-2 py-[3px]">
          <span className="tt-dot size-2 rounded-full" style={{ background: window.CHARACTERS[c].color }}/>
          <span>{I18N.charName(c)}</span>
        </div>
      ))}
    </div>
  );
}

export interface ContextFilters {
  search: string; setSearch: (v: string) => void;
  collectionFilter: string; setCollectionFilter: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
  phaseFilter: string; setPhaseFilter: (v: string) => void;
  budgetFilter: string; setBudgetFilter: (v: string) => void;
  releaseFilter: string; setReleaseFilter: (v: string) => void;
}

// What the view is showing, and the way back to everything:
//   'float' - desktop Spatial, top-left of the canvas: the count, one removable
//             chip per filter (search, collection, type, phase, budget) and
//             Clear all. With `inList` it sits at the top of the desktop List.
//   'line'  - top of the mobile List/Grid (scrolls away with it).
//   'pill'  - mobile Spatial, top-left of the canvas clear of the zoom control.
// Phones show the count and how many filters, plus Clear; the search box,
// collection switch and Filters badge already name them.
// `showing` counts titles matching every filter, including the collection one,
// which only dims cards in Spatial.
export function ContextSummary({ variant, inList = false, showing, total, filters: f }: {
  variant: 'float' | 'line' | 'pill'; inList?: boolean; showing: number; total: number; filters: ContextFilters;
}) {
  const chips: [string, string, () => void][] = [];
  const query = f.search.trim();
  if (query) chips.push(['search', `“${query}”`, () => f.setSearch('')]);
  if (f.collectionFilter !== 'all') chips.push(['collection', tr('collection.' + f.collectionFilter), () => f.setCollectionFilter('all')]);
  if (f.typeFilter !== 'all') chips.push(['type', tr(f.typeFilter === 'film' ? 'type.films' : 'type.series'), () => f.setTypeFilter('all')]);
  if (f.phaseFilter !== 'all') chips.push(['phase', tr('phase.label', { n: f.phaseFilter }), () => f.setPhaseFilter('all')]);
  if (f.budgetFilter !== 'all') chips.push(['budget', tr('budget.' + f.budgetFilter), () => f.setBudgetFilter('all')]);
  if (f.releaseFilter !== 'all') chips.push(['release', tr('filter.release.chip'), () => f.setReleaseFilter('all')]);
  const clearAll = () => {
    f.setSearch(''); f.setCollectionFilter('all'); f.setTypeFilter('all');
    f.setPhaseFilter('all'); f.setBudgetFilter('all'); f.setReleaseFilter('all');
  };
  const count = showing === total ? tr('header.count', { n: total }) : tr('header.countOf', { shown: showing, total });
  // Keep the canvas pan/pinch handlers from treating a click here as a drag.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const clear = 'ctx-clear h-auto flex-none px-1 text-xs font-normal whitespace-nowrap text-primary hover:bg-transparent hover:underline';

  if (variant === 'float') {
    return (
      <div className={cn('ctx ctx-float pointer-events-none absolute top-3.5 left-4 z-40 flex max-w-[min(760px,calc(100%-32px))] flex-wrap items-center gap-x-2 gap-y-1.5 text-xs [&>*]:pointer-events-auto',
        inList && 'ctx-static static mb-1.5 max-w-none')} onMouseDown={stop} onWheel={stop}>
        <span className="ctx-count inline-flex h-7 items-center rounded-full border border-border bg-background px-[11px] text-xs font-medium whitespace-nowrap text-foreground tabular-nums" role="status">{count}</span>
        {chips.map(([key, label, onClear]) => (
          <Button key={key} variant="outline" onClick={onClear} title={tr('context.remove', { label })} aria-label={tr('context.remove', { label })}
            className="ctx-chip h-7 gap-1.5 rounded-full pr-2 pl-[11px] text-xs font-medium [&_span]:text-base [&_span]:leading-none [&_span]:opacity-60 hover:[&_span]:opacity-100">
            {label}<span aria-hidden="true">×</span>
          </Button>
        ))}
        {chips.length > 1 && <Button variant="ghost" className={cn(clear, 'h-7 rounded-full bg-background/82 px-[11px]')} onClick={clearAll}>{tr('filters.clearAll')}</Button>}
      </div>
    );
  }

  const pill = variant === 'pill';
  return (
    <div className={cn('ctx flex items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground', `ctx-${variant}`,
      pill ? 'absolute top-3 left-3.5 z-40 box-border min-h-[max(26px,1.625rem)] max-w-[calc(100%-164px)] rounded-[13px] border border-border bg-background/82 px-2.5 py-0.5 backdrop-blur-[6px] has-[.ctx-clear]:pr-1'
        : '-mt-0.5 mb-2.5 min-h-[22px] justify-between')} onTouchStart={stop} onMouseDown={stop}>
      <span className="ctx-text inline-flex min-w-0 flex-nowrap gap-x-[1ch] overflow-hidden text-xs leading-[1.4] tabular-nums [&_b]:font-semibold [&_b]:text-foreground" role="status">
        <span className="ctx-seg whitespace-nowrap"><b>{count}</b></span>
        {/* The narrowest phones: the Spatial pill keeps just the count and Clear. */}
        {chips.length > 0 && <>{' '}<span className={cn('ctx-seg ctx-nfilters whitespace-nowrap', pill && 'max-[359px]:hidden')}>· {tr('context.filters', { n: chips.length })}</span></>}
      </span>
      {chips.length > 0 && <Button variant="ghost" className={cn(clear, 'h-[max(26px,1.625rem)]')} onClick={clearAll}>{tr('context.clear')}</Button>}
    </div>
  );
}

Object.assign(window, { ZoomControl, BandLabel, SpatialOverall, SpatialEmpty, LineTooltip, ContextSummary });
