# Changelog

A backfilled record of the project through the current V3 maintenance branch.
Backfilled commit entries use **Git author timestamps**, converted to
America/New_York (EDT for these dates), including seconds. Entries labeled
**Recorded** identify the time the checkpoint was written, not an inferred
deployment time. Deployment checks are identified explicitly. This record was assembled from
commit messages, diffs, the planning/verification documents and user-reported
checks on 2026-10-24; it does not invent deployment times.

Each commit link opens its full message and exact diff. Early commits sometimes
landed related files separately; each is listed rather than implying those were
separate product releases. The merge checkpoint is included explicitly.


## V4 design — A pinned character's thread draws itself

Recorded: 2026-11-08 10:14 EST (-0500). Pushed to `version/4.0` (V4 staging).

Notion V4 Tasks, "Micro-interaction: a pinned character's thread draws
itself".

- Pinning a character strokes each segment of its thread in, one after another
  in the order its titles are laid out (about 0.8s in all), once the cards have
  landed. Hovering lights the thread at once, as before. Reduce motion: at
  once.
- test-micro: Tony Stark's 11 segments, staggered, none finished as the cards
  land, all finished 1.6s later; hovering draws nothing.
- README describes Batch 8's motion.
- Verified: test-micro; full Batch 8 regression on the final tree. Not tried on a real iPhone.

## V4 design — Up next slides to the next title

Recorded: 2026-11-08 10:14 EST (-0500). Pushed to `version/4.0` (V4 staging).

Notion V4 Tasks, "Micro-interaction: Up next slides to the next title when one
is marked seen".

- In all four Up next layouts, the title just marked slides out to the left
  (an inert copy, hidden from screen readers) while the next slides in from
  the right; the card keeps its size. Reduce motion: an instant swap.
- test-micro: desktop meter row and phone chip mid-slide, heights unchanged,
  then settled; nothing leaving with Reduce motion.
- Verified: test-micro; full Batch 8 regression on the final tree.

## V4 design — Cards a filter brings back fade in

Recorded: 2026-11-08 10:14 EST (-0500). Pushed to `version/4.0` (V4 staging).

Notion V4 Tasks, "Micro-interaction: cards fade softly when a filter changes".
A collection change already faded cards to and from their dimmed look; cards
that a type, phase, budget or Released filter brings back popped in.

- They now fade in over 300ms, opacity only (no per-card GPU layer). Not on
  first paint, nor when Spatial opens again from List. Reduce motion: none.
- test-micro: none on first paint or after List; Iron Man caught mid-fade
  coming back; a collection change caught mid-dim; at once with Reduce motion.
- Verified: test-micro; full Batch 8 regression on the final tree. Cards that a filter removes still go at
  once.

## V4 fix — The Seen / Watchlist counters finish their bump

Recorded: 2026-11-08 10:14 EST (-0500). Pushed to `version/4.0` (V4 staging).

Notion V4 Tasks, "Micro-interaction: the Seen check pops in and the Seen /
Watchlist counters tick". The pop and the counters' bump already existed, but
the counter's bump and number roll were cut off about 20ms in: its direction
was worked out on each render, so the next one dropped it.

- `CountBadge` keeps the direction until the bump ends (about 460ms now).
- test-micro: a List row's Seen plays the pop and the bump, still ticking
  250ms in; neither with Reduce motion.
- Verified: traced in the browser (23ms before, about 460ms after);
  test-micro; full Batch 8 regression on the final tree.

## V4 design — Guide meters fill smoothly

Recorded: 2026-11-08 10:14 EST (-0500). Pushed to `version/4.0` (V4 staging).

Notion V4 Tasks, "Micro-interaction: progress bars fill smoothly". The All
titles and phase meters already filled; the guide meters jumped.

- The guide card's and the phone dock's segments fade to their lit colour
  (260ms) and the Guides menu bars fill (600ms). Nothing animates on load.
- The phase meters' staggered light-up now respects the Reduce motion setting
  (the rule shortened animations but kept their delays).
- test-micro: the All titles bar is caught mid-fill after marking Up next; the
  guide segments carry their fade; neither with Reduce motion.
- Verified: test-micro; full Batch 8 regression on the final tree.

## V4 design — Icon buttons give a little when pressed

Recorded: 2026-11-08 10:14 EST (-0500). Pushed to `version/4.0` (V4 staging).

Notion V4 Tasks, "Micro-interaction: a press effect on icon buttons".

- Settings, guides and account buttons, stepper arrows, close buttons, zoom
  buttons, Seen / Watchlist, Up next and share buttons shrink to 92% while
  pressed and spring back (the separate `scale` property, so no button's own
  transform is touched). Disabled buttons don't react; Reduce motion: none.
- New check `qa/test-micro.js`, which holds all of Batch 8: pressed scale 0.92,
  released none, none with Reduce motion.
- Verified: test-micro; full Batch 8 regression on the final tree. Not tried on a real iPhone.

## V4 design — The selection slides in the toolbar's segmented groups

Recorded: 2026-11-02 22:54 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 7.

Notion V4 Tasks, "Interface animation: sliding selection in the segmented
controls, plus other micro-interactions". Picking another item in a group
now slides the selection across to it instead of switching it over.

- New `src/app/seg-pill.tsx`: one pill behind a group's buttons that measures
  the selected button and moves to it (300ms, the layout curve). It fits any
  language, Text size or compact toolbar step, settles without a slide on first
  paint and on resizes, and moves at once with Reduce motion.
- In sort, type, collection (desktop and phone), view, the character banner's
  mode switch, and the filter popover's Budget, Released and Order groups. The
  phase group keeps its own coloured pills.
- New check `qa/test-segpill.js`: on the selected button in every group in
  English, Portuguese and at Large text; mid-slide then aligned after a change;
  immediate with Reduce motion (setting and system); the phone row.
- Verified: those checks; measured the slide in headless Chromium; full Batch 7
  regression on the final tree. The other suggested micro-interactions are
  Batch 8.

## V4 improvement — D and L switch the theme on the phone layout too

Recorded: 2026-11-02 22:54 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 7.

Notion V4 Tasks, "D / L theme shortcut on the phone layout too". The keyboard
shortcut was off on the phone layout, so it did nothing in Chrome's device
preview or on a tablet with a keyboard.

- D and L now work on the phone layout, with the same rules (never while
  typing, in a menu or dialog, or with a modifier held), and screen readers
  hear the new theme there too.
- `qa/test-settings.js` expects the phone layout to switch, announce and switch
  back.
- Verified: test-settings; full Batch 7 regression on the final tree.

## V4 design — The work-in-progress Red Thread logo: push pin and wordmark

Recorded: 2026-11-02 22:54 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 7.

Notion V4 Tasks, "Apply the WIP Red Thread logo (push pin + wordmark) and
favicon". Andre's work-in-progress logo replaces the placeholder: a red push
pin and a "Red Thread" serif wordmark.

- `src/assets/logo-mark.svg` is now the pin, so every place that draws the mark
  follows: toolbar, phone app bar, Welcome/About, startup screen, share cards,
  link previews and icons. New `src/assets/logo-wordmark.svg` holds the
  lettering, drawn as a mask in the text colour, so one file serves light and
  dark. Both stay single files, so the next version is a swap.
- The toolbar and the phone app bar show pin and lettering in the designer's
  lockup proportions, at the same size on both (Andre found the first desktop
  size a bit big); the name stays as text for screen readers.
- New `--logo` token, the designer's `#c41e3a` in both themes, paints the mark;
  `--brand` stays for interface accents.
- Icons redrawn in the designer's "dark bg" favicon colours (red pin on navy),
  the pin larger than in the padded source file.
- Share cards and link previews keep the mark's shape (a tall mark was being
  stretched to a square).
- Verified: test-logo (pin sizes and colour, the wordmark's file, colour per
  theme, size, aria-hidden); looked at desktop light and dark, phone in
  Portuguese, 320px, the icons and the link preview; full Batch 7 regression on
  the final tree. Not checked: a real iPhone.

## V4 improvement — Stepping through a character or guide keeps the landing's zoom

Recorded: 2026-11-02 22:54 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 7.

Notion V4 Tasks, "Desktop Spatial: character and guide stepping zoom to 70%,
smaller than the landing". On a wide screen the landing opens at 100%, but
stepping through a pinned character or a guide landed every stop at a fixed
70% (a V3 floor tuned for laptops), so the cards felt small.

- Desktop stepping and the re-centring after a title's details close now use
  the landing's own reading zoom (about 7.5 titles across, capped at 100%):
  100% on windows 1,466px and wider, the landing's smaller zoom on narrower
  ones. A bigger zoom chosen by hand is kept. Phones unchanged.
- New check `qa/test-stepzoom.js`: 100% at 1600px and 87% at 1280px for
  character and guide steps, and a chosen zoom kept; `test-refocus` expects
  the reading zoom instead of 70%.
- Verified: the checks above, and in the browser at 1600 and 1280px; full
  Batch 7 regression on the final tree: 58 check runs clean. Not checked on Andre's own screen.

## V4 fix — test-camera no longer clicks a hidden card

Recorded: 2026-11-02 20:47 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 6.

Notion V4 Tasks, "test-camera fails intermittently". The check failed 3 runs in
4 on the unchanged Batch 5 commit: in its A → B step it picked Iron Man 3, a
card hidden outside A's ring, so the press hit empty canvas, closed A and left
nothing selected. The app was fine.

- `centerCard` skips `.ring-hidden` cards.
- The B click waits for the cards to stop moving, hovers, finds B where it now
  is and presses only when the pointer is on B; attempts are reported as
  `ringClickAttempts`, and a failed one says why.
- Verified: 20 runs in a row, 20 passed on the first click; full Batch 6
  regression on the final tree.

## V4 maintenance — The rename to Red Thread reaches GitHub, Vercel and sign-in

Recorded: 2026-11-02 20:47 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 6.

Notion V4 Tasks, "Rename the app to Red Thread (redthread.tv)". Andre's
answers: names `red-thread`; a simple redirect from the old address; Claude
makes the dashboard changes with his approval for each.

- Outside the code, approved one by one: GitHub `AndreFelipeRibeiro/MCU-Connections`
  → `AndreFelipeRibeiro/red-thread` (old links and Git addresses redirect),
  with redthread.tv as its website; Vercel project `mcu-connections` →
  `red-thread`; Supabase allows the new staging address and is named Red
  Thread; Google's OAuth client allows redthread.tv and the new staging
  address, and its consent screen names the app Red Thread; the Google Cloud
  project and the Notion pages are named Red Thread.
- `mcu-connections.vercel.app` redirects to `https://redthread.tv`, path and
  query kept (`vercel.json`, and `middleware.ts` for the home page in case
  middleware runs first). Visitors signed out there arrive without the
  progress saved on that address; signed-in visitors sync it back.
  `red-thread.vercel.app` belongs to another project, so the old address stays
  this project's own production alias.
- npm packages `red-thread` and `red-thread-qa`; the design preview, comments,
  the `qa/smoke.js` examples, README, AGENTS.md, HANDOFF.md, decisions.md and
  the V4 brief titles; the calendar recap title becomes "Red Thread V4 –
  Backlog batch n".
- Kept as `mcu` on purpose, as one rule (Andre, after a full pass over every
  remaining "MCU"): everything people see says Red Thread, and `mcu` stays the
  internal prefix (saved-data keys, `window.MCU_*`, CSS classes), because the
  saved-data keys can't change without wiping progress. "MCU" meaning the
  Marvel Cinematic Universe and history files stay too.
- `qa/test-previews.js` checks the redirect rule (old host redirected;
  redthread.tv, www, staging and localhost not) and the middleware's 308s.
- Verified: each dashboard change read back after saving; the old GitHub
  address answers 301; Vercel's Git connection shows the new repository; full
  Batch 6 regression on the final tree: 56 check runs clean; staging smoke
  check clean. Still to do: the local folders (`red-thread`, `red-thread-v4`;
  commands on the ticket, run with every session closed) and, in about three
  months, removing the old addresses from Google and Supabase.

## V4 design — Link previews: the red thread, X tags and the old image retired

Recorded: 2026-11-02 20:47 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 6.

Notion V4 Tasks, "Social media post cover art". Most of it had landed with
Batch 3's link previews ("Share 3/3"), which replaced the V3 `og-image.jpg`
with a card the build draws under the Red Thread name. This finishes it.

- The app-wide card (`og/default.png`) draws the lines tying its cards together
  in the brand red, so the picture is the name; the cards keep their phase
  colours (`src/share-card/previews.ts`).
- `index.html` gains `twitter:title`, `twitter:description` and
  `twitter:image:alt`, equal to their `og:` tags, and a canonical link to
  `https://redthread.tv/`. Every title, character and guide page the build
  writes sets all of them to its own values, its canonical being its own
  address (`src/share-card/meta.ts`).
- The V3 `og-image.jpg` ("MCU Connections") is deleted; `vercel.json`
  redirects its address to `/og/default.png`, so a client that cached it gets
  the new card.
- `qa/test-previews.js` now also fails if a page's `twitter:` tags differ from
  its `og:` tags, its canonical isn't its own address, a preview tag says MCU
  Connections, an image reaches 300 KB (WhatsApp skips bigger ones; the largest
  is 62 KB), or the build still ships `og-image.jpg`.
- Verified: build and test-previews (172 preview pages); the new card looked
  at full size and at 300 px wide; full Batch 6 regression on the final tree:
  56 check runs clean; staging smoke check clean. Limits: at 300 px the small
  "Red Thread" beside the logo is about 9 px (headline clear; chat apps print
  the site name under the image). The Facebook and LinkedIn re-scrapes and the
  iMessage, WhatsApp and Slack paste checks need production. No social profile
  art (no accounts yet).

## V4 improvement — The Avengers: Doomsday newcomers join the catalog

Recorded: 2026-11-02 12:50 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Add the confirmed Doomsday newcomers to the catalog".
Thirteen characters confirmed for Avengers: Doomsday were missing, so they drew
no threads. Characters: 89 → 102.

- John Walker (Falcon and the Winter Soldier, Thunderbolts*, What If…? season
  3, Marvel Zombies), Joaquín Torres (Falcon and the Winter Soldier, Brave New
  World), Namor (Wakanda Forever, Marvel Zombies), Ava Starr (Ant-Man and the
  Wasp, Thunderbolts*, Marvel Zombies), Cassie Lang (both Ant-Man films,
  Endgame, Quantumania), Bob Reynolds (Thunderbolts*), Charles Xavier
  (Multiverse of Madness), Remy LeBeau (Deadpool & Wolverine).
- Doomsday only: Hank McCoy (his other appearance is a post-credits scene),
  Erik Lehnsherr, Kurt Wagner, Raven Darkhölme, Scott Summers.
- Cassie Lang credits Abby Ryder Fortson in the first two Ant-Man films and
  Emma Fuhrmann in Endgame. TMDB portraits for all 13 and both recast
  performers.
- Sources: `doomsdayNewcomers` in `docs/CATALOG-SOURCES.json`, and
  `docs/CATALOG-AUDIT.md`.
- Verified: Doomsday's details list 30 characters; every portrait address
  returns an image; test-threads; Full Batch 5 regression on the final tree: 56
  check runs clean. Not checked: portraits rendering in a real browser.

## V4 feature — Text size starts from the iPhone's Text Size

Recorded: 2026-11-02 12:50 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Text size: start from the iPhone's system Text Size". On an
iPhone or iPad, until a size is picked in Settings, Text size starts from the
system Text Size.

- Read through WebKit's `-apple-system-body` font, which follows Dynamic Type:
  15px or less → Small, 16–17 → Default, 19 and up → Large (Accessibility sizes
  included). iPhone and iPad only; desktop Safari and everything else are
  unchanged.
- Applied before the first paint (the copy in `vite.config.js`), and again when
  the app comes back from the background, so a change in iOS flows through.
- Only a choice made in Settings is saved, now Default included; Settings shows
  the size it picked and says "Matches the Text Size set on this device until
  you pick one."
- `qa/test-textsize.js` plays an iPhone (its user agent and a stand-in for the
  system font) at seven sizes, the Settings note, a choice winning across a
  reload, a background change, and Android and desktop ignoring it.
- Verified: Full Batch 5 regression on the final tree: 56 check runs clean.
  **Not checked on a real iPhone** with its Text Size changed; headless
  Chromium has no Dynamic Type.

## V4 fix — Room around "Mark what you've seen"

Recorded: 2026-11-02 12:50 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Account menu: "Mark what you've seen" text sits too close to
the button's edges". The account menu's two-line button had its text touching
the top and bottom edges.

- **Cause:** every button in that menu has a fixed 32px height, too short for
  two lines.
- The button now grows to fit, with 8px padding top and bottom (52px minimum on
  the phone sheet); Portuguese at Large wraps to three lines and the button
  grows with it.
- `qa/test-picker.js` fails if the text comes within 6px of the edge.
- Verified: measured in the browser at every Text size in English and
  Portuguese, desktop and phone (9px each side). Full Batch 5 regression on the
  final tree: 56 check runs clean.

## V4 fix — Announced casts of unreleased titles

Recorded: 2026-11-02 12:50 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Verify announced casts of unreleased titles (Doomsday, Secret
Wars, VisionQuest…)". Every character listed for a title not yet out was
checked against an announcement; Andre approved the changes.

- Avengers: Doomsday drops Peter Parker (Tom Holland is in no official cast
  list or trailer); the other 17 are confirmed.
- Avengers: Secret Wars is now Doom, Steve Rogers, Shang-Chi and Shuri (was
  Alexei, Sam, Vision, Peter, Shang-Chi; four of those were leaks or fan lists
  only).
- Daredevil: Born Again season 3, Friendly Neighborhood Spider-Man season 2,
  VisionQuest and the seven variant mappings checked: no change.
- Sources in `docs/CATALOG-SOURCES.json` (`castSources`, `castEvidence`) and
  `docs/CATALOG-AUDIT.md`.
- Verified: test-threads; Full Batch 5 regression on the final tree: 56 check
  runs clean.

## V4 improvement — Opening a title closes Settings

Recorded: 2026-11-02 12:50 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Close Settings when a title is opened". On desktop, opening a
title while Settings was open loaded its details behind the panel.

- A Spatial card, a List row, search, Up next or a guide stop now closes
  Settings and shows the details, the title already open behind it included.
- Settings slides out (240ms), then the details slide in, instead of Settings
  vanishing at once. The panel stays mounted while it leaves (`settingsShown`),
  ignores clicks and Escape, and slides back if reopened mid-way.
- `qa/test-settings.js`: a card, the card already open, a List row, and every
  frame's position of both panels (Settings seen sliding, never both on screen,
  then the details seen sliding).
- Verified: Full Batch 5 regression on the final tree: 56 check runs clean. Not
  checked: Safari, Firefox.

## V4 fix — Don't promote a finished guide; celebrate it instead

Recorded: 2026-11-02 12:50 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Don’t promote a guide that the user has already finished it".
A returning visitor was offered a guide they had already finished, and
finishing one earned nothing.

- **Cause:** the pick ran before a signed-in account's titles had loaded, so
  every guide looked unfinished. It now waits for the collection to settle
  (`useCollection().settled`), reads the titles again when it fires, and swaps
  or closes the offer if a sync shows that guide finished.
- **The order now:** an unfinished guide for a release in the next 60 days;
  else, when that guide is finished, the caught-up moment for the release
  (confetti, countdown, Share), whatever the other guides' progress; else the
  evergreen guide; else the unfinished guide closest to done; else, with every
  guide finished, the caught-up moment for the next release (or with no
  countdown). Each guide is offered once per device, each caught-up moment once
  per release.
- New wording in English and Portuguese for the caught-up moment and the
  "picked for you" offer.
- `qa/test-promo.js`: titles arriving late, a guide finished while offered, the
  closest guide, the guide-finished moment (then the evergreen guide), every
  guide finished on three dates, desktop and phone, English and Portuguese.
- Verified: Full Batch 5 regression on the final tree: 56 check runs clean. Not
  checked: a real Google sign-in round trip (simulated by titles arriving after
  load).

## V4 design — Light theme polish

Recorded: 2026-11-02 12:49 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Light mode polish: rating pills, card hover, Spatial
background, progress bar". Four light-theme fixes from Andre's screenshots, and
softer shadows on Spatial's floating pieces.

- IMDb and RT pills sit on the card colour with a thin border in the light
  theme (Spatial cards, the List, the details, the phone), instead of a dark
  chip.
- A highlighted card's outline is one light hairline with a soft shadow,
  instead of a heavy grey double line.
- Spatial's light background has two soft colour washes (warm top left, cool
  bottom right) and a fainter dot grid; no pattern. Cards get a gentler shadow.
- The All titles progress bar is red (`--brand`) in both themes.
- The guide banner, Up next chip, line tooltip, toasts and bulk bar have a much
  lighter shadow in the light theme.
- Verified: test-contrast and the accessibility scans in both themes,
  in-browser at desktop and phone sizes. Full Batch 5 regression on the final
  tree: 56 check runs clean. Not checked: Safari, Firefox, a real phone.

## V4 feature — D and L switch the theme on desktop

Recorded: 2026-11-02 11:55 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 5.

Notion V4 Tasks, "Desktop keyboard shortcut: D for dark mode, L for light
mode". On desktop, pressing D switches to the dark theme and L to the light
one.

- Saved like choosing it in Settings (Theme), so it lasts across visits;
  Settings → Appearance mentions the shortcut under Theme.
- Ignored while typing (search, any field), with Ctrl, Cmd or Alt held, on a
  held-down key, while a menu or dialog is open, and on the phone layout.
- Screen readers hear "Dark mode" or "Light mode" (a polite live region).
- `qa/test-settings.js` covers D, L, typing "daredevil" in search, the Settings
  note and the phone layout.
- Verified: committed on its own on top of Batch 4, with `bash qa/quick.sh
  test-settings` (18 check runs clean) and `npm run typecheck`; also part of
  the full Batch 5 regression (56 check runs clean). Not checked: Safari,
  Firefox, a real screen reader.

## V4 improvement — Bigger text and a Text size setting

Recorded: 2026-11-02 09:31 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 4.

Notion V4 Tasks, "Font size increase". Text is bigger by default and follows
one type scale; Settings adds Text size.

- **One type scale in rem** (`--fs-xs` 12px … `--fs-7xl` 68px,
  `src/index.css`): 316 pixel font sizes converted, so text follows the
  browser's default font size. The Spatial canvas's cards keep px (they have
  zoom).
- **Bigger by default:** no informative text under 12px; desktop body text
  15–16px; Tailwind's `text-xs` / `text-sm` one step up (13 / 15px). **Phones**
  set body text at 14px, the bottom nav at 12px, and draw the search field at
  13px while its own font stays 16px or more, so iPhones don't zoom on focus.
- **Settings → Text size: Small / Default / Large**, kept per device and
  applied before the first paint. Small is 87.5%; Large is 106.25% on desktop
  and 112.5% on phones, where the bottom nav and search grow only to 106.25%.
- **Controls grow with the text, never shrink:** heights are `max(Npx, N/16
  rem)` (162 declarations) and Tailwind's spacing unit is `max(0.25rem, 4px)`,
  so Large gets taller buttons and Small keeps today's touch targets.
- **Fits:** the desktop sort row steps down by measuring instead of width
  breakpoints; the desktop List's columns are in rem and drop earlier with
  bigger text (all 12 at 1280px by Default); the phone progress header wraps;
  rows count a label eating into its padding as not fitting.
- New `qa/test-textsize.js` (the 12px floor, the three sizes, phone sizes,
  controls, List columns, 200% zoom); `test-fit` takes a Text size and the full
  run adds Portuguese at Large; `test-listkeys` measuring fix.
- Verified: full regression, 56 check runs clean; `test-fit` for English and
  Portuguese at every size and width; in-browser at 375 and 1280–1440px in both
  languages. Not checked: a real phone, Safari, Firefox, the browser's own
  font-size preference, iOS's system Text Size (its own ticket).

## V4 fix — Portuguese header rows fit; test-fit fails on overflow

Recorded: 2026-11-02 09:31 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-02 after Andre's approval, in Batch 4.

Notion V4 Tasks, "Top nav (PT) / content overflowing". The phone's second
header row ran past the right edge in Portuguese; it now fits at every width.

