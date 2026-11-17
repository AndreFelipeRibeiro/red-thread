# Glossary

One name per idea, in every label, tooltip, accessible name, toast, guide,
ticket and doc. When a string says one of these ideas, it uses the name in
the **Use** column, in that language; the **Not** column lists names that
have been used for the same idea and must not come back. A short form
appears only where the table names one (a tight control), never as a
second name in running text. A new idea that
visitors will see gets its row here in the same change that names it.

Written for Notion "Write a glossary and use one name per idea"
(2026-11-16). The section names were decided in Notion "Rename the
top-level sections: Connections / Titles (or Lists) / Guides" (2026-11-15);
the Portuguese "Quero ver" by Andre on 2026-11-16.

## Sections

| Idea | Use (English) | Use (Portuguese) | Not |
| --- | --- | --- | --- |
| The canvas of linked title cards | Connections | Conexões | Explore, Spatial (internal and code name only), Map |
| The list of every title | Titles | Títulos | My list, Lists, Library |
| Curated viewing orders | Guides (one: a guide) | Guias | Paths, Playlists |
| Go from a title to its place on the canvas | See connections | Ver conexões | Show in Explore, Open in Spatial |

## A title and the collection

| Idea | Use (English) | Use (Portuguese) | Not |
| --- | --- | --- | --- |
| A film, series or special in the catalog | title | título | item, entry, movie (when it can be a series) |
| Marked as watched | Seen | Visto / Vistos | Watched |
| Released and not marked seen | Unseen | Não vistos | To watch, Unwatched |
| Saved to watch later | Watchlist (always capitalized) | Quero ver | watchlist, Want to watch, Saved, Para assistir, lista para assistir |
| Every title, no filter | All | Todos | Everything |
| The next title to watch | Up next | A seguir | Next up, Continue |
| Not released yet | Coming soon; Coming {date}; "4 coming" | Em breve; Estreia em {date}; "4 a caminho" | Upcoming, "+4" alone |
| How much is seen | "40/60 seen", or "40 of 60 seen" where there is room | "40/60 vistos", "40 de 60 vistos" | a bare "40/60 +4" |

## Order and grouping

| Idea | Use (English) | Use (Portuguese) | Not |
| --- | --- | --- | --- |
| The in-universe timeline | Story order | Ordem da história (short, in the Sort button: História) | Chronological, Chrono, Timeline |
| By first release | Release date (short, in the Sort button: Release) | Data de lançamento (short: Lançamento) | Date, Premiere |
| The MCU's phases | Phase 1 … Phase 6 | Fase 1 … Fase 6 | PH 1, PHASE I, P1, By Phase, F 1 |
| When a story takes place | Set in | Se passa em | Story set in, Takes place |
| The critics' score from Rotten Tomatoes | Tomatometer (the "RT" tag only beside its number) | Tomatometer (tag "RT") | RT as a word, Rotten score |
| IMDb's audience score | IMDb rating (the "IMDb" tag beside its number) | Nota IMDb | IMDb score |

## Account and errors

| Idea | Use (English) | Use (Portuguese) | Not |
| --- | --- | --- | --- |
| Using an account | Sign in / Sign out | Entrar / Sair | Log in, Log out, Login (also in Portuguese) |
| Keeping the collection on the account | sync | sincronizar | cloud, Supabase, backup |
| Kept in this browser | saved on this device | salvo neste dispositivo | local storage, cached |

**Errors visitors see are plain sentences about their own things** (their
account, their collection, this device) and what to do next. They never name
a library, a service, a database rule or an error code: no "supabase-js",
"CDN", "JWT", "row-level security", "fetch failed". The technical detail goes
to the console (`console.warn`) for us, never into a toast, a tooltip or a
title's "Not saved" line. The strings live under `error.*` in
`locales/*.js`; a new failure gets a new plain string there rather than
showing `e.message`.

## Internal names that stay

Code, CSS hooks, storage keys and QA checks keep their old names: `spatial`,
`mcu.*`, `watchlist`, `chrono`, `window.MCU_*` (AGENTS.md, "Language"). This
glossary governs what people read, not identifiers.
