// Up next: the one suggestion of what to watch now. The rule lives in
// tracking.jsx (MCU_nextUp); the app shell (app.jsx) works out the scope and
// hands every surface the same `info`:
//
//   info.result   what MCU_nextUp returned ({ kind: 'next', title, ... }, etc.)
//   info.lead     "Up next" / "Next from your Watchlist" / "Up next for Loki"
//   info.detail   "release order" plus any type, phase or budget filter
//   info.scoped   true when a Watchlist, character or filter narrows it
//   info.watchScope  true on the Watchlist tab
//   info.onOpen(id), info.onHide(), info.onShowAll()
//
// Each surface places these pieces its own way (phone List row and Grid card,
// desktop List strip, desktop Spatial meter row, phone Spatial chip), but the
// words and actions are the same everywhere. Seen and Watchlist reuse
// TitleStatusActions, so marking goes through the usual toast, Undo and sync.

import React from 'react';
import type { Title, UpNextInfo, UpNextWithTitle } from '../types/catalog';

const UpNI18N = window.MCU_I18N;
const untr = (key: string, vars?: Record<string, unknown>) => UpNI18N.tr(key, vars);

// "Up next · release order": the explanation every surface shows. `short`
// keeps only "Up next" where room is tight (the Spatial meter); the order and
// filters then move to the tooltip.
function UpNextTag({ info, short = false, className = '' }: { info: UpNextInfo; short?: boolean; className?: string }) {
  return (
    <div className={`un-tag ${className}`}
      title={short ? `${info.lead} · ${info.detail}. ${untr('upnext.rule')}` : untr('upnext.rule')}>
      {info.lead}{!short && <span> · {info.detail}</span>}
    </div>
  );
}

// The × that hides Up next for now, on every surface, until the page is
// reloaded (nothing is stored). It never moves on to another title: closing
// means "not now", not "something else".
function UpNextHide({ info, className = '' }: { info: UpNextInfo; className?: string }) {
  return (
    <button type="button" className={`un-hide ${className}`}
      onClick={(e) => { e.stopPropagation(); info.onHide(); }}
      aria-label={untr('upnext.hideAria')} title={untr('upnext.hide')}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  );
}

// Seen (and Watchlist outside the Watchlist tab) through the usual controls.
function UpNextStatus({ info, title, variant, className = '' }: { info: UpNextInfo; title: Title; variant?: string; className?: string }) {
  return (
    <window.TitleStatusActions title={title} variant={variant}
      className={`un-tsa${info.watchScope ? ' un-nowatch' : ''} ${className}`}/>
  );
}

// The states with no title to suggest. One component for the phone lists and
// the desktop List strip; `strip` lays it out in a row.
function UpNextState({ info, strip = false }: { info: UpNextInfo; strip?: boolean }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  let head = null, sub = null, arrival = null, action = null;
  if (r.kind === 'caughtUp') {
    head = untr('upnext.caughtUp');
    sub = untr(info.scoped ? 'upnext.caughtUpSubScoped' : 'upnext.caughtUpSub');
    arrival = r.upcoming;
  } else if (r.kind === 'notOut') {
    head = untr(info.watchScope ? 'upnext.notOutWatch' : 'upnext.notOut');
    arrival = r.upcoming;
  } else if (r.kind === 'allSeen') {
    head = untr('upnext.allSeen');
  } else if (r.kind === 'empty' && info.watchScope) {
    head = untr('upnext.watchEmpty');
  } else {
    return null;
  }
  if (info.watchScope && (r.kind === 'empty' || r.kind === 'notOut')) {
    action = <button type="button" className="un-btn" onClick={info.onShowAll}>{untr('upnext.showAll')}</button>;
  }
  const done = r.kind === 'caughtUp' || r.kind === 'allSeen';
  return (
    <section className={`un-card un-state${strip ? ' strip' : ''}`} aria-label={untr('upnext.label')}>
      <UpNextHide info={info} className="un-state-hide"/>
      <div className={`un-tag${done ? ' done' : ''}`} title={untr('upnext.rule')}>
        {done && <window.CheckIcon/>}{info.lead}{!done && <span> · {info.detail}</span>}
      </div>
      <div className="un-state-main">
        <div className="un-state-text">
          <div className="un-head">{head}</div>
          {sub && <div className="un-sub">{sub}</div>}
        </div>
        {arrival && (
          <button type="button" className="un-arrival" onClick={() => info.onOpen(arrival.id)}>
            <span className="un-arrival-poster" aria-hidden="true"><PosterArt title={arrival}/></span>
            <span className="un-arrival-text">
              <span className="un-kicker">{untr('upnext.nextArrival')}</span>
              <span className="un-arrival-title">{UpNI18N.titleName(arrival)}</span>
              <window.ReleaseLine title={arrival} className="un-arrival-release"/>
            </span>
          </button>
        )}
        {action}
      </div>
    </section>
  );
}

// Meta line shared by the cards: year, budget and, in story order, the note
// that explains an unusual pick (an anthology, another universe).
function UpNextNote({ title }: { title: Title }) {
  const note = UpNI18N.storyNote(title);
  if (!note) return null;
  return <div className="un-note"><window.StoryYear title={title} detail/></div>;
}

