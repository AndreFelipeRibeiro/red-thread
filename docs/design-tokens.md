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
`-aNN` is that color at NN% opacity): `neutral-*`, `slate-*`, `red-*`,
`coral-68`, `rose-*`, `crimson-53`, `tomato-*`, `yellow-84`, `gold-*`,
`green-*`, `blue-*`, `purple-*`. In Figma they're hidden from the pickers
(no scopes): designers pick the semantic colors below. Components never use a
primitive directly, in code or in Figma.

### Color (modes: Light, Dark)

The `:root` block is Light, `.dark` is Dark. Every value is an alias of a
primitive (or of another color token: `progress` and `ring` are `brand`,
`progress-done` is `seen`, the Dark canvas is `background`); only
`progress-track` and `canvas-dot`, which mix a color with transparency in
code, hold computed values per mode. `thread-rest` (the resting threads'
opacity, 42% / 55%) lives here too, as a number.

| Group | Tokens |
| --- | --- |
| Surfaces and text | `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `border`, `input` |
| Accent (red) | `brand`, `brand-foreground`, `primary`, `primary-foreground`, `ring`, `destructive`, `logo` |
| Progress | `progress`, `progress-done`, `progress-track` |
| Collection status | `seen`, `seen-foreground`, `seen-text`, `status-watch`, `on-color` |
| Phases | `phase-1` … `phase-6` |
| On artwork (same in both modes) | `on-image`, `on-image-dim`, `on-image-muted`, `on-image-ground`, `on-image-base` |
| Score marks (same in both modes) | `imdb`, `rt`, `rt-text` |
| Connections canvas | `canvas-top`, `canvas-bottom`, `canvas-dot` |
| Controls (shadcn at rest) | `field`, `button-outline`, `button-outline-border`, `destructive-tint`, `switch-track`, `switch-thumb`, `switch-thumb-off`, `invalid-border`, `invalid-ring` |

**Controls** (2026-11-17, Notion "Build the Red Thread component library in
Figma"): shadcn writes some resting colors as a token in Light and another
token at an opacity in Dark (`bg-transparent dark:bg-input/30`). One Figma
variable can't follow a class like that, so those colors are tokens with a
value per theme, the same colors as the classes gave (checked element by
element in both themes). Aliases where a theme's value is a token; computed
values where it is a mix, as for `progress-track`. Hover, focus and pressed
states stay classes.

`progress`, `progress-done`, `ring`, `progress-track` and the Dark canvas
values point at other tokens in code; in Figma they are aliases of those
variables, not copies.

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
`tailwind/shadow-lg` with Tailwind's values.

### Type (one mode) → number variables + text styles

- Sizes: `fs-display`, `fs-title`, `fs-heading`, `fs-body`, `fs-label`,
  `fs-caption`, `fs-numeral` (rem in code, px in Figma at the default text
  size; phones use the smaller display and body sizes declared beside them).
- The Type collection has two modes, **Desktop** and **Phone**: phones use
  14px body, 24px display and a 56px countdown. `font-sans` (Inter) and
  `font-display` (Instrument Serif, the poster fallback's initials) are
  string variables.
- **Text styles**, one per type role, named like the utility: `text-display`,
  `text-title`, `text-heading`, `text-body`, `text-label`, `text-caption`,
  each with its line height from `@theme inline`, its size bound to the
  `fs-*` variable and its family to `font-sans`. The code sets weight per use,
  not per role; the styles take the weight each role mostly has (Semi Bold
  for display, title and heading; Regular for body, label and caption).
- Art sizes stay fixed px and are text styles in an `art/` folder:
  `text-card-title` (`-lg`, `-pop`, `-ov`), `text-card-meta` (`-lg`, `-pop`),
  `text-card-micro`, `text-tag`, `text-numeral`, `text-numeral-word`.

### Radius, spacing and sizes (one mode)

- `radius` (0.625rem), and the scale derived from it: `radius-sm`,
  `radius-md`, `radius-lg`, `radius-xl`, `radius-2xl`, `radius-3xl`,
  `radius-4xl` (as Figma variables with the computed px; 2xl and 3xl are
  unused today).
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

## The component library

[figma-library.md](figma-library.md) maps every Figma component to its code.
The components are generated from the running app with `tools/figma/`
(README there), so a component is bound to these variables wherever the code
uses a token.

## Still open

- **The mixed colors**: about 55 `color-mix(…)` recipes in the components
  (the dimmed text, brand and seen tints at several strengths, the score
  chip) and some `dark:`-only colors have no token, so the library keeps
  their light value. Notion "Name the mixed colors" streamlines and names
  them (fewer reds and greys, as Andre suggested).

- **The visual direction** (Notion "Choose a visual direction on three key
  screens"). The foundations mirror today's values and can start now; the
  component library waits for it, as its ticket says.
