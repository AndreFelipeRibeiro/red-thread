// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 201 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import type { Title } from '../types/catalog';
import { cn } from 'cn';
import * as S from './shell';
import { EmptyState, PhoneRow, GROUP, LIST } from './list-parts';

const { useState: mUseState } = React;

// The phase tokens, as in app.tsx's PHASE_COLORS.
const MPHASE_COLORS: Record<number, string> = { 1:'var(--phase-1)', 2:'var(--phase-2)', 3:'var(--phase-3)', 4:'var(--phase-4)', 5:'var(--phase-5)', 6:'var(--phase-6)' };
window.MPHASE_COLORS = MPHASE_COLORS; // upnext.jsx
// Text comes from the i18n runtime (i18n.js); `mtr` avoids clashing with the
// `t` used for titles throughout this file.
const MI18N = window.MCU_I18N;
const mtr = (key: string, vars?: Record<string, unknown>) => MI18N.tr(key, vars);
const mPhaseLabel = (n) => mtr('phase.label', { n });
const mTypeLabel = (type) => mtr(type === 'film' ? 'type.film.one' : 'type.series.one');

// The app bar is already three rows deep on a phone, so the view switch moved
// off m-appbar-top (where the account avatar now sits) onto its own tight row
// rather than becoming a fourth control crammed into the brand row.
// Fitting a row of controls by measuring rather than by screen width (Notion
// "Top nav (PT) / content overflowing", "Font size increase"). A row tries
// steps 0..max, each more compact than the last (its stylesheet keys them on
// data-fit), and keeps the first where nothing runs past its parent:
// breakpoints can't know how long a language's words are or how big the text
// is. It runs before paint, and again when the row's width changes, the fonts
// load, the Text size changes, or any of `deps` change. Count badges and other
// absolutely placed extras overhang on purpose and are not measured.
function rowOverflows(row) {
  const out = (inner, outer) => inner.right > outer.right + 1 || inner.left < outer.left - 1;
  const placed = (e) => { const p = getComputedStyle(e).position; return p === 'absolute' || p === 'fixed'; };
  // Inside the parent's padding, not just its border: a label that eats into
  // its button's padding reads as cramped (Andre, at Large on a 375px phone),
  // so that counts as not fitting too.
  const inner = (el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight) };
  };
  const walk = (el, box) => [...el.children].some((c) => {
    // A wrapper with no box of its own (GuideOff's display: contents) is
    // looked through, not skipped.
    if (getComputedStyle(c).display === 'contents') return walk(c, box);
    if (!c.getClientRects().length || placed(c)) return false;
    return out(c.getBoundingClientRect(), box) || walk(c, inner(c));
  });
  return walk(row, inner(row));
}
function useFitSteps(ref, max, deps) {
  const [fit, setFit] = React.useState(0);
  const refit = React.useCallback(() => {
    const row = ref.current;
    if (!row || !row.clientWidth) return;
    let step = 0;
    for (; step < max; step++) { row.dataset.fit = String(step); if (!rowOverflows(row)) break; }
    row.dataset.fit = String(step);
    setFit(step);
  }, [ref, max]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(refit, [refit, ...deps]);
  React.useEffect(() => {
    const row = ref.current;
    if (!row) return undefined;
    let width = row.clientWidth;
    const ro = typeof ResizeObserver === 'undefined' ? null
      : new ResizeObserver(() => { if (row.clientWidth !== width) { width = row.clientWidth; refit(); } });
    if (ro) ro.observe(row);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    window.addEventListener('mcu:textsize', refit);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('mcu:textsize', refit); };
  }, [ref, refit]);
  return fit;
}

// MobileTopBar, the Sort menu and the View menu are in phone-header.tsx and
// header-controls.tsx (Notion "shadcn pass 1/5"), where
// they are built on the design system.

