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
| Spatial card (Seen × Release × Ring: None, Up next, Guide stop; rings are token-bound spread shadows standing in for the code's outlines) | `14:59` | `src/app/spatial-card.tsx` `SpatialCard`, `CardMark`, `CardText` |
| Score chip (IMDb, RT) | `24:25` | `src/app/list-parts.tsx` `ScoreChip` |
| Phase badge (1–6) | `24:44` | `list-parts.tsx` `PhaseBadge` |
| List row (Seen) | `16:61` | `src/app/desktop-list.tsx` (row), `status-actions.tsx` (buttons) |
| List header | `16:82` | `desktop-list.tsx` `DlSortHeader` |
| Phase header | `16:87` | `desktop-list.tsx` `GroupHeader` |
| Phone title row (Seen, Unseen, Up next) | `63:691` | `list-parts.tsx` (m-lrow) |
| Phone phase header | `63:642` | `desktop-list.tsx` `GroupHeader` (phone) |
| Phone Up next | `63:705` | `src/app/upnext.tsx` (phone card) |
| Logo / mark, Logo / wordmark | `17:2`, `17:3` | `src/assets/logo-mark.svg`, `logo-wordmark.svg` (CSS masks in the app) |
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
| Guide promo | `21:44` | `src/app/guides-ui.tsx` (Guides page hero) |
| Guide continue card | `21:67` | `guides-ui.tsx` (Continue shelf) |
| Guide card | `21:88` | `guides-ui.tsx` (guide shelves) |
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
| Character banner | `42:655` | `src/app/banners.tsx` `BANNER` (desktop) |
| Character pill | `43:656` | `banners.tsx` `PILL` (phones) |
| Thread stop | `44:632` | `title-details.tsx` `ThreadView` row (also the rows of `TrailView`) |
| Thread view | `44:650` | `title-details.tsx` `ThreadView` |
| Guide header | `45:701` | `guides-ui.tsx` (g-head) |
| Guide stop (Up next, Default) | `45:670` | `guides-ui.tsx` (g-stop) |
| Phone guide header | `64:666` | `guides-ui.tsx` (g-head, phones) |
| Phone guide stop (Up next, Default) | `64:704` | `guides-ui.tsx` (g-stop, phones) |
| Phone guide promo | `64:728` | `guides-ui.tsx` `GuidesHero` (phones) |
| Welcome dialog | `65:796` | `src/app/about.tsx` (Welcome / About) |

Icons: the Icons page, one component per entry in `tools/figma/icons.js`.

Foundations page: generated from the file's own variables and styles
(2026-11-17), so it lists exactly what exists: the 38 primitives, every
color role in Light and Dark over the page background, the text styles,
spacing and radius (bound bars and boxes), the effect styles, the size
steps and the grid. Regenerate it after adding or renaming tokens.

Grid: the **Grid** collection and the grid styles Grid/Columns, Grid/Reading 1128 and Grid/List 1488, with a specimen on the Foundations page (`55:631`). See `design-tokens.md`, "Grid".

## Screens

[**Red Thread – Screens**](https://www.figma.com/design/FBDC4AxFAi5gyABtpdJM8Z)
(same Figma folder) holds the key screens, built only from instances of the
published library, so they follow every library update. Each screen has a
Light and a Dark frame (the Dark one sets the Color collection to Dark).

| Screen | Light | Dark |
| --- | --- | --- |
| Titles (desktop) | `16:4664` | `16:5009` |
| Connections with a title open (desktop) | `16:6270` | `16:6661` |
| Guides (desktop) | `17:2384` | `17:2624` |
| Guide page, Thor (desktop) | `17:2641` | `17:2876` |
| Follow the thread (desktop) | `17:2888` | `17:3142` |
| Settings over Titles (desktop) | `16:5024` | `16:5152` |
| Search open (desktop) | `19:3906` | `19:4033` |
| Filters open (desktop) | `19:4050` | `19:4138` |
| What have you seen? (desktop) | `19:4155` | `19:4252` |
| Character pinned, Titles (desktop) | `19:4270` | `19:4565` |
| Titles (phone) | `17:4759` | `17:4964` |
| Details sheet over Titles (phone) | `17:4952` | `17:5267` |

Posters are the app's TMDB posters, on the file's Posters page. The
screens override only content (text, posters), the view switch, phase
colors and unseen states; every other paint comes from the library, so
don't copy fills or opacities onto instances (a copied fill stops taking
library updates). The canvas
lines on Connections are drawn by hand (the app computes them).

## Not in the library yet

Built from the app as it was on 2026-11-17; these still need a Figma
counterpart (same tools, `tools/figma/README.md`):

- the phone Grid card and canvas pop card, the cast sheet on phones;
- a character's trail header (its rows are Thread stops),
  the share sheet, toasts and the celebration;
- a seen Guide stop and a skipped one;
- hover, focus and pressed states (rest states only today).

## Known gaps

- **Translucent colors in other files.** A paint bound to a variable takes
  its opacity from the variable's own alpha in any file that uses the
  library; a hand-set paint opacity survives only inside the library. So a
  translucent color must be a token that carries its alpha (`seen-tint`,
  `brand-tint` …), with the paint's opacity equal to that alpha. These still
  use a solid token plus opacity and show solid in the Screens file:
  `background` 94–95% (app bar, guide shelves), `foreground` 10% (popover
  rings), 85%; `border` 70%; `muted` 50%; `muted-foreground` 30%, 80%;
  `on-image-base` 78%; `seen-foreground` 85%, 90%. They come from Tailwind
  opacity modifiers in the code (`bg-background/95`, `ring-foreground/10`).

- **Colors without a token** keep their light value in Figma, so those
  spots don't switch in Dark: the seen button's border, overlays on
  posters, the tints still waiting for the merge decision (Notion "Name the
  mixed colors"). The score chips, dimmed text, Watchlist ink and zoom
  control are bound since 2026-11-17.
- **Data colors** stay raw on purpose: a character's color, a guide's color,
  a poster's own color (`docs/design-tokens.md`, "Not variables, on purpose").
- **Sizes** are the desktop Default text size (phone components: the phone's
  Default, 112.5%).
