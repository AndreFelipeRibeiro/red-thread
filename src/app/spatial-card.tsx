// A title's card on the Spatial canvas (Notion "shadcn pass 2/5: Spatial
// canvas, cards and threads"; simplified in Notion "Simplify the Spatial
// cards": the poster, the title, the phase as a coloured dot, the year and a
// quiet seen check; scores, budget, story year, Seen and Watchlist come up in
// a band over the poster on hover or keyboard focus).
//
// Moved out of app.tsx so it can be built on the design system: this file is
// listed with `@source` in src/index.css. Same marks, same places, same size:
// the canvas lays cards out from CARD_SIZE, so nothing here changes the card's
// width, height, padding or the poster's ratio.
//
// Rules the canvas keeps (AGENTS.md, "Spatial canvas performance"): no
// will-change, no 3D transform and no backdrop-filter on a card or anything in
// it, and pixel sizes rather than the type scale (the canvas has its own
// zoom).
//
// Class names the canvas code, the Escape ladder and the QA checks read are
// kept as hooks (`card` and its state classes, `card-open`, `card-poster`,
// `card-hover`, `card-tsa`, `card-gnum`, `card-phase`, `card-seen`,
// `rating-row`, `card-rating`, `card-meta`, `card-title`, `card-year`…).
import React, { useRef, useState } from 'react';
import { cn } from 'cn';
import type { Title } from '../types/catalog';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

/** The card's size on the canvas, in canvas pixels. The layout reads it. */
export const CARD_SIZE = { w: 170, h: 270 };

// Layout moves (AGENTS.md, "Motion"), then the state fades.
const MOVE = '[transition:transform_600ms_cubic-bezier(.2,.8,.2,1),box-shadow_220ms,border-color_220ms,opacity_220ms,filter_220ms,visibility_0s]';

