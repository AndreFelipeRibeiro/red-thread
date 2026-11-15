// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 109 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScoreChip, EmptyState, XS, THUMB } from './list-parts';

// On the design system since Notion "shadcn pass 4/5: List and Grid views"
// (this file is listed with `@source` in src/index.css). The table keeps its own grid of <div role="row"> rather than
// shadcn's <table>: its sticky meters and headers, its columns that drop by
// the List's own width (container queries) and the reorder animation all need
// the grid; the rows and heads take the Table component's recipe (muted
// heads, a bottom border, the muted hover, the selected row). The checkboxes
// stay native inputs drawn with the Checkbox recipe, so `checked`,
// `indeterminate`, Shift-click ranges, row keyboard movement and forced-colours
// mode keep working; the faces keep `Portrait` (failed-address memory and
// initials) in the Avatar group's look. Class names the app and the QA checks
// read are kept as hooks (`dlist`, `dl-*`, `c-*`, `bulk-*`, `on`, `dim`…).

// The columns, in rem so they grow with the text, and the steps that drop
// them by the List's own width (it narrows when the drawer opens): budget and
// characters first, then type and in-story years, then phase. Ranked orders
// (IMDb, RT) add a rank column.
const COLS = {
  plain: 'grid-cols-[1.75rem_44px_minmax(10.25rem,2.4fr)_3.5rem_4.25rem_6.5rem_minmax(7rem,1fr)_5.25rem_5.5rem_4.5rem_max(132px,7.5rem)_84px] @max-[77rem]:grid-cols-[1.75rem_44px_minmax(11rem,2.4fr)_3.5rem_4.25rem_6.5rem_minmax(7rem,1fr)_5.5rem_4.5rem_84px] @max-[62.75rem]:grid-cols-[1.75rem_44px_minmax(10rem,1fr)_4.25rem_6.5rem_5.5rem_4.5rem_84px] @max-[49.75rem]:grid-cols-[1.75rem_44px_minmax(8.75rem,1fr)_6.5rem_5.5rem_4.5rem_84px]',
  ranked: 'grid-cols-[1.75rem_1.75rem_44px_minmax(10.25rem,2.4fr)_3.5rem_4.25rem_6.5rem_minmax(7rem,1fr)_5.25rem_5.5rem_4.5rem_max(132px,7.5rem)_84px] @max-[77rem]:grid-cols-[1.75rem_1.75rem_44px_minmax(11rem,2.4fr)_3.5rem_4.25rem_6.5rem_minmax(7rem,1fr)_5.5rem_4.5rem_84px] @max-[62.75rem]:grid-cols-[1.75rem_1.75rem_44px_minmax(10rem,1fr)_4.25rem_6.5rem_5.5rem_4.5rem_84px] @max-[49.75rem]:grid-cols-[1.75rem_1.75rem_44px_minmax(8.75rem,1fr)_6.5rem_5.5rem_4.5rem_84px]',
};
const rowGrid = (ranked) => cn('dl-row grid items-center gap-3 px-3 @max-[49.75rem]:gap-2.5', ranked ? COLS.ranked : COLS.plain);
const HIDE = { budget: '@max-[77rem]:hidden', cast: '@max-[77rem]:hidden', type: '@max-[62.75rem]:hidden', story: '@max-[62.75rem]:hidden', phase: '@max-[49.75rem]:hidden' };
const cell = (col, extra) => cn('c-' + col, HIDE[col], extra);
// A native checkbox drawn with shadcn's Checkbox recipe: the input's border
// and fill, a tick (or a dash when mixed) in the primary's ink.
const CHECK = "dl-check relative inline-grid size-4 flex-[0_0_16px] cursor-pointer appearance-none place-content-center rounded-[4px] border border-input shadow-xs transition-[background-color,border-color,box-shadow] outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary dark:checked:bg-primary dark:indeterminate:bg-primary before:size-2.5 before:scale-0 before:bg-primary-foreground before:transition-transform before:content-[''] before:[clip-path:polygon(12%_50%,0_64%,40%_100%,100%_22%,87%_8%,40%_72%)] checked:before:scale-100 indeterminate:before:h-0.5 indeterminate:before:w-2 indeterminate:before:scale-100 indeterminate:before:rounded-[1px] indeterminate:before:[clip-path:none] motion-reduce:transition-none motion-reduce:before:transition-none forced-colors:appearance-auto forced-colors:before:hidden";
// The phase (or All titles) meter: the bar is the rule between phases and the
// meter for the one starting below, drawn above its label; it pins at the top
// of the List, above the column headers (which pin beneath it, --dl-lead-h),
// and a later phase's meter slides up under the headers and takes the slot.
const DIVIDER = 'dl-phase-divider mt-7 px-3 pb-[7px] text-sm font-semibold tracking-tight text-(--pm,var(--muted-foreground)) [&+.dl-glabel]:pt-[7px] [&_.pgh]:flex-col-reverse [&_.pgh]:gap-1.5 [&_.pgh-label]:text-(--pm) [&_.pgh-top]:items-center [&_.pgh-action]:h-[max(30px,1.875rem)]';
const STICKY = 'sticky top-[-14px] z-4 -mx-3 block bg-background px-6 py-2';
const OVERALL = 'overall text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))] [&_.pgh-label]:text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]';

