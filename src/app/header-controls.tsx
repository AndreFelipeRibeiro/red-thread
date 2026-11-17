// The controls the desktop toolbar and the phone header share (Notion "shadcn
// pass 1/5: toolbar, header and filters"): the Sort menu, the Filters panel,
// and the status pills (Seen, Watchlist) with "Mark what you've seen".
//
// Moved out of mobile.tsx and tracking.tsx so they can be built on the design
// system: this file is listed with `@source` in src/index.css. Same
// controls, same places, same labels as before; only the building blocks
// changed.
//
// Class names the QA checks and the Escape ladder read are kept as hooks
// (`sort-menu*`; `sort-order`, `sort-order-trigger`, `sort-order-pop` on the
// View menu; `view-menu`;
// `status-counts`, `coll-count`, `data-coll`);
// they carry no V3 styling any more.
//
// Fitting steps: the row each control sits in measures itself (useFitSteps,
// mobile.tsx) by setting `data-fit` on the row and checking for overflow, with
// no render in between, so the compact steps are CSS keyed on the row:
// `group/sortrow` (the desktop sort row) and `group/toolrow` (the phone toolbar row).
import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// Sort (Notion "Rethink the Sort menu", option A, Andre 2026-11-16; Figma
// "6. Sort menu", frames "A · Desktop" and "A · Phone"): one row per sort
// (six, not twelve), each with a radio, its name and a line on what it is
// for, then an Order switch whose labels follow the sort (Oldest first /
// Newest first, Highest first / Lowest first, A–Z / Z–A). Choosing a sort
// applies its usual direction and closes the menu; flipping Order applies at
// once and keeps it open. Desktop: shadcn's Popover. Phones: the app's bottom
// sheet, the Order switch at the bottom near the thumb.
// Hooks: `sort-menu`, `sort-menu-trigger`, `sort-menu-pop`; each sort row
// carries `data-sort` and `data-dir` (its usual direction), and the Order
// switch's options `data-order`.
export const SORT_KEYS = ['release', 'chrono', 'phase', 'title', 'imdb', 'rt'] as const;
const MENU_KEYS = ['release', 'chrono', 'phase', 'imdb', 'rt', 'title'] as const;
export const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = { release: 'asc', chrono: 'asc', phase: 'asc', title: 'asc', imdb: 'desc', rt: 'desc' };

/** A sort's direction in words ("Oldest first", "Phase 1 → 6", "A–Z"). */
export function sortDirLabel(sort: string, dir: string): string {
  if (sort === 'phase') {
    const phases = (window.TITLES as { phase: number }[]).map((t) => t.phase);
    const low = Math.min(...phases), high = Math.max(...phases);
    return dir === 'desc' ? tr('sortmenu.phase', { from: high, to: low }) : tr('sortmenu.phase', { from: low, to: high });
  }
  return tr('sortmenu.dir.' + sort + '.' + dir);
}

/** The sort and its direction: "Release date · Oldest first". */
export function sortPhrase(sort: string, dir: string): string {
  return tr('sortmenu.name.' + sort) + ' · ' + sortDirLabel(sort, dir);
}

// The parts the Sort and Filters menus share (Notion "Rethink the Filters
// menu": the same family): a section label, and a two- or three-way switch.
export const MENU_HEAD = cn('menu-head px-2 py-1.5 font-semibold tracking-[.04em] text-muted-foreground uppercase', 'text-caption leading-[1.4]');

