// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 697 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import { FirstHint, MCU_HINTS, useHintsVersion } from './hints'
import { CharCard } from './char-card';
import { MCU_KEYS, ShortcutsDialog, SORT_BY_KEY, SECTION_BY_KEY, STATUS_BY_KEY, keyIsTaken } from './shortcuts';
import React from 'react';
import * as B from './banners';
import * as S from './shell';
import ReactDOM from 'react-dom/client';
import { addressFor, homePath, stateParams } from '@/share-card/addresses';

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

// The card's size, which the layout reads (spatial-card.tsx draws the card).
const CARD_W = window.CARD_SIZE.w;
const CARD_H = window.CARD_SIZE.h;
// The phone's reading zoom: about 2.5 titles across (one title step is
// CARD_W * 1.15), capped at 100%. The timelines open at it, and every order
// uses it to frame Up next and a title whose details just closed, so cards
// read at one size whichever order is on.
const phoneReadScale = (w) => Math.min(1, w / (CARD_W * 1.15 * 2.5));
// The phone canvas's overview (Notion "Explore E 5/5"): about four posters
// across. The canvas still opens at the reading zoom (Andre, 2026-11-16: the
// larger cards worked better); a double-tap on empty canvas switches to the
// overview and back, and a pinch or double-tap sets the zoom for the rest of
// the visit (phoneZoom).
const phoneOverviewScale = (w) => Math.min(1, w / (CARD_W * 1.15 * 4.3));
let phoneZoom = null;
// Below this zoom a phone card shows its title alone, larger (E 5/5).
const PHONE_OVERVIEW_BELOW = 0.6;
// Desktop's reading zoom: the timeline orders open at about 7.5 titles across
// (one title step is CARD_W * 1.15), capped at 100%, so any window 1,466px or
// wider reads at 100%. Stepping through a character or a guide, and centring
// a title after its details close, never go below it either (Notion V4 Tasks,
// "Desktop Spatial: character and guide stepping zoom to 70%"), so the cards
// keep the size the landing showed them at.
const deskReadScale = (w) => Math.min(1, w / (CARD_W * 1.15 * 7.5));
// The landing zoom (Notion "Spatial: one landing for every strip", Andre,
// 2026-11-18): where every strip lands and steps, a pinned character's row,
// a guide's route and the filter lens alike. Phones: the reading zoom, or the
// zoom a pinch or double-tap set for the visit. Desktop: its reading zoom.
const landScale = (w, touch) => touch ? (phoneZoom || phoneReadScale(w)) : Math.max(0.05, deskReadScale(w));
// Phones: how far down the canvas the room above whatever is docked at its
// bottom reaches (a guide's dock, the pinned character's card, the All
// titles card), in the canvas's own coordinates.
const dockTop = (viewport, rect) => {
  let bottom = rect.height;
  const main = viewport.closest('.m-main') || document;
  main.querySelectorAll('.g-dock, .char-card.docked, .spatial-overall.docked').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height && r.top > rect.top) bottom = Math.min(bottom, r.top - rect.top - 8);
  });
  return bottom;
};
// How far above its row a band label's pill starts, in canvas units. The pill
// is drawn there and the camera leaves room for it, so both read this one
// number: when they disagreed, By Phase cut the first pill off at the top and
// Chronological slid its first pill under the count pill.
const BAND_LABEL_H = 58;
// Space between the two titles of the pair view (room for the labels).
const PAIR_GAP = 380;
// Desktop, following a title's thread (Notion "Explore E 4/5", Andre
// 2026-11-16): its connected titles in one row by release, this far apart.
const LINE_GAP = 48;
// The desktop ring's circles, innermost first.
const RING_CAPS = [6, 10, 16, 22];
// The details drawer's width (--drawer-w in src/index.css: 380px, 440px from a
// 1600px window; Notion "Size steps 3/3"), for the camera's sums.
const drawerW = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--drawer-w')) || 380;

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

// The phrase naming the order Up next follows ("release order", "newest
// first", "highest IMDb first"…), for its tag.
function upNextOrderKey(sort, dir) {
  if ((sort === 'release' || sort === 'chrono') && dir === 'asc') return 'upnext.order.' + sort;
  return 'upnext.order.' + sort + '.' + dir;
}

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
// Phase is multi-select (Notion "Rethink the Filters menu", option A):
// 'all', or the chosen phases joined with commas ("2,3"), which is also how
// the address carries them (phase=2,3).
function phaseMatches(t, phases) {
  return phases === 'all' || phases.split(',').indexOf(String(t.phase)) !== -1;
}
// One test for the catalog filters (phase, type, budget, released), so the
// Filters panel's live count agrees with what the views show.
function filterMatches(t, f) {
  return phaseMatches(t, f.phase) && (f.type === 'all' || t.type === f.type)
    && (f.budget === 'all' || budgetMatches(t, f.budget)) && (f.release !== 'released' || window.MCU_isReleased(t));
}
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

// What the view is showing that the controls don't (how many titles match and
// which filters are on): ContextSummary lives in spatial-chrome.tsx (Notion
// "shadcn pass 2/5"), on the design system.
const ContextSummary = window.ContextSummary;

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
// The desktop Titles list groups Story order by these same eras (Notion
// "Titles 1/5"), so its headers match the canvas's band labels.
window.MCU_storyEras = { eraOf: chronoEras, storyYear, starts: ERA_STARTS };

function computeLayout(titles, sort, dir = DEFAULT_SORT_DIR[sort]) {
  const ordered = sortTitles(titles, sort, dir);
  const positions = {};
  let layoutBands = [];
  const colW = CARD_W + 60;
  // Rows in the grid orders leave room under each card for the arcs that join
  // neighbours on a row and their name labels (ARC_MAX + a label), so neither
  // reaches the next row (Notion "Show posters uncropped": the cards grew).
  const rowH = CARD_H + 110;
  // The timelines' staircase keeps the spacing it had.
  const bandH = (CARD_H + 70) * 1.25;

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
      const y = 80 + row * bandH;
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

// The Spatial card lives in spatial-card.tsx (Notion "shadcn pass 2/5"),
// built on the design system; it is published on window like the other views.
const Card = window.SpatialCard;

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

function CastDrawer({ title: current, back = null, ex = null, onClose, onCharacterClick, hoveredCharacter, onCharacterHover, activeChar, activeChars, search, onShowInExplore }) {
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
  const explore = current && ex ? ex.explore : null;
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [title && title.id, explore && explore.kind]);
  // Leaving the thread or trail puts keyboard focus back on the heading.
  useEffect(() => {
    if (headingRef.current && lastInput === 'keyboard' && open) headingRef.current.focus({ preventScroll: true });
  }, [explore && explore.kind]);
  useEffect(() => {
    if (!current) { setOpen(false); return; }
    setTitle(current);
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setOpen(true)); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [current]);
  if (!title) return null;
  // The frame and the cast list are on the design system (title-details.tsx,
  // Notion "shadcn pass 3/5"); the behaviour above stays here.
  return (
    <window.DrawerFrame asideRef={asideRef} scrollRef={scrollRef} open={open} onClose={onClose}
      onSlid={() => { if (!current) setTitle(null); }}>
      {explore && explore.kind === 'thread' ? (
        <window.ThreadView id={title.id} surface="drawer" headingRef={headingRef} headingId="drawer-title"
          onLeave={ex.onLeave} onOpen={ex.onOpen}/>
      ) : explore && explore.kind === 'trail' ? (
        <window.TrailView char={explore.char} from={explore.from} current={ex.current} pinned={ex.charView} surface="drawer" headingRef={headingRef} headingId="drawer-title" inCanvas={ex.inCanvas}
          onLeave={ex.onLeave} onOpen={ex.onOpen} onPin={ex.onPin}/>
      ) : (
      <window.TitleDetailsBody title={title} surface="drawer" search={search} headingRef={headingRef} headingId="drawer-title" back={current ? back : null}
        onThread={current && ex ? ex.onThread : null}
        // From My list and Guides: the title on the Explore canvas.
        onExplore={onShowInExplore ? () => onShowInExplore(title.id) : null}
        cast={<window.DrawerCast title={title} activeChar={activeChar} activeChars={activeChars} search={search}
          onCharacterClick={onCharacterClick} onCharacterHover={onCharacterHover}/>}/>
      )}
    </window.DrawerFrame>
  );
}

// [sort, icon]; labels come from the active language (sort.* / sort.short.*).
// The desktop toolbar lives in toolbar.tsx (Notion "shadcn pass 1/5"), built on
// the design system; it is published on window like the other views.
const Toolbar = window.Toolbar;

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

// How many titles each title is connected to: the titles that share at least
// one character with it (matched on the character's core identity), which is
// exactly the set its connections ring shows when it is selected (relatedIds),
// so the card's number and the ring always agree (Andre, 2026-11-15).
function connectionCounts(titles) {
  const byPrime = {};
  titles.forEach(t => t.cast.forEach(c => {
    const p = primeOf(c);
    (byPrime[p] || (byPrime[p] = new Set())).add(t.id);
  }));
  const out = {};
  titles.forEach(t => {
    const near = new Set();
    t.cast.forEach(c => byPrime[primeOf(c)].forEach(id => { if (id !== t.id) near.add(id); }));
    out[t.id] = near.size;
  });
  return out;
}

// How far below a row the arc joining two of its cards may dip (see control()).
const ARC_MAX = 80;