// Desktop List view: one row per title, in the current sort, as an alternative
// to Spatial for scanning and comparing. Rows follow `visible` (every filter,
// including the collection one, actually removes rows here). Column headers
// that match a sort mode change the sort; clicking the active one reverses it,
// so they stay in step with the sort row and the Order menu. A row opens the
// details drawer, and the list makes room for it.

// Column key -> sort mode it drives (null: not sortable).
const DL_SORT_FOR = { title: 'title', phase: 'phase', release: 'release', story: 'chrono', imdb: 'imdb', rt: 'rt' };
const DL_COLUMNS = ['poster', 'title', 'type', 'phase', 'release', 'story', 'budget', 'imdb', 'rt', 'cast', 'actions'];

// Group rows the way the mobile List does: by release year, in-story timeframe
// or phase. The other sorts are one ranked or alphabetical run.
function dlGroups(titles, sort) {
  const I = window.MCU_I18N;
  const groups = [];
  titles.forEach(t => {
    let key = 'all', label = null, extra = {};
    if (sort === 'release') { key = 'y' + t.year; label = String(t.year); }
    else if (sort === 'chrono') { key = 's' + (t.story || '-'); label = t.story ? I.storyLabel(t.story) : I.tr('story.tba'); extra = { story: true }; }
    else if (sort === 'phase') { key = 'p' + t.phase; label = I.tr('phase.label', { n: t.phase }); extra = { color: window.PHASE_COLORS[t.phase], phase: t.phase }; }
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(t);
    else groups.push({ key, id: key + '#' + groups.length, label, ...extra, items: [t] });
  });
  // Release groups by year, so a phase spans several of them. Mark the group
  // that opens each phase: it gets a divider above its year, acting as a
  // super-header. Every phase is one continuous run in release order today, so
  // this fires once per phase; if a later catalog entry breaks that, the
  // divider simply appears again with the same whole-phase count rather than
  // splitting the phase in two.
  if (sort === 'release') {
    let seen = null;
    groups.forEach(g => {
      const phase = g.items[0].phase;
      if (phase !== seen) { g.phaseStart = phase; seen = phase; }
    });
  } else if (sort === 'phase') {
    // In Phase order every group IS a phase, so it carries the same divider
    // Release uses rather than a second header of its own — the phone views
    // were unified the same way.
    groups.forEach(g => { g.phaseStart = g.phase; g.label = null; });
  }
  return groups;
}

