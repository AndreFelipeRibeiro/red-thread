// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 69 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import ReactDOM from 'react-dom';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { DIALOG } from './about';

// On the design system since Notion "shadcn pass 5/5" (this file is listed
// with `@source` in src/index.css). The toast takes Sonner's look (the popover
// surface, a border, the large shadow) but keeps its own component: its place
// (clear of the details drawer, above the phone's sort bar or pinned pill),
// one toast at a time, Undo, Share and the pause on hover are the app's, and
// the QA checks read them. The dialogs are ModalDialog / Sheet with the
// shared recipes from about.tsx. Hook classes kept: `mcu-toast`, `mt-*`,
// `milestone`, `touch`, `about`, `nudge`, `about-cta`, `nudge-later`…
const TOAST_DIM = 'text-[color-mix(in_oklch,var(--foreground)_40%,var(--muted-foreground))]';

// Feedback when someone marks a title seen or adds it to the watchlist (and,
// further down, the guest sign-in reminder):
// a toast with Undo (every time), and confetti for milestones (a whole phase,
// or every released title, newly completed). Status changes arrive through
// window.onStatusChange (tracking.jsx), which only fires for taps on the
// seen/watchlist buttons, never for sync or merges.
// Rendered into <body> so sheets and dialogs that make the app inert don't
// block its Undo button.

const reducedMotion = () => window.MCU_MOTION.reduced();

// Newly completed milestone for a change to 'seen', judged on the states after
// the change: everything released ('all'), or everything released in the
// title's phase. Null when nothing was completed by this change.
function completedMilestone(e) {
  const released = window.MCU_isReleased;
  if (!released || !released(e.title)) return null;
  const all = (window.TITLES || []).filter(t => released(t));
  const seenAfter = t => (t.id === e.title.id ? 'seen' : e.states[t.id]) === 'seen';
  if (all.length && all.every(seenAfter)) return { kind: 'all' };
  const phase = all.filter(t => t.phase === e.title.phase);
  if (phase.length > 1 && phase.every(seenAfter)) return { kind: 'phase', phase: e.title.phase };
  return null;
}

// The same for a bulk action, judged on the marks before and after it: the
// whole catalogue, or the first phase it newly completed. A phase that was
// already complete before the action is not celebrated again.
function completedMilestoneBulk(e) {
  const released = window.MCU_isReleased;
  if (!released || (e.to !== 'seen' && e.to !== 'mixed')) return null;
  const all = (window.TITLES || []).filter(t => released(t));
  const done = (st, list) => list.length > 0 && list.every(t => st[t.id] === 'seen');
  if (done(e.after, all) && !done(e.states, all)) return { kind: 'all' };
  const phases = [...new Set((e.seenIds || e.ids).map(id => (all.find(t => t.id === id) || {}).phase).filter(Boolean))].sort((a, b) => a - b);
  for (const p of phases) {
    const list = all.filter(t => t.phase === p);
    if (list.length > 1 && done(e.after, list) && !done(e.states, list)) return { kind: 'phase', phase: p };
  }
  return null;
}

// The space a celebration belongs to: the window, less the desktop details
// drawer when it is open (phones show details in a sheet, so they keep the
// full width). The toast centres in it and the confetti stays inside it, so
// the two line up whether or not the details are open.
function celebrationArea() {
  const drawer = document.querySelector('.drawer.open');
  const right = drawer ? Math.round(drawer.getBoundingClientRect().width) : 0;
  return { width: Math.max(0, window.innerWidth - right) };
}

