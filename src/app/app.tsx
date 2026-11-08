// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 693 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import ReactDOM from 'react-dom/client';

// Red Thread — the app shell and the floating (Spatial) canvas layout

const { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } = React;

// The phase tokens in src/index.css, which hold a value for each theme. Every
// use is a CSS value; code that paints on a canvas resolves them first
// (celebrate.tsx).
const PHASE_COLORS = {
  1: 'var(--phase-1)',
  2: 'var(--phase-2)',
  3: 'var(--phase-3)',
  4: 'var(--phase-4)',
  5: 'var(--phase-5)',
  6: 'var(--phase-6)',
};
window.PHASE_COLORS = PHASE_COLORS; // desktop-list.jsx
// Text goes through the i18n runtime (i18n.js); `tr` avoids clashing with the
// `t` used for titles throughout this file.
const I18N = window.MCU_I18N;
const tr = (key: string, vars?: Record<string, unknown>) => I18N.tr(key, vars);
const phaseLabel = (n) => I18N.upper(tr('phase.label', { n }));
const typeLabel = (type) => tr(type === 'film' ? 'type.film.one' : 'type.series.one');
// Both are read as bare names by the other files in src/app, which found them
// in the shared global scope while every file was its own classic script.
// Inside a module they are no longer global, so publish them as the names
// those readers already use (docs/V4-PLAN.md §5.7).
window.tr = tr;               // about, account, celebrate, desktop-list, mobile, tracking
window.typeLabel = typeLabel; // desktop-list.jsx

const CARD_W = 170;
const CARD_H = 270;
// The phone's reading zoom: about 2.5 titles across (one title step is
// CARD_W * 1.15), capped at 100%. The timelines open at it, and every order
// uses it to frame Up next and a title whose details just closed, so cards
// read at one size whichever order is on.
const phoneReadScale = (w) => Math.min(1, w / (CARD_W * 1.15 * 2.5));
// Desktop's reading zoom: the timeline orders open at about 7.5 titles across
// (one title step is CARD_W * 1.15), capped at 100%, so any window 1,466px or
// wider reads at 100%. Stepping through a character or a guide, and centring
// a title after its details close, never go below it either (Notion V4 Tasks,
// "Desktop Spatial: character and guide stepping zoom to 70%"), so the cards
// keep the size the landing showed them at.
const deskReadScale = (w) => Math.min(1, w / (CARD_W * 1.15 * 7.5));
// How far above its row a band label's pill starts, in canvas units. The pill
// is drawn there and the camera leaves room for it, so both read this one
// number: when they disagreed, By Phase cut the first pill off at the top and
// Chronological slid its first pill under the count pill.
const BAND_LABEL_H = 58;
// Space between the two titles of the pair view (room for the labels).
const PAIR_GAP = 380;

// Variant handling: a character may declare `prime`, pointing at the "through-line"
// identity it is a variant of (He Who Remains -> kang, Captain Carter -> peggy).
// Connections chain on the prime so the thread stays unbroken, while each segment is
// still drawn and labelled with the specific variant that appears in that title.
function primeOf(id) {
  const c = window.CHARACTERS[id];
  return (c && c.prime) || id;
}

// Layout follows the viewport width; input capability does not. A touch laptop
// or a tablet in landscape is 900px or wider, so it takes the desktop layout
// while still needing the canvas's touch pan and pinch. `any-pointer` is what
// asks "is a coarse pointer available", rather than "is it the primary one",
// which is false on a hybrid with a mouse attached.
function hasTouchInput() {
  if (navigator.maxTouchPoints > 0) return true;
  return !!(window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches);
}
const HAS_TOUCH = hasTouchInput();

function useDevice() {
  const get = () => (window.innerWidth < 900 ? 'mobile' : 'desktop');
  const [device, setDevice] = useState(get);
  useEffect(() => {
    const on = () => setDevice(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return device;
}


// Default direction per sort mode, chosen to match each mode's natural/prior default
// (e.g. ratings default to highest-first, dates/phase default to earliest-first).
const DEFAULT_SORT_DIR = { release: 'asc', chrono: 'asc', phase: 'asc', imdb: 'desc', rt: 'desc', title: 'asc' };

// Full labels for both directions of a sort; `short` gives the compact form
// shown on the mobile order button.
function sortDirectionLabels(sort, short = false) {
  const sfx = short ? 'Short' : '';
  if (sort === 'title') return [tr('order.title.asc'), tr('order.title.desc')];
  if (sort === 'release') return [tr('order.release.asc' + sfx), tr('order.release.desc' + sfx)];
  if (sort === 'chrono') return [tr('order.chrono.asc' + sfx), tr('order.chrono.desc' + sfx)];
  if (sort === 'phase') {
    const phases = window.TITLES.map(t => t.phase);
    const low = Math.min(...phases), high = Math.max(...phases);
    const key = short ? 'order.phase.rangeShort' : 'order.phase.range';
    return [tr(key, { from: low, to: high }), tr(key, { from: high, to: low })];
  }
  return [tr('order.rating.asc' + sfx), tr('order.rating.desc' + sfx)];
}
window.sortDirectionLabels = sortDirectionLabels;

function sortTitles(list, sort, dir = 'asc') {
  const mul = dir === 'desc' ? -1 : 1;
  return list.slice().sort((a, b) => {
    if (sort === 'imdb' || sort === 'rt') {
      // Unrated titles are not low ratings: keep them last in either direction.
      if (a[sort] == null) return b[sort] == null ? 0 : 1;
      if (b[sort] == null) return -1;
      return mul * (a[sort] - b[sort]);
    }
    if (sort === 'chrono') return mul * (a.chronOrder - b.chronOrder);
    if (sort === 'title') return mul * I18N.compare(I18N.titleName(a), I18N.titleName(b));
    if (sort === 'phase') return mul * ((a.phase - b.phase) || a.release.localeCompare(b.release));
    return mul * a.release.localeCompare(b.release);
  });
}

// The budget filter's bands, shared by the views and the Up next scope.
function budgetMatches(t, band) {
  const b = t.budget;
  if (b == null) return false;
  if (band === 'low') return b < 50;
  if (band === 'mid') return b >= 50 && b < 200;
  if (band === 'high') return b >= 200 && b < 300;
  if (band === 'mega') return b >= 300;
  return true;
}

// Shared with the Up next rule (MCU_nextUp in tracking.jsx), so both agree on
// what release and story order mean.
window.sortTitles = sortTitles;

// What the view is showing that the controls don't: how many titles match and,
// when filtering, which filters are on. The sort, order and collection already
// show on their own controls, so they are not repeated here. Variants:
//   'float' - desktop Spatial, top-left of the canvas: the count, one removable
//             chip per filter (search, collection, type, phase, budget) and
//             Clear all. With `inList` it sits at the top of the desktop List.
//   'line'  - top of the mobile List/Grid (scrolls away with it).
//   'pill'  - mobile Spatial, top-left of the canvas clear of the zoom control.
// Phones show the count and how many filters, plus Clear; the search box,
// collection switch and Filters badge already name them.
// `showing` counts titles matching every filter, including the collection one,
// which only dims cards in Spatial.
function ContextSummary({ variant, inList, showing, total, filters: f }) {
  const chips = [];
  const query = f.search.trim();
  if (query) chips.push(['search', `“${query}”`, () => f.setSearch('')]);
  if (f.collectionFilter !== 'all') chips.push(['collection', tr('collection.' + f.collectionFilter), () => f.setCollectionFilter('all')]);
  if (f.typeFilter !== 'all') chips.push(['type', tr(f.typeFilter === 'film' ? 'type.films' : 'type.series'), () => f.setTypeFilter('all')]);
  if (f.phaseFilter !== 'all') chips.push(['phase', tr('phase.label', { n: f.phaseFilter }), () => f.setPhaseFilter('all')]);
  if (f.budgetFilter !== 'all') chips.push(['budget', tr('budget.' + f.budgetFilter), () => f.setBudgetFilter('all')]);
  if (f.releaseFilter !== 'all') chips.push(['release', tr('filter.release.chip'), () => f.setReleaseFilter('all')]);
  const clearAll = () => {
    f.setSearch(''); f.setCollectionFilter('all'); f.setTypeFilter('all');
    f.setPhaseFilter('all'); f.setBudgetFilter('all'); f.setReleaseFilter('all');
  };
  const count = showing === total ? tr('header.count', { n: total }) : tr('header.countOf', { shown: showing, total });
  // Keep the canvas pan/pinch handlers from treating a click here as a drag.
  const stop = e => e.stopPropagation();

  if (variant === 'float') {
    return (
      <div className={`ctx ctx-float${inList ? ' ctx-static' : ''}`} onMouseDown={stop} onWheel={stop}>
        <span className="ctx-count" role="status">{count}</span>
        {chips.map(([key, label, clear]) => (
          <button key={key} className="ctx-chip" onClick={clear} title={tr('context.remove', { label })}
            aria-label={tr('context.remove', { label })}>
            {label}<span aria-hidden="true">×</span>
          </button>
        ))}
        {chips.length > 1 && <button className="ctx-clear" onClick={clearAll}>{tr('filters.clearAll')}</button>}
      </div>
    );
  }

  return (
    <div className={`ctx ctx-${variant}`} onTouchStart={stop} onMouseDown={stop}>
      <span className="ctx-text" role="status">
        <span className="ctx-seg"><b>{count}</b></span>
        {chips.length > 0 && <>{' '}<span className="ctx-seg ctx-nfilters">· {tr('context.filters', { n: chips.length })}</span></>}
      </span>
      {chips.length > 0 && <button className="ctx-clear" onClick={clearAll}>{tr('context.clear')}</button>}
    </div>
  );
}

// Compute layout positions per sort mode on an even grid: cards in a row share
// a top edge and neighbours are a constant distance apart (a per-card random
// offset used to make gaps uneven and could make release neighbours overlap).
// Release/chronology flow left-to-right in phase bands; the others use rows.
// In-story eras for the Chrono rows. A title's era comes from the first year of
// its story; titles without one (Multiverse, outside time, unannounced) stay in
// the era of the title before them in story order, so rows only ever advance.
const ERA_STARTS = [2008, 2013, 2016, 2019, 2025, 2027];
function storyYear(t) {
  const m = /(\d{3,4})/.exec(t.story || '');
  if (!m) return null;
  return /BC/.test(t.story) ? -Number(m[1]) : Number(m[1]);
}
function chronoEras(titles) {
  const out = {};
  let era = 0;
  titles.slice().sort((a, b) => a.chronOrder - b.chronOrder).forEach(t => {
    const y = storyYear(t);
    if (y !== null) era = ERA_STARTS.filter(s => y >= s).length;
    out[t.id] = era;
  });
  return out;
}

function computeLayout(titles, sort, dir = DEFAULT_SORT_DIR[sort]) {
  const ordered = sortTitles(titles, sort, dir);
  const positions = {};
  let layoutBands = [];
  const colW = CARD_W + 60;
  const rowH = CARD_H + 70;

  if (sort === 'phase') {
    // Group by phase into vertical lanes
    const byPhase = {1:[],2:[],3:[],4:[],5:[],6:[]};
    ordered.forEach(t => byPhase[t.phase].push(t));
    let y = 60;
    Object.keys(byPhase).sort((a,b) => (dir === 'desc' ? -1 : 1) * (Number(a) - Number(b))).forEach(p => {
      const list = byPhase[p];
      const cols = Math.max(6, Math.ceil(Math.sqrt(list.length * 1.6)));
      list.forEach((t, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions[t.id] = {
          x: 80 + col * colW,
          y: y + row * rowH,
        };
      });
      // A band per phase, so By Phase carries the same heading and meter the
      // timeline layouts do. Its width is the widest row of this block, which
      // is what the meter measures.
      if (list.length) layoutBands.push({ x: 80, y, phase: Number(p) });
      const rows = Math.ceil(list.length / cols);
      y += rows * rowH + 80;
    });
  } else if (sort === 'imdb' || sort === 'rt' || sort === 'title') {
    // Use the same ordering as Grid/List; layout must not silently re-sort it.
    const cols = 7;
    ordered.forEach((t,i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[t.id] = {
        x: 80 + col * colW,
        y: 80 + row * rowH,
      };
    });
  } else {
    // Release or chronology flows left-to-right in the selected direction, one
    // row per band: phases for Release, in-story eras for Chrono. Story order
    // rises through the eras the way release order rises through the phases,
    // so both read as a staircase (phase rows made Chrono zigzag, since e.g.
    // Captain Marvel is Phase 3 but set in 1995).
    const chrono = sort === 'chrono';
    const eraOf = chrono ? chronoEras(titles) : null;
    const bands = {};
    ordered.forEach((t, i) => {
      const x = 80 + i * (CARD_W * 1.15);
      const row = chrono ? eraOf[t.id] : t.phase - 1;
      const y = 80 + row * (rowH * 1.25);
      positions[t.id] = { x, y };
      const b = bands[row] || (bands[row] = { row, x, y, years: [] });
      if (x < b.x) b.x = x;
      if (chrono) { const yr = storyYear(t); if (yr !== null) b.years.push(yr); } else b.phase = t.phase;
    });
    layoutBands = Object.values(bands).map(b => Object.assign(
      { x: b.x, y: b.y },
      chrono
        ? { era: b.row, from: b.years.length ? Math.min(...b.years) : null, to: b.years.length ? Math.max(...b.years) : null }
        : { phase: b.phase }));
  }

  // Compute canvas bounds
  let maxX = 0, maxY = 0;
  Object.values(positions).forEach(p => {
    if (p.x + CARD_W > maxX) maxX = p.x + CARD_W;
    if (p.y + CARD_H > maxY) maxY = p.y + CARD_H;
  });
  return { positions, bands: layoutBands, width: maxX + 120, height: maxY + 120 };
}

function Card({ title, pos, onClick, onHover, onDragStart, onFocusCard, focusable, isSelected, isHighlighted, isDimmed, isCollDimmed, isRingHidden, isRingFocus, isDragging, isCurrent, curColor, matchedChars, searchQuery, scale, guideBadge, guide, guideSkip, onGuideSkip, entering }) {
  const phaseColor = PHASE_COLORS[title.phase];
  // A card a filter brings back fades in (Notion V4 Tasks, "Micro-interaction:
  // cards fade softly when a filter changes"); the canvas's first cards don't.
  const [enter, setEnter] = useState(!!entering);
  const downRef = useRef({ x: 0, y: 0, moved: false });
  const { statusOf } = window.useCollection();
  const status = statusOf(title.id);
  // Below TSA_MIN_SCALE the toggles are rendered smaller than a usable hit
  // target, so they withdraw and the seen state reads as a static marker only.
  const showActions = (scale || 1) >= window.TSA_MIN_SCALE;
  return (
    <div
      data-id={title.id}
      onAnimationEnd={enter ? (e) => { if (e.animationName === 'card-enter') setEnter(false); } : undefined}
      className={`card${enter ? ' enter' : ''} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isDimmed ? 'dimmed' : ''} ${isCollDimmed ? 'coll-dim' : ''}${isRingHidden ? ' ring-hidden' : ''}${isRingFocus ? ' ring-focus' : ''} ${status === 'seen' ? 'seen' : ''} ${status === 'watchlist' ? 'listed' : ''} ${isDragging ? 'dragging' : ''}${isCurrent ? ' current' : ''}${guideSkip && guideSkip.state === 'skipped' ? ' g-skipped' : ''}`}
      style={{
        '--phase-color': phaseColor,
        ...(isCurrent && curColor ? { '--cur-color': curColor } : {}),
        // 2D on purpose: a 3D transform would give each of the 64 cards its own
        // GPU layer, which phones cannot afford when zoomed far out.
        transform: `translate(${pos.x}px, ${pos.y}px) scale(var(--lift, 1))`,
        width: CARD_W + 'px',
        height: CARD_H + 'px',
      }}
      onMouseDown={(e) => {
        downRef.current = { x: e.clientX, y: e.clientY, moved: false };
        onDragStart(e, title.id);
      }}
      onClick={(e) => {
        const dx = Math.abs(e.clientX - downRef.current.x);
        const dy = Math.abs(e.clientY - downRef.current.y);
        if (dx < 4 && dy < 4) onClick();
      }}
      onMouseEnter={() => onHover(title.id)}
      onMouseLeave={() => onHover(null)}
    >
      {focusable && (
        // The keyboard way into a card, like the List's title button. It comes
        // first, so Tab reaches the card before its Seen/Watchlist buttons;
        // it covers the card for the focus ring but lets pointer clicks
        // through to the card's own handler. Enter or Space opens it.
        <button type="button" className="card-open" aria-label={I18N.titleName(title)}
          onFocus={() => onFocusCard && onFocusCard(title.id)}
          onClick={(e) => { e.stopPropagation(); onClick(); }}/>
      )}
      <div className="card-poster">
        <PosterArt title={title}/>
        <div className="card-badges">
          {/* An open guide numbers its stops on the canvas (a check once
              seen, + for optional, an arrow for the destination): the badge
              sits under the type label, which always shows. */}
          <span className="card-badges-start">
            <span className="badge type-badge">{I18N.upper(typeLabel(title.type))}</span>
            {guideBadge && <span className={`card-gnum ${guideBadge.cls}`} role="img" aria-label={guideBadge.label}>{guideBadge.text}</span>}
            {/* Skip a guide stop, under its number, once the card is large
                enough for buttons. */}
            {showActions && guideSkip && guideSkip.state === 'can' && <window.GuideSkipControl guide={guide} info={guideSkip} className="card-skipctl" onDone={onGuideSkip}/>}
          </span>
          <span className="badge phase-badge" style={{background: phaseColor, color:'var(--on-color)'}}>{phaseLabel(title.phase)}</span>
        </div>
        {/* A skipped stop: a "Skipped" tag and Unskip, centred on the poster,
            in place of Seen and Watchlist. */}
        {showActions && guideSkip && guideSkip.state === 'skipped' && (
          <div className="card-skipover">
            <span className="card-skiptag" aria-hidden="true">{tr('guide.skippedTag')}</span>
            <window.GuideSkipControl guide={guide} info={guideSkip} className="card-unskipctl" onDone={onGuideSkip}/>
          </div>
        )}
        {showActions
          ? !(guideSkip && guideSkip.state === 'skipped') && <window.TitleStatusActions title={title} className="card-tsa"/>
          : <span className="card-seen-mark"><window.SeenMarker seen={status === 'seen'}/></span>}
        <div className="rating-row">
          {title.imdb != null && (
            <div className="card-rating imdb" title={tr(title.type === 'series' ? 'score.imdbSeries' : 'score.imdbMovie')}>
              <span className="imdb-tag">IMDb</span>
              {title.imdb.toFixed(1)}
            </div>
          )}
          {title.rt != null && (
            <div className="card-rating rt" title={tr('score.rt')}>
              <span className="rt-tag">RT</span>
              {title.rt}%
            </div>
          )}
        </div>
      </div>
      <div className="card-meta">
        <div className="card-title"><window.Highlight text={I18N.titleName(title)} query={searchQuery}/></div>
        <div className="card-year">
          <span>{title.year}<window.ReleaseBadge title={title} className="card-release"/></span>
          {title.budget != null && (
            <span className="card-budget">{I18N.budget(title.budget)}</span>
          )}
        </div>
        <window.StoryYear title={title} className="card-story"/>
        <window.MatchBadge matchedChars={matchedChars} query={searchQuery} title={title}/>
      </div>
    </div>
  );
}

// How the visitor last interacted: the details drawer only takes focus when it
// was opened from the keyboard, so a mouse or touch open shows no focus ring.
let lastInput = 'pointer';
document.addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) lastInput = 'keyboard'; }, true);
document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
// Set by the arrow keys that step from title to title: the details then follow
// without taking focus, so the next press still reaches the list. Cleared once
// the details have shown that title, or after a moment if they never change.
let drawerStepFocus = false;
const stepReducedMotion = () => window.MCU_MOTION.reduced();
let drawerStepTimer = 0;
const keepFocusOnStep = () => {
  drawerStepFocus = true;
  clearTimeout(drawerStepTimer);
  drawerStepTimer = setTimeout(() => { drawerStepFocus = false; }, 1000);
};

function CastDrawer({ title: current, onClose, onCharacterClick, hoveredCharacter, onCharacterHover, activeChar, activeChars, search }) {
  // Slide in and out: mount closed and open on the next frame, and keep showing
  // the last title while it slides away. Switching titles swaps the content.
  const [title, setTitle] = useState(current);
  const [open, setOpen] = useState(false);
  // Keyboard flow for this modeless panel (no focus trap): remember what
  // opened it, move focus to its heading once it is visible (keyboard opens
  // only), and give focus
  // back to the opener when it closes (if focus was still in the panel).
  const asideRef = useRef(null);
  const headingRef = useRef(null);
  const openerRef = useRef(null);
  useEffect(() => {
    const aside = asideRef.current;
    const active = document.activeElement;
    const inPanel = !!(aside && active && aside.contains(active));
    if (current) {
      if (!openerRef.current && active && active !== document.body && !inPanel) openerRef.current = active;
      return;
    }
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener && opener.isConnected && lastInput === 'keyboard' && (inPanel || active === document.body)) opener.focus({ preventScroll: true });
  }, [current && current.id]);
  useEffect(() => {
    if (!open) return;
    if (headingRef.current && lastInput === 'keyboard' && !drawerStepFocus) headingRef.current.focus({ preventScroll: true });
    drawerStepFocus = false;
  }, [open, title && title.id]);
  // Details and cast scroll as one, so a new title starts at its poster rather
  // than wherever the last one's cast was scrolled to.
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [title && title.id]);
  useEffect(() => {
    if (!current) { setOpen(false); return; }
    setTitle(current);
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setOpen(true)); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [current]);
  if (!title) return null;
  // The close button sits in the panel's corner, outside the scrolling body,
  // so it stays put while the details scroll and the text column keeps its width.
  return (
    <aside ref={asideRef} className={`drawer${open ? ' open' : ''}`} aria-hidden={!open} aria-labelledby="drawer-title"
      onTransitionEnd={e => { if (!current && e.target === e.currentTarget) setTitle(null); }}>
      <button className="drawer-close" onClick={onClose} aria-label={tr('details.close')}>×</button>
      <div className="drawer-scroll" ref={scrollRef}>
        <window.TitleDetailsBody title={title} surface="drawer" search={search} headingRef={headingRef} headingId="drawer-title"
          cast={
            <window.DetailSection id="cast" label={tr('details.cast', { n: title.cast.length })} labelClass="drawer-section-label" bodyClass="cast-list">
              {title.cast.length === 0 && <div className="empty-cast">{tr('details.noCast')}</div>}
              {title.cast.map(ch => {
                const c = window.CHARACTERS[ch];
                if (!c) return null;
                const isActive = activeChars ? activeChars.indexOf(ch) !== -1 : activeChar === ch;
                return (
                  <button
                    key={ch}
                    data-char={ch}
                    style={{ '--match-color': c.color }}
                    className={`cast-row ${isActive ? 'active' : ''}`}
                    onClick={() => onCharacterClick(ch)}
                    onMouseEnter={() => onCharacterHover(ch)}
                    onMouseLeave={() => onCharacterHover(null)}
                  >
                    <div className="portrait" style={{background:`linear-gradient(135deg, ${c.color}, ${c.color}88)`}}>
                      <window.Portrait
                        url={window.castPortrait(current, ch)}
                        alt={I18N.charName(ch)} initials={c.initials}/>
                    </div>
                    <div className="cast-text">
                      <div className="char-name"><window.Highlight text={I18N.charName(ch)} query={search}/></div>
                      <div className="actor-name"><window.Highlight text={window.MCU_credit(current, ch)} query={search}/></div>
                    </div>
                    <div className="cast-color-dot" style={{background:c.color}}/>
                  </button>
                );
              })}
            </window.DetailSection>
          }/>
      </div>
    </aside>
  );
}

