// components-fingerprint.mjs — the fingerprint both sides of the components
// check reduce a component to (Notion "Figma ⇄ code check 2/2").
//
// A component is compared by what a designer would notice, not node by node
// (the app's DOM and Figma's layers are nested differently):
//   w, h            the frame's size, rounded to the pixel
//   layout          H, V or N (none), and its padding [t, r, b, l] and gap
//   radius          the corner radius (one number, or four)
//   fill, stroke    the frame's own fill and border token ("raw" when none)
//   elevation       its shadow token
//   colors          every color token used inside it (fills, borders, text, icons)
//   type            every text size/weight pair used inside it ("15/600")
//   icons           every icon inside it, by name
// components-dump.js builds the same object in Figma; keep the two in step.

const r = (n) => Math.round(n);
// A phase color depends on which title is shown, so every phase-N counts as
// one "phase" color; "raw" (a poster's own color, artwork) is left out.
export const normColors = (set) => [...new Set([...set].filter((c) => c && c !== 'raw').map((c) => (/^phase-\d$/.test(c) ? 'phase' : c)))].sort();
const tok = (p) => (!p ? null : p.v ? p.v : 'raw');

// Figma's translucent tokens are the code's token at an opacity
// (docs/design-tokens.md, "Translucent colors"): compared as that token.
export const TRANSLUCENT = {
  'background-glass': 'background', 'border-soft': 'border', 'foreground-strong': 'foreground',
  'seen-foreground-soft': 'seen-foreground', 'popover-ring': 'foreground',
  'muted-soft': 'muted', 'muted-foreground-soft': 'muted-foreground',
};

/** From a capture-dom.js spec. */
export function fingerprintFromSpec(spec) {
  let root = spec.root;
  // An element that only wraps the box Figma draws (no paint, no padding,
  // one child of its own size) is looked through.
  for (let i = 0; i < 3; i++) {
    const c = root.ch && root.ch.length === 1 ? root.ch[0] : null;
    const bare = !root.fill && !root.stroke && !root.fx && !root.r && !(root.al && root.al.p);
    if (!c || c.t !== 'F' || !bare || Math.abs((c.w || 0) - spec.w) > 1 || Math.abs((c.h || 0) - spec.h) > 1) break;
    root = c;
  }
  const colors = new Set();
  const type = new Set();
  const icons = new Set();
  const walk = (n) => {
    if (n.fill) colors.add(tok(n.fill));
    if (n.stroke && n.stroke.v) colors.add(n.stroke.v);
    if (n.ring && n.ring.v) colors.add(n.ring.v);
    if (n.t === 'T') {
      type.add(`${n.fs}/${n.fw}`);
      for (const run of n.runs || []) { type.add(`${n.fs}/${run.fw}`); if (run.fill) colors.add(tok(run.fill)); }
    }
    if (n.t === 'V') {
      if (n.icon) icons.add(n.icon);
      if (n.color) colors.add(tok(n.color));
    }
    for (const c of n.ch || []) walk(c);
  };
  walk(root);
  for (const f of spec.fields || []) type.add(f);
  colors.delete(null);
  const al = root.al || { d: 'N' };
  return {
    w: r(spec.w), h: r(spec.h),
    layout: al.d || 'N',
    padding: (al.p || [0, 0, 0, 0]).map(r),
    gap: al.d === 'N' ? 0 : r(al.g || 0),
    radius: Array.isArray(root.r) ? root.r.map(r) : r(root.r || 0),
    fill: tok(root.fill) || 'none',
    stroke: root.stroke && root.stroke.c && root.stroke.c[3] === 0 ? 'none' : tok(root.stroke) || 'none',
    elevation: root.fx && root.fx.v ? root.fx.v : root.fx ? 'raw' : 'none',
    colors: normColors(colors),
    type: [...type].sort(),
    icons: [...icons].sort(),
  };
}
