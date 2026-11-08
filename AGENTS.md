# Repository instructions

The single shared rulebook for every agent working on Red Thread (formerly
MCU Connections; Claude Code, Codex, or any other). It assumes no chat history. `CLAUDE.md` only imports
this file; put new rules here. For the current state of the project, open
threads and why things are the way they are, read
[docs/HANDOFF.md](docs/HANDOFF.md) and [docs/decisions.md](docs/decisions.md)
before starting. `V3-SPEC.md`, `V3-TASKS.md` and `KICKOFF-PROMPT.md` are the
original V3 plan, kept as history: each opens with a note saying so, and lines
that no longer hold carry dated *Superseded* notes. The README describes the
app as it is now.

This checkout is **V4** (branch `version/4.0`, worktree `MCU-V4`). Read
[docs/V4-KICKOFF.md](docs/V4-KICKOFF.md) before V4 work: it sets out the V4
plan, the environment and the Figma workflow.

## Start of every session

1. `git status` in the worktree. If there are uncommitted changes you did not
   make in this session, stop and ask the user. Never edit, stash, reset,
   discard or commit another agent's pending work.
2. `git fetch origin`; if `version/4.0` moved, fast-forward only
   (`git pull --ff-only`) on a clean tree.
3. Open the Notion **V4 Tasks** board. Ship anything already in **Approved**
   first (the user cleared it; commit, push, then complete it), then take the
   right ticket and claim it (see Backlog workflow) before writing code.

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
  image), `src/share-card/` (the image templates, shared by the share card and
  the build's link previews; colours come from `src/index.css`),
  `scripts/og-previews.js` (renders every link preview at build time; not in
  `tools/`, which Vercel's build doesn't get), `middleware.ts` (at the root:
  serves a shared link its own preview page),
  `settings.tsx` (Settings: theme, language, region, motion, celebrations,
  device actions, and their sync to the account; a v4 surface built from the
  shadcn components), `boot.js` (startup screen, at the root), `i18n.js` + `locales/*.js` (root),
  `src/data/data.ts` (catalog; permanent title ids), `src/data/guides.ts`,
  `src/data/media-data.ts` (TMDB paths), `src/config.ts` (public Supabase URL +
  publishable key), `src/main.ts` (the bundle entry), `schema.sql`,
  `styles.css`, `styles-mobile.css`. The README's "Project structure" table is the full list.
- Docs: `README.md` (features, setup, deploy), `CHANGELOG.md`, `docs/` (handoff,
  decisions, catalog audit and sources, privacy review, V3 verification log).

## Commands

- Install: `npm install` (Node 18+). `qa/` installs separately, once per
  machine, with `bash qa/setup.sh`.
- Run locally: `npm run dev`, then open `http://localhost:8126/`. The port is
  fixed and strict (`vite.config.js`) because Google sign-in only works from
  origins the OAuth client allows, and 8126 is the one registered; if the port
  is taken the dev server stops rather than quietly moving. No hard-refresh
  dance any more — Vite reloads on save.
- Type check: `npm run typecheck` (`tsc --noEmit`), green today and expected
  to stay green.
- Build: `npm run build` into `dist/`, `npm run preview` to serve that build.
  Vercel runs the same build on every push, so pushing a branch is still the
  deploy.
- The app cannot be opened from the source tree any more (`python3 -m
  http.server` on the repository root serves an `index.html` whose only script
  is an unbuilt module). Use `npm run dev`, or `npm run preview` for the real
  built output.
- QA checks (`qa/`, details in qa/README.md): once per machine
  `bash qa/setup.sh` (needs Node 18+). The runner builds the site once and
  serves every check that build, 4 at a time, each waiting for the app's ready
  signal, so a full run takes minutes (user decisions, 2026-10-29 and
  2026-10-30):
  - **Per ticket, before handing it over for review:** `bash qa/quick.sh
    <the ticket's own check>`. It also runs every check that `qa/checks.json`
    lists for the files changed in the working tree. A new check goes into
    `checks.json` ("regress" and the files it covers) in the same change.
  - **Once per batch, before pushing it to staging:** `bash qa/regress.sh`
    (54 check scripts in 56 runs plus the accessibility scan in English,
    Portuguese and English in the dark theme, about 7 minutes; it exits non-zero and marks failures with
    `!!`), on the final tree with nothing edited while it runs. Read the
    output, not just the exit code. A good run is **59 check runs clean**
    with no known failures.
  - **After each push to staging, and after each merge to `main`:**
    `SITE_URL=<the deployed address> node qa/smoke.js` (about a minute)
    against the deployed site, once Vercel reports the deploy.
  Update checks in the same commit when you rename or restructure UI they
  rely on.
- The QA checks are headless Chromium. Still look at the change in a real
  browser (desktop and a phone-sized viewport, English and Portuguese), and
  record what you actually verified, including what was not checked (for
  example real iPhone Safari).

## Branches, deploys and approvals

- The code lives in the GitHub repository `AndreFelipeRibeiro/red-thread`
  (renamed from `MCU-Connections` on 2026-11-02; GitHub redirects the old web
  and Git addresses as long as no repository is ever created under the old
  name). The Vercel project is `red-thread`.
- `version/4.0` is **V4 staging**, checked out in the `MCU-V4` worktree. Every
  push deploys the Vercel preview
  `https://red-thread-git-version-40-afr-bfcd.vercel.app/` (the project's
  name since 2026-11-02; before that it was
  `mcu-connections-git-version-40-afr-bfcd.vercel.app`).
- `version/3.0` is **V3 staging** (worktree `MCU-V3`, preview
  `https://mcu-connections-git-version-30-afr-bfcd.vercel.app/`, its address
  from before the rename; a new push would move it to
  `red-thread-git-version-30-afr-bfcd.vercel.app`). V3 fixes, if any, are
  made there under that branch's own AGENTS.md and then merged forward into
  `version/4.0` with the user's approval.
- `main` is **production**: `https://redthread.tv/`. The project's own
  `https://mcu-connections.vercel.app/` redirects there, path and query
  included (`vercel.json`), and so does `www`. It serves V4 since the first V4
  release (2026-11-01, Andre's approval). Each later batch reaches `main` only
  with the user's explicit approval for that merge; V3 is history on
  `version/3.0`.
- All three deploy automatically through Vercel's Git integration; there is no
  Vercel CLI step. Check a deploy with the commit status on GitHub.
- Keep iterations local and uncommitted until the user approves committing and
  pushing **that** revision, either in chat or by setting the ticket's Status to
  **Approved** in Notion. Prior approval does not carry over to a new revision.
  Do not push layout experiments for review.
- **Never merge to `main` without the user's explicit approval for that merge.**
  Merge with `git merge --no-ff version/3.0` from an up-to-date `main`, push
  `main`, then fast-forward `version/3.0` to the merge commit so both match.
- Work usually ships in batches: implement and verify a few tickets, push the
  batch to staging for the user to try (often on a phone), then merge when they
  approve.
- Do not run `git reset --hard`, `git checkout -- .`, `git clean`, `git stash`,
  rebases, force pushes or `git worktree prune` without explicit approval.
  `MCU-V3` and `MCU-V4` are linked worktrees of the `MCU Connections`
  checkout; they can look missing or "prunable" from a sandboxed shell. They
  are not.

## Commits and CHANGELOG.md

- One commit per ticket where possible, so each ticket maps to its own commit.
- Author is the maintainer's verified GitHub noreply identity
  (`Andre Ribeiro <19270235+AndreFelipeRibeiro@users.noreply.github.com>`).
  Add a blank line and a co-author trailer for the assisting tool and the model
  actually used, e.g. `Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>`
  or `Co-authored-by: Codex <codex@openai.com>`. Keep existing credits; never
  claim tools or checks that were not used.
- Every committed change gets a CHANGELOG.md entry at the top:
  `## V4 fix|improvement|feature|design|maintenance — <short title>` (older
  entries keep their `V3` prefix), then
  `Recorded: YYYY-MM-DD HH:MM EDT (-0400).` and its staging/production status,
  then bullets for the change, the verification actually performed, and the
  limits. Times are real: take them from git
  (`TZ=America/New_York git log -1 --date=iso-local --format=%cd`), never
  estimated or written ahead. The zone and offset come from git as well:
  from the first Sunday of November to the second Sunday of March the entry
  reads `EST (-0500)`, and on the changeover night the hour from 1:00 to 2:00
  happens twice, so only the offset says which one it was. When a batch reaches `main`, update those
  entries' status line in a small follow-up commit before merging.
- Keep README.md current when behaviour, setup, release status or workflow
  changes.
- Before pushing, check staged content and commit metadata (no personal emails,
  home paths or secrets), and verify the pushed tree matches what you tested.

## Backlog workflow (Notion V4 Tasks)

The backlog is the Notion database **V4 Tasks**, under the **Red Thread - V4** page
(`https://app.notion.com/p/f8e1ebb392a6450d8ef883458e12bd76`; data source
`collection://629a6bf8-a98d-47b1-b64d-9bad9d29a2b8`). **V3 Tasks** (under
**Red Thread - V3**) is V3's history and holds any V3 maintenance tickets. Open V4,
V5 and unversioned tickets were copied from it on 2026-10-31; each copy links
its original in **V3 ticket**.

- **Priority = the order of the Backlog column in the "All tasks" board view**,
  top first. Take the top unclaimed ticket unless the user names others. Do not
  use the **Queue** table's order (Notion keeps a separate manual order per
  view). The user drags cards to set the order; agents cannot reorder cards
  and must not add priority numbers. A card titled `———` is the user's divider:
  tickets above it are the next ones to do.
- Fields: **Status** (Backlog, In progress, Awaiting review, Approved, Blocked,
  Deferred, Completed), **Assigned to** (Codex, Claude, Andre), **Type** (Bug,
  Improvement, Feature, Design, Workflow, Maintenance), **Version** (V4, V5),
  **Batch** (Batch 1…n), **Source**, **Figma** (frame links), **V3 ticket**
  (the original record, for tickets ported from V3), **Latest commit**,
  **Completed on** (date-time), **Completion order** (number, starting at 1).
- **Version** and **Batch** say where a ticket belongs in the shipping history.
  Set both when you claim a ticket: Version is V4 for V4 work, and Batch is the
  batch it is being worked in. They are what the calendar recap's title line is
  built from, so a ticket with no batch has no recap to belong to.
  - V4 batches start again at **Batch 1**. Add the next Batch option when a
    new batch starts. Tickets closed together in one approval share a batch.
  - V5 tickets and unversioned ideas ported from V3 stay **Deferred**. Leave a
    ticket without a Version unless it says which one it is for; guessing a
    version for an idea nobody has scheduled is worse than leaving it blank.
- Read the whole ticket page, **including any screenshots or images**: fetch
  the page with its file URLs and look at each image before deciding what the
  ticket means. If the **Figma** field holds links, read those frames with the
  Figma MCP as well (see "Figma" below). New requests from the user in chat
  become tickets first.
- Claim: set Assigned to = your agent and Status = In progress, then re-read the
  record to confirm no one else holds it. Work on one ticket at a time; claim
  the next only when the current one is handed off.
- Ready: Status = Awaiting review. The page body keeps the request, the
  changes, the verification actually done and the remaining limits.
- Pushed for review: record the commit in **Latest commit** and the page body;
  the ticket stays Awaiting review until the user approves it.
- **Approved** is the user's own flag, set by them and nobody else. It means
  they have approved *that ticket's current revision* and you may commit and
  push it to `version/4.0` without asking again. Never set it yourself, and
  never read it as approval for anything beyond that ticket.
  - It does **not** authorise a merge to `main`. That still needs the user's
    explicit approval for that merge (see "Branches, deploys and approvals").
  - It does not survive a new revision: if you change the work after it was
    approved, move it back to Awaiting review and ask again.
  - Approval given in chat counts the same; the flag exists so an approval
    outlives the conversation and is visible to the other agent.
  - At the start of a session, a ticket sitting in Approved is work the user
    has already cleared — commit and push it, then complete it.
- Complete (only after the user approves and the change is committed and
  pushed): Status = Completed, Latest commit = the final implementation commit,
  every related commit listed in the body. **Completed on** = the actual
  approval/merge time in America/New_York with `is_datetime = 1` (never the
  creation or edit time). Query the database for the highest **Completion
  order** and add one; tickets closed together take consecutive numbers in
  their shipping order. Leave older date-only records as they are.
- Notion-only tasks still need the user's review but no commit. Completing a
  ticket on staging is not approval to merge to `main`.

## Recap after each approval

When the user approves and closes a ticket or batch, reply with a recap they
paste into the Notion Calendar event. Write it as **ordinary chat text, with
real Markdown bold** — not inside a code fence. Plain text out of a fence
pastes unformatted into Notion Calendar, which is the whole problem the format
exists to avoid.

Title line, then one bullet per ticket:

> **Red Thread V4 – Backlog batch <n> (<a few keywords>)**
>
> - **Fixed:** search now matches with or without accents ("Capitao" finds "Capitão").
> - **Improved:** clicking empty canvas on desktop closes the selected title and its details.

- The title carries the version, the batch number and a short keyword phrase
  saying what the batch was about.
- **One bullet per ticket**, opening with a bold label — Fixed, Improved,
  Added — and then what changed, in the user's terms rather than the
  implementation's. Use only the labels that apply.
- No date, duration or commit-count line in the body: the calendar event
  itself holds the time.

Times quoted anywhere else are America/New_York and come from real events
(when work started on the batch, when it was pushed or merged).

The assistant can also create the event directly on the user's Google
**Personal** calendar (the one Notion Calendar fronts) with the Notion
calendar tools. Creating an event is an outward-facing action: offer, and
only create it when the user says yes.

## Design, accessibility and interaction standards

These are the V3 standards and still describe the app. The V4 design system
(shadcn/ui, Vega style; see "Design system (V4)") replaces the visual tokens
and type below as it lands (Figma first, then code); the accessibility,
keyboard, focus, Escape, phone-history, reduced-motion and Spatial performance
rules carry over unchanged.

- V3's colour tokens (`styles.css :root`) are prefixed `--v3-` so they
  cannot collide with the design system's (shadcn defines `--border` and
  `--accent` too), and since the first re-skin pass each is *defined from* a
  design-system token (`--v3-surface: var(--card)` and so on), so V3's rules
  follow the theme. Write new rules with the design system's tokens directly,
  never a raw colour. `PHASE_COLORS` in `app.tsx` (and `MPHASE_COLORS`) hold
  `var(--phase-N)`; code that paints on a canvas resolves them first.
