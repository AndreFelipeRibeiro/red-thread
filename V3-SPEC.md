# MCU Connections — V3 Spec: Watch Tracking & Accounts

Target worktree: `<your-developer-folder>/MCU-V3`

> **History (noted 2026-10-30).** This spec was written for the original V3
> build (2026-10-24) and is kept as a record; it is no longer the source of
> truth. For how the app works now, see [README.md](README.md); for where things stand, [docs/HANDOFF.md](docs/HANDOFF.md); for decisions, [docs/decisions.md](docs/decisions.md); for working rules, [AGENTS.md](AGENTS.md). The backlog is the Notion V3 Tasks board. Lines marked *Superseded* below no longer hold; the
> rest is as written. §7.1 (collection status dims cards in Spatial, never
> removes them) and decisions D1–D8 still apply.

This spec is the source of truth for V3. It was written after reading the actual
codebase, so the code references below are real — verify them before assuming
anything has drifted.

## Handoff — 2026-10-24 (historical; current: docs/HANDOFF.md)

Phases 1–5 were initially released to `main` at `1f79b74`.
The subsequent V3 maintenance release was approved on 2026-10-24: catalog
refresh, reverse sorting, responsive navigation, mobile List/animations,
per-device preferences, Safari Order handling and spatial camera improvements.
These changes are included in the current `main` release, not a new major version.
Further development continues on `version/3.0` in
`<your-developer-folder>/MCU-V3`. The Notion V3 Tasks database is the active
backlog; the former checklist is archived.
Current setup is in [README.md](README.md), catalog work and sources are in
[docs/CATALOG-AUDIT.md](docs/CATALOG-AUDIT.md), and the original phase verification
is in [docs/V3-VERIFICATION.md](docs/V3-VERIFICATION.md).

**Next gates:** the user approved this maintenance merge on 2026-10-24.
Future changes still require review before committing/pushing and a new approval
before another main merge. Continue the user's bugs/improvements before Phase 6.
Email/password implementation and service setup require their own plan and
explicit approval; this maintenance release does not authorize them.

---

## 1. Goal

Let a visitor mark titles as **seen** or **on their watchlist**, keep that
information across reloads and devices, and sign in with Google to sync it.

Non-goals for V3: episode-level progress, ratings/reviews, sharing a collection
publicly, friends/social, additional social auth providers.

Phases 1–5 remain Google-only. Email/password signup and sign-in are planned
for deferred **Phase 6** (§5.5), as requested on 2026-10-24. Recording this plan
is not authorization to implement it: present a Phase 6 plan and obtain explicit
user confirmation before starting code, schema, or dashboard changes for it.

---

## 2. Codebase baseline and conventions

The table and approximate line numbers describe the pre-V3 baseline. Phases
1–5 have landed; verify current code before editing. The README lists the
current files and script order, including tracking/auth and the Supabase client.

| File | What it is |
|---|---|
| `index.html` | Entry point. Loads React 18.3.1, ReactDOM, `@babel/standalone` 7.29.0 from unpkg — **each with an SRI `integrity` hash** — then `data.js`, `media-data.js`, `poster.jsx`, `connections.jsx`, `mobile.jsx`, `app.jsx` in that order. |
| `data.js` | `const TITLES = [...]` — 64 titles with stable string ids (`iron-man`, `loki-s2`). Ends by assigning `window.TITLES`, `window.CHARACTERS`, `window.RT_SCORES`, `window.IMDB_RATINGS`. |
| `media-data.js` | `window.MEDIA` — TMDB poster/profile paths. |
| `poster.jsx` | `PosterArt`, exported via `window.PosterArt = PosterArt`. |
| `connections.jsx` | Standalone SVG connection layer, **not wired into the running app**. Ignore it. |
| `mobile.jsx` | The whole touch shell. Exports via `Object.assign(window, { MobileTopBar, SortTabs, MobileGrid, MobileList, FilterSheet, CastSheet, FocusPop, SpatialHint, ScoreBadges, Sheet, EmptyState, MatchBadge, Highlight })` on the last line. |
| `app.jsx` | Desktop app + the single `App()` root (`function App()`, ~line 553) that branches to the mobile shell. Ends with `ReactDOM.createRoot(...).render(<App/>)`. |
| `styles.css` / `styles-mobile.css` | Desktop and touch stylesheets. Both are loaded on every device. |

