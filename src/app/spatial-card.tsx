// A title's card on the Spatial canvas (Notion "shadcn pass 2/5: Spatial
// canvas, cards and threads"; simplified in Notion "Simplify the Spatial
// cards"; made one design in Notion "Cards: one card design at rest, selected
// and on the phone"; Andre's review, 2026-11-15): the whole poster, its art
// untouched, with how many titles it connects to in its top-left corner and
// one status mark in its top-right corner (a check in a circle once seen, or
// in a guide the stop's mark); under it the title and one meta line (phase
// dot · year · "Series").
// What else a card shows by sort and filter is its own ticket (Notion "Cards
// show what the current sort and filters are about"). Selected, it is
// the same card at the same size, outlined in its phase colour; Seen,
// Watchlist and the scores are in the details beside it. The phone's selected
// card (FocusPop in mobile.tsx) is this card, larger. Hover only lifts it.
//
// Moved out of app.tsx so it can be built on the design system: this file is
// listed with `@source` in src/index.css. The canvas lays cards out from
// CARD_SIZE (rows, threads, hit areas, zoom-to-fit), so the card's height is
// set here once: the poster is shown whole at 2:3 (Notion "Show posters
// uncropped at their standard 2:3 ratio"), the text block below it.
//
// Rules the canvas keeps (AGENTS.md, "Spatial canvas performance"): no
// will-change, no 3D transform and no backdrop-filter on a card or anything in
// it, and pixel sizes rather than the type scale (the canvas has its own
// zoom).
//
// Class names the canvas code, the Escape ladder and the QA checks read are
// kept as hooks (`card` and its state classes, `card-open`, `card-poster`,
// `card-gnum`, `card-phase`, `card-seen`, `card-meta`, `card-title`,
// `card-year`, `card-story`, `card-budget`, `card-acts`, `card-acts-tsa`,
// `card-rating`…).
import React, { useRef, useState } from 'react';
import { cn } from 'cn';
import type { Title } from '../types/catalog';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

/** The card's size on the canvas, in canvas pixels. The layout reads it.
 *  168px inside the border, so the 2:3 poster is 168 × 252 and the text
 *  block below gets 76px: two lines of title and one meta line. */
export const CARD_SIZE = { w: 170, h: 330 };

// Layout moves (AGENTS.md, "Motion"), then the state fades.
const MOVE = '[transition:transform_600ms_cubic-bezier(.2,.8,.2,1),box-shadow_220ms,border-color_220ms,opacity_220ms,filter_220ms,visibility_0s]';

// Box shadows, in the order the states override each other.
const SHADOW = {
  base: 'shadow-sm not-dark:shadow-[0_1px_2px_rgb(0_0_0/.05),0_10px_24px_-14px_rgb(0_0_0/.22)]',
  drag: 'shadow-[0_24px_50px_-8px_rgba(0,0,0,0.6),0_0_0_1px_var(--phase-color)]',
  // Hover is a slight lift, nothing more.
  hover: 'hover:shadow-[0_18px_36px_-12px_rgb(0_0_0/.55)] not-dark:hover:shadow-[0_16px_32px_-14px_rgb(0_0_0/.3)]',
  selected: 'shadow-[0_0_0_2px_var(--phase-color),0_20px_50px_-8px_color-mix(in_oklab,var(--phase-color)_70%,transparent)]',
  highlighted: 'shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_40%,transparent),0_16px_40px_-8px_color-mix(in_oklab,var(--foreground)_27%,transparent)] not-dark:shadow-[0_14px_34px_-14px_color-mix(in_oklab,var(--foreground)_30%,transparent)]',
  current: 'shadow-[0_0_0_3px_var(--cur-color,var(--primary)),0_0_44px_6px_color-mix(in_oklab,var(--cur-color,var(--primary))_50%,transparent),0_24px_50px_-8px_rgba(0,0,0,.65)]',
};

export interface CardProps {
  title: Title;
  pos: { x: number; y: number };
  onClick: () => void;
  onHover: (id: string | null) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onFocusCard?: (id: string) => void;
  focusable?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isCollDimmed?: boolean;
  isRingHidden?: boolean;
  isRingFocus?: boolean;
  isDragging?: boolean;
  isCurrent?: boolean;
  curColor?: string;
  matchedChars?: string[] | null;
  searchQuery?: string;
  scale?: number;
  guideBadge?: { cls: string; label: string; text: string } | null;
  guide?: unknown;
  guideSkip?: { state: string } | null;
  onGuideSkip?: () => void;
  entering?: boolean;
  /** Titles this one is joined to by a thread (shared characters). */
  connections?: number;
  /** The phone's canvas (`.app.touch`): tap, not drag. */
  touch?: boolean;
}

