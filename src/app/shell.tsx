// The app's frame on the design system (Notion "shadcn pass 6"): the app root,
// the Spatial viewport and canvas with their thread layers, the phone's main
// area and scroll area, and the phone's tapped-card popup. Class recipes only:
// the markup stays in app.tsx and mobile.tsx, whose own class names are not
// read by Tailwind; this file is listed with `@source` in src/index.css, so
// the recipes are generated from here.
//
// Hook classes kept for the app and the QA checks: `app`, `touch`,
// `drawer-open`, `viewport`, `canvas`, `canvas-bg`, `lines-settling`,
// `connection-layer`, `connection-labels`, `m-main`, `has-pill`,
// `m-scrollarea`, `m-spatial-wrap`, `m-focuspop`, `m-fp-*`, `seen`.

/** The app root: one viewport tall, everything scrolls inside it. */
export const APP = 'app flex h-screen flex-col overflow-hidden p-0 [&.touch]:h-dvh';

/** Spatial's viewport: a dot grid on the theme's page; in the light theme an
 *  ambient surface with depth (a warm wash from the top left, a cool one from
 *  the bottom right) instead of flat white. It is painted on the viewport,
 *  outside the canvas, so it costs nothing when zooming or panning. */
export const VIEWPORT = "viewport relative flex-1 cursor-grab overflow-hidden select-none active:cursor-grabbing before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_4%,transparent)_1px,transparent_1px)] before:bg-size-[32px_32px] before:content-[''] not-dark:bg-[radial-gradient(55%_60%_at_0%_0%,oklch(0.94_0.035_27/.7),transparent_70%),radial-gradient(60%_65%_at_100%_100%,oklch(0.94_0.03_255/.65),transparent_70%),linear-gradient(180deg,oklch(0.995_0.001_27),oklch(0.965_0.004_27))] not-dark:before:bg-[radial-gradient(circle,color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1px)] in-[.app.touch]:cursor-default in-[.app.touch]:touch-none in-[.app.touch]:active:cursor-default";
export const CANVAS_BG = 'canvas-bg pointer-events-none absolute inset-0';
/** Nothing inside the canvas may blur what is behind it: zoomed far out, iOS
 *  Safari runs out of memory (AGENTS.md, Spatial canvas performance). The
 *  pseudo-elements are reached with a plain selector, not Tailwind's `after:`
 *  variant, which would give every one of them content (and so a box). */
export const CANVAS = 'canvas absolute top-0 left-0 transition-none [&_.card_*]:backdrop-filter-none! [&_.card_*::after]:backdrop-filter-none!';
/** The thread lines: they wait for the cards after a new layout, and a pinned
 *  character's thread draws itself along its titles (Reduce motion: none). */
export const THREADS = 'connection-layer transition-opacity delay-60 duration-300 in-[.canvas.lines-settling]:opacity-0 in-[.canvas.lines-settling]:transition-none [&_path.thread-draw]:animate-[thread-draw_520ms_cubic-bezier(.2,.8,.2,1)_both] [&_path.thread-draw]:[animation-delay:var(--d,0ms)] [&_path.thread-draw]:[stroke-dasharray:1] motion-reduce:[&_path.thread-draw]:animate-none in-[.reduce-motion]:[&_path.thread-draw]:animate-none';
/** The connection labels draw above every card (cards go up to z-index 30). */
export const LABELS = 'connection-labels z-35 transition-opacity delay-60 duration-300 in-[.canvas.lines-settling]:opacity-0 in-[.canvas.lines-settling]:transition-none';

/** Phones: the main area under the app bar. */
export const M_MAIN = 'm-main relative flex flex-1 flex-col overflow-hidden';
/** The phone List's, Grid's and guide's scroll area. It never scrolls
 *  sideways; its last rows stay clear of the pinned character's pill or the
 *  guide's taller dock (which sets --dock-h); stepping keeps the current
 *  title's outline clear of the top edge, and of a meter pinned there. */
export const SCROLL = 'm-scrollarea flex-1 overflow-x-hidden overflow-y-auto px-3.5 pt-3.5 pb-5 scroll-pt-2.5 [-webkit-overflow-scrolling:touch] min-[600px]:px-5 min-[600px]:pt-[18px] min-[600px]:pb-6 in-[.m-main.has-pill]:pb-[calc(var(--dock-h,70px)+16px)]! in-[.m-main.has-pill]:scroll-pb-[calc(var(--dock-h,70px)+16px)] has-[.m-phase-divider.sticky]:[&_[data-row-id]]:scroll-mt-[52px]';
export const M_SPATIAL_WRAP = 'm-spatial-wrap relative flex flex-1 flex-col overflow-hidden';
/** Up next at the top of the phone List and Grid. */
export const UN_INLINE = 'un-inline mt-0.5 mb-3.5';

// Phones: the tapped card, popped out of the zoomed canvas at 1:1 so its
// type stays legible.
export const FP = {
  root: 'm-focuspop absolute z-25 flex w-[188px] flex-col -translate-1/2 animate-[mpop_200ms_cubic-bezier(.2,.9,.25,1)] cursor-pointer overflow-hidden rounded-xl border border-ring bg-card p-0 text-left text-card-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_28%,transparent),0_18px_44px_rgba(0,0,0,.7)] motion-reduce:animate-none',
  open: 'm-fp-open block w-full cursor-pointer p-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
  poster: 'm-fp-poster relative aspect-[2/3] bg-muted [&>:first-child]:block [&>:first-child]:size-full [&>:first-child_img]:size-full [&>:first-child_img]:object-cover [&>:first-child_svg]:size-full',
  seenWash: "after:pointer-events-none after:absolute after:inset-0 after:z-1 after:bg-[rgba(10,12,20,0.34)] after:backdrop-saturate-[.35] after:content-['']",
};

/** The startup screen (index.html, boot.js) is plain markup outside React;
 *  its classes are written there and generated from index.html. */
/** The Guides menu's title in the phone sheet. */
export const GUIDES_SHEET_TITLE = 'g-sheet-title text-xl font-semibold tracking-tight text-foreground';