// [sort, icon]; labels come from the active language (sort.* / sort.short.*).
const SORT_OPTIONS = [['release','▤'],['chrono','⇄'],['phase','◫'],['title','⇅'],['imdb','★'],['rt','◉']];

function Toolbar({ onHome, guideId, onOpenGuide, onAbout, onSettings, settingsOpen, onPickTitle, onPickPerson, desktopView, setDesktopView, sort, setSort, sortDir, setSortDir, phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter, collectionFilter, setCollectionFilter, search, setSearch }) {
  const [popOpen, setPopOpen] = useState(false);
  const popRef = useRef(null);
  // The sort row fits by measuring (window.useFitSteps; Notion "Font size
  // increase"), so it holds in Portuguese and at every Text size:
  //   1  short sort labels;  2  the collection switch labels only All and the
  //   selected option;  3  the view switch shows icons only;  4  the switch
  //   labels only All;  5  unselected sort tabs show their icon only.
  const sortRow = useRef(null);
  const sortFit = window.useFitSteps(sortRow, 5, [I18N.lang, sort, collectionFilter, desktopView]);
  // Collection has its own always-visible switch, so it is not counted here.
  const activeFilters = (phaseFilter !== 'all' ? 1 : 0) + (budgetFilter !== 'all' ? 1 : 0) + (releaseFilter !== 'all' ? 1 : 0);
  useEffect(() => {
    if (!popOpen) return;
    const away = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setPopOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setPopOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [popOpen]);
  // An open guide shows only its own stops: in the List (and the phone List
  // and Grid) it ignores the layout tabs, Order, filters, type and collection;
  // in Spatial the layout tabs and Order still arrange the canvas. What it
  // ignores is dimmed with a tooltip (GuideOff), and kept for when it closes.
  const guideOn = !!guideId;
  const listOff = guideOn && desktopView === 'list';
  const Off = window.GuideOff;
  // Grouped like the mobile header. The top row holds the brand, then search,
  // order, filters and type, then language + account at the right edge; on
  // narrower desktops the search group wraps onto its own row (CSS). Below it:
  // sort modes and the collection switch.
  return (
    <div className="toolbar" role="banner">
      <div className="tb-row tb-top-row">
        {/* The logo is a link home: it resets the app in place (onHome). */}
        <a className="brand" href="/" onClick={onHome} aria-label={tr('home.link')} title={tr('home.link')}>
          <span className="brand-mark logo-mark" aria-hidden="true"/>
          {/* The wordmark is drawn (.logo-word); the name stays as text for
              screen readers and the page outline. */}
          <h1 className="brand-title"><span className="logo-word" aria-hidden="true"/><span className="story-sr">{tr('app.name')}</span></h1>
        </a>
        <div className="tb-filter-row">
          <div className="search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
            <window.SearchInput value={search} onChange={setSearch} onPickTitle={onPickTitle} onPickPerson={onPickPerson}
              ariaLabel={tr('search.aria')} placeholder={tr('search.placeholder')}/>
          </div>
          <Off off={listOff}><div className="tb-order-control">
            <span className="tb-order-label">{tr('order.label')}</span>
            <window.SortOrderMenu sort={sort} sortDir={sortDir} setSortDir={setSortDir}/>
          </div></Off>
          <Off off={guideOn}><div className="filters-pop-wrap" ref={popRef}>
            <button className={`filters-pill${popOpen?' open':''}${activeFilters?' active':''}`} onClick={()=>setPopOpen(o=>!o)}
              aria-label={activeFilters ? tr('filters.aria', { n: activeFilters }) : tr('filters.title')} title={tr('filters.title')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              <span className="filters-label">{tr('filters.title')}</span>{activeFilters ? <span className="fcount">{activeFilters}</span> : null}
            </button>
            {popOpen && (
              <div className="filters-pop">
                <div className="control-group">
                  <label>{tr('filters.phase')}</label>
                  <div className="segmented">
                    {['all','1','2','3','4','5','6'].map(p=>(
                      <button key={p} className={phaseFilter===p?'on':''} onClick={()=>setPhaseFilter(p)}
                        style={p!=='all' && phaseFilter===p ? {background:PHASE_COLORS[p],color:'var(--on-color)',borderColor:PHASE_COLORS[p]} : {}}
                      >{p==='all'?tr('filters.all'):p}</button>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label>{tr('filters.budget')}</label>
                  <div className="segmented">
                    <window.SegPill value={budgetFilter}/>
                    {[['all','filters.all'],['low','budget.low'],['mid','budget.mid'],['high','budget.high'],['mega','budget.mega']].map(([v,k])=>(
                      <button key={v} className={budgetFilter===v?'on':''} onClick={()=>setBudgetFilter(v)}>{tr(k)}</button>
                    ))}
                  </div>
                </div>
                {/* Released only sits with the other catalogue filters rather
                    than in the toolbar, so the navigation does not grow. */}
                <div className="control-group">
                  <label>{tr('filter.release')}</label>
                  <div className="segmented">
                    <window.SegPill value={releaseFilter}/>
                    {[['all','filter.release.all'],['released','filter.release.released']].map(([v,k])=>(
                      <button key={v} className={releaseFilter===v?'on':''} aria-pressed={releaseFilter===v} onClick={()=>setReleaseFilter(v)}>{tr(k)}</button>
                    ))}
                  </div>
                </div>
                <div className="control-group">
                  <label>{tr('order.label')}</label>
                  <div className="segmented">
                    <window.SegPill value={sortDir}/>
                    {sortDirectionLabels(sort).map((label, i) => (
                      <button key={label} className={sortDir===(i===0?'asc':'desc')?'on':''}
                        aria-pressed={sortDir===(i===0?'asc':'desc')}
                        onClick={()=>setSortDir(i===0?'asc':'desc')}>{label}</button>
                    ))}
                  </div>
                </div>
                {activeFilters > 0 && (
                  <button className="pop-clear" onClick={()=>{ setPhaseFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }}>{tr('filters.clear')}</button>
                )}
              </div>
            )}
          </div></Off>
          <Off off={guideOn}><div className="control-group tb-type-controls">
            <div className="segmented">
              <window.SegPill value={typeFilter}/>
              {[['all','type.all'],['film','type.films'],['series','type.series']].map(([v,k])=>(
                <button key={v} className={typeFilter===v?'on':''} onClick={()=>setTypeFilter(v)}>{tr(k)}</button>
              ))}
            </div>
          </div></Off>
          {guideOn && <window.GuideOffHint/>}
        </div>
        <div className="tb-end">
          <window.SyncStatus/>
          <window.GuidesButton currentId={guideId} onPick={onOpenGuide}/>
          {/* Theme and language live in Settings (Notion "Settings menu"). */}
          <window.SettingsButton onOpen={onSettings} open={settingsOpen}/>
          <window.AccountButton onPickCollection={setCollectionFilter} onAbout={onAbout}/>
        </div>
      </div>
      <div className="tb-row tb-sort-row" ref={sortRow} data-fit={sortFit}>
        <Off off={listOff}><div className="control-group tb-sort-controls">
          <div className="segmented">
            <window.SegPill value={sort}/>
            {SORT_OPTIONS.map(([v,ic])=>(
              <button key={v} className={sort===v?'on':''} onClick={()=>setSort(v)} aria-pressed={sort===v} title={tr('sort.' + v)}>
                <span className="si">{ic}</span><span className="lg">{tr('sort.' + v)}</span><span className="sm">{tr('sort.short.' + v)}</span>
              </button>
            ))}
          </div>
        </div></Off>
        <Off off={guideOn}><window.CollectionSwitch value={collectionFilter} onChange={setCollectionFilter}/></Off>
        <div className="segmented tb-view-switch" role="group" aria-label={tr('view.label')}>
          <window.SegPill value={desktopView}/>
          {[['spatial', '◈'], ['list', '☰']].map(([v, ic]) => (
            <button key={v} className={desktopView === v ? 'on' : ''} aria-pressed={desktopView === v}
              title={tr('view.' + v)} aria-label={tr('view.' + v)} onClick={() => setDesktopView(v)}>
              <span className="vi" aria-hidden="true">{ic}</span><span className="vl">{tr('view.' + v)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Connection layer with bolder lines and improved bezier control
// Label pill width from the rendered name (11px Inter, dot + 20px on the
// left, 12px on the right), so short and long names get the same padding.
let labelMeasure = null;
function labelPillWidth(text) {
  try {
    if (!labelMeasure) labelMeasure = document.createElement('canvas').getContext('2d');
    labelMeasure.font = "500 11px 'Inter Variable', sans-serif";
    return Math.ceil(labelMeasure.measureText(text).width) + 32;
  } catch (e) {
    return Math.ceil(text.length * 6.6) + 32;
  }
}

function FloatingConnections({ visibleTitles, positions, hoveredTitle, activeChar, activeChars, litIds, onHoverConnection, hoveredConnection, selectedId, focusId, pair, onPickConnection, avoidIds, route, drawChar }) {
  // An open guide: one route through its stops in guide order, dashed on to
  // the destination, in place of the character threads. A single path in the
  // existing layer, so the canvas performance rules hold.
  if (route) {
    const centre = (id) => { const p = positions[id]; return p && { x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 }; };
    const pts = route.ids.map(centre).filter(Boolean);
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1], false]);
    const dest = route.target && centre(route.target);
    if (dest && pts.length) segs.push([pts[pts.length - 1], dest, true]);
    const d = (a, b) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
      const sag = Math.min(90, 20 + dist * 0.12);
      return `M ${a.x} ${a.y} Q ${mx - dy / dist * sag} ${my + dx / dist * sag} ${b.x} ${b.y}`;
    };
    return (
      <svg className="connection-layer guide-route" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible'}} aria-hidden="true">
        {segs.map(([a, b, dashed], i) => (
          <path key={i} d={d(a, b)} fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth={dashed ? 2.5 : 4} strokeLinecap="round"
            strokeDasharray={dashed ? '10 9' : undefined} opacity={dashed ? 0.7 : 0.9}/>
        ))}
      </svg>
    );
  }
  // Group appearances by prime identity so variants share one continuous thread,
  // but remember which specific variants appeared in each title.
  // One appearance per (prime, title): several variants of the same identity can share a
  // title (the three Peters in No Way Home) — that is not a connection between titles.
  const primeToAppearances = {};
  visibleTitles.forEach(t => {
    t.cast.forEach(c => {
      const p = primeOf(c);
      if (!primeToAppearances[p]) primeToAppearances[p] = {};
      const app = primeToAppearances[p][t.id];
      if (!app) primeToAppearances[p][t.id] = { id: t.id, variants: [c], release: t.release, prime: p };
      else if (app.variants.indexOf(c) === -1) app.variants.push(c);
    });
  });

  // Build pairs: connect consecutive (release-ordered) appearances of each prime identity
  const grouped = {};
  Object.values(primeToAppearances).forEach(byTitle => {
    const apps = Object.values(byTitle);
    if (apps.length < 2) return;
    const ordered = apps.sort((a,b) => a.release.localeCompare(b.release) || a.id.localeCompare(b.id));
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i], b = ordered[i+1];
      if (a.id === b.id) continue;
      const key = a.id + '__' + b.id;
      if (!grouped[key]) grouped[key] = { a: a.id, b: b.id, characters: [] };
      // Label/colour the segment by the variant(s) in both titles (No Way Home
      // to Your Friendly Neighborhood Spider-Man is Holland's Peter, whichever
      // Peter No Way Home lists first). A thread that passes between variants
      // (Captain Carter on to Peggy) has none in common: it takes the earlier
      // title's, preferring the core identity when that title has it.
      const shared = a.variants.filter(v => b.variants.indexOf(v) !== -1);
      const labels = shared.length ? shared
        : [a.variants.indexOf(a.prime) !== -1 ? a.prime : a.variants[0]];
      labels.forEach(v => { if (!grouped[key].characters.includes(v)) grouped[key].characters.push(v); });
    }
  });
  const connections = Object.values(grouped);

  // Control point of a connection's curve. Titles on the same row (neighbours
  // on a timeline or grid) would be joined by a line hidden behind the cards,
  // so those arc below the row instead, one lane per character (`lane`).
  // The pair view keeps its two cards apart with nothing between, so it uses
  // the normal gentle curve.
  function control(p1, p2, offset, lane, straight) {
    const x1 = p1.x + CARD_W/2, y1 = p1.y + CARD_H/2;
    const x2 = p2.x + CARD_W/2, y2 = p2.y + CARD_H/2;
    const dx = x2 - x1, dy = y2 - y1;
    if (!straight && Math.abs(dy) < CARD_H * 0.5) {
      const depth = CARD_H / 2 + 34 + lane * 9 + Math.min(70, Math.abs(dx) * 0.04);
      return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: Math.max(y1, y2) + depth * 2 };
    }
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy/dist, ny = dx/dist;
    const sag = Math.min(120, 30 + dist * 0.15);
    return { x1, y1, x2, y2, cx: (x1+x2)/2 + nx * (sag*0.6 + offset), cy: (y1+y2)/2 + ny * (sag*0.6 + offset) };
  }
  function curve(p1, p2, offset, lane, straight) {
    const c = control(p1, p2, offset, lane, straight);
    return `M ${c.x1} ${c.y1} Q ${c.cx} ${c.cy} ${c.x2} ${c.y2}`;
  }

  // Compute label point along curve at parameter t (0..1)
  function pointOnCurve(p1, p2, offset, t, lane, straight) {
    const { x1, y1, x2, y2, cx, cy } = control(p1, p2, offset, lane, straight);
    // Quadratic bezier at t
    const u = 1 - t;
    return {
      x: u*u*x1 + 2*u*t*cx + t*t*x2,
      y: u*u*y1 + 2*u*t*cy + t*t*y2,
    };
  }

  // Card rectangles, so labels can avoid sitting on a card.
  const cardRects = visibleTitles.filter(t => !avoidIds || avoidIds.has(t.id)).map(t => positions[t.id]).filter(Boolean)
    .map(p => ({ x0: p.x - 6, y0: p.y - 6, x1: p.x + CARD_W + 6, y1: p.y + CARD_H + 6 }));
  const coveredBy = (x, y, w, h) => cardRects.find(r => x + w / 2 > r.x0 && x - w / 2 < r.x1 && y + h / 2 > r.y0 && y - h / 2 < r.y1);
  // Best spot for a label near point(t0) on its curve: the closest point along
  // the curve that no card covers; failing that, just above or below the card
  // in the way; failing that, the original point (labels draw above the cards
  // either way, so they stay readable).
  function placeLabel(point, t0, w, h) {
    let best = null, bestCost = Infinity;
    const steps = [0, -0.08, 0.08, -0.16, 0.16, -0.24, 0.24, -0.32, 0.32];
    steps.forEach(d => {
      const t = Math.min(0.92, Math.max(0.08, t0 + d));
      const p = point(t);
      const r = coveredBy(p.x, p.y, w, h);
      if (!r) {
        const cost = Math.abs(d);
        if (cost < bestCost) { best = p; bestCost = cost; }
        return;
      }
      [r.y0 - h / 2 - 2, r.y1 + h / 2 + 2].forEach(y => {
        if (coveredBy(p.x, y, w, h)) return;
        const cost = 0.4 + Math.abs(d) + Math.abs(y - p.y) / 400;
        if (cost < bestCost) { best = { x: p.x, y }; bestCost = cost; }
      });
    });
    return best || point(t0);
  }

  // First pass: render lines + endpoints, collect labels for collision resolution
  const labels = [];

  // A pinned character's thread draws itself (Notion V4 Tasks, "Micro-
  // interaction: a pinned character's thread draws itself"): each of its lit
  // segments strokes in, one after another in the order its titles are laid
  // out, about 0.8s in all. Only pinning draws (hovering lights the thread at
  // once); the class is added when the pin starts and stays while it lasts,
  // so later renders never replay it. A pin that re-lays the canvas hides the
  // lines while the cards glide (linesSettling): the canvas passes no
  // drawChar until they land, so the thread draws where it can be seen.
  // Reduce motion: the thread appears at once.
  const drawRank = new Map();
  if (drawChar && !pair) {
    const order = new Map(visibleTitles.map((t, i) => [t.id, i]));
    const segs = connections.filter(c => c.characters.some(ch => primeOf(ch) === primeOf(drawChar)))
      .sort((x, y) => Math.min(order.get(x.a) ?? 0, order.get(x.b) ?? 0) - Math.min(order.get(y.a) ?? 0, order.get(y.b) ?? 0));
    const step = segs.length > 1 ? Math.min(90, 700 / (segs.length - 1)) : 0;
    segs.forEach((c, i) => drawRank.set(c.a + '__' + c.b, Math.round(i * step)));
  }

  const lineEls = connections.map(conn => {
    const p1 = positions[conn.a], p2 = positions[conn.b];
    if (!p1 || !p2) return null;
    const isHovered = hoveredConnection && hoveredConnection.a === conn.a && hoveredConnection.b === conn.b;
    const isPair = pair && pair.a === conn.a && pair.b === conn.b;
    const involvesFocus = focusId && (focusId === conn.a || focusId === conn.b);
    const anyFocus = focusId || hoveredConnection || activeChar || pair;
    const N = conn.characters.length;

    return conn.characters.map((ch, i) => {
      const charObj = window.CHARACTERS[ch];
      if (!charObj) return null;
      const offsetIdx = i - (N - 1) / 2;
      const offset = offsetIdx * 14;
      // A hovered character narrows everything to that character's thread, so
      // no other line stays lit while leading into a dimmed card. Otherwise the
      // pair view, a hovered line or the focused title's lines are lit.
      // A character lights its whole identity thread (hovering Captain Carter
      // lights Peggy's lines too), and only where both ends are lit cards: a
      // performer pin lights their own titles, so a line on to a title they are
      // not in stays dim. Every lit line ends in two lit cards.
      const isChar = !!activeChars && activeChars.some(a => primeOf(a) === primeOf(ch))
        && (!litIds || (litIds.has(conn.a) && litIds.has(conn.b)));
      const emphasized = pair ? isPair : activeChar ? isChar : (isHovered || involvesFocus);
      const dimmed = anyFocus && !emphasized;
      const baseOpacity = dimmed ? 0.05 : (emphasized ? 1 : 0.55);
      const strokeW = emphasized ? 3 : 1.8;
      const showLabel = emphasized && (isPair || involvesFocus);
      const drawDelay = emphasized && drawChar && primeOf(ch) === primeOf(drawChar) ? drawRank.get(conn.a + '__' + conn.b) : undefined;
      const draw = drawDelay !== undefined ? { className: 'thread-draw', pathLength: 1, style: { '--d': drawDelay + 'ms' } } : null;

      if (showLabel) {
        // Spread labels along the curve based on N: t in (0.15..0.85), then
        // move each to the nearest spot not covered by a card (see placeLabel).
        const t0 = N === 1 ? 0.5 : 0.15 + (i / (N - 1)) * 0.7;
        const labelText = I18N.charName(ch);
        const labelW = labelPillWidth(labelText);
        const lp = placeLabel(t => pointOnCurve(p1, p2, offset, t, i, isPair), t0, labelW, 22);
        labels.push({ x: lp.x, y: lp.y, w: labelW, h: 22, color: charObj.color, text: labelText, key: conn.a + '__' + conn.b + '__' + ch });
      }

      return (
        <g key={ch+i+conn.a+conn.b}>
          {emphasized && (
            <path d={curve(p1,p2,offset,i,isPair)} fill="none" stroke={charObj.color} strokeWidth={strokeW + 6} opacity={0.25} filter="url(#strong-glow)" strokeLinecap="round"
              {...(draw ? { className: draw.className, pathLength: draw.pathLength, style: draw.style } : {})}/>
          )}
          <path
            d={curve(p1,p2,offset,i,isPair)}
            data-a={conn.a} data-b={conn.b} data-ch={ch} data-em={emphasized ? '1' : '0'}
            onClick={(e) => { e.stopPropagation(); if (onPickConnection) onPickConnection({ a: conn.a, b: conn.b }); }}
            style={{transition:'opacity 220ms, stroke-width 220ms', cursor: 'pointer', ...(draw ? draw.style : {})}}
            className={draw ? draw.className : undefined}
            pathLength={draw ? draw.pathLength : undefined}
            fill="none"
            stroke={charObj.color}
            strokeWidth={strokeW}
            opacity={baseOpacity}
            strokeLinecap="round"
            filter={emphasized ? 'url(#line-glow)' : undefined}
            pointerEvents="stroke"
            onMouseEnter={(e)=>onHoverConnection({a:conn.a,b:conn.b,characters:conn.characters,x:e.clientX,y:e.clientY})}
            onMouseLeave={()=>onHoverConnection(null)}
          />
          {emphasized && (
            <>
              <circle cx={p1.x + CARD_W/2} cy={p1.y + CARD_H/2} r={5} fill={charObj.color} opacity={0.9} filter="url(#strong-glow)"/>
              <circle cx={p2.x + CARD_W/2} cy={p2.y + CARD_H/2} r={5} fill={charObj.color} opacity={0.9} filter="url(#strong-glow)"/>
            </>
          )}
        </g>
      );
    });
  });

  // Resolve label collisions: simple iterative push-apart
  // Sort by y then x for stable ordering
  labels.sort((a, b) => a.y - b.y || a.x - b.x);
  const padX = 14, padY = 10;
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDX = (a.w + b.w)/2 + padX;
        const minDY = (a.h + b.h)/2 + padY;
        if (Math.abs(dx) < minDX && Math.abs(dy) < minDY) {
          // Resolve along axis with smaller overlap
          const overlapX = minDX - Math.abs(dx);
          const overlapY = minDY - Math.abs(dy);
          if (overlapY <= overlapX) {
            const push = (overlapY / 2) + 1;
            const dir = dy >= 0 ? 1 : -1;
            a.y -= push * dir;
            b.y += push * dir;
          } else {
            const push = (overlapX / 2) + 1;
            const dir = dx >= 0 ? 1 : -1;
            a.x -= push * dir;
            b.x += push * dir;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  const labelEls = labels.map(l => (
    <g key={'lbl_' + l.key} style={{pointerEvents:'none'}}>
      <rect x={l.x - l.w/2} y={l.y - l.h/2 + 2} width={l.w} height={l.h} rx={l.h/2} fill="#000" opacity="0.45"/>
      <rect x={l.x - l.w/2} y={l.y - l.h/2} width={l.w} height={l.h} rx={l.h/2}
        style={{ fill: 'var(--background)' }} stroke={l.color} strokeWidth="1.2" opacity="0.97"/>
      <circle cx={l.x - l.w/2 + 11} cy={l.y} r={3.5} fill={l.color}/>
      <text x={l.x - l.w/2 + 20} y={l.y + 3.6} fontSize="11" fontFamily="'Inter Variable', sans-serif" fontWeight="500" style={{ fill: 'var(--foreground)' }}>{l.text}</text>
    </g>
  ));

  return (
    <>
    <svg className="connection-layer" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible'}}>
      <defs>
        <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="strong-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {lineEls}
      <style>{`.connection-layer path { pointer-events: stroke; }`}</style>
    </svg>
    {/* Labels above the cards (z-index in styles.css), so none hides behind one. */}
    <svg className="connection-labels" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible'}}>
      {labelEls}
    </svg>
    </>
  );
}

// Display preferences (V3-SPEC D6): device-scoped, localStorage only, not tied to
// the account and not cleared on sign-out. Saves the mobile view mode, the
// desktop view (Spatial or List), the sort mode and the order direction. Filters, search and the
// spatial camera deliberately start fresh each visit, so nobody returns to a
// silently filtered catalog. Nothing is written until the visitor changes one of
// these, so first visits keep following the defaults below. Missing, malformed or
// unknown values fall back to those defaults.
const PREFS_KEY = 'mcu.prefs.v1';
const PREFS_VERSION = 1;
const VIEW_MODE_VALUES = ['list', 'grid', 'spatial'];
const DESKTOP_VIEW_VALUES = ['spatial', 'list'];

function readDisplayPrefs() {
  const prefs = { viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: DEFAULT_SORT_DIR.release };
  let parsed = null;
  try {
    parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || 'null');
  } catch (e) {
    return prefs; // Storage disabled, or not valid JSON.
  }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== PREFS_VERSION) return prefs;
  if (VIEW_MODE_VALUES.indexOf(parsed.viewMode) !== -1) prefs.viewMode = parsed.viewMode;
  if (DESKTOP_VIEW_VALUES.indexOf(parsed.desktopView) !== -1) prefs.desktopView = parsed.desktopView;
  if (Object.prototype.hasOwnProperty.call(DEFAULT_SORT_DIR, parsed.sort)) {
    prefs.sort = parsed.sort;
    prefs.sortDir = parsed.sortDir === 'asc' || parsed.sortDir === 'desc' ? parsed.sortDir : DEFAULT_SORT_DIR[parsed.sort];
  }
  return prefs;
}

// Public exploration state in the address, so a view can be bookmarked or
// shared: the open title, a pinned character, the view, sort, order and the
// catalogue filters. Never the collection filter (it means something different
// to whoever opens the link), the search text, the language or anything from
// the account. The names avoid code / state / error, which the sign-in
// redirect uses (account.jsx stripAuthParams).
const URL_KEYS = ['view', 'sort', 'order', 'phase', 'type', 'budget', 'release', 'title', 'char', 'guide'];
function readURLState() {
  const out = { any: false };
  let q;
  try { q = new URLSearchParams(window.location.search); } catch (e) { return out; }
  out.any = URL_KEYS.some(k => q.has(k));
  const v = q.get('view'); if (VIEW_MODE_VALUES.indexOf(v) !== -1) out.view = v;
  const s = q.get('sort'); if (Object.prototype.hasOwnProperty.call(DEFAULT_SORT_DIR, s)) out.sort = s;
  const o = q.get('order'); if (o === 'asc' || o === 'desc') out.order = o;
  const ph = q.get('phase'); if (/^[1-6]$/.test(ph || '')) out.phase = ph;
  const ty = q.get('type'); if (ty === 'film' || ty === 'series') out.type = ty;
  const b = q.get('budget'); if (['low', 'mid', 'high', 'mega'].indexOf(b) !== -1) out.budget = b;
  if (q.get('release') === 'released') out.release = 'released';
  const t = q.get('title'); if (t && window.TITLES.some(x => x.id === t)) out.title = t;
  const c = q.get('char'); if (c && window.CHARACTERS && window.CHARACTERS[c]) out.char = c;
  const g = q.get('guide'); if (g && (window.GUIDES || []).some(x => x.id === g)) out.guide = g;
  return out;
}

// Writes the given state into the address without adding a history entry.
// history.state is passed through untouched: it carries the phone sheets'
// token (mobile.jsx sheetHistory), and replacing it would break their Back.
function writeURLState(params) {
  try {
    const url = new URL(window.location.href);
    URL_KEYS.forEach(k => url.searchParams.delete(k));
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));
    const next = url.pathname + url.search + url.hash;
    const now = window.location.pathname + window.location.search + window.location.hash;
    if (next !== now) window.history.replaceState(window.history.state, '', next);
  } catch (e) { /* an out-of-date address is not worth a crash */ }
}

function writeDisplayPrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ version: PREFS_VERSION, ...prefs }));
  } catch (e) { /* Quota or disabled storage: the choice lasts for this visit only. */ }
}

