import React from 'react';
import { cn } from '@/lib/utils';
import { XIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react';
import { WhatsNew, RELEASES, releaseMonth } from './whats-new';
import { Button } from '@/components/ui/button';
import type { Guide, Title } from '@/types/catalog';
import { stateParams } from '@/share-card/addresses';

// About Red Thread: what the app is, ways to explore it, and credits
// (TMDB requires its logo and notice in an About or Credits section).
// Desktop shows it as a centred dialog; phones reuse the bottom Sheet.
// Opened from the account menu/sheet footer, which is also where a future
// Settings entry will live. First-time visitors see it once as a welcome.

// Welcome: shown once per browser to visitors with no history here (no saved
// preferences, language, collection or sign-in). Decided when this file loads,
// before the app writes anything. "?welcome" in the address forces it, for
// testing (an incognito window also counts as a first visit).
const WELCOME_KEY = 'mcu.welcome.v1';
const RETURNING_KEYS = ['mcu.prefs.v1', 'mcu.lang.v1', 'mcu.collection.v1', 'mcu.auth.v1'];
// A returning visitor: this browser has been here before (the welcome was
// already decided on an earlier visit, or it holds earlier history). Guide
// promotions are for them only, never for a first visit.
let returningVisit = false;
function decideWelcome() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('welcome')) {
      url.searchParams.delete('welcome');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      return true;
    }
    const ls = window.localStorage;
    if (ls.getItem(WELCOME_KEY)) { returningVisit = true; return false; }
    const returning = RETURNING_KEYS.some(k => ls.getItem(k) !== null);
    // A shared link (a guide, a title or a character) lands on what it points
    // to: no welcome over it, and none on the next visit either (it is
    // recorded as decided; About keeps it reachable). Promotions still wait
    // for a returning visit (Notion "Shared links: the welcome no longer
    // covers the guide or title a first-time visitor came for").
    const shared = ['guide', 'title', 'char'].some(k => stateParams(url.pathname, url.search).has(k));
    ls.setItem(WELCOME_KEY, returning ? 'returning' : shared ? 'shared' : 'shown');
    returningVisit = returning;
    return !returning && !shared;
  } catch (e) {
    // No storage: it couldn't be remembered, so don't show it on every visit.
    return false;
  }
}
window.MCU_WELCOME = decideWelcome();
window.MCU_RETURNING = returningVisit;

function AboutIcon({ kind }: { kind: string }) {
  const common: React.SVGProps<SVGSVGElement> = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  if (kind === 'connect') return (
    <svg {...common}><circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="M8.2 8.3 10.6 15M15.8 8.3 13.4 15M8.5 7h7"/></svg>
  );
  if (kind === 'follow') return (
    <svg {...common}><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>
  );
  if (kind === 'order') return (
    <svg {...common}><path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/></svg>
  );
  return (
    <svg {...common}><path d="m5 12.5 4.2 4.2L19 7"/></svg>
  );
}

