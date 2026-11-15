// The phone header, the bottom bar (Explore / My list / Guides), My list's bar
// and the Filters sheet's contents (Notion "shadcn pass 1/5", "Merge sort and
// order into one Sort menu", "Phone: bottom bar becomes Explore, My list and
// Guides").
//
// Moved out of mobile.tsx so they can be built on the design system: this file
// is listed with `@source` in src/index.css. Same controls, same places, same labels
// as before; only the building blocks changed.
//
// Still V3 inside the app bar, for later passes of the same epic: the sync
// dot, the Guides, Settings and Account buttons (5/5, menus and dialogs) and
// the sheet the filters sit in (`Sheet` in mobile.tsx, shared with the title
// sheet: 3/5).
//
// Class names the QA checks read are kept as hooks (`m-appbar`, `m-searchrow`,
// `m-searchbar`, `m-search-btn`, `m-toolrow`, `m-fpill`, `m-fcount`, `m-tabs`,
// `m-tab`, `m-listbar`, `on`, `m-chip`, `m-flab`, `m-apply`…).
import React from 'react';
import { flushSync } from 'react-dom';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SortMenu, CollectionSwitch } from './header-controls';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);


type SearchProps = Parameters<typeof window.SearchInput>[0];

export type PhoneSection = 'explore' | 'mylist' | 'guides';
export interface MobileTopBarProps {
  onHome: (e: React.MouseEvent) => void;
  section: PhoneSection;
  search: string;
  setSearch: (q: string) => void;
  onPickTitle: SearchProps['onPickTitle'];
  onPickPerson: SearchProps['onPickPerson'];
  onOpenFilters: () => void;
  filterCount: number;
  sort: string;
  sortDir: string;
  setSort: (sort: string) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  onOpenAccount: () => void;
  onOpenSettings?: () => void;
  guideActive: boolean;
  /** A quiet count at the end of the toolbar row ("44 of 60 seen"). */
  count?: string | null;
}

