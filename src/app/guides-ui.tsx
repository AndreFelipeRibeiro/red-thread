// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 193 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from '@/lib/utils';
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
const DIM = 'text-(--dim)';
const XS = 'text-caption';
// A poster thumbnail: the art fills the box.
const THUMB = 'overflow-hidden bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_svg]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover';
const FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
// shadcn's Card, as the guide's head, stops, cards and "Part of" rows use it.
const CARD = 'rounded-xl border bg-card text-card-foreground shadow-sm';
const OUTLINE_BTN = 'inline-flex cursor-pointer items-center rounded-md border bg-(--button-outline) font-medium whitespace-nowrap text-foreground shadow-xs hover:bg-(--field-hover) border-(--button-outline-border)';

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
  // "5 stops · about 11 h" (Notion "Time to finish"): the stops' runtimes,
  // released ones only.
  size(g) {
    const all = MCU_GUIDE.stops(g, true);
    const e = all.filter(s => !s.optional).length, o = all.length - e;
    const base = gtr('guide.stops', { n: e });
    const min = MCU_GUIDE.minutes(g, null).total;
    const sized = o ? gtr('guide.plusOptional', { base, n: o }) : base;
    return min ? sized + ' · ' + MCU_GUIDE.duration(min, true) : sized;
  },
  // A guide's watching time: `total` over its released stops (skipped ones
  // out), `left` over those not yet seen. Minutes.
  minutes(g, statusOf) {
    const stops = MCU_GUIDE.stops(g, false).filter(s => window.MCU_isReleased(s.title)
      && !(statusOf ? MCU_GUIDE.skippedNow(g, s.id, statusOf) : MCU_GUIDE.isSkipped(g, s.id)));
    const total = stops.reduce((a, s) => a + (s.title.runtime || 0), 0);
    const left = statusOf ? stops.filter(s => statusOf(s.id) !== 'seen').reduce((a, s) => a + (s.title.runtime || 0), 0) : total;
    return { total, left };
  },
  // Minutes as words. Totals (`about`): to the nearest half hour, "about
  // 11 h", "about 10 h 30 min"; under an hour, minutes. A title's own
  // runtime is exact: "2 h 6 min".
  duration(min, about, word = true) {
    if (!min) return '';
    let text;
    if (about && min >= 60) {
      const half = Math.round(min / 30) * 30, h = Math.floor(half / 60), m = half % 60;
      text = m ? gtr('runtime.hm', { h, m }) : gtr('runtime.h', { h });
    } else {
      const h = Math.floor(min / 60), m = min % 60;
      text = h && m ? gtr('runtime.hm', { h, m }) : h ? gtr('runtime.h', { h }) : gtr('runtime.m', { m });
    }
    return about && word ? gtr('runtime.about', { t: text }) : text;
  },
  // "about 4 h left", or '' when nothing is left.
  left(g, statusOf) {
    const { left } = MCU_GUIDE.minutes(g, statusOf);
    return left ? gtr('runtime.left', { t: MCU_GUIDE.duration(left, true, false) }) : '';
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

// ---- Followed guides (Notion "Guides 1/4", and "Guides 2/4" for the rest).
// Following is the visitor's intent; progress stays automatic (seen marks
// count everywhere, followed or not). Several guides can be followed, the
// most recent activity first; one of them is the guide in focus (the Guides
// page's hero; `focus`). Kept on this device in
// mcu.guidesFollowed.v1 as [{ id, at }]. It replaces the single remembered
// guide (mcu.guide.v1) as the visitor's list: on first read that guide, if
// any, becomes the first followed one. Signed-in sync, auto-follow and the
// Continue shelf come with Guides 2/4.
const FOLLOWED_KEY = 'mcu.guidesFollowed.v1';
const FOLLOWED_EVENT = 'mcu:guides-followed';
function readFollowed() {
  try {
    const raw = localStorage.getItem(FOLLOWED_KEY);
    if (raw == null) {
      const kept = localStorage.getItem(GUIDE_MEMORY_KEY);
      return kept && MCU_GUIDE.get(kept) ? [{ id: kept, at: Date.now() }] : [];
    }
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(x => x && typeof x.id === 'string' && MCU_GUIDE.get(x.id)) : [];
  } catch (e) { return []; }
}
let followedCache = null;
function writeFollowed(list) {
  followedCache = list;
  try { localStorage.setItem(FOLLOWED_KEY, JSON.stringify(list)); } catch (e) { /* this visit only */ }
  window.dispatchEvent(new Event(FOLLOWED_EVENT));
}
Object.assign(MCU_GUIDE, {
  // Followed guide ids, the most recent activity first.
  followed() {
    if (!followedCache) followedCache = readFollowed();
    return followedCache.slice().sort((a, b) => b.at - a.at).map(x => x.id);
  },
  isFollowed: (id) => MCU_GUIDE.followed().indexOf(id) !== -1,
  follow(id) {
    if (!MCU_GUIDE.get(id)) return;
    const list = (followedCache || readFollowed()).filter(x => x.id !== id);
    writeFollowed(list.concat({ id, at: Date.now() }));
  },
  unfollow(id) { writeFollowed((followedCache || readFollowed()).filter(x => x.id !== id)); },
  // The guide in focus: a followed guide leading to a release in the next 60
  // days (the soonest), else the most recent followed guide; never a
  // finished one.
  focus(statusOf, today) {
    const open = MCU_GUIDE.followed().map(MCU_GUIDE.get).filter(g => g && !MCU_GUIDE.finished(g, statusOf));
    const soon = today ? MCU_GUIDE.comingUp(today).find(x => x.days <= PROMO_LEAD_DAYS && open.indexOf(x.guide) !== -1) : null;
    return soon ? soon.guide : open[0] || null;
  },
  // The Guides page's hero when nothing followed is in focus: the guide the
  // promotion rules would pick (one leading to a release in the next 60
  // days, else the evergreen one, else the unfinished guide closest to done),
  // without the device's "already promoted" memory, which is the dialog's.
  heroPick(statusOf, today) {
    const ahead = MCU_GUIDE.comingUp(today).filter(x => x.days <= PROMO_LEAD_DAYS && !MCU_GUIDE.finished(x.guide, statusOf));
    if (ahead.length) return ahead[0].guide;
    const open = MCU_GUIDE.all().filter(g => !MCU_GUIDE.finished(g, statusOf));
    return open.find(g => g.evergreen) || open.sort((a, b) => MCU_GUIDE.remaining(a, statusOf) - MCU_GUIDE.remaining(b, statusOf)
      || MCU_GUIDE.menuOrder(a) - MCU_GUIDE.menuOrder(b))[0] || null;
  },
});
// Re-renders on follow and unfollow (in this tab and others).
function useFollowedGuides() {
  const [, bump] = React.useReducer((n) => n + 1, 0);
  React.useEffect(() => {
    const on = () => bump();
    const onStorage = (e) => { if (e.key === FOLLOWED_KEY) { followedCache = null; bump(); } };
    window.addEventListener(FOLLOWED_EVENT, on);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(FOLLOWED_EVENT, on); window.removeEventListener('storage', onStorage); };
  }, []);
  return MCU_GUIDE.followed();
}
// Signed-in sync (Guides 2/4): the list travels with the account's
// preferences (settings.tsx, `guidesFollowed`), the account's copy winning on
// sign-in like every other preference.
Object.assign(MCU_GUIDE, {
  followedList() { if (!followedCache) followedCache = readFollowed(); return followedCache.slice(); },
  setFollowedList(list) {
    if (!Array.isArray(list)) return;
    const clean = list.filter(x => x && typeof x.id === 'string' && typeof x.at === 'number' && MCU_GUIDE.get(x.id));
    if (JSON.stringify(clean) === JSON.stringify(MCU_GUIDE.followedList())) return;
    writeFollowed(clean);
  },
  onFollowed(fn) { window.addEventListener(FOLLOWED_EVENT, fn); return () => window.removeEventListener(FOLLOWED_EVENT, fn); },
});

// Auto-follow and auto-unfollow (Guides 2/4). Marking a stop seen from inside
// a guide (the open guide's list, its Spatial stops, its bulk action) follows
// that guide; the status toast then says so, and its Undo stops following
// (the seen mark stays). Seen marks made anywhere else, and the "What have
// you seen?" picker, never follow a guide. A followed guide whose essential
// stops are now all seen stops being followed on its own, so the next one
// takes focus. Runs before the toast's own listener (registered at load), and
// leaves `autoFollow` on the event for it.
window.onStatusChange((e) => {
  if (!e) return;
  const before = (id) => (e.states && e.states[id]) || 'none';
  const afterMap = e.bulk ? (e.after || {}) : Object.assign({}, e.states, { [e.title.id]: e.to });
  const after = (id) => afterMap[id] || 'none';
  MCU_GUIDE.followed().forEach(id => {
    const g = MCU_GUIDE.get(id);
    if (g && !MCU_GUIDE.progress(g, before).complete && MCU_GUIDE.progress(g, after).complete) {
      MCU_GUIDE.unfollow(id);
      e.finishedGuide = id;
    }
  });
  const open = window.MCU_activeGuideId ? MCU_GUIDE.get(window.MCU_activeGuideId) : null;
  if (!open || e.picker || MCU_GUIDE.isFollowed(open.id) || e.finishedGuide === open.id) return;
  const seenIds = e.bulk ? (e.to === 'seen' ? e.ids : (e.seenIds || [])) : (e.to === 'seen' ? [e.title.id] : []);
  if (!seenIds.length || MCU_GUIDE.progress(open, after).complete) return;
  const stopIds = MCU_GUIDE.stops(open, true).map(s => s.id);
  if (!seenIds.some(id => stopIds.indexOf(id) !== -1)) return;
  MCU_GUIDE.follow(open.id);
  e.autoFollow = open.id;
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
  if (p.complete) return <span className="g-done inline-flex size-5 flex-[0_0_20px] items-center justify-center rounded-full bg-(--seen) text-(--seen-foreground) [&_svg]:size-[11px]" role="img" aria-label={gtr('guide.complete')}><window.CheckIcon/></span>;
  const pct = p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  return (
    <span className="g-prog flex flex-none flex-col items-end gap-[5px]">
      <span className={cn('g-n tabular-nums', XS, DIM)} aria-label={gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released })}>{p.ess.seen}/{p.ess.released}</span>
      <span className="g-bar h-[3px] w-[46px] overflow-hidden rounded-[2px] bg-(--progress-track)" aria-hidden="true">
        <span className="block h-[3px] bg-(--progress) transition-[width] duration-600 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none" style={{ width: pct + '%' }}/>
      </span>
    </span>
  );
}

