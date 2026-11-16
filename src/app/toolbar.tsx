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
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

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
export type Section = 'explore' | 'mylist' | 'guides';
export interface ToolbarProps {
  onHome: (e: React.MouseEvent) => void;
  guideId: string | null;
  onAbout: () => void;
  onSettings: () => void;
  settingsOpen: boolean;
  onPickTitle: (id: string) => void;
  onPickPerson: (person: unknown) => void;
  section: Section; onSection: (s: Section) => void;
  sort: string; setSort: Setter;
  sortDir: string; setSortDir: Setter;
  phaseFilter: string; setPhaseFilter: Setter;
  typeFilter: string; setTypeFilter: Setter;
  budgetFilter: string; setBudgetFilter: Setter;
  releaseFilter: string; setReleaseFilter: Setter;
  search: string; setSearch: Setter;
  /** Titles' second row (the status tabs and "Mark what you've seen"). */
  subNav?: React.ReactNode;
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
  phaseFilter: string; setPhaseFilter: Setter;
  typeFilter: string; setTypeFilter: Setter;
  budgetFilter: string; setBudgetFilter: Setter;
  releaseFilter: string; setReleaseFilter: Setter;
  className?: string;
};

// Filters: one popover with the catalogue filters (phase, type, budget,
// released). In the header on Connections; beside the status tabs in Titles
// (Notion "Titles 1/5"). Hooks: `filters-pill`, `filters-pop`, `fcount`.
export function FiltersMenu({ phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, className }: FilterProps) {
  window.useI18n();
  // Type joined the catalogue filters (Notion navigation: "Type moves into
  // Filters"), so it counts with them.
  const activeFilters = (phaseFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (budgetFilter !== 'all' ? 1 : 0) + (releaseFilter !== 'all' ? 1 : 0);
  const PHASE_COLORS = window.PHASE_COLORS as Record<string, string>;
  return (
    <div className={cn('filters-pop-wrap relative shrink-0', className)}>
      <Popover>
        {/* The trigger is the popover's own button in the outline
            button's look: Base UI needs the real element as its anchor,
            which <Button> (no forwarded ref) cannot hand over. */}
        <PopoverTrigger className={cn(buttonVariants({ variant: 'outline' }), 'filters-pill h-10 gap-2 px-3.5 text-xs max-[1000px]:px-[11px]', activeFilters && 'active')}
          aria-label={activeFilters ? tr('filters.aria', { n: activeFilters }) : tr('filters.title')} title={tr('filters.title')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
          <span className="filters-label max-[1280px]:hidden">{tr('filters.title')}</span>
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
          <FilterGroup label={tr('filters.type')}>
            <div className="tb-type-controls flex">
              <Segmented value={typeFilter} onChange={setTypeFilter}
                items={[['all', 'type.all'], ['film', 'type.films'], ['series', 'type.series']].map(([v, k]) => ({ value: v, content: tr(k) }))}/>
            </div>
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
          {activeFilters > 0 && (
            <Button variant="link" size="sm" className="pop-clear h-auto px-0 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setPhaseFilter('all'); setTypeFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }}>{tr('filters.clear')}</Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Toolbar({ onHome, guideId, onAbout, onSettings, settingsOpen, onPickTitle, onPickPerson, section, onSection, sort, setSort, sortDir, setSortDir, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, search, setSearch, subNav }: ToolbarProps) {
  window.useI18n();
  const searchRef = useRef<HTMLDivElement | null>(null);
  useSlashToSearch(() => searchRef.current && searchRef.current.querySelector('input'));
  // An open guide shows only its own stops: on the canvas, Sort still
  // arranges it while the filters are dimmed with a tooltip (GuideOff) and
  // kept for when it closes. The Guides section has no sort or filters.
  const guideOn = !!guideId;
  const Off = window.GuideOff;
  return (
    <div className="toolbar in-[.app.touch]:hidden sticky top-0 z-70 flex flex-col border-b border-border bg-background/95 px-[22px] py-2.5 backdrop-blur-md max-[1560px]:px-4" role="banner">
      <div className="tb-row tb-top-row flex min-w-0 items-center gap-3 max-[1100px]:gap-2">
        {/* The logo is a link home: it resets the app in place (onHome). */}
        <a className="brand group/brand flex min-w-0 shrink-0 items-center gap-3 rounded-lg text-inherit no-underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/" onClick={onHome} aria-label={tr('home.link')} title={tr('home.link')}>
          <span className="brand-mark logo-mark h-7 w-[15px] flex-[0_0_15px] group-hover/brand:brightness-115" aria-hidden="true"/>
          {/* The wordmark is drawn (.logo-word); the name stays as text for
              screen readers and the page outline. */}
          <h1 className="brand-title m-0 text-base font-semibold whitespace-nowrap max-[1280px]:sr-only"><span className="logo-word block h-[21px] w-[111px]" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span></h1>
        </a>
        {/* The sections. A tab list in the segmented look; each tab says
            which section is shown (aria-current), like a site's navigation. */}
        <nav className="nav-tabs ml-2 shrink-0 max-[1100px]:ml-0" aria-label={tr('nav.aria')}>
          <Segmented value={section} onChange={(v) => onSection(v as Section)} label={tr('nav.aria')} className="h-10"
            items={SECTIONS.map((v) => ({ value: v, content: tr('nav.' + v), className: 'px-4 text-sm max-[1560px]:px-3.5 max-[1000px]:px-2.5' }))}/>
        </nav>
        <div className="min-w-0 flex-1"/>
        {/* Search, then (on Connections) Sort and Filters. */}
        <div ref={searchRef} className="search-wrap relative flex h-10 w-[300px] min-w-[180px] shrink items-center gap-2 rounded-md border border-input bg-transparent px-3 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30 max-[1280px]:w-[240px] [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-sm [&_input]:text-foreground [&_input]:outline-none [&_input]:placeholder:text-muted-foreground">
          <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson}
            ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')} portalTo={null}/>
          <kbd className="search-kbd shrink-0 rounded-[5px] border border-border px-1.5 font-sans text-xs leading-[18px] text-muted-foreground" aria-hidden="true" title={tr('search.slash')}>/</kbd>
        </div>
        {/* Sort and Filters on Connections and Titles (not Guides): the same
            top layer on both (Andre, 2026-11-15). */}
        {section !== 'guides' && <div className="tb-sort-control flex min-w-0 shrink-0 items-center [&_.sort-menu-trigger]:h-10">
          <window.SortMenu sort={sort} sortDir={sortDir} onChange={(k: string, d: string) => { setSort(k); setSortDir(d); }}/>
        </div>}
        {section !== 'guides' && <Off off={guideOn}><FiltersMenu {...{ phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter }}/></Off>}
        {guideOn && section === 'explore' && <window.GuideOffHint/>}
        <div className="tb-end flex flex-[0_0_auto] items-center gap-2 [&_.settings-btn]:size-10">
          <window.SyncStatus/>
          {/* Theme and language live in Settings (Notion "Settings menu"). */}
          <window.SettingsButton onOpen={onSettings} open={settingsOpen}/>
          <window.AccountButton onAbout={onAbout}/>
        </div>
      </div>
      {/* Titles' second layer: the status tabs and "Mark what you've seen",
          pinned with the header (Andre, 2026-11-15). */}
      {subNav && <div className="tb-row tb-sub-row mt-2.5 -mb-0.5 flex min-w-0 items-center gap-3 border-t border-border pt-2.5">{subNav}</div>}
    </div>
  );
}

Object.assign(window, { Toolbar, Segmented, SECTIONS, FiltersMenu });
