// Link previews, rendered by the build (Notion V4 Tasks, "Share 3/3").
//
// For the app-wide card and every title, character and guide this writes
//   dist/og/<kind>/<id>.jpg    the 1200×630 preview image
//   dist/og/<kind>/<id>.html   the built index.html with that preview's tags,
//                              its own <title> and its readable text
//   dist/og/index/<segment>.html  (Findability 4) /guides, /titles and
//                              /characters, each listing every item with a link
//   dist/index.html            the home page gets its readable text too
// and every one of those pages its structured data (JSON-LD; Findability 5)
//   dist/robots.txt, dist/sitemap.xml   (Findability 1) every page listed
//   dist/llms.txt, dist/llms-full.txt   (Findability 7) the same, for assistants
// and middleware.ts serves the .html at /titles/<id>, /characters/<id> and
// /guides/<id> (Notion "Findability 3"), redirecting the old ?title= links.
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
import { previewEntries, makeTr } from '../src/share-card/previews.ts';
import { applyPreviewTags, insertPageText, insertInHead, setHtmlLang, setOgLocale, hreflangLinks } from '../src/share-card/meta.ts';
import { structuredData, jsonLdScript } from '../src/share-card/structured-data.ts';
import { pageTexts, INDEXES } from '../src/share-card/page-text.ts';
import { thingPath, indexPath, homePath, ptSlug } from '../src/share-card/addresses.ts';
import { robotsTxt, sitemapXml, llmsTxt, llmsFullTxt } from '../src/share-card/site-files.ts';

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
  const en = loadLocale(root, 'en');
  const entries = previewEntries(catalog, en, colors, SITE.replace(/^https:\/\//, ''), images);
  const texts = pageTexts(catalog, en);
  const data = structuredData(SITE, catalog, en);
  // The Portuguese pages (Notion "Findability 6"): Portuguese tables over the
  // English ones, as the app falls back key by key.
  const ptRaw = loadLocale(root, 'pt-BR');
  const pt = {
    strings: { ...en.strings, ...ptRaw.strings },
    titles: { ...(ptRaw.titles || {}) },
    characters: { ...(ptRaw.characters || {}) },
    synopses: { ...(en.synopses || {}), ...(ptRaw.synopses || {}) },
    releases: { ...(ptRaw.releases || {}) },
  };
  const ptEntries = previewEntries(catalog, pt, colors, SITE.replace(/^https:\/\//, ''), images, 'pt-BR');
  const ptTexts = pageTexts(catalog, pt, 'pt-BR');
  const ptData = structuredData(SITE, catalog, pt, 'pt-BR');
  /** A page's readable text, its JSON-LD and its hreflang pair (both
   *  languages' absolute addresses), keyed like the texts. */
  const finish = (html, key, pair, lang = 'en') => {
    const t = (lang === 'pt-BR' ? ptTexts : texts).get(key), d = (lang === 'pt-BR' ? ptData : data).get(key);
    if (!t || !d) throw new Error('link previews: no page text or structured data for ' + lang + ' ' + key);
    return insertInHead(insertPageText(html, t), jsonLdScript(d) + hreflangLinks(pair[0], pair[1]));
  };
  /** Both addresses of a page, English first. */
  const pairFor = (kind, id) => [SITE + thingPath(kind, id), SITE + thingPath(kind, id, 'pt-BR')];
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
    // Each page's own address (src/share-card/addresses.ts) is its canonical,
    // and its readable text goes in for crawlers (page-text.ts).
    writeFileSync(join(dir, name + '.html'), finish(applyPreviewTags(index, {
      title: e.title, description: e.description, alt: e.alt,
      url: SITE + thingPath(e.kind, e.id),
      image: `${SITE}/og/${e.kind}/${name}.jpg`,
    }), e.kind + '/' + e.id, pairFor(e.kind, e.id)));
  }
  // The Portuguese copies, named by their slug (src/share-card/pt-slugs.ts)
  // so middleware.ts serves /pt/titulos/<slug> straight from the file. They
  // show the English preview image for now: its words are English.
  const ptIndex = setOgLocale(setHtmlLang(index, 'pt-BR'), 'pt_BR', 'en_US');
  for (const e of ptEntries) {
    if (e.kind === 'default') continue;
    const dir = join(outDir, 'og', 'pt', e.kind);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, ptSlug(e.kind, e.id) + '.html'), finish(applyPreviewTags(ptIndex, {
      title: e.title, description: e.description, alt: e.alt,
      url: SITE + thingPath(e.kind, e.id, 'pt-BR'),
      image: `${SITE}/og/${e.kind}/${e.id}.jpg`,
    }), e.kind + '/' + e.id, pairFor(e.kind, e.id), 'pt-BR'));
  }
  // The index pages (Findability 4), with the app-wide card as their preview,
  // and the home page's own text, written last: every copy above is made
  // from the built index.html as it was.
  const tr = makeTr(en);
  const ptTr = makeTr(pt);
  mkdirSync(join(outDir, 'og', 'index'), { recursive: true });
  mkdirSync(join(outDir, 'og', 'pt', 'index'), { recursive: true });
  for (const i of INDEXES) {
    const pair = [SITE + indexPath(i.segment), SITE + indexPath(i.segment, 'pt-BR')];
    writeFileSync(join(outDir, 'og', 'index', i.segment + '.html'), finish(applyPreviewTags(index, {
      title: tr('og.pageTitle', { name: tr(i.name), app: tr('app.name') }),
      description: tr(i.description), alt: tr('og.defaultAlt'),
      url: `${SITE}/${i.segment}`, image: `${SITE}/og/default.jpg`,
    }), 'index/' + i.segment, pair));
    writeFileSync(join(outDir, 'og', 'pt', 'index', i.segment + '.html'), finish(applyPreviewTags(ptIndex, {
      title: ptTr('og.pageTitle', { name: ptTr(i.name), app: ptTr('app.name') }),
      description: ptTr(i.description), alt: ptTr('og.defaultAlt'),
      url: pair[1], image: `${SITE}/og/default.jpg`,
    }), 'index/' + i.segment, pair, 'pt-BR'));
  }
  const homePair = [SITE + homePath(), SITE + homePath('pt-BR')];
  writeFileSync(join(outDir, 'og', 'pt', 'home.html'), finish(applyPreviewTags(ptIndex, {
    title: ptTr('og.defaultTitle', { app: ptTr('app.name') }), description: ptTr('og.defaultSub'), alt: ptTr('og.defaultAlt'),
    url: homePair[1], image: `${SITE}/og/default.jpg`,
  }), 'home', homePair, 'pt-BR'));
  writeFileSync(join(outDir, 'index.html'), finish(index, 'home', homePair));
  // robots.txt and the sitemap of the pages just written (Notion
  // "Findability 1"; src/share-card/site-files.ts).
  const pages = entries.filter((e) => e.kind !== 'default').map((e) => e.kind + '/' + e.id);
  writeFileSync(join(outDir, 'robots.txt'), robotsTxt(SITE));
  writeFileSync(join(outDir, 'sitemap.xml'), sitemapXml(SITE, catalog, pages));
  // And the summary for AI assistants (Findability 7).
  writeFileSync(join(outDir, 'llms.txt'), llmsTxt(SITE, catalog, en, pages));
  writeFileSync(join(outDir, 'llms-full.txt'), llmsFullTxt(SITE, catalog, en, pages));
  return { count: entries.length, bytes, ms: Date.now() - started };
}
