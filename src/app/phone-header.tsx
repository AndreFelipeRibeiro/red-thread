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
// `m-tab`, `on`, `m-chip`, `m-flab`, `m-apply`…).
import React from 'react';
import { flushSync } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SortMenu, FiltersPanel, StatusCounts, PickerButton } from './header-controls';

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
  /** Enter in the search box with no suggestion highlighted (SearchInput). */
  onSubmitSearch?: SearchProps['onSubmit'];
  onOpenFilters: () => void;
  filterCount: number;
  sort: string;
  sortDir: string;
  setSort: (sort: string) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  onOpenAccount: () => void;
  onOpenSettings?: () => void;
  guideActive: boolean;
  /** The status filter, for the Seen and Watchlist pills. */
  collection: string;
  setCollection: (v: string) => void;
}

// The phone header (Notion "Phone: bottom bar becomes Explore, My list and
// Guides"): the wordmark, then search, Settings and Account as icon buttons;
// under it one toolbar row for Explore and My list: Sort and Filters, plus
// the Seen and Watchlist pills and "Mark what you've seen". Search opens in place of the toolbar row (the suggestions list
// spans it) and a ✕ closes it; it stays open while there is text. Guides has
// no toolbar row.
// An open guide on the canvas dims Filters (GuideOff); Sort still arranges it.
export function MobileTopBar({ onHome, section, search, setSearch, onPickTitle, onPickPerson, onSubmitSearch, onOpenFilters, filterCount, sort, sortDir, setSort, setSortDir, onOpenAccount, onOpenSettings, guideActive, collection, setCollection }: MobileTopBarProps) {
  const { lang } = window.useI18n();
  // The suggestions list spans the whole search row (see SearchInput).
  const [searchRow, setSearchRow] = React.useState<HTMLDivElement | null>(null);
  const [searching, setSearching] = React.useState(false);
  const open = searching || !!search;
  const Off = window.GuideOff;
  const tools = section !== 'guides';
  // "Mark what you've seen" ends the toolbar row in Titles, where the count
  // used to be (Andre, 2026-11-15; the compact card shows the count). Where
  // its label doesn't fit (Portuguese, small phones, large text) it becomes
  // an icon button, its label kept for screen readers (step 1); at 320px the
  // row's gaps tighten too (step 2), and at a large text size Filters becomes
  // an icon button as well (step 3; its name and count stay in aria-label);
  // Sort keeps its icon (step 4), and the count pills narrow (step 5:
  // Portuguese at Large text, 320px).
  const toolRow = React.useRef<HTMLDivElement | null>(null);
  // The pills' counts widen the row once the collection loads, so the row
  // fits again when they change.
  const { progress } = window.useCollection() as unknown as { progress: { seenTotal: number; watchlist: number } };
  window.useFitSteps(toolRow, 5, [lang, section, sort, filterCount, collection, open, progress.seenTotal, progress.watchlist]);
  // The field is drawn and focused inside the tap itself: iPhones only bring
  // up the keyboard for focus given during the gesture.
  const openSearch = () => {
    flushSync(() => setSearching(true));
    const el = document.querySelector<HTMLInputElement>('.m-searchrow input');
    if (el) el.focus();
  };
  const ICON_BTN = 'size-[max(38px,2.375rem)] flex-[0_0_38px] p-0 transition-[scale,background-color,color,border-color,box-shadow] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100';
  return (
    <div role="banner" className={cn('m-appbar z-50 flex flex-[0_0_auto] flex-col gap-2.5 border-b border-border bg-background px-3.5 pt-2.5 pb-[11px] min-[600px]:px-5 min-[600px]:pt-3 min-[600px]:pb-[13px]',
      guideActive && 'guide')}>
      {guideActive && section === 'explore' && <window.GuideOffHint/>}
      <div className="m-appbar-top flex items-center justify-between gap-2">
        <a className="m-brandrow flex min-w-0 flex-[1_1_auto] items-center gap-2.5 rounded-lg text-inherit no-underline outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-3 focus-visible:ring-ring/50"
          href="/" onClick={onHome} aria-label={tr('home.link')}>
          <span className="m-mark logo-mark h-[28px] w-[15px] flex-[0_0_15px]" aria-hidden="true"/>
          <h1 className="m-btitle m-0 overflow-hidden text-body leading-[1.15] font-semibold tracking-tight text-ellipsis whitespace-nowrap">
            <span className="logo-word h-[21px] w-[111px]" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span>
          </h1>
        </a>
        <window.SyncStatus/>
        <Button type="button" variant="outline" className={cn('m-search-btn', ICON_BTN, open && 'on bg-(--field-hover)')}
          aria-label={tr('search.aria')} aria-expanded={open} onClick={() => { if (open) { setSearch(''); setSearching(false); } else openSearch(); }}>
          <svg className="size-[17px]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
        </Button>
        {/* The language menu moved into Settings; the gear takes its place. */}
        {onOpenSettings && <window.SettingsButton onOpen={onOpenSettings} className={cn('m-settings-btn', 'size-[max(38px,2.375rem)] flex-[0_0_38px]')}/>}
        <window.AccountAvatarButton onOpen={onOpenAccount}/>
      </div>
      {open ? (
        <div className="m-searchrow relative flex items-center gap-2" ref={setSearchRow}>
          <div className="m-searchbar flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-(--field) px-3 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
            {/* Drawn at 13px while the field's own font stays at least 16px, or
                iPhones zoom the page when it takes focus (13.8px at Large;
                Andre, 2026-11-02). */}
            <div className="m-search-input relative h-6 min-w-0 flex-1 [&_input]:absolute [&_input]:inset-y-0 [&_input]:left-0 [&_input]:h-6 [&_input]:w-[123.076923%] [&_input]:origin-left [&_input]:scale-[.8125] [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-[length:max(16px,calc(var(--fs-heading)*var(--fs-chrome-scale,1)))] [&_input]:text-foreground [&_input]:outline-none [&_input]:placeholder:text-muted-foreground">
              <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson} onSubmit={onSubmitSearch}
                ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')} portalTo={searchRow}/>
            </div>
          </div>
          <Button variant="ghost" className="m-clear h-11 shrink-0 px-2.5 text-body" onClick={() => { setSearch(''); setSearching(false); }}>{tr('search.done')}</Button>
        </div>
      ) : tools && (
        <div ref={toolRow} className="m-toolrow group/toolrow flex min-w-0 items-center gap-2 data-[fit=2]:gap-1 data-[fit=3]:gap-1 data-[fit=4]:gap-1 data-[fit=5]:gap-1 data-[fit=4]:[&_.sort-menu-trigger]:gap-1.5 data-[fit=5]:[&_.sort-menu-trigger]:gap-1.5 data-[fit=4]:[&_.sort-menu-trigger]:px-2.5 data-[fit=5]:[&_.sort-menu-trigger]:px-2.5 data-[fit=4]:[&_.sort-menu-trigger>svg:last-child]:hidden data-[fit=5]:[&_.sort-menu-trigger>svg:last-child]:hidden data-[fit=4]:[&_.sort-menu-label]:hidden data-[fit=5]:[&_.sort-menu-label]:hidden">
          <SortMenu sort={sort} sortDir={sortDir} onChange={(k, d) => { setSort(k); setSortDir(d); }} mobile/>
          <Off off={guideActive && section === 'explore'}>
            <Button variant="outline" className={cn('m-fpill relative h-11 gap-2 px-3 text-label text-foreground group-data-[fit=3]/toolrow:w-11 group-data-[fit=3]/toolrow:px-0 group-data-[fit=4]/toolrow:w-11 group-data-[fit=5]/toolrow:w-11 group-data-[fit=4]/toolrow:px-0 group-data-[fit=5]/toolrow:px-0', filterCount && 'act bg-(--field-hover)')}
              onClick={onOpenFilters} aria-label={filterCount ? tr('filters.aria', { n: filterCount }) : tr('filters.title')} title={tr('filters.title')}>
              <svg className="size-[14px]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              <span className="group-data-[fit=3]/toolrow:sr-only group-data-[fit=4]/toolrow:sr-only group-data-[fit=5]/toolrow:sr-only">{tr('filters.title')}</span>
              {filterCount ? <span className="m-fcount absolute tabular-nums -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-label font-bold text-primary-foreground">{filterCount}</span> : null}
            </Button>
          </Off>
          {/* The Seen and Watchlist pills and "Mark what you've seen", in
              every section (Notion "Universal status pills"). */}
          <StatusCounts phone value={collection} onChange={setCollection}/>
          <PickerButton phone/>
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
// `onReselect`: tapping the section already shown; returning true means the
// app handled it (Guides with a guide open goes back to the list).
export function MobileNavBar({ section, onSection, onReselect }: { section: PhoneSection; onSection: (s: PhoneSection) => void; onReselect?: (s: PhoneSection) => boolean }) {
  window.useI18n();
  return (
    <div className="m-navbar relative z-30 flex-[0_0_auto] bg-background">
      <nav className="m-tabs relative z-30 flex flex-[0_0_auto] items-stretch border-t border-border bg-background pb-[env(safe-area-inset-bottom,8px)]" aria-label={tr('nav.aria')}>
        {(['explore', 'mylist', 'guides'] as PhoneSection[]).map((v) => (
          <button key={v} type="button" data-section={v} aria-current={section === v ? 'page' : undefined}
            className={cn('m-tab flex min-h-[60px] flex-1 cursor-pointer flex-col items-center justify-center gap-[5px] border-0 bg-transparent px-0.5 pt-2.5 pb-2 text-[length:max(12px,calc(var(--fs-caption)*var(--fs-chrome-scale,1)))] leading-[1.3] font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [-webkit-tap-highlight-color:transparent]',
              section === v && 'on text-(--brand)')}
            onClick={() => { if (section === v) { if (onReselect && onReselect(v)) return; if (v !== 'explore') scrollListToTop(); } else onSection(v); }}>
            <svg className="size-[22px]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{NAV_ICONS[v]}</svg>
            {tr('nav.' + v)}
          </button>
        ))}
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
      <div className="m-flab mb-[9px] text-label font-medium text-muted-foreground">{label}</div>
      <ToggleGroup value={[value]} onValueChange={(v: unknown[]) => { if (v.length) onChange(String(v[v.length - 1])); }}
        aria-label={label} className="flex w-auto flex-wrap gap-[7px]">
        {items.map((it) => (
          <ToggleGroupItem key={it.value} value={it.value} variant="outline" style={it.style}
            className={cn('m-chip h-auto min-h-10 px-3.5 text-body font-medium text-muted-foreground aria-pressed:text-foreground dark:aria-pressed:bg-input/50', value === it.value && 'on', it.className)}>
            {it.content}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export interface FilterSheetProps {
  collectionFilter?: string; setCollectionFilter?: (v: string) => void;
  phaseFilter: string; setPhaseFilter: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
  budgetFilter: string; setBudgetFilter: (v: string) => void;
  releaseFilter: string; setReleaseFilter: (v: string) => void;
  onClose: () => void;
  showing: number;
  onClear: () => void;
}

// The Filters sheet: the phone's Filters panel, the same FiltersPanel as
// desktop (Notion "Rethink the Filters menu", option A), its footer the
// button that closes the sheet ("Show 11 titles"). The sheet frame (handle,
// swipe, Back, focus trap) is the shared `Sheet` in mobile.tsx.
export function FilterSheet({ collectionFilter, setCollectionFilter, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, onClose, showing }: FilterSheetProps) {
  const Sheet = window.Sheet;
  const f = { collectionFilter, setCollectionFilter, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter };
  return (
    <Sheet onClose={onClose} tall label={tr('filters.title')}>
      <FiltersPanel f={f} phone showing={showing} onDone={onClose}/>
    </Sheet>
  );
}

Object.assign(window, { MobileTopBar, MobileNavBar, FilterSheet });
