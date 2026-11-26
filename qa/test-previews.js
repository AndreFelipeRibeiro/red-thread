// Link previews (Notion V4 Tasks, "Share 3/3").
//   - The build wrote dist/og/default.jpg and, for every title, character and
//     guide, a 1200×630 JPEG and a page whose og: tags name it, point at
//     https://redthread.tv and differ from index.html in nothing else.
//   - index.html's own preview is the app-wide card on redthread.tv.
//   - Every page's twitter: tags equal its og: tags, its canonical address is
//     its own og:url, no tag says MCU Connections, and every image is under
//     300 KB (WhatsApp skips bigger ones). (Notion V4 Tasks, "Social media
//     post cover art".)
//   - The old address: vercel.json and the middleware send
//     mcu-connections.vercel.app to redthread.tv with the path and query,
//     never a preview address; the retired og-image.jpg goes to the new card.
//     (Notion V4 Tasks, "Rename the app to Red Thread".)
//   - Every page has its own address (Notion "Findability 3", option B1):
//     /titles/<id>, /characters/<id>, /guides/<id> is its og:url and
//     canonical, it has its own <title>, and its HTML carries its readable
//     text (src/share-card/page-text.ts): the name as the h1, and for a guide
//     every stop, in order, linking to its title's page.
//   - middleware.ts, run here against the built files: each page's address
//     gets its page; an unknown id there gets the home page with a 404; the
//     old /?title=, /?char= and /?guide= links are redirected (308) to the
//     page's address with the rest of the query kept; an unknown or malformed
//     id, a plain / and any other parameter pass through (the app-wide card).
//     Its table agrees with src/share-card/addresses.ts, which the app uses.
//   - robots.txt and sitemap.xml (Notion "Findability 1"): robots allows
//     everyone, names the AI crawlers and points at the sitemap; the sitemap
//     lists the home page and every page's address exactly once (no ?guide=
//     link, no draft), guides with their reviewed date. Off redthread.tv
//     every answer says noindex (vercel.json and the middleware).
//   - llms.txt and llms-full.txt (Notion "Findability 7"): a summary, every
//     page linked at its own address, every guide's stops in order.
//   - The app boots from a page at its address exactly as from index.html,
//     opens what the page names and keeps the address.
//   - The tab title follows what is open (Notion "Findability 2").
//   - Findability 5: every page carries one JSON-LD block of its kind (home:
//     WebSite, Organization, WebApplication; a guide and a character an
//     ordered ItemList of their titles; a title a Movie or TVSeries with its
//     cast; an index an ItemList), every page but home a BreadcrumbList.
//     Findability 16: every Movie or TVSeries in it, list items too, has an
//     image the build wrote.
//   - Findability 14: indexnow-key.txt ships at the root for tools/indexnow.js.
//   - Findability 13: favicon.ico (48px) and favicon-96.png ship at the root
//     and index.html links both, sizes Google's search results can show.
//   - Findability 4: the index pages /guides, /titles and /characters list
//     every guide, title and character with a link (the middleware serves
//     them; /?view=guides and /?view=list redirect there); the home page's
//     HTML links to all three and to every guide; a title's page lists the
//     titles it connects to, a character's page who they share the most
//     titles with; the app boots at /guides on the Guides tab and keeps it.
// Every failed expectation lands in `errors`, which is what regress.sh gates on.
const QA_PORT = +process.env.PORT || 8304;
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { pathToFileURL } = require('url');

const S = __dirname;
const ROOT = path.join(S, '..');
const SITE = process.env.SITE ? path.join(S, process.env.SITE) : path.join(ROOT, 'dist');
const PUBLIC = 'https://redthread.tv';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(SITE, p);
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
const URL_BASE = 'http://127.0.0.1:' + QA_PORT + '/';
const NOWELCOME = "try { if (!localStorage.getItem('mcu.welcome.v1')) localStorage.setItem('mcu.welcome.v1', 'test'); localStorage.setItem('mcu.signInNudge.v1', '2'); } catch (e) {}";

