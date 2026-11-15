// A title's card on the Spatial canvas (Notion "shadcn pass 2/5: Spatial
// canvas, cards and threads"; simplified in Notion "Simplify the Spatial
// cards"; made one design in Notion "Cards: one card design at rest, selected
// and on the phone"): the whole poster with nothing on it, the title, one meta
// line (phase dot · year · "Set in" · budget, "Series" for a series) and one
// status mark at its end, the quiet seen check or, in a guide, the stop's
// number. Selected, the same card gains an action row: Seen, Watchlist, IMDb,
// RT (and Cast on the phone, whose selected card is FocusPop in mobile.tsx,
// built from the same CardText and CardActions). Hover only lifts it.
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
 *  block below gets 94px: two lines of title and two of the meta line. A
 *  selected card grows downward for its action row, into the gap below its
 *  row (CARD_H + 70). */
export const CARD_SIZE = { w: 170, h: 348 };

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
  /** The phone's canvas (`.app.touch`): tap, not drag. */
  touch?: boolean;
}

export function SpatialCard({ title, pos, onClick, onHover, onDragStart, onFocusCard, focusable, isSelected, isHighlighted, isDimmed, isCollDimmed, isRingHidden, isRingFocus, isDragging, isCurrent, curColor, matchedChars, searchQuery, scale, guideBadge, guide, guideSkip, onGuideSkip, entering, touch = false }: CardProps) {
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
  // Below TSA_MIN_SCALE the toggles are rendered smaller than a usable hit
  // target, so the selected card leaves its action row out.
  const showActions = (scale || 1) >= window.TSA_MIN_SCALE;
  const actions = isSelected && !touch && showActions;

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
  // The desktop ring's centre is drawn larger, so the eye lands on it first.
  if (isRingFocus && !touch) { lift = '[--lift:1.18]'; z = 'z-27'; }
  const stateOwnsBorder = isSelected || isHighlighted || listed || skipped || isCurrent;
  const stateOwnsShadow = isSelected || isHighlighted || isCurrent;
  const hover = cn(!stateOwnsShadow && SHADOW.hover,
    !(isSelected || isHighlighted || isCurrent || (isRingFocus && !touch)) && 'hover:z-20',
    !(isCurrent || (isRingFocus && !touch) || isDragging || touch) && 'hover:[--lift:1.025] motion-reduce:hover:[--lift:1]');

  return (
    <div
      data-id={title.id}
      onAnimationEnd={enter ? (e) => { if (e.animationName === 'card-enter') setEnter(false); } : undefined}
      className={cn('card group/card absolute top-0 left-0 flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground',
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
        height: actions ? undefined : CARD_SIZE.h + 'px',
        minHeight: actions ? CARD_SIZE.h + 'px' : undefined,
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
        <button type="button" className="card-open pointer-events-none absolute inset-0 z-4 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset" aria-label={I18N.titleName(title)}
          onFocus={() => onFocusCard && onFocusCard(title.id)}
          onClick={(e) => { e.stopPropagation(); onClick(); }}/>
      )}
      <div className={cn('card-poster relative aspect-[2/3] w-full flex-none overflow-hidden bg-muted',
        // Seen: the art dimmed and desaturated, the quiet half of the seen
        // mark (a backdrop filter here cost a GPU layer per card).
        seen && 'after:pointer-events-none after:absolute after:inset-0 after:z-1 after:bg-[rgba(10,12,20,0.34)] after:content-[\'\'] [&>:first-child]:saturate-35',
        skipped && '[&>:first-child]:opacity-30')}>
        <window.PosterArt title={title}/>
      </div>
      <CardText title={title} seen={seen} skipped={skipped} guideBadge={guideBadge} query={searchQuery}
        matchedChars={matchedChars}/>
      {actions && (
        <CardActions title={title} skipped={skipped} guide={guide} guideSkip={guideSkip} onGuideSkip={onGuideSkip}
          className="px-[14px] pb-[12px]"/>
      )}
    </div>
  );
}

// A guide stop's number on the card, under the type label: filled while
// ahead, green once seen, dashed for an optional stop, the destination and a
// skipped stop. `cls` is the guide's own state list ("o done", "dest"…).
function gnumClass(cls: string, pop = false) {
  const k = new Set(cls.split(/\s+/));
  const dashed = 'border-[1.5px] border-dashed bg-transparent';
  return cn('card-gnum inline-flex flex-none items-center justify-center rounded-full font-bold tabular-nums',
    pop ? 'h-[max(22px,1.375rem)] min-w-[max(22px,1.375rem)] px-[6px] text-[max(12px,0.75rem)]' : 'h-[18px] min-w-[18px] px-[4px] text-[10.5px]',
    cls,
    k.has('skip') ? cn(dashed, 'border-border text-muted-foreground')
      // Seen: the quiet seen mark, as on the Seen button and the guide's own list.
      : k.has('done') ? 'border border-[color-mix(in_oklab,var(--status-seen)_55%,var(--border))] bg-[color-mix(in_oklab,var(--status-seen)_14%,transparent)] text-(--status-seen)'
        : k.has('o') ? cn(dashed, 'border-muted-foreground text-foreground')
          : k.has('dest') ? cn(dashed, 'border-primary text-foreground')
            : 'bg-primary text-primary-foreground');
}

type GuideBadge = { cls: string; label: string; text: string } | null | undefined;

/** "Set in 2010" (or the era's name), as the meta line shows it. */
function storyText(title: Title): string | null {
  if (!title.story) return null;
  const I18N = window.MCU_I18N;
  const story = I18N.storyLabel(title.story);
  return /^(c\. )?\d/.test(title.story) ? tr('story.setIn', { story }) : story;
}