// Keyboard movement between rows ([data-row-id]: the List and the Guides
// table). A control is found again in another row by its column (the row's
// child that holds it) and its place inside that column, so the title moves to
// the title, the checkbox to the checkbox and Seen to Seen, even when one row
// carries an extra badge another doesn't.
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
//   With the details open they follow the row, as in a mail app. Shift is left
//   free for a later range selection.
// - Details open but focus not in a row (after a mouse click focus is usually
//   on the page: Safari never focuses a clicked button, and a row itself is
//   not focusable): ↑ ↓ move from the open title to the row above or below and
//   open it, with n and total so the caller can announce the position. Focus
//   in the details, a field, a menu or the bulk bar keeps the keys.
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
      if (t && t.closest('[data-row-id], input, textarea, select, [contenteditable="true"], [role="listbox"], [role="menu"], [role="group"], [role="dialog"], .drawer, .bulk-bar')) return;
      if (document.querySelector('.sort-order-pop, .acct-pop, .filters-pop, .ss-pop, .bulk-more-pop, .g-pop, [aria-modal="true"]')) return;
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

// Character face: the actor photo when there is one, else initials on the
// character's colour. Matched search characters get a ring.
// Dark or white initials, whichever reads better on the character's colour
// (WCAG relative luminance; dark text wins on light colours).
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const ch = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  const dark = 0.0042; // #0a0c14
  return (lum + 0.05) / (dark + 0.05) >= 1.05 / (lum + 0.05) ? '#0a0c14' : '#fff';
}
function DlFace({ id, matched }) {
  const I = window.MCU_I18N;
  const c = window.CHARACTERS[id] || {};
  const media = window.MEDIA;
  const path = media && media.actors && media.actors[id];
  const name = I.charName(id);
  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const url = path && (window.mediaURL ? window.mediaURL('a', id, media.profile_base + path) : media.profile_base + path);
  return (
    <span className={cn('dl-face relative inline-flex size-6 flex-[0_0_24px] items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-background [&+&]:-ml-1.5 [&_img]:block [&_img]:size-full [&_img]:object-cover', XS, matched && 'matched z-1 ring-ring')}
      title={name} style={{ background: c.color || '#555', color: inkOn(c.color || '#555') }}>
      <window.Portrait url={url} alt="" initials={initials}/>
    </span>
  );
}

function DlSortHeader({ col, label, sort, sortDir, setSort, setSortDir }) {
  const tr = window.MCU_I18N.tr;
  const mode = DL_SORT_FOR[col];
  if (!mode) return <span className={cell(col, 'dl-h')} role="columnheader">{label}</span>;
  const active = sort === mode;
  const onClick = () => (active ? setSortDir(sortDir === 'asc' ? 'desc' : 'asc') : setSort(mode));
  return (
    <span className={cell(col, cn('dl-h', active && 'on'))} role="columnheader"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={onClick} title={tr(active ? 'list.reverse' : 'list.sortBy', { label })}
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-1.5 h-[max(28px,1.75rem)] gap-[5px] px-1.5 text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
        <span className={cn('dl-arrow', XS, active ? 'text-foreground' : 'opacity-45')} aria-hidden="true">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </span>
  );
}

// The bulk bar's "More" menu: shadcn's DropdownMenu, opening upwards. Its
// Escape closes the menu only: the List's and the app's Escape handlers stand
// down while `.bulk-more-pop` is open (one layer per press).
function BulkMore({ open, setOpen, label, children }) {
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'bulk-btn icon text-lg')} aria-label={label} title={label}>⋯</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className="bulk-more-pop min-w-[200px]">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

// The checkbox on a phase header (By Phase): selects that phase's rows for the
// bulk bar, shows a mixed state when only some of them are selected, and
// clears them when they all are. The phase name is its visible label.
function DlPhaseCheck({ ids, selected, onToggle, group, label }) {
  const ref = React.useRef(null);
  const all = ids.length > 0 && ids.every(id => selected.has(id));
  const some = !all && ids.some(id => selected.has(id));
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = some; }, [some]);
  return (
    <span className="dl-phase-label inline-flex items-center gap-3.5">
      <input type="checkbox" ref={ref} className={CHECK} checked={all} onChange={() => onToggle(ids)}
        aria-label={window.MCU_I18N.tr('bulk.selectPhase', { group })} title={window.MCU_I18N.tr('bulk.selectPhase', { group })}/>
      <span>{label}</span>
    </span>
  );
}

// A section label (a year, a story era); in By Phase the meter.
const GLABEL = 'dl-glabel px-3 pt-[18px] pb-2 text-sm font-semibold tracking-tight text-foreground [&_.pgh]:flex-col-reverse [&_.pgh]:gap-1.5';

