/// <reference types="vite/client" />
// (Vite's import queries: ?raw for the share card's token file and logo,
// ?url for its fonts.)
// The shared surface. Every file in src/app still publishes its components on
// `window` and reads its neighbours' from there — the bundle changed how the
// app is delivered, not how its pieces are shared (docs/V4-PLAN.md §5 point 7),
// and that surface is also what 15 of the QA checks read inside the page (§5.3).
//
// So this is where the app's module boundaries are typed, which the Notion
// ticket asks for first. Component and helper types are taken straight from the
// implementations with `typeof import(...)`, never restated here: a second copy
// of 103 signatures would drift within a week, and this way a changed prop is a
// type error at every use site immediately.
//
// Hand-written entries below are the ones with no module to point at: the
// classic scripts that stay outside the bundle (i18n.js, boot.js,
// watch-data.js, the locales) and a few values assigned inline.
import type { Title, Character, Guide, ContinuityMark, Media, WatchData, Lang } from './catalog';

type Poster = typeof import('../app/poster');
type SegPillModule = typeof import('../app/seg-pill');
type ToolbarModule = typeof import('../app/toolbar');
type HeaderControls = typeof import('../app/header-controls');
type PhoneHeader = typeof import('../app/phone-header');
type SpatialCardModule = typeof import('../app/spatial-card');
type StatusActions = typeof import('../app/status-actions');
type SpatialChrome = typeof import('../app/spatial-chrome');
type TitleDetails = typeof import('../app/title-details');
type Tracking = typeof import('../app/tracking');
type Celebrate = typeof import('../app/celebrate');
type Account = typeof import('../app/account');
type About = typeof import('../app/about');
type Suggest = typeof import('../app/search-suggest');
type Mobile = typeof import('../app/mobile');
type DesktopList = typeof import('../app/desktop-list');
type ListParts = typeof import('../app/list-parts');
type UpNext = typeof import('../app/upnext');
type Watch = typeof import('../app/watch');
type GuidesUI = typeof import('../app/guides-ui');
type Picker = typeof import('../app/picker');
type App = typeof import('../app/app');
type ThemeModule = typeof import('../theme');
type SettingsModule = typeof import('../app/settings');
type ShareModule = typeof import('../app/share');
type ShareImageModule = typeof import('../app/share-image');

/** The i18n runtime (i18n.js), a classic script so the startup screen can
 *  speak the visitor's language before the bundle arrives. */
export interface I18nRuntime {
  lang: Lang;
  setLang(lang: Lang): void;
  tr(key: string, vars?: Record<string, unknown>): string;
  titleName(title: Title): string;
  titleNames(title: Title): string[];
  charName(id: string): string;
  charNames(id: string): string[];
  /** Takes the story string itself (`Title['story']`), not the title. */
  storyLabel(story: string | undefined): string;
  storyNote(title: Title): string;
  synopsis(title: Title): string;
  /** Released, coming, or expected at the precision the catalog has. */
  release(title: Title): { status: 'released' | 'upcoming' | 'expected'; date: string | null };
  /** Millions of USD, formatted for the current language. */
  budget(millions: number): string;
  upper(text: string): string;
  compare(a: string, b: string): number;
  languages(): Array<{ code: Lang; name: string; short: string }>;
  detect(): Lang;
  /** One normalisation for case and accents, shared by search, suggestions
   *  and highlighting (AGENTS.md). */
  fold(text: string): string;
  /** Called after every language change (Settings syncs it to the account). */
  subscribe(fn: () => void): () => void;
}

/** Guide helpers, assembled across guides-ui. */
export interface GuideRuntime {
  progress(guide: Guide, statusOf: (id: string) => string | null): {
    complete: boolean;
    ess: { seen: number; released: number; upcoming: number; skipped: number; total: number };
    opt: { seen: number; released: number; upcoming: number; skipped: number; total: number };
  };
  stops(guide: Guide, includeOptional: boolean): Array<{ id: string; title: Title; weight: string }>;
  skippedNow(guide: Guide, id: string, statusOf: (id: string) => string | null): boolean;
  name(guide: Guide): string;
  short(guide: Guide): string;
  kind(guide: Guide): string;
  blurb(guide: Guide): string;
  size(guide: Guide): string;
  forTitle(id: string): Guide[];
  /** Settings: every skipped stop back on its path. */
  resetSkips(): void;
  targetDate(guide: Guide): string | null;
  [key: string]: unknown;
}

