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
const DIM = 'text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]';
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
        r.status === 'expected' ? cn('border-dashed border-[color-mix(in_oklch,var(--foreground)_20%,var(--background))]', DIM) : 'text-foreground', className)}>
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
// Nothing is stored. "Part of" keeps two states: open while no guide is open,
// closed while one is, since the banner already says it there.
const detailOpen: Record<string, boolean> = { cast: true, watch: false, guides: true, guidesInGuide: false };
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
export function DetailSection({ id, stateKey, label, labelClass = '', bodyClass = '', className = '', extra, children }: {
  id: string; stateKey?: string; label: React.ReactNode; labelClass?: string; bodyClass?: string; className?: string;
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
            <svg className={cn('td-acc-chev ml-auto flex-none text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', !open && '-rotate-90')}
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

export function TitleDetailsBody({ title, surface, search, headingRef, headingId, cast, extras, onExplore }: {
  title: Title; surface: 'drawer' | 'sheet'; search?: string;
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
        <div className={cn('td-hero flex items-start gap-3.5', c.hero)}>
          <div className={cn('td-thumb h-[99px] w-[66px] flex-[0_0_66px] rounded-lg', THUMB)} aria-hidden="true"><PosterArt title={title}/></div>
          <div className="td-hero-text min-w-0">
            <div className={cn('td-eyebrow text-label font-medium', c.eyebrow)} style={{ color }}>{phase} · {type} · {title.year}</div>
            <h2 className={cn('td-title m-0 leading-[1.2] font-semibold tracking-tight text-pretty', c.title)} id={headingId} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
              <Highlight text={I18N().titleName(title)} query={search}/>
            </h2>
            <ReleaseLine title={title} className={cn('td-release', c.release)}/>
            <StoryYear title={title} detail className={cn('td-story', c.story)}/>
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
      className={cn('drawer in-[.app.touch]:hidden fixed top-(--tb-h,0px) right-0 z-60 flex h-[calc(100vh-var(--tb-h,0px))] w-[380px] flex-col border-l border-border bg-popover text-popover-foreground shadow-lg',
        'transition-transform duration-360 ease-[cubic-bezier(.2,.8,.2,1)] max-[900px]:w-full max-[900px]:max-w-[380px]',
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

/** The drawer's cast: a menu row per character, hovered or active in the
 *  muted fill; hovering one lights its thread on the canvas. */
export function DrawerCast({ title, activeChar, activeChars, search, onCharacterClick, onCharacterHover }: {
  title: Title; activeChar?: string | null; activeChars?: string[] | null; search?: string;
  onCharacterClick: (id: string) => void; onCharacterHover: (id: string | null) => void;
}) {
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  return (
    <DetailSection id="cast" label={tr('details.cast', { n: title.cast.length })}
      labelClass="drawer-section-label px-6 pt-3 pb-2 text-label text-muted-foreground" bodyClass="cast-list px-3 pb-6">
      {title.cast.length === 0 && <div className="empty-cast px-4 py-5 text-label text-muted-foreground italic">{tr('details.noCast')}</div>}
      {title.cast.map((ch) => {
        const c = window.CHARACTERS[ch];
        if (!c) return null;
        const isActive = activeChars ? activeChars.indexOf(ch) !== -1 : activeChar === ch;
        return (
          <button key={ch} type="button" data-char={ch} style={{ '--match-color': c.color } as React.CSSProperties}
            className={cn('cast-row flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50', MARKS, isActive && 'active bg-muted')}
            onClick={() => onCharacterClick(ch)} onMouseEnter={() => onCharacterHover(ch)} onMouseLeave={() => onCharacterHover(null)}>
            <div className="portrait flex size-[38px] flex-none items-center justify-center overflow-hidden rounded-full text-label font-bold tracking-[.5px] text-(--on-color) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_13%,transparent)] [&_img]:block [&_img]:size-full [&_img]:object-cover"
              style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)` }}>
              <window.Portrait url={window.castPortrait(title, ch)} alt={I18N().charName(ch)} initials={c.initials}/>
            </div>
            <div className="cast-text min-w-0 flex-1">
              <div className="char-name truncate text-body font-medium"><Highlight text={I18N().charName(ch)} query={search}/></div>
              <div className="actor-name cast-sub mt-px truncate text-label text-muted-foreground"><Highlight text={window.MCU_credit(title, ch)} query={search}/></div>
            </div>
            <div className="cast-color-dot size-2 flex-none rounded-full" style={{ background: c.color }}/>
          </button>
        );
      })}
    </DetailSection>
  );
}

// ---------------------------------------------------------------------------
// Phones: the title sheet
// ---------------------------------------------------------------------------

export function CastSheet({ title, onClose, onCharacterClick, activeChar, activeChars, onGoSpatial, inSpatial, search }: {
  title: Title | null; onClose: () => void; onCharacterClick: (id: string) => void;
  activeChar?: string | null; activeChars?: string[] | null; onGoSpatial: () => void; inSpatial?: boolean; search?: string;
}) {
  if (!title) return null;
  const Sheet = window.Sheet;
  const Highlight = window.Highlight as unknown as React.FC<{ text: string; query?: string }>;
  return (
    <Sheet onClose={onClose} tall label={tr('details.sheetLabel', { title: I18N().titleName(title) })}>
      <div className="contents">
        <TitleDetailsBody title={title} surface="sheet" search={search}
          cast={
            <DetailSection id="cast" label={tr('details.cast', { n: title.cast.length })}
              labelClass="m-flab mb-0 min-h-11 p-0 text-label text-muted-foreground" bodyClass="m-castlist flex flex-col">
              {title.cast.length === 0 && <div className="m-empty-cast py-2.5 text-label text-muted-foreground">{tr('details.noCast')}</div>}
              {title.cast.map((ch) => {
                const c = window.CHARACTERS[ch];
                if (!c) return null;
                const on = activeChars ? activeChars.indexOf(ch) !== -1 : activeChar === ch;
                return (
                  <button key={ch} type="button" style={{ '--match-color': c.color } as React.CSSProperties} onClick={() => onCharacterClick(ch)}
                    className={cn('m-crow flex min-h-[max(56px,3.5rem)] w-full cursor-pointer items-center gap-[11px] border-t border-border py-[9px] text-left outline-none first:border-t-0 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset', MARKS, on && 'on [&_.m-cn]:text-primary')}>
                    <div className="m-port flex size-10 flex-[0_0_40px] items-center justify-center overflow-hidden rounded-full text-label font-bold text-[#0a0c14] [&_img]:block [&_img]:size-full [&_img]:object-cover"
                      style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)` }}>
                      <window.Portrait url={window.castPortrait(title, ch)} alt={I18N().charName(ch)} initials={c.initials}/>
                    </div>
                    <div className="m-ctext min-w-0 flex-1">
                      <div className="m-cn truncate text-body font-semibold"><Highlight text={I18N().charName(ch)} query={search}/></div>
                      <div className="m-an cast-sub mt-px truncate text-label text-muted-foreground"><Highlight text={window.MCU_credit(title, ch)} query={search}/></div>
                    </div>
                    <span className="m-cdot size-2 flex-[0_0_8px] rounded-full" style={{ background: c.color }}/>
                  </button>
                );
              })}
            </DetailSection>
          }
          extras={!inSpatial && (
            <Button variant="outline" className="m-apply ghost mt-3.5 h-auto min-h-10 w-full" onClick={onGoSpatial}>{tr('details.goSpatial')}</Button>
          )}/>
      </div>
    </Sheet>
  );
}

Object.assign(window, { Hourglass, StoryYear, ReleaseLine, ReleaseBadge, Synopsis, useDetailOpen, DetailSection, TitleDetailsBody, DrawerFrame, DrawerCast, CastSheet });

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
  // Height (Andre, 2026-11-16: the sheets looked short): a sheet is as tall
  // as its content, up to the screen less a strip of the page above it (the
  // scrim, tap to close), so a long sheet uses the phone's height and a short
  // phone still shows the strip. dvh follows the browser's own bars.
  return (
    <>
      <div className="m-scrim fixed inset-0 z-90 animate-[mfade_180ms_ease] bg-black/10 backdrop-blur-xs motion-reduce:animate-none" onClick={onClose} aria-hidden="true"/>
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : (label || tr('details.label'))}
        aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
        className={cn('m-sheet fixed inset-x-0 bottom-0 z-100 flex max-h-[calc(100dvh-64px-env(safe-area-inset-top,0px))] touch-pan-y flex-col rounded-t-xl border-t border-border bg-popover text-popover-foreground shadow-lg outline-none',
          'animate-[mrise_240ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none min-[600px]:left-auto min-[600px]:w-[min(440px,100%)]',
          tall && 'tall max-h-[calc(100dvh-32px-env(safe-area-inset-top,0px))]', className)}>
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