// The phone header (Notion "Phone: bottom bar becomes Explore, My list and
// Guides"): the wordmark, then search, Settings and Account as icon buttons;
// under it one toolbar row for Explore and My list: Sort, Filters and a quiet
// count. Search opens in place of that row (the suggestions list spans it) and
// a ✕ closes it; it stays open while there is text. Guides has no toolbar row.
// An open guide on the canvas dims Filters (GuideOff); Sort still arranges it.
export function MobileTopBar({ onHome, section, search, setSearch, onPickTitle, onPickPerson, onOpenFilters, filterCount, sort, sortDir, setSort, setSortDir, onOpenAccount, onOpenSettings, guideActive, count }: MobileTopBarProps) {
  window.useI18n();
  // The suggestions list spans the whole search row (see SearchInput).
  const [searchRow, setSearchRow] = React.useState<HTMLDivElement | null>(null);
  const [searching, setSearching] = React.useState(false);
  const open = searching || !!search;
  const Off = window.GuideOff;
  const tools = section !== 'guides';
  // The field is drawn and focused inside the tap itself: iPhones only bring
  // up the keyboard for focus given during the gesture.
  const openSearch = () => {
    flushSync(() => setSearching(true));
    const el = document.querySelector<HTMLInputElement>('.m-searchrow input');
    if (el) el.focus();
  };
  const ICON_BTN = 'size-[max(38px,2.375rem)] flex-[0_0_38px] p-0 transition-[scale,background-color,color,border-color,box-shadow] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100';
  return (
    <div role="banner" className={cn('m-appbar z-50 flex flex-[0_0_auto] flex-col gap-2.5 border-b border-border bg-background/94 px-3.5 pt-2.5 pb-[11px] backdrop-blur-md min-[600px]:px-5 min-[600px]:pt-3 min-[600px]:pb-[13px]',
      guideActive && 'guide')}>
      {guideActive && section === 'explore' && <window.GuideOffHint/>}
      <div className="m-appbar-top flex items-center justify-between gap-2">
        <a className="m-brandrow flex min-w-0 flex-[1_1_auto] items-center gap-2.5 rounded-lg text-inherit no-underline outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/" onClick={onHome} aria-label={tr('home.link')}>
          <span className="m-mark logo-mark h-7 w-[15px] flex-[0_0_15px]" aria-hidden="true"/>
          <h1 className="m-btitle m-0 overflow-hidden text-[15px] leading-[1.15] font-semibold tracking-tight text-ellipsis whitespace-nowrap">
            <span className="logo-word h-[21px] w-[111px]" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span>
          </h1>
        </a>
        <window.SyncStatus/>
        <Button type="button" variant="outline" className={cn('m-search-btn', ICON_BTN, open && 'on bg-muted dark:bg-input/50')}
          aria-label={tr('search.aria')} aria-expanded={open} onClick={() => { if (open) { setSearch(''); setSearching(false); } else openSearch(); }}>
          <svg className="size-[17px]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
        </Button>
        {/* The language menu moved into Settings; the gear takes its place. */}
        {onOpenSettings && <window.SettingsButton onOpen={onOpenSettings} className={cn('m-settings-btn', 'size-[max(38px,2.375rem)] flex-[0_0_38px]')}/>}
        <window.AccountAvatarButton onOpen={onOpenAccount}/>
      </div>
      {open ? (
        <div className="m-searchrow relative flex items-center gap-2" ref={setSearchRow}>
          <div className="m-searchbar flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
            <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
            {/* Drawn at 13px while the field's own font stays at least 16px, or
                iPhones zoom the page when it takes focus (13.8px at Large;
                Andre, 2026-11-02). */}
            <div className="m-search-input relative h-6 min-w-0 flex-1 [&_input]:absolute [&_input]:inset-y-0 [&_input]:left-0 [&_input]:h-6 [&_input]:w-[123.076923%] [&_input]:origin-left [&_input]:scale-[.8125] [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-[length:max(16px,calc(var(--fs-base)*var(--fs-chrome-scale,1)))] [&_input]:text-foreground [&_input]:outline-none [&_input]:placeholder:text-muted-foreground">
              <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson}
                ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')} portalTo={searchRow}/>
            </div>
          </div>
          <Button variant="ghost" className="m-clear h-11 shrink-0 px-2.5 text-sm" onClick={() => { setSearch(''); setSearching(false); }}>{tr('search.done')}</Button>
        </div>
      ) : tools && (
        <div className="m-toolrow flex min-w-0 items-center gap-2">
          <SortMenu sort={sort} sortDir={sortDir} onChange={(k, d) => { setSort(k); setSortDir(d); }} mobile/>
          <Off off={guideActive && section === 'explore'}>
            <Button variant="outline" className={cn('m-fpill relative h-11 gap-2 px-3 text-xs text-foreground', filterCount && 'act bg-muted dark:bg-input/50')}
              onClick={onOpenFilters} aria-label={filterCount ? tr('filters.aria', { n: filterCount }) : tr('filters.title')} title={tr('filters.title')}>
              <svg className="size-[14px]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              {tr('filters.title')}
              {filterCount ? <span className="m-fcount absolute tabular-nums -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-[9px] bg-primary px-1 text-xs font-bold text-primary-foreground">{filterCount}</span> : null}
            </Button>
          </Off>
          {count && <span className="m-count ml-auto truncate text-xs text-muted-foreground tabular-nums">{count}</span>}
        </div>
      )}
    </div>
  );
}

// Icons for the bottom bar, drawn like the rest of the app's (stroke 2).
const NAV_ICONS: Record<PhoneSection, React.ReactNode> = {
  explore: <><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/></>,
  mylist: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>,
  guides: <><path d="M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M7 17h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6"/></>,
};

// Tapping the tab that is already selected takes My list back to the top, the
// tab-bar habit from iOS (Notion V4 Tasks, "Mobile: Press twice resets the
// list"). It only scrolls: nothing re-sorts and the address is untouched.
function scrollListToTop() {
  const area = document.querySelector('.m-main .m-scrollarea');
  if (!area || area.scrollTop === 0) return;
  const still = window.MCU_MOTION.reduced();
  area.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
}

