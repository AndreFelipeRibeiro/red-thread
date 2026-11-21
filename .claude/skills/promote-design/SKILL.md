---
name: promote-design
description: 'Keep the Red Thread Figma library whole: promote an approved design into the Design System and App Screens before its code ships, check that Andre''s publish went through, retire replaced components, and archive explorations once a direction ships. Use at the Library stage of a ticket with Design approved, and at Reconcile when it closes.'
---

# Promote an approved design, and keep the library whole

Moved verbatim from AGENTS.md ("Figma", "Keeping the library whole"), 2026-11-21. How each step is done in Figma (posters, publish status, the Retired section, the Archive divider): [docs/figma-library.md](../../../docs/figma-library.md), "Upkeep". Writing to the Figma files needs the ticket or the user to ask for it (docs/STANDARDS.md, "Figma"); Andre publishes.

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

Then:

- Tick the ticket's "Figma: library + App Screens updated" item and fill in
  the Library line of its Trail (component and frame links, the publish date).
- Run "check components against the app" (the `figma-components` skill) for
  the components you changed, and "check tokens against Figma" if a variable
  changed (the `figma-tokens` skill).
