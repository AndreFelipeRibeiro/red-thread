// The share card, drawn on the visitor's device (Notion V4 Tasks, "Share
// 2/3"; the V5 style: Notion "Share images: re-create every share card in the
// new style"). Loaded only when someone opens it (src/app/share-image.tsx
// imports this lazily), so Satori and the fonts never weigh on the app's
// first load.
//
// The template is cards.ts: Satori turns the layout into an SVG whose text is
// already outlines, so the browser draws it without needing the fonts, and a
// canvas turns it into a PNG.
// The standalone build, given its layout engine (yoga) explicitly: the default
// build looks for yoga.wasm beside itself, which a bundle doesn't have.
import satori, { init } from 'satori/standalone';
import yogaURL from 'satori/yoga.wasm?url';
import css from '../index.css?raw';
import markSvg from '../assets/logo-mark.svg?raw';
import wordSvg from '../assets/logo-wordmark.svg?raw';
import w400 from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import w500 from '@fontsource/inter/files/inter-latin-500-normal.woff?url';
import w600 from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import w700 from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import { CARD, shareCard } from './cards';
import type { Fonts, Node, ShareInput, ShareStop } from './cards';
import { paintSVG } from './link-cards';
import { readLightTokens, shareColors } from './tokens';

let fonts: Promise<Fonts[]> | null = null;
function loadFonts(): Promise<Fonts[]> {
  if (!fonts) {
    fonts = Promise.all(([[400, w400], [500, w500], [600, w600], [700, w700]] as const).map(async ([weight, url]) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('share card: font ' + url + ' ' + r.status);
      return { name: 'Inter', data: await r.arrayBuffer(), weight, style: 'normal' as const };
    }));
    fonts.catch(() => { fonts = null; });
  }
  return fonts;
}

let ready: Promise<void> | null = null;
function loadYoga(): Promise<void> {
  if (!ready) {
    ready = fetch(yogaURL).then((r) => { if (!r.ok) throw new Error('share card: yoga ' + r.status); return r.arrayBuffer(); }).then((b) => init(b));
    ready.catch(() => { ready = null; });
  }
  return ready;
}

const colors = shareColors(readLightTokens(css));
const brand = { mark: paintSVG(markSvg, colors.logo), word: paintSVG(wordSvg, colors.foreground) };

// The posters come from TMDB's image service (window.MEDIA's poster_base),
// which allows cross-origin reads. Each is fetched once per visit, and a
// poster that fails or takes too long is left out: its stop keeps the
// poster's own color, and the card still draws (open question 1 on the
// ticket, settled when the design was approved).
const POSTER_WAIT = 6000;

/** Satori reads JPEG and PNG only, and TMDB serves some ".jpg" posters as
 *  WebP (Eternals): those are redrawn as a JPEG first. The bytes decide, not
 *  the address or the header. */
async function jpegOrPNG(blob: Blob): Promise<Blob> {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const jpeg = head[0] === 0xff && head[1] === 0xd8;
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (jpeg || png) return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('share card: no 2d canvas');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('share card: poster not redrawn'))), 'image/jpeg', 0.9));
}
const posters = new Map<string, Promise<string>>();
function posterData(url: string): Promise<string> {
  if (!url) return Promise.resolve('');
  let p = posters.get(url);
  if (!p) {
    p = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), POSTER_WAIT);
      try {
        // 'reload': TMDB sends its cross-origin header only to requests that ask
        // (no Vary), so a copy the page's own <img> cached would fail here.
        const r = await fetch(url, { signal: ctrl.signal, cache: 'reload' });
        if (!r.ok) throw new Error(String(r.status));
        const blob = await jpegOrPNG(await r.blob());
        return await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('[mcu] share card poster', url, e);
        posters.delete(url);
        return '';
      } finally {
        clearTimeout(timer);
      }
    })();
    posters.set(url, p);
  }
  return p;
}

/** The input with every poster's address swapped for its image data. */
async function withPosters(input: ShareInput): Promise<ShareInput> {
  const load = async (s: ShareStop): Promise<ShareStop> => ({ ...s, poster: { color: s.poster.color || colors.card, src: await posterData(s.poster.src) } });
  const art = input.art;
  if (art.layout === 'phases') return { ...input, art: { ...art, stops: await Promise.all(art.stops.map(load)) } };
  const [stops, last] = await Promise.all([Promise.all(art.stops.map(load)), load(art.last)]);
  return { ...input, art: { ...art, stops, last } };
}

async function toPNG(node: Node): Promise<Blob> {
  const [loaded] = await Promise.all([loadFonts(), loadYoga()]);
  const svg = await satori(node as unknown as Parameters<typeof satori>[0], { ...CARD, fonts: loaded });
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = CARD.width;
    canvas.height = CARD.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('share card: no 2d canvas');
    ctx.drawImage(img, 0, 0, CARD.width, CARD.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('share card: empty image'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

/** The input with no posters: each stop keeps its poster's color. */
function withoutPosters(input: ShareInput): ShareInput {
  const bare = (s: ShareStop): ShareStop => ({ ...s, poster: { color: s.poster.color || colors.card, src: '' } });
  const art = input.art;
  return { ...input, art: art.layout === 'phases' ? { ...art, stops: art.stops.map(bare) } : { ...art, stops: art.stops.map(bare), last: bare(art.last) } };
}

/** Draws a card. Its posters' `src` are addresses, fetched here. Should a
 *  poster still upset Satori, the card is drawn again without posters rather
 *  than not at all. */
export async function renderShare(input: ShareInput): Promise<Blob> {
  const full = await withPosters(input);
  try {
    return await toPNG(shareCard(full, colors, brand));
  } catch (e) {
    if (staleFile(e)) throw e;
    console.warn('[mcu] share card: drawn without posters', e);
    return toPNG(shareCard(withoutPosters(input), colors, brand));
  }
}
/** A font or layout engine that's gone after a deploy: share-image.tsx offers
 *  a reload for those, so they aren't retried here. */
const staleFile = (e: unknown) => /share card: (font|yoga)\b/.test(String((e && (e as Error).message) || e));
export { colors as cardPalette };
