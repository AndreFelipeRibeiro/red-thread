---
name: log-session
description: 'Log a Red Thread session: the recap in chat and the purple Google Calendar event (HTML bullets, real times, no overlaps, one title per track). Use after every push, and every time Andre approves a ticket that doesn''t ship as a commit.'
---

# Log a session: the recap and the calendar event

Moved verbatim from AGENTS.md ("Recap after each approval"), 2026-11-21. When each track's event is made, what a session is and how to avoid overlaps: [docs/WORKFLOW.md](../../../docs/WORKFLOW.md), "Logging by track".

When the user approves and closes a ticket or batch, reply with a recap they
paste into the Notion Calendar event. Write it as **ordinary chat text, with
real Markdown bold** — not inside a code fence. Plain text out of a fence
pastes unformatted into Notion Calendar, which is the whole problem the format
exists to avoid.

Title line, then one bullet per ticket:

> **Red Thread V5 – Batch <n> (<a few keywords>)**
>
> - **Accent search:** search matches with or without accents ("Capitao" finds "Capitão").
> - **Workflow playbook:** one written loop from idea to production: nine stages, four tracks, who approves what.

- The title carries the version, the batch number and a short keyword phrase
  saying what the batch was about.
- **One bullet per ticket**, opening with one or two bold words that name
  what it is about (its subject, usually the ticket's short name), then a
  colon and what changed, in the user's terms rather than the
  implementation's (Andre, 2026-11-21: the subject, not the kind of change,
  is what he scans for). One line each, about 20 words.
- **Order:** what changed in the app first, then design, then process and
  tooling.
- No date, duration or commit-count line in the body: the calendar event
  itself holds the time.

Times quoted anywhere else are America/New_York and come from real events
(when work started on the batch, when it was pushed or merged).

The assistant creates the event directly on the user's Google **Personal**
calendar (the one Notion Calendar fronts) **every time a batch is pushed**,
to staging or production, and **every time Andre approves a ticket that
doesn't ship as a commit** (Design, Marketing, Notion-only Ops), without
asking: Andre gave that as a standing instruction on 2026-11-17 (the `ship-batch`
skill), extended to every track on 2026-11-21. When each
track's event is made, what a session is, and how to avoid overlaps are in
[docs/WORKFLOW.md](../../../docs/WORKFLOW.md), "Logging by track". Every Red Thread
event follows the same rules, whichever agent makes it (Andre, 2026-11-15):

- **Colour: purple**, Google Calendar `colorId` `"3"` (Grape). Every Red
  Thread work event is purple.
- **Title:** the title line above, without the bold: `Red Thread V5 – Batch
  <n> (<a few keywords>)`, or a named session such as `Red Thread V5 – First
  release (…)`. Sessions with no batch (Design, Marketing, Notion-only Ops)
  take their track's title from [docs/WORKFLOW.md](../../../docs/WORKFLOW.md),
  "Logging by track".
- **Description in HTML**, the same bullets as the chat recap, each bold
  subject linking to its Notion ticket:
  `<ul><li><a href="<ticket URL>"><b>Accent search</b></a>: …</li></ul>`.
  Plain text ("* Accent search: …") shows unformatted. Nothing else in the
  body.
- **Time:** the real start and end of the work, in America/New_York, taken
  from real events (the first message or commit of the session, the push,
  merge or last handoff), never estimated, even when it overlaps Andre's
  own events (Andre, 2026-11-21). When Andre made a placeholder for the
  same work (a Red Thread event of his own, such as "Red Thread:
  Workflow"), edit it into the log instead of making a second event: the
  title, purple, the real start and end, the bullets, and any notes of
  his kept below them. Never delete his events, and leave the rest of his
  calendar as it is.
- **Which tool:** the Notion calendar tool sends the description as plain
  text and cannot set a colour, so set both with the Google Calendar
  connector (create the event there, or create it anywhere and then update its
  `description` and `colorId`, with notifications off). Check against an
  existing purple Red Thread event (for example "Red Thread V5 – Setup (UI
  audit, master backlog, V5 design epics)", 14 November 2026) if unsure.
- One event per session of work: a batch built overnight and the next
  morning's review fixes are two events, not one.