> *Superseded:* `index.html` now loads about twenty local scripts (boot.js,
> the locales and i18n.js, guides.js, watch-data.js, desktop-list.jsx,
> upnext.jsx, watch.jsx, guides-ui.jsx, picker.jsx and more), and the line
> numbers above no longer hold; the README's Project structure table is
> current. `connections.jsx` is no longer loaded at all (Batch 10,
> 2026-10-30).

**Critical conventions to preserve:**

- No `package.json`, no bundler, no router, no server, no tests. Do not add any
  of these. JSX is compiled in the browser by Babel standalone.
  > *Superseded 2026-10-28 (`31b9d25`):* `qa/` holds development-only
  > Playwright and axe checks with their own `package.json`; nothing in the app
  > loads from it and Vercel doesn't deploy it. The app itself still has no
  > build step.
- Scripts are **not** ES modules. Cross-file sharing happens exclusively through
  `window.*`. Any new `.jsx` file must end with an `Object.assign(window, {...})`
  or `window.X = X` export, and must be added to `index.html` in dependency order.
- Every CDN `<script>` in `index.html` carries `integrity` + `crossorigin`.
  Anything new must too.
- Desktop is **spatial-canvas only**. `viewMode` (grid/list/spatial) exists only
  behind `isTouch`. The desktop render tree is `Toolbar` → canvas → `CastDrawer`.
  Do not add grid/list to desktop as part of V3.
  > *Superseded 2026-10-25 (`52a1f60`):* desktop has a List view as well as
  > Spatial (`desktop-list.jsx`); see docs/decisions.md.
- The breakpoint is `window.innerWidth < 900` → mobile shell (`useDevice()`).

---

## 3. Decisions already made

These were debated during planning and are settled. Implement them as written.
If you think one is wrong, say so before implementing — do not silently deviate.

**D1 — Three mutually exclusive states per title: `none` | `watchlist` | `seen`.**
Marking a watchlisted title as seen moves it to `seen`. Unchecking `seen` returns
it to `none` (not back to `watchlist`).

**D2 — Whole titles only, not episodes.** `loki-s1` / `loki-s2` are already
separate title records; that is the granularity.

**D3 — Progress counts released titles only, computed at runtime.** The
denominator is `TITLES.filter(t => t.release <= todayISO()).length`. As of
2026-08-08 that is 59 of 64, but the next release is 2026-10-14 — **never
hardcode 59.** Unreleased titles may still be added to the watchlist; they just
don't count toward completion.

**D4 — Collection filtering does NOT go into the `filtered` memo.**
See §7.1. This is the single most important implementation decision in the spec.

**D5 — Guest→account merge uses status precedence, not "remote wins."**
`seen` > `watchlist` > `none`. These are monotonic facts about what someone
watched; a last-write-wins or remote-wins rule silently discards real
information. On merge, for each title id take the strongest status from either
side.

**D6 — No `user_preferences` table in V3.** View mode, sort, sort direction and
active filters are device-scoped by nature (this app renders a completely
different shell on phone vs desktop). Persist them in `localStorage` only. If
account-level preferences are ever wanted, add a single `jsonb` column later
rather than a column-per-setting table.
Implemented (V3 maintenance) as `mcu.prefs.v1` for view mode, sort and sort
direction only. Filters are deliberately not persisted: returning to a silently
filtered catalog reads as missing titles.

**D7 — Supabase, not Firebase.** Reasons: officially supported plain-CDN UMD
build (no npm needed), Google OAuth with browser redirect, session persistence
and `detectSessionInUrl` on by default, and Postgres RLS maps cleanly onto
`user_id + title_id` rows.

**D8 — The app must fully work with Supabase unreachable.** See §6.4.

---

## 4. Data model

### 4.1 Catalog

`data.js` stays the sole source of truth for the catalog. **Do not copy titles
into the database.** `title_states.title_id` is a plain `text` column pointing at
`TITLES[].id`.

Title ids are now **permanent identifiers**. A title's display name may change;
its id must never change and must never be reused for a different title. Add a
comment to that effect at the top of `data.js`.

### 4.2 Table