// The welcome's pinned footer covers the end of whatever scrolls behind it.
// A fade above it says the list carries on (Notion "Phone welcome: the pinned
// buttons cut the list mid-sentence"); it goes once the content has scrolled
// to its end, so it never dims the last lines for good.
function useScrolledToEnd(ref: React.RefObject<HTMLElement | null>) {
  const [end, setEnd] = React.useState(false);
  React.useEffect(() => {
    const box = ref.current && ref.current.closest<HTMLElement>('.m-sheet-body, .about-dialog');
    if (!box) return undefined;
    const check = () => setEnd(box.scrollTop + box.clientHeight >= box.scrollHeight - 2);
    check();
    box.addEventListener('scroll', check, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    if (ro) ro.observe(box);
    return () => { box.removeEventListener('scroll', check); if (ro) ro.disconnect(); };
  }, [ref]);
  return end;
}

/** The recipes the small dialogs share (About, the sign-in reminder, the
 *  bulk confirmation, the picker's leave prompt): body, heading row, title,
 *  lead paragraph, the stacked actions and their two buttons. */
export const DIALOG = {
  body: 'about text-body text-foreground',
  head: 'about-head flex items-center gap-3.5 pr-10',
  title: 'about-title text-title leading-tight font-semibold tracking-tight',
  lead: 'about-lead mt-[18px] text-body leading-[1.6] text-pretty text-muted-foreground',
  ic: 'about-ic inline-flex size-[34px] flex-[0_0_34px] items-center justify-center rounded-md bg-muted text-foreground',
  actions: 'about-cta-row mt-5 flex flex-col items-stretch gap-2',
  primary: 'about-cta h-auto min-h-10',
  secondary: 'nudge-later h-auto min-h-10',
};

// The guide a first visit is offered (Notion "Welcome: offer to start the
// Doomsday guide"): MCU_GUIDE.promotion's pick, an event guide within 60 days
// or else an evergreen one, so the welcome stays right after Doomsday.
export type WelcomeGuide = { guide: Guide; title: Title | null; days: number | null };

function AboutContent({ titleId, welcome, onClose, onPick, guide, onGuide, onNews, newsRef }: {
  titleId?: string; welcome?: boolean; onClose: () => void; onPick?: () => void;
  guide?: WelcomeGuide | null; onGuide?: () => void;
  onNews?: () => void; newsRef?: React.Ref<HTMLButtonElement>;
}) {
  // Subscribed, so it redraws when Settings switches the language.
  const { tr, lang } = window.useI18n();
  const ways = [['connect', 'about.connect'], ['follow', 'about.follow'], ['order', 'about.order'], ['track', 'about.track']];
  const pickRef = React.useRef<HTMLDivElement>(null);
  const atEnd = useScrolledToEnd(pickRef);
  return (
    <div className={DIALOG.body}>
      <div className={DIALOG.head}>
        <div className="brand-mark logo-mark size-8 flex-[0_0_32px]" aria-hidden="true"/>
        <div>
          <h2 id={titleId} className={cn(DIALOG.title, 'in-[.about-dialog]:text-display-sm')}>{tr(welcome ? 'about.welcomeTitle' : 'about.title')}</h2>
          <div className="about-tag mt-[3px] text-body text-muted-foreground">{tr('about.tagline')}</div>
        </div>
      </div>
      {/* No language choice here (Andre, 2026-11-18): the browser's language
          is the guess, and Settings switches it. */}
      <p className={cn(DIALOG.lead, 'leading-[1.45]')}>{tr('about.lead')}</p>
      <h3 className="about-h mt-[22px] mb-2.5 text-label font-medium text-muted-foreground">{tr('about.waysTitle')}</h3>
      {/* Open rows, not boxed cards (Andre, 2026-11-18): the icon in its grey
          tile beside its line, two columns on wide screens. */}
      <ul className="about-ways grid grid-cols-2 gap-x-6 gap-y-4 max-[520px]:grid-cols-1 max-[520px]:gap-y-3.5">
        {ways.map(([icon, key]) => (
          <li key={key} className="flex items-start gap-3">
            <span className={DIALOG.ic}><AboutIcon kind={icon}/></span>
            <span><b className="block text-body font-medium">{tr(key + '.title')}</b><span className="mt-0.5 block max-w-[28ch] text-body leading-snug text-pretty text-muted-foreground">{tr(key + '.text')}</span></span>
          </li>
        ))}
      </ul>
      {/* Credits and Share belong to About; the welcome stays on what Red
          Thread is and where to start (Notion "Welcome: streamline the first
          moment", Andre 2026-11-18). About from the menu keeps both. */}
      {!welcome && (<>
        {/* What's new: the version, and what each release brought (Notion
            "What's new: a changelog in the app"). A row in the style of the
            welcome's guide offer, without its wash. */}
        {onNews && (
          <button type="button" ref={newsRef} onClick={onNews}
            className="about-news mt-[22px] flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left text-card-foreground outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50">
            <span className={DIALOG.ic}><SparklesIcon className="size-[18px]" aria-hidden="true"/></span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">{tr('news.title')}</span>
              <span className="block text-label text-muted-foreground">{tr('news.version', { n: RELEASES[0].version })} · {releaseMonth(RELEASES[0].month, lang)}</span>
            </span>
            <ChevronRightIcon className="size-4 flex-none text-muted-foreground" aria-hidden="true"/>
          </button>
        )}
        {/* Credits, quieter: small print under a rule (TMDB requires its
            notice in About or Credits). Share closes the dialog's content. */}
        <div className="about-credits-block mt-[22px] border-t pt-4">
          <h3 className="about-h mb-2 text-label font-medium text-muted-foreground">{tr('about.creditsTitle')}</h3>
          <div className="about-credits flex flex-col gap-1.5 text-caption leading-snug text-muted-foreground">
            <p>{tr('about.tmdb')} {tr('about.tmdbNotice')}</p>
            <p>{tr('about.justwatch')}</p>
            <p>{tr('about.ratings')}</p>
            <p>{tr('about.fan')}</p>
          </div>
        </div>
        {/* Share the app (Notion "Share 1/3"). */}
        <div className="about-share-row mt-4 flex">
          <window.ShareButton text={tr('share.appLabel')} label={tr('share.appLabel')} payload={() => ({ text: tr('share.appText') })}/>
        </div>
      </>)}
      {welcome && (onPick ? (
        // First visit: offer the "What have you seen?" picker (picker.tsx),
        // pinned to the bottom of the dialog or sheet.
        <div ref={pickRef}
          className={cn("welcome-pick sticky bottom-[-26px] -mx-[30px] mt-[22px] -mb-[26px] border-t bg-popover px-[30px] pt-3.5 pb-3",
            'in-[.m-sheet]:bottom-[calc(-24px-env(safe-area-inset-bottom,0px))] in-[.m-sheet]:-mx-[18px] in-[.m-sheet]:-mb-[calc(24px+env(safe-area-inset-bottom,0px))] in-[.m-sheet]:px-[18px] in-[.m-sheet]:pt-3 in-[.m-sheet]:pb-[calc(6px+env(safe-area-inset-bottom,0px))]',
            "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-12 before:bg-linear-to-b before:from-transparent before:to-popover before:transition-opacity before:duration-200 before:content-['']",
            atEnd && 'before:opacity-0')}>
          {/* Only the actions are pinned (Andre, 2026-11-18: the guide's
              block and the picker's question took most of a phone's sheet).
              One primary: the promoted guide, as a button that carries its
              poster, name, size and countdown, or else Mark what I've seen.
              Then the rest side by side, quiet. */}
          {(() => {
            const G = window.MCU_GUIDE;
            const offer = guide && onGuide ? guide : null;
            const art = offer ? offer.title || (G.stops(offer.guide, false)[0] || {}).title : null;
            const n = offer ? G.stops(offer.guide, false).length : 0;
            // Each part of the second line stays whole when it wraps ("faltam
            // 30 dias" never splits).
            // As the Guides hero: the kicker ("Coming up · Dec 18 · 30 days to
            // go") in the brand red, the question, the guide's size and time.
            const date = offer && offer.days != null && offer.days > 0 ? G.targetDate(offer.guide) : null;
            // Phones drop the date so the kicker keeps to one line.
            const kicker = offer && offer.days != null && offer.days > 0 ? <>{tr('guide.group.coming')}{date && <span className="in-[.m-sheet]:hidden"> · {date}</span>} · {tr('guide.hero.daysLeft', { n: offer.days })}</> : null;
            // Each part stays whole when the line wraps ("14 h 30 min").
            const meta = offer ? String(G.size(offer.guide) || tr('guide.stops', { n })).split(' · ')
              .map((part, i) => <React.Fragment key={i}>{i > 0 && ' · '}<span className="whitespace-nowrap">{part}</span></React.Fragment>) : null;
            const pick = <Button variant={offer ? 'outline' : 'default'} className={cn('picker-go h-auto min-h-10 gap-2 [&_svg]:size-[15px]', offer && 'min-w-[min(100%,11rem)] flex-1')} onClick={onPick}><window.CheckIcon/>{tr('picker.welcomeCta')}</Button>;
            const start = <Button variant={offer ? 'ghost' : 'outline'} className={cn('nudge-later welcome-start h-auto', offer ? 'min-h-9 min-w-[min(100%,11rem)] flex-1' : 'min-h-10')} onClick={onClose}>{tr('about.start')}</Button>;
            return offer ? (
              <>
                {/* Dressed as the Guides page's hero (Andre, 2026-11-18): the card
                    surface with the brand wash from the left, dark text, the
                    kicker's red for the action. */}
                <button type="button" onClick={onGuide}
                  className="welcome-guide-go flex w-full cursor-pointer items-center gap-4 rounded-xl border bg-card p-3 pr-4 text-left text-card-foreground transition-[filter] outline-none hover:brightness-[.97] focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:brightness-110 in-[.m-sheet]:gap-3 in-[.m-sheet]:p-2.5"
                  style={{ backgroundImage: 'linear-gradient(90deg, color-mix(in oklab, var(--brand) 22%, transparent) 0%, transparent 85%)' }}>
                  {art && <span className="welcome-guide-art h-[84px] w-14 flex-none overflow-hidden rounded-md bg-muted shadow-sm [&>:first-child]:block [&>:first-child]:size-full [&_img]:size-full [&_img]:object-cover [&_svg]:size-full in-[.m-sheet]:h-[72px] in-[.m-sheet]:w-12" aria-hidden="true"><window.PosterArt title={art}/></span>}
                  <span className="min-w-0 flex-1">
                    {kicker && <span className="welcome-guide-kicker block text-caption font-semibold tracking-[.04em] text-(--brand-text) uppercase in-[.m-sheet]:tracking-normal in-[.m-sheet]:normal-case">{kicker}</span>}
                    <span className="welcome-guide-q mt-1 block text-heading leading-snug font-semibold text-foreground in-[.m-sheet]:mt-0.5 in-[.m-sheet]:text-body">{offer.title ? tr('welcome.guideGo', { title: window.MCU_I18N.titleName(offer.title) }) : G.name(offer.guide)}</span>
                    <span className="welcome-guide-meta mt-0.5 block text-label leading-snug text-muted-foreground tabular-nums">{meta}</span>
                  </span>
                  {/* The action, said: a pill on wide screens; a chevron on
                      phones, where the words stay for screen readers. */}
                  <span className="welcome-guide-cta inline-flex h-9 flex-none items-center gap-1 rounded-full bg-primary px-3.5 text-label font-medium text-primary-foreground in-[.m-sheet]:size-9 in-[.m-sheet]:justify-center in-[.m-sheet]:px-0">
                    <span className="in-[.m-sheet]:sr-only">{tr('guide.promoStart')}</span>
                    <ChevronRightIcon className="hidden size-4 in-[.m-sheet]:block" aria-hidden="true"/>
                  </span>
                </button>
                <div className="about-cta-row mt-2 flex flex-wrap items-stretch gap-2">{pick}{start}</div>
              </>
            ) : (
              <div className="about-cta-row flex flex-col items-stretch gap-2">{pick}{start}</div>
            );
          })()}
        </div>
      ) : (
        <div className={DIALOG.actions}>
          <Button className={DIALOG.primary} onClick={onClose}>{tr('about.start')}</Button>
        </div>
      ))}
    </div>
  );
}

// Desktop dialog shell, shared by About, the sign-in reminder, the picker and
// the share card: scrim, focus kept inside, Escape or × closes, focus returns
// to whatever opened it. shadcn's Dialog look (the popover surface, a ring,
// the dimmed and blurred overlay); not Base UI's Dialog, because the shell's
// own focus handling and Escape (one layer per press) are what AGENTS.md's
// interaction rules ask for.
function ModalDialog({ onClose, labelledBy, describedBy, className = '', children }: {
  onClose: () => void; labelledBy?: string; describedBy?: string;
  className?: string; children: React.ReactNode;
}) {
  const tr = window.MCU_I18N.tr;
  const ref = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    const box = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    const siblings = Array.from(box.parentElement!.children).filter(el => el !== box && !el.classList.contains('about-scrim')) as HTMLElement[];
    const previous = siblings.map(el => [el, el.inert] as const);
    previous.forEach(([el]) => { el.inert = true; });
    const focusable = () => Array.from(box.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length && !el.closest('[inert]'));
    // Focus the dialog itself (announced by screen readers, no ring on a
    // control the visitor didn't choose); Tab moves into it.
    box.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = focusable();
      const first = items[0] || box, last = items[items.length - 1] || box;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keys);
    return () => {
      document.removeEventListener('keydown', keys);
      previous.forEach(([el, inert]) => { el.inert = inert; });
      // Opened from the account menu, which closed behind it: return to its button.
      const back = opener && opener !== document.body && opener.isConnected ? opener : document.querySelector<HTMLElement>('.acct-pill');
      if (back) back.focus();
    };
  }, []);
  return (
    <>
      <div className="about-scrim fixed inset-0 z-110 animate-[about-fade_180ms_ease] bg-black/10 backdrop-blur-xs motion-reduce:animate-none" onClick={onClose} aria-hidden="true"/>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
        className={cn('about-dialog fixed top-1/2 left-1/2 z-111 max-h-[calc(100vh-64px)] w-[min(560px,calc(100vw-48px))] overflow-y-auto rounded-xl bg-popover px-[30px] pt-7 pb-[26px] text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none [transform:translate(-50%,-50%)] animate-[about-rise_220ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none', className)}>
        <Button variant="ghost" size="icon-sm" className="about-x absolute top-3.5 right-3.5 z-2 text-muted-foreground" onClick={onClose} aria-label={tr('details.close')} title={tr('details.close')}><XIcon/></Button>
        {children}
      </div>
    </>
  );
}

