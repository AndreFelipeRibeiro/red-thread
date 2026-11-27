import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRightIcon, CheckIcon, ArrowRightIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLeaving, type WelcomeGuide } from './about';
import welcomeArt from '@/assets/first-visit/welcome.svg?url';
import lookAroundArt from '@/assets/first-visit/look-around.svg?url';
import pickArt from '@/assets/first-visit/pick.svg?url';
import followArt from '@/assets/first-visit/follow.svg?url';
import sortArt from '@/assets/first-visit/sort.svg?url';
import trackArt from '@/assets/first-visit/track.svg?url';
import guideArt from '@/assets/first-visit/guide.svg?url';
import markSeenArt from '@/assets/first-visit/mark-seen.svg?url';
import exploreArt from '@/assets/first-visit/explore.svg?url';
import takeTheTourArt from '@/assets/first-visit/take-the-tour.svg?url';
import whatsNewArt from '@/assets/first-visit/whats-new.svg?url';
import shareArt from '@/assets/first-visit/share.svg?url';
import takeTheTourDarkArt from '@/assets/first-visit/take-the-tour-dark.svg?url';

// The first visit's tour (Notion "First visit: a graphic welcome on
// Connections, and coach marks that build on today's hints", design B · v5,
// approved 2026-11-27; library: Tour card, First visit finish, Spotlight and
// Illustration in the Design System, Dialogs & sheets › First visit).
//
// - The welcome (about.tsx) offers "Show me around"; app.tsx then walks the
//   five steps and owns what each step does to the app (the map's nudge,
//   Iron Man's details, the Sort menu). This file draws them.
// - One card, five steps. 1 Look around and 2 Pick a title are things to try:
//   each ends when the visitor does it, or with Next. 3 Follow a character,
//   4 Watch your way and 5 Keep track put a Spotlight on the real control.
// - The map stays live under the card: nothing here takes pointer events but
//   the card itself, and the Spotlight only dims.
// - The drawings are SVG files with literal colors (black ink, the red
//   thread, white paper), so they keep their white paper in Dark, as the
//   library's Illustration does by being pinned to Light.

const ART: Record<string, string> = {
  welcome: welcomeArt, 'look-around': lookAroundArt, pick: pickArt, follow: followArt, sort: sortArt,
  track: trackArt, guide: guideArt, 'mark-seen': markSeenArt, explore: exploreArt,
  // About's rows (Notion "About: the new style…", 2026-11-27).
  'take-the-tour': takeTheTourArt, 'whats-new': whatsNewArt, share: shareArt,
};
// Dark copies, for drawings with ink off the paper: Take the tour's dashed
// route is white in Dark (the design's Dark rows rebind its "dash" layers to
// background), or it would vanish on the dark surface.
const ART_DARK: Record<string, string> = { 'take-the-tour': takeTheTourDarkArt };

/** One of the first visit's drawings, at its width in the place it sits
 *  (every drawing in one place shares one scale from its source, so the
 *  linework matches: the design's widths, in px like the canvas's art). */
export function Drawing({ name, width, className }: { name: string; width: number; className?: string }) {
  const img = (src: string, extra?: string) => <img src={src} alt="" aria-hidden="true" draggable={false} width={width} style={{ width }}
    className={cn('fv-drawing block h-auto max-w-none flex-none select-none', className, extra)}/>;
  if (!ART_DARK[name]) return img(ART[name]);
  return <>{img(ART[name], 'dark:hidden')}{img(ART_DARK[name], 'hidden dark:block')}</>;
}

export type TourStep = 1 | 2 | 3 | 4 | 5;
// `touch` names the strings that say it differently on phones (tap, swipe).
type StepDef = { key: string; drawing: string; widths: [number, number]; tryIt?: boolean; cardWidth: number; touch?: ('title' | 'text')[] };
// Widths from the design: the drawing on the desktop card and on the phone's
// full-width panel, and the desktop card's width per step.
export const TOUR_STEPS: StepDef[] = [
  { key: 'look', drawing: 'look-around', widths: [137, 177], tryIt: true, cardWidth: 520, touch: ['text'] },
  { key: 'pick', drawing: 'pick', widths: [122, 158], tryIt: true, cardWidth: 460, touch: ['title', 'text'] },
  { key: 'follow', drawing: 'follow', widths: [168, 217], cardWidth: 460, touch: ['text'] },
  { key: 'sort', drawing: 'sort', widths: [118, 153], cardWidth: 440 },
  { key: 'track', drawing: 'track', widths: [143, 185], cardWidth: 440 },
];
/** Step 2's title: where it all starts. */
export const TOUR_TITLE = 'iron-man';