export function SpatialCard({ title, pos, onClick, onHover, onDragStart, onFocusCard, focusable, isSelected, isHighlighted, isDimmed, isCollDimmed, isRingHidden, isRingFocus, isDragging, isCurrent, curColor, matchedChars, searchQuery, scale, guideBadge, guide, guideSkip, onGuideSkip, entering, connections = 0, touch = false }: CardProps) {
  const I18N = window.MCU_I18N;
  const phaseColor = (window.PHASE_COLORS as Record<string, string>)[title.phase];
  // A card a filter brings back fades in (Notion V4 Tasks, "Micro-interaction:
  // cards fade softly when a filter changes"); the canvas's first cards don't.
  const [enter, setEnter] = useState(!!entering);
  const downRef = useRef({ x: 0, y: 0, moved: false });
  const { statusOf } = window.useCollection() as unknown as { statusOf: (id: string) => string };
  const status = statusOf(title.id);
  const seen = status === 'seen', listed = status === 'watchlist';
  const skipped = !!guideSkip && guideSkip.state === 'skipped';

  // The states, resolved in the order they override each other (later wins):
  // dragging, hover, selected, highlighted, dimmed, watchlisted, collection
  // dimming, hidden by a ring, a skipped guide stop, the stepper's current
  // title. Hover only shows what no state after it overrides.
  let border = 'border-border', shadow = SHADOW.base, z = 'z-10', fade = '', lift = '';
  if (isDragging) { z = 'z-30'; shadow = SHADOW.drag; }
  if (isSelected) { border = 'border-(--phase-color)'; shadow = SHADOW.selected; z = 'z-25'; }
  if (isHighlighted) { border = 'border-[color-mix(in_oklab,var(--foreground)_53%,transparent)] not-dark:border-[color-mix(in_oklab,var(--foreground)_22%,transparent)]'; shadow = SHADOW.highlighted; z = 'z-22'; }
  if (isDimmed) fade = 'opacity-22 saturate-40';
  if (listed) border = 'border-[color-mix(in_oklab,var(--status-watch)_45%,var(--border))]';
  if (isCollDimmed) fade = 'opacity-26 saturate-30';
  if (skipped) border = 'border-dashed border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))]';
  if (isCurrent) { border = 'border-(--cur-color,var(--primary))'; shadow = SHADOW.current; z = 'z-28'; fade = 'filter-none'; lift = '[--lift:1.08] motion-reduce:[--lift:1]'; }
  // The desktop ring's centre is the same card at the same size (Andre,
  // 2026-11-15); its outline and shadow mark it.
  if (isRingFocus && !touch) z = 'z-27';
  const stateOwnsBorder = isSelected || isHighlighted || listed || skipped || isCurrent;
  const stateOwnsShadow = isSelected || isHighlighted || isCurrent;
  const hover = cn(!stateOwnsShadow && SHADOW.hover,
    !(isSelected || isHighlighted || isCurrent || (isRingFocus && !touch)) && 'hover:z-20',
    !(isCurrent || (isRingFocus && !touch) || isDragging || touch) && 'hover:[--lift:1.025] motion-reduce:hover:[--lift:1]');

  return (
    <div
      data-id={title.id}
      onAnimationEnd={enter ? (e) => { if (e.animationName === 'card-enter') setEnter(false); } : undefined}
      className={cn('card group/card absolute top-0 left-0 flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground',
        touch ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
        isDragging ? '[transition:box-shadow_220ms,border-color_220ms,opacity_220ms,filter_220ms]' : MOVE,
        border, shadow, z, fade, lift, hover,
        // A title's rings are showing: unrelated cards fade out where they are
        // (no clicks, no tab stop) and come back when the selection closes.
        isRingHidden && 'pointer-events-none invisible opacity-0 [transition:transform_600ms_cubic-bezier(.2,.8,.2,1),opacity_200ms,filter_200ms,visibility_0s_200ms]',
        // The pinned character's other titles step back while the stepper is on one.
        isHighlighted && !isCurrent && '[.canvas:has(.card.current)_&:not(:hover)]:border-border [.canvas:has(.card.current)_&:not(:hover)]:shadow-none [.canvas:has(.card.current)_&:not(:hover)]:brightness-72 [.canvas:has(.card.current)_&:not(:hover)]:saturate-80',
        // On the phone the selected card hides behind its focus card.
        touch && isSelected && 'pointer-events-none opacity-0',
        enter && 'animate-[card-enter_300ms_ease-out_backwards] motion-reduce:animate-none',
        isSelected && 'selected', isHighlighted && 'highlighted', isDimmed && 'dimmed', isCollDimmed && 'coll-dim',
        isRingHidden && 'ring-hidden', isRingFocus && 'ring-focus', seen && 'seen', listed && 'listed',
        isDragging && 'dragging', isCurrent && 'current', skipped && 'g-skipped', enter && 'enter')}
      style={{
        '--phase-color': phaseColor,
        ...(isCurrent && curColor ? { '--cur-color': curColor } : {}),
        // 2D on purpose: a 3D transform would give each of the 64 cards its own
        // GPU layer, which phones cannot afford when zoomed far out.
        transform: `translate(${pos.x}px, ${pos.y}px) scale(var(--lift, 1))`,
        width: CARD_SIZE.w + 'px',
        height: CARD_SIZE.h + 'px',
      } as React.CSSProperties}
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
        <button type="button" className="card-open pointer-events-none absolute inset-0 z-4 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset" aria-label={I18N.titleName(title)}
          onFocus={() => onFocusCard && onFocusCard(title.id)}
          onClick={(e) => { e.stopPropagation(); onClick(); }}/>
      )}
      <div className={cn('card-poster relative aspect-[2/3] w-full flex-none overflow-hidden bg-muted',
        // Seen: the art dimmed and desaturated, the quiet half of the seen
        // mark (a backdrop filter here cost a GPU layer per card).
        skipped && '[&>:first-child]:opacity-30')}>
        <window.PosterArt title={title}/>
        <CardMark seen={seen} guideBadge={guideBadge} skipped={skipped} connections={connections}/>
      </div>
      <CardText title={title} skipped={skipped} query={searchQuery} matchedChars={matchedChars}/>
    </div>
  );
}