One table. Full DDL in `schema.sql` — run that, don't retype it.

```
title_states
  user_id     uuid        references auth.users(id) on delete cascade
  title_id    text        not null
  status      text        not null check (status in ('seen','watchlist'))
  seen_at     timestamptz null
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()
  primary key (user_id, title_id)
```

Notes:

- `none` is represented by **the absence of a row**, not by a third status value.
  Clearing a status is a `DELETE`.
- The primary key `(user_id, title_id)` already indexes `user_id` as the leftmost
  column, which is what every query filters on. **Do not add a redundant
  `user_id` index.**
- `seen_at` is set when status becomes `seen`, cleared otherwise. It exists so a
  future "recently watched" or rewatch-count feature has somewhere to go; nothing
  in V3 reads it.

### 4.3 RLS

Enable RLS on `title_states`, then add four policies for role `authenticated`.
Get the `USING` / `WITH CHECK` split right — this is where holes come from:

| Operation | Clause |
|---|---|
| `SELECT` | `USING ((select auth.uid()) = user_id)` |
| `INSERT` | `WITH CHECK ((select auth.uid()) = user_id)` |
| `UPDATE` | `USING (...)` **and** `WITH CHECK (...)` |
| `DELETE` | `USING ((select auth.uid()) = user_id)` |

The `(select auth.uid())` wrapping (rather than bare `auth.uid()`) is
deliberate — it lets Postgres evaluate the function once per query instead of
per row.

### 4.4 Unknown title ids

If a row's `title_id` doesn't resolve against `data.js` (a typo, a rename, a
title removed from the catalog), the row is **inert, not garbage**. Ignore it in
the UI. **Never delete rows just because the current catalog doesn't recognise
them** — that turns a one-character typo into permanent data loss.

Add a dev-only assertion that logs a console warning listing any stored
`title_id` with no matching catalog entry.

---

## 5. Auth

### 5.1 Client

Load supabase-js from CDN in `index.html`, **before** the app scripts, pinned to
an exact version with an SRI hash — matching the existing React/Babel pattern.
Do not use the floating `@2` tag shown in the docs; it defeats SRI.

Two new plain `.js` files (not `.jsx` — no JSX in them, so no Babel cost):

- `config.js` — `window.MCU_CONFIG = { supabaseUrl, supabasePublishableKey }`.
  Committed to the repo. That is fine and intentional: this key is designed to
  be public and is what RLS protects against.
- `supabase-client.js` — creates the client, assigns `window.mcuSupabase`.
  If `config.js` is missing or blank, it must set `window.mcuSupabase = null`
  and **not throw** (see §6.4).

**Never commit:** the `service_role` key, the Google OAuth client secret, or any
database credential. The Google secret lives only in the Supabase provider
settings. The app never calls Google APIs directly, so it does not need a Google
provider access token.

### 5.2 Google setup checklist

1. Create a Google **Web application** OAuth client.
2. Authorized JavaScript origins: production, the V3 branch preview and local
   development origins (without trailing slashes). Use the exact origin table
   in the README, including localhost:8126 when using the verification server.
3. Authorized redirect URI: the Supabase project callback
   (`https://<project-ref>.supabase.co/auth/v1/callback`) — copy the exact value
   from the Supabase dashboard's Google provider page.
4. In Supabase → Authentication → Providers → Google: paste the client ID and
   client secret, enable.
5. In Supabase → Authentication → URL Configuration: set Site URL to production
   and allow the exact production, V3 preview and local page URLs in the README.
   Add `/index.html` separately if that path is used; ports and paths must match.
6. In the app: `signInWithOAuth({ provider: 'google', options: { redirectTo } })`
   where `redirectTo` is `window.location.origin + window.location.pathname`.
7. No callback route is needed. The user lands back on `index.html` with the
   auth code in the URL and `detectSessionInUrl` (on by default) completes the
   exchange. After it resolves, strip the auth params from the URL with
   `history.replaceState` so a reload isn't messy.

**For Phases 1–5:** in Supabase → Sign In / Providers → Email, turn
**Enable email provider OFF** and save. Keep Google enabled, **Allow new users
to sign up ON**, and anonymous sign-ins OFF. The Email provider is deferred
until Phase 6 is explicitly approved and its complete flows are ready (§5.5).
Disabling Email limits supported sign-in methods; it does not restrict which
Google users may register. Provider configuration belongs in the dashboard,
not in the collection schema.