// The bottom bar: the app's three sections, each with its icon; the current
// one in the accent colour. Hooks: `m-navbar`, `m-tabs`, `m-tab`, `on`,
// `data-section`.
export function MobileNavBar({ section, onSection }: { section: PhoneSection; onSection: (s: PhoneSection) => void }) {
  window.useI18n();
  return (
    <div className="m-navbar relative z-30 flex-[0_0_auto] bg-background">
      <nav className="m-tabs relative z-30 flex flex-[0_0_auto] items-stretch border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom,8px)] backdrop-blur-md" aria-label={tr('nav.aria')}>
        {(['explore', 'mylist', 'guides'] as PhoneSection[]).map((v) => (
          <button key={v} type="button" data-section={v} aria-current={section === v ? 'page' : undefined}
            className={cn('m-tab flex min-h-[60px] flex-1 cursor-pointer flex-col items-center justify-center gap-[5px] border-0 bg-transparent px-0.5 pt-2.5 pb-2 text-[length:max(12px,calc(var(--fs-xs)*var(--fs-chrome-scale,1)))] leading-[1.3] font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [-webkit-tap-highlight-color:transparent]',
              section === v && 'on text-primary')}
            onClick={() => { if (section === v) { if (v !== 'explore') scrollListToTop(); } else onSection(v); }}>
            <svg className="size-[22px]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{NAV_ICONS[v]}</svg>
            {tr('nav.' + v)}
          </button>
        ))}
      </nav>
    </div>
  );
}

// My list's own bar on phones: the collection tabs (the phone's Grid was
// removed, Notion "Phone: remove the Grid view"). Hook: `m-listbar`.
//
// Portuguese labels are much longer than English ones (Notion "Top nav (PT) /
// content overflowing"), so the row tries each step and keeps the first that
// fits (useFitSteps), in any language and at any text size:
//   0  every label;  1  (no change; the view menu's old step);  2  the switch
//   shows only "All" and the selected option's label;  3  "Para ver" in place
//   of "Para assistir" (Andre's approval). The steps are CSS keyed on the row
//   (group/viewrow).
export function MyListBar({ collection, setCollection }: {
  collection: string; setCollection: (v: string) => void;
}) {
  const { lang } = window.useI18n();
  const row = React.useRef<HTMLDivElement | null>(null);
  const fit = window.useFitSteps(row, 3, [lang, collection]);
  return (
    <>
    <div ref={row} className="m-listbar group/viewrow mb-1.5 flex min-w-0 items-center gap-2" data-fit={fit}>
      <CollectionSwitch value={collection} onChange={setCollection} variant="compact" short={fit >= 3}/>
    </div>
    {/* "Mark what you've seen" moved here from the Account sheet (Notion
        "Take the collection filters out of the Account menu"). */}
    {window.MCU_openPicker && (
      <Button variant="ghost" className="m-pick mb-2 h-9 gap-1.5 self-start px-1.5 text-xs text-(--status-seen) hover:text-(--status-seen)" onClick={() => window.MCU_openPicker()}>
        <svg className="size-[14px]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><path d="m14 18 2 2 4-4"/></svg>{tr('picker.open')}
      </Button>
    )}
    </>
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
  onClose: () => void;
  showing: number;
  onClear: () => void;
}

// The Filters sheet: the phone's Filters panel. The sheet frame (handle,
// swipe, Back, focus trap) is the shared `Sheet` in mobile.tsx; the contents
// are on the design system.
export function FilterSheet({ phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, onClose, showing, onClear }: FilterSheetProps) {
  const Sheet = window.Sheet;
  const MPHASE_COLORS = window.MPHASE_COLORS as Record<string, string>;
  return (
    <Sheet onClose={onClose} tall label={tr('filters.title')}>
      <div>
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
        <Button className="m-apply mt-1 h-auto min-h-10 w-full" onClick={onClose}>{tr('filters.show', { n: showing })}</Button>
      </div>
    </Sheet>
  );
}

Object.assign(window, { MobileTopBar, MobileNavBar, MyListBar, FilterSheet });
