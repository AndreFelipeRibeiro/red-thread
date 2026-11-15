// The List and Grid views' pieces on the design system (Notion "shadcn pass
// 4/5: List and Grid views"): the progress meters, score chips, the PH badge,
// the search-match badge, the empty state, the phone List row and Grid card,
// the seen-run header and the collapsible wrapper the phone lists fold with,
// and the class recipes the phone List and Grid lay themselves out with.
//
// Moved out of mobile.tsx so they can be built on the design system: this file
// is listed with `@source` in src/index.css, so the class recipes exported
// below (used by MobileGrid and MobileList, which stay in mobile.tsx with their
// grouping and reorder logic) are generated from here.
//
// Same content, order and actions as before; only the building blocks
// changed. Class names the app, the QA checks and the surfaces still on V3
// (guides) read are kept as hooks (`pgh`, `pgh-*`, `m-card`, `m-lrow`,
// `m-lrow-open`, `m-sc`, `m-scores`, `m-pbadge`, `card-match*`, `m-run`,
// `m-fx`, `m-phase-divider`, `m-glabel`, `m-grid`, `m-list`…); they carry no
// V3 styling here any more.
import React from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import type { Title } from '../types/catalog';

const I18N = () => window.MCU_I18N;
const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);
const phaseColor = (n: number) => `var(--phase-${n})`;
// mobile.tsx is not typed yet: Highlight returns text or marked pieces.
const Highlight = (props: { text: string; query?: string }) => {
  const H = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  return <H {...props}/>;
};
// tracking.tsx is not typed yet: the part of the collection these pieces use.
type CollectionView = {
  states: Record<string, string>; statusOf: (id: string) => string; ready: boolean;
  requestBulk: (ids: string[], to: string, done?: () => void) => void;
};
const useCollection = () => window.useCollection() as unknown as CollectionView;

/** The type scale's 12px step (--fs-xs): Tailwind's text-xs reads --fs-sm. */
export const XS = 'text-(length:--fs-xs) leading-[1.4]';
/** A step between foreground and muted text (V3's "dim"); AA on every surface. */
export const DIM = 'text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]';
/** A poster thumbnail: the art fills the box. */
export const THUMB = 'overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

// A score: a brand tag (black on IMDb yellow, white on RT red at 5.4:1) and
// the number in the brand colour on a dark chip, the Spatial card's chip
// (spatial-card.tsx); in the light theme the chip turns to the card surface
// and the number to the text colour. Tabular figures, no monospace.
// The chip is opaque so the yellow and red read the same on a poster, a List
// row or a light card (a translucent chip over a light row put the red score
// at 2.85:1; on rgb(10,12,20) every rating colour is 5.9:1 or better).
const CHIP = 'm-sc flex flex-none items-center gap-1 rounded-[4px] border border-white/14 bg-[rgb(10,12,20)] px-1.5 py-[3px] font-bold whitespace-nowrap tabular-nums not-dark:border-border not-dark:bg-card not-dark:text-foreground';
const TAG = 'tg rounded-[2px] px-[3px] py-px font-extrabold tracking-[.2px]';

export function ScoreChip({ kind, title, compact = false, className }: { kind: 'imdb' | 'rt'; title: Title; compact?: boolean; className?: string }) {
  const value = kind === 'imdb' ? title.imdb : title.rt;
  if (value == null) return null;
  const pad = compact && 'px-[5px] py-[2.5px]';
  return kind === 'imdb' ? (
    <div className={cn(CHIP, XS, 'imdb text-[#f5c518]', pad, className)} title={tr(title.type === 'series' ? 'score.imdbSeries' : 'score.imdbMovie')}>
      <span className={cn(TAG, XS, 'imdb-tag bg-[#f5c518] text-black')}>IMDb</span>{value.toFixed(1)}
    </div>
  ) : (
    <div className={cn(CHIP, XS, 'rt text-[#fa5c3c]', pad, className)} title={tr('score.rt')}>
      <span className={cn(TAG, XS, 'rt-tag bg-[#cc2a0a] text-white')}>RT</span>{value}%
    </div>
  );
}