### 5.3 Auth state machine

Model it explicitly, not as a pair of booleans:

```
initializing | signed_out | signing_in | signed_in | error
```

During `initializing`, **the catalog renders normally** and only the collection
controls show a loading treatment. Titles must never flash as "unseen" before
remote rows arrive.

Subscribe to `onAuthStateChange` and handle `SIGNED_IN`, `SIGNED_OUT`, and
`TOKEN_REFRESHED`. A failed refresh degrades to `signed_out`, not to a crash.

### 5.4 Sign-out

On sign-out, immediately clear all account collection data from React state.
**Do not write it into the guest `localStorage` key** — on a shared device that
would hand one person's collection to the next visitor. After a successful guest merge, the guest key is cleared. Independently retained,
unmerged guest marks can remain; sign-out never fills the key from account rows.


### 5.5 Deferred Phase 6 — email/password accounts (confirmation required)

**Do not start automatically after Phase 5.** First review the current code and
Supabase documentation, present the implementation/setup plan, and ask the user
for explicit confirmation to begin Phase 6. Earlier “go ahead” approvals and
approval to record this roadmap do not authorize this phase. Until then, keep
Email disabled and do not add forms, recovery handlers, SMTP credentials or
provider configuration for it.

Once approved, scope includes:

- Email/password signup and sign-in alongside Google, with accessible desktop
  popover and mobile sheet forms, validation, pending states and useful errors.
- Email confirmation, resend confirmation, and clear instructions while awaiting
  confirmation. Do not grant a signed-in UI merely because signup succeeded.
- Forgot-password email and password reset, including recovery-session handling,
  expired/used/invalid links, and successful return to normal account UI.
- Confirmation/recovery redirects for localhost, the V3 Vercel preview and
  production, using the existing entry page and `window.*` architecture: no
  router, bundler, npm or separate application server.
- Transactional email/SMTP configuration and delivery checks before public
  launch. Keep SMTP credentials and all auth secrets in service dashboards.
- Review and explicitly document verified-email identity linking behavior when
  Google and email/password use the same address. Never merge collections by
  matching email strings in application code; ownership remains `auth.uid()`.
- Account name/avatar fallbacks for users without Google profile metadata;
  existing sync, guest merge, sign-out clearing and account isolation still apply.

**Schema:** no change is needed now. `schema.sql` references `auth.users(id)` and
its RLS checks `auth.uid()`; neither is tied to Google. Supabase Auth manages
credentials. Do not add password columns or a separate credentials/profile table.
Reassess only if the approved Phase 6 design introduces a new data requirement.

**Acceptance after approval:** manually verify signup → confirmation → sign-in,
resend, incorrect credentials, recovery/reset and invalid/expired links, reload
persistence, Google regression, same-email identity behavior, account switching
and API-level isolation. Exercise desktop/mobile and allowed deployment origins;
record actual results separately from assumptions. See Phase 6 in `V3-TASKS.md`.

---

## 6. Storage & sync

### 6.1 Guest mode (signed out)

Tracking works without an account. Persist to `localStorage` under a versioned
key, e.g. `mcu.collection.v1`, shaped as `{ version: 1, states: { [titleId]: 'seen' | 'watchlist' } }`.
The version field exists so a future shape change can migrate rather than
silently misread.

Surface a quiet, non-nagging line in the account UI: *"Saved on this device.
Sign in to sync."*

### 6.2 Merge on first sign-in

1. Load all remote rows for the user.
2. For each title id present in guest storage or remote, resolve to the
   strongest status (D5: `seen` > `watchlist`).
3. Write back only the rows that changed.
4. **Only after the write succeeds**, clear the guest key. If the write fails,
   leave guest data in place and show an error — never destroy the local copy on
   an unconfirmed sync.

### 6.3 Writes while signed in

Supabase is the source of truth. Apply changes optimistically in React, then
persist. On failure, roll the UI back and show a small inline error on that
title — not a global toast.

**Serialize writes per title id.** Rapid toggling (seen → none → seen) will race
otherwise and can settle on the wrong value. A simple per-`title_id` promise
chain with last-intent-wins is enough; do not fire an unbounded number of
concurrent upserts.

