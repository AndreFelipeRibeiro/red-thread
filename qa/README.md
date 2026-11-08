# QA checks

Development-only browser checks (headless Playwright). They are **not part of
the app**: the site never loads anything from `qa/`, Vercel does not deploy this
folder (`.vercelignore`), and installed packages stay out of Git
(`.gitignore`). This is the one place npm is allowed in V3 (see AGENTS.md).

## Setup (once per machine)

    bash qa/setup.sh

Installs Playwright and axe-core into `qa/node_modules`, downloads Chromium,
and fetches the pinned supabase-js package into `qa/vendor` (React, ReactDOM
and Babel are vendored too, from when the app loaded them from unpkg; only
supabase-js is still fetched that way). The checks serve it in place of unpkg,
so they test exactly the version `index.html` loads and need no network.

The app is built before each run, so `npm install` in the repository root is a
prerequisite as well.

## Running

Run from the repository root:

| Command | What it does |
|---|---|
| `bash qa/regress.sh` | Full regression: 54 check scripts in 56 runs (`test-fit` runs three times: English, Portuguese, and Portuguese at the Large text size) plus the accessibility scan in English, Portuguese and English in the dark theme, 4 at a time; about 7 minutes (it was about 24 one at a time). Every errors field should read `[]` or `0`, the scans "no violations"; lines marked `!!` are failures and the run exits non-zero. Ends with the total time and the ten slowest. `JOBS=1` runs one at a time; `QA_VERBOSE=1` prints the tail of a failing check. |
| `bash qa/quick.sh [checks…]` | The per-ticket run: the checks `qa/checks.json` lists for the files changed in the working tree, plus the checks named (the ticket's own), side by side. A typical ticket takes 1–3 minutes. |
| `SITE_URL=<address> node qa/smoke.js` | One-minute smoke check against a deployed site, exactly as a visitor gets it: loads, titles appear, Spatial and List open, details open and close, the phone List opens a sheet, no console errors. Run it against staging after each push and production after each merge. |
| `node qa/a11y-scan.js` | axe-core scan of 16 screens (desktop Spatial, details, List in Release and in By Phase, account menu, an open guide in the List and in Spatial, the Guides popover, the "What have you seen?" dialog, the guide promotion; phone List, details, Spatial, an open guide, the picker sheet, the guide promotion). Add `LOC=pt-BR` for Portuguese. Exits non-zero and prints `!!` when it finds any violation (it used to exit 0 regardless, so read the output of older runs). Text whose background axe cannot resolve comes back *incomplete*, not as a violation, so this scan passes it; `test-contrast.js` is what measures those. |
| `X=1 node qa/<check>.js` | One check; most print JSON with their findings. |
| `node qa/perf2.js` | Time to first title, desktop and a 4×-slowed phone. Needs `SITE` or a built `dist/`. |
| `node qa/test-boot.js` | The startup screen under a blocked, corrupt or hanging bundle. Not in the full run; `npm run build` first. Its `bundle-tampered` case reports one console error on purpose — that error *is* the scenario. |

Each check starts its own static server on the port in `PORT` (each check
keeps its old fixed port as the default, so a check run on its own works as
before). `regress.sh` and `quick.sh` give every check its own port so they can
run side by side.

What that server hands out is the **built** site, not the source tree: since
the app became a bundle the source tree cannot be opened in a browser at all.
`run.js` builds `dist/` once at the start of a run; to point the checks
somewhere else — another version, to compare — set `SITE` to that folder,
relative to `qa/`, and build it yourself first:
`SITE=../../old-copy/dist node qa/test-panel.js`.

## What makes the runs fast (2026-10-30)

- **`qa/run.js`** runs the checks (`JOBS`, default 4), buffers each one's output
  and prints them in the list's order, so the report reads the same however
  many run at once. The timing-sensitive checks ("serial" in `checks.json`:
  camera, inertia, animation, wide touch) run afterwards, alone.
- **One built site for every check:** `run.js` loads `qa/serve-site.js` into
  every check (`NODE_OPTIONS=--require`), which serves the whole site from one
  tree whatever the check's own handler would have done. 14 of the regress
  checks predate `SITE` and hard-code the repository root; this is what makes
  them honour it. Until 2026-10-31 this file also compiled the `.jsx` files
  with the pinned Babel, because the page did that itself at startup; the
  bundle replaced all of that, and building once is now both faster and a
  closer match to what ships — every check exercises the real artifact, which
  is why `test-boot` and `perf2` no longer need to opt out of it.
- **One catalog loader:** `test-nextup`, `test-pickperson` and `test-refocus`
  build their expectations from the catalog source rather than a copy that can
  drift. Since the TypeScript conversion `src/data/data.ts` carries
  annotations Node cannot execute, so they share `qa/load-catalog.js`, which
  transpiles it with the repository's own pinned TypeScript and runs it
  against a `window` stub. (`test-refocus` reads it as text instead: it wants
  the literals in the order they are written.)
- **A ready signal:** the app sets `data-ready="1"` on `<html>` once its first
  render is on screen and the collection has loaded. `qa/ready.js`
  (`appReady(page)`) waits for it plus a short margin (700ms, `QA_READY_MARGIN`)
  instead of a fixed 2.2s sleep. The timing-sensitive checks and `test-boot`
  keep their fixed waits.
- **`qa/checks.json`** lists the full run, the serial group and which checks
  cover which app files (for `quick.sh`). Add a new check to it in the same
  change.

## The checks

- Regression set (`regress.sh`): `test-fit` (the desktop toolbar and the
  phone app bar fit at every width, in English and in Portuguese with
  Watchlist selected; fails on a control past the screen or its row,
  overlapping controls, a label past its button or sideways scroll), `test-ctxfn2` (context summary and filters), `test-panel`
  (details panel and drawer), `test-i18n`, `test-dlist` (desktop List),
  `test-suggest` (search suggestions), `test-layers` (menu layering),
  `test-anim` (reorder animations), `test-cel` (counters and celebrations; with the details open, the confetti stays left of the drawer, centred on the toast),
  `test-align2` (Spatial alignment), `test-about`, `test-welcome`,
  `test-camera` (Spatial camera, glides, selection return), `test-v2`
  (phone views), `test-widetouch` (touch pan and pinch on a wide screen),
  `test-variant` (character-variant scope), `test-nudgeundo` (the guest
  sign-in reminder against Undo), `test-pickperson` (every actor and character
  picked from the search opens the pinned widget), `test-escpin` (Escape
  unwinds one layer per press, down to the pinned widget), `test-mviewport`
  (the phone document does not scroll behind the shell), `test-inertia`
  (panning decelerates on release and stops dead when grabbed),
  `test-portrait` (a recast row never shows the default performer's face),
  `test-recastname` (the performer named beside a recast character follows
  the title in view, and a character search offers one row per performer),
  `test-bannerhold` (the character banner stops at the details panel with the
  same indent pinned or hovered, and the panel hangs from the toolbar),
  `test-progress` (phase meters on By Phase only and one All titles meter on
  every other order, across all 30 view and order combinations; counts
  released titles only, ignores the collection tab and hides during a search;
  sticky headers, Spatial framing and the scroll reveal),
  `test-release` (release status worked out from the dates at run time:
  released / upcoming / expected at their real precision, badges only on
  titles not out yet, the Released only filter, Portuguese dates),
  `test-urlstate` (a shared address opens the state it names, the address
  follows changes and survives a reload, bad values are dropped, Back and
  Forward on a phone close and reopen the details, closing the filter sheet
  keeps the filter just chosen, and only our keys ever appear),
  `test-bulk` (desktop List selection, Shift ranges and the mixed header;
  bulk marks change exactly the right titles, never an unreleased one seen,
  with one guest-storage write and one announcement; Undo restores each title,
  a replaced watchlist included; over 20 asks first and Cancel keeps the
  selection; real Escape presses clear the selection before the details; the
  phone section headers' "Mark all seen" / "Mark N more seen"; on desktop in
  By Phase, a phase header's checkbox selects exactly that phase (mixed for
  part of it, cleared on a second click) and its "Mark N more seen" marks only
  that phase's remaining released titles, with Undo; the All titles meter's
  button in Release order),
  `test-details` (the desktop drawer and the phone sheet show the same
  sections in the same order from one shared body: poster beside eyebrow,
  title, release and story, then scores, budget, status, synopsis, Where to
  watch, Part of (only for a title in a guide, one row per guide) and the cast; the cast starts open and
  Where to watch closed, each toggling only itself; "Ratings after release"
  for a title not out yet, "Not published" for an unknown budget, the search
  highlighted in the title, nothing under the close button or past the edge
  at 320px, Portuguese labels; samples picked from the catalogue at run time),
  `test-watch` (Where to watch, against a test snapshot served in place of
  watch-data.js: the section starts closed; the country guessed from the
  browser's languages, then the time zone, then the US; stream and free logos
  with the name kept when a logo fails; the rent-or-buy line; rent only; no
  offers; not checked yet with no "Checked" date beside it; the series note;
  nothing on a title not out yet; the picker, an unsupported country with
  TMDB's own page, the choice kept across a reload; the 30-day warning; the
  external link's target, rel and name with no tracking; the phone sheet in
  Portuguese; and the real snapshot as committed),
  `test-nextup` (Up next: a new guest gets the first title out in release
  and in story order, never one not out yet; Mark seen moves on and Undo
  brings it back, with a polite announcement; the × hides it until the page
  is reloaded and stores nothing; the phone card sits at the top, above the
  meter, with no duplicate row; A–Z, Z–A and IMDb follow the list itself and
  say so; hidden while searching; caught up names the next arrival; the
  Watchlist states and Show from everything; filters narrow it and are named;
  the Grid card, the phone Spatial chip, the desktop List strip and the
  Spatial meter row; 320px; Portuguese. Expectations come from the catalogue
  and today's date),
  `test-guides` (Guides: the data first, every stop a real title once, both
  languages, a reason per stop, release order, essential numbers 1..n that
  never shift when optional stops show, valid continuity; then the desktop
  popover and Escape, the banner, List rows, next stop, meter, Include
  optional, the stepper, no All titles switch, `?guide=` on load and a bad value,
  Escape closing the guide; "Mark N more seen" on its meter with Undo; an
  empty search box listing every guide; search suggesting it first under
  Guides by mouse and keyboard; a character with a guide offering it and one without not;
  Part of in the details opening the guide at that title; Spatial badges
  and route; confetti once per guide, not on opening a complete guide, none
  with reduced motion; the phone sheet and Back, List rows, the optional
  switch, the pill's ×, Grid cards, the Up next chip clear of the pill, the
  character pill's button; 320px and Portuguese),
  `test-picker` ("What have you seen?": a new guest opens it from the
  welcome; released titles only, by phase in release order; Select all /
  Clear, picks, the live count, Space and Enter on a poster; saving marks
  exactly the picks with one toast, no confirmation even over 20, at most one
  burst, and Undo clears them; the sign-in reminder shows once afterwards;
  opened later from the account menu, seen titles start ticked and labelled,
  unticking marks unseen in the same change with one mixed toast and one
  Undo that restores a replaced Watchlist mark; × closes at once with no
  changes and asks with some, Escape closing one layer, Keep picking and
  Leave without saving; on a phone, Back closes it or asks (and asks again),
  the footer stays on screen, nothing past the edge; the Seen tab's empty
  state opens it, in Portuguese),
  `test-listkeys` (desktop List keys: with the details open, ← → step through
  the rows shown, across a sort, a filter and a search, wrap at both ends and
  announce the position; ↑ ↓ keep the column (checkbox, title, Seen), Home
  and End, stopping at the ends, the details following without taking focus;
  Enter still focuses the details; Alt+→, the search box, Space, Shift-click
  ranges and Escape (selection, then details) unchanged; a pinned character
  and a guide keep their own stepping; a wrapped-to row is never under the
  meter or column headers, in Release and By Phase at 1280 and 1440px;
  reduced motion; the Portuguese announcement),
  `test-promo` (guide promotion and resume, with the date fixed: Doomsday's
  guide on 2026-11-01, the animated series on 2026-12-20, the evergreen guide
  on 2027-02-01; once per guide; never on a first visit, after a link, for a
  completed guide or in an automated browser; Tomorrow on the last day and
  none on release day; the started state with checks, the next stop, the
  meter and Continue; Escape, Not now and phone Back; Start opens and
  remembers the guide, the home page reopens it, a link wins without
  forgetting, closing or finishing forgets it; cover labels never overlap at
  320, 390 and desktop widths, in English and Portuguese),
  `test-home` (the logo is a link home: from a search with filters, the
  Watchlist tab and a bulk selection in the List, a pinned character with
  details in Spatial (mid-glide, by keyboard), a followed guide, and phone
  List and Grid, it resets everything but the view, sorts by Release,
  re-frames Spatial, scrolls to the top, brings Up next back and announces
  it; Back restores the search, filters, sort and title; the collection is
  untouched; the remembered guide is forgotten; Cmd/Ctrl-click opens a tab
  instead; Portuguese),
  `test-unreleased` (with the date fixed: Doomsday has no Seen button on
  2026-12-10 and one from 2026-12-11, in the desktop List, a Spatial card,
  the details drawer, the phone List and details; Watchlist stays and the
  row doesn't shift; marking inside the window works with its toast; the
  progress count adds it only on 2026-12-18; Daredevil S3, dated by month,
  never has one; a title marked seen early keeps its button and unmarks),
  `test-partof` ("Part of" in the details: a collapsible section with its
  count, open from the List and closed inside a guide, on the drawer and the
  phone sheet; the in-guide choice holds on the next stop and doesn't change
  the other context's state; a reload restores the defaults; Enter and Space
  toggle; a title in no guide has no section; a row opens its guide;
  Portuguese),
  `test-refocus` (the view lands on the title whose details closed: She-Hulk
  opened from Up next in desktop Spatial is centred at no less than the
  landing's reading zoom, and on
  a phone at 60% or more once the selection clears; a card clicked on the
  canvas returns the camera exactly; the desktop List row comes into view
  below the headers, flashes and takes keyboard focus; on a phone the Up
  next title scrolls nothing and a folded seen title brings its fold's
  header into view, still folded),
  `test-micro` (Batch 8's micro-interactions, each with Reduce motion: icon
  buttons shrink while pressed; the All titles bar fills and guide segments
  fade; marking plays the Seen pop and a counter bump that lasts; a card a
  filter brings back fades in, and a collection change fades cards; Up next
  slides between titles with the leaving one inert; a pinned character's
  thread draws in order once the cards land; the saving spinner never moves
  the buttons),
  `test-segpill` (the sliding selection: in the sort, type, collection and
  view groups and the phone collection row the pill sits on the selected
  button in English, Portuguese and at Large text, slides on a change and
  moves at once with Reduce motion, the setting's or the system's),
  `test-stepzoom` (desktop Spatial: stepping through a pinned character or a
  guide lands each stop at the landing's reading zoom, 100% at 1600px and
  about 87% at 1280px, and keeps a bigger zoom the visitor chose),
  `test-skip` (skipping a guide stop: Skip beside Seen by keyboard, the
  minimized row with Unskip, focus and announcements; the stop leaves the
  meter, next stop, "Mark N more seen", stepper and Up next, with a dash on
  its Spatial badge; remembered per guide across a reload; seen wins and drops
  the skip; skipping the last unseen stop completes the guide, and finishing
  with a stop skipped bursts the confetti; phone List and Grid; Portuguese),
  `test-guidemode` (an open guide sets aside what it doesn't use: the Guides
  button shows as on and is named after the guide; in the List the layout
  tabs, Order, Filters, type and collection are dimmed, aria-disabled and
  inert, while search and the view switch stay live; in Spatial the layout
  tabs and Order work again, and with Series set every stop of a film guide is
  laid out and lit with no count summary; closing the guide brings Series and
  every control back; phones: the bar shortens (Filters and the collection row
  fold away, the view menu sits beside search), the sort tabs slide away, the
  dock shows the next stop with Seen instead of the meter and Up next card,
  the next stop is framed at a readable size, and the zoom control rests
  hidden until a double-tap; closing brings it all back; Portuguese hint),
  `test-contrast` (the contrast calculation AGENTS.md asks for beside axe:
  the declared text pairs and the phase tokens in `src/index.css` in both
  themes, read through the real theme mechanism; every piece of text on
  `design.html` in both themes; and the app's own text that axe leaves
  *incomplete* — text over a pseudo element, a gradient or an image, which
  `a11y-scan.js` cannot judge and therefore passes. Those are measured against
  the background actually painted behind them: the text is made transparent,
  the page is photographed and the commonest colour in each text box is its
  background. Exactly the nodes axe reports are measured (it used to match
  by text, so one unresolved "T" measured every "T" on the page), and text
  that is part of a picture (`role="img"`) or marked `aria-hidden` is skipped,
  as WCAG 1.4.3 exempts it. The app and the band labels are measured in both
  themes, since the app follows the system. The six Spatial band labels are
  reached one at a time with `?phase=N`, because only phase 1's is on screen
  at the opening camera.
  Accepted shortfalls live in `KNOWN` in the check, each with the ratio it was
  accepted at and why; a worse ratio fails, and one that starts passing is
  reported so the entry can go), `test-v4scope` (the seam between V3 and the
  design system: Tailwind's reset stays out of V3, so `<html>` keeps
  `line-height: normal` and V3's icons their baseline alignment, and works
  inside a `.v4` probe; shadcn's `--border` and `--accent` never take V3's old
  values, each `--v3-*` token resolves to its design-system counterpart, and
  `color-scheme` follows the theme; the theme class follows the system from
  the pre-paint script, an override survives a reload, and clearing it follows
  the system again. Proven against the build before the change and a build
  with the reset global again, both of which it fails), `test-retap` (on a
  phone, tapping the sort tab that is already selected brings the List and
  the Grid back to the top, at once under reduced motion, without changing
  the sort, its direction or the address; a different tab still re-sorts.
  Fails on the build before the change), `test-logo` (the placeholder logo:
  the desktop toolbar, the Welcome dialog, the phone app bar and the startup
  screen all draw the mark from the one SVG file, painted with `--brand` in
  light and dark at 32, 32, 28 and 48px; the startup screen shows it with the
  bundle blocked; the header reads "Red Thread" in English and Portuguese, as
  do the page title and the home-screen name.
  Fails on the build before the change), `test-threads` (every lit
  connection line ends in two lit cards, and the banner's count is the cards
  lit: every character hovered from a title it is in, in the default view,
  then the titles with variants under a phase filter and selected; each
  variant pinned, and the performers who play several. Hovering Captain
  Carter lights Avengers: Doomsday, and No Way Home's line on to Your
  Friendly Neighborhood Spider-Man is Holland's Peter. About 2 minutes. Fails
  on the build before the change, 261 errors), `test-settings` (the gear
  opens Settings as a panel on desktop and a sheet on phones, and the theme
  control and language menu are gone from the toolbar, app bar and account
  sheet; the panel takes the details drawer's place and gives it back;
  keyboard open focuses its heading, Escape closes an open select first, then
  the panel, with focus back on the gear; theme, language, region, motion and
  celebrations apply at once and survive a reload; reset guide progress,
  show the welcome again and clear this device (asks first; Cancel keeps
  everything); tapping a switch row's text toggles it; Back closes the phone
  sheet; the app bar title fits at 375px; the theme control's labels fit at
  320px in Portuguese;
  the Welcome offers a language choice; axe clean in the open panel and
  sheet in both themes. Account sync is not exercised: it needs a signed-in
  Supabase session), `test-share` (Share at every point: the title drawer and
  phone sheet, the pinned character's banner and phone pill, the guide card,
  Spatial row and phone header, account progress, About, Settings, and a
  milestone toast with Undo still first. Desktop copies the link and announces
  "Link copied"; phones send link and message to the share sheet (stubbed);
  a cancelled sheet shows nothing; links are always the production address and
  open what they shared; no history entry; Portuguese messages; Tab and Enter
  reach and use it; "Peggy Carter" still fits the phone pill at 375px. The
  share card: My progress, a milestone toast and a finished guide open it with
  a 1080×1350 image and a description; desktop offers Download image and Copy
  link, a phone Share image, which sends the PNG with the message and link),
  `test-textsize` (the type scale and Text size: no visible text under 12px
  at the default size outside the Spatial cards, on the main desktop and phone
  surfaces, Settings and the account; Settings → Text size scales the root by
  87.5% / 106.25% on desktop (112.5% Large on phones), applies at once, survives a reload, stays off the
  synced preferences and leaves a Spatial card's text alone; phones set body
  text at 14px, the bottom nav at 12px and draw search at 13px with the field's
  own font at 16px or more (no zoom on focus on iPhones); the desktop List
  keeps every cell inside its column in both languages at Default and Large,
  with all 12 columns at 1280px by default; 200% browser zoom on desktop has no
  sideways scroll; a simulated iPhone starts from its system Text Size until a
  size is picked, and nothing off iOS does), `test-previews` (the build's link previews: a 1200×630 image and a page for
  every title, character and guide, whose og: tags name it and point at
  redthread.tv and which differ from index.html in nothing else; index.html's
  own card is the new default; middleware.ts, run against the built files,
  serves each kind and passes unknown or malformed ids and every other request
  through; the app boots from a preview page).
- Checks written for specific fixes (run them when touching that area):
  - `test-pan`: zoomed-out Spatial layers and memory.
  - `test-back`: phone Back closes sheets.
  - `test-img`: image fallbacks.
  - `test-accent`: accent-insensitive search.
  - `test-empty`: Spatial empty state.
  - `test-bgclick`: empty-canvas click.
  - `test-boot`: startup screen.
  - `test-esc`: Escape and focus in details.
  - `test-kbspatial`: Spatial cards from the keyboard.
  - `test-ringfocus`: enlarged ring card.
- `test-jit2.js` and `test-jit2-env.js` also hold the shared harness (server,
  vendor routing, page helpers) that other checks load. Edit them with care.

## Reporting

`regress.sh` (through `run.js`) prints every errors field it finds under each
script name, flags anything that is not `[]` or `0` with `!!`, and exits
non-zero if there was any. It also fails a check that exits non-zero or prints
no errors field at all, so a crashed or hung check can no longer look like a
pass. Each check is capped at 300s.

History: the bash runner capped checks with GNU `timeout`, which is **absent on
macOS**; before its fallback existed, every check died with "command not found"
and the whole run passed, silently, in a couple of seconds. `run.js` caps
checks itself, so that can't recur.

Four checks print their JSON indented (`JSON.stringify(out, null, 1)`), so a
non-empty errors array spans several lines. The matcher flattens each check's
output before reading it; a single-line pattern could not match such an array
and printed a bare `"desktopErrors": `, which read as harmlessly as an empty
one.

## Known noise

- `test-camera`: one desktop console warning ("Unable to preventDefault inside
  passive event listener"), which React causes by attaching wheel listeners
  passively at the root. `regress.sh` allows that one string by name, and
  `test-widetouch` reports it as `knownWarning` rather than in `errors`.
- `test-camera` used to fail at "sort change while selected", and separately to
  report a false "wheel cancels the glide" about one run in four. Both were the
  check, not the app, and both are fixed. A full run is 56 runs (53 check
  runs and three scans: English, Portuguese, and English in the dark theme) and all of them should be clean: as of 2026-10-31
  there are no known failures. Treat any `test-camera` failure as real, and
  compare against a clean copy with `SITE=` if in doubt.
  - `page.mouse.click` moves the cursor and presses in the same tick. Hovering a
    card re-lays the canvas out, so the press could land after the cards had
    shifted and select nothing, leaving `.drawer-close` with no target. Card
    clicks go through `clickCard()` (move, let the hover settle, then press),
    and the two that must open a card go through `openCentreCard()`, which
    waits for the drawer and re-measures if the press missed. It reports
    `cardOpenAttempts`: more than one attempt is normal after a wheel zoom, and
    a run of `"failed"` is worth looking at.
  - The glide steps guessed at 60ms and 80ms. They now wait for the transition
    to appear and to clear, which is what the "1 in 4" was.

- `test-skip` **used to fail, and it was the check, not the app** (fixed
  2026-10-31). Batch 10 replaced the desktop guide's meter row with one taller
  card (`GuideModule`), which draws progress as `.gm-count` / `.gm-notes` and
  puts the bulk action in its own footer. The check still read only the phone
  markup (`.g-meter .pgh-count` and friends), found nothing on desktop, and
  reported `count null`, `meter: null / null` and `bulk action reads "null"`
  as though the guide were broken. It now reads both layouts. Every expected
  value in it is unchanged — they simply had nothing to compare against
  before, so on desktop most of this check had not really run since Batch 10.
- `test-back` **used to time out, also the check** (fixed 2026-10-31). It was
  written on 2026-10-28, and the next day the address gained the open title,
  so going Forward restores `?title=…` and the details reopen. The check still
  expected nothing to reopen, left the sheet covering the page, and every
  later click timed out against it. It is now in the regress set, because the
  phone's "Back closes the sheet" rule is an AGENTS.md invariant and nothing
  else covered it — which is how this went unnoticed for three days.
- **The runner used to be able to miss a failure** (fixed 2026-10-31). Its
  verdict pattern read an `"errors": [...]` field only as far as the first `]`,
  wherever that bracket came from. `test-skip`'s own messages contain the text
  `{"skipped":[]`, so the value it saw ended in `":[]"` and passed the "is it
  empty" test: the run printed "44 check runs clean" with a real failure in it.
  `run.js` now finds the end of the array by scanning, ignoring brackets inside
  strings. A run recorded before that date may have a softer verdict than it
  appears to.

## Assertions have to be named "errors" to count

`regress.sh` only reads fields whose name contains `errors`. A check that
prints `"somethingWorked": false` therefore gates nothing — the run reports
clean. `test-camera` had six such booleans, any of which could be false
unnoticed; they are now collected into `assertErrors`. Worth remembering when
writing a check: **an assertion that is not in an errors field is decorative.**
- External images and fonts are blocked on purpose, so posters show their
  generated fallback art in screenshots.

## Keeping it useful

Checks find elements by class names and texts. When a change renames or
restructures UI, update the affected checks in the same commit. Screenshots go
to `qa/shots/` (ignored by Git).