// The next title slides in and the one just marked slides out (Notion V4
// Tasks, "Micro-interaction: Up next slides to the next title when one is
// marked seen"), in every Up next layout. The leaving copy is inert (no
// clicks, no focus, hidden from screen readers) and shares one grid cell with
// the new one, so nothing reflows; it is dropped when its slide ends, or after
// half a second at most. Reduce motion: an instant swap, as before.
function UpNextSlide({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const latest = React.useRef<React.ReactNode>(children);
  const [shown, setShown] = React.useState(id);
  const [leaving, setLeaving] = React.useState<{ id: string; node: React.ReactNode } | null>(null);
  if (shown !== id) {
    setShown(id);
    const reduced = !!(window.MCU_MOTION && window.MCU_MOTION.reduced());
    setLeaving(reduced ? null : { id: shown, node: latest.current });
  }
  React.useEffect(() => { latest.current = children; });
  React.useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(null), 500);
    return () => clearTimeout(timer);
  }, [leaving]);
  return (
    <div className="un-slide">
      {leaving && (
        <div className={className + ' un-leave'} key={'leave:' + leaving.id} aria-hidden="true"
          ref={(el) => { if (el) el.setAttribute('inert', ''); }}
          onAnimationEnd={(e) => { if (e.animationName === 'un-out') setLeaving(null); }}>
          {leaving.node}
        </div>
      )}
      <div className={className + ' un-fade' + (leaving ? ' un-enter' : '')} key={id}>{children}</div>
    </div>
  );
}

// Phones (List and Grid): a full-width card at the top of the list.
function UpNextCard({ info }: { info: UpNextWithTitle }) {
  const PosterArt = window.PosterArt;
  const t = info.result.title;
  return (
    <section className="un-card un-gcard" data-title-id={t.id} aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
      <UpNextSlide id={t.id} className="un-gcard-body">
        <button type="button" className="un-open" onClick={() => info.onOpen(t.id)}>
          <span className="un-gposter" aria-hidden="true">
            <PosterArt title={t}/>
            <span className="m-pbadge" style={{ background: window.MPHASE_COLORS[t.phase] }}>{untr('phase.short', { n: t.phase })}</span>
          </span>
          <span className="un-gtext">
            <UpNextTag info={info}/>
            <span className="un-title">{UpNI18N.titleName(t)}</span>
            <span className="un-meta">{t.year}{t.budget != null ? ' · ' + UpNI18N.budget(t.budget) : ''}</span>
            <UpNextNote title={t}/>
            <window.ScoreBadges title={t}/>
          </span>
        </button>
        <div className="un-actions">
          <UpNextStatus info={info} title={t}/>
          <UpNextHide info={info}/>
        </div>
      </UpNextSlide>
    </section>
  );
}

// Desktop List: a strip above the list, which does not fold seen titles, so
// the suggestion can be far down the table.
function UpNextStrip({ info }: { info: UpNextInfo }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  if (r.kind !== 'next') return <div className="un-strip-wrap"><UpNextState info={info} strip/></div>;
  const t = r.title;
  return (
    <div className="un-strip-wrap">
      <section className="un-card un-strip" aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
        <div className="un-strip-label" title={untr('upnext.rule')}>{info.lead}<span>{info.detail}</span></div>
        <UpNextSlide id={t.id} className="un-strip-body">
          <button type="button" className="un-open" onClick={() => info.onOpen(t.id)}>
            <span className="un-sposter" aria-hidden="true"><PosterArt title={t}/></span>
            <span className="un-stext">
              <span className="un-title">{UpNI18N.titleName(t)}</span>
              <span className="un-meta">
                {UpNI18N.upper(untr(t.type === 'film' ? 'type.film.one' : 'type.series.one'))} · <span style={{ color: window.MPHASE_COLORS[t.phase] }}>{UpNI18N.upper(untr('phase.label', { n: t.phase }))}</span> · {t.year} · {untr('upnext.rank', { n: r.rank, total: r.released })}
              </span>
              <UpNextNote title={t}/>
            </span>
          </button>
          <UpNextStatus info={info} title={t} variant="inline"/>
          <UpNextHide info={info}/>
        </UpNextSlide>
      </section>
    </div>
  );
}

// Desktop Spatial: one row inside the floating All titles meter.
function UpNextMeterRow({ info }: { info: UpNextInfo }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  if (r.kind !== 'next') return null;
  const t = r.title;
  return (
    <section className="un-mrow" aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
      <UpNextSlide id={t.id} className="un-mrow-body">
        <button type="button" className="un-open" onClick={() => info.onOpen(t.id)}>
          <span className="un-mposter" aria-hidden="true"><PosterArt title={t}/></span>
          <span className="un-mtext">
            <UpNextTag info={info} short/>
            <span className="un-title">{UpNI18N.titleName(t)}</span>
          </span>
        </button>
        <UpNextStatus info={info} title={t} variant="inline" className="un-compact"/>
        <UpNextHide info={info}/>
      </UpNextSlide>
    </section>
  );
}

// Phone Spatial: a chip above the gesture hint.
function UpNextChip({ info }: { info: UpNextInfo }) {
  const PosterArt = window.PosterArt;
  const r = info.result;
  if (r.kind !== 'next') return null;
  const t = r.title;
  return (
    <section className="un-chip" aria-label={untr('upnext.announce', { title: UpNI18N.titleName(t) })}>
      <UpNextSlide id={t.id} className="un-chip-body">
        <button type="button" className="un-open" onClick={() => info.onOpen(t.id)}>
          <span className="un-cposter" aria-hidden="true"><PosterArt title={t}/></span>
          <span className="un-ctext">
            <UpNextTag info={info}/>
            <span className="un-title">{UpNI18N.titleName(t)}</span>
          </span>
          <span className="un-chev" aria-hidden="true">›</span>
        </button>
        <UpNextStatus info={info} title={t} className="un-chip-tsa"/>
      </UpNextSlide>
    </section>
  );
}

Object.assign(window, { UpNextTag, UpNextHide, UpNextState, UpNextCard, UpNextStrip, UpNextMeterRow, UpNextChip, UpNextNote });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { UpNextTag, UpNextHide, UpNextState, UpNextCard, UpNextStrip,
  UpNextMeterRow, UpNextChip, UpNextNote };