type Box = { left: number; top: number; right: number; bottom: number };
const visibleRect = (el: Element | null): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return null;
  return { left: r.left, top: Math.max(0, r.top), right: r.right, bottom: Math.min(innerHeight, r.bottom) };
};
const union = (...boxes: (Box | null)[]): Box | null => {
  const b = boxes.filter((x): x is Box => !!x);
  if (!b.length) return null;
  return { left: Math.min(...b.map(x => x.left)), top: Math.min(...b.map(x => x.top)), right: Math.max(...b.map(x => x.right)), bottom: Math.max(...b.map(x => x.bottom)) };
};
const q = (sel: string) => [...document.querySelectorAll(sel)].find(el => el.getClientRects().length) || null;

/** What each step points at, read again while it shows (cards glide, the
 *  details slide in, the menu opens). */
export function tourTarget(step: TourStep, touch: boolean): Box | null {
  // Iron Man's card, or Up next (which names it on a first visit) when the
  // map has moved it out of view.
  if (step === 2) return visibleRect(q(`.card[data-id="${TOUR_TITLE}"]`)) || visibleRect(q('.un-mrow'));
  if (step === 3) return visibleRect(q(touch ? '.m-sheet .td-acc-cast' : '.drawer.open .td-acc-cast'));
  // Desktop: the open menu alone. It is wider than its button and opens under
  // Filters, so a box around both would cut across Filters (Andre,
  // 2026-11-27); the button shows it is open.
  if (step === 4) return touch ? visibleRect(q('.mobile-sort .sort-menu-trigger')) : visibleRect(q('.sort-menu-pop'));
  if (step === 5) return touch ? union(visibleRect(q('.m-toolrow .status-counts')), visibleRect(q('.m-toolrow .m-pick')))
    : visibleRect(q('.tb-end'));
  return null;
}

/** Re-measures a function's box every 120ms while mounted, as the hints do,
 *  and reports a change once it has held still for three reads, so the card
 *  and the spotlight move once, after a panel has slid in or scrolled, rather
 *  than chasing it. */