// How many titles a bulk action would change, beside its label.
function BulkCount({ n, onFill = false }) {
  return <Badge variant="secondary" className={cn('bulk-n rounded-md px-1.5 tabular-nums', XS, onFill && 'bg-black/22 text-inherit')}>{n}</Badge>;
}

// Titles' heading, with the whole catalogue's progress beside it (Notion
// "Rename the top-level sections": "44 of 60 seen", its bar and the share).
// Hooks: `ml-title`, `ml-progress`.
function TitlesHeading() {
  const { progress, loading } = window.useCollection() as unknown as { progress: { seenReleased: number; releasedTotal: number }; loading: boolean };
  const seen = loading ? 0 : progress.seenReleased, total = progress.releasedTotal || 0;
  const pct = total ? Math.round((seen / total) * 100) : 0;
  return (
    <div className="ml-head mt-1 mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h1 className="ml-title m-0 text-2xl font-semibold tracking-tight text-foreground">{tr('mylist.title')}</h1>
      {!loading && total > 0 && (
        <div className="ml-progress mb-1 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{tr('nav.countSeen', { seen, n: total })}</span>
          <span className="block h-1 w-[136px] overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={seen} aria-label={tr('nav.countSeen', { seen, n: total })}>
            <span className="block h-full rounded-full bg-primary transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none" style={{ width: pct + '%' }}/>
          </span>
          <span>{pct}%</span>
        </div>
      )}
    </div>
  );
}

