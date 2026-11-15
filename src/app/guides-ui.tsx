// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 193 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import * as B from './banners';
import * as S from './shell';

// On the design system since Notion "shadcn pass 6" (this file is listed with
// `@source` in src/index.css). Same content,
// order and actions; the classes depend on where a piece sits (the phone List
// or Grid, the desktop table, the module's List or Spatial layout), chosen
// here rather than by the old stylesheet's contexts. Hook classes kept for the
// app and the QA checks: `g-*`, `gm-*`, `gp-*`, `guide-banner`, `guide-pill`,
// `cb-*`, and the state classes (`on`, `done`, `next`, `seen`, `compact`,
// `optional`, `skipped`, `current`, `dest`, `cur`, `o`, `skip`).
const DIM = 'text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]';
const XS = 'text-(length:--fs-xs)';
// A poster thumbnail: the art fills the box.
const THUMB = 'overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';
const FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
// shadcn's Card, as the guide's head, stops, cards and "Part of" rows use it.
const CARD = 'rounded-xl border bg-card text-card-foreground shadow-sm';
// The next stop is picked out by a ring; the current one (a step) by a thinner one.
const NEXT_RING = 'border-ring opacity-100 shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_25%,transparent)]';
// The seen wash over a Grid poster: the number stays above it.
const SEEN_WASH = "after:pointer-events-none after:absolute after:inset-0 after:z-1 after:bg-[rgba(10,12,20,0.34)] after:backdrop-saturate-[.35] after:content-['']";
const OUTLINE_BTN = 'inline-flex cursor-pointer items-center rounded-md border bg-background font-medium whitespace-nowrap text-foreground shadow-xs hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50';

// Guides (guides.js): short, curated paths through the catalogue. This file
// holds the helpers every surface shares and the guide's own pieces of UI:
// the Guides menu (desktop popover and phone sheet), the desktop module, the
// phone pill, the flat guide view (phone List/Grid, desktop List) and "Part of"
// in a title's details. The app shell (app.jsx) owns the state: which guide is
// open, Include optional and the stepper. A guide shows only its own titles
// (no "All titles" switch): closing it brings back the whole catalogue.

const GI18N = window.MCU_I18N;
const gtr = (key: string, vars?: Record<string, unknown>) => GI18N.tr(key, vars);
const gloc = (o) => (o ? (o[GI18N.lang] || o.en || '') : '');

const MCU_GUIDE = {
  all: () => window.GUIDES || [],
  get: (id) => (window.GUIDES || []).find(g => g.id === id) || null,
  name: (g) => gloc(g.name),
  short: (g) => gloc(g.short) || gloc(g.name),
  blurb: (g) => gloc(g.blurb),
  why: (s) => gloc(s.why),
  title: (id) => (window.TITLES || []).find(t => t.id === id) || null,
  // The stops with their titles and numbers. Essential stops are numbered
  // 1..n in order; optional ones carry no number, so switching them on never
  // shifts the essential numbers.
  stops(g, includeOptional) {
    let n = 0;
    return g.stops.map(s => {
      const title = MCU_GUIDE.title(s.id);
      const optional = s.weight !== 'essential';
      return { ...s, title, optional, n: optional ? null : ++n };
    }).filter(s => s.title && (includeOptional || !s.optional));
  },
  // Released stops only: a title not out yet is never a gap in what you have
  // seen (the event guide's target is not a stop at all). A skipped stop is
  // out of the count too, unless it was seen anyway (seen wins). `total` keeps
  // every stop, for "Stop 2 of 5".
  progress(g, statusOf) {
    const count = (list) => {
      const counted = list.filter(s => !MCU_GUIDE.skippedNow(g, s.id, statusOf));
      const released = counted.filter(s => window.MCU_isReleased(s.title));
      return { total: list.length, released: released.length, upcoming: counted.length - released.length,
        seen: released.filter(s => statusOf(s.id) === 'seen').length, skipped: list.length - counted.length };
    };
    const all = MCU_GUIDE.stops(g, true);
    const ess = count(all.filter(s => !s.optional));
    const opt = count(all.filter(s => s.optional));
    return { ess, opt, complete: ess.released > 0 && ess.seen === ess.released };
  },
  // The next stop: the first released, unseen stop in guide order (optional
  // ones only when they are shown). The same rule as Up next, scoped.
  next(g, includeOptional, statusOf) {
    return MCU_GUIDE.stops(g, includeOptional).find(s => window.MCU_isReleased(s.title) && statusOf(s.id) !== 'seen'
      && !MCU_GUIDE.isSkipped(g, s.id)) || null;
  },
  forTitle: (id) => (window.GUIDES || []).filter(g => g.stops.some(s => s.id === id)),
  forChar: (ch) => (window.GUIDES || []).find(g => g.kind === 'character' && g.character === ch) || null,
  kind: (g) => gtr('guide.kind.' + (g.group || 'stories')),
  targetDate(g) {
    const t = g.target && MCU_GUIDE.title(g.target);
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t.release)) return '';
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        .format(new Date(t.release + 'T00:00:00Z'));
    } catch (e) { return t.release; }
  },
  // "5 stops + 3 optional"
  size(g) {
    const all = MCU_GUIDE.stops(g, true);
    const e = all.filter(s => !s.optional).length, o = all.length - e;
    const base = gtr('guide.stops', { n: e });
    return o ? gtr('guide.plusOptional', { base, n: o }) : base;
  },
};
window.MCU_GUIDE = MCU_GUIDE;

// Share a guide (Notion "Share 1/3"). The link opens the guide; the message
// says what it is, or, once its essentials are all seen, that it is finished
// and how many days are left to its destination when that is still to come.
function guideDaysLeft(g) {
  const t = g.target && MCU_GUIDE.title(g.target);
  const m = t && /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.release || '');
  if (!m) return 0;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - today) / 86400000));
}
function guideSharePayload(g, statusOf) {
  const name = MCU_GUIDE.name(g);
  const p = MCU_GUIDE.progress(g, statusOf);
  const days = p.complete ? guideDaysLeft(g) : 0;
  const text = !p.complete ? gtr('share.guideText', { name, n: p.ess.total })
    : days > 0 ? gtr('share.guideDoneDays', { name, n: days }) : gtr('share.guideDone', { name });
  return { params: { guide: g.id }, text };
}
// A finished guide shares its card (Notion "Share 2/3"): the guide, Complete,
// and the days to its destination while that is still ahead.
function openGuideCard(g, statusOf) {
  const name = MCU_GUIDE.name(g);
  const days = guideDaysLeft(g);
  const target = g.target && MCU_GUIDE.title(g.target);
  const line = days > 0 && target ? gtr('card.daysTo', { n: days, title: GI18N.titleName(target) }) : `${MCU_GUIDE.kind(g)} · ${MCU_GUIDE.size(g)}`;
  const phases = MCU_GUIDE.stops(g, false).map(s => s.title.phase);
  window.MCU_SHARE_IMAGE.open({
    heading: gtr('share.imageGuide', { name }),
    alt: gtr('share.imageAltGuide', { name }),
    filename: 'red-thread-' + g.id,
    payload: guideSharePayload(g, statusOf),
    render: async () => {
      const r = await window.MCU_SHARE_IMAGE.renderer();
      return r.renderGuideDone({ appName: gtr('app.name'), site: window.MCU_SHARE_IMAGE.site(), guideColor: g.color || '#4a6da3',
        label: gtr('guide.complete'), name, line, stops: phases.map(p => r.cardPalette.phases[p - 1]) });
    },
  });
}
function GuideShare({ guide, className, iconOnly = false, size }) {
  const { statusOf } = window.useCollection();
  const complete = MCU_GUIDE.progress(guide, statusOf).complete;
  return <window.ShareButton className={className} iconOnly={iconOnly} size={size}
    label={gtr('share.guideLabel', { name: MCU_GUIDE.name(guide) })} payload={() => guideSharePayload(guide, statusOf)}
    onShare={complete ? () => openGuideCard(guide, statusOf) : undefined}/>;
}

// ---- Skipped stops (V3 Tasks, "Guides: skip a stop, and bring it back").
// Per guide, remembered on this device (mcu.guideSkips.v1: { guideId: [ids] }).
// A skipped stop stays listed but leaves the path: progress, the next stop,
// the stepper, Up next and "Mark N more seen" pass over it. Seen wins: a
// skipped stop marked seen counts as seen (app.jsx then drops the skip).
const SKIPS_KEY = 'mcu.guideSkips.v1';
let skipsMap = null;
const skipListeners = new Set();
const skipsNow = () => {
  if (skipsMap) return skipsMap;
  try { const v = JSON.parse(localStorage.getItem(SKIPS_KEY) || '{}'); skipsMap = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { skipsMap = {}; }
  return skipsMap;
};
Object.assign(MCU_GUIDE, {
  isSkipped: (g, id) => (skipsNow()[g.id] || []).indexOf(id) !== -1,
  // Skipped and not seen: what every count and the path leave out.
  skippedNow: (g, id, statusOf) => MCU_GUIDE.isSkipped(g, id) && statusOf(id) !== 'seen',
  setSkipped(g, id, on) {
    const map = { ...skipsNow() };
    const list = (map[g.id] || []).filter(x => x !== id);
    if (on) list.push(id);
    if (list.length) map[g.id] = list; else delete map[g.id];
    skipsMap = map;
    try { localStorage.setItem(SKIPS_KEY, JSON.stringify(map)); } catch (e) { /* this visit only */ }
    skipListeners.forEach(fn => fn());
  },
  // Settings, "Reset guide progress": every skipped stop back on its path.
  resetSkips() {
    skipsMap = {};
    try { localStorage.removeItem(SKIPS_KEY); } catch (e) { /* this visit only */ }
    skipListeners.forEach(fn => fn());
  },
  // Drops the skip on stops that have been seen since (seen wins).
  dropSeenSkips(statusOf) {
    const map = skipsNow();
    Object.keys(map).forEach(gid => {
      const g = MCU_GUIDE.get(gid);
      (map[gid] || []).filter(id => statusOf(id) === 'seen').forEach(id => g && MCU_GUIDE.setSkipped(g, id, false));
    });
  },
  onSkips(fn) { skipListeners.add(fn); return () => skipListeners.delete(fn); },
});
// Re-renders a component when any skip changes; returns a version number.
function useGuideSkips() {
  const [v, bump] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => MCU_GUIDE.onSkips(bump), []);
  return v;
}
window.useGuideSkips = useGuideSkips;

