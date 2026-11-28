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
import { cn } from '@/lib/utils';
import type { Title } from '../types/catalog';
import type { CharMarkData } from './list-parts';

const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

/** The card's size on the canvas, in canvas pixels. The layout reads it.
 *  168px inside the border, so the 2:3 poster is 168 × 252 and the text
 *  block below gets 76px: two lines of title and one meta line. */
export const CARD_SIZE = { w: 170, h: 330 };

// Layout moves (AGENTS.md, "Motion"), then the state fades.
const MOVE = '[transition:transform_600ms_cubic-bezier(.2,.8,.2,1),box-shadow_220ms,border-color_220ms,opacity_220ms,filter_220ms,visibility_0s]';

// Box shadows, in the order the states override each other.
const SHADOW = {
  // Light theme: a short contact shadow and a soft, cool one below, so a
  // card rests on the paper canvas rather than hovering over it.
  base: 'shadow-card',
  drag: 'shadow-[var(--elevation-lift),0_0_0_1px_var(--phase-color)]',
  // Hover is a slight lift, nothing more.
  hover: 'hover:shadow-card-hover',
  // The selected title: its phase-color border and a 1px ring (2px in all),
  // and a soft glow below (Andre, 2026-11-28: "a bit more subtle"; it was a
  // 2px ring and a 70% glow).
  selected: 'shadow-[0_0_0_1px_var(--phase-color),0_14px_36px_-12px_color-mix(in_oklab,var(--phase-color)_40%,transparent)]',
  highlighted: 'shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_40%,transparent),0_16px_40px_-8px_color-mix(in_oklab,var(--foreground)_27%,transparent)] not-dark:shadow-[0_14px_34px_-14px_color-mix(in_oklab,var(--foreground)_30%,transparent)]',
  current: 'shadow-[0_0_0_3px_var(--cur-color,var(--brand)),0_0_44px_6px_color-mix(in_oklab,var(--cur-color,var(--brand))_50%,transparent),var(--elevation-lift)]',
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
  /** The title the Up next card (or an open guide's dock) names. */
  isUpNext?: boolean;
  /** The card whose poster is hovered in Cast and connections (desktop). */
  isPeek?: boolean;
  /** An open guide's current stop, when it isn't Up next: where the guide's
   *  stepper stands. */
  isGuideAt?: boolean;
  /** The character view's row: the current card is marked as a guide stop is. */
  lineView?: boolean;
  curColor?: string;
  /** Who the card is here for (CharMark): it takes the year line's place. */
  mark?: CharMarkData | null;
  searchQuery?: string;
  /** What the meta line adds, from the sort and filters (cardFacet). */
  facet?: CardFacet;
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
  /** The phone canvas zoomed out (E 5/5): the title alone, larger. */
  overview?: boolean;
}

