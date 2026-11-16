// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState, ScoreChip, XS, THUMB } from './list-parts';

// The desktop Titles list (Notion "Titles 1/5 (desktop): the order bar,
// sortable columns and phase groups", revised after Andre's reviews on
// 2026-11-15): your path through the catalogue in an order you choose. The
// header is the same as on Connections (search, Sort, Filters); Titles adds a
// second header row with the status tabs and "Mark what you've seen"
// (TitlesSubNav, below). The list itself: a slim header row whose columns
// sort with one click, then the rows; nothing in it is pinned. The compact
// card (All titles and Up next) floats in its top-right corner, as on
// Connections.
//
// - Release date and Phase group by phase, Story order by in-story era. Each
//   heading shows one small mark per released title, filled when seen.
// - Title, IMDb and RT are one flat ranked list.
// - The Sort menu and the header row are one state (`sort` and `sortDir` in
//   app.tsx, in the URL as `sort` and `order`), so they always agree.
// - Seen titles keep full strength and carry the seen mark on their poster.
//
// The rows keep their own grid of <div role="row"> rather than shadcn's
// <table>: the reorder animation needs it. Row checkboxes and the bulk bar
// were removed; marking many titles at once is "Mark what you've seen" (the
// picker). Class names the app and the QA checks read are kept as hooks
// (`dlist`, `dl-*`, `c-*`, `on`, `dim`, `seen`).

// #, Title (poster, name, phase and setting), Released, IMDb, RT, Seen and
// Watchlist.
//
// Two sizes, by the list's own width (a container query on .dlist: the
// details drawer narrows the list, the window alone can't tell): Regular,
// and Large from 84rem (1344px at the default text size). Every size is a
// `--dl-*` variable set once here, so the Notion task "Desktop size steps"
// can lift them into shared tokens for the Guides pages and the details
// panel. Fixed steps rather than a fluid height, so the pinned header and the
// scroll to Up next keep exact sizes; Settings' Text size still scales them.
const SIZE = '[--dl-cols:2.25rem_minmax(0,1fr)_7rem_5.5rem_5.5rem_max(172px,10.75rem)] [--dl-gap:1rem]'
  + ' [--dl-poster-w:40px] [--dl-poster-h:60px] [--dl-row-h:76px] [--dl-head-h-min:max(40px,2.5rem)]'
  + ' [--dl-title:var(--fs-base)] [--dl-meta:var(--fs-sm)] [--dl-fig:var(--fs-md)] [--dl-group:var(--fs-base)] [--dl-group-pt:1.25rem]'
  + ' [--dl-chip-h:max(32px,2rem)] [--dl-ctl-h:max(36px,2.25rem)] [--dl-btn:max(34px,2.125rem)] [--dl-icon:15px]'
  + ' @min-[84rem]:[--dl-cols:2.75rem_minmax(0,1fr)_8.5rem_6.5rem_6.5rem_max(196px,12.25rem)] @min-[84rem]:[--dl-gap:1.5rem]'
  + ' @min-[84rem]:[--dl-poster-w:52px] @min-[84rem]:[--dl-poster-h:78px] @min-[84rem]:[--dl-row-h:96px] @min-[84rem]:[--dl-head-h-min:max(44px,2.75rem)]'
  + ' @min-[84rem]:[--dl-title:var(--fs-lg)] @min-[84rem]:[--dl-meta:0.875rem] @min-[84rem]:[--dl-fig:var(--fs-base)] @min-[84rem]:[--dl-group:var(--fs-lg)] @min-[84rem]:[--dl-group-pt:1.75rem]'
  + ' @min-[84rem]:[--dl-chip-h:max(40px,2.5rem)] @min-[84rem]:[--dl-ctl-h:max(44px,2.75rem)] @min-[84rem]:[--dl-btn:max(40px,2.5rem)] @min-[84rem]:[--dl-icon:17px]';
