// V4 build step. See docs/V4-PLAN.md Â§3 (the build) and Â§9 (the order).
//
// Steps 1 to 3 are done: Vite owns index.html, the stylesheets and the icons,
// and the app itself is one bundle (src/main.js) with no in-browser Babel.
// What is left in LEGACY is not waiting to be converted â each entry has its
// own reason to keep a plain URL, given beside it.
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// The files index.html still loads as classic scripts, in its own order, plus
// the root-path assets below. Vite leaves the <script> tags alone (it reports
// that it "can't bundle" them), so without this copy the built site would ask
// for each one and get a 404.
const LEGACY = [
  'boot.js',
  'locales/en.js',
  'locales/pt-BR.js',
  'i18n.js',
  // Stays a separate file on purpose: test-watch replaces it over the
  // network to serve a fixture (qa/test-watch.js), so it must keep its own
  // URL. docs/V4-PLAN.md Â§5.5.
  'watch-data.js',
  // Vite fingerprints the icons and rewrites the tags that point at them, but
  // clients ask for these paths directly without reading the HTML (iOS asks
  // for /apple-touch-icon.png), so the plain root paths have to keep working
  // too. The old preview image, og-image.jpg, is gone: vercel.json sends its
  // address to the generated og/default.png.
  'favicon.png',
  'apple-touch-icon.png',
  // Served today and linked from the README's setup notes.
  'schema.sql',
];

const copyLegacy = () => ({
  name: 'mcu-copy-legacy',
  apply: 'build',
  writeBundle(options) {
    const out = options.dir;
    for (const file of LEGACY) {
      const to = join(out, file);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(file, to);
    }
  },
});

// The share card (Notion V4 Tasks, "Share 2/3") is drawn by Satori in the
// browser, and Satori's text shaper, HarfBuzz, fetches its hb.wasm from the
// site root with no way to be handed the file. So the file is served there:
// copied into the build, and answered by the dev server. It is only fetched
// when someone opens a share card.
const HB_WASM = fileURLToPath(new URL('./node_modules/harfbuzzjs/hb.wasm', import.meta.url));
const shareCardWasm = () => ({
  name: 'mcu-share-card-wasm',
  configureServer(server) {
    server.middlewares.use('/hb.wasm', (req, res) => {
      res.setHeader('Content-Type', 'application/wasm');
      res.end(readFileSync(HB_WASM));
    });
  },
  writeBundle(options) {
    copyFileSync(HB_WASM, join(options.dir, 'hb.wasm'));
  },
});

// Link previews (Notion V4 Tasks, "Share 3/3"): an image and a page for the
// app-wide card and every title, character and guide, in dist/og/, rendered
// after the bundle is written because each page is a copy of the built
// index.html. Loaded only here, so the dev server never pays for it.
const linkPreviews = () => ({
  name: 'mcu-link-previews',
  apply: 'build',
  async closeBundle() {
    const { buildPreviews } = await import('./scripts/og-previews.js');
    const r = await buildPreviews({ root: process.cwd(), outDir: 'dist' });
    console.log(`link previews: ${r.count} images, ${(r.bytes / 1048576).toFixed(1)} MB, ${(r.ms / 1000).toFixed(1)}s`);
  },
});

// A file index.html loads as a classic script but LEGACY does not copy is a
// 404 the browser reports as a blank page, so fail the build loudly rather
// than shipping a site with a hole in it.
const checkLegacy = () => ({
  name: 'mcu-check-legacy',
  apply: 'build',
  buildStart() {
    const html = readFileSync('index.html', 'utf8');
    // Module scripts are Vite's to bundle; only the classic ones need copying.
    const tags = html.match(/<script[^>]*\ssrc="(?!http)[^"]+"[^>]*>/g) || [];
    const referenced = tags
      .filter(t => !/type="module"/.test(t))
      .map(t => t.match(/\ssrc="([^"]+)"/)[1].replace(/^\//, ''));
    const missing = referenced.filter(f => !LEGACY.includes(f));
    if (missing.length) {
      this.error(
        'index.html loads scripts that are neither bundled nor copied: ' +
        missing.join(', ') + '. Add them to LEGACY in vite.config.js, or ' +
        'convert them to modules (docs/V4-PLAN.md Â§3.3).'
      );
    }
  },
});

// The theme has to be right before the first paint, and src/theme.ts arrives
// with the bundle, too late to paint with. So every page gets this rule inline
// in its <head> (anywhere there is still before the first paint), on the dev
// server and in the build alike. It is the one deliberate copy of
// src/theme.ts: the key and the rule must match STORAGE_KEY and getTheme()
// there, or a page paints one theme and then swaps.
const THEME_PREPAINT = `try {
  var saved = localStorage.getItem('mcu.theme');
  var dark = saved === 'dark' || saved === 'light' ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
  // Text size (src/app/settings.tsx), before the first paint too, so a Large
  // visitor never sees the page jump: the saved choice, else on an iPhone or
  // iPad the size matching the system Text Size (systemTextSize() there; keep
  // the two alike).
  var size = localStorage.getItem('mcu.textSize.v1');
  if (size === 'larger') size = 'large';
  if (size !== 'small' && size !== 'large' && size !== 'default') {
    size = null;
    var ua = navigator.userAgent;
    if ((/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
      && window.CSS && CSS.supports('font', '-apple-system-body')) {
      var probe = document.createElement('span');
      probe.setAttribute('data-probe', 'system-body');
      probe.style.cssText = 'position:absolute;visibility:hidden;font:-apple-system-body';
      document.documentElement.appendChild(probe);
      var px = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      size = !px ? null : px <= 15 ? 'small' : px >= 19 ? 'large' : null;
    }
  }
  if (size === 'small' || size === 'large') document.documentElement.setAttribute('data-text-size', size);
} catch (e) {}`;

const themePrepaint = () => ({
  name: 'mcu-theme-prepaint',
  transformIndexHtml: () => [{ tag: 'script', children: THEME_PREPAINT, injectTo: 'head' }],
});

export default {
  plugins: [react(), tailwindcss(), themePrepaint(), checkLegacy(), copyLegacy(), shareCardWasm(), linkPreviews()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // The share card's text shaper, loading hb.wasm from the site root on
      // every page address (src/share-card/harfbuzz.js).
      { find: /^harfbuzzjs$/, replacement: fileURLToPath(new URL('./src/share-card/harfbuzz.js', import.meta.url)) },
    ],
  },
  build: {
    rollupOptions: {
      input: {
        // The app. Still the V3 loading path; see LEGACY above.
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // The V4 design-system preview, a page of its own that the app never
        // loads and which never loads the app (docs/V4-PLAN.md Â§9, and the
        // Notion ticket "Design system preview page").
        design: fileURLToPath(new URL('./design.html', import.meta.url)),
      },
    },
  },
  // Google sign-in only works from origins the OAuth client allows. 8126 is
  // the one registered for local work (README, "App redirects"), so the dev
  // server must take that port or stop rather than quietly pick another.
  server: { port: 8126, strictPort: true },
  preview: { port: 8126, strictPort: true },
};