/** IMDb and RT for a title (`lead` first), or "No scores yet". `compact`
 *  lays them over the bottom of a Grid poster. */
export function ScoreBadges({ title, lead, compact, className }: { title: Title; lead?: 'rt' | 'imdb'; compact?: boolean; className?: string }) {
  const wrap = cn('m-scores flex gap-[5px]', compact && 'compact pointer-events-none absolute right-[7px] bottom-[7px] left-[7px] z-2 flex-wrap items-end gap-1', className);
  if (title.imdb == null && title.rt == null) {
    return <div className={wrap}><div className={cn(CHIP, XS, 'none font-medium text-(--on-image-muted) not-dark:text-muted-foreground', compact && 'px-[5px] py-[2.5px]')}>{tr('score.none')}</div></div>;
  }
  const imdb = <ScoreChip key="i" kind="imdb" title={title} compact={compact}/>;
  const rt = <ScoreChip key="r" kind="rt" title={title} compact={compact}/>;
  return <div className={wrap}>{lead === 'rt' ? [rt, imdb] : [imdb, rt]}</div>;
}

/** "PH 1" on a poster, in the phase colour. */
export function PhaseBadge({ phase, className }: { phase: number; className?: string }) {
  return (
    <Badge className={cn('m-pbadge absolute top-[7px] left-[7px] z-2 border-transparent font-semibold text-(--on-color) tabular-nums', className)}
      style={{ background: phaseColor(phase) }}>
      {tr('phase.short', { n: phase })}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Progress meters
// ---------------------------------------------------------------------------

type ProgressProps = {
  label: React.ReactNode; color?: string; seen: number; released: number; upcoming?: number;
  /** A Spatial band label: the bar is as wide as the band's row of cards. */
  band?: boolean; width?: number; action?: React.ReactNode;
};

const FILL = 'bg-(--pm,var(--brand))';

/** One progress header for every surface that groups titles: desktop List
 *  (phase headers and Release phase dividers), phone List and Grid, guides
 *  and the Spatial band labels. Shared on purpose — five hand-made variants
 *  would drift apart. `label` and `color` belong to the caller; `action` is
 *  the "Mark N more seen" slot. A segment per released title while they stay
 *  wide enough to tell apart, so the shape itself says how many are done. */
export function ProgressHeader({ label, color, seen, released, upcoming, band, width, action }: ProgressProps) {
  // Hooks run before the early return below: a group with nothing released
  // still renders a header, it just has no meter to animate.
  const ref = React.useRef<HTMLDivElement>(null);
  const [lit, setLit] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    const reduced = window.MCU_MOTION.reduced();
    // No observer, or motion turned down: show the finished meter at once.
    if (!el || !window.IntersectionObserver || reduced) { setLit(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setLit(true); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Meters without a colour of their own (All titles, eras, guides) turn the
  // "seen" green once complete, so a full meter doesn't read as in progress;
  // a phase keeps its phase colour.
  const style: Record<string, string> = {};
  if (color) style['--pm'] = color;
  else if (released > 0 && seen >= released) style['--pm'] = 'var(--status-seen)';
  if (width) style['--pgw'] = width + 'px';
  const styleOrNull = Object.keys(style).length ? (style as React.CSSProperties) : undefined;
  const root = (done: boolean) => cn('pgh flex min-w-0 flex-col gap-1.5', band && 'band w-full gap-[5px]', done && 'done');
  const top = 'pgh-top flex min-w-0 items-center gap-2.5';
  const labelEl = <span className="pgh-label min-w-0 truncate">{label}</span>;
  const up = upcoming ? <span className={cn('pgh-up shrink-0 tabular-nums text-muted-foreground', XS)} aria-hidden={released ? true : undefined}>{tr('progress.upcoming', { n: upcoming })}</span> : null;
  // Nothing released in this group yet: a bar would be a lie, so just the label.
  if (!released) {
    return <div className={root(false)} ref={ref} style={styleOrNull}><span className={top}>{labelEl}{up}</span></div>;
  }
  const done = seen >= released;
  const pct = Math.round((seen / released) * 100);
  const segmented = released <= 24;
  return (
    <div className={root(done)} ref={ref} style={styleOrNull}>
      <span className={top}>
        {labelEl}
        {/* The disc and the numbers are decoration; the sentence below is what
            a screen reader reads, so colour is never the only signal. A full
            group shows the disc alone. */}
        {done
          ? <span className={cn('pgh-done inline-flex size-3.5 shrink-0 in-[.band]:size-[13px] items-center justify-center rounded-full leading-none font-bold text-background', XS, FILL)} aria-hidden="true">✓</span>
          : <span className={cn('pgh-count shrink-0 tabular-nums', XS, DIM)} aria-hidden="true">{seen}/{released}</span>}
        {up}
        {action}
      </span>
      {segmented ? (
        <span className={cn('pgh-bar seg flex h-[3px] gap-0.5', band && 'h-1 gap-[3px] in-[.app.touch]:gap-0.5', lit && 'lit')} aria-hidden="true">
          {Array.from({ length: released }, (_, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}
              className={cn('pgh-seg h-full min-w-0 flex-1 rounded-[1px] bg-border transition-[background-color] duration-[260ms] motion-reduce:transition-none',
                i < seen && 'on', lit && i < seen && cn(FILL, 'animate-[pgh-seg-in_300ms_cubic-bezier(.2,.8,.2,1)_backwards] [animation-delay:calc(min(var(--i,0),8)*45ms)] motion-reduce:animate-none in-[.reduce-motion]:animate-none'))}/>
          ))}
        </span>
      ) : (
        <span className={cn('pgh-bar block h-0.5 overflow-hidden rounded-[1px] bg-border', band && 'h-[3px]')} aria-hidden="true">
          {/* The bar animates only after the visitor's own marking, never on
              first paint or a sort change, and never with reduced motion. */}
          <span className={cn('pgh-fill block h-full rounded-[1px] transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none in-[.flip-active]:transition-none in-[.lines-settling]:transition-none', FILL)}
            style={{ width: (lit ? pct : 0) + '%' }}/>
        </span>
      )}
      <span className="story-sr">
        {tr('progress.seen', { seen, n: released })}
        {upcoming ? ' ' + tr('progress.upcomingLong', { n: upcoming }) : ''}
      </span>
    </div>
  );
}

/** "Mark all seen" / "Mark 4 more seen" in a meter's action slot. It counts
 *  with the rule the action uses (released, not yet seen), so the label never
 *  promises a different number than it marks; with nothing left it is gone. */
export function BulkHeaderAction({ ids, group }: { ids: string[]; group: string }) {
  const { states, requestBulk } = useCollection();
  const n = window.MCU_bulkTargets(ids, 'seen', states).length;
  if (!n) return null;
  const anySeen = ids.some(id => states[id] === 'seen');
  return (
    <Button type="button" variant="outline" className={cn('pgh-action ml-auto h-[max(32px,2rem)] shrink-0 px-[11px] text-xs font-medium tracking-normal normal-case')}
      onClick={() => requestBulk(ids, 'seen')} aria-label={tr('bulk.header.aria', { n, group })}>
      {anySeen ? tr('bulk.header.rest', { n }) : tr('bulk.header.all')}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Search match, empty state
// ---------------------------------------------------------------------------

/** Which character matched the search, with their performer. `title` makes
 *  the credit right: The Incredible Hulk names Edward Norton. Inside a Spatial
 *  card it keeps the canvas's pixel sizes; elsewhere it follows the scale. */
export function MatchBadge({ matchedChars, query, title }: { matchedChars?: string[] | null; query?: string; title?: Title }) {
  if (!matchedChars || !matchedChars.length) return null;
  const id = matchedChars[0];
  const c = window.CHARACTERS[id];
  if (!c) return null;
  const I = I18N();
  const credited = title && window.MCU_credit ? window.MCU_credit(title, id) : c.actor;
  const media = window.MEDIA;
  const portrait = title && window.castPortrait
    ? window.castPortrait(title, id)
    : (media && media.actors && media.actors[id]
      ? (window.mediaURL ? window.mediaURL('a', id, media.profile_base + media.actors[id]) : media.profile_base + media.actors[id])
      : null);
  return (
    <div className="card-match mt-1.5 flex max-w-full items-center gap-[7px] rounded-md border border-[color-mix(in_oklab,var(--match-color)_40%,transparent)] bg-[color-mix(in_oklab,var(--match-color)_14%,transparent)] py-1 pr-[7px] pl-1 in-[.card]:mt-[7px]"
      style={{ '--match-color': c.color } as React.CSSProperties} title={matchedChars.map(mid => I.charName(mid)).join(', ')}>
      <div className="card-match-portrait flex size-[22px] flex-[0_0_22px] items-center justify-center overflow-hidden rounded-full text-[8px] font-bold text-[#0a0c14] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_13%,transparent)] [&_img]:block [&_img]:size-full [&_img]:object-cover"
        style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)` }}>
        <window.Portrait url={portrait} alt={I.charName(id)} initials={c.initials}/>
      </div>
      <div className="card-match-text min-w-0 flex-1">
        <div className={cn('card-match-char truncate font-semibold text-(--match-color) in-[.card]:text-[10px] [&_mark.hl]:decoration-(--match-color)', XS)}>
          <Highlight text={I.charName(id)} query={query}/>{matchedChars.length > 1 ? ` +${matchedChars.length - 1}` : ''}
        </div>
        <div className={cn('card-match-actor mt-px truncate text-muted-foreground in-[.card]:text-[9px] [&_mark.hl]:font-bold [&_mark.hl]:text-(--match-color) [&_mark.hl]:decoration-(--match-color)', XS)}>
          <Highlight text={credited} query={query}/>
        </div>
      </div>
    </div>
  );
}

type EmptyProps = { title?: string; sub?: string; mark?: React.ReactNode; action?: { label: string; run: () => void } | null };

/** Nothing to show (a filter or search with no results, an empty tab), on
 *  phones and, with `desktop`, in the desktop List. */
export function EmptyState({ title, sub, mark, action, desktop = false }: EmptyProps & { desktop?: boolean }) {
  return (
    <div className={cn(desktop ? 'dl-empty px-5 py-20' : 'm-empty flex flex-1 flex-col items-center justify-center gap-1.5 px-[30px] py-10', 'text-center')}>
      {!desktop && <div className="m-empty-mark text-4xl text-border" aria-hidden="true">{mark || '◍'}</div>}
      <div className={cn(desktop ? 'dl-empty-t' : 'm-empty-t', 'text-base font-semibold text-foreground')}>{title || tr('empty.title')}</div>
      <div className={cn(desktop ? 'dl-empty-s mt-1.5 text-sm' : 'm-empty-s text-xs', 'text-muted-foreground')}>{sub || tr('empty.sub')}</div>
      {action && <Button type="button" variant="outline" className="empty-action mt-3.5 h-auto min-h-10 px-4 text-sm font-semibold" onClick={action.run}>{action.label}</Button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone List and Grid: layout recipes (MobileGrid / MobileList in mobile.tsx)
// ---------------------------------------------------------------------------

/** The section heading over a run of titles: a year, a story era. */
export const GLABEL = 'm-glabel mb-[9px] text-xs font-medium text-muted-foreground in-[.m-flat]:mt-[7px] in-[.m-flat]:mb-0 [&_.pgh]:flex-col-reverse [&_.pgh]:gap-1.5 [&_.pgh-label]:text-xs';
export const GLABEL_STORY = 'story flex items-center gap-[5px] [&>svg]:flex-none [&>svg]:opacity-75';

/** The phase (or All titles) meter at the top of each phase block: the bar
 *  is the rule between phases and the meter for the one below it (drawn above
 *  the label), and it pins to the top of the scroll area while its phase is
 *  on screen. Each block bounds one, so the next phase pushes it out rather
 *  than stacking on it. The negative margins cover the scroll area's gutters;
 *  top:-14px pins it against that area's top padding. */
export const PHASE_DIVIDER = 'm-phase-divider sticky top-[-14px] z-4 -mx-3.5 mt-[22px] bg-background px-3.5 pt-[9px] pb-2 text-sm font-semibold tracking-tight text-(--pm,var(--muted-foreground)) min-[600px]:-mx-5 min-[600px]:px-5 [.m-gblock:first-child>&]:mt-0 [&+*]:mt-2.5 [&+.m-glabel]:pt-1.5 [&_.pgh]:flex-col-reverse [&_.pgh]:gap-[5px] [&_.pgh-top]:flex-wrap [&_.pgh-top]:gap-y-1.5 [&_.pgh-label]:flex-[0_1_auto] [&_.pgh-label]:min-w-[min(100%,max-content)] [&_.pgh-label]:text-(--pm)';
export const PHASE_DIVIDER_ALL = cn('overall [&_.pgh-label]:text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]', DIM);
export const GBLOCK = 'm-gblock relative';
export const GROUP = 'm-group [.m-group+&]:mt-4';
export const GRID = 'm-grid grid grid-cols-2 gap-3.5 min-[600px]:grid-cols-3';
export const LIST = 'm-list flex flex-col gap-[9px]';
/** The All tab's flat column of collapsible wrappers. Motion starts once the
 *  collection has loaded (`settled`); the Grid's sections keep its 14px gap. */
export const flatClass = (grid: boolean, settled: boolean) => cn(grid ? 'm-gflat [&_.m-fx:not(.shut)>.m-fx-in]:pb-3.5' : 'm-flat',
  'flex min-w-0 flex-col [--fx:0ms] [--fx-fade:0ms] [--fx-ease:cubic-bezier(.2,.8,.2,1)]', settled && 'settled [--fx:340ms] [--fx-fade:220ms]');

// The row and card a title gets. Their surfaces are shadcn's Card; the
// current title (a pinned character's or guide's step) gets a ring in its
// colour, and a watchlisted one (outside the Watchlist tab) a thin amber
// outline. Each is a <div> around a dedicated open button, because Seen and
// Watchlist are buttons too and a nested <button> is invalid HTML.
const SURFACE = 'rounded-xl border bg-card text-left text-card-foreground shadow-sm active:border-ring';
const WATCH = 'watch border-[color-mix(in_oklab,var(--status-watch)_75%,transparent)]';
const CURRENT = 'current shadow-[0_0_0_2px_var(--cur-color,var(--primary))]';
// The seen wash over a poster: badges stay above it.
const SEEN_WASH = "after:pointer-events-none after:absolute after:inset-0 after:z-1 after:bg-[rgba(10,12,20,0.34)] after:backdrop-saturate-[.35] after:content-['']";

type CardProps = {
  t: Title; seen: boolean; watch: boolean; current: boolean;
  matchedChars?: string[] | null; search?: string; onSelect: (id: string) => void;
};

/** A title in the phone Grid: poster with its PH badge and scores, then
 *  title, year and budget, "Set in" and the search match. */
export function PhoneCard({ t, seen, watch, current, matchedChars, search, onSelect }: CardProps) {
  const I = I18N();
  const { PosterArt, StoryYear, ReleaseBadge } = window;
  return (
    <div data-flip-id={t.id} data-row-id={t.id}
      className={cn('m-card relative block overflow-hidden', SURFACE, seen && 'seen', watch && WATCH, current && CURRENT)}>
      <button className="m-card-open block w-full cursor-pointer rounded-[inherit] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset" onClick={() => onSelect(t.id)}>
        <div className={cn('m-pw relative aspect-[2/3]', THUMB, seen && SEEN_WASH)}>
          <PosterArt title={t}/>
          <PhaseBadge phase={t.phase}/>
          <ScoreBadges title={t} compact/>
        </div>
        <div className={cn('m-cmeta px-[9px] pt-2 pb-2.5', seen && 'opacity-82')}>
          <div className="m-ctitle line-clamp-2 min-h-[31px] text-xs leading-[1.25] font-medium tracking-tight text-pretty"><Highlight text={I.titleName(t)} query={search}/></div>
          <div className={cn('m-cyear mt-[5px] flex items-center justify-between tabular-nums text-muted-foreground', XS)}>
            <span>{t.year}<ReleaseBadge title={t} className="m-crelease"/></span>
            {t.budget != null && <b className={cn('font-semibold', DIM)}>{I.budget(t.budget)}</b>}
          </div>
          <StoryYear title={t} className="m-cstory mt-1 flex"/>
          <MatchBadge matchedChars={matchedChars} query={search} title={t}/>
        </div>
      </button>
      {/* Top-right: the PH badge owns top-left. */}
      <window.TitleStatusActions title={t} className="m-card-tsa top-[7px] right-[7px] bottom-auto flex-row [transform:none] [&_.tsa-btn]:size-[max(36px,2.25rem)] [&_.tsa-btn_svg]:size-4"/>
    </div>
  );
}

type RowProps = CardProps & {
  rank: number | null; ranked: boolean; chrono: boolean; lead: 'rt' | 'imdb'; compact: boolean;
};

/** A title in the phone List: rank (score orders), poster, title, a meta line
 *  (type or year, phase, budget, "Set in", release), scores and the search
 *  match; Seen and Watchlist at the end. On the All tab a seen title shrinks
 *  to a compact row (`compact`): small poster, title only, buttons side by
 *  side, animated in the flat list's --fx timing. */
export function PhoneRow({ t, rank, ranked, chrono, lead, compact, seen, watch, current, matchedChars, search, onSelect }: RowProps) {
  const I = I18N();
  const { PosterArt, StoryYear, ReleaseBadge } = window;
  const dot = <span className="m-dot size-[3px] flex-[0_0_3px] rounded-[2px] bg-muted-foreground"/>;
  const fx = (props: string) => `[transition-property:${props}] duration-(--fx,0ms) ease-(--fx-ease) motion-reduce:transition-none`;
  // The meta line and scores fold away in a compact row.
  const folds = cn('in-[.m-flat]:max-h-12 in-[.m-flat]:overflow-hidden', fx('max-height,opacity,margin'), compact && 'mt-0! max-h-0! opacity-0');
  return (
    <div data-flip-id={t.id} data-row-id={t.id}
      className={cn('m-lrow flex min-h-[93px] w-full items-center gap-2 py-[9px] pr-[11px] pl-[9px]', SURFACE, fx('min-height,padding'),
        seen && 'seen', compact && 'compact min-h-[max(50px,3.125rem)] py-1.5', watch && WATCH, current && CURRENT)}>
      <button className="m-lrow-open flex min-w-0 flex-1 cursor-pointer items-center gap-[11px] rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => onSelect(t.id)}>
        {ranked && <div className="m-rank w-[22px] flex-[0_0_22px] text-center text-sm font-semibold tabular-nums text-muted-foreground">{rank}</div>}
        <div className={cn('m-lthumb relative h-[75px] w-[50px] flex-[0_0_50px] rounded-md', THUMB, fx('width,height,flex-basis'),
          seen && "after:pointer-events-none after:absolute after:inset-0 after:bg-[rgba(10,12,20,0.5)] after:content-['']", compact && 'h-[38px] w-[26px] basis-[26px]')}>
          <PosterArt title={t}/>
        </div>
        <div className={cn('m-ltext min-w-0 flex-1', seen && 'opacity-85')}>
          <div className="m-ltitle text-sm leading-[1.3] font-medium tracking-tight"><Highlight text={I.titleName(t)} query={search}/></div>
          <div className={cn('m-lmeta mt-1 flex flex-wrap items-center gap-[7px] tabular-nums text-muted-foreground', XS, folds)}>
            {!ranked && <span>{tr(t.type === 'film' ? 'type.film.one' : 'type.series.one')}</span>}
            {chrono && <>{dot}<span title={tr('story.releaseYear')}>{t.year}</span></>}
            {ranked && <span>{t.year}</span>}
            {dot}
            <span style={{ color: phaseColor(t.phase) }}>{tr('phase.label', { n: t.phase })}</span>
            {t.budget != null && <>{dot}<span>{I.budget(t.budget)}</span></>}
            {t.story && !chrono && <>{dot}<StoryYear title={t}/></>}
            <ReleaseBadge title={t} className="m-lrelease ml-1.5"/>
          </div>
          <ScoreBadges title={t} lead={lead} className={cn('mt-[7px] flex-row flex-wrap items-center gap-x-3 gap-y-1.5', folds)}/>
          <MatchBadge matchedChars={matchedChars} query={search} title={t}/>
        </div>
      </button>
      <window.TitleStatusActions title={t} className={cn('m-lrow-tsa static flex-none flex-col gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(32px,2rem)] [&_.tsa-btn_svg]:size-[15px]', compact && 'flex-row')}/>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seen runs on the All tab (phone List and Grid)
// ---------------------------------------------------------------------------

/** Runs of seen titles: two or more consecutive seen titles in the current
 *  order. Order never changes; a run only groups neighbours. */
export function seenRuns(titles: Title[], statusOf: (id: string) => string): Title[][] {
  const runs: Title[][] = [];
  let run: Title[] = [];
  const close = () => { if (run.length >= 2) runs.push(run); run = []; };
  titles.forEach(t => { if (statusOf(t.id) === 'seen') run.push(t); else close(); });
  close();
  return runs;
}

// Folded runs, remembered on this device across visits and shared by List and
// Grid. Runs shift as titles are marked, so this keeps the titles that were
// folded rather than the runs: a run is folded when most of its titles were.
const SEEN_FOLDS_KEY = 'mcu.seenFolds.v1';
const seenFolds: Set<string> = (() => {
  try { return new Set<string>(JSON.parse(window.localStorage.getItem(SEEN_FOLDS_KEY) || '[]') || []); } catch (e) { return new Set<string>(); }
})();
const seenFoldListeners = new Set<() => void>();
export function useSeenFolds() {
  const [, bump] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { seenFoldListeners.add(bump); return () => { seenFoldListeners.delete(bump); }; }, []);
  const isShut = (items: Title[]) => items.filter(t => seenFolds.has(t.id)).length * 2 > items.length;
  const toggle = (items: Title[]) => {
    const shut = !isShut(items);
    items.forEach(t => { if (shut) seenFolds.add(t.id); else seenFolds.delete(t.id); });
    try { window.localStorage.setItem(SEEN_FOLDS_KEY, JSON.stringify([...seenFolds])); } catch (e) { /* not remembered */ }
    seenFoldListeners.forEach(fn => fn());
  };
  return { isShut, toggle };
}

/** Settles once the saved collection has loaded: lists only animate changes
 *  after that, so they open already compact and folded. */
export function useSettled() {
  const { ready } = useCollection();
  const [settled, setSettled] = React.useState(false);
  React.useEffect(() => {
    if (!ready || settled) return undefined;
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setSettled(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [ready, settled]);
  return settled;
}

/** A collapsible wrapper: animates its content's height to and from zero
 *  (grid-template-rows 1fr <-> 0fr). With `appear`, it mounts closed and opens
 *  on the next frame (a row that just joined the list). The inner box reaches
 *  6px past its content on each side so rings and focus outlines aren't
 *  clipped; its bottom padding is the gap between rows, and folds away. */
export function Fx({ open = true, appear = false, children }: { open?: boolean; appear?: boolean; children: React.ReactNode }) {
  const [ready, setReady] = React.useState(!appear);
  React.useEffect(() => {
    if (ready) return undefined;
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setReady(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shut = !(open && ready);
  // Content is clipped only while closed or opening/closing, so open content
  // can glide across sections (Grid reorder) and keep its rings unclipped.
  const was = React.useRef(shut);
  const [moving, setMoving] = React.useState(false);
  React.useEffect(() => {
    if (was.current === shut) return undefined;
    was.current = shut;
    setMoving(true);
    const id = setTimeout(() => setMoving(false), 420);
    return () => clearTimeout(id);
  }, [shut]);
  return (
    <div aria-hidden={shut || undefined}
      className={cn('m-fx grid min-w-0 grid-cols-[minmax(0,1fr)] motion-reduce:transition-none',
        shut ? 'shut invisible grid-rows-[0fr] opacity-0 [transition:grid-template-rows_var(--fx)_var(--fx-ease),opacity_var(--fx-fade)_ease,visibility_0s_var(--fx)]'
          : 'grid-rows-[1fr] opacity-100 [transition:grid-template-rows_var(--fx)_var(--fx-ease),opacity_var(--fx-fade)_ease,visibility_0s]',
        moving && 'moving')}>
      <div className={cn('m-fx-in -mx-1.5 -mt-1.5 min-h-0 min-w-0 px-1.5 pt-1.5 pb-[9px] [transition:padding_var(--fx)_var(--fx-ease),margin_var(--fx)_var(--fx-ease)] motion-reduce:transition-none',
        shut && 'mt-0 pt-0 pb-0', (shut || moving) && 'overflow-hidden')}>{children}</div>
    </div>
  );
}

/** The header of a run of seen titles on the All tab: a slim bar while the
 *  run is open, a summary row (stacked posters, count, first and last title)
 *  while it is folded. One element morphs between the two. */
export function SeenRunHead({ items, shut, onToggle }: { items: Title[]; shut: boolean; onToggle: () => void }) {
  const I = I18N();
  const PosterArt = window.PosterArt;
  const n = items.length;
  const first = I.titleName(items[0]), last = I.titleName(items[n - 1]);
  const fx = (props: string) => `[transition-property:${props}] duration-(--fx) ease-(--fx-ease) motion-reduce:transition-none`;
  return (
    <button aria-expanded={!shut} aria-label={tr(shut ? 'list.seenRunShow' : 'list.seenRunHide', { n })} onClick={onToggle}
      className={cn('m-run flex w-full max-w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-transparent py-0.5 pr-1 pl-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        DIM, fx('padding,background-color,border-color'),
        shut && 'shut border-input bg-[color-mix(in_oklab,var(--status-seen)_6%,transparent)] py-[9px] pr-3 pl-2.5 text-foreground')}>
      <span className={cn('m-run-stack flex flex-none', fx('max-width,opacity'), shut ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0')} aria-hidden="true">
        {items.slice(0, 3).map(t => (
          <span key={t.id} className={cn("m-run-thumb relative h-[45px] w-[30px] flex-[0_0_30px] rounded-[5px] ring-2 ring-background [&+&]:-ml-3.5 after:absolute after:inset-0 after:bg-[rgba(10,12,20,.45)] after:content-['']", THUMB)}>
            <PosterArt title={t}/>
          </span>
        ))}
      </span>
      <span className="m-run-text flex min-w-0 flex-1 flex-col">
        <b className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--status-seen-text) [&_svg]:size-3"><window.CheckIcon/>{tr('list.seenRun', { n })}</b>
        <span className={cn('m-run-range truncate text-xs text-muted-foreground', fx('max-height,opacity,margin'), shut ? 'mt-[3px] max-h-[18px] opacity-100' : 'max-h-0 opacity-0')}>{first} – {last}</span>
      </span>
      <span className={cn('m-run-chev text-xl leading-none text-muted-foreground', fx('transform'), shut ? 'rotate-90' : '-rotate-90')} aria-hidden="true">›</span>
    </button>
  );
}

Object.assign(window, { ScoreBadges, ScoreChip, PhaseBadge, ProgressHeader, BulkHeaderAction, MatchBadge, EmptyState });