// A JPEG's size, from its first frame header (SOF0–SOF3); null if it isn't one.
// JPEG since V5 (Notion "Link preview images"): the posters made PNGs too big.
const jpgSize = (file) => {
  const b = fs.readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
};
const meta = (html, prop) => { const m = html.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`)); return m ? m[1] : null; };
const canonical = (html) => { const m = html.match(/<link rel="canonical" href="([^"]*)"/); return m ? m[1] : null; };
const stripMeta = (html) => html
  .replace(/<meta (?:property="og:[a-z:]+"|name="(?:description|twitter:[a-z:]+)") content="[^"]*"\/>/g, '')
  .replace(/<link rel="canonical" href="[^"]*"\/>/g, '')
  .replace(/<title>[^<]*<\/title>/, '')
  .replace(/<article id="mcu-page-text"[\s\S]*?<\/article>/, '')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  // Each page names its own two languages (Findability 6).
  .replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*"\/>/g, '');
// A page's structured data (Findability 5): its one JSON-LD block, parsed;
// null when it has none, or more than one, or it isn't JSON.
const jsonLd = (html) => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) return null;
  try { const d = JSON.parse(blocks[0][1]); return d['@context'] === 'https://schema.org' && Array.isArray(d['@graph']) ? d['@graph'] : null; } catch (e) { return null; }
};
const ldTypes = (g) => (g || []).map(x => x['@type']).join(',');
// Every Movie or TVSeries anywhere in a graph, a list's items included, must
// carry an image the build wrote, or Google's Rich Results Test marks it
// invalid (Notion "Findability 16"). Returns the names of those that don't.
const filmsWithoutImage = (g) => {
  const bad = [];
  const walk = (x) => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== 'object') return;
    if (x['@type'] === 'Movie' || x['@type'] === 'TVSeries') {
      const m = typeof x.image === 'string' && x.image.match(/\/og\/title\/([a-z0-9-]+)\.jpg$/);
      if (!m || !fs.existsSync(path.join(SITE, 'og', 'title', m[1] + '.jpg'))) bad.push(x.name);
    }
    Object.values(x).forEach(walk);
  };
  walk(g);
  return bad;
};
const SEGMENT = { title: 'titles', guide: 'guides', char: 'characters' };
const pageText = (html) => { const m = html.match(/<article id="mcu-page-text"[^>]*>([\s\S]*?)<\/article>/); return m ? m[1] : null; };
const MAX_BYTES = 300 * 1024;
// The tags a preview is built from, which must agree with each other and
// carry the public name only.
const tagErrors = (html, label, url) => {
  const e = [];
  for (const [tw, og] of [['twitter:title', 'og:title'], ['twitter:description', 'og:description'], ['twitter:image:alt', 'og:image:alt']]) {
    if (meta(html, tw) !== meta(html, og)) e.push(`${label}: ${tw} "${meta(html, tw)}" is not its ${og} "${meta(html, og)}"`);
  }
  if (canonical(html) !== url) e.push(`${label}: canonical is ${canonical(html)}, not ${url}`);
  const tags = (html.match(/<meta (?:property="og:|name="twitter:)[^>]*>/g) || []).join('\n');
  if (/mcu[ -]connections/i.test(tags)) e.push(`${label}: a preview tag still says MCU Connections`);
  return e;
};

(async () => {
  await new Promise(r => server.listen(QA_PORT, r));
  const errors = [];
  const out = {};
  const expect = (ok, msg) => { if (!ok) errors.push(msg); };

  // ---- The build's files --------------------------------------------------
  const index = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  expect(meta(index, 'og:image') === PUBLIC + '/og/default.jpg', 'index.html: og:image is ' + meta(index, 'og:image'));
  expect(meta(index, 'og:url') === PUBLIC + '/', 'index.html: og:url is ' + meta(index, 'og:url'));
  const def = path.join(SITE, 'og', 'default.jpg');
  expect(fs.existsSync(def) && String(jpgSize(def)) === '1200,630', 'og/default.jpg missing or not a 1200×630 JPEG');
  expect(fs.existsSync(def) && fs.statSync(def).size < MAX_BYTES, 'og/default.jpg is 300 KB or more');
  expect(meta(index, 'og:image:type') === 'image/jpeg', 'index.html: og:image:type is ' + meta(index, 'og:image:type'));
  errors.push(...tagErrors(index, 'index.html', PUBLIC + '/'));
  expect(meta(index, 'og:site_name') === 'Red Thread' && meta(index, 'og:title') === 'Red Thread', 'index.html: og:site_name / og:title are not Red Thread');
  expect(!fs.existsSync(path.join(SITE, 'og-image.jpg')), 'the build still ships the old og-image.jpg');
  let biggest = fs.existsSync(def) ? fs.statSync(def).size : 0;
  // Favicons search results can show (Findability 13): Google wants a
  // multiple of 48px and asks for /favicon.ico whatever the page links.
  {
    const png = (f) => { const b = fs.readFileSync(f); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
    const icoFile = path.join(SITE, 'favicon.ico');
    const ico = fs.existsSync(icoFile) ? fs.readFileSync(icoFile) : null;
    const icoSizes = ico && ico.readUInt16LE(2) === 1 ? Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + 16 * i] || 256) : [];
    expect(icoSizes.includes(48), 'favicon.ico: missing or has no 48px image: ' + icoSizes);
    const p96 = path.join(SITE, 'favicon-96.png');
    expect(fs.existsSync(p96) && String(png(p96)) === '96,96', 'favicon-96.png: missing or not 96×96');
    const links = (index.match(/<link rel="icon"[^>]*>/g) || []).join('\n');
    expect(/sizes="48x48"/.test(links) && /\.ico"/.test(links), 'index.html: no 48px .ico icon link');
    expect(/sizes="96x96"/.test(links), 'index.html: no 96px icon link');
    out.favicon = { ico: icoSizes, links: (links.match(/sizes="[^"]+"/g) || []).join(' ') };
  }
  // IndexNow's key ships at the root, the same key tools/indexnow.js sends
  // (Findability 14).
  {
    const shipped = path.join(SITE, 'indexnow-key.txt');
    const key = fs.readFileSync(path.join(ROOT, 'indexnow-key.txt'), 'utf8').trim();
    expect(/^[a-f0-9]{32}$/.test(key), 'indexnow-key.txt: not a 32-character key');
    expect(fs.existsSync(shipped) && fs.readFileSync(shipped, 'utf8').trim() === key, 'the build does not ship indexnow-key.txt at the root');
    expect(/KEY_FILE = 'indexnow-key.txt'/.test(fs.readFileSync(path.join(ROOT, 'tools', 'indexnow.js'), 'utf8')), 'tools/indexnow.js does not send indexnow-key.txt');
  }

  // The catalog, read the way the app's own files publish it.
  const vm = require('vm');
  const { transformWithOxc } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);
  const win = {};
  for (const f of ['src/data/data.ts', 'src/data/guides.ts']) {
    const { code } = await transformWithOxc(fs.readFileSync(path.join(ROOT, f), 'utf8'), f, { lang: 'ts' });
    vm.runInNewContext(code.replace(/^export \{\};?\s*$/m, ''), { window: win, console });
  }
  // The frozen Portuguese slugs (Findability 6), read as the data they are.
  const PT_SLUGS = JSON.parse(/= (\{[\s\S]*\});/.exec(fs.readFileSync(path.join(ROOT, 'src/share-card/pt-slugs.ts'), 'utf8'))[1]);
  const sets = {
    title: win.TITLES.map(t => [t.id, t.title]),
    char: Object.keys(win.CHARACTERS).map(id => [id, win.CHARACTERS[id].name]),
    guide: win.GUIDES.map(g => [g.id, g.name.en]),
  };
  const base = stripMeta(index);
  let checked = 0;
  for (const kind of Object.keys(sets)) {
    for (const [id, name] of sets[kind]) {
      const png = path.join(SITE, 'og', kind, id + '.jpg');
      const page = path.join(SITE, 'og', kind, id + '.html');
      if (!fs.existsSync(png) || !fs.existsSync(page)) { errors.push(`${kind} ${id}: no preview image or page`); continue; }
      if (String(jpgSize(png)) !== '1200,630') errors.push(`${kind} ${id}: image is ${jpgSize(png)}, not a 1200×630 JPEG`);
      const bytes = fs.statSync(png).size;
      biggest = Math.max(biggest, bytes);
      if (bytes >= MAX_BYTES) errors.push(`${kind} ${id}: image is ${Math.round(bytes / 1024)} KB, over 300 KB`);
      const html = fs.readFileSync(page, 'utf8');
      const q = `${PUBLIC}/${SEGMENT[kind]}/${id}`;
      if (meta(html, 'og:url') !== q) errors.push(`${kind} ${id}: og:url ${meta(html, 'og:url')}`);
      if (meta(html, 'og:image') !== `${PUBLIC}/og/${kind}/${id}.jpg`) errors.push(`${kind} ${id}: og:image ${meta(html, 'og:image')}`);
      if (meta(html, 'og:image:type') !== 'image/jpeg') errors.push(`${kind} ${id}: og:image:type ${meta(html, 'og:image:type')}`);
      if (!(meta(html, 'og:title') || '').includes(name.replace(/&/g, '&amp;'))) errors.push(`${kind} ${id}: og:title "${meta(html, 'og:title')}" does not name ${name}`);
      if (!meta(html, 'og:description') || !meta(html, 'og:image:alt')) errors.push(`${kind} ${id}: empty description or alt`);
      errors.push(...tagErrors(html, `${kind} ${id}`, q));
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
      if (title !== meta(html, 'og:title')) errors.push(`${kind} ${id}: <title> "${title}" is not its og:title`);
      const text = pageText(html);
      const h1 = text && (text.match(/<h1>([^<]*)<\/h1>/) || [])[1];
      if (!h1 || !h1.includes(name.replace(/&/g, '&amp;').replace(/'/g, "'"))) errors.push(`${kind} ${id}: the page text's h1 "${h1}" does not name ${name}`);
      if (kind === 'guide') {
        const g = win.GUIDES.find(x => x.id === id);
        const links = [...(text || '').matchAll(/<li><a href="\/titles\/([a-z0-9-]+)">/g)].map(m => m[1]);
        if (links.join() !== g.stops.map(st => st.id).join()) errors.push(`guide ${id}: the page text lists ${links.join()}, not its stops in order`);
        const why = g.stops[0].why.en.replace(/&/g, '&amp;');
        if (!text.includes(why.slice(0, 30))) errors.push(`guide ${id}: the page text leaves out the stops' reasons`);
      }
      if (kind === 'title') {
        // Follow the thread: every title sharing a character, by identity.
        const t = win.TITLES.find(x => x.id === id);
        const prime = (c) => (win.CHARACTERS[c] && win.CHARACTERS[c].prime) || c;
        const mine = new Set(t.cast.map(prime));
        const want = win.TITLES.filter(o => o.id !== id && o.cast.some(c => mine.has(prime(c)))).length;
        const got = ((((text || '').split('<h2>Titles connected to ')[1] || '').split('<h2>')[0]).match(/<li>/g) || []).length;
        if (got !== want) errors.push(`title ${id}: the page text lists ${got} connected titles, not ${want}`);
      }
      {
        const g = jsonLd(html);
        const t = kind === 'title' && win.TITLES.find(x => x.id === id);
        const want = kind === 'title' ? (t.type === 'film' ? 'Movie' : 'TVSeries') + ',BreadcrumbList' : 'ItemList,BreadcrumbList';
        if (ldTypes(g) !== want) errors.push(`${kind} ${id}: structured data is [${ldTypes(g)}], not [${want}]`);
        else if (g[0].url !== q) errors.push(`${kind} ${id}: structured data url ${g[0].url}`);
        else if (kind === 'guide') {
          const ids = g[0].itemListElement.map(li => li.item.url.split('/').pop()).join();
          if (ids !== win.GUIDES.find(x => x.id === id).stops.map(st => st.id).join()) errors.push(`guide ${id}: structured data lists ${ids}, not its stops`);
        } else if (kind === 'title' && !g[0].actor.length && t.cast.length) errors.push(`title ${id}: structured data has no cast`);
        const noImage = filmsWithoutImage(g);
        if (noImage.length) errors.push(`${kind} ${id}: structured data lists ${noImage.length} title(s) with no image: ${noImage.slice(0, 3).join(', ')}`);
      }
      if (stripMeta(html) !== base) errors.push(`${kind} ${id}: the page differs from index.html beyond its preview tags, title and text`);
      checked++;
    }
  }
  out.pagesChecked = checked;
  // A character's page names them in its appearances heading and lists who
  // they share the most titles with (Loki: Thor first).
  {
    const loki = pageText(fs.readFileSync(path.join(SITE, 'og', 'char', 'loki.html'), 'utf8')) || '';
    expect(loki.includes('<h2>Loki in the MCU: every appearance, in release order</h2>'), 'char loki: no "Loki in the MCU" heading');
    const co = (loki.split('<h2>Shares the most titles with</h2>')[1] || '').match(/<li><a href="\/characters\/([a-z0-9-]+)">/);
    expect(co && co[1] === 'thor', 'char loki: Thor is not first among who Loki shares the most titles with: ' + (co && co[1]));
  }

  // ---- The index pages and the home page's text (Findability 4) -------------
  const INDEX_PAGES = { guides: ['guide', 'Marvel watch guides'], titles: ['title', 'Every Marvel film and series'], characters: ['char', 'Marvel characters'] };
  for (const [seg, [kind, name]] of Object.entries(INDEX_PAGES)) {
    const f = path.join(SITE, 'og', 'index', seg + '.html');
    if (!fs.existsSync(f)) { errors.push(`index ${seg}: no page`); continue; }
    const html = fs.readFileSync(f, 'utf8');
    const text = pageText(html) || '';
    errors.push(...tagErrors(html, `index ${seg}`, `${PUBLIC}/${seg}`));
    expect((html.match(/<title>([^<]*)<\/title>/) || [])[1] === `${name} · Red Thread` && meta(html, 'og:title') === `${name} · Red Thread`, `index ${seg}: <title> or og:title is not "${name} · Red Thread"`);
    expect(meta(html, 'og:image') === PUBLIC + '/og/default.jpg', `index ${seg}: og:image is not the app-wide card`);
    expect(text.includes(`<h1>${name}</h1>`), `index ${seg}: h1 is not ${name}`);
    const linked = new Set([...text.matchAll(new RegExp(`<a href="/${seg}/([a-z0-9-]+)">`, 'g'))].map(m => m[1]));
    const pages = sets[kind].map(([id]) => id).filter(id => fs.existsSync(path.join(SITE, 'og', kind, id + '.html')));
    expect(pages.length && pages.every(id => linked.has(id)) && linked.size === pages.length, `index ${seg}: links ${linked.size} of ${pages.length} pages`);
    expect(stripMeta(html) === base, `index ${seg}: the page differs from index.html beyond its preview tags, title and text`);
    const ld = jsonLd(html);
    expect(ldTypes(ld) === 'ItemList,BreadcrumbList' && ld[0].numberOfItems === pages.length, `index ${seg}: structured data [${ldTypes(ld)}] with ${ld && ld[0].numberOfItems} items`);
    const noImage = filmsWithoutImage(ld);
    expect(!noImage.length, `index ${seg}: structured data lists ${noImage.length} title(s) with no image`);
    for (const other of Object.keys(INDEX_PAGES)) expect(text.includes(`<a href="/${other}">`), `index ${seg}: no link to /${other}`);
  }
  {
    const home = pageText(index) || '';
    for (const seg of Object.keys(INDEX_PAGES)) expect(home.includes(`<a href="/${seg}">`), `index.html: the home page's text has no link to /${seg}`);
    const ld = jsonLd(index);
    expect(ldTypes(ld) === 'WebSite,Organization,WebApplication', `index.html: structured data is [${ldTypes(ld)}]`);
    out.homeStructuredData = ldTypes(ld);
    const guideLinks = new Set([...home.matchAll(/<a href="\/guides\/([a-z0-9-]+)">/g)].map(m => m[1]));
    expect(win.GUIDES.every(g => guideLinks.has(g.id)), `index.html: the home page's text links ${guideLinks.size} of ${win.GUIDES.length} guides`);
  }
  out.biggestImageKB = Math.round(biggest / 1024);

  // ---- The guide layouts, 3 to 14 stops -------------------------------------
  // (Notion "Guide link preview: a layout for more than ten stops", 2026-11-23.)
  // link-cards.ts lays a guide out as short (up to 5), long (6 to 10) or longer
  // (11 to 14, the long climb in smaller steps). Every poster stays right of the
  // copy column (it ends at 592), inside the 1200×630 image, and climbs: each
  // stop up and to the right of the one before. A guide with more than ten stops
  // exists, so the build drew the longer layout for real above.
  {
    const { code } = await transformWithOxc(fs.readFileSync(path.join(ROOT, 'src/share-card/link-cards.ts'), 'utf8'), 'link-cards.ts', { lang: 'ts' });
    const tmpLC = path.join(require('os').tmpdir(), 'rt-link-cards-' + process.pid + '.mjs');
    fs.writeFileSync(tmpLC, code);
    const LC = await import(pathToFileURL(tmpLC).href);
    fs.unlinkSync(tmpLC);
    const colors = new Proxy({}, { get: (t, k) => (k === 'phases' ? ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'] : '#000000') });
    const art = { src: 'data:image/png;base64,', color: '#808080' };
    const layouts = {};
    for (let n = 3; n <= 14; n++) {
      for (const event of [false, true]) {
        const stops = n - 1; // the last stop (or the release) is the big poster
        const tree = LC.linkCard({ site: 'redthread.tv', copy: { kicker: 'k', heading: 'h', headingKind: 'line' },
          art: { layout: 'guide', stops: Array(stops).fill(art), last: art, chip: event ? 'Dec 18' : undefined, long: n > 5 } }, colors, { mark: '', word: '' });
        const boxes = [];
        (function walk(node) {
          if (!node || typeof node !== 'object') return;
          const s = node.props && node.props.style;
          if (s && s.position === 'absolute' && s.boxShadow && s.width) boxes.push({ x: s.left, y: s.top, w: s.width, h: s.height });
          [].concat((node.props && node.props.children) || []).forEach(walk);
        })(tree);
        const label = `${n} stops${event ? ', event' : ''}`;
        if (boxes.length !== n) { errors.push(`guide layout, ${label}: ${boxes.length} posters`); continue; }
        boxes.forEach((b, i) => {
          if (b.x < 600 || b.y < 0 || b.x + b.w > 1200 || b.y + b.h > 630) errors.push(`guide layout, ${label}: poster ${i + 1} at ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)} leaves its area`);
          if (i > 0 && i < n - 1 && !(b.x > boxes[i - 1].x && b.y < boxes[i - 1].y)) errors.push(`guide layout, ${label}: poster ${i + 1} doesn't climb from ${i}`);
        });
        if (!event) layouts[n] = `${Math.round(boxes[0].w)}×${Math.round(boxes[0].h)} from ${Math.round(boxes[0].x)}`;
      }
    }
    out.guideLayouts = layouts;
    const most = Math.max(...win.GUIDES.map(g => g.stops.filter(s => s.weight === 'essential').length));
    out.mostGuideStops = most;
    expect(most > 10, `no guide has more than ten stops (most: ${most}), so the build never drew the longer layout`);
  }

  // ---- The old addresses (vercel.json) --------------------------------------
  // Vercel matches a `has` host value as a whole-string pattern; so does this.
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const rules = vercel.redirects || [];
  const hostRule = rules.find(r => (r.has || []).some(h => h.type === 'host'));
  const hostRe = hostRule && new RegExp('^(?:' + hostRule.has.find(h => h.type === 'host').value + ')$');
  expect(hostRule && hostRule.source === '/:path*' && hostRule.destination === PUBLIC + '/:path*' && hostRule.permanent === true,
    'vercel.json: no permanent /:path* redirect from the old host to ' + PUBLIC);
  expect(hostRe && hostRe.test('mcu-connections.vercel.app'), 'vercel.json: mcu-connections.vercel.app is not redirected');
  for (const host of ['redthread.tv', 'www.redthread.tv', 'mcu-connections-git-version-40-afr-bfcd.vercel.app', 'red-thread-git-version-40-afr-bfcd.vercel.app', 'localhost']) {
    expect(hostRe && !hostRe.test(host), `vercel.json: ${host} would be redirected`);
  }
  const oldImage = rules.find(r => r.source === '/og-image.jpg');
  expect(oldImage && oldImage.destination === '/og/default.jpg' && !oldImage.has, 'vercel.json: /og-image.jpg does not go to the new card');
  // The PNG previews before V5's redesign: their addresses go to the JPEGs.
  const oldDefault = rules.find(r => r.source === '/og/default.png');
  expect(oldDefault && oldDefault.destination === '/og/default.jpg' && oldDefault.permanent === true, 'vercel.json: /og/default.png does not go to default.jpg');
  const oldPng = rules.find(r => r.source === '/og/:kind/:id.png');
  expect(oldPng && oldPng.destination === '/og/:kind/:id.jpg' && oldPng.permanent === true, 'vercel.json: /og/<kind>/<id>.png does not go to its .jpg');

  // ---- robots.txt and sitemap.xml (Findability 1) ---------------------------
  {
    const robots = fs.existsSync(path.join(SITE, 'robots.txt')) ? fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8') : '';
    expect(/^User-agent: \*\nAllow: \/$/m.test(robots), 'robots.txt: no "User-agent: *" group allowing /');
    expect(!/^Disallow:/m.test(robots), 'robots.txt disallows something');
    for (const ua of ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Bingbot']) {
      expect(new RegExp('^User-agent: ' + ua + '$', 'm').test(robots), 'robots.txt does not name ' + ua);
    }
    expect(robots.includes(`Sitemap: ${PUBLIC}/sitemap.xml`), 'robots.txt has no Sitemap line');
    const sm = fs.existsSync(path.join(SITE, 'sitemap.xml')) ? fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8') : '';
    // Each entry names its twin in the other language (Findability 6).
    const locs = [...sm.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?((?:<xhtml:link [^>]*\/>)*)<\/url>/g)].map(m => ({ loc: m[1], lastmod: m[2] || null, alt: m[3] }));
    const want = [PUBLIC + '/', PUBLIC + '/guides', PUBLIC + '/titles', PUBLIC + '/characters', ...Object.keys(sets).flatMap(kind => sets[kind]
      .filter(([id]) => fs.existsSync(path.join(SITE, 'og', kind, id + '.html')))
      .map(([id]) => `${PUBLIC}/${SEGMENT[kind]}/${id}`))];
    const PT_SEG = { title: 'titulos', guide: 'guias', char: 'personagens' };
    const wantPt = [PUBLIC + '/pt', PUBLIC + '/pt/guias', PUBLIC + '/pt/titulos', PUBLIC + '/pt/personagens', ...Object.keys(sets).flatMap(kind => sets[kind]
      .filter(([id]) => fs.existsSync(path.join(SITE, 'og', kind, id + '.html')))
      .map(([id]) => `${PUBLIC}/pt/${PT_SEG[kind]}/${PT_SLUGS[kind][id]}`))];
    expect(sm.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'), 'sitemap.xml: not a sitemap with xhtml alternates');
    expect(wantPt.every(u => locs.some(l => l.loc === u)), `sitemap.xml leaves out ${wantPt.filter(u => !locs.some(l => l.loc === u)).length} Portuguese addresses`);
    expect(locs.every(l => (l.alt.match(/hreflang="(en|pt-BR|x-default)"/g) || []).length === 3), 'sitemap.xml: an entry without its three hreflang alternates');
    const smWant = [...want, ...wantPt];
    expect(locs.length === new Set(locs.map(l => l.loc)).size, 'sitemap.xml lists an address twice');
    expect(locs.length === smWant.length && smWant.every(u => locs.some(l => l.loc === u)), `sitemap.xml lists ${locs.length} addresses, expected ${smWant.length}`);
    expect(!locs.some(l => l.loc.includes('?')), 'sitemap.xml lists a query address');
    for (const g of win.GUIDES) {
      const l = locs.find(x => x.loc === `${PUBLIC}/guides/${g.id}`);
      if (l && l.lastmod !== g.reviewed) errors.push(`sitemap.xml: guide ${g.id} lastmod ${l.lastmod}, not its reviewed ${g.reviewed}`);
    }
    out.sitemap = { addresses: locs.length, withLastmod: locs.filter(l => l.lastmod).length };
    // llms.txt and llms-full.txt (Findability 7): the llmstxt.org shape, every
    // page at its own address, every guide's stops in order.
    const llms = fs.existsSync(path.join(SITE, 'llms.txt')) ? fs.readFileSync(path.join(SITE, 'llms.txt'), 'utf8') : '';
    const full = fs.existsSync(path.join(SITE, 'llms-full.txt')) ? fs.readFileSync(path.join(SITE, 'llms-full.txt'), 'utf8') : '';
    expect(/^# Red Thread\n\n> \S/.test(llms), 'llms.txt does not open with "# Red Thread" and a > summary');
    const llmsLinks = [...llms.matchAll(/\]\((https:[^)]+)\)/g)].map(m => m[1]);
    const pageLinks = want.filter(u => u !== PUBLIC + '/');
    expect(pageLinks.every(u => llmsLinks.includes(u)), `llms.txt leaves out ${pageLinks.filter(u => !llmsLinks.includes(u)).length} page addresses`);
    expect(!llms.includes('?') || !/\]\([^)]*\?/.test(llms), 'llms.txt links a query address');
    expect(llmsLinks.includes(PUBLIC + '/llms-full.txt') && robots.includes(PUBLIC + '/llms.txt'), 'llms.txt does not link llms-full.txt, or robots.txt does not mention llms.txt');
    for (const g of win.GUIDES) {
      const at = full.indexOf(`## ${g.name.en}\n`);
      if (at < 0) { errors.push(`llms-full.txt has no section for guide ${g.id}`); continue; }
      const section = full.slice(at, (full.indexOf('\n## ', at + 3) + 1 || full.length + 1) - 1);
      const n = (section.match(/^\d+\. /gm) || []).length;
      if (n !== g.stops.length) errors.push(`llms-full.txt: guide ${g.id} lists ${n} stops, not ${g.stops.length}`);
    }
    out.llms = { lines: llms.split('\n').length, links: llmsLinks.length, fullLines: full.split('\n').length };
    // Off production, noindex on everything (vercel.json; Vercel matches a
    // host value as a whole-string pattern, so does this).
    const noindex = (vercel.headers || []).find(h => (h.headers || []).some(x => x.key === 'X-Robots-Tag' && x.value === 'noindex'));
    const miss = noindex && (noindex.missing || []).find(m => m.type === 'host');
    const missRe = miss && new RegExp('^(?:' + miss.value + ')$');
    expect(noindex && noindex.source === '/:path*' && missRe, 'vercel.json: no X-Robots-Tag noindex rule for every path off production');
    expect(missRe && missRe.test('redthread.tv'), 'vercel.json: redthread.tv itself would be noindex');
    for (const host of ['red-thread-git-version-50-afr-bfcd.vercel.app', 'www.redthread.tv', 'localhost']) {
      expect(missRe && !missRe.test(host), `vercel.json: ${host} would be indexable`);
    }
  }

  // ---- The middleware, against the built files ------------------------------
  const { code: mw } = await transformWithOxc(fs.readFileSync(path.join(ROOT, 'middleware.ts'), 'utf8'), 'middleware.ts', { lang: 'ts' });
  const tmp = path.join(require('os').tmpdir(), 'mcu-middleware-' + process.pid + '.mjs');
  fs.writeFileSync(tmp, mw);
  const fetched = [];
  global.fetch = async (u) => {
    const p = new URL(u).pathname;
    fetched.push(p);
    const f = path.join(SITE, p);
    return f.startsWith(SITE) && fs.existsSync(f) ? new Response(fs.readFileSync(f), { status: 200 }) : new Response('', { status: 404 });
  };
  const middleware = (await import(pathToFileURL(tmp).href)).default;
  const config = (await import(pathToFileURL(tmp).href)).config;
  expect(config && JSON.stringify(config.matcher) === JSON.stringify(['/', '/titles', '/guides', '/characters', '/titles/:id', '/guides/:id', '/characters/:id', '/pt', '/pt/:segment', '/pt/:segment/:slug']),
    'middleware: matcher is not the home page, the three indexes, the three page addresses and their Portuguese twins: ' + JSON.stringify(config && config.matcher));
  const run = async (p) => { const r = await middleware(new Request(PUBLIC + p)); return r ? { status: r.status, type: r.headers.get('content-type'), location: r.headers.get('location'), html: r.status === 308 ? '' : await r.text() } : null; };
  // A page's address gets its page.
  for (const [p, kind, id] of [['/titles/iron-man', 'title', 'iron-man'], ['/characters/peggy', 'char', 'peggy'], ['/guides/before-doomsday', 'guide', 'before-doomsday'], ['/guides/before-doomsday?view=list', 'guide', 'before-doomsday'], ['/titles/endgame/', 'title', 'endgame']]) {
    const r = await run(p);
    expect(r && r.status === 200 && /text\/html/.test(r.type) && meta(r.html, 'og:image') === `${PUBLIC}/og/${kind}/${id}.jpg` && pageText(r.html),
      `middleware ${p}: did not serve the ${kind} ${id} page`);
  }
  // The index addresses get their pages (Findability 4).
  for (const seg of ['guides', 'titles', 'characters', 'guides/']) {
    const r = await run('/' + seg);
    const name = seg.replace('/', '');
    expect(r && r.status === 200 && canonical(r.html) === `${PUBLIC}/${name}` && pageText(r.html), `middleware /${seg}: did not serve the ${name} index`);
  }
  // The Portuguese addresses (Findability 6): their own pages, in Portuguese,
  // each naming its English twin; an unknown slug gets the Portuguese home
  // with a 404.
  for (const [p, canon, twin] of [['/pt', '/pt', '/'], ['/pt/guias', '/pt/guias', '/guides'], ['/pt/titulos/homem-de-ferro', '/pt/titulos/homem-de-ferro', '/titles/iron-man'], ['/pt/titulos/vingadores-doutor-destino/', '/pt/titulos/vingadores-doutor-destino', '/titles/doomsday'], ['/pt/personagens/peter-parker', '/pt/personagens/peter-parker', '/characters/peter']]) {
    const r = await run(p);
    expect(r && r.status === 200 && /<html lang="pt-BR">/.test(r.html) && canonical(r.html) === PUBLIC + canon && pageText(r.html)
      && r.html.includes(`hreflang="en" href="${PUBLIC}${twin}"`) && r.html.includes(`hreflang="pt-BR" href="${PUBLIC}${canon}"`),
      `middleware ${p}: did not serve the Portuguese page (lang, canonical ${canon}, hreflang to ${twin})`);
  }
  {
    const r = await run('/pt/titulos/no-such-title');
    expect(r && r.status === 404 && /<html lang="pt-BR">/.test(r.html), 'middleware: an unknown Portuguese slug does not get the Portuguese home with a 404');
    const en = await run('/titles/iron-man');
    expect(en && en.html.includes(`hreflang="pt-BR" href="${PUBLIC}/pt/titulos/homem-de-ferro"`), 'middleware: an English page does not name its Portuguese twin');
  }
  // Production pages are indexable; the same page on a preview deployment is not.
  {
    const prod = await middleware(new Request(PUBLIC + '/guides/before-doomsday'));
    const stage = await middleware(new Request('https://red-thread-git-version-50-afr-bfcd.vercel.app/guides/before-doomsday'));
    expect(prod && !prod.headers.get('x-robots-tag'), 'middleware: a production page says ' + (prod && prod.headers.get('x-robots-tag')));
    expect(stage && stage.headers.get('x-robots-tag') === 'noindex', 'middleware: a staging page is not noindex');
  }
  // An unknown or malformed id at a page's address: the home page, 404.
  for (const p of ['/titles/not-a-title', '/characters/Peggy', '/guides/before%20doomsday']) {
    const r = await run(p);
    expect(r && r.status === 404 && meta(r.html, 'og:url') === PUBLIC + '/', `middleware ${p}: answered ${r && r.status}, not the home page with a 404`);
  }
  // Every link shared before: a permanent redirect, the rest of the query kept.
  for (const [q, to] of [
    ['/?title=iron-man', '/titles/iron-man'],
    ['/?char=peggy', '/characters/peggy'],
    ['/?guide=before-doomsday', '/guides/before-doomsday'],
    ['/?guide=before-doomsday&view=list', '/guides/before-doomsday?view=list'],
    ['/?title=endgame&guide=before-doomsday', '/titles/endgame?guide=before-doomsday'],
    ['/?title=iron-man&char=tony', '/titles/iron-man?char=tony'],
    ['/?sort=phase&title=endgame&phase=2,3', '/titles/endgame?sort=phase&phase=2,3'],
    ['/?view=guides', '/guides'],
    ['/?view=list', '/titles'],
    ['/?view=list&phase=2,3&sort=phase', '/titles?phase=2,3&sort=phase'],
  ]) {
    const r = await run(q);
    expect(r && r.status === 308 && r.location === PUBLIC + to, `middleware ${q}: answered ${r && r.status} ${r && r.location}, not 308 to ${to}`);
  }
  for (const q of ['/', '/?sort=phase', '/?view=spatial', '/?title=not-a-title', '/?title=../index', '/?char=%3Cscript%3E', '/?guide=', '/about', '/og/title/iron-man.html']) {
    expect(await run(q) === null, `middleware ${q}: should pass through, but answered`);
  }
  for (const [from, to] of [['https://mcu-connections.vercel.app/', PUBLIC + '/'], ['https://mcu-connections.vercel.app/?title=iron-man&char=tony', PUBLIC + '/?title=iron-man&char=tony'], ['https://mcu-connections.vercel.app/guides/before-doomsday', PUBLIC + '/guides/before-doomsday']]) {
    const r = await middleware(new Request(from));
    expect(r && r.status === 308 && r.headers.get('location') === to, `middleware ${from}: answered ${r && r.status} ${r && r.headers.get('location')}, not 308 to ${to}`);
  }
  {
    // A preview deployment keeps its own address: redirected within itself, never to production.
    const r = await middleware(new Request('https://red-thread-git-version-50-afr-bfcd.vercel.app/?title=iron-man'));
    expect(r && r.status === 308 && r.headers.get('location') === 'https://red-thread-git-version-50-afr-bfcd.vercel.app/titles/iron-man', 'middleware: a preview address is not redirected within itself');
  }
  // The middleware's table and the app's (src/share-card/addresses.ts) agree.
  {
    // addresses.ts imports the frozen Portuguese slugs (Findability 6): both
    // compiled side by side.
    const dirA = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rt-addresses-'));
    const { code: slugs } = await transformWithOxc(fs.readFileSync(path.join(ROOT, 'src/share-card/pt-slugs.ts'), 'utf8'), 'pt-slugs.ts', { lang: 'ts' });
    fs.writeFileSync(path.join(dirA, 'pt-slugs.mjs'), slugs);
    const { code } = await transformWithOxc(fs.readFileSync(path.join(ROOT, 'src/share-card/addresses.ts'), 'utf8'), 'addresses.ts', { lang: 'ts' });
    fs.writeFileSync(path.join(dirA, 'addresses.mjs'), code.replace(/from ['"]\.\/pt-slugs['"]/, "from './pt-slugs.mjs'"));
    const A = await import(pathToFileURL(path.join(dirA, 'addresses.mjs')).href);
    fs.rmSync(dirA, { recursive: true, force: true });
    // Portuguese: every address it writes is a page the build wrote, and reads back.
    for (const q of ['?title=endgame&guide=before-doomsday&view=list', '?char=peggy&sort=phase', '?guide=before-doomsday', '?view=guides', '']) {
      const a = A.addressFor(new URLSearchParams(q), 'pt-BR');
      const r = await run(a.pathname);
      expect(r && r.status === 200 && /<html lang="pt-BR">/.test(r.html), `addresses.ts writes ${a.pathname} for ${q || 'home'} in Portuguese, which the middleware doesn't serve`);
      const back = A.stateParams(a.pathname, a.search.toString());
      expect([...new URLSearchParams(q)].every(([k, v]) => back.get(k) === v), `addresses.ts: Portuguese ${q} does not read back from ${a.pathname}`);
    }
    for (const q of ['?title=endgame&guide=before-doomsday&view=list', '?char=peggy&sort=phase', '?guide=before-doomsday', '?title=iron-man&char=tony', '?view=guides', '?view=list&sort=phase']) {
      const r = await run('/' + q);
      const a = A.addressFor(new URLSearchParams(q));
      const want = PUBLIC + a.pathname + (a.search.toString() ? '?' + a.search.toString() : '');
      expect(r && r.location === want, `addresses.ts and middleware.ts disagree on ${q}: ${r && r.location} vs ${want}`);
      const back = A.stateParams(a.pathname, a.search.toString());
      expect([...new URLSearchParams(q)].every(([k, v]) => back.get(k) === v), `addresses.ts: ${q} does not read back from ${want}`);
    }
  }
  out.middlewareFetches = fetched.length;
  fs.unlinkSync(tmp);

  // ---- The app boots from a preview page ---------------------------------
  const browser = await chromium.launch();
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(NOWELCOME);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const preview = fs.readFileSync(path.join(SITE, 'og', 'title', 'iron-man.html'));
    await page.route('**/*', (r) => {
      const u = r.request().url();
      if (!u.startsWith('http://127.0.0.1')) return r.abort();
      if (new URL(u).pathname === '/titles/iron-man') return r.fulfill({ status: 200, contentType: 'text/html', body: preview });
      return r.continue();
    });
    await page.goto(URL_BASE + 'titles/iron-man');
    await require('./ready').appReady(page, 300);
    expect((await page.locator('#drawer-title').textContent()).trim() === 'Iron Man', 'page address: the app did not open Iron Man');
    const after = await page.evaluate(() => ({ path: location.pathname, text: !!document.getElementById('mcu-page-text'), title: document.title }));
    out.bootedAt = after;
    expect(after.path === '/titles/iron-man', 'page address: the app moved off /titles/iron-man to ' + after.path);
    expect(!after.text, 'page address: the readable text is still in the page after the app started');
    // The tab title follows what is open (Findability 2): the page's own
    // title on arrival, the home page's once the details close.
    expect(after.title === 'Iron Man (2008) · Red Thread', 'tab title on /titles/iron-man: ' + after.title);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    const closed = await page.evaluate(() => ({ path: location.pathname, title: document.title }));
    out.afterClose = closed;
    expect(closed.path === '/' && closed.title === 'Red Thread — Marvel movies, series and character connections', 'after closing the details: ' + JSON.stringify(closed));
    await ctx.close();
  }
  {
    // /guides boots on the Guides tab and keeps its address (Findability 4).
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(NOWELCOME);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const guides = fs.readFileSync(path.join(SITE, 'og', 'index', 'guides.html'));
    await page.route('**/*', (r) => {
      const u = r.request().url();
      if (!u.startsWith('http://127.0.0.1')) return r.abort();
      if (new URL(u).pathname === '/guides') return r.fulfill({ status: 200, contentType: 'text/html', body: guides });
      return r.continue();
    });
    await page.goto(URL_BASE + 'guides');
    await require('./ready').appReady(page, 300);
    await page.waitForTimeout(500);
    const g = await page.evaluate(() => ({ path: location.pathname + location.search, text: !!document.getElementById('mcu-page-text'), title: document.title,
      tab: (document.querySelector('.nav-tabs button.on') || {}).textContent || '' }));
    out.bootedAtGuides = g;
    expect(g.path === '/guides' && !g.text && g.title === 'Marvel watch guides · Red Thread' && /Guides/.test(g.tab), '/guides: ' + JSON.stringify(g));
    await ctx.close();
  }
  await browser.close();

  console.log(JSON.stringify({ ...out, errors: errors.slice(0, 40), errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