function FloatingConnections({ visibleTitles, positions, hoveredTitle, activeChar, activeChars, litIds, onHoverConnection, hoveredConnection, selectedId, focusId, pair, onPickConnection, shownIds, route, drawChar, spokes = null, quiet = false }) {
  // An open guide: one route through its stops in guide order, dashed on to
  // the destination. It used to be drawn in place of the character threads;
  // since the guide line puts the stops in one row, the threads among them
  // arc under it as in Follow the thread, and the route runs in the gaps
  // between the cards (Notion "Guide line: draw the character connections
  // among its stops", Andre, 2026-11-18).
  let routeEl = null;
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
    routeEl = (
      <svg className={`${S.THREADS} guide-route`} style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible'}} aria-hidden="true">
        {segs.map(([a, b, dashed], i) => (
          <path key={i} d={d(a, b)} fill="none" style={{ stroke: 'var(--brand)' }} strokeWidth={dashed ? 2.5 : 4} strokeLinecap="round"
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
  let connections = Object.values(grouped);
  // A selected title's ring: only its own lines, one from it to each title
  // it connects to, through the characters they share (Notion "Connections:
  // a selected title's ring, legible at first sight"); the lines among the
  // other titles are left out. Its first circle carries the labels.
  if (spokes) {
    const ft = visibleTitles.find(t => t.id === spokes.focus);
    if (ft) {
      const mine = new Map();
      ft.cast.forEach(c => { const p = primeOf(c); if (!mine.has(p)) mine.set(p, c); });
      connections = visibleTitles.filter(t => t.id !== ft.id).map(t => {
        const characters = [];
        t.cast.forEach(c => { const own = mine.get(primeOf(c)); if (own && characters.indexOf(own) === -1) characters.push(own); });
        return { a: ft.id, b: t.id, characters };
      }).filter(c => c.characters.length);
    }
  }

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
      // The arc's lowest point sits this far below the cards, at most ARC_MAX,
      // so it stays in the gap above the next row.
      const depth = CARD_H / 2 + Math.min(ARC_MAX, 34 + lane * 9 + Math.min(70, Math.abs(dx) * 0.04));
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

  // Card rectangles, so labels can avoid sitting on a card: every card on
  // screen, dimmed ones included (a name over a faded card's text still reads
  // as clutter); a connections ring hides the rest, so only its cards count.
  const cardRects = visibleTitles.filter(t => !shownIds || shownIds.has(t.id)).map(t => positions[t.id]).filter(Boolean)
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
    // The ring's spokes: one line per title, in its first shared character's
    // color, labeled "Tony Stark +3" (a bundle of one line per character
    // tangled at The Avengers' 30). A hovered or pinned person narrows them to
    // that person's own lines.
    const chars = !spokes ? conn.characters
      : activeChar ? conn.characters.filter(ch => activeChars && activeChars.some(a => primeOf(a) === primeOf(ch)))
      : conn.characters.slice(0, 1);
    const spokeMore = spokes && !activeChar ? conn.characters.length - 1 : 0;
    const N = chars.length;

    return chars.map((ch, i) => {
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
      const strokeW = (emphasized ? 3 : 1.8) + (spokes ? Math.min(2, spokeMore * 0.5) : 0);
      const showLabel = emphasized && (isPair || involvesFocus) && (!spokes || isHovered || spokes.inner.has(conn.b) || !!activeChar);
      const drawDelay = emphasized && drawChar && primeOf(ch) === primeOf(drawChar) ? drawRank.get(conn.a + '__' + conn.b) : undefined;
      const draw = drawDelay !== undefined ? { className: 'thread-draw', pathLength: 1, style: { '--d': drawDelay + 'ms' } } : null;

      if (showLabel) {
        // Spread labels along the curve based on N: t in (0.15..0.85), then
        // move each to the nearest spot not covered by a card (see placeLabel).
        const t0 = N === 1 ? 0.5 : 0.15 + (i / (N - 1)) * 0.7;
        const labelText = I18N.charName(ch) + (spokeMore ? ' +' + spokeMore : '');
        const labelW = labelPillWidth(labelText);
        const lp = placeLabel(t => pointOnCurve(p1, p2, offset, t, i, isPair), t0, labelW, 22);
        labels.push({ x: lp.x, y: lp.y, w: labelW, h: 22, color: charObj.color, text: labelText, key: conn.a + '__' + conn.b + '__' + ch });
      }

      return (
        <g key={ch+i+conn.a+conn.b}>
          {/* The pinned character's row draws its thread plain, as the guide
              line does (Notion "Connections with a character pinned"): no
              halo and no glow. */}
          {emphasized && !quiet && (
            <path d={curve(p1,p2,offset,i,isPair)} fill="none" stroke={charObj.color} strokeWidth={strokeW + 6} opacity={0.25} filter="url(#strong-glow)" strokeLinecap="round"
              {...(draw ? { className: draw.className, pathLength: draw.pathLength, style: draw.style } : {})}/>
          )}
          <path
            d={curve(p1,p2,offset,i,isPair)}
            data-a={conn.a} data-b={conn.b} data-ch={ch} data-em={emphasized ? '1' : '0'}
            onClick={(e) => { e.stopPropagation(); if (onPickConnection) onPickConnection({ a: conn.a, b: conn.b }); }}
            // A resting line takes the theme's --thread-rest (quieter on the
            // light paper than on black); lit and dimmed lines keep theirs.
            style={{transition:'opacity 220ms, stroke-width 220ms', cursor: 'pointer', ...(dimmed || emphasized ? {} : { opacity: 'var(--thread-rest)' }), ...(draw ? draw.style : {})}}
            className={draw ? draw.className : undefined}
            pathLength={draw ? draw.pathLength : undefined}
            fill="none"
            stroke={charObj.color}
            strokeWidth={strokeW}
            opacity={baseOpacity}
            strokeLinecap="round"
            filter={emphasized && !quiet ? 'url(#line-glow)' : undefined}
            pointerEvents="stroke"
            onMouseEnter={(e)=>onHoverConnection({a:conn.a,b:conn.b,characters:conn.characters,x:e.clientX,y:e.clientY})}
            onMouseLeave={()=>onHoverConnection(null)}
          />
          {emphasized && !quiet && (
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
  // Pushing labels apart can move one onto a card: step it just above or
  // below that card, whichever is nearer and free.
  labels.forEach(l => {
    const r = coveredBy(l.x, l.y, l.w, l.h);
    if (!r) return;
    const spots = [r.y1 + l.h / 2 + 2, r.y0 - l.h / 2 - 2].filter(y => !coveredBy(l.x, y, l.w, l.h))
      .sort((a, b) => Math.abs(a - l.y) - Math.abs(b - l.y));
    if (spots.length) l.y = spots[0];
  });

  const labelEls = labels.map(l => (
    <g key={'lbl_' + l.key} style={{pointerEvents:'none'}}>
      <rect x={l.x - l.w/2} y={l.y - l.h/2 + 2} width={l.w} height={l.h} rx={l.h/2} fill="#000" opacity="0.45"/>
      <rect x={l.x - l.w/2} y={l.y - l.h/2} width={l.w} height={l.h} rx={l.h/2}
        style={{ fill: 'var(--background)' }} stroke={l.color} strokeWidth="1.2" opacity="0.97"/>
      <circle cx={l.x - l.w/2 + 11} cy={l.y} r={3.5} fill={l.color}/>
      {/* The canvas's art size for a line of metadata (src/index.css). */}
      <text className="text-card-meta" x={l.x - l.w/2 + 20} y={l.y + 3.6} fontWeight="500" style={{ fill: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>{l.text}</text>
    </g>
  ));

  return (
    <>
    {routeEl}
    <svg className={S.THREADS} style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible'}}>
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
    {/* Labels above the cards (z-index: shell.tsx), so none hides behind one. */}
    <svg className={S.LABELS} style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible'}}>
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
// 'grid' (the phone's old Grid) is read as the List, for saved links.
const VIEW_MODE_VALUES = ['list', 'spatial'];
const DESKTOP_VIEW_VALUES = ['spatial', 'list'];

function readDisplayPrefs() {
  const prefs = { viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: DEFAULT_SORT_DIR.release, guidesPage: false };
  let parsed = null;
  try {
    parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) || 'null');
  } catch (e) {
    return prefs; // Storage disabled, or not valid JSON.
  }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== PREFS_VERSION) {
    // A first visit on a phone opens on Connections, the map, rather than the
    // list (Notion "First visit", Andre 2026-11-27: "On Connections"). Only the
    // welcome's first visit: a shared link never reaches here (it takes the
    // address's view). It is saved, so a reload or the next visit opens where
    // this one did; visitors from before keep their list default.
    if (window.MCU_WELCOME) { prefs.viewMode = 'spatial'; writeDisplayPrefs(prefs); }
    return prefs;
  }
  if (VIEW_MODE_VALUES.indexOf(parsed.viewMode) !== -1) prefs.viewMode = parsed.viewMode;
  if (DESKTOP_VIEW_VALUES.indexOf(parsed.desktopView) !== -1) prefs.desktopView = parsed.desktopView;
  if (Object.prototype.hasOwnProperty.call(DEFAULT_SORT_DIR, parsed.sort)) {
    prefs.sort = parsed.sort;
    prefs.sortDir = parsed.sortDir === 'asc' || parsed.sortDir === 'desc' ? parsed.sortDir : DEFAULT_SORT_DIR[parsed.sort];
  }
  prefs.guidesPage = parsed.guidesPage === true && prefs.desktopView === 'list';
  return prefs;
}

// Public exploration state in the address, so a view can be bookmarked or
// shared: the open title, a pinned character, the view, sort, order and the
// catalogue filters. Never the collection filter (it means something different
// to whoever opens the link), the search text, the language or anything from
// the account. The names avoid code / state / error, which the sign-in
// redirect uses (account.jsx stripAuthParams).
const URL_KEYS = ['view', 'sort', 'order', 'phase', 'type', 'budget', 'release', 'title', 'char', 'guide', 'explore'];
function readURLState() {
  const out = { any: false };
  let q;
  // The thing a link is about is in the path since Findability 3
  // (/guides/<id>, /titles/<id>, /characters/<id>); stateParams puts it back
  // under its key, so everything below reads one query, as before.
  try { q = stateParams(window.location.pathname, window.location.search); } catch (e) { return out; }
  out.any = URL_KEYS.some(k => q.has(k));
  const v = q.get('view'); if (v === 'grid') out.view = 'list'; else if (VIEW_MODE_VALUES.indexOf(v) !== -1 || v === 'guides') out.view = v;
  const s = q.get('sort'); if (Object.prototype.hasOwnProperty.call(DEFAULT_SORT_DIR, s)) out.sort = s;
  const o = q.get('order'); if (o === 'asc' || o === 'desc') out.order = o;
  // One phase or several (phase=3, phase=2,3), kept in order without repeats.
  const ph = q.get('phase'); if (/^[1-6](,[1-6])*$/.test(ph || '')) out.phase = [...new Set(ph.split(','))].sort().join(',');
  const ty = q.get('type'); if (ty === 'film' || ty === 'series') out.type = ty;
  const b = q.get('budget'); if (['low', 'mid', 'high', 'mega'].indexOf(b) !== -1) out.budget = b;
  if (q.get('release') === 'released') out.release = 'released';
  const t = q.get('title'); if (t && window.TITLES.some(x => x.id === t)) out.title = t;
  const c = q.get('char'); if (c && window.CHARACTERS && window.CHARACTERS[c]) out.char = c;
  const g = q.get('guide'); if (g && (window.GUIDES || []).some(x => x.id === g)) out.guide = g;
  // ?title=…&explore=thread opens that title's Follow the thread (Notion
  // "Link straight to a title's Follow the thread view"); only with a title.
  if (out.title && q.get('explore') === 'thread') out.explore = 'thread';
  return out;
}

// Writes the given state into the address without adding a history entry.
// history.state is passed through untouched: it carries the phone sheets'
// token (mobile.jsx sheetHistory), and replacing it would break their Back.
// MCU_stateParams: an address's state as one query, in either language (the
// QA checks read the open guide or title with it; Notion "Findability 6").
Object.assign(window, { MCU_phaseMatches: phaseMatches, MCU_filterMatches: filterMatches, MCU_stateParams: stateParams });

// The language addresses are written in: the one on screen.
function addressLang() {
  return window.MCU_I18N && window.MCU_I18N.lang === 'pt-BR' ? 'pt-BR' : 'en';
}

// Choosing another language moves the address to that language's version of
// the same page (/titles/iron-man ↔ /pt/titulos/homem-de-ferro), keeping the
// query and history.state, without a new history entry.
function rewriteAddressLang() {
  try {
    const url = new URL(window.location.href);
    const { pathname, search } = addressFor(stateParams(url.pathname, url.search), addressLang());
    const query = search.toString().replace(/%2C/gi, ',');
    const next = pathname + (query ? '?' + query : '') + url.hash;
    if (next !== url.pathname + url.search + url.hash) window.history.replaceState(window.history.state, '', next);
  } catch (e) { /* an out-of-date address is not worth a crash */ }
}
if (window.MCU_I18N && window.MCU_I18N.subscribe) window.MCU_I18N.subscribe(rewriteAddressLang);

function writeURLState(params) {
  try {
    const url = new URL(window.location.href);
    const q = stateParams(url.pathname, url.search);
    URL_KEYS.forEach(k => q.delete(k));
    Object.keys(params).forEach(k => q.set(k, params[k]));
    // The open title, else the guide, else the pinned character becomes the
    // path (src/share-card/addresses.ts); the rest stays in the query.
    // In the language on screen: /titles/iron-man or /pt/titulos/homem-de-ferro
    // (Notion "Findability 6").
    const { pathname, search } = addressFor(q, addressLang());
    // Phases stay readable in the address: phase=2,3, not phase=2%2C3.
    const query = search.toString().replace(/%2C/gi, ',');
    const next = pathname + (query ? '?' + query : '') + url.hash;
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
    const p = { viewMode: 'list', desktopView: 'spatial', sort: 'release', sortDir: DEFAULT_SORT_DIR.release, guidesPage: urlAtLoad.view === 'guides' };
    if (urlAtLoad.view) {
      const v = urlAtLoad.view === 'guides' ? 'list' : urlAtLoad.view;
      p.viewMode = v; p.desktopView = v;
    }
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
  // Desktop sections (Notion "Desktop: navigation for Explore, My list and
  // Guides"): Explore is the Spatial canvas, My list the List, and Guides
  // either the gallery of guides (guidesPage) or the open guide's own list.
  // Connections and Titles share one sort, one set of filters and one status
  // filter (Andre, 2026-11-16): what is applied in one stays applied in the
  // other, since both show the same catalog.
  const [guidesPage, setGuidesPage] = useState(!!initialPrefs.guidesPage);
  const prefsLoaded = useRef(false);
  useEffect(() => {
    if (!prefsLoaded.current) { prefsLoaded.current = true; return; }
    writeDisplayPrefs({ viewMode, desktopView, sort, sortDir, guidesPage });
  }, [viewMode, desktopView, sort, sortDir, guidesPage]);
  const [drawerId, setDrawerId] = useState(null);
  const drawerIdRef = useRef(null);
  drawerIdRef.current = drawerId;
  const [sheet, setSheet] = useState(null);
  // Desktop About dialog (phones use the 'about' sheet).
  const [aboutOpen, setAboutOpen] = useState(false);
  // Settings: a panel on desktop, a sheet on phones (sheet === 'settings').
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The list of keyboard shortcuts (? opens it; src/app/shortcuts.tsx).
  const [keysOpen, setKeysOpen] = useState(false);
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
  // Follow the thread or a character's trail (E 4/5), shown in place of the
  // details; declared here because the canvas layout reads it.
  const [explore, setExplore] = useState(null);
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
  const guideOptionalById = useRef({});
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
    window.burstConfetti(['var(--seen)', '#7cc46f', '#3d8a4a', '#b6e3a8', '#ffffff']);
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
  const lensFlightRef = useRef(null);
  const stopGlide = useCallback(() => {
    if (lensFlightRef.current) { clearTimeout(lensFlightRef.current); lensFlightRef.current = null; }
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
    const left = v.left + 24, right = v.right - (drawerIdRef.current ? drawerW() : 0) - 24;
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
    if (useFilters && phaseFilter !== 'all') list = list.filter(t => phaseMatches(t, phaseFilter));
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
  // before their own collection arrives.
  //
  // The compact card's ✕ (Connections and Titles, desktop and phones) hides
  // the card for this visit (Andre, 2026-11-15): plain state, nothing stored,
  // so a reload brings it back. It leaves Up next itself alone, so the list
  // still marks its row.
  const [cardHidden, setCardHidden] = useState(false);
  // Following and unfollowing re-pick the guide in focus.
  const [followedV, bumpFollowed] = useState(0);
  useEffect(() => (window.MCU_GUIDE && window.MCU_GUIDE.onFollowed ? window.MCU_GUIDE.onFollowed(() => bumpFollowed(v => v + 1)) : undefined), []);
  const upNextData = useMemo(() => {
    if (!collectionReady) return null;
    // An open guide scopes Up next to its stops, in guide order.
    if (guide) {
      const result = window.MCU_nextUp(guideStepTitles, statusOf, { ordered: true });
      return { result, lead: tr('guide.nextStop'), detail: window.MCU_GUIDE.short(guide), scoped: true, watchScope: false, guide: true };
    }
    if (search.trim() || collectionFilter === 'seen') return null;
    // The guide in focus (Guides 2/4): with a followed guide in focus and
    // nothing narrowing the view (a filter, the Watchlist tab, a pinned
    // character), Up next is that guide's next stop, as on the Guides page's
    // hero. Nothing followed, or nothing left in it to watch today: the
    // view's own order, as before.
    const unscoped = collectionFilter !== 'watchlist' && !pinnedTitleIds && phaseFilter === 'all' && typeFilter === 'all' && budgetFilter === 'all';
    const focus = unscoped && window.MCU_GUIDE ? window.MCU_GUIDE.focus(statusOf, window.todayISO()) : null;
    if (focus) {
      const stops = window.MCU_GUIDE.stops(focus, false).filter(s => !window.MCU_GUIDE.skippedNow(focus, s.id, statusOf)).map(s => s.title);
      const result = window.MCU_nextUp(stops, statusOf, { ordered: true });
      if (result.kind === 'next') return { result, lead: tr('guide.nextStop'), detail: window.MCU_GUIDE.short(focus), scoped: true, watchScope: false, guide: true, focusGuide: focus.id };
    }
    let list = window.TITLES.slice();
    if (phaseFilter !== 'all') list = list.filter(t => phaseMatches(t, phaseFilter));
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (budgetFilter !== 'all') list = list.filter(t => budgetMatches(t, budgetFilter));
    if (pinnedTitleIds) list = list.filter(t => pinnedTitleIds.has(t.id));
    const watchScope = collectionFilter === 'watchlist';
    // One rule for every surface (MCU_selectUpNext, tracking.tsx): the first
    // released, unseen title in the list's own order and direction, in the
    // tab (Watchlist: its first title), less this session's skips. The card
    // names the order it used.
    const result = window.MCU_selectUpNext({ titles: list, statusOf, collection: collectionFilter, order: sort, dir: sortDir });
    const who = pinnedActor || (highlightedChar ? I18N.charName(highlightedChar) : null);
    const lead = watchScope ? tr('upnext.fromWatchlist') : who ? tr('upnext.forChar', { name: who }) : tr('upnext.label');
    const parts = [tr(upNextOrderKey(sort, sortDir))];
    if (typeFilter !== 'all') parts.push(tr(typeFilter === 'film' ? 'type.films' : 'type.series'));
    if (phaseFilter !== 'all') parts.push(phaseFilter.split(',').map(n => tr('phase.label', { n })).join(', '));
    if (budgetFilter !== 'all') parts.push(tr('budget.' + budgetFilter));
    const scoped = watchScope || !!pinnedTitleIds || phaseFilter !== 'all' || typeFilter !== 'all' || budgetFilter !== 'all';
    return { result, lead, detail: parts.join(' · '), scoped, watchScope };
  }, [collectionReady, search, collectionFilter, phaseFilter, typeFilter, budgetFilter, pinnedTitleIds, pinnedActor, highlightedChar, sort, sortDir, collectionStates, lang, guide, guideStepTitles, followedV, skipsVersion]);

  const sortLayout = useMemo(() => computeLayout(filtered, sort, sortDir), [filtered, sort, sortDir, sort === 'title' ? lang : '']);
  // The guide line (Notion "Guide line: an open guide lays its stops out in a
  // line on Connections"): an open guide shows only its own titles, in its
  // order, one row, the destination last, as Follow the thread does; the rest
  // keep their places, so closing the guide glides everything back. Skipped
  // stops stay in the row with their dash. The camera, the route and stepping
  // all read this layout.
  const guideLineIds = useMemo(() => {
    if (!guide || !(isTouch ? viewMode === 'spatial' : desktopView === 'spatial')) return null;
    const ids = window.MCU_GUIDE.stops(guide, guideOptional).map(st => st.id);
    if (guide.target && !ids.includes(guide.target)) ids.push(guide.target);
    return ids.filter(id => window.TITLES.some(t => t.id === id));
  }, [guide, guideOptional, isTouch, viewMode, desktopView]);
  // The filter lens (Notion "Filter lens", 2026-11-17): with Seen, Unseen or
  // Watchlist on, Connections packs the matching titles into their own
  // timeline in the current order, and the rest fade out in place (as around
  // a ring), instead of dimming them on a canvas laid out for every title,
  // which only fit at about 20%. It replaces V3-SPEC §7.1's "status dims,
  // never removes" for these filters on the canvas (Andre's decision). §7.1's
  // reason still holds: marking a title while the lens is on must not reflow
  // the canvas under the cursor. So the lens takes its titles once, when the
  // filter (or the order, another filter, the collection's first load)
  // changes; a title marked meanwhile just dims, as before.
  const collStatesRef = useRef(collectionStates);
  collStatesRef.current = collectionStates;
  const lensOn = !guide && collectionFilter !== 'all' && (isTouch ? viewMode === 'spatial' : desktopView === 'spatial');
  const lensIds = useMemo(() => {
    if (!lensOn || !collectionReady) return null;
    const ids = filtered.filter(t => window.matchesCollection(collStatesRef.current[t.id] || 'none', collectionFilter, t)).map(t => t.id);
    return ids.length ? new Set(ids) : null;
  }, [lensOn, collectionFilter, collectionReady, filtered]);
  // The grid orders pack the lens into their grid. The timelines (release,
  // story) put it in one row in order, as the guide line does: each phase is
  // its own row there, so a few titles from different phases became a
  // staircase of single cards.
  const lensLayout = useMemo(() => {
    if (!lensIds) return null;
    const titles = filtered.filter(t => lensIds.has(t.id));
    const grid = sort === 'phase' || sort === 'title' || sort === 'imdb' || sort === 'rt';
    if (grid) return computeLayout(titles, sort, sortDir);
    const row = sortTitles(titles, sort, sortDir);
    const step = CARD_W + LINE_GAP, x0 = 240, y0 = 320;
    const positions = {};
    row.forEach((t, i) => { positions[t.id] = { x: x0 + i * step, y: y0 }; });
    return { ...computeLayout(titles, sort, sortDir), positions, bands: [], width: x0 * 2 + row.length * step, height: y0 * 2 + CARD_H };
  }, [lensIds, filtered, sort, sortDir, sort === 'title' ? lang : '']);
  // The character view (Notion "Character view: one view, their titles in a
  // row", 2026-11-18): a pinned character's titles (Their titles) in one row
  // in the current order, as the guide line and the filter lens do, instead
  // of each phase's row stepping down like stairs.
  const charLine = !!pinnedTitleIds && (charOnly || isTouch) && !guide && (isTouch ? viewMode === 'spatial' : desktopView === 'spatial');
  const charLineIds = useMemo(() => charLine ? sortTitles(filtered, sort, sortDir).map(t => t.id) : null,
    [charLine, filtered, sort, sortDir, sort === 'title' ? lang : '']);
  const layout = useMemo(() => {
    if (charLineIds && charLineIds.length && !lensLayout) {
      const step = CARD_W + LINE_GAP, x0 = 240, y0 = 320;
      const positions = { ...sortLayout.positions };
      charLineIds.forEach((id, i) => { positions[id] = { x: x0 + i * step, y: y0 }; });
      return { ...sortLayout, positions, bands: [], width: x0 * 2 + charLineIds.length * step, height: y0 * 2 + CARD_H };
    }
    if (lensLayout && !(guideLineIds && guideLineIds.length)) {
      // The titles left out keep their places (hidden), so clearing the
      // filter glides every card back.
      return { ...lensLayout, positions: { ...sortLayout.positions, ...lensLayout.positions } };
    }
    if (!guideLineIds || !guideLineIds.length) return sortLayout;
    const step = CARD_W + LINE_GAP, x0 = 240, y0 = 320;
    const positions = { ...sortLayout.positions };
    guideLineIds.forEach((id, i) => { positions[id] = { x: x0 + i * step, y: y0 }; });
    return { ...sortLayout, positions, bands: [], width: Math.max(sortLayout.width, x0 * 2 + guideLineIds.length * step), height: Math.max(sortLayout.height, y0 * 2 + CARD_H) };
  }, [sortLayout, guideLineIds, lensLayout, charLineIds]);
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
  // The ring's order: the titles sharing the most characters with the
  // selected one first. The first circle (RING_CAPS[0] titles) is what the
  // camera frames and what the lines label (Notion "Connections: a selected
  // title's ring, legible at first sight").
  const ringOrder = useMemo(() => {
    if (!focusId || !relatedIds) return null;
    const focusTitle = window.TITLES.find(t => t.id === focusId);
    const focusCast = new Set(focusTitle.cast.map(primeOf));
    return [...relatedIds].filter(id => id !== focusId).map(id => {
      const t = window.TITLES.find(x => x.id === id);
      return { id, shared: t.cast.filter(c => focusCast.has(primeOf(c))).length };
    }).sort((a, b) => b.shared - a.shared).map(x => x.id);
  }, [focusId, relatedIds]);

  // While a title's rings are showing, only it and its connected titles stay
  // on the canvas: the rest fade out in place (in the grids they would sit
  // under the rings), and the lines are drawn among the ring's titles alone.
  // An open guide keeps its own linear route: a selected title (details open,
  // or carried over from Titles) does not turn the canvas into its ring
  // (Andre, 2026-11-16).
  const ringIds = !isTouch && !guide && !pair && relatedIds && relatedIds.size > 1 ? relatedIds : null;
  const lineTitles = useMemo(() => {
    if (guideLineIds && guideLineIds.length) return guideLineIds.map(id => window.TITLES.find(t => t.id === id)).filter(Boolean);
    if (ringIds) return filtered.filter(t => ringIds.has(t.id));
    return lensIds ? filtered.filter(t => lensIds.has(t.id)) : filtered;
  }, [filtered, ringIds, guideLineIds, lensIds]);
  // The guide line shows only its own stops; the rest fade out in place,
  // as around a ring.
  const guideLineSet = useMemo(() => guideLineIds && guideLineIds.length ? new Set(guideLineIds) : null, [guideLineIds]);
  const shownIds = guideLineSet || ringIds || lensIds;
  // Counted over what the filters show (not the ring), so a card's number
  // holds while you move around a selection.
  const connCounts = useMemo(() => connectionCounts(filtered), [filtered]);

  // Desktop Connections with the thread open: the canvas lines up (above).
  const threadLine = !isTouch && desktopView === 'spatial' && !!explore && explore.kind === 'thread';

  // Phones (E 5/5): while a title's details are open over the canvas, the
  // canvas dims everything not connected to it and outlines it; nothing
  // moves, so closing leaves the canvas where it was.
  const phoneFocusId = isTouch && viewMode === 'spatial' && drawerId && !guide && !highlightedChar ? drawerId : null;

  // Hover-focus is separate: used only for dimming/labels, not reflow.
  const hoverFocusId = hoveredTitle || selectedId || phoneFocusId;
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
    // Desktop, following the thread: the title and its connected titles in
    // one row by release, the threads arcing below it (Andre, 2026-11-16:
    // the panel's list is the timeline, the canvas lines up with it).
    if (threadLine && !guide && focusId && relatedIds && relatedIds.size > 1) {
      const row = [...relatedIds].map(id => window.TITLES.find(t => t.id === id)).filter(Boolean)
        .sort((a, b) => String(a.release || '').localeCompare(String(b.release || '')) || a.id.localeCompare(b.id));
      const at = row.findIndex(t => t.id === focusId);
      const cx = 800, cy = 560, step = CARD_W + LINE_GAP;
      focusLayout = {};
      row.forEach((t, i) => { focusLayout[t.id] = { x: cx + (i - at) * step, y: cy }; });
    } else
    // An open guide keeps its linear route: no ring, as for ringIds (Andre,
    // 2026-11-16: a link with a title and a guide opened on the ring). Phones
    // have no ring at all (E 5/5): the canvas dims around the title instead.
    if (!isTouch && !guide && focusId && relatedIds && relatedIds.size > 1) {
      const scored = ringOrder.map(id => ({ id }));
      const cx = 800, cy = 560;
      const compact = isTouch;
      const ringCaps = compact ? [5, 9, 14, 20] : RING_CAPS;
      const ringRadii = compact ? [340, 600, 860, 1120] : [480, 800, 1120, 1440];
      const placed = { [focusId]: { x: cx, y: cy } };
      // The rings are ellipses, flatter than circles; they were tuned for a
      // 270px card, so their height grows with the card's (Notion "Show
      // posters uncropped": cards are taller), or neighbours overlap.
      const squash = 0.7 * CARD_H / 270;
      let idx = 0;
      for (let ring = 0; ring < ringCaps.length && idx < scored.length; ring++) {
        const cap = Math.min(ringCaps[ring], scored.length - idx);
        const r = ringRadii[ring];
        for (let k = 0; k < cap; k++) {
          const angle = (k / cap) * Math.PI * 2 + (ring % 2) * (Math.PI / cap);
          placed[scored[idx].id] = {
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r * squash,
          };
          idx++;
        }
      }
      // Neighbouring rings can still bring two cards together where one's
      // angle meets the other's: push the outer one away from the centre
      // until they clear (a few passes settle every ring).
      // The centre card counts as an obstacle but never moves.
      const ids = Object.keys(placed);
      const gapX = CARD_W + 28, gapY = CARD_H + 28;
      for (let pass = 0; pass < 12; pass++) {
        let moved = false;
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = placed[ids[i]], b = placed[ids[j]];
            if (Math.abs(a.x - b.x) >= gapX || Math.abs(a.y - b.y) >= gapY) continue;
            const da = Math.hypot(a.x - cx, a.y - cy), db = Math.hypot(b.x - cx, b.y - cy);
            const o = da > db ? a : b, d = Math.max(da, db) || 1;
            if (o === placed[focusId]) continue;
            const need = Math.min(gapX - Math.abs(a.x - b.x), gapY - Math.abs(a.y - b.y)) + 4;
            o.x += (o.x - cx) / d * need; o.y += (o.y - cy) / d * need;
            moved = true;
          }
        }
        if (!moved) break;
      }
      focusLayout = placed;
    }

    Object.entries(basePositions).forEach(([id, p]) => {
      const o = overrides[id];
      const f = focusLayout && focusLayout[id];
      out[id] = o ? { x: o.x, y: o.y } : (f ? { x: f.x - CARD_W/2, y: f.y - CARD_H/2 } : p);
    });
    return out;
  }, [basePositions, overrides, focusId, relatedIds, ringOrder, isTouch, pair, guide, threadLine]);

  // Keep the title the app points at in view (Notion "Keep the highlighted
  // title in view", 2026-11-17): one rule for stepping through a character's
  // titles and the thread list's hover and focus. Reads where the card really
  // is (a ring, a trail or the thread's row move cards off their base
  // places), and the room left by the bars, the details panel, the zoom
  // control and anything docked at the bottom. A card fully inside that room
  // keeps the camera still; a cropped one is panned just far enough in, with
  // a margin; the camera zooms out only when the card can't fit at all.
  // Reduce motion jumps. A press or wheel stops the glide (stopCamera).
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const followCard = (id) => {
    const vp = viewportRef.current;
    const p = positionsRef.current && positionsRef.current[id];
    if (!vp || !p) return;
    const rect = vp.getBoundingClientRect();
    let left = 24, right = rect.width - 24, top = isTouch ? 56 : 52, bottom = rect.height - (isTouch ? 16 : 60);
    if (!isTouch && drawerIdRef.current) right -= drawerW();
    if (isTouch) {
      document.querySelectorAll('.g-dock, .char-pill, .char-card.docked, .spatial-overall.docked').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height && r.top > rect.top + rect.height / 2) bottom = Math.min(bottom, r.top - rect.top - 12);
      });
    }
    const v = viewRef.current;
    let scale = v.scale;
    const fit = Math.min((right - left) / CARD_W, (bottom - top) / CARD_H);
    if (scale > fit) scale = fit;
    const cl = v.x + p.x * scale, ct = v.y + p.y * scale;
    const cr = cl + CARD_W * scale, cb = ct + CARD_H * scale;
    let dx = 0, dy = 0;
    if (cl < left) dx = left - cl; else if (cr > right) dx = right - cr;
    if (ct < top) dy = top - ct; else if (cb > bottom) dy = bottom - cb;
    if (!dx && !dy && scale === v.scale) return;
    const next = { x: v.x + dx, y: v.y + dy, scale };
    if (window.MCU_MOTION.reduced()) setView(next); else glideTo(next);
  };
  // A step asks for the follow; it runs once the step has rendered, so it
  // reads the card's place in the new layout.
  const followPendingRef = useRef(null);
  useLayoutEffect(() => {
    const id = followPendingRef.current;
    if (!id) return;
    followPendingRef.current = null;
    followCard(id);
  });

  // Reset overrides when sort/filter changes the layout
  useEffect(() => { setOverrides({}); }, [sort, sortDir, phaseFilter, typeFilter, budgetFilter, releaseFilter, search]);

  const selectedTitle = selectedId ? window.TITLES.find(t => t.id === selectedId) : null;
  const drawerTitle = drawerId ? window.TITLES.find(t => t.id === drawerId) : null;
  // The details' back stack (Notion "Explore E 2/5"): hopping to another
  // title from inside the details (a poster in Cast and connections, a row in
  // the thread or a trail) pushes where you were, and ‹ names it and goes
  // back, to the thread or trail too (E 4/5). Opening a title any other way,
  // or closing the details, starts over.
  const [detailBack, setDetailBack] = useState([]);
  const hoppingRef = useRef(false);
  // Follow the thread and a character's trail (Notion "Explore E 4/5") take
  // the details' place: in the desktop panel and in the phone sheet, full
  // height. The details' title (drawerId) stays put underneath; a new title,
  // or closing, leaves them, unless ‹ is bringing one back.
  const exploreRestoreRef = useRef(null);
  useEffect(() => {
    const restore = exploreRestoreRef.current;
    exploreRestoreRef.current = null;
    setExplore(restore);
    if (hoppingRef.current) { hoppingRef.current = false; return; }
    setDetailBack([]);
  }, [drawerId]);
  const hopTo = (id) => {
    if (!drawerId || id === drawerId) return;
    hoppingRef.current = true;
    setDetailBack(b => b.concat({ id: drawerId, explore }));
    setDrawerId(id);
    // Desktop Connections: the canvas follows the details (a pinned
    // character keeps their row: no ring).
    if (!isTouch && desktopView === 'spatial' && !highlightedChar) setSelectedId(id);
  };
  const hopBack = () => {
    const prev = detailBack[detailBack.length - 1];
    if (!prev) return;
    hoppingRef.current = true;
    exploreRestoreRef.current = prev.explore || null;
    setDetailBack(b => b.slice(0, -1));
    setDrawerId(prev.id);
    if (!isTouch && desktopView === 'spatial' && !highlightedChar) setSelectedId(prev.id);
  };
  window.MCU_hopTitle = hopTo;
  // Desktop: a poster hovered in Cast and connections marks its card; the
  // person's block keeps their thread lit (Andre, 2026-11-16).
  const [peekId, setPeekId] = useState(null);
  window.MCU_peekTitle = (id) => setPeekId(id);
  useEffect(() => { setPeekId(null); }, [drawerId]);
  const backEntry = detailBack.length ? detailBack[detailBack.length - 1] : null;
  const backTitle = backEntry ? window.TITLES.find(t => t.id === backEntry.id) : null;
  // ‹ back to a trail names the character; to anything else, the title.
  const detailBackProp = backTitle ? {
    label: backEntry.explore && backEntry.explore.kind === 'trail' ? I18N.charName(backEntry.explore.char) : I18N.titleName(backTitle),
    onBack: hopBack,
  } : null;
  const exploreDesk = !isTouch && desktopView === 'spatial';
  // The character view: on the desktop canvas a character from the cast opens
  // straight onto their titles in a row (pinned, `?char=`), with their trail
  // in the panel; ‹ goes back to the title, unpinned. Phones and Titles keep
  // the trail on its own, with its pin button.
  const charView = !!explore && explore.kind === 'trail' && !!highlightedChar && highlightedChar === explore.char;
  const exploreLeave = () => {
    // A pinned character's trail closes back to the details of the title it
    // was opened on; the card and the row stay.
    if (charView) { setExplore(null); return; }
    setExplore(null); if (exploreDesk && drawerId) setSelectedId(drawerId);
  };
  const exploreProps = {
    explore,
    onThread: () => { setHoveredCharacter(null); setPeekId(null); setExplore({ kind: 'thread' }); },
    onTrail: (ch) => {
      setHoveredCharacter(null); setPeekId(null);
      // Desktop Connections pins them straight away: their row on the canvas,
      // their card as the stepper, and the panel keeps this title's details
      // as the current one. Their trail opens from the card's photo.
      if (exploreDesk) { pinSubject([ch], null, drawerId); return; }
      setExplore({ kind: 'trail', char: ch, from: drawerId });
    },
    onLeave: exploreLeave,
    // A row in the thread or a trail opens that title's details; ‹ comes back
    // to the list (Andre, 2026-11-16: no path built inside the panel, which
    // would only re-create the canvas).
    onOpen: (id) => {
      setPeekId(null);
      if (charView) {
        // A row steps there and opens its details; ‹ (the character's name)
        // comes back to the trail.
        stepTo(id, { details: false });
        hoppingRef.current = id !== drawerId;
        setDetailBack(b => b.concat({ id: drawerId, explore }));
        if (id !== drawerId) setDrawerId(id); else setExplore(null);
        return;
      }
      if (id !== drawerId) hopTo(id); else exploreLeave();
    },
  };
  // Desktop: the trail's character stays lit on the canvas, around the title
  // it started from.
  const trailChar = !isTouch && explore && explore.kind === 'trail' ? explore.char : null;
  const ordered = useMemo(() => sortTitles(filtered, sort, sortDir), [filtered, sort, sortDir, sort === 'title' ? lang : '']);

  // Real filtering, but only for the flat mobile grid/list — they have no layout
  // or viewport to disturb. Derived from `ordered` so the canvas keeps every card.
  const visible = useMemo(() => {
    if (collectionFilter === 'all') return ordered;
    return ordered.filter(t => window.matchesCollection(collectionStates[t.id] || 'none', collectionFilter, t));
  }, [ordered, collectionFilter, collectionStates]);

  // The filter lens's anchor, where its camera lands (resetView): the last
  // seen title in order for Seen (where you left off), else the first (the
  // next to watch).
  const lensAnchorRef = useRef(null);
  lensAnchorRef.current = useMemo(() => {
    if (!lensIds) return null;
    const inLens = ordered.filter(t => lensIds.has(t.id));
    if (!inLens.length) return null;
    return (collectionFilter === 'seen' ? inLens[inLens.length - 1] : inLens[0]).id;
  }, [lensIds, ordered, collectionFilter]);

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

  const activeChar = highlightedChar || hoveredCharacter || trailChar;
  // Every character the highlight covers, so a performer's whole cast list and
  // all their connection threads light up, not just the representative one.
  const activeChars = useMemo(() => {
    if (highlightedChar) return pinnedChars;
    const c = hoveredCharacter || trailChar;
    return c ? [c] : null;
  }, [highlightedChar, pinnedChars, hoveredCharacter, trailChar]);
  // Who each title is here for, for the quiet marker on rows and cards
  // (CharMark in list-parts.tsx; Notion "Titles: show the picked character on
  // each of their title rows", design v2/v3, Andre 2026-11-24). A typed search
  // wins over a pick, so the two never show at once.
  //   search  each title's own matches, grouped by character (a recast's
  //           Peters read "Peter Parker" once); a character matched only by
  //           its actor's credit names the actor, who is what matched.
  //   pick    the picked character's portrayals in that title, the picked one
  //           first, named once; the performer only when the one portrayal
  //           there isn't the picked performer ("Bruce Banner · Edward
  //           Norton"). A performer of several characters (pinnedActor) shows
  //           the one they play in each title.
  // A title matched only by its own name has no entry and keeps its year.
  const charMarks = useMemo(() => {
    const credit = (t, c) => window.MCU_credit(t, c);
    const q = search.trim();
    if (q && searchCharMatches) {
      const fq = I18N.fold(q);
      const byName = c => I18N.charNames(c).some(n => I18N.fold(n).includes(fq));
      const out = {};
      window.TITLES.forEach(t => {
        const chars = searchCharMatches[t.id];
        if (!chars || !chars.length) return;
        const groups = [];
        chars.forEach(c => {
          const p = primeOf(c);
          let g = groups.find(x => x.prime === p);
          if (!g) { g = { prime: p, chars: [], named: false }; groups.push(g); }
          g.chars.push(c);
          if (byName(c)) g.named = true;
        });
        out[t.id] = {
          query: q,
          groups: groups.map(g => {
            // The family's name, unless only a variant's own name matched
            // ("raimi" finds "Peter Parker (Raimi)").
            const family = I18N.charName(g.prime);
            const name = !g.named || g.chars.includes(g.prime) || I18N.fold(family).includes(fq) ? family : I18N.charName(g.chars[0]);
            return { chars: g.chars, name, actor: g.named ? null : credit(t, g.chars[0]), actorMatched: !g.named };
          }),
        };
      });
      return out;
    }
    if (!highlightedChar) return null;
    const out = {};
    if (pinnedActor) {
      const mine = pinnedChars || [];
      window.TITLES.forEach(t => {
        const chars = t.cast.filter(c => mine.includes(c) && credit(t, c) === pinnedActor);
        if (chars.length) out[t.id] = { groups: chars.map(c => ({ chars: [c], name: I18N.charName(c), actor: null, actorMatched: false })) };
      });
      return out;
    }
    const prime = primeOf(highlightedChar);
    const usual = window.CHARACTERS[highlightedChar].actor;
    window.TITLES.forEach(t => {
      const chars = t.cast.filter(c => primeOf(c) === prime).sort((a, b) => (b === highlightedChar ? 1 : 0) - (a === highlightedChar ? 1 : 0));
      if (!chars.length) return;
      const actor = chars.length === 1 && credit(t, chars[0]) !== usual ? credit(t, chars[0]) : null;
      out[t.id] = { groups: [{ chars, name: I18N.charName(prime), actor, actorMatched: false }] };
    });
    return out;
  }, [search, searchCharMatches, highlightedChar, pinnedActor, pinnedChars, lang]);
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
        if (window.matchesCollection(collectionStates[t.id] || 'none', collectionFilter, t)) s.add(t.id);
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
  // An open guide is framed on its next stop (or its first, once complete)
  // rather than the whole route, on phones and on desktop (Notion "Guide view
  // zooms out to 17%": fitting every stop landed at an unreadable zoom).
  // Read through a ref for the same reason.
  const guideFrameRef = useRef(null);
  const charFrameRef = useRef(null);
  // Phones fit the guide's whole path instead (E 5/5): its stops' ids.
  guideFrameRef.current = guide
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

  // opts.fit frames a strip's whole set (the filter lens's matches, a pinned
  // character's titles, a guide's route) rather than its anchor; opts.glide
  // moves the camera there smoothly; opts.dry only works the view out and
  // returns it (flyIn compares the two legs); opts.drawer keeps the desktop
  // details panel's width clear even before it has opened.
  const resetView = useCallback((opts: { fit?: boolean; glide?: boolean; dry?: boolean; drawer?: boolean } = {}) => {
    // Every framing goes through here, so a later reframe can tell whether
    // the visitor has moved the camera since.
    const frame = (v) => {
      if (opts.dry) return v;
      lastResetViewRef.current = v;
      if (opts.glide) glideTo(v); else setView(v);
      return v;
    };
    if (!viewportRef.current) return null;
    if (!opts.dry) {
      // A layout change or Recenter supersedes any remembered pre-selection view.
      selectionReturnRef.current = null;
      cameraFramedRef.current = true;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    // The landing zoom every strip lands and steps at (landScale, above).
    const land = landScale(rect.width, isTouch);
    // Desktop: the room left of the details panel, when it is (or is about
    // to be) open.
    const side = !isTouch && (opts.drawer || drawerIdRef.current) ? drawerW() : 0;
    // Phones: the room above whatever is docked at the bottom.
    const bottom = isTouch ? dockTop(viewportRef.current, rect) : rect.height;
    const colW = CARD_W + 60;
    const gridSort = sort === 'phase' || sort === 'title' || sort === 'imdb' || sort === 'rt';
    // Height of the floating chrome at the top of the viewport that content has
    // to clear. Desktop: the count pill (the whole-catalogue meter sits in the
    // top-right corner there, out of the way). Phone: the count pill and zoom
    // control share the first row, so the meter takes a row of its own beneath
    // them in every order but By Phase.
    // Phones: the count pill at the top of the canvas (the All titles meter
    // that sat under it moved into the card docked at the bottom; Notion
    // "Titles 4/5").
    const chromeTop = isTouch ? 44 : 52;

    // The scale this sort opens at with no filter applied. Used as the yardstick
    // below: framing a match set is only an improvement if it doesn't mean
    // zooming out past the view you'd have had anyway.
    const defaultScale = gridSort
      ? Math.min(1, isTouch
          ? Math.max((rect.width - 32) / canvasW, rect.width / (colW * 3))
          : (rect.width - 32) / canvasW)
      // Timeline layouts open at about 7.5 titles across on desktop and 2.5 on
      // touch (one title step is CARD_W * 1.15), capped at 100%.
      : isTouch ? (phoneZoom || phoneReadScale(rect.width)) : Math.max(ZOOM_MIN, deskReadScale(rect.width));

    // Phones, a guide open: its next stop, centred at the readable zoom this
    // layout opens at, between the top chrome and the guide pill. The route
    // line leads on to the other stops.
    const guideStop = !selectedIdRef.current && !opts.fit ? guideFrameRef.current : null;
    const gp = guideStop && basePositions[guideStop];
    // Desktop: the reading zoom this order opens at (never the fit-everything
    // zoom), the stop centred below the guide's module at the top; the guide's
    // arrows step on from there, and − / Fit still show the whole route.
    if (gp && !isTouch) {
      const scale = Math.max(land, 0.5);
      const top = chromeTop + (deskGuideRef.current ? 72 : 0), pad = 24;
      return frame({
        x: (rect.width - side) / 2 - (gp.x + CARD_W / 2) * scale,
        y: top + (rect.height - top - pad) / 2 - (gp.y + CARD_H / 2) * scale,
        scale,
      });
    }
    // Phones: the guide's next stop at the reading zoom, like every other
    // order (Andre, 2026-11-17). The canvas used to zoom out to fit the
    // guide's whole path (Notion "Explore E 5/5"); since the guide line puts
    // the stops in one row, that fit was a row of thumbnails. ‹ › and the
    // route line lead on along the row.
    if (gp) {
      // In a guide the phone canvas has no top chrome (the count, meter and
      // zoom control step aside); the dock covers the bottom. The landing
      // zoom, as everywhere (it was 85% here until 2026-11-18), with the
      // stop's neighbours peeking in at the sides.
      const top = 12;
      return frame({
        x: rect.width / 2 - (gp.x + CARD_W / 2) * land,
        y: top + (bottom - top) / 2 - (gp.y + CARD_H / 2) * land,
        scale: land,
      });
    }

    // A pinned character: the title the stepper is on, or their first in the
    // current order, at the landing zoom and where a step puts it (stepTo):
    // centred left of the details panel on desktop, above the docked card on
    // phones. Pinning flies in to it over their whole row (flyIn).
    const charStop = !selectedIdRef.current && !opts.fit ? charFrameRef.current : null;
    const cp = charStop && basePositions[charStop];
    if (cp) {
      return frame({
        x: (rect.width - side) / 2 - (cp.x + CARD_W / 2) * land,
        y: bottom / 2 - (cp.y + CARD_H / 2) * land,
        scale: land,
      });
    }

    // Phones, once you've started (at least one title Seen): each order opens
    // on your Up next title, centred between the top chrome and the compact
    // card docked at the bottom, at the phone's reading zoom (the same in every order), its
    // neighbours peeking in. A dimming filter
    // frames its matches instead (below), and first-time visitors and anyone
    // caught up keep the bird's-eye view of the order's start.
    const upStop = isTouch && !selectedIdRef.current && !opts.fit && !(recenterFocusRef.current && recenterFocusRef.current.size)
      ? upNextFrameRef.current : null;
    const up = upStop && basePositions[upStop];
    if (up) {
      const scale = phoneZoom || phoneReadScale(rect.width);
      const dock = viewportRef.current.closest('.m-main');
      const card = dock && dock.querySelector('.spatial-overall.docked');
      const cr = card && card.getBoundingClientRect();
      const bottom = cr && cr.height ? cr.top - rect.top - 8 : rect.height - 14;
      const top = chromeTop;
      return frame({
        x: rect.width / 2 - (up.x + CARD_W / 2) * scale,
        y: top + (bottom - top) / 2 - (up.y + CARD_H / 2) * scale,
        scale,
      });
    }

    // The filter lens lands on its anchor at the reading zoom (Watchlist and
    // Unseen: the first title in order, the next to watch; Seen: the last,
    // where you left off), centred above whatever is docked at the bottom.
    // Its whole set is the flight's first leg (opts.fit, below).
    const anchor = !selectedIdRef.current && !opts.fit ? lensAnchorRef.current : null;
    const ap = anchor && basePositions[anchor];
    if (ap) {
      const scale = isTouch ? (phoneZoom || phoneReadScale(rect.width)) : Math.max(ZOOM_MIN, deskReadScale(rect.width));
      let bottom = rect.height - (isTouch ? 14 : 24);
      if (isTouch) {
        const dock = viewportRef.current.closest('.m-main');
        const card = dock && dock.querySelector('.spatial-overall.docked');
        const cr = card && card.getBoundingClientRect();
        if (cr && cr.height) bottom = cr.top - rect.top - 8;
      }
      return frame({
        x: rect.width / 2 - (ap.x + CARD_W / 2) * scale,
        y: chromeTop + (bottom - chromeTop) / 2 - (ap.y + CARD_H / 2) * scale,
        scale,
      });
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
        // Phones keep the strip above the docked card; desktop keeps it left
        // of the details panel.
        const below = rect.height - bottom;
        // Always fit the whole match set, however far apart it is. On the
        // release and chronological layouts two matches at opposite ends only
        // fit at around 9%, which is small — but seeing where everything is and
        // zooming in beats being shown a subset with no clue the rest exists.
        // ZOOM_MIN is the only floor.
        const scale = Math.min(1, Math.max(ZOOM_MIN, Math.min(
          (rect.width - side - pad * 2) / w,
          (rect.height - topIn - below - pad * 2) / h
        )));
        return frame({
          x: (rect.width - side) / 2 - (fx0 + w / 2) * scale,
          y: topIn + (rect.height - topIn - below) / 2 - (fy0 + h / 2) * scale,
          scale,
        });
      }
    }

    // Desktop: the zoom control sits in the bottom-left corner (about 46px
    // with its margin), which the timelines leave empty as they step down to
    // the right; a grid that fits is centered above it (Notion "Spatial: the
    // zoom control overlaps title cards").
    const zoomReserve = isTouch ? 0 : 52;
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
      return frame({ x: 14 - xs[0] * scale, y: (best ? best.top : 14) - ys[0] * scale, scale });
    } else if (gridSort) {
      // Grid layouts: match the grid's width (mobile keeps a legibility floor of ~3 columns)
      const scale = defaultScale;
      const rectH = rect.height - zoomReserve;
      const zoomed = canvasW * scale > rect.width - 32;
      // By Phase is the one grid layout with band labels: leave room above the
      // first row for its pill, below the count pill, as the timelines do.
      const top = sort === 'phase' ? chromeTop + BAND_LABEL_H * scale : 14;
      return frame({
        x: zoomed ? 14 - minX * scale : (rect.width - canvasW * scale) / 2,
        y: canvasH * scale <= rectH - 32 ? (rectH - canvasH * scale) / 2 : top - minY * scale,
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
      const rectH = rect.height - zoomReserve;
      let y = top - minY * scale;
      if (isFinite(y0)) {
        const yTop = y0 - BAND_LABEL_H;
        if ((y1 - yTop) * scale <= rectH - 28 - pill) {
          y = Math.max(rectH / 2 - ((yTop + y1) / 2) * scale, pill - yTop * scale);
        } else {
          y = top - y0 * scale;
          if (leading && (leading.y + CARD_H) * scale + y > rectH - 14) y = rectH - 14 - (leading.y + CARD_H) * scale;
        }
      }
      return frame({ x: 14 - minX * scale, y, scale });
    }
  }, [canvasW, canvasH, basePositions, sort, isTouch, glideTo]);
  const resetViewRef = useRef(resetView);
  resetViewRef.current = resetView;

  // The flight every strip lands with (Notion "Spatial: one landing for every
  // strip", Andre, 2026-11-18; first the filter lens's, 2026-11-17): out to
  // the whole strip, a beat, then in to its anchor at the landing zoom. A
  // strip that already shows at about that zoom, or Reduce motion, lands
  // straight away. A press, touch or wheel stops it (stopGlide). A canvas
  // nobody has framed yet starts on the whole strip rather than gliding out
  // to it.
  const FLY_HOLD = 1000;
  const flyIn = (opts: { drawer?: boolean } = {}) => {
    clearTimeout(lensFlightRef.current);
    lensFlightRef.current = null;
    const there = resetView({ ...opts, dry: true });
    if (!there) return;
    const strip = recenterFocusRef.current;
    const whole = strip && strip.size > 1 && !window.MCU_MOTION.reduced() ? resetView({ ...opts, fit: true, dry: true }) : null;
    if (!whole || whole.scale >= there.scale * 0.9) { resetView({ ...opts, glide: cameraFramedRef.current && !window.MCU_MOTION.reduced() }); return; }
    resetView({ ...opts, fit: true, glide: cameraFramedRef.current });
    lensFlightRef.current = setTimeout(() => { lensFlightRef.current = null; resetViewRef.current({ ...opts, glide: true }); }, FLY_HOLD);
  };

  // Reset view whenever layout changes
  useLayoutEffect(() => { if (!pendingStepRef.current) frameCanvas(); }, [resetView]);

  // Recentering because the user changed a filter is intentional. Recentering
  // because the *contents* of the match set changed — someone marked a title
  // seen — is the bug §7.1 describes, so this keys off the filter identity
  // only and never off the matched ids.
  const prevFocusKey = useRef(null);
  // A layout effect, so the lens's flight starts before the first paint (the
  // layout effect above has already put the camera on the anchor).
  useLayoutEffect(() => {
    const key = `${collectionFilter}|${highlightedChar || ''}`;
    if (prevFocusKey.current === null) { prevFocusKey.current = key; return; }
    if (prevFocusKey.current === key) return;
    prevFocusKey.current = key;
    clearTimeout(lensFlightRef.current);
    // A selected card owns the viewport — the ring-layout auto-fit below is
    // driving it, and stepping on that would fight it mid-animation.
    if (selectedIdRef.current || pendingStepRef.current) return;
    // The filter lens lands in one motion (Andre, 2026-11-17: start zoomed
    // out, then zoom in): out to the whole packed set while the cards pack,
    // a beat, then in to the anchor at the reading zoom. A press, touch or
    // wheel stops it (stopGlide). Reduce motion goes straight to the anchor.
    if (lensAnchorRef.current) { flyIn(); return; }
    resetView();
  }, [collectionFilter, highlightedChar, resetView]);
  useEffect(() => () => clearTimeout(lensFlightRef.current), []);

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
    if (!selectedIdRef.current && !pendingStepRef.current) frameCanvas();
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
    else centreOn(isTouch ? (phoneZoom || phoneReadScale(rect.width)) : Math.max(v ? v.scale : 0, deskReadScale(rect.width)));
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
      window.MCU_scrollInArea(target, 'nearest', !stepReducedMotion());
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
      // No ring on phones (E 5/5): fly to the card (Up next, See connections)
      // at the visit's zoom, centered above whatever is docked at the bottom.
      if (!p0) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const scale = phoneZoom || phoneReadScale(rect.width);
      let bottom = rect.height;
      document.querySelectorAll('.g-dock, .char-pill, .char-card.docked, .spatial-overall.docked').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height && r.top > rect.top) bottom = Math.min(bottom, r.top - rect.top - 8);
      });
      glideTo({
        x: rect.width / 2 - (p0.x + CARD_W/2) * scale,
        y: bottom / 2 - (p0.y + CARD_H/2) * scale,
        scale,
      });
      return;
    }
    // Following the thread: the row centered on the title beside the panel,
    // about five and a half cards across, the next one cut by the edge so the
    // row reads as going on (Andre, 2026-11-16); the rest is a pan away.
    if (threadLine && !guide) {
      if (!p0) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const w = rect.width - drawerW();
      const scale = Math.max(0.4, Math.min(1, w / (5.5 * (CARD_W + LINE_GAP))));
      // Centered on the title, unless that leaves room empty at an end of
      // the row (Thor comes first in its own thread): then the row starts
      // or ends at the edge, and a row that fits is centered whole.
      let x0 = Infinity, x1 = -Infinity;
      relatedIds.forEach(id => { const p = positions[id]; if (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x + CARD_W); } });
      const pad = 24;
      let x = w / 2 - (p0.x + CARD_W / 2) * scale;
      if ((x1 - x0) * scale <= w - pad * 2) x = w / 2 - (x0 + x1) / 2 * scale;
      else x = Math.min(pad - x0 * scale, Math.max(w - pad - x1 * scale, x));
      // The arcs hang below the row, so the row sits a little above center.
      glideTo({ x, y: rect.height / 2 - (p0.y + CARD_H / 2 + ARC_MAX / 2) * scale, scale });
      return;
    }
    // An open guide keeps its route (no ring): centre the selected card left
    // of the details, below the guide's card, at a readable zoom.
    if (guide) {
      if (!p0) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const v = viewRef.current, w = rect.width - drawerW();
      // A card already in view (a click on the canvas) stays where it is.
      const left = p0.x * v.scale + v.x, top = p0.y * v.scale + v.y;
      if (left >= 8 && top >= 8 && left + CARD_W * v.scale <= w - 8 && top + CARD_H * v.scale <= rect.height - 8) return;
      const scale = Math.max(v.scale, deskReadScale(rect.width));
      setView({ x: w / 2 - (p0.x + CARD_W / 2) * scale, y: 36 + (rect.height - 36) / 2 - (p0.y + CARD_H / 2) * scale, scale });
      return;
    }
    // The selected title and its first circle, not every circle: the outer
    // ones run off the edges at a readable zoom (Andre, 2026-11-16).
    const ids = [selectedId, ...(ringOrder || []).slice(0, RING_CAPS[0])];
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
    const drawerOffset = drawerW();
    // An open guide's module floats over the top: fit the ring below it.
    const topIn = deskGuideRef.current ? 72 : 0;
    const availW = rect.width - drawerOffset - 80;
    const availH = rect.height - topIn - 80;
    const w = maxX - minX, h = maxY - minY;
    const scale = Math.max(0.45, Math.min(availW / w, availH / h, 0.85));
    setView({
      x: (rect.width - drawerOffset) / 2 - (minX + w/2) * scale,
      y: topIn + (rect.height - topIn) / 2 - (minY + h/2) * scale,
      scale,
    });
  }, [selectedId, relatedIds, isTouch, guide, threadLine]);
  // Following the thread: a row hovered or focused in the panel brings its
  // card into view as soon as it is cropped (scanning the list stays calm).
  // Not in the first moments: the pointer that pressed Follow the thread
  // lands on a row as the list appears, which is not a request to move.
  const lineSinceRef = useRef(0);
  useEffect(() => { if (threadLine) lineSinceRef.current = performance.now(); }, [threadLine]);
  useEffect(() => {
    if (!threadLine || !peekId || !viewportRef.current) return undefined;
    if (performance.now() - lineSinceRef.current < 900) return undefined;
    // A short beat, so running the pointer down the list doesn't jitter the
    // camera; a card partly cropped counts (the follow rule, above).
    const id = setTimeout(() => followCard(peekId), 120);
    return () => clearTimeout(id);
  }, [peekId, threadLine]);

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
    // A pinch sets the zoom for the rest of the visit (E 5/5).
    if (s && s.mode === 'pinch') phoneZoom = viewRef.current.scale;
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
      // Double-tap on empty canvas switches between the overview and a
      // closer, reading view, about the point tapped (E 5/5).
      peekZoom();
      const rect = viewportRef.current.getBoundingClientRect();
      const mx = s.sx - rect.left, my = s.sy - rect.top;
      const over = phoneOverviewScale(rect.width), close = phoneReadScale(rect.width);
      const v = viewRef.current;
      const ns = v.scale < (over + close) / 2 ? close : over;
      const r = ns / v.scale;
      phoneZoom = ns;
      glideTo({ x: mx - (mx - v.x) * r, y: my - (my - v.y) * r, scale: ns });
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
    // Phones (E 5/5): a tap opens the details, with no focus ring; the
    // canvas dims around the title behind the sheet (phoneFocusId) and stays
    // where it is.
    setDrawerId(id);
  };

  // Collection has its own switch in the header, so the Filters badge skips it.
  // Grid and List animate when any of these change: sort, order, collection,
  // phase, films/series and budget. Search is left out so typing stays calm.
  // What the cards' meta line shows for this sort and these filters.
  const cardFacet = window.cardFacet(sort, { budget: budgetFilter });
  const flipKey = [sort, sortDir, collectionFilter, phaseFilter, typeFilter, budgetFilter, releaseFilter].join(':');
  const filterCount = (collectionFilter !== 'all' ? 1 : 0) + (phaseFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (budgetFilter !== 'all' ? 1 : 0) + (releaseFilter !== 'all' ? 1 : 0);
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
    onHide: () => setCardHidden(true),
  };
  // Announce a new suggestion politely once the previous one was marked seen
  // (the toast already announces the mark itself).
  const upNextId = upNext && upNext.result.kind === 'next' ? upNext.result.title.id : null;
  // The card the Up next card or a guide's dock names, marked on the canvas;
  // it goes with the Up next card when that is hidden for the visit.
  // Up next's outline belongs to the strip on screen (Notion "Connections: Up
  // next's outline follows the open strip", Andre, 2026-11-18): a guide's
  // next stop and a pinned character's first unseen title come scoped above;
  // Follow the thread outlines the thread's first unseen title in the row's
  // order, not the All titles one (a followed guide's next stop, say).
  const threadUpId = useMemo(() => {
    if (!threadLine || guide || !relatedIds || relatedIds.size < 2 || !collectionReady) return null;
    const row = [...relatedIds].filter(id => positions[id]).sort((a, b) => positions[a].x - positions[b].x)
      .map(id => window.TITLES.find(t => t.id === id)).filter(Boolean);
    const r = window.MCU_nextUp(row, statusOf, { ordered: true });
    return r.kind === 'next' ? r.title.id : null;
  }, [threadLine, guide, relatedIds, positions, collectionStates, collectionReady]);
  const upNextCardId = threadLine && !guide ? threadUpId
    : upNextId && (guide || !cardHidden) ? upNextId : null;
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
  // Up next is a row in the compact card, which stands down while a title is
  // selected on Connections.
  const upNextInMeter = !guide && !!upNext && upNext.result.kind === 'next';
  // The compact card, the same card in the same place on Connections and in
  // Titles: top right on desktop, docked above the bottom bar on phones
  // (Notion "Titles 4/5"), in the compact layout an open guide's card shares
  // (AllTitlesWidget, Andre 2026-11-16): Up next with "All titles · 37/60",
  // × in the corner (it hides the card for this visit) and the catalog's
  // progress under them. In By Phase there is no All titles meter (the phase
  // pills carry it), so the card is Up next alone.
  const allHeader = !!(viewProgress && viewProgress.all);
  // Phone Connections (E 5/5): panned away from the Up next card, its row
  // points to it ("↖ off screen"). The row always shows (Andre, 2026-11-16:
  // folding it while the card was on screen hid Up next).
  const upNextAt = (() => {
    if (!isTouch || viewMode !== 'spatial' || !upNextInMeter || !upNextCardId || !viewportRef.current) return null;
    const p = positions[upNextCardId];
    if (!p) return null;
    const rect = viewportRef.current.getBoundingClientRect();
    const cx = view.x + (p.x + CARD_W / 2) * view.scale, cy = view.y + (p.y + CARD_H / 2) * view.scale;
    // The docked widget covers the bottom of the canvas.
    const bottom = rect.height - 130;
    if (cx >= 0 && cx <= rect.width && cy >= 0 && cy <= bottom) return { on: true };
    const ang = Math.atan2(cy - bottom / 2, cx - rect.width / 2);
    const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
    return { on: false, arrow: arrows[(Math.round(ang / (Math.PI / 4)) + 8) % 8] };
  })();
  const compactCard = !cardHidden && (allHeader || upNextInMeter) ? (inList) => (
    <window.SpatialOverall touch={isTouch} floating={!inList}>
      <window.AllTitlesWidget info={upNextInMeter ? upNext : null} all={allHeader ? viewProgress.all : null}
        offScreen={!inList && upNextAt && !upNextAt.on ? upNextAt.arrow : null}
        label={tr('progress.all')} onClose={() => setCardHidden(true)}/>
    </window.SpatialOverall>
  ) : null;

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
    // On Guides, which shows nothing of a pinned character, the pick opens
    // Titles on their titles (Notion "Search: Enter on the Guides page does
    // nothing"; Andre, 2026-11-24). Guides is already the list view and the
    // pin has closed any open guide, so only the Guides page is left to leave;
    // goSection would also reset the stepper's starting title.
    if (section === 'guides') setGuidesPage(false);
    // The search box lets go of focus; after a keyboard pick on desktop, hand
    // it to the stepper so keyboard users can carry on through the titles.
    if (!isTouch && how.viaKeyboard) requestAnimationFrame(() => requestAnimationFrame(() => {
      const next = document.querySelector('.char-card .cb-step button:last-child');
      if (next) next.focus();
    }));
    return true;
  };
  const changeDesktopView = (v) => {
    if (v === desktopView) return;
    setSelectedId(v === 'spatial' && !highlightedChar ? drawerId : null);
    setDesktopView(v);
  };
  // The section shown, and moving between them. Phones
  // use the same three (Notion "Phone: bottom bar becomes Explore, My list
  // and Guides"): Explore is Spatial, My list the List.
  const spatialNow = isTouch ? viewMode === 'spatial' : desktopView === 'spatial';
  const section = spatialNow ? 'explore' : (guide || guidesPage) ? 'guides' : 'mylist';
  const goSection = (next, opts) => {
    // Guides again (bottom bar or desktop tab) with a guide open goes back to
    // the list, as an iPhone tab bar returns to its top level; on the list
    // itself it scrolls to the top (Notion "Phone: tapping Guides in the
    // bottom bar closes the open guide").
    if (next === section && next === 'guides' && !(opts && opts.force)) {
      if (guideId && (isTouch ? viewMode !== 'spatial' : desktopView === 'list')) { closeGuide(); return; }
      const page = document.querySelector('.g-page');
      if (page && page.scrollTop) page.scrollTo({ top: 0, behavior: window.MCU_MOTION.reduced() ? 'auto' : 'smooth' });
      return;
    }
    if (next === section && !(opts && opts.force)) return;
    // My list is the person's own list: an open guide closes (it stays one
    // click away in Guides).
    if (next === 'mylist' && guideId) closeGuide();
    setGuidesPage(next === 'guides');
    if (isTouch) {
      if (next === 'explore') setViewMode('spatial');
      else { setViewMode('list'); setSelectedId(null); }
      return;
    }
    if (opts && opts.select) {
      // "Show in Explore": that title, selected on the canvas.
      setDrawerId(opts.select);
      setSelectedId(opts.select);
      setDesktopView('spatial');
    } else changeDesktopView(next === 'explore' ? 'spatial' : 'list');
  };
  const showInExplore = (id) => goSection('explore', { select: id, force: true });
  // The header's Seen and Watchlist pills: on Guides, where there is nothing
  // to filter, they open Titles with that status (Andre, 2026-11-16).
  const pickCollection = (v) => {
    setCollectionFilter(v);
    if (section === 'guides') goSection('mylist');
  };
  // Enter in the search box with no suggestion highlighted: on Guides, where
  // there is nothing to filter, it opens Titles with that search, as the Seen
  // and Watchlist pills do (Notion "Search: Enter on the Guides page does
  // nothing").
  // The text stays in the box as the filter. Elsewhere it already filters.
  const submitSearch = () => {
    if (section !== 'guides') return false;
    goSection('mylist');
    return true;
  };
  // The trail's pin (See on canvas, or Highlight in Titles) pins the
  // character's thread where you are, what tapping a person did before
  // E 4/5; already pinned, it stays pinned.
  exploreProps.inCanvas = spatialNow;
  // The character view: the trail marks the stepper's title, and has no pin
  // button (the canvas already shows the character).
  exploreProps.charView = charView;
  exploreProps.current = charView ? (stepId || (explore && explore.kind === 'trail' ? explore.from : null)) : null;
  exploreProps.onPin = () => {
    const ch = explore && explore.kind === 'trail' ? explore.char : null;
    if (!ch) return;
    setExplore(null);
    if (highlightedChar === ch && !pinnedActor) { if (isTouch) setDrawerId(null); return; }
    pinSubject([ch], null);
  };
  // The progress widget's counts open Titles on that tab (Notion "Titles 3/5").

  // `showing` is overridable because the Spatial canvas counts what is actually
  // on it: selecting a card fades every unconnected title out, so the pill has
  // to follow the ring rather than keep reporting the whole filtered set.
  // "64 titles" and its chips show in Titles only when a search or a filter
  // narrows the list (Notion "Titles 1/5"); the tabs already count the rest.
  const narrowed = !!search.trim() || phaseFilter !== 'all' || typeFilter !== 'all' || budgetFilter !== 'all' || releaseFilter !== 'all';
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
  // Where the camera lands with a character pinned (resetView): the title
  // the stepper is on, or their first in the current order.
  charFrameRef.current = highlightedChar && !guide && pinnedTitles.length
    ? (stepId && pinnedTitles.some(t => t.id === stepId) ? stepId : pinnedTitles[0].id)
    : null;
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
    pendingStepRef.current = null;
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
    // The open guide is what the Guides tab shows; closing it brings the
    // gallery back (closeGuide).
    setGuidesPage(false);
    // Each guide keeps its own "Include optional" for the visit (Notion
    // "Phone: tapping Guides in the bottom bar closes the open guide").
    setGuideOptional(!!guideOptionalById.current[id]);
    setStepId(startAt || null);
    if (isTouch) setDrawerId(null);
  };
  useEffect(() => { if (guideId) guideOptionalById.current[guideId] = guideOptional; }, [guideId, guideOptional]);
  const closeGuide = (opts) => {
    if (guideId && !(opts && opts.fromURL)) window.MCU_GUIDE.forget(guideId);
    setGuideId(null);
    setStepId(null);
    // A guide closed from its list stays in the Guides tab, on the gallery of
    // guides (desktop and phones).
    if (guideId && (isTouch ? viewMode !== 'spatial' : desktopView === 'list')) setGuidesPage(true);
  };
  // Opening a guide (or showing its optional stops) in Spatial frames its
  // titles once the dimming has applied; nothing on the canvas moves. It waits
  // for the collection, since a phone frames the next stop, which depends on
  // what has been seen.
  // A selected title keeps the camera (centred on it, above).
  // Desktop goes one step further when the guide opens with no title open (a
  // shared ?guide= link, or the guide opened onto Connections): its next
  // unseen stop is selected and its details open, so the stop and its Mark
  // seen are right there (Andre, 2026-11-17). Phones select the stop as well
  // but keep the canvas clear: the details sheet would cover it.
  const guideLandedRef = useRef(null);
  useEffect(() => {
    if (!guide || !spatialShown || !collectionReady) return undefined;
    const id = requestAnimationFrame(() => {
      if (selectedIdRef.current) return;
      if (!drawerIdRef.current && guideLandedRef.current !== guideId) {
        guideLandedRef.current = guideId;
        const first = (window.MCU_GUIDE.next(guide, guideOptional, statusOf) || {}).id || (guideStepTitles[0] && guideStepTitles[0].id);
        // Phones select the stop too, so the dock reads "Stop 1 of 5" and ›
        // goes on to stop 2, as on desktop, but keep the landing's frame (the
        // reading zoom, above the dock) and leave the details sheet closed
        // (Andre, 2026-11-17).
        // Both fly in over the route to the stop (flyIn).
        if (first && isTouch) { setStepId(first); flyIn(); return; }
        if (first) { stepTo(first, { camera: false }); flyIn({ drawer: true }); return; }
      }
      resetView();
    });
    return () => cancelAnimationFrame(id);
  }, [guideId, guideOptional, spatialShown, collectionReady]);
  useEffect(() => { if (!guideId) guideLandedRef.current = null; }, [guideId]);
  // A guide about to land (above) frames itself with its flight, so the
  // layout's own reframe leaves the camera alone until then.
  const guideFlightDue = () => !!guide && spatialShown && guideLandedRef.current !== guideId
    && !drawerIdRef.current && !selectedIdRef.current;
  // The canvas framing itself (a layout change, Spatial opening): a guide
  // about to land waits on its whole route for its flight; a flight under
  // way is left to finish; a canvas that opens with a character already
  // pinned (a shared ?char= link, or the Titles tab to Connections) flies in
  // to their title as a pin does; anything else is framed as it lands.
  const frameCanvas = () => {
    if (guideFlightDue()) { resetView({ fit: true }); return; }
    if (lensFlightRef.current) return;
    if (!cameraFramedRef.current && charFrameRef.current) { flyIn(); return; }
    resetView();
  };
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
  // ---- First-use hints (Notion "First-use hints", 2026-11-18) -------------
  // Which moment applies now, first in this order; none over the welcome, a
  // sheet or a dialog. A shared link's landing skips the canvas hint (the
  // visitor came for what it shows). Each is marked done by its action below.
  const hintsV = useHintsVersion();
  const landedOnLinkRef = useRef(['guide', 'title', 'char'].some(k => stateParams(window.location.pathname, window.location.search).has(k)));
  const hintOverlay = welcome || !!sheet || aboutOpen || settingsOpen || pickerOpen || !!promo || keysOpen;
  const hintId = useMemo(() => {
    if (!MCU_HINTS.enabled() || hintOverlay || !spatialShown) return null;
    const open = (id) => !MCU_HINTS.isDone(id);
    if (guide && guideLineIds && guideLineIds.length) return open('guide') ? 'guide' : null;
    if (highlightedChar) return open('char') ? 'char' : null;
    if (!isTouch && ringIds && open('ring')) return 'ring';
    if (!selectedId && !drawerId && !landedOnLinkRef.current && open('canvas')) return 'canvas';
    // Phones (Notion "First visit", 2026-11-27): once a title has been
    // picked and closed, the bottom bar's Guides, which nothing else points
    // to on the first visit now that it opens on Connections.
    if (isTouch && !selectedId && !drawerId && !open('canvas') && open('tabs')) return 'tabs';
    return null;
  }, [hintsV, hintOverlay, spatialShown, guide, guideLineIds, highlightedChar, isTouch, ringIds, selectedId, drawerId]);
  const hintText = hintId ? tr('hint.' + (hintId === 'char' && isTouch ? 'charTouch' : hintId),
    hintId === 'char' && highlightedChar ? { name: pinnedActor || I18N.charName(highlightedChar) } : undefined) : '';
  // What each hint points at: Up next's card (or the card nearest the
  // middle), the details' Cast and connections, the step arrows, the
  // guide's ×. (Phones open a card's details on the first tap, so the
  // ticket's "route to the details" needs no hint.)
  const hintAnchor = useMemo(() => {
    const visible = (sel) => [...document.querySelectorAll(sel)].find(el => { const r = el.getBoundingClientRect(); return r.width && r.height; }) || null;
    if (hintId === 'canvas') return () => {
      const up = document.querySelector('.card.up-next');
      if (up) { const r = up.getBoundingClientRect(); if (r.top > 60 && r.bottom < innerHeight - 40 && r.left > 0 && r.right < innerWidth) return up; }
      let best = null, bd = Infinity;
      document.querySelectorAll('.card:not(.ring-hidden)').forEach(c => {
        const r = c.getBoundingClientRect(); if (!r.width) return;
        const d = Math.hypot((r.left + r.right) / 2 - innerWidth / 2, (r.top + r.bottom) / 2 - innerHeight / 2);
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    };
    if (hintId === 'ring') return '.drawer.open .td-acc-cast .td-acc-head';
    if (hintId === 'char') return () => visible(`.char-card button[aria-label="${tr('highlight.next')}"]`);
    if (hintId === 'guide') return () => visible(`button[aria-label="${tr('guide.close')}"]`);
    if (hintId === 'tabs') return '.m-tab[data-section="guides"]';
    return null;
  }, [hintId, lang]);
  // The actions that teach each one.
  useEffect(() => { if (spatialShown && (drawerId || selectedId)) { MCU_HINTS.done('canvas'); landedOnLinkRef.current = false; } }, [drawerId, selectedId, spatialShown]);
  useEffect(() => { if (section === 'guides') MCU_HINTS.done('tabs'); }, [section]);
  useEffect(() => { if (highlightedChar) MCU_HINTS.done('ring'); }, [highlightedChar]);
  const hintStepRef = useRef(null);
  useEffect(() => {
    if (highlightedChar && hintStepRef.current && stepId && stepId !== hintStepRef.current) MCU_HINTS.done('char');
    hintStepRef.current = highlightedChar ? stepId : null;
  }, [stepId, highlightedChar]);
  const hintGuideRef = useRef(false);
  useEffect(() => {
    if (guide && guideLineIds && guideLineIds.length) hintGuideRef.current = true;
    else if (!guide && hintGuideRef.current) { hintGuideRef.current = false; MCU_HINTS.done('guide'); }
  }, [guide, guideLineIds]);
  // The welcome's guide offer (Notion "Welcome: offer to start the Doomsday
  // guide"): the promotion's pick while it is a guide to start (not a
  // caught-up moment). Starting it from the welcome counts as its promotion
  // (no promo card on top), follows it and opens it; Mark what you've seen
  // still nudges later, as for any guide start.
  const welcomeGuide = useMemo(() => {
    if (!welcome || !window.MCU_GUIDE) return null;
    const pick = window.MCU_GUIDE.promotion(statusOf, window.todayISO());
    return pick && pick.guide && !pick.caughtUp ? pick : null;
  }, [welcome]);
  const startWelcomeGuide = () => {
    if (!welcomeGuide) return;
    const id = welcomeGuide.guide.id;
    window.MCU_GUIDE.markPromoted(welcomeGuide.key);
    window.MCU_GUIDE.follow(id);
    setWelcome(false);
    setAboutOpen(false);
    openGuide(id);
  };
  // ---- The address ------------------------------------------------------
  // The pinned character, when it is one portrayal (a performer pin covering
  // several characters has no single id to share). With a character pinned the
  // title in the address is the stepper's, since on phones pinning closes the
  // details and the step lives in stepId.
  const urlChar = highlightedChar && !pinnedActor ? highlightedChar : null;
  const urlTitle = urlChar ? (stepId || drawerId) : drawerId;
  const urlParams = () => {
    const p = {};
    const view = section === 'guides' && !guideId ? 'guides' : isTouch ? viewMode : desktopView;
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
    // The thread is part of the address while it is on screen, so it can be
    // copied at any moment; Back to details or closing drops it.
    if (urlTitle && urlTitle === drawerId && explore && explore.kind === 'thread') p.explore = 'thread';
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
    const wantThread = u.explore === 'thread';
    if ((u.title || null) === drawerId) {
      if (u.title && wantThread !== !!(explore && explore.kind === 'thread')) setExplore(wantThread ? { kind: 'thread' } : null);
      return;
    }
    // Opening the title restores the thread through the details' explore
    // restore (the [drawerId] effect), as ‹ does.
    if (u.title && wantThread) exploreRestoreRef.current = { kind: 'thread' };
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
      try { window.history.pushState({ mcuHome: 1 }, '', homePath(addressLang())); } catch (e) { /* the reset still happens */ }
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
    setCardHidden(false);
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
    [isTouch, viewMode, desktopView, guidesPage, sort, sortDir, phaseFilter, typeFilter, budgetFilter, releaseFilter, urlTitle, urlChar, guideId, explore && explore.kind]);
  // The tab title follows the address (Notion "Findability 2"): the open
  // title, else the guide, else the pinned character, the same order the path
  // takes (src/share-card/addresses.ts) and the same words each page's own
  // <title> says (og.pageTitle), in the visitor's language. Search engines
  // that run scripts read this one; with nothing open it is the home page's.
  useEffect(() => {
    let name = null;
    const t = urlTitle ? window.TITLES.find(x => x.id === urlTitle) : null;
    if (t) name = `${I18N.titleName(t)} (${t.year})`;
    else if (guide) name = window.MCU_GUIDE.name(guide);
    else if (urlChar) name = I18N.charName(urlChar);
    // The index addresses (Findability 4) name their section, as their pages'
    // own <title> does: /guides, and /titles where the list is asked for.
    else if (section === 'guides') name = tr('page.guidesName');
    else if (!isTouch && desktopView === 'list') name = tr('page.titlesName');
    document.title = name ? tr('og.pageTitle', { name, app: tr('app.name') }) : tr('page.homeTitle');
  }, [urlTitle, urlChar, guide, lang, section, isTouch, desktopView]);
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
  const stepTo = (id, { details = true, camera = true } = {}) => {
    setStepId(id);
    // Desktop opens each title's details; on phones the sheet would cover the
    // view, so the step only moves to the title (tap it to open). `details`
    // off moves the camera alone (Seen in a guide's dock or bar).
    const trailShown = !!explore && explore.kind === 'trail' && highlightedChar === explore.char;
    if (!isTouch && details && !trailShown) {
      if (highlightedChar && detailBack.length && id !== drawerId) hoppingRef.current = true;
      setDrawerId(id);
    }
    // camera off: the caller frames it (a pin or a guide flying in, flyIn).
    if (spatialShown && !camera) {
      if (selectedIdRef.current) { selectionReturnRef.current = null; setSelectedId(null); }
    } else if (spatialShown && viewportRef.current) {
      // A selected card's focus ring would fight the glide: let it go without
      // its return trip.
      if (selectedIdRef.current) { selectionReturnRef.current = null; setSelectedId(null); }
      const p = basePositions[id];
      if (!p) return;
      const rect = viewportRef.current.getBoundingClientRect();
      // A camera that was never framed (Spatial just opened) sits at 100%.
      // Steps go no further out than the landing zoom (landScale; phones
      // stepped at 60% until 2026-11-18).
      const floor = landScale(rect.width, isTouch);
      // Stepping through a character's titles, already at a reading zoom:
      // keep the outlined card in view, moving only as far as needed (above).
      // A guide's steps center their stop, as before.
      if (!guide && cameraFramedRef.current && viewRef.current.scale >= floor - 0.01) {
        followPendingRef.current = id;
        return;
      }
      const scale = cameraFramedRef.current ? Math.max(viewRef.current.scale, floor) : floor;
      cameraFramedRef.current = true;
      const drawerSpace = isTouch ? 0 : drawerW();
      // Phones: center in the room above whatever is docked at the bottom
      // (a guide's card, the pinned character's pill), as the landing frame
      // does, so a step never parks the card behind it (Andre, 2026-11-16).
      const bottom = isTouch ? dockTop(viewportRef.current, rect) : rect.height;
      glideTo({
        x: (rect.width - drawerSpace) / 2 - (p.x + CARD_W / 2) * scale,
        y: bottom / 2 - (p.y + CARD_H / 2) * scale,
        scale,
      });
    } else {
      requestAnimationFrame(() => {
        const row = document.querySelector(`[data-row-id="${id}"]`);
        if (!row) return;
        window.MCU_followRowFocus(row);
        window.MCU_scrollInArea(row, 'nearest', !stepReducedMotion());
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
    // A pin made from the address lands in the same pass as other changes to
    // the titles: wait for the render that holds the character's own.
    if (!highlightedChar || !pinnedTitles.length) return;
    pendingStepRef.current = null;
    // In Spatial a pin flies in over the character's row to the title it was
    // pinned from, or their first (flyIn); desktop opens that title's details.
    if (id !== '*' && pinnedTitles.some(t => t.id === id)) {
      if (!spatialShown) { stepTo(id); return; }
      stepTo(id, { camera: false });
      flyIn({ drawer: !isTouch });
    } else if (spatialShown) flyIn();
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
  // The rest of the single keys (Notion "Keyboard shortcuts", 2026-11-18):
  // 1 2 3 the sections; R C P A I T the sorts (again flips the order); U S W 0
  // what's shown; F Filters; ? the list of keys. All off with Settings →
  // Keyboard shortcuts (WCAG 2.1.4). Each is announced, as D and L are.
  const keysRef = useRef(null);
  keysRef.current = { goSection: (v) => goSection(v), sort, sortDir, changeSort, setSortDir, collectionFilter, pickCollection: (v) => pickCollection(v) };
  useEffect(() => {
    let timer = null;
    const say = (text) => { setThemeAnnounce(''); clearTimeout(timer); timer = setTimeout(() => setThemeAnnounce(text), 50); };
    const onKey = (e) => {
      if (keyIsTaken(e) || !MCU_KEYS.enabled()) return;
      const k = (e.key || '').toLowerCase();
      const K = keysRef.current;
      if (k === 'd' || k === 'l') {
        const next = k === 'd' ? 'dark' : 'light';
        window.MCU_THEME.setChoice(next);
        say(tr(next === 'dark' ? 'theme.darkOn' : 'theme.lightOn'));
        return;
      }
      // The Theme lab (dev only) takes Shift+T; T alone is Rotten Tomatoes.
      if (e.shiftKey && k !== '?') return;
      if (k === '?') { e.preventDefault(); setKeysOpen(true); return; }
      if (SECTION_BY_KEY[k]) { e.preventDefault(); K.goSection(SECTION_BY_KEY[k]); say(tr(SECTION_BY_KEY[k] === 'explore' ? 'nav.explore' : SECTION_BY_KEY[k] === 'mylist' ? 'nav.mylist' : 'nav.guides')); return; }
      if (SORT_BY_KEY[k]) {
        e.preventDefault();
        const v = SORT_BY_KEY[k];
        let dir = K.sortDir;
        if (v === K.sort) { dir = K.sortDir === 'asc' ? 'desc' : 'asc'; K.setSortDir(dir); }
        else { K.changeSort(v); dir = DEFAULT_SORT_DIR[v] || 'asc'; }
        say(window.sortPhrase ? window.sortPhrase(v, dir) : tr('sortmenu.name.' + v));
        return;
      }
      if (STATUS_BY_KEY[k]) {
        e.preventDefault();
        const v = STATUS_BY_KEY[k];
        const next = v !== 'all' && K.collectionFilter === v ? 'all' : v;
        K.pickCollection(next);
        say(tr(next === 'all' ? 'keys.all' : 'collection.' + next));
        return;
      }
      if (k === 'f') {
        const pill = [...document.querySelectorAll('.filters-pill')].find(el => el.getClientRects().length);
        if (pill) { e.preventDefault(); pill.click(); }
      }
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
    const side = !isTouch && drawerId ? drawerW() : 0;
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
      // The thread or trail first: back to the details they replaced.
      if (detailsOpen && explore) { exploreLeave(); return; }
      if (detailsOpen) { setSelectedId(null); setDrawerId(null); return; }
      if (guide) { closeGuide(); return; }
      unpinCharacter();
    };
    // Capture phase: runs before the menus' own handlers close them (React
    // re-renders between listeners), so an open menu is still visible here.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [detailsOpen, highlightedChar, pair, guide, explore]);
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
  // The pinned character's card (char-card.tsx; Notion "Connections with a
  // character pinned"): top right on desktop, on Connections and in Titles,
  // where it takes the All titles card's place; docked above the bottom bar
  // on phones. Hovering a character in a cast only lights their thread: the
  // card comes with the pin.
  const charCard = highlightedChar ? (inList) => {
    const ch = highlightedChar;
    const c = window.CHARACTERS[ch];
    // The performer follows the title the stepper is on, because the credit
    // belongs to the title: stepping onto The Incredible Hulk reads Edward
    // Norton. With no single title in view the roster speaks for the run.
    const inView = !pinnedActor && stepCurrent && window.TITLES.find(t => t.id === stepCurrent);
    const creditedHere = inView && inView.cast.indexOf(ch) !== -1 ? window.MCU_credit(inView, ch) : null;
    const roster = creditsByChar[ch] || [];
    const named = pinnedActor || creditedHere || (roster[0] && roster[0].name) || c.actor;
    const photo = window.performerPortrait(named, ch);
    const who = pinnedActor || I18N.charName(ch);
    // When the line names one performer of a part several people played, the
    // count beside it is that performer's share (the number their search
    // suggestion shows); otherwise it is the titles lit.
    const namedRow = creditedHere && roster.length > 1 ? roster.find(r => r.name === creditedHere) : null;
    const count = namedRow ? namedRow.n : (pinnedVisibleIds || new Set()).size;
    const performer = (pinnedActor ? tr('suggest.as', { names: pinnedChars.map(id => I18N.charName(id)).join(', ') })
      : (creditedHere || roster.length < 2) ? named
      : tr('credit.more', { name: named, n: roster.length - 1 })) + ' · ' + tr('header.count', { n: count });
    const charGuide = window.MCU_GUIDE ? window.MCU_GUIDE.forChar(ch) : null;
    // A title from the card opens its details (the sheet on phones) and
    // becomes the current one.
    const openTitle = (id) => { stepTo(id, { details: false }); setExplore(null); setDrawerId(id); };
    // The photo opens their trail on the current title (the first, before a
    // step); again, it closes.
    const openTrail = () => {
      if (charView) { setExplore(null); return; }
      const from = stepIndex >= 0 ? stepList[stepIndex].id : pinnedTitles[0] && pinnedTitles[0].id;
      if (!from) return;
      const trail = { kind: 'trail', char: ch, from };
      if (stepIndex < 0) setStepId(from);
      if (drawerId === from) setExplore(trail);
      else { exploreRestoreRef.current = trail; setDrawerId(from); }
    };
    return (
      <CharCard touch={isTouch} inList={inList} color={c.color} photo={photo} initials={c.initials}
        name={who} performer={performer} titles={pinnedTitles} stepIndex={stepIndex}
        guideLabel={charGuide ? tr('guide.seeCurated') : null} onGuide={charGuide ? () => openGuide(charGuide.id) : null}
        charOnly={isTouch ? null : charOnly} setCharOnly={isTouch ? null : setCharOnly}
        sharePayload={() => charSharePayload(ch)} shareLabel={tr('share.charLabel', { name: who })}
        onPrev={() => stepBy(-1)} onNext={() => stepBy(1)} onJump={(id) => stepTo(id)} onOpen={openTitle} onTrail={openTrail}
        onClose={() => { setExplore(null); unpinCharacter(); }}/>
    );
  } : null;
  // Phones dock the card where the All titles card sits.
  const charPill = isTouch && charCard ? charCard(false) : null;

  // No pop card for the selected title anywhere (Andre, 2026-11-27: "Never,
  // one card"). Phones lost it in Explore E 5/5; on desktop its leftover
  // guard read the phone's view (viewMode), so it showed whenever that was
  // Connections, and past 188px of zoom the canvas card showed behind it too.
  // The selected card is the canvas card itself, outlined, at its own size.

  // Seen on the next stop in a guide's dock or bar while the camera is on
  // another stop: the camera glides back to it, so the mark is seen landing
  // (Andre, 2026-11-16). Its details stay closed.
  const seenNextStop = (id) => {
    const on = stepIndex >= 0 && stepList[stepIndex] ? stepList[stepIndex].id : null;
    if (on !== id) stepTo(id, { details: false });
  };
  // Seen on an open guide's stop, from its details, with the canvas showing:
  // once the mark has landed, the guide moves on to its next unseen stop, as ›
  // does (desktop opens its details; phones move the camera). Only a change
  // made here counts: the same title, unseen a moment ago (Andre, 2026-11-17).
  const guideSeenRef = useRef(null);
  // The last move Mark seen made ({ from, to }), so the toast's Undo can take
  // it back as well: undoing the mark while still on the stop it moved to
  // steps back to the title (Andre, 2026-11-17). Going anywhere else first
  // forgets it.
  const guideAdvanceRef = useRef(null);
  useEffect(() => {
    const prev = guideSeenRef.current;
    const now = drawerId ? collectionStates[drawerId] || null : null;
    guideSeenRef.current = { id: drawerId, status: now };
    if (!guide || !spatialShown || !drawerId || !prev || prev.id !== drawerId) return undefined;
    if (prev.status === 'seen' || now !== 'seen') return undefined;
    if (!guideStepTitles.some(t => t.id === drawerId)) return undefined;
    const next = window.MCU_GUIDE.next(guide, guideOptional, statusOf);
    if (!next || next.id === drawerId) return undefined;
    const from = drawerId;
    const timer = setTimeout(() => { guideAdvanceRef.current = { from, to: next.id }; stepTo(next.id); }, 700);
    return () => clearTimeout(timer);
  }, [drawerId, collectionStates]);
  useEffect(() => {
    const a = guideAdvanceRef.current;
    if (!a) return;
    const at = stepId || drawerId;
    if (!guide || !spatialShown || (at && at !== a.to && at !== a.from)) { guideAdvanceRef.current = null; return; }
    if (collectionStates[a.from] === 'seen') return;
    guideAdvanceRef.current = null;
    if (at === a.to) stepTo(a.from);
  }, [collectionStates, stepId, drawerId, guide, spatialShown]);
  // The desktop guide's module, in the List or over the canvas.
  const guideModule = (layout) => guide && (
    <window.GuideModule guide={guide} layout={layout} includeOptional={guideOptional} setIncludeOptional={setGuideOptional}
      stepIndex={stepIndex} stepCount={stepStops} currentId={stepIndex >= 0 && stepList[stepIndex] ? stepList[stepIndex].id : null}
      onOpenNext={(id) => { if (layout === 'list' || !upNext) { setStepId(id); setDrawerId(id); } else { setStepId(id); upNext.onOpen(id); } }}
      onSeenNext={layout === 'spatial' ? seenNextStop : undefined}
      onOpenPage={() => changeDesktopView('list')}
      onPrev={() => stepBy(-1)} onNext={() => stepBy(1)} onJump={(id) => stepTo(id)} onClose={closeGuide}/>
  );

  const canvasEl = (
    <div
      className={S.VIEWPORT}
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
      <div className={S.CANVAS_BG}/>
      <div
        className={`${S.CANVAS}${linesSettling ? ' lines-settling' : ''}${bandsReturning ? ' bands-settling' : ''}`}
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
            <window.BandLabel key={b.phase ? 'p' + b.phase : 'e' + b.era} x={b.x} y={b.y - BAND_LABEL_H} phase={b.phase}
              color={b.phase ? PHASE_COLORS[b.phase] : undefined} plain touch={isTouch}
              count={g && g.released ? { seen: g.seen, released: g.released } : null}>
              {label}
            </window.BandLabel>
          );
        })}
        <FloatingConnections
          visibleTitles={lineTitles}
          positions={positions}
          hoveredTitle={hoveredTitle}
          activeChar={activeChar}
          activeChars={activeChars}
          drawChar={linesSettling ? null : highlightedChar}
          quiet={charLine || !!guide}
          litIds={activeChar ? highlightedIds : null}
          onHoverConnection={setHoveredConnection}
          hoveredConnection={hoveredConnection}
          selectedId={selectedId}
          focusId={pair ? null : hoverFocusId}
          pair={pair}
          onPickConnection={pickConnection}
          shownIds={shownIds}
          spokes={ringIds && !threadLine && focusId ? { focus: focusId, inner: new Set((ringOrder || []).slice(0, RING_CAPS[0])) } : null}
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
          const phoneFocus = (phoneFocusId || (isTouch && selectedId)) === t.id;
          const isHighlighted = pair ? !!inPair : (charHL || (hoverFocusId === t.id && !phoneFocus) || !!onLine);
          // Visual only — the card stays in the layout so nothing reflows.
          const isCollDimmed = collectionFilter !== 'all' && !guide
            && !window.matchesCollection(collectionStates[t.id] || 'none', collectionFilter, t);
          return (
            <Card
              key={t.id}
              facet={cardFacet}
              entering={cardsShownRef.current}
              title={t}
              connections={connCounts[t.id] || 0}
              pos={positions[t.id] || {x:0,y:0}}
              onClick={() => onCardTap(t.id)}
              onHover={isTouch ? (() => {}) : setHoveredTitle}
              onDragStart={isTouch ? (() => {}) : onCardDragStart}
              focusable={!isTouch}
              onFocusCard={revealCard}
              isSelected={selectedId === t.id || phoneFocus}
              guideBadge={guideBadges ? guideBadges[t.id] : null}
              guide={guide} guideSkip={guideSkipInfo ? guideSkipInfo[t.id] : null} onGuideSkip={onCanvasSkip}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
              isCollDimmed={isCollDimmed}
              isRingHidden={!!shownIds && !shownIds.has(t.id)}
              isRingFocus={!!ringIds && selectedId === t.id}
              isDragging={draggingId === t.id}
              isCurrent={!!highlightedChar && stepId === t.id}
              lineView={charLine}
              isUpNext={upNextCardId === t.id} isPeek={!isTouch && peekId === t.id}
              isGuideAt={!!guide && (stepId || drawerId) === t.id}
              curColor={highlightedChar ? window.CHARACTERS[highlightedChar].color : null}
              mark={charMarks ? charMarks[t.id] : null}
              searchQuery={search}
              scale={view.scale}
              touch={isTouch}
              overview={isTouch && view.scale < PHONE_OVERVIEW_BELOW}
            />
          );
        })}
      </div>
      <window.ZoomControl scale={view.scale} min={ZOOM_MIN} max={2} touch={isTouch} rest={isTouch && !zoomPeek && zoomEdit == null}
        edit={zoomEdit} onEdit={setZoomEdit} onCommit={commitZoomEdit} onCancel={() => setZoomEdit(null)}
        onStep={(f) => { if (isTouch) peekZoom(); applyScale(s => s * f); }}/>
      {filtered.length === 0 && (() => {
        // Nothing matches: say so and offer the one action that brings titles
        // back, instead of an empty canvas. Events stop here so the button
        // never starts a pan or a background tap.
        const searching = !!search.trim();
        const filtering = phaseFilter !== 'all' || typeFilter !== 'all' || budgetFilter !== 'all' || releaseFilter !== 'all';
        const label = searching && filtering ? tr('empty.clearBoth') : searching ? tr('search.clear') : tr('filters.clear');
        return <window.SpatialEmpty actionLabel={searching || filtering ? label : null} onAction={() => {
          if (searching) setSearch('');
          if (filtering) { setPhaseFilter('all'); setTypeFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }
        }}/>;
      })()}
      {/* ringIds is the selected title plus everything sharing a character
          with it — exactly the cards left standing on the canvas. */}
      {/* The summary describes filters an open guide sets aside, so it waits. */}
      {!guide && contextSummary(isTouch ? 'pill' : 'float', false, ringIds ? ringIds.size : null)}
      {/* The compact card (All titles and Up next; Andre, 2026-11-15: the
          progress widget's bigger card was too much for the canvas). It
          stands down while a title is selected, since the canvas is then
          showing one ring, and while a guide is open (the guide carries its
          own progress). Its ✕ hides it for the visit. Phones dock it above
          the bottom bar instead (below). */}
      {!guide && !isTouch && (charCard ? charCard(false) : !selectedId && compactCard && compactCard(false))}
      {guide && !isTouch && guideModule('spatial')}
    </div>
  );

  // Phones: the compact card docked above the bottom bar, on Connections and
  // in Titles (Notion "Titles 4/5"; Andre chose the dock over the top so it is
  // within thumb reach). A pinned character's or guide's pill takes that
  // place, and the card stands down while a title is selected on Connections.
  const phoneCard = isTouch && !guide && !charPill && !guidesPage && compactCard
    && (viewMode === 'list' || (viewMode === 'spatial' && !selectedId && filtered.length > 0)) ? compactCard(false) : null;

  if (isTouch) {
    return (
      <div className={`${S.APP} touch ${device}`}>
        {upAnnouncer}
        {homeAnnouncer}
        {themeAnnouncer}
        <window.MobileTopBar
          onHome={onHomeClick}
          section={section}
          search={search} setSearch={setSearch} onPickTitle={pickTitle} onPickPerson={pickPerson} onSubmitSearch={submitSearch}
          onOpenFilters={() => { if (viewMode !== 'spatial') window.captureFlip(); setSheet('filters'); }}
          filterCount={filterCount}
          sort={sort} sortDir={sortDir} setSort={changeSort} setSortDir={setSortDir}
          onOpenAccount={() => setSheet('account')}
          onOpenSettings={() => setSheet('settings')}
          guideActive={!!guide}
          collection={collectionFilter} setCollection={pickCollection}
        />
        <div role="main" className={`${S.M_MAIN}${charPill || (guide && viewMode === 'spatial') || phoneCard ? ' has-pill' : ''}`}
          style={highlightedChar ? { '--cur-color': window.CHARACTERS[highlightedChar].color } : undefined}>
          {guide && viewMode !== 'spatial' && (
            <window.GuideView guide={guide} surface="phone" includeOptional={guideOptional} setIncludeOptional={setGuideOptional}
              currentId={stepCurrent} onOpen={(id) => { setStepId(id); setDrawerId(id); }}
              onBack={() => closeGuide()} onPick={(id) => openGuide(id)} onConnections={() => goSection('explore')}/>
          )}
          {!guide && guidesPage && viewMode !== 'spatial' && <window.GuidesPage inMain onPick={(id) => openGuide(id)}/>}
          {!guide && !guidesPage && viewMode === 'list' && <window.MobileList upNext={upNext} groupProgress={groupProgress} markWatch={collectionFilter !== 'watchlist'} header={narrowed ? contextSummary('line') : null} currentId={highlightedChar ? stepId : null} titles={visible} sort={sort} sortDir={sortDir} onSelect={onCardTap} charMarks={charMarks} search={search} empty={emptyCopy} orderKey={flipKey} flipPaused={sheet === 'filters'}/>}
          {viewMode === 'spatial' && (
            <div className={S.M_SPATIAL_WRAP}>
              {canvasEl}
            </div>
          )}
          {phoneCard}
          {/* An open guide's dock is Connections' (Notion "Guides 3/4": in
              Guides, the header's "‹ Guides", progress and switcher do its
              job). */}
          {guide ? viewMode === 'spatial' && (
            <window.GuidePill guide={guide} stepIndex={stepIndex} stepCount={stepStops}
              current={stepIndex >= 0 ? stepList[stepIndex] : null}
              next={upNext && upNext.result && upNext.result.kind === 'next' ? upNext.result.title : null}
              onOpenNext={(id) => upNext && upNext.onOpen(id)} onSeenNext={seenNextStop}
              onPrev={() => stepBy(-1)} onNext={() => stepBy(1)} onJump={(id) => stepTo(id)} onClose={closeGuide}/>
          ) : charPill}
        </div>
        <window.MobileNavBar section={section} onSection={(v) => goSection(v)} onReselect={(v) => { if (v !== 'guides') return false; goSection(v); return true; }}/>
        {sheet === 'filters' && (
          <window.FilterSheet
            collectionFilter={collectionFilter} setCollectionFilter={setCollectionFilter}
            phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            budgetFilter={budgetFilter} setBudgetFilter={setBudgetFilter}
            releaseFilter={releaseFilter} setReleaseFilter={setReleaseFilter}
            showing={mobileShowing}
            onClear={() => { setPhaseFilter('all'); setTypeFilter('all'); setBudgetFilter('all'); setReleaseFilter('all'); }}
            onClose={() => { setSheet(null); requestAnimationFrame(() => window.playPendingFlip()); }}
          />
        )}
        {sheet === 'account' && (
          <window.AccountSheet
            onClose={() => setSheet(null)}
            onAbout={() => setSheet('about')}
          />
        )}
        {sheet === 'about' && <window.AboutSheet onClose={() => setSheet(null)}/>}
        {sheet === 'settings' && (
          <window.SettingsSheet onClose={() => setSheet(null)}
            onAbout={() => setSheet('about')} onShowWelcome={() => { setSheet(null); MCU_HINTS.reset(); setWelcome(true); }}/>
        )}
        {sheet === 'guides' && (
          <window.Sheet onClose={() => setSheet(null)} tall label={tr('guide.menuTitle')}>
            <h2 className={S.GUIDES_SHEET_TITLE}>{tr('guide.menuTitle')}</h2>
            <window.GuideMenu currentId={guideId} onPick={(id) => { setSheet(null); openGuide(id); }}/>
          </window.Sheet>
        )}
        <window.StatusToast touch/>
        {/* Dev and preview builds only (theme-lab.tsx). */}
        <window.ThemeLab/>
        <window.ShareImageHost touch/>
        <window.SignInNudge touch/>
        <window.BulkConfirm touch/>
        {welcome && !sheet && !drawerTitle && !pickerOpen && <window.AboutSheet welcome onPick={openPicker} guide={welcomeGuide} onGuide={startWelcomeGuide} onClose={() => setWelcome(false)}/>}
        {pickerOpen && <window.SeenPicker touch onClose={() => setPickerOpen(false)}/>}
        {promo && <window.GuidePromo promo={promo} touch onStart={startPromo} onClose={() => setPromo(null)}/>}
        {hintId && hintAnchor && <FirstHint id={hintId} text={hintText} anchor={hintAnchor} touch/>}
        {keysOpen && <ShortcutsDialog onClose={() => setKeysOpen(false)}/>}
        {drawerTitle && (
          <window.CastSheet
            title={drawerTitle} search={search} back={detailBackProp}
            inSpatial={viewMode === 'spatial'}
            onClose={() => {
              setDrawerId(null);
              // Details opened from Up next (or anywhere but the canvas) close
              // back to the plain canvas, centred on the title, with Up next
              // in place, rather than leaving its connections ring open.
              const back = selectionReturnRef.current;
              if (viewMode === 'spatial' && selectedIdRef.current && back && back.id === selectedIdRef.current && !back.fromCanvas) setSelectedId(null);
            }}
            onCharacterClick={exploreProps.onTrail}
            ex={exploreProps}
            activeChar={activeChar}
            activeChars={activeChars}
            onGoSpatial={() => {
              // Into the Connections section, with its own sort and filters.
              goSection('explore', { force: true });
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
    <div className={`${S.APP} ${drawerTitle ? 'drawer-open' : ''}`}>
      {upAnnouncer}
      {homeAnnouncer}
      {themeAnnouncer}
      <Toolbar
        onHome={onHomeClick}
        onAbout={() => setAboutOpen(true)}
        onSettings={() => setSettingsOpen(o => !o)} settingsOpen={settingsOpen}
        onPickTitle={pickTitle} onPickPerson={pickPerson} onSubmitSearch={submitSearch}
        section={section} onSection={(s) => goSection(s)}
        sort={sort} setSort={changeSort} sortDir={sortDir} setSortDir={setSortDir}
        phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        budgetFilter={budgetFilter} setBudgetFilter={setBudgetFilter}
        releaseFilter={releaseFilter} setReleaseFilter={setReleaseFilter}
        search={search} setSearch={setSearch}
        guideId={guideId}
        // Titles' second layer: the status tabs and "Mark what you've seen".
        collection={collectionFilter} setCollection={pickCollection}
      />

      {/* An open guide shows its own module instead: at the top of the List,
          floating over the canvas in Spatial. */}
      {/* Always present, so each step's title and position is read out. */}
      {desktopView === 'list' && <div className="story-sr" aria-live="polite">{listAnnounce}</div>}
      {desktopView === 'list' && guide
        ? <window.GuideView guide={guide} surface="desktop" includeOptional={guideOptional} setIncludeOptional={setGuideOptional}
            // "‹ Guides" and the title switcher (Notion "Guides 3/4").
            onBack={() => closeGuide()} onPick={(id) => openGuide(id)} onConnections={() => goSection('explore')}
            // A stop opened by a click becomes the guide's current one too,
            // like ← → and ↑ ↓: the marker and "Stop n of N" follow it.
            currentId={stepCurrent} openId={drawerId} onOpen={(id) => { setStepId(id); toggleDetails(id); }}
            onFollow={(id) => {
              // The stop becomes the guide's current one too, so ← → carry on
              // from it and the banner announces "Stop n of N", as it does for
              // ← →.
              keepFocusOnStep();
              setStepId(id);
              setDrawerId(id);
            }}/>
        : desktopView === 'list' && guidesPage
        ? <window.GuidesPage onPick={(id) => openGuide(id)}/>
        : desktopView === 'list'
        ? <window.DesktopList upNext={upNext} titles={visible} floatingCard={charCard ? charCard(true) : compactCard && compactCard(true)}
            myList={{ collection: collectionFilter, setCollection: setCollectionFilter,
              filters: { phaseFilter, setPhaseFilter, typeFilter, setTypeFilter, budgetFilter, setBudgetFilter, releaseFilter, setReleaseFilter } }}
            groupProgress={groupProgress} sort={sort} sortDir={sortDir} setSort={changeSort} setSortDir={setSortDir}
            search={search} charMarks={charMarks} openId={drawerId} activeChar={activeChar} activeChars={activeChars}
            onOpen={toggleDetails}
            onFollow={(id, n, total) => {
              keepFocusOnStep();
              setDrawerId(id);
              // Focus moving to the row reads it out; without that, say where we are.
              const t = n && window.TITLES.find(x => x.id === id);
              if (t) setListAnnounce(tr('list.stepPos', { title: I18N.titleName(t), n, total }));
            }}
            // "64 titles" says something only when a search or a filter
            // narrows the list (the tabs carry their own counts).
            header={narrowed ? contextSummary('float', true) : null}
            empty={emptyCopy} orderKey={flipKey} progress={viewProgress}/>
        : canvasEl}

      {hoveredConnection && (
        <window.LineTooltip x={hoveredConnection.x} y={hoveredConnection.y} a={hoveredConnection.a} b={hoveredConnection.b}
          characters={hoveredConnection.characters}/>
      )}

      {/* Settings takes the details drawer's place rather than stacking a
          second panel; closing it brings the drawer back. */}
      {/* The drawer that comes back must not take focus from the gear. */}
      {(settingsOpen || settingsShown) && <window.SettingsPanel leaving={!settingsOpen} onGone={() => setSettingsShown(false)}
        onClose={() => { if (drawerTitle) keepFocusOnStep(); setSettingsOpen(false); }}
        onAbout={() => setAboutOpen(true)} onShowWelcome={() => { MCU_HINTS.reset(); setWelcome(true); }}/>}
      <CastDrawer
        title={settingsOpen || settingsShown ? null : drawerTitle} back={detailBackProp}
        onShowInExplore={section !== 'explore' ? showInExplore : null}
        onClose={() => { setSelectedId(null); setDrawerId(null); }}
        onCharacterClick={exploreProps.onTrail}
        ex={exploreProps}
        hoveredCharacter={hoveredCharacter}
        onCharacterHover={setHoveredCharacter}
        activeChar={activeChar}
        activeChars={activeChars}
        search={search}
      />
      <window.StatusToast touch={false}/>
      {/* Dev and preview builds only (theme-lab.tsx). */}
      <window.ThemeLab/>
      <window.ShareImageHost touch={false}/>
      <window.SignInNudge touch={false}/>
      <window.BulkConfirm touch={false}/>
      {(aboutOpen || welcome) && !pickerOpen && <window.AboutDialog welcome={welcome && !aboutOpen} onPick={openPicker}
        guide={welcome && !aboutOpen ? welcomeGuide : null} onGuide={startWelcomeGuide}
        onClose={() => { setAboutOpen(false); setWelcome(false); }}/>}
      {pickerOpen && <window.SeenPicker touch={false} onClose={() => setPickerOpen(false)}/>}
      {promo && <window.GuidePromo promo={promo} touch={false} onStart={startPromo} onClose={() => setPromo(null)}/>}
      {hintId && hintAnchor && <FirstHint id={hintId} text={hintText} anchor={hintAnchor}/>}
      {keysOpen && <ShortcutsDialog onClose={() => setKeysOpen(false)}/>}
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