// What's new opens in place of About's content; Escape, × and Back step back
// to About first (one layer per press), and focus returns to its row.
function useNewsView(onClose: () => void) {
  const [news, setNews] = React.useState(false);
  const newsRef = React.useRef<HTMLButtonElement>(null);
  const back = React.useRef(false);
  React.useEffect(() => { if (!news && back.current) { back.current = false; newsRef.current?.focus(); } }, [news]);
  const leave = () => { back.current = true; setNews(false); };
  const close = (): void | boolean => { if (news) { leave(); return false; } onClose(); };
  return { news, open: () => setNews(true), leave, close, newsRef };
}

function AboutDialog({ onClose, welcome, onPick, guide, onGuide }: { onClose: () => void; welcome?: boolean; onPick?: () => void; guide?: WelcomeGuide | null; onGuide?: () => void }) {
  const v = useNewsView(onClose);
  return (
    <ModalDialog onClose={v.close} labelledBy="about-title">
      {v.news ? <WhatsNew titleId="about-title" onBack={v.leave}/>
        : <AboutContent titleId="about-title" welcome={welcome} onClose={onClose} onPick={onPick} guide={guide} onGuide={onGuide} onNews={welcome ? undefined : v.open} newsRef={v.newsRef}/>}
    </ModalDialog>
  );
}

function AboutSheet({ onClose, welcome, onPick, guide, onGuide }: { onClose: () => void; welcome?: boolean; onPick?: () => void; guide?: WelcomeGuide | null; onGuide?: () => void }) {
  const Sheet = window.Sheet;
  const v = useNewsView(onClose);
  return (
    <Sheet onClose={v.close} tall label={window.MCU_I18N.tr(v.news ? 'news.title' : welcome ? 'about.welcomeTitle' : 'about.title')}>
      {v.news ? <WhatsNew titleId="about-sheet-title" onBack={v.leave}/>
        : <AboutContent titleId="about-sheet-title" welcome={welcome} onClose={onClose} onPick={onPick} guide={guide} onGuide={onGuide} onNews={welcome ? undefined : v.open} newsRef={v.newsRef}/>}
    </Sheet>
  );
}

Object.assign(window, { AboutDialog, AboutSheet, ModalDialog });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { AboutDialog, AboutSheet, ModalDialog,
  returningVisit as MCU_RETURNING };
