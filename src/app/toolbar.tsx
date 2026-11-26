// The desktop header: one row (Notion "Desktop: navigation for Explore, My
// list and Guides"): the wordmark, the three sections as tabs, search with a
// "/" shortcut, Sort and Filters (not in Guides; Type is one of the filters),
// then sync, Settings and Account. On Titles a second row holds the status
// tabs and "Mark what you've seen".
// Built on the design system (Notion "shadcn pass 1/5"): this file is listed
// with `@source` in src/index.css.
//
// Class names that the QA checks and the Escape ladder read are kept as hooks
// (`toolbar`, `tb-*`, `nav-tabs`, `search-wrap`, `filters-pill`,
// `filters-pop`, `on` on a selected segment).
import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FiltersPanel, activeFilterCount, StatusCounts, PickerButton } from './header-controls';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// One segmented group: shadcn's ToggleGroup in the tab list's look, with the
// sliding selection (SegPill) as its first child. Single choice: pressing the
// selected item again keeps it selected (and calls `onReselect`, if given).
// The selected item keeps `on`, which SegPill and the QA checks look for.
export function Segmented({ value, onChange, onReselect, items, className, label }: {
  value: string;
  onChange: (v: string) => void;
  onReselect?: (v: string) => void;
  items: { value: string; content: React.ReactNode; className?: string; title?: string; label?: string; style?: React.CSSProperties }[];
  className?: string;
  label?: string;
}) {
  return (
    <ToggleGroup value={[value]} onValueChange={(v: unknown[]) => { if (v.length) onChange(String(v[v.length - 1])); else if (onReselect) onReselect(value); }}
      aria-label={label}
      className={cn('segmented relative h-11 shrink-0 items-stretch gap-0 rounded-lg bg-muted p-1 max-[1560px]:p-[3px] max-[1000px]:p-0.5', className)}>
      <window.SegPill value={value}/>
      {items.map((it) => (
        <ToggleGroupItem key={it.value} value={it.value} title={it.title} aria-label={it.label} style={it.style}
          className={cn('relative z-1 h-auto rounded-md px-3.5 max-[1560px]:px-[11px] max-[1000px]:px-2 text-label font-medium text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-transparent aria-pressed:text-foreground',
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
      <span className="min-w-16 text-label font-medium whitespace-nowrap text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

type Setter = (v: string) => void;
export type Section = 'explore' | 'mylist' | 'guides';
export interface ToolbarProps {
  onHome: (e: React.MouseEvent) => void;
  guideId: string | null;
  onAbout: () => void;
  onSettings: () => void;
  settingsOpen: boolean;
  onPickTitle: (id: string) => void;
  onPickPerson: (person: unknown) => void;
  /** Enter in the search box with no suggestion highlighted (SearchInput). */
  onSubmitSearch?: (text: string) => boolean;
  section: Section; onSection: (s: Section) => void;
  sort: string; setSort: Setter;
  sortDir: string; setSortDir: Setter;
  phaseFilter: string; setPhaseFilter: Setter;
  typeFilter: string; setTypeFilter: Setter;
  budgetFilter: string; setBudgetFilter: Setter;
  releaseFilter: string; setReleaseFilter: Setter;
  /** The status filter (All / Unseen / Watchlist / Seen): the header's pills
   *  and the Filters panel's Status section. */
  collection: string; setCollection: Setter;
  search: string; setSearch: Setter;
}

// The app's three sections (Notion "Desktop: navigation for Explore, My list
// and Guides"), as tabs in the header. Hooks: `nav-tabs`, and `data-section`
// on each tab.
export const SECTIONS: Section[] = ['explore', 'mylist', 'guides'];

// "/" puts the cursor in search from anywhere but a text field, as the hint
// in the field says.
function useSlashToSearch(input: () => HTMLInputElement | null) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      // A single-key shortcut: off with Settings → Keyboard shortcuts.
      if (window.MCU_KEYS && !window.MCU_KEYS.enabled()) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const el = input();
      if (!el || el.disabled) return;
      e.preventDefault();
      el.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

type FilterProps = {
  collectionFilter?: string; setCollectionFilter?: Setter;
  phaseFilter: string; setPhaseFilter: Setter;
  typeFilter: string; setTypeFilter: Setter;
  budgetFilter: string; setBudgetFilter: Setter;
  releaseFilter: string; setReleaseFilter: Setter;
  className?: string;
};

// Filters: the catalog filters (Notion "Rethink the Filters menu", option
// A): the shared FiltersPanel (header-controls.tsx) in a popover. In the
// header on Connections and in Titles. The trigger reads "Filters · 2" when
// filters are on; below 1280px the icon and the count. Hooks: `filters-pill`,
// `filters-pop`, `fcount`.
export function FiltersMenu({ collectionFilter, setCollectionFilter, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, className }: FilterProps) {
  window.useI18n();
  const f = { collectionFilter, setCollectionFilter, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter };
  const activeFilters = activeFilterCount(f);
  return (
    <div className={cn('filters-pop-wrap relative shrink-0', className)}>
      <Popover>
        {/* The trigger is the popover's own button in the outline
            button's look: Base UI needs the real element as its anchor,
            which <Button> (no forwarded ref) cannot hand over. */}
        <PopoverTrigger className={cn(buttonVariants({ variant: 'outline' }), 'filters-pill h-10 gap-2 px-3.5 text-label max-[1000px]:px-[11px]', activeFilters && 'active')}
          aria-label={activeFilters ? tr('filters.aria', { n: activeFilters }) : tr('filters.title')} title={tr('filters.title')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
          <span className="filters-label max-[1280px]:hidden">{tr('filters.title')}{activeFilters ? ' ·' : ''}</span>
          {activeFilters ? <span className="fcount inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-label font-medium text-primary-foreground tabular-nums min-[1280px]:-ml-1 min-[1280px]:h-auto min-[1280px]:min-w-0 min-[1280px]:bg-transparent min-[1280px]:px-0 min-[1280px]:text-foreground">{activeFilters}</span> : null}
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={9} className="filters-pop w-[380px] max-w-[calc(100vw-24px)] gap-0 rounded-xl px-4 pt-3 pb-3.5">
          <FiltersPanel f={f}/>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Toolbar({ onHome, guideId, onAbout, onSettings, settingsOpen, onPickTitle, onPickPerson, onSubmitSearch, section, onSection, sort, setSort, sortDir, setSortDir, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, collection, setCollection, search, setSearch }: ToolbarProps) {
  const { lang } = window.useI18n();
  const searchRef = useRef<HTMLDivElement | null>(null);
  // The top row's fit steps (Notion "Universal status pills": the Seen and
  // Watchlist pills joined the row), tried in turn until the row fits, in any
  // language, filter state or text size, on top of the width breakpoints:
  //   1  Sort shows its short name;
  //   2  the pills drop their icons (counts only) and Account its name;
  //   3  search may narrow to 120px and drops its "/" hint;
  //   4  Sort keeps its icon and chevron alone (its name stays in its
  //      accessible label): Portuguese at Large text, 900px.
  // CSS keyed on the row (group/toprow), as the phone's group/toolrow.
  const topRow = useRef<HTMLDivElement | null>(null);
  const { progress } = window.useCollection() as unknown as { progress: { seenTotal: number; watchlist: number } };
  window.useFitSteps(topRow, 4, [lang, section, sort, sortDir, collection, phaseFilter, typeFilter, budgetFilter, releaseFilter, guideId, progress.seenTotal, progress.watchlist]);
  useSlashToSearch(() => searchRef.current && searchRef.current.querySelector('input'));
  // An open guide shows only its own stops: on the canvas, Sort still
  // arranges it while the filters are dimmed with a tooltip (GuideOff) and
  // kept for when it closes. The Guides section has no sort or filters.
  const guideOn = !!guideId;
  const Off = window.GuideOff;
  return (
    <div className="toolbar in-[.app.touch]:hidden sticky top-0 z-70 flex flex-col border-b border-border bg-background px-(--grid-margin) py-2.5" role="banner">
      <div ref={topRow} className="tb-row tb-top-row group/toprow flex min-w-0 items-center gap-3 max-[1100px]:gap-2">
        {/* The logo is a link home: it resets the app in place (onHome). */}
        <a className="brand group/brand flex min-w-0 shrink-0 items-center gap-3 rounded-lg text-inherit no-underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/" onClick={onHome} aria-label={tr('home.link')} title={tr('home.link')}>
          <span className="brand-mark logo-mark h-7 w-[15px] flex-[0_0_15px] group-hover/brand:brightness-115" aria-hidden="true"/>
          {/* The wordmark is drawn (.logo-word); the name stays as text for
              screen readers and the page outline. */}
          <h1 className="brand-title m-0 text-heading font-semibold whitespace-nowrap max-[1280px]:sr-only"><span className="logo-word block h-[21px] w-[111px]" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span></h1>
        </a>
        {/* The sections. A tab list in the segmented look; each tab says
            which section is shown (aria-current), like a site's navigation. */}
        <nav className="nav-tabs ml-2 shrink-0 max-[1100px]:ml-0" aria-label={tr('nav.aria')}>
          <Segmented value={section} onChange={(v) => onSection(v as Section)} onReselect={(v) => onSection(v as Section)} label={tr('nav.aria')} className="h-10"
            items={SECTIONS.map((v) => ({ value: v, content: tr('nav.' + v), className: 'px-4 text-body max-[1560px]:px-3.5 max-[1000px]:px-2.5' }))}/>
        </nav>
        <div className="min-w-0 flex-1"/>
        {/* Search, then (on Connections) Sort and Filters. */}
        <div ref={searchRef} className="search-wrap relative flex h-10 w-[300px] min-w-[180px] shrink items-center gap-2 rounded-md border border-input bg-(--field) px-3 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 max-[1280px]:w-[240px] max-[1100px]:min-w-[150px] group-data-[fit=2]/toprow:min-w-[150px] group-data-[fit=3]/toprow:min-w-[120px] group-data-[fit=4]/toprow:min-w-[120px] [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-body [&_input]:text-foreground [&_input]:outline-none [&_input]:placeholder:text-muted-foreground">
          <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson} onSubmit={onSubmitSearch}
            ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')} portalTo={null}/>
          <kbd className="search-kbd shrink-0 group-data-[fit=3]/toprow:hidden group-data-[fit=4]/toprow:hidden rounded-xs border border-border px-1.5 font-sans text-label leading-[18px] text-muted-foreground" aria-hidden="true" title={tr('search.slash')}>/</kbd>
        </div>
        {/* Sort and Filters on Connections and Titles (not Guides): the same
            top layer on both (Andre, 2026-11-15). */}
        {section !== 'guides' && <div className="tb-sort-control flex min-w-0 shrink-0 items-center [&_.sort-menu-trigger]:h-10">
          <window.SortMenu sort={sort} sortDir={sortDir} onChange={(k: string, d: string) => { setSort(k); setSortDir(d); }}/>
        </div>}
        {section !== 'guides' && <Off off={guideOn}><FiltersMenu {...{ collectionFilter: collection, setCollectionFilter: setCollection, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter }}/></Off>}
        {guideOn && section === 'explore' && <window.GuideOffHint/>}
        <div className="tb-end flex flex-[0_0_auto] items-center gap-2 max-[1100px]:gap-1.5 group-data-[fit=2]/toprow:gap-1.5 group-data-[fit=3]/toprow:gap-1.5 group-data-[fit=4]/toprow:gap-1.5 [&_.settings-btn]:size-10">
          <StatusCounts value={collection} onChange={setCollection} keepOn={section === 'guides'}/>
          <PickerButton/>
          <window.SyncStatus/>
          {/* Theme and language live in Settings (Notion "Settings menu"). */}
          <window.SettingsButton onOpen={onSettings} open={settingsOpen}/>
          <window.AccountButton onAbout={onAbout}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Toolbar, Segmented, SECTIONS, FiltersMenu });
