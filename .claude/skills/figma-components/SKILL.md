---
name: figma-components
description: 'Compare the Red Thread – Design System''s components and the App Screens frames with the running app, and report what differs (report only). Use when asked to "check components against the app", "check App Screens", or for the whole "check Figma against the code" (with the figma-tokens skill), at Reconcile when a ticket closes, and before a batch whose tickets changed how something looks.'
---

# Figma ⇄ code check, part 2: components and App Screens

Part 1 (tokens) is the `figma-tokens` skill. This part compares what is
built from the tokens: the library's components and the App Screens frames.
It only reports; nothing in Figma or the code changes without the user's yes.

Needs: the dev server (`npm run dev`, http://localhost:8126/: the capture
reads `/tools/figma/` from it), the QA checks' Playwright (`bash qa/setup.sh`
once per machine), and the Figma MCP (load the figma-use skill first). Save
every JSON to a scratch folder outside the repository.

## 1. Components

1. **App side.**
   `node tools/figma/components-capture.mjs > <scratch>/code.json`
   It opens each entry of `tools/figma/components.json` in headless Chromium
   (desktop 1440 × 900, or phone 390 × 844), with a seeded collection, and
   reads the element with `capture-dom.js` into a fingerprint
   (`components-fingerprint.mjs`: size, layout, padding, gap, radius, fill,
   border, shadow, and the color tokens, text sizes/weights and icons used
   inside).
2. **Figma side.** `create_session` on the Design System
   (`P92ZRC9X0R6WoCmoB8MG8P`), then one `use_figma` call whose code is
   `const ENTRIES = <the "entries" array of tools/figma/components.json>;`
   followed by the whole text of `tools/figma/components-dump.js`. Save what
   it returns as `<scratch>/figma.json`. It only reads.
3. **Compare.**
   `node tools/figma/components-check.mjs <scratch>/figma.json <scratch>/code.json`
   Exit 0: every component agrees. Otherwise it lists, per component, each
   property that differs with Figma's value and the code's.

How to read it:

- Figma's translucent tokens (`background-glass`, `border-soft`…) count as
  the code's token at an opacity; every `phase-N` counts as one "phase"
  color, since the phase depends on the title shown.
- A difference in what's **shown** (a guide in progress against one not
  started) means the entry needs a state: give it `seen` titles in
  `components.json`, or a different element.
- A real difference is one of two things: Figma is behind the code (the
  app changed after the component was built), or the code drifted from an
  approved design. Say which it looks like; the fix is a library update
  (the user's OK, then Andre publishes) or a code ticket.

## 2. App Screens

1. **Structure.** On the App Screens file (`FBDC4AxFAi5gyABtpdJM8Z`), one
   `use_figma` call per page, `Desktop` and `Phone` (a call loads one page):
   `const PAGE = 'Desktop';` followed by the whole text of
   `tools/figma/screens-dump.js`. Save each result, then
   `node tools/figma/screens-check.mjs <scratch>/desktop.json <scratch>/phone.json`
   It checks that every frame in `tools/figma/screens.json` exists and is
   built only from current library instances (no retired, local or missing
   components, no layers drawn by hand beyond the frame's `loose`
   allowance), and that every frame on the pages is listed.
2. **Against the app, by eye.**
   `node tools/figma/screens-capture.mjs <scratch>/shots` screenshots the app
   at each frame's `url`, Light and Dark, as `<frame id>.png`. For each, get
   the frame with the Figma MCP's `get_screenshot` and look at the two side
   by side. Report what a person would see as different: a missing or extra
   element, a different layout, color, type or state. Data (which titles,
   counts, posters) and scroll position aren't differences. Frames with no
   `url` (menus and dialogs open) are compared by hand or skipped; say which.

## 3. Report

One list: the components that differ (with the check's lines), the screens'
structural problems, and what the screenshots show. For each, say what to
change and where (library, App Screens, or code). Change nothing without a
yes. Each fix of the library or App Screens is a write to Figma (the user's
OK) and Andre publishes afterwards; a code fix is a ticket.

## Keeping it current

- A component that gets a place the check can reach gets a row in
  `tools/figma/components.json` (its node id from `docs/figma-library.md`,
  a selector, and `size`). Components in dialogs, menus and sheets need a
  state the capture can't open yet: they're listed in the library map only.
- A new or moved App Screens frame gets its row in `tools/figma/screens.json`.
- Change the fingerprint in both `components-fingerprint.mjs` and
  `components-dump.js`.
