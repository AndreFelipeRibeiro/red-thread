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
| Spatial card (Seen × Release) | `14:59` | `src/app/spatial-card.tsx` `SpatialCard`, `CardMark`, `CardText` |
| Score chip (IMDb, RT) | `24:25` | `src/app/list-parts.tsx` `ScoreChip` |
| Phase badge (1–6) | `24:44` | `list-parts.tsx` `PhaseBadge` |
| List row (Seen) | `16:61` | `src/app/desktop-list.tsx` (row), `status-actions.tsx` (buttons) |
| List header | `16:82` | `desktop-list.tsx` `DlSortHeader` |
| Phase header | `16:87` | `desktop-list.tsx` `GroupHeader` |
| Phone list row | `22:64` | `list-parts.tsx` (phone List row) |
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

Icons: the Icons page, one component per entry in `tools/figma/icons.js`.

## Not in the library yet

Built from the app as it was on 2026-11-17; these still need a Figma
counterpart (same tools, `tools/figma/README.md`):

- the phone top bar and filter sheet, the phone Grid card and canvas pop
  card, the cast and details sheets on phones;
- the Settings panel, About dialog, account menu, Sort and Filters popovers,
  search suggestions, the character pill and banner, the thread view (Follow
  the thread's list) and a character's trail, the guide page and its stops,
  share sheet, toasts and celebration;
- hover, focus and pressed states (rest states only today).

## Known gaps

- **Colors without a token** (76 paints in the file) keep their light value
  in Figma, so those spots don't switch in Dark: the score chip's surface and
  number, the dimmed text (`color-mix(foreground 40%, muted-foreground)`),
  the seen button's border, the Watchlist count's ink, overlays on posters.
  Notion "Name the mixed colors" turns them into tokens.
- **Data colors** stay raw on purpose: a character's color, a guide's color,
  a poster's own color (`docs/design-tokens.md`, "Not variables, on purpose").
- **Sizes** are the desktop Default text size (phone components: the phone's
  Default, 112.5%).
