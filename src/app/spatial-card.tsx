// A title's card on the Spatial canvas (Notion "shadcn pass 2/5: Spatial
// canvas, cards and threads").
//
// Moved out of app.tsx so it can be built on the design system: this file is
// listed with `@source` in src/index.css and the card's root carries `v4` (the
// scoped reset, src/preflight-v4.css). Same marks, same places, same size:
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
// `card-badges`, `badge`, `type-badge`, `phase-badge`, `card-gnum`,
// `rating-row`, `card-rating`, `card-meta`, `card-title`, `card-year`…); they
// carry no V3 styling any more.
import React, { useRef, useState } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import type { Title } from '../types/catalog';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

/** The card's size on the canvas, in canvas pixels. The layout reads it. */
export const CARD_SIZE = { w: 170, h: 270 };

// The dark chips that sit on a poster (badges, ratings): the poster is an
// image in both themes, so they stay dark with light text (--on-image).
const ON_POSTER = 'border border-[#ffffff20] bg-[rgba(10,12,20,0.7)] text-(--on-image)';

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
      className={cn('card v4 absolute top-0 left-0 flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground',
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
        // Seen: a wash over the poster art only, under the badges, and the art
        // desaturated (a backdrop filter here cost a GPU layer per card).
        seen && 'after:pointer-events-none after:absolute after:inset-0 after:z-1 after:bg-[rgba(10,12,20,0.34)] after:content-[\'\'] [&>:first-child]:saturate-35',
        // A skipped guide stop dims everything but its Skipped tag and Unskip.
        skipped && '[&>:not(.card-badges):not(.card-skipover)]:opacity-30')}>
        <window.PosterArt title={title}/>
        <div className="card-badges absolute top-[10px] right-[10px] left-[10px] z-2 flex items-start justify-between gap-[6px]">
          {/* An open guide numbers its stops on the canvas (a check once
              seen, + for optional, an arrow for the destination): the badge
              sits under the type label, which always shows. */}
          <span className="card-badges-start inline-flex min-w-0 flex-col items-start gap-[6px]">
            <Badge className={cn('badge type-badge h-auto rounded-md px-[7px] py-[4px] text-[10px] font-semibold tracking-wide', ON_POSTER, skipped && 'opacity-30')}>
              {I18N.upper(window.typeLabel(title.type))}
            </Badge>
            {guideBadge && <span className={cn(gnumClass(guideBadge.cls), skipped && 'opacity-30')} role="img" aria-label={guideBadge.label}>{guideBadge.text}</span>}
            {/* Skip a guide stop, under its number, once the card is large
                enough for buttons. */}
            {showActions && guideSkip && guideSkip.state === 'can' && <window.GuideSkipControl guide={guide} info={guideSkip} className="card-skipctl" onDone={onGuideSkip}/>}
          </span>
          <Badge className={cn('badge phase-badge h-auto rounded-md border-transparent px-[7px] py-[4px] text-[10px] font-bold tracking-wide', skipped && 'opacity-30')}
            style={{ background: phaseColor, color: 'var(--on-color)' }}>{I18N.upper(tr('phase.label', { n: title.phase }))}</Badge>
        </div>
        {/* A skipped stop: a "Skipped" tag and Unskip, centred on the poster,
            in place of Seen and Watchlist. */}
        {showActions && skipped && (
          <div className="card-skipover pointer-events-none absolute inset-0 z-5 flex flex-col items-center justify-center gap-[10px] [&_.g-skipctl]:pointer-events-auto">
            <span className="card-skiptag rounded-[6px] border border-dashed border-(--on-image-dim) bg-[rgba(10,12,20,.85)] px-[9px] py-[4px] text-[10px] font-bold tracking-[1.2px] text-(--on-image) uppercase" aria-hidden="true">{tr('guide.skippedTag')}</span>
            <window.GuideSkipControl guide={guide} info={guideSkip} className="card-unskipctl" onDone={onGuideSkip}/>
          </div>
        )}
        {showActions
          ? !skipped && <window.TitleStatusActions title={title} variant="overlay" className="card-tsa"/>
          : <span className="card-seen-mark absolute top-1/2 right-[8px] z-3 -translate-y-1/2"><window.SeenMarker seen={seen}/></span>}
        <div className={cn('rating-row absolute bottom-[10px] left-[10px] z-2 flex items-center gap-[5px]', touch && 'hidden')}>
          {title.imdb != null && (
            <div className={cn(RATING, 'imdb text-[#f5c518]')} title={tr(title.type === 'series' ? 'score.imdbSeries' : 'score.imdbMovie')}>
              <span className="imdb-tag rounded-[2px] bg-[#f5c518] px-[3px] py-px text-[8.5px] font-extrabold tracking-[.2px] text-black">IMDb</span>
              {title.imdb.toFixed(1)}
            </div>
          )}
          {title.rt != null && (
            <div className={cn(RATING, 'rt text-[#fa5c3c]')} title={tr('score.rt')}>
              <span className="rt-tag rounded-[2px] bg-[#cc2a0a] px-[3px] py-px text-[8.5px] font-extrabold tracking-[.2px] text-white">RT</span>
              {title.rt}%
            </div>
          )}
        </div>
      </div>
      {/* Every footer reserves room for a two-line title plus the year and
          story rows, so posters, badges and buttons sit at the same height on
          every card. */}
      <div className={cn('card-meta min-h-[92px] flex-none px-[14px] pt-[12px] pb-[14px]', seen && 'opacity-82', skipped && 'opacity-30')}>
        <div className="card-title line-clamp-2 text-[13px] leading-[1.25] font-semibold tracking-tight text-pretty"><Highlight text={I18N.titleName(title)} query={searchQuery}/></div>
        <div className="card-year mt-[4px] flex items-center justify-between gap-[8px] text-[11px] text-muted-foreground tabular-nums">
          <span>{title.year}<window.ReleaseBadge title={title} className="card-release"/></span>
          {title.budget != null && (
            <span className="card-budget text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))] opacity-75">{I18N.budget(title.budget)}</span>
          )}
        </div>
        <window.StoryYear title={title} className="card-story mt-[3px] flex"/>
        <window.MatchBadge matchedChars={matchedChars} query={searchQuery} title={title}/>
      </div>
    </div>
  );
}

// A score on the poster: a brand tag (black on IMDb yellow, white on RT red at
// 5.4:1) and the score, on an opaque dark chip so it reads the same over any
// art; in the light theme the chip takes the card's colour.
const RATING = 'card-rating flex items-center gap-[4px] rounded-[4px] border border-[#ffffff20] bg-[rgb(10,12,20)] px-[7px] py-[3px] text-[10px] font-bold tabular-nums not-dark:border-border not-dark:bg-card not-dark:text-foreground';

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