// The Guides menu: grouped like the mockups (Coming up, Stories, Characters,
// Animation), each guide with its size and progress. Shared by the desktop
// popover and the phone sheet.
const GUIDE_GROUPS = ['coming', 'stories', 'characters', 'teams', 'corners', 'animation'];
// A guide in the menu (and in "Part of"): the menu item's look.
const ROW = cn('g-row flex min-h-[max(56px,3.5rem)] w-full cursor-pointer items-center gap-3 rounded-md px-2 py-[7px] text-left hover:bg-accent hover:text-accent-foreground', FOCUS);
const ROW_TEXT = 'g-row-text flex min-w-0 flex-1 flex-col';
const ROW_NAME = 'g-row-name text-body leading-[1.3] font-medium text-foreground';
const ROW_SUB = 'g-row-sub mt-0.5 text-label text-muted-foreground';
function GuideMenu({ onPick, currentId }) {
  window.useI18n();
  const all = MCU_GUIDE.all();
  return (
    <div className="g-menu text-body text-foreground">
      <p className="g-menu-sub mt-0.5 text-body text-muted-foreground">{gtr('guide.menuSub')}</p>
      {GUIDE_GROUPS.map(grp => {
        const list = all.filter(g => g.group === grp);
        if (!list.length) return null;
        return (
          <section key={grp} className="g-group" aria-label={gtr('guide.group.' + grp)}>
            <h3 className="g-group-h mt-4 mb-1 text-label font-medium text-muted-foreground">{gtr('guide.group.' + grp)}</h3>
            {list.map(g => {
              const date = MCU_GUIDE.targetDate(g);
              const who = g.character && window.CHARACTERS[g.character] ? window.CHARACTERS[g.character].actor : null;
              return (
                <button key={g.id} type="button" className={cn(ROW, currentId === g.id && 'on bg-accent text-accent-foreground')} onClick={() => onPick(g.id)}
                  aria-current={currentId === g.id ? 'true' : undefined}>
                  <GuideArt guide={g} size={40}/>
                  <span className={ROW_TEXT}>
                    <span className={ROW_NAME}>{MCU_GUIDE.name(g)}{date && <span className="g-ev ml-1.5 rounded-full border px-1.5 py-px align-[1px] text-label font-medium text-foreground tabular-nums">{date}</span>}</span>
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

// The Guides page (Notion "Guides 1/4", direction B · Shelves with a hero;
// Figma "Red Thread – V5 - High-Fi Explorations", page Guides): a hero for the
// guide in focus, then shelves of guide cards across the full content width.
// Real posters throughout (PosterArt and its fallback), never the Figma's
// monogram stand-ins. Hooks: `g-page`, `g-hero`, `g-strip`, `g-hstop`,
// `g-shelf`, `g-gcard`, `g-card-open`, `g-follow`; each
// guide's open button keeps the old gallery's `g-row` (the hero's title and
// every card's name). The strip's stops are `g-hstop` (`g-stop` is the open
// guide's list).
//
// Shelves follow the guides' `group`, at least 4 guides each (no orphan
// shelves): a group with fewer joins a broader shelf ("More guides", or the
// last shelf when that would be short too, or one "All guides" shelf when no
// group is big enough yet). The animated series belong to "Corners of the
// universe" (Guides 4/4 renames the group in the data).
const SHELF_ORDER = ['coming', 'stories', 'characters', 'teams', 'corners'];
const shelfGroup = (g) => (g.group === 'animation' ? 'corners' : (g.group || 'stories'));
function guideShelves(excludeId) {
  const list = MCU_GUIDE.all().filter(g => g.id !== excludeId);
  const by = SHELF_ORDER.map(key => ({ key, items: list.filter(g => shelfGroup(g) === key) }));
  // Event guides not in the hero sit with the stories until there are 4.
  const coming = by.find(sh => sh.key === 'coming'), stories = by.find(sh => sh.key === 'stories');
  if (coming.items.length && coming.items.length < 4) { stories.items = stories.items.concat(coming.items); coming.items = []; }
  const full = by.filter(sh => sh.items.length >= 4);
  const rest = by.filter(sh => sh.items.length && sh.items.length < 4).flatMap(sh => sh.items);
  if (!rest.length) return full;
  if (!full.length) return [{ key: 'all', items: rest }];
  if (rest.length >= 4) return full.concat({ key: 'more', items: rest });
  const last = full[full.length - 1];
  return full.slice(0, -1).concat({ ...last, items: last.items.concat(rest) });
}
const shelfLabel = (key) => gtr(key === 'all' ? 'guide.shelf.all' : key === 'more' ? 'guide.shelf.more' : 'guide.group.' + key);
// What a guide is, in one word ("Story", "Character"), for kickers.
const guideType = (g) => gtr('guide.type.' + shelfGroup(g));

// Guide posters show their own year chip, so the fallback's year steps aside.
const POSTER = cn('g-poster relative block overflow-hidden bg-muted [&_.poster-mono-year]:hidden', THUMB);
// The release year over a poster's top-left corner (decorative: the title's
// name is read out instead).
function PosterYear({ title, className = '' }) {
  return <span aria-hidden="true" className={cn('g-year absolute top-1 left-1 z-2 rounded-[3px] bg-black/55 px-1 text-tag font-medium text-white/90 tabular-nums', className)}>{title.year}</span>;
}
// The cards' quiet seen mark in a poster's corner.
function PosterSeen({ className = '' }) {
  return (
    <span aria-hidden="true" className={cn('g-seen absolute right-1 bottom-1 z-2 inline-flex size-4 items-center justify-center rounded-full border border-(--seen) bg-(--seen) text-(--seen-foreground) shadow-mark [&_svg]:size-2.5', className)}>
      <window.CheckIcon/>
    </span>
  );
}
const BRAND_TEXT = 'text-(--brand-text)';

// The hero (H2 · Focus strip): the guide in focus, or, with nothing followed,
// the guide the promotion rules pick, shown not started. Left, what it is;
// right, its stops on a thread: seen ones dimmed with the seen mark, the next
// one larger with its call to action attached (Mark seen when followed,
// Start guide when not), and an event guide's destination last, dashed, with
// its date. A long guide shows the next stop with up to three on each side.
// Phones show four small posters beside it, the destination included (the
// one before the next stop, when there is one, then the ones after); three
// below 390px and two below 360px (Andre, 2026-11-16: only Loki and Doomsday read as sparse).
function GuidesHero({ guide, followed, onPick }) {
  const { statusOf, states, toggleSeen } = window.useCollection();
  useGuideSkips();
  const [said, setSaid] = React.useState('');
  const today = window.todayISO();
  const stops = MCU_GUIDE.stops(guide, false);
  const p = MCU_GUIDE.progress(guide, statusOf);
  const next = MCU_GUIDE.next(guide, false, statusOf);
  const at = next ? stops.findIndex(s => s.id === next.id) : -1;
  const from = at < 0 ? 0 : Math.max(0, at - 3);
  const shown = stops.slice(from, at < 0 ? 6 : at + 4);
  const coming = MCU_GUIDE.comingUp(today).find(x => x.guide.id === guide.id) || null;
  const target = guide.target ? MCU_GUIDE.title(guide.target) : null;
  const date = MCU_GUIDE.targetDate(guide);
  const kicker = coming
    ? [gtr('guide.group.coming'), date, gtr('guide.hero.daysLeft', { n: coming.days })].filter(Boolean).join(' · ')
    : followed ? gtr('guide.hero.following', { kind: guideType(guide) }) : guideType(guide);
  const name = MCU_GUIDE.name(guide);
  const mark = (t) => {
    const was = statusOf(t.id);
    toggleSeen(t.id);
    window.MCU_emitStatusChange({ title: t, from: was, to: was === 'seen' ? 'none' : 'seen', states });
  };
  const start = () => { MCU_GUIDE.follow(guide.id); setSaid(gtr('guide.followedSaid', { name })); };
  const pct = p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  const stopName = (s) => GI18N.titleName(s.title);
  // Phones: which small posters show (see above).
  const phoneShown = (() => {
    const ids = new Set(), midOut = new Set(), narrowOut = new Set();
    if (at < 0) { shown.slice(0, 4 - (target ? 1 : 0)).forEach(s => ids.add(s.id)); return { ids, midOut, narrowOut }; }
    let budget = 4 - (target ? 1 : 0);
    if (at > 0 && budget > 1) { ids.add(stops[at - 1].id); budget--; }
    const after = stops.slice(at + 1, at + 1 + budget);
    after.forEach(s => ids.add(s.id));
    // Narrower phones keep three, the narrowest two (the destination counts).
    const order = [...(at > 0 && ids.has(stops[at - 1].id) ? [stops[at - 1]] : []), ...after];
    const dest = target ? 1 : 0;
    order.slice(Math.max(0, 3 - dest)).forEach(s => midOut.add(s.id));
    order.slice(Math.max(0, 2 - dest)).forEach(s => narrowOut.add(s.id));
    return { ids, midOut, narrowOut };
  })();
  // Progress: under the blurb on desktop, under the strip on phones.
  const prog = (cls) => (
    <div className={cn('g-hero-prog flex items-center gap-3 text-label font-semibold text-muted-foreground tabular-nums', cls)}>
      {followed ? <>
        <span className="g-hero-bar h-1 w-[100px] overflow-hidden rounded-full bg-(--progress-track) in-[.app.touch]:flex-1" aria-hidden="true"><span className="block h-full rounded-full bg-(--progress)" style={{ width: pct + '%' }}/></span>
        <span aria-label={gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released })}>{gtr('guide.hero.stopsOf', { seen: p.ess.seen, n: p.ess.released })}{MCU_GUIDE.left(guide, statusOf) ? ' · ' + MCU_GUIDE.left(guide, statusOf) : ''}</span>
      </> : <span>{p.ess.seen ? gtr('guide.seenOf', { seen: p.ess.seen, n: p.ess.released }) : gtr('guide.hero.notStarted', { size: MCU_GUIDE.size(guide) })}</span>}
    </div>
  );
  return (
    <section className="g-hero relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8 overflow-hidden rounded-[14px] border bg-card p-11 text-card-foreground max-[1100px]:p-7 in-[.app.touch]:grid-cols-1 in-[.app.touch]:gap-4 in-[.app.touch]:p-4"
      aria-labelledby="g-hero-title"
      style={{ backgroundImage: 'linear-gradient(90deg, color-mix(in oklab, var(--brand) 22%, transparent) 0%, transparent 75%)' }}>
      <div className="g-hero-intro flex min-w-0 flex-col items-start gap-4 in-[.app.touch]:gap-2.5">
        <p className={cn('g-hero-kicker m-0 text-label font-semibold tracking-[.04em] uppercase', BRAND_TEXT)}>{kicker}</p>
        <h2 id="g-hero-title" className="m-0 max-w-[520px] text-display leading-[1.08] font-semibold tracking-tight text-foreground">
          <button type="button" className={cn('g-row g-hero-title cursor-pointer rounded-sm text-left', FOCUS)} onClick={() => onPick(guide.id)}>{name}</button>
        </h2>
        <p className="g-hero-blurb m-0 max-w-[480px] text-body leading-[1.45] text-muted-foreground in-[.app.touch]:hidden">{MCU_GUIDE.blurb(guide)}</p>
        {prog('in-[.app.touch]:hidden')}
        <Button variant="outline" className="g-hero-about h-[38px] px-3.5 text-label in-[.app.touch]:hidden" onClick={() => onPick(guide.id)}>{gtr('guide.about')}</Button>
      </div>
      <ol className="g-strip relative m-0 flex list-none items-center gap-3 p-0 in-[.app.touch]:gap-1.5" aria-label={gtr('guide.promoStops')}>
        <span aria-hidden="true" className="g-thread absolute inset-x-8 top-1/2 h-0.5 bg-border"/>
        {shown.map(s => {
          const seen = statusOf(s.id) === 'seen';
          if (next && s.id === next.id) {
            return (
              <li key={s.id} className="g-hstop next relative z-1 flex w-[124px] flex-none flex-col overflow-hidden rounded-lg border-2 border-(--brand) bg-card shadow-sm in-[.app.touch]:w-[100px]">
                <span className={cn(POSTER, 'h-[186px] w-full in-[.app.touch]:h-[150px]')}>
                  <window.PosterArt title={s.title}/>
                  <PosterYear title={s.title}/>
                  <span className="absolute top-1.5 right-1.5 z-2 rounded-full bg-primary px-[7px] py-0.5 text-tag font-semibold whitespace-nowrap text-primary-foreground">
                    {followed ? gtr('upnext.label') : gtr('guide.stopPill', { i: s.n })}
                  </span>
                </span>
                {/* One line, on phones too (Andre, 2026-11-16): there the
                    words alone, without the + or the check. */}
                <button type="button" className={cn('g-cta flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 bg-primary px-1 text-label font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary/90 focus-visible:ring-inset [&_svg]:size-[15px] [&_svg]:flex-none in-[.app.touch]:[&_svg]:hidden', FOCUS)}
                  onClick={followed ? () => mark(s.title) : start}
                  aria-label={followed ? gtr('status.markSeenAria', { title: stopName(s) }) : gtr('guide.startAria', { name })}>
                  {followed ? <window.CheckIcon/> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>}
                  {followed ? gtr('status.markSeen') : gtr('guide.start')}
                </button>
              </li>
            );
          }
          const far = !phoneShown.ids.has(s.id);
          return (
            <li key={s.id} className={cn('g-hstop relative z-1 flex-none', seen && 'seen', far && 'in-[.app.touch]:hidden', phoneShown.midOut.has(s.id) && 'max-[389px]:in-[.app.touch]:hidden', phoneShown.narrowOut.has(s.id) && 'max-[359px]:in-[.app.touch]:hidden')}
              aria-label={gtr(seen ? 'guide.promoStopSeenAria' : 'guide.promoStopAria', { title: stopName(s), i: s.n })}>
              <span className={cn(POSTER, 'h-24 w-16 rounded-md in-[.app.touch]:h-12 in-[.app.touch]:w-8', seen && '[&>:first-child]:opacity-45')}>
                <window.PosterArt title={s.title}/>
                <PosterYear title={s.title} className="in-[.app.touch]:hidden"/>
              </span>
              {seen && <PosterSeen className="in-[.app.touch]:right-0.5 in-[.app.touch]:bottom-0.5"/>}
            </li>
          );
        })}
        {target && (
          <li className="g-hstop dest relative z-1 flex-none" aria-label={gtr('guide.destLabel', { title: GI18N.titleName(target) }) + (date ? ' · ' + date : '')}>
            <span className={cn(POSTER, 'h-24 w-16 rounded-md border-[1.5px] border-dashed border-muted-foreground in-[.app.touch]:h-12 in-[.app.touch]:w-8 [&>:first-child]:opacity-60')}>
              <window.PosterArt title={target}/>
              {date && <span aria-hidden="true" className="absolute inset-x-1 bottom-1.5 z-2 rounded-full bg-black/60 px-1 py-0.5 text-center text-tag leading-[1.3] font-semibold whitespace-nowrap text-white/90 in-[.app.touch]:inset-x-0 in-[.app.touch]:bottom-0.5 in-[.app.touch]:text-card-micro">{date}</span>}
            </span>
          </li>
        )}
      </ol>
      {prog('hidden in-[.app.touch]:flex')}
      <span className="story-sr" aria-live="polite">{said}</span>
    </section>
  );
}

// A guide card: three posters with their years, the name, the size, then a
// fixed 28px status row (Andre, 2026-11-15: a progress bar only for a guide
// you follow). Followed: the bar and "5 of 7 · Following". Not followed: a
// quiet "2 of 6 seen" / "None seen yet" and "+ Follow". Every essential stop
// seen: "✓ All 10 seen", no button. The whole card opens the guide (its name
// is the button, stretched over the card); Follow sits above that.
function GuideCard({ guide, onPick, className = '' }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  useFollowedGuides();
  const followed = MCU_GUIDE.isFollowed(guide.id);
  const p = MCU_GUIDE.progress(guide, statusOf);
  const name = MCU_GUIDE.name(guide);
  const posters = MCU_GUIDE.stops(guide, false).slice(0, 3);
  const pct = p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  const [said, setSaid] = React.useState('');
  return (
    <article className={cn('g-gcard @container/gcard relative flex flex-col gap-2.5 rounded-[14px] border bg-card p-3 text-card-foreground shadow-xs transition-colors hover:bg-muted/40', followed && 'followed', p.complete && 'done', className)}>
      {/* A narrow card's posters are too small for their years. */}
      <div className="g-card-posters grid grid-cols-3 gap-2 @max-[180px]/gcard:gap-1.5 @max-[180px]/gcard:[&_.g-year]:hidden" aria-hidden="true">
        {posters.map(s => (
          <span key={s.id} className={cn(POSTER, 'aspect-[2/3] rounded-md')}>
            <window.PosterArt title={s.title}/>
            <PosterYear title={s.title}/>
          </span>
        ))}
      </div>
      {/* The name and size line follow the size steps (Notion "Size steps 2/3"). */}
      <h3 className="m-0 text-(length:--step-title) leading-[1.35] font-semibold text-foreground">
        <button type="button" className="g-row g-card-open cursor-pointer text-left outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:ring-3 focus-visible:after:ring-ring/50" onClick={() => onPick(guide.id)}>{name}</button>
      </h3>
      <p className="g-card-size m-0 -mt-1 text-(length:--step-meta) text-muted-foreground">{MCU_GUIDE.size(guide)}</p>
      {/* A narrow card (two a row on a phone) stacks the row: the bar or the
          count on its own line, then the label or Follow. */}
      <div className="g-card-status mt-auto flex h-7 items-center gap-2.5 text-label text-muted-foreground tabular-nums @max-[180px]/gcard:h-auto @max-[180px]/gcard:min-h-7 @max-[180px]/gcard:flex-wrap @max-[180px]/gcard:gap-y-2">
        {p.complete ? (
          <span className="inline-flex items-center gap-1.5 [&_svg]:size-3"><window.CheckIcon/>{gtr('guide.card.allSeen', { n: p.ess.released })}</span>
        ) : followed ? <>
          <span className="g-card-bar h-1 flex-1 overflow-hidden rounded-full bg-(--progress-track) @max-[180px]/gcard:basis-full" aria-hidden="true"><span className="block h-full rounded-full bg-(--progress)" style={{ width: pct + '%' }}/></span>
          <span className="whitespace-nowrap" aria-label={gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released }) + ' · ' + gtr('guide.following')}>
            {/* Narrow: the count alone (the bar already says it is followed). */}
            <span className="@max-[180px]/gcard:hidden" aria-hidden="true">{gtr('guide.card.following', { seen: p.ess.seen, n: p.ess.released })}</span>
            <span className="hidden @max-[180px]/gcard:inline" aria-hidden="true">{gtr('guide.seenOf', { seen: p.ess.seen, n: p.ess.released })}</span>
          </span>
        </> : <>
          <span className="truncate @max-[180px]/gcard:basis-full">{p.ess.seen ? gtr('guide.seenOf', { seen: p.ess.seen, n: p.ess.released }) : gtr('guide.card.noneSeen')}</span>
          <span className="flex-1"/>
          <Button variant="outline" size="sm" className="g-follow relative z-2 h-7 gap-1 rounded-full px-2.5 text-label font-semibold in-[.app.touch]:h-9 in-[.app.touch]:px-3 [&_svg]:size-3"
            aria-label={gtr('guide.followAria', { name })}
            onClick={() => { MCU_GUIDE.follow(guide.id); setSaid(gtr('guide.followedSaid', { name })); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            {gtr('guide.follow')}
          </Button>
        </>}
      </div>
      <span className="story-sr" aria-live="polite">{said}</span>
    </article>
  );
}

// A shelf's ‹ › (desktop): scrolls the row by a view.
function shelfArrow(row, dir, label) {
  const scroll = () => {
    const el = row.current;
    if (!el) return;
    const still = window.MCU_MOTION && window.MCU_MOTION.reduced();
    el.scrollBy({ left: dir * el.clientWidth, behavior: still ? 'auto' : 'smooth' });
  };
  return (
    <Button key={dir} variant="outline" size="icon" className="g-shelf-arrow size-7 rounded-full p-0 in-[.app.touch]:hidden [&_svg]:size-3.5" aria-label={label} onClick={scroll}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir < 0 ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'}/></svg>
    </Button>
  );
}

// The Continue shelf (Guides 2/4; Figma 31:424, phone 31:777): right under
// the hero, the followed guides other than the one in the hero, the most
// recent activity first, finished ones left out. Each card: the kicker
// ("Following · Character"), the name, the next stop ("Stop 6 of 7: …"),
// progress, "Open guide →", and the next poster with Mark seen attached (the
// hero's object; "Seen" on phones). "Manage" opens the guide switcher's list.
// Hidden when nothing else is followed. Hooks: `g-continue`, `g-ccard`,
// `g-ccard-open`, `g-cta`, `g-manage`.
function ContinueCard({ guide, onPick }) {
  const { statusOf, states, toggleSeen } = window.useCollection();
  const p = MCU_GUIDE.progress(guide, statusOf);
  const next = MCU_GUIDE.next(guide, false, statusOf);
  const total = MCU_GUIDE.stops(guide, false).length;
  const name = MCU_GUIDE.name(guide);
  const pct = p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  const mark = (t) => {
    const was = statusOf(t.id);
    toggleSeen(t.id);
    window.MCU_emitStatusChange({ title: t, from: was, to: was === 'seen' ? 'none' : 'seen', states });
  };
  return (
    <article className="g-ccard relative flex min-h-[176px] items-stretch gap-4 rounded-[14px] border bg-card p-4 pr-3 text-card-foreground shadow-xs transition-colors hover:bg-muted/40 in-[.app.touch]:min-h-0 in-[.app.touch]:gap-3 in-[.app.touch]:p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <p className="m-0 text-label font-semibold tracking-[.04em] text-muted-foreground uppercase">{gtr('guide.hero.following', { kind: guideType(guide) })}</p>
        <h3 className="m-0 text-title leading-[1.2] font-semibold tracking-tight text-foreground">
          <button type="button" className="g-row g-ccard-open cursor-pointer text-left outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:ring-3 focus-visible:after:ring-ring/50" onClick={() => onPick(guide.id)}>{name}</button>
        </h3>
        {next && <p className="m-0 line-clamp-2 text-body leading-[1.4] text-muted-foreground">{gtr('guide.continue.stop', { i: next.n, n: total, title: GI18N.titleName(next.title) })}</p>}
        <span className="flex-1"/>
        <div className="mt-2 flex items-center gap-3 text-label text-muted-foreground tabular-nums">
          <span className="g-card-bar h-1 flex-1 overflow-hidden rounded-full bg-(--progress-track)" aria-hidden="true"><span className="block h-full rounded-full bg-(--progress)" style={{ width: pct + '%' }}/></span>
          <span className="whitespace-nowrap" aria-label={gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released })}>{gtr('guide.hero.stopsOf', { seen: p.ess.seen, n: p.ess.released })}{MCU_GUIDE.left(guide, statusOf) ? ' · ' + MCU_GUIDE.left(guide, statusOf) : ''}</span>
        </div>
        <span className="mt-1.5 text-label font-medium text-foreground in-[.app.touch]:hidden" aria-hidden="true">{gtr('guide.continue.open')}</span>
      </div>
      {next && (
        <div className="g-hstop next relative z-2 flex w-[104px] flex-none flex-col self-start overflow-hidden rounded-lg border-2 border-(--brand) bg-card shadow-sm in-[.app.touch]:w-[84px]">
          <span className={cn(POSTER, 'aspect-[2/3] w-full')}>
            <window.PosterArt title={next.title}/>
            <PosterYear title={next.title} className="in-[.app.touch]:hidden"/>
            <span className="absolute top-1 right-1 z-2 rounded-full bg-primary px-1.5 py-px text-tag font-semibold whitespace-nowrap text-primary-foreground">{gtr('upnext.label')}</span>
          </span>
          <button type="button" className={cn('g-cta flex h-9 w-full cursor-pointer items-center justify-center gap-1 bg-primary text-label font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-inset [&_svg]:size-3.5', FOCUS)}
            onClick={() => mark(next.title)} aria-label={gtr('status.markSeenAria', { title: GI18N.titleName(next.title) })}>
            <window.CheckIcon/>
            <span className="in-[.app.touch]:hidden">{gtr('status.markSeen')}</span>
            <span className="hidden in-[.app.touch]:inline">{gtr('guide.continue.seen')}</span>
          </button>
        </div>
      )}
    </article>
  );
}
function ManageFollowed({ phone, onPick }) {
  const [open, setOpen] = React.useState(false);
  const pick = (id) => { setOpen(false); onPick(id); };
  const btn = 'g-manage h-7 px-2 text-label font-medium text-muted-foreground hover:text-foreground';
  if (phone) {
    const Sheet = window.Sheet;
    return <>
      <Button variant="ghost" size="sm" className={btn} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{gtr('guide.continue.manage')}</Button>
      {open && <Sheet onClose={() => setOpen(false)} label={gtr('guide.switchTitle')}>
        <div className="g-switch-sheet -mx-2"><GuideSwitchList currentId={null} onPick={pick} onAll={() => setOpen(false)}/></div>
      </Sheet>}
    </>;
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), btn)}>{gtr('guide.continue.manage')}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} aria-label={gtr('guide.switchTitle')}
        className="g-pop g-switch-pop max-h-[min(560px,calc(100vh-160px))] w-[380px] gap-0 overflow-y-auto p-1.5">
        <GuideSwitchList currentId={null} onPick={pick} onAll={() => setOpen(false)}/>
      </PopoverContent>
    </Popover>
  );
}
function ContinueShelf({ heroId, onPick, phone }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  useFollowedGuides();
  const list = MCU_GUIDE.followed().map(MCU_GUIDE.get)
    .filter(g => g && g.id !== heroId && !MCU_GUIDE.finished(g, statusOf) && MCU_GUIDE.next(g, false, statusOf));
  const row = React.useRef(null);
  if (!list.length) return null;
  return (
    <section className="g-shelf g-continue flex flex-col gap-3.5" aria-labelledby="g-shelf-continue">
      <div className="g-shelf-head flex items-center gap-2.5">
        <h2 id="g-shelf-continue" className="m-0 text-label font-semibold tracking-[.04em] text-muted-foreground uppercase">{gtr('guide.continue.title')}</h2>
        <span className="text-label text-muted-foreground">{gtr('guide.continue.count', { n: list.length })}</span>
        <span className="flex-1"/>
        <ManageFollowed phone={phone} onPick={onPick}/>
        {list.length > 2 && <>{shelfArrow(row, -1, gtr('guide.shelf.prev'))}{shelfArrow(row, 1, gtr('guide.shelf.next'))}</>}
      </div>
      <div ref={row} className="g-shelf-row flex snap-x snap-mandatory gap-(--grid-gutter) overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden in-[.app.touch]:-mx-3.5 in-[.app.touch]:gap-3 in-[.app.touch]:scroll-px-3.5 in-[.app.touch]:px-3.5">
        {list.map(g => (
          <div key={g.id} className="w-[calc((100%-var(--grid-gutter))/2)] flex-none snap-start max-[700px]:w-full in-[.app.touch]:w-[min(84vw,320px)]">
            <ContinueCard guide={g} onPick={onPick}/>
          </div>
        ))}
      </div>
    </section>
  );
}

// A shelf: its name, and with more than 4 guides "See all" and ‹ › (desktop).
// The row scrolls sideways, 4 cards to a view on desktop and with the next
// card peeking on phones; "See all" lays the whole shelf out as a grid.
function GuideShelf({ shelf, onPick }) {
  const row = React.useRef(null);
  const [all, setAll] = React.useState(false);
  const many = shelf.items.length > 4;
  const id = 'g-shelf-' + shelf.key;
  const arrow = (dir, label) => shelfArrow(row, dir, label);
  return (
    <section className="g-shelf flex flex-col gap-3.5" aria-labelledby={id}>
      <div className="g-shelf-head flex items-center gap-2.5">
        <h2 id={id} className="m-0 text-label font-semibold tracking-[.04em] text-muted-foreground uppercase">{shelfLabel(shelf.key)}</h2>
        <span className="flex-1"/>
        {many && <Button variant="ghost" size="sm" className="g-shelf-all h-7 px-2 text-label font-medium text-muted-foreground hover:text-foreground" aria-expanded={all} onClick={() => setAll(!all)}>{gtr(all ? 'guide.shelf.seeLess' : 'guide.shelf.seeAll')}</Button>}
        {many && !all && <>{arrow(-1, gtr('guide.shelf.prev'))}{arrow(1, gtr('guide.shelf.next'))}</>}
      </div>
      <div ref={row} className={cn('g-shelf-row',
        // Phones: two a row, one under 360px (Andre, 2026-11-16: three across
        // squeezed the names and pushed Follow out of the card). The width
        // steps come after max-[900px], so they win on a narrow screen.
        all ? 'grid grid-cols-4 gap-(--grid-gutter) max-[900px]:grid-cols-3 max-[600px]:grid-cols-2 max-[359px]:grid-cols-1 in-[.app.touch]:gap-3'
          : 'flex snap-x snap-mandatory gap-(--grid-gutter) overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden in-[.app.touch]:-mx-3.5 in-[.app.touch]:gap-3 in-[.app.touch]:scroll-px-3.5 in-[.app.touch]:px-3.5')}>
        {shelf.items.map(g => (
          <GuideCard key={g.id} guide={g} onPick={onPick}
            className={all ? '' : 'w-[calc((100%-3*var(--grid-gutter))/4)] flex-none snap-start in-[.app.touch]:w-[min(64vw,240px)]'}/>
        ))}
      </div>
    </section>
  );
}

// `inMain`: phones render the page inside their own main area, so it is a
// region there rather than a second main landmark. "‹ Guides" from an open
// guide comes back to where the list was scrolled (for the visit).
let guidesPageScroll = 0;
function GuidesPage({ onPick, inMain = false }) {
  window.useI18n();
  const pageRef = React.useRef(null);
  // Restored on mount; kept as it scrolls (a detached element reads 0).
  React.useLayoutEffect(() => {
    if (pageRef.current) pageRef.current.scrollTop = guidesPageScroll;
  }, []);
  const { statusOf } = window.useCollection();
  useGuideSkips();
  useFollowedGuides();
  const today = window.todayISO();
  const hero = MCU_GUIDE.focus(statusOf, today) || MCU_GUIDE.heroPick(statusOf, today);
  const shelves = guideShelves(hero ? hero.id : null);
  return (
    <div ref={pageRef} onScroll={(e) => { guidesPageScroll = e.currentTarget.scrollTop; }} className="g-page @container min-h-0 flex-1 overflow-y-auto px-(--grid-margin) pt-8 pb-[72px] in-[.app.touch]:px-3.5 in-[.app.touch]:pt-4 in-[.app.touch]:pb-6" role={inMain ? 'region' : 'main'} aria-labelledby="g-page-title">
      <div className="step-sizes mx-auto flex max-w-(--content-max) flex-col gap-11 in-[.app.touch]:gap-7">
        <h1 id="g-page-title" className="story-sr">{gtr('guide.menuTitle')}</h1>
        {hero && <GuidesHero guide={hero} followed={MCU_GUIDE.isFollowed(hero.id)} onPick={onPick}/>}
        <ContinueShelf heroId={hero ? hero.id : null} onPick={onPick} phone={inMain}/>
        {shelves.map(sh => <GuideShelf key={sh.key} shelf={sh} onPick={onPick}/>)}
      </div>
    </div>
  );
}

// The guide's meter: the shared ProgressHeader over its essential stops, with
// the optional count beside it while optional stops are shown.
// In the List and Grid it also offers "Mark N more seen" for the stops shown
// (the bulk action, with its Undo and its confirmation above 20).
const OPT_COUNT = 'g-opt-count flex-none pb-[7px] text-label font-medium tabular-nums text-muted-foreground in-[.spatial-overall]:pb-0';
function GuideMeter({ guide, includeOptional, className = '', bulk = false }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  const p = MCU_GUIDE.progress(guide, statusOf);
  // "Mark N more seen" leaves skipped stops alone.
  const ids = MCU_GUIDE.stops(guide, includeOptional).filter(s => !MCU_GUIDE.skippedNow(guide, s.id, statusOf)).map(s => s.id);
  const action = bulk && window.BulkHeaderAction ? <window.BulkHeaderAction ids={ids} group={MCU_GUIDE.name(guide)}/> : null;
  const skipped = p.ess.skipped + (includeOptional ? p.opt.skipped : 0);
  return (
    <div className={cn('g-meter flex flex-wrap items-end gap-3 [&_.pgh]:min-w-0 [&_.pgh]:flex-1 [&_.pgh-label]:text-label [&_.pgh-label]:font-medium [&_.pgh-label]:text-muted-foreground', p.complete && 'done [--pm:var(--seen)]', className)}>
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
function GuideSegments({ guide, statusOf, done = false, currentId = null, onJump = null }) {
  // One segment per essential stop that counts (released, not skipped), in
  // order: seen ones red, as in every other meter (green once the guide is
  // complete), the rest the plain track. Andre, 2026-11-16: the dark dashes
  // with an outlined next one read as a different kind of meter.
  const segs = MCU_GUIDE.stops(guide, false)
    .filter(s => window.MCU_isReleased(s.title) && !MCU_GUIDE.skippedNow(guide, s.id, statusOf))
    .map(s => {
      const on = statusOf(s.id) === 'seen';
      // The stop the stepper is on gets a quiet gray outline (Andre,
      // 2026-11-16), so stepping shows where you are on the bar.
      const bar = <i key={s.id} className={cn(B.W_SEG_BAR, !onJump && 'flex-1',
        done ? 'bg-(--progress-done)' : on ? 'on bg-(--progress)' : 'bg-(--progress-track)',
        currentId === s.id && 'cur outline-1 outline-offset-2 outline-muted-foreground/70')}/>;
      // A dash pressed steps straight to its stop (B.W_SEG).
      return onJump
        ? <button key={s.id} type="button" tabIndex={-1} aria-hidden="true" className={B.W_SEG} title={GI18N.titleName(s.title)} onClick={() => onJump(s.id)}>{bar}</button>
        : bar;
    });
  return <span className={cn('gm-segs', B.W_SEGS)} aria-hidden="true">{segs}</span>;
}

// The open guide's card on Connections, the same on desktop (top right) and
// phones (the dock at the bottom), laid out like the All titles card (B.W_*,
// Andre 2026-11-16): the next stop's poster, "Before Doomsday · 3/5" over its
// name, × in the corner; under them the progress with ‹ › at its end, the
// stop the stepper is on outlined. The poster and name open the stop's
// details, where it is marked seen (no ✓ in the card). On desktop the
// guide's name opens its page. A finished guide says what it was for.
// The card follows the stepper (Andre, 2026-11-16): while you step it shows
// the stop you are on ("Before Doomsday · Stop 2 of 5"), so the outlined
// dash, the card and the details name the same title; at rest it shows the
// next stop not yet seen ("Before Doomsday · Next"). The seen count is the
// bar's (its label says it for screen readers).
function GuideWidget({ guide, p, next, current = null, stepIndex = -1, currentId = null, pos, stepCount, onOpenPage = null, onOpenNext, onPrev, onNext, onJump = null, onClose }) {
  const { statusOf } = window.useCollection();
  const complete = p.complete;
  const date = MCU_GUIDE.targetDate(guide);
  const doneLine = date ? gtr('guide.pillDoneDate', { date }) : gtr('guide.complete');
  const name = MCU_GUIDE.short(guide);
  const stepping = !!current && stepIndex >= 0;
  const shown = stepping ? current : next;
  const where = stepping
    ? (stepIndex >= stepCount ? gtr('guide.destPos') : gtr('guide.stepOf', { i: stepIndex + 1, n: stepCount }))
    : next ? gtr('guide.dockNextTag') : null;
  const count = <>{where && <span className={cn('gm-where', stepping ? 'text-foreground' : '')}>{where}</span>}<span className="gm-count g-dock-count story-sr">{p.ess.seen}/{p.ess.released}</span></>;
  const open = () => shown && onOpenNext && onOpenNext(shown.id);
  return (
    <>
      <div className={cn(B.W_ROW, 'gm-next')}>
        {shown
          ? <button type="button" tabIndex={-1} aria-hidden="true" className={cn('gm-nthumb g-dock-poster cursor-pointer', B.W_POSTER, THUMB)} onClick={open}><window.PosterArt title={shown}/></button>
          : <GuideArt guide={guide} size={36} round/>}
        <div className={B.W_TEXT}>
          <span className={cn(B.W_KICKER, 'flex min-w-0 items-baseline gap-1')}>
            {onOpenPage
              ? <button type="button" className={cn('gm-page g-dock-name min-w-0 cursor-pointer truncate rounded-sm text-left hover:text-foreground', FOCUS)}
                  onClick={onOpenPage} aria-label={gtr('guide.openPageAria', { name: MCU_GUIDE.name(guide) })}>{name}</button>
              : <span className="g-dock-name min-w-0 truncate">{name}</span>}
            {where && <span aria-hidden="true">·</span>}
            <span className="flex-none whitespace-nowrap">{count}</span>
          </span>
          {shown
            ? <button type="button" className={cn(B.W_TITLE, 'gm-nextopen g-dock-next cursor-pointer self-start rounded-sm text-left', FOCUS)} onClick={open}
                aria-label={gtr('guide.openNextAria', { title: GI18N.titleName(shown) })}><span className="gm-ntitle">{GI18N.titleName(shown)}</span></button>
            : <span className={cn(B.W_TITLE, 'gm-doneline g-dock-sub', complete ? 'text-(--seen-text)' : 'text-muted-foreground')}>{complete ? doneLine : MCU_GUIDE.size(guide)}</span>}
        </div>
        <button type="button" className={B.W_CLOSE} aria-label={gtr('guide.close')} title={gtr('guide.close')} onClick={onClose}>×</button>
      </div>
      <div className={B.W_FOOT}>
        {/* One spoken line; the dashes are press targets, so the meter
            can't be one image (nested controls). */}
        <span className="gm-meter g-dock-meter min-w-0 flex-1">
          <span className="story-sr">{gtr('guide.partSeen', { seen: p.ess.seen, n: p.ess.released })}</span>
          <GuideSegments guide={guide} statusOf={statusOf} done={complete} currentId={currentId} onJump={onJump}/>
        </span>
        <div className={B.W_STEP}>
          <button type="button" className={B.W_STEP_BTN} onClick={onPrev} aria-label={gtr('guide.prev')} disabled={!stepCount}>‹</button>
          <span className="cb-pos story-sr" aria-live="polite">{pos}</span>
          <button type="button" className={B.W_STEP_BTN} onClick={onNext} aria-label={gtr('guide.next')} disabled={!stepCount}>›</button>
        </div>
      </div>
    </>
  );
}

function GuideModule({ guide, layout = 'list', includeOptional, setIncludeOptional, stepIndex, stepCount, currentId = null, onOpenNext, onSeenNext, onOpenPage, onPrev, onNext, onJump = null, onClose }) {
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
    : gtr('guide.stops', { n: stepCount }) + (!spatial && MCU_GUIDE.left(guide, statusOf) ? ' · ' + MCU_GUIDE.left(guide, statusOf) : '');
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
    complete && 'done border-(--seen-border) bg-(--seen-tint) [--char-color:var(--seen)] [--gm-line:var(--seen-line)]',
    spatial
      ? 'spatial absolute top-3 right-(--grid-margin) left-(--grid-margin) z-40 flex cursor-default items-center gap-3 bg-(--veil) py-2 pr-2 pl-2.5 shadow-float in-[.app:not(.touch).drawer-open]:right-[calc(var(--drawer-w)+var(--grid-margin))]'
      : 'list mx-auto mb-2.5 max-w-(--list-max)');
  // Seen only, labelled (Watchlist stays on the row); on a complete guide's
  // destination, Watchlist only.
  const tsaCls = (watch) => cn('gm-tsa m-0 flex-none flex-nowrap [&_.tsa-btn]:font-semibold [&_.tsa-btn:not(.on)]:text-foreground',
    spatial ? '[&_.tsa-btn]:min-h-[max(34px,2.125rem)]' : '[&_.tsa-btn]:min-h-[max(36px,2.25rem)]',
    watch ? 'gm-watch [&_.tsa-btn.watch:not(.on)_svg]:text-(--status-watch)' : '[&_.tsa-btn.seen:not(.on)_svg]:text-(--seen) [&_.tsa-btn.watch]:hidden');
  const thumb = (big) => cn('gm-nthumb', THUMB, big ? 'big h-12 w-8 flex-[0_0_32px] rounded-[5px]' : 'h-9 w-6 flex-[0_0_24px] rounded-[4px]');
  const meterCls = cn('gm-meter flex flex-col gap-1.5 text-label font-medium', complete ? 'text-(--seen-text)' : 'text-muted-foreground',
    spatial && 'w-[170px] flex-[0_0_170px] gap-[5px] max-[1180px]:w-[120px] max-[1180px]:basis-[120px]');
  const ntag = (done) => cn('gm-ntag text-label font-medium', done ? 'done text-(--seen-text)' : 'text-muted-foreground');
  const region = gtr('guide.regionAria', { name: MCU_GUIDE.name(guide) });
  // Clicks and drags on the floating row never reach the canvas behind it.
  const stop = (e) => e.stopPropagation();

  if (spatial) {
    // Option A (Notion "Desktop guide bar on Connections", Andre 2026-11-16):
    // the guide takes the All titles card's place, top right, in the same
    // card (GuideWidget). Clicks and drags never reach the canvas behind it.
    return (
      <section aria-label={region} onMouseDown={stop} onClick={stop} onWheel={stop}
        className={cn('guide-banner g-module spatial absolute top-3.5 right-4 z-40 w-[340px] max-w-[calc(100%-32px)] cursor-default', B.WIDGET,
          'in-[.app:not(.touch).drawer-open]:right-[calc(var(--drawer-w)+16px)]', complete && 'done border-(--seen-border)')}>
        <GuideWidget guide={guide} p={p} next={next ? next.title : null} currentId={currentId} pos={pos} stepCount={stepCount}
          stepIndex={stepIndex} current={currentId ? window.TITLES.find(t => t.id === currentId) || null : null}
          onOpenPage={onOpenPage} onOpenNext={onOpenNext} onPrev={onPrev} onNext={onNext} onJump={onJump} onClose={onClose}/>
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
            <div className={cn('gm-kind text-label font-medium [&>span]:text-muted-foreground', complete ? 'done text-(--seen-text)' : 'text-foreground')}>{complete ? gtr('guide.complete') : MCU_GUIDE.kind(guide)} <span>· {sub.join(' · ')}</span></div>
            <h2 className="gm-name mt-[5px] text-title leading-[1.25] font-bold">{MCU_GUIDE.name(guide)}</h2>
            <p className={cn('gm-blurb mt-1.5 line-clamp-2 text-body leading-normal', DIM)}>{MCU_GUIDE.blurb(guide)}</p>
          </div>
        </div>
        <div className="gm-where flex min-w-0 flex-col justify-center gap-3 border-l border-(--gm-line) px-5 py-4 max-[1100px]:border-t max-[1100px]:border-l-0">
          <div className={meterCls}>
            <span className="story-sr">{meterLabel}</span>
            <span className="gm-mtop flex items-center gap-2.5" aria-hidden="true">
              <span className="gm-mlabel min-w-0 flex-1 truncate">{complete ? (done || gtr('guide.complete')).replace(/\.$/, '') : MCU_GUIDE.short(guide)}</span>
              {complete
                ? <span className="gm-check inline-flex size-4 flex-[0_0_16px] items-center justify-center rounded-full bg-(--seen) text-(--seen-foreground) [&_svg]:size-2.5" aria-hidden="true"><window.CheckIcon/></span>
                : <span className={cn('gm-count tabular-nums text-foreground', XS)}>{p.ess.seen}/{p.ess.released}</span>}
            </span>
            <GuideSegments guide={guide} statusOf={statusOf} done={complete} currentId={currentId} onJump={onJump}/>
            {notes.length > 0 && <span className={cn('gm-notes font-medium text-muted-foreground', XS)} aria-hidden="true">{notes.join(' · ')}</span>}
          </div>
          {next ? (
            <div className="gm-nextrow flex min-w-0 items-center gap-[11px]">
              <span className={thumb(true)}><PosterArt title={next.title}/></span>
              <span className="gm-ntext flex min-w-0 flex-1 flex-col">
                <span className={ntag(false)}>{nextTag}</span>
                <span className="gm-ntitle mt-0.5 truncate text-heading font-bold">{GI18N.titleName(next.title)}</span>
                <span className={cn('gm-nmeta mt-0.5 tabular-nums text-muted-foreground', XS)}>{gtr(next.title.type === 'film' ? 'type.film.one' : 'type.series.one')} · {next.title.year}</span>
              </span>
              <window.TitleStatusActions title={next.title} variant="inline" className={tsaCls(false)}/>
              <button type="button" className={cn(buttonVariants(), 'gm-open h-[max(36px,2.25rem)] flex-none px-3 text-label font-bold whitespace-nowrap')} onClick={() => onOpenNext && onOpenNext(next.id)}
                aria-label={gtr('guide.openNextAria', { title: GI18N.titleName(next.title) })}>{gtr('guide.open')} ›</button>
            </div>
          ) : complete && target ? (
            <div className="gm-nextrow flex min-w-0 items-center gap-[11px]">
              <span className={thumb(true)}><PosterArt title={target}/></span>
              <span className="gm-ntext flex min-w-0 flex-1 flex-col">
                <span className={ntag(true)}>{gtr('guide.completeLeads')}</span>
                <span className="gm-ntitle mt-0.5 truncate text-heading font-bold">{GI18N.titleName(target)}</span>
                <window.ReleaseLine title={target} className={cn('gm-nmeta mt-0.5 flex items-center gap-1.5', XS, DIM)}/>
              </span>
              <window.TitleStatusActions title={target} variant="inline" className={tsaCls(true)}/>
            </div>
          ) : complete ? (
            <p className="gm-ready text-body text-(--seen-text)">{gtr('guide.allEssentialSeen')}</p>
          ) : null}
        </div>
      </div>
      <div className="gm-foot flex items-center gap-2.5 border-t border-(--gm-line) py-2 pr-2.5 pl-5 [&_.pgh-action]:h-[max(34px,2.125rem)]">
        {nOpt > 0 && (
          // shadcn's Switch look over a native checkbox (role="switch").
          <label className="g-optcheck gm-switch relative inline-flex min-h-[max(36px,2.25rem)] cursor-pointer items-center gap-2 text-body whitespace-nowrap text-muted-foreground">
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
// progress, next stop and stepper"), in every view. It replaces the All
// titles card and the old pill, and is the same card as the desktop guide's
// (GuideWidget, Andre 2026-11-16). Once complete it turns green and says what
// the guide was for.
function GuidePill({ guide, stepIndex, stepCount, current, next, onOpenNext, onSeenNext, onPrev, onNext, onJump = null, onClose }) {
  const { statusOf } = window.useCollection();
  window.useI18n();
  useGuideSkips();
  const p = MCU_GUIDE.progress(guide, statusOf);
  const showNext = !p.complete && next ? next : null;
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
  const pos = stepIndex >= stepCount
    ? gtr('guide.destLabel', { title: current ? GI18N.titleName(current) : '' })
    : stepIndex >= 0
    ? gtr('guide.stepLabel', { i: stepIndex + 1, title: current ? GI18N.titleName(current) : '' })
    : `${stepCount} ${gtr('guide.stopsWord', { n: stepCount })}`;
  return (
    <div ref={dockRef} className={cn(B.PILL, 'guide-pill g-dock', p.complete && 'done [--char-color:var(--seen)]')} role="group" aria-label={gtr('guide.regionAria', { name: MCU_GUIDE.name(guide) })}>
      {/* Outside the canvas, so the blur is allowed. */}
      <div className={cn('g-dock-card', B.WIDGET, 'in-[.g-dock.done]:border-(--seen-border)')}>
        <GuideWidget guide={guide} p={p} next={showNext} currentId={current ? current.id : null} pos={pos} stepCount={stepCount}
          stepIndex={stepIndex} current={current}
          onOpenNext={onOpenNext} onPrev={onPrev} onNext={onNext} onJump={onJump} onClose={onClose}/>
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
const FP_SKIP = 'absolute top-[7px] right-[83px] z-3 has-[.g-unskip]:right-[7px] [&_.g-skip]:size-[max(32px,2rem)] [&_.g-skip]:basis-8 [&_.g-skip]:bg-(--veil) [&_.g-unskip]:min-h-[max(32px,2rem)] [&_.g-unskip]:bg-(--veil)';
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
    <div className={cn('g-dskip mt-2.5 flex items-center gap-2.5 text-label', DIM)} ref={ref}>
      {skipped ? <>
        <span className="g-dskip-note">{gtr('guide.skippedInGuide')}</span>
        <button type="button" className={cn(UNSKIP, 'in-[.app.touch]:min-h-[max(40px,2.5rem)]')} aria-label={gtr('guide.unskipAria', { title: name })} onClick={() => set(false)}>{gtr('guide.unskip')}</button>
      </> : (
        <button type="button" className={cn('g-dskip-btn min-h-[max(32px,2rem)] gap-[7px] px-3 text-body in-[.app.touch]:min-h-[max(40px,2.5rem)]', OUTLINE_BTN, FOCUS)} aria-label={gtr('guide.skipAria', { title: name })} onClick={() => set(true)}>
          <SkipIcon/>{gtr('guide.skipInGuide')}
        </button>
      )}
      <span className="story-sr" aria-live="polite">{said}</span>
    </div>
  );
}


// Skip and Unskip for one stop. Skip is an icon button beside Seen and
// Watchlist on desktop, under the stop's number in the phone List; Unskip is
// a text button in the minimized row. Focus follows to the other button, since the one pressed goes.
function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>
    </svg>
  );
}
const UNSKIP = cn('g-unskip min-h-[max(32px,2rem)] px-3 text-body', OUTLINE_BTN, FOCUS);
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

// The title switcher's list (Notion "Guides 3/4"): the guides you follow
// (with progress, and the days left for an event guide), then the others,
// then "All guides" (back to the list). A check marks the open guide. A
// dropdown under the title on desktop, a bottom sheet on phones.
function GuideSwitchList({ currentId, onPick, onAll }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  useFollowedGuides();
  const today = window.todayISO();
  const followed = MCU_GUIDE.followed().map(MCU_GUIDE.get).filter(Boolean);
  const others = MCU_GUIDE.all().filter(g => followed.indexOf(g) === -1)
    .sort((a, b) => MCU_GUIDE.menuOrder(a) - MCU_GUIDE.menuOrder(b));
  const status = (g, isFollowed) => {
    const p = MCU_GUIDE.progress(g, statusOf);
    if (p.complete) return gtr('guide.card.allSeen', { n: p.ess.released });
    if (!isFollowed && !p.ess.seen) return MCU_GUIDE.size(g);
    const coming = isFollowed ? MCU_GUIDE.comingUp(today).find(x => x.guide.id === g.id) : null;
    return [gtr('guide.stepShort', { i: p.ess.seen, n: p.ess.released }), coming && `${coming.days} ${gtr('guide.promoDays', { n: coming.days })}`].filter(Boolean).join(' · ');
  };
  const item = (g, isFollowed) => {
    const on = g.id === currentId;
    return (
      <button key={g.id} type="button" aria-current={on ? 'true' : undefined} onClick={() => onPick(g.id)}
        className={cn('g-sw-item flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-body hover:bg-accent hover:text-accent-foreground', FOCUS, on && 'on bg-muted font-semibold')}>
        <span className="inline-flex w-4 flex-none justify-center [&_svg]:size-3.5" aria-hidden="true">{on && <window.CheckIcon/>}</span>
        <span className="min-w-0 flex-1 truncate" title={MCU_GUIDE.name(g)}>{MCU_GUIDE.short(g)}</span>
        <span className="flex-none text-label font-normal text-muted-foreground tabular-nums">{status(g, isFollowed)}</span>
      </button>
    );
  };
  const head = (label) => <h3 className="m-0 px-3 pt-3 pb-1.5 text-label font-semibold tracking-[.04em] text-muted-foreground uppercase">{label}</h3>;
  return (
    <div className="g-switch-list flex flex-col">
      {followed.length > 0 && <section aria-label={gtr('guide.following')}>{head(gtr('guide.following'))}{followed.map(g => item(g, true))}</section>}
      {others.length > 0 && <section aria-label={gtr('guide.shelf.more')} className={cn(followed.length > 0 && 'mt-1 border-t pt-1')}>{head(gtr('guide.shelf.more'))}{others.map(g => item(g, false))}</section>}
      <div className="mt-1 border-t pt-1">
        <button type="button" onClick={onAll} className={cn('g-sw-all flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-body hover:bg-accent hover:text-accent-foreground', FOCUS)}>
          <span className="w-4 flex-none" aria-hidden="true"/>{gtr('guide.shelf.all')}
        </button>
      </div>
    </div>
  );
}

// The open guide's title as the switcher: the name with a chevron.
function GuideSwitcher({ guide, phone, onPick, onAll }) {
  const [open, setOpen] = React.useState(false);
  const name = MCU_GUIDE.name(guide);
  const chevron = (
    <span className="g-sw-chev ml-2 inline-flex size-8 flex-none translate-y-[-2px] items-center justify-center rounded-md bg-muted align-middle text-foreground [&_svg]:size-4" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </span>
  );
  const title = 'g-sw-btn cursor-pointer rounded-md text-left';
  // The chevron stays with the title's last word when the title wraps.
  const words = name.split(' ');
  const label = <span className="g-name">{words.slice(0, -1).join(' ')}{words.length > 1 ? ' ' : ''}<span className="whitespace-nowrap">{words[words.length - 1]}{chevron}</span></span>;
  const pick = (id) => { setOpen(false); if (id !== guide.id) onPick(id); };
  const all = () => { setOpen(false); onAll(); };
  if (phone) {
    const Sheet = window.Sheet;
    return <>
      <button type="button" className={cn(title, FOCUS)} aria-haspopup="dialog" aria-expanded={open} aria-label={gtr('guide.switchAria', { name })} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <Sheet onClose={() => setOpen(false)} label={gtr('guide.switchTitle')}>
        <div className="g-switch-sheet -mx-2"><GuideSwitchList currentId={guide.id} onPick={pick} onAll={all}/></div>
      </Sheet>}
    </>;
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(title, FOCUS)} aria-label={gtr('guide.switchAria', { name })}>
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} aria-label={gtr('guide.switchTitle')}
        className="g-pop g-switch-pop max-h-[min(560px,calc(100vh-160px))] w-[380px] gap-0 overflow-y-auto p-1.5">
        <GuideSwitchList currentId={guide.id} onPick={pick} onAll={all}/>
      </PopoverContent>
    </Popover>
  );
}

// The open guide's header (Notion "Guides 3/4"): "‹ Guides", the kicker, the
// title (the switcher), the blurb, progress, then Following / Stop
// following, Share and Include optional. "Mark N more seen" stays at the end
// of the progress row (the bulk action, with its Undo; Andre to confirm).
function GuideHeader({ guide, includeOptional, setIncludeOptional, phone, onBack, onPick, onConnections = null }) {
  const { statusOf } = window.useCollection();
  useGuideSkips();
  useFollowedGuides();
  const [said, setSaid] = React.useState('');
  const today = window.todayISO();
  const p = MCU_GUIDE.progress(guide, statusOf);
  const nOpt = MCU_GUIDE.stops(guide, true).filter(s => s.optional).length;
  const name = MCU_GUIDE.name(guide);
  const date = MCU_GUIDE.targetDate(guide);
  const coming = MCU_GUIDE.comingUp(today).find(x => x.guide.id === guide.id) || null;
  const followed = MCU_GUIDE.isFollowed(guide.id);
  const kicker = p.complete ? gtr('guide.complete')
    : [MCU_GUIDE.kind(guide), date, coming && gtr('guide.hero.daysLeft', { n: coming.days })].filter(Boolean).join(' · ');
  const pct = p.ess.released ? Math.round(p.ess.seen / p.ess.released * 100) : 0;
  const ids = MCU_GUIDE.stops(guide, includeOptional).filter(s => !MCU_GUIDE.skippedNow(guide, s.id, statusOf)).map(s => s.id);
  const skipped = p.ess.skipped + (includeOptional ? p.opt.skipped : 0);
  const toggleFollow = () => {
    if (followed) { MCU_GUIDE.unfollow(guide.id); setSaid(gtr('guide.unfollowedSaid', { name })); }
    else { MCU_GUIDE.follow(guide.id); setSaid(gtr('guide.followedSaid', { name })); }
  };
  const back = (
    <button type="button" onClick={onBack} aria-label={gtr('guide.backAria')}
      className={cn('g-back -ml-1 inline-flex h-9 cursor-pointer items-center gap-1 rounded-md px-1 text-body text-muted-foreground hover:text-foreground [&_svg]:size-4', FOCUS)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>
      {gtr('guide.menuTitle')}
    </button>
  );
  return (
    <section className="g-head flex min-w-0 flex-col items-start gap-3" aria-label={name}>
      {phone ? <div className="flex w-full items-center justify-between">{back}<GuideShare guide={guide} className="g-share h-10 px-3.5"/></div> : back}
      <p className={cn('g-kind m-0 text-label font-semibold tracking-[.04em] uppercase', p.complete ? 'done text-(--seen-text)' : BRAND_TEXT)}>{kicker}</p>
      <h2 className="g-title-h m-0 text-display leading-[1.12] font-semibold tracking-tight text-foreground">
        <GuideSwitcher guide={guide} phone={phone} onPick={onPick} onAll={onBack}/>
      </h2>
      {p.complete
        ? <p className="g-ready m-0 max-w-[560px] text-body leading-[1.45] text-muted-foreground [&_b]:text-(--seen-text)"><b>{gloc(guide.done) || gtr('guide.complete')}</b> {gtr('guide.allEssentialSeen')}</p>
        : <p className="g-blurb m-0 max-w-[560px] text-body leading-[1.45] text-muted-foreground">{MCU_GUIDE.blurb(guide)}</p>}
      <div className="g-meter flex w-full max-w-[560px] flex-wrap items-center gap-x-3 gap-y-2 text-label font-semibold text-muted-foreground tabular-nums">
        <span className="h-1 w-[200px] overflow-hidden rounded-full bg-(--progress-track) in-[.app.touch]:min-w-0 in-[.app.touch]:flex-1" aria-hidden="true">
          <span className={cn('block h-full rounded-full', p.complete ? 'bg-(--seen)' : 'bg-(--brand)')} style={{ width: pct + '%' }}/>
        </span>
        <span className="pgh-count" aria-label={gtr('guide.progressAria', { seen: p.ess.seen, n: p.ess.released })}>
          {gtr('guide.hero.stopsOf', { seen: p.ess.seen, n: p.ess.released })}{nOpt ? ' · ' + gtr('guide.optN', { n: nOpt }) : ''}{skipped ? ' · ' + gtr('guide.skippedCount', { n: skipped }) : ''}{MCU_GUIDE.left(guide, statusOf) ? ' · ' + MCU_GUIDE.left(guide, statusOf) : ''}
        </span>
        <window.BulkHeaderAction ids={ids} group={name}/>
      </div>
      <div className="g-actions flex flex-wrap items-center gap-2.5">
        <Button variant="outline" className={cn('g-following h-10 gap-1.5 px-3.5 text-body [&_svg]:size-3.5 in-[.g-desk]:h-(--step-control-h)', followed && 'on')} aria-pressed={followed}
          aria-label={followed ? gtr('guide.unfollowAria', { name }) : gtr('guide.followAria', { name })} onClick={toggleFollow}>
          {followed ? <window.CheckIcon/> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>}
          {followed ? gtr('guide.following') : gtr('guide.follow')}
        </Button>
        {!phone && <GuideShare guide={guide} className="g-share h-10 px-3.5 in-[.g-desk]:h-(--step-control-h)"/>}
        {/* The guide on the canvas (Notion "Guides: a See connections button",
            2026-11-18): Connections with the guide open, landing as a shared
            ?guide= link does. */}
        {onConnections && (
          <Button variant="outline" className="g-connections h-10 gap-1.5 px-3.5 text-body [&_svg]:size-3.5 in-[.g-desk]:h-(--step-control-h)"
            onClick={onConnections}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/></svg>
            {gtr('guide.seeConnections')}
          </Button>
        )}
        {nOpt > 0 && (
          <label className="g-optrow inline-flex cursor-pointer items-center gap-2.5 text-body text-muted-foreground">
            {/* shadcn's Switch look. */}
            <button type="button" role="switch" aria-checked={includeOptional} aria-label={gtr('guide.optionalAria')} onClick={() => setIncludeOptional(!includeOptional)}
              className={cn('g-switch relative h-[26px] w-11 flex-[0_0_44px] cursor-pointer rounded-full border border-transparent p-0 [&_i]:absolute [&_i]:top-[3px] [&_i]:left-[3px] [&_i]:size-[18px] [&_i]:rounded-full [&_i]:shadow-sm [&_i]:transition-transform [&_i]:duration-160 motion-reduce:[&_i]:transition-none', FOCUS,
                includeOptional ? 'on bg-primary [&_i]:translate-x-[18px] [&_i]:bg-background dark:[&_i]:bg-primary-foreground' : 'bg-input [&_i]:bg-background dark:[&_i]:bg-foreground')}><i/></button>
            <span aria-hidden="true">{gtr('guide.includeOptional', { n: nOpt })}{includeOptional && p.opt.released ? ' · ' + gtr('guide.optSeen', { seen: p.opt.seen, n: p.opt.released }) : ''}</span>
          </label>
        )}
      </div>
      <span className="story-sr" aria-live="polite">{said}</span>
    </section>
  );
}

// "Where it leads" for an event guide: the destination's poster, name and
// release, and its Watchlist (Seen too from a week before release). The
// desktop's right column; on phones, a card after the stops ("Then: …").
// It keeps the old destination row's hooks (`g-stop dest`, data-row-id).
function GuideDest({ guide, phone, current, onOpen }) {
  const target = guide.target && MCU_GUIDE.title(guide.target);
  if (!target) return null;
  return (
    <section className={cn('g-stop dest g-dest relative flex flex-col gap-3 rounded-[14px] border bg-card p-4 text-card-foreground', current && 'current shadow-[0_0_0_2px_var(--ring)]')}
      data-row-id={target.id} aria-label={gtr('guide.destLabel', { title: GI18N.titleName(target) })}>
      {!phone && <h3 className="m-0 text-label font-semibold tracking-[.04em] text-muted-foreground uppercase">{gtr('guide.destPos')}</h3>}
      <button type="button" className={cn('g-open flex min-w-0 cursor-pointer items-center gap-3 rounded-md text-left', FOCUS)} onClick={() => onOpen(target.id)}>
        <span className={cn(POSTER, 'h-[69px] w-[46px] flex-none rounded-md border border-dashed border-muted-foreground/60')}><window.PosterArt title={target}/></span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="g-title text-body leading-[1.3] font-semibold text-foreground">{phone ? gtr('guide.then', { title: GI18N.titleName(target) }) : GI18N.titleName(target)}</span>
          <window.ReleaseLine title={target} className="g-release text-label"/>
        </span>
      </button>
      <window.TitleStatusActions title={target} variant="inline" className="g-dest-tsa mt-0 w-full [&_.tsa-btn]:flex-1 [&_.tsa-btn]:justify-center"/>
    </section>
  );
}

// The open guide (Notion "Guides 3/4"): the header, then its stops as the
// Titles list in the guide's order (Titles 1/5 and 4/5: the poster with the
// seen mark, the title, one meta line, Seen and Watchlist; the next stop with
// the red edge, the "Up next" pill and the filled check; no dimming), each
// with its number and its reason. Skip and Unskip as before. The phone List
// (`surface` phone) and the desktop list.
function GuideView({ guide, includeOptional, setIncludeOptional, surface, currentId, openId, onOpen, onFollow, onBack, onPick, onConnections = null }) {
  const { statusOf } = window.useCollection();
  window.useI18n();
  // Desktop: ↑ ↓ / Home / End between stops, as in the List.
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
  const isSkipped = (s) => MCU_GUIDE.skippedNow(guide, s.id, statusOf);
  // Skip is offered on released stops not yet seen.
  const canSkip = (s) => window.MCU_isReleased(s.title) && statusOf(s.id) !== 'seen' && !isSkipped(s);
  const PosterArt = window.PosterArt;
  const stops = MCU_GUIDE.stops(guide, includeOptional);
  const next = MCU_GUIDE.next(guide, includeOptional, statusOf);
  const phone = surface === 'phone', desk = !phone;
  const name = MCU_GUIDE.name(guide);
  const tsa = phone
    // Phones: Seen as the one button, as in Titles (direction B, Andre
    // 2026-11-16); Watchlist is a swipe to the left or in the details.
    ? 'g-tsa static z-auto flex-none flex-row gap-1.5 [transform:none] [&_.tsa-btn]:size-[max(40px,2.5rem)] [&_.tsa-btn_svg]:size-4 [&_.tsa-next]:px-0 [&_.tsa-lab]:hidden [&_.tsa-gap]:hidden [&:has(.tsa-btn.seen:not(.tsa-gap))_.tsa-btn.watch]:hidden'
    // Desktop: the size steps, as the Titles list (Notion "Size steps 2/3").
    : 'g-tsa static z-auto flex-row gap-1.5 [transform:none] [&_.tsa-btn:not(.tsa-next)]:size-(--step-button) [&_.tsa-btn:not(.tsa-next)_svg]:size-(--step-icon) [&_.tsa-next]:h-(--step-button) @min-[84rem]:[&_.tsa-next]:text-body [&_.tsa-gap]:order-0';
  const otag = cn('g-otag ml-1.5 rounded-full border border-input px-[5px] py-px align-[1px] text-label font-medium', DIM);
  const rows = stops.map(s => {
    const seen = statusOf(s.id) === 'seen';
    const skipped = isSkipped(s);
    const isNext = !!next && next.id === s.id;
    const t = s.title;
    const why = MCU_GUIDE.why(s);
    const meta = [t.year, gtr(t.type === 'film' ? 'type.film.one' : 'type.series.one'), gtr('phase.label', { n: t.phase })].join(' · ');
    const numLabel = s.optional
      ? gtr(seen ? 'guide.optSeenAria' : skipped ? 'guide.optSkippedAria' : 'guide.optAria')
      : gtr(seen ? 'guide.stopSeenAria' : skipped ? 'guide.stopSkippedAria' : 'guide.stopAria', { i: s.n });
    const row = (
      <div key={s.id} data-row-id={s.id} role={desk ? 'row' : undefined}
        className={cn('g-stop relative flex items-center gap-3', seen && 'seen', s.optional && 'optional', skipped && 'skipped',
          desk ? 'min-h-(--step-row-h) border-b border-border/70 px-3 py-2' : 'min-h-[78px] rounded-xl border bg-card py-2 pr-2.5 pl-2 text-card-foreground shadow-sm',
          s.optional && !desk && 'border-dashed', skipped && (desk ? 'min-h-[56px] border-dashed' : 'min-h-0 border-dashed py-1.5'),
          isNext && cn('next up-next', desk ? 'bg-(--brand-tint)' : 'border-(--brand-border) bg-(--brand-tint)'),
          currentId === s.id && cn('current', desk ? 'shadow-[inset_3px_0_0_var(--ring)]' : 'shadow-[0_0_0_2px_var(--ring)]'))}>
        {isNext && <span className="g-next-bar absolute top-2.5 bottom-2.5 left-[-1px] w-[3px] rounded-full bg-(--brand)" aria-hidden="true"/>}
        <span role={desk ? 'cell' : undefined} className="g-numcell inline-flex w-6 flex-none flex-col items-center gap-1.5">
          <span role="img" aria-label={numLabel} className={cn('g-num font-semibold tabular-nums', desk ? 'text-(length:--step-figure)' : 'text-body', isNext ? 'text-foreground' : 'text-muted-foreground')}>{s.optional ? '+' : s.n}</span>
          {phone && canSkip(s) && <SkipButton guide={guide} stop={s} className="size-[max(32px,2rem)] basis-8" onDone={afterSkip}/>}
        </span>
        <button type="button" role={desk ? 'cell' : undefined} className={cn('g-open flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left', FOCUS, skipped && 'opacity-55')} onClick={() => onOpen(s.id)}>
          <span className={cn(POSTER, 'g-thumb rounded-[5px]', skipped ? 'h-[42px] w-7 flex-[0_0_28px]' : desk ? 'h-(--step-poster-h) w-(--step-poster-w) flex-[0_0_var(--step-poster-w)]' : 'h-[60px] w-10 flex-[0_0_40px]')}>
            <PosterArt title={t}/>
            {seen && <PosterSeen className="top-[3px] right-[3px] bottom-auto"/>}
          </span>
          <span className="g-text flex min-w-0 flex-col items-start">
            <span className="flex max-w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn('g-title leading-[1.3] font-semibold text-foreground', desk ? 'text-(length:--step-title)' : 'text-body')}>{GI18N.titleName(t)}</span>
              {s.optional && <span className={otag}>{gtr('guide.optionalTag')}</span>}
              {skipped && <span className={cn(otag, 'g-skiptag-inline border-dashed')}>{gtr('guide.skippedTag')}</span>}
              {isNext && desk && <span className="g-next-pill rounded-full border border-(--brand-border) bg-(--brand-tint) px-2 py-px text-label font-semibold whitespace-nowrap text-(--brand-text)">{gtr('upnext.label')}</span>}
            </span>
            {!skipped && <span className={cn('g-meta mt-0.5 text-muted-foreground tabular-nums', desk ? 'text-(length:--step-meta)' : 'text-label')}>
              {isNext && phone && <><span className="g-next-pill font-semibold text-(--brand-text)">{gtr('upnext.label')}</span> · </>}
              {meta}{desk && why ? ' · ' + why : ''}
            </span>}
            {/* The stop's note: two lines at most on a phone. */}
            {!skipped && phone && why && <span className={cn('g-why mt-0.5 line-clamp-2 text-label leading-[1.4]', DIM)}>{why}</span>}
            {/* A quiet extra once the stop is seen (Endgame: "Seen the
                original? The Encore adds…"); it changes no progress. */}
            {!skipped && seen && s.seenNote && <span className={cn('g-seen-note mt-0.5 text-label leading-[1.4]', DIM)}>{gloc(s.seenNote)}</span>}
            <window.ReleaseBadge title={t} className="g-release mt-1"/>
          </span>
        </button>
        <span role={desk ? 'cell' : undefined} className="g-acts inline-flex flex-none items-center justify-end gap-1.5">
          {skipped ? <UnskipButton guide={guide} stop={s} className={phone ? 'min-h-[max(36px,2.25rem)]' : ''} onDone={afterSkip}/> : <>
            {desk && canSkip(s) && <SkipButton guide={guide} stop={s} className="size-[max(30px,1.875rem)] basis-[30px]" onDone={afterSkip}/>}
            <window.TitleStatusActions title={t} upNext={isNext} className={tsa}/>
          </>}
        </span>
      </div>
    );
    // Phones: swipe right for Seen, left for Watchlist (not on a skipped stop).
    return phone && !skipped ? <window.SwipeRow key={s.id} title={t}>{row}</window.SwipeRow> : row;
  });
  // Stepping (↑ ↓ ← →, or a stop opened) says where you are, as the old
  // module's stepper did: "Stop 3 of 5".
  const [stepSaid, setStepSaid] = React.useState('');
  React.useEffect(() => {
    const st = currentId ? stops.find(x => x.id === currentId) : null;
    if (!st || phone) return;
    setStepSaid(st.optional ? gtr('guide.optAria') : gtr('guide.stepOf', { i: st.n, n: MCU_GUIDE.stops(guide, false).length }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, guide.id]);
  const announcer = <><span className="story-sr" aria-live="polite">{said}</span><span className="story-sr" aria-live="polite">{stepSaid}</span></>;
  const header = <GuideHeader guide={guide} includeOptional={includeOptional} setIncludeOptional={setIncludeOptional} phone={phone} onBack={onBack} onPick={onPick} onConnections={onConnections}/>;
  const dest = <GuideDest guide={guide} phone={phone} current={!!guide.target && currentId === guide.target} onOpen={onOpen}/>;

  if (phone) {
    return (
      <div className={cn(S.SCROLL, 'g-scroll')}>
        <div className="mb-4">{header}</div>
        <div className="g-stops flex flex-col gap-[9px]">{rows}{dest}</div>
        {announcer}
      </div>
    );
  }
  return (
    <div className="dlist g-desk relative @container min-h-0 flex-1 overflow-y-auto px-(--grid-margin) pt-6 pb-12 wide:in-[.app.drawer-open]:pr-[calc(var(--drawer-w)+var(--grid-margin))]" role="main" aria-label={name}>
      {/* The size steps (Notion "Size steps 2/3"), by this page's width. */}
      <div className="step-sizes mx-auto w-full max-w-(--content-max)">
        <div className={cn('grid items-start gap-8', guide.target ? 'grid-cols-[minmax(0,1fr)_290px] max-[1100px]:grid-cols-1' : 'grid-cols-1')}>
          {header}
          {guide.target && <div className="pt-12 max-[1100px]:pt-0">{dest}</div>}
        </div>
        <div className="g-table mt-8 flex flex-col text-body" role="table" aria-label={name} ref={rowKeys.tableRef} onKeyDown={rowKeys.onKeyDown}>
          {rows}
        </div>
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
      className="g-partof border-t pt-3" labelClass="g-partof-title p-0 text-label font-medium text-muted-foreground" bodyClass="g-partof-body pt-1.5"
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
            <span className="g-chev ml-auto text-title text-muted-foreground" aria-hidden="true">›</span>
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
          className={cn(buttonVariants({ variant: 'outline' }), 'filters-pill g-btn h-11 shrink-0 gap-2 px-3.5 text-label max-[1000px]:px-[11px] [&_svg]:flex-none',
            (open || currentId) && 'active', currentId && 'on border-foreground/30 bg-(--field-hover) text-foreground')}>
          <GuideIcon/><span className="filters-label">{gtr('guide.button')}</span>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} aria-label={gtr('guide.menuTitle')}
          className="g-pop max-h-[min(640px,calc(100vh-120px))] w-[400px] gap-0 overflow-y-auto px-4 pt-3.5 pb-2.5">
          <h2 className="g-pop-title text-title font-semibold tracking-tight text-foreground">{gtr('guide.menuTitle')}</h2>
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
  p: (kind = '') => cn('gp-p relative block aspect-[2/3] overflow-hidden bg-muted', touch ? 'rounded-md shadow-pop' : 'rounded-[7px] shadow-pop',
    kind === 'next' && 'shadow-[0_0_0_2px_var(--brand),var(--elevation-pop)]',
    kind === 'skipped' && 'outline-1 outline-offset-[-1px] outline-input outline-dashed',
    // Phones: the month and day alone; "in 32 days" didn't fit a cover's
    // width at Large, and the band above already counts the days.
    kind === 'dest' && cn('flex flex-col items-center justify-center border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--gc)_45%,#fff)] bg-[color-mix(in_srgb,var(--gc)_18%,var(--card))] text-center shadow-none [&_b]:leading-[1.05] [&_b]:font-extrabold [&_b]:text-foreground [&_b]:tabular-nums [&_small]:mt-1 [&_small]:px-[3px] [&_small]:font-bold [&_small]:text-caption', touch ? '[&_b]:text-heading [&_small]:hidden' : '[&_b]:text-title [&_small]:tracking-[.6px]', '[&_small]:text-(--dim)'),
    kind === 'more' && cn('flex items-center justify-center border border-input bg-card text-heading font-bold shadow-none', DIM)),
  art: (mods = '') => cn('gp-art block size-full *:block *:size-full [&_img]:object-cover [&_svg]:size-full', mods),
  n: (mods = '') => cn('gp-n absolute inline-flex items-center justify-center rounded-full border border-(--border-strong) bg-(--veil) font-bold tabular-nums text-foreground [&_svg]:size-[11px]', XS,
    touch ? 'top-1 left-1 size-[18px]' : 'top-[5px] left-[5px] size-5', mods),
  // Phones show the covers alone (Andre, 2026-11-16: a few letters each was
  // all that fit); each stop's name stays for screen readers (story-sr).
  t: (strong) => cn('gp-t leading-[1.3] [overflow-wrap:anywhere]', XS, touch ? 'hidden' : 'line-clamp-2', strong ? 'text-foreground' : DIM),
  arr: cn('gp-arr flex-none text-muted-foreground', touch ? 'mt-[30px] text-heading' : 'mt-[46px] text-title'),
  body: cn('gp-body', touch ? 'px-[18px] pt-4 pb-6' : 'px-7 pt-[18px] pb-[22px]'),
  h: cn('gp-h leading-[1.25] font-bold text-foreground', touch ? 'text-title' : 'text-title'),
  b: cn('gp-b mt-2', DIM, touch ? 'text-body leading-normal' : 'text-heading leading-[1.55]'),
  foot: cn('gp-foot flex', touch ? 'mt-2.5 flex-col items-stretch gap-2' : 'mt-5 items-center gap-2.5 border-t pt-4'),
  meta: cn('gp-meta text-label', DIM, touch ? 'mb-2 flex-none' : 'flex-1'),
  later: cn('nudge-later gp-later h-auto px-4', touch ? 'min-h-[max(44px,2.75rem)] border-0 shadow-none dark:border-0' : 'min-h-[max(42px,2.625rem)]'),
  go: cn('picker-go gp-go h-auto px-[18px]', touch ? 'min-h-[max(48px,3rem)] text-heading' : 'min-h-[max(42px,2.625rem)]'),
});
// The dialog and sheet frames: the band runs to the top edge, under the × (and
// the phone's handle), which float on it.
const PROMO_DIALOG = 'promo-dialog w-[min(640px,calc(100vw-48px))] overflow-x-hidden overflow-y-auto p-0 [&>.about-x]:top-3 [&>.about-x]:right-3 [&>.about-x]:z-3 [&>.about-x]:size-[max(40px,2.5rem)] [&>.about-x]:rounded-[10px] [&>.about-x]:bg-(--veil-light) [&>.about-x]:text-foreground [&>.about-x]:hover:bg-(--veil)';
const PROMO_SHEET = "promo-sheet overflow-hidden [&_.m-grab]:absolute [&_.m-grab]:top-0 [&_.m-grab]:left-1/2 [&_.m-grab]:z-2 [&_.m-grab]:m-0 [&_.m-grab]:-ml-[23px] [&_.m-grab]:after:bg-white/40 [&_.m-sheet-x]:top-2.5 [&_.m-sheet-x]:right-2 [&_.m-sheet-x]:size-[max(44px,2.75rem)] [&_.m-sheet-x]:rounded-[10px] [&_.m-sheet-x]:bg-(--veil-light) [&_.m-sheet-x]:text-title [&_.m-sheet-x]:text-foreground [&_.m-sheet-body]:px-0 [&_.m-sheet-body]:pt-0 [&_.m-sheet-body]:pb-[env(safe-area-inset-bottom,0px)]";

function GuidePromo({ promo, touch, onStart, onClose }) {
  if (promo.caughtUp) return <GuideCaughtUp promo={promo} touch={touch} onClose={onClose}/>;
  return <GuidePromoOffer promo={promo} touch={touch} onStart={onStart} onClose={onClose}/>;
}

// The countdown band shared by the offer and the caught-up moment.
function PromoCountdown({ target, days, touch, label }) {
  const cd = cn('gp-cd flex items-end', touch ? 'gap-3 pr-12' : 'gap-3.5 pr-[52px]');
  if (!target) return <div className={cd} id="gp-cd"><span className="gp-lab inline-flex items-center gap-2 pt-2 pb-6 text-label font-bold tracking-[1.2px] text-white uppercase [&_i]:block [&_i]:size-2 [&_i]:rounded-[2px] [&_i]:bg-white"><i aria-hidden="true"/>{label}</span></div>;
  const date = promoDateParts(target.release, !touch);
  const word = days === 1;
  return (
    <div className={cd} id="gp-cd">
      <span className={cn('gp-big leading-[.9] font-extrabold text-white tabular-nums', word
        ? cn('word tracking-[-.01em]', 'text-numeral-word')
        : cn('tracking-[-.02em]', 'text-numeral'))}>{word ? gtr('guide.promoTomorrow') : days}</span>{' '}
      <span className={cn('gp-cdt leading-normal font-bold tracking-[1.1px] text-[#f4ecec] uppercase [&_b]:block [&_b]:tracking-[.08em] [&_b]:text-white', XS, touch ? 'pb-[3px] [&_b]:text-heading' : 'pb-1 [&_b]:text-title')}>
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
                <span className={P.n('done border-(--seen) bg-(--seen) text-(--seen-foreground)')}><window.CheckIcon/></span>
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
  if (touch) return <window.Sheet onClose={onClose} tall labelledBy="gp-title" describedBy="gp-cd" className={PROMO_SHEET}>{body}</window.Sheet>;
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
                <span className={P.n(seen ? 'done border-(--seen) bg-(--seen) text-(--seen-foreground)' : isNext ? 'cur border-primary bg-primary text-primary-foreground' : '')}>{seen ? <window.CheckIcon/> : s.n}</span>
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
  if (touch) return <window.Sheet onClose={onClose} tall labelledBy="gp-title" describedBy="gp-cd" className={PROMO_SHEET}>{body}</window.Sheet>;
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
