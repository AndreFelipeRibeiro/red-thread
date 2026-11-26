// The check form of qa/overflow-audit.js (Notion "Portuguese copy pass: find
// text that overflows its container, and set the fallback"): every surface in
// English and Portuguese at 1440px and 375px, failing on text that runs past
// its card, row, button or panel, or is cut without "…". Text that ends in
// "…" is reported, not failed (docs/STANDARDS.md, "Text that doesn't fit").
// The full sweep, with 1024px and 320px too: `node qa/overflow-audit.js`.
process.env.FAIL = '1';
process.env.WIDTHS = process.env.WIDTHS || '1440,375';
require('./overflow-audit.js');
