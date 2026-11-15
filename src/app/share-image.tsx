import React from 'react';
import { cn } from 'cn';
import type { SharePayload } from './share';

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

function ShareImageBody({ req, touch }: { req: ShareImageRequest; touch: boolean }) {
  const tr = window.MCU_I18N.tr;
  const [blob, setBlob] = React.useState<Blob | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [url, setUrl] = React.useState('');
  React.useEffect(() => {
    let live = true;
    req.render().then((b) => { if (live) { setBlob(b); setUrl(URL.createObjectURL(b)); } })
      .catch((e) => { console.warn('[mcu] share card', e); if (live) setFailed(true); });
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
      <h2 id="share-image-title" className="share-image-title pr-9 text-lg font-semibold tracking-tight">{req.heading}</h2>
      <div className="share-image-frame mx-auto flex aspect-[4/5] h-[min(52vh,500px)] max-w-full items-center justify-center overflow-hidden rounded-xl border bg-muted [&_img]:block [&_img]:size-full [&_img]:object-contain" aria-busy={!url && !failed}>
        {url ? <img src={url} alt={req.alt} width={1080} height={1350}/>
          : <span className="share-image-wait px-6 text-center text-sm text-muted-foreground" role="status">{tr(failed ? 'share.imageFailed' : 'share.imageLoading')}</span>}
      </div>
      <div className="share-image-actions flex flex-wrap gap-2">
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

/** The progress card: account's "Share my progress" and the celebration
 *  toasts (whose message and footnote name the milestone). */
export function openProgressCard(seen: number, total: number, milestone?: string) {
  const tr = window.MCU_I18N.tr;
  openShareImage({
    heading: tr('share.imageProgress'),
    alt: tr('share.imageAltProgress', { n: seen, total }),
    filename: 'red-thread-progress',
    payload: { text: milestone || tr('share.progressText', { n: seen, total }) },
    render: async () => (await cardRenderer()).renderProgress({
      appName: tr('app.name'), site: cardSite(), seen, total,
      caption: tr('card.progressCaption'), footnote: milestone || tr('about.tagline'),
    }),
  });
}

/** "redthread.tv", from the address every link uses. */
export const cardSite = () => new URL(window.MCU_SHARE.PUBLIC_URL).host;

const MCU_SHARE_IMAGE = { open: openShareImage, progress: openProgressCard, renderer: cardRenderer, site: cardSite };
Object.assign(window, { ShareImageHost, MCU_SHARE_IMAGE });
export { MCU_SHARE_IMAGE };
