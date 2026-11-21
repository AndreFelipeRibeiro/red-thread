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
//   - middleware.ts, run here against the built files: /?title=, /?char= and
//     /?guide= get their page; an unknown or malformed id, a plain / and any
//     other parameter pass through (the app-wide card).
//   - The app boots from a preview page exactly as from index.html.
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
  .replace(/<link rel="canonical" href="[^"]*"\/>/g, '');
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

  // The catalog, read the way the app's own files publish it.
  const vm = require('vm');
  const { transformWithOxc } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);
  const win = {};
  for (const f of ['src/data/data.ts', 'src/data/guides.ts']) {
    const { code } = await transformWithOxc(fs.readFileSync(path.join(ROOT, f), 'utf8'), f, { lang: 'ts' });
    vm.runInNewContext(code.replace(/^export \{\};?\s*$/m, ''), { window: win, console });
  }
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
      const q = `${PUBLIC}/?${kind}=${id}`;
      if (meta(html, 'og:url') !== q) errors.push(`${kind} ${id}: og:url ${meta(html, 'og:url')}`);
      if (meta(html, 'og:image') !== `${PUBLIC}/og/${kind}/${id}.jpg`) errors.push(`${kind} ${id}: og:image ${meta(html, 'og:image')}`);
      if (meta(html, 'og:image:type') !== 'image/jpeg') errors.push(`${kind} ${id}: og:image:type ${meta(html, 'og:image:type')}`);
      if (!(meta(html, 'og:title') || '').includes(name.replace(/&/g, '&amp;'))) errors.push(`${kind} ${id}: og:title "${meta(html, 'og:title')}" does not name ${name}`);
      if (!meta(html, 'og:description') || !meta(html, 'og:image:alt')) errors.push(`${kind} ${id}: empty description or alt`);
      errors.push(...tagErrors(html, `${kind} ${id}`, q));
      if (stripMeta(html) !== base) errors.push(`${kind} ${id}: the page differs from index.html beyond its preview tags`);
      checked++;
    }
  }
  out.pagesChecked = checked;
  out.biggestImageKB = Math.round(biggest / 1024);

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
  expect(config && config.matcher === '/', 'middleware: matcher is not the home page only');
  const run = async (q) => { const r = await middleware(new Request(PUBLIC + '/' + q)); return r ? { status: r.status, type: r.headers.get('content-type'), html: await r.text() } : null; };
  for (const [q, kind, id] of [['?title=iron-man', 'title', 'iron-man'], ['?char=peggy', 'char', 'peggy'], ['?guide=before-doomsday', 'guide', 'before-doomsday'], ['?title=iron-man&char=tony', 'title', 'iron-man'], ['?sort=phase&title=endgame', 'title', 'endgame']]) {
    const r = await run(q);
    expect(r && r.status === 200 && /text\/html/.test(r.type) && meta(r.html, 'og:image') === `${PUBLIC}/og/${kind}/${id}.jpg`, `middleware ${q}: did not serve the ${kind} ${id} preview`);
  }
  for (const q of ['', '?sort=phase', '?title=not-a-title', '?title=../index', '?char=%3Cscript%3E', '?guide=']) {
    expect(await run(q) === null, `middleware ${q || '/'}: should pass through, but answered`);
  }
  for (const [from, to] of [['https://mcu-connections.vercel.app/', PUBLIC + '/'], ['https://mcu-connections.vercel.app/?title=iron-man&char=tony', PUBLIC + '/?title=iron-man&char=tony'], ['https://mcu-connections.vercel.app/?guide=before-doomsday', PUBLIC + '/?guide=before-doomsday']]) {
    const r = await middleware(new Request(from));
    expect(r && r.status === 308 && r.headers.get('location') === to, `middleware ${from}: answered ${r && r.status} ${r && r.headers.get('location')}, not 308 to ${to}`);
  }
  {
    const r = await middleware(new Request('https://mcu-connections-git-version-40-afr-bfcd.vercel.app/?title=iron-man'));
    expect(r && r.status === 200 && meta(await r.text(), 'og:image') === `${PUBLIC}/og/title/iron-man.jpg`, 'middleware: a preview address is redirected or gets no preview');
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
      if (new URL(u).pathname === '/' ) return r.fulfill({ status: 200, contentType: 'text/html', body: preview });
      return r.continue();
    });
    await page.goto(URL_BASE + '?title=iron-man');
    await require('./ready').appReady(page, 300);
    expect((await page.locator('#drawer-title').textContent()).trim() === 'Iron Man', 'preview page: the app did not open Iron Man');
    await ctx.close();
  }
  await browser.close();

  console.log(JSON.stringify({ ...out, errors: errors.slice(0, 40), errorCount: errors.length }, null, 1));
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
