# Workflow playbook

How any change to Red Thread moves from an idea to production and back:
the stages, the tracks, who does what, and where each piece of work lives.
This file is the source of truth for the process. [AGENTS.md](../AGENTS.md)
holds the rules for carrying out each step (commits, QA, Figma upkeep,
calendar format) and links here rather than repeating it.

Agreed with Andre on 2026-11-20 (Notion epic "Workflow playbook: one
end-to-end, two-way process from idea to production"). The stage
descriptions and decisions below use his wording from that epic.

## The loop

Nine stages, each with a name, so a ticket, a Figma page or a chat can say
exactly where a piece of work stands.

1. **Idea:** a ticket, with the placement check.
2. **Explore:** usually lo-fi prototypes in Claude Design, but not a hard
   rule: some ideas are better explored straight in hi-fi.
3. **Design:** hi-fi in Figma, built from the library. There's no mid-fi
   stage now that the library exists and chat can use it. Each exploration is
   versioned, and the selected one is clearly marked.
4. **Design approved:** Andre signs off. The ticket records the frame link
   and the version.
5. **Library:** the approved design is promoted to the library and App
   Screens, and Andre publishes. Always followed.
6. **Build:** the code follows the library. Always followed.
7. **Ship:** batch, staging, Andre's review, merge.
8. **Reconcile:** a drift check from code to Figma, and explorations
   archived.
9. **Log:** CHANGELOG, closing the Notion ticket, the calendar event.

It is two-way. Figma leads a change to the look (stages 3 to 6). When code
changes how something looks without a design first (a fix, a new state),
the Figma component is updated in the same ticket (AGENTS.md, "Figma").
Reconcile catches whatever slipped through.

### What each stage produces

| Stage | Produces | Lives in | Moves on when | Ticket status |
| --- | --- | --- | --- | --- |
| Idea | A ticket: the request, why, done when; Track; placement (parent epic or standalone) | Notion master backlog | Someone claims it (top of the Backlog column first) | Backlog |
| Explore | Options to compare, named A, B, C…, each round versioned (see "The paper trail") | Claude Design (a claude.ai artifact), or straight in Figma Explorations | Andre picks a direction, written in the ticket's Trail | In progress |
| Design | Hi-fi frames built from library instances, each exploration a named Figma version, the selected one marked; behavior as Dev Mode annotations | Figma Explorations file | Andre reviews it | In progress, then Awaiting review |
| Design approved | Andre's sign-off; the ticket's **Figma** field holds the exact frame (`node-id` link) and the body names the approved version | Notion ticket | Andre sets it | **Design approved** |
| Library | The design as a component, variant or property in the Design System, then in the App Screens frames that show it; Andre publishes; each changed asset reads Current | Figma Design System, App Screens | Publish checked; the ticket's "Figma: library + App Screens updated" item is ticked | Design approved |
| Build | Code that follows the library and tokens (when the design changed a variable, the Figma ⇄ code check brings it into the code first); the ticket's QA check; Awaiting review with what was verified | `red-thread-wip`, uncommitted | Andre approves that revision | Awaiting review, then **Ship approved** |
| Ship | A commit, the batch pushed to V5 staging after the Figma gate (library and App Screens updated and published, each changed asset Current, tokens in sync), regression and smoke test, Andre's review on staging, the merge to `main` with his approval | GitHub, Vercel | Pushed (staging) or merged (production) | Ship approved |
| Reconcile | The Figma ⇄ code check's report (tokens, components and App Screens), each difference fixed or ticketed; explorations archived (a named version, pages under the Archive divider, a note naming the choice) | Figma, Notion | Nothing drifts that isn't ticketed | — |
| Log | The CHANGELOG entry, the ticket closed (Completed, ✅, Completed on, Completion order, commits), the calendar event, the recap in chat | Repo, Notion, Google Calendar | Done | Completed |

Explore and Design are skipped when there's nothing to design: a bug fix
that doesn't change the look, a data change, a workflow change. Library and
Build are never skipped for work that changes how the app looks.

### The paper trail

Each tool keeps its own files, so a ticket that goes through Explore or
Design carries a map of where its work lives. Without one, finding the idea,
the prototypes, the explorations and the approved version means searching.

**A Trail section on the ticket.** It is a `## Trail` heading near the top of
the page body, with one line per stage. Whoever finishes a stage adds its
line in the same session, with links and dates. A stage that was skipped
says so, and a stage not reached yet stays "—".

```
## Trail
- Idea: <who, date, where it came from>
- Explore: <Claude Design link> · explore v1 (date) · explore v2 (date) · direction <letter> picked (date): <link to its artboard>
- Design: <Figma page link> · frames A · v1, B · v1… · ✓ Selected: <frame link>
- Design approved: <frame link> · version "<short name> · approved YYYY-MM-DD"
- Library: <component links> · App Screens <frame links> · published (date)
- Build: <commits> · Batch <n>
- Reconcile: Figma ⇄ code check (date) · explorations archived (date)
```

**Names.** Every name starts with the ticket's **short name**: its title up
to the colon ("Phone Explore", "Titles headings").

| What | Where | Name |
| --- | --- | --- |
| Claude Design prototype | claude.ai | `<short name> · explore v1`, then `v2`… for each round |
| Explorations page | Figma Explorations (HI-FI), one page per ticket | `<short name>` |
| Exploration frames | On that page | `A · v1`, `B · v1`…; a new round of the same option is `A · v2` |
| The chosen frame | On that page | Its name gets ` · ✓ Selected` added (`B · v2 · ✓ Selected`) |
| Approved version | Figma's version history of the Explorations file | `<short name> · approved YYYY-MM-DD` |
| Archived page | Below the Archive divider, once it ships | `Archive · <short name> · approved YYYY-MM-DD` |

**Link to the picked option, not just the canvas.** A Claude Design canvas
opens on one artboard when its link ends in `#artboard-<file name without
.dc.html>`, for example
`https://claude.ai/artifact/LYLoGn8jQpWy2VGDjG8LMd#artboard-DetailsFirst`
(`#play-<name>` plays its flow instead). The link opens the canvas's
current version; there is no known link to an older one, which is why
each round is named `explore vN`, and a round that has to survive later
edits is kept as its own artboard (`E · v1`, `E · v2`) rather than
overwritten.

**The ticket's Figma field** holds only the selected frame (a `node-id`
link). Claude Design links, other options and earlier rounds go in the
Trail, never in that field.

