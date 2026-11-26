# Design tokens → Figma variables

The map the Figma foundations are built from (Notion "Build the Figma
foundations: color, type, radius, spacing and shadow variables"). The values
live in one place, `src/index.css`; this file says what each token becomes in
the [**Red Thread – Design System**](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P)
Figma file (AFR team; its Foundations page holds a Light/Dark test), so building the foundations is
a transcription and a later change can be checked both ways. Written with
Notion "Token cleanup before the Figma foundations" (2026-11-16), which first
removed the tokens nothing used and named every shadow and stray color.

## Naming

- **A Figma variable is named exactly like its token, without the `--`**:
  `--background` is `background`, `--phase-3` is `phase-3`,
  `--elevation-card` is `elevation-card`. No renaming, no slash paths that the
  code doesn't have, so an agent reading a frame finds the token by name.
- **Every variable's code syntax (Web) is the CSS variable**:
  `var(--background)`. That is what Dev Mode and the Figma MCP hand an agent.
- **Collections group them** (below), and each collection's modes match the
  code's: `Light` and `Dark` for color and elevation, one mode for the rest.
- Tailwind's aliases (`--color-*`, `--shadow-*`, `--text-*` and `--radius-*`
  in `@theme inline`) are how utilities reach the tokens. They are **not**
  separate variables: `bg-card` is the `card` variable.

## Collections

### Primitives (one mode: Value)

The `@primitives` block at the top of `src/index.css`: every color in the
app, named by hue family and OKLCH lightness × 100 (`red-55` is L 0.55;
`-aNN` is that color at NN% opacity): `neutral-*`, `slate-*`, `red-*`
(three: `red-50`, `red-55`, `red-68`), `rose-*`, `crimson-53`, `tomato-*`,
`yellow-84`, `gold-*`, `green-*`, `blue-*`, `purple-*`; 37 in all (the
2026-11-17 merges folded `red-70`, `red-58`, `red-52` and `coral-68` into
their neighbors; on 2026-11-18 the light canvas moved from `slate-97` and
`slate-95`, a faint blue, to `neutral-97` and the new `neutral-95`, and the
slate pair was retired). In Figma they're hidden from the pickers
(no scopes): designers pick the semantic colors below. Components never use a
primitive directly, in code or in Figma.

### Color (modes: Light, Dark)

The `:root` block is Light, `.dark` is Dark. Every value is an alias of a
primitive (or of another color token: `progress` and `ring` are `brand`,
the Dark canvas is `background`); only
`canvas-dot`, which mixes a color with transparency in
code, hold computed values per mode. `thread-rest` (the resting threads'
opacity, 42% / 55%) lives here too, as a number.

