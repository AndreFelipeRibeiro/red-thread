// tokens-dump.js — read the Design System's variables, effect styles and
// text styles as one compact JSON (Notion "Figma ⇄ code check 1/2: tokens").
//
// Not a module: paste the whole file as the `code` of one Figma MCP
// `use_figma` call on the Red Thread – Design System file
// (P92ZRC9X0R6WoCmoB8MG8P). It only reads. Save the JSON it returns to a
// file and give that file to `node tools/figma/tokens-check.mjs <file>`.
//
// Encoding, kept small so the whole file fits one return:
//   a variable's value per mode is "@name" (an alias of that variable),
//   "#rrggbbaa" (a color), a number or a string;
//   an effect is [type, x, y, blur, spread, "#rrggbbaa"].

const hex = (c) => '#' + [c.r, c.g, c.b, c.a === undefined ? 1 : c.a]
  .map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const byId = new Map();
for (const v of await figma.variables.getLocalVariablesAsync()) byId.set(v.id, v);

const out = { v: 1, collections: [], variables: [], effects: [], texts: [] };

for (const c of collections) {
  out.collections.push({ name: c.name, modes: c.modes.map((m) => m.name) });
  for (const id of c.variableIds) {
    const v = byId.get(id);
    if (!v) continue;
    const vals = {};
    for (const m of c.modes) {
      const raw = v.valuesByMode[m.modeId];
      if (raw && typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS') {
        const t = byId.get(raw.id) || (await figma.variables.getVariableByIdAsync(raw.id));
        vals[m.name] = '@' + (t ? t.name : raw.id);
      } else if (raw && typeof raw === 'object' && 'r' in raw) {
        vals[m.name] = hex(raw);
      } else {
        vals[m.name] = raw;
      }
    }
    out.variables.push({
      c: c.name, n: v.name, t: v.resolvedType,
      code: (v.codeSyntax && v.codeSyntax.WEB) || '', v: vals,
    });
  }
}

for (const s of await figma.getLocalEffectStylesAsync()) {
  out.effects.push({
    n: s.name,
    e: s.effects.filter((e) => e.visible !== false).map((e) => [
      e.type, e.offset ? e.offset.x : 0, e.offset ? e.offset.y : 0,
      e.radius || 0, e.spread || 0, e.color ? hex(e.color) : '',
    ]),
  });
}

for (const s of await figma.getLocalTextStylesAsync()) {
  const b = s.boundVariables || {};
  const sizeVar = b.fontSize ? byId.get(b.fontSize.id) : null;
  out.texts.push({
    n: s.name, size: s.fontSize, sizeVar: sizeVar ? sizeVar.name : '',
    lh: s.lineHeight.unit === 'PERCENT' ? s.lineHeight.value / 100
      : s.lineHeight.unit === 'PIXELS' ? s.lineHeight.value + 'px' : 'auto',
  });
}

return out;