## Tracks

Every ticket has a **Track**. Design-only, Notion-only, build and marketing
work share one backlog, and the Track says which stages a ticket goes
through, what "done" means, and how its session is logged.

| Track | What it covers | Stages | Done when | Batch |
| --- | --- | --- | --- | --- |
| **Development** | Anything that changes the app: features, fixes, the look in code | All nine, skipping Explore and Design when nothing is designed | Shipped (pushed, then merged), and logged | Yes, always |
| **Design** | Design work whose deliverable is in Figma: explorations for a direction, the library and App Screens, brand | Idea, Explore, Design, Design approved, Library, Reconcile (archive), Log | Andre approves the design; it is promoted to the library where it applies, archived, and logged | No |
| **Marketing** | Promo videos, social images, launch material | Idea, Explore, Design, Design approved, Log | Andre approves the final asset and it is delivered where it goes | No |
| **Ops** | How we work: the playbook, AGENTS.md, skills, QA tooling, Notion and Figma housekeeping | Idea, Build, Ship (only when it changes the repo), Log | Repo changes: shipped. Notion-only: Andre approves it | Only when it changes the repo |

A Development ticket that needs design keeps that design on the same ticket. It
goes through Design approved and then on to Build (decision, 2026-11-20). A
Design ticket is for design that isn't built on that ticket. When its
outcome needs code, the build is written as Development tickets under it, as
the Phone Explore direction was.

