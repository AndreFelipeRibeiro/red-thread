# Design system changelog

Every release of the Figma **Design System**
([P92ZRC9X0R6WoCmoB8MG8P](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P))
and **App Screens**
([FBDC4AxFAi5gyABtpdJM8Z](https://www.figma.com/design/FBDC4AxFAi5gyABtpdJM8Z)),
newest first. A release is one publish of the Design System, together with
the App Screens update that follows it. Each file has a **Changelog** page
with the same rows. How a release is named, logged and versioned is in
[WORKFLOW.md](WORKFLOW.md), "Design system releases".

Each entry gives:

- **Release:** the name Andre gives the publish and the named version he saves
  right after it, `DS · YYYY-MM-DD · <short name>`.
- **What changed:** the components, variables and App Screens frames
  touched.
- **Ticket:** its Notion ticket, and the batch when code shipped with it.

**Before 2026-11-25** nobody saved named versions or wrote publish notes.
Those entries are rebuilt from CHANGELOG.md, the git history of
`docs/figma-library.md`, `docs/design-tokens.md` and `tools/figma/`, and the
Notion tickets. To see one of those states in Figma, open the file's version
history (File → Show version history) at the entry's date.

## Screens · 2026-11-26 · Solid bars, radii, three color merges

- **App Screens:** took today's three Design System releases with Update all ("Foundations reboot, four color merges", "Solid bars, named corner radii", "Three color merges").
  - **Before the update:** 46 overrides moved off the merged variables: 30 strokes to `input`, and 16 more off `progress-track`, `on-image-veil` and `chip-border`.
  - **After the update:** 4 Phone Details sheet chip strokes moved to `input`. Two of them dropped a hand-set 14% opacity that doubled the token's own.
  - **Phone page:** Update all had missed it. 52 instances (Phone app bar, Phone title rows, Phone nav bar, Details sheet) were still on the old library copy; they were swapped to the latest, with their overrides kept. Every instance on both pages is now on the latest version.
  - **Scan:** no references to deleted variables, and no corner-radius overrides. The two Titles Up next rows keep fill overrides that equal their component's.
- **Ticket:** [Tokens: second consolidation pass](https://app.notion.com/p/4249e188029f8162b6defaced6350216).

## DS · 2026-11-26 · Three color merges

Published 2026-11-26 by Andre.

- **Variables:** three near-duplicates merged, with every binding moved first (283 in the Design System, 16 overrides in App Screens). Color goes from 90 to 87 variables:
  - `progress-track` (brand at 22%) into `brand-tint-strong` (20%);
  - `on-image-veil` (78%, the connections count on a card's poster) into `on-image-ground` (82%);
  - `chip-border` into `input` (Dark goes from 14% to 15% white).
- **Foundations · Color · Roles:** the three rows removed; 86 roles.
- **Ticket:** [Tokens: second consolidation pass](https://app.notion.com/p/4249e188029f8162b6defaced6350216), Batch 30 (with the code). Andre approved each on the comparison board.

## DS · 2026-11-26 · Solid bars, named corner radii

Published 2026-11-26 by Andre. App Screens took it the same day.

- **Tier 1:** Foundations · Color · Roles shows `progress` and `ring` as "→ brand" rows, without swatches, since they only point at `brand`.
- **Glass bars made solid:** App bar, Phone app bar, Phone nav bar and Band label use `background`, and their background blur is removed. Nothing ever scrolled under them, so the 95% `background-glass` never showed. `background-glass` stays for the Character card and Up next, which float over the Connections canvas.
- **Corner radii:**
  - New variable `radius-xs` (4px, `calc(var(--radius) * 0.4)`), with a row on Foundations · Spacing & radius.
  - Desktop components' unbound corners are bound to the named radii.
  - Desktop thumbnails, posters, the year tag and the keyboard key go from 3 or 5px to 4px, as `radius-xs`.
  - Phone thumbnails and posters go to 4.5px, `radius-xs` at 112.5%.
  - Circles, pills, 1 and 2px bars, and component-set containers are unchanged.
- **Ticket:** [Tokens: second consolidation pass](https://app.notion.com/p/4249e188029f8162b6defaced6350216), Batch 30 (with the code).

## Screens · 2026-11-25 · Up next rows

- **App Screens:** in Titles (Light, Dark), the Up next row had an old fill override, `brand` at a hand-set 10% opacity. A paint bound to a variable keeps a hand-set opacity only inside the library, so the Design System's re-publish turned that row solid red. It now uses the List row's own `brand-tint`, which carries its alpha. A scan of both pages found no other instance overriding its component's fill. The remaining differences are Dark-mode translucent tokens, whose opacity Figma takes from the token.
- **Ticket:** [Version control for the Design System and App Screens](https://app.notion.com/p/4249e188029f81ac91afdfcd89830a92) (found while backfilling this log; Andre reported it).

## DS · 2026-11-26 · Foundations reboot, four color merges

Published 2026-11-26 by Andre. One publish carries both pieces of work: the Foundations reboot and the token merges below. App Screens took it the same day ("Screens · 2026-11-26 · Solid bars, radii, three color merges").

- **Variables:** four Color duplicates merged, with every binding moved first (322 in the Design System, 30 stroke overrides in App Screens; the rest of App Screens follows when it takes this update): `brand-foreground` into `on-color`, `progress-done` into `seen`, `button-outline-border` into `input`, `switch-thumb-off` into `switch-thumb`. Color goes from 94 to 90 variables. The survivors' descriptions name what they took in. Nothing changes on screen: each pair had the same values in both modes.
- **Foundations · Color · Roles:** the four rows and their "Same as" chips removed; 89 roles. The page now says the remaining "Same as" roles are kept apart on purpose.
- **Ticket:** [Tokens: consolidate the ten color aliases](https://app.notion.com/p/4249e188029f815b9d22e6f8bbe2de96), Batch 29 (with `src/index.css` and the components).

Foundations reboot, the same release:


- **Foundations page:**
  - An index frame.
  - Color · Roles: 93 roles in 14 groups (89 after the merges above) by use, Light and Dark swatches bound to the variables, each role's token, aliases and use, and a "Same as" chip on the ten alias groups.
  - Color · Primitives by hue.
  - Type: each style with its desktop and phone sizes and its use.
  - Size steps: aliases resolved; the old frame showed "NaN" for four of them.
  - Spacing & radius, Elevation and Grid kept as they were.
- **Descriptions:** 108 written, so every variable has one.
- **Typeface collection:** the five headline pairing modes removed. Only "Live · Inter" is left; the removed modes' values are recorded on the archive page.
- **Archive:** a "--- Archive ---" divider page, and under it the Foundations explorations (Headline pairings, baked to literal fonts, and Theme test), the Foundations before the reboot, and the Titles picked character drafts.
- **Ticket:** [Foundations reboot](https://app.notion.com/p/4249e188029f81adbf94fba943c7b3f7).

## DS · 2026-11-25 · Two-line names (published twice)

- **Library:** a name too long for its box now takes up to two lines, then "…", in Character card (Desktop, Phone), Up next, Phone Up next, Thread stop, Cast row and Phone title row.
- **Char mark:** the Phone row size is now 13.5 px (text-caption at the phone root, 112.5%).
- **App Screens:**
  - Character pinned (desktop, phone; Light, Dark): Peter Parker stepped to "Your Friendly Neighborhood Spider-Man", 8 of 11.
  - Character card, Up next, Thread view, Details panel and all 38 Phone title rows moved to the published versions.
- **Ticket:** [Library: two-line names](https://app.notion.com/p/4239e188029f819d9460f8faa4335c9c). The code shipped in V5 Batch 27.

## DS · 2026-11-25 · Startup loader

- **Library:** the Startup loader component set (`234:716`, Bounce, drawn at rest) and its description: it ships as CSS keyframes.
- **App Screens:** the Startup screen frames (desktop, phone).
- **Ticket:** "Startup loader: a branded Lottie animation instead of the plain spinner" (V5 Batch 27).

## DS · 2026-11-24 · Char mark

- **Library:**
  - New component Char mark (`224:740`): Size (Row, Phone row, Card, Phone card, Selected card) × Faces 1–3, with a Name text property.
  - A Char mark switch on List row, Phone title row and Spatial card, plus a Year switch on Spatial card.
  - Spatial card `Release=coming` drops "Series".
- **App Screens:** Character pinned and Search open (desktop, phone) show the marker; 38 Phone title rows moved to the published version.
- **Tickets:** "Titles: show the picked character on each of their title rows" and "Connections cards: the Coming soon pill runs into a series card's right edge" (V5 Batch 26).

## DS · 2026-11-23 · Where it leads; guides after Batch 21

- **Library:** Guide destination and Phone guide destination ("Where it leads", the event guide's destination card); the guide components updated to the guides as they are after Batch 21.
- **App Screens:**
  - Guide page, Before Doomsday (the eight-stop event guide).
  - Thor's seven-stop guide.
  - The Infinity Stones and The Thanos arc cards matching the app.
- **Tickets:** "Library: Where it leads…", "Design System: guide components show the guides as they are after Batch 21", "App Screens: Thor's seven-stop guide", "App Screens: the eight-stop Before Doomsday guide", "App Screens: The Infinity Stones and The Thanos arc cards match the app" (Design; the repo records shipped in V5 Batch 27).

## DS · 2026-11-21 · Library states

- **Library:**
  - The states the app draws that the components didn't have yet: guides not followed, and the List row's Up next.
  - Complete variants of Guide card, Guide header and Phone guide header, and the Seen guide stops.
- **App Screens:** Guide page, Thor, complete (every stop seen).
- **Tickets:** "Library: the states the app draws that the components don't have yet", "Library states: a Complete state for the guide header…" (Design; the docs shipped in V5 Batch 21).

## DS · 2026-11-19 · Upkeep, Countdown, About dialog

- **Library:**
  - The Poster set (`100:696`, one variant per catalog title), nested in every poster slot.
  - Countdown promoted to a component (`104:701`), and a Countdown switch on the guide promos and guide headers.
  - A "Retired · not for new designs" section.
  - About dialog (`119:1765`) rebuilt from the live app, and the Welcome dialog retired.
  - Posters refreshed after the catalog audit.
- **App Screens:** posters through the Poster set everywhere.
- **Tickets:** "Figma library upkeep…", "Figma library: rebuild the Welcome and About dialogs…", "Catalog audit…" (V5 Batch 18).

## DS · 2026-11-18 · Translucent tokens, neutral canvas, Character card

- **Variables:**
  - Seven translucent color roles that carry their alpha: `popover-ring`, `border-soft`, `background-glass`, `on-image-veil`, `seen-foreground-soft`, `foreground-strong`, `muted-soft`.
  - The light canvas moved from `slate-97`/`slate-95` to `neutral-97` and the new `neutral-95`.
- **Library:** Character card (Desktop, Phone) replaced the Character banner and pill, which were retired.
- **App Screens:** Character pinned frames (desktop, phone), and the canvases' gradient.
- **Tickets:** "Library: translucent strokes and fills render solid outside the library", "The pinned character's card" (V5 Batch 17).

## DS · 2026-11-17 · The library finished, App Screens, grid, palette named

- **Library:** the components not built yet (Filters panel, Settings panel, search suggestions…), the phone components and the Spatial card's Ring.
- **Variables:**
  - The 49 colors the components mixed by hand became 30 named roles.
  - A Grid collection (Phone, Tablet, Desktop, Extra wide) and grid styles.
  - The Typeface collection with five headline pairings, an exploration (removed on 2026-11-25).
- **App Screens:** the file created ("Red Thread – Screens" then): the key desktop and phone screens, Light and Dark, built only from library instances.
- **Publishing:** the Design System moved to the AFR folder and published as a team library.
- **Tickets:** "Finish the Figma library", "A screens file built from library instances", "Define a layout grid", "Move the Design System file to the AFR folder and publish it as a team library", "Headline fonts: try stylish headline and body pairings" (V5 Batches 13 and 14).

## DS · 2026-11-17 · First library

- **Foundations:** the variables (Primitives, Color Light and Dark, Type, Radius & Spacing, Size steps), the effect styles for elevation, and the text styles.
- **Library:** the component library built from the running app with `tools/figma/`, a Cover, and Icons.
- **Tickets:** "Build the Figma foundations…", "Build the Red Thread component library in Figma", "Token cleanup before the Figma foundations", "Connect Figma to code and make Figma the source of truth" (V5 Batch 12).

## Before the library

- **V4 (2026-10-31 to 2026-11-01):** the design system lived in code: shadcn/ui on Base UI, Vega style, a design-system preview page, and V3's palette and type moved onto the tokens. There was no Figma library.
- **V5 setup (2026-11-14 to 2026-11-16):** the shadcn pass, then the first hi-fi explorations in Figma (Explore E, the guides pages) in the earlier explorations file `HFwjyn1zLiNJGSfGtSfrr3`, and the "Before (V4)" captures with audit notes (`iDkkTvrXqP08Kxrs3XMfVf`).
