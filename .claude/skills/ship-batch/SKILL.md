---
name: ship-batch
description: 'Ship a Red Thread batch: the checklist every push to staging (version/5.0) or merge to production (main) runs, unasked: the Batch check, the Figma gate, the full regression (on a frozen copy), the push and smoke test, CHANGELOG entries, closing the tickets, the calendar event and the recap. Use when Andre says to commit, push or merge a batch, or when a ticket sits in Ship approved.'
---

# Ship a batch

Moved verbatim from AGENTS.md ("Shipping a batch", the regression, the CHANGELOG and the merge to `main`), 2026-11-21. AGENTS.md keeps the approvals: never merge to `main`, tag or push without the approval each needs.

## The checklist

Andre, 2026-11-17: these steps are part of every push, not extras to be asked
for. When he says to commit or push a batch that is in Awaiting review
("commit Batch 12", "push it"), that is his approval of those tickets. Steps
0 and 1 come before the push; the rest follow it in the same turn, in this
order:

0. **Every ticket in the batch has its Batch**: query the board for
   Development tickets, and Ops tickets with commits, that are In progress,
   Awaiting review or Ship approved with an empty Batch, and fix them before
   anything else (the recap and the calendar event are built from it).
1. **Figma gate** (Andre, 2026-11-20: the library rules are always
   followed, not left to memory). For every ticket in the batch that
   changes how something looks:
   - its "Figma: library + App Screens updated" item is ticked: the
     component (or variant) is in the Design System and the App Screens
     frames that show it use it (the `promote-design` skill);
   - Andre has published, and each changed asset reads **Current**
     (`getPublishStatusAsync()`, [docs/figma-library.md](../../../docs/figma-library.md),
     "Upkeep"). Changed or Unpublished means it didn't go out: ask him to
     publish, and wait;
   - **tokens:** "check tokens against Figma" comes back with no
     differences, or only the known, documented ones (the `figma-tokens`
     skill).

   A ticket that fails the gate doesn't ship: fix it, or ask Andre whether
   to hold it back to the next push. Say on the ticket that the gate
   passed, or why the ticket changes nothing in Figma.
2. **Regression and push**: the full regression on the exact tree, then the
   push; smoke-test the deployed site (`SITE_URL=… node qa/smoke.js`) once
   Vercel reports the deploy.
3. **CHANGELOG**: one entry per ticket with the real time, saying where it
   went (staging, production).
4. **Close the tickets** (the `close-ticket` skill, "Complete"): Status
   Completed, ✅ icon, **Completed on** = the push time, the next
   **Completion order** numbers, **Latest commit** and every commit in the
   body. A parent closes when its last sub-item does. A ticket whose design
   shipped also has its explorations archived (Reconcile: "Explorations are
   archived once a direction ships", the `promote-design` skill) and its Trail's Reconcile line
   filled in.
5. **Calendar**: one purple event per session of work in the batch, created
   with the Google Calendar connector (the `log-session` skill). Check the calendar
   first so a batch never gets two events, and never misses one.
6. **Recap** in chat (the `log-session` skill).

A merge of an already-shipped batch to production repeats steps 2 and 3
(CHANGELOG: "merged to main"), checks that 4 and 5 were done, and does them
if they weren't. Before ending a turn that pushed anything, check all seven
(0 to 6).

## The full regression

  - **Once per batch, before pushing it to staging:** `bash qa/regress.sh`
    (65 check scripts in 67 runs plus the accessibility scan in English,
    Portuguese and English in the dark theme, about 9 minutes; it exits non-zero and marks failures with
    `!!`), on the final tree with nothing edited while it runs. Read the
    output, not just the exit code. A good run is **70 check runs clean**
    with no known failures. Only then: never just because a ticket or an
    epic is finished (Andre, 2026-11-15), so each ticket's handoff says the
    full run waits for the push.
    - **Keep working while it runs** on a frozen copy, because the runner
      reads each `qa/*.js` when that check starts, and an edit mid-run gives
      false failures. Record the tree first (`GIT_INDEX_FILE=<a copy of the
      index> git add -A && git write-tree`) so the handoff names what was
      tested. Then rsync the worktree to a scratch folder with anchored
      excludes (`/node_modules`, `/qa/node_modules`, `/dist`, `/.git`; an
      unanchored `dist` also drops `qa/vendor/**/dist`, which the checks
      need), symlink both `node_modules` back in, and run
      `QA_PORT_BASE=9300 bash qa/regress.sh` there. A `git archive` copy
      lacks `qa/node_modules` and the untracked `qa/vendor`: symlink those
      too, or every check exits with "Cannot find module 'playwright'".
      To stop a run, also kill its `node run.js --all`, which outlives
      `regress.sh`; confirm with `pgrep -fl "run.js --all"`.

## The smoke test

  - **After each push to staging, and after each merge to `main`:**
    `SITE_URL=<the deployed address> node qa/smoke.js` (about a minute)
    against the deployed site, once Vercel reports the deploy.
  Update checks in the same commit when you rename or restructure UI they
  rely on.

## CHANGELOG entries

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

## Before pushing, and merging to `main`

AGENTS.md keeps both, as safety rules: check the staged content and commit metadata before pushing ("Commits and CHANGELOG.md"), and merge to `main` only with Andre's approval for that merge, with the command in "Branches, deploys and approvals".
