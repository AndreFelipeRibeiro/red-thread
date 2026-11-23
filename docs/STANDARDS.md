# Standards: how Red Thread's code, design and Figma work

The reference half of the rulebook (Notion "Slim AGENTS.md", 2026-11-21).
[AGENTS.md](../AGENTS.md) is the core every session reads; this file holds
the standards for the code, the interface and Figma. **Read it before
writing app code, changing the interface, or working in Figma**, and follow
it as you would AGENTS.md. Moved here verbatim from AGENTS.md; links that
pointed inside AGENTS.md now point here or to the skill that took the step.

## Stack and layout

- **V4 has a build step.** Vite 8.3.5 with `@vitejs/plugin-react` 6.1.2 builds
  the app; React and ReactDOM 18.3.1 come from npm, exactly pinned, and Vercel
  runs the build (`vercel.json`). Supabase (Postgres + Google OAuth) stores
  signed-in collections; supabase-js 2.112.2 is still the one script loaded
  from unpkg, with `crossorigin` and an SRI hash. V3's no-build rule is gone,
  along with in-browser Babel and the CDN React — see docs/V4-PLAN.md and the
  2026-10-31 rows in docs/decisions.md.
- **Every dependency is pinned exactly** in `package.json` (no `^`, no `~`), so
  a build is reproducible. Keep it that way: the shadcn CLI loosens pins when
  it adds a component, so re-pin after running it.
- **TypeScript, at full `strict`.** `npm run typecheck` must be green before
  you hand work over. The conversion is partial on purpose: the data layer, the
  shared `window` surface, the shadcn components and the design preview are
  typed, and the V3 app files not yet done carry a `// @ts-nocheck` header
  saying how many errors each still has. **Never add `any` or a new
  `@ts-nocheck` to reach green** — type the thing, or leave the existing header
  in place and say so. Deleting one of those headers, and the errors behind it,
  is a welcome change on its own.
- **Where the types live:** `src/types/catalog.ts` holds the shapes the catalog
  publishes (`Title`, `Character`, `Guide`, `Media`, `WatchData`, the Up next
  result), and `src/types/globals.d.ts` types the whole shared `window`
  surface. That file takes component signatures straight from the modules with
  `typeof import(...)` rather than restating them, so a changed prop is an
  error at every use site. Add to those two rather than re-describing a shape
  locally.
- **Exception: `qa/`** is development-only tooling with its own `package.json`
  (Playwright, axe-core). Nothing in the app may load from `qa/`; Vercel does not
  deploy it (`.vercelignore`) and its installs stay out of Git (`.gitignore`).
- The app is one bundle, entered at `src/main.ts`, which imports the data layer
  and then every view in the order `index.html` used to load them, `app.tsx`
  last because it mounts the app. Keep that order.
- **The files still talk to each other through `window.*`.** The bundle changed
  how the app is delivered, not how its pieces are shared: each file keeps
  publishing its components on `window` and its readers keep picking them up
  from there. That is deliberate — it is also the surface 15 QA checks read
  (docs/V4-PLAN.md §5.3). Replacing it with real imports is a later ticket, not
  something to do in passing.
- `index.html` still loads four things as plain classic scripts, each for its
  own reason, listed in `LEGACY` in `vite.config.js`: `boot.js` and
  `locales/*.js` + `i18n.js` (the startup screen has to speak the visitor's
  language before the bundle arrives) and `watch-data.js` (a QA check replaces
  it over the network, so it must keep its own URL).
