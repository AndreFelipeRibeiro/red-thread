// The desktop toolbar (Notion "shadcn pass 1/5: toolbar, header and filters").
//
// Moved out of app.tsx so that it can be built on the design system: this file
// is listed with `@source` in src/index.css, its root carries `v4` (the scoped
// reset, src/preflight-v4.css), and its look comes from src/components/ui and
// the tokens rather than from styles.css. Same controls, same places, same
// labels as before; only the building blocks changed.
//
// Class names that the QA checks and the Escape ladder read are kept as hooks
// (`toolbar`, `tb-*`, `search-wrap`, `filters-pill`, `filters-pop`, `on` on a
// selected segment); they carry no V3 styling any more.
import React, { useRef } from 'react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

export const SORT_OPTIONS: [string, string][] = [['release', '▤'], ['chrono', '⇄'], ['phase', '◫'], ['title', '⇅'], ['imdb', '★'], ['rt', '◉']];

// One segmented group: shadcn's ToggleGroup in the tab list's look, with the
// sliding selection (SegPill) as its first child. Single choice: pressing the
// selected item again keeps it selected. The selected item keeps `on`, which
// SegPill and the QA checks look for.
export function Segmented({ value, onChange, items, className, label }: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; content: React.ReactNode; className?: string; title?: string; label?: string; style?: React.CSSProperties }[];
  className?: string;
  label?: string;
}) {
  return (
    <ToggleGroup value={[value]} onValueChange={(v: unknown[]) => { if (v.length) onChange(String(v[v.length - 1])); }}
      aria-label={label}
      className={cn('segmented relative h-11 shrink-0 items-stretch gap-0 rounded-lg bg-muted p-1 max-[1560px]:p-[3px] max-[1000px]:p-0.5', className)}>
      <window.SegPill value={value}/>
      {items.map((it) => (
        <ToggleGroupItem key={it.value} value={it.value} title={it.title} aria-label={it.label} style={it.style}
          className={cn('relative z-1 h-auto rounded-md px-3.5 max-[1560px]:px-[11px] max-[1000px]:px-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-transparent aria-pressed:text-foreground',
            value === it.value && 'on', it.className)}>
          {it.content}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// A row of segmented choices with a label, inside the Filters popover.
function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-group flex w-full items-center gap-2.5">
      <span className="min-w-16 text-xs font-medium whitespace-nowrap text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

type Setter = (v: string) => void;
export interface ToolbarProps {
  onHome: (e: React.MouseEvent) => void;
  guideId: string | null;
  onOpenGuide: (id: string) => void;
  onAbout: () => void;
  onSettings: () => void;
  settingsOpen: boolean;
  onPickTitle: (id: string) => void;
  onPickPerson: (person: unknown) => void;
  desktopView: string; setDesktopView: Setter;
  sort: string; setSort: Setter;
  sortDir: string; setSortDir: Setter;
  phaseFilter: string; setPhaseFilter: Setter;
  typeFilter: string; setTypeFilter: Setter;
  budgetFilter: string; setBudgetFilter: Setter;
  releaseFilter: string; setReleaseFilter: Setter;
  collectionFilter: string; setCollectionFilter: Setter;
  search: string; setSearch: Setter;
}

export function Toolbar({ onHome, guideId, onOpenGuide, onAbout, onSettings, settingsOpen, onPickTitle, onPickPerson, desktopView, setDesktopView, sort, setSort, sortDir, setSortDir, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, collectionFilter, setCollectionFilter, search, setSearch }: ToolbarProps) {
  const I18N = window.MCU_I18N;
  // The sort row fits by measuring (window.useFitSteps; Notion "Font size
  // increase"), so it holds in Portuguese and at every Text size. The steps
  // are read from the row's data-fit by the group-data variants below:
  //   1  short sort labels;  2  the collection switch labels only All and the
  //   selected option;  3  the view switch shows icons only;  4  the switch
  //   labels only All;  5  unselected sort tabs show their icon only.
  const sortRow = useRef<HTMLDivElement | null>(null);
  const sortFit = window.useFitSteps(sortRow, 5, [I18N.lang, sort, collectionFilter, desktopView]);
  // Collection has its own always-visible switch, so it is not counted here.
  const activeFilters = (phaseFilter !== 'all' ? 1 : 0) + (budgetFilter !== 'all' ? 1 : 0) + (releaseFilter !== 'all' ? 1 : 0);
  // An open guide shows only its own stops: in the List it ignores the layout
  // tabs, Order, filters, type and collection; in Spatial the layout tabs and
  // Order still arrange the canvas. What it ignores is dimmed with a tooltip
  // (GuideOff), and kept for when it closes.
  const guideOn = !!guideId;
  const listOff = guideOn && desktopView === 'list';
  const Off = window.GuideOff;
  const sortLabels = window.sortDirectionLabels(sort);
  const PHASE_COLORS = window.PHASE_COLORS as Record<string, string>;
  return (
    <div className="toolbar v4 sticky top-0 z-70 flex flex-col gap-3 border-b border-border bg-background/95 px-[22px] py-3.5 backdrop-blur-md max-[1560px]:px-4 max-[1560px]:py-2.5" role="banner">
      <div className="tb-row tb-top-row flex flex-wrap items-center justify-between gap-x-4 gap-y-3 max-[1000px]:gap-x-[9px]">
        {/* The logo is a link home: it resets the app in place (onHome). */}
        <a className="brand group/brand flex min-w-0 shrink-0 items-center gap-3 rounded-lg text-inherit no-underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/" onClick={onHome} aria-label={tr('home.link')} title={tr('home.link')}>
          <span className="brand-mark logo-mark h-7 w-[15px] flex-[0_0_15px] group-hover/brand:brightness-115" aria-hidden="true"/>
          {/* The wordmark is drawn (.logo-word); the name stays as text for
              screen readers and the page outline. */}
          <h1 className="brand-title m-0 text-base font-semibold whitespace-nowrap"><span className="logo-word block h-[21px] w-[111px]" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span></h1>
        </a>
        {/* The search group: search takes the spare width, then Order, Filters
            and All/Films/Series. Below 1280px it wraps onto its own line
            between the two rows. */}
        <div className="tb-filter-row order-3 flex min-w-0 flex-[1_0_100%] items-center gap-3 min-[1280px]:order-none min-[1280px]:flex-[1_1_0]">
          <div className="search-wrap relative flex h-11 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-input bg-transparent px-3.5 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30 max-[1000px]:px-[11px] [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-sm [&_input]:text-foreground [&_input]:outline-none [&_input]:placeholder:text-muted-foreground">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
            <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson}
              ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')} portalTo={null}/>
          </div>
          <Off off={listOff}><div className="tb-order-control flex items-center gap-2">
            <span className="tb-order-label text-xs whitespace-nowrap text-muted-foreground max-[1150px]:hidden">{tr('order.label')}</span>
            <window.SortOrderMenu sort={sort} sortDir={sortDir} setSortDir={setSortDir}/>
          </div></Off>
          <Off off={guideOn}><div className="filters-pop-wrap relative shrink-0">
            <Popover>
              {/* The trigger is the popover's own button in the outline
                  button's look: Base UI needs the real element as its anchor,
                  which <Button> (no forwarded ref) cannot hand over. */}
              <PopoverTrigger className={cn(buttonVariants({ variant: 'outline' }), 'filters-pill h-11 gap-2 px-3.5 text-xs max-[1000px]:px-[11px]', activeFilters && 'active')}
                aria-label={activeFilters ? tr('filters.aria', { n: activeFilters }) : tr('filters.title')} title={tr('filters.title')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
                <span className="filters-label max-[999px]:hidden">{tr('filters.title')}</span>
                {activeFilters ? <span className="fcount inline-flex tabular-nums h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">{activeFilters}</span> : null}
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={9} className="filters-pop w-max max-w-[min(88vw,760px)] items-start gap-3 px-4 py-3.5">
                <FilterGroup label={tr('filters.phase')}>
                  <Segmented value={phaseFilter} onChange={setPhaseFilter}
                    items={['all', '1', '2', '3', '4', '5', '6'].map((p) => ({
                      value: p,
                      content: p === 'all' ? tr('filters.all') : p,
                      // A chosen phase takes its phase colour, as before.
                      style: p !== 'all' && phaseFilter === p ? { background: PHASE_COLORS[p], color: 'var(--on-color)' } : undefined,
                    }))}/>
                </FilterGroup>
                <FilterGroup label={tr('filters.budget')}>
                  <Segmented value={budgetFilter} onChange={setBudgetFilter}
                    items={[['all', 'filters.all'], ['low', 'budget.low'], ['mid', 'budget.mid'], ['high', 'budget.high'], ['mega', 'budget.mega']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
                </FilterGroup>
                {/* Released only sits with the other catalogue filters rather
                    than in the toolbar, so the navigation does not grow. */}
                <FilterGroup label={tr('filter.release')}>
                  <Segmented value={releaseFilter} onChange={setReleaseFilter}
                    items={[['all', 'filter.release.all'], ['released', 'filter.release.released']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
                </FilterGroup>
                <FilterGroup label={tr('order.label')}>
                  <Segmented value={sortDir} onChange={setSortDir}
                    items={sortLabels.map((label: string, i: number) => ({ value: i === 0 ? 'asc' : 'desc', content: label }))}/>
                </FilterGroup>
                {activeFilters > 0 && (
                  <Button variant="link" size="sm" className="pop-clear h-auto px-0 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => { setPhaseFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }}>{tr('filters.clear')}</Button>
                )}
              </PopoverContent>
            </Popover>
          </div></Off>
          <Off off={guideOn}><div className="control-group tb-type-controls flex shrink-0 items-center">
            <Segmented value={typeFilter} onChange={setTypeFilter}
              items={[['all', 'type.all'], ['film', 'type.films'], ['series', 'type.series']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
          </div></Off>
          {guideOn && <window.GuideOffHint/>}
        </div>
        <div className="tb-end flex flex-[0_0_auto] items-center gap-2.5 [&_.g-btn]:h-11">
          <window.SyncStatus/>
          <window.GuidesButton currentId={guideId} onPick={onOpenGuide}/>
          {/* Theme and language live in Settings (Notion "Settings menu"). */}
          <window.SettingsButton onOpen={onSettings} open={settingsOpen}/>
          <window.AccountButton onPickCollection={setCollectionFilter} onAbout={onAbout}/>
        </div>
      </div>
      <div className="tb-row tb-sort-row group/sortrow flex min-w-0 items-center gap-3 max-[1000px]:gap-[9px]" ref={sortRow} data-fit={sortFit}>
        <Off off={listOff}><div className="control-group tb-sort-controls flex min-w-0 flex-1 items-center">
          <Segmented value={sort} onChange={setSort} className="flex-1"
            items={SORT_OPTIONS.map(([v, ic]) => ({
              value: v,
              title: tr('sort.' + v),
              className: 'flex-1 justify-center whitespace-nowrap',
              content: (<>
                <span className={cn('si me-1.5 text-xs', sort === v ? 'opacity-100' : 'opacity-75 group-data-[fit=5]/sortrow:me-0')}>{ic}</span>
                <span className="lg hidden group-data-[fit=0]/sortrow:inline">{tr('sort.' + v)}</span>
                <span className={cn('sm inline group-data-[fit=0]/sortrow:hidden', sort !== v && 'group-data-[fit=5]/sortrow:hidden')}>{tr('sort.short.' + v)}</span>
              </>),
            }))}/>
        </div></Off>
        <Off off={guideOn}><window.CollectionSwitch value={collectionFilter} onChange={setCollectionFilter}/></Off>
        <Segmented value={desktopView} onChange={setDesktopView} label={tr('view.label')} className="tb-view-switch flex-[0_0_auto]"
          items={[['spatial', '◈'], ['list', '☰']].map(([v, ic]) => ({
            value: v,
            title: tr('view.' + v),
            label: tr('view.' + v),
            className: 'gap-1.5 whitespace-nowrap',
            content: (<>
              <span className="vi text-xs opacity-80" aria-hidden="true">{ic}</span>
              <span className="vl group-data-[fit=3]/sortrow:hidden group-data-[fit=4]/sortrow:hidden group-data-[fit=5]/sortrow:hidden">{tr('view.' + v)}</span>
            </>),
          }))}/>
      </div>
    </div>
  );
}

Object.assign(window, { Toolbar, Segmented, SORT_OPTIONS });