| Group | Tokens |
| --- | --- |
| Surfaces and text | `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `border`, `input` |
| Accent (red) | `brand`, `primary`, `primary-foreground`, `ring`, `destructive`, `logo` |
| Progress | `progress` (the track still ahead is `brand-tint-strong`; complete progress is `seen`) |
| Collection status | `seen`, `seen-foreground`, `seen-text`, `status-watch`, `on-color` (ink on any solid color fill: phase, Watchlist, brand) |
| Phases | `phase-1` … `phase-6` |
| On artwork (same in both modes) | `on-image`, `on-image-dim`, `on-image-muted`, `on-image-ground`, `on-image-base` |
| Score marks (same in both modes) | `imdb`, `rt`, `rt-text` |
| Connections canvas | `canvas-top`, `canvas-bottom` (Light: `neutral-97` to `neutral-95`), `canvas-dot` |
| Controls (shadcn at rest) | `field`, `button-outline`, `destructive-tint`, `switch-track`, `switch-thumb`, `invalid-border`, `invalid-ring` |
| Mixed roles | `dim`, `brand-tint`, `brand-tint-strong`, `seen-tint`, `seen-tint-strong`, `neutral-tint`, `veil`, `veil-light`, `border-strong`, `seen-border`, `seen-line`, `brand-border`, `status-watch-border`, `destructive-border`, `field-hover`, `segment-on`, `brand-text`, `status-watch-text`, `status-watch-tint`, `status-watch-tint-strong`, `seen-hover`, `secondary-hover`, `guide-current`, `highlight-border`, `control-surface`, `chip`, `chip-imdb`, `chip-rt`, `chip-muted` |

**Translucent colors** (2026-11-18, Notion "Library: translucent strokes
and fills render solid outside the library"): a paint bound to a variable
keeps only the variable's own alpha in other Figma files, so a color the
code writes as a token at an opacity (a Tailwind modifier) is a Figma color
token carrying that alpha, per mode: `popover-ring` (`ring-foreground/10`),
`border-soft` (`border-border/70`; 7% in Dark, 70% of its 10%),
`background-glass` (`bg-background/95`, the floating cards over the Connections
canvas that cards can pan under; the app bars and band labels are solid
`background` since 2026-11-26, because nothing scrolls under them),
`seen-foreground-soft`
(`seen-foreground` at 90%), `foreground-strong` (`foreground` at 85%) and
`muted-soft` (`muted` at 50%), and since 2026-11-22 `muted-foreground-soft`
(`muted-foreground` at 60%, the Guide destination poster's dashed border). The
code keeps the modifiers; these exist so
the Screens file renders them as the app does.

**Controls** (2026-11-17, Notion "Build the Red Thread component library in
Figma"): shadcn writes some resting colors as a token in Light and another
token at an opacity in Dark (`bg-transparent dark:bg-input/30`). One Figma
variable can't follow a class like that, so those colors are tokens with a
value per theme, the same colors as the classes gave (checked element by
element in both themes). Aliases where a theme's value is a token; computed
values where it is a mix, as for `destructive-tint`. Hover, focus and pressed
states stay classes.

`progress`, `ring` and the Dark canvas
values point at other tokens in code; in Figma they are aliases of those
variables, not copies.

**Same values, kept apart** (Andre, 2026-11-26, Notion "Tokens: consolidate
the ten color aliases"): ten groups of roles had the same Light and Dark
values. Four were duplicates and are merged: `brand-foreground` into
`on-color`, `progress-done` into `seen`, `button-outline-border` into
`input` (the outline button's edge is the fields' edge in both themes), and
`switch-thumb-off` into `switch-thumb` (one thumb color, on or off). A
second pass the same day merged three near-duplicates, each approved on a
side-by-side: `progress-track` (brand at 22%) into `brand-tint-strong` (20%),
`on-image-veil` (`on-image-base` at 78%, the connections count on a card's
poster) into `on-image-ground` (82%), and `chip-border` into `input` (Dark
went from 14% to 15% white). The
rest stay separate on purpose: shadcn's own roles (`card` and `popover`;
`secondary`, `muted` and `accent`; the foregrounds), which its components
reference; and ideas that only match today (`phase-1` and `status-watch`;
`brand`, `progress`, `destructive` and `ring`). Don't merge those in passing.

### Elevation (modes: Light, Dark) → effect styles

Figma variables can't hold a shadow, so these are **effect styles** named
like the tokens (`elevation-card`). Where the value differs by theme there is
one per theme, in `Light/` and `Dark/` folders (`Light/elevation-card`,
`Dark/elevation-card`); each style's description names its utility and token.

| Token | Role | Differs by mode |
| --- | --- | --- |
| `elevation-mark` | a check or badge on a small poster | no |
| `elevation-mark-lg` | a mark on a canvas card | no |
| `elevation-card` | a card at rest | yes |
| `elevation-card-hover` | the same, hovered | yes |
| `elevation-float` | a panel floating over the canvas | yes |
| `elevation-pop` | posters standing out of a band | no |
| `elevation-lift` | a card lifted off the canvas | no |

The shadcn components keep Tailwind's own `shadow-xs`, `shadow-sm`,
`shadow-md` and `shadow-lg`; they are effect styles `tailwind/shadow-xs` …
`tailwind/shadow-lg` with Tailwind's values. Dark `elevation-card` has the
same value as `shadow-sm`. It stays written out in `src/index.css`, because
Tailwind doesn't expose `--shadow-sm` at runtime: its utilities inline the
value, so `var(--shadow-sm)` would be empty. Use the named shadows
(`shadow-mark` and the rest), never a raw `shadow-[…]` for a shadow one of
them already gives (2026-11-26, Notion "Tokens: second consolidation pass").

### Type (one mode) → number variables + text styles

- Sizes: `fs-display`, `fs-display-sm` (28px, the welcome's heading), `fs-title`, `fs-heading`, `fs-body`, `fs-label`,
  `fs-caption`, `fs-numeral`, `fs-ticker` (the guide countdown, 30px; rem in code, px in Figma at the default text
  size; phones use the smaller display and body sizes declared beside them).
- The Type collection has two modes, **Desktop** and **Phone**: phones use
  14px body, 24px display and a 56px countdown; the guide countdown
  (`fs-ticker`) stays 30px on both (1.6875rem at the phone root). `font-sans` (Inter) and
  `font-display` (the poster fallback's initials only) are string
  variables. Every headline in the live app is Inter.
- **Typeface** collection (Notion "Headline fonts: try stylish headline and
  body pairings"): `headline-family` and `headline-style` (text-display,
  text-title, other 20px+ titles, and every title's name: List and phone
  rows, phase headings, Spatial cards, Up next, guide and thread stops),
  `headline-medium` (the same, for names drawn in Inter Medium), `body-family`
  and `body-regular`, `-medium`, `-semibold`, `-bold` (everything else). One
  mode, **Live · Inter**. The text styles and the components' text bind to
  these. The five headline pairings it used to hold as modes (Instrument
  Serif + Inter, Fraunces + Instrument Sans, Playfair Display + Source Sans 3,
  DM Serif Display + DM Sans, Bodoni Moda + Manrope) were archived on
  2026-11-25 (Notion "Foundations reboot"): the Design System's page "Archive ·
  Foundations explorations · 2026-11-25" keeps the Headline pairings frame,
  baked to literal fonts, and each mode's values. In the app, the dev-only
  Theme lab (`?lab`) still offers the same faces on the same places, each
  scaled by a measured size step (`DISPLAY_ADJUST` in
  `src/app/theme-lab.tsx`; Instrument Serif 1.24×).
- **Text styles**, one per type role, named like the utility: `text-display`,
  `text-display-sm` (added 2026-11-21 with its `fs-display-sm` variable),
  `text-title`, `text-heading`, `text-body`, `text-label`, `text-caption`,
  each with its line height from `@theme inline`, its size bound to the
  `fs-*` variable and its family and weight to the Typeface collection. The code sets weight per use,
  not per role; the styles take the weight each role mostly has (Semi Bold
  for display, title and heading; Regular for body, label and caption).
- Art sizes stay fixed px and are text styles in an `art/` folder:
  `text-card-title` (`-lg`, `-pop`, `-ov`), `text-card-meta` (`-lg`, `-pop`),
  `text-card-micro`, `text-tag`, `text-numeral`, `text-numeral-word`,
  `text-ticker` (the guide countdown's numbers and release-day line, size
  bound to `fs-ticker`) and `text-ticker-unit` (the unit after each number,
  0.5 × `fs-ticker`).

### Radius, spacing and sizes (one mode)

- `radius` (0.625rem), and the scale derived from it: `radius-xs` (4px,
  since 2026-11-26), `radius-sm`, `radius-md`, `radius-lg`, `radius-xl`,
  `radius-2xl`, `radius-3xl`, `radius-4xl` (as Figma variables with the
  computed px; 2xl and 3xl are unused today).
- **Corners use the named sizes, never a one-off `rounded-[Npx]`**
  (2026-11-26, Notion "Tokens: second consolidation pass"; Andre approved
  each step on a side-by-side): 14px is `rounded-xl`, 10px `rounded-lg`, 7px
  `rounded-md`, and 5, 4 and 3px `rounded-xs`; a pill or circle is
  `rounded-full`. The named sizes are rem-based, so they follow the text
  size: at the phone's Default (112.5%) `rounded-lg` is 11.25px, which is
  fine (Andre). Left as px: the 1 and 2px radii of thin bars and marks.
  Phone components in Figma are drawn at 112.5%, so their radii are the
  scaled values (4.5, 9, 11.25, 15.75) and aren't bound to the one-mode
  radius variables; desktop components bind them.
- `spacing`, the 4px unit every padding and gap multiplies, plus Figma-only
  steps for binding (`spacing-0_5` … `spacing-16`; a dot can't go in a Figma
  name) whose code syntax is the real expression, `calc(var(--spacing) * 2.5)`.
- The radius steps' code syntax is their expression too
  (`calc(var(--radius) * 0.6)`): Tailwind inlines them, so no `--radius-sm`
  exists at run time.
- The desktop size steps, a collection of their own (**Size steps**) with modes `Regular` and
  `Large`: `step-gap`, `step-poster-w`, `step-poster-h`, `step-row-h`,
  `step-head-h`, `step-title`, `step-meta`, `step-figure`, `step-group`,
  `step-group-pt`, `step-chip-h`, `step-control-h`, `step-button`,
  `step-icon`.

### Grid (modes: Phone, Tablet, Desktop, Extra wide)

The layout grid (Notion "Define a layout grid", 2026-11-17). In code, CSS
variables in `src/index.css` that change with the window; in Figma, the
**Grid** collection, one mode per range.

| Range | Mode | `grid-columns` | `grid-gutter` | `grid-margin` |
| --- | --- | --- | --- | --- |
| below 600 | Phone | 4 | 16 | 16 |
| 600–899 | Tablet | 8 | 24 | 24 |
| 900–1599 | Desktop | 12 | 24 | 24 |
| 1600 and up | Extra wide | 12 | 24 | 32 |

- `content-max` 1128: reading pages (Guides, a guide). 12 columns of 72;
  a Guide card spans 3 (264), a Continue card 6 (552).
- `list-max` 1488: lists (Titles). 12 columns of 102.
- Breakpoints, named once in `@theme`: `tab` 600, `desk` 900, `wide` 1280,
  `xwide` 1600 (`wide:in-[.app.drawer-open]:…`). Older one-off widths
  (1000, 1100, 1560 …) stay where a component needs them.
- `layout-grid`: a 12-column row (`grid-template-columns` from
  `--grid-columns`, gap `--grid-gutter`); place children with `col-span-*`.
- The details drawer (380, 440 from 1600) sits outside the grid; the grid
  fills the room to its left. The Connections canvas is free-form, and the
  cards that float over a view (Up next, the title count, zoom) keep their
  own 16px inset on Connections and Titles alike.
- Figma grid styles: **Grid/Columns** (bound to the three variables, so it
  follows the frame's Grid mode), **Grid/Reading 1128**, **Grid/List 1488**.
  Set a frame's Grid mode like its Color mode. The App bar and Character
  banner bind their side padding to `grid-margin` (Desktop mode).
- Phones keep their own 14–16px insets for now; moving them onto the 16
  margin is a follow-up.

### Motion (one mode)

Not tokens in code yet: the two curves AGENTS.md names (layout moves 600ms
`cubic-bezier(.2,.8,.2,1)`, the segmented pill 300ms on the same curve) are
written where they're used. Figma has no motion variables; they go on the
foundations page as documentation until the code names them.

## Not variables, on purpose

- **The poster fallback's colors**: generated per title from its poster's
  hue (`--mh`), not a palette.
- **Confetti**: the phase colors plus a few celebration colors, resolved at
  run time.
- **Google's sign-in logo colors** (`account.tsx`): Google's own mark.
- **A guide's default color** (`#4a6da3`, in `guides-ui.tsx`) and the art
  under a guide's cover: data, not interface.
