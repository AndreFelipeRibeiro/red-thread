// Link previews, rendered by the build (Notion V4 Tasks, "Share 3/3").
//
// For the app-wide card and every title, character and guide this writes
//   dist/og/<kind>/<id>.jpg    the 1200×630 preview image
//   dist/og/<kind>/<id>.html   the built index.html with that preview's tags
// and middleware.ts serves the .html to /?title=…, /?char=… and /?guide=….
// Images are static files: the CDN caches them and they cost nothing per
// visit. The app-wide card is dist/og/default.jpg, and index.html points at it.
// JPEG, because the posters make PNGs of 250–450 KB and WhatsApp skips a
// preview over 300 KB; jpeg-js encodes the pixels resvg draws.
//
// It runs in Vercel's build, so no browser: Satori lays the card out and turns
// its text into outlines (src/share-card/link-cards.ts), and resvg rasterises
// the SVG. Fonts are the design system's Inter, as static .woff files (Satori
// can't read woff2). The pictures are the real posters and portraits, from
// TMDB's image CDN (no key), fetched once per build; a title or character
// whose image can't be fetched fails the build rather than getting
// placeholder art (Notion "Link preview images", Andre's review).
//
// Called from vite.config.js after the bundle is written. Not in tools/,
// because .vercelignore keeps tools/ out of Vercel's build.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { transformWithOxc } from 'vite';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
import { readLightTokens, previewColors } from '../src/share-card/tokens.ts';
import { linkCard, paintSVG, LINK } from '../src/share-card/link-cards.ts';
import { previewEntries } from '../src/share-card/previews.ts';
import { applyPreviewTags } from '../src/share-card/meta.ts';

/** Production, under the public name (src/app/share.tsx's PUBLIC_URL). */
export const SITE = 'https://redthread.tv';

const require = createRequire(import.meta.url);

// The catalog files publish on `window`; run them in a sandbox that has one,
// rather than giving the build process a fake window.
async function loadCatalog(root) {
  const window = {};
  for (const file of ['src/data/data.ts', 'src/data/guides.ts', 'src/data/media-data.ts']) {
    // Type-stripping only: the data files import nothing but types.
    const { code } = await transformWithOxc(readFileSync(join(root, file), 'utf8'), file, { lang: 'ts' });
    // Oxc keeps the file a module with an empty `export {};`; the sandbox runs
    // it as a plain script.
    vm.runInNewContext(code.replace(/^export \{\};?\s*$/m, ''), { window, console });
  }
  return { titles: window.TITLES, characters: window.CHARACTERS, guides: window.GUIDES, media: window.MEDIA };
}

function loadLocale(root, code) {
  const window = { MCU_LOCALES: {} };
  vm.runInNewContext(readFileSync(join(root, 'locales', code + '.js'), 'utf8'), { window });
  return window.MCU_LOCALES[code];
}

