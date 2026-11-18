import React from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// First-use hints (Notion "First-use hints: teach Connections, the character
// view and guides when they're first used", 2026-11-18): one short line, at
// the moment an interaction is first met, once per device. The welcome names
// the ideas; a hint shows the one in front of you.
//
// - One at a time: app.tsx decides which moment applies (the first in its
//   order) and passes it here; nothing shows over the welcome, a sheet or a
//   dialog.
// - Shown once: a hint is marked done when its action is taken (app.tsx
//   calls MCU_HINTS.done) or when it is dismissed (×, Escape). Settings'
//   "Show the welcome again" resets them.
// - Escape dismisses the hint before anything else closes.
// - Automated browsers (QA) don't get hints unless they ask for them
//   (localStorage `mcu.hints.qa` = '1'), so the other checks, which never
//   expected a hint, keep clicking where they always have.

const KEY = 'mcu.hints.v1';
type Done = Record<string, 1>;

function read(): Done {
  try { return JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
}
const listeners = new Set<() => void>();
function write(next: Done) {
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* no storage: shown again next visit */ }
  listeners.forEach((f) => f());
}

export const MCU_HINTS = {
  isDone: (id: string) => !!read()[id],
  done: (id: string) => { const d = read(); if (!d[id]) { d[id] = 1; write(d); } },
  reset: () => { try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } listeners.forEach((f) => f()); },
  /** Hints are on for people, and for QA only when asked. */
  enabled: () => {
    try { if (navigator.webdriver) return window.localStorage.getItem('mcu.hints.qa') === '1'; } catch (e) { return false; }
    return true;
  },
};

// Escape dismisses a showing hint before anything else closes (one layer per
// press). Registered when this module loads, in the capture phase on window,
// so it runs ahead of the app's own Escape handlers, which register later.
let activeHint: string | null = null;
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !activeHint) return;
  const t = e.target instanceof Element ? e.target : null;
  if (t && t.closest('input, textarea, select, [contenteditable="true"]')) return;
  // A dialog on top owns Escape.
  if (document.querySelector('[aria-modal="true"]')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  MCU_HINTS.done(activeHint);
  activeHint = null;
}, true);

/** Re-renders when a hint is marked done or reset. */
export function useHintsVersion() {
  const [v, setV] = React.useState(0);
  React.useEffect(() => { const f = () => setV((x) => x + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return v;
}

/** Where a hint points: the element itself (a selector, or a function that
 *  finds it), read again while it shows, since cards glide and panels slide. */
export type HintAnchor = string | (() => Element | null);
function findAnchor(a: HintAnchor): Element | null {
  const el = typeof a === 'string' ? document.querySelector(a) : a();
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? el : null;
}

/** The hint itself (Andre, 2026-11-18): a small bubble whose arrow points at
 *  what it's about, below it when it sits in the top half of the screen and
 *  above it otherwise, kept inside the screen. It waits a beat before
 *  appearing, so it follows the moment rather than arriving with it, and
 *  announces itself politely to screen readers. With nothing to point at
 *  (scrolled away, not drawn yet) it waits. */
export function FirstHint({ id, text, anchor }: { id: string; text: string; anchor: HintAnchor; touch?: boolean }) {
  const { tr } = window.useI18n();
  const [ready, setReady] = React.useState(false);
  const [place, setPlace] = React.useState<{ x: number; y: number; ax: number; below: boolean } | null>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setReady(false); setPlace(null);
    const t = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(t);
  }, [id]);
  React.useEffect(() => {
    if (!ready) return undefined;
    let raf = 0, last = '';
    const measure = () => {
      // A menu or popover open on top: the hint steps aside until it closes.
      const menu = [...document.querySelectorAll('[data-slot="popover-content"], [role="menu"], [role="listbox"]')].some(m => m.getClientRects().length);
      const el = menu ? null : findAnchor(anchor);
      const box = boxRef.current;
      if (!el || !box) { if (last !== 'none') { last = 'none'; setPlace(null); } }
      else {
        const r = el.getBoundingClientRect();
        const w = box.offsetWidth, h = box.offsetHeight, gap = 12, m = 12;
        const below = (r.top + r.bottom) / 2 < innerHeight / 2;
        const cx = (r.left + r.right) / 2;
        const x = Math.max(m, Math.min(innerWidth - m - w, cx - w / 2));
        const y = below ? Math.min(r.bottom + gap, innerHeight - m - h) : Math.max(m, r.top - gap - h);
        const ax = Math.max(16, Math.min(w - 16, cx - x));
        const key = [x, y, ax, below].map(v => typeof v === 'number' ? Math.round(v) : v).join();
        if (key !== last) { last = key; setPlace({ x, y, ax, below }); }
      }
      raf = window.setTimeout(measure, 120) as unknown as number;
    };
    measure();
    return () => clearTimeout(raf);
  }, [ready, anchor, id]);
  const shown = ready && !!place;
  React.useEffect(() => {
    if (!shown) return undefined;
    activeHint = id;
    return () => { if (activeHint === id) activeHint = null; };
  }, [shown, id]);
  return (
    <div ref={boxRef} role="status" aria-live="polite" data-hint={id}
      style={{ left: place ? place.x : -9999, top: place ? place.y : -9999 }}
      className={'first-hint fixed z-80 w-max max-w-[min(300px,calc(100vw-24px))] rounded-lg bg-primary py-2.5 pr-9 pl-3.5 text-label leading-snug font-medium text-primary-foreground shadow-lg transition-opacity duration-200 motion-reduce:transition-none '
        + (shown ? 'opacity-100' : 'pointer-events-none opacity-0')}>
      {/* The arrow: a square turned 45°, half outside the bubble's edge. The
          bubble is the brand red (--primary: the same red and white in both
          themes, as on Mark seen), so it reads as a note on top of the
          interface (Andre, 2026-11-18). */}
      {place && <span aria-hidden="true" style={{ left: place.ax - 6 }}
        className={'absolute size-3 rotate-45 rounded-[2px] bg-primary ' + (place.below ? '-top-1.5' : '-bottom-1.5')}/>}
      <span className="relative block text-pretty">{shown ? text : ''}</span>
      <Button variant="ghost" size="icon-sm" className="hint-x absolute top-1 right-1 rounded-full text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground [&_svg]:size-3.5" aria-label={tr('hint.dismiss')} title={tr('hint.dismiss')}
        tabIndex={shown ? 0 : -1} onClick={() => MCU_HINTS.done(id)}>
        <XIcon aria-hidden="true"/>
      </Button>
    </div>
  );
}

Object.assign(window, { MCU_HINTS });
