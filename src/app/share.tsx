import React from 'react';
import { cn } from '@/lib/utils';
import { addressFor } from '@/share-card/addresses';

// Sharing (Notion V4 Tasks, "Share 1/3 — Share buttons and links"). One helper
// does it everywhere, so every button behaves the same:
//   - Phones (a touch screen with the system share sheet): navigator.share, so
//     people pick Messages, WhatsApp and so on. Cancelling it does nothing.
//   - Anywhere else, or if the share sheet fails: the link is copied, and a
//     "Link copied" toast says so (screen readers announce it).
// Links always point at production, never at the address the page is on
// (staging, a preview or localhost), and carry only what opens the same
// thing: the page's own address (/titles/<id>, /characters/<id> or
// /guides/<id>, Notion "Findability 3"), or the home page. Sharing never
// touches browser history.

/** Production, under the public name's domain (Andre, 2026-11-01). www and
 *  the project's own mcu-connections.vercel.app redirect here (vercel.json). */
export const PUBLIC_URL = 'https://redthread.tv/';

export interface SharePayload {
  /** What the link opens: title, char or guide id; empty for the home page. */
  params?: Record<string, string>;
  /** The message that goes with the link, in the visitor's language. */
  text: string;
}

export function shareURL(params: Record<string, string> = {}): string {
  // The thing shared is the path (/guides/<id>; src/share-card/addresses.ts).
  // In the sharer's language: a friend gets the page in the language it was
  // shared from (Notion "Findability 6").
  const lang = window.MCU_I18N && window.MCU_I18N.lang === 'pt-BR' ? 'pt-BR' : 'en';
  const { pathname, search } = addressFor(new URLSearchParams(params), lang);
  const url = new URL(pathname, PUBLIC_URL);
  url.search = search.toString();
  return url.toString();
}

// ---------------------------------------------------------------------------
// The "Link copied" toast: plain DOM on <body>, outside #root, so a dialog or
// sheet that makes the app inert never silences it. The live region exists
// from the start; screen readers only announce changes to one already there.
// ---------------------------------------------------------------------------

let host: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
function toastHost(): HTMLDivElement {
  if (host && host.isConnected) return host;
  host = document.createElement('div');
  host.className = 'share-toast pointer-events-none fixed top-[calc(16px+env(safe-area-inset-top,0px))] left-1/2 z-400 flex max-w-[min(92vw,440px)] -translate-x-1/2 -translate-y-2 flex-col items-center gap-1 rounded-lg border bg-popover px-4 py-2.5 text-center text-body font-medium text-popover-foreground opacity-0 shadow-lg transition-[opacity,translate] duration-160 motion-reduce:transition-none [&.show]:pointer-events-auto [&.show]:translate-y-0 [&.show]:opacity-100';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}
if (document.body) toastHost();

function say(message: string, link?: string) {
  const el = toastHost();
  clearTimeout(hideTimer);
  el.textContent = '';
  // A new node each time, so saying the same thing twice is announced twice.
  const line = document.createElement('span');
  line.className = 'share-toast-msg';
  line.textContent = message;
  el.appendChild(line);
  if (link) {
    // Copying failed: show the link so it can be selected by hand.
    const a = document.createElement('span');
    a.className = 'share-toast-link text-label font-normal break-all text-muted-foreground select-all';
    a.textContent = link;
    el.appendChild(a);
  }
  el.classList.add('show');
  hideTimer = setTimeout(() => el.classList.remove('show'), link ? 8000 : 2600);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through to the older way */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    const active = document.activeElement as HTMLElement | null;
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (active && active.isConnected) active.focus({ preventScroll: true });
    return ok;
  } catch (e) {
    return false;
  }
}

/** The system share sheet is for phones; desktop browsers that have one
 *  (Safari, Edge) still copy, as the ticket asks. */
function useSheet(): boolean {
  if (typeof navigator.share !== 'function') return false;
  return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

export async function share(payload: SharePayload): Promise<void> {
  const tr = window.MCU_I18N.tr;
  const url = shareURL(payload.params);
  if (useSheet()) {
    try {
      await navigator.share({ title: tr('app.name'), text: payload.text, url });
      return;
    } catch (e) {
      // Cancelled: nothing to say. Anything else (not allowed, unsupported
      // data): copy instead.
      if (e && (e as DOMException).name === 'AbortError') return;
    }
  }
  await copy(payload);
}

/** Copy the link, whatever the device (the share card's Copy link). */
export async function copy(payload: SharePayload): Promise<void> {
  const tr = window.MCU_I18N.tr;
  const url = shareURL(payload.params);
  if (await copyText(url)) say(tr('share.copied'));
  else say(tr('share.copyFailed'), url);
}

// ---------------------------------------------------------------------------
// The button
// ---------------------------------------------------------------------------

export function ShareIcon({ size = 16 }: { size?: number }) {
  // lucide "share": a box with an arrow leaving it, the shape phones use.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    </svg>
  );
}

/** A Share button. `label` is its accessible name ("Share Iron Man"); the
 *  visible text is "Share" unless `iconOnly`. `payload` is read on click, so
 *  the message always matches what is on screen. Clicks never reach the canvas
 *  or card behind it. */
/** The Share button's look (shadcn's outline Button, with the icon buttons'
 *  press effect); callers size it with their own utilities, which merge. The
 *  share card's actions use it too, with SHARE_PRIMARY for the main one. */
export const SHARE_BTN = 'share-btn inline-flex h-[max(36px,2.25rem)] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-(--button-outline) px-3 text-body leading-none font-medium text-foreground no-underline shadow-xs outline-none transition-[scale,background-color,color,border-color,box-shadow] duration-150 hover:bg-(--field-hover) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-disabled:scale-92 motion-reduce:active:scale-100 border-(--button-outline-border) [:root.reduce-motion_&]:active:scale-100 [&_svg]:flex-none';
export const SHARE_PRIMARY = 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 dark:border-transparent dark:bg-primary dark:hover:bg-primary/90';

export function ShareButton({ label, payload, onShare, className = '', iconOnly = false, text, size }: {
  label: string; payload: () => SharePayload; className?: string; iconOnly?: boolean; text?: string; size?: number;
  /** Instead of sharing the link: what the share card (share-image.tsx) does
   *  for progress and finished guides. */
  onShare?: () => void;
}) {
  const tr = window.MCU_I18N.tr;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <button type="button" className={cn(SHARE_BTN, iconOnly && 'icon w-9 px-0', className)}
      aria-label={label} title={iconOnly ? label : undefined}
      onMouseDown={stop} onTouchStart={stop}
      onClick={(e) => { e.stopPropagation(); if (onShare) onShare(); else share(payload()); }}>
      <ShareIcon size={size}/>
      {!iconOnly && <span>{text || tr('share.button')}</span>}
    </button>
  );
}

const MCU_SHARE = { share, copy, url: shareURL, PUBLIC_URL, BTN: SHARE_BTN, PRIMARY: SHARE_PRIMARY };
Object.assign(window, { ShareButton, ShareIcon, MCU_SHARE });
export { MCU_SHARE };
