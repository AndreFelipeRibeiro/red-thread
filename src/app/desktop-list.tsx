// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState, ScoreChip, XS, THUMB } from './list-parts';

// The desktop Titles list (Notion "Titles 1/5 (desktop): the order bar,
// sortable columns and phase groups", revised after Andre's reviews on
// 2026-11-15): your path through the catalogue in an order you choose. The
// header is the same as on Connections (search, Sort, Filters, the status
// pills; Notion "Universal status pills", 2026-11-16). The list itself: a slim header row whose columns
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
// and Large from 84rem (1344px at the default text size). The sizes are the
// shared size-step tokens (`step-sizes`, `--step-*` in src/index.css; Notion
// "Size steps 1/3"), which the Guides pages and the details panel read too;
// only the columns (`--dl-cols`) are the list's own.
const SIZE = 'step-sizes [--dl-cols:2.25rem_minmax(0,1fr)_7rem_5.5rem_5.5rem_max(172px,10.75rem)]'
  + ' @min-[84rem]:[--dl-cols:2.75rem_minmax(0,1fr)_8.5rem_6.5rem_6.5rem_max(196px,12.25rem)]';
const GRID = 'grid items-center grid-cols-(--dl-cols) gap-(--step-gap)';
// The list's width: the heading, the controls and the rows line up. As wide
// as the list was before Titles 1/5, so a large screen isn't a narrow column.
const WIDTH = cn('mx-auto w-full max-w-(--list-max)', SIZE);
const ROW_SIZE = 'min-h-(--step-row-h) py-2';
const THUMB_SIZE = 'h-(--step-poster-h) w-(--step-poster-w) flex-[0_0_var(--step-poster-w)]';
const FIG = 'text-(length:--step-figure) tabular-nums';
// The reorder animation's leaving copies sit in a layer under the scroll area,
// outside the table that sets the sizes: they take those values along
// (or they flash unstyled, full-size posters and all, on a tab switch).
// The size-step tokens (src/index.css) plus the list's own columns.
const STEP_VARS = ['--step-gap', '--step-poster-w', '--step-poster-h', '--step-row-h', '--step-head-h', '--step-title', '--step-meta',
  '--step-figure', '--step-group', '--step-group-pt', '--step-chip-h', '--step-control-h', '--step-button', '--step-icon'];
const FLIP_OPTS = { inside: true, vars: { from: '.dl-table', names: ['--dl-cols', ...STEP_VARS] } };

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
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'group/sh h-[max(28px,1.75rem)] gap-1 px-1.5 text-label', end && 'flex-row-reverse',
          active ? 'bg-muted font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
        {label}
        <span className={cn('dl-arrow inline-block w-[1ch] text-center', XS, active ? 'text-(--brand)' : 'opacity-0 group-hover/sh:opacity-45')} aria-hidden="true">
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </span>
  );
}

