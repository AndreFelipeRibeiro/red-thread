# Figma library → code

Every component in the [**Red Thread – Design System**](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P)
file and the code that draws it (Notion "Build the Red Thread component
library in Figma" and "Connect Figma to code and make Figma the source of
truth"). This page is the link between the two: Figma's Code Connect, which
would carry it inside Figma, needs an Organization plan (the AFR team is on
Pro), so the map lives here and in each component's description, which names
its file.

Read a component with the Figma MCP from its link (`get_design_context`,
`get_screenshot`, `get_metadata`); find its code here. Variables and styles
are in [design-tokens.md](design-tokens.md).

Published as a team library in the AFR folder (2026-11-17). Library key,
for scoping MCP searches (`search_design_system` `includeLibraryKeys`):
`lk-5749d6357a7c79740c5ccbfab85d638b1dde13ff537b2ef534703dfdf08d47d9c5ea5275930be18c258ae5bcbeef726e3599f4ecd88083be9c12f2d19cfaf6a2`.
Only published components import into other files, so publish again after
adding or changing components.

Links: `https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P?node-id=<id>`
(the node ids below with `:` written as `-`).

## Primitives (shadcn on Base UI)

Only the ones the app uses. Card, Checkbox, Dialog, Dropdown menu, Scroll
area, Sheet, Tabs, Toggle and Tooltip are in `src/components/ui` but no
surface uses them, so they have no Figma counterpart until one does.

| Figma | Node | Code | Variants and properties |
| --- | --- | --- | --- |
| Button | `11:243` | `src/components/ui/button.tsx` `<Button>` | Variant (default, outline, secondary, ghost, destructive, link) × Size (xs, sm, default, lg); Label; Icon (on/off) and Icon glyph (swap) |
| Icon button | `11:308` | `button.tsx` `<Button size="icon…">` | Variant (default, outline, secondary, ghost) × Size (icon-xs, icon-sm, icon, icon-lg); Icon glyph |
| Badge | `12:36` | `src/components/ui/badge.tsx` | Variant (6); Label |
| Input | `12:49` | `src/components/ui/input.tsx` | State (placeholder, filled, disabled, invalid) |
| Label | `12:52` | `src/components/ui/label.tsx` | |
| Switch | `12:65` | `src/components/ui/switch.tsx` | Size (default, sm) × Checked |
| Radio | `12:71` | `src/components/ui/radio-group.tsx` `<RadioGroupItem>` | Checked |
| Select trigger | `12:82` | `src/components/ui/select.tsx` `<SelectTrigger>` | Size (default, sm); Value |
| Select content | `12:92` | `select.tsx` `<SelectContent>` + `<SelectItem>` | |
| Popover content | `12:97` | `src/components/ui/popover.tsx` | |
| Separator | `12:99` | `src/components/ui/separator.tsx` | |

## Red Thread

| Figma | Node | Code |
| --- | --- | --- |
| Spatial card (Seen × Release × Ring: None, Up next, Guide stop, Selected (2026-11-27: the selected title at its own size, phase-color border, ring and glow; the app draws no enlarged copy); rings are token-bound spread shadows standing in for the code's outlines; Char mark and Year switches: a picked or searched character's Char mark takes the year line's place, so the card keeps its height, V5 Batch 26) | `14:59` | `src/app/spatial-card.tsx` `SpatialCard`, `CardMark`, `CardText` |
| Score chip (IMDb, RT) | `24:25` | `src/app/list-parts.tsx` `ScoreChip` |
| Phase badge (1–6) | `24:44` | `list-parts.tsx` `PhaseBadge` |
| Poster (Title: one variant per catalog title id, 64; on the Posters page, 168 × 252, live TMDB posters at w500 over the poster's own color, checked 2026-11-19) | `100:696` | `src/app/poster.tsx` `PosterArt`; paths in `src/data/media-data.ts` |
| List row (Seen × Up next; Up next is the row with the brand tint and the Up next pill; a Char mark switch shows the Char mark under the caption, V5 Batch 26) | `16:61` | `src/app/desktop-list.tsx` (row), `status-actions.tsx` (buttons) |
| List header | `16:82` | `desktop-list.tsx` `DlSortHeader` |
| Phase header | `16:87` | `desktop-list.tsx` `GroupHeader` |
| Phone title row (Seen, Unseen, Up next; a Char mark switch, as on the List row) | `63:691` | `list-parts.tsx` (m-lrow) |
| Char mark (Size: Row, Phone row, Card, Phone card, Selected card × Faces: 1, 2, 3): a picked or searched character's overlapping portraits and name, quiet, under a title (V5 Batch 26, Notion "Titles: show the picked character on each of their title rows") | `224:740` | `src/app/list-parts.tsx` `CharMark` |
| Phone phase header | `63:642` | `desktop-list.tsx` `GroupHeader` (phone) |
| Phone Up next | `63:705` | `src/app/upnext.tsx` (phone card) |
| Logo / mark, Logo / wordmark | `17:2`, `17:3` | `src/assets/logo-mark.svg`, `logo-wordmark.svg` (CSS masks in the app) |
| Startup loader (Motion: Bounce, the pin at rest in the animation's 78 px box; Reduced, the still pin and the ring). The bounce itself is designed in LottieFiles Creator ("Red Thread loader – Bounce") and shipped as CSS keyframes, not drawn here. No `components.json` entry: the app replaces the startup screen before the check can capture it; `qa/test-boot.js` checks it instead | `234:716` | `index.html` `#mcu-boot`, `boot.js`, `src/index.css` (`boot-bounce`, `boot-ripple-*`) |
| App bar | `17:57` | `src/app/toolbar.tsx` `Toolbar`, `header-controls.tsx` (`StatusCounts`, `SortMenu`, `PickerButton`) |
| Zoom control | `20:32` | `src/app/spatial-chrome.tsx` `ZoomControl` |
| Title count | `20:35` | `spatial-chrome.tsx` `ContextSummary` |
| Band label | `20:38` | `spatial-chrome.tsx` `BandLabel` |
| Phone nav bar | `22:42` | `src/app/phone-header.tsx` `MobileNavBar` |
| Details panel | `19:104` | `src/app/title-details.tsx` `DrawerFrame`, `TitleDetailsBody` |
| Status actions | `19:24` | `src/app/status-actions.tsx` `TitleStatusActions` (inline) |
| Cast row | `19:14` | `title-details.tsx` `CastConnections` |
| Follow the thread | `19:29` | `title-details.tsx` `FollowThreadButton` |
| Up next | `20:51` | `src/app/upnext.tsx` |
| Guide promo (State: Following, Not started, Complete: the lead-up hero once the guide is complete, the release in the big slot) | `147:698` | `src/app/guides-ui.tsx` (Guides page hero) |
| Countdown (State: In progress, Complete × Moment: Counting, Release day; Days on/off): the guide countdown in the guide header and the Guides hero | `104:701` | `src/app/countdown.tsx` `GuideTicker` |
| Guide continue card | `21:67` | `guides-ui.tsx` (Continue shelf) |
| Guide card (State: Following, Not followed, Complete) | `147:696` | `guides-ui.tsx` (guide shelves) |
| Picker poster (Seen) | `23:13` | `src/app/picker.tsx` |
| Picker dialog | `23:43` | `picker.tsx` |
| Phone app bar | `34:662` | `src/app/phone-header.tsx` `MobileTopBar` |
| Sort menu | `38:699` | `src/app/header-controls.tsx` `SortMenu` (desktop popover) |
| Account menu | `38:729` | `src/app/account.tsx` `AccountPanel` |
| Filters panel | `38:797` | `header-controls.tsx` `FiltersPanel` (desktop popover) |
| Menu switch | `36:667` | `header-controls.tsx` `MenuSwitch` |
| Filter chip | `36:675` | `phone-header.tsx` `ChipGroup` |
| Filter sheet | `36:705` | `phone-header.tsx` `FilterSheet` |
| Details sheet | `37:801` | `title-details.tsx` `SheetFrame` + `TitleDetailsBody` (phones) |
| Settings panel | `40:810` | `src/app/settings.tsx` `SettingsPanel` (the phone sheet shows the same content) |
| Search suggestion (Kind × State) | `41:759` | `src/app/search-suggest.tsx` (one row) |
| Search suggestions | `41:773` | `search-suggest.tsx` (the list) |
| Character card (Device = Desktop, Phone) | `81:729` | `src/app/char-card.tsx` `CharCard` (the pinned character's floating card; B.WIDGET, B.W_* in `banners.tsx`) |
| Retired / Character banner, Retired / Character pill | `42:655`, `43:656` | Replaced by the Character card (2026-11-18); kept until the Screens file no longer uses them |
| Thread stop | `44:632` | `title-details.tsx` `ThreadView` row (also the rows of `TrailView`) |
| Thread view | `44:650` | `title-details.tsx` `ThreadView` |
| Guide header (State: In progress, Complete) | `172:774` | `guides-ui.tsx` (g-head) |
| Guide stop (Up next, Default, Seen) | `45:670` | `guides-ui.tsx` (g-stop) |
| Phone guide header (State: In progress, Complete) | `172:1009` | `guides-ui.tsx` (g-head, phones) |
| Guide destination (State: Watchlist off, On Watchlist; "Where it leads", an event guide's right column) | `192:1614` | `guides-ui.tsx` `GuideDest` |
| Phone guide destination (State: Watchlist off, On Watchlist; "Then: …" after the stops) | `192:1629` | `guides-ui.tsx` `GuideDest` (phones) |
| Phone guide stop (Up next, Default, Seen) | `64:704` | `guides-ui.tsx` (g-stop, phones) |
| Phone guide promo (State: Not started, Complete: every stop a small seen poster) | `167:815` | `guides-ui.tsx` `GuidesHero` (phones) |
| About dialog (Kind: Welcome, About × Device: Desktop, Phone; the guide offer's poster is a nested Poster) | `119:1765` | `src/app/about.tsx` `AboutContent` in `ModalDialog` (desktop) or `Sheet` (phones) |
| Retired: Welcome dialog (2026-11-19, replaced by About dialog) | `65:796` | — |

Icons: the Icons page, one component per entry in `tools/figma/icons.js`.

Foundations page: generated from the file's own variables and styles
(2026-11-17), so it lists exactly what exists: the 38 primitives, every
color role in Light and Dark over the page background, the text styles,
spacing and radius (bound bars and boxes), the effect styles, the size
steps and the grid. Regenerate it after adding or renaming tokens.

Grid: the **Grid** collection and the grid styles Grid/Columns, Grid/Reading 1128 and Grid/List 1488, with a specimen on the Foundations page (`55:631`). See `design-tokens.md`, "Grid".

## Screens

[**Red Thread – App Screens**](https://www.figma.com/design/FBDC4AxFAi5gyABtpdJM8Z)
(same Figma folder) holds the key screens, built only from instances of the
published library, so they follow every library update. Each screen has a
Light and a Dark frame (the Dark one sets the Color collection to Dark).

| Screen | Light | Dark |
| --- | --- | --- |
| Titles (desktop) | `16:4664` | `16:5009` |
| Connections with a title open (desktop) | `16:6270` | `16:6661` |
| Guides (desktop) | `17:2384` | `17:2624` |
| Guide page, Thor (desktop) | `17:2641` | `17:2876` |
| Guide page, Thor, complete (desktop; every stop seen) | `77:7009` | `77:7439` |
| Guide page, Before Doomsday (desktop; event guide, 7 of 8, Where it leads on the right) | `82:7456` | `97:7866` |
| Follow the thread (desktop) | `17:2888` | `17:3142` |
| Settings over Titles (desktop) | `16:5024` | `16:5152` |
| Search open (desktop) | `19:3906` | `19:4033` |
| Filters open (desktop) | `19:4050` | `19:4138` |
| What have you seen? (desktop) | `19:4155` | `19:4252` |
| Character pinned, Titles (desktop): the Character card top right | `19:4270` | `19:4565` |
| Startup screen (desktop): the Startup loader (Bounce, drawn at rest) and "Loading…" | `114:9580` | `114:9595` |
| Titles (phone) | `17:4759` | `17:4964` |
| Details sheet over Titles (phone) | `17:4952` | `17:5267` |
| Character pinned, Titles (phone): their titles, the card docked | `33:7655` | `33:7876` |
| Startup screen (phone) | `114:9605` | `114:9615` |

Posters are the app's TMDB posters: the library's **Poster** component set
(`100:696`, Posters page) has one per catalog title, so a screen or an
exploration file swaps an instance's Title instead of pasting an image.
Every poster slot in the library's components (Spatial card, rows, guide
stops, promos and cards, details, thread, search, picker, Up next) holds a
nested Poster instance, exposed, so a screen picks the title from the
instance's properties; never paste an image over a slot (2026-11-19). Add a
variant in the same change as a new title or a changed poster path. The
screens override only content (text, posters), the view switch, phase
colors and unseen states; every other paint comes from the library, so
don't copy fills or opacities onto instances (a copied fill stops taking
library updates). The canvas
lines on Connections are drawn by hand (the app computes them). The
canvas frames of Connections and Follow the thread carry the app's
top-to-bottom gradient, its stops bound to `canvas-top` and `canvas-bottom`
(2026-11-18). The Character card's photo badge keeps the component's
placeholder ring: the file has no portrait images yet.

## Checking it against the app

"Check components against the app" compares the components listed in
`tools/figma/components.json` with the elements that draw them, and the
Screens frames with the app (`tools/figma/screens.json`): the
`figma-components` skill. Add a row there when a component gets a place the
check can reach.

## Upkeep

The rules are the `promote-design` skill (`.claude/skills/promote-design/SKILL.md`). How to apply them:

- **Posters:** every poster slot (`art` or `poster` in a component) holds a
  nested, exposed instance of the Poster set (`100:696`). In a screen, select
  the card and pick the title under its Poster property. A new title, or a
  changed poster path in `src/data/media-data.ts`, updates its variant (the
  w500 image, its description's path, the poster color under the image), and
  every file that uses it follows on the next library update.
- **Promoting a design:** build it from the library's variables and styles,
  give it a description naming its code file, and put its behavior in Dev
  Mode annotations. Add its row here. If it is a state of an existing
  component, make it a variant or a property: the guide countdown is a
  nested, exposed Countdown with a **Countdown** switch in Guide promo,
  Phone guide promo, Guide header and Phone guide header. After Andre
  publishes, accept the update in App Screens and swap the hand-drawn parts
  of each affected screen for instances.
- **Progress bars in instances:** an instance can't resize a layer, so the
  In progress Guide header and Phone guide header set their bar with the
  track's right padding: padding = track width × (1 − seen ÷ total), 25 for
  7 of 8 on the desktop's 200 track (since 2026-11-22).
- **Checking a publish:** the Plugin API's `getPublishStatusAsync()` on a
  component reads Current, Changed or Unpublished. Changed or Unpublished
  after a publish means it did not go out. Other files are not updated
  automatically: each one shows "Updates" and takes them with Update all,
  with "Show updates for all pages" turned on. Close and reopen a file that
  was open during the publish first: a tab opened before it can apply its
  older copy of the library on Update all (2026-11-19, the Spatial cards in
  App Screens lost their posters that way).
- **Retired:** a gray section at the bottom of the page, "Retired · not for
  new designs". Today it holds the Character banner and Character pill
  (Lists & meters), both replaced by the Character card on 2026-11-18, and
  the old Welcome dialog (Dialogs & sheets), replaced by About dialog on
  2026-11-19. Shipped proposals go to an "Archive · shipped proposals"
  section beside it.
- **Releases and history** (2026-11-25): every publish is a named release,
  logged on the **Changelog** page of the Design System (`255:647`) and of App
  Screens (`126:9547`) and in [design-system-changelog.md](design-system-changelog.md),
  with the history back to the first library ([WORKFLOW.md](WORKFLOW.md),
  "Design system releases"). Both files keep archived pages below a
  "--- Archive ---" divider: in the Design System, "Archive · Foundations
  explorations · 2026-11-25" (Headline pairings, Theme test), "Archive ·
  Foundations before reboot · 2026-11-25" and "Archive · Titles picked
  character · approved 2026-11-24".
- **Fill overrides in App Screens:** an instance should take its component's
  fill. A fill override bound to a token at a hand-set opacity looks right
  until the next publish, then renders solid (2026-11-25, the Titles Up next
  row). After accepting an update, scan for instances whose root fill differs
  from their component's; the Dark-mode translucent tokens differ on purpose,
  since their opacity comes from the token.
- **Archiving explorations:** in the Explorations file, save a named version
  ("Countdown approved 2026-11-19"), rename the pages "Archive · <topic> ·
  approved <date>" and move them below an Archive divider page, with a note
  naming the chosen frames, the ticket and the library component. Node ids
  don't change, so ticket links keep working.

## Not in the library yet

Built from the app as it was on 2026-11-17; these still need a Figma
counterpart (same tools, `tools/figma/README.md`):

- the phone Grid card and canvas pop card, the cast sheet on phones;
- a character's trail header (its rows are Thread stops),
  the share sheet, toasts and the celebration;
- a skipped Guide stop (the seen one is State=Seen since 2026-11-21);
- hover, focus and pressed states (rest states only today).

## Known gaps

- **Translucent colors in other files.** A paint bound to a variable takes
  its opacity from the variable's own alpha in any file that uses the
  library; a hand-set paint opacity survives only inside the library. So a
  translucent color is a token that carries its alpha, with the paint's
  opacity equal to that alpha (`seen-tint`, `brand-tint`, and since
  2026-11-18 `popover-ring`, `border-soft`, `background-glass`,
  `seen-foreground-soft`, `foreground-strong`,
  `muted-soft`, and since 2026-11-22 `muted-foreground-soft`;
  `docs/design-tokens.md`). Published and checked in Screens
  on 2026-11-18: the popover and dialog outlines resolve to 10%. Left: the
  tokens whose alpha differs by mode, where one paint opacity can't match
  both and the token's own alpha applies in other files, which is right:
  `destructive-tint` (10% / 20%), `field` (0% / 5%; still to check against
  the code) and `border-soft` (70% / 7%).

- **Colors without a token** keep their light value in Figma, so those
  spots don't switch in Dark: the seen button's border, overlays on
  posters, the tints still waiting for the merge decision (Notion "Name the
  mixed colors"). The score chips, dimmed text, Watchlist ink and zoom
  control are bound since 2026-11-17.
- **Data colors** stay raw on purpose: a character's color, a guide's color,
  a poster's own color (`docs/design-tokens.md`, "Not variables, on purpose").
- **Sizes** are the desktop Default text size (phone components: the phone's
  Default, 112.5%).