declare global {
  interface Window {
    // ---- The catalog (src/data) -------------------------------------------
    TITLES: Title[];
    CHARACTERS: Record<string, Character>;
    BUDGETS: Record<string, number>;
    RT_SCORES: Record<string, number>;
    IMDB_RATINGS: Record<string, number>;
    GUIDES: Guide[];
    CONTINUITY: Record<string, ContinuityMark>;
    MEDIA: Media;
    mediaURL(kind: string, key: string, fallback?: string): string | undefined;
    /** Filled by the host page when posters are served locally. */
    __resources?: Record<string, string>;
    MCU_credit(title: Title, charId: string): string;
    /** Every performer credited for each character, with how many titles each
     *  carries, ordered by that count. Built once and shared. */
    MCU_creditRoster(): Record<string, Array<{ name: string; n: number }>>;
    /** The where-to-watch snapshot. watch-data.js stays a separate classic
     *  script because a QA check replaces it over the network. */
    WATCH: WatchData;

    /** The theme mechanism (src/theme.ts), published like the rest of the
     *  shared surface so the eventual Dark/Light control and the QA checks
     *  drive it rather than toggling the class behind its back. */
    MCU_THEME: Pick<ThemeModule,
      'getChoice' | 'getTheme' | 'setChoice' | 'systemTheme' | 'applyTheme' | 'startTheme' | 'STORAGE_KEY'>;

    // ---- Classic scripts outside the bundle --------------------------------
    MCU_I18N: I18nRuntime;
    MCU_LOCALES: Record<Lang, { strings: Record<string, string>; [key: string]: unknown }>;
    MCU_BOOT: { refresh(): void };
    MCU_CONFIG: { supabaseUrl: string; supabasePublishableKey: string } | null;

    // ---- Supabase ----------------------------------------------------------
    mcuSupabase: unknown;
    /** Why sync is or is not available, so the account UI can say something
     *  more useful than "something went wrong". */
    MCU_SUPABASE_STATUS: { ok: boolean; reason?: string };
    /** The supabase-js UMD build, the one library still loaded from a CDN. */
    supabase?: { createClient(url: string, key: string, opts?: unknown): unknown };
    MCU_AUTH_CONTEXT: unknown;

    // ---- Components and helpers, typed from their modules ------------------
    PosterArt: Poster['PosterArt'];
    /** The poster fallback's initials for a title name (poster.tsx). */
    MCU_monogram: Poster['monogram'];
    Portrait: Poster['Portrait'];
    castPortrait: Poster['castPortrait'];
    performerPortrait: Poster['performerPortrait'];

    CollectionProvider: Tracking['CollectionProvider'];
    useCollection: Tracking['useCollection'];
    /** The live collection (what useCollection() returns), for code outside React and the QA checks. */
    MCU_COLLECTION?: ReturnType<Tracking['useCollection']>;
    TitleStatusActions: StatusActions['TitleStatusActions'];
    MCU_emitStatusChange: Tracking['MCU_emitStatusChange'];
    CollectionSwitch: HeaderControls['CollectionSwitch'];
    SegPill: SegPillModule['SegPill'];
    Toolbar: ToolbarModule['Toolbar'];
    SpatialCard: SpatialCardModule['SpatialCard'];
    CardText: SpatialCardModule['CardText'];
    cardFacet: SpatialCardModule['cardFacet'];
    CardMark: SpatialCardModule['CardMark'];
    ZoomControl: SpatialChrome['ZoomControl'];
    BandLabel: SpatialChrome['BandLabel'];
    SpatialOverall: SpatialChrome['SpatialOverall'];
    SpatialEmpty: SpatialChrome['SpatialEmpty'];
    LineTooltip: SpatialChrome['LineTooltip'];
    ContextSummary: SpatialChrome['ContextSummary'];
    CARD_SIZE: SpatialCardModule['CARD_SIZE'];
    Segmented: ToolbarModule['Segmented'];
    SECTIONS: ToolbarModule['SECTIONS'];
    FiltersMenu: ToolbarModule['FiltersMenu'];
    SyncStatus: Tracking['SyncStatus'];
    SeenMarker: StatusActions['SeenMarker'];
    TSA_SPIN: StatusActions['TSA_SPIN'];
    CheckIcon: Tracking['CheckIcon'];
    BookmarkIcon: Tracking['BookmarkIcon'];
    CollectionIcon: Tracking['CollectionIcon'];
    COLLECTION_OPTIONS: Tracking['COLLECTION_OPTIONS'];
    TSA_MIN_SCALE: Tracking['TSA_MIN_SCALE'];
    MCU_isReleased: Tracking['MCU_isReleased'];
    MCU_nextUp: Tracking['MCU_nextUp'];
    MCU_selectUpNext: Tracking['MCU_selectUpNext'];
    MCU_canMarkSeen: Tracking['MCU_canMarkSeen'];
    MCU_bulkTargets: Tracking['MCU_bulkTargets'];
    matchesCollection: Tracking['matchesCollection'];
    collectionEmptyCopy: Tracking['collectionEmptyCopy'];
    releasedCount: Tracking['releasedCount'];
    todayISO: Tracking['todayISO'];
    onStatusChange: Tracking['onStatusChange'];
    onBulkConfirm: Tracking['onBulkConfirm'];

    StatusToast: Celebrate['StatusToast'];
    burstConfetti: Celebrate['burstConfetti'];
    SignInNudge: Celebrate['SignInNudge'];
    BulkConfirm: Celebrate['BulkConfirm'];

    AccountProvider: Account['AccountProvider'];
    useAccount: Account['useAccount'];
    AccountButton: Account['AccountButton'];
    AccountPanel: Account['AccountPanel'];
    AccountSheet: Account['AccountSheet'];
    AccountAvatarButton: Account['AccountAvatarButton'];
    GoogleMark: Account['GoogleMark'];

    AboutDialog: About['AboutDialog'];
    AboutSheet: About['AboutSheet'];
    ModalDialog: About['ModalDialog'];
    /** Decided once, when about.tsx loads. */
    MCU_WELCOME: boolean;
    MCU_RETURNING: boolean;

    SearchInput: Suggest['SearchInput'];

    MobileTopBar: PhoneHeader['MobileTopBar'];
    MobileNavBar: PhoneHeader['MobileNavBar'];
    MyListBar: PhoneHeader['MyListBar'];
    MobileList: Mobile['MobileList'];
    FilterSheet: PhoneHeader['FilterSheet'];
    CastSheet: TitleDetails['CastSheet'];
    DrawerFrame: TitleDetails['DrawerFrame'];
    DrawerCast: TitleDetails['DrawerCast'];
    SheetFrame: TitleDetails['SheetFrame'];
    Hourglass: TitleDetails['Hourglass'];
    TitleDetailsBody: TitleDetails['TitleDetailsBody'];
    DetailSection: TitleDetails['DetailSection'];
    useDetailOpen: TitleDetails['useDetailOpen'];
    BulkHeaderAction: ListParts['BulkHeaderAction'];
    FocusPop: Mobile['FocusPop'];
    ScoreBadges: ListParts['ScoreBadges'];
    ScoreChip: ListParts['ScoreChip'];
    PhaseBadge: ListParts['PhaseBadge'];
    Sheet: Mobile['Sheet'];
    EmptyState: ListParts['EmptyState'];
    MatchBadge: ListParts['MatchBadge'];
    ProgressHeader: ListParts['ProgressHeader'];
    Highlight: Mobile['Highlight'];
    StoryYear: TitleDetails['StoryYear'];
    ReleaseLine: TitleDetails['ReleaseLine'];
    ReleaseBadge: TitleDetails['ReleaseBadge'];
    Synopsis: TitleDetails['Synopsis'];
    SortMenu: HeaderControls['SortMenu'];
    sortPhrase: HeaderControls['sortPhrase'];
    SettingsPanel: SettingsModule['SettingsPanel'];
    SettingsSheet: SettingsModule['SettingsSheet'];
    SettingsButton: SettingsModule['SettingsButton'];
    PreferencesSync: SettingsModule['PreferencesSync'];
    MCU_PREFS: SettingsModule['MCU_PREFS'];
    MCU_MOTION: SettingsModule['MCU_MOTION'];
    ShareButton: ShareModule['ShareButton'];
    ShareIcon: ShareModule['ShareIcon'];
    MCU_SHARE: ShareModule['MCU_SHARE'];
    ShareImageHost: ShareImageModule['ShareImageHost'];
    MCU_SHARE_IMAGE: ShareImageModule['MCU_SHARE_IMAGE'];
    useFitSteps: Mobile['useFitSteps'];
    useReorderAnimation: Mobile['useReorderAnimation'];
    captureViewFlip: Mobile['captureViewFlip'];
    captureFlip: Mobile['captureFlip'];
    playPendingFlip: Mobile['playPendingFlip'];
    MPHASE_COLORS: Mobile['MPHASE_COLORS'];

    DesktopList: DesktopList['DesktopList'];
    useRowKeys: DesktopList['useRowKeys'];
    TitlesSubNav: DesktopList['TitlesSubNav'];
    /** The List's groups for an order (phases, eras, or one flat run). */
    MCU_listGroups: DesktopList['dlGroups'];
    ListGroupHeader: DesktopList['GroupHeader'];
    /** Keeps focus on a row as the List reorders; assigned inline. */
    MCU_followRowFocus(toRow: unknown): void;
    /** Scrolls an element into view inside its own scroll area, never the page (mobile.tsx). */
    MCU_scrollInArea(el: Element, block?: 'center' | 'start' | 'nearest', smooth?: boolean): void;

    UpNextTag: UpNext['UpNextTag'];
    UpNextHide: UpNext['UpNextHide'];
    UpNextMeterRow: UpNext['UpNextMeterRow'];

    WhereToWatch: Watch['WhereToWatch'];
    MCU_region: Watch['MCU_region'];
    MCU_regionChoices: Watch['MCU_regionChoices'];
    MCU_countryName: Watch['MCU_countryName'];
    MCU_guessRegion: Watch['MCU_guessRegion'];

    GuideMenu: GuidesUI['GuideMenu'];
    GuideModule: GuidesUI['GuideModule'];
    GuidePill: GuidesUI['GuidePill'];
    GuideView: GuidesUI['GuideView'];
    GuideMeter: GuidesUI['GuideMeter'];
    GuideArt: GuidesUI['GuideArt'];
    GuidePartOf: GuidesUI['GuidePartOf'];
    GuideIcon: GuidesUI['GuideIcon'];
    GuidesButton: GuidesUI['GuidesButton'];
    GuidesPage: GuidesUI['GuidesPage'];
    ThemeLab: typeof import('../app/theme-lab')['ThemeLab'];
    GuidePromo: GuidesUI['GuidePromo'];
    GuideOff: GuidesUI['GuideOff'];
    GuideOffHint: GuidesUI['GuideOffHint'];
    GuideSkipControl: GuidesUI['GuideSkipControl'];
    GuideDetailsSkip: GuidesUI['GuideDetailsSkip'];
    useGuideSkips: GuidesUI['useGuideSkips'];
    MCU_GUIDE: GuideRuntime;

    SeenPicker: Picker['SeenPicker'];

    PHASE_COLORS: App['PHASE_COLORS'];
    sortTitles: App['sortTitles'];
    sortDirectionLabels: App['sortDirectionLabels'];
    tr: App['tr'];
    typeLabel: App['typeLabel'];

    // ---- The cross-cutting bridge ------------------------------------------
    // A small registry plus a few imperative hooks: the one piece of genuinely
    // shared state the file-by-file split never resolved. docs/V4-PLAN.md §3.3
    // keeps them as they are rather than redesigning them mid-migration.
    /** Extra sections the details drawer renders, filled by watch and guides-ui. */
    MCU_detailSlots: Record<string, React.ComponentType<{ title: Title }> & { has?(title: Title): boolean }>;
    MCU_activeGuideId: string | null;
    MCU_openGuide(id: string): void;
    MCU_openPicker(): void;
    /** True while a sheet is closing itself, so the address sync can tell that
     *  pop apart from the visitor pressing Back. */
    MCU_isOwnSheetPop(): boolean;

    /** Published for i18n.js, a classic script whose useI18n() calls
     *  React.useSyncExternalStore as a global. */
    React: typeof import('react');
    useI18n(): I18nRuntime;
  }
}

export {};