// A group's heading: a dot in the phase color, the name in the foreground,
// and the count ("4/6") after it, quieter: regular weight, muted and a step
// smaller, so it doesn't compete with the name (Andre, 2026-11-21, Notion
// "Titles headings"; the library's Phase header and Phone phase header draw
// it). Era headings have no phase color, so no dot. A plain heading, not a
// fold: the list opens at Up next, and the Unseen tab hides what you've seen.
// Progress counts released titles in the catalogue's filters, not the tab
// (app.tsx `groupProgress`), so Seen does not always read 100%; it is hidden
// during a search and while a character is pinned. Hooks: `dl-group`, `dl-group-head`, `dl-group-count`
// (the sentence), `dl-group-num` ("4/6"). `phone`: the same heading over the phone List's rows
// (Notion "Titles 4/5"), outside a table and at the phone's sizes.
function GroupHeader({ g, prog, phone = false }) {
  const tr = window.MCU_I18N.tr;
  const has = !!(prog && prog.released > 0);
  const done = has && prog.seen >= prog.released;
  return (
    <div role={phone ? undefined : 'row'} className={cn('dl-group', phone && 'm-ghead [.m-group:first-child>&]:-mt-1')}>
      <span role={phone ? undefined : 'cell'} className={cn('dl-group-head flex items-baseline gap-2 font-semibold text-foreground',
        phone ? 'pt-5 pb-2.5 text-heading' : 'pt-(--step-group-pt) pb-2.5 text-(length:--step-group)')}>
        {/* "● Phase 1 4/6" (Andre, 2026-11-21): see the comment above. */}
        {g.color && <span className="dl-group-dot size-2 flex-none self-center rounded-full" style={{ background: g.color }} aria-hidden="true"/>}
        <span className="dl-group-label -ml-0.5 whitespace-nowrap">{g.label}</span>
        {has && <span className={cn('dl-group-num font-normal tabular-nums text-muted-foreground', phone ? 'text-label' : 'text-(length:--step-meta)')} aria-hidden="true">{prog.seen}/{prog.released}</span>}
        {has && <span className="dl-group-count story-sr">{done ? tr('list.groupAll', { n: prog.released }) : tr('progress.seen', { seen: prog.seen, n: prog.released })}</span>}
      </span>
    </div>
  );
}

