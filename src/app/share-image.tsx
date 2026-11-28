import React from 'react';
import { cn } from '@/lib/utils';
import type { SharePayload } from './share';
import type { ShareInput, ShareStop } from '../share-card/cards';
import type { PosterArt } from '../share-card/link-cards';
import type { Title } from '../types/catalog';

// The share card (Notion V4 Tasks, "Share 2/3"). A link can't carry someone's
// progress, so "my progress", a finished guide and the celebration toasts
// share an image with the link. Tapping Share opens this: the card, drawn on
// the device, and what can be done with it:
//   - phones that can share files: Share image (the system share sheet, with
//     the image, the message and the link), and Copy link;
//   - everywhere else: Download image and Copy link.
// The card is drawn before the Share image button can be pressed, so the
// share sheet opens straight from that tap, as Safari requires.
// Desktop shows it in a dialog, phones in a sheet (focus trapped, Back closes).

export interface ShareImageRequest {
  /** The dialog's heading. */
  heading: string;
  /** The image's description, for screen readers. */
  alt: string;
  /** Downloaded file's name, without extension. */
  filename: string;
  payload: SharePayload;
  render: () => Promise<Blob>;
}

let current: (ShareImageRequest & { key: number }) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function openShareImage(req: ShareImageRequest) {
  current = { ...req, key: Date.now() };
  emit();
}
function close() { current = null; emit(); }

/** The renderer, loaded the first time a card is opened. */
export const cardRenderer = () => import('../share-card/render-browser');

// The share card's actions: full-height buttons that share a row on desktop
// and stack, primary first, on phones (a long label never wraps inside one).
const ACTION = 'h-[max(44px,2.75rem)] flex-[1_1_160px]';

// The renderer, its fonts and its layout engine are hashed files loaded only
// when a card is first drawn, and the renderer's name changes with every
// deploy (it carries the app's stylesheet). A tab opened before a deploy then
// asks for files that are gone (Notion "Share your progress: the image
// doesn't draw"): only a reload brings the new ones. Chrome, Firefox and
// Safari word a failed lazy import differently; a font or yoga 404 is ours.
const STALE = /dynamically imported module|Importing a module script failed|share card: (font|yoga)\b.* 404$/i;
const staleBuild = (e: unknown) => STALE.test(String((e && (e as Error).message) || e));

