# tools/figma — code ⇄ Figma

Development tools that keep the [Red Thread – Design System](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P)
Figma file and the code in agreement (Notion epic "Design system: Figma as
the source of truth"). Nothing in the app imports them; Vercel never runs
them.

| File | What it does |
| --- | --- |
| `capture-dom.js` | Reads a rendered element of the running app into a spec: layout (flex → auto layout, one-row grids → fixed columns), and every color, border, shadow, radius, gap, padding and text matched to its token, read in **both themes**. What has no token comes back in `warnings`. |
| `build.js` | Turns specs into Figma components through the Figma MCP's `use_figma` (Plugin API), bound to the file's variables, text styles, effect styles and icon components. |
| `icons.js` | Every icon the app draws (24 × 24, stroked). The file's Icons page has a component per entry; captures swap a known svg for an instance. |
| `specimens.html` | Every shadcn primitive the app uses, in each variant, size and state (`src/design/Specimens.tsx`), at `/tools/figma/specimens.html` on the dev server. |

## Reading a component (code → Figma)

1. Run the dev server (`npm run dev`) and open the app (or the specimens
   page) in a browser the agent drives, at desktop size (1440) or phone size
   (390).
2. In the page:

   ```js
   const X = await import('/tools/figma/capture-dom.js');
   const spec = X.capture(document.querySelector('.card'), { name: 'Spatial card' });
   spec.warnings; // colors, shadows or sizes with no token
   ```

3. Warnings first: a color with no token is either data (a poster's or a
   character's color, a guide's color) or a gap in the tokens. Close a gap in
   `src/index.css` and `docs/design-tokens.md` before building; don't copy raw
   values into Figma.
4. Build in Figma with `use_figma`: paste `build.js` (or the parts needed),
   then `const C = await RT.ctx(); await RT.component(C, spec)` — or
   `RT.set(C, specs, 'Name')` for a variant set (spec names
   `"Name|Prop=value, Prop=value"`). Images (posters, portraits) come in as
   `art` layers; put the real images on with the MCP's `upload_assets`.
5. Check a screenshot in Light and Dark (an instance in a frame set to the
   Color collection's Dark mode), then update `docs/figma-library.md`.

## What the builder knows about Figma

- Figma drops a paint's opacity when it is bound to a variable, and again on
  instances: `RT.paint` sets it after binding, and instances made later need
  the same opacity copied from their main component.
- CSS borders take room in the box: strokes are inside and included in the
  layout (auto-layout frames only).
- A ring (`box-shadow: 0 0 0 Npx`) is an outside stroke.
- An axis hugs unless a child fills it or the code's box is larger, which
  then becomes a fixed size.
- Theme-dependent values that aren't one token (`dark:bg-input/30`) can't be
  bound: name them as tokens first (see "Controls" in `docs/design-tokens.md`).