- **The dev-only Theme lab** (`theme-lab.tsx`): its presets are candidate
  values for comparing directions; they can become extra modes of the Color
  collection when a direction is chosen.

## Decided (Andre, 2026-11-16)

1. **Primitives in both places.** The code gets a primitive palette that the
   semantic tokens point at, and Figma mirrors the same two layers: a
   **Primitives** collection (one mode) that the Color collection's Light and
   Dark modes alias. Nothing exists on only one side.
2. **The file**: a new **Red Thread – Design System** design file in the AFR
   team.

## Checking Figma against the code

"Check tokens against Figma" (report only) and "sync tokens from Figma"
compare every variable, effect style and text style in the Design System
with `src/index.css` and with this file, mode by mode, and list each
difference with the edit that fixes it: the `figma-tokens` skill
(`.claude/skills/figma-tokens/SKILL.md`), with `tools/figma/tokens-dump.js`
and `tools/figma/tokens-check.mjs`. A new variable or token isn't done
until it comes back clean, including its row here.

## The component library

[figma-library.md](figma-library.md) maps every Figma component to its code.
The components are generated from the running app with `tools/figma/`
(README there), so a component is bound to these variables wherever the code
uses a token.

## Still open

- **Data colors** stay raw on purpose (see above). Shadows that mix a color
  in (the selected and highlighted cards' rings) are effect styles, not
  color tokens.

- **The visual direction** (Notion "Choose a visual direction on three key
  screens"). The foundations mirror today's values and can start now; the
  component library waits for it, as its ticket says.