// Wraps the substring(s) of `text` matching `query` in a <mark> so the UI can
// show exactly what triggered a search result.
function Highlight({ text, query }) {
  if (text == null) return null;
  const str = String(text);
  const q = query ? MI18N.fold(query.trim()) : '';
  if (!q) return str;
  // Fold one character at a time (case and accents, as the search does) and
  // remember where each folded character came from, so "capitao" marks the
  // "Capitão" it matched.
  let folded = '';
  const from = [];
  for (let i = 0; i < str.length; i++) {
    for (const ch of MI18N.fold(str[i])) { folded += ch; from.push(i); }
  }
  const out = [];
  let last = 0, at = folded.indexOf(q);
  while (at >= 0) {
    const start = from[at], end = from[at + q.length - 1] + 1;
    if (start > last) out.push(str.slice(last, start));
    out.push(<mark key={start} className="hl">{str.slice(start, end)}</mark>);
    last = end;
    at = folded.indexOf(q, at + q.length);
  }
  if (!out.length) return str;
  if (last < str.length) out.push(str.slice(last));
  return out;
}

// Synopsis moved to title-details.tsx (Notion "shadcn pass 3/5").

// Reorder animation for the mobile grid and list (FLIP: first, last, invert,
// play). When the sort mode or order changes, each title's on-screen position is
// read during render, while the DOM still shows the old order. After React
// commits the new order, every visible title is shifted back to where it was and
// animated into its new slot, echoing the spatial view's card motion. Titles are
// tracked by data-flip-id rather than DOM identity because the list rebuilds its
// phase/year groups on every reorder.
// A phone screen shows only a few titles, so most of them change on a reorder:
// arrivals slide in from the side they came from, and departures leave as
// temporary copies (in a clipped, non-interactive layer) sliding toward their new
// slot. Travel is capped to part of the viewport. Skipped entirely for
// prefers-reduced-motion.
// The same animation runs when the collection filter (All/Unseen/Seen/
// Watchlist) changes, on the desktop List (its leaving copies stay inside the
// list, `inside`, so they keep its columns), and between List and Grid on
// phones (`morph`: titles move from their old spot while the old layout fades).
const FLIP_EASE = 'cubic-bezier(.2,.8,.2,1)';
const FLIP_MS = 520;
let flipLayer = null;

function measureFlip(root) {
  if (!root) return null;
  const view = root.getBoundingClientRect();
  const rects = new Map();
  const ghosts = new Map();
  root.querySelectorAll('[data-flip-id]').forEach(el => {
    const r = el.getBoundingClientRect();
    rects.set(el.dataset.flipId, r);
    if (r.bottom > view.top && r.top < view.bottom) ghosts.set(el.dataset.flipId, el.cloneNode(true));
  });
  return { view, rects, ghosts };
}