- Text on the dark overlays that sit on posters uses `--on-image` (fixed light
  values): the overlay stays dark in both themes because it sits on an image.
- **Font sizes come from the type scale** (`--fs-xs` … `--fs-7xl` in
  `src/index.css`, in rem): never a pixel size, so all text follows the
  browser's default font size and Settings' Text size. No informative text
  under 12px (`--fs-xs`) at the default size. The one exception is the
  Spatial canvas (cards and band labels keep px; the canvas has zoom), and the
  shared pieces a card borrows are pinned back to px inside `.card`.
  `qa/test-textsize.js` holds the floor. Tailwind's `text-xs` / `text-sm` are
  one step bigger than the library default (13 / 15px) for the same reason.
  They read the scale's variables (`--fs-sm` / `--fs-md`), so phones, which
  set body text at 14px, move them in one place (`src/index.css`).
- **Control sizes grow with the text, never shrink:** a control's height (and
  a square icon button's width) is `max(Npx, N/16 rem)`, and Tailwind's
  spacing unit is `max(0.25rem, 4px)`. At Large everything grows in step; at
  Small nothing gets smaller than its default, so touch targets keep their
  size. Thumbnails, avatars, icons and the Spatial canvas stay in px.
- **A row of controls that can run out of room fits by measuring**
  (`window.useFitSteps`, `src/app/mobile.tsx`): its stylesheet keys more
  compact steps on `data-fit`, and the hook keeps the first that fits, on
  resize, language, font load and Text size. Use it rather than a width
  breakpoint for anything holding words: breakpoints can't know a
  translation's length or the text size. `test-fit` fails when something
  doesn't fit.
