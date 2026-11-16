// The status filter (All / Unseen / Watchlist / Seen) through the app's own
// controls, for the checks that used Titles' old tabs row (Notion "Universal
// status pills", 2026-11-16): Seen and Watchlist are the header's pills
// (`.status-counts [data-coll]`, a tap toggles), Unseen and All are the
// Filters panel's Status switch (`[data-status]`, desktop popover or phone
// sheet). `setColl(page, kind)` runs in the page and resolves once applied.
//
// Use: const { setColl, collNow } = require('./coll');
//      await setColl(page, 'unseen');
const COLL_IN_PAGE = async (k) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (sel) => [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length);
  const pill = (kind) => visible(`.status-counts [data-coll="${kind}"]`);
  const pressed = () => { const p = visible('.status-counts [aria-pressed="true"]'); return p ? p.dataset.coll : null; };
  if (k === 'seen' || k === 'watchlist') {
    if (pressed() !== k) { const b = pill(k); if (!b) return false; b.click(); await wait(350); }
    return true;
  }
  // All or Unseen: the Filters panel's Status switch.
  const trigger = visible('.toolbar .filters-pill') || visible('.m-fpill');
  if (!trigger) return false;
  trigger.click(); await wait(400);
  const opt = visible(`[data-status="${k}"]`);
  if (!opt) return false;
  opt.click(); await wait(300);
  // Close: the phone sheet's button, or Escape on the desktop popover.
  const done = visible('.m-sheet .m-apply');
  if (done) done.click();
  else document.activeElement && document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(400);
  if (visible('.filters-pop')) { trigger.click(); await wait(300); }
  return true;
};

/** Sets the status filter in the page; resolves to true when the control was found. */
const setColl = (page, kind) => page.evaluate(COLL_IN_PAGE, kind);

module.exports = { setColl, COLL_IN_PAGE };