// ---- Remembering and promoting guides (V3 Tasks, "Promote guide: Coming
// soon"). Both are per device, like the display preferences.
// mcu.guide.v1: the guide being followed, reopened on the home page.
// mcu.promoted.v1: guides already promoted; each is promoted once.
const GUIDE_MEMORY_KEY = 'mcu.guide.v1';
const PROMOTED_KEY = 'mcu.promoted.v1';
const PROMO_LEAD_DAYS = 60;
const readIdList = (key) => {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
};
Object.assign(MCU_GUIDE, {
  remembered() { try { return localStorage.getItem(GUIDE_MEMORY_KEY) || null; } catch (e) { return null; } },
  remember(id) { try { localStorage.setItem(GUIDE_MEMORY_KEY, id); } catch (e) { /* this visit only */ } },
  // Forgets the remembered guide; with an id, only if that one is remembered.
  forget(id) {
    try { if (!id || localStorage.getItem(GUIDE_MEMORY_KEY) === id) localStorage.removeItem(GUIDE_MEMORY_KEY); } catch (e) { /* nothing stored */ }
  },
  markPromoted(id) {
    const list = readIdList(PROMOTED_KEY);
    if (list.indexOf(id) === -1) { try { localStorage.setItem(PROMOTED_KEY, JSON.stringify(list.concat(id))); } catch (e) { /* this visit only */ } }
  },
  // The upcoming title a guide leads to: an event guide's target, or the title
  // it prepares for. Only a day-precision date counts.
  upcomingTitle(g) {
    const t = MCU_GUIDE.title(g.target || g.preparesFor);
    return t && /^\d{4}-\d{2}-\d{2}$/.test(t.release) ? t : null;
  },
  // Whole days from one calendar date to another (both YYYY-MM-DD).
  daysBetween(from, to) {
    const d = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return Date.UTC(y, m - 1, dd); };
    return Math.round((d(to) - d(from)) / 86400000);
  },
  // Essential stops released and not yet seen (skipped ones don't count).
  remaining(g, statusOf) {
    const p = MCU_GUIDE.progress(g, statusOf);
    return p.ess.released - p.ess.seen;
  },
  // Nothing left to watch today: every released essential stop seen. A guide
  // whose stops are all still to come counts as finished for now.
  finished(g, statusOf) { return MCU_GUIDE.remaining(g, statusOf) === 0; },
  // A guide's place in the Guides menu (its group, then the catalog order).
  menuOrder(g) {
    const all = MCU_GUIDE.all();
    const grp = GUIDE_GROUPS.indexOf(g.group || 'stories');
    return (grp < 0 ? GUIDE_GROUPS.length : grp) * 1000 + all.indexOf(g);
  },
  // Guides leading to a dated release still ahead, the soonest first.
  comingUp(today) {
    return MCU_GUIDE.all()
      .map(g => ({ guide: g, title: MCU_GUIDE.upcomingTitle(g) }))
      .filter(x => x.title)
      .map(x => ({ ...x, days: MCU_GUIDE.daysBetween(today, x.title.release) }))
      .filter(x => x.days >= 1)
      .sort((a, b) => a.days - b.days || MCU_GUIDE.menuOrder(a.guide) - MCU_GUIDE.menuOrder(b.guide));
  },
  // What to promote today (Notion V4 Tasks, "Don't promote a guide that the
  // user has already finished"), never a guide already promoted on this device
  // or with nothing left to watch:
  //   1. one leading to a release in the next 60 days, the sooner first;
  //   2. else, when the guide for a release in the next 60 days is finished,
  //      the caught-up moment for that release: the guide shown complete,
  //      its countdown, and Share (`ready`). Finishing that one guide earns
  //      it; the others needn't be done;
  //   3. else the evergreen guide;
  //   4. else any other unfinished guide, the closest to finished first
  //      (fewest essential stops left; ties in the Guides menu's order);
  //   5. else, when every guide is finished, the caught-up moment for the
  //      next dated release however far off (or with no countdown, if no
  //      release ahead has a date).
  // A caught-up moment comes once per release per device. `key` is what
  // markPromoted() remembers.
  promotion(statusOf, today) {
    const shown = readIdList(PROMOTED_KEY);
    const ok = (g) => shown.indexOf(g.id) === -1 && !MCU_GUIDE.finished(g, statusOf);
    const ahead = MCU_GUIDE.comingUp(today);
    const coming = ahead.filter(x => x.days <= PROMO_LEAD_DAYS && ok(x.guide));
    if (coming.length) return { ...coming[0], key: coming[0].guide.id };
    const readyFor = ahead.find(x => x.days <= PROMO_LEAD_DAYS && MCU_GUIDE.finished(x.guide, statusOf)
      && shown.indexOf('caught-up:' + x.title.id) === -1);
    if (readyFor) return { ...readyFor, caughtUp: true, ready: true, key: 'caught-up:' + readyFor.title.id };
    const ever = MCU_GUIDE.all().find(g => g.evergreen && ok(g));
    if (ever) return { guide: ever, title: null, days: null, key: ever.id };
    const rest = MCU_GUIDE.all().filter(ok)
      .sort((a, b) => MCU_GUIDE.remaining(a, statusOf) - MCU_GUIDE.remaining(b, statusOf) || MCU_GUIDE.menuOrder(a) - MCU_GUIDE.menuOrder(b));
    if (rest.length) return { guide: rest[0], title: null, days: null, key: rest[0].id };
    if (!MCU_GUIDE.all().every(g => MCU_GUIDE.finished(g, statusOf))) return null;
    const next = ahead[0] || null;
    const key = 'caught-up:' + (next ? next.title.id : 'all');
    if (shown.indexOf(key) !== -1) return null;
    return next ? { ...next, caughtUp: true, key } : { guide: null, title: null, days: null, caughtUp: true, key };
  },
});

function GuideArt({ guide, size = 44, round = false, className = '' }) {
  return (
    <span aria-hidden="true"
      className={cn('g-art inline-flex items-end justify-start rounded-[10px] p-[5px] [&_i]:block [&_i]:size-1.5 [&_i]:rounded-full [&_i]:bg-white/70 [&_i]:shadow-[9px_-6px_0_rgba(255,255,255,.5),18px_-12px_0_rgba(255,255,255,.35)]',
        round && 'round items-center justify-center rounded-full p-0 [&_i]:shadow-none', className)}
      style={{ width: size, height: size, flex: `0 0 ${size}px`, background: `linear-gradient(150deg, ${guide.color || '#4a6da3'}, #14121a)` }}>
      <i/>
    </span>
  );
}

// Progress beside a guide in the menu: "2/5" and a small bar, or a check.
function GuideMenuProgress({ guide }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  const p = MCU_GUIDE.progress(guide, statusOf);
  if (p.complete) return <span className="g-done inline-flex size-5 flex-[0_0_20px] items-center justify-center rounded-full bg-(--status-seen) text-(--on-color) [&_svg]:size-[11px]" role="img" aria-label={gtr('guide.complete')}><window.CheckIcon/></span>;
  const pct = p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  return (
    <span className="g-prog flex flex-none flex-col items-end gap-[5px]">
      <span className={cn('g-n tabular-nums', XS, DIM)} aria-label={gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released })}>{p.ess.seen}/{p.ess.released}</span>
      <span className="g-bar h-[3px] w-[46px] overflow-hidden rounded-[2px] bg-border" aria-hidden="true">
        <span className="block h-[3px] bg-primary transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none" style={{ width: pct + '%' }}/>
      </span>
    </span>
  );
}