export function SpatialCard({ title, pos, onClick, onHover, onDragStart, onFocusCard, focusable, isSelected, isHighlighted, isDimmed, isCollDimmed, isRingHidden, isRingFocus, isDragging, isCurrent, isUpNext = false, isPeek = false, isGuideAt = false, lineView = false, curColor, mark, searchQuery, scale, guideBadge, guide, guideSkip, onGuideSkip, entering, connections = 0, touch = false, overview = false, facet = 'year' }: CardProps) {
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
  // dragging, hover, highlighted, selected, dimmed, watchlisted, collection
  // dimming, hidden by a ring, a skipped guide stop, the stepper's current
  // title. Hover only shows what no state after it overrides. The selected
  // title is also highlighted (it lights its own threads), and its phase-color
  // ring wins over the highlight's gray outline (Andre, 2026-11-27: "App
  // follows Figma, phase ring"; the Spatial card's Ring=Selected variant).
  let border = 'border-border', shadow = SHADOW.base, z = 'z-10', fade = '', lift = '';
  if (isDragging) { z = 'z-30'; shadow = SHADOW.drag; }
  if (isHighlighted) { border = 'border-(--highlight-border)'; shadow = SHADOW.highlighted; z = 'z-22'; }
  if (isSelected) { border = 'border-(--phase-color)'; shadow = SHADOW.selected; z = 'z-25'; }
  // Dimmed by opacity alone: a saturate filter on every dimmed card made each
  // hover restyle and repaint dozens of filtered layers (Notion "Connections:
  // calm hover").
  if (isDimmed) fade = 'opacity-22';
  if (listed) border = 'border-(--status-watch-border)';
  if (isCollDimmed) fade = 'opacity-26 saturate-30';
  if (skipped) border = 'border-dashed border-(--border-strong)';
  // In the character view's row the stepper's title is marked as a guide's
  // stop is (Andre, 2026-11-18): the quiet gray outline, no lift or glow;
  // elsewhere it keeps the character's color and lifts.
  if (isCurrent && lineView) { z = 'z-28'; fade = 'filter-none'; }
  else if (isCurrent) { border = 'border-(--cur-color,var(--brand))'; shadow = SHADOW.current; z = 'z-28'; fade = 'filter-none'; lift = '[--lift:1.08] motion-reduce:[--lift:1]'; }
  // The desktop ring's centre is the same card at the same size (Andre,
  // 2026-11-15); its outline and shadow mark it.
  if (isRingFocus && !touch) z = 'z-27';
  // The card whose poster is hovered in the details' Cast and connections
  // (Andre, 2026-11-16): outlined and lifted above its neighbors.
  if (isPeek) { border = 'border-(--brand)'; shadow = 'shadow-[0_0_0_2px_var(--brand),var(--elevation-card-hover)]'; z = 'z-29'; fade = 'filter-none'; lift = '[--lift:1.06] motion-reduce:[--lift:1]'; }
  const stateOwnsBorder = isSelected || isHighlighted || listed || skipped || isCurrent || isPeek;
  const stateOwnsShadow = isSelected || isHighlighted || isCurrent || isPeek;
  const hover = cn(!stateOwnsShadow && SHADOW.hover,
    !(isSelected || isHighlighted || isCurrent || (isRingFocus && !touch)) && 'hover:z-20',
    !(isCurrent || (isRingFocus && !touch) || isDragging || touch) && 'hover:[--lift:1.025] motion-reduce:hover:[--lift:1]');

  return (
    <div
      data-id={title.id}
      onAnimationEnd={enter ? (e) => { if (e.animationName === 'card-enter') setEnter(false); } : undefined}
      // The poster is an <img>: no native image drag, or pressing on it and
      // moving would hand the pointer to the browser (the card froze, then
      // followed the pointer after release; Notion "Connections: dragging a
      // card by its poster starts the browser's image drag").
      className={cn('card group/card absolute top-0 left-0 flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground [&_img]:[-webkit-user-drag:none]',
        touch ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
        isDragging ? '[transition:box-shadow_220ms,border-color_220ms,opacity_220ms,filter_220ms]' : MOVE,
        border, shadow, z, fade, lift, hover,
        // A title's rings are showing: unrelated cards fade out where they are
        // (no clicks, no tab stop) and come back when the selection closes.
        isRingHidden && 'pointer-events-none invisible opacity-0 [transition:transform_600ms_cubic-bezier(.2,.8,.2,1),opacity_200ms,filter_200ms,visibility_0s_200ms]',
        // The pinned character's other titles step back while the stepper is on one.
        isHighlighted && !isCurrent && !lineView && '[.canvas:has(.card.current)_&:not(:hover)]:border-border [.canvas:has(.card.current)_&:not(:hover)]:shadow-none [.canvas:has(.card.current)_&:not(:hover)]:brightness-72 [.canvas:has(.card.current)_&:not(:hover)]:saturate-80',
        // On the phone the selected card hides behind its focus card.
        touch && isSelected && 'pointer-events-none opacity-0',
        enter && 'animate-[card-enter_300ms_ease-out_backwards] motion-reduce:animate-none',
        isSelected && 'selected', isHighlighted && 'highlighted', isDimmed && 'dimmed', isCollDimmed && 'coll-dim',
        isRingHidden && 'ring-hidden', isRingFocus && 'ring-focus', seen && 'seen', listed && 'listed',
        isDragging && 'dragging', isCurrent && 'current', skipped && 'g-skipped', enter && 'enter',
        // Up next: a red outline clear of the card's own border and shadow, so
        // it reads with any other state (Andre, 2026-11-16: it looked like
        // every other card). An outline is not clipped by overflow-hidden.
        isUpNext && 'up-next outline-3 outline-offset-[3px] outline-(--brand)',
        // The stop a guide's stepper stands on, when it isn't Up next: the
        // quiet gray (--guide-current), a step thinner than Up next's red, so
        // stepping through a guide shows where you are (Andre, 2026-11-17).
        (isGuideAt || (isCurrent && lineView)) && !isUpNext && 'guide-at outline-2 outline-offset-[3px] outline-(--guide-current)')}
      style={{
        '--phase-color': phaseColor,
        ...(isCurrent && curColor ? { '--cur-color': curColor } : {}),
        // 2D on purpose: a 3D transform would give each of the 64 cards its own
        // GPU layer, which phones cannot afford when zoomed far out.
        transform: `translate(${pos.x}px, ${pos.y}px) scale(var(--lift, 1))`,
        width: CARD_SIZE.w + 'px',
        height: CARD_SIZE.h + 'px',
      } as React.CSSProperties}
      onDragStart={(e) => e.preventDefault()}
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
      <div className={cn('card-poster relative aspect-[2/3] w-full flex-none overflow-hidden bg-muted [&_.poster-mono-year]:hidden',
        // Seen: the art dimmed and desaturated, the quiet half of the seen
        // mark (a backdrop filter here cost a GPU layer per card).
        skipped && '[&>:first-child]:opacity-30')}>
        <window.PosterArt title={title}/>
        <CardMark seen={seen} guideBadge={guideBadge} skipped={skipped} connections={connections} title={title} facet={facet}/>
      </div>
      <CardText title={title} skipped={skipped} query={searchQuery} mark={mark} touch={touch} overview={overview} facet={facet}/>
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
  const dashed = 'border-[1.5px] border-dashed bg-(--on-image-ground)';
  return cn('card-gnum inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-full px-[6px] text-card-meta font-bold tabular-nums shadow-mark-lg',
    cls,
    k.has('skip') ? cn(dashed, 'border-(--on-image-dim) text-(--on-image-muted)')
      : k.has('done') ? 'border-[1.5px] border-(--seen) bg-(--seen) text-(--seen-foreground)'
        : k.has('o') ? cn(dashed, 'border-(--on-image-dim) text-(--on-image)')
          : k.has('dest') ? cn(dashed, 'border-primary text-(--on-image)')
            : 'bg-primary text-primary-foreground');
}

type GuideBadge = { cls: string; label: string; text: string } | null | undefined;

/** The poster's corner marks; `pop` is the phone's larger card. Top left: how
 *  many titles it connects to (the titles that share a character with it,
 *  the same ones its ring shows). Top right: the seen check, or a guide
 *  stop's mark in its place. */
export function CardMark({ seen, guideBadge, skipped = false, connections = 0, pop = false, title, facet }: { seen: boolean; guideBadge?: GuideBadge; skipped?: boolean; connections?: number; pop?: boolean; title?: Title; facet?: CardFacet }) {
  const corner = pop ? 'top-2.5' : 'top-2';
  // Bottom left, in a score order: the score being sorted by (none for a
  // title without one). Canvas pixels on the card, the phone's sizes on its
  // tapped card.
  const scoreKind = title && (facet === 'imdb' || facet === 'rt') && title[facet] != null ? facet : null;
  const score = scoreKind && title && (
    <span className={cn('card-score absolute z-3 shadow-mark-lg', pop ? 'bottom-2.5 left-2.5' : 'bottom-2 left-2')}>
      <window.ScoreChip kind={scoreKind} title={title} compact className={cn('card-rating', pop ? 'text-card-meta-pop' : 'text-card-meta-lg [&_.tg]:text-[inherit]')}/>
    </span>
  );
  const right = cn('card-mark absolute right-2 z-3', corner, pop && 'right-2.5');
  const status = guideBadge
    ? <span className={right}><span className={cn(gnumClass(guideBadge.cls), skipped && 'opacity-80')} role="img" aria-label={guideBadge.label}>{guideBadge.text}</span></span>
    : seen ? (
      <span className={right}>
        <span className={cn('card-seen inline-flex items-center justify-center rounded-full border-[1.5px] border-(--seen) bg-(--seen) text-(--seen-foreground) shadow-mark-lg',
          pop ? 'size-[30px] [&_svg]:size-4' : 'size-[24px] [&_svg]:size-[13px]')} role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
      </span>
    ) : null;
  const label = tr('card.connections', { n: connections });
  return (
    <>
      {connections > 0 && (
        <span className={cn('card-conn-pill absolute left-2 z-3', corner, pop && 'left-2.5')}>
          <span className={cn('card-conn inline-flex items-center gap-1 rounded-full bg-(--on-image-ground) font-semibold text-(--on-image) tabular-nums shadow-mark-lg',
            pop ? 'h-[30px] px-2.5 text-card-meta-pop [&_svg]:size-[13px]' : 'h-[24px] px-2 text-card-meta [&_svg]:size-[11px]')}
            role="img" aria-label={label} title={`${label} · ${tr('card.connectionsTip')}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/></svg>
            {connections}
          </span>
        </span>
      )}
      {status}
      {score}
    </>
  );
}

/** What a card's meta line adds beside the phase dot, from the sort and the
 *  filters in use (Notion "Cards show what the current sort and filters are
 *  about"). The rule table, first match wins:
 *  | Budget filter on           | the budget ("$356M")                |
 *  | Story order (Chronological)| where it is set ("2010", "c. 1943") |
 *  | IMDb rating                | the year; the IMDb score on the art |
 *  | Tomatometer                | the year; the RT score on the art   |
 *  | anything else              | the year                            |
 *  Andre, 2026-11-16: A–Z and By Phase keep the year (the bare dot read as
 *  missing data), and a score sits on the poster's bottom-left corner, clear
 *  of the card's edge (CardMark). The phase dot, "Series" and a coming
 *  title's release badge always stay. The card keeps its height (CARD_SIZE). */
export type CardFacet = 'year' | 'story' | 'imdb' | 'rt' | 'budget';
export function cardFacet(sort: string, filters: { budget?: string } = {}): CardFacet {
  if (filters.budget && filters.budget !== 'all') return 'budget';
  if (sort === 'chrono') return 'story';
  if (sort === 'imdb') return 'imdb';
  if (sort === 'rt') return 'rt';
  return 'year';
}

/** The card's text, on the canvas and in the phone's selected card (`pop`):
 *  the title, then one meta line: phase dot · year · "Series" (a title not out
 *  yet adds its release badge). What else it shows by sort and filter is
 *  Notion "Cards show what the current sort and filters are about". */
export function CardText({ title, skipped = false, query, mark, pop = false, touch = false, overview = false, facet = 'year' }: {
  title: Title; skipped?: boolean; query?: string; mark?: CharMarkData | null; pop?: boolean; touch?: boolean; facet?: CardFacet;
  /** The phone canvas zoomed out (Notion "Explore E 5/5"): at about 80px a
   *  card's two lines were too small to read, so the title alone, larger, in
   *  place of the year line (the ticket's fallback). */
  overview?: boolean;
}) {
  // The phone's canvas cards (Andre, 2026-11-16: the titles looked small next
  // to the larger phone text): a 17px title and a 12px line, the selected
  // card's sizes, in the same 75px under the poster (CARD_SIZE stays, so the
  // layout doesn't move) by trimming the padding and leading.
  const fit = touch && !pop;
  const I18N = window.MCU_I18N;
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  const phaseColor = (window.PHASE_COLORS as Record<string, string>)[title.phase];
  const dot = <span className="card-sep flex-none text-muted-foreground/60" aria-hidden="true">·</span>;
  const upcoming = !window.MCU_isReleased(title);
  return (
    <div className={cn('card-meta flex min-h-0 flex-1 flex-col', pop ? 'gap-[5px] px-3.5 pt-2.5 pb-3' : fit ? 'gap-[3px] px-[11px] pt-[7px] pb-[5px]' : 'gap-[4px] px-[12px] pt-[8px] pb-[8px]')}>
      {/* Size and line height in one class: a font size after a separate
          leading class makes cn() drop the leading, and descenders clip. */}
      <div className={cn('card-title line-clamp-2 flex-none pr-4 pb-px font-medium tracking-tight text-pretty', overview ? 'pr-0 text-card-title-ov/[1.15] font-semibold' : pop ? 'text-card-title-pop/[1.3]' : fit ? 'text-card-title-lg/[1.2]' : 'text-card-title/[1.3]', skipped && 'opacity-40')}>
        <Highlight text={I18N.titleName(title)} query={query}/>
      </div>
      {/* While a search or a pick reaches this card through a character, the
          year line becomes who it is here for: the phase dot, a portrait and
          the name, in the same type and height, so the card keeps its 330px
          (Notion "Titles: show the picked character…", design v3; the badge
          that used to go under it was cut off). A title-only match keeps it. */}
      {!overview && mark && <div className={cn('card-year card-line card-mark-line flex min-w-0 items-center gap-x-[5px] text-muted-foreground', pop ? 'text-card-meta-pop leading-[1.35]' : fit ? 'text-card-meta-lg leading-[1.3]' : 'text-card-meta leading-[1.35]', skipped && 'opacity-40')}>
        <span className={cn('card-phase flex-none rounded-full', pop ? 'size-[8px]' : 'size-[7px]')} style={{ background: phaseColor }} role="img" aria-label={tr('phase.label', { n: title.phase })} title={tr('phase.label', { n: title.phase })}/>
        <window.CharMark mark={mark} title={title} card size={pop ? 17 : fit ? 15 : 14} className="gap-[5px]"/>
      </div>}
      {!overview && !mark && <div className={cn('card-year card-line flex min-w-0 items-center gap-x-[5px] text-muted-foreground tabular-nums', pop ? 'text-card-meta-pop leading-[1.35]' : fit ? 'text-card-meta-lg leading-[1.3]' : 'text-card-meta leading-[1.35]', skipped && 'opacity-40')}>
        <span className={cn('card-phase flex-none rounded-full', pop ? 'size-[8px]' : 'size-[7px]')} style={{ background: phaseColor }} role="img" aria-label={tr('phase.label', { n: title.phase })} title={tr('phase.label', { n: title.phase })}/>
        {(facet === 'year' || facet === 'imdb' || facet === 'rt') && <span className="flex-none whitespace-nowrap">{title.year}</span>}
        {facet === 'story' && title.story && <window.StoryYear title={title} className={cn('card-story min-w-0 text-[inherit] in-[.card]:text-[inherit] [&>svg]:size-[1em]')}/>}
        {facet === 'budget' && <span className="card-budget flex-none whitespace-nowrap">{title.budget != null ? tr('budget.format', { n: title.budget }) : '—'}</span>}
        {/* A title not out yet carries its badge instead: a series drops
            "Series" for it, since "2027 Series Coming soon" ran past the
            card's edge, and would on the phone's selected card too (Notion
            "Connections cards: the Coming soon pill runs into a series
            card's right edge", Andre's choice, 2026-11-24). Rows and the
            details keep "Series". */}
        {title.type === 'series' && !upcoming && <>{dot}<span className="card-type flex-none whitespace-nowrap">{window.typeLabel(title.type)}</span></>}
        {upcoming && <window.ReleaseBadge title={title} className="card-release ml-0 min-w-0 px-1.5"/>}
        {skipped && <span className="card-skiptag flex-none rounded-xs border border-dashed border-border px-[5px] text-card-micro font-semibold tracking-[.6px] uppercase">{tr('guide.skippedTag')}</span>}
      </div>}
    </div>
  );
}

Object.assign(window, { SpatialCard, CARD_SIZE, CardText, CardMark, cardFacet });
