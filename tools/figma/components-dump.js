// components-dump.js — the Figma side of the components check (Notion "Figma ⇄
// code check 2/2"): each component in tools/figma/components.json reduced to
// the fingerprint components-fingerprint.mjs describes.
//
// Not a module. Paste it as the `code` of one `use_figma` call on the Red
// Thread – Design System file (P92ZRC9X0R6WoCmoB8MG8P), with one line in
// front naming the components to read:
//   const ENTRIES = <the "entries" array of tools/figma/components.json>;
// It only reads. Save what it returns and give it to components-check.mjs.

if (typeof ENTRIES === 'undefined') throw new Error('Put `const ENTRIES = [...]` (tools/figma/components.json "entries") before this script.');

const WEIGHT = { Thin: 100, 'Extra Light': 200, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, 'Semi Bold': 600, SemiBold: 600, Bold: 700, 'Extra Bold': 800, ExtraBold: 800, Black: 900 };
const r = (n) => Math.round(n);
const varName = new Map();
for (const v of await figma.variables.getLocalVariablesAsync()) varName.set(v.id, v.name);
const effectName = new Map((await figma.getLocalEffectStylesAsync()).map((s) => [s.id, s.name.replace(/^(Light|Dark)\//, '')]));

function paintToken(p) {
  if (!p || p.visible === false || p.type !== 'SOLID') return null;
  const b = p.boundVariables && p.boundVariables.color;
  return b ? varName.get(b.id) || 'raw' : 'raw';
}
const first = (paints) => (Array.isArray(paints) ? paints.map(paintToken).find(Boolean) : null) || null;
const pageOf = (n) => { while (n && n.type !== 'PAGE') n = n.parent; return n; };

async function fingerprint(node) {
  const colors = new Set(); const type = new Set(); const icons = new Set();
  async function walk(n) {
    if (n.visible === false) return;
    if (n.type === 'INSTANCE') {
      const mc = await n.getMainComponentAsync();
      const set = mc && mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent : mc;
      const page = mc && pageOf(mc);
      if (page && page.name === 'Icons') {
        icons.add(mc.name.replace(/^icon\//, ''));
        // The icon's color is its vector's stroke or fill.
        const vec = n.findOne((x) => 'strokes' in x && (first(x.strokes) || first(x.fills)));
        if (vec) colors.add(first(vec.strokes) || first(vec.fills));
        return;
      }
      if (set && /^Poster/.test(set.name)) return; // artwork
    }
    if ('fills' in n && Array.isArray(n.fills) && !(n.type === 'TEXT')) { const t = first(n.fills); if (t) colors.add(t); }
    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) { const t = first(n.strokes); if (t && t !== 'raw') colors.add(t); }
    if (n.type === 'TEXT') {
      for (const seg of n.getStyledTextSegments(['fontSize', 'fontName', 'fills'])) {
        type.add(`${Math.round(seg.fontSize * 10) / 10}/${WEIGHT[seg.fontName.style.replace(/ Italic$/, '')] || seg.fontName.style}`);
        const t = first(seg.fills); if (t) colors.add(t);
      }
    }
    if ('children' in n) for (const c of n.children) await walk(c);
  }
  await walk(node);
  const auto = node.layoutMode && node.layoutMode !== 'NONE';
  const rad = node.cornerRadius === figma.mixed
    ? [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius].map(r)
    : r(node.cornerRadius || 0);
  const stroke = Array.isArray(node.strokes) && node.strokes.some((p) => p.visible !== false) ? first(node.strokes) || 'none' : 'none';
  const effects = (node.effects || []).filter((e) => e.visible !== false && e.type === 'DROP_SHADOW');
  return {
    w: r(node.width), h: r(node.height),
    layout: node.layoutMode === 'HORIZONTAL' ? 'H' : node.layoutMode === 'VERTICAL' ? 'V' : 'N',
    padding: [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].map((x) => r(x || 0)),
    gap: auto ? r(node.itemSpacing || 0) : 0,
    radius: rad,
    fill: first(node.fills) || 'none',
    stroke,
    elevation: node.effectStyleId ? effectName.get(node.effectStyleId) || 'raw' : effects.length ? 'raw' : 'none',
    colors: [...colors].filter((c) => c !== 'raw').map((c) => (/^phase-\d$/.test(c) ? 'phase' : c)).filter((c, i, a) => a.indexOf(c) === i).sort(),
    type: [...type].sort(),
    icons: [...icons].sort(),
  };
}

const out = { v: 1, entries: [] };
for (const e of ENTRIES) {
  const node = await figma.getNodeByIdAsync(e.figma);
  if (!node) { out.entries.push({ name: e.name, figma: e.figma, error: 'no such node' }); continue; }
  out.entries.push({ name: e.name, figma: e.figma, fp: await fingerprint(node) });
}
return out;