### Batches

**A batch is a release: a ticket takes a Batch only if it ships as a
commit** (Andre, 2026-11-21). That means every Development ticket, and Ops
tickets that change the repo. Design and Marketing tickets never take a
Batch, and neither do Notion-only Ops tickets. They have their own
definitions of done, so design work is never held to a release's timing.

The rest of the batch rule stands (AGENTS.md, "Backlog workflow"). The
current batch is the one after the highest Batch on a Completed ticket.
Every ticket that ships in the next push joins it, however late, and a new
batch starts only after the current one ships. Every ticket, whatever its
track, takes a **Version** once it is scheduled.

### Logging by track

Every session of work gets one purple calendar event, with the same format
rules as a batch (AGENTS.md, "Recap after each approval"). Only the title
changes:

| Track | Event title |
| --- | --- |
| Development, and Ops in the repo | `Red Thread V5 – Batch <n> (<keywords>)` |
| Design | `Red Thread V5 – Design (<keywords>)` |
| Marketing | `Red Thread V5 – Marketing (<keywords>)` |
| Ops, Notion-only | `Red Thread V5 – Ops (<keywords>)` |

When each kind of session is logged, and by whom, is set by the Notion
ticket "Logging for every track".

## Approvals

Andre is the only one who approves, and each approval covers one thing:

| Approval | Means | How it's given |
| --- | --- | --- |
| **Design approved** | The design is signed off. Build may start once it is in the library | The status, set by Andre, or in chat |
| **Ship approved** | That revision of that ticket may be committed and pushed to staging | The status, set by Andre, or in chat |
| **Merge** | That batch may go to `main` (production) | In chat, each time |
| **Tag** | A version tag may be created and pushed | In chat, each time |
| **Library publish** | Andre publishes the Design System himself | In Figma |

No approval carries over to a new revision, a later batch or another ticket.

## Who does what

| Job | Andre | Claude in chat | Claude Code | Codex |
| --- | --- | --- | --- | --- |
| Write ideas as tickets | Yes | Yes | Yes | Yes |
| Set priority (Backlog order) | **Only Andre** | — | — | — |
| Explore (lo-fi) | Reviews, picks | Claude Design prototypes | Can publish prototypes as artifacts | — |
| Design (hi-fi in Figma) | Art direction, reviews | Builds from the library | Builds from the library (`tools/figma/`) | Through the Figma MCP |
| Design approved, Ship approved, merge, tag | **Only Andre** | — | — | — |
| Promote to library and App Screens | Publishes | Can build it | Builds it, checks the publish | Can build it |
| Build, QA, commit, push | — | — | Yes | Yes |
| Ship a batch (regression, push, smoke, CHANGELOG) | Approves | — | Yes | Yes |
| Reconcile (Figma ⇄ code check, archive) | Reviews | Archives explorations | Runs the check | Runs the check |
| Log (Notion close, calendar, recap) | — | For chat-only sessions | Yes | Notion yes, calendar to confirm |
| Promo videos | Direction | Workflow and tools (with Andre) | Renders and scripts in `promo-video/` | — |

### What each surface can do

| | Claude in chat (claude.ai Project) | Claude Code (desktop app) | Codex |
| --- | --- | --- | --- |
| Reads AGENTS.md | No: reads the Project's copy of the core rules | Yes (`CLAUDE.md` imports it) | Yes |
| Git, the Mac's shell, dev server, QA | No | Yes | Yes |
| Figma: read | Yes | Yes | Yes (Figma MCP) |
| Figma: write (frames, components, variables) | Yes | Yes (`use_figma`, `tools/figma/`) | Yes (`use_figma`) |
| Figma: upload images | To confirm | Yes (`upload_assets`) | To confirm |
| Capture the running app for Figma (`tools/figma/capture-dom.js`) | No | Yes | Yes |
| Notion | Yes | Yes | To confirm |
| Google Calendar (color and HTML description) | To confirm | Yes (Google Calendar connector) | To confirm |
| Claude Design | Yes | Artifacts only | No |