function DesktopList({ titles, sort, sortDir, setSort, setSortDir, search, charMarks, openId, onOpen, onFollow, activeChar, activeChars, header, empty, orderKey, groupProgress, upNext, floatingCard }) {
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
    <div className={cn('dlist @container relative min-h-0 flex-1 overflow-y-auto px-(--grid-margin) pt-3.5 pb-12 wide:in-[.app.drawer-open]:pr-[calc(var(--drawer-w)+var(--grid-margin))] [&>.m-flip-layer]:z-4', flat && 'ranked')}
      ref={flipRef} role="main" aria-label={tr('view.list')}>
      {/* The compact card (All titles and Up next), in the same place as on
          Connections: the top-right corner (Andre, 2026-11-15: same card,
          same place). A zero-height sticky holder, so it takes no room and
          floats over the list as it scrolls; its offset is measured inside the
          list's top padding. Rows scrolled into view stop below it. */}
      {floatingCard && (
        <div className="dl-card-wrap pointer-events-none sticky top-0 z-6 h-0">
          <div className="absolute top-0 right-[calc(16px-var(--grid-margin))]">{floatingCard}</div>
        </div>
      )}
      {/* "64 titles" and the filter chips, only when they narrow the list. */}
      {header && <div className={cn('ml-top pb-2', WIDTH)}>{header}</div>}
      {!titles.length ? (
        <EmptyState desktop title={empty && empty.title} sub={empty && empty.sub} action={empty && empty.action}/>
      ) : (
        <div className={cn('dl-table text-body text-muted-foreground', WIDTH)} role="table" aria-label={tr('view.list')}
          ref={tableRef} onKeyDown={onTableKey}>
          <div className={cn(GRID, 'dl-row dl-head h-(--step-head-h) border-b text-label @min-[84rem]:text-body')} role="row">
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
                  // A pinned performer covers several characters: a row is
                  // only dimmed when it holds none of them.
                  const dim = activeChars ? !activeChars.some(c => t.cast.includes(c)) : (activeChar && !t.cast.includes(activeChar));
                  // "Set in 2010" for a time; a setting that isn't one
                  // ("Outside time") reads on its own.
                  const story = t.story ? (/\d/.test(t.story) ? tr('story.setIn', { story: I.storyLabel(t.story) }) : I.storyLabel(t.story)) : null;
                  // Another cut on streaming (Endgame's Encore): a small tag in the caption.
                  const edition = t.editions && t.editions[0] ? tr('edition.tag', { name: t.editions[0].name[I.lang] || t.editions[0].name.en, service: t.editions[0].service }) : null;
                  const meta = [tr('phase.label', { n: t.phase }), story, edition].filter(Boolean).join(' · ');
                  const isNext = t.id === upNextId;
                  // Up next's tint, hover and pill are the brand tokens, as on
                  // the phone's title row (Notion "Up next row: put its tint
                  // and pill on tokens", 2026-11-21).
                  return (
                    <div key={t.id} role="row" data-row-id={t.id} data-flip-id={t.id} onClick={() => onOpen(t.id)}
                      className={cn(GRID, 'dl-row relative -mx-3 cursor-pointer scroll-mt-[168px] scroll-mb-3 border-b border-border/70 px-3 transition-[background-color,opacity] duration-150 hover:bg-muted/50', ROW_SIZE,
                        seen && 'seen', isNext && 'up-next bg-(--brand-tint) hover:bg-(--brand-tint-strong)',
                        openId === t.id && 'on bg-muted shadow-[inset_3px_0_0_var(--brand)] hover:bg-muted', dim && 'dim opacity-35')}>
                      <span className="c-rank text-right text-label tabular-nums text-muted-foreground" role="cell">
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
                            <span className="dl-seen absolute top-[3px] right-[3px] inline-flex size-4 items-center justify-center rounded-full border border-(--seen) bg-(--seen) text-(--seen-foreground) shadow-[0_1px_4px_rgba(0,0,0,.45)] @min-[84rem]:size-5 [&_svg]:size-2.5 @min-[84rem]:[&_svg]:size-3"
                              role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col items-start">
                          <span className="flex max-w-full min-w-0 items-center gap-2">
                            <button className="dl-open min-w-0 cursor-pointer truncate text-left text-(length:--step-title) font-semibold text-foreground outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50" aria-expanded={openId === t.id}
                              onClick={e => { e.stopPropagation(); onOpen(t.id); }}>
                              <window.Highlight text={I.titleName(t)} query={search}/>
                            </button>
                            {isNext && (
                              <span className="dl-next-pill flex-none animate-[un-in_260ms_ease_both] rounded-full border border-(--brand-border) bg-(--brand-tint) px-2 py-px text-label font-semibold whitespace-nowrap text-(--brand-text) motion-reduce:animate-none">
                                {tr('upnext.label')}
                              </span>
                            )}
                          </span>
                          <span className="dl-meta mt-0.5 max-w-full truncate text-(length:--step-meta) text-muted-foreground">{meta}</span>
                          <window.ReleaseBadge title={t} className="dl-release mt-[5px] flex w-max"/>
                          {/* Who the row is here for: the search's match or
                              the picked character (CharMark, list-parts.tsx). */}
                          <window.CharMark mark={charMarks ? charMarks[t.id] : null} title={t} size={20} className="dl-mark mt-1 text-label text-muted-foreground"/>
                        </span>
                      </span>
                      <span className={cn('c-release text-foreground/85', FIG)} role="cell">{t.year}</span>
                      <span className="c-imdb flex justify-end" role="cell">{t.imdb != null ? <ScoreChip kind="imdb" title={t} className="w-max"/> : <span className="dl-none text-muted-foreground">—</span>}</span>
                      <span className="c-rt flex justify-end" role="cell">{t.rt != null ? <ScoreChip kind="rt" title={t} className="w-max"/> : <span className="dl-none text-muted-foreground">—</span>}</span>
                      <span className="c-actions flex justify-end" role="cell" onClick={e => e.stopPropagation()}>
                        <window.TitleStatusActions title={t} upNext={isNext} className="dl-tsa static z-auto flex-row gap-1.5 [transform:none] [&_.tsa-btn:not(.tsa-next)]:size-(--step-button) [&_.tsa-btn:not(.tsa-next)_svg]:size-(--step-icon) [&_.tsa-next]:h-(--step-button) @min-[84rem]:[&_.tsa-next]:text-body [&_.tsa-gap]:order-0"/>
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
// The phone List groups and heads its rows the same way (mobile.tsx).
window.MCU_listGroups = dlGroups;
window.ListGroupHeader = GroupHeader;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { useRowKeys, DesktopList, dlGroups, GroupHeader };