function playFlip(root, prev, opts = {}) {
  if (flipLayer) { flipLayer.remove(); flipLayer = null; }
  const view = root.getBoundingClientRect();
  const cap = view.height * 0.45;
  const clampY = dy => Math.max(-cap, Math.min(cap, dy));
  const shown = new Set();
  const next = new Map();
  let entering = 0;
  root.querySelectorAll('[data-flip-id]').forEach(el => {
    if (el.getAnimations) el.getAnimations().forEach(a => { if (a.id === 'm-flip') a.cancel(); });
    const id = el.dataset.flipId;
    const now = el.getBoundingClientRect();
    next.set(id, now);
    if (now.bottom <= view.top || now.top >= view.bottom) return;
    shown.add(id);
    const old = prev.rects.get(id);
    const wasVisible = prev.ghosts.has(id);
    let frames, delay = 0;
    if (wasVisible && opts.morph) {
      // List <-> Grid: centre to centre, fading in over the old layout.
      const dx = (old.left + old.width / 2) - (now.left + now.width / 2);
      const dy = (old.top + old.height / 2) - (now.top + now.height / 2);
      frames = [{ opacity: 0, transform: `translate(${dx}px, ${clampY(dy)}px)` }, { opacity: 1, offset: 0.5 }, { opacity: 1, transform: 'none' }];
    } else if (wasVisible) {
      const dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      frames = [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }];
    } else if (old) {
      frames = [
        { opacity: 0, transform: `translate(${old.left - now.left}px, ${clampY(old.top - now.top)}px)` },
        { opacity: 1, offset: 0.4 },
        { opacity: 1, transform: 'none' },
      ];
      delay = Math.min(entering++, 8) * 24;
    } else {
      frames = [{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'none' }];
      delay = Math.min(entering++, 8) * 24;
    }
    const anim = el.animate(frames, { duration: FLIP_MS, easing: FLIP_EASE, delay, fill: 'backwards' });
    anim.id = 'm-flip';
  });

  // On a List <-> Grid switch the whole old layout fades out in place.
  const leaving = [...prev.ghosts].filter(([id]) => opts.morph || !shown.has(id));
  if (!leaving.length) return;
  const layer = document.createElement('div');
  // Clipped to the scroll area, never in the way; inside the desktop List it
  // sits above the rows.
  layer.className = 'm-flip-layer';
  Object.assign(layer.style, { position: 'fixed', overflow: 'hidden', pointerEvents: 'none', zIndex: opts.inside ? '4' : '1' });
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  // `inside`: the layer lives in the scrolling root (so the copies keep styles
  // that depend on their container) and covers its visible part.
  const at = opts.inside
    ? { position: 'absolute', left: '0px', top: root.scrollTop + 'px', width: root.clientWidth + 'px', height: root.clientHeight + 'px' }
    : { left: view.left + 'px', top: view.top + 'px', width: view.width + 'px', height: view.height + 'px' };
  Object.assign(layer.style, at);
  // `vars`: custom properties the copies' styles read from an element below
  // the root (the desktop List's sizes, `--dl-*`, set on its table), copied
  // onto the layer with their current values, so a leaving row keeps its
  // columns and poster size instead of flashing unstyled.
  if (opts.vars) {
    const src = root.querySelector(opts.vars.from);
    if (src) { const cs = getComputedStyle(src); opts.vars.names.forEach(n => layer.style.setProperty(n, cs.getPropertyValue(n))); }
  }
  const anims = leaving.map(([id, ghost]) => {
    const old = prev.rects.get(id);
    const to = next.get(id);
    ghost.removeAttribute('data-flip-id');
    Object.assign(ghost.style, { position: 'absolute', margin: '0', boxSizing: 'border-box',
      left: (old.left - prev.view.left) + 'px', top: (old.top - prev.view.top) + 'px', width: old.width + 'px', height: old.height + 'px' });
    layer.appendChild(ghost);
    if (opts.morph) return ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLIP_MS * 0.5, easing: 'ease-out', fill: 'forwards' });
    const move = to ? `translate(${to.left - old.left}px, ${clampY(to.top - old.top)}px)` : 'scale(.97)';
    return ghost.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, offset: 0.75 }, { opacity: 0, transform: move }], { duration: FLIP_MS * 0.8, easing: FLIP_EASE, fill: 'forwards' });
  });
  (opts.inside ? root : document.body).appendChild(layer);
  flipLayer = layer;
  Promise.all(anims.map(a => a.finished)).catch(() => {}).then(() => {
    layer.remove();
    if (flipLayer === layer) flipLayer = null;
  });
}

const flipAllowed = () => typeof Element !== 'undefined' && !!Element.prototype.animate
  && !window.MCU_MOTION.reduced();

// Phones: called just before switching between List and Grid, so the view that
// mounts next can animate from the one being replaced.
let pendingSwitch = null;
function captureViewFlip() {
  pendingSwitch = measureFlip(document.querySelector('.m-main .m-scrollarea'));
}

// Phones: the filter sheet covers the list while filters change, so the list
// is measured when the sheet opens (the view's flip is paused meanwhile) and
// animated once it closes.
let pendingFlip = null;
function captureFlip() {
  pendingFlip = measureFlip(document.querySelector('.m-main .m-scrollarea'));
}
function playPendingFlip() {
  const prev = pendingFlip;
  pendingFlip = null;
  const root = document.querySelector('.m-main .m-scrollarea');
  if (prev && root && flipAllowed()) playFlip(root, prev);
}

function useReorderAnimation(orderKey, opts = {}) {
  const ref = React.useRef(null);
  const lastKey = React.useRef(orderKey);
  const before = React.useRef(null);
  if (orderKey !== lastKey.current) {
    lastKey.current = orderKey;
    if (!opts.paused) before.current = measureFlip(ref.current);
  }
  React.useLayoutEffect(() => {
    const prev = pendingSwitch;
    pendingSwitch = null;
    if (prev && ref.current && flipAllowed()) playFlip(ref.current, prev, { morph: true });
  }, []);
  React.useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || !ref.current || !flipAllowed()) return;
    playFlip(ref.current, prev, opts);
  }, [orderKey]);
  return ref;
}

