// The guide countdown (Notion "Guides: a live countdown to the release
// (rolling numbers), kept after the guide is complete"; Figma: the
// Design System's Countdown set, Explorations page "Ticker in situ").
//
// "29d 04h 12m 37s" to the release date at local midnight, on every dated
// guide: the guide header (desktop: after See connections, behind a divider,
// or under the buttons when the row runs out of room; phones: after the
// progress, under "Until {title} · {date}") and the Guides hero (desktop:
// beside About this guide; phones: under the progress). The seconds take the
// guide's state: brand-text while it is in progress, seen-text once every
// stop is seen. The last 24 hours drop the days; on the release day itself
// "In theaters today" (a series: "Streaming today") replaces the numbers, and
// the day after the countdown is gone.
//
// - One timer, here, ticking on the second and paused while the tab is
//   hidden, so the guide around it never re-renders each second.
// - Only the digit that changes rolls up (240 ms, ease-out); with Reduce
//   motion (system or Settings) it changes in place.
// - Screen readers get one static line instead of the digits, and it changes
//   once a day ("29 days until Avengers: Doomsday"), never every second; it
//   is not a live region.
import React from 'react';
import { cn } from '@/lib/utils';
import type { Title } from '../types/catalog';

const DAY = 86400000;
const tr = (key: string, vars?: Record<string, unknown>) => window.MCU_I18N.tr(key, vars);

/** Local midnight at the start of a dated release, or null for a month-only or missing date. */
function releaseStart(title: Title | null): Date | null {
  // The day in the visitor's language's market (i18n.js releaseDay: Avengers:
  // Doomsday opens a day earlier in Brazil).
  const day = title ? (window.MCU_I18N && window.MCU_I18N.releaseDay ? window.MCU_I18N.releaseDay(title) : title.release) : null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export type TickerMoment =
  | { kind: 'count'; ms: number; days: number }
  | { kind: 'today' }
  | null;

/** Where `now` stands against the release: counting down (with the whole
 *  calendar days left, for the screen-reader line), the day itself, or past
 *  it (null). */
export function tickerMoment(title: Title | null, now: number): TickerMoment {
  const start = releaseStart(title);
  if (!start) return null;
  const ms = start.getTime() - now;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - today.getTime()) / DAY);
  if (ms > 0) return { kind: 'count', ms, days };
  return days === 0 ? { kind: 'today' } : null;
}

/** The time now, refreshed on each second while the tab is visible. */
function useSecondClock(): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    };
    const resume = () => { window.clearTimeout(timer); if (!document.hidden) tick(); };
    resume();
    document.addEventListener('visibilitychange', resume);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
  }, []);
  return now;
}

/** One digit. When it changes, the old one rolls out the top and the new one
 *  in from below; clip-path rather than overflow keeps the text baseline, so
 *  the units stay aligned with the numbers. */
function Digit({ ch, motion }: { ch: string; motion: boolean }) {
  const last = React.useRef(ch);
  const was = React.useRef<string | null>(null);
  const turn = React.useRef(0);
  if (last.current !== ch) { was.current = last.current; last.current = ch; turn.current += 1; }
  const rolling = motion && was.current !== null;
  return (
    <span className="relative inline-block [clip-path:inset(0)]">
      {/* The outgoing digit stays, rolled out of view, until the next change
          replaces it (g-ticker-old: checks reading the face skip it). */}
      {rolling && <span key={'o' + turn.current} className="g-ticker-old absolute inset-0 animate-[ticker-out_240ms_ease-out_forwards]">{was.current}</span>}
      <span key={'i' + turn.current} className={cn('inline-block', rolling && 'animate-[ticker-in_240ms_ease-out]')}>{ch}</span>
    </span>
  );
}

function Part({ value, unit, accent, motion }: { value: number; unit: string; accent?: string; motion: boolean }) {
  const text = String(value).padStart(2, '0');
  return (
    <span className="g-ticker-part inline-flex items-baseline gap-0.5">
      <span className={cn('inline-flex', accent)}>{[...text].map((ch, i) => <Digit key={text.length - i} ch={ch} motion={motion}/>)}</span>
      <span className="text-ticker-unit font-medium text-muted-foreground">{unit}</span>
    </span>
  );
}

/** "Dec 18", as the guide's eyebrow and the Where it leads box write it. */
function shortDate(title: Title): string {
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(window.MCU_I18N.releaseDay(title) + 'T00:00:00Z'));
  } catch (e) { return title.release; }
}

export interface GuideTickerProps {
  /** The release it counts to (the guide's target, or what it prepares for). */
  title: Title | null;
  /** Every essential stop seen: the accent turns from brand-text to seen-text. */
  complete: boolean;
  /** Phones: "Until {title} · {date}" over the numbers. */
  label?: boolean;
  /** Desktop rows: a divider before the ticker, hidden once the row wraps it
   *  under the buttons (useFitSteps step 1 on a `group/acts` row). */
  divider?: boolean;
  className?: string;
}

export function GuideTicker({ title, complete, label = false, divider = false, className = '' }: GuideTickerProps) {
  const now = useSecondClock();
  const moment = tickerMoment(title, now);
  if (!title || !moment) return null;
  const motion = !window.MCU_MOTION.reduced();
  const name = window.MCU_I18N.titleName(title);
  const date = shortDate(title);
  const accent = complete ? 'text-(--seen-text)' : 'text-(--brand-text)';
  const kind = title.type === 'series' ? 'series' : 'film';
  let face: React.ReactNode;
  let said: string;
  if (moment.kind === 'today') {
    face = <span className={cn('g-ticker-today', accent)}>{tr('ticker.today.' + kind)}</span>;
    said = tr('ticker.srToday.' + kind, { title: name });
  } else {
    const total = Math.floor(moment.ms / 1000);
    const d = Math.floor(total / 86400), h = Math.floor(total / 3600) % 24, m = Math.floor(total / 60) % 60, s = total % 60;
    face = <>
      {d > 0 && <Part value={d} unit={tr('ticker.unit.d')} motion={motion}/>}
      <Part value={h} unit={tr('ticker.unit.h')} motion={motion}/>
      <Part value={m} unit={tr('ticker.unit.m')} motion={motion}/>
      <Part value={s} unit={tr('ticker.unit.s')} accent={accent} motion={motion}/>
    </>;
    said = moment.days > 1 ? tr('ticker.srDays', { n: moment.days, title: name }) : tr('ticker.srTomorrow', { title: name });
  }
  return (
    <>
      {divider && <span aria-hidden="true" className="g-ticker-div h-9 w-px flex-none self-center bg-border group-data-[fit=1]/acts:hidden"/>}
      <div className={cn('g-ticker flex flex-col items-start gap-2 group-data-[fit=1]/acts:basis-full', complete && 'done', className)} data-moment={moment.kind}>
        {label && (
          <p aria-hidden="true" className="g-ticker-label m-0 text-label font-semibold text-foreground">
            {tr(moment.kind === 'today' ? 'ticker.labelToday' : 'ticker.until', { title: name, date })}
          </p>
        )}
        <p aria-hidden="true" className="g-ticker-face m-0 flex items-baseline gap-3 text-ticker font-semibold whitespace-nowrap text-foreground tabular-nums">{face}</p>
        <span className="g-ticker-sr story-sr">{said}</span>
      </div>
    </>
  );
}
