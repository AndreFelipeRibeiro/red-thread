// The phone header, the bottom sort bar and the Filters sheet's contents
// (Notion "shadcn pass 1/5: toolbar, header and filters").
//
// Moved out of mobile.tsx so they can be built on the design system: this file
// is listed with `@source` in src/index.css, and each root carries `v4` (the
// scoped reset, src/preflight-v4.css). Same controls, same places, same labels
// as before; only the building blocks changed.
//
// Still V3 inside the app bar, for later passes of the same epic: the sync
// dot, the Guides, Settings and Account buttons (5/5, menus and dialogs) and
// the sheet the filters sit in (`Sheet` in mobile.tsx, shared with the title
// sheet: 3/5).
//
// Class names the QA checks read are kept as hooks (`m-appbar`, `m-searchrow`,
// `m-searchbar`, `m-fpill`, `m-fcount`, `m-row3`, `m-viewrow`, `m-tabs`,
// `m-tab`, `on`, `m-chip`, `m-flab`, `m-apply`…); they carry no V3 styling.
import React from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SortOrderMenu, ViewMenu, CollectionSwitch } from './header-controls';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// [value, icon]; labels come from sort.short.* in the active language.
const SORT_TABS: [string, string][] = [['release', '▤'], ['chrono', '⇄'], ['phase', '◫'], ['title', '⇅'], ['imdb', '★'], ['rt', '◉']];

// Layout moves (AGENTS.md, "Motion").
const EASE = 'cubic-bezier(.2,.8,.2,1)';

type SearchProps = Parameters<typeof window.SearchInput>[0];

export interface MobileTopBarProps {
  onHome: (e: React.MouseEvent) => void;
  viewMode: string;
  setViewMode: (mode: string) => void;
  search: string;
  setSearch: (q: string) => void;
  onPickTitle: SearchProps['onPickTitle'];
  onPickPerson: SearchProps['onPickPerson'];
  onOpenFilters: () => void;
  filterCount: number;
  sort: string;
  sortDir: string;
  setSortDir: (dir: 'asc' | 'desc') => void;
  onOpenAccount: () => void;
  onOpenSettings?: () => void;
  onOpenGuides?: () => void;
  guideActive: boolean;
  guideName?: string;
  collectionFilter: string;
  setCollectionFilter: (v: string) => void;
}