// The Guides menu: grouped like the mockups (Coming up, Stories, Characters,
// Animation), each guide with its size and progress. Shared by the desktop
// popover and the phone sheet.
const GUIDE_GROUPS = ['coming', 'stories', 'characters', 'animation'];
// A guide in the menu (and in "Part of"): the menu item's look.
const ROW = cn('g-row flex min-h-[max(56px,3.5rem)] w-full cursor-pointer items-center gap-3 rounded-md px-2 py-[7px] text-left hover:bg-accent hover:text-accent-foreground', FOCUS);
const ROW_TEXT = 'g-row-text flex min-w-0 flex-1 flex-col';
const ROW_NAME = 'g-row-name text-sm leading-[1.3] font-medium text-foreground';
const ROW_SUB = 'g-row-sub mt-0.5 text-xs text-muted-foreground';
function GuideMenu({ onPick, currentId }) {
  window.useI18n();
  const all = MCU_GUIDE.all();
  return (
    <div className="g-menu text-sm text-foreground">
      <p className="g-menu-sub mt-0.5 text-sm text-muted-foreground">{gtr('guide.menuSub')}</p>
      {GUIDE_GROUPS.map(grp => {
        const list = all.filter(g => g.group === grp);
        if (!list.length) return null;
        return (
          <section key={grp} className="g-group" aria-label={gtr('guide.group.' + grp)}>
            <h3 className="g-group-h mt-4 mb-1 text-xs font-medium text-muted-foreground">{gtr('guide.group.' + grp)}</h3>
            {list.map(g => {
              const date = MCU_GUIDE.targetDate(g);
              const who = g.character && window.CHARACTERS[g.character] ? window.CHARACTERS[g.character].actor : null;
              return (
                <button key={g.id} type="button" className={cn(ROW, currentId === g.id && 'on bg-accent text-accent-foreground')} onClick={() => onPick(g.id)}
                  aria-current={currentId === g.id ? 'true' : undefined}>
                  <GuideArt guide={g} size={40}/>
                  <span className={ROW_TEXT}>
                    <span className={ROW_NAME}>{MCU_GUIDE.name(g)}{date && <span className="g-ev ml-1.5 rounded-full border px-1.5 py-px align-[1px] text-xs font-medium text-foreground tabular-nums">{date}</span>}</span>
                    <span className={ROW_SUB}>{who ? `${who} · ` : ''}{MCU_GUIDE.size(g)}</span>
                  </span>
                  <GuideMenuProgress guide={g}/>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

// Desktop: the Guides section's gallery (Notion "Desktop: navigation for
// Explore, My list and Guides"; the low-fi "Guides" artboard): the same groups
// and guides as the menu, as cards in a grid, each with its art, name, size and
// a progress bar. Picking one opens it in the same section. Each card keeps
// the menu row's hook (`g-row`) inside `g-page`.
function GuidePageProgress({ guide }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  const p = MCU_GUIDE.progress(guide, statusOf);
  const pct = p.complete ? 100 : p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  return (
    <span className="g-card-prog mt-2 flex items-center gap-2.5">
      <span className="g-bar h-1 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <span className={cn('block h-1 rounded-full transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none', p.complete ? 'bg-(--status-seen)' : 'bg-primary')} style={{ width: pct + '%' }}/>
      </span>
      <span className={cn('g-n text-xs whitespace-nowrap tabular-nums', p.complete ? 'text-foreground' : 'text-muted-foreground')}
        aria-label={p.complete ? gtr('guide.complete') : gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released })}>
        {p.complete ? gtr('guide.complete') : `${p.ess.seen}/${p.ess.released}`}
      </span>
    </span>
  );
}
function GuidesPage({ onPick }) {
  window.useI18n();
  const all = MCU_GUIDE.all();
  return (
    <div className="g-page min-h-0 flex-1 overflow-y-auto px-12 pt-8 pb-12 max-[1100px]:px-6" role="main" aria-labelledby="g-page-title">
      <div className="mx-auto max-w-[1120px]">
        <h1 id="g-page-title" className="m-0 text-2xl font-semibold tracking-tight text-foreground">{gtr('guide.menuTitle')}</h1>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">{gtr('guide.menuSub')}</p>
        {GUIDE_GROUPS.map(grp => {
          const list = all.filter(g => g.group === grp);
          if (!list.length) return null;
          return (
            <section key={grp} className="g-group mt-7" aria-labelledby={'g-page-' + grp}>
              <h2 id={'g-page-' + grp} className="g-group-h mt-0 mb-2.5 text-xs font-medium text-muted-foreground">{gtr('guide.group.' + grp)}</h2>
              <div className="grid grid-cols-3 gap-4 max-[1200px]:grid-cols-2">
                {list.map(g => {
                  const date = MCU_GUIDE.targetDate(g);
                  const who = g.character && window.CHARACTERS[g.character] ? window.CHARACTERS[g.character].actor : null;
                  return (
                    <button key={g.id} type="button" onClick={() => onPick(g.id)}
                      className={cn('g-row g-card flex w-full cursor-pointer items-center gap-4 rounded-xl border bg-card p-4 text-left text-card-foreground shadow-xs transition-colors hover:bg-muted/50', FOCUS)}>
                      <GuideArt guide={g} size={64}/>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="g-row-name text-[15px] leading-[1.3] font-semibold text-foreground">{MCU_GUIDE.name(g)}{date && <span className="g-ev ml-1.5 rounded-full border px-1.5 py-px align-[1px] text-xs font-medium text-foreground tabular-nums">{date}</span>}</span>
                        <span className="g-row-sub mt-1 text-xs text-muted-foreground">{who ? `${who} · ` : ''}{MCU_GUIDE.size(g)}</span>
                        <GuidePageProgress guide={g}/>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// The guide's meter: the shared ProgressHeader over its essential stops, with
// the optional count beside it while optional stops are shown.
// In the List and Grid it also offers "Mark N more seen" for the stops shown
// (the bulk action, with its Undo and its confirmation above 20).
const OPT_COUNT = 'g-opt-count flex-none pb-[7px] text-xs font-medium tabular-nums text-muted-foreground in-[.spatial-overall]:pb-0';
function GuideMeter({ guide, includeOptional, className = '', bulk = false }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  const p = MCU_GUIDE.progress(guide, statusOf);
  // "Mark N more seen" leaves skipped stops alone.
  const ids = MCU_GUIDE.stops(guide, includeOptional).filter(s => !MCU_GUIDE.skippedNow(guide, s.id, statusOf)).map(s => s.id);
  const action = bulk && window.BulkHeaderAction ? <window.BulkHeaderAction ids={ids} group={MCU_GUIDE.name(guide)}/> : null;
  const skipped = p.ess.skipped + (includeOptional ? p.opt.skipped : 0);
  return (
    <div className={cn('g-meter flex flex-wrap items-end gap-3 [&_.pgh]:min-w-0 [&_.pgh]:flex-1 [&_.pgh-label]:text-xs [&_.pgh-label]:font-medium [&_.pgh-label]:text-muted-foreground', p.complete && 'done [--pm:var(--status-seen)]', className)}>
      <window.ProgressHeader label={MCU_GUIDE.short(guide)} seen={p.ess.seen} released={p.ess.released} upcoming={p.ess.upcoming} action={action}/>
      {includeOptional && p.opt.total > 0 && (
        <span className={OPT_COUNT}>{gtr('guide.optCount', { seen: p.opt.seen, n: p.opt.released })}</span>
      )}
      {/* On its own line under the meter, so the label keeps its room. */}
      {skipped > 0 && <span className={cn(OPT_COUNT, 'g-skip-count -mt-0.5 basis-full p-0 text-right')}>{gtr('guide.skippedCount', { n: skipped })}</span>}
    </div>
  );
}

// Desktop: the guide's module (V3 Tasks, "Desktop guide: one taller module for
// the guide, and compact rows for seen stops"), the phone dock's sibling. One
// card holds what the banner, the intro row and the meter row used to spread
// over three bands, each control once:
// - List (layout "list"), at the top of the guide's table: the guide on the
//   left (art, kind, name, two-line blurb), where you are on the right (the
//   segment meter with its count, then the next stop with Seen and Open), and
//   a footer strip (Include optional, Mark N more seen, the stepper, ×). Once
//   complete it turns green and shows where the guide leads.
// - Spatial (layout "spatial"), one row floating over the top of the canvas:
//   art, short name, the next stop with Seen, the meter, Include optional as
//   an icon button, the stepper and ×.
// It keeps the banner's hooks (guide-banner, cb-step, cb-pos, cb-close,
// g-optcheck) so the stepper and close read the same everywhere.
function GuideSegments({ guide, statusOf, next, done = false }) {
  // One segment per essential stop that counts (released, not skipped), in
  // order: seen ones lit (green once the guide is complete), the next one
  // outlined.
  const segs = MCU_GUIDE.stops(guide, false)
    .filter(s => window.MCU_isReleased(s.title) && !MCU_GUIDE.skippedNow(guide, s.id, statusOf))
    .map(s => {
      const on = statusOf(s.id) === 'seen', cur = !on && next && next.id === s.id;
      return <i key={s.id} className={cn('flex-1 rounded-[2px] transition-[background-color,box-shadow] duration-[260ms] motion-reduce:transition-none',
        done ? 'bg-(--status-seen)' : on ? 'on bg-primary' : cur ? 'cur bg-transparent shadow-[inset_0_0_0_1px_var(--foreground)]' : 'bg-border')}/>;
    });
  return <span className="gm-segs flex h-1 gap-[3px]" aria-hidden="true">{segs}</span>;
}

function GuideModule({ guide, layout = 'list', includeOptional, setIncludeOptional, stepIndex, stepCount, onOpenNext, onPrev, onNext, onClose }) {
  window.useI18n();
  const { statusOf, states } = window.useCollection();
  useGuideSkips();
  const PosterArt = window.PosterArt;
  const p = MCU_GUIDE.progress(guide, statusOf);
  const complete = p.complete;
  const next = complete ? null : MCU_GUIDE.next(guide, includeOptional, statusOf);
  const all = MCU_GUIDE.stops(guide, true);
  const nOpt = all.filter(s => s.optional).length;
  const target = guide.target && MCU_GUIDE.title(guide.target);
  const release = target ? GI18N.release(target) : null;
  const date = MCU_GUIDE.targetDate(guide);
  const spatial = layout === 'spatial';
  const pos = stepIndex >= 0 && stepIndex >= stepCount
    ? gtr('guide.destPos')
    : stepIndex >= 0
    ? gtr(spatial ? 'guide.stepShort' : 'guide.stepOf', { i: stepIndex + 1, n: stepCount })
    : gtr('guide.stops', { n: stepCount });
  const step = (
    <div className={cn(B.STEP, 'gap-0.5')}>
      <button type="button" className={B.STEP_BTN} onClick={onPrev} aria-label={gtr('guide.prev')} disabled={!stepCount}>‹</button>
      <span className={cn(B.POS, 'min-w-0 px-2')} aria-live="polite">{pos}</span>
      <button type="button" className={B.STEP_BTN} onClick={onNext} aria-label={gtr('guide.next')} disabled={!stepCount}>›</button>
    </div>
  );
  const close = <button type="button" className={B.CLOSE} aria-label={gtr('guide.close')} title={gtr('guide.close')} onClick={onClose}>×</button>;
  const meterLabel = gtr('guide.partSeen', { seen: p.ess.seen, n: p.ess.released });
  const nextTag = next && (next.optional ? gtr('guide.nextStop') : gtr('guide.nextTag', { i: next.n, n: p.ess.total }));
  const doneLine = date ? gtr('guide.pillDoneDate', { date }) : gtr('guide.complete');
  const vr = <span className="gm-vr h-[22px] w-px flex-[0_0_1px] bg-(--gm-line)" aria-hidden="true"/>;
  // One card in the List, one row floating over the top of the canvas (clear
  // of the drawer). A completed guide turns green: its edge, its tint, its
  // meter and its eyebrow.
  const cls = cn('guide-banner g-module rounded-xl border bg-card text-card-foreground shadow-sm [--gm-line:var(--border)]',
    complete && 'done border-[color-mix(in_oklab,var(--status-seen)_55%,var(--background))] bg-[color-mix(in_oklab,var(--status-seen)_8%,var(--card))] [--char-color:var(--status-seen)] [--gm-line:color-mix(in_oklab,var(--status-seen)_30%,var(--background))]',
    spatial
      ? 'spatial absolute top-3 right-[22px] left-[22px] z-40 flex cursor-default items-center gap-3 bg-[color-mix(in_oklab,var(--background)_96%,transparent)] py-2 pr-2 pl-2.5 shadow-[0_12px_30px_rgba(0,0,0,.45)] not-dark:shadow-[0_1px_2px_rgb(0_0_0/.06),0_10px_28px_-12px_rgb(0_0_0/.2)] in-[.app:not(.touch).drawer-open]:right-[402px]'
      : 'list mx-auto mb-2.5 max-w-[1480px]');
  // Seen only, labelled (Watchlist stays on the row); on a complete guide's
  // destination, Watchlist only.
  const tsaCls = (watch) => cn('gm-tsa m-0 flex-none flex-nowrap [&_.tsa-btn]:font-semibold [&_.tsa-btn:not(.on)]:text-foreground',
    spatial ? '[&_.tsa-btn]:min-h-[max(34px,2.125rem)]' : '[&_.tsa-btn]:min-h-[max(36px,2.25rem)]',
    watch ? 'gm-watch [&_.tsa-btn.watch:not(.on)_svg]:text-(--status-watch)' : '[&_.tsa-btn.seen:not(.on)_svg]:text-(--status-seen) [&_.tsa-btn.watch]:hidden');
  const thumb = (big) => cn('gm-nthumb', THUMB, big ? 'big h-12 w-8 flex-[0_0_32px] rounded-[5px]' : 'h-9 w-6 flex-[0_0_24px] rounded-[4px]');
  const meterCls = cn('gm-meter flex flex-col gap-1.5 text-xs font-medium', complete ? 'text-(--status-seen-text)' : 'text-muted-foreground',
    spatial && 'w-[170px] flex-[0_0_170px] gap-[5px] max-[1180px]:w-[120px] max-[1180px]:basis-[120px]');
  const ntag = (done) => cn('gm-ntag text-xs font-medium', done ? 'done text-(--status-seen-text)' : 'text-muted-foreground');
  const region = gtr('guide.regionAria', { name: MCU_GUIDE.name(guide) });
  // Clicks and drags on the floating row never reach the canvas behind it.
  const stop = (e) => e.stopPropagation();

  if (spatial) {
    return (
      <section className={cls} aria-label={region} onMouseDown={stop} onClick={stop} onWheel={stop}>
        <GuideArt guide={guide} size={38}/>
        <span className="gm-who flex min-w-0 flex-[0_1_auto] flex-col [&_b]:truncate [&_b]:text-base [&_b]:font-bold">
          <b>{MCU_GUIDE.short(guide)}</b>
          <span className={cn('gm-kind mt-px whitespace-nowrap text-muted-foreground max-[1180px]:hidden', XS)}>{MCU_GUIDE.kind(guide)}{date ? ` · ${date}` : ''}</span>
        </span>
        {vr}
        <span className="gm-next flex min-w-0 flex-1 items-center gap-[9px]">
          {next ? <>
            <button type="button" className={cn('gm-nextopen flex min-w-0 flex-[0_1_auto] cursor-pointer items-center gap-[9px] rounded-md text-left', FOCUS)} onClick={() => onOpenNext && onOpenNext(next.id)}>
              <span className={thumb(false)}><PosterArt title={next.title}/></span>
              <span className="gm-ntext flex min-w-0 flex-1 flex-col">
                <span className={ntag(false)}>{gtr('guide.dockNextTag')}</span>
                <span className="gm-ntitle mt-0.5 truncate text-sm font-semibold">{GI18N.titleName(next.title)}</span>
              </span>
            </button>
            <window.TitleStatusActions title={next.title} variant="inline" className={tsaCls(false)}/>
          </> : complete ? <span className="gm-doneline truncate text-sm font-semibold text-(--status-seen-text)">{doneLine}</span> : null}
        </span>
        {vr}
        <span className={meterCls} role="img" aria-label={meterLabel}>
          <span className="gm-mtop flex items-center gap-2.5"><span className="gm-mlabel min-w-0 flex-1 truncate">{gtr('guide.progressLabel')}</span><span className={cn('gm-count tabular-nums text-foreground', XS)}>{p.ess.seen}/{p.ess.released}</span></span>
          <GuideSegments guide={guide} statusOf={statusOf} next={next} done={complete}/>
        </span>
        {vr}
        {nOpt > 0 && (
          <button type="button" className={cn('gm-optbtn', B.OUTLINE, 'size-[max(34px,2.125rem)] rounded-lg', includeOptional && 'on border-primary bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] dark:border-primary dark:bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]')} aria-pressed={includeOptional}
            aria-label={gtr('guide.includeOptional', { n: nOpt })} title={gtr('guide.includeOptional', { n: nOpt })}
            onClick={() => setIncludeOptional(!includeOptional)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" strokeDasharray="3 3"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </button>
        )}
        <GuideShare guide={guide} className="gm-share size-[max(34px,2.125rem)]" iconOnly size={15}/>
        {step}
        {vr}
        {close}
      </section>
    );
  }

  const sub = [MCU_GUIDE.size(guide)];
  if (release && release.date) sub.push(release.date);
  const ids = MCU_GUIDE.stops(guide, includeOptional).filter(s => !MCU_GUIDE.skippedNow(guide, s.id, statusOf)).map(s => s.id);
  const bulkN = window.BulkHeaderAction && window.MCU_bulkTargets ? window.MCU_bulkTargets(ids, 'seen', states).length : 0;
  const skipped = p.ess.skipped + (includeOptional ? p.opt.skipped : 0);
  const notes = [];
  if (includeOptional && p.opt.total > 0) notes.push(gtr('guide.optCount', { seen: p.opt.seen, n: p.opt.released }));
  if (skipped > 0) notes.push(gtr('guide.skippedCount', { n: skipped }));
  const done = gloc(guide.done);
  return (
    <section className={cls} aria-label={region}>
      <div className="gm-top grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] max-[1100px]:grid-cols-[minmax(0,1fr)]">
        <div className="gm-guide flex min-w-0 gap-4 px-5 py-[18px]">
          <GuideArt guide={guide} size={64} className="rounded-[14px] p-3 [&_i]:size-[9px]"/>
          <div className="gm-gtext min-w-0">
            <div className={cn('gm-kind text-xs font-medium [&>span]:text-muted-foreground', complete ? 'done text-(--status-seen-text)' : 'text-foreground')}>{complete ? gtr('guide.complete') : MCU_GUIDE.kind(guide)} <span>· {sub.join(' · ')}</span></div>
            <h2 className="gm-name mt-[5px] text-(length:--fs-2xl) leading-[1.25] font-bold">{MCU_GUIDE.name(guide)}</h2>
            <p className={cn('gm-blurb mt-1.5 line-clamp-2 text-sm leading-normal', DIM)}>{MCU_GUIDE.blurb(guide)}</p>
          </div>
        </div>
        <div className="gm-where flex min-w-0 flex-col justify-center gap-3 border-l border-(--gm-line) px-5 py-4 max-[1100px]:border-t max-[1100px]:border-l-0">
          <div className={meterCls} role="img" aria-label={meterLabel}>
            <span className="gm-mtop flex items-center gap-2.5">
              <span className="gm-mlabel min-w-0 flex-1 truncate">{complete ? (done || gtr('guide.complete')).replace(/\.$/, '') : MCU_GUIDE.short(guide)}</span>
              {complete
                ? <span className="gm-check inline-flex size-4 flex-[0_0_16px] items-center justify-center rounded-full bg-(--status-seen) text-(--on-color) [&_svg]:size-2.5" aria-hidden="true"><window.CheckIcon/></span>
                : <span className={cn('gm-count tabular-nums text-foreground', XS)}>{p.ess.seen}/{p.ess.released}</span>}
            </span>
            <GuideSegments guide={guide} statusOf={statusOf} next={next} done={complete}/>
            {notes.length > 0 && <span className={cn('gm-notes font-medium text-muted-foreground', XS)}>{notes.join(' · ')}</span>}
          </div>
          {next ? (
            <div className="gm-nextrow flex min-w-0 items-center gap-[11px]">
              <span className={thumb(true)}><PosterArt title={next.title}/></span>
              <span className="gm-ntext flex min-w-0 flex-1 flex-col">
                <span className={ntag(false)}>{nextTag}</span>
                <span className="gm-ntitle mt-0.5 truncate text-base font-bold">{GI18N.titleName(next.title)}</span>
                <span className={cn('gm-nmeta mt-0.5 tabular-nums text-muted-foreground', XS)}>{gtr(next.title.type === 'film' ? 'type.film.one' : 'type.series.one')} · {next.title.year}</span>
              </span>
              <window.TitleStatusActions title={next.title} variant="inline" className={tsaCls(false)}/>
              <button type="button" className={cn(buttonVariants(), 'gm-open h-[max(36px,2.25rem)] flex-none px-3 text-xs font-bold whitespace-nowrap')} onClick={() => onOpenNext && onOpenNext(next.id)}
                aria-label={gtr('guide.openNextAria', { title: GI18N.titleName(next.title) })}>{gtr('guide.open')} ›</button>
            </div>
          ) : complete && target ? (
            <div className="gm-nextrow flex min-w-0 items-center gap-[11px]">
              <span className={thumb(true)}><PosterArt title={target}/></span>
              <span className="gm-ntext flex min-w-0 flex-1 flex-col">
                <span className={ntag(true)}>{gtr('guide.completeLeads')}</span>
                <span className="gm-ntitle mt-0.5 truncate text-base font-bold">{GI18N.titleName(target)}</span>
                <window.ReleaseLine title={target} className={cn('gm-nmeta mt-0.5 flex items-center gap-1.5', XS, DIM)}/>
              </span>
              <window.TitleStatusActions title={target} variant="inline" className={tsaCls(true)}/>
            </div>
          ) : complete ? (
            <p className="gm-ready text-sm text-(--status-seen-text)">{gtr('guide.allEssentialSeen')}</p>
          ) : null}
        </div>
      </div>
      <div className="gm-foot flex items-center gap-2.5 border-t border-(--gm-line) py-2 pr-2.5 pl-5 [&_.pgh-action]:h-[max(34px,2.125rem)]">
        {nOpt > 0 && (
          // shadcn's Switch look over a native checkbox (role="switch").
          <label className="g-optcheck gm-switch relative inline-flex min-h-[max(36px,2.25rem)] cursor-pointer items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
            <input type="checkbox" role="switch" className="peer absolute z-1 m-0 h-[18px] w-8 cursor-pointer opacity-0" checked={includeOptional} onChange={e => setIncludeOptional(e.target.checked)}/>
            <i aria-hidden="true" className="pointer-events-none relative h-[18px] w-8 flex-[0_0_32px] rounded-full bg-input transition-colors duration-150 after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-full after:bg-background after:shadow-sm after:transition-transform after:duration-150 after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-3.5 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:after:transition-none dark:after:bg-foreground dark:peer-checked:after:bg-primary-foreground"/>
            <span>{gtr('guide.includeOptional', { n: nOpt })}</span>
          </label>
        )}
        {nOpt > 0 && bulkN > 0 && vr}
        {bulkN > 0 && <window.BulkHeaderAction ids={ids} group={MCU_GUIDE.name(guide)}/>}
        {(nOpt > 0 || bulkN > 0) && vr}
        <GuideShare guide={guide} className="gm-share h-[max(36px,2.25rem)]"/>
        <span className="gm-fill flex-1"/>
        {step}
        {vr}
        {close}
      </div>
    </section>
  );
}

// Phones: the guide's dock at the bottom (V3 Tasks, "Phone guide: one bar for
// progress, next stop and stepper"), in every view. It replaces the floating
// meter, the Up next card and the old pill: the guide and its next stop, with
// Seen, on top; the progress segments, the count, the stepper and close below.
// Once complete it turns green and says what the guide was for.
const DOCK_TEXT = 'g-dock-text flex min-w-0 flex-1 flex-col gap-px text-left';
function GuidePill({ guide, stepIndex, stepCount, current, next, onOpenNext, onPrev, onNext, onClose }) {
  const { statusOf } = window.useCollection();
  window.useI18n();
  useGuideSkips();
  const p = MCU_GUIDE.progress(guide, statusOf);
  const date = MCU_GUIDE.targetDate(guide);
  const showNext = !p.complete && next;
  const sub = p.complete
    ? (date ? gtr('guide.pillDoneDate', { date }) : gtr('guide.complete'))
    : showNext ? gtr('guide.dockNext', { title: GI18N.titleName(next) }) : MCU_GUIDE.size(guide);
  const segs = [];
  for (let i = 0; i < p.ess.released; i++) {
    const on = i < p.ess.seen;
    segs.push(<i key={i} className={cn('h-1 flex-1 rounded-[2px] transition-[background-color] duration-[260ms] motion-reduce:transition-none',
      on ? cn('on', p.complete ? 'bg-(--status-seen)' : 'bg-primary') : 'bg-input')}/>);
  }
  // The List and Grid behind the dock keep their last card clear of it: the
  // dock publishes the room it takes (its height plus its gap to the bottom)
  // as --dock-h on the phone's main area.
  const dockRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = dockRef.current;
    const main = el && el.closest('.m-main');
    if (!main) return undefined;
    const set = () => main.style.setProperty('--dock-h', Math.ceil(el.offsetHeight + (parseFloat(getComputedStyle(el).bottom) || 0)) + 'px');
    set();
    const ro = window.ResizeObserver ? new ResizeObserver(set) : null;
    if (ro) ro.observe(el);
    return () => { if (ro) ro.disconnect(); main.style.removeProperty('--dock-h'); };
  }, []);
  const text = (
    <>
      <span className="g-dock-name truncate text-base font-medium">{MCU_GUIDE.short(guide)}</span>
      <span className={cn('g-dock-sub truncate text-sm', p.complete ? 'text-(--status-seen-text)' : 'text-muted-foreground')}>{sub}</span>
    </>
  );
  return (
    <div ref={dockRef} className={cn(B.PILL, 'guide-pill g-dock', p.complete && 'done [--char-color:var(--status-seen)]')} role="group" aria-label={gtr('guide.regionAria', { name: MCU_GUIDE.name(guide) })}>
      {/* One card at the bottom: the guide and its next stop (and Seen) on
          top, the progress segments, count, stepper and close below. Outside
          the canvas, so the blur is allowed. */}
      <div className="g-dock-card rounded-xl border bg-popover pt-2.5 pr-1.5 pb-1.5 pl-2.5 text-popover-foreground shadow-[0_12px_32px_rgba(0,0,0,.5),inset_0_0_0_1px_color-mix(in_oklab,var(--char-color,var(--primary))_30%,transparent)] backdrop-blur-md">
        <div className="g-dock-top flex items-center gap-2.5 pr-1">
          <GuideArt guide={guide} size={36} round/>
          {showNext
            ? <button type="button" className={cn(DOCK_TEXT, 'g-dock-next cursor-pointer rounded-md', FOCUS)} onClick={() => onOpenNext && onOpenNext(next.id)}>{text}</button>
            : <span className={DOCK_TEXT}>{text}</span>}
          {showNext && <window.TitleStatusActions title={next} className="g-dock-tsa static flex-none flex-row [transform:none] [&_.tsa-btn]:size-[max(40px,2.5rem)] [&_.tsa-btn.watch]:hidden [&_.tsa-gap]:hidden"/>}
        </div>
        <div className="g-dock-bottom mt-2 flex items-center gap-2">
          <span className="g-dock-meter flex min-w-0 flex-1 gap-[3px]" role="img" aria-label={gtr('guide.partSeen', { seen: p.ess.seen, n: p.ess.released })}>{segs}</span>
          <span className={cn('g-dock-count tabular-nums text-muted-foreground', XS)} aria-hidden="true">{p.ess.seen}/{p.ess.released}</span>
          <div className={B.PILL_STEP}>
            <button className={B.PILL_BTN} onClick={onPrev} aria-label={gtr('guide.prev')} disabled={!stepCount}>‹</button>
            <span className="cb-pos story-sr" aria-live="polite">{stepIndex >= stepCount
              ? gtr('guide.destLabel', { title: current ? GI18N.titleName(current) : '' })
              : stepIndex >= 0
              ? gtr('guide.stepLabel', { i: stepIndex + 1, title: current ? GI18N.titleName(current) : '' })
              : `${stepCount} ${gtr('guide.stopsWord', { n: stepCount })}`}</span>
            <button className={B.PILL_BTN} onClick={onNext} aria-label={gtr('guide.next')} disabled={!stepCount}>›</button>
          </div>
          <button className={B.DOCK_CLOSE} aria-label={gtr('guide.close')} title={gtr('guide.close')} onClick={onClose}>×</button>
        </div>
      </div>
    </div>
  );
}

// The stop's number badge: a check once seen, its number (or + for an
// optional stop) otherwise, highlighted for the next stop.
// Skip or Unskip on a Spatial card (desktop) or the phone's tapped-card popup.
// `info` is { state: 'can' | 'skipped', stop } from app.jsx. The wrapper keeps
// a press from starting a card drag or selecting the card.
// On the phone's tapped-card popup: beside Seen and Watchlist, or in their
// place (Unskip) on a skipped stop.
const FP_SKIP = 'absolute top-[7px] right-[83px] z-3 has-[.g-unskip]:right-[7px] [&_.g-skip]:size-[max(32px,2rem)] [&_.g-skip]:basis-8 [&_.g-skip]:bg-[color-mix(in_oklab,var(--background)_82%,transparent)] [&_.g-unskip]:min-h-[max(32px,2rem)] [&_.g-unskip]:bg-[color-mix(in_oklab,var(--background)_88%,transparent)]';
function GuideSkipControl({ guide, info, className = '', onDone }) {
  if (!guide || !info) return null;
  const swallow = (e) => e.stopPropagation();
  return (
    <span className={cn('g-skipctl relative z-5 inline-flex', /\bm-fp-skip\b/.test(className) && FP_SKIP, className)} onMouseDown={swallow} onTouchStart={swallow} onClick={swallow}>
      {info.state === 'skipped'
        ? <UnskipButton guide={guide} stop={info.stop} onDone={onDone}/>
        : <SkipButton guide={guide} stop={info.stop} onDone={onDone}/>}
    </span>
  );
}

// Skip or Unskip in the details (desktop drawer and phone sheet), under Seen
// and Watchlist, when the title is a stop of the open guide. It works at any
// zoom, including in Spatial where the card's own buttons hide when small.
function GuideDetailsSkip({ title }) {
  useGuideSkips();
  const { statusOf } = window.useCollection();
  const [said, setSaid] = React.useState('');
  const ref = React.useRef(null);
  const guide = window.MCU_activeGuideId ? MCU_GUIDE.get(window.MCU_activeGuideId) : null;
  const stop = guide ? MCU_GUIDE.stops(guide, true).find(s => s.id === title.id) : null;
  if (!stop) return null;
  const skipped = MCU_GUIDE.skippedNow(guide, stop.id, statusOf);
  const can = !skipped && statusOf(stop.id) !== 'seen' && window.MCU_isReleased(stop.title);
  if (!skipped && !can) return null;
  const name = GI18N.titleName(stop.title);
  const set = (on) => {
    const viaKeys = ref.current && ref.current.contains(document.activeElement);
    MCU_GUIDE.setSkipped(guide, stop.id, on);
    setSaid(gtr(on ? 'guide.skippedSaid' : 'guide.unskippedSaid', { title: name }));
    if (viaKeys) requestAnimationFrame(() => { const b = ref.current && ref.current.querySelector('button'); if (b) b.focus(); });
  };
  return (
    <div className={cn('g-dskip mt-2.5 flex items-center gap-2.5 text-xs', DIM)} ref={ref}>
      {skipped ? <>
        <span className="g-dskip-note">{gtr('guide.skippedInGuide')}</span>
        <button type="button" className={cn(UNSKIP, 'in-[.app.touch]:min-h-[max(40px,2.5rem)]')} aria-label={gtr('guide.unskipAria', { title: name })} onClick={() => set(false)}>{gtr('guide.unskip')}</button>
      </> : (
        <button type="button" className={cn('g-dskip-btn min-h-[max(32px,2rem)] gap-[7px] px-3 text-sm in-[.app.touch]:min-h-[max(40px,2.5rem)]', OUTLINE_BTN, FOCUS)} aria-label={gtr('guide.skipAria', { title: name })} onClick={() => set(true)}>
          <SkipIcon/>{gtr('guide.skipInGuide')}
        </button>
      )}
      <span className="story-sr" aria-live="polite">{said}</span>
    </div>
  );
}

function GuideNum({ stop, seen, next, skipped, className = '' }) {
  const label = stop.optional
    ? gtr(seen ? 'guide.optSeenAria' : skipped ? 'guide.optSkippedAria' : 'guide.optAria')
    : gtr(seen ? 'guide.stopSeenAria' : skipped ? 'guide.stopSkippedAria' : 'guide.stopAria', { i: stop.n });
  return (
    <span role="img" aria-label={label}
      className={cn('g-num inline-flex size-[26px] flex-[0_0_26px] items-center justify-center rounded-full border-[1.5px] border-muted-foreground text-xs font-extrabold tabular-nums text-foreground',
        stop.optional && cn('o border-dashed', DIM), skipped && 'skip border-dashed bg-transparent text-muted-foreground',
        seen && 'done border-solid border-(--status-seen) bg-(--status-seen) text-(--on-color) [&_svg]:size-[13px]',
        next && 'cur border-primary bg-primary text-primary-foreground', className)}>
      {seen ? <window.CheckIcon/> : stop.optional ? '+' : stop.n}
    </span>
  );
}

// Skip and Unskip for one stop. Skip is an icon button beside Seen and
// Watchlist on desktop, under the stop's number in the phone List and on the
// poster's corner in the Grid; Unskip is a text button in the
// minimized row. Focus follows to the other button, since the one pressed goes.
function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>
    </svg>
  );
}
const UNSKIP = cn('g-unskip min-h-[max(32px,2rem)] px-3 text-sm', OUTLINE_BTN, FOCUS);
function SkipButton({ guide, stop, className = '', onDone }) {
  return (
    <button type="button" className={cn('g-skip inline-flex size-[max(26px,1.625rem)] flex-[0_0_26px] cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground', FOCUS, className)} title={gtr('guide.skip')}
      aria-label={gtr('guide.skipAria', { title: GI18N.titleName(stop.title) })}
      onClick={(e) => { e.stopPropagation(); MCU_GUIDE.setSkipped(guide, stop.id, true); onDone && onDone(stop, true); }}>
      <SkipIcon/>
    </button>
  );
}
function UnskipButton({ guide, stop, className = '', onDone }) {
  return (
    <button type="button" className={cn(UNSKIP, className)}
      aria-label={gtr('guide.unskipAria', { title: GI18N.titleName(stop.title) })}
      onClick={(e) => { e.stopPropagation(); MCU_GUIDE.setSkipped(guide, stop.id, false); onDone && onDone(stop, false); }}>
      {gtr('guide.unskip')}
    </button>
  );
}

// The flat view of an open guide: the phone List and Grid, and the desktop
// List (`surface`). Stops in guide order with their numbers and reasons, the
// next stop marked, and the event's destination last.
function GuideView({ guide, includeOptional, setIncludeOptional, surface, layout = 'list', currentId, openId, onOpen, onFollow, onContinue, module }) {
  const { statusOf } = window.useCollection();
  window.useI18n();
  // Desktop table: ↑ ↓ / Home / End between stops, as in the List (the
  // destination row below the stops is not one of them).
  const rowKeys = window.useRowKeys('.g-stop[data-row-id]:not(.dest)', surface === 'desktop' ? openId : null, onFollow);
  useGuideSkips();
  // After Skip or Unskip: say so, and put focus on the button that replaced
  // the one pressed (only if focus was on it, so a mouse user sees nothing).
  const [said, setSaid] = React.useState('');
  const afterSkip = (stop, on) => {
    const name = GI18N.titleName(stop.title);
    setSaid(gtr(on ? 'guide.skippedSaid' : 'guide.unskippedSaid', { title: name }));
    const hadFocus = document.activeElement && document.activeElement.closest && document.activeElement.closest('.g-skip, .g-unskip');
    if (hadFocus) requestAnimationFrame(() => {
      const el = document.querySelector(`[data-row-id="${stop.id}"] ${on ? '.g-unskip' : '.g-skip'}`);
      if (el) el.focus();
    });
  };
  const announcer = <span className="story-sr" aria-live="polite">{said}</span>;
  const isSkipped = (s) => MCU_GUIDE.skippedNow(guide, s.id, statusOf);
  // Skip is offered on released stops not yet seen.
  const canSkip = (s) => window.MCU_isReleased(s.title) && statusOf(s.id) !== 'seen' && !isSkipped(s);
  const PosterArt = window.PosterArt;
  const stops = MCU_GUIDE.stops(guide, includeOptional);
  const p = MCU_GUIDE.progress(guide, statusOf);
  const next = MCU_GUIDE.next(guide, includeOptional, statusOf);
  const nOpt = MCU_GUIDE.stops(guide, true).filter(s => s.optional).length;
  const target = guide.target && MCU_GUIDE.title(guide.target);
  const date = MCU_GUIDE.targetDate(guide);
  const done = gloc(guide.done);
  const meta = (t) => [gtr(t.type === 'film' ? 'type.film.one' : 'type.series.one'), t.year, gtr('phase.label', { n: t.phase })].join(' · ');

  const phone = surface === 'phone', desk = surface === 'desktop', grid = phone && layout === 'grid';
  // A stop's Seen / Watchlist: a column beside it, side by side in the
  // table and in compact rows.
  const tsaCls = (compact) => cn('g-tsa static flex-col gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(34px,2.125rem)] [&_.tsa-btn]:backdrop-blur-none',
    (desk || compact) && 'flex-row', desk && '[&_.tsa-gap]:order-0', desk && compact && '[&_.tsa-btn]:size-[max(28px,1.75rem)] [&_.tsa-btn_svg]:size-[13px]');
  // A stop in the phone List (a Card) or the desktop table (a row in the
  // column grid the header shares).
  const stopCls = ({ next: isNext, seen, compact, optional, skipped, current, dest }) => cn('g-stop items-center',
    desk ? cn('gap-3.5 border-b px-3 py-2.5', !dest && 'grid grid-cols-[26px_minmax(240px,3fr)_minmax(56px,.7fr)_minmax(64px,.8fr)_minmax(56px,.7fr)_minmax(150px,1.2fr)_112px]', dest ? 'flex' : '',
        '[&:has(+.g-stop.skipped)]:border-b-input [&:has(+.g-stop.skipped)]:[border-bottom-style:dashed]')
      : cn('flex gap-2.5 py-[9px] pr-[11px] pl-[9px]', CARD),
    seen && cn('seen', !compact && 'opacity-78'), compact && cn('compact', desk ? 'min-h-[max(44px,2.75rem)] py-1' : 'min-h-[max(50px,3.125rem)] py-1.5'),
    optional && cn('optional', !desk && 'border-dashed'), skipped && cn('skipped border-dashed', desk ? 'border-input' : 'py-1.5'),
    isNext && cn('next bg-muted', desk ? 'shadow-[inset_3px_0_0_var(--primary)]' : NEXT_RING),
    current && cn('current', desk ? 'shadow-[inset_3px_0_0_var(--primary)]' : 'shadow-[0_0_0_2px_var(--ring)]'),
    dest && cn('dest', desk ? '' : 'border-dashed border-input bg-transparent shadow-none', grid && 'mt-3'));
  const openCls = (skipped) => cn('g-open flex min-w-0 flex-1 cursor-pointer items-center gap-[11px] rounded-md text-left', FOCUS, skipped && 'opacity-55');
  const thumbCls = (compact, skipped) => cn('g-thumb h-[66px] w-11 flex-[0_0_44px] rounded-md', THUMB,
    compact && (desk ? 'h-9 w-6 basis-6 rounded-[4px] opacity-60' : 'h-[42px] w-7 basis-7 rounded-[4px] opacity-60'), skipped && 'h-[42px] w-7 basis-7');
  const textCls = 'g-text flex min-w-0 flex-col [&_.un-tag]:mb-[3px]';
  const titleCls = (dim) => cn('g-title text-sm leading-[1.3] font-medium', dim ? DIM : 'text-foreground');
  const otag = cn('g-otag ml-[7px] rounded-full border border-input px-[5px] py-px align-[1px] text-xs font-medium', DIM);
  const whyCls = cn('g-why mt-[3px] text-xs leading-[1.4]', DIM);
  const colCls = (compact, skipped) => cn('g-col min-w-0 text-sm', compact ? 'text-xs text-muted-foreground' : DIM, skipped && 'opacity-55');
  const header = surface === 'phone' ? (
    <section className={cn('g-head mb-3 p-3', CARD)} aria-label={MCU_GUIDE.name(guide)}>
      <div className="g-head-top flex items-start gap-[11px]">
        <GuideArt guide={guide} size={44}/>
        <div className="g-head-text min-w-0">
          <div className={cn('g-kind text-xs font-medium [&>span]:text-muted-foreground', p.complete ? 'done text-(--status-seen-text)' : 'text-foreground')}>{p.complete ? gtr('guide.complete') : MCU_GUIDE.kind(guide)}{!p.complete && date && <span> · {gtr('guide.targetOn', { date })}</span>}</div>
          <h2 className="g-name mt-[3px] text-lg leading-[1.25] font-bold text-foreground">{MCU_GUIDE.name(guide)}</h2>
        </div>
        <GuideShare guide={guide} className="g-share ml-auto size-[max(40px,2.5rem)] self-start" iconOnly/>
      </div>
      {p.complete
        ? <p className="g-ready mt-2.5 text-sm leading-[1.45] text-muted-foreground [&_b]:text-(--status-seen-text)"><b>{done || gtr('guide.complete')}</b> {gtr('guide.allEssentialSeen')}</p>
        : <p className="g-blurb mt-2.5 text-sm leading-[1.45] text-muted-foreground">{MCU_GUIDE.blurb(guide)}</p>}
      {nOpt > 0 && (
        <div className={cn('g-optrow mt-2.5 flex items-center justify-between gap-2.5 border-t pt-2.5 text-xs [&_small]:mt-0.5 [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground', DIM)}>
          <span>{gtr('guide.includeOptional', { n: nOpt })}{includeOptional && <small>{gtr('guide.optSeen', { seen: p.opt.seen, n: p.opt.released })}</small>}</span>
          {/* shadcn's Switch look. */}
          <button type="button" role="switch" aria-checked={includeOptional} aria-label={gtr('guide.optionalAria')} onClick={() => setIncludeOptional(!includeOptional)}
            className={cn('g-switch relative h-[26px] w-11 flex-[0_0_44px] cursor-pointer rounded-full border border-transparent p-0 [&_i]:absolute [&_i]:top-[3px] [&_i]:left-[3px] [&_i]:size-[18px] [&_i]:rounded-full [&_i]:shadow-sm [&_i]:transition-transform [&_i]:duration-160 motion-reduce:[&_i]:transition-none', FOCUS,
              includeOptional ? 'on bg-primary [&_i]:translate-x-[18px] [&_i]:bg-background dark:[&_i]:bg-primary-foreground' : 'bg-input [&_i]:bg-background dark:[&_i]:bg-foreground')}><i/></button>
        </div>
      )}
    </section>
  ) : null;

  const why = (s) => MCU_GUIDE.why(s);
  const destRow = target && (
    <div className={stopCls({ dest: true, current: currentId === target.id })} data-row-id={target.id} role={surface === 'desktop' ? 'row' : undefined}>
      <span className={cn('g-num dest inline-flex size-[26px] flex-[0_0_26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-muted-foreground text-xs font-extrabold', DIM)} aria-hidden="true">→</span>
      <button type="button" className={cn(openCls(false), desk && 'w-auto')} onClick={() => onOpen(target.id)}>
        <span className={thumbCls(false, false)}><PosterArt title={target}/></span>
        <span className={textCls}>
          <span className={titleCls(false)}>{GI18N.titleName(target)}</span>
          <span className={whyCls}>{gtr('guide.dest')}</span>
          <window.ReleaseLine title={target} className="g-release mt-1 text-xs"/>
        </span>
      </button>
      {/* The same buttons as the stops: Watchlist always, Seen from a week
          before release (canMarkSeen). */}
      <span className={cn('g-acts inline-flex flex-none', desk && 'items-center justify-end gap-1.5')}><window.TitleStatusActions title={target} className={tsaCls(false)}/></span>
    </div>
  );

  if (surface === 'phone' && layout === 'grid') {
    return (
      <div className={cn(S.SCROLL, 'g-scroll')}>
        {header}
        <GuideMeter guide={guide} includeOptional={includeOptional} bulk className="mb-3"/>
        <div className="g-grid grid grid-cols-2 gap-3">
          {stops.map(s => {
            const seen = statusOf(s.id) === 'seen';
            const skipped = isSkipped(s);
            const isNext = next && next.id === s.id;
            return (
              <div key={s.id} data-row-id={s.id} className={cn('g-card relative flex flex-col overflow-hidden', CARD, isNext && cn('next col-span-full bg-muted', NEXT_RING),
                seen && 'seen', s.optional && 'optional border-dashed', skipped && 'skipped border-dashed', currentId === s.id && 'current')}>
                <button type="button" className={cn(openCls(false), 'items-stretch gap-0', isNext ? 'flex-row gap-3 px-3 pt-3' : 'flex-col', skipped && 'opacity-50')} onClick={() => onOpen(s.id)}>
                  <span className={cn('g-poster relative block aspect-[2/3] bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover [&>:first-child_svg]:size-full', isNext && 'w-[72px] flex-[0_0_72px] overflow-hidden rounded-lg', seen && SEEN_WASH)}>
                    <PosterArt title={s.title}/>
                    <GuideNum stop={s} seen={seen} next={isNext} skipped={skipped}
                      className={cn('absolute top-[7px] left-[7px] z-2 bg-[rgba(10,12,20,.88)] text-(--on-image)', seen && 'bg-[#5fa856]', isNext && 'bg-primary text-primary-foreground')}/>
                    {skipped && <span className={cn('g-skiptag absolute top-1/2 left-1/2 -translate-1/2 rounded-md bg-[rgba(10,12,20,.85)] px-2 py-[3px] font-bold tracking-[.8px] text-(--on-image) uppercase', XS)} aria-hidden="true">{gtr('guide.skippedTag')}</span>}</span>
                  <span className={cn(textCls, isNext ? 'p-0' : 'px-2.5 pt-2 pb-2.5')}>
                    {isNext && <span className="un-tag mb-[3px] text-xs font-medium text-foreground">{gtr('guide.nextStop')}</span>}
                    <span className={titleCls(seen)}>{GI18N.titleName(s.title)}{s.optional && <span className={otag}>{gtr('guide.optionalTag')}</span>}</span>
                    {!seen && !skipped && <span className={whyCls}>{why(s)}</span>}
                  </span>
                </button>
                {skipped
                  ? <UnskipButton guide={guide} stop={s} className="g-card-unskip mx-2.5 mb-2.5 min-h-[max(36px,2.25rem)] self-start" onDone={afterSkip}/>
                  : <>
                      <window.TitleStatusActions title={s.title}
                        className={cn('g-card-tsa z-2 gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(34px,2.125rem)] [&_.tsa-btn]:backdrop-blur-none', isNext ? 'static flex-row pt-2 pr-3 pb-3 pl-24' : 'absolute top-[7px] right-[7px] flex-col')}/>
                      {canSkip(s) && <SkipButton guide={guide} stop={s} className="g-card-skip absolute top-[7px] left-[39px] z-2 size-[max(32px,2rem)] bg-[color-mix(in_oklab,var(--background)_82%,transparent)]" onDone={afterSkip}/>}
                    </>}
              </div>
            );
          })}
        </div>
        {destRow}
        {announcer}
      </div>
    );
  }

  const rows = stops.map(s => {
    const seen = statusOf(s.id) === 'seen';
    const skipped = isSkipped(s);
    const isNext = next && next.id === s.id;
    const t = s.title;
    // A skipped stop is minimized: a shorter row with a small poster, no
    // reason, a "Skipped" tag and Unskip in place of Seen and Watchlist.
    // A seen stop is compact, like seen titles in the Release and Chrono
    // lists: a small faded poster and the title (no reason, meta or scores),
    // with Seen and Watchlist side by side. It keeps its place in the guide.
    const compact = seen && !skipped;
    return (
      <div key={s.id} data-row-id={s.id} role={surface === 'desktop' ? 'row' : undefined}
        className={stopCls({ next: isNext, seen, compact, optional: s.optional, skipped, current: currentId === s.id })}>
        <span role={surface === 'desktop' ? 'cell' : undefined} className="g-numcell inline-flex flex-none flex-col items-center gap-1.5">
          <GuideNum stop={s} seen={seen} next={isNext} skipped={skipped} className={cn(skipped && 'opacity-55', desk && compact && seen && 'ml-0.5 size-[22px] basis-[22px]')}/>
          {surface === 'phone' && canSkip(s) && <SkipButton guide={guide} stop={s} className="size-[max(32px,2rem)] basis-8" onDone={afterSkip}/>}
        </span>
        <button type="button" className={openCls(skipped)} onClick={() => onOpen(s.id)}>
          <span className={thumbCls(compact, skipped)}><PosterArt title={t}/></span>
          <span className={textCls}>
            {isNext && <span className="un-tag mb-[3px] text-xs font-medium text-foreground">{gtr('guide.nextStop')}</span>}
            <span className={titleCls(compact)}>{GI18N.titleName(t)}{s.optional && <span className={otag}>{gtr('guide.optionalTag')}</span>}
              {skipped && <span className={cn(otag, 'g-skiptag-inline border-dashed')}>{gtr('guide.skippedTag')}</span>}</span>
            {surface === 'phone' && !seen && !skipped && <span className="g-meta mt-[3px] text-xs font-medium tabular-nums text-muted-foreground">{meta(t)}</span>}
            {!skipped && !compact && <span className={whyCls}>{why(s)}</span>}
          </span>
        </button>
        {surface === 'desktop' && <>
          <span role="cell" className={colCls(compact, skipped)}>{gtr(t.type === 'film' ? 'type.film.one' : 'type.series.one')}</span>
          <span role="cell" className={colCls(compact, skipped)}>{gtr('phase.label', { n: t.phase })}</span>
          <span role="cell" className={cn(colCls(compact, skipped), 'mono tabular-nums', !compact && XS)}>{t.year}</span>
          <span role="cell" className={colCls(compact, skipped)}>{!compact && <window.ScoreBadges title={t}/>}</span>
        </>}
        <span role={surface === 'desktop' ? 'cell' : undefined} className={cn('g-acts inline-flex flex-none', desk && 'items-center justify-end gap-1.5')}>
          {skipped ? <UnskipButton guide={guide} stop={s} className={phone ? 'min-h-[max(36px,2.25rem)]' : ''} onDone={afterSkip}/> : <>
            {surface === 'desktop' && canSkip(s) && <SkipButton guide={guide} stop={s} className="size-[max(30px,1.875rem)] basis-[30px]" onDone={afterSkip}/>}
            <window.TitleStatusActions title={t} className={tsaCls(compact)}/>
          </>}
        </span>
      </div>
    );
  });

  if (surface === 'phone') {
    return (
      <div className={cn(S.SCROLL, 'g-scroll')}>
        {header}
        <GuideMeter guide={guide} includeOptional={includeOptional} bulk className="mb-3"/>
        <div className="g-stops flex flex-col gap-[9px]">{rows}{destRow}</div>
        {announcer}
      </div>
    );
  }
  return (
    <div className="dlist g-desk relative @container min-h-0 flex-1 overflow-y-auto px-[22px] pt-3.5 pb-12 min-[1280px]:in-[.app.drawer-open]:pr-[402px]" role="main" aria-label={MCU_GUIDE.name(guide)}>
      {module}
      <div className="g-table mx-auto flex max-w-[1480px] flex-col gap-0 text-sm" role="table" aria-label={MCU_GUIDE.name(guide)} ref={rowKeys.tableRef} onKeyDown={rowKeys.onKeyDown}>
        <div className={cn(stopCls({}), 'g-headrow min-h-[38px] text-xs font-medium text-muted-foreground')} role="row">
          <span role="columnheader" className="g-numcell inline-flex w-[26px] justify-center">#</span>
          <span role="columnheader" className="g-colhead">{gtr('guide.colTitle')}</span>
          <span role="columnheader" className="g-col min-w-0">{gtr('list.col.type')}</span>
          <span role="columnheader" className="g-col min-w-0">{gtr('list.col.phase')}</span>
          <span role="columnheader" className="g-col min-w-0">{gtr('list.col.release')}</span>
          <span role="columnheader" className="g-col min-w-0">{gtr('guide.colScores')}</span>
          <span role="columnheader" className="g-acts inline-flex justify-end"><span className="story-sr">{gtr('guide.colStatus')}</span></span>
        </div>
        {rows}
        {destRow}
      </div>
      {announcer}
    </div>
  );
}

// "Part of" in a title's details (the shared details body's "guides" slot):
// each guide the title is a stop in, with its place and progress. Opening one
// opens the guide.
// "Part of": the guides a title belongs to, as a collapsible details section
// like Where to watch. It starts closed while a guide is open (the banner
// already shows the stop) and open otherwise; each context remembers its own
// open/closed state for the visit.
function GuidePartOf({ title }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  window.useI18n();
  const list = MCU_GUIDE.forTitle(title.id);
  if (!list.length || !window.MCU_openGuide) return null;
  return (
    <window.DetailSection id="guides" stateKey={window.MCU_activeGuideId ? 'guidesInGuide' : 'guides'}
      className="g-partof border-t pt-3" labelClass="g-partof-title p-0 text-xs font-medium text-muted-foreground" bodyClass="g-partof-body pt-1.5"
      label={gtr('guide.partOfCount', { n: list.length })}>
      {list.map(g => {
        const stop = MCU_GUIDE.stops(g, true).find(s => s.id === title.id);
        const p = MCU_GUIDE.progress(g, statusOf);
        const place = stop.optional ? gtr('guide.partOptional') : gtr('guide.stepOf', { i: stop.n, n: p.ess.total });
        const state = p.complete ? gtr('guide.partComplete') : gtr('guide.partSeen', { seen: p.ess.seen, n: p.ess.released });
        return (
          <button key={g.id} type="button" onClick={() => window.MCU_openGuide(g.id, title.id)}
            className={cn('g-partof-row flex min-h-[max(48px,3rem)] w-full cursor-pointer items-center gap-3 px-2.5 py-[7px] text-left hover:bg-accent hover:text-accent-foreground [&+&]:mt-[7px]', CARD, FOCUS)}>
            <GuideArt guide={g} size={30}/>
            <span className={ROW_TEXT}>
              <span className={ROW_NAME}>{MCU_GUIDE.name(g)}</span>
              <span className={ROW_SUB}>{place} · {state}</span>
            </span>
            <span className="g-chev ml-auto text-xl text-muted-foreground" aria-hidden="true">›</span>
          </button>
        );
      })}
    </window.DetailSection>
  );
}
GuidePartOf.has = (title) => !!window.MCU_openGuide && MCU_GUIDE.forTitle(title.id).length > 0;
window.MCU_detailSlots = Object.assign(window.MCU_detailSlots || {}, { guides: GuidePartOf });

// The route icon from the mockups: two stops joined by a path.
function GuideIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19h7a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h7"/>
    </svg>
  );
}

// Desktop: the Guides button in the toolbar's top row (before the language
// menu) and its popover, the same grouped list as the phone sheet. Closes on a
// pick, an outside click or Escape (one layer: the app's Escape stands back
// while .g-pop is open).
// Controls an open guide doesn't use (V3 Tasks, "Guide disables other view
// options"): dimmed and inert, with a tooltip, but still reachable by keyboard
// and screen readers, which hear why (aria-disabled plus the hint below).
// Their values are kept for when the guide closes. The wrapper takes no space
// (display: contents), so toolbar layouts are untouched.
const GUIDE_OFF_HINT_ID = 'guide-off-hint';
function GuideOff({ off, children }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hint = gtr('guide.offHint');
    el.querySelectorAll('button').forEach(b => {
      if (off) {
        // Keep the button's own title for later; React may have just set a
        // new one (a language change), which replaces the kept copy.
        const own = b.getAttribute('title');
        if (!b.hasAttribute('data-guide-off') || own !== hint) b.setAttribute('data-guide-off', own || '');
        b.setAttribute('aria-disabled', 'true');
        b.setAttribute('aria-describedby', GUIDE_OFF_HINT_ID);
        b.setAttribute('title', hint);
      } else if (b.hasAttribute('data-guide-off')) {
        const t = b.getAttribute('data-guide-off');
        if (t) b.setAttribute('title', t); else b.removeAttribute('title');
        b.removeAttribute('data-guide-off');
        b.removeAttribute('aria-disabled');
        b.removeAttribute('aria-describedby');
      }
    });
  });
  const block = (e) => { if (off) { e.preventDefault(); e.stopPropagation(); } };
  return <div ref={ref} className={cn('guide-off-wrap contents', off && 'guide-off [&_.m-tabs]:opacity-38 [&_button]:cursor-not-allowed [&>:not(.m-sort-footer)]:opacity-38')} onClickCapture={block}>{children}</div>;
}
// The text the dimmed controls point to; rendered once while a guide is open.
function GuideOffHint() {
  return <span id={GUIDE_OFF_HINT_ID} className="story-sr">{gtr('guide.offHint')}</span>;
}

function GuidesButton({ currentId, onPick }) {
  window.useI18n();
  const [open, setOpen] = React.useState(false);
  // shadcn's Popover: it closes on a pick, an outside click or Escape, and
  // returns focus to the button (the app's Escape stands back while .g-pop is
  // open).
  return (
    <div className="g-btn-wrap relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger aria-label={currentId && MCU_GUIDE.get(currentId) ? gtr('guide.buttonOpen', { name: MCU_GUIDE.name(MCU_GUIDE.get(currentId)) }) : undefined}
          className={cn(buttonVariants({ variant: 'outline' }), 'filters-pill g-btn h-11 shrink-0 gap-2 px-3.5 text-xs max-[1000px]:px-[11px] [&_svg]:flex-none',
            (open || currentId) && 'active', currentId && 'on border-foreground/30 bg-muted text-foreground dark:bg-input/50')}>
          <GuideIcon/><span className="filters-label">{gtr('guide.button')}</span>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} aria-label={gtr('guide.menuTitle')}
          className="g-pop max-h-[min(640px,calc(100vh-120px))] w-[400px] gap-0 overflow-y-auto px-4 pt-3.5 pb-2.5">
          <h2 className="g-pop-title text-lg font-semibold tracking-tight text-foreground">{gtr('guide.menuTitle')}</h2>
          <GuideMenu currentId={currentId} onPick={(id) => { setOpen(false); onPick(id); }}/>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---- The promotion (Option C, chosen 2026-10-30) ------------------------
// A returning visitor is offered one guide: a countdown band tinted with the
// guide's colour, its essential stops as numbered covers overlapping the
// band's lower edge, ending at a dated tile for the upcoming title; then the
// name, blurb, size and Start (or Continue, with the meter, once started).
// The evergreen guide has a label instead of the countdown and no tile.
// A dialog on desktop, a sheet on phones; app.jsx decides when it appears.

// Covers on phones get one line, so they use a short name: a season becomes
// "S2" ("Loki: Season 2" → "Loki S2", "Loki – Temporada 2" → "Loki T2"), and
// otherwise the part after a colon is kept ("Captain America: Brave New World"
// → "Brave New World"). The full title is always in the accessible name.
const promoCoverName = (t, short) => {
  const n = GI18N.titleName(t);
  if (!short) return n;
  const season = n.match(/^(.*?)[\s:–-]*\b(Season|Temporada)\s+(\d+)$/);
  if (season) return `${season[1]} ${season[2][0]}${season[3]}`;
  const i = n.indexOf(': ');
  return i > 0 ? n.slice(i + 2) : n;
};
function promoDateParts(iso, longMonth) {
  const d = new Date(iso + 'T00:00:00Z');
  const lang = document.documentElement.lang || 'en-US';
  try {
    const full = new Intl.DateTimeFormat(lang, { month: longMonth ? 'long' : 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
    const mon = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' }).format(d).replace('.', '');
    return { full, mon, day: String(d.getUTCDate()) };
  } catch (e) { return { full: iso, mon: iso.slice(5, 7), day: iso.slice(8, 10) }; }
}

// The promotion (Option C): a countdown band in the guide's colour, the stop
// covers overlapping its lower edge, then the name, blurb and actions. The
// covers' numbers and the dated tile keep their capitals: they are artwork.
const promoCls = (touch) => ({
  root: cn('gp text-foreground [--gc-top:color-mix(in_srgb,var(--gc)_82%,#000)] [--gc-mid:color-mix(in_srgb,var(--gc)_50%,#000)]', touch && 'touch'),
  band: cn('gp-band relative bg-linear-[170deg] from-(--gc-top) via-(--gc-mid) via-55% to-card', touch ? 'px-[18px] pt-[22px] pb-16' : 'px-7 pt-[26px] pb-[92px]'),
  strip: cn('gp-strip relative m-0 flex list-none items-start', touch ? '-mt-[50px] gap-1.5 px-[18px]' : '-mt-[74px] gap-3 px-7'),
  st: (mods = '') => cn('gp-st flex min-w-0 flex-[1_1_0] flex-col', touch ? 'gap-1.5' : 'gap-[7px]', mods),
  p: (kind = '') => cn('gp-p relative block aspect-[2/3] overflow-hidden bg-muted', touch ? 'rounded-md shadow-[0_8px_18px_rgba(0,0,0,.45)]' : 'rounded-[7px] shadow-[0_10px_22px_rgba(0,0,0,.45)]',
    kind === 'next' && (touch ? 'shadow-[0_0_0_2px_var(--primary),0_8px_18px_rgba(0,0,0,.45)]' : 'shadow-[0_0_0_2px_var(--primary),0_10px_22px_rgba(0,0,0,.45)]'),
    kind === 'skipped' && 'outline-1 outline-offset-[-1px] outline-input outline-dashed',
    kind === 'dest' && cn('flex flex-col items-center justify-center border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--gc)_45%,#fff)] bg-[color-mix(in_srgb,var(--gc)_18%,var(--card))] text-center shadow-none [&_b]:leading-[1.05] [&_b]:font-extrabold [&_b]:text-foreground [&_b]:tabular-nums [&_small]:mt-1 [&_small]:px-[3px] [&_small]:font-bold [&_small]:text-(length:--fs-xs)', touch ? '[&_b]:text-base [&_small]:tracking-[.3px]' : '[&_b]:text-xl [&_small]:tracking-[.6px]', '[&_small]:text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]'),
    kind === 'more' && cn('flex items-center justify-center border border-input bg-card text-base font-bold shadow-none', DIM)),
  art: (mods = '') => cn('gp-art block size-full *:block *:size-full [&_img]:object-cover [&_svg]:size-full', mods),
  n: (mods = '') => cn('gp-n absolute inline-flex items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--foreground)_23%,transparent)] bg-[color-mix(in_oklab,var(--background)_82%,transparent)] font-bold tabular-nums text-foreground [&_svg]:size-[11px]', XS,
    touch ? 'top-1 left-1 size-[18px]' : 'top-[5px] left-[5px] size-5', mods),
  t: (strong) => cn('gp-t leading-[1.3] [overflow-wrap:anywhere]', XS, touch ? 'block truncate leading-[1.25]' : 'line-clamp-2', strong ? 'text-foreground' : DIM),
  arr: cn('gp-arr flex-none text-muted-foreground', touch ? 'mt-[30px] text-base' : 'mt-[46px] text-lg'),
  body: cn('gp-body', touch ? 'px-[18px] pt-4 pb-6' : 'px-7 pt-[18px] pb-[22px]'),
  h: cn('gp-h leading-[1.25] font-bold text-foreground', touch ? 'text-(length:--fs-2xl)' : 'text-(length:--fs-3xl)'),
  b: cn('gp-b mt-2', DIM, touch ? 'text-sm leading-normal' : 'text-base leading-[1.55]'),
  foot: cn('gp-foot flex', touch ? 'mt-2.5 flex-col items-stretch gap-2' : 'mt-5 items-center gap-2.5 border-t pt-4'),
  meta: cn('gp-meta text-xs', DIM, touch ? 'mb-2 flex-none' : 'flex-1'),
  later: cn('nudge-later gp-later h-auto px-4', touch ? 'min-h-[max(44px,2.75rem)] border-0 shadow-none dark:border-0' : 'min-h-[max(42px,2.625rem)]'),
  go: cn('picker-go gp-go h-auto px-[18px]', touch ? 'min-h-[max(48px,3rem)] text-base' : 'min-h-[max(42px,2.625rem)]'),
});
// The dialog and sheet frames: the band runs to the top edge, under the × (and
// the phone's handle), which float on it.
const PROMO_DIALOG = 'promo-dialog w-[min(640px,calc(100vw-48px))] overflow-x-hidden overflow-y-auto p-0 [&>.about-x]:top-3 [&>.about-x]:right-3 [&>.about-x]:z-3 [&>.about-x]:size-[max(40px,2.5rem)] [&>.about-x]:rounded-[10px] [&>.about-x]:bg-[color-mix(in_oklab,var(--background)_45%,transparent)] [&>.about-x]:text-foreground [&>.about-x]:hover:bg-[color-mix(in_oklab,var(--background)_65%,transparent)]';
const PROMO_SHEET = "promo-sheet overflow-hidden [&_.m-grab]:absolute [&_.m-grab]:top-0 [&_.m-grab]:left-1/2 [&_.m-grab]:z-2 [&_.m-grab]:m-0 [&_.m-grab]:-ml-[23px] [&_.m-grab]:after:bg-white/40 [&_.m-sheet-x]:top-2.5 [&_.m-sheet-x]:right-2 [&_.m-sheet-x]:size-[max(44px,2.75rem)] [&_.m-sheet-x]:rounded-[10px] [&_.m-sheet-x]:bg-[color-mix(in_oklab,var(--background)_45%,transparent)] [&_.m-sheet-x]:text-(length:--fs-3xl) [&_.m-sheet-x]:text-foreground [&_.m-sheet-body]:px-0 [&_.m-sheet-body]:pt-0 [&_.m-sheet-body]:pb-[env(safe-area-inset-bottom,0px)]";

function GuidePromo({ promo, touch, onStart, onClose }) {
  if (promo.caughtUp) return <GuideCaughtUp promo={promo} touch={touch} onClose={onClose}/>;
  return <GuidePromoOffer promo={promo} touch={touch} onStart={onStart} onClose={onClose}/>;
}

// The countdown band shared by the offer and the caught-up moment.
function PromoCountdown({ target, days, touch, label }) {
  const cd = cn('gp-cd flex items-end', touch ? 'gap-3 pr-12' : 'gap-3.5 pr-[52px]');
  if (!target) return <div className={cd} id="gp-cd"><span className="gp-lab inline-flex items-center gap-2 pt-2 pb-6 text-xs font-bold tracking-[1.2px] text-white uppercase [&_i]:block [&_i]:size-2 [&_i]:rounded-[2px] [&_i]:bg-primary"><i aria-hidden="true"/>{label}</span></div>;
  const date = promoDateParts(target.release, !touch);
  const word = days === 1;
  return (
    <div className={cd} id="gp-cd">
      <span className={cn('gp-big leading-[.9] font-extrabold text-white tabular-nums', word
        ? cn('word tracking-[-.01em]', touch ? 'text-4xl' : 'text-(length:--fs-5xl)')
        : cn('tracking-[-.02em]', touch ? 'text-(length:--fs-6xl)' : 'text-(length:--fs-7xl)'))}>{word ? gtr('guide.promoTomorrow') : days}</span>{' '}
      <span className={cn('gp-cdt leading-normal font-bold tracking-[1.1px] text-[#f4ecec] uppercase [&_b]:block [&_b]:tracking-[.08em] [&_b]:text-white', XS, touch ? 'pb-[3px] [&_b]:text-base' : 'pb-1 [&_b]:text-lg')}>
        {days !== 1 && <><b>{gtr('guide.promoDays', { n: days })}</b>{' '}</>}
        {gtr('guide.promoUntil', { title: GI18N.titleName(target), date: date.full })}
      </span>
    </div>
  );
}

// Every guide finished (Notion V4 Tasks, "Don't promote a guide that the user
// has already finished"): the same dialog, as a celebration. Confetti (which
// follows Settings' Celebrations and reduced motion), the guide for the next
// dated release shown complete with its countdown, and Share: that guide's
// card, or the progress card when no release ahead has a date.
function GuideCaughtUp({ promo, touch, onClose }) {
  const { statusOf, progress } = window.useCollection();
  window.useI18n();
  const PosterArt = window.PosterArt;
  const g = promo.guide, target = promo.title, days = promo.days;
  React.useEffect(() => { window.burstConfetti(); }, []);
  const ess = g ? MCU_GUIDE.stops(g, false) : [];
  const cap = target ? 5 : 6;
  const shown = ess.length > cap ? ess.slice(0, cap - 1) : ess;
  const more = ess.length - shown.length;
  const date = target ? promoDateParts(target.release, !touch) : null;
  const when = target ? (days === 1 ? gtr('guide.promoTomorrow') : gtr('guide.promoIn', { n: days })) : '';
  const P = promoCls(touch);
  const share = g
    ? <window.ShareButton className={cn(window.MCU_SHARE.PRIMARY, P.go, 'gp-share')} text={gtr('share.button')} label={gtr(promo.ready ? 'guide.caughtUpShareReady' : 'guide.caughtUpShare')}
        payload={() => guideSharePayload(g, statusOf)} onShare={() => { onClose(); openGuideCard(g, statusOf); }}/>
    : <window.ShareButton className={cn(window.MCU_SHARE.PRIMARY, P.go, 'gp-share')} text={gtr('share.button')} label={gtr('guide.caughtUpShare')}
        payload={() => ({ text: gtr('share.progressText', { n: progress.seenReleased, total: progress.releasedTotal }) })}
        onShare={() => { onClose(); window.MCU_SHARE_IMAGE.progress(progress.seenReleased, progress.releasedTotal); }}/>;
  const close = <Button type="button" variant="outline" className={P.later} onClick={onClose}>{gtr('guide.caughtUpClose')}</Button>;
  const body = (
    <div className={cn(P.root, 'caught')} style={{ '--gc': (g && g.color) || '#4a6da3' }}>
      <div className={P.band}>
        <PromoCountdown target={target} days={days} touch={touch} label={gtr(promo.ready ? 'guide.caughtUpLabelReady' : 'guide.caughtUpLabel')}/>
      </div>
      {g && (
        <ol className={P.strip} aria-label={gtr('guide.promoStops')}>
          {shown.map(s => (
            <li key={s.id} className={P.st('seen')}>
              <span className={P.p()} aria-hidden="true">
                <span className={P.art('opacity-45')}><PosterArt title={s.title}/></span>
                <span className={P.n('done border-(--status-seen) bg-(--status-seen) text-(--on-color)')}><window.CheckIcon/></span>
              </span>
              <span className={P.t(false)} aria-hidden="true">{promoCoverName(s.title, touch)}</span>
              <span className="story-sr">{gtr('guide.promoStopSeenAria', { title: GI18N.titleName(s.title), i: s.n })}</span>
            </li>
          ))}
          {more > 0 && (
            <li className={P.st('more')}>
              <span className={P.p('more')} aria-hidden="true">+{more}</span>
              <span className="story-sr">{gtr('guide.promoMore', { n: more })}</span>
            </li>
          )}
          {target && <li className={P.arr} aria-hidden="true">→</li>}
          {target && (
            <li className={P.st('dest')}>
              <span className={P.p('dest')} aria-hidden="true"><b>{GI18N.upper(date.mon)}</b><b>{date.day}</b><small>{GI18N.upper(when)}</small></span>
              <span className={P.t(true)} aria-hidden="true">{promoCoverName(target, touch)}</span>
              <span className="story-sr">{gtr('guide.promoDestAria', { title: GI18N.titleName(target), date: date.full, when })}</span>
            </li>
          )}
        </ol>
      )}
      <div className={P.body}>
        <h2 id="gp-title" className={P.h}>{gtr('guide.caughtUp')}</h2>
        <p className={P.b}>{!target ? gtr('guide.caughtUpBodyNone')
          : gtr(promo.ready ? 'guide.caughtUpBodyReady' : 'guide.caughtUpBody', { title: GI18N.titleName(target) })}</p>
        <div className={P.foot}>
          {g && <span className={P.meta}>{gtr('guide.complete')}</span>}
          {!touch && close}
          {share}
          {touch && close}
        </div>
      </div>
    </div>
  );
  if (touch) return <window.Sheet onClose={onClose} labelledBy="gp-title" describedBy="gp-cd" className={PROMO_SHEET}>{body}</window.Sheet>;
  return <window.ModalDialog onClose={onClose} labelledBy="gp-title" describedBy="gp-cd" className={PROMO_DIALOG}>{body}</window.ModalDialog>;
}

function GuidePromoOffer({ promo, touch, onStart, onClose }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  window.useI18n();
  const PosterArt = window.PosterArt;
  const g = promo.guide, target = promo.title, days = promo.days;
  const p = MCU_GUIDE.progress(g, statusOf);
  const started = p.ess.seen > 0;
  const next = started ? MCU_GUIDE.next(g, false, statusOf) : null;
  const ess = MCU_GUIDE.stops(g, false);
  // Covers share the width: five and the tile with a countdown, six without;
  // a longer guide shows the first ones and a "+n" tile.
  const cap = target ? 5 : 6;
  const shown = ess.length > cap ? ess.slice(0, cap - 1) : ess;
  const more = ess.length - shown.length;
  const date = target ? promoDateParts(target.release, !touch) : null;
  const when = days === 1 ? gtr('guide.promoTomorrow') : gtr('guide.promoIn', { n: days });
  const P = promoCls(touch);
  const later = <Button type="button" variant="outline" className={P.later} onClick={onClose}>{gtr('guide.promoLater')}</Button>;
  const body = (
    <div className={P.root} style={{ '--gc': g.color || '#4a6da3' }}>
      <div className={P.band}>
        <PromoCountdown target={target} days={days} touch={touch} label={gtr(g.evergreen ? 'guide.promoEvergreen' : 'guide.promoPick')}/>
      </div>
      <ol className={P.strip} aria-label={gtr('guide.promoStops')}>
        {shown.map(s => {
          const seen = statusOf(s.id) === 'seen';
          const isNext = !!(next && next.id === s.id);
          const skippedNow = MCU_GUIDE.skippedNow(g, s.id, statusOf);
          return (
            <li key={s.id} className={P.st(cn(seen && 'seen', isNext && 'next', skippedNow && 'skipped'))}>
              <span className={P.p(isNext ? 'next' : skippedNow ? 'skipped' : '')} aria-hidden="true">
                <span className={P.art(seen ? 'opacity-45' : skippedNow ? 'opacity-30' : '')}><PosterArt title={s.title}/></span>
                <span className={P.n(seen ? 'done border-(--status-seen) bg-(--status-seen) text-(--on-color)' : isNext ? 'cur border-primary bg-primary text-primary-foreground' : '')}>{seen ? <window.CheckIcon/> : s.n}</span>
              </span>
              <span className={cn(P.t(false), isNext && 'font-semibold text-foreground')} aria-hidden="true">{promoCoverName(s.title, touch)}</span>
              <span className="story-sr">{gtr(seen ? 'guide.promoStopSeenAria' : 'guide.promoStopAria', { title: GI18N.titleName(s.title), i: s.n })}</span>
            </li>
          );
        })}
        {more > 0 && (
          <li className={P.st('more')}>
            <span className={P.p('more')} aria-hidden="true">+{more}</span>
            <span className="story-sr">{gtr('guide.promoMore', { n: more })}</span>
          </li>
        )}
        {target && <li className={P.arr} aria-hidden="true">→</li>}
        {target && (
          <li className={P.st('dest')}>
            <span className={P.p('dest')} aria-hidden="true"><b>{GI18N.upper(date.mon)}</b><b>{date.day}</b><small>{GI18N.upper(when)}</small></span>
            <span className={P.t(true)} aria-hidden="true">{promoCoverName(target, touch)}</span>
            <span className="story-sr">{gtr('guide.promoDestAria', { title: GI18N.titleName(target), date: date.full, when })}</span>
          </li>
        )}
      </ol>
      <div className={P.body}>
        {started && <GuideMeter guide={g} includeOptional={false} className="gp-meter mb-3.5"/>}
        <h2 id="gp-title" className={P.h}>{MCU_GUIDE.name(g)}</h2>
        <p className={P.b}>{MCU_GUIDE.blurb(g)}</p>
        <div className={P.foot}>
          <span className={P.meta}>{MCU_GUIDE.size(g)}</span>
          {!touch && later}
          <Button type="button" className={P.go} onClick={onStart}>
            {next ? gtr('guide.continue', { title: promoCoverName(next.title, true) }) : gtr('guide.promoStart')}
          </Button>
          {touch && later}
        </div>
      </div>
    </div>
  );
  if (touch) return <window.Sheet onClose={onClose} labelledBy="gp-title" describedBy="gp-cd" className={PROMO_SHEET}>{body}</window.Sheet>;
  return <window.ModalDialog onClose={onClose} labelledBy="gp-title" describedBy="gp-cd" className={PROMO_DIALOG}>{body}</window.ModalDialog>;
}

Object.assign(window, { GuideMenu, GuidesPage, GuideModule, GuidePill, GuideView, GuideMeter, GuideArt, GuidePartOf, GuideIcon, GuidesButton, GuidePromo, GuideOff, GuideOffHint, GuideSkipControl, GuideDetailsSkip });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { GuideMenu, GuideModule, GuidePill, GuideView, GuideMeter, GuideArt,
  GuidePartOf, GuideIcon, GuidesButton, GuidesPage, GuidePromo, GuideOff, GuideOffHint,
  GuideSkipControl, GuideDetailsSkip, MCU_GUIDE, useGuideSkips };
