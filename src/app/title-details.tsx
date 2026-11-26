// A title's details (Notion "shadcn pass 3/5: details drawer and phone
// sheet"): the body shared by the desktop drawer and the phone sheet, the
// drawer's frame and cast list, the phone's cast sheet, the collapsible
// sections, and the small lines the details share with cards, rows and Up
// next (the release line and badge, "Set in", the synopsis).
//
// Moved out of mobile.tsx and app.tsx so they can be built on the design
// system: this file is listed with `@source` in src/index.css. Same order, content
// and actions as before; only the building blocks changed. The drawer keeps
// its own behaviour (modeless, no focus trap, focus handling in app.tsx's
// CastDrawer) and the phone sheet keeps the shared `Sheet` frame (focus trap,
// Back, swipe): AGENTS.md's interaction rules win over a library Sheet.
//
// Class names the app, the QA checks and the surfaces' remaining rules read
// are kept as hooks (`drawer`, `open`, `drawer-close`, `drawer-scroll`,
// `td-*`, `cast-row`, `active`, `m-crow`, `on`, `story-year`, `release-line`,
// `release-badge`, `synopsis`…); they carry no V3 styling here any more.
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Title } from '../types/catalog';

const I18N = () => window.MCU_I18N;
const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

// A step between foreground and muted text (V3's "dim"), which holds AA on
// every surface in both themes.
const DIM = 'text-(--dim)';
// A poster thumbnail: the art fills the box.
const THUMB = 'overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';
// Search matches in a cast row, underlined in the character's colour.
const MARKS = '[&_mark.hl]:decoration-(--match-color,var(--brand)) [&_.cast-sub_mark.hl]:font-bold [&_.cast-sub_mark.hl]:text-(--match-color,var(--brand))';

// ---------------------------------------------------------------------------
// Small lines shared with cards, rows, Up next and guides
// ---------------------------------------------------------------------------

export function Hourglass() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 22h14"/><path d="M5 2h14"/>
      <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/>
      <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>
    </svg>
  );
}

/** The in-story timeframe: "Set in 1995", or "Outside time" / "Multiverse"
 *  on their own. In the theme's font with tabular figures (no monospace). */
export function StoryYear({ title, detail = false, className = '' }: { title: Title | null | undefined; detail?: boolean; className?: string }) {
  if (!title || !title.story) return null;
  const story = I18N().storyLabel(title.story);
  const note = I18N().storyNote(title);
  const isTime = /^(c\. )?\d/.test(title.story);
  const full = isTime ? tr('story.setIn', { story }) : story;
  return (
    <span className={cn('story-year inline-flex min-w-0 items-center gap-1 text-label leading-[1.3] in-[.card]:text-card-micro whitespace-nowrap tabular-nums', DIM,
      '[&>span]:overflow-hidden [&>span]:text-ellipsis [&>svg]:flex-none [&>svg]:opacity-75',
      detail && 'detail flex items-start whitespace-normal [&>svg]:mt-px', className)}
      title={`${tr('story.tooltip', { story })}${note ? ' · ' + note : ''}`}>
      <Hourglass/>
      {detail
        ? <span>{full}{note && <span className="story-note text-muted-foreground"> · {note}</span>}</span>
        : <span><span className="story-sr">{full}</span><span aria-hidden="true">{story}</span></span>}
    </span>
  );
}

// Release status: "Released 2 May 2008", "Coming 18 December 2026", or
// "Expected March 2027 · day not yet confirmed", each at the precision the
// catalog has, so an announced month is never shown as a firm date.
const RELEASE_DOT: Record<string, string> = {
  released: 'bg-(--seen)',
  upcoming: 'bg-primary',
  expected: 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--muted-foreground)]',
};
export function ReleaseLine({ title, className = '' }: { title: Title | null | undefined; className?: string }) {
  if (!title) return null;
  const r = I18N().release(title);
  const text = r.date ? tr('release.' + r.status, { date: r.date }) : tr('release.tba');
  return (
    <span className={cn('release-line inline-flex items-center gap-[7px] text-label', DIM, r.status, className)}>
      <span className={cn('release-dot size-[7px] flex-[0_0_7px] rounded-full', RELEASE_DOT[r.status] || 'bg-muted-foreground')} aria-hidden="true"/>
      <span>{text}{r.status === 'expected' && r.date && <span className="release-note text-muted-foreground"> · {tr('release.expectedNote')}</span>}</span>
    </span>
  );
}

/** How long it takes to watch (Notion "Time to finish"): "2 h 6 min", or for
 *  a season "6 episodes · 5 h 20 min". Released titles only. */
export function RuntimeLine({ title, className = '' }: { title: Title | null | undefined; className?: string }) {
  if (!title || !title.runtime) return null;
  const time = window.MCU_GUIDE.duration(title.runtime, false);
  const text = title.episodes ? tr('runtime.episodes', { n: title.episodes }) + ' · ' + time : time;
  return <span className={cn('td-runtime text-label tabular-nums', DIM, className)}>{text}</span>;
}

/** Another cut of the title (Endgame's Encore): "Also available: Encore
 *  (2026) · about 4 minutes of new scenes", then where and since when it
 *  streams. Not a title of its own (Notion "Avengers: Endgame Encore"). */
export function EditionLines({ title, className = '' }: { title: Title | null | undefined; className?: string }) {
  if (!title || !title.editions || !title.editions.length) return null;
  const lang = I18N().lang || 'en';
  const fmt = (d: string) => new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'));
  const pick = (o: Record<string, string>) => o[lang] || o.en;
  return (
    <>
      {title.editions.map(ed => (
        <span key={ed.id} className={cn('td-edition flex flex-col text-label', DIM, className)}>
          <span><span className="font-medium text-foreground">{tr('edition.also', { name: pick(ed.name), year: ed.theatrical.slice(0, 4) })}</span> · {tr('edition.extra', { n: ed.extraMinutes })}</span>
          <span>{tr('edition.streaming', { service: ed.service, date: fmt(ed.streaming) })}</span>
        </span>
      ))}
    </>
  );
}