### 6.4 Degrading gracefully

The catalog is static and must not depend on Supabase. The earlier claim of
“zero network calls at load” was inaccurate: CDN scripts, fonts and media can
require network access. Guest tracking works when Supabase is unavailable, but
a cold load without cached CDN libraries is not supported.

- If `window.mcuSupabase` is null, or the client fails to initialise, or session
  restoration doesn't resolve within a short timeout (~5s): fall back to guest
  mode, render everything, and show "Sync unavailable" in the account surface.
- Assume this **will** happen: Supabase pauses free-tier projects after ~7 days
  of low activity, and this is a personal project with sporadic traffic.
  The implemented policy is **accept the pause, with no keep-alive automation**.
  Restore a paused project through the dashboard; meanwhile the catalog and guest
  tracking remain usable when the required CDN libraries are available.
- Phase 4 bounds session restoration, cloud reads/merges/writes and OAuth startup
  with five-second deadlines. Backend/network failures on initial sync degrade
  to guest without copying account rows; Retry connection reloads to recover.

---

## 7. UI

### 7.1 Collection filtering — read this carefully

> *Superseded in part, 2026-11-17* (docs/decisions.md, "The filter lens"): on the Spatial canvas, Seen, Unseen and Watchlist now pack their matching titles and hide the rest instead of dimming them in place. The rule's reason still holds: the lens takes its titles when the filter changes, so marking a title under a filter never reflows the canvas.

There is an existing `filtered` memo in `App()` (~line 603) that chains
phase → type → budget → search. It feeds `computeLayout(filtered, sort)` →
`basePositions` → `positions`, and `resetView` is a `useCallback` with
`basePositions` in its dependency array, invoked from
`useLayoutEffect(() => { resetView(); }, [resetView])`.

**Consequence:** anything added to `filtered` re-lays-out the spatial canvas and
recenters the viewport. If a collection filter went in there, then with "Unseen"
active, marking a title as seen would make the card vanish, reflow the entire
graph, and yank the viewport out from under the user's cursor mid-click.

So:

- **Spatial canvas (desktop + mobile spatial view):** the collection filter is a
  *visual* treatment, not a set filter. Matching titles stay in the layout;
  non-matching titles get dimmed. Connection lines are preserved. Nothing
  reflows, nothing recenters.
- **Mobile grid and list views:** these are flat sorted lists with no layout or
  viewport to disturb, so a real filter is fine there. Apply it as a separate
  memo derived from `ordered`, downstream of `filtered` — do not touch the
  `filtered` memo itself.

If you find you must change `filtered`, you must also decouple the recenter, and
you should flag it rather than doing it quietly.

### 7.2 `TitleStatusActions`

One reusable component, used at all six integration points. Put it in the new
`tracking.jsx` and export it on `window`.

Contents: a seen toggle, a watchlist toggle, a pending/saving indicator, and an
error indicator.

Requirements:

- Use `<button>` with `aria-pressed`, **not** a checkbox input — these are
  toggles, and `aria-pressed` is the correct pattern.
- Accessible labels naming the title: `"Mark Iron Man as seen"` /
  `"Remove Iron Man from watchlist"`.
- Call `stopPropagation()` on **both** `onMouseDown` and `onClick`. The desktop
  `Card` (app.jsx ~line 168) starts a drag on `onMouseDown` and decides "was this
  a click?" by comparing coordinates in `onClick` — a status button that doesn't
  stop mousedown will start dragging the card.
- Hit targets ≥ 32px at scale 1. Note the spatial canvas renders cards at
  `view.scale`, which the fit logic can put around 0.7–0.8 on desktop and lower
  on touch, and users can zoom to `ZOOM_MIN = 0.05`. Decide and document what
  happens at small scale — recommended: hide the controls below ~0.5 scale and
  let the seen *badge* remain as a non-interactive marker.

### 7.3 The six integration points