// Lightweight confetti on a canvas over the celebration area that removes
// itself. The two bursts start just inside the toast's ends, under it (the
// toast sits above the canvas), so they seem to come from behind it and fan
// out up and away; a toast at the top (a phone sheet is open) sends them down.
// With no toast on screen they rise from a quarter and three quarters across
// the bottom. `palette` (optional) replaces the phase colours: a finished
// guide bursts in greens.
function burstConfetti(palette) {
  // Off in Settings, or motion reduced.
  if (!window.MCU_PREFS.celebrations() || reducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'mcu-confetti pointer-events-none fixed top-0 left-0 z-125 h-screen w-screen';
  canvas.setAttribute('aria-hidden', 'true');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = celebrationArea().width || window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);
  // The phase colours are CSS tokens now (var(--phase-1)…), and a canvas
  // cannot read var(): resolve each one against the page before painting.
  const root = getComputedStyle(document.documentElement);
  const resolve = (c) => { const m = /^var\((--[\w-]+)\)$/.exec(c); return m ? root.getPropertyValue(m[1]).trim() || '#888' : c; };
  const colors = (palette && palette.length ? palette : Object.values(window.PHASE_COLORS || {}).concat(['#5fa856', '#d4a05a', '#ffffff'])).map(resolve);
  const parts = [];
  // Called once the toast has rendered (it usually has by the first frame).
  const launch = () => {
    const toast = document.querySelector('.mcu-toast');
    const r = toast ? toast.getBoundingClientRect() : null;
    const fromToast = !!(r && r.width > 0);
    // A full-width toast (phones) starts the bursts further in and aims them
    // higher, or most of the confetti would leave the screen at once.
    const wide = fromToast && r.width > W * 0.7;
    const inset = !fromToast ? 0 : wide ? r.width * 0.16 : Math.min(26, r.width * 0.1);
    const down = fromToast && r.top + r.height / 2 < H / 2;
    const y0 = fromToast ? r.top + r.height / 2 : H + 10;
    const ends = fromToast ? [r.left + inset, r.right - inset] : [W * 0.25, W * 0.75];
    // Where it started, for the QA checks.
    canvas.dataset.origin = [ends[0], ends[1], y0].map(Math.round).join(',');
    [[ends[0], -1], [ends[1], 1]].forEach(([x0, side]) => {
      for (let i = 0; i < 70; i++) {
        const spread = (wide ? 4 : 10) + Math.random() * (wide ? 24 : fromToast ? 45 : 30);
        const a = (down ? 90 - side * spread : -90 + side * spread) * Math.PI / 180;
        const v = fromToast ? 6 + Math.random() * 8 : 9 + Math.random() * 9;
        parts.push({ x: x0 + (Math.random() - .5) * 10, y: y0 + (fromToast ? (Math.random() - .5) * r.height * .6 : 0),
          vx: Math.cos(a) * v, vy: Math.sin(a) * v * 1.35, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6,
          r: Math.random() * 6, vr: (Math.random() - .5) * 0.4, c: colors[(Math.random() * colors.length) | 0] });
      }
    });
  };
  let tries = 0;
  const start = performance.now();
  const frame = (now) => {
    const t = now - start;
    if (!parts.length && (document.querySelector('.mcu-toast') || ++tries > 3)) launch();
    ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.vy += 0.32; p.vx *= 0.99; p.vy *= 0.99;
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1500) / 700);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      ctx.restore();
    });
    if (t < 2200) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// Where the toast goes: clear of the desktop details drawer, above the phone's
// bottom bar (when there is one) and the character pill, or at the top while
// a phone sheet is open.
function toastPlacement(touch) {
  if (touch) {
    if (document.querySelector('.m-sheet')) return { top: 'calc(12px + env(safe-area-inset-top, 0px))' };
    let edge = window.innerHeight;
    ['.m-sort-footer', '.char-pill'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el && el.getClientRects().length) edge = Math.min(edge, el.getBoundingClientRect().top);
    });
    // Nothing below it: clear of the home indicator.
    if (edge === window.innerHeight) return { bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' };
    return { bottom: (window.innerHeight - edge + 10) + 'px' };
  }
  return { bottom: '24px', left: (celebrationArea().width / 2) + 'px' };
}