// A small badge for cards and rows. Released titles get none: they are the
// norm, and a badge on 56 of 64 titles would say nothing.
export function ReleaseBadge({ title, className = '' }: { title: Title | null | undefined; className?: string }) {
  if (!title) return null;
  const r = I18N().release(title);
  if (r.status === 'released') return null;
  const full = r.date ? tr('release.' + r.status, { date: r.date }) : tr('release.tba');
  return (
    <Badge variant="outline" title={full}
      className={cn('release-badge ml-[7px] h-auto px-2 py-0.5 align-[1px] text-label leading-none font-medium in-[.card]:text-card-micro', r.status,
        r.status === 'expected' ? cn('border-dashed border-(--border-strong)', DIM) : 'text-foreground', className)}>
      <span aria-hidden="true">{tr('release.badge.' + r.status)}</span>
      <span className="story-sr">{full}</span>
    </Badge>
  );
}

// Synopsis for the details drawer (desktop) and sheet (mobile). Clamped to
// three lines so the cast list stays in view; "See more" appears only when the
// text is longer than that. Collapses again when the title changes.
export function Synopsis({ title, className = '' }: { title: Title; className?: string }) {
  const text = I18N().synopsis(title);
  const ref = React.useRef<HTMLParagraphElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [long, setLong] = React.useState(false);
  React.useEffect(() => { setOpen(false); }, [title && title.id]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    setLong(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  if (!text) return null;
  return (
    <div className={cn('synopsis', className)}>
      <p ref={ref} className={cn('m-0 text-body leading-[1.5] text-pretty text-muted-foreground', open ? 'open block' : 'line-clamp-3')}>{text}</p>
      {(long || open) && <Button variant="link" className="synopsis-more mt-1 h-auto p-0 py-0.5 text-label font-medium text-foreground" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {tr(open ? 'details.less' : 'details.more')}
      </Button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible sections (the cast, Where to watch, Part of)
// ---------------------------------------------------------------------------

// Open or closed is kept for the visit, so a section stays as the visitor
// left it while they move between titles; a reload restores the defaults.
// Nothing is stored. Where to watch and "Part of" start closed (Notion
// "Explore E 2/5"); "Part of" keeps two states, so opening it outside a guide
// doesn't open it inside one, where the banner already says it.
const detailOpen: Record<string, boolean> = { cast: true, watch: false, guides: false, guidesInGuide: false };
const detailOpenListeners = new Set<() => void>();
export function useDetailOpen(key: string): [boolean, (v: boolean) => void] {
  const [, bump] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => { detailOpenListeners.add(bump); return () => { detailOpenListeners.delete(bump); }; }, []);
  const set = (v: boolean) => { detailOpen[key] = v; detailOpenListeners.forEach((fn) => fn()); };
  return [!!detailOpen[key], set];
}

// An accordion section: a heading that is a real button (aria-expanded,
// aria-controls), an optional control beside it shown while open (Where to
// watch's Change), and the body. `labelClass` and `bodyClass` carry each
// surface's own spacing. `stateKey` (default: the id) names the remembered
// open/closed state, so one section can keep separate states.
export function DetailSection({ id, stateKey, label, note, labelClass = '', bodyClass = '', className = '', extra, children }: {
  id: string; stateKey?: string; label: React.ReactNode; labelClass?: string; bodyClass?: string; className?: string;
  /** A quiet line at the end of the heading, before the chevron (Cast and
   *  connections' "17 connected titles"). */
  note?: React.ReactNode;
  extra?: React.ReactNode; children?: React.ReactNode;
}) {
  const [open, setOpen] = useDetailOpen(stateKey || id);
  const bodyId = 'td-acc-' + id + '-' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <section className={cn('td-acc', `td-acc-${id}`, open && 'open', className)}>
      <div className="td-acc-head flex items-center gap-2.5">
        <h3 className="td-acc-h m-0 min-w-0 flex-1">
          <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}
            className={cn('td-acc-btn flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md text-left text-body font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&:hover_.td-acc-label]:underline [&:hover_.td-acc-label]:underline-offset-4', labelClass)}>
            <span className="td-acc-label">{label}</span>
            {note && <span className="td-acc-note ml-auto text-caption font-normal text-muted-foreground tabular-nums">{note}</span>}
            {/* Down while closed, up while open (Notion "Explore E 2/5"). */}
            <svg className={cn('td-acc-chev flex-none', note ? 'ml-2' : 'ml-auto', 'text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </h3>
        {open && extra}
      </div>
      <div id={bodyId} className={cn('td-acc-body', bodyClass)} hidden={!open}>{children}</div>
    </section>
  );
}

// Sections that later tickets fill (Where to watch, Guides). Each looks up a
// component on window.MCU_detailSlots and renders nothing until one exists. A
// slot with a `has(title)` test is left out entirely when it has nothing to show.
function DetailSlot({ name, title }: { name: string; title: Title }) {
  const slots = (window.MCU_detailSlots || {}) as Record<string, (React.FC<{ title: Title }> & { has?: (t: Title) => boolean }) | undefined>;
  const Slot = slots[name];
  if (!Slot || (Slot.has && !Slot.has(title))) return null;
  return <section className={cn('td-slot mt-3.5', `td-slot-${name}`)}><Slot title={title}/></section>;
}

function DetailScores({ title }: { title: Title }) {
  if (title.imdb != null || title.rt != null) return <div className="td-scores mt-3.5 flex"><window.ScoreBadges title={title}/></div>;
  // No scores yet: say why. A title not out yet has none to give, which reads
  // differently from a released title nobody has rated.
  const out = I18N().release(title).status === 'released';
  return (
    <div className="td-scores mt-3.5 flex">
      <Badge variant="secondary" className="td-pending h-auto rounded-full px-[9px] py-1 text-label font-medium">{tr(out ? 'score.none' : 'details.ratingsAfterRelease')}</Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The details body, shared by the drawer and the sheet
// ---------------------------------------------------------------------------

// One definition of a title's details. Each surface keeps its own frame and
// hands over its own cast list, but the facts appear in the same order on both:
//   1. identity: poster, eyebrow, title (search highlighted)
//   2. when: release line, story timeframe
//   3. scores (or why there are none)
//   4. facts: budget
//   5. your status: Seen / Watchlist, and Share
//   6. synopsis
//   7. slots: Where to watch, Part of (Guides)
//   8. cast (the surface's own list)
//   9. surface extras (phones: See connections in Spatial)
// The surface table keeps the class names each surface's checks rely on, and
// each surface's own spacing.
const TD_SURFACE = {
  drawer: {
    head: 'drawer-header border-b border-border px-6 pt-6 pb-[18px]', hero: 'pr-[34px]',
    eyebrow: 'drawer-eyebrow mb-[7px]',
    title: 'drawer-title mb-[7px] text-title rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    release: 'drawer-release mt-0.5 mb-1.5', story: 'drawer-story mt-[7px]', synopsis: 'drawer-synopsis', tsa: 'drawer-tsa',
  },
  sheet: {
    head: 'm-cast-hero-wrap mb-[18px]', hero: 'gap-[13px]',
    eyebrow: 'm-eyebrow', title: 'm-dtitle mt-1.5 mb-[9px] text-title',
    release: 'm-hero-release mt-[3px] mb-1.5', story: 'm-hero-story', synopsis: 'm-synopsis', tsa: 'm-hero-tsa',
  },
};

export function TitleDetailsBody({ title, surface, search, headingRef, headingId, cast, extras, onExplore, onThread, back = null }: {
  title: Title; surface: 'drawer' | 'sheet'; search?: string;
  /** Follow the thread (Notion "Explore E 4/5"): the red button after the cast. */
  onThread?: (() => void) | null;
  /** After a hop (a poster in Cast and connections): the title to go back to
   *  (Notion "Explore E 2/5"); ✕ still closes the whole stack. */
  back?: { label: string; onBack: () => void } | null;
  headingRef?: React.Ref<HTMLHeadingElement>; headingId?: string;
  cast?: React.ReactNode; extras?: React.ReactNode;
  /** Desktop, from My list and Guides: show the title on the Explore canvas. */
  onExplore?: (() => void) | null;
}) {
  const PosterArt = window.PosterArt;
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  const c = TD_SURFACE[surface];
  const color = (window.MPHASE_COLORS as Record<string, string>)[title.phase];
  const phase = tr('phase.label', { n: title.phase });
  const type = tr(title.type === 'film' ? 'type.film.one' : 'type.series.one');
  return (
    <>
      <div className={cn('td-head', `td-${surface}`, c.head)}>
        {/* On the phone it sits in the sheet's top row, opposite ✕, as in the
            Figma (placed on the sheet, so it stays while the details scroll). */}
        {back && (
          <button type="button" onClick={back.onBack} aria-label={tr('details.backTo', { title: back.label })}
            className="td-back -mt-1 -ml-1.5 mb-2 in-[.m-sheet]:absolute in-[.m-sheet]:top-2 in-[.m-sheet]:left-3 in-[.m-sheet]:z-2 in-[.m-sheet]:m-0 inline-flex h-9 max-w-[calc(100%-40px)] cursor-pointer items-center gap-1 rounded-md px-1.5 text-body font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:flex-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            <span className="truncate">{back.label}</span>
          </button>
        )}
        <div className={cn('td-hero flex items-start gap-3.5', c.hero)}>
          <div className={cn('td-thumb h-[99px] w-[66px] flex-[0_0_66px] rounded-lg', THUMB)} aria-hidden="true"><PosterArt title={title}/></div>
          <div className="td-hero-text min-w-0">
            <div className={cn('td-eyebrow text-label font-medium', c.eyebrow)} style={{ color }}>{phase} · {type} · {title.year}</div>
            <h2 className={cn('td-title m-0 leading-[1.2] font-semibold tracking-tight text-pretty', c.title)} id={headingId} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
              <Highlight text={I18N().titleName(title)} query={search}/>
            </h2>
            <ReleaseLine title={title} className={cn('td-release', c.release)}/>
            <StoryYear title={title} detail className={cn('td-story', c.story)}/>
            <RuntimeLine title={title}/>
            <EditionLines title={title}/>
          </div>
        </div>
        <DetailScores title={title}/>
        <dl className="td-facts mt-2.5 mb-0">
          <div className="td-fact flex items-baseline gap-2">
            <dt className="text-label font-medium text-muted-foreground">{tr('details.budget')}</dt>
            <dd className={cn('m-0 text-body tabular-nums', title.budget == null ? cn('unknown', DIM) : 'text-foreground')}>
              {title.budget != null ? I18N().budget(title.budget) : tr('details.budgetUnknown')}
            </dd>
          </div>
        </dl>
        <div className="td-actrow mt-3.5 flex flex-wrap items-center gap-1.5">
          <window.TitleStatusActions title={title} variant="inline" className={cn('td-tsa mt-0', c.tsa)}/>
          {/* Share is icon-only here, a square as tall as Seen and Watchlist, so
              the row stays on one line in every language ("On watchlist",
              Portuguese's "Compartilhar"); its name is the label and tooltip. */}
          <window.ShareButton iconOnly className="td-share size-[max(40px,2.5rem)] px-0 [&_svg]:size-4" label={tr('share.titleLabel', { title: I18N().titleName(title) })}
            payload={() => ({ params: { title: title.id }, text: tr('share.titleText', { title: I18N().titleName(title), year: title.year }) })}/>
        </div>
        {onExplore && (
          <Button variant="outline" className="td-explore mt-2.5 h-[max(40px,2.5rem)] gap-[7px] px-2.5 text-label [&_svg]:size-[14px]" onClick={onExplore}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/></svg>
            {tr('explore.show')}
          </Button>
        )}
        {window.GuideDetailsSkip && <window.GuideDetailsSkip title={title}/>}
        <Synopsis title={title} className={cn('td-synopsis mt-3.5', c.synopsis)}/>
        <DetailSlot name="watch" title={title}/>
        <DetailSlot name="guides" title={title}/>
      </div>
      {cast}
      {onThread && <FollowThreadButton title={title} onThread={onThread} className={surface === 'drawer' ? 'px-6 pb-6' : ''}/>}
      {extras}
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop: the drawer's frame and its cast list
// ---------------------------------------------------------------------------

/** The panel below the toolbar, from the right: shadcn's Sheet look (popover
 *  surface, a left border, a large shadow) without its modal behaviour. The
 *  logic (sliding, focus, which title) is CastDrawer's, in app.tsx. */
export function DrawerFrame({ asideRef, scrollRef, open, onClose, onSlid, children }: {
  asideRef: React.Ref<HTMLElement>; scrollRef: React.Ref<HTMLDivElement>;
  open: boolean; onClose: () => void; onSlid: () => void; children: React.ReactNode;
}) {
  return (
    <aside ref={asideRef} aria-hidden={!open} aria-labelledby="drawer-title"
      className={cn('drawer step-sizes in-[.app.touch]:hidden fixed top-(--tb-h,0px) right-0 z-60 flex h-[calc(100vh-var(--tb-h,0px))] w-(--drawer-w) flex-col border-l border-border bg-popover text-popover-foreground shadow-lg',
        'transition-transform duration-360 ease-[cubic-bezier(.2,.8,.2,1)] max-[900px]:w-full max-[900px]:max-w-[380px]',
        // Size steps (Notion "Size steps 3/3"): from a 1600px window the drawer
        // is 440px (--drawer-w) and takes the Large step. Its lines read the
        // shared --step-meta; its own pieces (poster, portraits, buttons) grow
        // with it. Below 1600px it is as before.
        '[&_.td-eyebrow]:text-(length:--step-meta) [&_.td-release]:text-(length:--step-meta) [&_.td-story]:text-(length:--step-meta) [&_.actor-name]:text-(length:--step-meta)',
        'min-[1600px]:[&_.drawer-header]:px-7 min-[1600px]:[&_.td-thumb]:h-[120px] min-[1600px]:[&_.td-thumb]:w-20 min-[1600px]:[&_.td-thumb]:basis-20 min-[1600px]:[&_.td-hero]:gap-4',
        'min-[1600px]:[&_.td-tsa_.tsa-btn]:min-h-[max(44px,2.75rem)] min-[1600px]:[&_.td-share]:size-[max(44px,2.75rem)]',
        'min-[1600px]:[&_.char-name]:text-heading',
        open ? 'open translate-x-0' : 'translate-x-full')}
      onTransitionEnd={(e) => { if (e.target === e.currentTarget) onSlid(); }}>
      {/* The close button sits in the panel's corner, outside the scrolling
          body, so it stays put while the details scroll. */}
      <Button variant="ghost" size="icon-sm" className="drawer-close absolute top-5 right-5 z-2 text-title leading-none text-muted-foreground active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100"
        onClick={onClose} aria-label={tr('details.close')}>×</Button>
      {/* One scrolling body (details, then cast): a long synopsis or a short
          window never squeezes the cast out of reach. */}
      <div className="drawer-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain" ref={scrollRef}>{children}</div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Cast and connections (Notion "Explore E 3/5"), in the drawer and the sheet
// ---------------------------------------------------------------------------

// A character's whole identity, as the canvas's lines join it (Captain Carter
// rides Peggy Carter's thread).
const primeOfChar = (id: string) => { const c = window.CHARACTERS[id] as { prime?: string } | undefined; return (c && c.prime) || id; };
/** The other titles a character appears in, across the catalog, in release order. */
function titlesWith(ch: string, exceptId: string): Title[] {
  const p = primeOfChar(ch);
  return window.TITLES.filter((t) => t.id !== exceptId && t.cast.some((c) => primeOfChar(c) === p))
    .sort((a, b) => String(a.release || '').localeCompare(String(b.release || '')));
}

/** Featured cast becomes Cast and connections: each person keeps their color
 *  dot and says where else they appear ("in 11 more"); a chevron opens a row
 *  of those titles as posters (all closed to start, Andre 2026-11-16). A poster
 *  hops the details to that title (‹ comes back, E 2/5); the person pins their
 *  thread, as before (their trail arrives with E 4/5). Desktop: hovering a
 *  person lights their thread on the canvas. */
export function CastConnections({ title, surface, activeChar, activeChars, search, onCharacterClick, onCharacterHover }: {
  title: Title; surface: 'drawer' | 'sheet'; activeChar?: string | null; activeChars?: string[] | null; search?: string;
  onCharacterClick: (id: string) => void; onCharacterHover?: (id: string | null) => void;
}) {
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  const drawer = surface === 'drawer';
  const others = React.useMemo(() => {
    const m: Record<string, Title[]> = {};
    title.cast.forEach((ch) => { m[ch] = titlesWith(ch, title.id); });
    return m;
  }, [title.id]);
  const connected = React.useMemo(() => new Set(Object.values(others).flat().map((t) => t.id)).size, [others]);
  const [openSet, setOpenSet] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => { setOpenSet(new Set()); }, [title.id]);
  const toggle = (ch: string) => setOpenSet((s) => { const n = new Set(s); if (n.has(ch)) n.delete(ch); else n.add(ch); return n; });
  return (
    <DetailSection id="cast" label={tr('details.castConnections', { n: title.cast.length })}
      labelClass={drawer ? 'drawer-section-label px-6 pt-3 pb-2 text-label text-muted-foreground' : 'm-flab mb-0 min-h-11 p-0 text-label text-muted-foreground'}
      bodyClass={drawer ? 'cast-list px-3 pb-6' : 'm-castlist flex flex-col'}
      note={connected ? <span className="td-connected">{tr('details.connectedTitles', { n: connected })}</span> : null}>
      {title.cast.length === 0 && <div className="empty-cast px-4 py-5 text-label text-muted-foreground italic">{tr('details.noCast')}</div>}
      {title.cast.map((ch) => {
        const c = window.CHARACTERS[ch];
        if (!c) return null;
        const list = others[ch];
        const open = openSet.has(ch) && list.length > 0;
        const isActive = activeChars ? activeChars.indexOf(ch) !== -1 : activeChar === ch;
        const name = I18N().charName(ch);
        const rowId = 'td-with-' + ch;
        return (
          // Desktop: the whole block (the row, its posters and the gaps
          // between them) keeps this person's thread lit, so it doesn't
          // flicker as the pointer crosses a gutter (Andre, 2026-11-16).
          <div key={ch} className={cn('cast-person', !drawer && 'border-t border-border first:border-t-0')} style={{ '--match-color': c.color } as React.CSSProperties}
            onMouseEnter={drawer && onCharacterHover ? () => onCharacterHover(ch) : undefined}
            onMouseLeave={drawer && onCharacterHover ? () => { onCharacterHover(null); window.MCU_peekTitle(null); } : undefined}>
            <div className={cn('flex items-center gap-2', drawer ? 'pr-1' : '')}>
              <button type="button" data-char={ch}
                className={cn(drawer ? 'cast-row px-3 py-2 hover:bg-muted' : 'm-crow min-h-[max(62px,3.875rem)] py-2',
                  'flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50', MARKS,
                  isActive && (drawer ? 'active bg-muted' : 'on [&_.m-cn]:text-primary'))}
                onClick={() => onCharacterClick(ch)}>
                <span className={cn(drawer ? 'portrait' : 'm-port', 'flex size-[46px] flex-none items-center justify-center overflow-hidden rounded-full text-label font-bold text-(--on-color) shadow-[0_0_0_2px_var(--match-color)] [&_img]:block [&_img]:size-full [&_img]:object-cover')}
                  style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)` }}>
                  <window.Portrait url={window.castPortrait(title, ch)} alt={name} initials={c.initials}/>
                </span>
                <span className="cast-text min-w-0 flex-1">
                  {/* Two lines, then "…" (Andre's rule, 2026-11-24; Notion "Portuguese copy
                      pass"): "Peter Parker (Raimi)" was cut on one line. */}
                  <span className={cn(drawer ? 'char-name' : 'm-cn', 'line-clamp-2 text-body font-semibold [overflow-wrap:anywhere]')} title={name}><Highlight text={name} query={search}/></span>
                  <span className={cn(drawer ? 'actor-name' : 'm-an', 'cast-sub mt-px block truncate text-label text-muted-foreground')}><Highlight text={window.MCU_credit(title, ch)} query={search}/></span>
                </span>
              </button>
              {list.length > 0 && <span className="cast-more flex-none text-caption whitespace-nowrap text-muted-foreground tabular-nums">{tr('details.inMore', { n: list.length })}</span>}
              <span className={cn(drawer ? 'cast-color-dot' : 'm-cdot', 'size-2.5 flex-none rounded-full')} style={{ background: c.color }} aria-hidden="true"/>
              {list.length > 0 ? (
                <button type="button" aria-expanded={open} aria-controls={rowId} onClick={() => toggle(ch)}
                  aria-label={tr(open ? 'details.hideWith' : 'details.showWith', { name })}
                  className="cast-chev inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5">
                  <svg className={cn('transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              ) : <span className="size-9 flex-none" aria-hidden="true"/>}
            </div>
            {open && (
              <div id={rowId} role="group" aria-label={tr('details.withName', { name })}
                className={cn('cast-titles flex gap-2.5 overflow-x-auto overscroll-x-contain pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', drawer ? 'px-3' : '')}>
                {list.map((t) => (
                  <button key={t.id} type="button" data-title={t.id} onClick={() => window.MCU_hopTitle(t.id)}
                    // Desktop: the card under the pointer is marked on the
                    // canvas (the block above keeps the thread lit).
                    onMouseEnter={drawer ? () => window.MCU_peekTitle(t.id) : undefined} onMouseLeave={drawer ? () => window.MCU_peekTitle(null) : undefined}
                    onFocus={drawer && onCharacterHover ? () => { onCharacterHover(ch); window.MCU_peekTitle(t.id); } : undefined}
                    onBlur={drawer && onCharacterHover ? () => { onCharacterHover(null); window.MCU_peekTitle(null); } : undefined}
                    aria-label={tr('details.openTitle', { title: I18N().titleName(t) })}
                    className="cast-title w-[74px] flex-none cursor-pointer rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <span className={cn('block h-[111px] w-[74px] rounded-md', THUMB)} aria-hidden="true"><window.PosterArt title={t}/></span>
                    <span className="mt-1 block truncate text-caption font-medium text-foreground" aria-hidden="true">{I18N().titleName(t)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </DetailSection>
  );
}

// ---------------------------------------------------------------------------
// Follow the thread, and a character's trail (Notion "Explore E 4/5")
// ---------------------------------------------------------------------------

/** Every title connected to `title` (sharing a character, by identity), in
 *  release order, with the characters that connect each one. */
export function threadOf(title: Title): { title: Title; via: string[] }[] {
  const mine = new Map<string, string>();
  title.cast.forEach((ch) => { const p = primeOfChar(ch); if (!mine.has(p)) mine.set(p, ch); });
  const rows: { title: Title; via: string[] }[] = [];
  window.TITLES.forEach((t) => {
    if (t.id === title.id) return;
    const via: string[] = [];
    t.cast.forEach((ch) => { const own = mine.get(primeOfChar(ch)); if (own && via.indexOf(own) === -1) via.push(own); });
    if (via.length) rows.push({ title: t, via });
  });
  return rows.sort((a, b) => String(a.title.release || '').localeCompare(String(b.title.release || '')));
}

const BACK_BTN = 'inline-flex h-9 min-w-9 max-w-full cursor-pointer items-center gap-1 rounded-md px-1.5 text-body font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:flex-none';
const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>;
/** "2012 · Film · Phase 1" */
const metaLine = (t: Title) => `${t.year} · ${tr(t.type === 'film' ? 'type.film.one' : 'type.series.one')} · ${tr('phase.label', { n: t.phase })}`;

/** The top row both views share: ‹ (with what it goes back to, or the
 *  view's name), and room on the right for the frame's own ✕. */
function ExploreHead({ backLabel, backAria, label, onBack }: {
  backLabel?: string; backAria: string; label?: string; onBack: () => void;
}) {
  return (
    <div className="ex-head flex min-h-9 items-center gap-2 pr-11 in-[.m-sheet]:pr-8">
      <button type="button" className={cn('ex-back', BACK_BTN, '-ml-1.5')} onClick={onBack} aria-label={backAria}>
        <Chevron/>{backLabel && <span className="truncate">{backLabel}</span>}
      </button>
      {label && <span className="ex-label min-w-0 flex-1 truncate text-body text-muted-foreground">{label}</span>}
    </div>
  );
}

/** Follow the thread: the title, and every title it connects to on one red
 *  line, by year, with who connects them. A row opens that title's details
 *  (‹ comes back here); no path is built inside the panel, which would only
 *  re-create the canvas (Andre, 2026-11-16). */
export function ThreadView({ id, surface, headingId, headingRef, onLeave, onOpen }: {
  id: string; surface: 'drawer' | 'sheet'; headingId?: string; headingRef?: React.Ref<HTMLHeadingElement>;
  onLeave: () => void; onOpen: (id: string) => void;
}) {
  const title = window.TITLES.find((t) => t.id === id);
  const rows = React.useMemo(() => (title ? threadOf(title) : []), [id]);
  const listRef = React.useRef<HTMLOListElement>(null);
  React.useEffect(() => {
    const scroller = listRef.current && listRef.current.closest('.drawer-scroll, .m-sheet-body');
    if (scroller) scroller.scrollTop = 0;
  }, [id]);
  if (!title) return null;
  const drawer = surface === 'drawer';
  const PosterArt = window.PosterArt;
  return (
    <div className={cn('ex-thread', drawer ? 'pt-[18px]' : '')}>
      <div className={cn('ex-top border-b border-border pb-4', drawer ? 'px-6' : '')}>
        {/* "‹ Back to details", the caret against its words (Andre, 2026-11-16). */}
        <ExploreHead backLabel={tr('thread.back')} backAria={tr('details.backTo', { title: I18N().titleName(title) })} onBack={onLeave}/>
        <div className="ex-hero mt-3 flex items-start gap-3.5">
          <div className={cn('ex-poster h-[120px] w-20 flex-none rounded-lg shadow-[0_0_0_2px_var(--brand)]', THUMB)} aria-hidden="true"><PosterArt title={title}/></div>
          <div className="min-w-0 flex-1">
            <h2 id={headingId} ref={headingRef} tabIndex={headingRef ? -1 : undefined}
              className="ex-title m-0 text-display leading-[1.12] font-semibold tracking-tight text-balance text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">{I18N().titleName(title)}</h2>
            <div className="ex-meta mt-1 text-label text-muted-foreground tabular-nums">{metaLine(title)}</div>
            <div className="ex-count mt-2.5 text-body font-semibold text-(--brand) tabular-nums">{tr('thread.connected', { n: rows.length })}</div>
          </div>
        </div>
      </div>
      <ol ref={listRef} aria-label={tr('thread.listLabel', { title: I18N().titleName(title) })}
        className={cn('ex-list relative m-0 list-none pb-6', drawer ? 'px-3' : '-mx-[18px] px-1.5')}>
        {rows.map(({ title: t, via }) => {
          const names = via.map((ch) => I18N().charName(ch));
          const shown = names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) : '');
          return (
            <li key={t.id}>
              <button type="button" data-title={t.id} onClick={() => onOpen(t.id)}
                onMouseEnter={drawer ? () => window.MCU_peekTitle(t.id) : undefined} onMouseLeave={drawer ? () => window.MCU_peekTitle(null) : undefined}
                onFocus={drawer ? () => window.MCU_peekTitle(t.id) : undefined} onBlur={drawer ? () => window.MCU_peekTitle(null) : undefined}
                aria-label={tr('thread.hopTo', { title: I18N().titleName(t), names: names.join(', ') })}
                className="ex-row relative flex w-full cursor-pointer items-center gap-3 rounded-md py-1.5 pr-2 pl-9 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                {/* The rail runs through every row; each row draws its piece. */}
                <span className="absolute inset-y-0 left-[13px] w-3.5" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-(--brand)"/>
                  <span className="absolute top-1/2 left-0 size-3.5 -translate-y-1/2 rounded-full border-2 border-(--brand) bg-popover"/>
                </span>
                <span className={cn('h-[60px] w-10 flex-none rounded-[5px]', THUMB)} aria-hidden="true"><PosterArt title={t}/></span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-body font-semibold text-foreground [overflow-wrap:anywhere]" title={I18N().titleName(t)}>{I18N().titleName(t)}</span>
                  <span className="mt-0.5 block truncate text-label text-muted-foreground tabular-nums">{t.year} · {tr('thread.via', { names: shown })}</span>
                </span>
                <span className="flex flex-none items-center gap-[3px]" aria-hidden="true">
                  {via.slice(0, 4).map((ch) => <span key={ch} className="size-2 rounded-full" style={{ background: (window.CHARACTERS[ch] || { color: 'var(--muted-foreground)' }).color }}/>)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A character's trail: everything they appear in, through the timeline on
 *  one line in their color. The title you came from is marked; a row opens
 *  that title's details. See on canvas pins their thread on the map (what
 *  tapping a person used to do). */
export function TrailView({ char, from, current, pinned = false, surface, headingId, headingRef, inCanvas = true, onLeave, onOpen, onPin }: {
  char: string; from: string; surface: 'drawer' | 'sheet'; headingId?: string; headingRef?: React.Ref<HTMLHeadingElement>;
  /** The character view (desktop canvas): the stepper's title, marked as
   *  where you are; and `pinned` hides See on canvas, already the view. */
  current?: string | null; pinned?: boolean;
  /** In Connections the pin reads See on canvas; in Titles, Highlight in Titles. */
  inCanvas?: boolean;
  onLeave: () => void; onOpen: (id: string) => void; onPin: () => void;
}) {
  const c = window.CHARACTERS[char];
  const fromTitle = window.TITLES.find((t) => t.id === from);
  const list = React.useMemo(() => titlesWith(char, ''), [char]);
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const scroller = rootRef.current && rootRef.current.closest('.drawer-scroll, .m-sheet-body');
    if (scroller) scroller.scrollTop = 0;
  }, [char, from]);
  if (!c || !fromTitle) return null;
  const drawer = surface === 'drawer';
  const PosterArt = window.PosterArt;
  const name = I18N().charName(char);
  const years = list.map((t) => t.year).filter(Boolean);
  const span = years.length ? (years[0] === years[years.length - 1] ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`) : '';
  const color = c.color;
  return (
    <div ref={rootRef} className={cn('ex-trail', drawer ? 'pt-[18px]' : '')} style={{ '--match-color': color } as React.CSSProperties}>
      <div className={cn('ex-top border-b border-border pb-4', drawer ? 'px-6' : '')}>
        <ExploreHead backLabel={I18N().titleName(fromTitle)} backAria={tr('details.backTo', { title: I18N().titleName(fromTitle) })} onBack={onLeave}/>
        <div className="ex-hero mt-3 flex items-center gap-3.5">
          <span className="flex size-14 flex-none items-center justify-center overflow-hidden rounded-full text-label font-bold text-(--on-color) shadow-[0_0_0_2px_var(--match-color)] [&_img]:block [&_img]:size-full [&_img]:object-cover"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
            <window.Portrait url={window.castPortrait(fromTitle, char)} alt="" initials={c.initials}/>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={headingId} ref={headingRef} tabIndex={headingRef ? -1 : undefined}
              className="ex-title m-0 text-display leading-[1.12] font-semibold tracking-tight text-balance text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">{name}</h2>
            <div className="ex-meta mt-1 text-label text-muted-foreground tabular-nums">
              {tr('trail.meta', { actor: window.MCU_credit(fromTitle, char), n: list.length, years: span })}
            </div>
          </div>
        </div>
        {!pinned && <Button variant="outline" className="trail-pin mt-3 h-[max(40px,2.5rem)] w-full gap-[7px] text-label [&_svg]:size-[14px]" onClick={onPin}
          aria-label={tr(inCanvas ? 'trail.pinAria' : 'trail.pinListAria', { name })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/></svg>
          {tr(inCanvas ? 'trail.pin' : 'trail.pinList')}
        </Button>}
      </div>
      <ol aria-label={tr('trail.listLabel', { name })} className={cn('ex-list relative m-0 list-none pb-6', drawer ? '' : '-mx-[18px]')}>
        {list.map((t, i) => {
          const here = t.id === (current || from);
          return (
            <li key={t.id}>
              <button type="button" data-title={t.id} onClick={() => onOpen(t.id)} aria-current={here ? 'true' : undefined}
                onMouseEnter={drawer && !here ? () => window.MCU_peekTitle(t.id) : undefined} onMouseLeave={drawer ? () => window.MCU_peekTitle(null) : undefined}
                onFocus={drawer && !here ? () => window.MCU_peekTitle(t.id) : undefined} onBlur={drawer ? () => window.MCU_peekTitle(null) : undefined}
                aria-label={tr('details.openTitle', { title: I18N().titleName(t) })}
                className={cn('ex-row relative flex w-full cursor-pointer items-center gap-3 py-1.5 pr-4 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
                  drawer ? 'pl-6' : 'pl-[18px]', here && 'here bg-muted/70 hover:bg-muted')}>
                <span className="w-10 flex-none text-right text-label font-medium text-muted-foreground tabular-nums" aria-hidden="true">{t.year}</span>
                {/* Each row draws its piece of the rail, first dot to last. */}
                <span className="relative mx-1.5 -my-1.5 flex flex-none items-center self-stretch" aria-hidden="true">
                  {list.length > 1 && <span className={cn('absolute left-1/2 w-0.5 -translate-x-1/2 bg-(--match-color)', i === 0 ? 'top-1/2' : 'top-0', i === list.length - 1 ? 'bottom-1/2' : 'bottom-0')}/>}
                  <span className={cn('relative size-3.5 rounded-full border-2 border-(--match-color)', here ? 'bg-(--match-color)' : 'bg-popover')}/>
                </span>
                <span className={cn('h-[60px] w-10 flex-none rounded-[5px]', THUMB)} aria-hidden="true"><PosterArt title={t}/></span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-body font-semibold text-foreground [overflow-wrap:anywhere]" title={I18N().titleName(t)}>{I18N().titleName(t)}</span>
                  <span className={cn('mt-0.5 block truncate text-label', here ? 'text-(--brand)' : 'text-muted-foreground')}>
                    {tr(t.type === 'film' ? 'type.film.one' : 'type.series.one')} · {tr('phase.label', { n: t.phase })}{here && <> · {tr('trail.here')}</>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The red button at the end of the details: "Follow the thread · 17 titles ›". */
export function FollowThreadButton({ title, onThread, className = '' }: { title: Title; onThread: () => void; className?: string }) {
  const n = React.useMemo(() => threadOf(title).length, [title.id]);
  if (!n) return null;
  return (
    <div className={cn('td-thread-wrap', className)}><Button className="td-thread mt-4 h-[max(48px,3rem)] w-full gap-1.5 text-body font-semibold [&_svg]:size-4" onClick={onThread}>
      {tr('details.followThread', { n })}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </Button></div>
  );
}

/** The drawer's cast: Cast and connections (E 3/5). */
export function DrawerCast(props: {
  title: Title; activeChar?: string | null; activeChars?: string[] | null; search?: string;
  onCharacterClick: (id: string) => void; onCharacterHover: (id: string | null) => void;
}) {
  return <CastConnections surface="drawer" {...props}/>;
}

// ---------------------------------------------------------------------------
// Phones: the title sheet
// ---------------------------------------------------------------------------

/** What app.tsx hands the details for Follow the thread and the trail (E 4/5). */
export type ExploreState = { kind: 'thread' } | { kind: 'trail'; char: string; from: string };
export type ExploreProps = {
  explore: ExploreState | null; onThread: () => void; onTrail: (ch: string) => void; onLeave: () => void;
  onOpen: (id: string) => void; onPin?: () => void; inCanvas?: boolean;
  /** The character view on the desktop canvas (see TrailView). */
  charView?: boolean; current?: string | null;
};

export function CastSheet({ title, onClose, onCharacterClick, activeChar, activeChars, onGoSpatial, inSpatial, search, back = null, ex = null }: {
  title: Title | null; onClose: () => void; onCharacterClick: (id: string) => void; back?: { label: string; onBack: () => void } | null;
  ex?: ExploreProps | null;
  activeChar?: string | null; activeChars?: string[] | null; onGoSpatial: () => void; inSpatial?: boolean; search?: string;
}) {
  if (!title) return null;
  const explore = ex ? ex.explore : null;
  const Sheet = window.Sheet;
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  return (
    <Sheet onClose={onClose} tall label={tr('details.sheetLabel', { title: I18N().titleName(title) })}
      // Full height while following the thread or a trail (the Figma's full screen).
      className={explore ? 'ex-sheet h-[calc(100dvh-32px-env(safe-area-inset-top,0px))] [&_.m-grab]:hidden [&_.m-sheet-body]:pt-2' : ''}>
      <div className="contents">
        {explore && ex && explore.kind === 'thread' ? (
          <ThreadView key="thread" id={title.id} surface="sheet" onLeave={ex.onLeave} onOpen={ex.onOpen}/>
        ) : explore && ex && explore.kind === 'trail' ? (
          <TrailView key="trail" char={explore.char} from={explore.from} current={ex.current} pinned={ex.charView} surface="sheet" inCanvas={ex.inCanvas} onLeave={ex.onLeave} onOpen={ex.onOpen} onPin={ex.onPin || (() => {})}/>
        ) : (
        <TitleDetailsBody title={title} surface="sheet" search={search} back={back} onThread={ex ? ex.onThread : null}
          cast={<CastConnections title={title} surface="sheet" search={search} activeChar={activeChar} activeChars={activeChars} onCharacterClick={onCharacterClick}/>}
          extras={!inSpatial && (
            <Button variant="outline" className="m-apply ghost mt-3.5 h-auto min-h-10 w-full" onClick={onGoSpatial}>{tr('details.goSpatial')}</Button>
          )}/>
        )}
      </div>
    </Sheet>
  );
}

Object.assign(window, { Hourglass, StoryYear, ReleaseLine, ReleaseBadge, Synopsis, useDetailOpen, DetailSection, TitleDetailsBody, DrawerFrame, DrawerCast, CastConnections, CastSheet, ThreadView, TrailView });

// ---------------------------------------------------------------------------
// Phones: the frame every sheet shares
// ---------------------------------------------------------------------------

/** The bottom sheet's frame: shadcn's Sheet look from the bottom (popover
 *  surface, rounded top, the dialogs' overlay). Its behaviour (focus trap,
 *  Back, swipe to close) is `Sheet` in mobile.tsx, which renders this. The
 *  frame and its contents are on the design system. */
export function SheetFrame({ sheetRef, onClose, tall, label, labelledBy, describedBy, className = '', children }: {
  sheetRef: React.Ref<HTMLDivElement>; onClose: () => void; tall?: boolean; label?: string;
  labelledBy?: string; describedBy?: string; className?: string; children: React.ReactNode;
}) {
  // Height (Andre, 2026-11-16): one standard for every sheet. A sheet is as
  // tall as its content, up to the screen less a 32px strip of the page above
  // it (the scrim, tap to close); one that would scroll opens at that full
  // height, the Follow the thread sheet's. dvh follows the browser's bars.
  return (
    <>
      <div className="m-scrim fixed inset-0 z-90 animate-[mfade_180ms_ease] bg-black/10 backdrop-blur-xs motion-reduce:animate-none" onClick={onClose} aria-hidden="true"/>
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : (label || tr('details.label'))}
        aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
        className={cn('m-sheet fixed inset-x-0 bottom-0 z-100 flex max-h-[calc(100dvh-32px-env(safe-area-inset-top,0px))] touch-pan-y flex-col rounded-t-xl border-t border-border bg-popover text-popover-foreground shadow-lg outline-none',
          'animate-[mrise_240ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none min-[600px]:left-auto min-[600px]:w-[min(440px,100%)]',
          tall && 'tall', className)}>
        <button type="button" className="m-grab relative mx-auto mt-2 mb-1 h-8 w-[46px] flex-none cursor-pointer border-0 bg-transparent p-0 after:absolute after:inset-x-1 after:top-2 after:h-1 after:rounded-[2px] after:bg-muted-foreground/30 after:content-['']"
          onClick={onClose} aria-label={tr('details.close')} tabIndex={-1}/>
        {/* The ghost button says its own transparent fill. */}
        <Button variant="ghost" size="icon" title={tr('details.close')} aria-label={tr('details.close')} onClick={onClose}
          className="m-sheet-x absolute top-2 right-2.5 z-2 size-[max(36px,2.25rem)] bg-transparent font-sans text-title leading-none text-muted-foreground active:bg-muted active:text-foreground active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100">×</Button>
        <div className="m-sheet-body overflow-y-auto overscroll-contain px-[18px] pt-1.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch]">{children}</div>
      </div>
    </>
  );
}

Object.assign(window, { SheetFrame });