const GRID = 'grid items-center grid-cols-(--dl-cols) gap-(--dl-gap)';
// The list's width: the heading, the controls and the rows line up. As wide
// as the list was before Titles 1/5, so a large screen isn't a narrow column.
const WIDTH = cn('mx-auto w-full max-w-[1480px]', SIZE);
const ROW_SIZE = 'min-h-(--dl-row-h) py-2';
const THUMB_SIZE = 'h-(--dl-poster-h) w-(--dl-poster-w) flex-[0_0_var(--dl-poster-w)]';
const FIG = 'text-(length:--dl-fig) tabular-nums';
// The reorder animation's leaving copies sit in a layer under the scroll area,
// outside the table that sets the sizes: they take the `--dl-*` values along
// (or they flash unstyled, full-size posters and all, on a tab switch).
const FLIP_OPTS = { inside: true, vars: { from: '.dl-table', names: [...new Set(SIZE.match(/--dl-[a-z-]+/g))] } };

// Column key -> sort mode it drives.
const DL_SORT_FOR = { title: 'title', release: 'release', imdb: 'imdb', rt: 'rt' };
// Orders that rank the whole list by one column: no groups, a clearable chip.
const FLAT = { title: true, imdb: true, rt: true };

// Groups for the current order: phases for Release date and Phase, in-story
// eras for Story order (the canvas's bands: "Before 2008", "2008–2012"…),
// none for the column sorts. Consecutive titles with the same key share a
// group; every phase is one run in release order today.
function eraInfo() {
  const E = window.MCU_storyEras;
  const eraOf = E.eraOf(window.TITLES);
  const span = {};
  window.TITLES.forEach(t => {
    const y = E.storyYear(t);
    if (y === null) return;
    const s = span[eraOf[t.id]] || (span[eraOf[t.id]] = { from: y, to: y });
    s.from = Math.min(s.from, y); s.to = Math.max(s.to, y);
  });
  const label = (era) => {
    if (era === 0) return window.MCU_I18N.tr('era.before', { year: E.starts[0] });
    const s = span[era];
    return !s ? '' : s.from === s.to ? String(s.from) : `${s.from}–${s.to}`;
  };
  return { eraOf, label };
}
function dlGroups(titles, sort) {
  if (FLAT[sort]) return [{ key: 'flat', id: 'flat', flat: true, items: titles }];
  const I = window.MCU_I18N;
  const chrono = sort === 'chrono';
  const era = chrono ? eraInfo() : null;
  const groups = [];
  titles.forEach(t => {
    const key = chrono ? 'e' + era.eraOf[t.id] : 'p' + t.phase;
    const last = groups[groups.length - 1];
    if (last && last.key === key) { last.items.push(t); return; }
    groups.push(chrono
      ? { key, era: era.eraOf[t.id], label: era.label(era.eraOf[t.id]), items: [t] }
      : { key, phase: t.phase, label: I.tr('phase.label', { n: t.phase }), color: window.PHASE_COLORS[t.phase], items: [t] });
  });
  // A key that comes back later (a catalogue change breaking a run) gets its
  // own id, so React keys and the fold stay distinct.
  groups.forEach((g, i) => { g.id = g.key + '#' + i; });
  return groups;
}