export function MobileTopBar({ onHome, viewMode, setViewMode, search, setSearch, onPickTitle, onPickPerson, onOpenFilters, filterCount, sort, sortDir, setSortDir, onOpenAccount, onOpenSettings, onOpenGuides, guideActive, guideName, collectionFilter, setCollectionFilter }: MobileTopBarProps) {
  // The suggestions list spans the whole search row (see SearchInput).
  const [searchRow, setSearchRow] = React.useState<HTMLDivElement | null>(null);
  // An open guide shortens the bar (V3 Tasks, "Phone guide: one bar…"):
  // Filters folds away, the view menu slides up beside search and the
  // collection row folds up, all animated; what is hidden leaves the tab order.
  // Order stays, dimmed outside Spatial (see GuideOff).
  const Off = window.GuideOff;
  const orderOff = guideActive && viewMode !== 'spatial';
  const fslot = React.useRef<HTMLSpanElement | null>(null), row3 = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const hide = (el: HTMLElement | null, off: boolean) => {
      if (!el) return;
      if (off) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    };
    hide(fslot.current, guideActive); hide(row3.current, guideActive);
  }, [guideActive]);

  // The collection switch and the view menu share one row, and Portuguese
  // labels are much longer than English ones (Notion "Top nav (PT) / content
  // overflowing"). The row tries each step and keeps the first that fits
  // (useFitSteps), so it holds in any language and at any text size:
  //   0  every label;
  //   1  the view menu shows only its icon (its accessible name stays);
  //   2  the switch shows only "All" and the selected option's label;
  //   3  "Para ver" in place of "Para assistir" (Andre's approval).
  // The steps themselves are CSS keyed on the row (group/viewrow).
  const { lang } = window.useI18n();
  const viewRow = React.useRef<HTMLDivElement | null>(null);
  const fit = window.useFitSteps(viewRow, 3, [lang, collectionFilter, viewMode]);
  return (
    <div role="banner" className={cn('m-appbar v4 z-50 flex flex-[0_0_auto] flex-col gap-2.5 border-b border-border bg-background/94 px-3.5 pt-2.5 pb-[11px] backdrop-blur-md min-[600px]:px-5 min-[600px]:pt-3 min-[600px]:pb-[13px]',
      guideActive && 'guide')}>
      {guideActive && <window.GuideOffHint/>}
      <div className="m-appbar-top flex items-center justify-between gap-2">
        <a className="m-brandrow flex min-w-0 flex-[1_1_auto] items-center gap-2.5 rounded-lg text-inherit no-underline outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/" onClick={onHome} aria-label={tr('home.link')}>
          <span className="m-mark logo-mark h-7 w-[15px] flex-[0_0_15px]" aria-hidden="true"/>
          <h1 className="m-btitle m-0 overflow-hidden text-[15px] leading-[1.15] font-semibold tracking-tight text-ellipsis whitespace-nowrap">
            <span className="logo-word h-[21px] w-[111px]" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span>
          </h1>
        </a>
        <window.SyncStatus/>
        {onOpenGuides && (
          <button type="button" className={`m-gbtn${guideActive ? ' on' : ''}`} onClick={onOpenGuides}
            aria-label={guideActive && guideName ? tr('guide.buttonOpen', { name: guideName }) : tr('guide.button')} title={tr('guide.button')}><window.GuideIcon size={18}/><span className="m-gbtn-label" aria-hidden="true">{tr('guide.button')}</span></button>
        )}
        {/* The language menu moved into Settings; the gear takes its place, so
            the bar keeps the same number of buttons. */}
        {onOpenSettings && <window.SettingsButton onOpen={onOpenSettings} className="m-settings-btn"/>}
        <window.AccountAvatarButton onOpen={onOpenAccount}/>
      </div>
      <div className="m-searchrow relative flex items-center gap-2" ref={setSearchRow}>
        <div className="m-searchbar flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          {/* Drawn at 13px while the field's own font stays at least 16px, or
              iPhones zoom the page when it takes focus (13.8px at Large;
              Andre, 2026-11-02). */}
          <div className="m-search-input relative h-6 min-w-0 flex-1 [&_input]:absolute [&_input]:inset-y-0 [&_input]:left-0 [&_input]:h-6 [&_input]:w-[123.076923%] [&_input]:origin-left [&_input]:scale-[.8125] [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-[length:max(16px,calc(var(--fs-base)*var(--fs-chrome-scale,1)))] [&_input]:text-foreground [&_input]:outline-none [&_input]:placeholder:text-muted-foreground">
            <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson}
              ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')} portalTo={searchRow}/>
          </div>
          {search && <Button variant="secondary" size="icon-xs" className="m-clear shrink-0 rounded-full text-base leading-none text-muted-foreground"
            onClick={() => setSearch('')} aria-label={tr('search.clear')}>×</Button>}
        </div>
        <Off off={orderOff}><SortOrderMenu sort={sort} sortDir={sortDir} setSortDir={setSortDir} mobile/></Off>
        <span ref={fslot} className={cn('m-fslot flex max-w-11 flex-[0_0_auto] [clip-path:inset(-40px)] motion-reduce:transition-none',
          `[transition:max-width_600ms_${EASE},margin-left_600ms_${EASE},opacity_300ms_ease,clip-path_600ms_${EASE}]`,
          guideActive && '-ml-2 max-w-0 opacity-0 [clip-path:inset(0_0_0_100%)]')}>
          <Button variant="outline" className={cn('m-fpill relative size-11 flex-[0_0_44px] p-0 text-foreground', filterCount && 'act bg-muted dark:bg-input/50')}
            onClick={onOpenFilters} aria-label={filterCount ? tr('filters.aria', { n: filterCount }) : tr('filters.title')} title={tr('filters.title')}>
            <svg className="size-[15px]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
            {filterCount ? <span className="m-fcount absolute tabular-nums -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-[9px] bg-primary px-1 text-xs font-bold text-primary-foreground">{filterCount}</span> : null}
          </Button>
        </span>
        {/* The view menu beside search exists only while a guide is open (one
            view menu otherwise), so it grows in as it appears. */}
        {guideActive && <span className="m-vslot flex max-w-[120px] flex-[0_0_auto] animate-[m-vslot-in_600ms_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none">
          <ViewMenu viewMode={viewMode} setViewMode={setViewMode} iconOnly/>
        </span>}
      </div>
      {/* clip-path rather than overflow does the folding, so the count badges
          are never cut off. min-width: 0, or the row grows past the screen
          with its content instead of fitting it. */}
      <div ref={row3} className={cn('m-row3 grid grid-cols-[minmax(0,1fr)] grid-rows-[1fr] [clip-path:inset(-40px_-400px_-800px_-400px)] motion-reduce:transition-none',
        `[transition:grid-template-rows_600ms_${EASE},margin-top_600ms_${EASE},opacity_300ms_ease,clip-path_600ms_${EASE}]`,
        guideActive && '-mt-2.5 grid-rows-[0fr] opacity-0 [clip-path:inset(0_0_100%_0)]')}>
        <div className="m-viewrow group/viewrow flex min-h-0 min-w-0 items-center gap-2" ref={viewRow} data-fit={fit}>
          <CollectionSwitch value={collectionFilter} onChange={setCollectionFilter} variant="compact" short={fit >= 3}/>
          <ViewMenu viewMode={viewMode} setViewMode={setViewMode}/>
        </div>
      </div>
    </div>
  );
}