function useLiveBox(read: () => Box | null, deps: React.DependencyList) {
  const [box, setBox] = React.useState<Box | null>(null);
  React.useEffect(() => {
    setBox(null); // a new step: the old target no longer counts
    let t = 0, last = '', seen = '', count = 0;
    const tick = () => {
      const b = read();
      const key = b ? [b.left, b.top, b.right, b.bottom].map(Math.round).join() : 'none';
      count = key === seen ? count + 1 : 0; seen = key;
      if (key !== last && count >= 2) { last = key; setBox(b); }
      t = window.setTimeout(tick, 120);
    };
    tick();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return box;
}

/** The dim with a cutout and a 2px brand ring (library: Spotlight). Purely
 *  visual: the control in the cutout stays live. Between steps the cutout
 *  closes (it fills with the same dim, so the whole screen is evenly dimmed
 *  while the page changes under it), moves while closed, and opens on the
 *  next target: nothing glides, and nothing flashes bright mid-change
 *  (Andre, 2026-11-27). `dim` is the dim itself (in, out, or cut at once
 *  with `instant`); `open` is the cutout and its ring. */
export function Spotlight({ box, dim, open, instant = false }: { box: Box | null; dim: boolean; open: boolean; instant?: boolean }) {
  const [last, setLast] = React.useState<Box | null>(box);
  const key = box ? [box.left, box.top, box.right, box.bottom].map(Math.round).join() : '';
  React.useEffect(() => { if (box) setLast(box); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = box || last;
  // The first time the cutout appears (out of the full dim) it opens a frame
  // later, so it fades open rather than popping.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    if (!b) { setMounted(false); return undefined; }
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, [!!b]); // eslint-disable-line react-hooks/exhaustive-deps
  // 6px around the target, kept inside the screen (with room for the ring)
  // when the target runs to its edge, as the details' cast does.
  const pad = 6, m = 5;
  const L = b ? Math.max(m, b.left - pad) : 0, T = b ? Math.max(m, b.top - pad) : 0;
  const R = b ? Math.min(innerWidth - m, b.right + pad) : 0, B = b ? Math.min(innerHeight - m, b.bottom + pad) : 0;
  const hole = !!b && open && mounted;
  // While it shows, the dim is a shield: outside the cutout nothing can be
  // hovered, clicked, scrolled or touched, so a visitor can't wander into
  // another part of the page mid-step; while the cutout is closed, nothing
  // at all. Events stop here, since the portal would otherwise hand them on
  // to the app's own handlers.
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); };
  const shield = (style: React.CSSProperties) => (
    <div aria-hidden="true" data-tour-shield="" style={style} className="fixed z-[101] touch-none"
      onPointerDown={stop} onMouseDown={stop} onClick={stop} onWheel={stop} onTouchStart={stop} onContextMenu={stop}/>
  );
  const fade = instant ? 'transition-none' : 'transition-opacity duration-[220ms] ease-out motion-reduce:transition-none';
  return (
    <>
      {dim && (hole ? <>
        {shield({ left: 0, top: 0, right: 0, height: Math.max(0, T) })}
        {shield({ left: 0, top: B, right: 0, bottom: 0 })}
        {shield({ left: 0, top: T, width: Math.max(0, L), height: B - T })}
        {shield({ left: R, top: T, right: 0, height: B - T })}
      </> : shield({ inset: 0 }))}
      {b ? (
        <div aria-hidden="true" data-tour-spotlight="" data-on={dim ? '1' : '0'} data-open={hole ? '1' : '0'}
          className={cn('tour-spotlight pointer-events-none fixed z-[101] rounded-xl shadow-[0_0_0_200vmax_var(--spotlight-dim)]', fade, dim ? 'opacity-100' : 'opacity-0')}
          style={{ left: L, top: T, width: R - L, height: B - T }}>
          {/* The cutout's fill (closed: the same dim) and its ring (open). */}
          <span className={cn('absolute inset-0 rounded-[inherit] bg-(--spotlight-dim)', fade, hole ? 'opacity-0' : 'opacity-100')}/>
          <span className={cn('absolute -inset-[3px] rounded-[15px] border-2 border-(--brand)', fade, hole ? 'opacity-100' : 'opacity-0')}/>
        </div>
      ) : (
        <div aria-hidden="true" data-tour-spotlight="" data-on={dim ? '1' : '0'} data-open="0"
          className={cn('tour-spotlight pointer-events-none fixed inset-0 z-[101] bg-(--spotlight-dim)', fade, dim ? 'opacity-100' : 'opacity-0')}/>
      )}
    </>
  );
}

/** Where the card goes: next to what the step is about on desktop; on
 *  phones docked above the nav bar, or below the app bar for steps 4–5
 *  (and above the cast for step 3). */
function placeCard(step: TourStep, touch: boolean, target: Box | null, w: number, h: number) {
  const m = 12, gap = 24;
  const clampX = (x: number) => Math.max(m, Math.min(innerWidth - m - w, x));
  const clampY = (y: number) => Math.max(m, Math.min(innerHeight - m - h, y));
  if (touch) {
    const nav = q('.m-navbar');
    const navTop = nav ? nav.getBoundingClientRect().top : innerHeight;
    if ((step === 4 || step === 5) && target) return { x: m, y: clampY(target.bottom + 14) };
    if (step === 3 && target) return { x: m, y: clampY(target.top - 10 - h) };
    return { x: m, y: clampY(navTop - 10 - h) };
  }
  if (!target) return { x: clampX((innerWidth - w) / 2), y: clampY(innerHeight - 28 - h) };
  if (step === 5) return { x: clampX(target.right - w), y: clampY(target.bottom + 10) };
  const right = target.right + gap, left = target.left - gap - w;
  const preferRight = step === 2;
  const x = preferRight ? (right + w <= innerWidth - m ? right : left) : (left >= m ? left : right);
  return { x: clampX(x), y: clampY(target.top + (step === 2 ? 46 : 0)) };
}

/** The tour card's outline and shadow (shadow-lg's look), as drop-shadows.
 *  The card has no caret (Andre, 2026-11-27: it crowded Next; the red hint
 *  tooltips keep theirs). */
const CARD_EDGE = 'drop-shadow(0 0 0.6px color-mix(in oklab, var(--foreground) 24%, transparent)) drop-shadow(0 8px 12px rgb(0 0 0 / 0.08)) drop-shadow(0 3px 5px rgb(0 0 0 / 0.07))';

/** How long the card and the dim take to fade out before the page changes
 *  for the next step (app.tsx waits this long before opening the details or
 *  the Sort menu). */
export const TOUR_CHANGE_MS = 420;

/** The tour card (library: Tour card, Device × Step). Moving to a step is
 *  five beats (Andre, 2026-11-27): the card fades out with its words; the
 *  dim fades out; the page changes (the details open, the Sort menu
 *  opens); the ring and the dim fade in on the new target; the card fades
 *  in beside it. Nothing glides. × skips to the finish, Back goes a step
 *  back, and each dash goes to its step. */
export function TourCard({ step, touch, count, paused = false, byAction = false, leaving = false, onNext, onBack, onGo, onSkip }: {
  step: TourStep; touch: boolean; count: number; onNext: () => void; onBack: () => void; onGo: (n: TourStep) => void; onSkip: () => void;
  /** Set while the visitor explores what a step offered (a character on step 3): the card and dim go at once. */
  paused?: boolean;
  /** The step ended because the visitor did it: the page is already moving, so the highlight closes with the card. */
  byAction?: boolean;
  /** On the way to the finish: the card and the dim fade out where they are. */
  leaving?: boolean;
}) {
  const { tr } = window.useI18n();
  const ref = React.useRef<HTMLDivElement>(null);
  // Measured afresh once the page is ready for the step (a read from before
  // a glide would be stale).
  const [settled, setSettled] = React.useState(true);
  const target = useLiveBox(() => tourTarget(step, touch), [step, touch, settled]);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el); setSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);
  // The window's size moves the card too.
  const [, setTick] = React.useState(0);
  React.useEffect(() => { const f = () => setTick(t => t + 1); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  // shown: the step on the card. phase: 'in' (showing), 'out' (the card
  // fading), 'dark' (the dim fading, the page changing, waiting for the new
  // target), 'light' (the ring and dim fading in; the card follows).
  const [shown, setShown] = React.useState<TourStep>(step);
  const [phase, setPhase] = React.useState<'in' | 'out' | 'dark' | 'light'>('in');
  const [waited, setWaited] = React.useState(false);
  const reduce = window.MCU_MOTION.reduced();
  React.useEffect(() => {
    if (step === shown && phase === 'in') return undefined;
    setPhase('out'); setSettled(false); setWaited(false);
    const a = window.setTimeout(() => setPhase('dark'), reduce ? 0 : 200);
    // The app says when the page is ready for the step (after a glide, the
    // details or the menu); a fallback if it never does.
    const onSettled = (e: Event) => { if ((e as CustomEvent<number>).detail === step) setSettled(true); };
    window.addEventListener('mcu:tour-settled', onSettled);
    const b = window.setTimeout(() => setSettled(true), reduce ? 0 : 2200);
    // Nothing to point at after a while: the step's default place.
    const c = window.setTimeout(() => setWaited(true), 2500);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); window.removeEventListener('mcu:tour-settled', onSettled); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const ready = step === 1 || !!target || waited;
  // Entering 'light', the new step's words go in while the card is still
  // hidden, so it is measured and placed at its new size before it shows.
  React.useEffect(() => { if (phase === 'dark' && settled && ready) { setShown(step); setPhase('light'); } }, [phase, settled, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (phase !== 'light') return undefined;
    const t = window.setTimeout(() => setPhase('in'), reduce || step === 1 ? 0 : 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step]);
  const def = TOUR_STEPS[shown - 1];
  // A change is pending from the moment the step moves until the new step
  // lights: until then the card keeps its place, and fades there.
  const lit = (phase === 'light' || phase === 'in') && !(phase === 'in' && step !== shown);
  // Placed while hidden, so it appears where it belongs.
  const lastPlace = React.useRef<{ x: number; y: number } | null>(null);
  const placed = !size ? null
    : !lit && lastPlace.current ? lastPlace.current
    : placeCard(step, touch, step === 1 ? null : target, size.w, size.h);
  // On whole pixels, so its text stays crisp.
  const place = placed && { x: Math.round(placed.x), y: Math.round(placed.y) };
  if (place) lastPlace.current = place;
  // Step 4 is about the open Sort menu: if it closes (a click on the dim, a
  // pick), it opens again while the step lasts.
  React.useEffect(() => {
    if (step !== 4 || touch || phase !== 'in') return undefined;
    const t = window.setInterval(() => {
      if (!document.querySelector('.sort-menu-pop')) window.dispatchEvent(new CustomEvent('mcu:sort-menu', { detail: true }));
    }, 500);
    return () => clearInterval(t);
  }, [step, touch, phase]);
  // Escape skips to the finish, unless a menu or dialog on top owns it (the
  // Sort menu on step 4 closes first).
  React.useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || paused) return;
      if (document.querySelector('[aria-modal="true"], .sort-menu-pop')) return;
      e.preventDefault(); e.stopImmediatePropagation(); onSkip();
    };
    window.addEventListener('keydown', keys, true);
    return () => window.removeEventListener('keydown', keys, true);
  }, [onSkip, paused]);
  const k = 'tour.' + def.key;
  // Coming out of a pause the card and dim stay away until the next step
  // arrives: no flash of the old step, no old highlight over a closed panel.
  const fromPause = React.useRef(false);
  if (paused) fromPause.current = true;
  const settledIn = phase === 'in' && step === shown;
  React.useEffect(() => { if (settledIn && !paused) fromPause.current = false; }, [settledIn, paused]);
  const quiet = paused || (fromPause.current && phase !== 'light' && !settledIn);
  const visible = settledIn && !paused && !leaving;
  const start = window.TITLES.find(x => x.id === TOUR_TITLE);
  const t = (name: 'title' | 'text') => tr(k + '.' + name + (touch && def.touch?.includes(name) ? 'Touch' : ''),
    { n: count, title: start ? window.MCU_I18N.titleName(start) : '' });
  const kicker = tr('tour.kicker', { n: shown, total: TOUR_STEPS.length }) + (def.tryIt ? ' · ' + tr('tour.tryIt') : '');
  // In the body, above the phone's details sheet (step 3) and outside it, so
  // the sheet's focus trap never makes the card inert.
  return createPortal(
    <>
      {/* The dim stays while the card fades out, then goes; it returns on the new target before the card. */}
      {/* in/out: the dim of the step on show, open. dark: closed, kept if either
          step has one. light: the new step's dim, open on its target. */}
      <Spotlight box={lit ? target : null} instant={paused}
        dim={!quiet && !leaving && (phase === 'dark' ? shown > 1 || step > 1 : phase === 'light' ? step > 1 : shown > 1)}
        open={phase === 'in' ? shown > 1 : phase === 'out' ? shown > 1 && !byAction : phase === 'light' && step > 1 && !!target}/>
      <div ref={ref} role="region" aria-label={tr('tour.label')} data-tour-step={shown} data-tour-phase={phase}
        style={{ left: place ? place.x : -9999, top: place ? place.y : -9999, width: touch ? 'calc(100vw - 24px)' : def.cardWidth, filter: CARD_EDGE }}
        className={cn('tour-card fixed z-[102] flex max-w-[calc(100vw-24px)] items-center rounded-xl bg-(--surface-raised) text-popover-foreground',
          touch ? 'p-4' : 'gap-4 py-3 pr-4 pl-3',
          'transition-[opacity,translate] ease-out motion-reduce:transition-none',
          visible ? 'translate-y-0 opacity-100 duration-[260ms]' : 'pointer-events-none translate-y-1.5 opacity-0 duration-200',
          paused && 'transition-none',
          !place && 'invisible')}>
        <Button variant="ghost" size="icon-xs" className="tour-close tour-skip absolute top-1.5 right-1.5 text-muted-foreground" onClick={onSkip}
          aria-label={tr('tour.skip')} title={tr('tour.skip')} tabIndex={visible ? 0 : -1}><XIcon/></Button>
        {/* Phones: words only, so the card leaves the map room (Andre,
            2026-11-27: the thumbnail drawings were too small). */}
        {!touch && <div className="tour-art flex h-32 w-46 flex-none items-center justify-center overflow-hidden rounded-lg border bg-(--surface-raised)">
          <Drawing name={def.drawing} width={def.widths[0]}/>
        </div>}
        <div className={cn('tour-text flex min-w-0 flex-1 flex-col', touch ? 'gap-0.5' : 'gap-1')}>
          <div aria-live="polite" className="flex flex-col gap-[inherit] pr-6">
            <span className="tour-kicker text-caption font-semibold text-(--brand-text)">{kicker}</span>
            <h2 className="tour-title text-heading font-semibold text-foreground">{t('title')}</h2>
            <p className="tour-body text-label text-pretty text-muted-foreground">{t('text')}</p>
          </div>
          <div className="tour-progress flex items-center gap-1 pt-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button key={i} type="button" onClick={() => onGo((i + 1) as TourStep)} tabIndex={visible ? 0 : -1}
                aria-label={tr('tour.goTo', { n: i + 1 })} aria-current={i + 1 === shown ? 'step' : undefined}
                className={cn('tour-dot-hit -my-2 flex cursor-pointer items-center rounded-sm py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50', touch ? 'px-0.5' : 'px-px')}>
                <span aria-hidden="true" className={cn('tour-dot block h-1 rounded-[2px] transition-[width,background-color] duration-300 motion-reduce:transition-none',
                  i + 1 <= shown ? 'bg-(--brand)' : 'bg-border hover:bg-muted-foreground', i + 1 === shown ? (touch ? 'w-3.5' : 'w-4') : (touch ? 'w-[5px]' : 'w-1.5'))}/>
              </button>
            ))}
            <span className="flex-1"/>
            {shown > 1 && <Button variant="ghost" size="xs" className="tour-back text-label" onClick={onBack} tabIndex={visible ? 0 : -1}>{tr('tour.back')}</Button>}
            <Button size="xs" className="tour-next gap-1 text-label" onClick={onNext} tabIndex={visible ? 0 : -1}>
              {tr(shown === TOUR_STEPS.length ? 'tour.done' : 'tour.next')}{shown < TOUR_STEPS.length && <ArrowRightIcon aria-hidden="true" className="size-3.5"/>}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