// The card's one status mark, in the poster's top-right corner (Andre,
// 2026-11-15): a check in a circle once seen; in a guide, the stop's own mark
// in its place (the number, a ✓ once seen, + for an optional stop, → for the
// destination, – when skipped). It sits on the art, so it carries its own dark
// ground in both themes.
function gnumClass(cls: string) {
  const k = new Set(cls.split(/\s+/));
  const dashed = 'border-[1.5px] border-dashed bg-[rgba(10,12,20,.82)]';
  return cn('card-gnum inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full px-[6px] text-[11.5px] font-bold tabular-nums shadow-[0_2px_8px_rgba(0,0,0,.45)]',
    cls,
    k.has('skip') ? cn(dashed, 'border-(--on-image-dim) text-(--on-image-muted)')
      : k.has('done') ? 'border-[1.5px] border-[#5fa856] bg-[rgba(10,12,20,.82)] text-[#7cc472]'
        : k.has('o') ? cn(dashed, 'border-(--on-image-dim) text-(--on-image)')
          : k.has('dest') ? cn(dashed, 'border-primary text-(--on-image)')
            : 'bg-primary text-primary-foreground');
}

type GuideBadge = { cls: string; label: string; text: string } | null | undefined;

/** The poster's corner marks; `pop` is the phone's larger card. Top left: how
 *  many titles it connects to (the titles that share a character with it,
 *  the same ones its ring shows). Top right: the seen check, or a guide
 *  stop's mark in its place. */