| Surface | File | Anchor | Note |
|---|---|---|---|
| Desktop spatial card | `app.jsx` | `Card` (~168) | It's a `<div>`, so no nesting problem — but see the drag/click note above. |
| Desktop cast drawer | `app.jsx` | `CastDrawer` (~227) | Plenty of room; put full labelled buttons in the header. |
| Mobile grid card | `mobile.jsx` | `MobileGrid` (~96) | **Currently `<button className="m-card">`.** Must be refactored. |
| Mobile list row | `mobile.jsx` | `MobileList` (~127) | **Currently `<button className="m-lrow">`.** Must be refactored. |
| Mobile cast sheet | `mobile.jsx` | `CastSheet` (~276) | Add to `m-cast-hero`. |
| Mobile spatial focus card | `mobile.jsx` | `FocusPop` (~319) | **Also currently `<button className="m-focuspop">`.** Same refactor. |

**The nested-button refactor:** `m-card`, `m-lrow` and `m-focuspop` are each a
single `<button>` wrapping the whole card. A `<button>` inside a `<button>` is
invalid HTML and behaves unpredictably. Convert each outer element to a `<div>`
with a dedicated primary button (or the poster/title area made clickable) for the
existing "open detail" action, then place `TitleStatusActions` as a sibling.
Preserve the current keyboard and tap behaviour — these are the primary
navigation affordances of the mobile app and breaking them is worse than not
shipping the feature.

### 7.4 Collection filter control

Add a **Collection** group — `All` / `Unseen` / `Seen` / `Watchlist` — to:

- Desktop: the `Filters` popover in `Toolbar` (~282), alongside Phase and Budget.
- Mobile: `FilterSheet` (~213), as another `m-fgroup` of `m-chip`s.

Wire it into the active-filter counters. Note these are two separate things, and
neither is called `filterCount` in `App()`:
- `activeFilters`, computed locally inside `Toolbar` (counts phase + budget only).
- the `filterCount` prop passed down to `MobileTopBar`.

Also wire it into both clear-filters paths: `pop-clear` in `Toolbar`, and the
`onClear` passed to `FilterSheet` from `App()` (line 1096).

> *Superseded 2026-10-24 (`0a39304`):* All / Unseen / Seen / Watchlist is its
> own always-visible switch, not a group inside Filters.

### 7.5 Progress display

- `X of N released titles seen`, N computed at runtime (D3).
  > *Superseded 2026-10-28 (`1fc30af`):* progress is the shared meter
  > (`ProgressHeader`): one per phase in By Phase, one for the whole catalogue
  > elsewhere, with titles not out yet shown as "+n".
- Watchlist count shown separately.
- Seen cards get a check badge plus a subtle desaturation/overlay. It must not
  obscure connection lines or the phase colour coding.
- `EmptyState` in `mobile.jsx` (~191) currently hardcodes *"No titles match / Try
  clearing a filter or the search box."* Give it a prop so collection filters can
  say *"Your watchlist is empty"* / *"You've seen everything that's out."*

### 7.6 Account surfaces

No router exists and V3 does not add one. Use the existing popover/sheet idioms.

**Desktop:** signed out → a compact "Sign in" button at the right edge of
`tb-row`. Signed in → an avatar button opening an account popover, modelled on
the existing `filters-pop` (click-outside + Escape to close).

⚠️ `tb-row` is already dense — brand, 6 sort buttons, 3 type buttons, filters
pill, search box, recenter — and the mobile breakpoint is 900px, so this row must
survive at exactly 900px wide. Check the 900–1200px range specifically; this is
the most likely place V3 visually breaks.

**Mobile:** the avatar goes in `m-appbar-top`, which already holds `m-brandrow`
and the three-way `m-viewswitch`. Don't cram in a fourth control — move
`m-viewswitch` onto its own compact row. Be aware the mobile header is already
`m-appbar-top` + `m-searchrow` + `SortTabs`; adding a fourth row costs real
vertical space on a phone, so keep the view-switch row tight (icon-only is
acceptable there). Account and preferences open as `Sheet`s.

**Account menu contents:** Google avatar, name, and email; seen/watchlist summary;
shortcuts to the collection filters; sign out. Use the Google `name` and avatar
from user metadata — no separate profile table, and no editable profile in V3.

---

## 8. Files

The following is the original delivery file list; these additions are now present.

**Add:**

