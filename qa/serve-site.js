// Loaded with `node --require ./qa/serve-site.js` (run.js sets it through
// NODE_OPTIONS). Every check starts its own little web server for the app;
// this wraps those servers so the whole site comes from one tree — the built
// one — whatever each check's own handler would have served.
//
// It has to exist because the app can no longer be run from the source tree:
// since Phase 2 step 3 the app is an ES module bundle, so something has to
// build it. 14 of the regress checks also predate SITE and hard-code the
// repository root, and this wrapper is what makes them honour it.
//
// SITE points at the tree to serve, relative to qa/, and defaults to the build
// output. run.js builds before a run; `npm run build` first if you call a
// check by hand.
//
// This file used to compile the app's .jsx files with the pinned Babel and
// rewrite index.html's `text/babel` tags, because the page did that work
// itself at startup. The bundle replaced all of it (docs/V4-PLAN.md §5.7).
// Development-only, like everything in qa/; nothing in the app loads it.
const http = require('http');
const fs = require('fs');
const path = require('path');

const QA = __dirname;

function siteRoot() {
  return path.join(QA, process.env.SITE || '../dist');
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.map': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.sql': 'text/plain',
};

const original = http.createServer;
http.createServer = function (...args) {
  const handler = args.find(a => typeof a === 'function');
  if (!handler) return original.apply(this, args);
  const wrapped = (req, res) => {
    try {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/index.html';
      // A page's own address, as middleware.ts serves it in production
      // (Notion "Findability 3"): /titles/<id> gets dist/og/title/<id>.html,
      // and an unknown id the home page.
      const page = p.match(/^\/(titles|guides|characters)\/([a-z0-9-]+)\/?$/);
      if (page) {
        const kind = { titles: 'title', guides: 'guide', characters: 'char' }[page[1]];
        p = fs.existsSync(path.join(siteRoot(), 'og', kind, page[2] + '.html')) ? `/og/${kind}/${page[2]}.html` : '/index.html';
      }
      // The index pages (Notion "Findability 4"): /guides, /titles, /characters.
      const index = p.match(/^\/(titles|guides|characters)\/?$/);
      if (index) p = `/og/index/${index[1]}.html`;
      // The Portuguese pages (Notion "Findability 6"), as middleware.ts serves
      // them: /pt, /pt/guias (index), /pt/titulos/<slug>; an unknown slug gets
      // the Portuguese home page.
      if (/^\/pt\/?$/.test(p)) p = '/og/pt/home.html';
      const ptPage = p.match(/^\/pt\/(titulos|guias|personagens)\/([a-z0-9-]+)\/?$/);
      if (ptPage) {
        const kind = { titulos: 'title', guias: 'guide', personagens: 'char' }[ptPage[1]];
        p = fs.existsSync(path.join(siteRoot(), 'og', 'pt', kind, ptPage[2] + '.html')) ? `/og/pt/${kind}/${ptPage[2]}.html` : '/og/pt/home.html';
      }
      const ptIndex = p.match(/^\/pt\/(titulos|guias|personagens)\/?$/);
      if (ptIndex) p = `/og/pt/index/${{ titulos: 'titles', guias: 'guides', personagens: 'characters' }[ptIndex[1]]}.html`;
      const root = siteRoot();
      const file = path.join(root, p);
      if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
        return res.end(fs.readFileSync(file));
      }
    } catch (e) {
      // Fall through to the check's own handler.
      process.stderr.write('qa/serve-site: ' + e.message + '\n');
    }
    return handler(req, res);
  };
  return original.apply(this, args.map(a => (a === handler ? wrapped : a)));
};
