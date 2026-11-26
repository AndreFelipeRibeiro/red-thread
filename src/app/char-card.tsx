import React from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as B from './banners';

// The pinned character's card (Notion "Connections with a character pinned:
// bring the banner and the selected card in line with the new widgets",
// 2026-11-18). A third kind of progress card, beside All titles and a guide's:
// the same recipes (B.WIDGET, B.W_*), the same place (top right on desktop,
// docked above the bottom bar on phones) and the same sizes. It replaced the
// full-width banner (desktop) and the pill (phones).
//
// - Row: the current title's poster with the character's photo as a badge on
//   its corner, "Thor · 2 of 11" over the title's name, ⋯ and × in the corner.
//   Before the first step it reads "Thor · 11 titles" over the first title in
//   the current order, so › starts the walk.
// - Foot: one segment per title in their run (seen ones filled, the current
//   one outlined) with ‹ › at its end; a segment pressed jumps to its title.
// - The photo badge opens their trail (the timeline) in the panel or sheet;
//   the poster and name open the title's details.
// - ⋯ holds the rest: the performer line as its header, See the curated
//   path, Show all titles (desktop) and Share.
//
// Hook classes kept for the app and the QA checks: `char-card`, `pinned`,
// `cb-step`, `cb-pos` (the kicker's count), `cb-close`, `cb-photo`,
// `cb-guide`, `cb-mode`, `cb-share`, `cb-more`.

type Title = import('../types/catalog').Title;