/** A two- or three-way switch: the chosen option raised on a muted track. */
// An option with an icon shows only the icon until it is picked, then the icon
// and its word (Andre, 2026-11-16: four words truncated on a phone); the
// picked option takes the room it needs and the others share the rest.
export function MenuSwitch({ options, value, onChange, label, tall = false, className }: {
  options: { value: string; label: string; icon?: React.ReactNode; iconClass?: string; attrs?: Record<string, string> }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
  tall?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('menu-switch flex gap-0.5 rounded-[10px] bg-muted p-[3px]', className)}>
      {options.map((o) => {
        const on = o.value === value;
        const iconOnly = !!o.icon && !on;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} {...o.attrs} title={iconOnly ? o.label : undefined}
            className={cn('flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-label whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:flex-none',
              o.icon && on ? 'flex-[1_0_auto] px-3' : 'flex-1',
              tall ? 'h-[max(40px,2.5rem)]' : 'h-[max(32px,2rem)]',
              on ? 'on bg-background font-semibold text-foreground shadow-sm dark:bg-input/60' : 'font-medium text-muted-foreground hover:text-foreground')}
            onClick={() => { if (!on) onChange(o.value); }}>
            {o.icon && <span aria-hidden="true" className={cn('inline-flex', on && o.iconClass)}>{o.icon}</span>}
            <span className={iconOnly ? 'story-sr' : 'truncate'}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// The score tags on the IMDb and Tomatometer rows, as on the scores.
const SORT_TAG: Record<string, [string, string]> = {
  imdb: ['IMDb', 'bg-(--imdb) text-black'],
  rt: ['RT', 'bg-(--rt) text-white'],
};

function SortList({ sort, sortDir, onPick, onFlip, phone }: {
  sort: string; sortDir: string; onPick: (k: string) => void; onFlip: (d: 'asc' | 'desc') => void; phone: boolean;
}) {
  const first = DEFAULT_DIR[sort] || 'asc', second: 'asc' | 'desc' = first === 'asc' ? 'desc' : 'asc';
  return (
    <>
      <div className={MENU_HEAD}>{tr('sortmenu.title')}</div>
      <div role="radiogroup" aria-label={tr('sortmenu.title')} className="flex flex-col gap-1">
        {MENU_KEYS.map((key) => {
          const on = sort === key;
          const tag = SORT_TAG[key];
          return (
            <button key={key} type="button" role="radio" aria-checked={on} aria-pressed={on} data-sort={key} data-dir={DEFAULT_DIR[key]}
              className={cn('sort-row flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50',
                phone ? 'min-h-[max(58px,3.625rem)] py-2' : 'min-h-[max(50px,3.125rem)] py-1.5', on && 'on bg-muted hover:bg-muted')}
              onClick={() => onPick(key)}>
              {/* The radio: the accent fill with a light dot once chosen. */}
              <span aria-hidden="true" className={cn('inline-flex size-[18px] flex-[0_0_18px] items-center justify-center rounded-full',
                on ? 'bg-primary' : 'border-[1.5px] border-input dark:border-muted-foreground/40')}>
                {on && <span className="size-1.5 rounded-full bg-primary-foreground"/>}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn('flex items-center gap-1.5 text-label text-foreground', on ? 'font-semibold' : 'font-medium')}>
                  {tag && <span aria-hidden="true" className={cn('rounded-[4px] px-[5px] py-px leading-[1.2] font-bold', XS_TAG, tag[1])}>{tag[0]}</span>}
                  <span className="truncate">{tr('sortmenu.name.' + key)}</span>
                </span>
                <span className="truncate text-caption leading-[1.4] text-muted-foreground">{tr('sortmenu.desc.' + key)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="my-1 h-px bg-border" role="presentation"/>
      <div className={MENU_HEAD}>{tr('sortmenu.order')}</div>
      <MenuSwitch label={tr('sortmenu.order')} value={sortDir} tall={phone} onChange={(d) => onFlip(d as 'asc' | 'desc')}
        options={[first, second].map((d) => ({ value: d, label: sortDirLabel(sort, d), attrs: { 'data-order': d } }))}/>
    </>
  );
}
const XS_TAG = 'text-caption';

export function SortMenu({ sort, sortDir, onChange, mobile = false }: {
  sort: string;
  sortDir: string;
  onChange: (sort: string, dir: 'asc' | 'desc') => void;
  mobile?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const current = sortPhrase(sort, sortDir);
  const short = tr('sortmenu.short.' + sort);
  const pick = (k: string) => { onChange(k, DEFAULT_DIR[k] || 'asc'); setOpen(false); };
  const flip = (d: 'asc' | 'desc') => onChange(sort, d);
  const triggerCls = cn(buttonVariants({ variant: 'outline' }), 'sort-menu-trigger h-11 min-w-0 gap-2 px-3 text-label');
  const icon = (
    <svg className="block size-3.5 flex-[0_0_14px] text-muted-foreground" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 12h5M14 18h3"/>
    </svg>
  );
  const chevron = (
    <svg className="block size-3 flex-[0_0_12px]" width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
  if (mobile) {
    // Phones: the short name and the direction as an arrow ("Release ↑"),
    // and the menu in a bottom sheet.
    return (
      <div className="sort-menu mobile-sort relative shrink-0">
        <button type="button" className={triggerCls} aria-haspopup="dialog" aria-expanded={open}
          aria-label={tr('sortmenu.aria', { label: current })} title={tr('sortmenu.aria', { label: current })} onClick={() => setOpen(true)}>
          {icon}
          <span className="sort-menu-label truncate">{short}</span>
          <span className="sort-menu-dir flex-none text-muted-foreground" aria-hidden="true">{sortDir === 'desc' ? '↓' : '↑'}</span>
        </button>
        {/* In the app root, not the header: the header is a containing
            block, so a fixed sheet inside it would sit at its top. */}
        {open && createPortal(
          <window.Sheet onClose={() => setOpen(false)} label={tr('sortmenu.title')} className="sort-menu-pop">
            <div className="pb-1"><SortList sort={sort} sortDir={sortDir} onPick={pick} onFlip={flip} phone/></div>
          </window.Sheet>,
          document.querySelector('.app') || document.body)}
      </div>
    );
  }
  return (
    <div className="sort-menu relative shrink-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={triggerCls} aria-label={tr('sortmenu.aria', { label: current })} title={tr('sortmenu.aria', { label: current })}>
          {icon}
          {/* The sort and its direction from 1440px, the short name below, so
              the one header row fits (the status pills joined it); the
              tightest step (Portuguese at Large text, 900px) keeps the icon. */}
          <span className="sort-menu-label truncate max-[1440px]:hidden group-data-[fit=1]/toprow:hidden group-data-[fit=2]/toprow:hidden group-data-[fit=3]/toprow:hidden group-data-[fit=4]/toprow:hidden">{current}</span>
          <span className="sort-menu-label truncate min-[1440px]:hidden group-data-[fit=4]/toprow:hidden! min-[1440px]:group-data-[fit=1]/toprow:inline min-[1440px]:group-data-[fit=2]/toprow:inline min-[1440px]:group-data-[fit=3]/toprow:inline">{short}</span>
          {chevron}
        </PopoverTrigger>
        {/* Opening puts focus on the current sort. */}
        <PopoverContent align="start" sideOffset={8}
          initialFocus={() => document.querySelector<HTMLElement>('.sort-menu-pop [aria-pressed="true"]')}
          className="sort-menu-pop max-h-[min(80vh,600px)] w-[320px] max-w-[calc(100vw-24px)] gap-1 overflow-y-auto rounded-[14px] p-2" aria-label={tr('sortmenu.title')}>
          <SortList sort={sort} sortDir={sortDir} onPick={pick} onFlip={flip} phone={false}/>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Filters (Notion "Rethink the Filters menu", option A, Andre 2026-11-16;
// Figma "7. Filters", frames "A · Desktop" and "A · Phone"): the Sort menu's
// family. A heading with "Clear all", then sections: Phase as chips with
// their color dots (one or more), Type as a three-way switch, Budget as chips
// (one; picking it again clears it), Released only as a switch. Filters apply
// as you choose them; the footer counts what matches, and on the phone it is
// the button that closes the sheet ("Show 11 titles"). The desktop popover
// (toolbar.tsx FiltersMenu) and the phone sheet (phone-header.tsx
// FilterSheet) both show this panel.
export interface FilterValues {
  /** Status (All / Unseen / Watchlist / Seen): the header pills are shortcuts
   *  to two of its values. */
  collectionFilter?: string; setCollectionFilter?: (v: string) => void;
  phaseFilter: string; setPhaseFilter: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
  budgetFilter: string; setBudgetFilter: (v: string) => void;
  releaseFilter: string; setReleaseFilter: (v: string) => void;
}
/** How many filters are on; Phase counts once however many are chosen. */
export function activeFilterCount(f: Pick<FilterValues, 'collectionFilter' | 'phaseFilter' | 'typeFilter' | 'budgetFilter' | 'releaseFilter'>): number {
  return (f.collectionFilter && f.collectionFilter !== 'all' ? 1 : 0) + (f.phaseFilter !== 'all' ? 1 : 0) + (f.typeFilter !== 'all' ? 1 : 0) + (f.budgetFilter !== 'all' ? 1 : 0) + (f.releaseFilter !== 'all' ? 1 : 0);
}
const PHASES = ['1', '2', '3', '4', '5', '6'];
// The picked status's icon in its own color.
const STATUS_ICON_ON: Record<string, string> = { seen: 'text-(--seen-text)', watchlist: 'text-(--status-watch)' };
const BUDGETS = ['low', 'mid', 'high', 'mega'];
const FCHIP = 'f-chip inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 text-label font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50';
const fchipOn = (on: boolean) => on ? 'on border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-muted';

export function FiltersPanel({ f, phone = false, showing, onDone }: {
  f: FilterValues;
  phone?: boolean;
  /** Phones: how many titles the view will show (the button's count). */
  showing?: number;
  onDone?: () => void;
}) {
  window.useI18n();
  const PHASE_COLORS = window.PHASE_COLORS as Record<string, string>;
  const n = activeFilterCount(f);
  const total = window.TITLES.length;
  const match = window.TITLES.filter((t) => window.MCU_filterMatches(t, { phase: f.phaseFilter, type: f.typeFilter, budget: f.budgetFilter, release: f.releaseFilter })).length;
  const chosen = f.phaseFilter === 'all' ? [] : f.phaseFilter.split(',');
  const togglePhase = (p: string) => {
    const next = chosen.indexOf(p) === -1 ? chosen.concat(p) : chosen.filter((x) => x !== p);
    f.setPhaseFilter(next.length ? next.sort().join(',') : 'all');
  };
  const clearAll = () => { if (f.setCollectionFilter) f.setCollectionFilter('all'); f.setPhaseFilter('all'); f.setTypeFilter('all'); f.setBudgetFilter('all'); f.setReleaseFilter('all'); };
  const chipH = phone ? 'min-h-[max(40px,2.5rem)]' : 'min-h-[max(32px,2rem)]';
  const label = (text: string, hint?: string) => (
    <div className="flex items-baseline gap-2 pt-2 text-caption leading-[1.4] text-muted-foreground">
      <span className="font-semibold tracking-[.04em] uppercase">{text}</span>
      {hint && <span>{hint}</span>}
    </div>
  );
  return (
    <div className="filters-panel flex flex-col gap-1.5">
      <div className="flex items-center gap-2 pb-1">
        <div className="flex-1 text-heading leading-[1.3] font-semibold text-foreground">{tr('filters.title')}</div>
        {n > 0 && <button type="button" className="pop-clear cursor-pointer rounded-md text-label font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50" onClick={clearAll}>{tr('filters.clearAll')}</button>}
      </div>
      {f.setCollectionFilter && <>
        {label(tr('filters.status'))}
        <MenuSwitch label={tr('filters.status')} value={f.collectionFilter || 'all'} tall={phone} onChange={f.setCollectionFilter}
          options={['all', 'unseen', 'watchlist', 'seen'].map((v) => ({ value: v, label: tr(v === 'watchlist' ? 'collection.watchlistShort' : 'collection.' + v), attrs: { 'data-status': v },
            icon: v === 'all' ? undefined : <window.CollectionIcon kind={v}/>, iconClass: STATUS_ICON_ON[v] }))}/>
      </>}
      {label(tr('filters.phase'), tr('filters.phaseHint'))}
      <div role="group" aria-label={tr('filters.phase')} className="flex flex-wrap gap-1.5">
        {PHASES.map((p) => {
          const on = chosen.indexOf(p) !== -1;
          return (
            <button key={p} type="button" aria-pressed={on} data-phase={p} className={cn(FCHIP, chipH, 'pl-2.5', fchipOn(on))} onClick={() => togglePhase(p)}>
              <span aria-hidden="true" className="size-2 flex-[0_0_8px] rounded-full" style={{ background: PHASE_COLORS[p] }}/>
              {tr('phase.label', { n: p })}
            </button>
          );
        })}
      </div>
      {label(tr('filters.type'))}
      <MenuSwitch label={tr('filters.type')} value={f.typeFilter} tall={phone} onChange={f.setTypeFilter}
        options={[['all', 'type.all'], ['film', 'type.films'], ['series', 'type.series']].map(([v, k]) => ({ value: v, label: tr(k), attrs: { 'data-type': v } }))}/>
      {label(tr('filters.budget'))}
      <div role="group" aria-label={tr('filters.budget')} className="flex flex-wrap gap-1.5">
        {BUDGETS.map((b) => {
          const on = f.budgetFilter === b;
          return (
            <button key={b} type="button" aria-pressed={on} data-budget={b} className={cn(FCHIP, chipH, fchipOn(on))} onClick={() => f.setBudgetFilter(on ? 'all' : b)}>
              {tr('budget.' + b)}
            </button>
          );
        })}
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 pt-2.5 pb-1">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label font-semibold text-foreground">{tr('filter.release.released')}</span>
          <span className="text-caption leading-[1.4] text-muted-foreground">{tr('filters.releasedHint')}</span>
        </span>
        <Switch className="f-released" checked={f.releaseFilter === 'released'} onCheckedChange={(v: boolean) => f.setReleaseFilter(v ? 'released' : 'all')}/>
      </label>
      <div className="h-px bg-border" role="presentation"/>
      {phone
        ? <Button className="m-apply mt-1.5 h-auto min-h-[max(44px,2.75rem)] w-full" onClick={onDone}>{tr('filters.show', { n: showing != null ? showing : match })}</Button>
        : (
          <div className="flex items-center gap-2.5 pt-1.5 text-caption leading-[1.4]">
            <span className="f-match flex-1 font-semibold text-muted-foreground tabular-nums" role="status">{tr('filters.match', { n: match, total })}</span>
            <span className="text-muted-foreground/80">{tr('filters.applied')}</span>
          </div>
        )}
    </div>
  );
}

// The Seen and Watchlist pills in the header, in every section (Notion
// "Universal status pills", Andre 2026-11-16): the status icon and the same
// count pill as before, and a tap filters where you are (Titles narrows the
// list, Connections dims the rest); tapping the chosen one again returns to
// All. Unseen lives in the Filters panel's Status section. Hooks:
// `status-counts`, `data-coll`, `aria-pressed`.
// `keepOn`: where there is nothing to filter (Guides), a press always asks
// for that status, never All, and the app takes it to Titles (Notion "Seen
// and Watchlist pills on Guides open Titles, filtered", Andre 2026-11-16).
export function StatusCounts({ value, onChange, phone = false, keepOn = false }: { value: string; onChange: (v: string) => void; phone?: boolean; keepOn?: boolean }) {
  window.useI18n();
  const { progress, loading } = window.useCollection() as unknown as { progress: { seenTotal: number; watchlist: number }; loading: boolean };
  // Counts from the previous render, so a count that just appeared pops in.
  const last = React.useRef<Record<string, number> | null>(null);
  const before = last.current;
  const counts: Record<string, number> | null = loading ? null : { seen: progress.seenTotal, watchlist: progress.watchlist };
  React.useEffect(() => { last.current = counts; });
  const Icon = window.CollectionIcon;
  const items: [string, string][] = [['seen', 'counts.seenAria'], ['watchlist', 'counts.watchAria']];
  return (
    <div className={cn('status-counts flex flex-none items-center', phone ? 'ml-auto gap-1.5 group-data-[fit=3]/toolrow:gap-1 group-data-[fit=4]/toolrow:gap-1 group-data-[fit=5]/toolrow:gap-1' : 'gap-1.5')}>
      {items.map(([kind, aria]) => {
        const on = value === kind;
        const n = counts ? counts[kind] : null;
        return (
          <button key={kind} type="button" data-coll={kind} aria-pressed={on} title={tr(aria, { n: n == null ? '…' : n })} aria-label={tr(aria, { n: n == null ? '…' : n })}
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5 px-2.5 text-label font-medium [&_svg:not([class*=\'size-\'])]:size-[13px]',
              on ? 'on border-foreground/25 bg-muted text-foreground dark:bg-input/60' : 'text-muted-foreground hover:text-foreground',
              // The phone row's tightest steps (320px, Large text): the count
              // pills alone; the icon stays in the name. The desktop header does
              // the same below 1100px, where the row runs out of room.
              phone ? 'h-11 group-data-[fit=3]/toolrow:px-1.5 group-data-[fit=4]/toolrow:px-1.5 group-data-[fit=5]/toolrow:px-1 [&_.sc-icon]:group-data-[fit=3]/toolrow:hidden [&_.sc-icon]:group-data-[fit=4]/toolrow:hidden [&_.sc-icon]:group-data-[fit=5]/toolrow:hidden' : 'h-10 max-[1100px]:px-2 max-[1100px]:[&_.sc-icon]:hidden group-data-[fit=2]/toprow:px-2 group-data-[fit=3]/toprow:px-2 group-data-[fit=4]/toprow:px-2 [&_.sc-icon]:group-data-[fit=2]/toprow:hidden [&_.sc-icon]:group-data-[fit=3]/toprow:hidden [&_.sc-icon]:group-data-[fit=4]/toprow:hidden')}
            onClick={() => onChange(on && !keepOn ? 'all' : kind)}>
            <span className="sc-icon inline-flex size-[13px] flex-[0_0_13px]" aria-hidden="true"><Icon kind={kind}/></span>
            {n != null && <CountBadge n={n} kind={kind} on={on} appeared={!!before && !before[kind] && n > 0}/>}
          </button>
        );
      })}
    </div>
  );
}

/** "Mark what you've seen" (the picker), as an icon button in the header of
 *  every section (it was in Titles' second row). */
export function PickerButton({ phone = false }: { phone?: boolean }) {
  window.useI18n();
  if (!window.MCU_openPicker) return null;
  return (
    <button type="button" className={cn(buttonVariants({ variant: 'outline' }), 'pick-btn flex-none p-0 text-(--seen-text) hover:text-(--seen-text)', phone ? 'm-pick size-11' : 'ml-pick size-10')}
      onClick={() => window.MCU_openPicker && window.MCU_openPicker()} title={tr('picker.open')} aria-label={tr('picker.open')}>
      {/* A stack with a check: many titles marked at once (Andre, 2026-11-16:
          the grid with a check read as a layout control). */}
      <svg className="size-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
    </button>
  );
}

// Count badge on Seen and Watchlist. Hidden at zero; pops in when it first
// appears and rolls up or down when the number changes. The direction is
// kept until the bump ends (Notion V4 Tasks, "Micro-interaction: the Seen
// check pops in and the counters tick"): worked out afresh on every render,
// it was gone with the next one (the toast, sync) about 20ms in, which cut
// the bump and the roll short. The keyframes are in src/index.css.
// A tab's count as a soft pill, on every tab so none looks singled out; only
// Watchlist and Seen carry their status colour, as a tint (the quiet seen
// mark's language), and the selected tab's pill is a step stronger.
const PILL_TONE: Record<string, [string, string]> = {
  all: ['bg-[color-mix(in_oklab,var(--muted-foreground)_14%,transparent)] text-[color-mix(in_oklab,var(--foreground)_72%,var(--background))]', 'bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)] text-foreground'],
  seen: ['bg-[color-mix(in_oklab,var(--seen)_14%,transparent)] text-(--seen-text)', 'bg-[color-mix(in_oklab,var(--seen)_24%,transparent)] text-(--seen-text)'],
  watchlist: ['bg-[color-mix(in_oklab,var(--status-watch)_16%,transparent)] text-[color-mix(in_oklch,var(--status-watch)_70%,var(--foreground))]', 'bg-[color-mix(in_oklab,var(--status-watch)_28%,transparent)] text-[color-mix(in_oklch,var(--status-watch)_70%,var(--foreground))]'],
};
function CountBadge({ n, kind, appeared, on = false }: { n: number; kind: string; appeared: boolean; on?: boolean }) {
  const [tick, setTick] = React.useState({ n, dir: '' });
  if (tick.n !== n) setTick({ n, dir: n > tick.n ? 'up' : 'down' });
  const dir = tick.n === n ? tick.dir : '';
  // It still bumps when the number changes.
  const tone = PILL_TONE[kind] || PILL_TONE.all;
  return (
    <span key={n} aria-hidden="true"
      className={cn('coll-count pointer-events-none inline-flex h-[max(18px,1.125rem)] min-w-[max(18px,1.125rem)] items-center justify-center overflow-hidden rounded-full px-1.5 text-label leading-none font-medium tabular-nums',
        kind, on ? tone[1] : tone[0],
        appeared && 'new animate-[count-appear_460ms_cubic-bezier(.2,1.5,.4,1)]',
        dir && dir + ' animate-[count-bump_420ms_cubic-bezier(.2,1.5,.4,1)]',
        'motion-reduce:animate-none')}
      onAnimationEnd={(e) => { if (e.animationName === 'count-bump') setTick((t) => (t.dir ? { n: t.n, dir: '' } : t)); }}>
      <span className={cn('coll-num block motion-reduce:animate-none', dir === 'up' && 'animate-[count-num-up_320ms_ease-out]', dir === 'down' && 'animate-[count-num-down_320ms_ease-out]')}>{n}</span>
    </span>
  );
}

Object.assign(window, { SortMenu, sortPhrase, sortDirLabel, MenuSwitch, FiltersPanel, activeFilterCount, StatusCounts, PickerButton });
