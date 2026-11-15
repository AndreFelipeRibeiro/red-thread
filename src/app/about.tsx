import React from 'react';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    ls.setItem(WELCOME_KEY, returning ? 'returning' : 'shown');
    returningVisit = returning;
    return !returning;
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

// A step between foreground and muted text (V3's "dim"); AA on every surface.
const DIM = 'text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]';

/** The recipes the small dialogs share (About, the sign-in reminder, the
 *  bulk confirmation, the picker's leave prompt): body, heading row, title,
 *  lead paragraph, the stacked actions and their two buttons. */
export const DIALOG = {
  body: 'about v4 text-sm text-foreground',
  head: 'about-head flex items-center gap-3.5 pr-10',
  title: 'about-title text-lg leading-tight font-semibold tracking-tight',
  lead: 'about-lead mt-[18px] text-sm leading-[1.6] text-pretty text-muted-foreground',
  ic: 'about-ic inline-flex size-[34px] flex-[0_0_34px] items-center justify-center rounded-md bg-muted text-foreground',
  actions: 'about-cta-row mt-5 flex flex-col items-stretch gap-2',
  primary: 'about-cta h-auto min-h-10',
  secondary: 'nudge-later h-auto min-h-10',
};

function AboutContent({ titleId, welcome, onClose, onPick }: {
  titleId?: string; welcome?: boolean; onClose: () => void; onPick?: () => void;
}) {
  // Subscribed, so the welcome redraws in a language picked on it.
  const { tr, lang, setLang, languages } = window.useI18n();
  const langs = languages();
  const ways = [['connect', 'about.connect'], ['follow', 'about.follow'], ['order', 'about.order'], ['track', 'about.track']];
  const pickRef = React.useRef<HTMLDivElement>(null);
  const atEnd = useScrolledToEnd(pickRef);
  return (
    <div className={DIALOG.body}>
      <div className={DIALOG.head}>
        <div className="brand-mark logo-mark size-8 flex-[0_0_32px]" aria-hidden="true"/>
        <div>
          <h2 id={titleId} className={DIALOG.title}>{tr(welcome ? 'about.welcomeTitle' : 'about.title')}</h2>
          <div className="about-tag mt-[3px] text-sm text-muted-foreground">{tr('about.tagline')}</div>
        </div>
      </div>
      {/* The language menu lives in Settings now, so a first visit that can't
          read the guessed language can still switch here. Each option is
          written in its own language. */}
      {welcome && langs.length > 1 && (
        <div className="welcome-lang mt-3.5 flex flex-wrap items-center gap-2.5" role="group" aria-labelledby="welcome-lang-label">
          <span id="welcome-lang-label" className="welcome-lang-label text-sm font-medium text-muted-foreground">{tr('lang.label')}</span>
          <div className="segmented inline-flex rounded-lg bg-muted p-[3px]">
            {langs.map((l) => (
              <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}
                className={cn('min-h-[max(36px,2.25rem)] rounded-md px-3.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  lang === l.code && 'on bg-background text-foreground shadow-sm dark:bg-input/30')}>{l.name}</button>
            ))}
          </div>
        </div>
      )}
      <p className={DIALOG.lead}>{tr('about.lead')}</p>
      <h3 className="about-h mt-[22px] mb-2.5 text-xs font-medium text-muted-foreground">{tr('about.waysTitle')}</h3>
      <ul className="about-ways grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
        {ways.map(([icon, key]) => (
          <li key={key} className="flex flex-col items-start gap-2.5 rounded-lg border bg-card p-3.5 text-card-foreground max-[520px]:flex-row max-[520px]:gap-3 max-[520px]:border-0 max-[520px]:bg-transparent max-[520px]:p-0">
            <span className={DIALOG.ic}><AboutIcon kind={icon}/></span>
            <span><b className="block text-sm font-medium">{tr(key + '.title')}</b><span className="mt-0.5 block text-sm leading-normal text-muted-foreground">{tr(key + '.text')}</span></span>
          </li>
        ))}
      </ul>
      <h3 className="about-h mt-[22px] mb-2.5 text-xs font-medium text-muted-foreground">{tr('about.creditsTitle')}</h3>
      <div className="about-credits text-xs leading-[1.55] text-muted-foreground [&_p]:mb-2">
        <p>{tr('about.tmdb')} {tr('about.tmdbNotice')}</p>
        <p>{tr('about.justwatch')}</p>
        <p>{tr('about.ratings')}</p>
        <p>{tr('about.fan')}</p>
      </div>
      {/* Share the app (Notion "Share 1/3"). */}
      <div className="about-share-row mt-[18px] flex">
        <window.ShareButton text={tr('share.appLabel')} label={tr('share.appLabel')} payload={() => ({ text: tr('share.appText') })}/>
      </div>
      {welcome && (onPick ? (
        // First visit: offer the "What have you seen?" picker (picker.tsx),
        // pinned to the bottom of the dialog or sheet.
        <div ref={pickRef}
          className={cn("welcome-pick sticky bottom-[-26px] -mx-[30px] mt-[22px] -mb-[26px] border-t bg-popover px-[30px] pt-4 pb-[22px]",
            'in-[.m-sheet]:bottom-[calc(-24px-env(safe-area-inset-bottom,0px))] in-[.m-sheet]:-mx-[18px] in-[.m-sheet]:-mb-[calc(24px+env(safe-area-inset-bottom,0px))] in-[.m-sheet]:px-[18px] in-[.m-sheet]:pt-3.5 in-[.m-sheet]:pb-[calc(20px+env(safe-area-inset-bottom,0px))]',
            "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-12 before:bg-linear-to-b before:from-transparent before:to-popover before:transition-opacity before:duration-200 before:content-['']",
            atEnd && 'before:opacity-0')}>
          <div className="welcome-q text-base font-semibold">{tr('picker.welcomeQ')}</div>
          <p className={cn('welcome-qs mt-1 text-xs leading-normal', DIM)}>{tr('picker.welcomeText')}</p>
          <div className="about-cta-row mt-3 flex flex-col items-stretch gap-2">
            <Button className="picker-go h-auto min-h-10 gap-2 [&_svg]:size-[15px]" onClick={onPick}><window.CheckIcon/>{tr('picker.welcomeCta')}</Button>
            <Button variant="outline" className="nudge-later welcome-start h-auto min-h-10" onClick={onClose}>{tr('about.start')}</Button>
          </div>
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
        <Button variant="ghost" size="icon-sm" className="about-x v4 absolute top-3.5 right-3.5 z-2 text-muted-foreground" onClick={onClose} aria-label={tr('details.close')} title={tr('details.close')}><XIcon/></Button>
        {children}
      </div>
    </>
  );
}

function AboutDialog({ onClose, welcome, onPick }: { onClose: () => void; welcome?: boolean; onPick?: () => void }) {
  return (
    <ModalDialog onClose={onClose} labelledBy="about-title">
      <AboutContent titleId="about-title" welcome={welcome} onClose={onClose} onPick={onPick}/>
    </ModalDialog>
  );
}

function AboutSheet({ onClose, welcome, onPick }: { onClose: () => void; welcome?: boolean; onPick?: () => void }) {
  const Sheet = window.Sheet;
  return (
    <Sheet onClose={onClose} tall label={window.MCU_I18N.tr(welcome ? 'about.welcomeTitle' : 'about.title')}>
      <AboutContent titleId="about-sheet-title" welcome={welcome} onClose={onClose} onPick={onPick}/>
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