function StatusToast({ touch }) {
  const { setStatus, undoMany, progress } = window.useCollection();
  const { tr } = window.useI18n();
  const [toast, setToast] = React.useState(null);
  const timer = React.useRef(null);

  React.useEffect(() => window.onStatusChange((e) => {
    // A single removal only updates the counters; a bulk one still gets its
    // toast, because "Mark as unseen" across many titles needs an Undo.
    if (e.to === 'none' && !e.bulk) return;
    // Celebrations off in Settings: an ordinary toast, no confetti.
    const milestone = e.to === 'seen' && window.MCU_PREFS.celebrations() ? (e.bulk ? completedMilestoneBulk(e) : completedMilestone(e)) : null;
    if (milestone) burstConfetti();
    setToast({ key: Date.now(), ...e, milestone, place: toastPlacement(touch) });
  }), [touch]);

  const life = toast && toast.milestone ? 6500 : 4500;
  const arm = React.useCallback((ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);
  React.useEffect(() => {
    if (!toast) return undefined;
    arm(life);
    return () => clearTimeout(timer.current);
  }, [toast, life, arm]);

  const undo = () => {
    if (!toast) return;
    if (toast.bulk) undoMany(toast.prev);
    else setStatus(toast.title.id, toast.from);
    setToast(null);
  };

  let body = null;
  if (toast) {
    const I = window.MCU_I18N;
    const m = toast.milestone;
    const head = m ? tr(m.kind === 'all' ? 'toast.allDone' : 'toast.phaseDone', { n: m.phase })
      : toast.to === 'mixed' ? tr('toast.bulk.mixed', { s: toast.seenIds.length, u: toast.unseenIds.length })
      : toast.bulk ? tr('toast.bulk.' + toast.to, { n: toast.ids.length }) : I.titleName(toast.title);
    const sub = m ? tr(m.kind === 'all' ? 'toast.allDoneSub' : 'toast.phaseDoneSub', { n: m.phase })
      : toast.bulk ? tr('toast.bulk.sub') : tr(toast.to === 'seen' ? 'toast.seen' : 'toast.watch');
    body = (
      <div key={toast.key} className={cn('mcu-toast fixed left-1/2 z-130 flex w-max max-w-[min(460px,calc(100vw-24px))] animate-[toast-in_280ms_cubic-bezier(.2,.9,.3,1.2)] items-center gap-3 rounded-xl border bg-popover py-2.5 pr-2.5 pl-3 text-sm text-popover-foreground shadow-lg [transform:translateX(-50%)] motion-reduce:animate-none',
        toast.to, m && 'milestone border-[color-mix(in_oklab,#f0c34a_55%,var(--border))]', touch && 'touch w-[calc(100vw-24px)]')}
        style={toast.place} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={() => arm(2500)}
        onFocus={() => clearTimeout(timer.current)} onBlur={() => arm(2500)}>
        <span aria-hidden="true" className={cn('mt-ic inline-flex h-8 flex-[0_0_32px] items-center justify-center rounded-[9px] text-lg text-(--on-color) [&_svg]:size-4',
          m ? 'bg-linear-to-br from-[#f0c34a] to-[#e84a3a] text-white' : toast.to === 'watchlist' ? 'bg-(--status-watch)' : toast.to === 'none' ? 'bg-border text-foreground' : 'bg-(--status-seen)')}>
          {m ? '★' : toast.to === 'seen' || toast.to === 'mixed' ? <window.CheckIcon/> : toast.to === 'none' ? '↺' : <window.BookmarkIcon filled/>}
        </span>
        <span className="mt-text flex min-w-0 flex-auto flex-col"><b className="truncate text-sm font-semibold">{head}</b><span className={cn('text-(length:--fs-xs)', TOAST_DIM)}>{sub}</span></span>
        <Button variant="outline" size="sm" className="mt-undo h-auto min-h-[max(32px,2rem)] flex-none px-3 text-xs font-semibold" onClick={undo}>{tr('toast.undo')}</Button>
        {/* A milestone can be shared (Notion "Share 1/3"); Undo stays first. */}
        {m && <window.ShareButton iconOnly size={15} className="mt-share size-[max(32px,2rem)]" label={tr('share.toastLabel', { what: head })}
          payload={() => ({ text: tr(m.kind === 'all' ? 'share.allText' : 'share.phaseText', { n: m.phase }) })}
          onShare={() => window.MCU_SHARE_IMAGE.progress(progress.seenReleased, progress.releasedTotal,
            tr(m.kind === 'all' ? 'share.allText' : 'share.phaseText', { n: m.phase }))}/>}
        <Button variant="ghost" size="icon-sm" className="mt-x size-[max(30px,1.875rem)] flex-none rounded-full text-lg text-muted-foreground active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100" onClick={() => setToast(null)} aria-label={tr('toast.dismiss')} title={tr('toast.dismiss')}>×</Button>
      </div>
    );
  }
  return ReactDOM.createPortal(<div className="mcu-toast-live" role="status" aria-live="polite">{body}</div>, document.body);
}

// Sign-in reminder: a guest who has marked a few titles (seen or watchlist) is
// reminded that signing in saves them to an account and syncs them across
// devices. Shown right after the tap that reaches 3 marks, and once more at 10;
// either dismissal counts, and it never shows again after the second. Only
// when Google sign-in is available and the visitor is signed out.
const NUDGE_KEY = 'mcu.signInNudge.v1';
const NUDGE_AT = [3, 10];
function nudgeStage() {
  try { return Number(window.localStorage.getItem(NUDGE_KEY)) || 0; } catch (e) { return NUDGE_AT.length; }
}

function NudgeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4.5" width="13" height="9.5" rx="1.5"/><path d="M6 18h6M9 14v4"/>
      <rect x="16.5" y="8.5" width="5" height="11" rx="1.2"/><path d="M18.6 17.2h.8"/>
    </svg>
  );
}