function ShareImageBody({ req, touch }: { req: ShareImageRequest; touch: boolean }) {
  const tr = window.MCU_I18N.tr;
  const [blob, setBlob] = React.useState<Blob | null>(null);
  const [failed, setFailed] = React.useState<false | 'stale' | 'error'>(false);
  const [url, setUrl] = React.useState('');
  React.useEffect(() => {
    let live = true;
    req.render().then((b) => { if (live) { setBlob(b); setUrl(URL.createObjectURL(b)); } })
      .catch((e) => { console.warn('[mcu] share card', e); if (live) setFailed(staleBuild(e) ? 'stale' : 'error'); });
    return () => { live = false; };
  }, [req]);
  React.useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const file = blob ? new File([blob], req.filename + '.png', { type: 'image/png' }) : null;
  const canShareFile = !!(touch && file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));
  const shareImage = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: tr('app.name'), text: req.payload.text, url: window.MCU_SHARE.url(req.payload.params) });
      close();
    } catch (e) {
      if (e && (e as DOMException).name === 'AbortError') return;
      console.warn('[mcu] share image', e);
    }
  };
  return (
    <div className="share-image flex flex-col gap-4 text-foreground">
      <h2 id="share-image-title" className="share-image-title pr-9 text-title font-semibold tracking-tight">{req.heading}</h2>
      <div className="share-image-frame mx-auto flex aspect-[4/5] h-[min(52vh,500px)] max-w-full items-center justify-center overflow-hidden rounded-xl border bg-muted [&_img]:block [&_img]:size-full [&_img]:object-contain" aria-busy={!url && !failed}>
        {url ? <img src={url} alt={req.alt} width={1080} height={1350}/>
          : <span className="share-image-wait px-6 text-center text-body text-muted-foreground" role="status">{tr(failed === 'stale' ? 'share.imageStale' : failed ? 'share.imageFailed' : 'share.imageLoading')}</span>}
      </div>
      <div className="share-image-actions flex flex-wrap gap-2">
        {failed === 'stale' && (
          <button type="button" className={cn('share-image-reload', window.MCU_SHARE.BTN, window.MCU_SHARE.PRIMARY, ACTION, touch && 'basis-full')} onClick={() => window.location.reload()}>
            <span>{tr('share.reload')}</span>
          </button>
        )}
        {canShareFile && (
          <button type="button" className={cn(window.MCU_SHARE.BTN, window.MCU_SHARE.PRIMARY, ACTION, touch && 'basis-full')} onClick={shareImage}>
            <window.ShareIcon/><span>{tr('share.shareImage')}</span>
          </button>
        )}
        {!canShareFile && url && (
          <a className={cn(window.MCU_SHARE.BTN, window.MCU_SHARE.PRIMARY, ACTION, touch && 'basis-full')} href={url} download={req.filename + '.png'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
            </svg>
            <span>{tr('share.downloadImage')}</span>
          </a>
        )}
        <button type="button" className={cn(window.MCU_SHARE.BTN, ACTION, touch && 'basis-full')} onClick={() => window.MCU_SHARE.copy(req.payload)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>
          </svg>
          <span>{tr('share.copyLink')}</span>
        </button>
      </div>
    </div>
  );
}

/** Rendered once by the app, beside the status toast. */
export function ShareImageHost({ touch }: { touch: boolean }) {
  const req = React.useSyncExternalStore(subscribe, () => current);
  if (!req) return null;
  if (touch) {
    const Sheet = window.Sheet;
    return (
      <Sheet onClose={close} tall labelledBy="share-image-title">
        <div className="share-image-sheet pb-2"><ShareImageBody key={req.key} req={req} touch/></div>
      </Sheet>
    );
  }
  const ModalDialog = window.ModalDialog;
  return (
    <ModalDialog onClose={close} labelledBy="share-image-title" className="share-image-dialog w-[min(440px,calc(100vw-32px))]">
      <ShareImageBody key={req.key} req={req} touch={false}/>
    </ModalDialog>
  );
}

// ---- The cards (Notion "Share images: re-create every share card in the new
// style"; Figma: Social Media and OG link preview file, "4. Share cards – new
// style"). The app picks the words and the stops; share-card/cards.ts draws
// them, and the renderer fetches the posters.

/** A title's poster for a card: its address, which the renderer fetches, over
 *  its own color (the renderer's card color when it has none). */
export function sharePoster(id: string): PosterArt {
  const media = window.MEDIA;
  const local = media && media.local_posters && media.local_posters[id];
  const path = media && media.posters && media.posters[id];
  const raw = local || (path ? media.poster_base + path : '');
  const src = raw ? (window.mediaURL ? window.mediaURL('p', id, raw) || raw : raw) : '';
  return { src, color: (media && media.poster_color && media.poster_color[id]) || '' };
}

// The progress card's six stops, one poster per phase (Figma "progress"):
// the first is Phase 1's, the last Phase 6's.
const PHASE_POSTERS = ['iron-man', 'cap-winter-soldier', 'infinity-war', 'no-way-home', 'gotg-3', 'fantastic-four'];
const byRelease = (a: Title, b: Title) => (a.release < b.release ? -1 : a.release > b.release ? 1 : 0);
const releasedTitles = () => (window.TITLES || []).filter((t) => window.MCU_isReleased && window.MCU_isReleased(t)).sort(byRelease);

/** The six phase stops, lit as far as the visitor's share of released titles
 *  reaches: none at 0, all six only when every one is seen, and at least the
 *  first once one is. */
function phaseStops(seen: number, total: number): ShareStop[] {
  const released = releasedTitles();
  const all = total > 0 && seen >= total;
  const lit = all ? 6 : seen <= 0 || total <= 0 ? 0 : Math.min(5, Math.max(1, Math.round((seen / total) * 6)));
  // A pick that's gone from the catalog gives way to its phase's first title.
  const known = new Set((window.TITLES || []).map((t) => t.id));
  return PHASE_POSTERS.map((id, i) => {
    const pick = known.has(id) ? id : (released.find((t) => t.phase === i + 1) || { id }).id;
    return { poster: sharePoster(pick), lit: i < lit };
  });
}

export type Milestone = { kind: 'all' } | { kind: 'phase'; phase: number };

/** The progress card: account's "Share my progress", the Guides page, and the
 *  celebration toasts. A milestone gets its own card: a finished phase climbs
 *  through that phase's titles; every title seen is All caught up, which is
 *  also what the progress card becomes at 100%. */
export function openProgressCard(seen: number, total: number, milestone?: Milestone) {
  const tr = window.MCU_I18N.tr;
  const all = (milestone && milestone.kind === 'all') || (total > 0 && seen >= total);
  const phase = milestone && milestone.kind === 'phase' ? milestone.phase : 0;
  const text = phase ? tr('share.phaseText', { n: phase }) : milestone ? tr('share.allText') : '';
  const input = (): ShareInput => {
    const site = cardSite();
    const count = { kind: 'count' as const, n: String(seen), of: tr('card.countOf', { total }) };
    if (phase) {
      const titles = releasedTitles().filter((t) => t.phase === phase);
      const stops = titles.map((t) => ({ poster: sharePoster(t.id), lit: true }));
      return { site, kicker: tr('card.kickerPhase', { n: phase }), headline: { kind: 'line', text },
        support: tr('card.seenOf', { n: seen, total }),
        art: { layout: 'climb', stops: stops.slice(0, -1), last: stops[stops.length - 1] || { poster: sharePoster(''), lit: true } } };
    }
    if (all) {
      return { site, kicker: tr('card.kickerAll'), headline: count, support: tr('share.allText'), supportWidth: 640,
        art: { layout: 'phases', stops: phaseStops(seen, total) } };
    }
    return { site, kicker: tr('card.kickerProgress'), headline: count, support: tr('card.progressCaption'),
      art: { layout: 'phases', stops: phaseStops(seen, total) } };
  };
  openShareImage({
    heading: tr('share.imageProgress'),
    alt: tr('share.imageAltProgress', { n: seen, total }),
    filename: 'red-thread-progress',
    payload: { text: text || tr('share.progressText', { n: seen, total }) },
    render: async () => (await cardRenderer()).renderShare(input()),
  });
}

/** "redthread.tv", from the address every link uses. */
export const cardSite = () => new URL(window.MCU_SHARE.PUBLIC_URL).host;

const MCU_SHARE_IMAGE = { open: openShareImage, progress: openProgressCard, renderer: cardRenderer, site: cardSite, poster: sharePoster };
Object.assign(window, { ShareImageHost, MCU_SHARE_IMAGE });
export { MCU_SHARE_IMAGE };
