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

**How work moves from idea to production** (the nine stages, the tracks, the
approvals, who does what and where each piece lives) is in
[docs/WORKFLOW.md](docs/WORKFLOW.md). It is the source of truth for the
process; this file holds the rules for carrying out each step.

This checkout is **V5** (branch `version/5.0`, folder `red-thread-wip`).
Read [docs/V5-KICKOFF.md](docs/V5-KICKOFF.md) before V5 work: it sets out
what V5 is, the environment and the order of work.
[docs/V4-KICKOFF.md](docs/V4-KICKOFF.md) and docs/V4-PLAN.md are V4's
brief and plan, kept because they explain how the build and the design system
came to be.

## Start of every session

1. `git status` in the worktree. If there are uncommitted changes you did not
   make in this session, stop and ask the user. Never edit, stash, reset,
   discard or commit another agent's pending work.
2. `git fetch origin`; if `version/5.0` moved, fast-forward only
   (`git pull --ff-only`) on a clean tree.
3. Open the Notion master backlog's **All tasks** board (see "Backlog
   workflow"). Ship anything already in **Ship approved**
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
    (65 check scripts in 67 runs plus the accessibility scan in English,
    Portuguese and English in the dark theme, about 9 minutes; it exits non-zero and marks failures with
    `!!`), on the final tree with nothing edited while it runs. Read the
    output, not just the exit code. A good run is **70 check runs clean**
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
- **Two local folders, named by role** (since 2026-11-14), side by side in
  one parent folder, `Developer/Red Thread/`:
  - `red-thread-live` — `main`, production. The main checkout (it holds the
    repository's `.git`). Used only for merges to `main` and for hotfixes.
  - `red-thread-wip` — the version in progress, a linked worktree of
    `red-thread-live`. Today `version/5.0`; when the next version starts, this
    folder switches to its new branch instead of a new folder being made.
- `version/5.0` is **V5 staging**, checked out in `red-thread-wip`. It
  started on 2026-11-14 from `d11d5b5` (V4 Batch 8, the commit `main` and
  `version/4.0` shared). Every push deploys the Vercel preview
  `https://red-thread-git-version-50-afr-bfcd.vercel.app/`.
- **Hotfixes to production** are made on `main` in `red-thread-live`, with
  the user's explicit approval for that change, then `main` is merged into
  `version/5.0` so V5 carries the fix.
- Released versions are history: branches and their Vercel previews are kept,
  and each shipped state has a tag (`v2-import`, `v3-final`, `v4.0`,
  `v4-final`; V5 gets `v5.0` at its first merge to `main`). Create and push a
  tag only with the user's approval.
  - `version/4.0` (tag `v4-final`), preview
    `https://red-thread-git-version-40-afr-bfcd.vercel.app/`.
  - `version/3.0` (tag `v3-final`), preview
    `https://mcu-connections-git-version-30-afr-bfcd.vercel.app/` (its
    address from before the rename).
- `main` is **production**: `https://redthread.tv/`. The project's own
  `https://mcu-connections.vercel.app/` redirects there, path and query
  included (`vercel.json`), and so does `www`. It serves V4 (last merge: V4
  Batch 8, `d11d5b5`). Each V5 batch reaches `main` only with the user's
  explicit approval for that merge.
- Every branch deploys automatically through Vercel's Git integration; there
  is no Vercel CLI step. Check a deploy with the commit status on GitHub.
  Build settings live in the committed `vercel.json`, never in the Vercel
  dashboard, whose settings apply to every branch including production.
- Keep iterations local and uncommitted until the user approves committing and
  pushing **that** revision, either in chat or by setting the ticket's Status to
  **Ship approved** in Notion. Prior approval does not carry over to a new revision.
  Do not push layout experiments for review.
- **Never merge to `main` without the user's explicit approval for that merge.**
  Merge with `git merge --no-ff version/5.0` from an up-to-date `main`, push
  `main`, then fast-forward `version/5.0` to the merge commit so both match.
- Work usually ships in batches: implement and verify a few tickets, push the
  batch to staging for the user to try (often on a phone), then merge when they
  approve.
- Do not run `git reset --hard`, `git checkout -- .`, `git clean`, `git stash`,
  rebases, force pushes or `git worktree prune` without explicit approval.
  `red-thread-wip` is a linked worktree of the `red-thread-live` checkout; it
  can look missing or "prunable" from a sandboxed shell. It is not. Move or
  rename either folder only with `git worktree move` / `git worktree repair`
  (the main checkout: `mv`, then `git worktree repair` inside it), never in
  Finder.

## Commits and CHANGELOG.md

- One commit per ticket where possible, so each ticket maps to its own commit.
- Author is the maintainer's verified GitHub noreply identity
  (`Andre Ribeiro <19270235+AndreFelipeRibeiro@users.noreply.github.com>`).
  Add a blank line and a co-author trailer for the assisting tool and the model
  actually used, e.g. `Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>`
  or `Co-authored-by: Codex <codex@openai.com>`. Keep existing credits; never
  claim tools or checks that were not used.
- Every committed change gets a CHANGELOG.md entry at the top:
  `## V5 fix|improvement|feature|design|maintenance — <short title>` (older
  entries keep their `V3` or `V4` prefix), then
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

## Backlog workflow (Notion master backlog)

The backlog is one Notion database for every version: **Red Thread -
Backlog/Tasks (MASTER)**, under the top-level **Red Thread** page
(`https://app.notion.com/p/4189e188029f809c9a95e8b91ae22bdf`; data source
`collection://6d19e188-029f-8328-8e70-07717fc07aa6`; the **All tasks** board
is `view://f6b9e188-029f-83bb-a3bc-08b3404d87ee`). Since 2026-11-14 it
replaces the per-version boards: it started as a copy of **V4 Tasks** (V4's
completed tickets, the V5 tickets and the unversioned ideas), and the
**Version** field says which release a ticket belongs to. New versions do not
get a board of their own. **V4 Tasks** (under **Red Thread - V4**) and **V3
Tasks** (under **Red Thread - V3**) are history; do not add tickets there.

- **Priority = the order of the Backlog column in the "All tasks" board view**,
  top first. Take the top unclaimed ticket unless the user names others. Do not
  use another view's order (Notion keeps a separate manual order per view);
  the **By track** board shows the same open tickets by Track, for looking
  only. The user drags cards to set the order; agents cannot reorder cards
  and must not add priority numbers. A card titled `———` is the user's divider:
  tickets above it are the next ones to do.
- **Hierarchy: Epic > Task > Sub-task.** **Level** says which one a ticket is,
  and **Parent item** / **Sub-items** link them (Notion's sub-items relation).
  - Claim only **leaf tickets**: tickets with no Sub-items. An Epic, or a Task
    that has Sub-items, is a container: never claim it, set it In progress or
    put code against it. Work its children, top of the Backlog column first.
  - A parent is Completed only when all of its Sub-items are Completed; the
    agent that completes the last child proposes closing the parent in its
    handoff, and the user approves it like any other ticket.
  - New work found while on a ticket becomes a new ticket under the same
    parent (Level and Parent item set), not extra scope on the current one.
  - **Placing any new ticket:** before creating it, check the Epics view and
    decide, in this order: (1) it belongs under an existing epic or task (set
    Parent item and Level); (2) it starts a new epic, when it opens an area of
    work with several tickets to come; or (3) it stays **standalone** (no
    Parent item, no Level), which suits one-off bugs and small improvements.
    Say which one you chose, and why, when you report the new ticket.
  - **When the user names an epic or a parent task** ("work the shadcn pass
    epic"), work its leaf tickets in their Backlog column order, one at a
    time: claim, build, verify, hand off to Awaiting review, then take the
    next. Stop where the user said to stop (e.g. "stop after 1/5"), when a
    ticket is Blocked, or when the next one's "Before you start" isn't met,
    and say which ticket is next. Keep to one epic or batch per session.
  - The **All tasks** board filters out containers (Sub-items is empty), so
    every card on it is claimable; cards show their **Parent item** and
    **Level**. Epics are in the **Epics** table view, with their tasks listed
    under Sub-items.
  - Read the parent's page before starting a child: epics hold the goal, the
    audit or source behind it, and what is out of scope.
  - A "Before you start" line in a ticket names tickets that must be Completed
    first. If they are not, skip to the next leaf ticket and say so.
- Fields: **Status** (Backlog, In progress, Awaiting review, Design approved,
  Ship approved, Blocked, Deferred, Completed), **Track** (Development, Design,
  Marketing, Ops), **Assigned to** (Codex, Claude, Andre), **Type** (Bug,
  Improvement, Feature, Maintenance, Visual, Process), **Version** (V5, V6),
  **Level** (Epic, Task, Sub-task), **Parent item** / **Sub-items**,
  **Batch** (Batch 1…n), **Source**, **Figma** (frame links), **Latest commit**,
  **Completed on** (date-time), **Completion order** (number; it continues
  across versions, so V4's tickets hold 1–56).
  Empty fields are hidden on ticket pages (hide-when-empty layout); they
  still exist, so set them through the API or the property menu as usual.
  The old **V3 ticket** field was removed on 2026-11-14: tickets carried over
  from V3 link their original in the page body ("Carried over from V3").
- **Track** says which stages a ticket goes through, what "done" means for
  it and whether it takes a Batch ([docs/WORKFLOW.md](docs/WORKFLOW.md),
  "Tracks"). Every ticket gets one when it is created. **Development** changes
  the app. **Design** is design delivered in Figma and not built on that
  ticket. **Marketing** is promo videos, social images and launch material.
  **Ops** is how we work (the workflow, AGENTS.md, tooling, Notion). A
  Development ticket that needs design keeps it on the same ticket, through
  Design approved and on to Build.
- **Version** and **Batch** say where a ticket belongs in the shipping history.
  **Only a ticket that ships as a commit takes a Batch** (Andre, 2026-11-21):
  every Development ticket, and an Ops ticket that changes the repo. Design,
  Marketing and Notion-only Ops tickets take a Version but never a Batch.
  Set both when you claim a ticket that takes a Batch, **including a ticket
  you create from chat and start at once** (that is a claim too): Version
  is V5 for V5 work, and Batch is the batch it is being worked in. They are what the calendar recap's
  title line is built from, so a ticket with no batch has no recap to belong
  to (Andre, 2026-11-17: five Batch 14 tickets went unbatched because the
  option did not exist yet).
  - **The current batch** is the one after the highest Batch on a Completed
    ticket of this version. If its option is missing from the Batch property,
    add it first (the schema change lists every existing option, so none is
    lost; the colors cycle brown, orange, yellow, green, blue, purple, pink,
    red, gray), then claim. A missing option is never a reason to leave Batch
    empty.
  - **A batch is a release chunk, not a set of tickets** (Andre, 2026-11-18):
    it is everything that ships in one push. Until the current batch is
    pushed, every ticket that ships as a commit and is claimed, created,
    reworked or held back for more work joins it, however late it was added. Never open a new batch for new
    tickets or to set work aside: the next batch starts only after the
    current one ships. If the user wants part of a batch to ship first, ask
    which tickets, and ship those as the current batch.
  - Batches restart at **Batch 1** for each version, so a batch is named by
    Version and Batch together (V5 Batch 1 is not V4 Batch 1). Add the next
    Batch option only when a version needs one it does not have. Tickets
    closed together in one approval share a batch.
  - V6 tickets and unversioned ideas stay **Deferred**. Leave a
    ticket without a Version unless it says which one it is for; guessing a
    version for an idea nobody has scheduled is worse than leaving it blank.
- Read the whole ticket page, **including any screenshots or images**: fetch
  the page with its file URLs and look at each image before deciding what the
  ticket means. If the **Figma** field holds links, read those frames with the
  Figma MCP as well, annotations included (see "Figma" below). New requests
  from the user in chat become tickets first.
- Claim: set Assigned to = your agent, Status = In progress, **Version and
  Batch** (Batch only on a track that takes one; set Track too if it is
  empty) in the same update, then re-read the record to confirm no one else
  holds it and that they are all set. Work on one ticket at a time; claim
  the next only when the current one is handed off.
- Ready: Status = Awaiting review. The page body keeps the request, the
  changes, the verification actually done and the remaining limits.
- Pushed for review: record the commit in **Latest commit** and the page body;
  the ticket stays Awaiting review until the user approves it.
- **Design approved** is the user's own flag too: the design on that ticket
  is signed off, and the ticket records the exact frame (the **Figma**
  field) and the approved Figma version. It means the design may go into
  the library and App Screens and then to Build. It is **not** approval to
  commit or push: the built revision still goes to Awaiting review and
  needs Ship approved. Never set it yourself.
- **Ship approved** is the user's own flag, set by them and nobody else. It means
  they have approved *that ticket's current revision* and you may commit and
  push it to `version/5.0` without asking again. Never set it yourself, and
  never read it as approval for anything beyond that ticket.
  - It does **not** authorise a merge to `main`. That still needs the user's
    explicit approval for that merge (see "Branches, deploys and approvals").
  - It does not survive a new revision: if you change the work after it was
    approved, move it back to Awaiting review and ask again.
  - Approval given in chat counts the same; the flag exists so an approval
    outlives the conversation and is visible to the other agent.
  - At the start of a session, a ticket sitting in Ship approved is work the user
    has already cleared — commit and push it, then complete it.
- Complete (only after the user approves and the change is committed and
  pushed): Status = Completed, Latest commit = the final implementation commit,
  every related commit listed in the body. **Completed on** = the actual
  approval/merge time in America/New_York with `is_datetime = 1` (never the
  creation or edit time). Query the database for the highest **Completion
  order** and add one; tickets closed together take consecutive numbers in
  their shipping order. Leave older date-only records as they are.
  Set the page icon to ✅ in the same update (the Epics view uses it to show
  what is done at a glance); a parent Task or Epic gets ✅ when it closes too.
  If a Completed ticket is reopened, remove the icon.
- Notion-only tasks still need the user's review but no commit. Completing a
  ticket on staging is not approval to merge to `main`.

## Shipping a batch (every push, staging or production)

Andre, 2026-11-17: these steps are part of every push, not extras to be asked
for. When he says to commit or push a batch that is in Awaiting review
("commit Batch 12", "push it"), that is his approval of those tickets. Step 0
comes before the push; the rest follow it in the same turn, in this order:

0. **Every ticket in the batch has its Batch**: query the board for
   Development tickets, and Ops tickets with commits, that are In progress,
   Awaiting review or Ship approved with an empty Batch, and fix them before
   anything else (the recap and the calendar event are built from it).
1. **Regression and push**: the full regression on the exact tree, then the
   push; smoke-test the deployed site (`SITE_URL=… node qa/smoke.js`) once
   Vercel reports the deploy.
2. **CHANGELOG**: one entry per ticket with the real time, saying where it
   went (staging, production).
3. **Close the tickets** (see "Complete" in the ticket workflow): Status
   Completed, ✅ icon, **Completed on** = the push time, the next
   **Completion order** numbers, **Latest commit** and every commit in the
   body. A parent closes when its last sub-item does.
4. **Calendar**: one purple event per session of work in the batch, created
   with the Google Calendar connector (rules below). Check the calendar
   first so a batch never gets two events, and never misses one.
5. **Recap** in chat (format below).

A merge of an already-shipped batch to production repeats steps 1 and 2
(CHANGELOG: "merged to main"), checks that 3 and 4 were done, and does them
if they weren't. Before ending a turn that pushed anything, check all six
(0 to 5).

## Recap after each approval

When the user approves and closes a ticket or batch, reply with a recap they
paste into the Notion Calendar event. Write it as **ordinary chat text, with
real Markdown bold** — not inside a code fence. Plain text out of a fence
pastes unformatted into Notion Calendar, which is the whole problem the format
exists to avoid.

Title line, then one bullet per ticket:

> **Red Thread V5 – Backlog batch <n> (<a few keywords>)**
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

The assistant creates the event directly on the user's Google **Personal**
calendar (the one Notion Calendar fronts) **every time a batch is pushed**,
to staging or production, without asking: Andre gave that as a standing
instruction on 2026-11-17 (see "Shipping a batch" below). Every Red Thread
event follows the same rules, whichever agent makes it (Andre, 2026-11-15):

- **Colour: purple**, Google Calendar `colorId` `"3"` (Grape). Every Red
  Thread work event is purple.
- **Title:** the title line above, without the bold: `Red Thread V5 – Batch
  <n> (<a few keywords>)`, or a named session such as `Red Thread V5 – First
  release (…)`. Sessions with no batch (Design, Marketing, Notion-only Ops)
  take their track's title from [docs/WORKFLOW.md](docs/WORKFLOW.md),
  "Logging by track".
- **Description in HTML**, one list item per ticket with its bold label, the
  same bullets as the chat recap:
  `<ul><li><b>Fixed:</b> …</li><li><b>Improved:</b> …</li></ul>`. Plain text
  ("* Fixed: …") shows unformatted. Nothing else in the body.
- **Time:** the real start and end of the work, in America/New_York, taken
  from real events (the first message or commit of the session, the push,
  merge or last handoff), never estimated. Don't overlap the user's own
  review blocks: start after them.
- **Which tool:** the Notion calendar tool sends the description as plain
  text and cannot set a colour, so set both with the Google Calendar
  connector (create the event there, or create it anywhere and then update its
  `description` and `colorId`, with notifications off). Check against an
  existing purple Red Thread event (for example "Red Thread V5 – Setup (UI
  audit, master backlog, V5 design epics)", 14 November 2026) if unsure.
- One event per session of work: a batch built overnight and the next
  morning's review fixes are two events, not one.

## Design, accessibility and interaction standards

These are the V3 standards and still describe the app. The V4 design system
(shadcn/ui, Vega style; see "Design system (V4)") replaces the visual tokens
and type below as it lands (Figma first, then code); the accessibility,
keyboard, focus, Escape, phone-history, reduced-motion and Spatial performance
rules carry over unchanged.

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
  spacing, radius, motion) and components. [docs/design-tokens.md](docs/design-tokens.md)
  maps every token in `src/index.css` to its Figma collection, variable or
  style (same name without the `--`, code syntax `var(--name)`); a new token
  gets its row there in the same change. Code mirrors the variables as
  design tokens in one place, with the same names; components use tokens,
  never raw values copied from a frame.
- **Figma leads** (Notion "Connect Figma to code and make Figma the source of
  truth", 2026-11-17). The [Red Thread – Design System](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P)
  file holds the variables, icons and a component for everything the app
  draws; [docs/figma-library.md](docs/figma-library.md) maps each component
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
    [docs/design-tokens.md](docs/design-tokens.md), in the same change.
  - All Red Thread Figma files live in the AFR team folder
    https://www.figma.com/files/folder/683084303; create new ones there.
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
- **Keeping the library whole** (Andre, 2026-11-19; the details are in
  [docs/figma-library.md](docs/figma-library.md), "Upkeep"):
  - Screens and other files use only library instances. Posters are the
    library's Poster set: every poster slot holds a nested Poster instance,
    and a screen picks the title. Never paste an image over a slot, since
    a pasted image never takes library updates.
  - **Promote what is approved.** Once a design is approved, before its code
    ships, it goes into the library (a component, or a variant or property of
    an existing one) and then into the App Screens frames that show it. The
    ticket holds a "Figma: library + App Screens updated" item until both
    are done. Andre publishes; after each publish, check that it went through
    (each changed asset reads Current) and which files have updates waiting.
  - **Retired components** move to their page's gray "Retired" section,
    never among the live ones, with the date and their replacement in the
    description. Delete them once no file uses them.
  - **Explorations are archived once a direction ships**: save a named
    version, then move the pages under an "Archive" divider, with one note
    naming the chosen direction and linking the ticket and the component.
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

**American English spelling everywhere** (Andre, 2026-11-16): the app's
English strings, code comments, token and class names, commit messages,
CHANGELOG entries, docs, Notion tickets, calendar events and chat replies.
Write "color", "gray", "center", "favorite", "behavior", "canceled",
"catalog", not the British forms. Existing text and names are not renamed in
passing (a rename of a token or hook is its own change); new and edited text
follows the rule.

**One name per idea:** [docs/glossary.md](docs/glossary.md) lists the name
each idea takes in English and Portuguese (Connections, Titles, Guides, Seen,
Unseen, Watchlist / "Quero ver", Story order, Phase 1, Tomatometer…) and the
names that must not come back. Check it before writing a string, and add a
row when you name something new. Errors a visitor sees are plain sentences
and never name a library, service or error code; the detail goes to the
console.

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
titles into a lens, taken when the filter changes: docs/decisions.md).

## Deferred work and constraints

- **Phase 6, email/password accounts:** Deferred. It waits on a custom domain
  (for reliable transactional email) and on its own plan and explicit
  approval. Do not add forms, recovery handlers or SMTP settings before then.
- V5's look and feel, UX/UI and branding work are Version = V5 tickets in
  the Notion master backlog. V6 tickets and unversioned ideas stay Deferred
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

Claude and Codex take turns in the same `version/5.0` worktree
(`red-thread-wip`).
Uncommitted changes are the hand-off point; the Notion claim says who holds
which ticket. When asked to review the other agent's work, read only
(`git diff`) and report. Edit only if the user asks.