function SignInNudge({ touch }) {
  const account = window.useAccount();
  const { tr } = window.useI18n();
  const accountRef = React.useRef(account);
  accountRef.current = account;
  const [pending, setPending] = React.useState(null);
  const [open, setOpen] = React.useState(null);
  // What is saved right now. The reminder waits before it shows, and the
  // toast's Undo puts the status back by calling setStatus directly, without
  // going through the status-change event, so the collection itself is the only
  // thing that can say whether the reminder is still warranted when it is due.
  const { states } = window.useCollection();
  const statesRef = React.useRef(states);
  statesRef.current = states;
  const markedNow = () => Object.values(statesRef.current || {}).filter(v => v && v !== 'none').length;

  React.useEffect(() => window.onStatusChange((e) => {
    if (e.to === 'none') return;
    // The event carries the marks as of this tap; the provider's state has not
    // re-rendered yet, so it cannot be used to decide the threshold here.
    const after = e.bulk ? e.after : Object.assign({}, e.states, { [e.title.id]: e.to });
    const n = Object.values(after).filter(v => v && v !== 'none').length;
    const a = accountRef.current;
    if (a.status !== 'signed_out' || !a.syncAvailable) return;
    const stage = nudgeStage();
    if (stage >= NUDGE_AT.length) return;
    if (n < NUDGE_AT[stage]) return;
    // Remember it now, so a reload or a quick second tap doesn't repeat it.
    let next = stage;
    while (next < NUDGE_AT.length && n >= NUDGE_AT[next]) next += 1;
    try { window.localStorage.setItem(NUDGE_KEY, String(next)); } catch (err) { /* shown once this visit */ }
    setPending({ at: NUDGE_AT[stage], stage });
  }), []);

  // A moment after the tap, so the button's pop and the toast come first, and
  // only once no sheet, dialog or confetti is on screen.
  React.useEffect(() => {
    if (!pending) return undefined;
    let timer;
    const check = () => {
      if (document.querySelector('.m-sheet, .about-dialog, .mcu-confetti')) { timer = setTimeout(check, 700); return; }
      if (accountRef.current.status !== 'signed_out') { setPending(null); return; }
      // Undone back under the threshold during the wait: drop the reminder and
      // hand its stage back, rather than opening with a count that no longer
      // matches the collection.
      if (markedNow() < pending.at) {
        try { window.localStorage.setItem(NUDGE_KEY, String(pending.stage)); } catch (err) { /* stage stands for this visit */ }
        setPending(null);
        return;
      }
      setOpen({ n: markedNow() });
      setPending(null);
    };
    timer = setTimeout(check, 1400);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!open) return null;
  const close = () => setOpen(null);
  const signIn = () => { setOpen(null); accountRef.current.signIn(); };
  const titleId = touch ? 'nudge-sheet-title' : 'nudge-title';
  const body = (
    <div className={cn(DIALOG.body, 'nudge')}>
      <div className={cn(DIALOG.head, 'gap-3')}>
        <span className={cn(DIALOG.ic, 'nudge-ic size-10 basis-10 text-foreground')}><NudgeIcon/></span>
        <h2 id={titleId} className={DIALOG.title}>{tr('nudge.title')}</h2>
      </div>
      <p className={DIALOG.lead}>{tr('nudge.text', { n: open.n })}</p>
      <p className="nudge-note mt-2.5 text-xs leading-normal text-muted-foreground">{tr('nudge.merge')}</p>
      <div className={DIALOG.actions}>
        <Button className={cn(DIALOG.primary, 'gap-2.5 [&_svg]:size-[17px] [&_svg]:flex-none')} onClick={signIn}><window.GoogleMark/>{tr('account.signInGoogle')}</Button>
        <Button variant="outline" className={DIALOG.secondary} onClick={close}>{tr('nudge.later')}</Button>
      </div>
    </div>
  );
  if (touch) return <window.Sheet onClose={close} label={tr('nudge.title')}>{body}</window.Sheet>;
  return <window.ModalDialog onClose={close} labelledBy={titleId} className="nudge-dialog w-[min(440px,calc(100vw-48px))]">{body}</window.ModalDialog>;
}

// Asks before a bulk action that changes more than 20 titles, or any "Mark as
// unseen" (tracking.jsx requestBulk). A sheet on phones, a dialog on desktop.
function BulkConfirm({ touch }) {
  const { tr } = window.useI18n();
  const [ask, setAsk] = React.useState(null);
  React.useEffect(() => window.onBulkConfirm((req) => setAsk(req)), []);
  if (!ask) return null;
  const close = () => setAsk(null);
  const go = () => { const run = ask.run; setAsk(null); run(); };
  const titleId = touch ? 'bulk-sheet-title' : 'bulk-title';
  const body = (
    <div className={cn(DIALOG.body, 'bulk-confirm')}>
      <h2 id={titleId} className={cn(DIALOG.title, 'pr-10')}>{tr('bulk.confirm.' + ask.to, { n: ask.n })}</h2>
      <p className={DIALOG.lead}>{tr(ask.to === 'none' ? 'bulk.confirm.unseenNote' : 'bulk.confirm.note')}</p>
      <div className={DIALOG.actions}>
        <Button className={DIALOG.primary} onClick={go}>{tr('bulk.confirm.go.' + ask.to, { n: ask.n })}</Button>
        <Button variant="outline" className={DIALOG.secondary} onClick={close}>{tr('bulk.confirm.cancel')}</Button>
      </div>
    </div>
  );
  if (touch) return <window.Sheet onClose={close} label={tr('bulk.confirm.' + ask.to, { n: ask.n })}>{body}</window.Sheet>;
  return <window.ModalDialog onClose={close} labelledBy={titleId} className="bulk-dialog">{body}</window.ModalDialog>;
}

Object.assign(window, { StatusToast, burstConfetti, SignInNudge, BulkConfirm });

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { StatusToast, burstConfetti, SignInNudge, BulkConfirm };
