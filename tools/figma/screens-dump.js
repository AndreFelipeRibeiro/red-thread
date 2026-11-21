// screens-dump.js — the App Screens side of the Figma ⇄ code check (part 2/2):
// for every frame on one page, how much of it is library instances and what
// isn't (layers drawn by hand, retired or local components, instances whose
// component is gone).
//
// Not a module. Paste it as the `code` of one `use_figma` call on the Red
// Thread – App Screens file (FBDC4AxFAi5gyABtpdJM8Z), with one line in front
// naming the page:   const PAGE = 'Desktop';
// One call per page (Desktop, Phone), since a call loads one page. It only
// reads. Give the results to `node tools/figma/screens-check.mjs`.

if (typeof PAGE === 'undefined') throw new Error("Put `const PAGE = 'Desktop';` (or 'Phone') before this script.");
const page = figma.root.children.find((p) => p.name === PAGE);
if (!page) throw new Error('No page named ' + PAGE);
await figma.setCurrentPageAsync(page);

const DRAWN = ['TEXT', 'VECTOR', 'RECTANGLE', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR', 'BOOLEAN_OPERATION'];
const out = { v: 1, page: PAGE, frames: [] };
for (const f of page.children) {
  if (f.type !== 'FRAME') continue;
  let instances = 0; const loose = {}; const retired = new Set(); const local = new Set(); const missing = [];
  async function walk(n) {
    if (n.visible === false) return;
    if (n.type === 'INSTANCE') {
      instances++;
      const mc = await n.getMainComponentAsync();
      if (!mc) { missing.push(n.name); return; }
      const top = mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent : mc;
      if (/^Retired/.test(top.name)) retired.add(top.name);
      if (!mc.remote) local.add(top.name);
      return; // what's inside an instance is the library's
    }
    if (DRAWN.includes(n.type)) loose[n.type] = (loose[n.type] || 0) + 1;
    if ('children' in n) for (const c of n.children) await walk(c);
  }
  for (const c of f.children) await walk(c);
  out.frames.push({ id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), instances, loose, retired: [...retired], local: [...local], missing: missing.slice(0, 10) });
}
return out;