function App() {
  // Re-render the whole tree when the language changes.
  const { lang } = window.useI18n();
  const [urlAtLoad] = useState(readURLState);
  // A shared address opens what it says, and what it leaves out takes the
  // app's defaults rather than this device's saved ones, so the link looks the
  // same to everyone. An address with none of our keys uses the saved prefs.
  const [initialPrefs] = useState(() => {
    if (!urlAtLoad.any) return readDisplayPrefs();
    const p = { viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: DEFAULT_SORT_DIR.release };
    if (urlAtLoad.view) { p.viewMode = urlAtLoad.view; p.desktopView = urlAtLoad.view === 'grid' ? 'list' : urlAtLoad.view; }
    if (urlAtLoad.sort) { p.sort = urlAtLoad.sort; p.sortDir = DEFAULT_SORT_DIR[urlAtLoad.sort]; }
    if (urlAtLoad.order) p.sortDir = urlAtLoad.order;
    return p;
  });
  const [sort, setSort] = useState(initialPrefs.sort);
  const [sortDir, setSortDir] = useState(initialPrefs.sortDir);
  const changeSort = (v) => { if (v === sort) return; setSort(v); setSortDir(DEFAULT_SORT_DIR[v] || 'asc'); };
  const [phaseFilter, setPhaseFilter] = useState(urlAtLoad.phase || 'all');
  const [typeFilter, setTypeFilter] = useState(urlAtLoad.type || 'all');
  const [budgetFilter, setBudgetFilter] = useState(urlAtLoad.budget || 'all');
  const [releaseFilter, setReleaseFilter] = useState(urlAtLoad.release || 'all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [mediaReady, setMediaReady] = useState(!!window.MEDIA);
  const { states: collectionStates, statusOf, ready: collectionReady, settled: collectionSettled } = window.useCollection();
  // The latest statusOf, for code that runs after a delay.
  const statusOfRef = useRef(statusOf);
  statusOfRef.current = statusOf;

  useEffect(() => { setMediaReady(true); }, []);
  const device = useDevice();
  const isTouch = device !== 'desktop';
  // Phone layout, or a wide screen that can still be touched.
  const touchPan = isTouch || HAS_TOUCH;
  // Mobile opens in List unless the visitor chose another view before. Desktop
  // has its own choice (Spatial by default, or List) so the two never fight.
  const [viewMode, setViewMode] = useState(initialPrefs.viewMode);
  const [desktopView, setDesktopView] = useState(initialPrefs.desktopView);
  const prefsLoaded = useRef(false);
  useEffect(() => {
    if (!prefsLoaded.current) { prefsLoaded.current = true; return; }
    writeDisplayPrefs({ viewMode, desktopView, sort, sortDir });
  }, [viewMode, desktopView, sort, sortDir]);
  const [drawerId, setDrawerId] = useState(null);
  const drawerIdRef = useRef(null);
  drawerIdRef.current = drawerId;
  const [sheet, setSheet] = useState(null);
  // Desktop About dialog (phones use the 'about' sheet).
  const [aboutOpen, setAboutOpen] = useState(false);
  // Settings: a panel on desktop, a sheet on phones (sheet === 'settings').
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings stays on screen while it slides away (settingsShown), and the
  // details drawer waits for it, so closing Settings onto a title reads as one
  // move: Settings out, then the details in.
  const [settingsShown, setSettingsShown] = useState(false);
  useEffect(() => { if (settingsOpen) setSettingsShown(true); }, [settingsOpen]);
  // First visit: the same About content as a one-time welcome (about.jsx).
  const [welcome, setWelcome] = useState(() => !!window.MCU_WELCOME);
  // "What have you seen?" (picker.jsx): from the welcome, the account menu or
  // sheet, and the Seen tab's empty state. It replaces whatever layer opened it.
  const [pickerOpen, setPickerOpen] = useState(false);
  const openPicker = () => { setWelcome(false); setAboutOpen(false); setSheet(null); setPickerOpen(true); };
  window.MCU_openPicker = openPicker;
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredTitle, setHoveredTitle] = useState(null);
  const [hoveredCharacter, setHoveredCharacter] = useState(null);
  const [hoveredConnection, setHoveredConnection] = useState(null);
  // A clicked connection: its two titles are brought side by side.
  const [pair, setPair] = useState(null);
  const [highlightedChar, setHighlightedChar] = useState(null);
  // A pin is either one portrayal or a performer. The performer form covers
  // that actor's own characters and nothing else, so exact portrayal still
  // holds: their titles are the titles they are actually in. `highlightedChar`
  // stays a real character id either way (the representative one), because
  // colour, photo and name are looked up through window.CHARACTERS.
  const [pinnedActor, setPinnedActor] = useState(null);
  // An open guide (guides.js, guides-ui.jsx): a curated path through the
  // catalogue. It works like a pinned character (narrows the flat views,
  // dims the rest of the canvas, steps through its stops) but in its own
  // order, with optional stops behind a switch. One of the two at a time.
  const [guideId, setGuideId] = useState(() => readURLState().guide || null);
  const [guideOptional, setGuideOptional] = useState(false);
  const guide = useMemo(() => (guideId && window.MCU_GUIDE ? window.MCU_GUIDE.get(guideId) : null), [guideId]);
  // Read by the details' "Part of" section (guides-ui.jsx), which starts
  // closed while a guide is open. Set during render, before the details render.
  window.MCU_activeGuideId = guideId;
  // Skipped stops (guides-ui.jsx) leave the guide's path: the stepper, Up
  // next and the Spatial route all read guideStepTitles, which leaves them out
  // unless they were seen anyway.
  const skipsVersion = window.useGuideSkips();
  const guideStepTitles = useMemo(() => (guide ? window.MCU_GUIDE.stops(guide, guideOptional)
    .filter(st => !window.MCU_GUIDE.skippedNow(guide, st.id, (id) => collectionStates[id] || 'none'))
    .map(st => st.title) : []), [guide, guideOptional, skipsVersion, collectionStates]);
  // The guide's titles on the canvas (its stops and, for an event guide, the
  // destination): the rest dim, nothing moves. A guide only ever shows its
  // own titles; closing it brings back everything.
  // Number badges for the canvas: a check once seen, the stop's number (or +
  // for optional), an arrow for an event guide's destination.
  const guideBadges = useMemo(() => {
    if (!guide) return null;
    const m = {};
    window.MCU_GUIDE.stops(guide, guideOptional).forEach(st => {
      const seen = collectionStates[st.id] === 'seen';
      if (!seen && window.MCU_GUIDE.isSkipped(guide, st.id)) {
        m[st.id] = { text: '–', cls: `skip${st.optional ? ' o' : ''}`, label: st.optional ? tr('guide.optSkippedAria') : tr('guide.stopSkippedAria', { i: st.n }) };
        return;
      }
      m[st.id] = {
        text: seen ? '✓' : st.optional ? '+' : String(st.n),
        cls: `${seen ? 'done' : ''}${st.optional ? ' o' : ''}`,
        label: st.optional ? tr(seen ? 'guide.optSeenAria' : 'guide.optAria') : tr(seen ? 'guide.stopSeenAria' : 'guide.stopAria', { i: st.n }),
      };
    });
    if (guide.target) m[guide.target] = { text: '→', cls: 'dest', label: tr('guide.dest') };
    return m;
  }, [guide, guideOptional, collectionStates, lang, skipsVersion]);
  // Finishing a guide's essential stops while it is open bursts green
  // confetti, every time it becomes complete (like the phase milestones), by
  // marking the last stop seen or skipping it. Opening a guide that is already
  // complete does not, and reduced motion gets none.
  const guideWasComplete = useRef(null);
  useEffect(() => {
    if (!guide || !collectionReady) { guideWasComplete.current = null; return; }
    const complete = window.MCU_GUIDE.progress(guide, statusOf).complete;
    const prev = guideWasComplete.current;
    guideWasComplete.current = { id: guide.id, complete };
    if (!complete || !prev || prev.id !== guide.id || prev.complete) return;
    // A finished guide is not reopened on the next visit.
    window.MCU_GUIDE.forget(guide.id);
    window.burstConfetti(['#5fa856', '#7cc46f', '#3d8a4a', '#b6e3a8', '#ffffff']);
  }, [guide, collectionStates, collectionReady, skipsVersion]);
  // Seen wins: a skipped stop that has been marked seen since is no longer
  // skipped (in any guide).
  useEffect(() => {
    if (collectionReady && window.MCU_GUIDE) window.MCU_GUIDE.dropSeenSkips((id) => collectionStates[id] || 'none');
  }, [collectionStates, collectionReady]);
  // Skip and Unskip on the canvas: released, unseen stops can be skipped; a
  // skipped one offers Unskip and dims everything but that button.
  const guideSkipInfo = useMemo(() => {
    if (!guide) return null;
    const statusNow = (id) => collectionStates[id] || 'none';
    const m = {};
    window.MCU_GUIDE.stops(guide, guideOptional).forEach(st => {
      if (window.MCU_GUIDE.skippedNow(guide, st.id, statusNow)) m[st.id] = { state: 'skipped', stop: st };
      else if (statusNow(st.id) !== 'seen' && window.MCU_isReleased(st.title)) m[st.id] = { state: 'can', stop: st };
    });
    return m;
  }, [guide, guideOptional, collectionStates, skipsVersion]);
  // After Skip or Unskip on the canvas: say so, and, for keyboard users, put
  // focus on the button that replaced the one pressed.
  const onCanvasSkip = (stop, on) => {
    const viaKeys = document.activeElement && document.activeElement.closest && document.activeElement.closest('.g-skipctl');
    setHomeAnnounce('');
    setTimeout(() => setHomeAnnounce(tr(on ? 'guide.skippedSaid' : 'guide.unskippedSaid', { title: I18N.titleName(stop.title) })), 50);
    if (viaKeys) requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector(`[data-id="${stop.id}"] .g-skipctl button, .m-focuspop .g-skipctl button`);
      if (el) el.focus();
    }));
  };
  // The guide's titles stay lit on the canvas; a skipped stop dims like a
  // title outside the guide (its badge, a dash, says why), except its Unskip.
  const guideIds = useMemo(() => {
    if (!guide) return null;
    const set = new Set(guideStepTitles.map(t => t.id));
    if (guide.target) set.add(guide.target);
    return set;
  }, [guide, guideStepTitles]);
  // Characters an actor plays, catalogue-wide and busiest first. Read from
  // TITLES, not the filtered set, since a pin is what narrows that.
  const performers = useMemo(() => {
    const seen = {};
    window.TITLES.forEach(t => t.cast.forEach(c => { seen[c] = (seen[c] || 0) + 1; }));
    // Keyed per title, not per character, because a part can change hands:
    // Rhodes is Terrence Howard in Iron Man and Don Cheadle after it, so each
    // performer gets the titles they were actually credited in.
    const byActor = {};
    window.TITLES.forEach(t => t.cast.forEach(id => {
      if (!window.CHARACTERS[id]) return;
      const name = window.MCU_credit(t, id);
      const p = byActor[name] || (byActor[name] = { chars: [], titles: new Set() });
      if (p.chars.indexOf(id) === -1) p.chars.push(id);
      p.titles.add(t.id);
    }));
    // Busiest role first; on a tie the through-line identity leads, so the
    // banner's photo and colour come from the recognisable one (Jonathan
    // Majors' three roles are one title each, and Kang should head them).
    const rank = id => (window.CHARACTERS[id].prime ? 1 : 0);
    Object.values(byActor).forEach(p => p.chars.sort((x, y) =>
      (seen[y] - seen[x]) || (rank(x) - rank(y)) || x.localeCompare(y)));
    return byActor;
  }, []);
  const charsByActor = useMemo(() => {
    const m = {};
    Object.keys(performers).forEach(name => { m[name] = performers[name].chars; });
    return m;
  }, [performers]);
  // Every title a character is in, over the WHOLE catalog. Not the same thing
  // as primeToTitleIds, which counts only what is currently visible: a search
  // narrows that, so using it to work out whether a performer covers a
  // character's whole run gives the wrong answer at exactly the moment the
  // question is asked — while the user is searching.
  const charTitleTotals = useMemo(() => {
    const m = {};
    window.TITLES.forEach(t => t.cast.forEach(c => { m[c] = (m[c] || 0) + 1; }));
    return m;
  }, []);
  // A part can change hands, so a character has a roster of performers rather
  // than one actor. Ordered by how much of the run each carries, so the first
  // name is the one most of the catalog means by that character.
  const creditsByChar = useMemo(() => window.MCU_creditRoster(), []);
  // The characters the current pin covers: one, or all of a performer's.
  const pinnedChars = useMemo(() => {
    if (pinnedActor) return charsByActor[pinnedActor] || null;
    return highlightedChar ? [highlightedChar] : null;
  }, [pinnedActor, charsByActor, highlightedChar]);
  // The titles it covers, catalogue-wide. A performer pin uses the titles they
  // are credited in, so Terrence Howard gives Iron Man alone rather than every
  // title Rhodes appears in.
  const pinnedTitleIds = useMemo(() => {
    if (pinnedActor) return (performers[pinnedActor] && performers[pinnedActor].titles) || null;
    if (!highlightedChar) return null;
    // A pinned character covers its whole identity: pinning Captain Carter
    // takes in Peggy Carter's titles, as her thread does (Andre, 2026-11-01).
    const prime = primeOf(highlightedChar);
    const s = new Set();
    window.TITLES.forEach(t => { if (t.cast.some(c => primeOf(c) === prime)) s.add(t.id); });
    return s;
  }, [pinnedActor, performers, highlightedChar]);
  // Pinned character: show only their titles (default) or everything, dimmed.
  const [charOnly, setCharOnly] = useState(true);
  // The title the highlight stepper (‹ ›) is on.
  const [stepId, setStepId] = useState(null);
  // Set while pinning a character: the canvas glides to this title (or '*' to
  // frame the set) once the new layout exists, instead of resetting first.
  const pendingStepRef = useRef(null);
  // Per-card position overrides from dragging
  const [overrides, setOverrides] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const dragRef = useRef(null);

  // Pan + zoom
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [zoomEdit, setZoomEdit] = useState(null);
  const ZOOM_MIN = 0.05;
  // Below this zoom the canvas is drawn at screen resolution instead of as one
  // GPU layer. As a layer it is rasterized at full size, and zoomed far out the
  // whole 12,000px-wide canvas is on screen at once: iOS Safari runs out of
  // memory and reloads the tab when it is panned.
  const LAYER_MIN_SCALE = 0.3;

  // Camera glide, for programmatic returns (see the selection return below).
  // Manual panning has its own, lighter glide — see the inertia below — but
  // both obey the same rule: any pointer or wheel input on the viewport
  // cancels them, so the canvas is never moving when you reach for it.
  const [cameraGlide, setCameraGlide] = useState(false);
  const glideTimer = useRef(null);
  const glideTo = useCallback((next) => {
    clearTimeout(glideTimer.current);
    setCameraGlide(true);
    setView(next);
    glideTimer.current = setTimeout(() => { glideTimer.current = null; setCameraGlide(false); }, 650);
  }, []);
  const stopGlide = useCallback(() => {
    if (!glideTimer.current) return;
    clearTimeout(glideTimer.current);
    glideTimer.current = null;
    setCameraGlide(false);
  }, []);

  // Inertia. A drag that ends with some speed keeps going and decelerates,
  // rather than stopping dead with the finger. Light on purpose: a short glide
  // that reads as polish, not a slide you have to chase back.
  //
  // This is a deliberate change to the rule above, which kept manual pan
  // instant so that nothing fought the hand. The rule still holds for what it
  // was protecting: a new press, touch or wheel kills the glide immediately,
  // so the canvas is never moving when you reach for it.
  const flickRef = useRef({ vx: 0, vy: 0, t: 0, px: 0, py: 0 });
  const inertiaRef = useRef(0);
  // A frame already queued can still run after cancelAnimationFrame, so the
  // token makes any such frame a no-op and the glide stops exactly where the
  // press caught it. (Belt and braces: the 17px drift this was first written
  // for turned out to be the test reading across React's final flush.)
  const inertiaGen = useRef(0);
  const stopInertia = useCallback(() => {
    inertiaGen.current += 1;
    if (!inertiaRef.current) return;
    cancelAnimationFrame(inertiaRef.current);
    inertiaRef.current = 0;
  }, []);
  // Called on every pan move, from both the mouse and the touch path, so the
  // release has a recent speed to work from rather than the whole drag's average.
  const sampleFlick = useCallback((x, y) => {
    const f = flickRef.current, now = performance.now(), dt = now - f.t;
    if (f.t && dt > 0 && dt < 120) { f.vx = (x - f.px) / dt; f.vy = (y - f.py) / dt; }
    f.t = now; f.px = x; f.py = y;
  }, []);
  const armFlick = useCallback((x, y) => {
    flickRef.current = { vx: 0, vy: 0, t: performance.now(), px: x, py: y };
  }, []);
  const startInertia = useCallback(() => {
    if (window.MCU_MOTION.reduced()) return;
    let { vx, vy } = flickRef.current;
    let speed = Math.hypot(vx, vy);
    // A slow release is a placement, not a throw: leave it exactly where it is.
    if (speed < 0.35) return;
    const MAX = 3;
    if (speed > MAX) { vx = (vx / speed) * MAX; vy = (vy / speed) * MAX; }
    let last = performance.now();
    const gen = ++inertiaGen.current;
    const step = (now) => {
      if (gen !== inertiaGen.current) return;
      // Clamped so a dropped frame cannot jump the canvas across the screen.
      const dt = Math.min(32, now - last);
      last = now;
      const decay = Math.pow(0.0018, dt / 1000);
      vx *= decay; vy *= decay;
      if (Math.hypot(vx, vy) < 0.02) { inertiaRef.current = 0; return; }
      setView(v => ({ ...v, x: v.x + vx * dt, y: v.y + vy * dt }));
      inertiaRef.current = requestAnimationFrame(step);
    };
    inertiaRef.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => stopInertia, [stopInertia]);
  // Anything that reaches for the canvas stops both the programmatic glide and
  // the inertia, so the camera is still under the hand.
  const stopCamera = useCallback(() => { stopGlide(); stopInertia(); }, [stopGlide, stopInertia]);
  // Where the camera was before a card was selected, so closing its details can
  // return there instead of leaving the viewport on the focus ring (laid out
  // near the canvas origin, i.e. the Phase 1 end of the timeline layouts).
  const viewRef = useRef(view);
  // A card reached with Tab that sits outside the visible canvas (or under the
  // details drawer) glides just far enough into view. Pointer focus never pans.
  const revealCard = useCallback((id) => {
    if (lastInput !== 'keyboard') return;
    const vp = viewportRef.current;
    const el = vp && vp.querySelector(`.card[data-id="${id}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect(), v = vp.getBoundingClientRect();
    const left = v.left + 24, right = v.right - (drawerIdRef.current ? 380 : 0) - 24;
    const top = v.top + 64, bottom = v.bottom - 64;
    let dx = 0, dy = 0;
    if (r.left < left) dx = left - r.left; else if (r.right > right) dx = right - r.right;
    if (r.top < top) dy = top - r.top; else if (r.bottom > bottom) dy = bottom - r.bottom;
    if (!dx && !dy) return;
    const cur = viewRef.current;
    glideTo({ x: cur.x + dx, y: cur.y + dy, scale: cur.scale });
  }, [glideTo]);
  viewRef.current = view;
  const selectionReturnRef = useRef(null);
  // The id of the card just picked on the canvas (see the selection return).
  const canvasPickRef = useRef(null);
  // False until resetView has framed the canvas; the mobile canvas only exists
  // while Spatial is showing, so its camera is unframed after each visit.
  const cameraFramedRef = useRef(false);
  const viewportRef = useRef(null);
  const panRef = useRef({ panning: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  // When a touch last drove the canvas. A device with both pointers synthesizes
  // a mouse press and a click about 300ms after a tap, and neither may run on
  // top of what the touch handlers already did: a background tap would step
  // back twice, closing two layers at once.
  const touchActiveRef = useRef(0);
  const afterTouch = () => !!touchRef.current || Date.now() - touchActiveRef.current < 400;

  // Maps title id -> array of cast character ids whose name/actor matched the
  // search text (empty array if the title only matched on its own title text).
  // null when there's no active search.
  const searchCharMatches = useMemo(() => {
    const q = I18N.fold(search.trim());
    if (!q) return null;
    const m = {};
    window.TITLES.forEach(t => {
      // Names in every language match, whichever language is showing.
      // Character-name matches come before actor-name ones, so "Sam" shows Sam
      // Wilson ahead of Nick Fury (Samuel L. Jackson) in the match badge.
      const byName = c => I18N.charNames(c).some(n => I18N.fold(n).includes(q));
      // Matched on the credit for *this* title, not the character's default,
      // so "Edward Norton" finds The Incredible Hulk and nothing else.
      const chars = t.cast.filter(c => {
        const ch = window.CHARACTERS[c];
        return ch && (byName(c) || I18N.fold(window.MCU_credit(t, c)).includes(q));
      }).sort((a, b) => byName(b) - byName(a));
      if (I18N.titleNames(t).some(n => I18N.fold(n).includes(q)) || chars.length) m[t.id] = chars;
    });
    return m;
  }, [search]);

  // NOTE: the collection filter (seen/watchlist/unseen) deliberately does NOT
  // belong in here. `filtered` feeds computeLayout -> basePositions -> resetView,
  // which runs from a useLayoutEffect — so anything added to this memo re-lays-out
  // the spatial canvas and recenters the viewport. With "Unseen" active, marking a
  // title seen would make the card vanish and yank the viewport out from under the
  // cursor mid-click. Collection is a dimming treatment on the canvas, and a
  // separate `visible` memo downstream of `ordered` for the flat mobile lists.
  const filtered = useMemo(() => {
    let list = window.TITLES.slice();
    // An open guide sets the filters aside (they are kept, dimmed in the
    // toolbar, for when it closes), so Spatial lays out every stop.
    const useFilters = !guide;
    if (useFilters && phaseFilter !== 'all') list = list.filter(t => String(t.phase) === phaseFilter);
    if (useFilters && typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (useFilters && budgetFilter !== 'all') list = list.filter(t => budgetMatches(t, budgetFilter));
    // Released only uses the same test as the completion count, so a title
    // with an announced month never passes as out.
    if (useFilters && releaseFilter === 'released') list = list.filter(t => window.MCU_isReleased(t));
    if (searchCharMatches) list = list.filter(t => searchCharMatches[t.id] !== undefined);
    // "Their titles": a pin narrows the layout like search does. Deliberate
    // (the visitor pins or toggles it), so re-laying out is expected.
    if (pinnedTitleIds && (charOnly || isTouch)) {
      list = list.filter(t => pinnedTitleIds.has(t.id));
    }
    return list;
  }, [phaseFilter, typeFilter, budgetFilter, releaseFilter, searchCharMatches, pinnedTitleIds, charOnly, isTouch, guide]);

  // How much of each phase and era has been seen. Deliberately NOT derived from
  // `visible`: the collection tab must not feed back into its own numbers, or
  // Seen would always read 100% and Unseen 0%. `filtered` is the right base —
  // it carries the type, phase and budget filters and nothing else.
  //
  // Hidden entirely during a text search, and while a character is pinned:
  // both narrow `filtered`, and a pinned character's progress is the one thing
  // the ticket rules out.
  const showProgress = !search.trim() && !highlightedChar;
  const groupProgress = useMemo(() => {
    if (!showProgress) return null;
    const eraOf = chronoEras(filtered);
    const byPhase = {}, byEra = {};
    const bump = (g, t) => {
      // Unreleased titles count towards neither side of the fraction — they are
      // not a gap in what you have watched — but they are still announced.
      if (!window.MCU_isReleased(t)) { g.upcoming += 1; return; }
      g.released += 1;
      if (statusOf(t.id) === 'seen') g.seen += 1;
    };
    const add = (m, k, t) => bump(m[k] || (m[k] = { seen: 0, released: 0, upcoming: 0 }), t);
    // `all` is the same tally over the whole set, for the views that group by
    // nothing: the phone Grid in Release order reads as one run of cards, so
    // one meter over all of it says more than six phase headings would.
    const all = { seen: 0, released: 0, upcoming: 0 };
    filtered.forEach(t => { add(byPhase, t.phase, t); add(byEra, eraOf[t.id], t); bump(all, t); });
    return { byPhase, byEra, all };
  }, [showProgress, filtered, collectionStates]);

  // Per-group meters belong to the By Phase tab alone; every other order shows
  // one meter over the whole catalogue. Shaped once here rather than tested at
  // each call site, so the views stay ignorant of the rule: they draw whichever
  // of `byPhase` / `byEra` / `all` they are handed, and skip what is null.
  const viewProgress = useMemo(() => {
    if (!groupProgress) return null;
    return sort === 'phase'
      ? { byPhase: groupProgress.byPhase, byEra: null, all: null }
      : { byPhase: null, byEra: null, all: groupProgress.all };
  }, [groupProgress, sort]);

  // Up next: the earliest released title not marked seen, in the order being
  // browsed (MCU_nextUp in tracking.jsx). Its scope follows the collection
  // switch (Watchlist narrows it, Seen has nothing to suggest), a pinned
  // character and the type, phase and budget filters. Search does not narrow
  // it: the card hides while typing instead of jumping about. It waits for the
  // collection to load, so a signed-in visitor never sees Iron Man flash up
  // before their own collection arrives. Its × hides it for now: plain state,
  // nothing stored, so a reload brings it back.
  const [upHidden, setUpHidden] = useState(false);
  const hideUpNext = () => setUpHidden(true);
  const upNextData = useMemo(() => {
    if (upHidden || !collectionReady) return null;
    // An open guide scopes Up next to its stops, in guide order.
    if (guide) {
      const result = window.MCU_nextUp(guideStepTitles, statusOf, { ordered: true });
      return { result, lead: tr('guide.nextStop'), detail: window.MCU_GUIDE.short(guide), scoped: true, watchScope: false, guide: true };
    }
    if (search.trim() || collectionFilter === 'seen') return null;
    let list = window.TITLES.slice();
    if (phaseFilter !== 'all') list = list.filter(t => String(t.phase) === phaseFilter);
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (budgetFilter !== 'all') list = list.filter(t => budgetMatches(t, budgetFilter));
    if (pinnedTitleIds) list = list.filter(t => pinnedTitleIds.has(t.id));
    const watchScope = collectionFilter === 'watchlist';
    if (watchScope) list = list.filter(t => statusOf(t.id) === 'watchlist');
    // Release and Phase are release order and Chrono story order, earliest
    // first whatever the list's direction. A-Z, IMDb and RT follow the list
    // itself, in its direction, so the suggestion is the first unseen title of
    // the list on screen. The card names the order it used.
    const order = sort === 'chrono' ? 'chrono' : (sort === 'title' || sort === 'imdb' || sort === 'rt') ? sort : 'release';
    const result = window.MCU_nextUp(list, statusOf, { order, dir: sortDir });
    const who = pinnedActor || (highlightedChar ? I18N.charName(highlightedChar) : null);
    const lead = watchScope ? tr('upnext.fromWatchlist') : who ? tr('upnext.forChar', { name: who }) : tr('upnext.label');
    const parts = [tr('upnext.order.' + order + (order === 'release' || order === 'chrono' ? '' : '.' + sortDir))];
    if (typeFilter !== 'all') parts.push(tr(typeFilter === 'film' ? 'type.films' : 'type.series'));
    if (phaseFilter !== 'all') parts.push(tr('phase.label', { n: phaseFilter }));
    if (budgetFilter !== 'all') parts.push(tr('budget.' + budgetFilter));
    const scoped = watchScope || !!pinnedTitleIds || phaseFilter !== 'all' || typeFilter !== 'all' || budgetFilter !== 'all';
    return { result, lead, detail: parts.join(' · '), scoped, watchScope };
  }, [collectionReady, search, collectionFilter, phaseFilter, typeFilter, budgetFilter, pinnedTitleIds, pinnedActor, highlightedChar, sort, sortDir, upHidden, collectionStates, lang, guide, guideStepTitles]);

  const layout = useMemo(() => computeLayout(filtered, sort, sortDir), [filtered, sort, sortDir, sort === 'title' ? lang : '']);
  const basePositions = layout.positions;
  // A new layout (sort, order, filters, a pinned character) makes the cards
  // glide for 600ms while the lines would be drawn at their final places at
  // once: hide the lines until the cards have landed, then fade them back in.
  // A layout effect, so the new lines never paint before they are hidden.
  const [linesSettling, setLinesSettling] = useState(false);
  const laidOutRef = useRef(false);
  useLayoutEffect(() => {
    if (!laidOutRef.current) { laidOutRef.current = true; return undefined; }
    setLinesSettling(true);
    const id = setTimeout(() => setLinesSettling(false), 520);
    return () => clearTimeout(id);
  }, [basePositions]);
  const canvasW = layout.width;
  const canvasH = layout.height;

  // Compute focus + related titles BEFORE positions, since positions reflows around focus.
  // Only the SELECTED (clicked) card triggers the rearrangement, not hover (which would flicker).
  const focusId = selectedId;
  const relatedIds = useMemo(() => {
    if (!focusId) return null;
    const focusTitle = window.TITLES.find(t => t.id === focusId);
    if (!focusTitle) return null;
    const set = new Set([focusId]);
    // Matched on the character's core identity, as the connection lines are
    // (Captain Carter joins Peggy Carter's thread), so every lit line ends in a
    // lit title.
    const focusCast = new Set(focusTitle.cast.map(primeOf));
    filtered.forEach(t => {
      if (t.id === focusId) return;
      if (t.cast.some(c => focusCast.has(primeOf(c)))) set.add(t.id);
    });
    return set;
  }, [focusId, filtered]);

  // While a title's rings are showing, only it and its connected titles stay
  // on the canvas: the rest fade out in place (in the grids they would sit
  // under the rings), and the lines are drawn among the ring's titles alone.
  const ringIds = !pair && relatedIds && relatedIds.size > 1 ? relatedIds : null;
  const lineTitles = useMemo(() => ringIds ? filtered.filter(t => ringIds.has(t.id)) : filtered, [filtered, ringIds]);

  // Hover-focus is separate: used only for dimming/labels, not reflow.
  const hoverFocusId = hoveredTitle || selectedId;
  const hoverRelatedIds = useMemo(() => {
    if (!hoverFocusId) return null;
    const ft = window.TITLES.find(t => t.id === hoverFocusId);
    if (!ft) return null;
    const set = new Set([hoverFocusId]);
    const cast = new Set(ft.cast.map(primeOf));
    filtered.forEach(t => {
      if (t.id === hoverFocusId) return;
      if (t.cast.some(c => cast.has(primeOf(c)))) set.add(t.id);
    });
    return set;
  }, [hoverFocusId, filtered]);

  // Effective positions: layout + focus reflow + per-card override
  const positions = useMemo(() => {
    const out = {};
    let focusLayout = null;
    // Pair view: the two titles side by side where they meet, with room for the
    // shared characters' labels between them; everything else stays put, dimmed.
    if (pair && basePositions[pair.a] && basePositions[pair.b]) {
      const pa = basePositions[pair.a], pb = basePositions[pair.b];
      const mx = (pa.x + pb.x) / 2 + CARD_W / 2, my = (pa.y + pb.y) / 2 + CARD_H / 2;
      const gap = PAIR_GAP;
      focusLayout = { [pair.a]: { x: mx - gap / 2 - CARD_W / 2, y: my }, [pair.b]: { x: mx + gap / 2 + CARD_W / 2, y: my } };
    } else
    if (focusId && relatedIds && relatedIds.size > 1) {
      const others = [...relatedIds].filter(id => id !== focusId);
      const focusTitle = window.TITLES.find(t => t.id === focusId);
      const focusCast = new Set(focusTitle.cast.map(primeOf));
      const scored = others.map(id => {
        const t = window.TITLES.find(x => x.id === id);
        const shared = t.cast.filter(c => focusCast.has(primeOf(c))).length;
        return { id, shared };
      }).sort((a,b) => b.shared - a.shared);
      const cx = 800, cy = 560;
      const compact = isTouch;
      const ringCaps = compact ? [5, 9, 14, 20] : [6, 10, 16, 22];
      const ringRadii = compact ? [340, 600, 860, 1120] : [480, 800, 1120, 1440];
      const placed = { [focusId]: { x: cx, y: cy } };
      let idx = 0;
      for (let ring = 0; ring < ringCaps.length && idx < scored.length; ring++) {
        const cap = Math.min(ringCaps[ring], scored.length - idx);
        const r = ringRadii[ring];
        for (let k = 0; k < cap; k++) {
          const angle = (k / cap) * Math.PI * 2 + (ring % 2) * (Math.PI / cap);
          placed[scored[idx].id] = {
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r * 0.7,
          };
          idx++;
        }
      }
      focusLayout = placed;
    }

    Object.entries(basePositions).forEach(([id, p]) => {
      const o = overrides[id];
      const f = focusLayout && focusLayout[id];
      out[id] = o ? { x: o.x, y: o.y } : (f ? { x: f.x - CARD_W/2, y: f.y - CARD_H/2 } : p);
    });
    return out;
  }, [basePositions, overrides, focusId, relatedIds, isTouch, pair]);

  // Reset overrides when sort/filter changes the layout
  useEffect(() => { setOverrides({}); }, [sort, sortDir, phaseFilter, typeFilter, budgetFilter, releaseFilter, search]);

  const selectedTitle = selectedId ? window.TITLES.find(t => t.id === selectedId) : null;
  const drawerTitle = drawerId ? window.TITLES.find(t => t.id === drawerId) : null;
  const ordered = useMemo(() => sortTitles(filtered, sort, sortDir), [filtered, sort, sortDir, sort === 'title' ? lang : '']);

  // Real filtering, but only for the flat mobile grid/list — they have no layout
  // or viewport to disturb. Derived from `ordered` so the canvas keeps every card.
  const visible = useMemo(() => {
    if (collectionFilter === 'all') return ordered;
    return ordered.filter(t => window.matchesCollection(collectionStates[t.id] || 'none', collectionFilter));
  }, [ordered, collectionFilter, collectionStates]);

  // Only speak in collection terms when the collection filter is what emptied
  // the list — otherwise the generic "clear a filter or the search box" is right.
  const emptyCopy = (ordered.length > 0 && visible.length === 0)
    ? window.collectionEmptyCopy(collectionFilter)
    : null;

  // Keyed by prime identity: the threading, a title's connection count, and the
  // titles a hovered or pinned character lights all go by the identity, so
  // every lit line ends in a lit card (Andre, 2026-11-01, replacing the
  // 2026-10-28 rule that a character meant that one portrayal).
  const primeToTitleIds = useMemo(() => {
    const m = {};
    filtered.forEach(t => t.cast.forEach(c => {
      const p = primeOf(c);
      if (!m[p]) m[p] = new Set();
      m[p].add(t.id);
    }));
    return m;
  }, [filtered]);

  // The visible titles a character lights: its whole identity thread.
  const charTitleIds = (c) => (c && primeToTitleIds[primeOf(c)]) || null;

  const activeChar = highlightedChar || hoveredCharacter;
  // Every character the highlight covers, so a performer's whole cast list and
  // all their connection threads light up, not just the representative one.
  const activeChars = useMemo(() => {
    if (highlightedChar) return pinnedChars;
    return hoveredCharacter ? [hoveredCharacter] : null;
  }, [highlightedChar, pinnedChars, hoveredCharacter]);
  // One portrayal reuses its own set; a performer needs the union, memoised so
  // the canvas is not handed a fresh Set on every render.
  const pinnedVisibleIds = useMemo(() => {
    if (!pinnedTitleIds) return null;
    const s = new Set();
    filtered.forEach(t => { if (pinnedTitleIds.has(t.id)) s.add(t.id); });
    return s;
  }, [pinnedTitleIds, filtered]);
  const highlightedIds = (guide ? guideIds : null)
    || (highlightedChar ? pinnedVisibleIds : null)
    || charTitleIds(activeChar);

  // The ids the active canvas filters single out. Collection status and a pinned
  // character are both *dimming* treatments — the cards stay in the layout — so
  // without this, Recenter frames the whole graph including everything dimmed,
  // and a handful of matches sitting far apart on a timeline layout can end up
  // entirely off-screen. Only the pinned character counts, not the hovered one,
  // so passing the cursor over the cast list can't move the viewport.
  const pinnedCharIds = useMemo(() => {
    if (!highlightedChar) return null;
    return pinnedVisibleIds || charTitleIds(highlightedChar);
  }, [highlightedChar, pinnedVisibleIds, primeToTitleIds]);

  const recenterFocusIds = useMemo(() => {
    const sets = [];
    if (collectionFilter !== 'all' && !guide) {
      const s = new Set();
      filtered.forEach(t => {
        if (window.matchesCollection(collectionStates[t.id] || 'none', collectionFilter)) s.add(t.id);
      });
      sets.push(s);
    }
    if (pinnedCharIds) sets.push(pinnedCharIds);
    if (guideIds) sets.push(guideIds);
    if (!sets.length) return null;
    const both = sets.reduce((a, b) => new Set([...a].filter(id => b.has(id))));
    return both.size ? both : null;
  }, [filtered, collectionFilter, collectionStates, pinnedCharIds, guideIds, guide]);

  // Read through a ref inside resetView rather than as a dependency. If the
  // match set were a dependency, marking a title seen while "Unseen" is active
  // would change resetView's identity, fire the layout effect and recenter the
  // canvas mid-click — the exact failure §7.1 exists to prevent.
  const recenterFocusRef = useRef(null);
  recenterFocusRef.current = recenterFocusIds;
  // Phones frame an open guide on its next stop (or its first, once complete)
  // rather than the whole route. Read through a ref for the same reason.
  const guideFrameRef = useRef(null);
  guideFrameRef.current = guide && isTouch
    ? ((window.MCU_GUIDE.next(guide, guideOptional, statusOf) || {}).id || (guideStepTitles[0] && guideStepTitles[0].id) || null)
    : null;

  // Phones open each order on the Up next title once something is Seen. Set
  // further down, where Up next is worked out; read through a ref so marking a
  // title seen (which moves Up next on) never recenters the canvas (§7.1).
  const upNextFrameRef = useRef(null);
  // Desktop with a guide open: its module floats over the top of the canvas.
  const deskGuideRef = useRef(false);
  // The last view resetView framed, so the collection arriving can reframe a
  // camera nobody has moved yet.
  const lastResetViewRef = useRef(null);

  // Also read through a ref, and for the same reason: resetView must not gain a
  // selectedId dependency or selecting a card would recenter the canvas. While
  // a card is selected the canvas shows the focus ring layout, whose positions
  // are not basePositions — so framing a match set then would aim the viewport
  // at coordinates the cards are no longer at.
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  // Card drag handler
  const onCardDragStart = (e, id) => {
    e.stopPropagation();
    const start = positions[id] || { x: 0, y: 0 };
    dragRef.current = {
      id,
      sx: e.clientX,
      sy: e.clientY,
      ox: start.x,
      oy: start.y,
      moved: false,
      scale: view.scale,
    };
    setDraggingId(id);
  };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.sx) / d.scale;
      const dy = (e.clientY - d.sy) / d.scale;
      if (!d.moved && Math.hypot(dx, dy) < 3) return;
      d.moved = true;
      setOverrides(prev => ({ ...prev, [d.id]: { x: d.ox + dx, y: d.oy + dy } }));
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDraggingId(null);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);
  useEffect(() => {
    const onMove = (e) => {
      if (!panRef.current.panning) return;
      const dx = e.clientX - panRef.current.sx;
      const dy = e.clientY - panRef.current.sy;
      sampleFlick(e.clientX, e.clientY);
      setView(v => ({ ...v, x: panRef.current.ox + dx, y: panRef.current.oy + dy }));
    };
    const onUp = () => {
      if (!panRef.current.panning) return;
      panRef.current.panning = false;
      startInertia();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Pan handlers
  const onMouseDown = (e) => {
    if (afterTouch()) return;
    if (e.target.closest('.card') || e.target.closest('.toolbar') || e.target.closest('.drawer')) return;
    armFlick(e.clientX, e.clientY);
    panRef.current = { panning: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = viewportRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    setView(v => {
      const newScale = Math.min(2, Math.max(ZOOM_MIN, v.scale * (1 + delta)));
      const ratio = newScale / v.scale;
      // zoom toward cursor
      const nx = mx - (mx - v.x) * ratio;
      const ny = my - (my - v.y) * ratio;
      return { x: nx, y: ny, scale: newScale };
    });
  };

  // Zoom about the viewport centre (button + typed-value controls)
  // Phones: the zoom control stays out of the way and shows only while the
  // person zooms (pinch, double-tap or its own buttons), fading out 1.5s after.
  const [zoomPeek, setZoomPeek] = useState(false);
  const zoomPeekTimer = useRef(null);
  const peekZoom = useCallback(() => {
    setZoomPeek(true);
    clearTimeout(zoomPeekTimer.current);
    zoomPeekTimer.current = setTimeout(() => setZoomPeek(false), 1500);
  }, []);
  useEffect(() => () => clearTimeout(zoomPeekTimer.current), []);
  const applyScale = useCallback((next) => {
    const rect = viewportRef.current && viewportRef.current.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 0, cy = rect ? rect.height / 2 : 0;
    setView(v => {
      const ns = Math.min(2, Math.max(ZOOM_MIN, typeof next === 'function' ? next(v.scale) : next));
      const ratio = ns / v.scale;
      return { x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio, scale: ns };
    });
  }, []);
  const commitZoomEdit = useCallback(() => {
    setZoomEdit(cur => {
      const n = parseFloat(String(cur).replace('%', ''));
      if (!isNaN(n)) applyScale(n / 100);
      return null;
    });
  }, [applyScale]);

  const resetView = useCallback(() => {
    // Every framing goes through here, so a later reframe can tell whether
    // the visitor has moved the camera since.
    const frame = (v) => { lastResetViewRef.current = v; setView(v); };
    if (!viewportRef.current) return;
    // A layout change or Recenter supersedes any remembered pre-selection view.
    selectionReturnRef.current = null;
    cameraFramedRef.current = true;
    const rect = viewportRef.current.getBoundingClientRect();
    const colW = CARD_W + 60;
    const gridSort = sort === 'phase' || sort === 'title' || sort === 'imdb' || sort === 'rt';
    // Height of the floating chrome at the top of the viewport that content has
    // to clear. Desktop: the count pill (the whole-catalogue meter sits in the
    // top-right corner there, out of the way). Phone: the count pill and zoom
    // control share the first row, so the meter takes a row of its own beneath
    // them in every order but By Phase.
    const chromeTop = isTouch ? (sort === 'phase' ? 44 : 113) : 52;

    // The scale this sort opens at with no filter applied. Used as the yardstick
    // below: framing a match set is only an improvement if it doesn't mean
    // zooming out past the view you'd have had anyway.
    const defaultScale = gridSort
      ? Math.min(1, isTouch
          ? Math.max((rect.width - 32) / canvasW, rect.width / (colW * 3))
          : (rect.width - 32) / canvasW)
      // Timeline layouts open at about 7.5 titles across on desktop and 2.5 on
      // touch (one title step is CARD_W * 1.15), capped at 100%.
      : isTouch ? phoneReadScale(rect.width) : Math.max(ZOOM_MIN, deskReadScale(rect.width));

    // Phones, a guide open: its next stop, centred at the readable zoom this
    // layout opens at, between the top chrome and the guide pill. The route
    // line leads on to the other stops.
    const guideStop = isTouch && !selectedIdRef.current ? guideFrameRef.current : null;
    const gp = guideStop && basePositions[guideStop];
    if (gp) {
      // In a guide the phone canvas has no top chrome (the count, meter and
      // zoom control step aside); the dock covers the bottom. At least 85%, so
      // the stop reads comfortably in every order (the grid orders open at
      // about 50% otherwise), with its neighbours peeking in at the sides.
      const scale = Math.max(defaultScale, 0.85);
      const top = 12, bottomChrome = 130;
      frame({
        x: rect.width / 2 - (gp.x + CARD_W / 2) * scale,
        y: top + (rect.height - top - bottomChrome) / 2 - (gp.y + CARD_H / 2) * scale,
        scale,
      });
      return;
    }

    // Phones, once you've started (at least one title Seen): each order opens
    // on your Up next title, centred between the top chrome and the Up next
    // bar at the phone's reading zoom (the same in every order), its
    // neighbours peeking in. A dimming filter
    // frames its matches instead (below), and first-time visitors and anyone
    // caught up keep the bird's-eye view of the order's start.
    const upStop = isTouch && !selectedIdRef.current && !(recenterFocusRef.current && recenterFocusRef.current.size)
      ? upNextFrameRef.current : null;
    const up = upStop && basePositions[upStop];
    if (up) {
      const scale = phoneReadScale(rect.width);
      const chip = viewportRef.current.parentNode && viewportRef.current.parentNode.querySelector('.un-chip');
      const cr = chip && chip.getBoundingClientRect();
      const bottom = cr && cr.height ? cr.top - rect.top - 8 : rect.height - 14;
      const top = chromeTop;
      const v = {
        x: rect.width / 2 - (up.x + CARD_W / 2) * scale,
        y: top + (bottom - top) / 2 - (up.y + CARD_H / 2) * scale,
        scale,
      };
      frame(v);
      return;
    }

    // A dimming filter is active: frame exactly what it matches. Card positions
    // are not touched — only the viewport moves — so this stays inside the rule
    // that the collection filter must never reflow the graph.
    const focus = recenterFocusRef.current;
    if (focus && focus.size && !selectedIdRef.current) {
      let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity;
      focus.forEach(id => {
        const p = basePositions[id];
        if (!p) return;
        if (p.x < fx0) fx0 = p.x;
        if (p.y < fy0) fy0 = p.y;
        if (p.x + CARD_W > fx1) fx1 = p.x + CARD_W;
        if (p.y + CARD_H > fy1) fy1 = p.y + CARD_H;
      });
      if (isFinite(fx0)) {
        const pad = isTouch ? 28 : 70;
        // A desktop guide's module floats over the top of the canvas (about
        // 70px with its margin): frame the stops below it.
        const topIn = deskGuideRef.current ? 72 : 0;
        const w = fx1 - fx0, h = fy1 - fy0;
        // Always fit the whole match set, however far apart it is. On the
        // release and chronological layouts two matches at opposite ends only
        // fit at around 9%, which is small — but seeing where everything is and
        // zooming in beats being shown a subset with no clue the rest exists.
        // ZOOM_MIN is the only floor.
        const scale = Math.min(1, Math.max(ZOOM_MIN, Math.min(
          (rect.width - pad * 2) / w,
          (rect.height - topIn - pad * 2) / h
        )));
        frame({
          x: rect.width / 2 - (fx0 + w / 2) * scale,
          y: topIn + (rect.height - topIn) / 2 - (fy0 + h / 2) * scale,
          scale,
        });
        return;
      }
    }

    // Left/top-most card in canvas coords, so we can pad from the real content edge
    let minX = Infinity, minY = Infinity;
    Object.values(basePositions).forEach(p => { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; });
    if (!isFinite(minX)) { minX = 0; minY = 0; }
    // Aim for a legible card size rather than fitting the whole canvas.
    if (gridSort && isTouch && canvasW * defaultScale > rect.width - 32) {
      // Phones: a grid that fits three columns exactly looks complete, so pick a
      // zoom and top offset where the next column and row visibly peek past the
      // right and bottom edges, signalling that the canvas pans. Three whole
      // columns stay on screen. The top offset also clears the count pill.
      const xs = [], ys = [];
      Object.values(basePositions).forEach(p => { if (!xs.includes(p.x)) xs.push(p.x); if (!ys.includes(p.y)) ys.push(p.y); });
      xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
      const bottom = rect.height;
      // How much of the first card cut by an edge shows, as a share of the card
      // (0 when the edge falls in a gap, so nothing peeks).
      const peek = (starts, size, origin, s, edge) => {
        for (const v of starts) {
          const a = origin + (v - starts[0]) * s, b = a + size * s;
          if (b > edge) return Math.max(0, (edge - a) / (size * s));
        }
        return null; // everything fits: nothing needs to peek
      };
      const miss = (f, lo, hi) => f === null ? 0 : f < lo ? lo - f : f > hi ? f - hi : 0;
      // By Phase also has a band pill above its first row to keep on screen.
      const pill = chromeTop + (sort === 'phase' ? BAND_LABEL_H * defaultScale : 0);
      let best = null;
      for (let s = Math.min(1, defaultScale); s >= defaultScale * 0.8; s -= 0.0025) {
        if (xs.length > 3 && 14 + (xs[2] - xs[0]) * s + CARD_W * s > rect.width) continue;
        const ph = peek(xs, CARD_W, 14, s, rect.width);
        for (let top = pill + 6; top <= pill + 70; top += 2) {
          const pv = peek(ys, CARD_H, top, s, bottom);
          const score = miss(ph, 0.22, 0.6) * 4 + miss(pv, 0.25, 0.6) * 4
            + (1 - s / defaultScale) + (top - pill) / 400;
          if (!best || score < best.score) best = { score, s, top };
        }
      }
      const scale = best ? best.s : defaultScale;
      frame({ x: 14 - xs[0] * scale, y: (best ? best.top : 14) - ys[0] * scale, scale });
    } else if (gridSort) {
      // Grid layouts: match the grid's width (mobile keeps a legibility floor of ~3 columns)
      const scale = defaultScale;
      const zoomed = canvasW * scale > rect.width - 32;
      // By Phase is the one grid layout with band labels: leave room above the
      // first row for its pill, below the count pill, as the timelines do.
      const top = sort === 'phase' ? chromeTop + BAND_LABEL_H * scale : 14;
      frame({
        x: zoomed ? 14 - minX * scale : (rect.width - canvasW * scale) / 2,
        y: canvasH * scale <= rect.height - 32 ? (rect.height - canvasH * scale) / 2 : top - minY * scale,
        scale,
      });
    } else {
      // Timeline layouts step down one phase band at a time as they move right,
      // so anchoring the top-left corner left most of the screen empty. Centre
      // vertically on the titles actually in view horizontally instead; if they
      // are taller than the viewport, top-align them but keep the leading title
      // (which may sit in a lower band in reverse order) on screen.
      const scale = defaultScale;
      const left = minX - 14 / scale, right = left + rect.width / scale;
      let y0 = Infinity, y1 = -Infinity, leading = null;
      Object.values(basePositions).forEach(p => {
        if (!leading || p.x < leading.x) leading = p;
        if (p.x + CARD_W < left || p.x > right) return;
        if (p.y < y0) y0 = p.y;
        if (p.y + CARD_H > y1) y1 = p.y + CARD_H;
      });
      // Each row has its label BAND_LABEL_H units above it, and the count pill
      // sits at the top-left of the viewport: keep the first label clear of it.
      const pill = chromeTop;
      const top = pill + BAND_LABEL_H * scale;
      let y = top - minY * scale;
      if (isFinite(y0)) {
        const yTop = y0 - BAND_LABEL_H;
        if ((y1 - yTop) * scale <= rect.height - 28 - pill) {
          y = Math.max(rect.height / 2 - ((yTop + y1) / 2) * scale, pill - yTop * scale);
        } else {
          y = top - y0 * scale;
          if (leading && (leading.y + CARD_H) * scale + y > rect.height - 14) y = rect.height - 14 - (leading.y + CARD_H) * scale;
        }
      }
      frame({ x: 14 - minX * scale, y, scale });
    }
  }, [canvasW, canvasH, basePositions, sort, isTouch]);

  // Reset view whenever layout changes
  useLayoutEffect(() => { if (!pendingStepRef.current) resetView(); }, [resetView]);

  // Recentering because the user changed a filter is intentional. Recentering
  // because the *contents* of the match set changed — someone marked a title
  // seen — is the bug §7.1 describes, so this keys off the filter identity
  // only and never off the matched ids.
  const prevFocusKey = useRef(null);
  useEffect(() => {
    const key = `${collectionFilter}|${highlightedChar || ''}`;
    if (prevFocusKey.current === null) { prevFocusKey.current = key; return; }
    if (prevFocusKey.current === key) return;
    prevFocusKey.current = key;
    // A selected card owns the viewport — the ring-layout auto-fit below is
    // driving it, and stepping on that would fight it mid-animation.
    if (selectedIdRef.current || pendingStepRef.current) return;
    resetView();
  }, [collectionFilter, highlightedChar, resetView]);

  // Entering Spatial (from List or Grid on touch, from List on desktop) mounts a
  // fresh canvas whose camera was never framed (it would open at 100% on the
  // top-left corner). Frame it, unless a card is already selected (opened from a
  // detail sheet or the List's drawer): the focus-ring auto-fit owns it then.
  const spatialShown = isTouch ? viewMode === 'spatial' : desktopView === 'spatial';
  // True once the canvas has shown its cards: from then on a card that mounts
  // is one a filter brought back, and it fades in. Reset while the canvas is
  // hidden, so opening Spatial again shows every card at once.
  const cardsShownRef = useRef(false);
  useEffect(() => { cardsShownRef.current = spatialShown; }, [spatialShown]);

  // The desktop details drawer opens below the toolbar (its height changes with
  // the width and language), so the view switch, language and account stay
  // usable while a title is open.
  useLayoutEffect(() => {
    if (isTouch) return;
    const bar = document.querySelector('.toolbar');
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--tb-h', bar.offsetHeight + 'px');
    set();
    if (!window.ResizeObserver) return;
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [isTouch]);
  useLayoutEffect(() => {
    if (!spatialShown) { cameraFramedRef.current = false; return; }
    if (!selectedIdRef.current && !pendingStepRef.current) resetView();
  }, [spatialShown]);

  // Remember the camera when a card becomes selected; when the selection clears,
  // glide back so the visitor returns to where they were (e.g. Phase 6) rather
  // than the focus ring's spot near Phase 1. If they moved on to another card
  // through the ring, centre that card's layout position at the original zoom.
  // An unframed camera (selection opened straight into Spatial) gets a normal
  // reset instead.
  const prevSelectedRef = useRef(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedId;
    if (selectedId && !prev) {
      // Whether the card was picked on the canvas itself (onCardTap), as
      // opposed to Up next, search, a guide stop or the address.
      const fromCanvas = canvasPickRef.current === selectedId;
      canvasPickRef.current = null;
      selectionReturnRef.current = { view: cameraFramedRef.current ? viewRef.current : null, id: selectedId, fromCanvas };
      return;
    }
    if (selectedId || !prev) return;
    const back = selectionReturnRef.current;
    selectionReturnRef.current = null;
    // Cleared by a reset (Back to home, a sort or layout change): no return.
    if (!back || !viewportRef.current) return;
    const p = basePositions[prev];
    const rect = viewportRef.current.getBoundingClientRect();
    const centreOn = (scale) => glideTo({
      x: rect.width / 2 - (p.x + CARD_W / 2) * scale,
      y: rect.height / 2 - (p.y + CARD_H / 2) * scale,
      scale,
    });
    // A pinned character or an open guide keeps its stepper's behaviour.
    if (highlightedChar || guide) {
      if (!back.view) { resetView(); return; }
      if (prev === back.id || !p) { glideTo(back.view); return; }
      centreOn(back.view.scale);
      return;
    }
    if (!p) { if (back.view) glideTo(back.view); else resetView(); return; }
    // The view lands on the title whose details just closed (V3 Tasks,
    // "Refocus view…"): a card clicked on the canvas is still in view from
    // where the camera was, so that return trip stays as it was; a title
    // opened from elsewhere (Up next, search, a guide stop, Part of, the
    // address) is centred instead, at a readable zoom (the stepper's floor).
    const v = back.view;
    // Only a card picked on the canvas returns the camera exactly: one opened
    // from Up next is centred even when it happened to be on screen already.
    const fits = v && prev === back.id && back.fromCanvas && (() => {
      const left = p.x * v.scale + v.x, top = p.y * v.scale + v.y;
      return left >= 8 && top >= 8 && left + CARD_W * v.scale <= rect.width - 8 && top + CARD_H * v.scale <= rect.height - 8;
    })();
    if (fits) glideTo(v);
    else centreOn(isTouch ? phoneReadScale(rect.width) : Math.max(v ? v.scale : 0, deskReadScale(rect.width)));
    refocusAfterKeyboard(`.card[data-id="${prev}"] button`);
  }, [selectedId]);

  // After the details close, keyboard users get focus back on the title itself
  // (its card's or row's first button) rather than wherever they opened it.
  const refocusAfterKeyboard = (selector) => {
    if (lastInput !== 'keyboard') return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector(selector);
      if (el) el.focus({ preventScroll: true });
    }));
  };

  // The List, phone List and Grid: when a title's details close, its row
  // scrolls into view (below the pinned headers) and flashes briefly. A pinned
  // character or a guide keep their own stepping; Back to home goes to the top.
  // On phones, the Up next title has no row (nothing scrolls) and a title in a
  // folded run of seen titles brings the fold into view, still folded.
  const prevDrawerRef = useRef(null);
  useEffect(() => {
    const prev = prevDrawerRef.current;
    prevDrawerRef.current = drawerId;
    if (!prev || drawerId || spatialShown || highlightedChar || guide || homePendingRef.current) return;
    requestAnimationFrame(() => {
      let row = [...document.querySelectorAll(`[data-row-id="${prev}"]`)].find(el => !el.classList.contains('un-inline'));
      if (!row) return;
      // Folded away: the nearest fold header above the row stands in for it.
      const fold = row.closest('.m-fx.shut');
      const heads = fold ? [...document.querySelectorAll('.m-run.shut')].filter(h => h.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING) : [];
      const target = fold ? heads[heads.length - 1] : row;
      if (!target) return;
      target.scrollIntoView({ block: 'nearest', behavior: stepReducedMotion() ? 'auto' : 'smooth' });
      if (!fold && !stepReducedMotion()) {
        row.classList.remove('refocus-flash');
        void row.offsetWidth;
        row.classList.add('refocus-flash');
        setTimeout(() => row.classList.remove('refocus-flash'), 1200);
      }
      if (!fold) refocusAfterKeyboard(`[data-row-id="${prev}"] .dl-open, [data-row-id="${prev}"] .m-lrow-open, [data-row-id="${prev}"] .m-card-open, [data-row-id="${prev}"] button`);
    });
  }, [drawerId]);

  // Auto-fit view to focused layout when a card is selected
  useEffect(() => {
    if (!selectedId || !viewportRef.current || !relatedIds) return;
    const p0 = positions[selectedId];
    if (isTouch) {
      // Centre on the focused card at a scale that keeps the first ring reachable
      if (!p0) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const scale = Math.max(0.26, Math.min(0.62, rect.width / 920));
      setView({
        x: rect.width / 2 - (p0.x + CARD_W/2) * scale,
        y: rect.height / 2 - (p0.y + CARD_H/2) * scale,
        scale,
      });
      return;
    }
    const ids = [...relatedIds];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(id => {
      const p = positions[id];
      if (!p) return;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + CARD_W > maxX) maxX = p.x + CARD_W;
      if (p.y + CARD_H > maxY) maxY = p.y + CARD_H;
    });
    if (!isFinite(minX)) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const drawerOffset = 380;
    // An open guide's module floats over the top: fit the ring below it.
    const topIn = deskGuideRef.current ? 72 : 0;
    const availW = rect.width - drawerOffset - 80;
    const availH = rect.height - topIn - 80;
    const w = maxX - minX, h = maxY - minY;
    const scale = Math.min(availW / w, availH / h, 1.1);
    setView({
      x: (rect.width - drawerOffset) / 2 - (minX + w/2) * scale,
      y: topIn + (rect.height - topIn) / 2 - (minY + h/2) * scale,
      scale,
    });
  }, [selectedId, relatedIds, isTouch]);

  // Touch gestures for the spatial canvas: pan, pinch, double-tap zoom, tap-background clear
  const touchRef = useRef(null);
  const lastTapRef = useRef(null);
  const onTouchStart = (e) => {
    touchActiveRef.current = Date.now();
    if (e.target instanceof Element && e.target.closest('.zoom-ctl')) { touchRef.current = null; return; }
    if (e.touches.length === 2) {
      const a = e.touches[0], b = e.touches[1];
      const rect = viewportRef.current.getBoundingClientRect();
      touchRef.current = {
        mode: 'pinch',
        d: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1,
        scale: view.scale, vx: view.x, vy: view.y,
        mx: (a.clientX + b.clientX) / 2 - rect.left,
        my: (a.clientY + b.clientY) / 2 - rect.top,
      };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const el = e.target instanceof Element ? e.target : null;
      armFlick(t.clientX, t.clientY);
      touchRef.current = {
        mode: 'pan', sx: t.clientX, sy: t.clientY, vx: view.x, vy: view.y, moved: false,
        onCard: !!(el && el.closest('.card, .m-focuspop')),
      };
    }
  };
  const onTouchMove = (e) => {
    const s = touchRef.current;
    if (!s) return;
    if (s.mode === 'pinch' && e.touches.length === 2) {
      const a = e.touches[0], b = e.touches[1];
      const d = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1;
      const ns = Math.min(2, Math.max(ZOOM_MIN, s.scale * (d / s.d)));
      const ratio = ns / s.scale;
      setView({ x: s.mx - (s.mx - s.vx) * ratio, y: s.my - (s.my - s.vy) * ratio, scale: ns });
      peekZoom();
    } else if (s.mode === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - s.sx, dy = t.clientY - s.sy;
      if (!s.moved && Math.hypot(dx, dy) < 6) return;
      s.moved = true;
      sampleFlick(t.clientX, t.clientY);
      setView(v => ({ ...v, x: s.vx + dx, y: s.vy + dy }));
    }
  };
  const onTouchEnd = (e) => {
    touchActiveRef.current = Date.now();
    const s = touchRef.current;
    touchRef.current = null;
    // A finger that was moving throws the canvas; a tap falls through to the
    // tap and double-tap handling below.
    if (s && s.mode === 'pan' && s.moved) { startInertia(); return; }
    if (!s || s.mode !== 'pan' || s.moved) return;
    const now = Date.now();
    const last = lastTapRef.current;
    const isDouble = last && now - last.t < 300 && Math.hypot(s.sx - last.x, s.sy - last.y) < 34;
    lastTapRef.current = { t: now, x: s.sx, y: s.sy };
    if (s.onCard) return;
    if (isDouble) {
      peekZoom();
      const rect = viewportRef.current.getBoundingClientRect();
      const mx = s.sx - rect.left, my = s.sy - rect.top;
      setView(v => {
        const ns = Math.min(2, v.scale * 1.7);
        const r = ns / v.scale;
        return { x: mx - (mx - v.x) * r, y: my - (my - v.y) * r, scale: ns };
      });
    } else {
      // Closing a title's rings brings the hidden cards straight back; the
      // click the browser synthesizes after this tap would then land on
      // whichever card is under the finger, so cancel it.
      if (selectedIdRef.current && e && e.cancelable) e.preventDefault();
      setSelectedId(null);
      setPair(null);
    }
  };

  // Desktop Settings takes the details drawer's place, so a title opened while
  // it is up would load behind it (Notion V4 Tasks, "Close Settings when a
  // title is opened"). Clicking a title closes Settings and shows that
  // title's details, even the one already open behind it (which a second
  // click would otherwise close).
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const toggleDetails = (id) => {
    if (settingsOpen) { setSettingsOpen(false); setDrawerId(id); return; }
    setDrawerId(drawerId === id ? null : id);
  };
  // Every other way in (search, Up next, the stepper, a guide's stops): a new
  // title in the drawer closes Settings.
  const lastDrawerRef = useRef(drawerId);
  useEffect(() => {
    if (drawerId && drawerId !== lastDrawerRef.current && settingsOpenRef.current) setSettingsOpen(false);
    lastDrawerRef.current = drawerId;
  }, [drawerId]);

  const onCardTap = (id) => {
    setPair(null);
    canvasPickRef.current = id;
    if (settingsOpen && !isTouch) {
      setSettingsOpen(false);
      if (drawerId === id) return;
    }
    // With a character pinned the canvas keeps their layout: a tap makes the
    // title current (if it is theirs) and opens its details, without the
    // connections ring.
    if (highlightedChar) {
      if (pinnedCharIds && pinnedCharIds.has(id)) setStepId(id);
      setDrawerId(!isTouch && drawerId === id ? null : id);
      return;
    }
    if (!isTouch) {
      const next = selectedId === id ? null : id;
      setSelectedId(next);
      setDrawerId(next);
      return;
    }
    if (viewMode === 'spatial') {
      if (selectedId === id) setDrawerId(id);
      else setSelectedId(id);
    } else {
      setDrawerId(id);
    }
  };

  // Collection has its own switch in the header, so the Filters badge skips it.
  // Grid and List animate when any of these change: sort, order, collection,
  // phase, films/series and budget. Search is left out so typing stays calm.
  const flipKey = [sort, sortDir, collectionFilter, phaseFilter, typeFilter, budgetFilter, releaseFilter].join(':');
  const filterCount = (phaseFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (budgetFilter !== 'all' ? 1 : 0) + (releaseFilter !== 'all' ? 1 : 0);
  // Spatial keeps every card on screen (dimmed), so it counts `filtered`; the
  // flat views actually drop non-matching rows and count what they render.
  // Switching to Spatial with a title open in the drawer selects that card, so
  // the canvas opens on its connections; switching to List keeps the drawer.
  // A title picked from the search suggestions opens its details (and, in
  // desktop Spatial, selects its card so the canvas shows its connections).
  const pickTitle = (id) => {
    // Picking a title is navigating to it, so a pinned character steps aside:
    // its narrowed canvas would otherwise hide the very title just picked. Pin
    // Tommy Shepherd, who is in one title, then pick Endgame, and Endgame was
    // not on the canvas at all while its details filled the panel.
    // Only the pin goes — the phase, type and collection filters stay.
    if (highlightedChar) unpinCharacter();
    setDrawerId(id);
    if (!isTouch && desktopView === 'spatial') setSelectedId(id);
  };
  // Opening the suggestion: its details, and in Spatial its card too, so the
  // camera glides to it. A pinned character stays pinned (the suggestion is
  // one of their titles) and the stepper moves to it.
  const openUpNext = (id) => {
    setPair(null);
    canvasPickRef.current = null;
    if (highlightedChar) {
      if (pinnedCharIds && pinnedCharIds.has(id)) setStepId(id);
      setDrawerId(id);
      return;
    }
    setDrawerId(id);
    if (isTouch ? viewMode === 'spatial' : desktopView === 'spatial') setSelectedId(id);
  };
  const upNext = upNextData && {
    ...upNextData,
    onOpen: openUpNext,
    onHide: hideUpNext,
    onShowAll: () => setCollectionFilter('all'),
  };
  // Announce a new suggestion politely once the previous one was marked seen
  // (the toast already announces the mark itself).
  const upNextId = upNext && upNext.result.kind === 'next' ? upNext.result.title.id : null;
  deskGuideRef.current = !isTouch && !!guide;
  upNextFrameRef.current = isTouch && !guide && upNextId
    && Object.values(collectionStates).some(s => s === 'seen') ? upNextId : null;
  const [upAnnounce, setUpAnnounce] = useState('');
  const upPrevRef = useRef(null);
  useEffect(() => {
    const prev = upPrevRef.current;
    upPrevRef.current = upNextId;
    if (!prev || !upNextId || prev === upNextId) return;
    if (statusOf(prev) === 'seen') {
      setUpAnnounce(tr('upnext.announce', { title: I18N.titleName(upNext.result.title) }));
    }
  }, [upNextId]);
  const upAnnouncer = <div className="story-sr" aria-live="polite">{upAnnounce}</div>;
  // Desktop Spatial shows it as a row in the floating meter, which (like the
  // meter) stands down while a title is selected.
  const upNextInMeter = !isTouch && !guide && !!upNext && upNext.result.kind === 'next';

  // A character picked from the search suggestions opens the character view
  // (photo, Their titles / All titles, stepper) rather than a text search, as
  // if pinned from a cast list. A character pins that one portrayal; an actor
  // pins every character they play, which for all but four of them is one.
  const pickPerson = (item, how = {}) => {
    const chars = item.kind === 'character' ? [item.id]
      : item.kind === 'actor' ? (charsByActor[item.label] || [])
      : [];
    // Checked against the whole catalog: another character may be pinned (so
    // the current titles are theirs) when this one is picked.
    if (!chars.length || !window.TITLES.some(t => chars.some(c => t.cast.includes(c)))) return false;
    setSearch('');
    // Both an actor row and a character row naming one performer go through
    // pinActor, which keeps a recast character's run whole and starts on that
    // performer's first title.
    if (item.kind === 'actor') pinActor(item.label);
    else if (item.actor) pinActor(item.actor);
    else if (pinnedActor || highlightedChar !== chars[0]) pinCharacter(chars[0]);
    // The search box lets go of focus; after a keyboard pick on desktop, hand
    // it to the stepper so keyboard users can carry on through the titles.
    if (!isTouch && how.viaKeyboard) requestAnimationFrame(() => requestAnimationFrame(() => {
      const next = document.querySelector('.char-banner.pinned .cb-step button:last-child');
      if (next) next.focus();
    }));
    return true;
  };
  const changeDesktopView = (v) => {
    if (v === desktopView) return;
    setSelectedId(v === 'spatial' && !highlightedChar ? drawerId : null);
    setDesktopView(v);
  };
  // `showing` is overridable because the Spatial canvas counts what is actually
  // on it: selecting a card fades every unconnected title out, so the pill has
  // to follow the ring rather than keep reporting the whole filtered set.
  const contextSummary = (variant, inList, showing) => (
    <ContextSummary variant={variant} inList={inList}
      showing={showing == null ? visible.length : showing} total={window.TITLES.length}
      filters={{ search, setSearch, collectionFilter, setCollectionFilter, typeFilter, setTypeFilter,
        phaseFilter, setPhaseFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter }}/>
  );
  const mobileShowing = viewMode === 'spatial' ? filtered.length : visible.length;

  // Character highlight. Pinning a character (from the details cast list) shows
  // their photo, a Their titles / All titles switch and a stepper that visits
  // each of their titles in the current order. Hovering a cast row previews the
  // same banner without the controls.
  const pinnedTitles = useMemo(() => {
    if (!pinnedCharIds) return [];
    return (spatialShown ? ordered : visible).filter(t => pinnedCharIds.has(t.id));
  }, [pinnedCharIds, ordered, visible, spatialShown]);
  // Pinning a character switches the canvas to their titles in the current
  // order (the connections ring belongs to a selected title) and starts the
  // stepper on the title it was pinned from. Phones close the sheet so the
  // change is visible.
  const pinSubject = (chars, actor, startAt) => {
    const from = startAt || drawerId;
    const covers = from && chars.some(c => { const ids = charTitleIds(c); return ids && ids.has(from); });
    const start = covers ? from : null;
    setGuideId(null);
    setPinnedActor(actor);
    setHighlightedChar(chars[0]);
    setHoveredCharacter(null);
    setStepId(start);
    if (selectedIdRef.current) { selectionReturnRef.current = null; setSelectedId(null); }
    pendingStepRef.current = start || '*';
    if (isTouch) setDrawerId(null);
  };
  const pinCharacter = (ch) => {
    if (!pinnedActor && highlightedChar === ch) { unpinCharacter(); return; }
    pinSubject([ch], null);
  };
  // A performer of ONE character pins that character, whole run and all, and
  // just starts on their first title. A recast is the same person — Rhodes is
  // Rhodes whether Terrence Howard or Don Cheadle is playing him — so breaking
  // his ten titles into a one and a nine breaks the chain the stepper exists to
  // walk. The banner names the credited performer per title, which is what
  // tells the portrayals apart now.
  // Someone who plays SEVERAL characters still pins as themselves: their roles
  // are genuinely different people, and no single character's run covers them.
  const pinActor = (name) => {
    const p = performers[name];
    if (!p || !p.chars.length) return;
    if (p.chars.length === 1) {
      const ch = p.chars[0];
      // Only a recast performer needs a starting title, because they cover
      // part of the run and the stepper should open where their part begins.
      // Someone who played the whole run has no particular place to start, so
      // the stepper stays idle on the count, as it always has.
      const total = charTitleTotals[ch] || 0;
      const first = total && p.titles.size < total
        ? window.TITLES.find(t => t.cast.indexOf(ch) !== -1 && window.MCU_credit(t, ch) === name)
        : null;
      pinSubject([ch], null, first && first.id);
      return;
    }
    if (pinnedActor === name) { unpinCharacter(); return; }
    pinSubject(p.chars, name);
  };
  const unpinCharacter = () => {
    setPinnedActor(null);
    setHighlightedChar(null);
    setHoveredCharacter(null);
    setStepId(null);
    // Desktop details still open: back to that title's connections.
    if (!isTouch && spatialShown && drawerId) setSelectedId(drawerId);
  };
  // Opening a guide sets any pinned character aside, clears the search, shows
  // its essential stops and brings Up next back, scoped to the guide (even if
  // its × was used). `startAt` puts the stepper on a stop ("Part of").
  // The guide a person opens is remembered on this device and reopened on the
  // home page; closing it forgets it. Guides opened or closed by the address
  // (a shared link, Back and Forward) leave that memory alone: a link wins
  // for the visit without replacing the guide being followed.
  const openGuide = (id, startAt, opts) => {
    if (!window.MCU_GUIDE || !window.MCU_GUIDE.get(id)) return;
    if (!(opts && opts.fromURL)) window.MCU_GUIDE.remember(id);
    setPinnedActor(null);
    setHighlightedChar(null);
    setHoveredCharacter(null);
    setSearch('');
    setPair(null);
    if (selectedIdRef.current) { selectionReturnRef.current = null; setSelectedId(null); }
    setGuideId(id);
    setGuideOptional(false);
    setStepId(startAt || null);
    setUpHidden(false);
    if (isTouch) setDrawerId(null);
  };
  const closeGuide = (opts) => {
    if (guideId && !(opts && opts.fromURL)) window.MCU_GUIDE.forget(guideId);
    setGuideId(null);
    setStepId(null);
  };
  // Opening a guide (or showing its optional stops) in Spatial frames its
  // titles once the dimming has applied; nothing on the canvas moves. It waits
  // for the collection, since a phone frames the next stop, which depends on
  // what has been seen.
  useEffect(() => {
    if (!guide || !spatialShown || !collectionReady) return undefined;
    const id = requestAnimationFrame(() => resetView());
    return () => cancelAnimationFrame(id);
  }, [guideId, guideOptional, spatialShown, collectionReady]);
  // Phone Spatial frames itself before the collection has loaded, when there
  // is no Up next yet. Once it arrives, an untouched camera moves to Up next.
  useEffect(() => {
    if (!collectionReady || !isTouch || !spatialShown || guide || selectedIdRef.current) return undefined;
    const id = requestAnimationFrame(() => {
      const v = viewRef.current, last = lastResetViewRef.current;
      if (!upNextFrameRef.current || !last) return;
      if (Math.abs(v.x - last.x) > 1 || Math.abs(v.y - last.y) > 1 || Math.abs(v.scale - last.scale) > 0.001) return;
      resetView();
    });
    return () => cancelAnimationFrame(id);
  }, [collectionReady]);
  window.MCU_openGuide = openGuide;
  // Ready: the first render is on screen and the collection has loaded. Set
  // once per page load as data-ready="1" on <html>; the QA checks wait for it
  // instead of sleeping a fixed time after each load. Never set when startup
  // fails (boot.js shows its own screen then).
  useEffect(() => {
    if (!collectionReady) return undefined;
    const id = requestAnimationFrame(() => { document.documentElement.dataset.ready = '1'; });
    return () => cancelAnimationFrame(id);
  }, [collectionReady]);

  // ---- Coming back to a guide --------------------------------------------
  // A visit that starts on the home page (no title, character, guide or
  // filter in the address) reopens the guide being followed, once the
  // collection has settled: a guide finished meanwhile is forgotten instead.
  // Otherwise a returning visitor may be offered one guide (GuidePromo; which
  // one is MCU_GUIDE.promotion's rule), each only once per device. Never on a
  // first visit, after a link, with a guide open, or while anything else
  // (welcome, picker, sign-in reminder) is on screen.
  // It waits for `settled`, not `ready`: ready can arrive with this device's
  // titles while a signed-in session is still restoring, and every guide
  // looked unfinished then (Notion V4 Tasks, "Don't promote a guide that the
  // user has already finished"). The pick reads the titles again when it
  // fires, and is re-checked while it is up.
  const urlLinked = !!(urlAtLoad.title || urlAtLoad.char || urlAtLoad.guide || urlAtLoad.phase
    || urlAtLoad.type || urlAtLoad.budget || urlAtLoad.release);
  const [promo, setPromo] = useState(null);
  const homeStartRef = useRef(false);
  const guideIdNowRef = useRef(guideId);
  guideIdNowRef.current = guideId;
  useEffect(() => {
    if (homeStartRef.current || !collectionSettled) return undefined;
    homeStartRef.current = true;
    if (urlLinked || guideId || !window.MCU_GUIDE) return undefined;
    const G = window.MCU_GUIDE;
    const kept = G.remembered();
    const keptGuide = kept && G.get(kept);
    if (keptGuide && !G.progress(keptGuide, statusOf).complete) { openGuide(kept); return undefined; }
    if (kept) G.forget(kept);
    // Automated browsers (crawlers, link previews, the QA checks) are never
    // offered one; qa/test-promo.js clears the flag to test it.
    if (!window.MCU_RETURNING || welcome || navigator.webdriver) return undefined;
    setTimeout(() => {
      if (guideIdNowRef.current) return;
      if (document.querySelector('.m-sheet, .about-dialog, [aria-modal="true"], .g-pop, .mcu-confetti')) return;
      const pick = G.promotion(statusOfRef.current, window.todayISO());
      if (!pick) return;
      G.markPromoted(pick.key);
      setPromo(pick);
    }, 1200);
    return undefined;
  }, [collectionSettled]);
  // Signing in (or a sync landing) while a guide is offered: if it turns out
  // finished, offer the next pick instead, or close it when there is none.
  useEffect(() => {
    if (!promo || promo.caughtUp || !collectionSettled || !window.MCU_GUIDE) return;
    const G = window.MCU_GUIDE;
    if (!G.finished(promo.guide, statusOf)) return;
    const pick = G.promotion(statusOf, window.todayISO());
    if (pick) G.markPromoted(pick.key);
    setPromo(pick);
  }, [collectionStates, collectionSettled]);
  const startPromo = () => { const id = promo.guide.id; setPromo(null); openGuide(id); };
  // ---- The address ------------------------------------------------------
  // The pinned character, when it is one portrayal (a performer pin covering
  // several characters has no single id to share). With a character pinned the
  // title in the address is the stepper's, since on phones pinning closes the
  // details and the step lives in stepId.
  const urlChar = highlightedChar && !pinnedActor ? highlightedChar : null;
  const urlTitle = urlChar ? (stepId || drawerId) : drawerId;
  const urlParams = () => {
    const p = {};
    const view = isTouch ? viewMode : desktopView;
    if (view !== (isTouch ? 'list' : 'spatial')) p.view = view;
    if (sort !== 'release') p.sort = sort;
    if (sortDir !== DEFAULT_SORT_DIR[sort]) p.order = sortDir;
    if (phaseFilter !== 'all') p.phase = phaseFilter;
    if (typeFilter !== 'all') p.type = typeFilter;
    if (budgetFilter !== 'all') p.budget = budgetFilter;
    if (releaseFilter !== 'all') p.release = releaseFilter;
    if (urlTitle) p.title = urlTitle;
    if (urlChar) p.char = urlChar;
    if (guideId) p.guide = guideId;
    return p;
  };
  // Applies a title and character from the address: once on load, and again
  // on Back and Forward.
  const applyURLSubject = (u) => {
    if ((u.guide || null) !== guideId) {
      if (u.guide) openGuide(u.guide, null, { fromURL: true });
      else closeGuide({ fromURL: true });
    }
    if (u.char) {
      if (urlChar !== u.char) pinSubject([u.char], null, u.title);
      if (u.title && !isTouch) setDrawerId(u.title);
      return;
    }
    if (urlChar) unpinCharacter();
    if ((u.title || null) === drawerId) return;
    if (u.title) pickTitle(u.title);
    else { setDrawerId(null); if (!isTouch) setSelectedId(null); }
  };
  const urlLatest = useRef({});
  urlLatest.current = { urlParams, applyURLSubject };

  // ---- Back to home (the logo) -------------------------------------------
  // Resets in place to the app's first state: search, filters, collection tab,
  // pinned character, guide (and the remembered one), details, pair view,
  // menus, dialogs and the List's bulk selection are cleared; the sort goes
  // back to Release, earliest first; Up next comes back. The view (Spatial or
  // List) stays, as a per-device choice. Spatial frames the map again; List
  // and Grid scroll to the top. One new history step, so Back returns to where
  // the person was (title, character, guide, search, filters and sort).
  // The details close without the camera's usual return trip.
  const [homeAnnounce, setHomeAnnounce] = useState('');
  const homeSnapRef = useRef(null);
  const homePendingRef = useRef(false);
  const goHome = (opts) => {
    const fromHistory = !!(opts && opts.fromHistory);
    if (!fromHistory) {
      homeSnapRef.current = { search, phaseFilter, typeFilter, budgetFilter, releaseFilter, collectionFilter, sort, sortDir };
      try { window.history.pushState({ mcuHome: 1 }, '', window.location.pathname); } catch (e) { /* the reset still happens */ }
    }
    // A drag's momentum glide would carry on past the reset: stop it first.
    stopInertia();
    selectionReturnRef.current = null;
    setSelectedId(null);
    setDrawerId(null);
    setPair(null);
    setHoveredTitle(null);
    setHoveredConnection(null);
    setPinnedActor(null);
    setHighlightedChar(null);
    setHoveredCharacter(null);
    setStepId(null);
    setGuideId(null);
    if (window.MCU_GUIDE) window.MCU_GUIDE.forget();
    setSearch('');
    setPhaseFilter('all'); setTypeFilter('all'); setBudgetFilter('all'); setReleaseFilter('all');
    setCollectionFilter('all');
    setSort('release'); setSortDir(DEFAULT_SORT_DIR.release);
    setSheet(null); setAboutOpen(false); setWelcome(false); setPickerOpen(false); setPromo(null);
    setUpHidden(false);
    window.dispatchEvent(new Event('mcu:home'));
    homePendingRef.current = true;
    setHomeAnnounce('');
    setTimeout(() => setHomeAnnounce(tr('home.announce')), 50);
  };
  // Back from the home step: put back what the person had before it.
  const leaveHome = () => {
    const snap = homeSnapRef.current;
    if (!snap) return;
    homeSnapRef.current = null;
    setSearch(snap.search);
    setPhaseFilter(snap.phaseFilter); setTypeFilter(snap.typeFilter); setBudgetFilter(snap.budgetFilter); setReleaseFilter(snap.releaseFilter);
    setCollectionFilter(snap.collectionFilter);
    setSort(snap.sort); setSortDir(snap.sortDir);
  };
  const homeLatest = useRef({});
  homeLatest.current = { goHome, leaveHome };
  // After the reset has rendered (the new sort laid out): frame Spatial and
  // put the List or Grid back at the top.
  useEffect(() => {
    if (!homePendingRef.current) return;
    homePendingRef.current = false;
    if (spatialShown) resetView();
    document.querySelectorAll('.dlist, .m-scrollarea').forEach(el => { el.scrollTop = 0; });
  });
  // The logo link: a plain click resets in place; Cmd-, Ctrl-, Shift- and
  // middle-click open the home page elsewhere, as any link does.
  const onHomeClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    goHome();
  };
  const homeAnnouncer = <div className="story-sr" aria-live="polite">{homeAnnounce}</div>;
  useEffect(() => {
    if (urlAtLoad.title || urlAtLoad.char) applyURLSubject(urlAtLoad);
  }, []);
  useEffect(() => { writeURLState(urlParams()); },
    [isTouch, viewMode, desktopView, sort, sortDir, phaseFilter, typeFilter, budgetFilter, releaseFilter, urlTitle, urlChar, guideId]);
  // Back and Forward restore the title and the character, never the filters:
  // closing the phone filter sheet is itself a step back in history, and
  // restoring filters there would undo the choices just made in it. A step
  // the phone sheets take on their own (a sheet closing itself) restores
  // nothing at all — pinning a character from the details closes the sheet,
  // and treating that step as Back unpinned the character just pinned. Either
  // way the address is then re-synced from the state it describes.
  useEffect(() => {
    const onPop = (e) => {
      const own = window.MCU_isOwnSheetPop && window.MCU_isOwnSheetPop();
      // Back to home's own history step (Forward onto it resets again), and
      // Back from it, which also restores the search, filters and sort.
      if (!own && e && e.state && e.state.mcuHome) { homeLatest.current.goHome({ fromHistory: true }); return; }
      if (!own) homeLatest.current.leaveHome();
      if (!own) urlLatest.current.applyURLSubject(readURLState());
      setTimeout(() => writeURLState(urlLatest.current.urlParams()), 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const stepCurrent = stepId || drawerId;
  // A guide's arrows step through its stops and then, for an event guide, the
  // title it leads to, so nobody misses it at the end of the list. The count
  // shown stays the number of stops.
  const guideTarget = guide && guide.target && !guideStepTitles.some(t => t.id === guide.target)
    ? window.TITLES.find(t => t.id === guide.target) || null : null;
  const stepList = guide ? (guideTarget ? guideStepTitles.concat(guideTarget) : guideStepTitles) : pinnedTitles;
  const stepStops = guide ? guideStepTitles.length : stepList.length;
  const stepIndex = stepCurrent ? stepList.findIndex(t => t.id === stepCurrent) : -1;
  const stepTo = (id) => {
    setStepId(id);
    // Desktop opens each title's details; on phones the sheet would cover the
    // view, so the step only moves to the title (tap it to open).
    if (!isTouch) setDrawerId(id);
    if (spatialShown && viewportRef.current) {
      // A selected card's focus ring would fight the glide: let it go without
      // its return trip.
      if (selectedIdRef.current) { selectionReturnRef.current = null; setSelectedId(null); }
      const p = basePositions[id];
      if (!p) return;
      const rect = viewportRef.current.getBoundingClientRect();
      // A camera that was never framed (Spatial just opened) sits at 100%.
      // Desktop steps at no less than the landing's reading zoom.
      const floor = isTouch ? 0.6 : deskReadScale(rect.width);
      const scale = cameraFramedRef.current ? Math.max(viewRef.current.scale, floor) : floor;
      cameraFramedRef.current = true;
      const drawerSpace = isTouch ? 0 : 380;
      glideTo({
        x: (rect.width - drawerSpace) / 2 - (p.x + CARD_W / 2) * scale,
        y: rect.height / 2 - (p.y + CARD_H / 2) * scale,
        scale,
      });
    } else {
      requestAnimationFrame(() => {
        const row = document.querySelector(`[data-row-id="${id}"]`);
        if (!row) return;
        window.MCU_followRowFocus(row);
        row.scrollIntoView({ block: 'nearest', behavior: stepReducedMotion() ? 'auto' : 'smooth' });
      });
    }
  };
  const stepBy = (dir) => {
    const n = stepList.length;
    if (!n) return;
    const i = stepIndex < 0 ? (dir > 0 ? 0 : n - 1) : (stepIndex + dir + n) % n;
    stepTo(stepList[i].id);
  };
  useEffect(() => {
    const id = pendingStepRef.current;
    if (!id) return;
    pendingStepRef.current = null;
    if (id !== '*' && pinnedTitles.some(t => t.id === id)) stepTo(id);
    else if (spatialShown) resetView();
  }, [pinnedTitles]);
  // The desktop List with a title's details open and no character or guide:
  // the arrows step through the titles in the order the List shows them (its
  // sort, collection tab, filters and search), wrapping at the ends, and the
  // position is announced.
  const [listAnnounce, setListAnnounce] = useState('');
  const listStepOn = !isTouch && desktopView === 'list' && !highlightedChar && !guide && !!drawerId;
  const listStep = (dir) => {
    const n = visible.length;
    if (!n) return;
    const i = visible.findIndex(t => t.id === drawerId);
    const j = i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n;
    const t = visible[j];
    setDrawerId(t.id);
    setListAnnounce(tr('list.stepPos', { title: I18N.titleName(t), n: j + 1, total: n }));
    requestAnimationFrame(() => {
      const row = document.querySelector(`.dl-row[data-row-id="${t.id}"]`);
      if (!row) return;
      window.MCU_followRowFocus(row);
      row.scrollIntoView({ block: 'nearest', behavior: stepReducedMotion() ? 'auto' : 'smooth' });
    });
  };
  // Left/right arrows step too, unless typing or inside a menu.
  const stepRef = useRef(null);
  stepRef.current = (highlightedChar || guide) ? stepBy : listStepOn ? listStep : null;
  useEffect(() => {
    const onKey = (e) => {
      if (!stepRef.current || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.metaKey || e.ctrlKey) return;
      const el = e.target;
      // A checkbox has no use for the arrows, so a List row's checkbox steps too.
      if (el instanceof Element && el.closest('input:not([type="checkbox"]), textarea, select, [contenteditable="true"], [role="listbox"], [role="group"]')) return;
      e.preventDefault();
      keepFocusOnStep();
      stepRef.current(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // D and L switch to the dark and light themes (Notion V4 Tasks, "Desktop
  // keyboard shortcut: D for dark mode, L for light mode"): the same choice as
  // Settings → Theme, so Auto stays one tap away there. The phone layout has
  // them too ("D / L theme shortcut on the phone layout too"): they only fire
  // from a real keyboard (Chrome's device preview, a tablet or phone with one),
  // since the on-screen keyboard only opens in a field. Never while typing, in
  // a menu or dialog, or with a modifier held (browser shortcuts keep
  // working). Screen readers hear the new theme.
  const [themeAnnounce, setThemeAnnounce] = useState('');
  useEffect(() => {
    let timer = null;
    const onKey = (e) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.repeat || e.defaultPrevented) return;
      const k = (e.key || '').toLowerCase();
      if (k !== 'd' && k !== 'l') return;
      const el = e.target;
      if (el instanceof Element && el.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"]')) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const next = k === 'd' ? 'dark' : 'light';
      window.MCU_THEME.setChoice(next);
      setThemeAnnounce('');
      clearTimeout(timer);
      timer = setTimeout(() => setThemeAnnounce(tr(next === 'dark' ? 'theme.darkOn' : 'theme.lightOn')), 50);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, []);
  const themeAnnouncer = <div className="story-sr theme-announce" aria-live="polite">{themeAnnounce}</div>;

  // Clicking a connection line opens the pair view and glides to it.
  const pickConnection = (c) => {
    if (selectedIdRef.current) { selectionReturnRef.current = null; setSelectedId(null); }
    setHoveredConnection(null);
    setPair(c);
  };
  useEffect(() => {
    if (!pair || !viewportRef.current) return;
    const pa = basePositions[pair.a], pb = basePositions[pair.b];
    if (!pa || !pb) { setPair(null); return; }
    const rect = viewportRef.current.getBoundingClientRect();
    const side = !isTouch && drawerId ? 380 : 0;
    const span = PAIR_GAP + CARD_W * 2 + 80;
    const scale = Math.min(1, Math.max(viewRef.current.scale, 0.6), (rect.width - side) / span);
    const mx = (pa.x + pb.x) / 2 + CARD_W / 2, my = (pa.y + pb.y) / 2 + CARD_H / 2;
    cameraFramedRef.current = true;
    glideTo({ x: (rect.width - side) / 2 - mx * scale, y: rect.height / 2 - my * scale, scale });
  }, [pair]);
  // Row labels come back when a selection closes, while the cards glide home:
  // they wait for the glide, as they do after a new layout.
  const [bandsReturning, setBandsReturning] = useState(false);
  const hadSelectionRef = useRef(false);
  useLayoutEffect(() => {
    const had = hadSelectionRef.current;
    hadSelectionRef.current = !!selectedId;
    if (!had || selectedId) return undefined;
    setBandsReturning(true);
    const id = setTimeout(() => setBandsReturning(false), 520);
    return () => clearTimeout(id);
  }, [selectedId]);
  // Escape, or a new layout, leaves the pair view.
  useEffect(() => {
    if (!pair) return;
    const onKey = (e) => { if (e.key === 'Escape') setPair(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pair]);
  // Escape unwinds one layer per press: the open details and its selection
  // first (desktop), then the pinned character or performer. The pair view, the
  // search box and any open menu, popover, dialog or sheet handle Escape
  // themselves, so this stands back for them and checks the page first.
  //
  // Both rungs share one listener deliberately. Two listeners would each see
  // the same press, and React re-renders between them: the second would read
  // state the first had just cleared, decide nothing was in its way, and close
  // two layers at once.
  const detailsOpen = !isTouch && !!(drawerId || selectedId);
  useEffect(() => {
    if (!detailsOpen && !highlightedChar && !guide) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || pair) return;
      const t = e.target instanceof Element ? e.target : null;
      // Text fields keep Escape for themselves; a List checkbox has no use for it.
      if (t && t.closest('input:not([type="checkbox"]), textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('.sort-order-pop, .acct-pop, .filters-pop, .ss-pop, .bulk-more-pop, .g-pop, .m-sheet, [role="dialog"], [aria-modal="true"]')) return;
      if (detailsOpen) { setSelectedId(null); setDrawerId(null); return; }
      if (guide) { closeGuide(); return; }
      unpinCharacter();
    };
    // Capture phase: runs before the menus' own handlers close them (React
    // re-renders between listeners), so an open menu is still visible here.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [detailsOpen, highlightedChar, pair, guide]);
  useEffect(() => { setPair(null); }, [basePositions]);
  // Labels steer clear of the cards that are lit; dimmed ones may sit under them.
  const labelAvoidIds = useMemo(() => {
    if (pair) return new Set([pair.a, pair.b]);
    if (activeChar && highlightedIds) return highlightedIds;
    return hoverRelatedIds;
  }, [pair, activeChar, highlightedIds, hoverRelatedIds]);

  // Share a character's timeline: the link pins it, and the message counts the
  // titles its identity lights (the same set the banner counts).
  const charSharePayload = (ch) => ({
    params: { char: ch },
    text: tr('share.charText', { name: I18N.charName(ch), n: (charTitleIds(ch) || new Set()).size }),
  });
  const charBanner = activeChar ? (() => {
    const c = window.CHARACTERS[activeChar];
    const media = window.MEDIA;
    const pinned = !!highlightedChar && activeChar === highlightedChar;
    // A performer with several portrayals is named as themselves, with their
    // characters underneath, the way the search suggestion already reads.
    const asActor = pinned && !!pinnedActor;
    // Otherwise the name follows the title in view, because the credit belongs
    // to the title: stepping onto The Incredible Hulk reads Edward Norton, not
    // the character's default. With no single title in view there is nobody to
    // name, so the roster speaks for the whole run instead.
    const inView = !asActor && stepCurrent && window.TITLES.find(t => t.id === stepCurrent);
    const creditedHere = inView && inView.cast.indexOf(activeChar) !== -1
      ? window.MCU_credit(inView, activeChar) : null;
    const roster = creditsByChar[activeChar] || [];
    const named = asActor ? pinnedActor : (creditedHere || (roster[0] && roster[0].name) || c.actor);
    const photo = window.performerPortrait(named, activeChar);
    // When the subtitle names one performer, the count beside it is that
    // performer's share — the same number the search suggestion shows for their
    // row. The whole chain is already in the stepper ("6 of 8"), so repeating it
    // here said Mike McGill was in 8 titles when he is in one.
    // Only for a part several people played: with one performer the count is
    // the titles lit, which for a variant includes its identity's other titles.
    const namedRow = creditedHere && roster.length > 1 ? roster.find(r => r.name === creditedHere) : null;
    const count = namedRow ? namedRow.n
      : (pinned ? (pinnedVisibleIds || new Set()) : (charTitleIds(activeChar) || new Set())).size;
    const who = asActor ? pinnedActor : I18N.charName(activeChar);
    const sub = asActor ? tr('suggest.as', { names: pinnedChars.map(id => I18N.charName(id)).join(', ') })
      : (creditedHere || roster.length < 2) ? named
      : tr('credit.more', { name: named, n: roster.length - 1 });
    return (
      <div className={`char-banner${pinned ? ' pinned' : ''}`} style={{ '--char-color': c.color }}>
        <span className="cb-photo" style={{ background: c.color }}>
          <window.Portrait url={photo} alt="" initials={c.initials}/>
        </span>
        <span className="cb-who">
          <b>{who}</b>
          <span className="cb-sub">{sub} · {tr('header.count', { n: count })}</span>
        </span>
        {pinned && <>
          {/* A character with its own guide offers it: the same titles,
              curated, with a reason for each. */}
          {window.MCU_GUIDE && window.MCU_GUIDE.forChar(activeChar) && (
            <button type="button" className="cb-guide" onClick={() => openGuide(window.MCU_GUIDE.forChar(activeChar).id)}>
              <window.GuideIcon size={14}/>{tr('guide.seeCurated')}
            </button>
          )}
          <div className="segmented cb-mode" role="group" aria-label={tr('highlight.modeAria')}>
            <window.SegPill value={charOnly}/>
            <button className={charOnly ? 'on' : ''} aria-pressed={charOnly} onClick={() => setCharOnly(true)}>{tr('highlight.only')}</button>
            <button className={!charOnly ? 'on' : ''} aria-pressed={!charOnly} onClick={() => setCharOnly(false)}>{tr('highlight.all')}</button>
          </div>
          <div className="cb-step">
            <button onClick={() => stepBy(-1)} aria-label={tr('highlight.prev')} disabled={!pinnedTitles.length}>‹</button>
            <span className="cb-pos" aria-live="polite">{stepIndex >= 0
              ? tr('highlight.position', { i: stepIndex + 1, n: pinnedTitles.length })
              : tr('header.count', { n: pinnedTitles.length })}</span>
            <button onClick={() => stepBy(1)} aria-label={tr('highlight.next')} disabled={!pinnedTitles.length}>›</button>
          </div>
        </>}
        {pinned && <window.ShareButton iconOnly size={15} className="cb-share" label={tr('share.charLabel', { name: who })}
          payload={() => charSharePayload(activeChar)}/>}
        <button className="cb-close" aria-label={tr('highlight.clear')} title={tr('highlight.clear')}
          onClick={unpinCharacter}>×</button>
      </div>
    );
  })() : null;

  // Phones: the pinned character floats as a pill near the bottom (thumb
  // reach) instead of a banner. Phones always show only their titles, so there
  // is no Their titles / All titles switch here.
  const charPill = isTouch && highlightedChar ? (() => {
    const ch = highlightedChar;
    const c = window.CHARACTERS[ch];
    // Same rule as the desktop banner: the performer follows the title the
    // stepper is on, so the pill never names one actor over another's title.
    const inView = !pinnedActor && stepCurrent && window.TITLES.find(t => t.id === stepCurrent);
    const creditedHere = inView && inView.cast.indexOf(ch) !== -1 ? window.MCU_credit(inView, ch) : null;
    const roster = creditsByChar[ch] || [];
    const named = pinnedActor || creditedHere || (roster[0] && roster[0].name) || c.actor;
    const photo = window.performerPortrait(named, ch);
    const n = pinnedTitles.length;
    const charGuide = window.MCU_GUIDE ? window.MCU_GUIDE.forChar(ch) : null;
    return (
      <div className="char-pill" style={{ '--char-color': c.color }}>
        <div className="cp-bar">
          <span className="cp-who">
            <span className="cb-photo" style={{ background: c.color }}>
              <window.Portrait url={photo} alt="" initials={c.initials}/>
            </span>
            <span className="cp-text">
              <span className="cp-name">{pinnedActor || I18N.charName(ch)}</span>
              <span className="cp-actor">{pinnedActor
                ? tr('suggest.as', { names: pinnedChars.map(id => I18N.charName(id)).join(', ') })
                : (creditedHere || roster.length < 2) ? named
                : tr('credit.more', { name: named, n: roster.length - 1 })}</span>
            </span>
          </span>
          <div className="cb-step">
            <button onClick={() => stepBy(-1)} aria-label={tr('highlight.prev')} disabled={!n}>‹</button>
            {/* Before the first step just the number of titles (read out as
                "13 titles"), so the name keeps its space; then "1/13". */}
            <span className="cb-pos" aria-live="polite">{stepIndex >= 0
              ? tr('highlight.short', { i: stepIndex + 1, n })
              : <>{n}<span className="story-sr"> {tr('highlight.titlesWord', { n })}</span></>}</span>
            <button onClick={() => stepBy(1)} aria-label={tr('highlight.next')} disabled={!n}>›</button>
          </div>
          {charGuide && (
            <button type="button" className="cp-guide" aria-label={tr('guide.seeCurated')} title={tr('guide.seeCurated')}
              onClick={() => openGuide(charGuide.id)}>
              <window.GuideIcon size={16}/>
            </button>
          )}
          <window.ShareButton iconOnly size={15} className="cb-share" label={tr('share.charLabel', { name: pinnedActor || I18N.charName(ch) })}
            payload={() => charSharePayload(ch)}/>
          <button className="cb-close" aria-label={tr('highlight.clear')} title={tr('highlight.clear')} onClick={unpinCharacter}>×</button>
        </div>
      </div>
    );
  })() : null;

  const focusPop = (() => {
    if (!isTouch || viewMode !== 'spatial' || !selectedId) return null;
    const p = positions[selectedId];
    const t = window.TITLES.find(x => x.id === selectedId);
    if (!p || !t) return null;
    return (
      <window.FocusPop
        title={t}
        x={view.x + (p.x + CARD_W/2) * view.scale}
        y={view.y + (p.y + CARD_H/2) * view.scale}
        onOpenCast={() => setDrawerId(selectedId)}
        guide={guide} guideSkip={guideSkipInfo ? guideSkipInfo[t.id] : null} onGuideSkip={onCanvasSkip}
      />
    );
  })();

  // The desktop guide's module, in the List or over the canvas.
  const guideModule = (layout) => guide && (
    <window.GuideModule guide={guide} layout={layout} includeOptional={guideOptional} setIncludeOptional={setGuideOptional}
      stepIndex={stepIndex} stepCount={stepStops}
      onOpenNext={(id) => { if (layout === 'list' || !upNext) { setStepId(id); setDrawerId(id); } else { setStepId(id); upNext.onOpen(id); } }}
      onPrev={() => stepBy(-1)} onNext={() => stepBy(1)} onClose={closeGuide}/>
  );

  const canvasEl = (
    <div
      className="viewport"
      ref={viewportRef}
      /* Focusing a card would let the browser scroll this clipped box; the
         camera does the moving instead (revealCard), so keep it at 0,0. */
      onScroll={(e) => { e.currentTarget.scrollLeft = 0; e.currentTarget.scrollTop = 0; }}
      role={isTouch ? undefined : 'main'}
      aria-label={isTouch ? undefined : tr('view.spatial')}
      onPointerDownCapture={stopCamera}
      onWheelCapture={stopCamera}
      onMouseDown={isTouch ? undefined : onMouseDown}
      onWheel={isTouch ? undefined : onWheel}
      onTouchStart={touchPan ? onTouchStart : undefined}
      onTouchMove={touchPan ? onTouchMove : undefined}
      onTouchEnd={touchPan ? onTouchEnd : undefined}
      onClick={(e) => {
        // A click on the empty background (not a drag) steps back one level:
        // out of the pair view, or else closes the selected title and its
        // details, as a background tap does on phones. Cards, connection
        // lines and the on-canvas controls keep their own clicks.
        if (afterTouch() || isTouch || (!pair && !selectedId && !drawerId)) return;
        const s = panRef.current;
        if (e.target.closest('.card, path, button, input, a, .zoom-ctl, .ctx, .drawer, .toolbar, .spatial-empty')) return;
        if (s && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > 4) return;
        if (pair) { setPair(null); return; }
        setSelectedId(null);
        setDrawerId(null);
      }}
    >
      <div className="canvas-bg"/>
      <div
        className={`canvas${linesSettling ? ' lines-settling' : ''}${bandsReturning ? ' bands-settling' : ''}`}
        style={{
          width: canvasW + 'px',
          height: canvasH + 'px',
          transform: view.scale >= LAYER_MIN_SCALE
            ? `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`
            : `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
          transition: cameraGlide ? 'transform 600ms cubic-bezier(.2,.8,.2,1)' : undefined,
        }}
      >
        {/* Row labels for the Release (phase) and Chrono (era) timelines. Hidden
            while a title is selected: its connection rings move the cards. */}
        {!selectedId && layout.bands.map(b => {
          const label = b.phase ? tr('phase.label', { n: b.phase })
            : b.era === 0 ? tr('era.before', { year: ERA_STARTS[0] })
            : b.from === null ? '' : b.from === b.to ? String(b.from) : `${b.from}–${b.to}`;
          const g = viewProgress && (b.phase
            ? (viewProgress.byPhase && viewProgress.byPhase[b.phase])
            : (viewProgress.byEra && viewProgress.byEra[b.era]));
          return (
            <div key={b.phase ? 'p' + b.phase : 'e' + b.era} className={`band-label${b.phase ? ' phase' : ''}${g ? '' : ' plain'}`}
              style={{ transform: `translate(${b.x}px, ${b.y - BAND_LABEL_H}px)`, ...(b.phase ? { '--band': PHASE_COLORS[b.phase] } : {}) }}>
              {g ? <window.ProgressHeader band label={label} seen={g.seen} released={g.released} upcoming={g.upcoming}
                     color={b.phase ? PHASE_COLORS[b.phase] : undefined}/> : label}
            </div>
          );
        })}
        <FloatingConnections
          visibleTitles={lineTitles}
          positions={positions}
          hoveredTitle={hoveredTitle}
          activeChar={activeChar}
          activeChars={activeChars}
          drawChar={linesSettling ? null : highlightedChar}
          litIds={activeChar ? highlightedIds : null}
          onHoverConnection={setHoveredConnection}
          hoveredConnection={hoveredConnection}
          selectedId={selectedId}
          focusId={pair ? null : hoverFocusId}
          pair={pair}
          onPickConnection={pickConnection}
          avoidIds={labelAvoidIds}
          route={guide ? { ids: guideStepTitles.map(t => t.id), target: guide.target } : null}
        />
        {filtered.map(t => {
          const charHL = highlightedIds ? highlightedIds.has(t.id) : false;
          const charDim = highlightedIds ? !highlightedIds.has(t.id) : false;
          // A hovered connection line lights up the two titles it joins; the
          // pair view lights its two titles and dims everything else.
          const onLine = hoveredConnection && (hoveredConnection.a === t.id || hoveredConnection.b === t.id);
          const inPair = pair && (pair.a === t.id || pair.b === t.id);
          const hoverDim = hoveredConnection ? !onLine : hoverRelatedIds ? !hoverRelatedIds.has(t.id) : false;
          // A skipped stop dims through its own class, which keeps Unskip legible.
          const skippedHere = guideSkipInfo && guideSkipInfo[t.id] && guideSkipInfo[t.id].state === 'skipped';
          const isDimmed = pair ? !inPair : ((charDim && !skippedHere) || hoverDim);
          const isHighlighted = pair ? !!inPair : (charHL || (hoverFocusId === t.id) || !!onLine);
          // Visual only — the card stays in the layout so nothing reflows.
          const isCollDimmed = collectionFilter !== 'all' && !guide
            && !window.matchesCollection(collectionStates[t.id] || 'none', collectionFilter);
          return (
            <Card
              key={t.id}
              entering={cardsShownRef.current}
              title={t}
              pos={positions[t.id] || {x:0,y:0}}
              onClick={() => onCardTap(t.id)}
              onHover={isTouch ? (() => {}) : setHoveredTitle}
              onDragStart={isTouch ? (() => {}) : onCardDragStart}
              focusable={!isTouch}
              onFocusCard={revealCard}
              isSelected={selectedId === t.id}
              guideBadge={guideBadges ? guideBadges[t.id] : null}
              guide={guide} guideSkip={guideSkipInfo ? guideSkipInfo[t.id] : null} onGuideSkip={onCanvasSkip}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              isCollDimmed={isCollDimmed}
              isRingHidden={!!ringIds && !ringIds.has(t.id)}
              isRingFocus={!!ringIds && selectedId === t.id}
              isDragging={draggingId === t.id}
              isCurrent={!!highlightedChar && stepId === t.id}
              curColor={highlightedChar ? window.CHARACTERS[highlightedChar].color : null}
              matchedChars={searchCharMatches ? searchCharMatches[t.id] : null}
              searchQuery={search}
              scale={view.scale}
            />
          );
        })}
      </div>
      <div className={`zoom-ctl${isTouch ? ' touch' : ''}${isTouch && !zoomPeek && zoomEdit == null ? ' rest' : ''}`}>
        <button className="zoom-btn" onClick={()=>{ if (isTouch) peekZoom(); applyScale(s=>s/1.15); }} disabled={view.scale <= ZOOM_MIN + 1e-4} aria-label={tr('canvas.zoomOut')}>&minus;</button>
        {zoomEdit != null
          ? <input className="zoom-val edit" autoFocus value={zoomEdit} inputMode="decimal"
              onChange={e=>setZoomEdit(e.target.value)} onBlur={commitZoomEdit}
              onKeyDown={e=>{ if(e.key==='Enter') commitZoomEdit(); if(e.key==='Escape') setZoomEdit(null); }}/>
          : <button className="zoom-val"
              onClick={isTouch ? ()=>setZoomEdit(String(Math.round(view.scale*100))) : undefined}
              onDoubleClick={isTouch ? undefined : ()=>setZoomEdit(String(Math.round(view.scale*100)))}
              title={tr(isTouch ? 'canvas.zoomTypeTouch' : 'canvas.zoomTypeDesktop')}>{Math.round(view.scale * 100)}%</button>}
        <button className="zoom-btn" onClick={()=>{ if (isTouch) peekZoom(); applyScale(s=>s*1.15); }} disabled={view.scale >= 2 - 1e-4} aria-label={tr('canvas.zoomIn')}>+</button>
      </div>
      {filtered.length === 0 && (() => {
        // Nothing matches: say so and offer the one action that brings titles
        // back, instead of an empty canvas. Events stop here so the button
        // never starts a pan or a background tap.
        const searching = !!search.trim();
        const filtering = phaseFilter !== 'all' || typeFilter !== 'all' || budgetFilter !== 'all' || releaseFilter !== 'all';
        const label = searching && filtering ? tr('empty.clearBoth') : searching ? tr('search.clear') : tr('filters.clear');
        const stop = e => e.stopPropagation();
        return (
          <div className="spatial-empty" role="status" onMouseDown={stop} onTouchStart={stop} onTouchEnd={stop} onClick={stop}>
            <div className="spatial-empty-t">{tr('empty.title')}</div>
            <div className="spatial-empty-s">{tr('empty.sub')}</div>
            {(searching || filtering) && (
              <button className="spatial-empty-btn" onClick={() => {
                if (searching) setSearch('');
                if (filtering) { setPhaseFilter('all'); setTypeFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }
              }}>{label}</button>
            )}
          </div>
        );
      })()}
      {/* ringIds is the selected title plus everything sharing a character
          with it — exactly the cards left standing on the canvas. */}
      {/* The summary describes filters an open guide sets aside, so it waits. */}
      {!guide && contextSummary(isTouch ? 'pill' : 'float', false, ringIds ? ringIds.size : null)}
      {/* Every order but By Phase carries one meter over the whole catalogue.
          It stands down with the band labels whenever a title is selected,
          since the canvas is then showing one ring. */}
      {/* Phones show an open guide's progress in its dock instead. */}
      {/* An open guide carries its progress in its own module (desktop) or
          dock (phones). */}
      {!selectedId && !guide && ((viewProgress && viewProgress.all) || upNextInMeter) && (
        <div className="spatial-overall">
          {viewProgress && viewProgress.all && <window.ProgressHeader label={tr('progress.all')} {...viewProgress.all}/>}
          {/* Desktop only: phones get a chip above the gesture hint. */}
          {upNextInMeter && <window.UpNextMeterRow info={upNext}/>}
        </div>
      )}
      {guide && !isTouch && guideModule('spatial')}
      {focusPop}
    </div>
  );

  if (isTouch) {
    return (
      <div className={`app touch ${device}`}>
        {upAnnouncer}
        {homeAnnouncer}
        {themeAnnouncer}
        <window.MobileTopBar
          onHome={onHomeClick}
          device={device}
          viewMode={viewMode} setViewMode={(v) => {
            if (v !== viewMode && v !== 'spatial' && viewMode !== 'spatial') window.captureViewFlip();
            setViewMode(v);
            if (v !== 'spatial') setSelectedId(null);
          }}
          search={search} setSearch={setSearch} onPickTitle={pickTitle} onPickPerson={pickPerson}
          onOpenFilters={() => { if (viewMode !== 'spatial') window.captureFlip(); setSheet('filters'); }}
          filterCount={filterCount}
          sort={sort} sortDir={sortDir} setSortDir={setSortDir}
          onOpenAccount={() => setSheet('account')}
          onOpenSettings={() => setSheet('settings')}
          onOpenGuides={() => setSheet('guides')} guideActive={!!guide} guideName={guide ? window.MCU_GUIDE.name(guide) : null}
          collectionFilter={collectionFilter} setCollectionFilter={setCollectionFilter}
        />
        <div role="main" className={`m-main${charPill || guide ? ' has-pill' : ''}`}
          style={highlightedChar ? { '--cur-color': window.CHARACTERS[highlightedChar].color } : undefined}>
          {guide && viewMode !== 'spatial' && (
            <window.GuideView guide={guide} surface="phone" layout={viewMode} includeOptional={guideOptional} setIncludeOptional={setGuideOptional}
              currentId={stepCurrent} onOpen={(id) => setDrawerId(id)} onContinue={(id) => { setStepId(id); setDrawerId(id); }}/>
          )}
          {!guide && viewMode === 'grid' && <window.MobileGrid upNext={upNext} progress={viewProgress} sort={sort} collapseSeen={collectionFilter === 'all' && !highlightedChar && !search} markWatch={collectionFilter !== 'watchlist'} header={contextSummary('line')} currentId={highlightedChar ? stepId : null} titles={visible} onSelect={onCardTap} searchCharMatches={searchCharMatches} search={search} empty={emptyCopy} orderKey={flipKey} flipPaused={sheet === 'filters'}/>}
          {!guide && viewMode === 'list' && <window.MobileList upNext={upNext} progress={viewProgress} collapseSeen={collectionFilter === 'all' && !highlightedChar && !search} markWatch={collectionFilter !== 'watchlist'} header={contextSummary('line')} currentId={highlightedChar ? stepId : null} titles={visible} sort={sort} onSelect={onCardTap} searchCharMatches={searchCharMatches} search={search} empty={emptyCopy} orderKey={flipKey} flipPaused={sheet === 'filters'}/>}
          {viewMode === 'spatial' && (
            <div className="m-spatial-wrap">
              {canvasEl}
              {/* An open guide's dock carries its next stop, so the chip steps
                  aside while it is open. */}
              {filtered.length > 0 && !selectedId && upNext && !guide && <window.UpNextChip info={upNext}/>}
            </div>
          )}
          {guide ? (
            <window.GuidePill guide={guide} stepIndex={stepIndex} stepCount={stepStops}
              current={stepIndex >= 0 ? stepList[stepIndex] : null}
              next={upNext && upNext.result && upNext.result.kind === 'next' ? upNext.result.title : null}
              onOpenNext={(id) => upNext && upNext.onOpen(id)}
              onPrev={() => stepBy(-1)} onNext={() => stepBy(1)} onClose={closeGuide}/>
          ) : charPill}
        </div>
        {device === 'mobile' && <window.SortTabs sort={sort} setSort={changeSort} away={!!guide}/>}
        {sheet === 'filters' && (
          <window.FilterSheet
            phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            budgetFilter={budgetFilter} setBudgetFilter={setBudgetFilter}
            releaseFilter={releaseFilter} setReleaseFilter={setReleaseFilter}
            sort={sort}
            sortDir={sortDir} setSortDir={setSortDir}
            showing={mobileShowing}
            onClear={() => { setPhaseFilter('all'); setTypeFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }}
            onClose={() => { setSheet(null); requestAnimationFrame(() => window.playPendingFlip()); }}
          />
        )}
        {sheet === 'account' && (
          <window.AccountSheet
            onClose={() => setSheet(null)}
            onPickCollection={setCollectionFilter}
            onAbout={() => setSheet('about')}
          />
        )}
        {sheet === 'about' && <window.AboutSheet onClose={() => setSheet(null)}/>}
        {sheet === 'settings' && (
          <window.SettingsSheet onClose={() => setSheet(null)}
            onAbout={() => setSheet('about')} onShowWelcome={() => { setSheet(null); setWelcome(true); }}/>
        )}
        {sheet === 'guides' && (
          <window.Sheet onClose={() => setSheet(null)} tall label={tr('guide.menuTitle')}>
            <h2 className="g-sheet-title">{tr('guide.menuTitle')}</h2>
            <window.GuideMenu currentId={guideId} onPick={(id) => { setSheet(null); openGuide(id); }}/>
          </window.Sheet>
        )}
        <window.StatusToast touch/>
        <window.ShareImageHost touch/>
        <window.SignInNudge touch/>
        <window.BulkConfirm touch/>
        {welcome && !sheet && !drawerTitle && !pickerOpen && <window.AboutSheet welcome onPick={openPicker} onClose={() => setWelcome(false)}/>}
        {pickerOpen && <window.SeenPicker touch onClose={() => setPickerOpen(false)}/>}
        {promo && <window.GuidePromo promo={promo} touch onStart={startPromo} onClose={() => setPromo(null)}/>}
        {drawerTitle && (
          <window.CastSheet
            title={drawerTitle} search={search}
            inSpatial={viewMode === 'spatial'}
            onClose={() => {
              setDrawerId(null);
              // Details opened from Up next (or anywhere but the canvas) close
              // back to the plain canvas, centred on the title, with Up next
              // in place, rather than leaving its connections ring open.
              const back = selectionReturnRef.current;
              if (viewMode === 'spatial' && selectedIdRef.current && back && back.id === selectedIdRef.current && !back.fromCanvas) setSelectedId(null);
            }}
            onCharacterClick={pinCharacter}
            activeChar={activeChar}
            activeChars={activeChars}
            onGoSpatial={() => {
              setViewMode('spatial');
              if (highlightedChar) {
                if (pinnedCharIds && pinnedCharIds.has(drawerId)) { setStepId(drawerId); pendingStepRef.current = drawerId; }
              } else setSelectedId(drawerId);
              setDrawerId(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`app ${drawerTitle ? 'drawer-open' : ''}`}>
      {upAnnouncer}
      {homeAnnouncer}
      {themeAnnouncer}
      <Toolbar
        onHome={onHomeClick}
        onAbout={() => setAboutOpen(true)}
        onSettings={() => setSettingsOpen(o => !o)} settingsOpen={settingsOpen}
        onPickTitle={pickTitle} onPickPerson={pickPerson}
        desktopView={desktopView} setDesktopView={changeDesktopView}
        sort={sort} setSort={changeSort} sortDir={sortDir} setSortDir={setSortDir}
        phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        budgetFilter={budgetFilter} setBudgetFilter={setBudgetFilter}
        releaseFilter={releaseFilter} setReleaseFilter={setReleaseFilter}
        collectionFilter={collectionFilter} setCollectionFilter={setCollectionFilter}
        search={search} setSearch={setSearch}
        guideId={guideId} onOpenGuide={(id) => openGuide(id)}
      />

      {/* An open guide shows its own module instead: at the top of the List,
          floating over the canvas in Spatial. */}
      {!guide && charBanner}

      {/* Always present, so each step's title and position is read out. */}
      {desktopView === 'list' && <div className="story-sr" aria-live="polite">{listAnnounce}</div>}
      {desktopView === 'list' && guide
        ? <window.GuideView guide={guide} surface="desktop" includeOptional={guideOptional} setIncludeOptional={setGuideOptional}
            module={guideModule('list')}
            currentId={stepCurrent} openId={drawerId} onOpen={toggleDetails} onContinue={(id) => { setStepId(id); setDrawerId(id); }}
            onFollow={(id) => {
              // The stop becomes the guide's current one too, so ← → carry on
              // from it and the banner announces "Stop n of N", as it does for
              // ← →.
              keepFocusOnStep();
              setStepId(id);
              setDrawerId(id);
            }}/>
        : desktopView === 'list'
        ? <window.DesktopList upNext={upNext} titles={visible} sort={sort} sortDir={sortDir} setSort={changeSort} setSortDir={setSortDir}
            search={search} searchCharMatches={searchCharMatches} openId={drawerId} activeChar={activeChar} activeChars={activeChars}
            onOpen={toggleDetails}
            onFollow={(id, n, total) => {
              keepFocusOnStep();
              setDrawerId(id);
              // Focus moving to the row reads it out; without that, say where we are.
              const t = n && window.TITLES.find(x => x.id === id);
              if (t) setListAnnounce(tr('list.stepPos', { title: I18N.titleName(t), n, total }));
            }}
            header={contextSummary('float', true)} empty={emptyCopy} orderKey={flipKey} progress={viewProgress}/>
        : canvasEl}

      {hoveredConnection && (
        <div className="line-tooltip" style={{left: hoveredConnection.x + 12, top: hoveredConnection.y + 12}}>
          {(() => {
            const ta = window.TITLES.find(x => x.id === hoveredConnection.a), tb = window.TITLES.find(x => x.id === hoveredConnection.b);
            return ta && tb ? <div className="tt-titles">{I18N.titleName(ta)} <span aria-hidden="true">↔</span> {I18N.titleName(tb)}</div> : null;
          })()}
          <div className="tt-label">{tr('canvas.sharedCharacters')}</div>
          {hoveredConnection.characters.map(c => {
            const ch = window.CHARACTERS[c];
            return (
              <div key={c} className="tt-row">
                <span className="tt-dot" style={{background: ch.color}}/>
                <span>{I18N.charName(c)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Settings takes the details drawer's place rather than stacking a
          second panel; closing it brings the drawer back. */}
      {/* The drawer that comes back must not take focus from the gear. */}
      {(settingsOpen || settingsShown) && <window.SettingsPanel leaving={!settingsOpen} onGone={() => setSettingsShown(false)}
        onClose={() => { if (drawerTitle) keepFocusOnStep(); setSettingsOpen(false); }}
        onAbout={() => setAboutOpen(true)} onShowWelcome={() => setWelcome(true)}/>}
      <CastDrawer
        title={settingsOpen || settingsShown ? null : drawerTitle}
        onClose={() => { setSelectedId(null); setDrawerId(null); }}
        onCharacterClick={pinCharacter}
        hoveredCharacter={hoveredCharacter}
        onCharacterHover={setHoveredCharacter}
        activeChar={activeChar}
        activeChars={activeChars}
        search={search}
      />
      <window.StatusToast touch={false}/>
      <window.ShareImageHost touch={false}/>
      <window.SignInNudge touch={false}/>
      <window.BulkConfirm touch={false}/>
      {(aboutOpen || welcome) && !pickerOpen && <window.AboutDialog welcome={welcome && !aboutOpen} onPick={openPicker}
        onClose={() => { setAboutOpen(false); setWelcome(false); }}/>}
      {pickerOpen && <window.SeenPicker touch={false} onClose={() => setPickerOpen(false)}/>}
      {promo && <window.GuidePromo promo={promo} touch={false} onStart={startPromo} onClose={() => setPromo(null)}/>}
    </div>
  );
}

// Account wraps collection: from Phase 3 the collection needs to know who is
// signed in before it can decide what to load.
ReactDOM.createRoot(document.getElementById('root')).render(
  <window.AccountProvider>
    <window.PreferencesSync/>
    <window.CollectionProvider><App/></window.CollectionProvider>
  </window.AccountProvider>
);

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { PHASE_COLORS, tr, typeLabel, sortDirectionLabels, sortTitles };
