import React from 'react';
import { cn } from '@/lib/utils';
import { XIcon, ChevronRightIcon } from 'lucide-react';
import { WhatsNew, RELEASES, releaseMonth } from './whats-new';
import { Button } from '@/components/ui/button';
import type { Guide, Title } from '@/types/catalog';
import { stateParams } from '@/share-card/addresses';

// About Red Thread: what the app is, the tour again, what's new, sharing,
// and credits (TMDB requires its notice in an About or Credits section).
// Desktop shows it as a centered dialog; phones reuse the bottom Sheet.
// Opened from the account menu/sheet footer and Settings. First-time visitors see the
// welcome instead (WelcomeContent below, Notion "First visit", 2026-11-27).

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

// About (Notion "About: the new style, after the first-visit tour", design
// B · v3, 2026-11-27; library: About dialog, Kind = About). The logo; the
// welcome's drawing beside what Red Thread is; one list of three equal rows,
// each led by its own drawing (the tour again, What's new, Share); credits as
// a source list, then the TMDB notice and the fan-project line.
const ABOUT_ROWS = { desk: [96, 72, 100], phone: [72, 63, 84] };
const SOURCES = ['posters', 'watch', 'ratings', 'synopses'];

function AboutContent({ titleId, phone, onNews, newsRef, onTour }: {
  titleId?: string; phone?: boolean; onNews?: () => void; newsRef?: React.Ref<HTMLButtonElement>; onTour?: () => void;
}) {
  // Subscribed, so it redraws when Settings switches the language.
  const { tr, lang } = window.useI18n();
  const Drawing = window.Drawing;
  const widths = phone ? ABOUT_ROWS.phone : ABOUT_ROWS.desk;
  const rows: { key: string; drawing: string; title: string; text: string; go?: () => void; ref?: React.Ref<HTMLButtonElement> }[] = [];
  if (onTour) rows.push({ key: 'tour', drawing: 'take-the-tour', title: tr('about.tourTitle'), text: tr('about.tourText', { n: 5 }), go: onTour });
  if (onNews) rows.push({ key: 'news', drawing: 'whats-new', title: tr('news.title'), go: onNews, ref: newsRef,
    text: tr('news.version', { n: RELEASES[0].version }) + ' · ' + releaseMonth(RELEASES[0].month, lang) });
  rows.push({ key: 'share', drawing: 'share', title: tr('share.appLabel'), text: tr('about.shareText'),
    go: () => { window.MCU_SHARE.share({ text: tr('share.appText') }); } });
  const art = { tour: widths[0], news: widths[1], share: widths[2] } as Record<string, number>;
  return (
    <div className="about text-body text-foreground">
      <div className={cn('about-head flex items-center gap-2', phone ? 'pt-1' : 'pt-[19px] pr-14 pl-8')}>
        <span className={cn('logo-mark flex-none', phone ? 'h-6 w-[13px]' : 'h-[26px] w-[14px]')} aria-hidden="true"/>
        <span className={cn('logo-word flex-none', phone ? 'h-[21px] w-[112px]' : 'h-[23px] w-[123px]')} aria-hidden="true"/>
        <span className="sr-only">{tr('about.title')}</span>
      </div>
      <div className={cn('about-body flex flex-col', phone ? 'gap-5 pt-3 pb-1.5' : 'gap-6 px-8 pt-[22px] pb-7')}>
        <div className={cn('about-intro flex items-center', phone ? 'gap-3.5' : 'gap-6')}>
          <Drawing name="welcome" width={phone ? 120 : 210}/>
          <div className={cn('flex min-w-0 flex-1 flex-col', phone ? 'gap-1' : 'gap-2')}>
            <h2 id={titleId} className={cn('about-title font-semibold tracking-tight text-pretty text-foreground', phone ? 'text-heading' : 'text-title')}>{tr('about.descriptor')}</h2>
            <p className={cn('about-line text-pretty text-muted-foreground', phone ? 'text-label' : 'text-body')}>{tr('about.line')}</p>
          </div>
        </div>
        {/* One list, three equal rows; each whole row is the button. */}
        <ul className="about-rows flex flex-col">
          {rows.map((r, i) => (
            <li key={r.key} className={cn('border-t', i === rows.length - 1 && 'border-b')}>
              <button type="button" ref={r.ref} onClick={r.go} data-row={r.key}
                className={cn('about-' + r.key, 'about-row group flex w-full cursor-pointer items-center text-left outline-none transition-colors duration-150 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none',
                  phone ? 'gap-3 py-2.5' : 'gap-4 py-3')}>
                <span className={cn('flex flex-none items-center justify-center', phone ? 'h-[52px] w-[72px]' : 'h-[60px] w-[88px]')}>
                  <Drawing name={r.drawing} width={art[r.key]}/>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body font-medium text-foreground">{r.title}</span>
                  <span className="text-label text-muted-foreground">{r.text}</span>
                </span>
                <ChevronRightIcon className="size-3.5 flex-none text-muted-foreground [&_path]:[stroke-width:1.5]" aria-hidden="true"/>
              </button>
            </li>
          ))}
        </ul>
        {/* Credits, small print: the sources, then the TMDB notice it
            requires and the fan-project line. */}
        <div className="about-credits flex flex-col gap-2.5 text-caption">
          <h3 className="font-semibold text-muted-foreground">{tr('about.creditsTitle')}</h3>
          <dl className={cn('about-sources grid gap-x-3 gap-y-1 pb-3.5', phone ? 'grid-cols-[max-content_minmax(0,1fr)] gap-x-5' : 'grid-cols-[128px_minmax(0,1fr)]')}>
            {SOURCES.map(k => (
              <React.Fragment key={k}>
                <dt className="text-muted-foreground">{tr('about.src.' + k)}</dt>
                <dd className="font-medium text-foreground">{tr('about.src.' + k + 'From')}</dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="about-notice text-pretty text-muted-foreground">{tr('about.tmdbNotice')} {tr('about.fan')}</p>
        </div>
      </div>
    </div>
  );
}

// The first visit's welcome (Notion "First visit", design B · v5; library:
// First visit welcome, Device: Desktop dialog, Phone sheet): the logo, a
// drawing of the idea, the descriptor as the headline, then the tour or the
// map. Shown once per browser (decideWelcome above), never over a shared
// link; Settings' "Show the welcome tour again" brings it back. Skip, ×, Escape
// or the scrim close it, and the canvas hint follows as before.
function WelcomeContent({ titleId, phone, onTour, onClose }: {
  titleId?: string; phone?: boolean; onTour: () => void; onClose: () => void;
}) {
  const { tr } = window.useI18n();
  const Drawing = window.Drawing;
  return (
    <div className="welcome text-body text-foreground">
      <div className={cn('welcome-head flex items-center', phone ? 'gap-2.5 pt-1.5 pb-2' : 'gap-[9px] pt-6 pr-14 pb-2.5 pl-7')}>
        <span className={cn('logo-mark flex-none', phone ? 'h-[30px] w-4' : 'h-8 w-[17px]')} aria-hidden="true"/>
        <span className={cn('logo-word flex-none', phone ? 'h-[26px] w-[139px]' : 'h-7 w-[150px]')} aria-hidden="true"/>
        <span className="sr-only">{tr('app.name')}</span>
      </div>
      <div className={cn('welcome-hero flex items-center justify-center overflow-hidden', phone ? 'pt-3.5 pb-5' : 'h-[315px] pt-6 pb-8')}>
        <Drawing name="welcome" width={phone ? 340 : 520}/>
      </div>
      <div className={cn('welcome-body flex flex-col', phone ? 'gap-4' : 'gap-3.5 px-12 pt-2 pb-9')}>
        <h2 id={titleId} className={cn('about-title welcome-title font-semibold tracking-tight text-pretty text-foreground', phone ? 'text-title' : 'text-display-sm')}>{tr('welcome.headline')}</h2>
        <p className="welcome-lead text-body text-pretty text-muted-foreground">{tr('welcome.lead')}</p>
        <div className={cn('welcome-actions flex flex-col items-stretch', phone ? 'gap-1.5 pt-2' : 'gap-2 pt-[18px]')}>
          <Button size="lg" className="welcome-tour h-auto min-h-10" onClick={onTour}>{tr('welcome.tour')}</Button>
          <Button variant="ghost" className="welcome-start h-auto min-h-9" onClick={onClose}>{tr('welcome.skip')}</Button>
          <p className="welcome-steps text-center text-caption text-muted-foreground">{tr('welcome.steps', { n: 5 })}</p>
        </div>
      </div>
    </div>
  );
}

// Desktop dialog shell, shared by About, the sign-in reminder, the picker and
// the share card: scrim, focus kept inside, Escape or × closes, focus returns
// to whatever opened it. shadcn's Dialog look (the popover surface, a ring,
// the dimmed and blurred overlay); not Base UI's Dialog, because the shell's
// own focus handling and Escape (one layer per press) are what AGENTS.md's
// interaction rules ask for.
function ModalDialog({ onClose, labelledBy, describedBy, className = '', scrimClassName = '', leaving = false, children }: {
  onClose: () => void; labelledBy?: string; describedBy?: string;
  className?: string; children: React.ReactNode;
  /** The first visit's welcome and finish dim harder in Dark (welcome-scrim). */
  scrimClassName?: string;
  /** Fading out before it unmounts (the first visit's welcome and finish). */
  leaving?: boolean;
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
      <div className={cn('about-scrim fixed inset-0 z-110 animate-[about-fade_180ms_ease] bg-black/10 backdrop-blur-xs motion-reduce:animate-none', scrimClassName, leaving && 'pointer-events-none animate-[welcome-out_200ms_ease_both]')} onClick={onClose} aria-hidden="true"/>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
        className={cn('about-dialog fixed top-1/2 left-1/2 z-111 max-h-[calc(100vh-64px)] w-[min(560px,calc(100vw-48px))] overflow-y-auto rounded-xl bg-popover px-[30px] pt-7 pb-[26px] text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none [transform:translate(-50%,-50%)] animate-[about-rise_220ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none', className, leaving && 'pointer-events-none animate-[welcome-sink_200ms_ease_both]')}>
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

// The welcome's entrance (app.tsx shows it once the map is drawn and a beat
// has passed): the map blurs and dims in while the welcome rises; leaving, both fade out before the welcome
// unmounts (so the tour card or the map follows without a jump).
export const WELCOME_IN = {
  scrim: 'bg-(--welcome-scrim) animate-[welcome-scrim-in_500ms_ease-out_both]',
  dialog: 'animate-[welcome-rise_560ms_cubic-bezier(.2,.8,.2,1)_150ms_both]',
  sheet: 'animate-[welcome-sheet-rise_560ms_cubic-bezier(.2,.8,.2,1)_150ms_both]',
};
export const LEAVE_MS = 200;
export function useLeaving() {
  const [leaving, setLeaving] = React.useState(false);
  const leave = (then: () => void) => () => {
    if (window.MCU_MOTION.reduced()) { then(); return; }
    setLeaving(true); window.setTimeout(then, LEAVE_MS);
  };
  return { leaving, leave };
}

function AboutDialog({ onClose, welcome, onTour }: { onClose: () => void; welcome?: boolean; onTour?: () => void }) {
  const v = useNewsView(onClose);
  const w = useLeaving();
  if (welcome && onTour) return (
    <ModalDialog onClose={w.leave(onClose)} labelledBy="about-title" scrimClassName={WELCOME_IN.scrim} leaving={w.leaving}
      className={cn('welcome-dialog w-[min(600px,calc(100vw-48px))] bg-(--surface-raised) p-0', WELCOME_IN.dialog)}>
      <WelcomeContent titleId="about-title" onTour={w.leave(onTour)} onClose={w.leave(onClose)}/>
    </ModalDialog>
  );
  return (
    <ModalDialog onClose={v.close} labelledBy="about-title" scrimClassName="bg-(--welcome-scrim)"
      className={v.news ? '' : 'about-v3 w-[min(560px,calc(100vw-48px))] bg-(--surface-raised) p-0 [&>.about-x]:top-4 [&>.about-x]:right-4'}>
      {v.news ? <WhatsNew titleId="about-title" onBack={v.leave}/>
        : <AboutContent titleId="about-title" onNews={v.open} newsRef={v.newsRef} onTour={onTour}/>}
    </ModalDialog>
  );
}

// The phone sheet as designed: a short handle, then the logo row with the
// sheet's × beside it.
const ABOUT_SHEET = 'about-sheet bg-(--surface-raised) [&_.m-grab]:mb-0 [&_.m-grab]:h-3 [&_.m-grab]:after:top-0 [&_.m-sheet-x]:top-[22px]';

function AboutSheet({ onClose, welcome, onTour }: { onClose: () => void; welcome?: boolean; onTour?: () => void }) {
  const Sheet = window.Sheet;
  const v = useNewsView(onClose);
  const w = useLeaving();
  if (welcome && onTour) return (
    <Sheet onClose={w.leave(onClose)} label={window.MCU_I18N.tr('about.welcomeTitle')}
      className={cn('welcome-sheet bg-(--surface-raised)', WELCOME_IN.sheet, w.leaving && 'pointer-events-none animate-[welcome-sheet-sink_200ms_ease_both]')}
      scrimClassName={cn(WELCOME_IN.scrim, w.leaving && 'pointer-events-none animate-[welcome-out_200ms_ease_both]')}>
      <WelcomeContent titleId="about-sheet-title" phone onTour={w.leave(onTour)} onClose={w.leave(onClose)}/>
    </Sheet>
  );
  return (
    <Sheet onClose={v.close} tall label={window.MCU_I18N.tr(v.news ? 'news.title' : 'about.title')} className={v.news ? '' : ABOUT_SHEET}
      scrimClassName="bg-(--welcome-scrim)">
      {v.news ? <WhatsNew titleId="about-sheet-title" onBack={v.leave}/>
        : <AboutContent titleId="about-sheet-title" phone onNews={v.open} newsRef={v.newsRef} onTour={onTour}/>}
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
