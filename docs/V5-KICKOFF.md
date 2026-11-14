# Red Thread V5 — kickoff brief

Written 2026-11-14, when V5 was set up. This is the starting brief for Claude
Code (and Codex) on V5. [AGENTS.md](../AGENTS.md) stays the rulebook; this file
explains what V5 is, where it lives and the order to work in. Update it as V5
decisions are made, and record each decision in [decisions.md](decisions.md).

## What V5 is

V4 is finished and live: Batch 8 was merged to production on 2026-11-08
(`d11d5b5`), and `main`, `version/4.0` and `version/5.0` all started from that
commit. V4 gave the app its build step (Vite, TypeScript), the shadcn/ui
design system on Base UI, Light / Dark / Auto, the rename to Red Thread and a
work-in-progress logo.

V5 is a **look-and-feel release**: visual design, UX/UI and interaction
design, and branding. Andre is still writing its scope and tickets; this
section gets the agreed goals and non-goals once they exist. Expected themes,
to confirm:

1. **Art direction from Figma.** The customising pass V4 deferred: the app's
   own colour, type, spacing, radius, elevation and motion, as Figma variables
   mirrored in code tokens (`src/index.css`), replacing shadcn's Vega defaults.
2. **Brand.** A finished Red Thread identity (logo, wordmark, icons, link
   previews and share cards, the startup screen) in place of the
   work-in-progress logo.
3. **UX improvements** across Spatial, List / Grid, the details drawer, phone
   sheets, dialogs and guides.

Not V5 (unless Andre moves it in): catalog or data-model changes, new
platforms, email/password accounts (Phase 6, still deferred).

Andre is a designer and creative director. He owns the art direction and the
Figma file; agents own faithful, accessible implementation and say plainly when
a design choice conflicts with accessibility, performance or localisation.

## Where everything is

| What | Where |
|---|---|
| V5 code | Branch `version/5.0`, folder `Red Thread/red-thread-wip` (a linked worktree of `Red Thread/red-thread-live`) |
| V5 preview | https://red-thread-git-version-50-afr-bfcd.vercel.app/ |
| Production | `main` → https://redthread.tv/ (V4), folder `red-thread-live` (merges and hotfixes only) |
| V4 (history) | Branch `version/4.0`, tags `v4.0` and `v4-final`, preview https://red-thread-git-version-40-afr-bfcd.vercel.app/ |
| Vercel | Project `red-thread` (team `afr-bfcd`), built by Git integration from the committed `vercel.json` |
| Local dev | `npm run dev` / `npm run preview` on http://localhost:8126/ (strict port; Google sign-in only works there). One folder's server at a time: both folders use the port. TMDB token for `tools/refresh-watch.js` in the gitignored `.env`. |
| Backlog | Notion **Red Thread - V5** → **V5 Tasks** (not created yet; until then, Version = V5 tickets on V4 Tasks) |
| Figma | Figma MCP, registered in `.mcp.json`; the V5 file is linked from the Notion V5 page once it exists |
| Next major version | Notion **New Major Version Checklist** (https://app.notion.com/p/40a9e188029f811a85e4c6e333dd8c0b) |

`red-thread-wip` is a linked worktree of the `red-thread-live` checkout.
Sandboxed shells may report it as "prunable". It is not: never run
`git worktree prune`. The two folders replaced `MCU Connections`, `MCU-V3`,
`MCU-V4` and `Red Thread (V5)` on 2026-11-14 (docs/decisions.md).

## First session checklist

Do these in order and report the result of each. Stop and ask when something
does not match.

1. **Check the worktree.** `git status -sb` should show
   `version/5.0...origin/version/5.0`, with the V5 setup changes uncommitted
   until Andre approves them: `AGENTS.md`, `README.md`, `package.json`,
   `package-lock.json`, `docs/decisions.md`, `docs/HANDOFF.md` and this file.
2. **Connect Figma.** Approve the project's `figma` server when Claude Code
   asks, then `/mcp` → **figma** → **Authenticate** → **Allow access**.
3. **Ship the setup (after Andre approves).** One commit with those files and
   a CHANGELOG entry (`## V5 maintenance — V5 workspace setup`, real time
   from git), pushed to `version/5.0`. That push creates the V5 preview. Once
   Vercel reports the deploy, run
   `SITE_URL=https://red-thread-git-version-50-afr-bfcd.vercel.app/ node qa/smoke.js`.
4. **Tell Andre what he must do outside the code** (below), then take the top
   ticket on the V5 Backlog.

## Order of work

Each phase is a ticket (or a few) and needs Andre's approval before code.
Propose, don't start.

1. **V5 plan (`docs/V5-PLAN.md`)**, for review before any app code: goals and
   non-goals, what "done" means for the release to `main`, how Figma variables
   map to `src/index.css` tokens (names, both themes), which surfaces change
   and in what order, visual QA (screenshot comparisons at desktop and phone
   sizes, English and Portuguese, WCAG AA contrast), and risks (the Spatial
   canvas's iOS memory rules, Escape/focus behaviour, text-size scaling,
   localisation, link previews built at build time).
2. **Foundations**: tokens from the V5 Figma file, then core components.
3. **Surfaces**, one ticket each with frames linked, compared against the
   frame in a real browser.
4. **Brand**: logo, icons, link previews and share cards, startup screen.
5. **Release plan** and the merge to `main` (explicit approval only).

## Andre's to-do (outside the code)

- ~~Add the V5 preview to sign-in~~ — done 2026-11-14 (Google Cloud → Web
  client 1 → Authorized JavaScript origins:
  `https://red-thread-git-version-50-afr-bfcd.vercel.app`; Supabase → Redirect
  URLs: `https://red-thread-git-version-50-afr-bfcd.vercel.app/`). Try Google
  sign-in, sync and sign-out on the preview once.
- Create the Notion **Red Thread - V5** page and **V5 Tasks** board (or ask an
  agent to, following the checklist), and port the V5 tickets from V4 Tasks.
- Create the V5 Figma file and link it on the Notion V5 page.
- Open `red-thread-wip` in Codex if Codex will work on V5.
- Update the Notion **New Major Version Checklist** for the two-folder setup
  (no new folder per version; `red-thread-wip` switches branch) and the
  `red-thread-*` preview names.

## Open decisions

- V5 scope, goals and release criteria (Andre is writing them).
- Whether V5's art direction keeps shadcn/ui on Base UI as the component base
  (restyled through tokens) or changes it.
