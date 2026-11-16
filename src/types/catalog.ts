// The shapes every component reads (docs/V4-PLAN.md §9 step 7; the Notion
// ticket "Convert the app to TypeScript" calls these the highest-value types).
//
// Written from the data itself rather than from the comments above it: each
// field below was derived by walking all 64 titles, 89 characters and every
// guide, so an "optional" here means genuinely absent from some entries, not
// a guess. Keep it that way when the catalog grows.

/** A locale key, e.g. `en` or `pt-BR`. */
export type Lang = string;

/** Text held per language in the catalog (guides carry their own copies). */
export type Localized = Record<Lang, string>;

export type TitleType = 'film' | 'series';

/** A film or series. `id` is a permanent collection key: never renamed. */
export interface Title {
  id: string;
  title: string;
  year: number;
  /** 1–6. */
  phase: number;
  type: TitleType;
  /** A US first-release day `YYYY-MM-DD`, or `YYYY-MM` when the day is not confirmed. */
  release: string;
  /** In-universe order, 1 = earliest. */
  chronOrder: number;
  /** In-universe timeframe shown to visitors; absent for unreleased titles. */
  story?: string;
  /** Context for alternate realities, beside `story`. */
  storyNote?: string;
  accent: string;
  /** Character ids, in billing order. */
  cast: string[];
  /** Character id to the performer credited for *this* title, where it differs. */
  credits?: Record<string, string>;
  // The three below are attached after the literals, from BUDGETS, RT_SCORES
  // and IMDB_RATINGS, and `continuity` by guides.ts. They are optional
  // because data.ts publishes TITLES before it fills them in, not because a
  // title can end up without them — every reader null-checks anyway.
  /** Millions of USD, or null when not public. */
  budget?: number | null;
  /** Rotten Tomatoes critics score, from RT_SCORES. */
  rt?: number | null;
  /** IMDb user rating, from IMDB_RATINGS. */
  imdb?: number | null;
  /** Where the title sits relative to the main continuity. */
  continuity?: ContinuityMark;
}

export interface Character {
  name: string;
  actor: string;
  color: string;
  initials: string;
  /** The title id this character is most associated with, where one stands out. */
  prime?: string;
}

/** Whether a stop is essential to a guide or an optional extra. */
export type StopWeight = string;

export interface GuideStop {
  /** A `Title['id']`. */
  id: string;
  weight: StopWeight;
  why: Localized;
}

export interface Guide {
  id: string;
  kind: string;
  group: string;
   /** The title id the guide leads to. Absent on the evergreen collections
   *  (the sagas, Spider-Man, Avengers, animated), which lead nowhere. */
  target?: string;
  color: string;
  /** ISO date the content was last reviewed. */
  reviewed: string;
  name: Localized;
  short: Localized;
  blurb: Localized;
  /** Shown once the guide is complete; absent on the evergreen collections. */
  done?: Localized;
  stops: GuideStop[];
  /** Set when the guide is not tied to an upcoming release. */
  evergreen?: boolean;
  /** Set on character guides. */
  character?: string;
  /** A title id this guide prepares for. */
  preparesFor?: string;
}

/** Where a title sits relative to the main continuity. guides.ts marks every
 *  title, defaulting to `main`. */
export type ContinuityMark = 'main' | 'alternate' | 'anthology';

export interface Media {
  poster_base: string;
  profile_base: string;
  /** Title id to TMDB poster path. */
  posters: Record<string, string>;
  performers: Record<string, string>;
  actors: Record<string, string>;
  ratings: Record<string, unknown>;
  local_posters: Record<string, string>;
}

/** One service offering a title in one country. */
export interface WatchOffer {
  [key: string]: unknown;
}

export interface WatchData {
  /** ISO date the snapshot was taken. */
  checkedAt: string;
  source: string;
  /** Country codes the snapshot covers, e.g. `US`, `BR`. */
  regions: string[];
  logoBase: string;
  ids: Record<string, unknown>;
  /** Title id to country code to that country's offers. */
  titles: Record<string, Record<string, WatchOffer>>;
}

/** What a visitor has done with a title. */
export type CollectionStatus = 'seen' | 'watchlist' | null;

/** What `MCU_nextUp` (tracking) worked out: the one suggestion of what to
 *  watch now, or why there is none. */
export type NextUpResult =
  /** Nothing in scope at all. */
  | { kind: 'empty' }
  /** Everything in scope is seen. */
  | { kind: 'allSeen' }
  /** Everything left in scope was skipped in the guide. */
  | { kind: 'allSkipped' }
  /** Everything released is seen, and more is coming. */
  | { kind: 'caughtUp'; upcoming: Title }
  /** Nothing in scope has been released yet. */
  | { kind: 'notOut'; upcoming: Title }
  /** Watch this one next. */
  | { kind: 'next'; title: Title; rank: number; released: number };

/** The same bundle every Up next surface is handed by the app shell, so the
 *  words and actions stay identical across the phone row, the Grid card, the
 *  desktop strip, the Spatial meter row and the phone chip. */
export interface UpNextInfo {
  result: NextUpResult;
  /** "Up next", "Next from your Watchlist", "Up next for Loki". */
  lead: string;
  /** "release order", plus any type, phase or budget filter. */
  detail: string;
  /** A Watchlist, character or filter is narrowing the suggestion. */
  scoped: boolean;
  /** On the Watchlist tab. */
  watchScope: boolean;
  onOpen(id: string): void;
  /** The compact card's ✕: hides the card for this visit. */
  onHide(): void;
}

/** The same bundle, narrowed to the case where there is a title to show. The
 *  surfaces that render a card are only mounted for a `next` result, so this
 *  states that contract in the type instead of adding a runtime guard. */
export type UpNextWithTitle = UpNextInfo & { result: Extract<NextUpResult, { kind: 'next' }> };