| File | Contents |
|---|---|
| `config.js` | `window.MCU_CONFIG` — Supabase URL + publishable key only. Plain JS. |
| `supabase-client.js` | Creates and exports `window.mcuSupabase`, or `null` on failure. Plain JS. |
| `tracking.jsx` | Collection state, guest storage, remote load/mutate, merge, `TitleStatusActions`, progress helpers. |
| `account.jsx` | Auth state machine, session provider, account popover + sheet, sign-in/sign-out UI. |
| `schema.sql` | Provided — run as-is. |

**Modify:**

| File | Change |
|---|---|
| `index.html` | Add pinned + SRI supabase-js CDN script, then `config.js`, `supabase-client.js`, then `tracking.jsx` and `account.jsx` before `app.jsx`. Order matters. |
| `app.jsx` | Consume tracking/account state; collection dimming on canvas; Collection filter group in `Toolbar`; progress readout; status actions in `Card` and `CastDrawer`; account button in `tb-row`. |
| `mobile.jsx` | Status controls at 4 points; the nested-button refactor; Collection group in `FilterSheet`; account sheet; `EmptyState` variants; view-switch row move. |
| `styles.css`, `styles-mobile.css` | Status badges/toggles, seen treatment, account surfaces, loading and error states. |
| `data.js` | Comment documenting that ids are permanent and never reused. |
| `README.md` | Document Supabase + Google setup, new files, tracking and manual verification. Entry point is `index.html`; the user authorized correcting the legacy references on 2026-10-24. |
| `.gitignore` | Currently only `.DS_Store` and `.claude/`. Leave `config.js` tracked — it is intentionally public. |

---

## 9. Delivery phases

Detail and acceptance criteria in `V3-TASKS.md`. Summary:

1. **Collection foundation** — state, guest `localStorage`, `TitleStatusActions`,
   the nested-button refactor, collection filter + dimming, progress.
2. **Backend + auth together** — schema and RLS, Supabase client, Google sign-in,
   auth state machine, account UI, sign-out. *These ship as one phase on purpose:
   splitting them lands a sign-in button that authenticates and then has nowhere
   to write.*
3. **Sync** — remote load, per-title write queue, optimistic updates with
   rollback, guest merge.
4. **Hardening** — cross-account isolation, mobile interaction testing, OAuth
   cancellation, offline/paused-project behaviour, accessibility, the 900–1200px
   desktop toolbar.

5. **Docs** — setup instructions and manual verification records.
6. **Email/password accounts — deferred, explicit confirmation required** —
   signup/sign-in, confirmation/resend, recovery/reset, email delivery, identity
   behavior and regression verification (§5.5). Do not begin without a new
   user approval specifically for this phase.

---

## 10. Verification

There is no test runner and V3 is not adding one, so **all of this is manual**.

> *Superseded 2026-10-28 (`31b9d25`):* the `qa/` checks run per ticket and in
> full once per batch (qa/README.md). Real-device checks are still manual.
Write it into the README as a checklist.

1. **Cross-device sync** — mark titles on desktop, sign in on phone, same state.
2. **Cross-account isolation** — two Google accounts in two browser profiles;
   neither sees the other's rows. Additionally verify at the API layer: hit
   PostgREST directly with account A's JWT requesting account B's rows and
   confirm an empty result, not a 200 with data.
3. **Sign-out clearing** — sign out, confirm React state is empty and guest
   `localStorage` was not populated from the account.
4. **Account switching** — sign out of A, into B, on the same browser; no bleed.
5. **Guest merge** — guest marks X seen, account already has X watchlisted →
   result is `seen` (D5). Guest data cleared only after the write succeeded.
6. **Drag/click isolation** — on the desktop canvas, clicking a status button
   must not select, focus, or drag the card. Test at several zoom levels.
7. **Mobile nesting** — no `<button>` inside `<button>` anywhere; card tap-to-open
   still works; keyboard tab order is sane.
8. **Degraded mode** — block the Supabase domain in devtools and reload. Catalog
   renders, guest tracking works, a clear "sync unavailable" message appears, no
   white screen and no unhandled rejection.
9. **OAuth cancellation** — start Google sign-in, hit back/cancel. App returns to
   `signed_out` cleanly with no stuck spinner.
10. **Progress denominator** — temporarily fake the clock past 2026-10-14 and
    confirm the released count moves from 59 to 60.