- Main files, all under `src/app/` unless said otherwise: `app.tsx` (app shell,
  desktop Spatial canvas, toolbar, details drawer, state), `mobile.tsx` (phone
  views, sheets, `Highlight`, `Portrait` users), `desktop-list.tsx` (desktop
  List), `poster.tsx` (`PosterArt`, `Portrait`, image fallbacks), `search-suggest.tsx`,
  `tracking.tsx` (Seen/Watchlist + sync, the Up next rule), `upnext.tsx`
  (the Up next card, strip, meter row and chip), `watch.tsx` (Where to watch
  in the details, the region picker), `guides.js` (curated guides and the
  continuity marker; content needs the user's approval) + `guides-ui.tsx`
  (the guide menu, views, banner, pill and "Part of"), `picker.tsx` ("What
  have you seen?", the poster-grid picker), `account.tsx`, `about.tsx`
  (`ModalDialog`), `celebrate.tsx` (counters, confetti, sign-in reminder),
  `share.tsx` (the one share helper and Share button: system share sheet on
  phones, copy the link elsewhere, links always to production),
  `share-image.tsx` (the share card dialog: progress and finished guides as an
  image), `src/share-card/` (the image templates: the share card in
  `cards.ts`, the build's link previews in `link-cards.ts`; colors come from
  `src/index.css`),
  `scripts/og-previews.js` (renders every link preview at build time; not in
  `tools/`, which Vercel's build doesn't get), `middleware.ts` (at the root:
  serves a shared link its own preview page),
  `settings.tsx` (Settings: theme, language, region, motion, celebrations,
  device actions, and their sync to the account; a v4 surface built from the
  shadcn components), `boot.js` (startup screen, at the root), `i18n.js` + `locales/*.js` (root),
  `src/data/data.ts` (catalog; permanent title ids), `src/data/guides.ts`,
  `src/data/media-data.ts` (TMDB paths), `src/config.ts` (public Supabase URL +
  publishable key), `src/main.ts` (the bundle entry), `schema.sql`,
  `src/index.css` (tokens, the Tailwind entry and the few page-level rules;
  V3's `styles.css` and `styles-mobile.css` were deleted with the shadcn pass,
  2026-11-14), `src/app/shell.tsx` and `src/app/banners.tsx` (class recipes
  for the app frame, the pinned character and the guide's module, used by
  `app.tsx` and `mobile.tsx`). The README's "Project structure" table is the full list.
- Docs: `README.md` (features, setup, deploy), `CHANGELOG.md`, `docs/` (handoff,
  decisions, catalog audit and sources, privacy review, V3 verification log).

## Design, accessibility and interaction standards

These are the V3 standards and still describe the app. The V4 design system
(shadcn/ui, Vega style; see "Design system (V4)") replaces the visual tokens
and type below as it lands (Figma first, then code); the accessibility,
keyboard, focus, Escape, phone-history, reduced-motion and Spatial performance
rules carry over unchanged.

- **Phones get layouts of their own, not a shrunken desktop** (Andre; moved
  from chat memory into the repo on 2026-11-21): a phone screen is designed
  for the phone, rather than the desktop layout scaled down to fit.
- V3's colour tokens (`--v3-*`) are gone with V3's stylesheets (Notion
  "shadcn pass 6", 2026-11-14). Write styles with the design system's tokens,
  never a raw colour. `PHASE_COLORS` in `app.tsx` (and `MPHASE_COLORS`) hold
  `var(--phase-N)`; code that paints on a canvas resolves them first.
- Text on the dark overlays that sit on posters uses `--on-image` (fixed light
  values): the overlay stays dark in both themes because it sits on an image.
- **Font sizes are the type roles** (Notion "Set a real type system"):
  `text-display` (36px, phones 24), `text-display-sm` (28, the welcome's
  heading), `text-title` (20), `text-heading` (16),
  `text-body` (15, phones 14), `text-label` (13) and `text-caption` (12),
  declared in `src/index.css` (`@theme`, on the `--fs-*` sizes, in rem) so
  all text follows the browser's default font size and Settings' Text size.
  Pick by job, not by pixel: a page's one big heading, a sheet or panel
  title, an item's title, running text, a control or secondary line, small
  print. Numbers take their context's role with `tabular-nums`. Tailwind's
  own scale (`text-xs` … `text-9xl`) is cleared, so it renders nothing.
  Never write a size into a class or a style. The only other sizes are the
  **art sizes**, fixed compositions that keep px: the Spatial cards
  (`text-card-title`, `-meta`, `-micro` and their `-lg` / `-pop` steps, plus
  `text-card-title-ov`, the phone overview's title-only card; the
  shared pieces a card borrows are pinned to them inside `.card`), poster
  tags (`text-tag`) and the promo countdown (`text-numeral`,
  `text-numeral-word`). A new size is a new token in `src/index.css` and in
  `TEXT_SIZES` (`src/lib/utils.ts`), which tells `cn()` it is a size: merged
  next to an unknown `text-*`, a size is otherwise taken for a color and
  dropped. Import `cn` from `@/lib/utils`, not from `cn`. No informative text
  under 12px at the default size outside the art sizes.
  `qa/test-typescale.js` keeps all of this; `qa/test-textsize.js` holds the
  12px floor.
- **Control sizes grow with the text, never shrink:** a control's height (and
  a square icon button's width) is `max(Npx, N/16 rem)`, and Tailwind's
  spacing unit is `max(0.25rem, 4px)`. At Large everything grows in step; at
  Small nothing gets smaller than its default, so touch targets keep their
  size. Thumbnails, avatars, icons and the Spatial canvas stay in px.
- **Desktop surfaces that size to their room use the size steps**: one set
  of sizes in two steps, Regular and Large (from 84rem of the surface's own
  container), as `--step-*` tokens under the `step-sizes` class in
  `src/index.css` (poster, row height, title, meta, figures, group heading,
  chips, controls, icon buttons, gap). Put `step-sizes` inside the surface's
  `@container` and read the tokens; keep only layout that is the surface's
  own (a list's columns) local.
- **A row of controls that can run out of room fits by measuring**
  (`window.useFitSteps`, `src/app/mobile.tsx`): its stylesheet keys more
  compact steps on `data-fit`, and the hook keeps the first that fits, on
  resize, language, font load and Text size. Use it rather than a width
  breakpoint for anything holding words: breakpoints can't know a
  translation's length or the text size. `test-fit` fails when something
  doesn't fit.
- Type: the design system's Inter (`--font-sans`, served with the bundle)
  everywhere, numbers included: no monospace is left in the UI, and figures
  that need to line up (counts, ratings, budgets, table columns) use tabular
  figures (`tabular-nums`) instead (Andre's decision, 2026-11-14, replacing
  the system monospace of 2026-11-01). The poster fallback's initials use
  the display face, `--font-display` (Instrument Serif; the first serif in
  the default theme). Logo: two SVG files, each drawn as a CSS mask so the next
  version is a file swap. `src/assets/logo-mark.svg` is the mark (today the
  work-in-progress push pin), painted with `--logo` (the designer's red, the
  same in both themes; `.logo-mark` in `src/index.css`) everywhere the mark
  appears, including the share cards and link previews;
  `src/assets/logo-wordmark.svg` is the lettering, painted with
  `--foreground` (`.logo-word`) beside the mark in the toolbar and the phone
  app bar, where the name stays as text for screen readers. **On black or
  dark footage** (promo videos, end cards, social images) the pin stays
  the logo red and only the wordmark turns white: never an all-white logo
  (Andre, 2026-11-19).
  `node tools/make-icons.js` redraws `favicon.png` and `apple-touch-icon.png`
  from the mark.
- Contrast: informative text meets WCAG AA (4.5:1 for normal text) against its
  real background. Both halves of that run: `qa/a11y-scan.js` (axe) and
  `qa/test-contrast.js` (the calculation). They do not overlap — axe returns
  text whose background it cannot resolve as *incomplete* and the scan passes
  it, so the second check measures those against the pixels actually painted.
  Making text bigger is not a contrast fix. RT tag `#cc2a0a`, IMDb tag
  `#f5c518`.
- Structure: one `<h1>` (the app name), toolbar and app bar are the banner, the
  canvas/List/phone main area is `main`; columns and icon-only controls have
  accessible names (visually hidden text uses `.story-sr`).
- Focus and keyboard:
  - Focus rings use `:focus-visible`.
  - Scripts move focus only after keyboard input (the `lastInput` tracker in
    `app.tsx`), so mouse and touch users never see a ring they didn't cause.
  - Escape closes the nearest layer first: search suggestions, then menus and
    popovers, then dialogs and phone sheets, then the pair view, then the
    details, then the pinned character or performer. Never close two layers
    with one press. The details and the pin share one listener for that reason:
    two listeners both see the same press, and React re-renders between them,
    so the second acts on state the first just cleared.
  - The desktop details drawer is modeless (no focus trap). Phone sheets and
    dialogs trap focus and restore it to their opener.
  - Every Spatial card is reachable with Tab (an invisible first button) and
    opens with Enter or Space.
- Phones: each sheet owns one history entry, so the browser Back button closes
  it. Respect `prefers-reduced-motion`, and the visitor's Reduce motion
  setting: scripts ask `window.MCU_MOTION.reduced()` rather than the media
  query, and turning it on puts `reduce-motion` on `<html>`, which `src/index.css` answers by
  cutting every transition and animation.
- Motion: layout moves use `600ms cubic-bezier(.2,.8,.2,1)`; the sliding
  selection in segmented groups (`src/app/seg-pill.tsx`) uses 300ms on the
  same curve. A new segmented group gets `<window.SegPill value={…}/>` as its
  first child.
- Spatial canvas performance: no per-card GPU layers (no `will-change` or 3D
  transforms on cards) and no `backdrop-filter` inside the canvas. The canvas is
  composited only at 30% zoom and above (`LAYER_MIN_SCALE`). These rules keep
  iOS Safari from running out of memory when zoomed out.
- Images: posters and portraits go through `PosterArt` / `Portrait`, which fall
  back to generated art or initials and remember failed addresses per session.
- Search uses one normalisation, `MCU_I18N.fold()` (case and accents), for
  filtering, suggestions and highlights.

## Figma

Red Thread's look (V4's re-skin, and V5's look and feel and branding work) is
designed in Figma and brought into code through the Figma MCP
server (remote, `https://mcp.figma.com/mcp`). `.mcp.json` in the repository
root registers it for Claude Code in this folder; each person authenticates
once (`/mcp`, then figma, then Authenticate). Codex adds it with
`codex mcp add figma --url https://mcp.figma.com/mcp`.

- Figma is the source of truth for the design: variables (colour, type,
  spacing, radius, motion) and components. [docs/design-tokens.md](design-tokens.md)
  maps every token in `src/index.css` to its Figma collection, variable or
  style (same name without the `--`, code syntax `var(--name)`); a new token
  gets its row there in the same change. Code mirrors the variables as
  design tokens in one place, with the same names; components use tokens,
  never raw values copied from a frame.
- **Figma leads** (Notion "Connect Figma to code and make Figma the source of
  truth", 2026-11-17). The [Red Thread – Design System](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P)
  file holds the variables, icons and a component for everything the app
  draws; [docs/figma-library.md](figma-library.md) maps each component
  to its code (Code Connect needs an Organization plan; AFR is on Pro, so the
  map lives there and in each component's description).
  - A change to the look starts in Figma: a variable, a style, a component,
    or a frame built from the library's instances. The code follows.
  - Before changing a component's code, read its Figma component with the
    MCP (link from the map). After, the two agree: when a code change alters
    how something looks (a fix, a new state, a new component), update or add
    the Figma component in the same ticket with `tools/figma/` (README
    there), and say so on the ticket.
  - A new or changed token gets the same name in `src/index.css`, the Figma
    variable (code syntax `var(--name)`) and its row in
    [docs/design-tokens.md](design-tokens.md), in the same change.
  - **"Check tokens against Figma"** (report only) and **"sync tokens from
    Figma"** (report, then bring Figma's changes into the code on a yes)
    are one procedure: [.claude/skills/figma-tokens/SKILL.md](../.claude/skills/figma-tokens/SKILL.md).
    Claude Code loads it as a skill; Codex and any other agent follow the
    same file. It dumps the Design System's variables and styles with
    `tools/figma/tokens-dump.js` and compares them with
    `node tools/figma/tokens-check.mjs <dump>`. Run it at the start of a
    build whose approved design changed a variable, and at the Figma gate
    before every push.
  - **"Check components against the app"** (report only) compares the
    library's components and the App Screens frames with the running app:
    [.claude/skills/figma-components/SKILL.md](../.claude/skills/figma-components/SKILL.md)
    (`tools/figma/components.json` and `screens.json` say what it covers).
    **"Check Figma against the code"** runs both skills, tokens first. Run it
    at Reconcile, when a ticket that changed the look closes, and before a
    batch with such tickets.
  - All Red Thread Figma files live in the AFR team folder
    https://www.figma.com/files/folder/683084303; create new ones there
    (the MCP's `create_new_file` with project `683084303` and plan
    `team::1006581453897187942`, the AFR team's Pro plan), not in drafts. The MCP can't move a file: ask
    Andre to move strays.
- Work from links, not descriptions: a design ticket's **Figma** field links
  the frame(s). Read the frame with the MCP (design context, variables, a
  screenshot) before coding, and compare the result against the frame in a
  real browser at desktop and phone sizes, in English and Portuguese.
- **Exact links, and behavior as annotations** (Notion "Tickets link exact
  Figma frames, with behavior notes as Dev Mode annotations", 2026-11-17):
  - The **Figma** field links the exact frame or component: a `node-id`
    link (Figma's "Copy link to selection"), never just the file. Several
    frames go in the page body as a list, one link each, with what each shows
    (Light, Dark, phone, a state).
  - What a frame can't show is a **Dev Mode annotation** on the frame or
    layer it is about: what a click or tap does, hover and focus, empty,
    loading and error states, keyboard, what changes on phones or in
    Portuguese. The ticket body says only what is not in the annotations.
  - Agents read the annotations with the frame: `get_design_context` returns
    them with the design, so read it for every linked node (not only
    `get_metadata` or a screenshot), and treat an annotation like a line of
    the ticket. Where an annotation and the ticket disagree, ask on the
    ticket.
  - Writing a design ticket (from chat or from an audit), link the frame the
    same way, or say "no frame yet" so the ticket isn't mistaken for a
    code-only one.
- When a frame and the rules here disagree (accessibility, keyboard, contrast,
  localisation), the rules win: flag the difference on the ticket instead of
  silently copying the frame.
- **Phase 4's first pass has no frames** (Andre's decision, 2026-11-01): it
  applies shadcn/ui's Vega defaults to each surface as they stand, so the look
  can be seen and reacted to before any art direction. The rules above apply to
  the customising pass that follows, once frames exist.
- **Keeping the library whole** (Andre, 2026-11-19): screens use only
  library instances, an approved design is promoted to the library and App
  Screens before its code ships, retired components move to a Retired
  section, and explorations are archived once a direction ships. The steps
  are the `promote-design` skill
  ([.claude/skills/promote-design/SKILL.md](../.claude/skills/promote-design/SKILL.md));
  [figma-library.md](figma-library.md), "Upkeep", has the details.
- Do not write to the user's Figma files (create or change frames, variables
  or components) unless the ticket or the user asks for it.
- Never put Figma access tokens or other credentials in the repository,
  Notion or chat; the MCP signs in through the browser.

## Design system (V4)

- Decided 2026-10-31 (docs/decisions.md; Notion ticket "Design system:
  shadcn/ui on Base UI, Vega style (dark + light)"): V4's component base is
  shadcn/ui on Base UI, starting from shadcn's Vega style with the Neutral base
  colour and theme, default radius, Inter and lucide icons (shadcn preset
  `base-vega`). Light and dark themes from day one.
- `--font-sans` and `--spacing` are declared in a plain `@theme` block, not
  `@theme inline`, so the utilities read them as variables: the dev-only Theme
  lab (`src/app/theme-lab.tsx`, development and `*.vercel.app` previews only)
  tries other typefaces and densities by setting them. Keep them that way.
- Start from the library defaults; V4's art direction arrives later through
  Figma variables. Do not carry V3's colours (`--v3-bg`, `--v3-accent`, …) in
  as a starting point.
- Setup landed on 2026-10-31: Tailwind CSS v4.3.3, shadcn on Base UI 1.9.0,
  `components.json`, the token stylesheet `src/index.css`, eight components in
  `src/components/ui/` and the preview page `design.html`. Wired into the app
  on 2026-11-01 (Notion "Phase 4 — wire the design system into the app"):
  `src/main.ts` loads `src/index.css` and starts the theme, with no visible
  change, because V3's stylesheets still paint every surface. Putting the
  components into the app is Phase 4, one ticket per surface.
- **Every surface is on the design system** since the shadcn pass (Notion
  epic "shadcn pass", 2026-11-14): V3's stylesheets, its first re-skin pass,
  the `.v4` opt-in class and the scoped reset are gone, and Tailwind's own
  preflight applies to the whole page.
- **Tailwind generates classes only from the files listed with `@source` in
  `src/index.css`** (`source(none)` on the utilities import). A file that
  writes Tailwind classes must be listed. `app.tsx` and `mobile.tsx` are
  deliberately not: they hold many old class names that are also Tailwind
  utilities, so they take their classes from recipe files that are listed
  (`src/app/shell.tsx`, `banners.tsx`, `list-parts.tsx`). Class names the app
  and the QA checks read stay on the markup as hooks (`dl-row`, `m-lrow`,
  `g-stop`, `cb-step`…) beside the utilities.
- Styles go on the components, with the tokens: no new stylesheet. The only
  hand-written CSS is in `src/index.css` (tokens, keyframes, and a few
  page-level rules: the page background, search highlights, the logo masks,
  `.story-sr`, the Reduce motion rule). `qa/test-v4scope.js` checks that no
  V3 stylesheet or `--v3-` token comes back and that the reset and theme are
  wired.
- Install and add components with the shadcn CLI pinned to an exact version
  (`npx shadcn@<version> init --base base --preset vega` — the CLI's preset is
  `vega`, and `--base base` makes the style it records `base-vega`); commit
  `components.json`. Components live in `src/components/ui/` and are our code:
  restyle and fix them there instead of wrapping them to override styles.
- Tokens: shadcn's CSS variables (`--background`, `--foreground`, `--primary`,
  `--border`, `--ring`, `--radius`, …) in one stylesheet with a light `:root`
  block and a `.dark` block are the token file V4-PLAN.md §6 describes; names
  match the Figma variables. Phase colours become tokens there (`--phase-1`
  … `--phase-6`, both themes), and so do collection status (`--status-seen`,
  `--status-seen-text`, `--status-watch`) and `--on-color`, the ink for text on
  a phase or status fill, which turns light in the light theme because those
  fills turn dark.
- Theme: class `dark` on `<html>`, following `prefers-color-scheme` until the
  user overrides it. The mechanism is `src/theme.ts` (`window.MCU_THEME`,
  `useTheme()`, the override in `localStorage` under `mcu.theme`, cleared to
  go back to following the system); every page gets the class before first
  paint from a copy of the rule that Vite injects into its `<head>`
  (`THEME_PREPAINT` in `vite.config.js`). The visitor overrides it in
  Settings (`src/app/settings.tsx`). The app starts it in `src/main.ts`, but the class
  reaches a surface only once that surface is on the tokens: V3's stylesheets
  are dark whatever class `<html>` carries.
- Both themes meet WCAG AA, and `qa/test-contrast.js` is what says so. Where a
  shortfall is accepted it goes in that check's `KNOWN` with the ratio it was
  accepted at and why, not into a comment nobody runs.
- The interaction rules in "Design, accessibility and interaction standards"
  win over library defaults: Base UI dialogs and popovers join the one Escape
  ladder, the desktop drawer stays modeless, phone sheets trap focus and own a
  history entry, focus rings appear only after keyboard input, and nothing
  inside the Spatial canvas uses `backdrop-filter` (keep Vega's default solid
  menus).

## Translated text

Moved verbatim from AGENTS.md ("Language"); the naming rules stay there.

User-facing text is translated: never hard-code UI strings in components. Add a
key to `locales/en.js` (the complete base), translate it in every other
`locales/*.js`, and read it with `tr()` (app.tsx), `mtr()` (mobile.tsx) or
`window.MCU_I18N.tr()`. Show titles and character names through
`MCU_I18N.titleName()` / `charName()`; search keeps matching every language's
names. New catalog titles need an official local title and a short,
spoiler-light synopsis per locale; write synopses rather than copying studio or
TMDB text. Preserve permanent title ids and the spatial-filter invariants
described in V3-SPEC.md §7.1 (marking a title never reflows the Spatial
canvas; since 2026-11-17 the Seen, Unseen and Watchlist filters pack their
titles into a lens, taken when the filter changes: decisions.md).

## Released versions

Moved verbatim from AGENTS.md ("Branches, deploys and approvals"). Each shipped state has a tag; create and push a tag only with the user's approval.

  - `version/4.0` (tag `v4-final`), preview
    `https://red-thread-git-version-40-afr-bfcd.vercel.app/`.
  - `version/3.0` (tag `v3-final`), preview
    `https://mcu-connections-git-version-30-afr-bfcd.vercel.app/` (its
    address from before the rename).