- Type: the design system's Inter (`--font-sans`, served with the bundle) and
  the system monospace (`--font-mono`) for labels, numbers and badges
  (Andre's decision, 2026-11-01). Bebas Neue appears only in the generated
  poster art. Logo: two SVG files, each drawn as a CSS mask so the next
  version is a file swap. `src/assets/logo-mark.svg` is the mark (today the
  work-in-progress push pin), painted with `--logo` (the designer's red, the
  same in both themes; `.logo-mark` in `styles.css`) everywhere the mark
  appears, including the share cards and link previews;
  `src/assets/logo-wordmark.svg` is the lettering, painted with
  `--foreground` (`.logo-word`) beside the mark in the toolbar and the phone
  app bar, where the name stays as text for screen readers.
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
    desktop List's bulk selection, then the details, then the pinned character
    or performer. Never close two layers
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
  query, and turning it on puts `reduce-motion` on `<html>`, which `styles.css` answers by
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

## Figma (V4)

V4's new look is designed in Figma and brought into code through the Figma MCP
server (remote, `https://mcp.figma.com/mcp`). `.mcp.json` in the repository
root registers it for Claude Code in this folder; each person authenticates
once (`/mcp`, then figma, then Authenticate). Codex adds it with
`codex mcp add figma --url https://mcp.figma.com/mcp`.

- Figma is the source of truth for the V4 design: variables (colour, type,
  spacing, radius, motion) and components. Code mirrors the variables as
  design tokens in one place, with the same names; components use tokens,
  never raw values copied from a frame.
- Work from links, not descriptions: a design ticket's **Figma** field links
  the frame(s). Read the frame with the MCP (design context, variables, a
  screenshot) before coding, and compare the result against the frame in a
  real browser at desktop and phone sizes, in English and Portuguese.
- When a frame and the rules here disagree (accessibility, keyboard, contrast,
  localisation), the rules win: flag the difference on the ticket instead of
  silently copying the frame.
- **Phase 4's first pass has no frames** (Andre's decision, 2026-11-01): it
  applies shadcn/ui's Vega defaults to each surface as they stand, so the look
  can be seen and reacted to before any art direction. The rules above apply to
  the customising pass that follows, once frames exist.
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
- **The first re-skin pass (2026-11-01) restyled V3's markup**, it did not
  rewrite it: each surface's look is a "RE-SKIN, FIRST PASS — <surface>"
  section at the end of `styles.css` or `styles-mobile.css`, which gives V3's
  classes shadcn's exact class recipes through `@apply` (both stylesheets
  start with `@reference "./src/index.css"` for that). It sits last so it wins
  over V3's rules of the same weight; V3's layout rules above it stay. New
  work on a surface either edits its section or, better, swaps that surface's
  markup for the React components in `src/components/ui/` and deletes the
  section and the V3 rules it overrides together (docs/decisions.md).