/** The finish: "Where do you want to start?" with three equal choices
 *  (library: First visit finish). The guide leads only by its kicker and its
 *  primary button; no red outline, so it doesn't read as the next step
 *  (Andre, 2026-11-27). A panel of cards on desktop, a sheet of rows on
 *  phones; each whole card or row is the button. */
export function TourFinish({ touch, guide, onGuide, onPick, onClose }: {
  touch: boolean; guide: WelcomeGuide | null; onGuide: () => void; onPick: () => void; onClose: () => void;
}) {
  const { tr } = window.useI18n();
  const G = window.MCU_GUIDE;
  // It rises in from where the card was, and fades out before a choice acts.
  const w = useLeaving();
  onGuide = w.leave(onGuide); onPick = w.leave(onPick); onClose = w.leave(onClose);
  const choices: { key: string; drawing: string; widths: [number, number]; kicker?: string; title: string; text: string; cta: string; lead?: boolean; icon?: boolean; go: () => void }[] = [];
  if (guide) {
    const n = G.stops(guide.guide, false).length;
    const time = G.duration(G.minutes(guide.guide, null).total, true, false);
    const date = guide.days != null && guide.days > 0 ? G.targetDate(guide.guide) : '';
    const kicker = guide.days != null && guide.days > 0
      ? [tr('guide.group.coming'), touch ? '' : date, tr('guide.hero.daysLeft', { n: guide.days })].filter(Boolean).join(' · ') : undefined;
    choices.push({ key: 'guide', drawing: 'guide', widths: [180, 96], kicker, lead: true, go: onGuide,
      title: guide.title ? tr('welcome.guideGo', { title: window.MCU_I18N.titleName(guide.title) }) : G.name(guide.guide),
      text: tr(touch ? 'tour.finish.guideTextTouch' : 'tour.finish.guideText', { n, time }), cta: tr('guide.promoStart') });
  }
  choices.push({ key: 'seen', drawing: 'mark-seen', widths: [180, 96], go: onPick, icon: true,
    title: tr('tour.finish.seenTitle'), text: tr(touch ? 'tour.finish.seenTextTouch' : 'tour.finish.seenText'), cta: tr('picker.welcomeCta') });
  choices.push({ key: 'explore', drawing: 'explore', widths: [212, 113], go: onClose,
    title: tr('tour.finish.exploreTitle'), text: tr(touch ? 'tour.finish.exploreTextTouch' : 'tour.finish.exploreText'), cta: tr('about.start') });
  const heading = (
    <div className="tour-finish-head flex flex-col gap-1 pr-10 in-[.m-sheet]:gap-0.5 in-[.m-sheet]:pr-0">
      <h2 id="tour-finish-title" className={cn('font-semibold tracking-tight text-foreground', touch ? 'text-title' : 'text-display-sm')}>{tr('tour.finish.title')}</h2>
      <p className="text-label text-muted-foreground">{tr(touch ? 'tour.finish.leadTouch' : 'tour.finish.lead')}</p>
    </div>
  );
  if (touch) return (
    <window.Sheet onClose={onClose} label={tr('tour.finish.title')}
      className={cn('tour-finish bg-(--surface-raised) animate-[welcome-sheet-rise_460ms_cubic-bezier(.2,.8,.2,1)_both]', w.leaving && 'pointer-events-none animate-[welcome-sheet-sink_200ms_ease_both]')}
      scrimClassName={cn('bg-(--welcome-scrim) animate-[welcome-scrim-in_350ms_ease-out_both]', w.leaving && 'pointer-events-none animate-[welcome-out_200ms_ease_both]')}>
      <div className="flex flex-col gap-3 pb-1">
        {heading}
        {choices.map((c, i) => (
          <button key={c.key} type="button" onClick={c.go} data-choice={c.key}
            style={{ animationDelay: i * 60 + 'ms' }}
            className="tour-choice flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-(--surface-raised) py-2 pr-2.5 pl-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 animate-[un-in_300ms_ease_both] motion-reduce:animate-none">
            <span className="flex h-24 w-28 flex-none items-center justify-center overflow-hidden rounded-lg border bg-(--surface-raised)"><Drawing name={c.drawing} width={c.widths[1]}/></span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {c.kicker && <span className="text-caption font-semibold text-(--brand-text)">{c.kicker}</span>}
              <span className="text-body font-semibold text-foreground">{c.title}</span>
              <span className="text-label text-muted-foreground">{c.text}</span>
              <span className="sr-only">{c.cta}</span>
            </span>
            <ChevronRightIcon className="size-6 flex-none text-muted-foreground" aria-hidden="true"/>
          </button>
        ))}
      </div>
    </window.Sheet>
  );
  const Modal = window.ModalDialog;
  return (
    <Modal onClose={onClose} labelledBy="tour-finish-title" leaving={w.leaving}
      scrimClassName="bg-(--welcome-scrim) animate-[welcome-scrim-in_350ms_ease-out_both]"
      className="tour-finish w-[min(840px,calc(100vw-48px))] bg-(--surface-raised) px-7 pt-[26px] pb-6 animate-[welcome-rise_460ms_cubic-bezier(.2,.8,.2,1)_both]">
      <div className="flex flex-col gap-5">
        {heading}
        <div className="tour-choices grid gap-3.5 pb-2" style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}>
          {choices.map((c, i) => (
            <button key={c.key} type="button" onClick={c.go} data-choice={c.key}
              style={{ animationDelay: i * 60 + 'ms' }}
              className="tour-choice flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-(--surface-raised) text-left outline-none transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-card-hover focus-visible:-translate-y-1 focus-visible:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 animate-[un-in_300ms_ease_both] motion-reduce:animate-none">
              <span className="flex h-39 w-full flex-none items-center justify-center overflow-hidden bg-(--surface-raised)"><Drawing name={c.drawing} width={c.widths[0]}/></span>
              <span className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-4">
                {c.kicker && <span className="text-caption font-semibold text-(--brand-text)">{c.kicker}</span>}
                <span className="text-heading font-semibold text-foreground">{c.title}</span>
                <span className="text-label text-muted-foreground">{c.text}</span>
                <span className="min-h-3 flex-1"/>
                <span className={cn(buttonVariants({ variant: c.lead ? 'default' : 'outline' }), 'pointer-events-none w-full gap-2')} aria-hidden="true">
                  {c.icon && <CheckIcon className="size-[15px]"/>}{c.cta}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { TourCard, TourFinish, Spotlight, Drawing });
export { ART as FIRST_VISIT_ART };
