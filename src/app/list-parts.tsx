// The List and Grid views' pieces on the design system (Notion "shadcn pass
// 4/5: List and Grid views"): the progress meters, score chips, the PH badge,
// the character marker, the empty state, the phone List row and Grid card,
// the seen-run header and the collapsible wrapper the phone lists fold with,
// and the class recipes the phone List and Grid lay themselves out with.
//
// Moved out of mobile.tsx so they can be built on the design system: this file
// is listed with `@source` in src/index.css, so the class recipes exported
// below (used by MobileList, which stay in mobile.tsx with their
// grouping and reorder logic) are generated from here.
//
// Same content, order and actions as before; only the building blocks
// changed. Class names the app, the QA checks and the surfaces still on V3
// (guides) read are kept as hooks (`pgh`, `pgh-*`, `m-card`, `m-lrow`,
// `m-lrow-open`, `m-sc`, `m-scores`, `m-pbadge`, `char-mark*`, `m-run`,
// `m-fx`, `m-phase-divider`, `m-glabel`, `m-grid`, `m-list`…); they carry no
// V3 styling here any more.
import React from 'react';
import { cn } from '@/lib/utils';
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

/** The caption role (12px), with its line height. */
export const XS = 'text-caption leading-[1.4]';
/** A step between foreground and muted text (V3's "dim"); AA on every surface. */
export const DIM = 'text-(--dim)';
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
// at 2.85:1; on --on-image-base every rating colour is 5.9:1 or better).
// Andre, 2026-11-16: the pills were a bit large. One small size everywhere
// (List rows and columns, the cards' covers, the details), at the 12px floor
// and growing only with the Large text size; tighter padding.
const SC_TEXT = 'text-caption leading-[1.25]';
const CHIP = 'm-sc flex flex-none items-center gap-[3px] rounded-[4px] border border-(--chip-border) bg-(--chip) px-[5px] py-[2px] font-bold whitespace-nowrap tabular-nums';
const TAG = 'tg rounded-[2px] px-[3px] py-0 font-extrabold tracking-[.2px]';

export function ScoreChip({ kind, title, compact = false, className }: { kind: 'imdb' | 'rt'; title: Title; compact?: boolean; className?: string }) {
  const value = kind === 'imdb' ? title.imdb : title.rt;
  if (value == null) return null;
  const pad = compact && 'px-[4px] py-[1.5px]';
  return kind === 'imdb' ? (
    <div className={cn(CHIP, SC_TEXT, 'imdb text-(--chip-imdb)', pad, className)} title={tr(title.type === 'series' ? 'score.imdbSeries' : 'score.imdbMovie')}>
      <span className={cn(TAG, 'imdb-tag bg-(--imdb) text-black')}>IMDb</span>{value.toFixed(1)}
    </div>
  ) : (
    <div className={cn(CHIP, SC_TEXT, 'rt text-(--chip-rt)', pad, className)} title={tr('score.rt')}>
      <span className={cn(TAG, 'rt-tag bg-(--rt) text-white')}>RT</span>{value}%
    </div>
  );
}

/** IMDb and RT for a title (`lead` first), or "No scores yet". `compact`
 *  lays them over the bottom of a Grid poster. */
export function ScoreBadges({ title, lead, compact, className }: { title: Title; lead?: 'rt' | 'imdb'; compact?: boolean; className?: string }) {
  const wrap = cn('m-scores flex gap-[5px]', compact && 'compact pointer-events-none absolute right-[7px] bottom-[7px] left-[7px] z-2 flex-wrap items-end gap-1', className);
  if (title.imdb == null && title.rt == null) {
    return <div className={wrap}><div className={cn(CHIP, SC_TEXT, 'none font-medium text-(--chip-muted)', compact && 'px-[5px] py-[2.5px]')}>{tr('score.none')}</div></div>;
  }
  const imdb = <ScoreChip key="i" kind="imdb" title={title} compact={compact}/>;
  const rt = <ScoreChip key="r" kind="rt" title={title} compact={compact}/>;
  return <div className={wrap}>{lead === 'rt' ? [rt, imdb] : [imdb, rt]}</div>;
}

/** "Phase 1" on a poster, in the phase color: the same name as everywhere
 *  else (docs/glossary.md), not a short form. */
