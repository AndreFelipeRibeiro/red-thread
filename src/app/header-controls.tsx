// The controls the desktop toolbar and the phone header share (Notion "shadcn
// pass 1/5: toolbar, header and filters"): the Order toggle, the View menu and
// the collection switch (All / Unseen / Seen / Watchlist).
//
// Moved out of mobile.tsx and tracking.tsx so they can be built on the design
// system: this file is listed with `@source` in src/index.css. Same
// controls, same places, same labels as before; only the building blocks
// changed.
//
// Class names the QA checks and the Escape ladder read are kept as hooks
// (`sort-order`, `sort-order-trigger`, `sort-order-pop`, `view-menu`,
// `coll-switch`, `coll-label`, `coll-count`, `on` on the selected option);
// they carry no V3 styling any more.
//
// Fitting steps: the row each control sits in measures itself (useFitSteps,
// mobile.tsx) by setting `data-fit` on the row and checking for overflow, with
// no render in between, so the compact steps are CSS keyed on the row:
// `group/sortrow` (the desktop sort row) and `group/viewrow` (the phone row).
import React from 'react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// [value, icon]; labels come from view.* in the active language.
export const VIEW_MODES: [string, string][] = [['list', '☰'], ['grid', '▦'], ['spatial', '◈']];

// Order: every sort has exactly two directions, so the control is a toggle
// (desktop toolbar and phone search row): a tap flips the order. It shows the
// current direction; its accessible name also says what a tap switches to.
// The icon is a down arrow (reading order) beside bars that grow down the list
// for the first direction (Oldest, Lowest, A–Z…) and shrink for the second;
// the bars flip over as the order changes.
export function SortOrderMenu({ sort, sortDir, setSortDir, mobile = false }: {
  sort: string;
  sortDir: string;
  setSortDir: (dir: 'asc' | 'desc') => void;
  mobile?: boolean;
}) {
  const labels = window.sortDirectionLabels(sort);
  const index = sortDir === 'desc' ? 1 : 0;
  const compact = window.sortDirectionLabels(sort, true)[index];
  const label = tr('order.toggleAria', { label: labels[index], next: labels[1 - index] });
  return (
    <div className={cn('sort-order relative shrink-0', mobile && 'mobile-order')}>
      <Button variant="outline" className="sort-order-trigger sort-order-toggle h-11 min-w-[86px] gap-2 px-3 text-xs active:scale-[.97]"
        aria-label={label} title={label} onClick={() => setSortDir(index === 0 ? 'desc' : 'asc')}>
        {compact}
        <svg className={cn('sort-order-flip block size-3.5 flex-[0_0_14px] text-muted-foreground group-hover/button:text-foreground',
          '[&_.bars]:origin-center [&_.bars]:transition-transform [&_.bars]:duration-320 [&_.bars]:ease-[cubic-bezier(.2,.8,.2,1)] [&_.bars]:[transform-box:fill-box] motion-reduce:[&_.bars]:transition-none',
          index && 'desc [&_.bars]:-scale-y-100')}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 4v16M2 17l3 3 3-3" strokeLinejoin="round"/>
          <g className="bars"><path d="M11 6h4M11 12h7M11 18h10"/></g>
        </svg>
      </Button>
    </div>
  );
}

