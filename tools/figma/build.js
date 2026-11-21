// Builds Figma components from the specs tools/figma/capture-dom.js reads off
// the running app, bound to the Red Thread – Design System file's variables
// and styles. Runs inside Figma through the Figma MCP's use_figma (Plugin
// API): paste this file (or the parts needed) and the specs into one call's
// code (README, "Reading a component", step 4).
// Development only; nothing in the app imports it.
//
// What it does with a spec node:
//   F (a box)  → a frame: auto layout from flex (direction, gap, padding,
//                alignment, wrap), a free frame otherwise; fill, border,
//                radius and shadow bound to the color, radius and spacing
//                variables and the effect styles; children placed in it.
//   T (text)   → a text layer on its type role's text style, weight and
//                line height overridden where the code overrides them.
//   V (an svg) → an icon instance when the Icons page has it, else the svg,
//                its strokes or fills bound to the text color's variable.
// Sizes follow the code: hug where the content decides, fill where the code
// grows or stretches, fixed where the box was measured larger than hugging.

/* global figma */
const RT = {};

RT.ctx = async function ctx() {
  const vars = {};
  for (const v of await figma.variables.getLocalVariablesAsync()) vars[v.name] = v;
  const text = {};
  for (const s of await figma.getLocalTextStylesAsync()) text[s.name.replace(/^art\//, '')] = s;
  const fx = {};
  for (const s of await figma.getLocalEffectStylesAsync()) fx[s.name] = s;
  const icons = {};
  const ip = figma.root.children.find((p) => p.name === 'Icons');
  if (ip) { await ip.loadAsync(); for (const c of ip.findAllWithCriteria({ types: ['COMPONENT'] })) icons[c.name] = c; }
  const fonts = new Set();
  return { vars, text, fx, icons, fonts, warnings: [] };
};

const WEIGHT = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
RT.font = async function font(C, fam, fw, it) {
  // Headlines are Inter in the live app (Andre, 2026-11-17); other faces are
  // tried through the Typeface variable modes, not drawn into components.
  const family = 'Inter';
  let style = family === 'Inter' ? WEIGHT[Math.round((fw || 400) / 100) * 100] || 'Regular' : 'Regular';
  if (it) style = style === 'Regular' ? 'Italic' : style + ' Italic';
  const f = { family, style };
  const k = family + ':' + style;
  if (!C.fonts.has(k)) { await figma.loadFontAsync(f); C.fonts.add(k); }
  return f;
};

/** The alpha of a color variable's first mode (aliases followed). */
RT.alpha = function alpha(C, v) {
  let val = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
  for (let d = 0; val && val.type === 'VARIABLE_ALIAS' && d < 6; d++) {
    const t = Object.values(C.vars).find((x) => x.id === val.id);
    if (!t) break;
    val = t.valuesByMode[Object.keys(t.valuesByMode)[0]];
  }
  return val && val.a != null ? val.a : 1;
};

RT.solid = function solid(C, p) {
  if (!p) return null;
  if (p.v && C.vars[p.v]) {
    // A paint bound to a variable takes its opacity from the variable's alpha
    // in every file that uses the library, so a translucent color must be a
    // token with alpha and the paint's opacity must equal that alpha (a solid
    // token plus opacity holds only in this file). With no `o`, use the alpha.
    const a = RT.alpha(C, C.vars[p.v]);
    const base = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: p.o == null ? a : p.o };
    if (p.o != null && p.o < 0.999 && a >= 0.999) C.warnings.push(p.v + ' at ' + p.o + ': a solid token with opacity shows solid in other files');
    const bound = figma.variables.setBoundVariableForPaint(base, 'color', C.vars[p.v]);
    return { ...bound, opacity: base.opacity };
  }
  const c = p.c || [0, 0, 0, 1];
  if (p.v) C.warnings.push('no variable ' + p.v);
  return { type: 'SOLID', color: { r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 }, opacity: c[3] == null ? 1 : c[3] };
};

/** Sets a node's fills or strokes from paint specs (opacity: see RT.solid). */
RT.paint = function paint(C, node, prop, list) {
  node[prop] = list.map((p) => RT.solid(C, p));
  if (list.some((p) => p && p.v && p.o != null)) node[prop] = node[prop].map((x, i) => (list[i] && list[i].v && list[i].o != null ? { ...x, opacity: list[i].o } : x));
};

RT.bindNum = function bindNum(C, node, field, value, varName) {
  if (varName && C.vars[varName]) node.setBoundVariable(field, C.vars[varName]);
  else node[field] = value;
};

RT.shadow = function shadow(C, node, fx) {
  if (!fx) return;
  if (fx.v) {
    const s = C.fx[fx.v] || C.fx['Light/' + fx.v];
    if (s) return node.setEffectStyleIdAsync(s.id);
  }
  if (fx.raw) {
    // "rgba(…) Xpx Ypx Bpx Spx[, …]" → drop shadows.
    const effects = [];
    for (const layer of fx.raw.split(/,(?![^(]*\))/)) {
      const m = layer.trim().match(/^(inset )?rgba?\(([^)]+)\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?/);
      if (!m) continue;
      const c = m[2].split(/[\s,/]+/).filter(Boolean).map(Number);
      effects.push({ type: m[1] ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { r: c[0] / 255, g: c[1] / 255, b: c[2] / 255, a: c[3] == null ? 1 : c[3] },
        offset: { x: +m[3], y: +m[4] }, radius: +m[5], spread: +(m[6] || 0), visible: true, blendMode: 'NORMAL' });
    }
    node.effects = effects;
  }
};

RT.box = async function box(C, f, s) {
  RT.paint(C, f, 'fills', s.fill ? [s.fill] : []);
  if (s.image) {
    // Poster art: an image slot. A neutral fill stands in for the art.
    f.fills = [RT.solid(C, { v: 'muted' })];
    f.name = s.n === 'image' ? 'art' : s.n;
  }
  if (s.stroke) {
    RT.paint(C, f, 'strokes', [s.stroke]);
    f.strokeAlign = 'INSIDE';
    // CSS borders take room in the box; so does this stroke.
    if (f.layoutMode !== 'NONE') f.strokesIncludedInLayout = true;
    const w = s.stroke.w;
    if (Array.isArray(w)) { f.strokeTopWeight = w[0]; f.strokeRightWeight = w[1]; f.strokeBottomWeight = w[2]; f.strokeLeftWeight = w[3]; }
    else f.strokeWeight = w;
  }
  if (s.r != null) {
    if (Array.isArray(s.r)) { f.topLeftRadius = s.r[0]; f.topRightRadius = s.r[1]; f.bottomRightRadius = s.r[2]; f.bottomLeftRadius = s.r[3]; }
    else if (s.rv && C.vars[s.rv]) for (const k of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']) f.setBoundVariable(k, C.vars[s.rv]);
    else f.cornerRadius = s.r;
  }
  await RT.shadow(C, f, s.fx);
  if (s.op != null) f.opacity = s.op;
  if (s.blur) f.effects = f.effects.concat([{ type: 'BACKGROUND_BLUR', radius: s.blur, visible: true }]);
  f.clipsContent = !!s.clip;
  if (s.ring && !s.stroke) { RT.paint(C, f, 'strokes', [s.ring]); f.strokeAlign = 'OUTSIDE'; f.strokeWeight = s.ring.w; }
};

RT.layout = function layout(C, f, s) {
  const al = s.al || { d: 'N' };
  if (al.d === 'N') { f.layoutMode = 'NONE'; return; }
  f.layoutMode = al.d === 'V' ? 'VERTICAL' : 'HORIZONTAL';
  const p = al.p || [0, 0, 0, 0], pv = al.pv || [];
  RT.bindNum(C, f, 'paddingTop', p[0], pv[0]);
  RT.bindNum(C, f, 'paddingRight', p[1], pv[1]);
  RT.bindNum(C, f, 'paddingBottom', p[2], pv[2]);
  RT.bindNum(C, f, 'paddingLeft', p[3], pv[3]);
  if (al.jc === 'SPACE_BETWEEN') f.primaryAxisAlignItems = 'SPACE_BETWEEN';
  else { f.primaryAxisAlignItems = al.jc || 'MIN'; RT.bindNum(C, f, 'itemSpacing', al.g || 0, al.gv); }
  f.counterAxisAlignItems = al.ai === 'STRETCH' ? 'MIN' : al.ai === 'BASELINE' && al.d === 'V' ? 'MIN' : al.ai || 'MIN';
  if (al.wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = al.cg || 0; }
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
};

RT.text = async function text(C, s) {
  const t = figma.createText();
  t.name = s.n || 'text';
  const fam = s.fam || 'sans';
  const f = await RT.font(C, fam, s.fw, s.it);
  let st = s.role && C.text['text-' + s.role];
  // A size override the role doesn't have: the style that has that size.
  if (st && Math.abs(st.fontSize - s.fs) > 0.05) st = Object.values(C.text).find((x) => Math.abs(x.fontSize - s.fs) < 0.05) || st;
  if (st) { await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id); }
  t.fontName = f;
  if (!st || Math.abs(st.fontSize - s.fs) > 0.05) t.fontSize = s.fs;
  if (s.lh && (!st || st.lineHeight.unit !== 'PIXELS' || Math.abs(st.lineHeight.value - s.lh) > 0.3)) {
    const fromStyle = st && st.lineHeight.unit === 'PERCENT' ? st.lineHeight.value / 100 * st.fontSize : null;
    if (fromStyle == null || Math.abs(fromStyle - s.lh) > 0.3) t.lineHeight = { unit: 'PIXELS', value: s.lh };
  }
  if (s.ls) t.letterSpacing = { unit: 'PIXELS', value: s.ls };
  if (s.up) t.textCase = 'UPPER';
  if (s.ul) t.textDecoration = 'UNDERLINE';
  t.characters = s.s || ' ';
  if (s.fill) RT.paint(C, t, 'fills', [s.fill]);
  if (s.runs) {
    let i = 0;
    for (const r of s.runs) {
      const end = Math.min(i + r.s.length, t.characters.length);
      if (end > i) {
        t.setRangeFontName(i, end, await RT.font(C, fam, r.fw, r.it));
        if (r.fill) t.setRangeFills(i, end, [RT.solid(C, r.fill)]);
      }
      i = end;
    }
  }
  if (s.ta === 'center') t.textAlignHorizontal = 'CENTER';
  else if (s.ta === 'right' || s.ta === 'end') t.textAlignHorizontal = 'RIGHT';
  if (s.trunc) {
    t.textAutoResize = 'HEIGHT';
    t.resize(Math.max(1, s.w), t.height);
    t.textTruncation = 'ENDING';
    if (s.maxLines) t.maxLines = s.maxLines;
  } else if (s.wrap || s.cell) {
    t.textAutoResize = 'HEIGHT';
    t.resize(Math.max(1, s.w + 0.5), t.height);
  } else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  return t;
};

RT.icon = function icon(C, s) {
  const key = s.icon ? 'icon/' + s.icon : null;
  let n;
  if (key && C.icons[key]) n = C.icons[key].createInstance();
  else {
    n = figma.createNodeFromSvg(s.svg);
    n.name = s.icon ? 'icon/' + s.icon : (s.n || 'icon');
  }
  n.resize(Math.max(0.01, s.w), Math.max(0.01, s.h));
  const paint = s.color ? RT.solid(C, s.color) : null;
  const all = 'findAll' in n ? n.findAll(() => true) : [];
  for (const v of all) {
    if (!('strokes' in v)) continue;
    if (paint && s.strokeUse && v.strokes.length) RT.paint(C, v, 'strokes', [s.color]);
    if (paint && s.fillUse && v.fills.length) RT.paint(C, v, 'fills', [s.color]);
    // Icons are drawn at 24 and scaled; the stroke keeps the code's weight.
    if (key && C.icons[key] && v.strokes.length) v.strokeWeight = (s.sw || 2) * s.w / 24;
  }
  if (s.opacity != null) n.opacity = s.opacity;
  return n;
};

/** Builds spec node `s` (and its children); returns the Figma node. */
RT.node = async function node(C, s) {
  if (s.t === 'T') return RT.text(C, s);
  if (s.t === 'V') return RT.icon(C, s);
  const f = figma.createFrame();
  f.name = s.n || 'frame';
  RT.layout(C, f, s);
  await RT.box(C, f, s);
  // Start at the code's size, fixed, so children can fill it.
  f.resize(Math.max(0.01, s.w), Math.max(0.01, s.h));
  for (const c of s.ch || []) {
    const k = await RT.node(C, c);
    f.appendChild(k);
    RT.place(f, s, k, c);
  }
  if (f.layoutMode !== 'NONE') {
    // Each axis hugs its content unless a child fills it or the code's box is
    // larger than its content (a fixed or minimum size).
    const kids = f.children.filter((k) => k.layoutPositioning !== 'ABSOLUTE');
    for (const [axis, dim, want] of [['layoutSizingHorizontal', 'width', s.w], ['layoutSizingVertical', 'height', s.h]]) {
      if (kids.some((k) => k[axis] === 'FILL')) continue;
      f[axis] = 'HUG';
      if (Math.abs(f[dim] - want) > 0.6) {
        f[axis] = 'FIXED';
        f.resize(dim === 'width' ? Math.max(0.01, want) : f.width, dim === 'height' ? Math.max(0.01, want) : f.height);
      }
    }
  }
  return f;
};

/** Places child `k` (spec `c`) in frame `f` (spec `s`). */
RT.place = function place(f, s, k, c) {
  const free = f.layoutMode === 'NONE';
  if (!free && c.abs) k.layoutPositioning = 'ABSOLUTE';
  if (free || c.abs) { k.x = (c.x || 0) - (s.x || 0); k.y = (c.y || 0) - (s.y || 0); return; }
  const row = f.layoutMode === 'HORIZONTAL';
  const fill = (axis) => { try { k[axis] = 'FILL'; } catch (e) { /* not in auto layout */ } };
  const textFixed = c.t === 'T' && (c.trunc || c.wrap || c.cell);
  // A table cell keeps its column's width.
  if (c.cell && c.t === 'F' && !c.grow) { k.layoutSizingHorizontal = 'FIXED'; k.resize(Math.max(0.01, c.w), k.height); }
  if (row) {
    if (c.grow) fill('layoutSizingHorizontal');
    else if (textFixed) k.layoutSizingHorizontal = 'FIXED';
    if (c.stretch && s.al && s.al.ai === 'STRETCH') fill('layoutSizingVertical');
  } else {
    if (c.stretch && s.al && s.al.ai === 'STRETCH') fill('layoutSizingHorizontal');
    else if (textFixed) k.layoutSizingHorizontal = 'FIXED';
    if (c.grow) fill('layoutSizingVertical');
  }
};

/** Builds a spec as a component (or a plain frame with `asFrame`). */
RT.component = async function component(C, spec, { asFrame = false, description } = {}) {
  const f = await RT.node(C, spec.root);
  if (asFrame) return f;
  const comp = figma.createComponentFromNode(f);
  comp.name = spec.name;
  if (description) comp.description = description;
  return comp;
};

/** Builds specs named "Set|Prop=value, …" as the variants of one component
 *  set, laid out in a grid of `cols` columns. */
RT.set = async function set(C, specs, name, { cols = 4, gap = 24, description } = {}) {
  const comps = [];
  for (const sp of specs) {
    const c = await RT.component(C, sp);
    c.name = sp.name.split('|')[1] || sp.name;
    comps.push(c);
  }
  const cs = figma.combineAsVariants(comps, figma.currentPage);
  cs.name = name;
  if (description) cs.description = description;
  let x = gap, y = gap, rowH = 0;
  cs.children.forEach((c, i) => {
    if (i && i % cols === 0) { x = gap; y += rowH + gap; rowH = 0; }
    c.x = x; c.y = y; x += c.width + gap; rowH = Math.max(rowH, c.height);
  });
  cs.resizeWithoutConstraints(Math.max(...cs.children.map((c) => c.x + c.width)) + gap, y + rowH + gap);
  return cs;
};

/** Exposes the text layers named `layer` (every text when omitted) in each
 *  variant as one text property. */
RT.textProp = function textProp(cs, prop, layer) {
  const first = cs.children[0].findOne((n) => n.type === 'TEXT' && (!layer || n.name === layer));
  if (!first) return null;
  const key = cs.addComponentProperty(prop, 'TEXT', first.characters);
  for (const v of cs.children) for (const t of v.findAll((n) => n.type === 'TEXT' && (!layer || n.name === layer))) t.componentPropertyReferences = { characters: key };
  return key;
};

/** Retired 2026-11-17: copying opacities onto instances made fill overrides
 *  that stop library updates (the seen tints stayed solid in other files).
 *  RT.solid now sets each paint's opacity from its token, so nothing needs
 *  copying. Kept as a no-op so older build scripts still run. */
RT.fixOpacity = async function fixOpacity() { return 0; };

RT.regrid = function regrid(cs, cols, gap = 24) {
  let x = gap, y = gap, rowH = 0;
  cs.children.forEach((c, i) => {
    if (i && i % cols === 0) { x = gap; y += rowH + gap; rowH = 0; }
    c.x = x; c.y = y; x += c.width + gap; rowH = Math.max(rowH, c.height);
  });
  cs.resizeWithoutConstraints(Math.max(...cs.children.map((c) => c.x + c.width)) + gap, y + rowH + gap);
};

/** Lays nodes out in a row (or grid) starting at x, y on the current page. */
RT.row = function row(nodes, x, y, gap = 40) {
  let cx = x;
  for (const n of nodes) { n.x = cx; n.y = y; cx += n.width + gap; }
};