/** The card's text, on the canvas and in the phone's selected card (`pop`):
 *  the title, then one meta line with one status mark at its end. */
export function CardText({ title, seen, skipped = false, guideBadge, query, matchedChars, pop = false }: {
  title: Title; seen: boolean; skipped?: boolean; guideBadge?: GuideBadge; query?: string; matchedChars?: string[] | null; pop?: boolean;
}) {
  const I18N = window.MCU_I18N;
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  const phaseColor = (window.PHASE_COLORS as Record<string, string>)[title.phase];
  const story = storyText(title);
  const dot = <span className="card-sep text-muted-foreground/60" aria-hidden="true">·</span>;
  // One mark: the stop's state in a guide, else the quiet seen check.
  const mark = guideBadge
    ? <span className={cn(gnumClass(guideBadge.cls, pop), skipped && 'opacity-60')} role="img" aria-label={guideBadge.label}>{guideBadge.text}</span>
    : seen ? <span className={cn('card-seen inline-flex flex-none items-center justify-center rounded-full text-(--status-seen)', pop ? 'size-[max(18px,1.125rem)] [&_svg]:size-[max(14px,0.875rem)]' : 'size-[16px] [&_svg]:size-[12px]')} role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
      : null;
  return (
    <div className={cn('card-meta flex min-h-0 flex-1 flex-col', pop ? 'gap-[6px] px-3 pt-2.5 pb-2' : 'gap-[5px] px-[14px] pt-[10px] pb-[10px]', seen && '[&_.card-title]:opacity-82')}>
      <div className={cn('card-title line-clamp-2 leading-[1.25] font-semibold tracking-tight text-pretty', pop ? 'text-[max(15px,0.9375rem)]' : 'text-[14px]', skipped && 'opacity-40')}>
        <Highlight text={I18N.titleName(title)} query={query}/>
      </div>
      <div className={cn('card-year flex items-start gap-[6px] text-muted-foreground tabular-nums', pop ? 'text-[max(13px,0.8125rem)] leading-[1.35]' : 'text-[11px] leading-[1.35]')}>
        <span className={cn('card-line flex min-w-0 flex-1 flex-wrap items-center gap-x-[5px] gap-y-[1px]', skipped && 'opacity-40')}>
          <span className={cn('card-phase flex-none rounded-full', pop ? 'size-[8px]' : 'size-[7px]')} style={{ background: phaseColor }} role="img" aria-label={tr('phase.label', { n: title.phase })} title={tr('phase.label', { n: title.phase })}/>
          <span className="whitespace-nowrap">{title.year}<window.ReleaseBadge title={title} className="card-release"/></span>
          {story && <>{dot}<span className="card-story whitespace-nowrap">{story}</span></>}
          {title.budget != null && <>{dot}<span className="card-budget whitespace-nowrap">{I18N.budget(title.budget)}</span></>}
          {title.type === 'series' && <>{dot}<span className="card-type whitespace-nowrap">{window.typeLabel(title.type)}</span></>}
          {skipped && <span className="card-skiptag rounded-[4px] border border-dashed border-border px-[5px] text-[9.5px] font-semibold tracking-[.6px] uppercase">{tr('guide.skippedTag')}</span>}
        </span>
        {mark && <span className="card-mark ml-auto flex flex-none pt-px">{mark}</span>}
      </div>
      <window.MatchBadge matchedChars={matchedChars} query={query} title={title}/>
    </div>
  );
}

/** A selected card's action row: Seen, Watchlist (or Skip / Unskip in a
 *  guide), IMDb, RT, and Cast where the card is the way to the cast (phone). */
export function CardActions({ title, skipped = false, guide, guideSkip, onGuideSkip, onCast, pop = false, className }: {
  title: Title; skipped?: boolean; guide?: unknown; guideSkip?: { state: string } | null; onGuideSkip?: () => void;
  onCast?: () => void; pop?: boolean; className?: string;
}) {
  const btn = pop ? '[&_.tsa-btn]:size-[max(36px,2.25rem)] [&_.tsa-btn_svg]:size-4' : '[&_.tsa-btn]:size-8';
  return (
    <div className={cn('card-acts relative z-5 flex flex-wrap items-center gap-[6px]', className)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {!skipped && <window.TitleStatusActions title={title} className={cn('card-acts-tsa static top-auto right-auto flex-row gap-[6px] [transform:none]', btn)}/>}
      {guideSkip && (guideSkip.state === 'can' || skipped) && (
        <window.GuideSkipControl guide={guide} info={guideSkip} onDone={onGuideSkip}
          className={cn(skipped ? 'card-unskipctl [&_.g-unskip]:min-h-8 [&_.g-unskip]:px-3' : 'card-skipctl [&_.g-skip]:size-8 [&_.g-skip]:basis-8')}/>
      )}
      {(title.imdb != null || title.rt != null) && (
        <span className="card-scores flex flex-none items-center gap-[5px]">
          <window.ScoreChip kind="imdb" title={title} compact={!pop} className="card-rating"/>
          <window.ScoreChip kind="rt" title={title} compact={!pop} className="card-rating"/>
        </span>
      )}
      {onCast && (
        <button type="button" className="card-cast ml-auto inline-flex h-[max(36px,2.25rem)] items-center gap-1 rounded-md border border-input bg-background px-2.5 text-[max(13px,0.8125rem)] font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={onCast}>{tr('card.cast')} <span aria-hidden="true">›</span></button>
      )}
    </div>
  );
}

Object.assign(window, { SpatialCard, CARD_SIZE, CardText, CardActions });