function DesktopList({ titles, sort, sortDir, setSort, setSortDir, search, searchCharMatches, openId, onOpen, onFollow, activeChar, activeChars, header, empty, orderKey, progress, upNext, myList }) {
  const I = window.MCU_I18N;
  const tr = I.tr;
  const { statusOf, states, requestBulk } = window.useCollection();
  const PosterArt = window.PosterArt;
  const ranked = sort === 'imdb' || sort === 'rt';

  // ---- Selection for bulk actions --------------------------------------
  // Ids of selected rows. Only rows on screen can be selected, so the set is
  // trimmed whenever the shown titles change (a filter, search or tab hides
  // some): an action never reaches a title the visitor cannot see.
  const [selected, setSelected] = React.useState(() => new Set());
  const anchorRef = React.useRef(null);     // last row clicked, for Shift-click ranges
  const shownIds = titles.map(t => t.id);
  const shownKey = shownIds.join(',');
  React.useEffect(() => {
    setSelected(prev => {
      if (!prev.size) return prev;
      const keep = new Set(shownIds.filter(id => prev.has(id)));
      return keep.size === prev.size ? prev : keep;
    });
  }, [shownKey]);
  const toggleRow = (id, e) => {
    // Read the anchor and the modifier now: the updater below runs later,
    // after the anchor has already moved to this row, so reading it in there
    // compared the row with itself and a Shift-click never made a range.
    const a = anchorRef.current;
    const range = !!(e && e.shiftKey);
    setSelected(prev => {
      const next = new Set(prev);
      const on = !prev.has(id);
      if (range && a && a !== id && shownIds.indexOf(a) !== -1) {
        // Shift-click sets the whole range to the state of the clicked row.
        const i = shownIds.indexOf(a), j = shownIds.indexOf(id);
        shownIds.slice(Math.min(i, j), Math.max(i, j) + 1).forEach(x => { if (on) next.add(x); else next.delete(x); });
      } else if (on) next.add(id); else next.delete(id);
      return next;
    });
    anchorRef.current = id;
  };
  const allOn = shownIds.length > 0 && shownIds.every(id => selected.has(id));
  const someOn = !allOn && shownIds.some(id => selected.has(id));
  // The first progress meter (All titles, or Phase 1 in By Phase) sits above
  // the column headers, which pin just beneath it; its height is measured so
  // the headers sit flush under it at any size or language.
  const [leadEl, setLeadEl] = React.useState(null);
  const [leadH, setLeadH] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!leadEl) { setLeadH(0); return undefined; }
    const measure = () => setLeadH(leadEl.offsetHeight);
    measure();
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(leadEl);
    return () => { if (ro) ro.disconnect(); };
  }, [leadEl]);
  const headCheck = React.useRef(null);
  React.useEffect(() => { if (headCheck.current) headCheck.current.indeterminate = someOn; }, [someOn]);
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(shownIds));
  // One phase at a time (By Phase): its header's checkbox adds the phase's
  // rows to the selection, or clears them when they are all selected already.
  const togglePhase = (ids) => setSelected(prev => {
    const next = new Set(prev);
    const all = ids.length > 0 && ids.every(id => prev.has(id));
    ids.forEach(id => { if (all) next.delete(id); else next.add(id); });
    return next;
  });
  const phaseIds = (phase) => titles.filter(t => t.phase === phase).map(t => t.id);
  const clearSelection = () => { setSelected(new Set()); anchorRef.current = null; };
  const selIds = shownIds.filter(id => selected.has(id));
  const counts = {
    seen: window.MCU_bulkTargets(selIds, 'seen', states).length,
    watchlist: window.MCU_bulkTargets(selIds, 'watchlist', states).length,
    none: window.MCU_bulkTargets(selIds, 'none', states).length,
  };
  const [moreOpen, setMoreOpen] = React.useState(false);
  // The selection ends when the action runs, not when it is asked for:
  // cancelling the confirmation keeps it.
  const act = (to) => { setMoreOpen(false); requestBulk(selIds, to, clearSelection); };
  // Escape clears the selection before it closes the details: an open menu,
  // popover or dialog goes first (their own handlers), then the selection,
  // then the details (app.jsx). preventDefault hands the press no further, so
  // one Escape never closes two layers. Registered once, on mount, so it stays
  // ahead of the app's handler, which re-registers as its state changes.
  const selRef = React.useRef(0);
  selRef.current = selected.size;
  // Back to home (the logo) clears the selection too.
  React.useEffect(() => {
    const onHome = () => { setSelected(new Set()); anchorRef.current = null; };
    window.addEventListener('mcu:home', onHome);
    return () => window.removeEventListener('mcu:home', onHome);
  }, []);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || !selRef.current) return;
      if (document.querySelector('.sort-order-pop, .acct-pop, .filters-pop, .ss-pop, .bulk-more-pop, [role="dialog"], [aria-modal="true"]')) return;
      e.preventDefault();
      setSelected(new Set());
      anchorRef.current = null;
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  const { tableRef, onKeyDown: onTableKey } = useRowKeys('.dl-row[data-row-id]', openId, onFollow);
  const groups = dlGroups(titles, sort);
  const labels = {
    poster: <span className="story-sr">{tr('list.col.poster')}</span>, title: tr('list.col.title'), type: tr('list.col.type'), phase: tr('list.col.phase'),
    release: tr('list.col.release'), story: tr('list.col.story'), budget: tr('list.col.budget'),
    imdb: 'IMDb', rt: 'RT', cast: tr('list.col.cast'), actions: <span className="story-sr">{tr('list.col.actions')}</span>,
  };
  const typeLabel = t => tr(t.type === 'film' ? 'type.film.one' : 'type.series.one');
  // Rows glide to their new places when the sort, order or collection filter
  // changes (same animation as the phone List and Grid).
  const flipRef = window.useReorderAnimation(orderKey, { inside: true });
  // One rowgroup per phase rather than per year, so the phase's sticky divider
  // stays pinned across all of that phase's year groups and hands over at the
  // next phase. Views with no phase headings keep a rowgroup each, as before.
  const blocks = [];
  groups.forEach((g) => {
    const startsPhase = !!(g.phaseStart && progress && progress.byPhase && progress.byPhase[g.phaseStart]);
    const last = blocks[blocks.length - 1];
    if (startsPhase || !last || !last.phased) blocks.push({ key: g.id, phased: startsPhase, groups: [g] });
    else last.groups.push(g);
  });
  let n = 0;
  // The meter above the column headers. In By Phase it is Phase 1's; each
  // later phase's meter pins in the same place at its boundary and covers the
  // one before it, so the current phase is always the one on top.
  const leadPhase = !(progress && progress.all) && blocks[0] && blocks[0].phased ? blocks[0].groups[0].phaseStart : null;
  // Each meter carries the phones' "Mark N more seen" (the same component, so
  // the same count rule, confirmation and Undo), and in By Phase a checkbox
  // that selects the phase for the bulk bar.
  const phaseMeter = (phase) => {
    const ids = phaseIds(phase);
    const group = I.tr('phase.label', { n: phase });
    return (
      <window.ProgressHeader color={window.PHASE_COLORS[phase]} {...progress.byPhase[phase]}
        label={<DlPhaseCheck ids={ids} selected={selected} onToggle={togglePhase} group={group} label={group}/>}
        action={<window.BulkHeaderAction ids={ids} group={group}/>}/>
    );
  };
  const leadMeter = progress && progress.all
    ? <window.ProgressHeader label={I.tr('progress.all')} {...progress.all}
        action={<window.BulkHeaderAction ids={shownIds} group={I.tr('progress.all')}/>}/>
    : leadPhase ? phaseMeter(leadPhase) : null;
  return (
    <div className={cn('dlist @container relative min-h-0 flex-1 overflow-y-auto px-[22px] pt-3.5 pb-12 min-[1280px]:in-[.app.drawer-open]:pr-[402px] [&>.m-flip-layer]:z-4', ranked && 'ranked')} ref={flipRef} role="main" aria-label={tr('view.list')}>
      {/* My list (Notion "Desktop: navigation for Explore, My list and
          Guides"): its title first; the collection tabs, with the sort as a
          quiet note, sit under Up next, just above the table. */}
      {myList && <TitlesHeading/>}
      {header}
      {/* Up next: a strip above the table. The desktop List does not fold seen
          titles, so the suggestion can be far down; the strip brings it up. */}
      {upNext && <window.UpNextStrip info={upNext}/>}
      {myList && (
        <div className="ml-status mt-1 mb-3 flex flex-wrap items-center justify-between gap-3">
          <window.CollectionSwitch value={myList.collection} onChange={myList.setCollection}/>
          <span className="ml-end ml-auto flex items-center gap-3">
            {/* "Mark what you've seen" moved here from the Account menu (Notion
                "Take the collection filters out of the Account menu"). */}
            {window.MCU_openPicker && (
              <Button variant="ghost" size="sm" className="ml-pick h-8 gap-1.5 px-2 text-xs text-(--status-seen) hover:text-(--status-seen)" onClick={() => window.MCU_openPicker()}>
                <svg className="size-[14px]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><path d="m14 18 2 2 4-4"/></svg>{tr('picker.open')}
              </Button>
            )}
            <span className="ml-sort text-xs text-muted-foreground">{window.sortPhrase(sort, sortDir)}</span>
          </span>
        </div>
      )}
      {!titles.length ? (
        <EmptyState desktop title={empty && empty.title} sub={empty && empty.sub} action={empty && empty.action}/>
      ) : (
        <>
        {/* Always present, so the count is announced as it changes (a region
            that appears together with its text is often not read out). */}
        <span className="story-sr" role="status" aria-live="polite">{selIds.length ? tr('bulk.selected', { n: selIds.length }) : ''}</span>
        {/* Before the table in reading order, so Shift+Tab from the header
            checkbox reaches it; drawn fixed at the bottom of the List. */}
        {selIds.length > 0 && (
          <div className="bulk-bar fixed bottom-[22px] left-1/2 z-70 flex animate-[toast-in_220ms_cubic-bezier(.2,.9,.3,1.2)] items-center gap-2 rounded-xl border bg-popover py-2 pr-2 pl-4 text-sm text-popover-foreground shadow-lg [transform:translateX(-50%)] min-[1280px]:in-[.app.drawer-open]:left-[calc((100%-402px)/2)]"
            role="region" aria-label={tr('bulk.selected', { n: selIds.length })}>
            <span className="bulk-count mr-1.5 text-xs whitespace-nowrap text-muted-foreground" aria-hidden="true">{tr('bulk.selected', { n: selIds.length })}</span>
            <Button className="bulk-btn primary border-(--status-seen) bg-(--status-seen) font-semibold text-(--on-color) hover:bg-(--status-seen)/90" disabled={!counts.seen} onClick={() => act('seen')}>
              {tr('bulk.markSeen')}<BulkCount n={counts.seen} onFill/>
            </Button>
            <Button variant="outline" className="bulk-btn" disabled={!counts.watchlist} onClick={() => act('watchlist')}>
              {tr('bulk.addWatch')}<BulkCount n={counts.watchlist}/>
            </Button>
            <BulkMore open={moreOpen} setOpen={setMoreOpen} label={tr('bulk.more')}>
              <DropdownMenuItem disabled={!counts.none} onClick={() => act('none')} className="justify-between gap-2.5">
                {tr('bulk.markUnseen')}<BulkCount n={counts.none}/>
              </DropdownMenuItem>
            </BulkMore>
            <Button variant="ghost" className="bulk-btn ghost text-muted-foreground" onClick={clearSelection}>{tr('bulk.clear')}</Button>
          </div>
        )}
        <div className="dl-table mx-auto max-w-[1480px] text-sm text-muted-foreground" role="table" aria-label={tr('view.list')} style={{ '--dl-lead-h': leadH + 'px' }}
          ref={tableRef} onKeyDown={onTableKey}>
          {/* A row owned directly by the table (a rowgroup holding no row is
              invalid ARIA), first so it reads and draws above the headers. */}
          {leadMeter && (
            <div role="row" ref={setLeadEl} className={cn(DIVIDER, STICKY, 'lead mt-0', !leadPhase && OVERALL)}>
              <span role="cell" className="dl-overall-cell block">{leadMeter}</span>
            </div>
          )}
          <div className={cn(rowGrid(ranked), 'dl-head sticky top-[calc(-14px+var(--dl-lead-h,0px))] z-5 h-[38px] border-b bg-background text-xs font-medium text-muted-foreground')} role="row">
            <span className="dl-h c-check flex items-center justify-center" role="columnheader">
              <input type="checkbox" ref={headCheck} className={CHECK} checked={allOn} onChange={toggleAll}
                aria-label={tr('bulk.selectAll')} title={tr('bulk.selectAll')}/>
            </span>
            {ranked && <span className="dl-h c-rank tabular-nums" role="columnheader">#</span>}
            {DL_COLUMNS.map(col => (
              <DlSortHeader key={col} col={col} label={labels[col]} sort={sort} sortDir={sortDir} setSort={setSort} setSortDir={setSortDir}/>
            ))}
          </div>
          {blocks.map((b, bi) => (
            <div key={b.key} role="rowgroup">
              {b.phased && !(bi === 0 && leadPhase) && (
                /* No data-flip-id: the reorder animation moves what it tracks
                   with a transform, and a sticky element is already positioned
                   from the scroll offset — together they leave the bar hanging
                   below the header instead of under it. */
                <div role="row" className={cn(DIVIDER, STICKY, bi === 0 && 'mt-2.5')}>
                  <span role="cell" className="dl-overall-cell block">{phaseMeter(b.groups[0].phaseStart)}</span>
                </div>
              )}
              {b.groups.map(g => (
                <React.Fragment key={g.id}>
              {g.label && (g.phase && progress && progress.byPhase[g.phase]
                ? <div className={GLABEL} data-flip-id={'g:' + g.id} style={g.color ? { color: g.color } : null}>
                    <window.ProgressHeader label={g.label} color={g.color} {...progress.byPhase[g.phase]}/>
                  </div>
                : <div className={cn(GLABEL, g.story && 'story')} data-flip-id={'g:' + g.id} style={g.color ? { color: g.color } : null}>{g.label}</div>)}
              {g.items.map(t => {
                n += 1;
                const seen = statusOf(t.id) === 'seen';
                const matched = searchCharMatches ? (searchCharMatches[t.id] || []) : [];
                // Matched characters first, then the rest of the cast.
                const cast = [...matched, ...t.cast.filter(c => !matched.includes(c))];
                // A pinned performer covers several characters: a row is only
                // dimmed when it holds none of them.
                const dim = activeChars ? !activeChars.some(c => t.cast.includes(c)) : (activeChar && !t.cast.includes(activeChar));
                return (
                  <div key={t.id} role="row" data-row-id={t.id} data-flip-id={t.id} onClick={() => onOpen(t.id)}
                    className={cn(rowGrid(ranked), 'min-h-[70px] cursor-pointer scroll-mt-[calc(var(--dl-lead-h,0px)+46px)] scroll-mb-3 border-b transition-[background-color,opacity] duration-150 hover:bg-muted/50 [.dlist:has(>.bulk-bar)_&]:scroll-mb-[84px]',
                      seen && 'seen', openId === t.id && 'on bg-muted shadow-[inset_3px_0_0_var(--primary)] hover:bg-muted', dim && 'dim opacity-35')}>
                    <span className="c-check flex items-center justify-center" role="cell" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className={CHECK} checked={selected.has(t.id)}
                        onClick={e => { e.stopPropagation(); toggleRow(t.id, e); }} onChange={() => {}}
                        aria-label={tr('bulk.selectRow', { title: I.titleName(t) })}/>
                    </span>
                    {ranked && <span className="c-rank text-xs tabular-nums text-muted-foreground" role="cell">{n}</span>}
                    <span className="c-poster" role="cell"><span className={cn('dl-thumb block h-[58px] w-10 rounded-[5px]', THUMB, seen && 'opacity-55')}><PosterArt title={t}/></span></span>
                    <span className="c-title flex min-w-0 flex-col items-start" role="cell">
                      <button className="dl-open cursor-pointer text-left text-sm font-medium text-foreground outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50" aria-expanded={openId === t.id}
                        onClick={e => { e.stopPropagation(); onOpen(t.id); }}>
                        <window.Highlight text={I.titleName(t)} query={search}/>
                      </button>
                      {/* Beside the title rather than in the narrow Released
                          column, where it wrapped under the year. */}
                      <window.ReleaseBadge title={t} className="dl-release mt-[5px] flex w-max"/>
                      {/* Which character matched the search, at every width
                          (the characters column drops on narrower lists). */}
                      <window.MatchBadge matchedChars={matched} query={search} title={t}/>
                    </span>
                    <span className={cell('type')} role="cell">{typeLabel(t)}</span>
                    <span className={cell('phase', 'inline-flex items-center gap-[7px] text-xs tabular-nums')} role="cell"><span className="dl-dot size-2 flex-[0_0_8px] rounded-full" style={{ background: window.PHASE_COLORS[t.phase] }}/>{t.phase}</span>
                    <span className="c-release text-xs tabular-nums" role="cell">{t.year}</span>
                    <span className={cell('story', 'text-xs tabular-nums')} role="cell">{t.story ? I.storyLabel(t.story) : '—'}</span>
                    <span className={cell('budget', 'text-xs tabular-nums')} role="cell">{t.budget != null ? I.budget(t.budget) : '—'}</span>
                    <span className="c-imdb" role="cell">{t.imdb != null
                      ? <ScoreChip kind="imdb" title={t} className="card-rating w-max"/>
                      : <span className="dl-none text-muted-foreground">—</span>}</span>
                    <span className="c-rt" role="cell">{t.rt != null
                      ? <ScoreChip kind="rt" title={t} className="card-rating w-max"/>
                      : <span className="dl-none text-muted-foreground">—</span>}</span>
                    <span className={cell('cast', 'flex items-center')} role="cell">
                      {cast.slice(0, 5).map(c => <DlFace key={c} id={c} matched={matched.includes(c)}/>)}
                      {cast.length > 5 && <span className={cn('dl-more ml-1.5 tabular-nums text-muted-foreground', XS)}>+{cast.length - 5}</span>}
                    </span>
                    <span className="c-actions flex justify-end" role="cell" onClick={e => e.stopPropagation()}>
                      <window.TitleStatusActions title={t} className="dl-tsa static flex-row gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(36px,2.25rem)] [&_.tsa-btn_svg]:size-4 [&_.tsa-gap]:order-0"/>
                    </span>
                  </div>
                );
              })}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
window.DesktopList = DesktopList;

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { useRowKeys, DesktopList };
