// Satori's text shaper, HarfBuzz, as Satori imports it ("harfbuzzjs"), with
// one change: its hb.wasm comes from the site root (/hb.wasm, which the build
// copies there; vite.config.js). harfbuzzjs's own entry asks for "hb.wasm"
// relative to the page, which was the root until every guide, title and
// character got its own address (Notion "Findability 3"): on
// /titles/iron-man it asked for /titles/hb.wasm and the share card failed.
// vite.config.js aliases "harfbuzzjs" here; the link-preview build runs
// Satori in Node, outside Vite, and is unaffected.
import createHarfBuzz from 'harfbuzzjs/hb.js';
import hbjs from 'harfbuzzjs/hbjs.js';

export default createHarfBuzz({ locateFile: (file) => '/' + file }).then(hbjs);