- **How a surface opts in** when its markup moves onto the components
  (Settings, `src/app/settings.tsx`, was the first, built that way from the
  start):
  - Tailwind's preflight reset is scoped to `.v4` (`src/preflight-v4.css`,
    generated from Tailwind's own; its header says why). A converted surface
    puts class `v4` on its root, and a component that portals out of a
    surface carries `v4` on its portaled root itself (`dialog.tsx`,
    `tooltip.tsx`; add it to any new one that portals).
  - Tailwind generates classes only from the files listed with `@source` in
    `src/index.css`. Add the surface's file there in the ticket that converts
    it; until then its class names are V3's and must not become utilities.
  - V3's stylesheets are unlayered, so they beat every Tailwind class on an
    element they match, whatever the order. Retire a surface's V3 rules in the
    ticket that converts it.
  - `qa/test-v4scope.js` holds this seam: the reset stays out of V3 and works
    inside `.v4`, the two token sets don't collide, and the theme is wired.
  - When no V3 surface is left: delete `src/preflight-v4.css`, import
    `"tailwindcss"` whole, and drop the `v4` classes and the `--v3-` tokens.
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

## Language

The app's public name is **Red Thread** (Andre, 2026-11-01). "MCU
Connections" was a working title: every visitor-facing string, page title,
link-preview tag and share message says Red Thread (Portuguese: "o Red
Thread"). Its domain, `https://redthread.tv/`, serves production and is the
address every shared link uses (`PUBLIC_URL` in `src/app/share.tsx`). Since
2026-11-02 (Notion "Rename the app to Red Thread") the GitHub repository, the
Vercel project, the npm package and the Supabase and Google display names say
Red Thread too. One rule: everything people see says Red Thread, and `mcu`
stays the internal prefix. Deliberately unchanged, and not to be renamed in
passing: the saved-data keys (`mcu.*` in localStorage; renaming them would wipe every
visitor's saved progress and settings), the `window.MCU_*` names and CSS
class names (internal, and the QA checks read them), the Supabase project
address, "MCU" where it means the Marvel Cinematic Universe, and history
(CHANGELOG entries, the V3 plan files). The local folders keep their names
until the rename ticket's folder step (docs/HANDOFF.md).

User-facing text is translated: never hard-code UI strings in components. Add a
key to `locales/en.js` (the complete base), translate it in every other
`locales/*.js`, and read it with `tr()` (app.tsx), `mtr()` (mobile.tsx) or
`window.MCU_I18N.tr()`. Show titles and character names through
`MCU_I18N.titleName()` / `charName()`; search keeps matching every language's
names. New catalog titles need an official local title and a short,
spoiler-light synopsis per locale; write synopses rather than copying studio or
TMDB text. Preserve permanent title ids and the spatial-filter invariants
described in V3-SPEC.md §7.1 (collection status dims cards, it never removes
them from the Spatial layout).

## Deferred work and constraints

- **Phase 6, email/password accounts:** Deferred. It waits on a custom domain
  (for reliable transactional email) and on its own plan and explicit
  approval. Do not add forms, recovery handlers or SMTP settings before then.
- The build step, the new look and feel and Dark/Light mode are V4 Backlog
  tickets (Notion V4 Tasks). V5 tickets and unversioned ideas stay Deferred
  there until the user moves them.
- Other open decisions are listed in docs/HANDOFF.md.
- Supabase free tier: accept pauses; no keep-alive automation.

## Secrets and privacy

- Never write secrets into the repository, commit messages, the CHANGELOG,
  Notion or chat: no service-role or secret keys, OAuth client secrets,
  database credentials, SMTP credentials, session tokens or personal emails.
  The Supabase project URL and publishable key in `config.js` are intentionally
  public.
- Do not record machine-specific home paths or real user data in tracked files;
  account values come from the active session at runtime.
- Do not echo suspected secrets in tool output or reports. Removing a value from
  current files does not remove it from history: explain any exposure and get
  explicit approval before any history rewrite or force push.

## Working with another agent

Claude and Codex take turns in the same `version/4.0` worktree (`MCU-V4`).
Uncommitted changes are the hand-off point; the Notion claim says who holds
which ticket. When asked to review the other agent's work, read only
(`git diff`) and report. Edit only if the user asks.