// Hourglass and StoryYear moved to title-details.tsx (Notion "shadcn pass
// 3/5"); these stand-ins keep this file's own uses reading them from there.
const Hourglass = () => <window.Hourglass/>;
const StoryYear = (props) => <window.StoryYear {...props}/>;

// ReleaseLine and ReleaseBadge moved to title-details.tsx (shadcn pass 3/5).
const ReleaseLine = (props) => <window.ReleaseLine {...props}/>;
const ReleaseBadge = (props) => <window.ReleaseBadge {...props}/>;

// The phone List (Notion "Titles 4/5"): the desktop List's rules at the
// phone's size. Groups by phase (Release date, Phase) or in-story era (Story
// order) under plain headings with one mark per released title and "4/6"
// (DesktopList's GroupHeader); none for the column sorts. No folding, no
// dimming, no bulk buttons: seen titles carry the mark on their poster, and
// "Mark what you've seen" is in the header. Up next is marked in its own row
// (red edge, pill, filled check) and the list opens with that row in view;
// progress and Up next themselves are the compact card docked above the
// bottom bar (app.tsx).
function MobileList({ header, currentId, titles, sort, sortDir, onSelect, searchCharMatches, search, empty, orderKey, flipPaused, markWatch, groupProgress, upNext }) {
  const { statusOf } = window.useCollection();
  const flipRef = useReorderAnimation(orderKey, { paused: flipPaused });
  const upNextId = upNext && upNext.result && upNext.result.kind === 'next' ? upNext.result.title.id : null;
  // Opens with the Up next row in view: scrolled to it when it is below the
  // fold (or under the docked card), on first show and again when the order
  // or the tab changes. As on desktop, it never scrolls back up to it.
  const scrollWant = React.useRef(true);
  const scrollSig = sort + ':' + sortDir + ':' + (upNext && upNext.watchScope ? 'w' : '');
  const lastSig = React.useRef(scrollSig);
  if (lastSig.current !== scrollSig) { lastSig.current = scrollSig; scrollWant.current = true; }
  React.useLayoutEffect(() => {
    const area = flipRef.current;
    if (!scrollWant.current || !upNextId || !area) return undefined;
    scrollWant.current = false;
    const row = area.querySelector(`.m-lrow[data-row-id="${CSS.escape(upNextId)}"]`);
    if (!row) return undefined;
    // The docked card is already in the page but may not have published its
    // height yet, so it is measured here.
    const card = area.parentElement && area.parentElement.querySelector('.spatial-overall.docked');
    const dock = card ? card.offsetHeight + (parseFloat(getComputedStyle(card).bottom) || 0) : 0;
    if (row.getBoundingClientRect().bottom > area.getBoundingClientRect().bottom - dock) row.scrollIntoView({ block: 'center' });
    return undefined;
  });
  if (!titles.length) return <div className={S.SCROLL} ref={flipRef}>{header}<EmptyState {...(empty || {})}/></div>;
  const ranked = sort === 'imdb' || sort === 'rt';
  const lead = sort === 'rt' ? 'rt' : 'imdb';
  const groups = window.MCU_listGroups(titles, sort);
  let n = 0;
  return (
    <div className={S.SCROLL} ref={flipRef}>
      {header}
      {groups.map(g => {
        const prog = !g.flat && groupProgress ? (g.phase ? groupProgress.byPhase[g.phase] : groupProgress.byEra[g.era]) : null;
        return (
          <div className={GROUP} key={g.id}>
            {!g.flat && <window.ListGroupHeader g={g} prog={prog} phone/>}
            <div className={LIST}>
              {g.items.map(t => {
                n += 1;
                return (
                  <PhoneRow key={t.id} t={t} rank={n} ranked={ranked} lead={lead} upNext={t.id === upNextId}
                    matchedChars={searchCharMatches ? searchCharMatches[t.id] : null} search={search} onSelect={onSelect}
                    seen={statusOf(t.id) === 'seen'} watch={!!markWatch && statusOf(t.id) === 'watchlist'} current={currentId === t.id}/>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Browser Back closes the open sheet instead of leaving the app. Each sheet
// owns one history entry: opening adds it (or takes over the entry of a sheet
// that is handing off to it, such as Account → About), Back removes it and
// closes the sheet, and closing any other way (×, scrim, swipe, Escape) steps
// back over it so no stale entries pile up. A sheet entry left in history by
// Forward or a reload is reused by the next sheet rather than duplicated.
const sheetHistory = (() => {
  let active = null;      // { token, onBack } for the sheet that owns the entry
  let ignorePops = 0;     // pops caused by our own history.back()
  let seq = 0;
  const isSheetEntry = (st) => !!(st && st.mcuSheet);
  // Whether the pop being handled right now is one of ours. This listener is
  // registered first, so later popstate listeners (the address sync in
  // app.jsx) can ask during the same event and leave our own steps alone: a
  // sheet that closes itself is not the visitor pressing Back.
  let ownPop = false;
  window.MCU_isOwnSheetPop = () => ownPop;
  window.addEventListener('popstate', (e) => {
    ownPop = ignorePops > 0;
    if (ignorePops > 0) {
      ignorePops--;
      // A sheet opened while our own step back was still in flight: give it
      // its entry again so the next Back closes it rather than leaving.
      if (active && !(e.state && e.state.mcuSheet === active.token)) {
        try { history.pushState({ ...(history.state || {}), mcuSheet: active.token }, ''); } catch (err) {}
      }
      return;
    }
    if (active && !(e.state && e.state.mcuSheet === active.token)) {
      const { onBack } = active;
      active = null;
      onBack();
    }
  });
  return {
    open(onBack) {
      const token = 's' + (++seq) + '-' + Date.now();
      const st = { ...(history.state || {}), mcuSheet: token };
      try {
        if (isSheetEntry(history.state)) history.replaceState(st, '');
        else history.pushState(st, '');
      } catch (e) { return null; }
      active = { token, onBack };
      return token;
    },
    close(token) {
      if (!token || !active || active.token !== token) return;
      active = null;
      // Wait a tick: a sheet opening in the same render takes over the entry.
      setTimeout(() => {
        if (active || !history.state || history.state.mcuSheet !== token) return;
        ignorePops++;
        history.back();
      }, 0);
    },
  };
})();

// `onClose` may return false to stay open (the picker asks before dropping
// unsaved picks): Back then gets the sheet a new history entry, and a swipe
// springs back.
function Sheet({ children, onClose, tall, label, labelledBy, describedBy, className = '' }: {
  children: React.ReactNode;
  /** Returning false keeps the sheet open (the picker asks before dropping
   *  unsaved picks). */
  onClose: () => void | boolean;
  tall?: boolean;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
}) {
  const ref = React.useRef(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    const sheet = ref.current;
    const opener = document.activeElement;
    // The sheet lives inside #root, so make its app siblings inert, not #root.
    const siblings = Array.from(sheet.parentElement.children).filter((el) => el !== sheet && !el.classList.contains('m-scrim'));
    const previous = siblings.map((el) => [el, el.inert]);
    previous.forEach(([el]) => { el.inert = true; });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(sheet.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')).filter((el) => el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert]'));
    // Focus the sheet itself: screen readers announce it, Tab moves into it, and
    // no focus ring appears on a control the visitor didn't choose.
    sheet.focus();
    const keys = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const items = focusable();
      const first = items[0] || sheet;
      const last = items[items.length - 1] || sheet;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet || !sheet.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keys);
    let entry;
    const onBack = () => { if (closeRef.current() === false) entry = sheetHistory.open(onBack); };
    entry = sheetHistory.open(onBack);
    return () => {
      sheetHistory.close(entry);
      document.removeEventListener('keydown', keys);
      previous.forEach(([el, inert]) => { el.inert = inert; });
      document.body.style.overflow = overflow;
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);
  // Swipe down to close: from the handle or header, or from the content once
  // it is scrolled to the top. Past about a third of the sheet (or a quick
  // flick) it slides away; otherwise it springs back.
  React.useEffect(() => {
    const sheet = ref.current;
    const body = sheet.querySelector('.m-sheet-body');
    const scrim = sheet.previousElementSibling;
    const reduce = window.MCU_MOTION.reduced();
    let s = null;
    const place = (y, animate) => {
      const tr = animate && !reduce ? '200ms cubic-bezier(.2,.8,.2,1)' : '';
      sheet.style.transition = tr ? 'transform ' + tr : 'none';
      sheet.style.transform = y ? `translateY(${y}px)` : '';
      if (scrim) {
        scrim.style.transition = tr ? 'opacity ' + tr : 'none';
        scrim.style.opacity = y ? String(Math.max(0, 1 - y / sheet.offsetHeight)) : '';
      }
    };
    const start = (e) => {
      if (e.touches.length !== 1) { s = null; return; }
      const t = e.touches[0];
      s = { x: t.clientX, y: t.clientY, t: performance.now(), inBody: body.contains(e.target), drag: false, dy: 0 };
    };
    const move = (e) => {
      if (!s) return;
      const t = e.touches[0];
      const dy = t.clientY - s.y;
      if (!s.drag) {
        if (Math.abs(t.clientX - s.x) > Math.abs(dy) + 2 || dy < -6 || (s.inBody && body.scrollTop > 0)) { s = null; return; }
        if (dy < 8) return;
        s.drag = true;
      }
      e.preventDefault();
      s.dy = Math.max(0, dy);
      place(s.dy, false);
    };
    const end = () => {
      const d = s;
      s = null;
      if (!d || !d.drag) return;
      const fast = d.dy > 40 && d.dy / (performance.now() - d.t) > 0.6;
      if (fast || d.dy > Math.min(160, sheet.offsetHeight * 0.33)) {
        place(sheet.offsetHeight, true);
        setTimeout(() => { if (closeRef.current() === false) place(0, true); }, reduce ? 0 : 190);
      } else place(0, true);
    };
    sheet.addEventListener('touchstart', start, { passive: true });
    sheet.addEventListener('touchmove', move, { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    return () => {
      sheet.removeEventListener('touchstart', start);
      sheet.removeEventListener('touchmove', move);
      sheet.removeEventListener('touchend', end);
      sheet.removeEventListener('touchcancel', end);
    };
  }, []);
  // The frame's markup is on the design system (title-details.tsx, shadcn
  // pass 3/5); the behaviour above stays here.
  return (
    <window.SheetFrame sheetRef={ref} onClose={onClose} tall={tall} label={label} labelledBy={labelledBy}
      describedBy={describedBy} className={className}>{children}</window.SheetFrame>
  );
}

// FilterSheet moved to phone-header.tsx (Notion "shadcn pass 1/5").

// The title details (TitleDetailsBody, DetailSection, CastSheet) moved to
// title-details.tsx (Notion "shadcn pass 3/5").

// Unscaled overlay that "pops" the focused card out of the zoomed canvas so it
// stays legible: the same card as on the canvas, larger (Notion "Cards: one
// card design at rest, selected and on the phone"; Andre, 2026-11-15): the
// whole poster with its corner mark, the title and the two meta lines. A tap
// opens the details sheet, which holds Seen, Watchlist, the scores and the
// cast; in a guide, Skip / Unskip stay under the card.
function FocusPop({ title, x, y, onOpenCast, guide, guideSkip, guideBadge, onGuideSkip, connections = 0 }) {
  const { statusOf } = window.useCollection();
  if (!title) return null;
  const PosterArt = window.PosterArt;
  const seen = statusOf(title.id) === 'seen';
  const skipped = !!guideSkip && guideSkip.state === 'skipped';
  return (
    <div className={cn(S.FP.root, seen && 'seen')} style={{left:x+'px', top:y+'px'}}>
      <button className={S.FP.open} onClick={onOpenCast} aria-label={MI18N.titleName(title)}>
        <div className={S.FP.poster}>
          <PosterArt title={title}/>
          <window.CardMark seen={seen} guideBadge={guideBadge} skipped={skipped} connections={connections} pop/>
        </div>
        <window.CardText title={title} skipped={skipped} pop/>
      </button>
      {guideSkip && (guideSkip.state === 'can' || skipped) && (
        <window.GuideSkipControl guide={guide} info={guideSkip} className="m-fp-skip px-3.5 pb-3" onDone={onGuideSkip}/>
      )}
    </div>
  );
}


Object.assign(window, { useFitSteps, useReorderAnimation, captureViewFlip, captureFlip, playPendingFlip, MobileList, FocusPop, Sheet, Highlight });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { useFitSteps, useReorderAnimation, captureViewFlip, captureFlip, playPendingFlip,
  MobileList, FocusPop, Sheet, Highlight,
  MPHASE_COLORS };