// Keyboard movement between rows ([data-row-id]: the List and the Guides
// table). A control is found again in another row by its column (the row's
// child that holds it) and its place inside that column, so the title moves to
// the title and Seen to Seen, even when one row carries an extra badge another
// doesn't.
const ROW_FOCUSABLE = 'input, button, a[href], [tabindex]:not([tabindex="-1"])';
// A column can itself be the control (the Guides table's title button), so
// it counts as well as anything inside it.
function rowControls(cell) {
  const own = cell.matches && cell.matches(ROW_FOCUSABLE) ? [cell] : [];
  return own.concat([...cell.querySelectorAll(ROW_FOCUSABLE)]).filter(el => !el.disabled && el.getClientRects().length > 0);
}
function sameControlIn(fromEl, toRow) {
  const from = fromEl && fromEl.closest && fromEl.closest('[data-row-id]');
  if (!from || from === toRow) return null;
  const cell = [...from.children].find(c => c.contains(fromEl));
  if (!cell) return null;
  const col = [...from.children].indexOf(cell);
  const k = Math.max(0, rowControls(cell).findIndex(el => el === fromEl || el.contains(fromEl)));
  const toCell = toRow.children[col];
  const there = toCell ? rowControls(toCell) : [];
  return there[Math.min(k, there.length - 1)] || rowControls(toRow)[0] || null;
}
// After a step to another title: when keyboard focus sat in a row, it moves
// to the same control in the new title's row (the caller scrolls).
window.MCU_followRowFocus = (toRow) => {
  const target = sameControlIn(document.activeElement, toRow);
  if (target) target.focus({ preventScroll: true });
};

// ↑ ↓ / Home / End in a desktop table of titles (the List, the Guides table).
// rowSelector picks the rows to land on (not headers or meters); openId is the
// title whose details are open; onFollow(id, n, total) opens another. Returns
// the table's ref and its keydown handler.
// - Focus in a row: ↑ ↓ move focus to the same control in the row above or
//   below, Home and End to the first and last row; they stop at the ends.
//   With the details open they follow the row, as in a mail app.
// - Details open but focus not in a row (after a mouse click focus is usually
//   on the page: Safari never focuses a clicked button, and a row itself is
//   not focusable): ↑ ↓ move from the open title to the row above or below and
//   open it, with n and total so the caller can announce the position. Focus
//   in the details, a field or a menu keeps the keys.
function useRowKeys(rowSelector, openId, onFollow) {
  const tableRef = React.useRef(null);
  const latest = React.useRef(null);
  latest.current = { rowSelector, openId, onFollow };
  const rowsNow = () => [...tableRef.current.querySelectorAll(latest.current.rowSelector)];
  const onKeyDown = (e) => {
    if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Home' && e.key !== 'End') return;
    const row = e.target.closest && e.target.closest(rowSelector);
    if (!row || !tableRef.current) return;
    const rows = rowsNow();
    const i = rows.indexOf(row);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : i + (e.key === 'ArrowDown' ? 1 : -1);
    e.preventDefault();
    if (j < 0 || j >= rows.length || j === i) return;
    const to = rows[j];
    const target = sameControlIn(e.target, to);
    if (target) target.focus({ preventScroll: true });
    to.scrollIntoView({ block: 'nearest' });
    if (openId && onFollow) onFollow(to.getAttribute('data-row-id'));
  };
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const { openId: id, onFollow: follow } = latest.current;
      if (!id || !follow || !tableRef.current) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t && t.closest('[data-row-id], input, textarea, select, [contenteditable="true"], [role="listbox"], [role="menu"], [role="group"], [role="dialog"], .drawer')) return;
      if (document.querySelector('.sort-order-pop, .acct-pop, .filters-pop, .ss-pop, .g-pop, [aria-modal="true"]')) return;
      const rows = rowsNow();
      const i = rows.findIndex(r => r.getAttribute('data-row-id') === id);
      if (i < 0) return;
      const j = i + (e.key === 'ArrowDown' ? 1 : -1);
      e.preventDefault();
      if (j < 0 || j >= rows.length) return;
      rows[j].scrollIntoView({ block: 'nearest' });
      follow(rows[j].getAttribute('data-row-id'), j + 1, rows.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { tableRef, onKeyDown };
}
window.useRowKeys = useRowKeys;

