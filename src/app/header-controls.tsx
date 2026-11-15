// The controls the desktop toolbar and the phone header share (Notion "shadcn
// pass 1/5: toolbar, header and filters"): the Sort menu, the View menu and
// the collection switch (All / Unseen / Seen / Watchlist).
//
// Moved out of mobile.tsx and tracking.tsx so they can be built on the design
// system: this file is listed with `@source` in src/index.css. Same
// controls, same places, same labels as before; only the building blocks
// changed.
//
// Class names the QA checks and the Escape ladder read are kept as hooks
// (`sort-menu*`; `sort-order`, `sort-order-trigger`, `sort-order-pop` on the
// View menu; `view-menu`,
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

// Sort: one menu holds every sort and both of its directions (Notion "Merge
// sort and order into one Sort menu"). It replaces the six sort tabs (the
// desktop strip, the phone's bottom bar), the Order toggle and the Order row
// in Filters. Each choice reads as a plain phrase ("Release date, oldest
// first"); a sort's usual direction comes first. Desktop shows the whole
// phrase on the trigger; phones show the sort's short name. shadcn's Popover,
// its choices ghost buttons that say which one is current:
// Escape, a tap outside and a choice all close it, and focus goes back to the
// trigger. Hooks: `sort-menu`, `sort-menu-trigger`, `sort-menu-pop`, and
// `data-sort` / `data-dir` on each choice.
export const SORT_KEYS = ['release', 'chrono', 'phase', 'title', 'imdb', 'rt'] as const;
const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = { release: 'asc', chrono: 'asc', phase: 'asc', title: 'asc', imdb: 'desc', rt: 'desc' };

/** The phrase for one sort and direction, in the active language. */
export function sortPhrase(sort: string, dir: string): string {
  if (sort === 'phase') {
    const phases = (window.TITLES as { phase: number }[]).map((t) => t.phase);
    const low = Math.min(...phases), high = Math.max(...phases);
    return dir === 'desc' ? tr('sortmenu.phase', { from: high, to: low }) : tr('sortmenu.phase', { from: low, to: high });
  }
  return tr('sortmenu.' + sort + '.' + dir);
}

export function SortMenu({ sort, sortDir, onChange, mobile = false }: {
  sort: string;
  sortDir: string;
  onChange: (sort: string, dir: 'asc' | 'desc') => void;
  mobile?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const current = sortPhrase(sort, sortDir);
  const shown = tr('sortmenu.short.' + sort);
  return (
    <div className={cn('sort-menu relative shrink-0', mobile && 'mobile-sort')}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={cn(buttonVariants({ variant: 'outline' }), 'sort-menu-trigger h-11 min-w-0 gap-2 px-3 text-xs')}
          aria-label={tr('sortmenu.aria', { label: current })} title={tr('sortmenu.aria', { label: current })}>
          <svg className="block size-3.5 flex-[0_0_14px] text-muted-foreground" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 12h5M14 18h3"/>
          </svg>
          {mobile ? <span className="sort-menu-label truncate">{shown}</span> : <>
            {/* Desktop: the whole phrase from 1280px, the sort's short name
                below, so the one header row fits. */}
            <span className="sort-menu-label truncate max-[1280px]:hidden">{current}</span>
            <span className="sort-menu-label truncate min-[1280px]:hidden">{tr('sortmenu.short.' + sort)}</span>
          </>}
          <svg className="block size-3 flex-[0_0_12px]" width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </PopoverTrigger>
        {/* Opening puts focus on the current choice. Long lists scroll inside
            the popover on short screens. */}
        <PopoverContent align={mobile ? 'end' : 'start'} sideOffset={8}
          initialFocus={() => document.querySelector<HTMLElement>('.sort-menu-pop [aria-pressed="true"]')}
          className={cn('sort-menu-pop w-auto max-w-[calc(100vw-24px)] min-w-[240px] gap-0 overflow-y-auto p-1', mobile ? 'max-h-[calc(100dvh-140px)]' : 'max-h-[min(70vh,560px)]')} role="group" aria-label={tr('sortmenu.title')}>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{tr('sortmenu.title')}</div>
          {SORT_KEYS.map((key, gi) => {
            const first = DEFAULT_DIR[key], second: 'asc' | 'desc' = first === 'asc' ? 'desc' : 'asc';
            return (
              <div key={key} className={cn(gi > 0 && 'mt-1 border-t border-border pt-1')}>
                {[first, second].map((dir) => {
                  const on = sort === key && sortDir === dir;
                  return (
                    <Button key={dir} variant="ghost" aria-pressed={on} data-sort={key} data-dir={dir}
                      className={cn('w-full justify-between gap-[18px] px-2.5 text-sm font-normal aria-pressed:bg-accent aria-pressed:text-accent-foreground', mobile ? 'h-11' : 'h-9')}
                      onClick={() => { onChange(key, dir); setOpen(false); }}>
                      <span>{sortPhrase(key, dir)}</span>
                      <span aria-hidden="true">{on ? '✓' : ''}</span>
                    </Button>
                  );
                })}
              </div>
            );
          })}
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

// All / Unseen / Seen / Watchlist, at the top of My list (desktop and
// phone): shadcn's
// ToggleGroup in the segmented look, with the sliding selection. `variant`
// only changes layout: 'toolbar' keeps every label where there is room;
// 'compact' (phone) labels just All (it has no icon) and the active option at its compact
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
      {window.COLLECTION_OPTIONS.map(([v]) => {
        const full = tr('collection.' + v);
        const shortL = v === 'watchlist' ? tr('collection.watchlistShort') : full;
        const l = short ? shortL : full;
        const n = counts[v] || 0;
        const label = n ? tr('collection.countAria', { label: l, n }) : l;
        const on = value === v, first = v === 'all';
        // Which compact steps drop this option's label (the row's data-fit).
        const labelSteps = compact
          ? (first || on ? '' : 'group-data-[fit=2]/viewrow:hidden group-data-[fit=3]/viewrow:hidden')
          : first ? ''
            : on ? 'group-data-[fit=4]/sortrow:hidden group-data-[fit=5]/sortrow:hidden'
              : 'group-data-[fit=2]/sortrow:hidden group-data-[fit=3]/sortrow:hidden group-data-[fit=4]/sortrow:hidden group-data-[fit=5]/sortrow:hidden';
        return (
          <ToggleGroupItem key={v} value={v} data-coll={v} aria-label={label} title={label}
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

Object.assign(window, { SortMenu, sortPhrase, CollectionSwitch });