const THUMB = 'overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';
const FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function CharCard({ touch, inList = false, color, photo, initials, name, performer, titles, stepIndex, guideLabel = null, onGuide = null,
  charOnly = null, setCharOnly = null, sharePayload, shareLabel, onPrev, onNext, onJump, onOpen, onTrail, onClose }: {
  touch: boolean;
  /** Desktop Titles: the list places the card itself. */
  inList?: boolean;
  color: string; photo: string | null; initials: string;
  /** The kicker's name: the character, or the performer for a performer pin. */
  name: string;
  /** The menu's header: who plays them here, or the performer's characters. */
  performer: string;
  /** Their titles in the current order, which the stepper walks. */
  titles: Title[];
  stepIndex: number;
  guideLabel?: string | null; onGuide?: (() => void) | null;
  /** Desktop only: Their titles (true) or All titles on the canvas. */
  charOnly?: boolean | null; setCharOnly?: ((v: boolean) => void) | null;
  sharePayload: () => { params: Record<string, string>; text: string };
  shareLabel: string;
  onPrev: () => void; onNext: () => void;
  /** A dash pressed: step straight to that title. */
  onJump: (id: string) => void;
  onOpen: (id: string) => void; onTrail: () => void; onClose: () => void;
}) {
  const { tr } = window.useI18n();
  // tracking.tsx is not typed yet: the part of the collection used here.
  const { statusOf } = window.useCollection() as unknown as { statusOf: (id: string) => string };
  const I18N = window.MCU_I18N;
  const n = titles.length;
  const stepping = stepIndex >= 0 && stepIndex < n;
  const shown = stepping ? titles[stepIndex] : titles[0] || null;
  const where = stepping ? tr('highlight.position', { i: stepIndex + 1, n }) : tr('header.count', { n });
  // Phones dock it over the bottom of the main area, so the list and the
  // canvas keep their last row clear of it (--dock-h, as a guide's dock).
  const ref = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    const main = touch && el ? el.closest<HTMLElement>('.m-main') : null;
    if (!el || !main) return undefined;
    const set = () => main.style.setProperty('--dock-h', Math.ceil(el.offsetHeight + (parseFloat(getComputedStyle(el).bottom) || 0)) + 'px');
    set();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(set);
    if (ro) ro.observe(el);
    return () => { if (ro) ro.disconnect(); main.style.removeProperty('--dock-h'); };
  }, [touch]);
  // Clicks and drags on the card never reach the canvas behind it.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const open = () => { if (shown) onOpen(shown.id); };
  return (
    <section ref={ref} aria-label={tr('charcard.region', { name })} onMouseDown={stop} onClick={stop} onWheel={stop} onTouchStart={stop} onTouchEnd={stop}
      style={{ '--char-color': color } as React.CSSProperties}
      className={cn('char-card pinned pointer-events-auto z-40 cursor-default', B.WIDGET,
        touch
          ? 'docked absolute bottom-3 left-1/2 w-[min(420px,calc(100%-24px))] -translate-x-1/2 animate-[mrise_220ms_cubic-bezier(.2,.8,.2,1)] bg-background motion-reduce:animate-none'
          : inList ? 'w-[340px]'
          : 'absolute top-3.5 right-4 w-[340px] max-w-[calc(100%-32px)] in-[.app:not(.touch).drawer-open]:right-[calc(var(--drawer-w)+16px)]')}>
      <div className={B.W_ROW}>
        {/* The poster opens the title; the photo on its corner opens the
            character's trail. */}
        <span className="relative flex-none">
          {shown
            ? <button type="button" tabIndex={-1} aria-hidden="true" className={cn('cc-poster block cursor-pointer', B.W_POSTER, THUMB)} onClick={open}><window.PosterArt title={shown}/></button>
            : <span className={cn('block', B.W_POSTER, 'bg-muted')}/>}
          <button type="button" className={cn(B.PHOTO, 'cc-badge absolute -right-1.5 -bottom-1 size-[22px] cursor-pointer', FOCUS)}
            style={{ background: color }} onClick={onTrail}
            aria-label={tr('charcard.trail', { name })} title={tr('charcard.trail', { name })}>
            <window.Portrait url={photo} alt="" initials={initials}/>
          </button>
        </span>
        <div className={B.W_TEXT}>
          <span className={cn(B.W_KICKER, 'flex min-w-0 items-baseline gap-1')}>
            {/* Who plays them stays in the menu on screen; screen readers
                hear it with the name. */}
            <span className="cb-who cc-name min-w-0 truncate"><b className="font-medium">{name}</b><span className="story-sr">, </span><span className="cb-sub story-sr">{performer}</span></span>
            <span aria-hidden="true">·</span>
            <span className={cn('cb-pos flex-none whitespace-nowrap tabular-nums', stepping && 'text-foreground')} aria-live="polite">{where}</span>
          </span>
          {shown && (
            <button type="button" className={cn('cc-title max-w-full cursor-pointer self-start rounded-sm text-left', FOCUS)} onClick={open}
              aria-label={tr('details.openTitle', { title: I18N.titleName(shown) })} title={I18N.titleName(shown)}><span className={B.W_TITLE_2}>{I18N.titleName(shown)}</span></button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className={B.W_MORE} aria-label={tr('charcard.more', { name })} title={tr('charcard.more', { name })}>
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side={touch ? 'top' : 'bottom'} sideOffset={8} className="cc-menu w-auto min-w-56 max-w-[min(320px,calc(100vw-24px))]">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="cc-who truncate px-2 py-1.5 text-label text-muted-foreground">{performer}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator/>
            <DropdownMenuGroup>
              {guideLabel && onGuide && (
                <DropdownMenuItem className="cb-guide" onClick={onGuide}><window.GuideIcon size={14}/>{guideLabel}</DropdownMenuItem>
              )}
              {charOnly !== null && setCharOnly && (
                <DropdownMenuCheckboxItem className="cb-mode" checked={!charOnly} onCheckedChange={(v) => setCharOnly(!v)}>{tr('charcard.showAll')}</DropdownMenuCheckboxItem>
              )}
              <DropdownMenuItem className="cb-share" onClick={() => window.MCU_SHARE.share(sharePayload())} aria-label={shareLabel}>
                <window.ShareIcon size={14}/>{tr('share.button')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" className={cn(B.W_CLOSE, '-ml-1.5')} aria-label={tr('highlight.clear')} title={tr('highlight.clear')} onClick={onClose}>×</button>
      </div>
      <div className={B.W_FOOT}>
        {/* The meter speaks as one line ("3 of 10 seen"); its dashes are
            press targets, so it can't be one image (nested controls). */}
        <span className="cc-meter min-w-0 flex-1">
          <span className="story-sr">{tr('charcard.seen', { seen: titles.filter(t => statusOf(t.id) === 'seen').length, n })}</span>
          <span className={cn('cc-segs', B.W_SEGS)} aria-hidden="true">
            {titles.map((t, i) => (
              <button key={t.id} type="button" tabIndex={-1} aria-hidden="true" className={B.W_SEG} title={I18N.titleName(t)} onClick={() => onJump(t.id)}>
                <i className={cn(B.W_SEG_BAR,
                  statusOf(t.id) === 'seen' ? 'on bg-(--progress)' : 'bg-(--brand-tint-strong)',
                  stepping && i === stepIndex && 'cur outline-1 outline-offset-2 outline-muted-foreground/70')}/>
              </button>
            ))}
          </span>
        </span>
        <div className={touch ? cn(B.W_STEP, 'gap-1') : B.W_STEP}>
          <button type="button" className={touch ? cn(B.W_STEP_BTN, 'size-9 after:-inset-1') : B.W_STEP_BTN} onClick={onPrev} aria-label={tr('highlight.prev')} disabled={!n}>‹</button>
          <button type="button" className={touch ? cn(B.W_STEP_BTN, 'size-9 after:-inset-1') : B.W_STEP_BTN} onClick={onNext} aria-label={tr('highlight.next')} disabled={!n}>›</button>
        </div>
      </div>
    </section>
  );
}