// A sortable column header. Clicking it sorts by that column (in its usual
// direction: Title A–Z, Released oldest first, IMDb and RT highest first);
// clicking it again reverses it. The arrow shows only on the active column.
function DlSortHeader({ col, label, end = false, sort, sortDir, setSort, setSortDir }) {
  const tr = window.MCU_I18N.tr;
  const mode = DL_SORT_FOR[col];
  const active = sort === mode;
  const onClick = () => (active ? setSortDir(sortDir === 'asc' ? 'desc' : 'asc') : setSort(mode));
  return (
    // The cell reaches into the gap by the button's padding, so the label
    // lines up with the column's figures and the button stays inside it.
    <span className={cn('dl-h c-' + col, 'flex', end ? '-mr-1.5 justify-end' : '-ml-1.5', active && 'on')} role="columnheader"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={onClick} title={tr(active ? 'list.reverse' : 'list.sortBy', { label })}
        // Right-aligned columns put the arrow first, so the label lines up
        // with the figures under it.
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'group/sh h-[max(28px,1.75rem)] gap-1 px-1.5 text-xs', end && 'flex-row-reverse',
          active ? 'bg-muted font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
        {label}
        <span className={cn('dl-arrow inline-block w-[1ch] text-center', XS, active ? 'text-(--brand)' : 'opacity-0 group-hover/sh:opacity-45')} aria-hidden="true">
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </span>
  );
}

// Titles' second layer, under the header (Andre, 2026-11-15: the header is
// the same on Connections and Titles, with Sort and Filters; Titles adds this
// row): the status tabs, and "Mark what you've seen" for marking many at once.
// Rendered by the toolbar, pinned with it. Hooks: `ml-status`, `ml-pick`.
function TitlesSubNav({ collection, setCollection }) {
  const tr = window.MCU_I18N.tr;
  window.useI18n();
  return (
    <div className="ml-status flex min-w-0 flex-1 items-center gap-3">
      <window.CollectionSwitch value={collection} onChange={setCollection}/>
      <span className="flex-1"/>
      {window.MCU_openPicker && (
        <Button variant="ghost" size="sm" className="ml-pick h-9 gap-1.5 px-2.5 text-xs font-medium text-(--status-seen-text) hover:text-(--status-seen-text)" onClick={() => window.MCU_openPicker()}>
          <svg className="size-[15px]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><path d="m14 18 2 2 4-4"/></svg>{tr('picker.open')}
        </Button>
      )}
    </div>
  );
}

// A group's heading: its dot, its name, and its progress as a short
// segmented bar, one segment per released title, red when seen, with "4/6"
// (Andre, 2026-11-15: the full-width bar was too heavy; 2026-11-16: round
// marks read unlike every other meter, and like the dot before the name). A plain heading, not a fold: the list opens at Up next, and the
// Unseen tab hides what you've seen. Progress counts released titles in the
// catalogue's filters, not the tab (app.tsx `groupProgress`), so Seen does not
// always read 100%. Hooks: `dl-group`, `dl-group-head`, `dl-group-count`,
// `dl-group-marks`. `phone`: the same heading over the phone List's rows
// (Notion "Titles 4/5"), outside a table and at the phone's sizes.
function GroupHeader({ g, prog, phone = false }) {
  const tr = window.MCU_I18N.tr;
  const has = !!(prog && prog.released > 0);
  const done = has && prog.seen >= prog.released;
  // Marks while they stay small enough to tell apart; a short bar past that.
  const marks = has && prog.released <= 24;
  return (
    <div role={phone ? undefined : 'row'} className={cn('dl-group', phone && 'm-ghead [.m-group:first-child>&]:-mt-1')}>
      <span role={phone ? undefined : 'cell'} className={cn('dl-group-head flex items-center gap-2.5 font-semibold text-foreground',
        phone ? 'pt-5 pb-2.5 text-base' : 'pt-(--dl-group-pt) pb-2.5 text-(length:--dl-group)')}>
        <span className="size-2 flex-[0_0_8px] rounded-full" style={{ background: g.color || 'var(--muted-foreground)' }} aria-hidden="true"/>
        <span className="dl-group-label whitespace-nowrap">{g.label}</span>
        {has && (
          <span className="ml-1 inline-flex items-center gap-2" aria-hidden="true">
            {marks ? (
              // 12px a segment up to 8, then sharing 96px (as wide as the
              // plain bar past 24), so a long phase doesn't push the count off.
              <span className="dl-group-marks seg flex h-1 items-center gap-[3px]" style={{ width: prog.released <= 8 ? prog.released * 15 - 3 : 120 }}>
                {Array.from({ length: prog.released }, (_, i) => (
                  <span key={i} className={cn('h-full min-w-0 flex-1 rounded-[1px]', i < prog.seen ? 'on bg-(--brand)' : 'bg-[color-mix(in_oklab,var(--muted-foreground)_32%,transparent)]')}/>
                ))}
              </span>
            ) : (
              <span className="dl-group-marks block h-1 w-[120px] overflow-hidden rounded-[1px] bg-muted"><span className="block h-full rounded-full bg-(--brand)" style={{ width: Math.round((prog.seen / prog.released) * 100) + '%' }}/></span>
            )}
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{prog.seen}/{prog.released}</span>
          </span>
        )}
        {has && <span className="dl-group-count story-sr">{done ? tr('list.groupAll', { n: prog.released }) : tr('progress.seen', { seen: prog.seen, n: prog.released })}</span>}
      </span>
    </div>
  );
}