export function loadFonts() {
  const file = (w) => readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${w}-normal.woff`));
  return [400, 500, 600, 700].map((weight) => ({ name: 'Inter', data: file(weight), weight, style: 'normal' }));
}

/** About 100–200 KB a card, with the posters still clean at feed size. */
const JPEG_QUALITY = 85;

// TMDB's image CDN: posters at w342 (the app's own size), portraits at w185.
const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

/** Every image the previews draw, as data URIs, fetched a few at a time with
 *  retries. Kept in node_modules/.cache between local builds: a TMDB path
 *  names one image for good, so a cached file never goes stale. */
async function fetchImages(urls, cacheDir) {
  mkdirSync(cacheDir, { recursive: true });
  const out = new Map();
  const queue = [...new Set(urls)];
  const failed = [];
  // Satori reads PNG and JPEG only, and TMDB serves the odd size as WebP
  // whatever the name says (Eternals at w342): try the next size up.
  const readable = (b) => b && b.length > 4 && ((b[0] === 0xff && b[1] === 0xd8) || b[0] === 0x89);
  const SIZES = ['w342', 'w500', 'w185', 'w780'];
  async function get(url) {
    const file = join(cacheDir, url.replace(/^https:\/\/image\.tmdb\.org\/t\/p\//, '').replace(/[^a-z0-9.]+/gi, '_'));
    if (existsSync(file)) return readFileSync(file);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        if (readable(buf)) writeFileSync(file, buf);
        return buf;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  async function one(url) {
    const size = (url.match(/\/t\/p\/(\w+)\//) || [])[1];
    const tries = [url, ...SIZES.filter((s) => s !== size).map((s) => url.replace('/t/p/' + size + '/', '/t/p/' + s + '/'))];
    let last = 'not a PNG or JPEG at any size';
    for (const u of tries) {
      try {
        const buf = await get(u);
        if (readable(buf)) {
          out.set(url, `data:${buf[0] === 0x89 ? 'image/png' : 'image/jpeg'};base64,${buf.toString('base64')}`);
          return;
        }
      } catch (e) { last = e.message; }
    }
    failed.push(`${url} (${last})`);
  }
  const workers = Array.from({ length: 8 }, async () => { while (queue.length) await one(queue.shift()); });
  await Promise.all(workers);
  if (failed.length) throw new Error('link previews: these images could not be fetched, and a preview never falls back to placeholder art:\n  ' + failed.join('\n  '));
  return out;
}

export async function buildPreviews({ root, outDir }) {
  const started = Date.now();
  const colors = previewColors(readLightTokens(readFileSync(join(root, 'src/index.css'), 'utf8')));
  const brand = {
    mark: paintSVG(readFileSync(join(root, 'src/assets/logo-mark.svg'), 'utf8'), colors.logo),
    word: paintSVG(readFileSync(join(root, 'src/assets/logo-wordmark.svg'), 'utf8'), colors.foreground),
  };
  const fonts = loadFonts();
  const catalog = await loadCatalog(root);
  const { media } = catalog;
  const posterURL = (id) => {
    if (!media.posters[id]) throw new Error('link previews: no poster for title ' + id + ' in src/data/media-data.ts');
    return media.poster_base + media.posters[id];
  };
  const portraitURL = (id) => {
    if (!media.actors[id]) throw new Error('link previews: no portrait for character ' + id + ' in src/data/media-data.ts');
    return PROFILE_BASE + media.actors[id];
  };
  const fetched = await fetchImages([
    ...catalog.titles.map((t) => posterURL(t.id)),
    ...Object.keys(catalog.characters).filter((id) => media.actors[id]).map(portraitURL),
  ], join(root, 'node_modules', '.cache', 'og-images'));
  const images = {
    poster: (id) => ({ src: fetched.get(posterURL(id)), color: media.poster_color[id] || colors.card }),
    portrait: (id) => fetched.get(portraitURL(id)),
  };
  const entries = previewEntries(catalog, loadLocale(root, 'en'), colors, SITE.replace(/^https:\/\//, ''), images);
  const index = readFileSync(join(outDir, 'index.html'), 'utf8');
  let bytes = 0;
  for (const e of entries) {
    const svg = await satori(linkCard(e.input, colors, brand), { ...LINK, fonts });
    // The text is already outlines, so resvg needs no fonts: without this it
    // scans the machine's system fonts for every image (about a second each).
    const pic = new Resvg(svg, { fitTo: { mode: 'width', value: LINK.width }, font: { loadSystemFonts: false } }).render();
    const jpg = jpeg.encode({ data: pic.pixels, width: pic.width, height: pic.height }, JPEG_QUALITY).data;
    const dir = e.kind === 'default' ? join(outDir, 'og') : join(outDir, 'og', e.kind);
    mkdirSync(dir, { recursive: true });
    const name = e.kind === 'default' ? 'default' : e.id;
    writeFileSync(join(dir, name + '.jpg'), jpg);
    bytes += jpg.length;
    if (e.kind === 'default') continue;
    const query = { title: 'title', char: 'char', guide: 'guide' }[e.kind];
    writeFileSync(join(dir, name + '.html'), applyPreviewTags(index, {
      title: e.title, description: e.description, alt: e.alt,
      url: `${SITE}/?${query}=${encodeURIComponent(e.id)}`,
      image: `${SITE}/og/${e.kind}/${name}.jpg`,
    }));
  }
  return { count: entries.length, bytes, ms: Date.now() - started };
}