// Tapping the sort tab that is already selected takes the List or Grid back to
// the top, the tab-bar habit from iOS (Notion V4 Tasks, "Mobile: Press twice
// resets the list"). It only scrolls: sort, order, filters and search stay, the
// direction does not flip and nothing re-sorts, so no flip animation plays.
// Spatial has no scroll area, so a second tap there does nothing.
function scrollListToTop() {
  const area = document.querySelector('.m-main .m-scrollarea');
  if (!area || area.scrollTop === 0) return;
  const still = window.MCU_MOTION.reduced();
  area.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
}

// The bottom sort bar: shadcn's ToggleGroup, one choice, as a tab bar. While a
// guide is open the bar slides down out of view (the guide has its own order)
// and comes back when it closes; hidden, it is out of the tab order.
export function SortTabs({ sort, setSort, away = false }: { sort: string; setSort: (s: string) => void; away?: boolean }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { if (ref.current) { if (away) ref.current.setAttribute('inert', ''); else ref.current.removeAttribute('inert'); } }, [away]);
  return (
    <div ref={ref} aria-hidden={away || undefined}
      className={cn('m-sort-footer v4 relative z-30 flex-[0_0_auto] bg-background transition-transform duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
        away && 'away absolute inset-x-0 bottom-0 translate-y-full')}>
      <nav className="m-tabs relative z-30 flex flex-[0_0_auto] items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom,8px)] backdrop-blur-md" aria-label={tr('sort.navAria')}>
        <ToggleGroup value={[sort]} className="flex w-full items-stretch gap-0"
          onValueChange={(v: unknown[]) => { if (v.length) setSort(String(v[v.length - 1])); else scrollListToTop(); }}>
          {SORT_TABS.map(([v, ic]) => (
            <ToggleGroupItem key={v} value={v}
              className={cn('m-tab h-auto min-h-[68px] flex-1 flex-col gap-[5px] rounded-none px-0.5 py-3 text-[length:max(12px,calc(var(--fs-xs)*var(--fs-chrome-scale,1)))] leading-[1.4] font-medium text-muted-foreground hover:bg-transparent aria-pressed:bg-transparent aria-pressed:text-foreground',
                sort === v && 'on')}>
              <span className="ti text-base leading-none">{ic}</span>{tr('sort.short.' + v)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </nav>
    </div>
  );
}

// One group of single-choice chips in the Filters sheet.
function ChipGroup({ label, value, onChange, items }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: { value: string; content: React.ReactNode; className?: string; style?: React.CSSProperties }[];
}) {
  return (
    <div className="mb-[17px]">
      <div className="m-flab mb-[9px] text-xs font-medium text-muted-foreground">{label}</div>
      <ToggleGroup value={[value]} onValueChange={(v: unknown[]) => { if (v.length) onChange(String(v[v.length - 1])); }}
        aria-label={label} className="flex w-auto flex-wrap gap-[7px]">
        {items.map((it) => (
          <ToggleGroupItem key={it.value} value={it.value} variant="outline" style={it.style}
            className={cn('m-chip h-auto min-h-10 px-3.5 text-sm font-medium text-muted-foreground aria-pressed:text-foreground dark:aria-pressed:bg-input/50', value === it.value && 'on', it.className)}>
            {it.content}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export interface FilterSheetProps {
  phaseFilter: string; setPhaseFilter: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
  budgetFilter: string; setBudgetFilter: (v: string) => void;
  releaseFilter: string; setReleaseFilter: (v: string) => void;
  sort: string; sortDir: string; setSortDir: (dir: 'asc' | 'desc') => void;
  onClose: () => void;
  showing: number;
  onClear: () => void;
}

// The Filters sheet: the phone's Filters panel. The sheet frame (handle,
// swipe, Back, focus trap) is the shared `Sheet` in mobile.tsx; the contents
// are on the design system.
export function FilterSheet({ phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, sort, sortDir, setSortDir, onClose, showing, onClear }: FilterSheetProps) {
  const Sheet = window.Sheet;
  const MPHASE_COLORS = window.MPHASE_COLORS as Record<string, string>;
  return (
    <Sheet onClose={onClose} tall label={tr('filters.title')}>
      <div className="v4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">{tr('filters.title')}</div>
          <Button variant="ghost" className="-m-2 h-auto p-2 text-sm" onClick={onClear}>{tr('filters.clearAll')}</Button>
        </div>
        <ChipGroup label={tr('filters.phase')} value={phaseFilter} onChange={setPhaseFilter}
          items={['all', '1', '2', '3', '4', '5', '6'].map((p) => ({
            value: p,
            content: p === 'all' ? tr('filters.all') : p,
            className: 'ph min-w-[46px] justify-center font-semibold tabular-nums',
            style: p !== 'all' && phaseFilter === p ? { background: MPHASE_COLORS[p], borderColor: MPHASE_COLORS[p], color: 'var(--on-color)' } : undefined,
          }))}/>
        <ChipGroup label={tr('filters.type')} value={typeFilter} onChange={setTypeFilter}
          items={[['all', 'type.all'], ['film', 'type.films'], ['series', 'type.series']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
        <ChipGroup label={tr('filters.budget')} value={budgetFilter} onChange={setBudgetFilter}
          items={[['all', 'filters.all'], ['low', 'budget.low'], ['mid', 'budget.mid'], ['high', 'budget.high'], ['mega', 'budget.mega']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
        <ChipGroup label={tr('filter.release')} value={releaseFilter} onChange={setReleaseFilter}
          items={[['all', 'filter.release.all'], ['released', 'filter.release.released']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
        <ChipGroup label={tr('order.label')} value={sortDir} onChange={(v) => setSortDir(v as 'asc' | 'desc')}
          items={window.sortDirectionLabels(sort).map((label: string, i: number) => ({ value: i === 0 ? 'asc' : 'desc', content: label }))}/>
        <Button className="m-apply mt-1 h-auto min-h-10 w-full" onClick={onClose}>{tr('filters.show', { n: showing })}</Button>
      </div>
    </Sheet>
  );
}

Object.assign(window, { MobileTopBar, SortTabs, FilterSheet });
