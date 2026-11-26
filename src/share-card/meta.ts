// The link-preview tags of one page (Notion V4 Tasks, "Share 3/3"). The build
// writes a copy of the built index.html for each title, character and guide
// with these tags, its <title> and its readable text (Notion "Findability 3")
// changed and nothing else, so the app on that page behaves exactly as on the
// home page; middleware.ts serves the copy at the page's own address.

export interface PreviewTags {
  title: string;
  description: string;
  /** Absolute: crawlers fetch it without reading anything else. */
  url: string;
  image: string;
  alt: string;
}

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Sets one <meta> tag's content, by property or name. Throws if the tag is
 *  missing, so a change to index.html can't silently break every preview. */
function setMeta(html: string, key: 'property' | 'name', id: string, value: string): string {
  const re = new RegExp(`(<meta ${key}="${id.replace(/[.:]/g, '\\$&')}" content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`share-card: index.html has no <meta ${key}="${id}">`);
  return html.replace(re, (_, a: string, b: string) => a + attr(value) + b);
}

/** Sets the canonical address, which names the page a search engine should
 *  list for this content: each shared link's own, never the home page. */
function setCanonical(html: string, url: string): string {
  const re = /(<link rel="canonical" href=")[^"]*(")/;
  if (!re.test(html)) throw new Error('share-card: index.html has no <link rel="canonical">');
  return html.replace(re, (_, a: string, b: string) => a + attr(url) + b);
}

/** The page's own <title>, which search results show (Notion "Findability
 *  3"): the preview's title, never the home page's. */
function setTitle(html: string, title: string): string {
  const re = /<title>[^<]*<\/title>/;
  if (!re.test(html)) throw new Error('share-card: index.html has no <title>');
  return html.replace(re, () => `<title>${attr(title)}</title>`);
}

/** Puts a page's readable text (page-text.ts) first inside #root, where the
 *  app's first render replaces it. */
export function insertPageText(html: string, text: string): string {
  const marker = '<div id="root">';
  if (!html.includes(marker)) throw new Error('share-card: index.html has no <div id="root">');
  return html.replace(marker, () => marker + text);
}

/** Puts a block (the page's structured data; structured-data.ts) at the end
 *  of <head>. */
export function insertInHead(html: string, block: string): string {
  if (!html.includes('</head>')) throw new Error('share-card: index.html has no </head>');
  return html.replace('</head>', () => block + '</head>');
}

export function applyPreviewTags(html: string, t: PreviewTags): string {
  let out = html;
  out = setTitle(out, t.title);
  out = setMeta(out, 'property', 'og:title', t.title);
  out = setMeta(out, 'property', 'og:description', t.description);
  out = setMeta(out, 'name', 'description', t.description);
  out = setMeta(out, 'property', 'og:url', t.url);
  out = setMeta(out, 'property', 'og:image', t.image);
  out = setMeta(out, 'property', 'og:image:type', 'image/jpeg');
  out = setMeta(out, 'property', 'og:image:alt', t.alt);
  out = setMeta(out, 'name', 'twitter:title', t.title);
  out = setMeta(out, 'name', 'twitter:description', t.description);
  out = setMeta(out, 'name', 'twitter:image:alt', t.alt);
  out = setCanonical(out, t.url);
  return out;
}

// The Portuguese pages (Notion "Findability 6"): each is a copy of its
// English twin's HTML in Portuguese, at /pt/… (src/share-card/addresses.ts).

/** <html lang="…">: what search engines and screen readers read the page as. */
export function setHtmlLang(html: string, lang: string): string {
  const re = /<html lang="[^"]*">/;
  if (!re.test(html)) throw new Error('share-card: index.html has no <html lang="…">');
  return html.replace(re, `<html lang="${attr(lang)}">`);
}

/** og:locale and its alternate (pt_BR first on a Portuguese page). */
export function setOgLocale(html: string, locale: string, alternate: string): string {
  return setMeta(setMeta(html, 'property', 'og:locale', locale), 'property', 'og:locale:alternate', alternate);
}

/** The links between a page's two languages, for <head>: each version names
 *  both, and English is the default for every other language. Absolute
 *  addresses, as search engines require. */
export function hreflangLinks(en: string, pt: string): string {
  return `<link rel="alternate" hreflang="en" href="${attr(en)}"/>`
    + `<link rel="alternate" hreflang="pt-BR" href="${attr(pt)}"/>`
    + `<link rel="alternate" hreflang="x-default" href="${attr(en)}"/>`;
}