- **Wording:** the phone sort bar says **Lançados**; the desktop List's column
  says **Lançamento** (Andre's choice).
- **The phone collection row fits by measuring** (`useFitSteps`,
  `src/app/mobile.tsx`): it tries every label, then an icon-only view menu,
  then only All and the selected option labelled, then "Para ver" for "Para
  assistir" (approved), and keeps the first step that fits. It re-measures on
  resize, language, selection, view and font load, and the row is held to the
  screen's width. Before, Portuguese ran about 27px past the edge at 430px and
  29px at 320px.
- The short label is hidden in every other switch, the desktop toolbar's
  included.
- **`test-fit` now fails** on a control past the screen or its row, overlapping
  toolbar controls, a label past its button, a switch showing both labels, or
  sideways scroll, and checks the phone collection row and 375px. Its
  Portuguese Watchlist pass now really selects Watchlist.
- Sweep of every surface in Portuguese and English at phone and desktop widths:
  nothing else overflowed.
- Verified: `test-fit` against the old build fails in Portuguese and is clean
  on this one in both languages; full regression with the font-size change, 56
  check runs clean. Not checked: a real phone, Safari, Firefox.

## V4 feature — Share cards and link previews; links go to redthread.tv

Recorded: 2026-11-01 21:52 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in Batch 3.

Notion V4 Tasks, "Share 2/3 — Progress and guide share card (image)" and
"Share 3/3 — Link previews per title, character and guide", committed
together because they are built from one set of templates
(`src/share-card/`); and "Share 1/3", revision 2.

- **Links go to https://redthread.tv/** (Andre), which serves production.
- **Share cards:** your progress, a finished guide and the celebration
  toasts share a 1080×1350 image drawn on the device, with the link. Phones
  that can share files send it through the share sheet (Share image);
  elsewhere: Download image and Copy link. Dark palette whatever the theme,
  the visitor's language, no personal details. Nothing on first load; opening
  a card loads about 340 KB (gzip).
- **Link previews:** the build draws a 1200×630 preview for the app-wide card
  and every title, character and guide (160 images, about 3.5 s,
  `scripts/og-previews.js`), and a copy of the page with that preview's tags;
  `middleware.ts` (Vercel Routing Middleware) serves it to `/?title=`,
  `/?char=` and `/?guide=`. Unknown ids and every other request pass through.
  The app-wide card is redrawn with the Red Thread name and mark.
- Templates take colours from `src/index.css` and the logo from
  `src/assets/logo-mark.svg`. New dependencies, pinned: `satori` 0.33.5,
  `@fontsource/inter` 5.3.0, `@resvg/resvg-js` 2.6.2 (build only).
- **Verification:** new `qa/test-previews.js` (every preview image and page,
  tags pointing at redthread.tv, pages identical to index.html otherwise, the
  middleware run against the built files, the app boots from a preview page);
  `test-share` covers the cards on desktop and phone; full regression 54
  check runs clean.
- **Limits:** the middleware is proven only once deployed; previews are
  English only; real share sheets with an image and Safari's canvas are not
  tested. Google sign-in from redthread.tv needs that address allowed in
  Supabase and the Google client.

## V4 feature — Share buttons and links

Recorded: 2026-11-01 21:52 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in Batch 3.

Notion V4 Tasks, "Share 1/3 — Share buttons and links".

- **Share** at every point: a title (details drawer and phone sheet), a
  pinned character (banner, phone pill), a guide (card, Spatial row, phone
  header), your progress (account), the app (About, Settings) and the
  celebration toasts (after Undo).
- One helper, `src/app/share.tsx`: phones open the system share sheet with a
  short message in the visitor's language; elsewhere the link is copied and a
  "Link copied" toast is announced. A cancelled sheet does nothing; sharing
  adds no history entry. Links carry only `?title=`, `?char=` or `?guide=`.
- **Verification:** new `qa/test-share.js` (every point on desktop and a
  375px phone with a stubbed share sheet, links open what they shared,
  keyboard, Portuguese); `test-details` follows the new actions row; full
  regression 53 check runs clean.
- **Limits:** a real phone's share sheet is not exercised. On phones the
  pinned pill gives longer names ("Natasha Romanoff") about 20px less room.

## V4 feature — Settings, laid out like a phone's settings app; the public name is Red Thread

Recorded: 2026-11-01 21:52 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in Batch 3.

Notion V4 Tasks, "Settings menu" (two revisions after Andre's first look).

- **Settings:** a gear in the desktop toolbar and the phone app bar opens a
  panel from the right (desktop, in the details drawer's place) or a sheet
  (phones). It holds theme (a Light / Dark / Auto segmented control),
  language (checkmark rows), the where-to-watch country, Reduce motion and
  Celebrations (switches), this device's actions (reset guide progress, show
  the welcome again, clear this device, with a confirmation), and About, the
  fan note and the version. Grouped rounded lists with hairlines, rows at
  least 44px. The theme control and both language menus are gone; the
  Welcome offers a language choice.
- **Reduce motion** puts `reduce-motion` on `<html>`, which cuts every
  transition and animation; scripts ask `window.MCU_MOTION.reduced()`.
  Celebrations off: no confetti.
- **Sync:** signed-in visitors' preferences sync through a new
  `user_preferences` table (`schema.sql`, idempotent; Andre runs it in
  Supabase). Until it exists, preferences stay on the device and nothing fails.
- **Red Thread everywhere a visitor reads:** About and Welcome, the fan note,
  the startup error and the link-preview tags no longer say MCU Connections
  (Andre: the public name is Red Thread). Recorded in AGENTS.md.
- First surface built from the shadcn components (Radio group, Select,
  Switch, Label, Button), opted into `v4`.
- **Verification:** new `qa/test-settings.js` (every setting applies at once
  and survives a reload, keyboard and Escape ladder, device actions, phone
  Back, the theme labels fit at 320px in Portuguese, axe clean in both
  themes); `test-i18n` and `test-layers` follow the moved controls; full
  regression 52 check runs clean, then quick runs after the rename.
- **Limits:** account sync is untested until the table exists (two-browser
  check); not checked on a real phone, Safari or Firefox.

## V4 fix — character variants light their whole thread, and every lit line ends in lit cards

Recorded: 2026-11-01 19:18 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in Batch 3.

Notion V4 Tasks, "Re-check all the title and character connections". Hovering
Captain Carter drew a lit line into Avengers: Doomsday while Doomsday stayed
dimmed. Lines followed a character's identity (Peggy and Captain Carter are one
thread) but lit cards followed the exact character only.

- **One rule for cards and lines (Andre's Option A):** hovering or pinning a
  character lights every title of its identity (Captain Carter lights Peggy
  Carter's titles; He Who Remains and Victor Timely light Kang's; Sylvie,
  Loki's; White Vision, Vision's; Raimi and Webb Peter, Peter Parker's), and a
  line is emphasised only when both its cards are lit. A pinned performer keeps
  their own credited titles.
- **Line labels:** a line is labelled with the variant(s) in both titles, so
  No Way Home → Your Friendly Neighborhood Spider-Man is Holland's Peter, not
  whichever Peter was listed first.
- **Counts follow:** the search suggestion and the banner count the identity's
  titles; parts several people played keep the named performer's own share.
- Supersedes the 2026-10-28 "one exact portrayal" rule (docs/decisions.md).
- **Verification:** new `qa/test-threads.js` (425 hovers and 14 pins; every
  lit line ends in two lit cards, counts match): 0 errors, against 261 on the
  build before the fix. `qa/test-pickperson.js` updated to the identity
  counts. `bash qa/quick.sh test-threads` clean; full regression (52 check
  runs) clean on the tree that also holds the Settings work. Headless
  screenshots of Andre's example in both themes.
- **Limits:** variants played by someone else now light that identity's other
  titles too (pinning Raimi Peter lists Tom Holland's titles), which Andre
  accepted with the ticket. Not checked on a real phone, Safari or Firefox.
  The announced casts of unreleased titles are their own ticket.

## V4 design — toolbar and phone header controls back to V3's heights

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Toolbar and app bar (revision)". Andre found the
re-skinned controls too short: the first pass had set them to shadcn's 36px
(desktop) and 40px (phone). They are back to V3's heights.

- **Desktop toolbar:** every control 44px again (search, Order, Filters,
  All/Films/Series, Guides, language, account, the sort tabs, the collection
  switch, Spatial/List), with 34px segments inside a group. The theme control
  is as tall as its neighbours; its buttons stay 28px wide so the Portuguese
  top row still fits at 1280px. Toolbar 129px, as in V3.
- **Phone app bar:** search, Order, Filters and View are 44px touch targets,
  the top row 38/40px, the bar 170px, as in V3.
- Measured against the pre-reskin build (desktop at 2000px, phone at 390px):
  every control matches. `test-fit`'s layout numbers in both languages are
  identical to V3's.

## V4 design — Red Thread placeholder logo, name and page title

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Placeholder new logo". A placeholder Red Thread mark replaces
the rainbow square, and the header, home link, page title and icons say Red
Thread. The link preview, About copy and startup error keep MCU Connections
until the rename ticket.

- **One file:** `src/assets/logo-mark.svg`, used as a CSS mask painted with a
  new `--brand` token (light and dark), in the toolbar, phone app bar,
  About/Welcome dialog and startup screen. The three copied conic-gradient
  rules are gone; sizes stay 32 / 28 / 48px. It builds into the stylesheet, so
  the startup screen needs no extra request.
- **Icons:** `tools/make-icons.js` redraws `favicon.png` and
  `apple-touch-icon.png` from the SVG.
- **Name:** `app.name` / `home.link` in both locales; title "Red Thread —
  Marvel movies, series and character connections", and
  `apple-mobile-web-app-title` so iOS offers "Red Thread" for the home screen.
- New check `qa/test-logo.js` (fails on the build before, 39 errors); swapping
  a dummy shape into the SVG changed all four places. Full regression: 50 check
  runs clean.

## V4 fix — Spatial band labels pass contrast in phases 3 and 6

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Spatial band labels fail WCAG AA in phases 3 and 6 (live in
V3)". Andre chose to lighten the two dark phase colours: phase 3 `#d04040` →
`#e86a6a`, phase 6 `#c8384a` → `#e5677a`. They now meet AA as text on every
dark surface, and the dark ink on their fills improves with them.

- The eight phase 3 and 6 entries in `qa/test-contrast.js`'s `KNOWN` are
  deleted; phase 4 on a card stays there (not part of this decision).
- Full regression: 49 check runs clean.

## V4 improvement — tapping the active sort tab on a phone goes back to the top

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Mobile: Press twice resets the list". On a phone, tapping the
sort tab that is already selected scrolls the List or Grid back to the top,
smoothly, or at once under reduced motion. Nothing else changes; a different
tab still re-sorts.

- New check `qa/test-retap.js` (fails on the build before the change).

## V4 fix — contrast fixes from the full run, and an accessibility scan in dark

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Desktop List / Guides (fixes found by the
regression)". The full regression caught two shortfalls the re-skin had
introduced, and showed the accessibility scan had only ever run in light.

- **Rating chips** went grey over light rows: they now sit on a solid dark
  chip. **The guide promotion's date tile** was near-white on near-white:
  fixed.
- **`qa/a11y-scan.js` takes `SCHEME`** and the full run scans English in dark
  as well (46 → 49 check runs then).

## V4 maintenance — the first re-skin pass, written down

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — first pass (docs)". AGENTS.md and HANDOFF.md
describe how the first pass works and how a surface moves onto the real
components later.

- The "RE-SKIN, FIRST PASS — <surface>" sections, why they sit last, and that
  new work either edits a section or swaps the markup for components and
  deletes the section with the V3 rules it overrides.

## V4 design — startup screen

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Startup screen". The startup screen before the
bundle arrives: the design system's background, foreground and spinner, in the
visitor's theme from the first paint.

- In development the screen paints before the token stylesheet arrives, so it
  can flash unthemed there; the built site loads the tokens with the page.

## V4 design — desktop Spatial

Recorded: 2026-11-01 09:02 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Desktop Spatial". Spatial cards are shadcn cards at
exactly their old size (the layout is computed from it); band labels, the
overall header and the zoom control float as cards.

- iOS rules kept: no `will-change`, 3D transform or `backdrop-filter` on cards
  or inside the canvas.

## V4 design — guides

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Guides". The guide menu, views, banner, pill, "Part
of" and the phone guide dock in Vega's look. Labels are sentence case.

- The promotion's poster art keeps its capitals.

## V4 design — phone List, Grid, Spatial and sheets

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Phone List, Grid, Spatial and sheets". The phone
views and bottom sheets in Vega's look: cards, sheet surfaces, tab bar,
sentence-case phase and type labels (the code no longer upper-cases them).

- Sheets keep their focus trap and history entry.

## V4 design — dialogs (About, Account, "What have you seen?")

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Dialogs (About, Account, "What have you seen?")".
The dialogs in Vega's dialog look: radius, border, shadow, title and
description type, primary and outline buttons.

- Focus trap, Escape order and focus return unchanged.

## V4 design — desktop List

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Desktop List". The desktop List in Vega's table
look: header row, row hover, checkboxes, sentence-case section headings (the
code no longer upper-cases them). Phases keep their colour.

- Restyle only: same columns, keys and bulk selection.

## V4 design — details drawer

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Details drawer". The desktop details drawer in
Vega's look: card surface, section headings, outline buttons, badges. It stays
modeless, as the rules require.

- Restyle only: same controls in the same places.

## V4 design — toolbar and app bar, and the Light / Dark / Auto control

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — Toolbar and app bar; Design: Dark/Light mode".
Desktop toolbar and phone app bar in Vega's look, and the theme control Andre
chose.

- **Theme control:** `src/app/theme-toggle.tsx`, three buttons (Light, Dark,
  Auto) in a labelled group. In the desktop toolbar, and in the phone account
  sheet (in the app bar it cut the name short). Auto follows the system; the
  choice survives a reload.
- Tab lists, Order, language, filters, search and the account pill take
  shadcn's outline-button and input recipes.
- Strings in English and Portuguese (`theme.*`).

## V4 design — V3's palette and type onto the design-system tokens

Recorded: 2026-11-01 09:01 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Notion V4 Tasks, "Phase 4 — V3's palette and type onto the design-system tokens
(all surfaces)". The first re-skin step, under every surface ticket: V3's
colours now come from shadcn's tokens, so the app follows the light and dark
themes.

- **V3's tokens are defined from the design system's** (`--v3-surface:
  var(--card)` and so on), and about 350 colours written straight into
  `styles.css` and `styles-mobile.css` were mapped onto tokens. New tokens in
  both themes: `--status-seen`, `--status-seen-text`, `--status-watch`,
  `--on-color` (ink on phase and status fills) and `--on-image*` (fixed light
  text on the dark overlays over posters).
- **Type is Vega's default**: Inter (served with the bundle) and the system
  monospace in place of JetBrains Mono, in all 81 places. Google Fonts now
  loads only Bebas Neue, for the generated poster art.
- Both stylesheets start with `@reference "./src/index.css"` so the surface
  sections can use shadcn's class recipes through `@apply`. Eight more shadcn
  components are added to `src/components/ui/` for the surfaces to move onto
  later; react is re-pinned exactly.
- `PHASE_COLORS` / `MPHASE_COLORS` hold `var(--phase-N)`; the canvas and
  confetti resolve them before painting.
- Verified with the surface tickets: full regression (49 check runs clean at
  the end of the pass), both themes in the in-app browser at desktop and phone
  sizes, English and Portuguese.

## V4 design — the design system wired into the app, with no visible change

Recorded: 2026-11-01 01:19 EST (-0500). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

The first Phase 4 ticket (Notion V4 Tasks, "Phase 4 — wire the design system
into the app (before any surface)"). The app now loads Tailwind, the token file
and the theme, so each surface ticket can start using them. Nothing on screen
changes: V3's stylesheets still paint every surface.

- **The app loads the design system.** `src/main.ts` imports `src/index.css`
  and starts the theme. The `dark` class follows the system before first
  paint, through a rule Vite injects into every page's `<head>`
  (`THEME_PREPAINT` in `vite.config.js`, replacing the copy pasted into
  `design.html`). An override set through `window.MCU_THEME` survives a
  reload.
- **V3's colour tokens are now `--v3-*`.** shadcn defines `--border` and
  `--accent` too, so with both files on one page whichever loaded last would
  have recoloured the other's. All ten tokens renamed: 653 uses, all in CSS.
- **Tailwind's preflight reset is scoped to `.v4`** (`src/preflight-v4.css`,
  generated from Tailwind 4.3.3's own). Loaded globally it changed 166 computed
  properties on V3 elements: line height everywhere, icon alignment, button
  fonts, border and outline colours. A converted surface opts in with class
  `v4` on its root; the dialog and tooltip carry it on their portaled roots,
  and `design.html` on `<html>`. Temporary: Tailwind is imported whole again
  once no V3 surface is left.
- **Tailwind generates classes only from `src/components` and
  `src/design`.** Scanning the whole project generated 3.8 KB of utilities
  from V3's class names.
- **The tokens sit in the base cascade layer**, and V3's `:root` holds
  `color-scheme: normal`, so native controls and scrollbars stay as they were.
- **`qa/test-v4scope.js`**, a new regression check: the reset stays out of V3
  and works inside `.v4`, the token sets don't collide, and the theme is wired.
- Docs: AGENTS.md (the renamed V3 tokens, the first pass's exception to the
  Figma rules, how a surface opts in, the theme wiring, the check count), four
  decisions, two handoff quirks, README, qa/README.md, and a dated note in
  docs/V4-KICKOFF.md recording that the first re-skin pass has no Figma frames.

Verified: a pixel diff of 42 app states before and after (desktop and phone,
light and dark system, English and Portuguese, the welcome dialog) shows no
visible change, the largest leftover being 58 px of anti-aliasing on generated
art that the same build also shows run to run. The computed style of every
element, about 26,900 across 8 states, has zero differences. `design.html` is
pixel-identical in 4 full-page shots. The new check fails the old build and a
build with the reset made global again, and passes this one. Looked at in the
in-app browser on the dev server, at desktop and phone size. `npm run
typecheck` green; `bash qa/regress.sh` all 47 check runs clean in 5m 40s. The
design system adds 48.7 KB of CSS (8.9 KB gzipped).

Limits: not checked on a real iPhone or in Safari or Firefox. The `v4` marks on
the dialog and tooltip have nothing to open them in the app yet.

## V4 design — theme switching, and the contrast check the rules always asked for

Recorded: 2026-10-31 20:30 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

Finishes the design-system ticket. Most of its scope arrived with the preview
page (`07ea940`): Tailwind, shadcn on Base UI, `components.json`, the token
stylesheet with both themes, the phase tokens, eight components and the three
app surfaces as proof. What was left was theme switching and the acceptance
checks.

- **`src/theme.ts`** is the mechanism: class `dark` on `<html>`, following
  `prefers-color-scheme` until the visitor overrides it. The override lives
  under `mcu.theme` and is *removed*, not overwritten, to go back to following
  the system. It follows the system live with no reload, survives
  `localStorage` throwing in a private window, and follows another tab.
  Published as `window.MCU_THEME` with a `useTheme()` hook. **The app does not
  call it yet** — `index.html` still serves V3's stylesheets, which are dark
  whatever class `<html>` carries. `design.html` repeats the rule inline
  because the bundle arrives too late to paint with.
- **`qa/test-contrast.js`** is the calculation AGENTS.md has asked for beside
  axe since V3 and that had never been run. It measures the declared token
  pairs and the phase colours in both themes, every piece of text on
  `design.html` in both themes, and the app's own text that axe returns as
  *incomplete* rather than as a violation — which `a11y-scan.js` therefore
  passes, 107 nodes on desktop Spatial alone. Those are measured against the
  background actually painted: the text is made transparent, the page is
  photographed, and the commonest colour in each text box is its background.
  338 measurements, 17 seconds, added to `qa/checks.json`.
- **Two light-theme library defaults were below AA** and are darkened, same
  hue and chroma: `--muted-foreground` 0.556 → 0.54 (was 4.35:1 on `--muted`
  and `--secondary`, now 4.61) and `--destructive` 0.577 → 0.52 (was 3.97:1 on
  the 10% tint Vega always paints it over, now 4.65). The preview's
  destructive swatch is gone with them: Vega has no `--destructive-foreground`
  because it never fills a surface with `--destructive`.
- **The dark phase colours stay as V3 wrote them** — the user's call, art
  direction left for the Phase 4 re-skin. Those five pairs and the three
  rendered labels that follow sit in the check's `KNOWN` list with the ratio
  each was accepted at, so a worse ratio fails and one that starts passing
  asks to be deleted. Two are the open band-label bug, which this check
  reproduces independently at 4.17:1 and 3.83:1.
- Smaller: `color-scheme` per theme so the browser's own furniture follows;
  the preview header wraps below 640px, where three buttons no longer fit
  beside the title.

Verified: `bash qa/regress.sh` on the final tree, **all 46 check runs clean**
including both accessibility scans; `npm run typecheck` and `npm run build`
clean; looked at in a real browser on the built site at desktop and 375px, in
light, dark and Auto, with the system colour scheme flipped live.

Limits: **non-text contrast is not covered** (WCAG 1.4.11 — borders, focus
rings, the switch's track); it needs measuring where it renders, not at the
token level, and is said so in the check's own header. The preview page has no
translations; it is a development page the app never loads. Nothing here
changes the running app.

## V4 maintenance — the docs stop describing V3

Recorded: 2026-10-31 17:25 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

The V4 setup commit retargeted AGENTS.md and README.md but left the two files
AGENTS.md sends a new agent to read *first* describing V3, so they actively
misled. Documentation only; no application code.

- **docs/HANDOFF.md** now opens by saying V3 is released and this checkout is
  V4, and points at V4-KICKOFF.md and V4-PLAN.md. "Where things stand" is
  rewritten: Batch 10 merged to production on 2026-10-31, V4 is open on
  `version/4.0` in the `MCU-V4` worktree with its own preview, and Batch 1 is
  on staging. The architecture section described a static site compiling JSX
  in the browser — it now describes the Vite build, the single bundle, the
  classic scripts that stay outside it and why, TypeScript at `strict`, and
  the fact that the files still share through `window`. The quirks section
  loses the Babel startup cost and the hard-refresh advice (neither is true
  any more), gains the fact that the source tree can no longer be opened in a
  browser, and records that `test-camera`'s flakiness is fixed. The batch
  history is kept: it is how most of the behaviour got here.
- **A new quirk worth having written down:** a check that has drifted from the
  app looks exactly like an app bug. Two were carried as suspected bugs for
  days. When a check fails in a way that makes no sense, compare its selectors
  against the DOM and `git log` the feature before believing it.
- **docs/decisions.md** gains the three V4 setup decisions that were never
  recorded: the `version/4.0` branch and `MCU-V4` worktree layout, Notion
  **V4 Tasks** as the backlog with V3 Tasks kept as history, and the Figma
  pipeline — including the rule that where a frame and the accessibility,
  keyboard, contrast or localisation rules disagree, the rules win.
- **docs/CATALOG-AUDIT.md** and **docs/PRIVACY-REVIEW.md** named
  `version/3.0` in the present tense. Both are dated reports, so they are
  marked as such rather than rewritten. The privacy review additionally now
  states plainly that **as of 2026-10-31 the historical exposure is still
  unresolved** — no history rewrite has been authorised or performed, and
  `version/4.0` inherits the same history.
- **.gitignore** described `qa/.cache/` as written by `qa/precompile.js`,
  which no longer exists. The entry stays so an old directory does not show as
  untracked; the comment now says so.

Verification:

- `npm run typecheck` green; `npm run build` ok.
- `bash qa/quick.sh` maps the changed files to no checks, as expected for a
  documentation change.

Limits:

- No application code changed, so there is nothing to see in a browser.
- The privacy finding is recorded, not fixed; it still needs the user's
  explicit approval before any history rewrite.

## V4 maintenance — TypeScript, at full strict

Recorded: 2026-10-31 17:19 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

The source is renamed to `.ts`/`.tsx`, `jsconfig.json` becomes a `tsconfig.json`
at full `strict`, and `npm run typecheck` is a script. No behaviour change: the
built bundle is the same size and the full regression is unchanged.

- **The strictness setting was measured, not guessed.** 2,679 errors at full
  `strict`, 1,284 with `noImplicitAny` off, 632 with null checks off too, and
  **626 even with `strict` off entirely** — no setting reaches green, so
  loosening would only have hidden work while looking tidier. The setting
  therefore stays at its strongest, and the files not yet converted carry a
  `// @ts-nocheck` header naming how many errors each still has. Nothing is
  annotated `any` to reach green; the check is green from this commit, and
  deleting one of those headers is a self-contained piece of work.
- **The catalog shapes are written from the data, not the comments around
  it.** `src/types/catalog.ts` holds `Title`, `Character`, `Guide`, `Media`,
  `WatchData` and the Up next result. Annotating `TITLES` as `Title[]` and
  `CHARACTERS` as `Record<string, Character>` checks those types against all
  64 titles and 89 characters, which is what makes them worth having.
- **The shared surface is typed from the implementations.**
  `src/types/globals.d.ts` covers all 132 names, taking component signatures
  with `typeof import(...)` rather than restating them, so a changed prop is
  an error at every use site instead of a second copy that drifts within a
  week. 103 names gained an `export` beside their existing `window`
  publication to make that possible; the publication stays, because every
  reader and 15 QA checks still use it.
- **Writing those declarations and then checking them caught six that were
  wrong**: `MCU_CONFIG`'s real keys, `MCU_SUPABASE_STATUS` being an object and
  not a string, `mediaURL`'s arity, `MCU_creditRoster`'s signature, four i18n
  functions (`storyLabel` takes a story string, `release` returns an object,
  `budget` takes a number, `languages` returns different keys), and two
  missing kinds in the Up next result union. None was a runtime bug; all were
  places where the documentation in my head disagreed with the code.
- **Fully typed under `strict`:** the data layer, the Supabase client, all
  eight shadcn components, the design preview, and `poster`, `upnext` and
  `about`. The other ten V3 app files are marked, and the four largest hold
  75% of what is left.
- **The shadcn components are regenerated by the CLI as TypeScript** rather
  than hand-typed — they were `.jsx` only because `components.json` had
  `"tsx": false` when there was no tsconfig to generate against. They now
  carry upstream's own types.
- **TypeScript is pinned to 5.9.3, not 7.0.2.** A ten-thousand-line migration
  needs a checker whose verdicts are trustworthy more than fast, and 7.0.2 is
  a brand-new major (the Go rewrite) — the same reasoning that kept React
  at 18.
- `qa/load-catalog.js` is new: three checks build their expectations from the
  catalog source, which Node can no longer execute now that it carries
  annotations, so they share one loader that transpiles it with the
  repository's own pinned TypeScript. `checks.json` follows the renames.

Verification:

- `npm run typecheck` green at full `strict`.
- `bash qa/regress.sh` on the final tree: **all 45 check runs clean, exit 0**,
  both accessibility scans report no violations.
- The design preview renders on React 18.3.1 with **no console or page
  errors** (14 buttons, 4 switches, 3 cards, 10 badges, 4 separators). With
  the clean type check against `@types/react@18.3.31`, that settles that
  shadcn on Base UI does not need React 19 here; the upgrade stays its own
  ticket.
- `npm run build` output is the same size as before the conversion, as it
  should be: types erase.

Limits:

- Ten of the thirteen V3 app files are not yet typed, `app.tsx` (693 errors)
  and `mobile.tsx` (339) chief among them. Their headers carry the counts.
- The files are interdependent, so the leaves cannot be finished before the
  trunk: `picker` is blocked on `useCollection`'s shape in `tracking`.
- No application code changed, so there is nothing new to look at in a
  browser.

## V4 maintenance — three checks that had drifted from the app

Recorded: 2026-10-31 16:37 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

`test-skip`, `test-camera` and later `test-back` had been carried as
pre-existing failures, with `test-skip` suspected of being a real bug in the
Batch 10 guide work. **All three were the checks.** This change touches no
application code at all.

- **`test-skip` read only the phone's guide markup.** Batch 10 replaced the
  desktop meter row with one taller card (`GuideModule`), which draws progress
  as `.gm-count` and `.gm-notes` and puts the bulk action in its own footer,
  while phones kept `GuideMeter` and `.g-meter`. On desktop the check found
  nothing and reported `count null`, `meter: null / null` and `bulk action
  reads "null"` — which reads exactly like the guide failing to count its own
  stops. Four selectors now read both layouts, plus the Spatial Up next, which
  with a guide open is the guide card's own next stop rather than `.un-mrow`.
  Every expected value in the check is unchanged (`1/5`, `1/4`, `1 skipped`,
  `Mark 3 more seen`, `cap-brave`); they had nothing to compare against
  before, so most of this check had not really run on desktop since Batch 10.
- **`test-back` was invalidated by a feature a day after it was written.** It
  landed 2026-10-28; on 2026-10-29 the address gained the open title, so going
  forward restores `?title=…` and the details reopen — the address doing its
  job, not the sheet's history entry leaking. Step 2 still expected nothing to
  reopen, so the sheet stayed over the page and every later click timed out
  against it, which is why it reported a Playwright timeout instead of a
  failed assertion. Its init script is now wrapped in try/catch as well,
  because the check deliberately starts on a `data:` URL where `localStorage`
  throws and those page errors were its own doing.
- **`test-back` joins the regress set.** The phone's "each sheet owns one
  history entry, so Back closes it" rule is an AGENTS.md invariant that
  nothing else covers. Its absence from the full run is why this drifted
  unnoticed for three days, and why that rule had to be verified by hand for
  the previous commit.
- **`test-camera` needed nothing.** It is clean individually and in the full
  run; the flakiness the ticket described was already fixed by the earlier
  `clickCard()` and glide-settle work. Its one known console warning is
  unchanged and still allowed by name.

Verification:

- `bash qa/regress.sh` on the final tree: **all 45 check runs clean, exit 0,
  no `!!` lines**, both accessibility scans report no violations. The first
  fully green suite, and the first whose verdict can be trusted, since the
  runner bug that could report a failing check as clean was fixed earlier the
  same day.
- The full run is now 43 check runs plus two scans (was 42 + 2), about seven
  minutes. Counts in AGENTS.md, qa/README.md and docs/V4-PLAN.md updated, and
  the "known failures" notes replaced with what each one actually was.
- `test-skip`, `test-back` and `test-camera` each also run clean on their own
  against the built site; `test-camera` was run three times to check it is not
  flaky.

Limits:

- No application code changed, so there is nothing here to look at in a
  browser.
- `test-skip`'s desktop assertions are being exercised for the first time
  since Batch 10. They pass, but they have less history behind them than the
  rest of the suite.

## V4 maintenance — the whole app moves into the bundle (Phase 2, steps 4–5)

Recorded: 2026-10-31 16:05 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- All thirteen `.jsx` files move to `src/app/` and are imported by
  `src/main.js`. `index.html` loads one bundle instead of thirteen
  `text/babel` scripts, and the React, ReactDOM and Babel CDN tags are gone
  with them. supabase-js is the only script still fetched from unpkg.
- **They had to convert together, not one at a time as the plan expected.**
  React cannot be split across the two loading paths: a component from the
  bundled copy calling a hook inside a tree rendered by the CDN UMD copy reads
  that copy's null dispatcher and throws, so a half-converted app does not run
  at all. Removing the CDN React is therefore part of converting at all, which
  pulled plan step 5 into step 4. docs/V4-PLAN.md §5 point 7.
- **A change of delivery, not of design.** Every file still publishes its
  components on `window` and its readers still read them from there, so the
  thirteen files together add 34 lines and remove none — an `import React`
  line each, two more for `app.jsx`. No application logic was touched.
  Replacing `window` with real imports stays a later ticket.
- `tr`, `typeLabel` and `MPHASE_COLORS` are published explicitly now: other
  files read them as bare names, which worked only while every file shared one
  script scope. The bundle also publishes `window.React`, because `i18n.js`
  stays a classic script — the startup screen has to speak the visitor's
  language before the bundle arrives — and its `useI18n()` calls
  `React.useSyncExternalStore`.
- The source tree can no longer be opened in a browser, so `qa/run.js` builds
  once at the start of a run and serves every check that build. That retires
  `qa/precompile.js`: with no Babel to run and no tags to rewrite, what is left
  is serving the site, as `qa/serve-site.js`. `test-boot`'s three CDN-shaped
  failures become bundle-shaped ones (blocked, will not parse, never answers);
  `boot.js` itself needed no change.
- **Fixes a bug in the check runner that could report a failing check as
  clean.** It read an `"errors"` field only as far as the first `]`, and
  `test-skip`'s messages contain `{"skipped":[]`, so the value it saw ended in
  `":[]"` and passed the "is it empty" test. The first full run after the
  conversion printed "44 check runs clean" with a real failure in it. It now
  finds the end of the array by scanning, ignoring brackets inside strings.
  The two commits before this one were verified with the broken runner, so
  their "regression exit 0" meant less than it sounded; what carried them was
  the per-check comparison against a baseline, which compared printed output.
- Local development changes: `npm install`, then `npm run dev` on port 8126
  (strict, so the Google OAuth origin keeps working) instead of
  `python3 -m http.server 8123`, which can no longer serve the app at all.
  README, AGENTS.md and qa/README.md updated; `connections.jsx`, which was not
  loaded, is deleted.
- **Startup, measured on this machine with the old tree and the new one back
  to back** (`qa/perf2.js`, median of three, time to the first title): desktop
  1507 ms to **134 ms**; phone at 4× CPU throttle 6178 ms to **244 ms**. The
  old numbers were dominated by downloading Babel and compiling thirteen files
  in the page on every load.

Verification:

- `bash qa/regress.sh` on the final tree, re-run after the runner fix:
  **43 of 44 runs clean**, both accessibility scans report no violations.
- The one failure, `test-skip`, is **pre-existing and not caused by the
  bundle**, proven rather than assumed: run against the pre-conversion tree
  through in-page Babel it produces the same 7 errors with the same messages.
  `test-back` fails identically on both trees too (a Playwright timeout where
  the details sheet intercepts a click); it is not in the regress set, so no
  full run had shown it. Both are recorded on the pre-existing-failures ticket.
- `node qa/test-boot.js`: all five startup scenarios behave correctly, in both
  languages.
- Real browser (Chromium, the built output through `npm run preview`): desktop
  Spatial with bands, connection lines and Up next; the details drawer opens
  and Escape closes it and clears the URL; the language switch to Portuguese
  and back; phone at 375×812 in both languages, the guide promotion sheet, a
  details sheet, and browser Back closing that sheet — that last one by hand,
  because `test-back` is broken. No console errors anywhere.
- `data-ready="1"` is preserved and every `window` name the checks read is
  present.

Limits:

- **No real-device check.** Everything above is desktop Chromium, the phone
  sizes included. Spatial zoomed out on real iOS Safari is what the canvas
  memory rules exist for and what no headless check covers.
- Google sign-in was not exercised against the bundle.
- `test-skip` and `test-back` are left failing, exactly as they were before.

## V4 maintenance — back to React 18.3.1

Recorded: 2026-10-31 14:12 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- Reverts the move to React 19.3.1 made earlier today with the design-system
  preview. V4 stays on **18.3.1**, the version the app loads from the CDN.
- The reasoning for 19 was that nothing imported the npm React, so the upgrade
  was free. That stopped being true the moment the app's own files began
  entering the bundle: from then on they use the npm React, and converting the
  module system and the React major together would break Phase 2's single
  claim that behaviour is identical.
- The original driver was shadcn's components expecting `ref` as an ordinary
  prop. Tested: the eight copied components render on 18.3.1 with no console
  or page errors, because Base UI supports 18 and those components do not rely
  on it. They are our code, so `forwardRef` can be added if a later component
  needs it.
- A React 19 upgrade becomes its own ticket, to sit with the TypeScript step.
- Verified: both entries build; the design preview renders on 18.3.1 with no
  errors (14 controls, 11 phase swatches); the app is unchanged.

## V4 maintenance — the data layer moves into the bundle (Phase 2, steps 2–3)

Recorded: 2026-10-31 14:09 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- `data.js`, `guides.js`, `media-data.js`, `config.js` and `supabase-client.js`
  move to `src/` and are bundled by Vite. `index.html` loads one module script
  in their place; the twelve `.jsx` files are untouched and still compile in
  the browser.
- They are imported for their side effects and still publish the same `window`
  names. Changing the delivery and the sharing mechanism at once would be two
  changes in one commit, and the regression could not say which caused a
  failure. Exports come later, per file, as each reader converts. Those same
  names are the documented test surface that 15 checks read (plan §5.4).
- `watch-data.js` deliberately stays a separate file: `test-watch` replaces it
  over the network to serve a fixture, so it keeps its own URL (plan §5.6).
  `boot.js`, the locales and `i18n.js` also stay out for now — `boot.js` must
  run in the head before anything else, and the startup screen's timing needs
  its own look.
- `test-pickperson`, `test-nextup` and `test-refocus` read `data.js` from the
  source tree instead of the served site. They execute it in Node to build
  their expectations, and expectations should come from the source rather than
  from whatever is in the build.
- **`qa/precompile.js` now emits `defer`** on the scripts it rewrites. It turns
  each `text/babel` tag into a plain classic script; in the real page Babel
  runs those after `DOMContentLoaded`, which is after any module script, but as
  plain classic scripts they ran during parsing — before the bundle. The first
  run after this change failed 43 of 44 checks with nothing wrong in the app.
  `defer` puts them in the same ordered queue as the module and restores the
  real order. Recorded in the plan as §5.2.
- The build guard now ignores module scripts, which are Vite's to bundle.
- Verified: full regression against the build, exit 0, both accessibility scans
  clean, and 42 of 44 checks identical to a working-tree baseline run. The two
  that differ are the known pre-existing pair (`test-skip`, `test-camera`),
  unchanged from that baseline. All fourteen `window` names confirmed present
  in the built page with no page errors; `qa/smoke.js` clean.
- Limits: twelve `.jsx` files are still compiled in the browser, so the
  conversion is maybe a third done by file count and much less by line count —
  `app.jsx` and `mobile.jsx` are untouched. No real-device check. The startup
  screen's timing has not been re-examined.

## V4 design — design-system preview page

Recorded: 2026-10-31 13:44 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- Sets up the V4 design system on its own Vite entry, `design.html`, reachable
  at `/design.html` on the V4 preview. The app never loads it and it never
  loads the app: `index.html` is untouched, and the app still loads React
  18.3.1 from the CDN and compiles its `.jsx` in the browser.
- An approved exception to "Phases 2 and 3 do not overlap" (docs/V4-PLAN.md
  §9), so the new look can be reacted to before the module conversion makes it
  possible to apply it to the app. The rule guards against migration risk and
  design churn sharing a batch; a separate entry mixes neither.
- Tailwind 4.3.3 and shadcn 4.23.0 with Base UI 1.9.0, set up with
  `npx shadcn@4.23.0 init --base base --preset vega`: Vega style, Neutral base
  colour, default radius, Inter, lucide icons. `components.json` is committed
  and the components live in `src/components/ui` as our own code.
- `src/index.css` is the token file docs/V4-PLAN.md §6 describes: shadcn's
  variables with a light `:root` and a `.dark` block. The phase colours join
  them as `--phase-1` … `--phase-6`; the dark values are V3's, and the light
  ones are darkened so they hold WCAG AA on a light background.
- The preview shows the surface tokens, the phase colours, the controls, and
  the Spatial card, details drawer and phone sheet rebuilt on the new
  components. Those three are static compositions: the Escape ladder, the
  modeless drawer and the sheet's history entry are Phase 4 work.
- npm React and ReactDOM move to 19.3.1. Nothing imported the npm copy yet, so
  this costs nothing today where after the conversion it would be a migration;
  it also avoids adding `forwardRef` to every copied component, since shadcn's
  components expect React 19.
- Verified: the app is untouched — its built page still carries 13
  `text/babel` tags and the same stylesheet fingerprint as before this change,
  and `qa/smoke.js` is clean against the built site. The preview page was
  looked at in a browser in both themes at desktop and phone widths; the phase
  swatches, the tokens and the three surfaces render, and nothing scrolls
  sideways on a phone. `npm audit` reports no vulnerabilities.
- Corrects AGENTS.md: the shadcn CLI's preset is `vega`, not `base-vega`;
  `--base base` is what makes the recorded style `base-vega`.
- Limits: no contrast measurement yet, so the light phase colours are
  calculated rather than verified with axe-core; no Portuguese pass, since the
  page has no translated strings; the components are not wired to the app's
  interaction rules; and the regression was not re-run, as no app file changed.

## V4 design — component base decided: shadcn/ui on Base UI, Vega style

Recorded: 2026-10-31 13:17 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- Records Andre's decision of 2026-10-31: V4's component base is shadcn/ui on
  Base UI, starting from shadcn's Vega style (preset `base-vega`: Neutral base
  colour and theme, default radius, Inter, lucide icons), with light and dark
  themes from day one. It starts from the library's own defaults, not V3's
  colours; V4's art direction arrives later through Figma variables.
- Chosen after comparing shadcn/ui and Radix Themes side by side on their
  default themes, in both modes, against V3's Spatial card, details drawer and
  phone sheet. Answers question 5 in `docs/V4-PLAN.md` §10.
- `AGENTS.md` gains a **Design system (V4)** section after **Figma (V4)**: the
  decision, the rule to start from library defaults, the CLI pinned to an exact
  version with `components.json` committed, components owned in
  `src/components/ui/` and restyled there rather than wrapped, shadcn's CSS
  variables as the single token file with `:root` and `.dark` blocks (phase
  colours among them), the `dark` class following `prefers-color-scheme`, and
  the rule that this repository's interaction standards beat library defaults.
  The opening line of **Design, accessibility and interaction standards** now
  names the incoming system.
- Setup is Phase 3 work and does not start yet: Tailwind, shadcn and Base UI
  are not to be installed until that ticket begins, after the Phase 2
  migration and the TypeScript conversion.
- `docs/decisions.md` gains the 2026-10-31 row, and `docs/V4-PLAN.md` marks §6
  **Component base** and §10 question 5 as decided.
- Verified: documentation only, no app code and no dependency change, so no
  checks were run.
- Limits: nothing is installed or configured, and the open question of React
  versions is unresolved — V4 pins React 18.3.1 while shadcn's current
  components take `ref` as an ordinary prop, which React 18 does not forward.
  The Notion ticket carries that question, to be settled before setup starts.

## V4 maintenance — build scaffold (Phase 2, step 1)

Recorded: 2026-10-31 13:06 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- Stands up the V4 build step without converting the app. Added
  `package.json`, `package-lock.json`, `vite.config.js`, `jsconfig.json` and
  `vercel.json`; `.gitignore` now covers `node_modules/` and `dist/`.
- Pinned after checking npm the day the work started: Vite 8.3.5,
  @vitejs/plugin-react 6.1.2, React and ReactDOM 18.3.1. The plan's draft had
  named Vite 7, which was out of date.
- Vite takes `index.html` as its entry unchanged: it bundles the two
  stylesheets into one fingerprinted file in the head and fingerprints the
  icons, while every app script still loads the V3 way, compiled by Babel in
  the browser. A `LEGACY` list in `vite.config.js` copies the 23 unconverted
  scripts and the root-path assets into the build, and shrinks to nothing as
  the conversion proceeds. `favicon.png`, `apple-touch-icon.png` and
  `og-image.jpg` keep their plain root paths, because iOS and crawlers ask for
  those directly without reading the HTML.
- A guard plugin fails the build if `index.html` ever loads a script that is
  neither bundled nor copied, so a missing file is a build error rather than a
  404 that shows as a blank page.
- Build settings live in `vercel.json` on this branch, never in the Vercel
  dashboard: dashboard settings apply to every branch and would break `main`'s
  static deploy.
- The dev server runs on port 8126 with a strict port, so the Google OAuth
  origin registered for local work keeps working and the server stops rather
  than quietly taking another port.
- `qa/precompile.js` now serves any file under the root when `SITE` is set, so
  the checks can be pointed at a built site. Guarded on `SITE`: a run against
  the working tree is unchanged. This is part of the next ticket, brought
  forward because this one could not otherwise be verified — the plan had
  claimed `SITE` alone was enough, and it was not. `docs/V4-PLAN.md` §5.1
  records the mistake, and §3.1 and §9 now match what was built.
- Verified: the full regression run three times, once against the working tree
  and twice against the build. 41 of 44 checks clean in all three, both
  accessibility scans clean in all three, and the second built-site run was
  fully green (exit 0) where the working-tree baseline was not. `test-fit`
  matches the working tree at all 24 viewports. `qa/smoke.js` clean against a
  locally served build and against the deployed preview. Dev server confirmed
  on 8126. `main` was then redeployed from the Vercel dashboard with the build
  cache off: Ready in 2 seconds with no install or build step, production
  still serving the unbuilt V3 site (plain stylesheet links, no `/assets/`
  bundle) and its smoke check clean.
- Limits: the app is not converted to modules, which is the next work. Three
  checks are noisy for reasons that are not the build's — `test-skip` fails
  identically on the working tree and the build, `test-camera` is
  timing-sensitive and was the working-tree run's only flagged failure, and
  `test-guides` crashed once in one built-site run but passed in the other and
  twice more on its own; the first two have their own ticket. No real-device
  check. The AGENTS.md no-build rule is left in force until the conversion
  lands.

## V4 maintenance — V4 plan

Recorded: 2026-10-31 12:11 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- `docs/V4-PLAN.md` added and approved by the user: the Phase 1 plan for V4.
  Goals, non-goals and what "done" means for the release to `main`; the build
  step (Vite 7, React 18.3.1, plain JavaScript, folder layout, how the locales
  and data files load); Vercel build settings from a committed `vercel.json` so
  `main`'s static deploy is untouched; how `qa/` runs against the built site;
  the design-system and Figma token approach; the risks; and how V3 fixes merge
  forward.
- Records the language decision: the build step lands in plain JavaScript, and
  the TypeScript conversion is its own ticket and batch straight after Phase 2,
  before the design system starts. Phase 2's only claim is "behaviour
  identical" and the regression suite certifies it, so a type migration in the
  same commits would leave a failing check unable to say which change caused
  it.
- Three findings from measuring the current tree shaped the plan: every file
  already declares its exports through a trailing `Object.assign(window, …)`,
  so the module conversion is largely mechanical; `qa/precompile.js` already
  resolves its document root through `process.env.SITE`, so the checks can
  serve the built site without being rewritten; and 17 of the 42 checks read
  the app's globals from inside the page, which is the migration's most likely
  hidden breakage.
- `docs/decisions.md` gains the 2026-10-31 row for the language decision.
- Verified: documentation only, no app code. Smoke check run against the V4
  preview after the push.
- Limits: the plan is approved, the work in it is not started. Five questions
  in §10 are still open — `watch-data.js` lazy loading, the QA globals surface,
  Supabase config, the V3 support window and the component base. The no-build
  rule in AGENTS.md stays in force until the ticket that lands the build step
  rewrites that section.

## V4 maintenance — V4 workspace setup

Recorded: 2026-10-31 10:59 EDT (-0400). Pushed to `version/4.0` (V4 staging);
merged to `main` (production) on 2026-11-01 after Andre's approval, in the
first V4 release.

- Opens V4 on branch `version/4.0`, worktree `MCU-V4`, deployed as the preview
  `https://mcu-connections-git-version-40-afr-bfcd.vercel.app/`.
- `AGENTS.md` retargeted to V4: `version/4.0` as staging, Notion **V4 Tasks**
  as the backlog (with the **Design** type and the **Figma** and **V3 ticket**
  fields), batches restarting at Batch 1, the `V4` CHANGELOG prefix, and a new
  **Figma** section making the Figma file the source of truth for the V4 design
  while accessibility, keyboard, contrast and localisation rules still win over
  a frame. The no-build rule stays in force on `version/4.0` until the build
  step has its own approved plan.
- `docs/V4-KICKOFF.md` added: the V4 brief, the first-session checklist, the
  six phases, the Figma round trip and the open decisions.
- `.mcp.json` registers the remote Figma MCP server for this folder; it holds
  no credentials, and `.vercelignore` keeps it out of the deployed site.
- `README.md` carries the V4 preview link and its sign-in redirect row, and its
  roadmap, deploy and credit lines now point at `version/4.0`.
- Verified: `git status` clean against `origin/version/4.0` before and after;
  the five setup files read in full; the Notion V4 Tasks board checked (nothing
  in Approved, the kickoff ticket claimed); the V4 preview loaded in a browser
  on 2026-10-31 (desktop, signed out, no console errors); `qa/smoke.js` run
  against the preview after this push.
- Limits: documentation and agent configuration only — no app code, so no
  regression run. The Figma MCP is registered but not yet authenticated, so no
  frame has been read. Google sign-in, sync and sign-out on the V4 preview are
  untested; `docs/HANDOFF.md` and `docs/decisions.md` still describe V3 and are
  retargeted by their own ticket.

## V3 feature — guides, phone Spatial and celebrations (Batch 10)

Recorded: 2026-10-30 23:54 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 10 merge. ([`43247ea`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/43247ea1bd01527c97259bd9869405ce2dbf783e))

- Guides: skip a stop and bring it back from the List, the Grid, the details
  or a Spatial card; the view options a guide doesn't use are dimmed with a
  tooltip; a completed guide turns green and bursts confetti every time it
  completes; "Part of" in the details folds; a guide leading to a coming
  release is offered once to returning visitors.
- Desktop guide module: one card heads the guide List (the guide and its
  blurb, progress segments, the next stop with Seen and Open, Include
  optional, Mark N more seen, the stepper and ×) and one row floats over
  Spatial. Seen stops are compact rows on desktop and phones.
- Phones: one guide dock at the bottom and a shorter top bar; the List keeps
  its last card clear of the dock; the arrows step on to the destination.
  Spatial opens on Up next once anything is Seen, at one card size in every
  order; a guide opens on its next stop at 85%; the zoom control shows only
  while zooming; the instruction line is gone.
- Closing a title's details lands on that title (a title opened from Up next
  is centred, with no ring left behind). Confetti bursts from the toast's
  edges, aligned with it when the details are open; All titles progress
  turns green when complete. The logo goes back home; titles not yet out
  hide Seen.
- Verified: `bash qa/regress.sh` on the final tree, 44 check runs clean in
  5m43s with both accessibility scans clean; checked in the in-app browser on
  desktop and a phone-sized viewport, English and Portuguese. Limits: not
  checked on a real iPhone or in Safari itself.

## V3 maintenance — faster QA checks

Recorded: 2026-10-30 23:53 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 10 merge. ([`fb64cea`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/fb64cead2ff69f3ecac22c14282d400dfff322fe))

- Checks run four at a time on their own ports, with the app's scripts
  pre-compiled once and a ready signal instead of fixed sleeps. `qa/quick.sh`
  runs a ticket's check plus those mapped to the changed files
  (`qa/checks.json`); `qa/smoke.js` checks a deployed site.
- Measured: the full run with both accessibility scans went from about 24
  minutes to 5m43s; a typical ticket's checks from about 5.5 to about 1.5
  minutes.

## V3 maintenance — reconcile the V3 planning documents

Recorded: 2026-10-30 23:53 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 10 merge. ([`a643831`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/a6438317b39165ece06b1333c0afbc8e4d1dd714))

- `V3-SPEC.md`, `V3-TASKS.md` and `KICKOFF-PROMPT.md` open with a note that
  they are history; lines that no longer hold carry dated Superseded notes.
  The handoff and decisions record the current state and open questions.

## V3 maintenance — stop loading connections.jsx

Recorded: 2026-10-30 23:53 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 10 merge. ([`60642d0`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/60642d0f74e5829ec55bca7888158cd53d791ab3))

- The unused early line layer is no longer fetched and compiled at startup;
  the file stays for reference. Verified by the full check run.

## V3 fix — audit unknown catalog budgets

Recorded: 2026-10-30 23:53 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 10 merge. ([`ec6f5bf`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/ec6f5bfee5519c8c4749e1bdece87d56cae51f92))

- Series no longer show the generic per-episode figure: only series with a
  reported total of their own (Secret Invasion, Echo) list one; the rest read
  "Not published". Thunderbolts* and The Fantastic Four: First Steps gain
  reported budgets. Sources and dates in `docs/CATALOG-AUDIT.md`.

## V3 improvement — move through the desktop List with the arrow keys

Recorded: 2026-10-30 08:54 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 9 merge. ([`5752bc8`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/5752bc8f7d61ce985f73e345d09bf75b01f847fe))

- With a title's details open, ← → step through the titles in the order the
  List shows (sort, tab, filters, search), wrapping at the ends, and a screen
  reader hears "title, n of N". ↑ ↓ move between rows keeping the column, Home
  and End go to the ends, and the details follow, also after a mouse click.
  The Guides table works the same way. A pinned character or a guide keeps its
  own stepping, and arrow steps no longer pull focus into the details.
- Fixed: a row stepped to (wrapping to Iron Man with Tony pinned, for example)
  no longer sits half under the pinned meter and column headers: 38px were
  hidden before, none now. On phones a step onto the Up next title scrolls to
  its card.
- Verified: new `qa/test-listkeys.js`; checked in the in-app browser. Limits:
  not checked in Safari itself or with a real screen reader.

## V3 feature — "What have you seen?"

Recorded: 2026-10-30 08:54 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 9 merge. ([`0b7be83`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/0b7be835d20609623e8a7c10802e9296360a3ae8))

- A poster grid of every released title by phase, to mark many as seen in one
  go. The first-visit welcome offers it ("Mark what I've seen"); the account
  menu or sheet and the Seen tab's empty state open it later, with titles
  already seen ticked and untickable. Saving is one change: one toast with
  Undo, at most one celebration, no extra confirmation. Closing with unsaved
  picks asks first (Back too, on phones).
- Verified: new `qa/test-picker.js`; the accessibility scan covers it on
  desktop and phone. Limits: saving while signed in and a real iPhone not
  checked.

## V3 feature — curated watch guides

Recorded: 2026-10-30 08:54 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 9 merge. ([`fec0e8b`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/fec0e8ba6f3fe96b655e2074cffc943a46655dda))

- Six guides: before Avengers: Doomsday, the Infinity Saga essentials,
  Spider-Man, the Avengers films, the Multiverse Saga and the animated series.
  Each stop says why it is there; optional stops sit behind "Include
  optional". An open guide shows only its own titles (close it to see all):
  a List and Grid of stops, a route in Spatial, a stepper, Up next on the next
  stop and "Mark N more seen". Search suggests guides, a character with a guide
  offers it, a title's details list its guides, and finishing a guide bursts
  green confetti once.
- Verified: new `qa/test-guides.js`; the Guides List's columns line up with
  their headers at every width. Four older checks now tell the Guides button
  from the Filters button.

## V3 improvement — a whole phase at once in the desktop List

Recorded: 2026-10-30 08:54 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-30 after the user's approval, in the Batch 9 merge. ([`40f8fa5`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/40f8fa5656bcfb693cf053dd12fdf95df13168d1))

- In By Phase, each phase header has a checkbox that selects that phase for
  the bulk bar, and every progress header offers "Mark all seen" / "Mark N
  more seen" with the phones' confirmation and Undo.
- Verified: `qa/test-bulk.js` covers the phase checkbox, its mixed state and
  the header button.
- Batch verification, on the final tree: `bash qa/regress.sh` 35 check runs
  clean; the accessibility scan empty for 13 screens in English and
  Portuguese.

## V3 feature — Up next: what to watch now

Recorded: 2026-10-29 23:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 8 merge. ([`9a092a6`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/9a092a62e2b9ac781fdeedd98f924f4a8c85924d))

- One suggestion: the first released title not marked seen, earliest first in
  release order (story order on Chronological), or the first of the list itself
  on A–Z, IMDb and RT, in the list's direction. It follows the Watchlist tab, a
  pinned character and the type, phase and budget filters, and says which.
- A card at the top of the phone List and Grid (the title's own row left out),
  a strip above the desktop List, a row in desktop Spatial's All titles meter,
  a chip in phone Spatial. Mark seen and Watchlist go through the usual toast,
  Undo and sync; the × hides it until the page is reloaded. Caught up names the
  next arrival; the Watchlist tab has its own states.
- Verified: new `qa/test-nextup.js` (expectations from the catalogue and
  today's date); full suite and both scans on the final tree. Limits: the
  wait for a signed-in collection was checked as a guest only.

## V3 improvement — collapsible sections in the title details

Recorded: 2026-10-29 23:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 8 merge. ([`0d7d6bd`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/0d7d6bd1bef96d6aa394214b9bf2a6fb87a4265b))

- The cast and Where to watch are collapsible (one shared `DetailSection`):
  the cast starts open and Where to watch closed, so the details stay short as
  sections are added. A section stays as you left it while you move between
  titles; a reload restores the defaults. Nothing is stored.
- Verified: `qa/test-details.js` and `qa/test-watch.js` check the defaults and
  that each heading toggles only its own section.

## V3 feature — where to watch, by country

Recorded: 2026-10-29 23:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 8 merge. ([`182acb0`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/182acb0fc03a13f7ba5b5a86284e71d150f7c558))

- A Where to watch section lists the services offering a released title in
  your country (stream and free with logos, rent or buy on one line), with one
  link to TMDB's page and a "Checked <date> · Data from JustWatch via TMDB"
  credit. The country is guessed from the browser and can be changed; it is
  kept on this device only. United States and Brazil to start.
- Data: a dated snapshot (`watch-data.js`) written by `tools/refresh-watch.js`
  from TMDB (token from the maintainer's environment only; the script is not
  deployed). First run 2026-10-29: 60 released titles, no title or year
  warnings. The app makes no API calls of its own. About credits JustWatch.
- Verified: new `qa/test-watch.js` (every state against a test snapshot, plus
  the real one); screenshots with real logos.

## V3 improvement — the same title details on desktop and phones

Recorded: 2026-10-29 23:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 8 merge. ([`32ba5a5`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/32ba5a56c1a33e52f4f13e3ac471ec940e836055))

- One shared body for the desktop drawer and the phone sheet: poster beside
  the title and dates, then scores ("Ratings after release" when not out yet),
  budget ("Not published" when unknown), Seen and Watchlist, synopsis and cast.
  The drawer gains the poster, scores and budget and scrolls as one; phones
  gain the budget and the search highlight in the title.
- Verified: new `qa/test-details.js` (desktop, 390 and 320px).

## V3 improvement — desktop List meters above the column headers

Recorded: 2026-10-29 23:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 8 merge. ([`17a2dde`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/17a2dde8e31b83f08a17e21fd76f7075ef84b4b8))

- The All titles meter (or the current phase's, in By Phase) pins at the top
  of the List with the column headers right beneath it; each phase takes the
  top slot at its boundary. The table's ARIA stays valid.
- Verified: `qa/test-progress.js` updated to the new positions.

## V3 improvement — subtler desktop List checkboxes

Recorded: 2026-10-29 23:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 8 merge. ([`09db23e`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/09db23ec4be718dbab2d0c0d6968226f6014c03a))

- Drawn checkboxes instead of the browser's white boxes: a muted outline, the
  accent with a dark tick when selected, a dash for the mixed header. Contrast
  measured at 4.66:1 or better for the outline and 4.83:1 for the fill.

## V3 workflow — the full suite runs once per batch

Recorded: 2026-10-29 00:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 7 merge. ([`24c6150`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/24c6150c6b6521a52e5d30ef40182b52cff0a877))

- User decision: each ticket runs the targeted check for its area before
  review; the full regression and both accessibility scans run once per batch,
  on the final tree, before staging, reading the scan's output rather than its
  exit code. Recorded in AGENTS.md and the handoff doc.
- [`4eba664`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/4eba664b8693c138243b13aadd635c1c432181df) restores the executable bit on `qa/regress.sh`, which the
  Batch 7 commits dropped (they were assembled from per-ticket file contents
  staged as mode 100644). `bash qa/regress.sh` was unaffected.

## V3 feature — mark many titles at once

Recorded: 2026-10-29 00:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 7 merge. ([`8e6543d`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/8e6543d826a8848fcaf4c2042226a7386c92c018))

- Desktop List: a checkbox column (header box with a mixed state, Shift-click
  ranges) and a bar with Mark as seen, Add to Watchlist, More > Mark as unseen
  and Clear, each showing how many titles it will change. Escape clears the
  selection before it closes the details.
- Phones: "Mark all seen" / "Mark 4 more seen" on each By Phase header and on
  the All titles header in every other order.
- Per-title writes (user decision): one commit and one guest-storage write per
  action, then each title through its own writer queue, so failures roll back
  per title. One rule (`bulkTargets`) decides what an action changes, for the
  counts and the action alike: unreleased titles are never marked seen in
  bulk. One toast and one announcement, with Undo restoring each title (a
  replaced watchlist included); over 20 titles, and any Mark as unseen, ask
  first, and Cancel keeps the selection.
- **Verified:** `qa/test-bulk.js` (selection, exact targets, one storage write
  and one announcement, Undo, the confirmation, real Escape presses, phone
  headers); looked at the bar, the confirmation and both phone headers.
- **Limits:** the signed-in path (the same queue a single mark uses) has not
  been exercised against a real session; not checked on a real phone.

## V3 feature — shareable addresses

Recorded: 2026-10-29 00:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 7 merge. ([`2597259`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/2597259ef26aa5a9c63a7549e3c703e5ce2b3f02))

- The address carries the open title, a pinned character, the view, sort,
  order and catalogue filters; a link opens exactly that state, and what it
  leaves out takes the app's defaults. The collection filter, search text,
  language and anything from the account never go in; names avoid the sign-in
  redirect's `code` / `state` / `error`.
- The address follows the state without adding history (keeping the phone
  sheets' Back working); Back and Forward restore the title and character, and
  a phone sheet closing itself restores nothing. The first version treated that
  as Back and unpinned a character just pinned from the details; the regression
  run caught it (`test-align2`).
- **Verified:** `qa/test-urlstate.js`; looked at two example links rendered.
- **Limits:** opening a link saves its view and sort as this device's
  preferences; desktop Back still leaves the site; a first-time visitor sees
  the welcome first; not checked on a real phone.

## V3 fix — the desktop List's All titles header is valid ARIA, and pins

Recorded: 2026-10-29 00:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 7 merge. ([`d8f2434`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/d8f243441dc7be6d52b3a9acde76ff873a1be880))

- Batch 6 shipped the header in a rowgroup with no row: a **critical** axe
  `aria-required-children` violation in production, and the reason it never
  pinned. It is now a row owned by the table.
- `qa/a11y-scan.js` now exits non-zero on any violation. It used to exit 0
  whatever it found, which is how the Batch 6 entry below came to report a
  clean scan.
- **Verified:** axe output empty for 7 screens in both languages; `test-progress`
  checks the header pins under the column header.

## V3 feature — release status at the precision the catalog knows it

Recorded: 2026-10-29 00:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to main
(production) on 2026-10-29 after the user's approval, in the Batch 7 merge. ([`c54e685`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/c54e6859f814c6aa909a124b214a4da98ea4d962))

- "Released May 2, 2008", "Coming December 18, 2026", or "Expected March 2027 ·
  day not yet confirmed" in the details; Upcoming / Expected badges on titles
  not out yet; Released only in the Filters panel. A month window never counts
  as released.
- **Verified:** `qa/test-release.js` (expectations from the dates at run time);
  badge contrast computed (4.83 and 6.51 at worst); looked at in both languages.
- **Limits:** not checked on a real phone.

## Batch 7 verification

Full regression on the final tree: 29 check runs clean. axe: no violations in
7 screens × 2 languages, read from the output.

## V3 feature — progress: phase meters on By Phase, one catalogue meter everywhere else

Recorded: 2026-10-28 22:13 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.
Revises the progress entry below after the user's design review
([`1fc30af`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/1fc30af58978698053888ec313ecc39583bfdb5a)).

- **One rule.** Per-phase meters appear on the By Phase tab only; every other
  order (Release, Chronological, A–Z, IMDb, Tomatometer) shows one **All
  titles** meter over the whole catalogue, so the Release and Phase tabs no
  longer repeat each other. The rule is shaped once (`viewProgress` in
  `app.jsx`); the views draw whichever tallies they are handed.
- **Segmented meter**, one tick per released title (a solid bar past 24), so
  it reads as "5 of 6" without the number. A complete group shows a check disc
  sized to the label's cap height instead of a glyph that read too small. The
  meter fills when its header scrolls into view (once; never with reduced
  motion). Type scale: 13px label, 11px count.
- **Sticky headers** in the desktop List (one rowgroup per phase, pinned under
  the column header), the phone List and the phone Grid, which now share one
  component. Seen runs on the phone no longer straddle a phase boundary.
- **Spatial:** phase headers sit on opaque pills above their rows (no
  `backdrop-filter` inside the canvas); row names without a meter hug their
  text. Pill and camera share `BAND_LABEL_H`, which fixes the first By Phase
  pill being cut off and the Chronological one sliding under the count pill.
  By Phase now has bands at all. The All titles meter floats top-right on
  desktop and takes its own row under the count pill and zoom control on
  phones, and stands down while a title is selected.
- **Verified:** `test-progress` rewritten around the rule — all 30 view and
  order combinations, the counts (released only, collection tab ignored,
  hidden during search), stickiness, framing and the reveal; full regression
  (26 check runs) clean; axe clean in English and Portuguese. **Correction:**
  it was not — see "the desktop List's All titles header is valid ARIA"
  above; the claim was read from an exit code that never failed. Looked at in the
  browser at 1440 and 375 wide.
- **Limits:** not checked on a real iPhone; the phone layout is from Chromium
  device emulation.

## V3 improvement — the Spatial count follows a selected title

Recorded: 2026-10-28 22:13 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge. ([`3b2a5f5`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/3b2a5f5bc510a47c2606cea35bf91e8119f1adb2))

- Selecting a title fades the unconnected cards out, but the count pill kept
  saying "64 titles". It now reads, for example, "17 of 64": the selected title
  plus every title sharing a character with it, the same set the canvas keeps
  lit. Closing the selection returns it to the total.
- **Verified:** `test-camera` compares the pill with the number of lit cards
  rather than a fixed figure; checked by hand on The Incredible Hulk (17 lit,
  "17 of 64").

## V3 fix — every character has a portrait

Recorded: 2026-10-28 22:13 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge. ([`958dc3d`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/958dc3d741a1d620ac0389591000fe4b41cdf27d))

- Ten portraits were missing because adding a character does not add its TMDB
  path: the five sparse-series characters (Maria Hill, Talos, Monica Rambeau,
  Mobius, Sylvie), four added earlier (Frank Castle, Tommy, Paladin, Silver
  Surfer) and the recast credit Akira Akbar. Each path was taken from TMDB's
  person search and confirmed to return a real image.
- Mike McGill stays as initials: TMDB has no photo for either person of that
  name.
- **Verified:** `test-recastname` fails when any character or credited
  performer has no portrait, with Mike McGill the one allowed exception.

## V3 improvement — a recast performer's own title count beside their name

Recorded: 2026-10-28 22:13 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge. ([`56f44b7`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/56f44b73b68d295883bc22cd138f036b755be67d))

- The banner names the performer credited on the title in view, but counted the
  whole character's titles beside the name while the stepper already showed
  the chain ("Mike McGill · 8 titles", "6 of 8"). It now counts that
  performer's share, the figure the search suggestion shows: Mike McGill 1,
  Harrison Ford 1, William Hurt 5.
- **Verified:** `test-pickperson` now keeps the stepper total and the subtitle
  count apart (it had failed on every recast) and passes for all 179 subjects;
  `test-recastname` checks Norton (1) and Ruffalo (8).

## V3 improvement — the character banner stops at the details panel

Recorded: 2026-10-28 22:13 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge. ([`3ae170c`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/3ae170c5fefd70911b9f0c9376674abbf925862d))

- Reverses the full-width pinned banner recorded further down ("the pinned
  banner holds its place…"). That kept the stepper still, but the hover preview
  stopped at the panel, so pinning a character changed the bar's width, which
  the user found worse than the controls moving. Both now take the same 402px
  indent; the panel hangs from the toolbar at full height and the `--cb-h`
  measurement is removed.
- **Verified:** `test-bannerhold` rewritten for the new rule (content stops
  before the panel, panel hangs from the toolbar, hover and pinned indents
  equal).

## V3 feature — phase and era progress, on four of the five surfaces

Recorded: 2026-10-28 17:43 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.
Revised after design review; see the progress entry above.

- One shared `ProgressHeader` carries the label, the `9/18` count in JetBrains
  Mono, a slim bar in the group's colour and a screen-reader sentence
  ("9 of 18 seen"). Complete swaps the count for a check; nothing-seen shows an
  empty track rather than hiding, so the structure stays consistent.
- **Desktop List:** By Phase headers become progress headers, and Release gains
  a phase divider above the first year of each phase, acting as a super-header
  while the year rows below are untouched. **Desktop and phone Spatial:** phase
  bands (Release) and era bands (Chrono) carry the count and bar. **Phone
  List:** the same divider, including inside the folded seen-runs branch, which
  renders through a different path and needed the divider added separately —
  it deliberately does not fold with a run, being the super-header.
- Counts are computed from `filtered`, never `visible`: the collection tab must
  not feed its own numbers, or Seen would always read 100% and Unseen 0%. They
  follow the type, phase and budget filters, count seen over **released** only,
  report "+N" for upcoming, and update live.
- Hidden during a text search and while a character is pinned — both narrow the
  base set, and pinned-character progress is the one thing the ticket rules out.
- **The phone Grid is NOT done.** It has no group headers at all today, only
  seen-run sections, so "the same component" means giving the Grid grouping it
  has never had. That is a visible change to that view's design rather than a
  styling job, so it is left for the user's call.
- Verification: checked in a real browser on desktop List (Release and By
  Phase), desktop Spatial (Release and Chrono), phone List and phone Spatial,
  in English and Portuguese, with complete, partial and zero states and the
  live update after marking. At 320px all six dividers sit on one line and fit
  the width. axe-core clean on 7 screens in both languages. Contrast measured
  against real composited backgrounds: complete count 8.34:1, partial count and
  the upcoming hint 5.63:1.
- One fix found by measuring rather than looking: `.pgh-up` had `opacity: .75`
  over `--text-muted`, which sits exactly at AA, so the fade would have pushed
  the "+N" hint under the line. The opacity is gone.
- `qa/test-progress.js` guards the rules that are easy to get subtly wrong:
  one divider per phase, the denominator counting **released** titles only
  (Phase 6 reads 0/7 with "+4"), a live update after marking, the count
  **not** following the collection tab, and the headers standing down during
  a text search and returning after it.
- `qa/shots-progress.js` is a screenshot run, not part of regress.sh: it
  captures all eight surfaces in both languages into `qa/shots/` for the
  design review the ticket requires.
- The full suite ran clean against the committed change — **all 25 check
  runs clean, exit 0**, with nothing edited underneath it.
- Limits: the phone Grid is outstanding and needs the user's decision, and
  the screenshots still need their approval before this merges.

## V3 maintenance — five source-verified characters for the sparse series

Recorded: 2026-10-28 17:17 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- The review counted 11 series with two or fewer featured characters. Five
  characters were added, each verified per production and each chosen because
  it joins titles already in the catalog: **Maria Hill** (6 titles), **Talos**
  (2), **Monica Rambeau** (3), **Mobius M. Mobius** (2) and **Sylvie** (2).
- Sparse titles **13 → 9**. Captain Marvel and Secret Invasion are no longer
  sparse; Secret Invasion gains threads to five earlier titles through Hill and
  to Captain Marvel through Talos.
- **The credit-scene rule decided three of these**, and kept the pass honest.
  Maria Hill is *not* added to Infinity War — her only appearance there is the
  post-credits scene Fury was removed from. Talos is *not* added to Far From
  Home: Mendelsohn appears only in the post-credits reveal, since through the
  main feature he is disguised as Fury. Maria Hill *is* added to Far From Home,
  which looks like the opposite call but follows the same rule — the Hill on
  screen is Soren in disguise, yet Cobie Smulders plays her throughout.
- Two claims were checked and rejected. **Maria Hill is not in Civil War**: a
  Deadline piece lists her, but Wikipedia and CinemaBlend have her absent and
  that same list also mislabels Winter Soldier. **Mobius is not in Deadpool &
  Wolverine**: a pre-release cast guide predicted it, and the post-release
  cameo round-ups name only Happy Hogan and Thor. A prediction is not a credit.
- Monica Rambeau is a child/adult recast, so Captain Marvel carries
  `credits: { monica: 'Akira Akbar' }` and the batch 5 machinery handles it.
  Sylvie is a Loki variant and carries `prime: 'loki'`, the treatment He Who
  Remains and Victor Timely get for Kang.
- **Eyes of Wakanda stays at zero deliberately.** It is an anthology set
  centuries before the modern MCU, so its characters are genuine one-offs, not
  a missing appearance — the distinction the ticket asks for.
- Verification: checked in a real browser — all five are searchable and pin
  correctly with the right counts, and the credit resolver returns Akira Akbar
  for Captain Marvel and Teyonah Parris for WandaVision and The Marvels. No
  character was left with zero titles.
- Limits: the five have **no TMDB portraits**, so they fall back to initials.
  That is the designed behaviour and is better than risking a wrong face, but
  it is unfinished polish. The full suite had not yet run against this change
  when it was committed.

## V3 improvement — picking a title from search navigates to it instead of filtering by its name

Recorded: 2026-10-28 16:59 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- Picking a title put its name in the search box, which left a text filter
  behind. On the Spatial canvas that narrowed 64 cards down to the one just
  picked, stranding it with nothing to connect to — the one thing that view is
  for. Codex reproduced it with Iron Man 2.
- A title pick now clears the box and opens the title selected, so its rings
  come up and it lands among its neighbours. Typing text without picking still
  filters, exactly as before.
- The phase, type and collection filters are **not** touched, so a deliberate
  filter survives the pick rather than being silently reset.
- Verification: checked in a real browser — picking Iron Man 2 leaves the box
  empty, all 64 cards on the canvas, the card selected with its ring up and 41
  unrelated cards hidden, the details open, and the count still reading "64
  titles". `test-suggest` now asserts all three of those (empty box, catalog
  intact, title selected); it already captured them and never checked them.
- A pinned character now steps aside when a title is picked. Its narrowed
  canvas otherwise hid the very title just picked: pin Tommy Shepherd, who
  is in one title, then pick Endgame, and Endgame's details filled the panel
  while Endgame was not on the canvas at all. Only the pin goes; the phase,
  type and collection filters stay.
- That one was found by the new assertion rather than by eye — the first
  version of this change fixed the text filter and left this second way of
  stranding a title untouched.
- Limits: the phone path rests on `test-suggest`'s existing mobile case; no
  phone-width browser pass.

## V3 improvement — the pinned banner holds its place when the details panel opens

Recorded: 2026-10-28 16:55 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.
Reversed before release by "the character banner stops at the details panel".

- The banner was indented by `padding-right: 402px` to clear the drawer, which
  slid its mode toggle, stepper and close button 402px left the moment a title
  opened. Stepping with `›` is what opens a title, so the controls moved at the
  exact moment they were in use and the button left the cursor.
- The pinned banner now spans the full width and the drawer opens **below** it:
  `--cb-h` is measured with a ResizeObserver, like `--tb-h`, because the banner
  wraps and is taller in Portuguese — a constant would be wrong for the same
  reason it would be wrong for the toolbar.
- **Only the pinned banner counts.** The hover banner comes and goes as the
  cursor crosses a cast row *inside* the open drawer; tying the drawer's top to
  that would slide it out from under the pointer. The hover banner keeps the
  402px indent so its close button stays clear. The ticket did not anticipate
  this case.
- The cost is that the drawer's top moves on pin and unpin, which are
  deliberate and occasional, instead of on every step. It is transitioned, and
  `prefers-reduced-motion` keeps the slide-in but drops the reflow.
- Verification: new `qa/test-bannerhold.js` asserts the stepper's box is
  identical before and after the panel opens, that the panel starts at the
  banner's bottom and still reaches the viewport floor, and that hovering a
  cast row does not move it. `test-panel` and `test-camera`, which both measure
  drawer geometry, still pass. axe-core clean on 7 screens in both languages.
- Limits: desktop only by design; phones show a floating pill, not this banner.

## V3 improvement — a failed collection sync is visible without opening Account

Recorded: 2026-10-28 16:55 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- A failed account-wide load was reported only inside the Account panel, so a
  signed-in visitor browsed on with collection editing silently paused and no
  way to retry without opening a menu. `SyncStatus` now sits in the desktop
  toolbar and the phone app bar, and carries the Retry with it.
- It takes space only when something needs attention — a failure, or an account
  load in progress. Working sync and guest storage are reported through
  `role="status"` to assistive technology and nothing more: a permanent "all
  fine" chip is noise, and the Sign in button already says who you are.
- On phones "Syncing…" loses its words and leaves the spinner to say it,
  clipped rather than `display: none`, which would take the text from screen
  readers too. A failure keeps its words; it is the state that must be legible.
- It reuses `.acct-error`'s red rather than introducing a colour, so a failure
  reads the same wherever it is met. Measured against the real composited
  toolbar background: failure text 5.21:1, "Syncing…" 7.86:1, Retry 14.89:1 —
  all above the 4.5:1 the standards section requires.
- Verification: the guest path checked in a real browser (no visible chip, the
  hidden status reading "Collection saved on this device", no console errors),
  and axe-core clean on 7 screens in both languages. The two visible states'
  styling and contrast were measured by injecting their markup.
- **Limits, and this one matters:** the failure and loading states were **not**
  exercised live. Reaching them needs a signed-in session whose network then
  fails, which neither the headless checks (external requests are blocked) nor
  a guest session can produce. The logic that picks the state is unverified at
  runtime; only its rendering is. Worth one real signed-in test with the
  network cut before this is called done.

## V3 improvement — one name for a recast character, everywhere, and one unbroken chain

Recorded: 2026-10-28 16:37 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- **The name now follows the title.** The pinned banner, the phone pill and the
  card match badge all named the character's *default* performer, so the banner
  read "Mark Ruffalo" above a cast row reading "Edward Norton", about the same
  title, at the same moment. All three now resolve through the credit for the
  title in view. The badge needed the title passed to it at four call sites —
  it had no way to know which title it was describing.
- A character search offers **one row per performer** of a recast part:
  "Bruce Banner · Mark Ruffalo" and "Bruce Banner · Edward Norton". A part that
  never changed hands keeps its single row.
- **The chain stays whole.** A performer of one character now pins that
  character and keeps the entire run, opening on their first title. Rhodes
  walks 1–10 through Terrence Howard and Don Cheadle; Ross walks 1–8 through
  William Hurt, Mike McGill, Travis Willingham and Harrison Ford. Breaking a
  recast into separate runs broke the chain the stepper exists to walk — a
  recast is the same person. A performer of *several* characters (Majors,
  Atwell, Bettany) still pins as themselves; those are genuinely different
  people. This **reverses** part of the rule set on 2026-10-28, which named a
  recast performer as themselves with their own titles.
- Card search matching also moved onto the per-title credit, so "Edward Norton"
  finds The Incredible Hulk and nothing else.
- One shared helper, `window.MCU_creditRoster()`, backs the banner, the pill
  and the suggestions. Naming a performer differently in two places is the bug
  this replaced, so they read from one source.
- **A bug the checks caught, worth recording:** the first version decided
  whether a performer was a recast from `charToTitleIds`, which is built from
  the *filtered* set. A search narrows it, so the test silently failed at
  exactly the moment it is asked — while the user is searching. The
  whole-catalog `charTitleTotals` exists for this; deleting it as unused was
  the mistake. The trap is now written above it.
- `qa/regress.sh` counted its own checks wrong: the summary said "all 22 checks
  clean" for a run of 23, because the number was hardcoded in two places. It
  now counts what actually ran, and says **runs** rather than checks, since
  `test-fit` runs twice and the two can fail independently.
- Verification: full `qa/regress.sh` — **all 24 check runs clean, exit 0** —
  including the rewritten `test-pickperson` (168 subjects, every actor and
  character picked from the search) and a new `qa/test-recastname.js`. Checked
  in a real desktop browser in both languages: the Rhodes and Ross chains
  walked end to end, and the List badge reading "Edward Norton" on
  *O Incrível Hulk* while every other Banner title reads "Mark Ruffalo".
- Limits: no phone-width browser pass for this change; the phone pill rests on
  the checks. `test-pickperson`'s expectations were rewritten to the new rule,
  so it no longer guards the old one.

## V3 workflow — Version and Batch tags on the Notion backlog

Recorded: 2026-10-28 15:45 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- The backlog recorded *when* a ticket was completed but not *what it shipped
  in*, so reconstructing a batch meant reading completion timestamps and
  guessing at the clusters. **Version** (V3, V4) and **Batch** (Pre-batch,
  Batch 1…n) are now fields on the V3 Tasks database.
- All 70 completed tickets were backfilled: 43 Pre-batch, then 4 / 5 / 5 / 8 /
  5 across batches 1 to 5. The five batch 6 tickets are tagged, and the three
  unbatched backlog tickets carry V3 with no batch.
- The batch boundaries are anchored, not guessed. The user's own calendar
  screenshot of "Backlog batch 2" lists five bullets that match completion
  orders 44–48 exactly, which fixes batch 2 and therefore the numbering on
  either side of it. Batch 4 is 54–61 and batch 5 is 62–66, both confirmed
  against their merge commits.
- Deferred tickets are deliberately left without a Version, except the two
  explicitly named "V4 -". Guessing a version for an idea nobody has scheduled
  is worse than leaving it blank.

## V3 improvement — the two open credit-scene cases, decided

Recorded: 2026-10-28 15:35 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- The credit-scene audit left two cases for the user rather than deciding
  them. Both are now settled, and together they sharpen the rule: what counts
  is a **physical, in-story appearance by the performer** — not a mention, not
  footage shown on a screen inside the film, and not invalidated by a later
  reveal that the character was someone else in disguise.
- **Nick Fury stays in Spider-Man: Far From Home.** The Fury on screen through
  the main feature is Talos impersonating him, which the post-credits scene
  reveals. Samuel L. Jackson is in the film; the reveal changes who the
  character was, not whether the performance is there. No data change.
- **Steve Rogers leaves Spider-Man: Homecoming.** He appears only through a
  series of low-budget in-universe educational videos and a post-credits gag,
  never as a physical live-action presence in the story. Being shown on a
  screen inside the film is not being in it.
- That is the audit's 19th removal, across 13 titles. Rogers drops from 10
  titles to 9. No character was left with zero titles.
- Verification: `test-pickperson`, `test-variant`, `test-suggest` and
  `test-ctxfn2`, all `errors: []`. The full `qa/regress.sh` was still running
  when this was committed; nothing is pushed until it is green.
- Limits: no new browser pass for this one-entry change; it rests on the
  checks and on the earlier desktop pass for the audit as a whole.

## V3 improvement — credit-scene-only cast comes out of the catalog

Recorded: 2026-10-28 15:30 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- Rule, set by the user: a character counts for a title only if they appear
  in the **main feature**. A character whose sole appearance is a mid- or
  post-credit scene leaves that title's `cast`, which also removes the
  connection line it drew. No new field: membership in `cast` is the whole
  mechanism, so nothing in the app had to learn a new concept.
- 18 cast entries removed across 12 titles — Nick Fury from Iron Man, Thor
  and Infinity War; Bruce Banner from Iron Man 3, Captain Marvel and
  Shang-Chi; Carol Danvers from Infinity War, Shang-Chi and Ms. Marvel;
  Steve Rogers and Bucky Barnes from Ant-Man; Wanda from The Winter Soldier;
  Thor from Doctor Strange; Bucky from Black Panther; Steve, Natasha and
  Rhodes from Captain Marvel; Scott Lang from Deadpool & Wolverine.
- Two are not credit-scene cases at all: **Carol Danvers never appears in
  Infinity War** (only her insignia on the pager), and **Scott Lang is not in
  Deadpool & Wolverine** (a giant Ant-Man corpse is; Paul Rudd is not in the
  film). Both are removed as absent.
- Two of the audit's starting assumptions were wrong and are recorded as
  such. **Sam Wilson stays in Ant-Man**, though the ticket named him: Falcon
  fights Scott Lang at the Avengers facility in the main feature. **Tony
  Stark stays in The Incredible Hulk**: his bar scene with Ross plays before
  the credits and is the last scene of the main feature, however often it is
  described as a post-credits scene.
- Counts drop accordingly: Fury 14 → 11, Carol 7 → 4, Banner 12 → 9, Steve
  12 → 10, Bucky 12 → 10, Thor 12 → 11, Rhodes 11 → 10, Natasha 10 → 9,
  Scott 10 → 9, Wanda 9 → 8. No character was left with zero titles.
- Every removal is sourced in docs/CATALOG-SOURCES.json under
  `creditSceneAudit`, with the reasoning and the kept cases in
  docs/CATALOG-AUDIT.md.
- Verification: full `qa/regress.sh` — **22 of 22 clean, exit 0** — including
  `test-pickperson` (166 subjects), `test-variant` and `test-suggest`. Then
  checked in a real desktop browser: Ant-Man reads 5 cast with Sam Wilson
  present and Rogers and Barnes gone, Captain Marvel 2, Shang-Chi 3 with Wong
  kept, Iron Man 4 with Rhodes still credited to Terrence Howard.
- Limits: the browser pass was **English and desktop only**; Portuguese and
  phone widths rest on the headless checks. Two judgement calls are flagged
  open rather than decided — Fury in Far From Home (the one on screen is
  Talos) and Rogers in Homecoming (he appears only in in-universe PSAs). The
  unreleased titles have provisional casts and were not audited, and Marvel
  Zombies was not checked scene by scene.

## V3 workflow — the calendar recap format, so it pastes with its formatting

Recorded: 2026-10-28 15:30 EDT (-0400). Pushed to `version/3.0` (staging); merged to main (production) on
2026-10-28 after the user's approval, in the Batch 6 merge.

- The recap the user pastes into their Notion Calendar event was specified
  inside a code fence, so it reached them as plain text and pasted
  unformatted — the exact problem the format exists to prevent. It is now
  specified as ordinary chat text with real Markdown bold.
- The shape is a title line carrying the version, batch number and a short
  keyword phrase, then **one bullet per ticket** opening with a bold Fixed /
  Improved / Added label. The date, duration and commit-count lines are gone:
  the calendar event itself holds the time.
- Recorded that the assistant can create the event directly on the user's
  Google Personal calendar through the Notion calendar tools, and that doing
  so is an outward-facing action to offer rather than perform unasked.
- Verified by creating the batch 4 and batch 5 events. **Two limits found and
  worth knowing:** the connector strips HTML from the description, so bold
  labels arrive as plain text, and neither the create nor the update tool has
  a colour field, so the event colour must be set by hand.

## V3 fix — a recast cast row shows the credited performer's face, or none

Recorded: 2026-10-28 13:29 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 15:10 EDT
(`ca3112d`).

- Correcting the per-title credits left the right name under the wrong face:
  `MEDIA.actors` is keyed by character, so Iron Man read "Terrence Howard"
  beside Don Cheadle's photo. A right name under a wrong face is worse than
  both being wrong together.
- `MEDIA.performers` maps a performer name to a TMDB profile path.
  `castPortrait(title, charId)` uses the character's portrait when the credited
  performer is the default, the performer map when it is not, and `null`
  otherwise — which `Portrait` already renders as initials, so an unknown
  performer costs a face rather than borrowing someone else's.
- `performerPortrait(name, repCharId)` does the same for the pinned banner and
  the phone pill, keeping the character's portrait when that character's
  default performer *is* the pinned person. Without it, pinning Jonathan
  Majors would have lost his photo even though Kang's portrait is his face.
- Four profile paths were each verified against that person's own credits
  before use, then confirmed to return 200. Mike McGill is deliberately
  absent: the only TMDB person of that name has no profile photo and no
  What If…? credit, so it is someone else, and What If…? shows initials.
- Verification: new `qa/test-portrait.js` (9 cases, all `errors: []`) and the
  full `qa/regress.sh` — 22 of 22 clean.
- Limits: the check asserts the resolver, not rendered pixels, because
  external images are blocked in these runs. No real browser load of a
  recast title's drawer is claimed by this entry.

## V3 improvement — a pan coasts to a stop instead of stopping dead

Recorded: 2026-10-28 13:14 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 15:10 EDT
(`68b1953`).

- A drag now ends with a short inertial glide on both the mouse and the touch
  path. Velocity is sampled from the last few moves rather than the whole
  drag, capped, and decays exponentially, settling in about a third of a
  second. A slow release places the canvas rather than throwing it.
- Any press, touch or wheel on the viewport stops the glide exactly where it
  is, so the canvas is never moving when you reach for it.
- This **reverses** the earlier rule that a manual pan must stop instantly;
  the comment beside `glideTo` was rewritten rather than left contradicting
  the code (docs/decisions.md).
- Verification: new `qa/test-inertia.js` (deceleration on release, and a dead
  stop when grabbed), plus `qa/test-camera.js`, which needed a new
  `settleCanvas()` because it had been snapshotting a camera position
  mid-glide. Full `qa/regress.sh` clean.
- Limits: the deceleration constants were chosen by eye on a trackpad. How
  the throw feels under a finger on a real phone is **not** verified.

## V3 fix — per-title performer credits

Recorded: 2026-10-28 12:56 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 15:10 EDT
(`5d153f0`, `41e61aa`).

- One `actor` per character leaked the current performer into every title:
  Iron Man credited Don Cheadle as Rhodes, and The Incredible Hulk credited
  Mark Ruffalo and Harrison Ford. A title may now carry `credits` (character
  id to performer) and `CHARACTERS[id].actor` is only the default.
- `window.MCU_credit(title, charId)` resolves it. The character's identity,
  colour and connection thread are untouched, so the arc stays continuous.
- Search suggestions are built per title, not per character, so searching
  either performer returns that performer's own titles and no others. A
  performer pins as themselves unless they are that character's whole run —
  Terrence Howard plays Rhodes in one title of eleven, so pinning him must
  not open the other ten.
- Eight titles were sourced: Rhodes (Terrence Howard), Banner (Edward
  Norton), and Ross (William Hurt ×5, Mike McGill, Travis Willingham).
- Verification: `qa/test-pickperson.js` picks every actor and character from
  the search — 166 subjects, all opening the pinned widget. Full
  `qa/regress.sh` clean.
- Limits: **the audit is not finished.** What If…? lists 31 cast members and
  only Ross is corrected; Tony Stark, Steve Rogers, Natasha Romanoff and
  Peter Parker are voiced by different performers there and still carry
  their live-action defaults, as do Marvel Zombies' ten. Those remain open on
  the ticket.

## V3 maintenance — ignore editor swap files

Recorded: 2026-10-28 12:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 15:10 EDT
(`b5e9bf7`).

- An open vim session leaves `.<name>.swp` beside the file; `git difftool -y
  -x vimdiff` produced one in the worktree. `*.swp` is now ignored.

## V3 fix — the phone document no longer scrolls behind the app shell

Recorded: 2026-10-28 12:27 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 15:10 EDT
(`3413caf`).

- Dragging up from the bottom nav scrolled the page behind the app, exposing
  a band below it. `html, body` now take `min-height: 100vh` then
  `100dvh` — `100vh` is the *largest* viewport, excluding collapsed browser
  chrome, while `100dvh` is what is actually visible — and below 900px they
  are locked to `height: 100%` with `overflow: hidden` and
  `overscroll-behavior: none`.
- Verification: new `qa/test-mviewport.js` asserts the document does not
  scroll behind the shell at phone sizes. Full `qa/regress.sh` clean.
- Limits: **headless Chromium treats `100vh` and `100dvh` alike**, so the
  symptom itself cannot be reproduced or disproved there. The check proves
  the lock is applied, not that the band is gone. Real iPhone Safari is not
  checked.

## V3 fix — test-camera is reliable, and its assertions now count

Recorded: 2026-10-28 12:27 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 15:10 EDT
(`00894d8`, `53412fb`).

- `test-camera` failed at "sort change while selected", and separately
  reported a false "wheel cancels the glide" about one run in four. Both were
  the check, not the app. `page.mouse.click` moves the cursor and presses in
  the same tick; hovering a card re-lays the canvas out, so the press landed
  after the cards had shifted. Card clicks now go through `clickCard()`, and
  the two that must open a card through `openCentreCard()`, which waits for
  the drawer and re-measures. The glide steps guessed at 60ms and 80ms; they
  now wait for the transition to appear and to clear.
- `qa/regress.sh` only reads fields whose name contains `errors`, so
  `test-camera`'s six standalone booleans gated nothing — a run could report
  clean with `glideCancelledByWheel=False`. They are collected into
  `assertErrors`. Recorded in qa/README.md: an assertion that is not in an
  errors field is decorative.
- Verification: repeated `test-camera` runs, then the full `qa/regress.sh` —
  22 of 22 clean, exit 0.
- Limits: this is development tooling; no app behaviour changed in these two
  commits.

## V3 maintenance — the regression run reports failures instead of passing in silence

Recorded: 2026-10-28 11:14 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(`b28c271`; development tooling only, no app files changed).

- `qa/regress.sh` wrapped every check in GNU `timeout`, which is part of
  coreutils and ships with neither macOS nor this machine. Each check exited
  "command not found", the grep matched nothing, and the run reported success
  in about two seconds having started no browser. It now falls back to
  `gtimeout` and then to perl's `alarm`.
- Four checks print their JSON indented, so a non-empty errors array spans
  lines. The single-line pattern could not match one and fell back to matching
  zero digits, printing a bare `"desktopErrors": ` that read exactly like an
  empty array. Output is flattened before matching, and a field must hold `[]`
  or a real number.
- The run marks anything that is not `[]` or `0` with `!!`, fails a check that
  exits non-zero or prints no errors field, and exits non-zero overall.
- Verification: the reporting logic was exercised against six output shapes
  (empty and non-empty indented arrays, the documented warning, zero, a
  non-zero count, and a crash with no JSON). It found a real failure on first
  use — `test-camera` fails at "sort change while selected" on unmodified code
  too, which the old script swallowed; raised as its own ticket, not fixed here.
- Limits: no real-device work is claimed by this entry. The second half of its
  ticket, current iPhone/Safari and Android evidence, is not done.

## V3 improvement — "Lançamento" and "Lançado" replace "Estreia" in Portuguese

Recorded: 2026-10-28 11:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(`088b9c1`).

- "Estreia" alone reads as something still to come, the opposite of what the
  release sort means. `sort.release` becomes "Lançamento";
  `sort.short.release` and `list.col.release` become "Lançado", which fits the
  phone sort tabs and the desktop compact span beside Crono, Fase, A–Z, IMDb
  and RT, where "Lançamento" at ten characters would not.
- **The commit message on `088b9c1` is wrong.** It says the short label became
  "Saiu", because that is what the agent set and verified. The maintainer
  edited the file to "Lançado" for both keys while the batch was being
  prepared, and the agent staged the file without re-reading it, so the commit
  shipped "Lançado" under a message describing "Saiu". The message cannot be
  corrected in place now that it is in production; this entry is the record.
- Verification: the earlier run covered the "Saiu" wording. What actually
  shipped was re-checked afterwards: `test-fit` in Portuguese (24 fields, all
  `errors: 0`), `test-i18n`, `test-dlist`, and the painted label read back at
  1440, 390 and 320px with no horizontal overflow. "Lançado" is seven
  characters, the same length as the "Estreia" it replaces.
- Limits: not viewed by eye in a real browser; whether "Lançado" reads well to
  a Brazilian user is a judgement the maintainer owns, and in this case made.

## V3 fix — the guest sign-in reminder stays true to the saved collection

Recorded: 2026-10-28 11:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(`6d74b0c`).

- The reminder captured its mark count at the tap, so undoing that mark during
  its delay left it opening anyway with a number the collection no longer had.
- The cause runs deeper than the count: the toast's `undo()` calls `setStatus`
  directly and never goes through `emitStatusChange`, so the reminder could not
  learn about a removal on that path at all. It now reads the live collection
  when the reminder comes due, and hands its stage back if the marks are under
  the threshold again.
- Verification: new `qa/test-nudgeundo.js`. Against unmodified code the check
  cannot finish, because the reminder's scrim blocks the next mark.
- Limits: guest only, signed out; no live Google OAuth. Only the 3-mark
  threshold was driven end to end, not the 10.

## V3 fix — Spatial touch, portrayal scope, performer pins and Escape

Recorded: 2026-10-28 11:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(`87ccb33`). Four tickets in one commit: they edit overlapping lines in the same
functions, and each later one corrected the earlier before any of it was
committed, so separate commits would have recorded states already known wrong.

- **Touch follows the device, not the window width.** The canvas attached its
  touch handlers from a 900px layout breakpoint, so a touch laptop or a tablet
  in landscape took the desktop layout and lost pan and pinch altogether. It
  now reads `navigator.maxTouchPoints` and `(any-pointer: coarse)`. Mouse and
  wheel are untouched, and mouse events synthesized within 400ms of a touch are
  ignored so a background tap cannot step back twice.
- **A selected character means one exact portrayal.** "Peter Parker (Raimi)"
  offered 1 title and opened Tom Holland's 13. The pin's scope is now keyed by
  the exact character; a separate prime-keyed map keeps the connection
  threading, so arcs like Kang's stay continuous. It also narrows Kang 3→1,
  Peggy Carter 10→6, Vision 7→6, Captain Carter 10→4, White Vision 7→2.
- **A pin is one portrayal or a performer.** Picking an actor who plays several
  characters pins the performer — the union of their own roles' titles, named
  as themselves. This restored the widget for Jonathan Majors, Hayley Atwell
  and Paul Bettany, and gave it to Robert Downey Jr., who had never had it.
- **Escape clears the pin**, last in the ladder. The details rung and the pin
  rung share one listener, because two listeners both see the same press and
  React re-renders between them.
- Verification: new `test-widetouch`, `test-variant`, `test-pickperson` and
  `test-escpin`, each run against an unmodified copy of the previous tree as
  well. `test-pickperson` is a full pass over all 84 characters and all 79
  actors: 163 of 163 open the widget with the right count, against 162 and 14
  wrong counts before.
- Limits: **no real-device verification.** The wide-screen touch fix was
  exercised with emulated touch at 1440×900 only; a real touch laptop or an
  iPad in landscape, including orientation changes, has not been tried, and
  that is the first acceptance criterion of its ticket. The pick pass is
  desktop and English only.

## V3 workflow — Approved status, new checks in the regression run, verification log

Recorded: 2026-10-28 11:15 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(tooling and documentation; no app files changed).

- Notion **V3 Tasks** gains an **Approved** status between Awaiting review and
  Blocked. The maintainer sets it; it clears that ticket's current revision to
  be committed and pushed to staging, never a merge to `main`, and it lapses if
  the work changes. AGENTS.md records the rule and asks agents to ship anything
  already Approved at the start of a session.
- The five new checks join `qa/regress.sh`, taking the run from 14 to 19
  checks (about 20 minutes). `qa/README.md` gains a Reporting section and a
  corrected account of the `test-camera` failure.
- `.gitignore` now ignores a root `shots/`. Checks resolve their screenshot
  path relative to the working directory, so running one from the repository
  root, as qa/README.md says to, wrote PNGs outside the ignored `qa/shots/`.
- `docs/V3-VERIFICATION.md` gains the batch 4 checkpoint and
  `docs/decisions.md` the decisions behind each change.
- Expected result of a full run right now is **18 of 19**, with `test-camera`
  the only failure, for a reason that predates this batch.

## V3 workflow — QA checks in the repository; no-build rule with a V4 exit

Recorded: 2026-10-28 08:55 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(tooling and documentation only; no app files changed).

- New `qa/`: the curated headless checks used during V3. That is the 14-check
  regression run (`qa/regress.sh`), the axe-core scan (`qa/a11y-scan.js`), a
  startup timing check and one targeted check per recent fix, all serving the
  repository root. Its own `package.json` pins Playwright 1.63.0 and axe-core
  4.10.2; `qa/setup.sh` installs them and fetches the pinned app libraries.
  `.gitignore` keeps installs out of Git; new `.vercelignore` keeps `qa/` off
  the deployed site.
- Rule recorded in AGENTS.md and docs/decisions.md: the V3 app stays build-free
  (`qa/` is the one development-only npm exception); V4 moves to a standard
  build step as one planned migration. AGENTS.md now asks agents to run the
  regression and axe scan before handing work over. README and HANDOFF updated.
- Verification: in a fresh copy of the repository, setup steps and
  `qa/test-panel.js` passed (no errors); Git ignores the installed packages. The
  full `qa/regress.sh` run was still in progress at push time; its result is
  recorded on the Notion ticket.

## V3 workflow — handoff to Claude Code

Recorded: 2026-10-28 08:39 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-28 11:30 EDT
(documentation only).

- AGENTS.md rewritten as a self-contained, agent-neutral rulebook: stack and
  load order, local commands (no install or build; `python3 -m http.server`
  on 8123, 8126 for sign-in), staging/production flow and approvals, commit and
  CHANGELOG rules with real git times, the Notion V3 Tasks workflow (board
  priority, screenshots, statuses, completion time and order), the calendar
  recap, design/accessibility/keyboard standards, deferred work (Phase 6 waits
  on a custom domain) and secrets.
- New docs/HANDOFF.md (state, architecture, decisions, quirks, open threads) and
  docs/decisions.md (decision log). The 2026-10-24 handoff sections in V3-SPEC.md,
  V3-TASKS.md and KICKOFF-PROMPT.md are labelled historical; README lists the
  new docs.
- Verification: documents reviewed against the code, git state, CHANGELOG and
  the Notion board; no application files changed.

## V3 improvement — Spatial cards from the keyboard

Recorded: 2026-10-27 23:26 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 23:30 EDT.

- On desktop each Spatial card starts with an invisible button over the whole
  card, so Tab reaches the card before its Seen/Watchlist buttons and Enter or
  Space opens it; pointer clicks pass through to the card as before. A card
  tabbed to off-screen glides into view, the clipped canvas never scrolls, and
  Escape from its details returns focus to it.
- Verification: headless Chromium, 1440×900. First Tab into a card lands on the
  card (it used to land on Seen) with the ring around the whole card; 20 more Tabs
  go card, Seen, Watchlist… with every card in view; Enter opened Thor: The
  Dark World with focus on its title and Escape returned focus to the card; a
  mouse click opens without a ring. Full regression suite and axe scan pass.
- Limits: Tab follows catalog order rather than on-screen position; phones
  unchanged.

## V3 improvement — favicon, home-screen icon and link previews

Recorded: 2026-10-27 23:26 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 23:30 EDT.

- New `favicon.png`, `apple-touch-icon.png` and `og-image.jpg` (1200×630),
  rendered from the app's brand mark with no studio imagery. `index.html` adds a
  description, theme colour, icon links, Open Graph and `twitter:card` tags; no
  manifest or service worker.
- Verification: headless Chromium, desktop and phone: all three files served
  and linked, no console errors; icon checked at 32 and 16 px.
- Limits: the description is English (crawlers do not run scripts); `og:image`
  points at production, so previews work once this reaches main.

## V3 improvement — Escape and keyboard focus for desktop details

Recorded: 2026-10-27 23:26 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 23:30 EDT.

- Escape closes the open desktop details and selection unless the pair view,
  a text field, or an open menu, popover or dialog claims it first (listened in
  the capture phase so an open menu is still seen). Details opened from the
  keyboard move focus to their title and give it back to the opener on close;
  mouse and touch opens leave focus alone, so no focus ring appears (revised
  after review).
- Verification: headless Chromium. List: Enter → focus on the title, Escape →
  closed with focus back on the row; Escape in the search box or with the
  account menu open only closes those; Spatial: Escape closes the selection;
  pair view first leaves the pair. A mouse open leaves no outline. No console
  errors.
- Limits: after the pair view, closing does not return the camera to its
  pre-selection position; not tried with a screen reader.

## V3 improvement — page landmarks and List column labels

Recorded: 2026-10-27 23:26 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 23:30 EDT.

- The app name is the page's `<h1>`; the desktop toolbar and phone app bar are
  the banner; the Spatial canvas, the List or the phone's main area is `main`.
  The List's blank poster and actions headers get screen-reader-only labels
  (new keys `list.col.poster`, `list.col.actions`).
- Verification: axe-core on the same 7 screens in both languages reports no
  violations of any kind; screenshots are pixel-identical before and after.
- Limits: not tried with VoiceOver or NVDA.

## V3 improvement — readable muted text and RT tags

Recorded: 2026-10-27 23:26 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 23:30 EDT.

- `--text-muted` `#5c6278` → `#8389a1` (2.67–3.23:1 → 4.66–5.63:1 across the
  app's surfaces) and `--text-dim` `#8a90a6` → `#9ea4b8` so it stays a step
  brighter. The RT tag red `#fa320a` → `#cc2a0a` (white text 3.80 → 5.38:1). List
  cast initials pick dark or white text by the character colour.
- Verification: axe-core 4.10 on 7 screens (desktop Spatial, details, List,
  account menu; phone List, details, Spatial): `color-contrast` failures 61 → 0
  (English), 60 → 0 (Portuguese). Before/after screenshots checked; sizes and
  layout unchanged.
- Limits: text over poster art keeps its own semi-opaque backing and was not
  flagged; not checked on physical screens.

## V3 improvement — selected title drawn larger in the Spatial ring

Recorded: 2026-10-27 22:20 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- On desktop, the title at the centre of an open connection ring is drawn 18%
  larger (its existing lift scale), above its neighbours. Phones keep their
  compact ring unchanged.
- Verification: headless Chromium. Rings for Iron Man 2, Endgame and Shang-Chi:
  1.18× with 17–22 px to the nearest card and no overlaps; phone sizes unchanged.
  Screenshot checked; Spatial regression scripts pass.
- Limits: a larger centre card on phones would need a wider phone ring.

## V3 improvement — startup screen with failure recovery

Recorded: 2026-10-27 22:20 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- `index.html` shows the brand, a spinner and a localized "Loading…" inside
  `#root` until React's first render replaces it, instead of a blank page. New
  `boot.js` (loaded first) turns it into "couldn't start" with Reload when a
  script fails to load or startup errors, and into a "taking longer than usual"
  note after 25 s. Locale files and `i18n.js` now load before the CDN scripts.
- Verification: headless Chromium. Normal start in English and Portuguese; React
  blocked and a tampered ReactDOM (SRI) both show the failure screen; a JSX
  compile error in one file shows it only until the app renders; a held-back
  Babel shows the slow note after a fast-forwarded 25 s. Image and font failures
  never trigger it. All 14 regression scripts pass with this batch.
- Limits: if even the locale files fail, the Reload button shows ↻ with an
  English accessible name. Caching of HTML and scripts on Vercel is unchanged.

## V3 improvement — click empty canvas to close a desktop selection

Recorded: 2026-10-27 22:20 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- In desktop Spatial a click on empty background (not a drag) now steps back one
  level: out of the pair view, or else closes the selected title and its
  details, as a background tap does on phones. Cards, lines and on-canvas
  controls keep their own clicks.
- Verification: headless Chromium, 1440×900. A drag keeps the selection; a click
  closes it and the drawer and returns the camera to its exact earlier position;
  a connection line still opens the pair view, which a background click leaves
  (a second click closes the drawer); clicking another card switches the
  selection. No console errors.
- Limits: not checked on a trackpad or touch laptop.

## V3 fix — Spatial explains an empty result

Recorded: 2026-10-27 22:20 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- When a search or filter leaves no titles, Spatial (desktop and phone) shows
  "No titles match" with one button that clears the search, the filters or both,
  instead of a blank canvas. The phone's "Tap a title" hint hides meanwhile. New
  key `empty.clearBoth` in both languages; collection dimming is unchanged.
- Verification: headless Chromium. Desktop "zzzz" → "Clear search" restores 64
  titles; Phase 1 + "Endgame" → "Clear search and filters" restores 64; phone in
  Portuguese shows "Limpar busca" centred and hides the hint. Screenshots checked;
  no console errors.
- Limits: not checked on a physical phone.

## V3 fix — search matches with or without accents

Recorded: 2026-10-27 22:20 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- One shared `MCU_I18N.fold()` (case and accents removed) now drives the search
  filter behind Spatial, List and Grid, the suggestions and the highlights. Before,
  suggestions ignored accents but the filter did not, so "Capitao" suggested
  Captain America titles and then showed none. Highlights map folded matches back
  to the original text, so "capitao" marks "Capitão".
- Verification: headless Chromium, desktop Spatial and List, phone List and Grid,
  English and Portuguese. "Capitao" 0 → 4 results (4 suggestions), "capitao
  america" 0 → 4, "Viuva" 0 → 1; accented queries, actors and character names
  unchanged. No console errors; regression scripts pass.
- Limits: punctuation still matters ("homem formiga" without the hyphen finds
  nothing, in suggestions and results alike).

## V3 improvement — production React and ReactDOM builds

Recorded: 2026-10-27 21:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- `index.html` loads the production UMD builds of React and ReactDOM 18.3.1
  instead of the development builds, with the same pinned version,
  `crossorigin` and new SRI hashes computed from the npm package files (the
  same method reproduces the old development hashes exactly). No npm, bundler
  or precompile step.
- Verification: headless Chromium, which enforces the SRI on every load.
  About 214 KB less to download (gzipped). First title on screen locally:
  desktop 3.5–4.1 s → 3.3–4.0 s; slowed-phone runs too noisy to show a
  difference. Spatial panning with the CPU slowed 4×: 16–17 → 24–31 fps at the
  default zoom and 13 → 28–29 fps fully zoomed out. All 14 regression scripts
  pass on the four changes together; `test-camera` logs one desktop
  passive-listener warning that the unchanged base logs too.
- Limits: React's development warnings no longer appear in the console on the
  live site. Not measured on a real network or device.

## V3 fix — fallbacks for posters and cast photos that fail to load

Recorded: 2026-10-27 21:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- A poster that fails to load now shows the generated poster art instead of a
  broken image with spilling alt text. A cast photo that fails shows the
  character's initials, in the desktop details, phone details and character
  pills (new shared `window.Portrait`; the desktop List already had this).
  Failed addresses are remembered for the session, so they are not requested
  again when a card or sheet comes back.
- Verification: headless Chromium, desktop and phone. With images blocked,
  16 broken posters on desktop and 31 on the phone became generated art (0
  broken), and all 5 portraits in details showed initials without overflow.
  With images served, all posters and portraits render as images. Reopening
  details makes no new requests for failed images. Regression scripts pass.
- Limits: an image that fails while briefly offline stays on the fallback until
  the page is reloaded. The Google account avatar is unchanged.

## V3 fix — browser Back closes phone sheets

Recorded: 2026-10-27 21:28 EDT (-0400). Pushed to `version/3.0` (staging); merged to
main (production) after user approval, 2026-10-27 22:21 EDT.

- Back now closes the open phone sheet (details, Filters, Account, About, the
  welcome sheet and the sign-in reminder) instead of leaving the app. Each sheet
  owns one history entry (`pushState`/`popstate`, no router). Closing a sheet
  any other way steps back over its entry, a sheet that hands off to another
  (Account → About) reuses it, and an entry left by Forward or a reload is
  reused rather than duplicated.
- Verification: headless Chromium, phone viewport. Details → Back closes it
  and stays in the app; Forward reopens nothing; five open/close cycles leave
  history length unchanged; Escape and Back both close Filters cleanly; Account
  → About → Back closes About, and the next Back leaves the app; Back closes the
  first-visit welcome sheet; desktop adds no history entries. Regression
  scripts pass.
- Limits: not tried on a physical phone or with the system swipe-back gesture;
  the Google sign-in return was not exercised end to end. Desktop dialogs and
  the details drawer are unchanged.

## V3 fix — zoomed-out Spatial no longer exhausts phone memory

Recorded: 2026-10-27 21:28 EDT (-0400). Pushed to `version/3.0` (staging) for
testing on a phone; merged to main (production) after user approval,
2026-10-27 22:21 EDT.

- Phones could reload or crash when panning Spatial zoomed out to about 5–10%.
  It was graphics memory, not a script error: the whole canvas was one GPU
  layer (12,687×2,595 at full size) and every card, badge and seen-title wash
  had its own layer as well, all on screen at once when zoomed out.
- Cards are now positioned with a 2D transform and no `will-change`; the canvas
  keeps its GPU layer only at 30% zoom and above (`LAYER_MIN_SCALE`) and below
  that is drawn at screen resolution. Spatial cards no longer use backdrop
  blur (the badges are opaque enough), and the seen wash desaturates the poster
  itself instead of using a backdrop filter.
- Verification: headless Chromium, 390×844 at 3× pixel density. At minimum zoom
  223 compositor layers covering about 37 million pixels became 6 layers
  covering 0.4 million; at the default zoom 340 became 8. Desktop Spatial
  screenshots differ in 0.07% of pixels (anti-aliasing). Pan frame rate with
  the CPU slowed 4× is unchanged at the default zoom and lower when fully zoomed
  out with development React (23 → 17 fps). Regression scripts pass; two that
  parsed `translate3d(` now accept both forms.
- Limits: iOS Safari could not be run here, so the crash itself was not
  reproduced; confirmation is pending on a real phone. Below 30% zoom each pan
  frame is redrawn rather than moved as a cached layer.

## V3 fix — Spatial rings hide unrelated cards

Recorded: 2026-10-26 22:01:32 EDT (-0400).

- While a selected title's rings are showing in Spatial, unrelated cards fade
  out in place (no clicks, no tab stop) instead of staying dimmed under the
  ring, which was most visible in the A–Z and Phase grids. They fade back when
  the selection closes; nothing reflows. Lines are drawn among the ring's
  titles only, so none lead to a hidden card. The pair view and a title with no
  connections are unchanged.
- Phones: closing the rings by tapping the background no longer lets the
  browser's follow-up click select the card that reappears under the finger.
- Verification: headless Chromium.
  - Desktop A–Z with Black Panther: Wakanda Forever: 7 visible cards, 57
    hidden, no overlaps, no lines to hidden cards, all 64 back after closing.
  - Desktop Release with Iron Man 2: 24 visible, no orphan lines.
  - Phone A–Z: same result; a tap on empty space over a hidden card closes the
    selection without selecting anything.
  - No console errors; regression scripts and the label test pass.
  - Screenshot reviewed by the user, who approved committing and merging to
    main.
- Limits: an unrelated title can't be clicked while the rings are showing
  (close the selection first). Not checked on a physical phone.

## V3 feature — guest sign-in reminder

Recorded: 2026-10-26 21:39:35 EDT (-0400).

- A signed-out guest (when Google sign-in is available) is reminded that
  signing in saves their list to an account and syncs it across devices: about
  1.4s after the tap that brings their seen + watchlist marks to 3, and once
  more at 10, never again after that and never on page load
  (`mcu.signInNudge.v1`). It waits until any open sheet or dialog closes.
- Dialog on desktop and sheet on phones, in the About style: "Keep your list on
  every device", how many titles they've marked, "Everything you've marked so
  far comes with you", then Sign in with Google (with the Google mark, as in
  the account menu) and Not now. English and Brazilian Portuguese.
- `about.jsx`: the About dialog's shell (scrim, focus trap, Escape, ×, focus
  return) is now a shared `ModalDialog`; `account.jsx` exports `GoogleMark`.
- Verification: headless Chromium.
  - Desktop, fresh guest: nothing after 2 marks, shown after the 3rd, Not now
    closes it, quiet through 9, shown at 10, Escape closes it, nothing at 11 or
    after a reload.
  - Phone (Portuguese): marking from a details sheet waits until the sheet
    closes, then shows the sheet version.
  - Sign in with Google starts the Supabase Google authorize redirect; Undo on
    the status toast stays usable while the dialog is open.
  - No console errors; regression scripts pass. Test helpers mark the reminder
    as already shown unless a test asks for it.
  - Screenshots reviewed by the user, who approved committing and merging to
    main.
- Limits: a guest who already has 10+ marks sees it once on their next mark,
  then never again. A real Google sign-in wasn't completed in testing. Not
  checked on a physical phone.

## V3 improvement — Order toggle and smoother Spatial reorders

Recorded: 2026-10-26 20:47:14 EDT (-0400).

- Order (desktop toolbar and phone search row) is now a toggle: every sort has
  exactly two directions, so a tap reverses the order with no dropdown. It
  shows the current direction (Oldest, Highest, 1 → 6, A–Z…) beside a sort icon
  whose bars flip with the order. Its accessible name and tooltip say the
  current order and what it switches to (`order.toggleAria` replaces
  `order.aria`, English and Brazilian Portuguese). The Filters panel keeps its
  explicit two-option choice.
- Spatial: after a new layout (order, sort, filters, a pinned character) the
  connection lines, their labels and the row labels are hidden before the next
  paint and fade back in once the cards have finished gliding. Row labels also
  wait for the cards to return after a selected title closes, and rise slightly
  as they fade in (fade only with reduced motion).
- Phone character pill: before the first step it shows just the number of
  titles ("‹ 13 ›", read as "13 titles"), then "1/13".
- Verification: headless Chromium.
  - Toggle: desktop List Oldest ↔ Newest (first title Iron Man ↔ Avengers:
    Secret Wars, choice saved); IMDb by Enter and Space; Spatial Earliest →
    Latest; phone List Highest → Lowest with the reorder animation; phone Grid
    in Portuguese 1 → 6 ↔ 6 → 1. No dropdown opens.
  - Spatial: lines and row labels at opacity 0 while the cards move (to about
    600ms), back by about 1s, for the toggle and Release → IMDb/Chrono; row
    labels hidden while the cards return after closing a title.
  - Pill reads "13" (accessible "13 titles"), then "1/13".
  - No console errors; regression scripts and the label test pass (test-camera
    still has its known intermittent desktop timeout).
  - Videos and screenshots reviewed by the user, who approved committing and
    merging to main.
- Limits: not checked on a physical phone.

## V3 improvement — picking a character from search opens the character view

Recorded: 2026-10-26 19:07:38 EDT (-0400).

- Picking a character in the search suggestions now opens the character view,
  as if pinned from a cast list: photo, Their titles / All titles (desktop) and
  the stepper. The search box clears. An actor suggestion does the same when the
  actor plays one character (variants included). Robert Downey Jr. (Tony Stark
  and Doom) stays a text search. Title suggestions and free-text search are
  unchanged. Picking a new character while another is pinned switches to it.
  After a keyboard pick on desktop, focus moves to the stepper.
- Phone pill: before the first step it shows the number of titles (stacked "13
  / titles") instead of "–/13"; new `highlight.titlesWord` string in English and
  Brazilian Portuguese.
- Desktop banner: Their titles / All titles is now as tall as the stepper
  buttons (34px).
- Verification: headless Chromium at 1440×900 and 320/360/390px phones (English
  and Portuguese):
  - Peter Parker (Tom Holland) shows 13 titles, then › gives 1 of 13; Benedict
    Wong shows 9 titles; Wanda by keyboard pins and focuses the stepper;
    Robert Downey Jr. stays a text search; Iron Man 3 opens its details.
  - Pill counts "9 titles", "13 títulos", "1 title", then "1/9" after ›.
  - The banner switch and stepper buttons are both 34px and aligned.
  - No console errors; regression scripts pass.
  - Screenshots reviewed by the user, who approved committing and merging to
    main.
- Limits: Peter Parker (Raimi) and (Webb) are variants of Peter Parker, so
  picking them shows all of Peter Parker's titles while the suggestion says "1
  title" (same as pinning them from a cast list). At 320px long names still
  truncate in the pill. Not checked on a physical phone.

## V3 feature — folded seen titles on phones

Recorded: 2026-10-26 18:21:23 EDT (-0400).

- Phones, All tab (no character pinned, no search): each run of two or more
  consecutive seen titles gets an accordion header ("✓ 11 seen") that folds the
  run into one summary row (stacked posters, count, first – last title). Order
  never changes: a run only groups neighbours, and headings inside a folded run
  hide with it (a group that continues after it repeats its heading).
- List shows seen titles as compact rows (small poster, title, buttons side by
  side); Grid keeps full cards, with each run as its own section, and cards
  glide to their new cells when runs form or split. The Seen tab keeps full rows
  and cards.
- Rows shrink and grow when marked or unmarked, runs fold and unfold with a
  height animation, and the header morphs between bar and summary. Motion
  starts once the saved collection has loaded (new `ready` flag on the
  collection context), so the list opens already compact; none with reduced
  motion.
- Folded runs are remembered on this device (`mcu.seenFolds.v1`, not synced to
  the account) and shared by List and Grid. The folded titles are stored
  rather than runs: a run is folded when most of its titles were.
- Watchlisted titles have a thin amber outline on List rows and Grid cards
  outside the Watchlist tab.
- Folder headers fit the column (long summaries end in "…"), and the phone
  list/grid area never scrolls sideways.
- English and Brazilian Portuguese strings.
- Verification: headless Chromium at 390×760 (and 320/360/375 where noted):
  - marking Ant-Man seen shrank its row 95 → 52px over ~0.34s and merged the
    runs (11 → 13); folding hid the run; unmarking restored it;
  - folds stayed closed after a reload, matched across List/Grid switches
    without reloading, and reopened state was remembered;
  - order kept in Release, Phase, Chrono, IMDb and A–Z;
  - no horizontal overflow in 48 combinations (320/360/390 × Grid/List × four
    sorts × open/folded), where 40 overflowed before the guardrail;
  - no console errors; regression scripts pass (test-camera's known
    intermittent desktop timeout recurred once and passed on re-run).
  - Videos and screenshots reviewed by the user, who approved committing and
    merging to main.
- Limits: fold memory is per device; a Grid run ending on an odd count leaves
  the cell beside its last card empty; not checked on a physical phone.

## V3 fix — mobile stepping keeps the current title in view

Recorded: 2026-10-26 13:37:21 EDT (-0400).

- On phones, stepping through a character's titles (‹ › on the floating pill)
  in List or Grid scrolled each title flush with the scroll area's edges: from
  about the fifth result the current row sat under the pill, and stepping back
  to the first title clipped its 2px ring at the top. The scroll area now has
  scroll padding (10px at the top, and 84px at the bottom while the pill shows),
  so the browser keeps the current title clear of both. CSS only.
- Verification: headless Chromium, Wong with the IMDb sort, stepping ten times
  at 390×760 and 375×667 (List) and 390×760 (Grid): the current row went from
  60px under the pill to at least 24px clear of it, and the first title's ring
  from 2px above the scroll area to 8px inside it. No console errors; the
  regression scripts pass. Before/after screenshots reviewed by the user, who
  approved committing and merging to main.
- Limits: not checked on a physical phone or in Safari.

## V3 fix — mobile Spatial grids peek at the edges

Recorded: 2026-10-26 13:00:55 EDT (-0400).

- On phones, Spatial's grid layouts (Phase, A–Z, IMDb, RT) opened at exactly
  three columns' width, so the canvas looked complete. The opening view now
  picks a zoom (80–100% of the previous one) and top offset that keep three whole
  columns on screen while the next column and row peek past the right and bottom
  edges (allowing for the hint bar), and puts the first row below the count
  pill. Release/Chrono and grids that fit the screen are unchanged.
- Verification: headless Chromium at 360×640, 390×760 and 430×880 for Phase,
  A–Z and IMDb: three full columns in every case, right peek 21–60% and bottom
  peek 18–67% of a card, the count pill never over a card, zoom 47–57% (was
  52–62%). Regression scripts listed above pass. Before/after screenshots
  reviewed by the user, who approved committing and merging to main.
- Limits: cards open about 8–15% smaller; on short phones A–Z leaves up to
  ~70px above the first row, and at 430×880 its bottom peek is about a fifth of
  a card. Not checked on a physical phone.

## V3 Spatial — chronological eras and connection labels

Recorded: 2026-10-26 13:00:42 EDT (-0400).

- Chronological Spatial rows are in-story eras (Before 2008, 2008–2012, …
  2027–2028, from the titles' own years); an undated title stays in the era of
  the one before it, so Chrono reads as the same left-to-right staircase as
  Release (phase rows made it zigzag). Both timelines label their rows ("Phase
  1"… in phase colours, or the era years; translated), hidden while a title is
  selected, and the opening view keeps the first label clear of the count pill.
- Character labels on a hovered or selected title's connections draw in their
  own layer above the cards, at the nearest point on the line no card covers
  (or just above/below the row), with a soft shadow; pill widths come from the
  measured name, so padding is even.
- Hovering a connection line highlights the two titles it joins and names them
  in its tooltip. Clicking a line opens a pair view: the two titles move side by
  side, the rest dims and the camera glides to them; Escape, a background click,
  tapping a card or a new layout restores it. Links between titles in the same
  row arc below the row instead of running behind the cards between them.
- Hovering a character in the drawer lights only that character's lines, and
  related titles are judged by core identity (character variants such as Captain
  Carter count as Peggy Carter), so a lit line never leads to a dimmed card.
- Verification: headless Chromium at 1440×900 and 390px (pt-BR). QA sweep of
  all 64 titles × 403 cast hovers: no lit line led to a dimmed card, no console
  errors. Labels overlapping a card when hovering Iron Man 2 / The Avengers /
  with a selection: 11/14/9 before, 1/2/2 after. Pair view: Fantastic Four ↔
  Avengers: Doomsday side by side, 62 others dimmed, restored by Escape and a
  background click. Fit, context, panel, language, List, suggestions, layering,
  animation, celebration, alignment, About, welcome and camera scripts pass; the
  camera script fails intermittently (about 1 in 4 runs) at a timing-dependent
  step on both this and the previous revision. Screenshots reviewed by the user,
  who approved committing and merging to main.
- Limits: the pair view and line tooltips were checked on desktop only (lines
  are hard to tap on phones); a few labels can still sit on a card when many
  share one spot. Notion screenshots on the tickets could not be opened by
  Claude, so the states were reproduced in the app.

## V3 feature — Seen/Watchlist counters and celebrations

Recorded: 2026-10-26 10:39:08 EDT (-0400).

- Count badges on Seen and Watchlist in the collection switch (desktop and
  phones): green and amber, hidden at zero and never on Unseen; they pop in when
  they first appear and bump with the number rolling up or down (not on load).
- Marking a title seen or adding it to the watchlist pops the tapped button with
  a coloured ring (lifted above the neighbouring button so the ring is never
  hidden) and shows a toast with Undo (restores the previous state, including the
  watchlist) and dismiss, paused while hovered or focused. Removals only update
  the counters. The toast stays clear of the desktop drawer, the phone sort bar
  and character pill, moves to the top while a phone sheet is open, and renders
  outside the app so sheets don't block Undo.
- Confetti only for milestones newly completed by the tap: every released title
  in a phase ("Phase 1 complete!") or every released title ("You're all caught
  up!"). New `celebrate.jsx`; `tracking.jsx` announces only taps on the
  seen/watchlist buttons, never sync or merges. English and Brazilian Portuguese.
  Pop, badge motion and confetti are skipped with reduced motion.
- Verification: headless Chromium. Desktop List: watchlist badge 4→5 and toast;
  seen + Undo; watchlisted title seen then Undo returns it to the watchlist;
  Ant-Man completing Phase 2 and re-marking The Avengers completing Phase 1
  (confetti removed after ~2 s); auto-hide; toast centred beside the open drawer;
  fresh visitor has no badges until the first mark; the popping button sits above
  its neighbour (z-index 2 vs auto) on rows and cards. Phone 390px: badges on the
  icon-only switch, toast 11px above the sort bar, at the top inside a details
  sheet with a working Undo. Fit, context, panel, language, List, suggestions,
  layering, animation, About and welcome scripts pass, with the October 26 catalog
  data loaded. Recorded clips reviewed by the user, who approved committing and
  merging to main.
- Limits: not checked on a physical phone; milestone confetti was checked with
  seeded collections, not a real account.

## V3 catalog — October 26 review

Recorded: 2026-10-26 10:31:09 EDT (-0400).

- VisionQuest now includes Paladin / Todd Stashwick, confirmed by Disney's
  publisher article. Adds the character id `paladin`, with the existing initials
  portrait and proper-name fallback in English and Portuguese. All 64 title ids
  are preserved; the documented character count is now 84.
- Spider-Man: Brand New Day IMDb 8.0 → 7.9, from a newer indexed primary
  ratings-page snapshot (363,885 votes). Rechecked October 26; direct access
  returned 403 and an older title-page index still shows 8.0. This is not live
  verification. Evidence and per-entry checked dates are in the catalog audit
  and source mapping; other scores and release dates are unchanged.
- Verification: Node VM checks passed for stable title ids, 84 characters, cast
  references, the new IMDb value, unchanged release/RT values and upcoming
  unrated entries. Browser checks: desktop and 390px mobile VisionQuest cast
  shows four entries including Paladin / Todd Stashwick; mobile Brand New Day
  shows IMDb 7.9 / RT 90 in English and Portuguese; Portuguese Paladin search
  returns VisionQuest with the correct actor. `git diff --check` passed.
- An initially stale cached entry page omitted the language scripts and failed
  to render; loading the current entry page with a fresh query parameter
  resolved that issue without code changes. No physical-device, auth, cloud
  write or production checks were performed. The user approved committing and
  merging to main on 2026-10-26; this record is not a deployment timestamp.

## V3 feature — About and first-visit welcome

Recorded: 2026-10-26 10:02:00 EDT (-0400).

- New `about.jsx`: About MCU Connections, opened from a footer link in the account
  menu (desktop) and account sheet (phones), for guests and signed-in users. The
  footer is the planned home for a future Settings entry. Desktop shows a centred
  dialog (focus kept inside; Escape, × or a click outside closes it; focus returns
  to the account button); phones use the bottom sheet.
- Content (English and Brazilian Portuguese): a short description, four ways to
  explore in a 2 × 2 grid (one column on narrow screens) and credits: TMDB's
  notice for posters and photos, IMDb and Rotten Tomatoes ratings, synopses
  written for the site, and a fan-project disclaimer.
- First-time visitors see the same content once as a welcome with a "Start
  exploring" button. It is decided when the page loads, before anything is saved:
  browsers with saved preferences, language, collection or a sign-in count as
  returning and never see it; the result is kept in `mcu.welcome.v1`. A private
  window counts as a first visit and `?welcome` forces it for testing. Not shown
  when storage is unavailable.
- Phone sheets and the About dialog now focus the sheet/dialog itself on open, so
  no focus ring appears on a control the visitor didn't choose.
- Verification: headless Chromium. Desktop en/pt-BR: footer link, dialog focus,
  Tab/Shift+Tab containment, Escape/scrim close with focus return, no scrolling at
  1440x900. Phones 390 (pt-BR) and 320 (en): About sheet without horizontal
  overflow. Welcome: shown on a first visit, gone after Start exploring and
  reload, forced by `?welcome`, never for a returning visitor, not shown with
  storage blocked. Fit, context, panel, language, List, suggestions, layering,
  animation and camera scripts pass. The user reviewed the screenshots and
  approved committing and merging to main.
- Limits: TMDB's terms also ask for its logo in this section; only the notice
  text is shown for now. The welcome was not checked on a physical phone.

## V3 fix and improvement — Menu layering and filter animations

Recorded: 2026-10-25 21:59:44 EDT (-0400).

- Layering: the desktop toolbar was a sticky layer at z-index 50, below the
  details drawer (60), so the language, order, filters and account menus and the
  search suggestions opened under the drawer. The toolbar now sits at 70 (the
  drawer starts below it). The Spatial zoom control, hidden under the open drawer,
  now moves left of it. On phones the app bar (30) sat under the floating count
  and character pills, covering search suggestions in Spatial; it is now 50
  (sheets stay above).
- Animations: the mobile Grid/List reorder animation now also runs for All /
  Unseen / Seen / Watchlist and the phase, films/series and budget filters, and
  between List and Grid (titles move from their old spot while the old layout
  fades). The desktop List uses the same animation for sort tabs, column headers,
  order, collection and filters; leaving rows fade in a layer inside the list so
  they keep its columns. On phones, filter-sheet changes play when the sheet
  closes. Returning from an empty result animates titles in. Off with reduced
  motion; search typing does not animate.
- Verification: headless Chromium. A layering audit (elementFromPoint over a 5x5
  grid) of every toolbar menu, suggestions, zoom, count, banner controls and
  drawer close at 1440 and 1100px in Spatial and List with details open and a
  character pinned, and on a 390px phone in List and Spatial with the pill: all
  clear after the change (menus under the drawer, hidden zoom and covered phone
  suggestions before). Animation script: animations start and clean up for each
  toggle, filter, sort, List/Grid switch and a scrolled desktop List (leaving
  copies keep 11 columns); none while the phone filter sheet is open, played on
  close, nothing when it closes unchanged. Fit sweeps, context summary, List,
  panel, search, suggestions, synopsis, alignment and language scripts pass.
  Recorded clips of the phone and desktop List animations were reviewed by the
  user, who approved committing and merging to main.
- Limits: below 1280px the drawer still overlays the desktop List by design;
  marking a title seen while a filter hides it removes it without animation.

## V3 feature — Synopses and character highlighting

Recorded: 2026-10-25 21:12:20 EDT (-0400).

- Synopses: a short, spoiler-light summary for each of the 64 titles in English
  and Brazilian Portuguese (`synopses` locale tables, `MCU_I18N.synopsis()`),
  written for this app rather than copied. Unreleased titles state only what has
  been announced; Daredevil: Born Again S3 and Secret Wars say the plot has not
  been announced. Shown under the title in the desktop drawer and above the cast
  in the phone sheet, clamped to three lines with See more / See less.
- Character highlighting: picking a character in the details pins them. Their
  titles are laid out in the current order (the connection rings stay with a
  selected title) and the stepper (‹ ›, or the arrow keys) starts on the title it
  was pinned from, gliding or scrolling to each and opening its details on
  desktop. The current card gets a ring in the character's colour and a slight
  lift; their other titles step back. Clicking a card while pinned makes it
  current without the rings; unpinning with details open returns to them.
- Desktop: banner with photo, actor and title count, Their titles / All titles
  switch, stepper and clear. Phones: picking a character closes the sheet and a
  floating pill above the sort bar shows the character, actor, stepper and clear;
  phones always show only that character's titles.
- Phone sheets gain a close (×) button and swipe-down to close (from the handle,
  or the content when scrolled to the top; short drags spring back).
- AGENTS.md: new catalog titles also need a written synopsis per locale.
- Verification: headless Chromium. Synopsis clamp/toggle and reset on title
  change (en, pt-BR, phone). Desktop: Iron Man → pin Tony Stark gives 12 cards,
  no selection, "1 of 12" on Iron Man; stepping through all 12 keeps the current
  card centred on its layout position (0 px offset; the first build's CSS
  `scale` lift drifted up to ~125 px, fixed before commit); card click and unpin
  behave as above. Phone 390px: × and swipe close (a 50 px drag springs back);
  pin closes the sheet, pill 48 px tall without overflow; stepping in List and
  Spatial (0 px offset). Toolbar fit sweeps (en, pt-BR), context summary, List,
  panel, search, suggestions and language scripts pass. The user reviewed the
  desktop and phone flows and approved committing and merging to main.
- Limits: swipe tested with synthetic touch events, not on a physical phone;
  posters and photos were not loadable in the test browser; the camera script's
  passive-listener warning also occurs on the previous code.

## V3 feature — Search suggestions

Recorded: 2026-10-25 14:41:47 EDT (-0400).

- New `search-suggest.jsx` (`window.SearchInput`), shared by the desktop toolbar
  and the mobile app bar. From two letters it lists matching actors (with their
  characters and title count), characters (actor, title count) and titles (type,
  year) under the search box, with the matched part in bold and photo/poster
  thumbnails. Matching folds accents and covers names in every language. Names
  or words starting with the query rank first; people by title count, titles by
  release. Up to eight rows.
- Picking an actor or character searches for that name; picking a title also
  opens its details (desktop drawer, with the card selected in Spatial; mobile
  sheet). Combobox keyboard pattern (arrows, Enter, Escape); free-text search is
  unchanged. On phones the list spans the search row.
- Verification: headless Chromium. Desktop: no list for one letter; "tom" lists
  Tom Holland, Tom Hiddleston, Tommy Shepherd; arrows + Enter, click, title pick
  (drawer + Spatial selection), Escape, reopen on typing, close on blur, ARIA
  combobox attributes. pt-BR: "iron" and "vinga" results. Mobile 390px: full-row
  list, actor pick filters to 13 rows, title pick opens the sheet. Toolbar fit,
  desktop List, search highlighting, context summary, camera and language
  scripts pass. The user reviewed and approved committing and merging to main.
- Limits: on phones the open list covers the collection row until the box loses
  focus; thumbnails were not loadable in the test browser.

## V3 feature — Desktop List view

Recorded: 2026-10-25 14:22:35 EDT (-0400).

- Desktop gets a List view beside Spatial (switch at the end of the sort row,
  remembered as `desktopView` in `mcu.prefs.v1`, Spatial by default). New
  `desktop-list.jsx`: one row per title with poster, title, type, phase,
  release, in-story years, budget, IMDb, RT, character faces and status
  buttons; group headers follow the sort and rating sorts are ranked. Title,
  Phase, Released, Set in, IMDb and RT headers sort the list (click again to
  reverse) and stay in step with the sort row and Order menu. Columns drop by
  the List's own width (container queries). No desktop Grid: it would echo
  Spatial.
- A row opens the cast drawer, which now slides in and out and opens below the
  toolbar so the view switch, language and account stay usable. From 1280px the
  List makes room for it. Switching to Spatial with a title open selects that
  card; re-entering Spatial frames the camera like a fresh load.
- Search: a match badge under each List title shows the matched character at
  every width; character-name matches now come before actor-name ones (also on
  Spatial cards and mobile); the drawer and mobile details sheet underline
  matched names in the character's colour.
- Verification: headless Chromium, en-US and pt-BR. List: default Spatial,
  switch and reload persistence, mobile/desktop view independence, invalid
  value fallback, header sorting and reversal synced with the sort row, row
  open/highlight, status toggle without opening, character dimming, Spatial
  hand-off selection, filters/search/empty state, Spatial re-entry framing.
  No row overflow or clipped headers at 900–1920px with and without the drawer.
  Drawer slide traced frame by frame. Toolbar fit sweep, context summary,
  camera and language scripts pass (the camera script's wheel-cancels-glide
  step is timing-flaky on old and new code alike). The user reviewed and
  approved committing and merging to main.
- Limits: posters and actor photos were not loadable in the test browser;
  below 1280px the open drawer overlays the List's right-hand columns; no
  physical tablet check.

## V3 workflow — Completion time and order rules

Recorded: 2026-10-25 12:35:17 EDT (-0400).

- AGENTS.md (Backlog workflow) now matches the MCU - V3 Notion page: priority is
  the drag order of the Backlog column in the All tasks board (no priority
  numbers); closing a task records the actual America/New_York date and time and
  the next Completion order (highest existing value plus one, queried first),
  never creation or last-edited time; All tasks and Completed sort by Completed
  on, then Completion order, both descending. The Notion page's stale "Queue
  sorted by Order" instruction was replaced to match.
- Documentation only; no application change. Verified by re-reading both
  documents and querying the All tasks view (latest completion listed first).

## V3 maintenance — Floating desktop context summary

Recorded: 2026-10-25 12:15:11 EDT (-0400).

- The desktop context summary no longer takes a strip under the toolbar. It
  floats at the top-left of Spatial like the mobile pill: a count pill ("64
  titles" / "8 of 64"), one removable chip per active filter and Clear all when
  two or more are on. The desktop header returns to its previous height.
- Removed text the controls already show (sort and order) and the seen count on
  every screen size (seen without watchlist was arbitrary). Phones now read
  "24 of 64 · 2 filters · Clear".
- Removed the Recenter button again and its strings, plus the unused
  `header.seen`.
- Verification: headless Chromium, en-US and pt-BR. Fit sweep at 20 desktop and 4
  phone widths with All and Watchlist active: no overflow, overlaps, clipping,
  horizontal scroll or console errors; header 121px from 1280px, 177px below.
  Desktop: count matches the undimmed cards, chips match the filters, removing
  one resets its control, Clear all appears only with two or more chips and
  resets everything, the floating group covers no card at the default framing.
  Mobile: count matches rows, Clear works from the line, empty state and Spatial
  pill. Camera regression and language scripts pass. The user reviewed
  screenshots and approved committing and merging to main.
- Limits: many filters can wrap the chips to a second row over the top of the
  canvas; no physical-device check.

## V3 maintenance — Context summary on every screen size

Recorded: 2026-10-25 11:47:47 EDT (-0400).

- New context summary for what the view is showing. Desktop: a bar under the
  toolbar with the matching count, sort and seen count, one removable chip per
  active filter (search, collection, type, phase, budget), Clear all and a
  Recenter button (restored). Phones: one line at the top of List and Grid
  (count · seen · N filters, Clear) that scrolls with the list, and a pill at the
  top-left of Spatial clear of the zoom control; the line also shows above the
  empty state.
- The logo subtitles are gone on desktop and mobile, which also resolves the
  320px mobile subtitle overflow. The count is now the titles matching every
  filter, including the collection filter, on every surface (Spatial previously
  also counted cards the collection filter only dims). Below 360px the language
  globe hides so the app name fits.
- Locales: added `context.*`, restored `canvas.recenter*`; removed the unused
  `header.countOfTitles` and `sort.by.*` keys.
- Verification: headless Chromium, en-US and pt-BR. Fit sweep at 20 desktop and 4
  phone widths with All and Watchlist active: no overflow, overlaps, clipping,
  horizontal scroll or console errors. Desktop: chips match the filters, removing
  one resets its control, Clear all resets everything, Recenter restores the
  start camera after a pan, count equals the undimmed cards. Mobile: count equals
  list rows, Clear resets search and collection, empty state keeps the line, the
  Spatial pill does not overlap the zoom control and its Clear does not select a
  card. Camera regression and language scripts pass (the camera script now
  measures the card actually selected in its A→B step). The user reviewed
  screenshots and approved committing, pushing and merging to main.
- Limits: the desktop bar adds about 40px; the compact collection switch at 320px
  in Portuguese remains tight (pre-existing); no physical-device check.

## V3 maintenance — Even Spatial card layout; backlog priority rule

Recorded: 2026-10-25 09:44:26 EDT (-0400).

- Spatial cards sit on an even grid. Each card used to get a pseudo-random
  offset (±18–30px) for an "organic" look, which broke row alignment and made
  gaps uneven: Release/Chrono neighbours ranged from 8px overlapping to 57px
  apart, grid sorts from 15 to 110px. Gaps are now constant (25px in
  Release/Chrono, 60px in Phase/A–Z/IMDb/RT) and rows share a top edge.
- Card footers reserve room for a two-line title plus the year and story rows
  (92px), so every poster is the same height (176px) and the status buttons and
  rating badges line up; a one-line title previously left a taller poster
  (177–209px). Cards showing a search match badge shrink their posters equally.
- AGENTS.md: backlog priority is the order of the Backlog column in the Notion
  All tasks board (Notion keeps a separate manual order per view, so the Queue
  table's order is not the priority).
- Verification: headless Chromium at 1440px in all six sorts: no overlapping
  cards; neighbour gaps 25–26px (Release/Chrono) and 60px (grid sorts). Footer
  92px and poster 176px on all 64 cards in en-US, pt-BR and mobile Spatial; no
  card overflow while searching. Camera regression script (desktop
  select/close/glide/wheel/sort, mobile enter/select/restore/re-enter) unchanged;
  its mobile half was updated for the view menu. The user reviewed screenshots
  and approved committing and pushing to `version/3.0`.
- Limits: posters were blocked in the test browser, so poster cropping at the
  new height was not checked there; the canvas looks less scattered by design.

## V3 maintenance — Desktop navigation grouped like mobile

Recorded: 2026-10-25 00:57:40 EDT (-0400).

- The desktop toolbar now follows the mobile header's grouping. Top row: brand,
  then search, Order, Filters and All / Films / Series, then the language menu
  and account at the right. Second row: the six sort modes (sharing the width)
  and Unseen / Seen / Watchlist. Below 1280px the search group wraps onto its
  own full-width row between them (three rows).
- Step-downs sized for Portuguese: short sort labels at 1300px and below; at
  1150px and below the collection switch labels only All and the active option
  and "Order:" is hidden; below 1000px the switch is icon-only apart from All and
  Filters loses its text. The former single-row layout at 1920px+ is replaced.
- Removed the Recenter button (and its unused `canvas.recenter*` strings).
  Spatial still frames itself when the layout, filters or selection change and
  when details close.
- Verification: headless Chromium, pt-BR and en-US, with All and Watchlist
  active: no offscreen controls, row overflow, overlaps, clipped buttons,
  horizontal scroll or console errors at 20 desktop widths (900–2560, including
  1279/1280/1300/1301) and 4 phone widths (320–430). The 1280px breakpoint was
  measured with a long 176px account name in Portuguese (search ≈ 274px).
  Filters, Order and language popovers open inside the viewport; Order,
  language, sort, type and search work. Header height: 121–129px from 1280px,
  177px below. The user reviewed and approved committing and merging to main.
- Limits: no manual way to re-frame Spatial after panning other than changing a
  sort or filter; no physical-device or signed-in check.

## V3 maintenance — English and Brazilian Portuguese

Recorded: 2026-10-25 00:38:53 EDT (-0400).

- Added a build-free language system: one catalog per language in `locales/`
  (`en.js` is the complete base, 160 keys; `pt-BR.js` translates all of them)
  and `i18n.js`, which picks the language (saved choice `mcu.lang.v1`, then the
  browser/phone language, then English), falls back to English per key, handles
  plurals, budget formatting and collation, and re-renders on change.
- All interface text now goes through the catalogs. Portuguese shows official
  Brazilian release titles for all 64 entries (with search aliases), Brazilian
  character names where they differ, and translated story labels and notes.
  Search matches titles and characters in every language; A–Z sorts by the
  shown name.
- Header language menu (EN / PT) on the desktop toolbar and the mobile app bar.
  The mobile subtitle now truncates instead of running under the header
  buttons; the desktop toolbar steps labels down sooner so both languages fit.
- AGENTS.md requires new UI text to be added to every locale; README documents
  adding a language; docs/CATALOG-AUDIT.md lists the Brazilian title sources.
- Verification: headless Chromium with pt-BR and en-US browser locales: automatic
  detection, menu switching and persistence; no leftover English or missing keys
  across list, grid, spatial, filters, details, account and menus; cross-language
  search; fit at 16 desktop widths (900–2560) and 4 phone widths (320–430) in
  both languages with All and Watchlist active. No console errors. The user
  reviewed and approved committing and merging to main.
- Limits: Portuguese copy written by Claude; Supabase server error text stays in
  its original language; no physical-device or OAuth check.

## V3 maintenance — Always-visible Unseen / Seen / Watchlist switch

Recorded: 2026-10-24 23:48:23 EDT (-0400).

- All / Unseen / Seen / Watchlist moved out of Filters into an always-visible
  switch with icons (dashed ring = Unseen, check = Seen, bookmark = Watchlist).
  Desktop: second toolbar row beside All / Films / Series, stepping down to
  All + active label (and icon-only Recenter) below 1250px and on the joined
  1920–2399px row, icon-only below 1000px.
- Mobile header reorganised: search · order menu (no "Order:" text) · icon-only
  Filters on row two; collection switch · List/Grid/Spatial menu on row three.
  The switch labels All and the active option (all four from 400px).
- Collection no longer appears in the Filters popover/sheet, badge or Clear
  actions. Account modal "Show …" links gained the icons.
- Verification: headless Chromium with All and Watchlist active at desktop 900,
  1000, 1100, 1250, 1251, 1440, 1600, 1919, 1920, 2099, 2100 and 2560 and mobile
  320, 360, 390 and 430: no off-screen controls, row overflow or overlaps.
  Mobile list filtered 64 → 52 / 12 / 4; desktop dimmed 52 cards for Seen; view
  menu stayed on screen and switched to Grid. No console errors. The user
  approved committing and merging to main.
- Limits: the existing 320px title/subtitle overflow (e.g. with RT selected)
  is unchanged; no physical-phone, OAuth or cloud-write check by Claude.

## V3 maintenance — Remove mobile List rating bars

Recorded: 2026-10-24 23:15 EDT (-0400).

- Removed the score-length progress bars from mobile List when sorting by IMDb
  or Rotten Tomatoes. Numeric rating badges and rank numbers remain. Removed
  the unused bar styles and score calculation.
- User approved committing, pushing and merging all current V3 work into main,
  including the earlier in-story timeframe / Chrono update in
  [cbd8b3f](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/cbd8b3f).
  Original commit attribution is preserved.
- Verified locally in Chrome at 320px and 390px with IMDb and RT selected:
  all 64 List rows rendered, numeric badges and ranks remained, and rating bars
  were absent. List rows fit both widths; no browser errors were observed.
  `git diff --check` passed.
- Limits: existing header overflow with RT selected at 320px (340px content)
  remains separate from this List-only change. No physical-device, OAuth or
  cloud-write checks were repeated. These checks describe the local change,
  not a verified production deployment.

## V3 maintenance — In-story timeframes and a story-ordered Chrono view

Recorded: 2026-10-24 23:10:58 EDT (-0400).

- Every released title now has an in-story timeframe (`story`, plus
  `storyNote` for alternate realities) in `data.js`: a year, a range, `c.` for
  approximate years, or "Outside time" / "Multiverse". Primary source: Marvel's
  2023 official timeline book via Wikipedia's MCU timeline article; the book wins
  disputes (e.g. Iron Man 2008). Unreleased titles have none yet. Sources and
  judgment calls are in `docs/CATALOG-AUDIT.md`.
- A shared hourglass label shows it on desktop spatial cards, mobile grid cards,
  list rows and the mobile focus pop-up; the drawer and detail sheet read
  "Set in 1943–1945" plus any reality note. Release years stay visible.
- Chronological order now follows those timeframes (`chronOrder` renumbered
  1–64; about 17 backwards jumps removed). Within a year it follows the book's
  seasons; undated Loki/What If…? seasons keep their neighbours; unreleased
  titles sit at the end. The mobile Chrono list groups under story-timeframe
  headers and rows show their release year.
- Verification: headless Chromium. Labels on all 60 released titles on desktop
  1440×900 and mobile 390×844/320×640, none on the 4 unreleased; no clipped card
  text or horizontal overflow. 35 Chrono headers, none backwards, in both
  directions; Release headers unchanged; desktop Chrono opens with Eyes of
  Wakanda, First Avenger, Fantastic Four, Captain Marvel, Iron Man. No console
  errors. The user reviewed and approved it.
- Limits: in-universe years are partly disputed and judged from the cited
  sources; posters were blocked in the test renders; no physical-phone check by
  Claude.

## V3 maintenance — Main merge and production verification

Recorded: 2026-10-24 22:19:17 EDT (-0400).

- Final mobile layout and release documentation:
  [e36e4fd](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/e36e4fd5fa1fc8316649ad105da0203d3ff10a71).
  Approved V3 maintenance merged and pushed to main in
  [8731121](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/8731121cb4f9ab85e228315e44236532fda326d3).
  This preserved all original maintenance commits and coauthor credits.
- Closed both Notion tasks (List information layout and List/Grid navigation)
  with the 2026-10-24 completion date, implementation commit and merge link.
  Main and version/3.0 were synchronized; local worktrees were clean.
- Production smoke check at mcu-connections.vercel.app: at 390×844, List / Grid /
  Spatial appeared in order, all 64 rows loaded, ratings appeared inline under
  metadata and no horizontal overflow occurred. VisionQuest search returned one
  row with IMDb 8.0 / RT 90%; clearing restored the list. At 1440×900, desktop
  navigation loaded with Order and no toolbar overflow. No console errors.
- This proves the updated UI was observed on production; it does not establish
  the exact deployment time or repeat live OAuth, cloud-write, physical-device,
  Safari or screen-reader acceptance tests. No account data was modified.

## V3 maintenance — Mobile List layout and approved main release

Recorded: 2026-10-24 22:16:01 EDT (-0400).

- Move IMDb and Rotten Tomatoes together beneath List metadata, retaining
  RT-first ordering on RT sorts, rank numbers/bars, search matches, the unrated
  fallback and independent tracking/detail buttons.
- Order the mobile view switch List / Grid / Spatial with stable view ids;
  existing defaults and saved preferences continue to work.
- User approved these two tasks and merging all current V3 maintenance into
  main. The release includes the catalog refresh, reverse sorts, responsive
  navigation, mobile animations/default List, saved preferences, Safari Order
  fix and spatial camera/framing work recorded below. Preserve their original
  commits and tool attribution.
- Refresh README, spec/task/kickoff handoffs, catalog release status and the
  verification record. Notion is the live task database; code-task closure
  records approval, completion date and implementation commit after the push.
- Verification for this mobile change: Chrome at 320, 390, 430, 768 and 899px
  with Release/IMDb/RT sorts; ratings were below metadata and paired inline,
  with no row overflow or nested buttons. Checked unrated copy, details,
  seen/watchlist actions without opening details, Grid/Spatial/List switching
  and List persistence after reload. No console errors; whitespace check passed.
- Limits: physical phone/Safari keyboard, live sign-in and cloud sync were not
  repeated. Earlier maintenance checks below are preserved as historical
  evidence, not claimed as newly rerun. Email/password Phase 6 stays deferred.

## V3 maintenance — Spatial keeps your place and opens bolder

Recorded: 2026-10-24 22:07:27 EDT (-0400).

- Closing title details no longer drops the camera at the Phase 1 end. The
  focus ring is laid out near the canvas origin and the camera stayed there
  after the cards returned. The camera position is now remembered on selection
  and restored on close with a 600ms glide (cancelled by any pointer or wheel
  input). If the visitor hopped to another card through the ring, that card's
  layout position is centred at the original zoom. A layout change or Recenter
  in between clears the memory.
- Release/Chrono open at about 7.5 titles across on desktop and 2.5 on touch
  (capped at 100%), centred vertically on the titles in view instead of the
  top-left corner, keeping the leading title visible in reverse order.
  Grid-style sorts are unchanged.
- Entering Spatial on mobile from List/Grid now frames the canvas; it previously
  opened unframed at 100% on the top-left corner.
- Verification: headless Chromium. Desktop 1440×900: from a Phase 6 card,
  open/close restored the exact camera position (two runs); A→B through the
  ring centred B with 0px offset at the original zoom; sorting while open did not
  jump on close. Mobile 390×844: deselect restored the framed view; List → detail
  sheet → Spatial → deselect framed at 80%. Opening zoom for Release: 1280 65→87%,
  1440 74→98%, 1920 98→100%, phone 50→80%. No new console errors. The user
  reviewed and approved it.
- Limits: no physical phone/trackpad check by Claude; posters were blocked in
  the test renders. A pre-existing passive-listener warning on desktop wheel
  zoom remains.

## V3 maintenance — Fix the Order menu in Safari (awaiting phone check)

Recorded: 2026-10-24 21:41:19 EDT (-0400).

- Choosing an option in the Order menu did nothing on iPhone. Safari (iOS and
  macOS) does not focus a tapped button, so tapping an option blurred the
  focused one with no new focus target; the menu treated that as focus leaving
  and closed, unmounting the option before its click fired. The menu now only
  closes on focus loss when focus moves to an element outside it. Outside taps
  (pointerdown listener) and Escape still close it. Shared by desktop and mobile.
- Verification: headless Chromium with a script reproducing Safari's tap focus
  behavior. Before the fix both options failed on mobile 390×844 and desktop
  1440×900; after it both work in both directions, with and without the
  emulation. Outside tap, Escape with focus return, Enter to open, Tab out to
  close and keyboard selection pass. No console errors.
- Limits: WebKit was not available to Claude; pushed to the V3 preview so the
  user can confirm on a real iPhone.

## V3 maintenance — Agent workflow uses the Notion task database

Recorded: 2026-10-24 21:41:19 EDT (-0400).

- AGENTS.md now points Codex and Claude to the Notion V3 Tasks database instead
  of the archived checklist: take the next task from the Queue view, claim it
  with Assigned to + Status In progress and re-read the record, set Awaiting
  review when ready, and complete code tasks only after approval and a push,
  filling Completed on and Latest commit. Phase 6 stays Deferred.
- Verification: documentation-only; diff reviewed against the database's own
  workflow notes. No application files changed.

## V3 maintenance — Remember view, sort mode and order per device

Recorded: 2026-10-24 21:34:34 EDT (-0400).

- Each device now remembers the mobile view (List/Grid/Spatial), the sort mode
  and the order direction, on desktop and mobile, in `localStorage` key
  `mcu.prefs.v1` (`{ version: 1, viewMode, sort, sortDir }`), per V3-SPEC D6.
- Nothing is written until the visitor changes one of these, so first visits keep
  following the defaults (List, Release, oldest first). Preferences are not tied
  to the account and are not cleared on sign-out.
- Filters, search and the spatial camera are deliberately not saved, so nobody
  returns to a silently filtered catalog. D6 and README note this.
- Missing, malformed, wrong-version or unknown values fall back to defaults; an
  invalid direction falls back to that mode's default; blocked storage keeps
  choices for the visit only.
- Verification: headless Chromium. Mobile 390×844: Grid + IMDb lowest-first and
  Spatial + Chrono latest-first survived reloads; returning to List/Release
  persisted too; a Series filter (24 titles) reset to all 64 after reload with
  nothing stored. Desktop 1440×900: Phase 6→1 survived reload. Malformed JSON,
  wrong version, unknown values, an invalid direction and throwing storage all
  loaded without console errors. The user reviewed locally and approved it.
- Limits: browser emulation only; no physical-phone or private-browsing check by
  Claude.

## V3 maintenance — Mobile opens in List view

Recorded: 2026-10-24 21:20:39 EDT (-0400).

- Mobile (and touch layouts under 900px) now start in List instead of Grid.
  Grid and Spatial remain one tap away. The choice is not yet remembered between
  visits. Desktop is spatial-only and unaffected.
- Verification: headless Chromium at 390×844, 320×640 and 899×1100 opened with
  List selected and all 64 rows; List→Grid→Spatial→List switching worked;
  1440×900 still rendered the desktop spatial canvas. No console errors. The
  user approved the change.
- Limits: browser emulation only; no physical-phone check by Claude.

## V3 maintenance — Animated grid/list reordering

Recorded: 2026-10-24 19:49:39 EDT (-0400).

- Mobile Grid and List now animate when the sort mode or order changes, instead
  of swapping content instantly. Titles still on screen glide to their new slot;
  titles arriving from off-screen slide in from the direction they came from;
  titles leaving the viewport slide toward their new position and fade, using
  temporary copies in a clipped, inert, aria-hidden layer that is removed when
  done. Travel is capped to part of the viewport.
- Uses the Web Animations API with the spatial view's easing (520ms). Titles are
  tracked by id, since the list rebuilds its phase/year groups on reorder. A new
  sort mid-animation continues from the cards' current positions. Search,
  filters and status toggles do not animate. Skipped for prefers-reduced-motion.
- Verification: headless Chromium with touch emulation at 390×844 and 320×640,
  using npm copies of the pinned React/Babel/Supabase builds because the CDN was
  unreachable from the test environment. Checked Release→IMDb, order reversal,
  sorting while scrolled, a rapid IMDb→RT interrupt, and List Phase→A–Z and
  reversal; inspected mid-animation frames. No console errors, no animations or
  copies left behind, no horizontal overflow; reduced motion runs none. The
  user reviewed the result locally and approved it.
- Limits: the automated run blocked poster images; a physical-phone check was
  not performed by Claude. Desktop Spatial behavior is unchanged.

## V3 maintenance — Shared Codex/Claude workflow

Recorded: 2026-10-24 19:35:53 EDT (-0400).

- Codex and Claude now both work directly in the `version/3.0` worktree, one at
  a time. AGENTS.md gains a shared-working-tree section: check `git status`
  first and ask before touching another agent's uncommitted work; fast-forward
  only; claim Notion tasks as "In progress — Codex/Claude"; no destructive git
  commands or worktree pruning without approval; read-only cross-reviews; local
  preview on port 8123 (8126 also allowed for Google sign-in).
- Add a Claude co-author trailer rule naming the model actually used, matching
  the earlier Claude credits in history. Codex attribution is unchanged.
- Add CLAUDE.md, which only imports AGENTS.md so both agents share one rule set.
  README credits and project-structure table updated accordingly.
- Claude's push access to this repository was set up through the Claude GitHub
  App; pushes remain limited to `version/3.0` and still require user approval.
- Verification: documentation-only change; reviewed the diff and confirmed no
  application files changed. A dry-run push to `version/3.0` succeeded before
  this commit.
- Limits: no app behavior changed, so no browser checks were run. A main merge
  remains separately gated.

## V3 maintenance — Approved responsive navigation and mobile order placement

Recorded: 2026-10-24 17:20:14 EDT (-0400).

- Finalize the user-approved desktop layout: one row from 1920px, sorting above
  a full-width utilities row below that. Keep Order and Recenter labeled;
  show Sign in or the active session's name beside the desktop account icon.
  Long names truncate visually; profile values are never stored in the source.
- Move mobile Order beside search on header row two. Put Grid/List/Spatial and
  Filters together below it. Render search text at 13px using a scaled 16px
  input, retaining the existing iOS focus-zoom safeguard.
- Remove the visible Sort by caption while preserving an accessible navigation
  name. Increase bottom sort-tab height from 56px to 68px plus safe-area padding.
- Record the review-first Git workflow: keep future iterations local until the
  user approves committing/pushing. This change and V3 task completion were
  explicitly approved; a main merge remains separately gated.
- Verification: desktop fit and menus checked at 900–2560px during this review;
  the final row transition passed at 1919/1920px. Mobile fit passed at 320, 375,
  390, 430, 768 and 899px, with Order beside search, no horizontal overflow,
  13px rendered search text, no caption and 68px tabs. Selected both directions
  for all six mobile modes, searched/cleared VisionQuest, opened/closed Filters,
  switched Grid/List/Spatial and checked Escape focus return. No console errors.
- Limits: phone checks used Chrome viewport emulation, not a fresh physical iOS
  run; native keyboard/autozoom and live Google sign-in/cloud sync were not
  re-tested. Earlier entries below describe superseded layouts and review states.

## V3 maintenance — Desktop navigation spacing (awaiting review)

Recorded: 2026-10-24 16:45:26 EDT (-0400).

- Use two desktop rows at every desktop width: brand, search, Recenter and
  account in the first; sort mode/order, title type and Filters in the second.
  Give search the remaining first-row width with a 280px minimum container.
- Keep Recenter's text label visible and replace its ambiguous glyph with a
  crosshair. Preserve a DOM/tab order matching the visible row order.
- Replace the order selector's baseline-dependent text caret with a centered
  inline SVG chevron, shared by desktop and mobile. No new dependencies.
- Verification: both navigation rows fit without overflow at 900, 1000, 1100,
  1101, 1200, 1440, 1560 and 1920px; the search input had over 460px at 900px.
  Checked a one-title search and clearing it, Zoom in → Recenter restoring the
  previous canvas transform, order selection and matching Filters choices.
  Checked the mobile order popup at 390×844 and measured its chevron at the
  button's vertical center. The browser console contained no errors.
- Limits: mobile was browser-emulated; auth/cloud behavior was not re-tested.
  The V3 preview remains awaiting user review; main is not part of this change.

## V3 maintenance — Separate order menu (awaiting review)

Recorded: 2026-10-24 16:33:29 EDT (-0400).

- Replace the reversal arrows with the user-selected separate order menu:
  beside desktop sorting and above the mobile sort navigation. Compact labels
  show the current direction; the popover offers both full contextual labels.
- Keep mode selection in the main navigation. Move mobile A–Z out of Filters
  into the six-tab navigation; Filters contains only the current mode's two
  order choices, alongside its existing collection/phase/type/budget controls.
- Add full order choices to desktop Filters. Preserve existing sorting/layout
  functions, defaults, collection filtering and permanent title ids.
- Support pointer dismissal, Escape, focus return after selection and keyboard
  activation. Widen the desktop search-wrap breakpoint to accommodate the label.
- Verification: selected both directions for all six modes on desktop and mobile
  (24 menu selections); checked Filters wording/selection, mobile Grid/List Z–A,
  order-menu access in Spatial, keyboard Space/Escape/focus return, outside-click
  dismissal, no nested buttons and no browser console errors. Toolbar fit passed
  at 900/1000/1200/1440px; mobile navigation fit at 320px with 53px-wide tabs.
- Limits: phone layouts were browser-emulated, including 390×844; a new physical
  phone check and final user approval remain pending. No new auth/cloud checks
  were run. This change does not authorize merging into main.

## V3 maintenance — Reverse sort order (initial implementation)

Recorded: 2026-10-24 15:55:24 EDT (-0400).

- Add a desktop reverse-order arrow and mobile Order button; expose A–Z/Z–A
  alongside the other explicit direction choices in mobile Filters.
- Make release, chronology, phase, title, IMDb and RT ordering consistent across
  Grid, List and Spatial. Reverse phase groups and their within-phase release
  order; keep unrated titles last for either rating direction.
- Keep the leading timeline title visible when its phase band starts below the
  initial viewport. Reselecting the active mode preserves its current direction;
  changing modes retains the existing natural default for that new mode.
- Preserve collection dimming without reflow/recentering on status changes.
- Record the agreed Notion priority, approval and completion-date workflow.
- Verification: all 12 sort/direction combinations checked against the actual
  sort/layout functions; all 48 rendered combinations checked across desktop
  Spatial and mobile Grid/List/Spatial. Checked 900/1000/1200/1440px toolbar fit,
  mobile alphabetical direction chips, keyboard reversal, active-mode reselect,
  no nested buttons and the Unseen status-click viewport invariant. Local guest
  test marks were removed; the final browser console had no errors.
- Limits: mobile checks used a 390×844 browser viewport, not a physical phone.
  No fresh Google sign-in or cloud-sync regression was run; auth/schema/config,
  catalog ids, runtime dependencies and script loading are unchanged. Main merge
  and task completion still await user approval.

## Current documentation and privacy update — not yet on main

Recorded: 2026-10-24 15:11:55 EDT (-0400).

- Backfill this chronological commit overview and link it from the README.
- Credit Claude and ChatGPT/Codex, supporting tools, services and data sources.
- Add repository instructions to maintain this log and use Codex co-author credit.
- Correct README wording left over from before the initial V3 production merge.
- Review tracked files and reachable Git history for credentials and personal data;
  remove machine-specific home paths from current plans, expand ignore rules and
  configure the local repository to use the owner's GitHub noreply email for
  future commits. Old commit metadata is unchanged.
- Record findings and limits in [the privacy review](docs/PRIVACY-REVIEW.md).

## V3 maintenance — awaiting a separate merge approval

Catalog updates and this documentation update continue on `version/3.0`.
The weekly checker runs Mondays at 9am Eastern and prepares sourced patches for
review; it does not apply or publish them. It was configured outside Git, so it
has no standalone commit or inferred commit/deployment time.

| Date/time (EDT, UTC−04:00) | Commit | Overview |
|---|---|---|
| 2026-10-24 11:37:19 | [`902377c`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/902377c03f422e702964687684b97e6e1265052c) | Refresh released-title IMDb/RT ratings and Phase 6 release/cast metadata; preserve title ids, clarify rating scopes and handle month-only release windows. |
| 2026-10-24 11:57:53 | [`807cbf3`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/807cbf3d04f3db85df49855afe0ffcd4df03aafc) | Classify catalog work as V3 maintenance, consolidate its plan into V3 tasks and retire the temporary major-version branch. |

## History included in the initial V3 release

The user approved the V3 merge after the Phase 5 checkpoint (`1f79b74`).
Its commit time below is not a claim about the exact merge/deployment time.

| Date/time (EDT, UTC−04:00) | Commit | Overview |
|---|---|---|
| 2026-08-08 00:13:47 | [`663ad24`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/663ad24e2911aa9b908fb256eee56d663467fd59) | Create the repository and initial README. |
| 2026-08-08 00:43:22 | [`3f88b18`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/3f88b1816c849cfb751fb894fdfe2e5cf55a60a5) | Add the browser app shell, views and desktop/mobile styles. |
| 2026-08-08 00:44:08 | [`556a16e`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/556a16e2ebe1cee58fa9805fc019643c2ed513a4) | Add poster rendering and a standalone connection layer. |
| 2026-08-08 00:44:34 | [`4d87f66`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/4d87f661f115c90cedc3bc70ca4ff64d3e418aa6) | Add the standalone connection-layer source. |
| 2026-08-08 00:45:31 | [`bf57573`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/bf575733d8a27124390b310a0b9f31aba724c3e7) | Add touch navigation with Grid, List and Spatial views. |
| 2026-08-08 00:46:38 | [`870a832`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/870a832d9587322dead80214092b32a7f1640d1d) | Add desktop and mobile layout and visual styles. |
| 2026-08-08 07:28:51 | [`4a45847`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/4a45847201d8d81bc03c7c168ff133b927a943b3) | Add mobile styling and the TMDB media mapping. |
| 2026-08-08 07:31:37 | [`572af14`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/572af14397fb15e98d27675a17bef00a4546ba35) | Add TMDB poster and actor-portrait paths. |
| 2026-08-08 07:34:16 | [`ba5abc1`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/ba5abc1bef17532fb3846280588163bf02f78eb2) | Add the 64-title MCU catalog, character variants and cast connections. |
| 2026-08-08 07:37:49 | [`c7bde87`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/c7bde87db229e29f0b6d2b2b3619c4c0c18fbd5e) | Add canvas pan/zoom, connection threading, toolbar, search/filter controls and cast drawer. |
| 2026-08-08 07:43:08 | [`1d706bb`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/1d706bb3c1669b118e4c491be7ad90d1d65c5f13) | Restore missing connection-grouping comments. |
| 2026-08-08 07:50:55 | [`baac6ae`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/baac6ae36657a921d5fea92c29117e1cd4a02501) | Document features, data model, local startup and known limitations. |
| 2026-08-08 08:00:06 | [`5e9c236`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/5e9c236e77c9423b9b077ff2d1614efd0286c2b9) | Use index.html as the static Vercel entry point. |
| 2026-08-08 10:44:10 | [`713c67e`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/713c67ed160942584fb573fa6b56b60e83a95c27) | Search character/actor names, highlight matching cast and show full actor names. |
| 2026-08-08 10:47:23 | [`044fc4e`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/044fc4e439335b8d1c7c259c55050c3541edd5ed) | Merge pull request #1 containing the character/actor search improvements; integration checkpoint, not another implementation. |
| 2026-08-08 11:37:34 | [`f567dbf`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/f567dbfd7480009e04afa89e78e51297ded38ebf) | Prevent mobile search/input focus from zooming the page. |
| 2026-08-08 12:23:56 | [`47b947d`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/47b947dddfb0b736e920a73ad8f839f08514648f) | Add the V3 planning/setup checkpoint. |
| 2026-08-08 17:38:36 | [`1bf565a`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/1bf565aee62daccea21de973097ae5d729a73a47) | Implement local guest seen/watchlist tracking, status controls and collection filters; add the proposed database schema. |
| 2026-08-08 18:01:25 | [`4130f8c`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/4130f8c071c475a9efb5993d1d365f069034dac0) | Add the Supabase browser client, Google OAuth state and desktop/mobile account surfaces. |
| 2026-08-09 13:06:55 | [`cd43999`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/cd439997b6439bbc57e09ba0a6018690bca5be80) | Fix mobile list-row status-control placement and frame collection matches when recentering; keep status clicks from moving the viewport. |
| 2026-08-09 13:15:11 | [`b4609f8`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/b4609f84d686f7372de5c9cdbe2860c4c420e89e) | Fit the full matching set when recentering, with a minimum zoom and selected-card protection. |
| 2026-10-24 00:30:45 | [`5f34d7d`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/5f34d7d4121ecf61efa997bbde930078bc87f6bc) | Record Phase 1 manual verification and remaining checks. |
| 2026-10-24 10:08:37 | [`5d238d1`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/5d238d1579ed77fa286d168b9c6c0d0c54df8b2b) | Complete the Google-auth setup checkpoint; document deferred, separately approved email/password accounts. |
| 2026-10-24 10:23:00 | [`b36910e`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/b36910e494fef793406bb16ede82743dc6a22944) | Add cloud collection loading, guest merging, account-scoped per-title queues, rollback/retry and stale-response protection. |
| 2026-10-24 10:59:41 | [`a2364d7`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/a2364d797e56088350bc0a8d8b66f568aff84301) | Harden offline recovery, bounded requests and OAuth cancellation; improve modal focus, keyboard handling and mobile accessibility. |
| 2026-10-24 11:03:31 | [`503963a`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/503963afe465e9c90c9f9d873594522f2a4acde2) | Record the user’s successful post-hardening phone sheet, tap and scroll checks. |
| 2026-10-24 11:12:28 | [`1f79b74`](https://github.com/AndreFelipeRibeiro/MCU-Connections/commit/1f79b7430efc8d0553c77a824f19407ec743b2b1) | Complete Phase 5 setup/release documentation and verification evidence. This is the V3 commit subsequently approved and merged to main. |

## Verification and source notes

- [V3 manual verification](docs/V3-VERIFICATION.md): actual checks, user phone
  confirmations and untested areas; a successful commit alone is not verification.
- [Catalog audit](docs/CATALOG-AUDIT.md) and [source mapping](docs/CATALOG-SOURCES.json):
  score definitions, changed values, source URLs, dates and research limits.
- [V3 tasks](V3-TASKS.md): completion status and remaining approval gates.
- Email/password accounts remain deferred to Phase 6 and require explicit approval.
- Historical messages and timestamps are retained as recorded, including earlier
  naming decisions; the current workflow is V3 maintenance.

Future commits should add a dated overview, meaningful verification and any
material limitation here. Do not copy personal profile data, emails, tokens or
private local paths into this file.