function DesktopList({ titles, sort, sortDir, setSort, setSortDir, search, searchCharMatches, openId, onOpen, onFollow, activeChar, activeChars, header, empty, orderKey, groupProgress, upNext, floatingCard }) {
  const I = window.MCU_I18N;
  const tr = I.tr;
  const { statusOf } = window.useCollection();
  const PosterArt = window.PosterArt;
  const flat = !!FLAT[sort];

  const { tableRef, onKeyDown: onTableKey } = useRowKeys('.dl-row[data-row-id]', openId, onFollow);
  const groups = dlGroups(titles, sort);
  // Rows glide to their new places when the order or tab changes (the same
  // animation as the phone List).
  const flipRef = window.useReorderAnimation(orderKey, FLIP_OPTS);

  // Up next (Notion "Titles 2/5"): the first released, unseen title in this
  // order, tab and filters (MCU_selectUpNext, through app.tsx), marked in its
  // row. None on the Seen tab or while searching.
  const upNextId = upNext && upNext.result && upNext.result.kind === 'next' ? upNext.result.title.id : null;
  // The list opens with the Up next row in view: when it is below the fold,
  // scrolled up to the top; again when the order or the tab changes. Not
  // when a title's details are open (it has its own place).
  const scrollWant = React.useRef(true);
  const scrollSig = sort + ':' + sortDir + ':' + (upNext && upNext.watchScope ? 'w' : '');
  const lastSig = React.useRef(scrollSig);
  if (lastSig.current !== scrollSig) { lastSig.current = scrollSig; scrollWant.current = true; }
  React.useLayoutEffect(() => {
    if (!scrollWant.current || !upNextId || !tableRef.current) return;
    scrollWant.current = false;
    if (openId) return;
    const row = tableRef.current.querySelector(`.dl-row[data-row-id="${CSS.escape(upNextId)}"]`);
    const dl = row && row.closest('.dlist');
    if (!row || !dl) return;
    if (row.getBoundingClientRect().bottom <= dl.getBoundingClientRect().bottom) return;
    row.scrollIntoView({ block: 'start' });
  });
  let n = 0;
  return (
    <div className={cn('dlist @container relative min-h-0 flex-1 overflow-y-auto px-[22px] pt-3.5 pb-12 min-[1280px]:in-[.app.drawer-open]:pr-[402px] [&>.m-flip-layer]:z-4', flat && 'ranked')}
      ref={flipRef} role="main" aria-label={tr('view.list')}>
      {/* The compact card (All titles and Up next), in the same place as on
          Connections: the top-right corner (Andre, 2026-11-15: same card,
          same place). A zero-height sticky holder, so it takes no room and
          floats over the list as it scrolls; its offset is measured inside the
          list's top padding. Rows scrolled into view stop below it. */}
      {floatingCard && (
        <div className="dl-card-wrap pointer-events-none sticky top-0 z-6 h-0">
          <div className="absolute top-0 right-[-6px]">{floatingCard}</div>
        </div>
      )}
      {/* "64 titles" and the filter chips, only when they narrow the list. */}
      {header && <div className={cn('ml-top pb-2', WIDTH)}>{header}</div>}
      {!titles.length ? (
        <EmptyState desktop title={empty && empty.title} sub={empty && empty.sub} action={empty && empty.action}/>
      ) : (
        <div className={cn('dl-table text-sm text-muted-foreground', WIDTH)} role="table" aria-label={tr('view.list')}
          ref={tableRef} onKeyDown={onTableKey}>
          <div className={cn(GRID, 'dl-row dl-head h-(--dl-head-h-min) border-b text-xs @min-[84rem]:text-sm')} role="row">
            <span className="dl-h c-rank text-right tabular-nums" role="columnheader"><span aria-hidden="true">#</span><span className="story-sr">{tr('list.col.rank')}</span></span>
            <DlSortHeader col="title" label={tr('list.col.title')} sort={sort} sortDir={sortDir} setSort={setSort} setSortDir={setSortDir}/>
            <DlSortHeader col="release" label={tr('list.col.release')} sort={sort} sortDir={sortDir} setSort={setSort} setSortDir={setSortDir}/>
            <DlSortHeader col="imdb" label="IMDb" end sort={sort} sortDir={sortDir} setSort={setSort} setSortDir={setSortDir}/>
            <DlSortHeader col="rt" label="RT" end sort={sort} sortDir={sortDir} setSort={setSort} setSortDir={setSortDir}/>
            <span className="dl-h c-actions" role="columnheader"><span className="story-sr">{tr('list.col.actions')}</span></span>
          </div>
          {groups.map(g => {
            const prog = !g.flat && groupProgress ? (g.phase ? groupProgress.byPhase[g.phase] : groupProgress.byEra[g.era]) : null;
            return (
              <div key={g.id} role="rowgroup" className="dl-block">
                {!g.flat && <GroupHeader g={g} prog={prog}/>}
                {g.items.map(t => {
                  n += 1;
                  const seen = statusOf(t.id) === 'seen';
                  const matched = searchCharMatches ? (searchCharMatches[t.id] || []) : [];
                  // A pinned performer covers several characters: a row is
                  // only dimmed when it holds none of them.
                  const dim = activeChars ? !activeChars.some(c => t.cast.includes(c)) : (activeChar && !t.cast.includes(activeChar));
                  // "Set in 2010" for a time; a setting that isn't one
                  // ("Outside time") reads on its own.
                  const story = t.story ? (/\d/.test(t.story) ? tr('story.setIn', { story: I.storyLabel(t.story) }) : I.storyLabel(t.story)) : null;
                  const meta = [tr('phase.label', { n: t.phase }), story].filter(Boolean).join(' · ');
                  const isNext = t.id === upNextId;
                  return (
                    <div key={t.id} role="row" data-row-id={t.id} data-flip-id={t.id} onClick={() => onOpen(t.id)}
                      className={cn(GRID, 'dl-row relative -mx-3 cursor-pointer scroll-mt-[168px] scroll-mb-3 border-b border-border/70 px-3 transition-[background-color,opacity] duration-150 hover:bg-muted/50', ROW_SIZE,
                        seen && 'seen', isNext && 'up-next bg-[color-mix(in_oklab,var(--brand)_7%,transparent)] hover:bg-[color-mix(in_oklab,var(--brand)_11%,transparent)]',
                        openId === t.id && 'on bg-muted shadow-[inset_3px_0_0_var(--primary)] hover:bg-muted', dim && 'dim opacity-35')}>
                      <span className="c-rank text-right text-xs tabular-nums text-muted-foreground" role="cell">
                        {/* Up next's red edge, inside the first cell so every
                            row keeps the same cells for ↑ ↓. It comes in with
                            Up next's own motion when Up next moves here. */}
                        {isNext && <span className="dl-next-bar absolute top-2.5 bottom-2.5 left-0 w-[3px] animate-[un-in_260ms_ease_both] rounded-full bg-(--brand) motion-reduce:animate-none" aria-hidden="true"/>}
                        {n}
                      </span>
                      <span className="c-title flex min-w-0 items-center gap-3" role="cell">
                        {/* Seen: the cards' quiet mark in the poster's corner
                            (Andre, 2026-11-15: no dimming, every row at full
                            strength; the mark and the green check say it). */}
                        <span className={cn('dl-thumb relative block rounded-[5px]', THUMB_SIZE, THUMB)}>
                          <PosterArt title={t}/>
                          {seen && (
                            <span className="dl-seen absolute top-[3px] right-[3px] inline-flex size-4 items-center justify-center rounded-full border border-[#5fa856] bg-[rgba(10,12,20,.82)] text-[#7cc472] shadow-[0_1px_4px_rgba(0,0,0,.45)] @min-[84rem]:size-5 [&_svg]:size-2.5 @min-[84rem]:[&_svg]:size-3"
                              role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col items-start">
                          <span className="flex max-w-full min-w-0 items-center gap-2">
                            <button className="dl-open min-w-0 cursor-pointer truncate text-left text-(length:--dl-title) font-semibold text-foreground outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50" aria-expanded={openId === t.id}
                              onClick={e => { e.stopPropagation(); onOpen(t.id); }}>
                              <window.Highlight text={I.titleName(t)} query={search}/>
                            </button>
                            {isNext && (
                              <span className="dl-next-pill flex-none animate-[un-in_260ms_ease_both] rounded-full border border-[color-mix(in_oklab,var(--brand)_40%,var(--border))] bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-2 py-px text-xs font-semibold whitespace-nowrap text-[color-mix(in_oklch,var(--brand)_78%,var(--foreground))] motion-reduce:animate-none">
                                {tr('upnext.label')}
                              </span>
                            )}
                          </span>
                          <span className="dl-meta mt-0.5 truncate text-(length:--dl-meta) text-muted-foreground">{meta}</span>
                          <window.ReleaseBadge title={t} className="dl-release mt-[5px] flex w-max"/>
                          {/* Which character matched the search. */}
                          <window.MatchBadge matchedChars={matched} query={search} title={t}/>
                        </span>
                      </span>
                      <span className={cn('c-release text-foreground/85', FIG)} role="cell">{t.year}</span>
                      <span className="c-imdb flex justify-end" role="cell">{t.imdb != null ? <ScoreChip kind="imdb" title={t} className="w-max"/> : <span className="dl-none text-muted-foreground">—</span>}</span>
                      <span className="c-rt flex justify-end" role="cell">{t.rt != null ? <ScoreChip kind="rt" title={t} className="w-max"/> : <span className="dl-none text-muted-foreground">—</span>}</span>
                      <span className="c-actions flex justify-end" role="cell" onClick={e => e.stopPropagation()}>
                        <window.TitleStatusActions title={t} upNext={isNext} className="dl-tsa static z-auto flex-row gap-1.5 [transform:none] [&_.tsa-btn:not(.tsa-next)]:size-(--dl-btn) [&_.tsa-btn:not(.tsa-next)_svg]:size-(--dl-icon) [&_.tsa-next]:h-(--dl-btn) @min-[84rem]:[&_.tsa-next]:text-sm [&_.tsa-gap]:order-0"/>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
window.DesktopList = DesktopList;
window.TitlesSubNav = TitlesSubNav;
// The phone List groups and heads its rows the same way (mobile.tsx).
window.MCU_listGroups = dlGroups;
window.ListGroupHeader = GroupHeader;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { useRowKeys, DesktopList, TitlesSubNav, dlGroups, GroupHeader };
