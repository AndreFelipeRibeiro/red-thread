---
name: close-ticket
description: 'Claim, hand off and close a Red Thread ticket in the Notion master backlog: the claim''s fields, the Trail, Awaiting review, recording commits, and completing a ticket (Completed on, Completion order, the ✅), with or without a commit. Use when taking a ticket, handing one over, or closing one after Andre''s approval.'
---

# Claim, hand off and close a ticket

Moved verbatim from AGENTS.md ("Backlog workflow"), 2026-11-21. AGENTS.md keeps which ticket to take, the fields, Track and Batch, and the approval flags.

- Claim: set Assigned to = your agent, Status = In progress, **Version and
  Batch** (Batch only on a track that takes one; set Track too if it is
  empty) in the same update, then re-read the record to confirm no one else
  holds it and that they are all set. Work on one ticket at a time; claim
  the next only when the current one is handed off. A record ticket (one
  that tracks other tickets as they go, such as a pilot) doesn't count.
- **Trail:** a ticket that goes through Explore or Design keeps a `## Trail`
  section near the top of its page, with one line per stage, and its work
  is named by the ticket's short name ([docs/WORKFLOW.md](../../../docs/WORKFLOW.md),
  "The paper trail"). Add your stage's line, with its links, when you
  finish that stage. The **Figma** field holds only the selected frame.
- Ready: Status = Awaiting review. The page body keeps the request, the
  changes, the verification actually done and the remaining limits. A
  ticket that changes how something looks has its "Figma: library + App
  Screens updated" item ticked first (the Figma gate in the `ship-batch` skill
  checks it again before the push).
- Pushed for review: record the commit in **Latest commit** and the page body;
  the ticket stays Awaiting review until the user approves it.
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
- Tickets that don't ship as a commit (Design, Marketing, Notion-only Ops)
  still need the user's review. They close on his approval: Completed, ✅,
  Completed on = the approval time, the next Completion order, no Batch and
  no commit, and the session's calendar event in the same turn
  ([docs/WORKFLOW.md](../../../docs/WORKFLOW.md), "Logging by track"). Completing a
  ticket on staging is not approval to merge to `main`.

## Choosing the Batch

Moved verbatim from AGENTS.md ("Backlog workflow", Version and Batch). Only a ticket that ships as a commit takes a Batch; a batch is a release chunk (AGENTS.md keeps both rules).

  - **The current batch** is the one after the highest Batch on a Completed
    ticket of this version. If its option is missing from the Batch property,
    add it first (the schema change lists every existing option, so none is
    lost; the colors cycle brown, orange, yellow, green, blue, purple, pink,
    red, gray), then claim. A missing option is never a reason to leave Batch
    empty.
  - Batches restart at **Batch 1** for each version, so a batch is named by
    Version and Batch together (V5 Batch 1 is not V4 Batch 1). Add the next
    Batch option only when a version needs one it does not have. Tickets
    closed together in one approval share a batch.