export function PhaseBadge({ phase, className }: { phase: number; className?: string }) {
  return (
    <Badge className={cn('m-pbadge absolute top-[7px] left-[7px] z-2 border-transparent font-semibold text-(--on-color) tabular-nums', className)}
      style={{ background: phaseColor(phase) }}>
      {tr('phase.label', { n: phase })}
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

const FILL = 'bg-(--pm,var(--progress))';

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
  else if (released > 0 && seen >= released) style['--pm'] = 'var(--seen)';
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
          : <span className={cn('pgh-count shrink-0 tabular-nums', XS, DIM)} aria-hidden="true">{tr('progress.count', { seen, n: released })}</span>}
        {up}
        {action}
      </span>
      {segmented ? (
        <span className={cn('pgh-bar seg flex h-[3px] gap-0.5', band && 'h-1 gap-[3px] in-[.app.touch]:gap-0.5', lit && 'lit')} aria-hidden="true">
          {Array.from({ length: released }, (_, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}
              className={cn('pgh-seg h-full min-w-0 flex-1 rounded-[1px] bg-[color-mix(in_oklab,var(--pm,var(--progress))_22%,transparent)] transition-[background-color] duration-[260ms] motion-reduce:transition-none',
                i < seen && 'on', lit && i < seen && cn(FILL, 'animate-[pgh-seg-in_300ms_cubic-bezier(.2,.8,.2,1)_backwards] [animation-delay:calc(min(var(--i,0),8)*45ms)] motion-reduce:animate-none in-[.reduce-motion]:animate-none'))}/>
          ))}
        </span>
      ) : (
        <span className={cn('pgh-bar block h-0.5 overflow-hidden rounded-[1px] bg-[color-mix(in_oklab,var(--pm,var(--progress))_22%,transparent)]', band && 'h-[3px]')} aria-hidden="true">
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
export function BulkHeaderAction({ ids, group, className = '' }: { ids: string[]; group: string; className?: string }) {
  const { states, requestBulk } = useCollection();
  const n = window.MCU_bulkTargets(ids, 'seen', states).length;
  if (!n) return null;
  const anySeen = ids.some(id => states[id] === 'seen');
  return (
    <Button type="button" variant="outline" className={cn('pgh-action ml-auto h-[max(32px,2rem)] shrink-0 px-[11px] text-label font-medium tracking-normal normal-case', className)}
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
/** Who a title is here for (Notion "Titles: show the picked character on each
 *  of their title rows", design v2/v3, Andre 2026-11-24): one quiet line of
 *  overlapping portraits and names, no box. App.tsx works out the groups
 *  (`charMarks`): for a typed search, each row's own matches, grouped by
 *  character so a recast's Peters read "Peter Parker" once, with the actor
 *  named and bold when the actor is what matched; for a picked character or
 *  actor, their portrayal in that title, the performer named only when it
 *  isn't the one picked. Rows list every name; a card, which has one fixed
 *  line, shows the first ("+1" for more), or the actor alone when the actor
 *  matched, so the ellipsis never cuts off the part that matched. The typed
 *  part is semibold, not underlined. Phones and desktop share it. */
export type CharMarkGroup = { chars: string[]; name: string; actor: string | null; actorMatched: boolean };
export type CharMarkData = { groups: CharMarkGroup[]; query?: string };
const MARK_HL = '[&_mark.hl]:font-semibold [&_mark.hl]:text-foreground [&_mark.hl]:no-underline';
export function CharMark({ mark, title, card = false, size = 20, className }: { mark?: CharMarkData | null; title: Title; card?: boolean; size?: number; className?: string }) {
  if (!mark || !mark.groups.length) return null;
  const I = I18N();
  const chars = mark.groups.flatMap(g => g.chars).filter(c => window.CHARACTERS[c]);
  if (!chars.length) return null;
  const credit = (c: string) => (window.MCU_credit ? window.MCU_credit(title, c) : window.CHARACTERS[c].actor);
  const tip = mark.groups.flatMap(g => g.chars.map(c => tr('charmark.as', { actor: credit(c), name: g.name }))).join(', ');
  const faces = (
    <span className="char-mark-faces flex flex-none items-center" aria-hidden="true">
      {chars.slice(0, 3).map((c, i) => {
        const ch = window.CHARACTERS[c];
        return (
          <span key={c} className={cn('char-mark-face flex flex-none items-center justify-center overflow-hidden rounded-full text-card-micro font-bold text-(--on-image-base) ring-[1.5px] ring-(--background) in-[.card]:ring-(--card) in-[.m-lrow]:ring-(--card) [&_img]:block [&_img]:size-full [&_img]:object-cover', i > 0 && '-ml-[5px]')}
            style={{ width: size, height: size, zIndex: 3 - i, background: `linear-gradient(135deg, ${ch.color}, ${ch.color}88)` }}>
            <window.Portrait url={window.castPortrait ? window.castPortrait(title, c) : null} alt="" initials={ch.initials}/>
          </span>
        );
      })}
    </span>
  );
  const q = mark.query;
  let text: React.ReactNode;
  if (card) {
    const g = mark.groups[0];
    text = <>{g.actorMatched && g.actor ? <Highlight text={g.actor} query={q}/> : <Highlight text={g.name} query={q}/>}{mark.groups.length > 1 ? ` +${mark.groups.length - 1}` : ''}</>;
  } else {
    text = mark.groups.map((g, i) => (
      <React.Fragment key={g.chars[0]}>
        {i > 0 && ', '}
        <Highlight text={g.name} query={q}/>
        {g.actor && <> · <Highlight text={g.actor} query={q}/></>}
      </React.Fragment>
    ));
  }
  return (
    <span className={cn('char-mark flex max-w-full min-w-0 items-center gap-1.5', MARK_HL, className)} title={tip}>
      {faces}
      <span className="char-mark-text min-w-0 truncate">{text}</span>
    </span>
  );
}

type EmptyProps = { title?: string; sub?: string; mark?: React.ReactNode; action?: { label: string; run: () => void } | null };

/** Nothing to show (a filter or search with no results, an empty tab), on
 *  phones and, with `desktop`, in the desktop List. */
export function EmptyState({ title, sub, mark, action, desktop = false }: EmptyProps & { desktop?: boolean }) {
  return (
    <div className={cn(desktop ? 'dl-empty px-5 py-20' : 'm-empty flex flex-1 flex-col items-center justify-center gap-1.5 px-[30px] py-10', 'text-center')}>
      {!desktop && <div className="m-empty-mark text-display text-border" aria-hidden="true">{mark || '◍'}</div>}
      <div className={cn(desktop ? 'dl-empty-t' : 'm-empty-t', 'text-heading font-semibold text-foreground')}>{title || tr('empty.title')}</div>
      <div className={cn(desktop ? 'dl-empty-s mt-1.5 text-body' : 'm-empty-s text-label', 'text-muted-foreground')}>{sub || tr('empty.sub')}</div>
      {action && <Button type="button" variant="outline" className="empty-action mt-3.5 h-auto min-h-10 px-4 text-body font-semibold" onClick={action.run}>{action.label}</Button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone List: layout recipes (MobileList in mobile.tsx)
// ---------------------------------------------------------------------------

/** A group of rows under its heading (DesktopList's GroupHeader, `phone`). */
export const GROUP = 'm-group';
export const LIST = 'm-list flex flex-col gap-[9px]';

// The row and card a title gets. Their surfaces are shadcn's Card; the
// current title (a pinned character's or guide's step) gets a ring in its
// colour, and a watchlisted one (outside the Watchlist tab) a thin amber
// outline. Each is a <div> around a dedicated open button, because Seen and
// Watchlist are buttons too and a nested <button> is invalid HTML.
const SURFACE = 'rounded-xl border bg-card text-left text-card-foreground shadow-sm active:border-ring';
const WATCH = 'watch border-(--status-watch-border)';
const CURRENT = 'current shadow-[0_0_0_2px_var(--cur-color,var(--brand))]';

type RowProps = {
  t: Title; rank: number | null; ranked: boolean; lead: 'rt' | 'imdb'; story?: boolean;
  seen: boolean; watch: boolean; current: boolean; upNext?: boolean;
  mark?: CharMarkData | null; search?: string; onSelect: (id: string) => void;
};

/** A title in the phone List (Notion "Titles 4/5"): rank (score orders), a
 *  40×60 poster with the seen mark in its corner, the title, one meta line
 *  (year, phase, "Set in", release), scores and the search match; Seen and
 *  Watchlist side by side at the end, as 40px buttons. Seen titles keep full
 *  strength, as on desktop (Andre, 2026-11-15: no dimming; the mark and the
 *  green check say it). Up next gets the desktop row's red edge, its pill and
 *  the filled red check (icon only here: the pill names it). */
export function PhoneRow({ t, rank, ranked, lead, story = false, seen, watch, current, upNext = false, mark, search, onSelect }: RowProps) {
  const I = I18N();
  const { PosterArt, StoryYear, ReleaseBadge } = window;
  const dot = <span className="m-dot size-[3px] flex-[0_0_3px] rounded-[2px] bg-muted-foreground"/>;
  // Direction B (Andre, 2026-11-16: the rows were busy): no rank (the order
  // says it), Up next as a word at the start of the meta line, the score
  // being sorted by in that line in place of the phase, and Seen as the one
  // button; Watchlist is a swipe to the left (SwipeRow) or in the details.
  return (
    <window.SwipeRow title={t}>
    <div data-flip-id={t.id} data-row-id={t.id}
      className={cn('m-lrow relative flex min-h-[78px] w-full scroll-mt-3 scroll-mb-[calc(var(--dock-h,0px)+12px)] items-center gap-2 py-2 pr-2.5 pl-2', SURFACE,
        seen && 'seen', watch && WATCH, current && CURRENT,
        upNext && 'up-next border-(--brand-border) bg-(--brand-tint)')}>
      {upNext && <span className="m-next-bar absolute top-3 bottom-3 left-[-1px] w-[3px] animate-[un-in_260ms_ease_both] rounded-full bg-(--brand) motion-reduce:animate-none" aria-hidden="true"/>}
      <button className="m-lrow-open flex min-w-0 flex-1 cursor-pointer items-center gap-[11px] rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => onSelect(t.id)}>
        <div className={cn('m-lthumb relative h-[60px] w-10 flex-[0_0_40px] rounded-[5px]', THUMB)}>
          <PosterArt title={t}/>
          {seen && (
            <span className="m-seen absolute top-[3px] right-[3px] inline-flex size-4 items-center justify-center rounded-full border border-(--seen) bg-(--seen) text-(--seen-foreground) shadow-mark [&_svg]:size-2.5"
              role="img" aria-label={tr('status.seen')}><window.CheckIcon/></span>
          )}
        </div>
        <div className="m-ltext flex min-w-0 flex-1 flex-col items-start">
          <div className="m-ltitle text-body leading-[1.3] font-semibold tracking-tight"><Highlight text={I.titleName(t)} query={search}/></div>
          {/* Like the cards, the meta line follows the sort: "Set in" in
              Story order, the score in a score order. */}
          <div className={cn('m-lmeta mt-0.5 flex flex-wrap items-center gap-x-[7px] gap-y-1 tabular-nums text-muted-foreground', XS)}>
            {upNext && <>
              <span className="m-next-pill animate-[un-in_260ms_ease_both] font-semibold whitespace-nowrap text-(--brand-text) motion-reduce:animate-none">{tr('upnext.label')}</span>
              {dot}
            </>}
            <span>{t.year}</span>
            {dot}
            {ranked
              ? (t[lead] != null ? <ScoreChip kind={lead} title={t} compact className="m-score"/> : <span className="m-score">{tr('score.none')}</span>)
              : <span style={{ color: phaseColor(t.phase) }}>{tr('phase.label', { n: t.phase })}</span>}
            {story && t.story && <>{dot}<StoryYear title={t}/></>}
            {/* Another cut on streaming (Endgame's Encore), kept small. */}
            {t.editions && t.editions[0] && <>{dot}<span className="m-ledition">{tr('edition.tag', { name: t.editions[0].name[I.lang] || t.editions[0].name.en, service: t.editions[0].service })}</span></>}
            <ReleaseBadge title={t} className="m-lrelease ml-1.5"/>
          </div>
          <CharMark mark={mark} title={t} size={18} className={cn('m-lmark mt-1 text-muted-foreground', XS)}/>
        </div>
      </button>
      <window.TitleStatusActions title={t} upNext={upNext}
        className="m-lrow-tsa static z-auto flex-none flex-row gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(40px,2.5rem)] [&_.tsa-btn_svg]:size-4 [&_.tsa-next]:px-0 [&_.tsa-lab]:hidden [&_.tsa-gap]:hidden [&:has(.tsa-btn.seen:not(.tsa-gap))_.tsa-btn.watch]:hidden"/>
    </div>
    </window.SwipeRow>
  );
}

Object.assign(window, { ScoreBadges, ScoreChip, PhaseBadge, ProgressHeader, BulkHeaderAction, CharMark, EmptyState });
