# Repository instructions

The single shared rulebook for every agent working on Red Thread (formerly
MCU Connections; Claude Code, Codex, or any other). It assumes no chat history. `CLAUDE.md` only imports
this file. Put a new rule here if every session needs it, otherwise in
[docs/STANDARDS.md](docs/STANDARDS.md) or the skill it belongs to, and never
in an agent's memory. For the current state of the project, open
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

**This file is the core**: what every session needs. The rest of the
rulebook is linked, and is followed just the same:

- **[docs/STANDARDS.md](docs/STANDARDS.md)**: the stack and file layout,
  the design, accessibility and interaction standards, Figma, and the design
  system. **Read it before writing app code, changing the interface or
  working in Figma.**
- **Skills** in `.claude/skills/`, the step-by-step procedures. Claude Code
  runs them as skills; Codex and any other agent read and follow the same
  files.
  - [close-ticket](.claude/skills/close-ticket/SKILL.md): claim, hand off
    and close a ticket.
  - [ship-batch](.claude/skills/ship-batch/SKILL.md): every push and merge,
    unasked (the Batch check, the Figma gate, regression, push, CHANGELOG,
    closing, calendar, recap).
  - [log-session](.claude/skills/log-session/SKILL.md): the recap and the
    purple calendar event, after every push and every no-commit approval.
  - [promote-design](.claude/skills/promote-design/SKILL.md): an approved
    design into the library and App Screens; retire, archive.
  - [figma-tokens](.claude/skills/figma-tokens/SKILL.md) and
    [figma-components](.claude/skills/figma-components/SKILL.md): the
    Figma ⇄ code check.

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

## Code essentials

The full stack and file layout are in [docs/STANDARDS.md](docs/STANDARDS.md);
these are the rules that bite most often:

- **Every dependency is pinned exactly** (no `^`, no `~`); re-pin after the
  shadcn CLI adds a component.
- **TypeScript at full `strict`**: `npm run typecheck` green before handing
  work over. **Never add `any` or a new `@ts-nocheck` to reach green.**
- **The files talk through `window.*`** on purpose (15 QA checks read that
  surface); replacing it with imports is its own ticket, never done in
  passing. Keep `src/main.ts`'s import order.
- **Nothing in the app loads from `qa/`**, which is development-only.
- **Styles go on the components, with the design system's tokens**: no raw
  colors or sizes, no new stylesheet, and the type roles for every font size.

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
    `checks.json` ("regress" and the files it covers) in the same change.  - **Before a push**: the full regression (`bash qa/regress.sh`), never
    just because a ticket or an epic is finished, and the smoke test after
    the deploy: the `ship-batch` skill. Each ticket's handoff says the full
    run waits for the push.
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
  The released versions' branches and previews are listed in
  [docs/STANDARDS.md](docs/STANDARDS.md), "Released versions".
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
- Every committed change gets a CHANGELOG.md entry, with the real time from
  git (the format, and when it's written: the `ship-batch` skill).
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
    first. A ticket Andre has already approved (Ship approved, or in chat)
    counts as done here, even before the push completes it. If they are not
    done, skip to the next leaf ticket and say so.
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
- **Assigned to marks a claim**: a ticket you file but don't start leaves it
  empty, so the board shows what is really being worked (Andre, 2026-11-21).
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
  - **The current batch** and adding a missing Batch option: the
    `close-ticket` skill, "Choosing the Batch".
  - **A batch is a release chunk, not a set of tickets** (Andre, 2026-11-18):
    it is everything that ships in one push. Until the current batch is
    pushed, every ticket that ships as a commit and is claimed, created,
    reworked or held back for more work joins it, however late it was added. Never open a new batch for new
    tickets or to set work aside: the next batch starts only after the
    current one ships. If the user wants part of a batch to ship first, ask
    which tickets, and ship those as the current batch.
  - V6 tickets and unversioned ideas stay **Deferred**. Leave a
    ticket without a Version unless it says which one it is for; guessing a
    version for an idea nobody has scheduled is worse than leaving it blank.
- Read the whole ticket page, **including any screenshots or images**: fetch
  the page with its file URLs and look at each image before deciding what the
  ticket means. If the **Figma** field holds links, read those frames with the
  Figma MCP as well, annotations included (see "Figma" below). New requests
  from the user in chat become tickets first.- **Claiming, handing off and closing** a ticket (the fields to set, the
  Trail, Awaiting review, the commit, Completed on, Completion order, the ✅,
  and closing a ticket with no commit): the `close-ticket` skill.
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
    has already cleared — commit and push it, then complete it.- Completing a ticket on staging is not approval to merge to `main`.

## Shipping and logging

- **Every push and every merge runs the `ship-batch` skill**, unasked
  (Andre, 2026-11-17): when he says to commit or push a batch that is in
  Awaiting review, that is his approval of those tickets. Before the push,
  every ticket has its Batch and passes the Figma gate; after it, the
  CHANGELOG, closing the tickets, the calendar event and the recap, in the
  same turn. Before ending a turn that pushed anything, check all of it.
- **Every session gets its purple calendar event and a recap**, on every
  track: after a push, and when Andre approves a ticket that doesn't ship as
  a commit. The `log-session` skill; [docs/WORKFLOW.md](docs/WORKFLOW.md),
  "Logging by track", says when.
- **Figma**: Figma leads, the library is kept whole, and nothing is written
  to the Figma files unless the ticket or the user asks
  ([docs/STANDARDS.md](docs/STANDARDS.md), "Figma"; the `promote-design`,
  `figma-tokens` and `figma-components` skills).

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

User-facing text is translated, never hard-coded: how to add a string, show
titles and character names, and keep title ids and the Spatial invariants
is in [docs/STANDARDS.md](docs/STANDARDS.md), "Translated text".

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
