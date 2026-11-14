# Red Thread — handoff

Formerly MCU Connections; renamed 2026-11-02.

Written 2026-10-28 when development moved from a Claude chat session to Claude
Code. Codex continues to contribute; [AGENTS.md](../AGENTS.md) is the shared
rulebook and [decisions.md](decisions.md) the running decision log. This file is
the current handoff. `V3-SPEC.md`, `V3-TASKS.md` and `KICKOFF-PROMPT.md` are
the original V3 plan, kept as history (each says so at the top).

**Updated 2026-11-14, when V5 opened.** V4 is finished and live; this checkout
is V5 (branch `version/5.0`, worktree `Red Thread (V5)`, preview
https://red-thread-git-version-50-afr-bfcd.vercel.app/). Read
[V5-KICKOFF.md](V5-KICKOFF.md) for what V5 is and the order of work. V4's
[V4-KICKOFF.md](V4-KICKOFF.md) and [V4-PLAN.md](V4-PLAN.md) explain the build
migration and the design system V5 builds on.
Everything below describes the app as it now stands; the batch history is kept
because it is how most of the behaviour got here.

## Where things stand

- **V5 is open** since 2026-11-14 on `version/5.0` (worktree
  `Red Thread (V5)`), branched from `d11d5b5`: look and feel, UX/UI and
  branding. Its scope and tickets are being written; see V5-KICKOFF.md.
- **V4 is released**: its last batch (Batch 8) reached `main` on 2026-11-08
  (`d11d5b5`). V4 fixes, if any, are made on `version/4.0` in `MCU-V4` and
  merged forward with the user's approval. The V4 notes below are history.
- **V3 is released.** Batch 10 merged to production on 2026-10-31
  (`a44891a`), and `main`, `version/3.0` and `version/4.0` all started from
  that commit. V3 stays on `version/3.0` as history.
- **V4 is in production** since 2026-11-01: the first V4 release merged
  `version/4.0` into `main` (now https://redthread.tv/), with
  Batch 1 (build step, TypeScript, design system) and Batch 2 (the first
  re-skin pass, the theme control, the Red Thread placeholder logo).
- **V4 is open**, on branch `version/4.0` in the `MCU-V4` worktree, deploying
  to https://red-thread-git-version-40-afr-bfcd.vercel.app/ on every
  push (mcu-connections-git-version-40-… before the Vercel rename). Its backlog is the Notion **V4 Tasks** board; **V3 Tasks** is kept as
  history. Each batch reaches `main` only with Andre's explicit approval.
- **What V4 has landed so far** (released 2026-11-01): Batch 1 — the Vite
  build step and the move of the whole app into one bundle, the TypeScript
  conversion, a QA harness that builds and tests the real artifact, the
  design system and its preview page. Batch 2 — the design system wired in,
  the first re-skin pass on every surface (V3's markup restyled with shadcn's
  recipes), the Light / Dark / Auto control, the phone re-tap to top, the
  band-label contrast fix and the Red Thread placeholder logo. Next: the
  rename, and moving each surface's markup onto the real components.
- V3 fixes, if any, are made on `version/3.0` in the `MCU-V3` worktree and
  merged forward with the user's approval.
- Batches 7–9 shipped on 2026-10-29 and 2026-10-30 (details in CHANGELOG.md):
  - **Batch 7:** release status (Released, Coming with a date, Expected by
    month) and a Released-only filter; the desktop List's All titles header
    made valid for screen readers; shareable links; marking many titles at
    once; the full check run once per batch.
  - **Batch 8:** quieter List checkboxes; the progress meter above the List's
    column headers; the same title details on desktop and phones; Where to
    watch by country; collapsible details sections; Up next.
  - **Batch 9:** selecting or marking a whole phase in the desktop List;
    curated watch guides; "What have you seen?" for first visits; arrow keys
    in the desktop List and Guides.
- Batches 4–6 shipped on 2026-10-28:
  - **Batch 4:** "Lançamento" in Portuguese; the guest sign-in reminder after
    Undo; character-variant scope; search picks open the character widget;
    Escape closes it; regression reporting; Spatial touch on wide screens; the
    QA checks brought into the repository.
  - **Batch 5:** a reliable camera check; the phone page no longer scrolls
    behind the app; per-title performer credits; panning with inertia; recast
    cast rows show the credited performer's face.
  - **Batch 6:** credit-scene-only cast removed; one name and one chain for a
    recast character; the banner stops at the details panel; a failed sync is
    visible outside Account; picking a title navigates to it; five returning
    characters for sparse series, with portraits; phase and catalogue progress
    on every view; the Spatial count follows a selected title.
- On 2026-10-27 three backlog batches shipped (details in CHANGELOG.md):
  - **Batch 1:** phone crash when panning zoomed-out Spatial; Back closes phone
    sheets; poster and portrait fallbacks; production React builds.
  - **Batch 2:** accent-insensitive search; Spatial empty state; empty-canvas
    click closes a desktop selection; startup screen with failure recovery;
    larger selected title in the desktop ring.
  - **Batch 3:** WCAG AA contrast; page landmarks and List column labels; Escape
    and keyboard focus in desktop details; favicon, home-screen icon and link
    previews; Spatial cards reachable from the keyboard.
- The Notion V3 Tasks board is the live record of what is in progress,
  awaiting review or queued.

## Architecture in short

A single-page app built with Vite. `index.html` loads `boot.js` (startup
screen), the locale files and `i18n.js` as plain classic scripts — the startup
screen has to speak the visitor's language before anything else arrives — then
supabase-js from unpkg (pinned, SRI, the one library still on a CDN), then the
app as **one module bundle** entered at `src/main.ts`, then `watch-data.js`.

V3 had no build step and compiled its `.jsx` in the browser with Babel on every
visit; V4 replaced that, which took time to the first title from about 1,500 ms
to about 130 ms on desktop. The source is TypeScript at full `strict`
(`npm run typecheck`), though ten of the thirteen V3 app files are not yet
typed and say so in a header.

**The files still talk through `window.*`.** The bundle changed how the app is
delivered, not how its pieces are shared: each file publishes its components on
`window` and its readers read them from there. That is deliberate — it is also
the surface 15 QA checks read — and it is typed in `src/types/globals.d.ts`.
Replacing it with real imports is a later ticket.

- **Data:** `src/data/data.ts` holds the catalog (64 titles, 102 characters,
  permanent ids, variant links, synopses per language); `src/data/media-data.ts`
  holds TMDB poster and portrait paths. Their shapes are typed in
  `src/types/catalog.ts`, checked against the data itself.
- **Views:**
  - Desktop has Spatial (a pannable, zoomable canvas of cards with connection
    lines; selecting a title arranges related titles in rings) and List.
  - Phones have List, Grid and Spatial, with bottom sort tabs and sheets.
  - `src/app/app.tsx` owns state, layout and the desktop canvas;
    `src/app/mobile.tsx` owns the phone UI.
- **Tracking:** Seen and Watchlist are stored per device for guests, and in
  Supabase for Google-signed-in users (`src/app/tracking.tsx`,
  `src/supabase-client.ts`, `schema.sql`). Preferences (view, sort, order, folded runs) are per device in
  localStorage.
- **Language:** English (base) and Brazilian Portuguese. Every UI string is a
  locale key, and search matches names in every language through
  `MCU_I18N.fold()`.
- **Deploy:** Vercel's Git integration builds and publishes `version/4.0` and
  `version/3.0` as previews and `main` as production. Build settings live in a
  committed `vercel.json`, never in the dashboard, because dashboard settings
  apply to every branch and would break `main`'s static deploy.

## Key decisions (why things are the way they are)

The dated log is [decisions.md](decisions.md). The ones that shape day-to-day
work:

- **V3 had no build step; V4 has one.** V3 stayed a static site anyone could
  run with a one-line Python server. V4 moved to Vite, built by Vercel, which
  is what unlocks design-system tooling, Figma round trips, modules and a far
  faster startup. It landed as one planned migration whose only claim was
  "behaviour identical", certified by the regression — see V4-PLAN.md §5 for
  what that cost and what it taught.
- **QA lives in the repo, development-only.** `qa/` holds the headless checks
  with their own `package.json`; nothing in the app loads from it and Vercel
  does not deploy it. Since the app became a bundle the runner builds the site
  once and points every check at that build, so the checks exercise the real
  artifact.
- **Staging first, batches, explicit approval for main.** The user tries
  batches on the preview (often on a phone) before approving a merge.
- **One commit per ticket, real times in the CHANGELOG, recap after approval.**
  The user tracks the work in a calendar.
- **Spatial performance rules.** No per-card GPU layers or backdrop filters in
  the canvas, and the canvas is composited only at 30% zoom and above. Zoomed
  far out, the whole canvas is on screen, and iOS Safari reloaded the tab when
  it ran out of graphics memory.
- **Keyboard behaviour that never surprises mouse users.** Focus moves by script
  only after keyboard input; `:focus-visible` rings; Escape closes one layer at
  a time; the desktop drawer is modeless.

## Known quirks, gotchas and fragile areas

- **axe passes text it cannot judge.** When it cannot resolve what is behind
  some text — a pseudo element, a gradient, an image — it returns the node as
  *incomplete*, not as a violation, and `qa/a11y-scan.js` fails only on
  violations. Over a hundred nodes come back that way on desktop Spatial
  alone. `qa/test-contrast.js` is what measures those, by hiding the text and
  photographing the page. A clean accessibility scan has never meant the text
  on the page is readable; it means axe found nothing it was sure about.
- **The theme mechanism is written twice on purpose.** `src/theme.ts` owns it,
  but it arrives with the bundle, which is too late to paint with, so every
  page gets the rule as an inline script Vite injects into its `<head>`
  (`THEME_PREPAINT` in `vite.config.js`). Change the storage key or the rule
  in one and the page paints one theme and then swaps to the other.
- **`test-fit` fails on layout since 2026-11-01** (Notion "Top nav (PT) /
  content overflowing"): a control past the screen or its row, overlapping
  toolbar controls, a label past its own button, or sideways scroll, in the
  desktop toolbar and the phone app bar (all rows, including the collection
  row it used to miss). Count badges overhang their buttons on purpose and
  are measured out. Before, it only printed these, and a Portuguese overflow
  passed as clean; the regression's Portuguese run with Watchlist selected
  (`MODE=watch`) also never took effect, because the script read only argv.
- **Text has one scale, in rem** (`--fs-*` in `src/index.css`), and Settings'
  Text size sets `data-text-size` on `<html>` (Small 87.5%; Large 106.25% on desktop and 112.5% on phones, where body text is 14px and the bottom nav and search grow only to 106.25%).
  Until a size is picked, an iPhone or iPad starts from the system Text Size, read through the WebKit font `-apple-system-body` (`systemTextSize()` in `src/app/settings.tsx`, with its before-paint copy in `vite.config.js`); only a choice is saved, Default included. Verified only with a simulated iPhone: a real one with its Text Size changed is still to check.
  Controls grow with it: their heights are `max(Npx, N/16 rem)` (and
  Tailwind's spacing unit `max(0.25rem, 4px)`), so they grow at Large and never
  shrink below today's size, touch targets included. Write new sizes
  with the tokens. Things that stay in px and don't grow with text: the
  Spatial canvas cards (on purpose), the List's poster, face and action
  columns, and most spacing, so very large text leans on the measuring rows
  and the List's rem breakpoints. Not covered: the browser's minimum font
  size setting and real iOS Dynamic Type.
- **The phone collection row fits by measuring** (`MobileTopBar` in
  `mobile.tsx`): it tries full labels, then an icon-only view menu, then only
  "All" and the selected label, then "Para ver", and keeps the first that
  fits, on resize, language, selection and font load. Width breakpoints
  can't know how long a language's words are, or how big the text is.
- **Everything a visitor sees says Red Thread** (Andre, 2026-11-01: the public
  name; MCU Connections was a working title), including the link previews the
  build draws. Since 2026-11-02 (Notion "Rename the app to Red Thread") so do
  the GitHub repository (`AndreFelipeRibeiro/red-thread`), the Vercel project
  (`red-thread`), the npm package, the Supabase project's display name and
  Google's consent screen. `mcu-connections.vercel.app` redirects to
  redthread.tv with the path and query (`vercel.json`, and `middleware.ts`
  for the home page), so a visitor signed out there arrives without the
  progress saved on that address (Andre chose a plain redirect over carrying
  it across); signed-in visitors sync it back. The old `og-image.jpg` is gone
  and its address redirects to the app-wide card. The GitHub About box, the
  Notion pages ("Red Thread - Bugs and Features Backlog", "Red Thread - V4",
  "Red Thread - V3"), the Google Cloud project's display name and the recap
  title ("Red Thread V4 – Backlog batch n") were renamed the same day.
  **One rule** (Andre, after a full pass over every remaining "MCU"):
  everything people see says Red Thread, and `mcu` stays the internal prefix:
  the `mcu.*` saved-data keys (renaming them would wipe progress and sign
  everyone out), `window.MCU_*`, the `mcu-*` CSS classes, log prefixes and
  build plugin names. Renaming the code names alone would leave the keys
  behind, a half-and-half nobody wants. Also kept: "MCU" meaning the Marvel
  Cinematic Universe, the Supabase project address and the Google Cloud
  project ID (neither can change), and history files. **Still to do on the rename ticket:** move the local folders
  (`MCU Connections` → `red-thread`, `MCU-V4` → `red-thread-v4`, then
  `git worktree repair`), with every Claude, Codex, editor and dev server
  closed first; and, after about three months, remove the old addresses from
  Google and Supabase.
- **The logo is two masks, not images** (the work-in-progress logo, Andre,
  2026-11-02). `src/assets/logo-mark.svg` (the push pin) and
  `src/assets/logo-wordmark.svg` (the lettering) carry only shapes; their own
  colours are ignored. `--logo` (the designer's `#c41e3a`, both themes) paints
  the mark and `--foreground` the lettering, so one wordmark file serves light
  and dark. The toolbar's and app bar's sizes keep the designer's horizontal
  lockup (styles.css, `.logo-word`); a differently shaped logo needs those
  ratios adjusted. Icons take the favicon's navy tile (`tools/make-icons.js`).
- **Each surface's look is a section at the end of the stylesheets.** The
  first re-skin pass restyled V3's markup through `@apply` in "RE-SKIN, FIRST
  PASS — <surface>" sections, placed last so they win ties. A rule earlier in
  the file that seems to do nothing is probably overridden there.
- **The design system is opt-in, surface by surface.** Tailwind's reset only
  applies inside `.v4` (`src/preflight-v4.css`), and Tailwind only generates
  classes from the files listed with `@source` in `src/index.css`. A
  converted surface without the `v4` class, or whose file is not listed,
  renders on V3's browser defaults or without its classes, which looks like
  the components are broken when they are not. Portaled components (dialogs,
  tooltips) carry `v4` themselves. `qa/test-v4scope.js` guards the seam.
- **V3's stylesheets win every tie, and some that aren't ties.** They are
  unlayered, and Tailwind's output is in cascade layers, so a V3 rule beats a
  Tailwind class on the same element whatever the order or specificity. A
  converted element that keeps a V3 class keeps V3's look.

- **The source tree cannot be opened in a browser any more.** `python3 -m
  http.server` on the repository root serves an `index.html` whose only script
  is an unbuilt module; the startup screen correctly reports a failed start.
  Use `npm run dev` (port 8126, strict) or `npm run build && npm run preview`.
  No hard-refresh dance any more: Vite reloads on save.
- **Sign-in only works on allowed origins:** production, the two previews and
  `localhost:8126`. The dev and preview servers are both pinned to that port
  and stop rather than quietly moving, because moving would silently break
  sign-in.
- **`app.tsx` is large (about 3,300 lines)**, and the Spatial camera is the most
  fragile part. That covers glides (`glideTo` / `stopGlide`), the
  return-to-previous-view memory on deselect, the ring layout, the pair view and
  drag versus click detection on cards. Change it carefully and test pan, zoom,
  select, close, sort while selected, and zoomed out.
  - After the pair view, closing a selection does not return the camera to its
    pre-selection position.
- **Escape handling order matters.** Menus close themselves on `keydown` and
  React re-renders between listeners, so the details' Escape handler listens in
  the capture phase and checks the page for open menus or dialogs before acting.
- **Spatial keyboard button.** Each card's first child is an invisible
  `.card-open` button with `pointer-events: none`. Clicks still go to the card;
  keyboard activation calls the same handler.
- **Phone sheet history** (`sheetHistory` in `mobile.tsx`). Each sheet owns one
  history entry; a sheet handing off to another (Account → About) reuses it.
  Opening two sheets at once would confuse it.
- **Sticky headers must stay out of the reorder animation.** The phase
  headers in both Lists and the phone Grid are `position: sticky`; giving one a
  `data-flip-id` lets the FLIP animation leave a transform on it, which pins it
  below the top of its scroller. Each sticky header also needs its own
  containing block (`.m-gblock`, or one desktop rowgroup per phase) so it hands
  over at the next section instead of stacking.
- **Band pills and the Spatial camera share `BAND_LABEL_H`.** The camera leaves
  that much room above the first row; when the two disagreed the first pill was
  cut off at the top or slid under the count pill. Change them together.
- **Progress follows one rule, shaped in one place.** `viewProgress` in
  `app.tsx` hands every view either per-phase tallies (By Phase only) or the
  whole-catalogue tally (every other order); the views draw whichever they get.
- **Bulk marking goes through the per-title writer queue** (user decision,
  2026-10-28): `requestBulk` in `tracking.tsx` commits once and writes the
  guest copy once, then feeds each title to its own queue when signed in, so
  failures roll back per title. `bulkTargets` is the one rule for which titles
  an action changes, used for both the counts shown and the action itself.
  The signed-in path has not been exercised against a real session.
- **New characters need portraits.** `MEDIA.actors` (by character id) and
  `MEDIA.performers` (by name, for recast credits) are not filled in by adding
  a character; `test-recastname` fails when one is missing. Mike McGill has no
  TMDB photo and is the one allowed exception.
- **Image fallbacks** remember failed addresses until reload, so a brief
  offline moment keeps generated art for the session.
- **Link previews.** `og:image` and `og:url` point at production, so staging
  links show the production preview image.
- **Supabase free tier** pauses idle projects; restore from the dashboard (no
  keep-alive by policy).
- **Notion.** Agents cannot reorder board cards; only the user sets priority.
- **The local worktrees can look missing.** `MCU-V3` and `MCU-V4` are linked
  worktrees of the `MCU Connections` checkout, and sandboxed shells may list
  them as prunable. They are not; never prune them.
- **`test-camera`'s flakiness is fixed** (the glide steps wait for the
  transition instead of guessing at 60 ms). Its one console warning, "Unable
  to preventDefault inside passive event listener", is React attaching wheel
  listeners passively at the root and is allowed by name.
- **A check that drifts from the app can look like an app bug.** Two did:
  `test-skip` read the phone's guide markup after Batch 10 moved the desktop
  guide to its own card, and `test-back` expected Forward not to reopen a
  sheet after the address gained the open title. Both were carried as
  suspected app bugs for days. When a check fails in a way that makes no
  sense, check its selectors against the DOM and `git log` the feature before
  believing it.
- **Catalog upkeep.** Unreleased titles (Avengers: Doomsday, Friendly
  Neighborhood Spider-Man S2, Daredevil: Born Again S3, Avengers: Secret Wars)
  need ratings and story years when they come out. Several series have thin
  casts.

## QA checks

`qa/` holds the headless Playwright checks used throughout V3, curated
(qa/README.md lists them):
- the regression run (`bash qa/regress.sh`: 46 check runs plus the axe-core
  accessibility scan in both languages and in the dark theme, about 7 minutes, 4 at a time), once
  per batch before staging. It builds the site first and serves every check
  that build;
- `bash qa/quick.sh <check>` per ticket (the checks for the files changed);
- `node qa/smoke.js` against the deployed site after each push and merge;
- a startup timing check;
- one targeted check per recent fix, run per ticket before review.

Set up once per machine with `bash qa/setup.sh` (Node 18+), plus
`npm install` at the root for the build. They run headless Chromium against
the built site. They do not replace a look in a real browser and on a real
phone — and no headless check covers the iOS memory rule, so Spatial zoomed
out on a real iPhone is still the one thing that has to be looked at by
hand.

## Open threads and what's next

- **Waiting on Andre: run the `user_preferences` section of `schema.sql`** in
  the Supabase SQL editor (the whole file is idempotent). Until then Settings
  keep preferences on each device for signed-in visitors too, and the console
  says so once per visit; nothing fails. Then check the two-browser sync by
  hand (signed in on both, change the theme on one, reload the other).

- **Share links point at `https://redthread.tv/`** (`PUBLIC_URL` in
  `src/app/share.tsx`), which serves the production deployment.
- **Waiting on Andre: allow redthread.tv for Google sign-in.** In Supabase →
  Authentication → URL Configuration, add `https://redthread.tv/` to the
  redirect URLs (and make it the Site URL when ready), and add
  `https://redthread.tv` to the Google client's JavaScript origins. Until then
  someone who opens a shared link and signs in from redthread.tv may be sent
  back to the Site URL instead (README, "App redirects").
- **Link previews depend on `middleware.ts` running on Vercel.** It is Vercel
  Routing Middleware at the repository root, which Vercel picks up on its own
  (no dashboard setting). It can only be proven on a deploy: after the first
  push, open `/?title=iron-man` on staging and check the page source's
  `og:image`, then try the link in the Facebook Sharing Debugger or LinkedIn
  Post Inspector on production. If it doesn't run, shared links fall back to
  the app-wide card and nothing else changes.
- **The share card loads about 340 KB (gzip) on demand**: Satori, its layout
  engine (yoga.wasm) and text shaper (hb.wasm, which Satori fetches from the
  site root, so the build copies it there), and three Inter weights. Only when
  someone opens a share card; nothing on the first load.

- **Backlog:** the Notion board, in the user's order, is the live list. The
  items below were recorded at handoff on 2026-10-28. All have since shipped
  except the budget audit and the planning-document reconciliation (both in
  Batch 10) and "Expose selected filter states and group labels", which is no
  longer on the board:
  - Align character-variant scope, counts and browsing (for example "Peter
    Parker (Raimi)" says 1 title but opens all 13).
  - Correct per-title actor and voice-performer credits; Cast (movie vs
    post-credit).
  - Change "Estréia" to "Lançamento" (Portuguese sort label).
  - Panning with easing.
  - Keep a selected search title connected to its neighbourhood.
  - Expose selected filter states and group labels.
  - Expose account-wide sync failure and Retry outside Account.
  - Recheck the delayed guest sign-in reminder after Undo.
  - Verify and fix Spatial touch input on wide screens.
  - Audit unknown catalog budgets; expand returning characters in sparse
    series.
  - Maintain shared regression checks and real-device evidence; reconcile the
    V3 planning documents with the app.
- **Decisions waiting on the user:**
  - Which preferences sync across devices.
  - ~~How variant characters should behave~~: decided 2026-10-28 (one exact
    portrayal), then changed 2026-11-01: a character lights its whole
    identity thread (see decisions.md).
  - ~~A wider first Spatial view on desktop~~: dropped 2026-10-30 (not to be
    built).
- **Deferred:**
  - Phase 6 email/password accounts (needs a custom domain, a plan and
    approval).
  - ~~V4 tooling: the move to a build step~~ — done 2026-10-31, with the
    TypeScript conversion after it. The remaining V4 work (the design system,
    the re-skin, Dark/Light mode) is on the Notion **V4 Tasks** board.
  - Ideas in the Deferred column (as of 2026-10-30): a first-landing
    walkthrough, contextual guidance for Spatial and character browsing,
    spoiler-aware browsing, an installable app and offline catalog, Spanish,
    collection backups, community features, and deciding which preferences
    sync across devices. (Shareable URLs, Up next, watch guides, where to
    watch and the first-visit "What have you seen?" picker have shipped; the
    guide promotion is in Batch 10.)
- **Design pass.** The user is a designer and wants a Figma round trip: take
  the running app into Figma, refine the art direction and design system, then
  bring it back to code. The build setup it needs now exists. The component
  base was chosen on 2026-10-31 — shadcn/ui on Base UI, Vega style, light and
  dark from day one — and a standalone preview page (`design.html`) already
  shows it. AGENTS.md "Design system (V4)" has the rules; where a Figma frame
  and the accessibility, keyboard, contrast or localisation rules disagree,
  the rules win and the difference goes on the ticket.
- **Real devices.** Most verification was headless Chromium. An iPhone (Safari)
  and Android pass before larger releases is still worthwhile.
- **Review and plan.** A 2026-10-27 review of usability, bugs, speed,
  accessibility and features (Claude Docs, "MCU Connections: Review and Plan")
  produced most of the current tickets.