// Box shadows, in the order the states override each other.
const SHADOW = {
  base: 'shadow-sm not-dark:shadow-[0_1px_2px_rgb(0_0_0/.05),0_10px_24px_-14px_rgb(0_0_0/.22)]',
  drag: 'shadow-[0_24px_50px_-8px_rgba(0,0,0,0.6),0_0_0_1px_var(--phase-color)]',
  hover: 'hover:shadow-[0_16px_40px_-8px_color-mix(in_oklab,var(--phase-color)_60%,transparent),0_0_0_1px_var(--phase-color),0_0_30px_-4px_color-mix(in_oklab,var(--phase-color)_40%,transparent)]',
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
  // mobile.tsx is not typed yet: Highlight returns text or marked pieces.
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
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
  // target, so they withdraw and the seen state reads as a static marker only.
  const showActions = (scale || 1) >= window.TSA_MIN_SCALE;

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
  const hover = cn(!stateOwnsBorder && 'hover:border-(--phase-color)', !stateOwnsShadow && SHADOW.hover,
    !(isSelected || isHighlighted || isCurrent || (isRingFocus && !touch)) && 'hover:z-20',
    !(isDimmed || isCollDimmed || isCurrent) && 'hover:brightness-110');

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
        <button type="button" className="card-open pointer-events-none absolute inset-0 z-4 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset" aria-label={I18N.titleName(title)}
          onFocus={() => onFocusCard && onFocusCard(title.id)}
          onClick={(e) => { e.stopPropagation(); onClick(); }}/>
      )}
      <div className={cn('card-poster relative min-h-0 w-full flex-[1_1_auto] overflow-hidden bg-muted',
        // Seen: the art dimmed and desaturated, the quiet half of the seen
        // mark (a backdrop filter here cost a GPU layer per card).
        seen && 'after:pointer-events-none after:absolute after:inset-0 after:z-1 after:bg-[rgba(10,12,20,0.34)] after:content-[\'\'] [&>:first-child]:saturate-35',
        skipped && '[&>:first-child]:opacity-30')}>
        <window.PosterArt title={title}/>
        {/* Nothing sits on the artwork at rest (Notion "Simplify the Spatial
            cards"). Hovering the card, or Tab reaching its buttons, brings up
            a band over the foot of the poster with the scores, budget and
            story year, and Seen and Watchlist (Skip / Unskip on a guide stop).
            It is laid over the art, so nothing moves. Phones tap a card to pop
            it out instead, and far zoomed out the band stays away. */}
        {!touch && showActions && (
          <div className={cn('card-hover absolute inset-x-0 bottom-0 z-3 flex flex-col gap-[7px] bg-[linear-gradient(to_top,rgba(10,12,20,.94)_60%,rgba(10,12,20,0))] px-[10px] pt-[26px] pb-[10px] text-(--on-image)',
            'opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 group-focus-within/card:opacity-100 motion-reduce:transition-none')}>
            <div className="rating-row flex flex-wrap items-center gap-[5px]">
              {title.imdb != null && (
                <div className={cn(RATING, 'imdb')} title={tr(title.type === 'series' ? 'score.imdbSeries' : 'score.imdbMovie')}>
                  <span className="imdb-tag rounded-[2px] bg-[#f5c518] px-[3px] py-px text-[8.5px] font-extrabold tracking-[.2px] text-black">IMDb</span>
                  {title.imdb.toFixed(1)}
                </div>
              )}
              {title.rt != null && (
                <div className={cn(RATING, 'rt')} title={tr('score.rt')}>
                  <span className="rt-tag rounded-[2px] bg-[#cc2a0a] px-[3px] py-px text-[8.5px] font-extrabold tracking-[.2px] text-white">RT</span>
                  {title.rt}%
                </div>
              )}
            </div>
            <div className="card-facts flex flex-wrap items-center gap-x-[8px] gap-y-[3px] text-[10.5px] text-(--on-image-dim) tabular-nums [&_.card-story]:text-(--on-image-dim)">
              <span>{I18N.upper(window.typeLabel(title.type))}</span>
              {title.budget != null && <span className="card-budget">{I18N.budget(title.budget)}</span>}
              <window.StoryYear title={title} className="card-story flex"/>
            </div>
            <div className="card-actions flex items-center gap-[6px]">
              {!skipped && <window.TitleStatusActions title={title} variant="overlay" className="card-tsa static top-auto right-auto flex-row [transform:none] [&_.tsa-btn]:size-8"/>}
              {guideSkip && (guideSkip.state === 'can' || skipped) && (
                <window.GuideSkipControl guide={guide} info={guideSkip} onDone={onGuideSkip}
                  className={cn(skipped ? 'card-unskipctl [&_.g-unskip]:min-h-8 [&_.g-unskip]:rounded-md [&_.g-unskip]:px-3 [&_.g-unskip]:text-[11.5px]' : 'card-skipctl [&_.g-skip]:size-8 [&_.g-skip]:basis-8', '[&_button]:border-[#ffffff26] [&_button]:bg-[rgba(10,12,20,0.78)] [&_button]:text-(--on-image-dim) [&_button]:hover:text-(--on-image)')}/>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Under the poster: the title, then the phase (its colour only), the
          year and a quiet check once seen. An open guide's stop number leads
          that line; a skipped stop says so. */}
      <div className={cn('card-meta min-h-[74px] flex-none px-[14px] pt-[11px] pb-[12px]', seen && '[&_.card-title]:opacity-82')}>
        <div className={cn('card-title line-clamp-2 text-[13px] leading-[1.25] font-semibold tracking-tight text-pretty', skipped && 'opacity-40')}><Highlight text={I18N.titleName(title)} query={searchQuery}/></div>
        <div className="card-year mt-[5px] flex items-center gap-[6px] text-[11px] text-muted-foreground tabular-nums">
          {guideBadge && <span className={cn(gnumClass(guideBadge.cls), skipped && 'opacity-40')} role="img" aria-label={guideBadge.label}>{guideBadge.text}</span>}
          <span className="card-phase size-[7px] flex-[0_0_7px] rounded-full" style={{ background: phaseColor }} role="img" aria-label={tr('phase.label', { n: title.phase })} title={tr('phase.label', { n: title.phase })}/>
          <span className={cn('min-w-0 truncate', skipped && 'opacity-40')}>{title.year}<window.ReleaseBadge title={title} className="card-release"/></span>
          {skipped && <span className="card-skiptag rounded-[4px] border border-dashed border-border px-[5px] text-[9.5px] font-semibold tracking-[.6px] uppercase">{tr('guide.skippedTag')}</span>}
          {seen && (
            <span className="card-seen ml-auto inline-flex size-[16px] flex-[0_0_16px] items-center justify-center rounded-full text-(--status-seen) [&_svg]:size-[12px]" role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
          )}
        </div>
        <window.MatchBadge matchedChars={matchedChars} query={searchQuery} title={title}/>
      </div>
    </div>
  );
}

// A score in the hover band: a brand tag (black on IMDb yellow, white on RT
// red at 5.4:1) and the score, light on the band's dark ground in both themes.
const RATING = 'card-rating flex items-center gap-[4px] rounded-[4px] border border-[#ffffff20] bg-[rgb(10,12,20)] px-[7px] py-[3px] text-[10px] font-bold text-(--on-image) tabular-nums';

// A guide stop's number on the card, under the type label: filled while
// ahead, green once seen, dashed for an optional stop, the destination and a
// skipped stop. `cls` is the guide's own state list ("o done", "dest"…).
function gnumClass(cls: string) {
  const k = new Set(cls.split(/\s+/));
  const dashed = 'border-[1.5px] border-dashed bg-[rgba(10,12,20,.88)]';
  return cn('card-gnum relative z-3 inline-flex h-[22px] min-w-[22px] flex-none items-center justify-center rounded-[11px] px-[5px] text-[11px] font-extrabold tabular-nums shadow-[0_2px_8px_rgba(0,0,0,.5)]',
    cls,
    k.has('skip') ? cn(dashed, 'border-(--on-image-dim) text-(--on-image-muted)')
      : k.has('o') ? (k.has('done') ? 'border-[1.5px] border-solid border-[#5fa856] bg-[#5fa856] text-[#0a0c14]' : cn(dashed, 'border-(--on-image-dim) text-(--on-image)'))
        : k.has('dest') ? cn(dashed, 'border-primary text-(--on-image)')
          : k.has('done') ? 'bg-[#5fa856] text-[#0a0c14]' : 'bg-primary text-[#0a0c14]');
}

Object.assign(window, { SpatialCard, CARD_SIZE });