export function CardMark({ seen, guideBadge, skipped = false, connections = 0, pop = false }: { seen: boolean; guideBadge?: GuideBadge; skipped?: boolean; connections?: number; pop?: boolean }) {
  const corner = pop ? 'top-2.5' : 'top-2';
  const right = cn('card-mark absolute right-2 z-3', corner, pop && 'right-2.5');
  const status = guideBadge
    ? <span className={right}><span className={cn(gnumClass(guideBadge.cls), skipped && 'opacity-80')} role="img" aria-label={guideBadge.label}>{guideBadge.text}</span></span>
    : seen ? (
      <span className={right}>
        <span className={cn('card-seen inline-flex items-center justify-center rounded-full border-[1.5px] border-[#5fa856] bg-[rgba(10,12,20,.82)] text-[#7cc472] shadow-[0_2px_8px_rgba(0,0,0,.45)]',
          pop ? 'size-[30px] [&_svg]:size-4' : 'size-[24px] [&_svg]:size-[13px]')} role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
      </span>
    ) : null;
  const label = tr('card.connections', { n: connections });
  return (
    <>
      {connections > 0 && (
        <span className={cn('card-conn-pill absolute left-2 z-3', corner, pop && 'left-2.5')}>
          <span className={cn('card-conn inline-flex items-center gap-1 rounded-full bg-[rgba(10,12,20,.78)] font-semibold text-(--on-image) tabular-nums shadow-[0_2px_8px_rgba(0,0,0,.45)]',
            pop ? 'h-[30px] px-2.5 text-[max(13px,0.8125rem)] [&_svg]:size-[13px]' : 'h-[24px] px-2 text-[11px] [&_svg]:size-[11px]')}
            role="img" aria-label={label} title={`${label} · ${tr('card.connectionsTip')}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/></svg>
            {connections}
          </span>
        </span>
      )}
      {status}
    </>
  );
}

/** The card's text, on the canvas and in the phone's selected card (`pop`):
 *  the title, then one meta line: phase dot · year · "Series" (a title not out
 *  yet adds its release badge). What else it shows by sort and filter is
 *  Notion "Cards show what the current sort and filters are about". */
export function CardText({ title, skipped = false, query, matchedChars, pop = false }: {
  title: Title; skipped?: boolean; query?: string; matchedChars?: string[] | null; pop?: boolean;
}) {
  const I18N = window.MCU_I18N;
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  const phaseColor = (window.PHASE_COLORS as Record<string, string>)[title.phase];
  const dot = <span className="card-sep flex-none text-muted-foreground/60" aria-hidden="true">·</span>;
  const upcoming = !window.MCU_isReleased(title);
  return (
    <div className={cn('card-meta flex min-h-0 flex-1 flex-col', pop ? 'gap-[5px] px-3.5 pt-2.5 pb-3' : 'gap-[4px] px-[12px] pt-[8px] pb-[8px]')}>
      {/* Size and line height in one class: a font size after a separate
          leading class makes cn() drop the leading, and descenders clip. */}
      <div className={cn('card-title line-clamp-2 flex-none pr-4 pb-px font-medium tracking-tight text-pretty', pop ? 'text-[max(17px,1.0625rem)]/[1.3]' : 'text-[15px]/[1.3]', skipped && 'opacity-40')}>
        <Highlight text={I18N.titleName(title)} query={query}/>
      </div>
      <div className={cn('card-year card-line flex min-w-0 items-center gap-x-[5px] text-muted-foreground tabular-nums', pop ? 'text-[max(13px,0.8125rem)] leading-[1.35]' : 'text-[11px] leading-[1.35]', skipped && 'opacity-40')}>
        <span className={cn('card-phase flex-none rounded-full', pop ? 'size-[8px]' : 'size-[7px]')} style={{ background: phaseColor }} role="img" aria-label={tr('phase.label', { n: title.phase })} title={tr('phase.label', { n: title.phase })}/>
        <span className="flex-none whitespace-nowrap">{title.year}</span>
        {/* A title not out yet carries its badge too, so it drops the
            separator to keep the line on one row. */}
        {title.type === 'series' && <>{!upcoming && dot}<span className="card-type flex-none whitespace-nowrap">{window.typeLabel(title.type)}</span></>}
        {upcoming && <window.ReleaseBadge title={title} className="card-release ml-0 min-w-0 px-1.5"/>}
        {skipped && <span className="card-skiptag flex-none rounded-[4px] border border-dashed border-border px-[5px] text-[9.5px] font-semibold tracking-[.6px] uppercase">{tr('guide.skippedTag')}</span>}
      </div>
      <window.MatchBadge matchedChars={matchedChars} query={query} title={title}/>
    </div>
  );
}

Object.assign(window, { SpatialCard, CARD_SIZE, CardText, CardMark });