Rows marked "to confirm" are filled in once each surface has been checked.
A step a surface can't do goes to one that can, and the ticket says who
holds it.

Claude and Codex take turns in one worktree. Uncommitted changes are the
hand-off point, and the Notion claim says who holds which ticket
(AGENTS.md, "Working with another agent").

## Where work lives

| What | Where | Holds |
| --- | --- | --- |
| Backlog | Notion **Red Thread - Backlog/Tasks (MASTER)** (https://app.notion.com/p/4189e188029f809c9a95e8b91ae22bdf), board **All tasks** | Every ticket, every version; the record of each stage |
| Lo-fi prototypes | Claude Design (claude.ai artifacts) | Explore options, linked from the ticket |
| Hi-fi explorations | Figma [Red Thread – Explorations (HI-FI)](https://www.figma.com/design/v2yL8aeK8uyRfgUfhVm74z) | Design stage: versioned explorations, the selected one marked, archived once shipped |
| Earlier explorations | Figma [file `HFwjyn1zLiNJGSfGtSfrr3`](https://www.figma.com/design/HFwjyn1zLiNJGSfGtSfrr3) (pages 1–8: Navigation to Explore E) | V5's first explorations, from before the library; history |
| Design System | Figma [Red Thread – Design System](https://www.figma.com/design/P92ZRC9X0R6WoCmoB8MG8P) | Variables, styles, icons, a component for everything the app draws; map in [figma-library.md](figma-library.md) and [design-tokens.md](design-tokens.md) |
| App Screens | Figma [Red Thread – App Screens](https://www.figma.com/design/FBDC4AxFAi5gyABtpdJM8Z) | The key screens, only library instances, Light and Dark |
| Social media and link previews | Figma [Red Thread – Social Media and OG link preview](https://www.figma.com/design/K08JKKD172ulOhUobzWFMb) (formerly "Launch carousel") | The launch carousel, captures, mockups, "OG · Link previews" |
| Promo videos | Figma [Red Thread – Promo Videos](https://www.figma.com/design/OwiXe60JUJ6SK2GngrU89l); the `promo-video/` folder beside the repo | Storyboards and frames; captures, scripts and renders |
| Before V4 | Figma [Red Thread – Before (V4)](https://www.figma.com/design/iDkkTvrXqP08Kxrs3XMfVf) | The pre-V5 screens with audit notes; history |
| Code | GitHub `AndreFelipeRibeiro/red-thread`: `red-thread-wip` (`version/5.0`, staging), `red-thread-live` (`main`, production) | The app, its docs, the QA checks |
| Rules and context | [AGENTS.md](../AGENTS.md), this file, [HANDOFF.md](HANDOFF.md), [decisions.md](decisions.md), [glossary.md](glossary.md) | How to do each step; why things are as they are |
| Release history | [CHANGELOG.md](../CHANGELOG.md) | Every committed change, with real times |
| Time log | Google Calendar, Personal (fronted by Notion Calendar) | One purple event per session |

All Figma files live in the AFR team folder
(https://www.figma.com/files/folder/683084303).

## Still to come

These are the epic's other tickets. Each one fills in a part this file only
names:

- **Figma ⇄ code check 2/2:** components and App Screens, report only.
  Part 1/2, tokens, is the `figma-tokens` skill ("check tokens against
  Figma", "sync tokens from Figma"; AGENTS.md, "Figma"). It runs at Build
  when a variable changed, at the Ship gate and at Reconcile.
- **Logging for every track:** when and how each session is logged.
- **One rulebook everywhere:** memory's standing rules into AGENTS.md, and
  the core rules in the claude.ai Project.
- **Slim AGENTS.md:** a short core, with skills for the repeated procedures.
- **Pilot:** one real feature through the whole loop, with nothing done from
  memory.