// List / Grid / Spatial as one compact menu (phone), so the second header row
// has room for the collection switch: shadcn's Popover, its choices ghost
// buttons that say which one is current. Escape, a tap outside and a choice
// all close it, and focus goes back to the trigger. `iconOnly` is the guide's
// short bar, where the menu sits beside search; in the collection row the
// label folds away at the row's first fitting step instead.
export function ViewMenu({ viewMode, setViewMode, iconOnly = false }: {
  viewMode: string;
  setViewMode: (mode: string) => void;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const current = VIEW_MODES.find(([v]) => v === viewMode) || VIEW_MODES[0];
  const currentLabel = tr('view.' + current[0]);
  const hidden = 'sr-only';
  return (
    <div className="sort-order mobile-order view-menu relative shrink-0">
      <Popover open={open} onOpenChange={setOpen}>
        {/* The popover's own button in the outline look: Base UI needs the
            real element as its anchor (see the Filters trigger in toolbar.tsx). */}
        <PopoverTrigger className={cn(buttonVariants({ variant: 'outline' }), 'sort-order-trigger h-11 min-w-0 gap-[7px] px-3 text-xs',
          iconOnly && 'gap-1.5')} aria-label={tr('view.aria', { label: currentLabel })}>
          <span className="vi text-sm leading-none opacity-80" aria-hidden="true">{current[1]}</span>
          <span className={cn('vm-label', iconOnly ? hidden
            : 'group-data-[fit=1]/viewrow:sr-only group-data-[fit=2]/viewrow:sr-only group-data-[fit=3]/viewrow:sr-only')}>{currentLabel}</span>
          <svg className="sort-order-chevron block size-3 flex-[0_0_12px]" width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </PopoverTrigger>
        {/* Opening puts focus on the current view, as the menu always did. */}
        <PopoverContent align="end" sideOffset={8} initialFocus={() => document.querySelector<HTMLElement>('.sort-order-pop [aria-pressed="true"]')}
          className="sort-order-pop w-auto min-w-[180px] gap-0 p-1" role="group" aria-label={tr('view.label')}>
          <div className="sort-order-heading px-2 py-1.5 text-xs font-medium text-muted-foreground">{tr('view.label')}</div>
          {VIEW_MODES.map(([v, ic]) => (
            <Button key={v} variant="ghost" aria-pressed={viewMode === v}
              className="h-11 w-full justify-between gap-[18px] px-2.5 text-sm font-normal aria-pressed:bg-accent aria-pressed:text-accent-foreground"
              onClick={() => { setViewMode(v); setOpen(false); }}>
              <span><span className="vi me-[9px] text-sm leading-none opacity-80" aria-hidden="true">{ic}</span>{tr('view.' + v)}</span>
              <span aria-hidden="true">{viewMode === v ? '✓' : ''}</span>
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Count badge on Seen and Watchlist. Hidden at zero; pops in when it first
// appears and rolls up or down when the number changes. The direction is
// kept until the bump ends (Notion V4 Tasks, "Micro-interaction: the Seen
// check pops in and the counters tick"): worked out afresh on every render,
// it was gone with the next one (the toast, sync) about 20ms in, which cut
// the bump and the roll short. The keyframes are in src/index.css.
function CountBadge({ n, kind, appeared }: { n: number; kind: string; appeared: boolean }) {
  const [tick, setTick] = React.useState({ n, dir: '' });
  if (tick.n !== n) setTick({ n, dir: n > tick.n ? 'up' : 'down' });
  const dir = tick.n === n ? tick.dir : '';
  return (
    <span key={n} aria-hidden="true"
      className={cn('coll-count pointer-events-none absolute -top-[7px] -right-1.5 z-1 inline-flex h-[17px] min-w-[17px] items-center justify-center overflow-hidden rounded-[9px] px-1 text-xs leading-none font-bold tabular-nums text-(--on-color) shadow-[0_0_0_2px_var(--background)]',
        kind, kind === 'seen' ? 'bg-(--status-seen)' : 'bg-(--status-watch)',
        appeared && 'new animate-[count-appear_460ms_cubic-bezier(.2,1.5,.4,1)]',
        dir && dir + ' animate-[count-bump_420ms_cubic-bezier(.2,1.5,.4,1)]',
        'motion-reduce:animate-none')}
      onAnimationEnd={(e) => { if (e.animationName === 'count-bump') setTick((t) => (t.dir ? { n: t.n, dir: '' } : t)); }}>
      <span className={cn('coll-num block motion-reduce:animate-none', dir === 'up' && 'animate-[count-num-up_320ms_ease-out]', dir === 'down' && 'animate-[count-num-down_320ms_ease-out]')}>{n}</span>
    </span>
  );
}

// All / Unseen / Seen / Watchlist, always visible in the toolbar (desktop) and
// the second header row (phone) rather than inside Filters: shadcn's
// ToggleGroup in the segmented look, with the sliding selection. `variant`
// only changes layout: 'toolbar' keeps every label where there is room;
// 'compact' (phone) labels just All and the active option at its compact
// steps, leaving the others as icons.
//
// `short`: the phone row ran out of room, so options with a shorter label
// ("Para ver" for "Para assistir") use it, accessible name included. Both
// labels are rendered, so the row can measure either before it decides.
export function CollectionSwitch({ value, onChange, variant = 'toolbar', short = false }: {
  value: string;
  onChange: (v: string) => void;
  variant?: 'toolbar' | 'compact';
  short?: boolean;
}) {
  // tracking.tsx is not typed yet (its context starts as null, so what
  // useCollection() returns reads as never): name the two fields used here.
  const { progress, loading } = window.useCollection() as unknown as { progress: { seenTotal: number; watchlist: number }; loading: boolean };
  const counts: Record<string, number> = { seen: loading ? 0 : progress.seenTotal, watchlist: loading ? 0 : progress.watchlist };
  // Counts from the previous render, so a badge that just appeared can pop in
  // (but not on first load).
  const last = React.useRef<Record<string, number> | null>(null);
  const before = last.current;
  React.useEffect(() => { last.current = loading ? null : counts; });
  const compact = variant === 'compact';
  const Icon = window.CollectionIcon;
  return (
    <ToggleGroup value={[value]} onValueChange={(v: unknown[]) => { if (v.length) onChange(String(v[v.length - 1])); }}
      aria-label={tr('collection.groupAria')}
      className={cn('coll-switch relative h-11 shrink-0 items-stretch gap-0.5 rounded-lg bg-muted p-[3px]', `coll-${variant}`,
        compact && 'min-w-0 flex-1')}>
      <window.SegPill value={value}/>
      {window.COLLECTION_OPTIONS.map(([v], i) => {
        const full = tr('collection.' + v);
        const shortL = v === 'watchlist' ? tr('collection.watchlistShort') : full;
        const l = short ? shortL : full;
        const n = counts[v] || 0;
        const label = n ? tr('collection.countAria', { label: l, n }) : l;
        const on = value === v, first = i === 0;
        // Which compact steps drop this option's label (the row's data-fit).
        const labelSteps = compact
          ? (first || on ? '' : 'group-data-[fit=2]/viewrow:hidden group-data-[fit=3]/viewrow:hidden')
          : first ? ''
            : on ? 'group-data-[fit=4]/sortrow:hidden group-data-[fit=5]/sortrow:hidden'
              : 'group-data-[fit=2]/sortrow:hidden group-data-[fit=3]/sortrow:hidden group-data-[fit=4]/sortrow:hidden group-data-[fit=5]/sortrow:hidden';
        return (
          <ToggleGroupItem key={v} value={v} aria-label={label} title={label}
            className={cn('relative z-1 h-auto min-w-0 gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-transparent aria-pressed:text-foreground [&_svg:not([class*=\'size-\'])]:size-[13px]',
              compact ? cn('flex-[1_1_auto] px-2', on && 'grow-2')
                : 'group-data-[fit=2]/sortrow:px-2.5 group-data-[fit=3]/sortrow:px-2.5 group-data-[fit=4]/sortrow:px-2.5 group-data-[fit=5]/sortrow:px-2.5',
              on && 'on')}>
            {v !== 'all' && <span className="coll-ic inline-flex size-[13px] flex-[0_0_13px]"><Icon kind={v}/></span>}
            <span className={cn('coll-label', labelSteps)}>
              {shortL === full ? full : <>
                <span className={cn('cl-full', compact && 'group-data-[fit=3]/viewrow:hidden')}>{full}</span>
                <span className={cn('cl-short hidden', compact && 'group-data-[fit=3]/viewrow:inline')}>{shortL}</span>
              </>}
            </span>
            {n > 0 && <CountBadge n={n} kind={v} appeared={!!before && !before[v]}/>}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

Object.assign(window, { SortOrderMenu, ViewMenu, CollectionSwitch });
