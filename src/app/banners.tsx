// The pieces the pinned character's banner (desktop) and pill (phone) share
// with the guide's module (desktop) and dock (phone): the stepper, the close
// button, the character photo and the segmented "Their titles / All titles"
// switch (Notion "shadcn pass 6"). Class recipes only: the markup stays with
// each surface (app.tsx renders the banner and pill, guides-ui.tsx the module
// and dock). This file is listed with `@source` in src/index.css, so the
// recipes are generated from here wherever they are used.
//
// Hook classes kept for the app and the QA checks: `cb-step`, `cb-pos`,
// `cb-close`, `cb-photo`, `cb-guide`, `cb-mode`, `char-banner`, `char-pill`,
// `cp-*`, `pinned`.
import { cn } from '@/lib/utils';

const DIM = 'text-(--dim)';

/** Icon buttons shrink a little while pressed (Notion V4 Tasks,
 *  "Micro-interaction: a press effect on icon buttons"); none with Reduce
 *  motion. */
export const PRESS = 'transition-[scale,background-color,color,border-color,box-shadow] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100';

/** shadcn's outline Button, as the banner's and module's controls use it. */
export const OUTLINE = cn('inline-flex flex-none cursor-pointer items-center justify-center rounded-md border bg-(--button-outline) p-0 leading-none text-foreground shadow-xs outline-none hover:bg-(--field-hover) focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-(--button-outline) border-(--button-outline-border)', PRESS);

// Desktop: the banner and the guide's module.
export const STEP = 'cb-step inline-flex flex-none items-center gap-1';
export const STEP_BTN = cn(OUTLINE, 'size-[max(34px,2.125rem)] text-title');
export const CLOSE = cn('cb-close', OUTLINE, 'size-[max(34px,2.125rem)] text-title');
export const POS = cn('cb-pos min-w-16 text-center text-caption whitespace-nowrap tabular-nums', DIM);

// Phones: the pill and the guide's dock take borderless circles.
const ROUND = cn('inline-flex flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-foreground outline-none active:bg-foreground/8 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-35', PRESS);
export const PILL_STEP = 'cb-step inline-flex flex-none items-center gap-0';
export const PILL_BTN = cn(ROUND, 'size-[max(38px,2.375rem)] text-title');
/** The pill's close: the bar's end cap, behind a hairline. */
export const PILL_CLOSE = cn('cb-close', ROUND, DIM, 'h-[max(38px,2.375rem)] w-10 rounded-l-none rounded-r-full border-l border-solid border-border text-title');
/** The dock's close: a circle like the stepper's. */
export const DOCK_CLOSE = cn('cb-close', ROUND, DIM, 'size-[max(38px,2.375rem)] text-title');
export const PILL_POS = 'cb-pos min-w-[42px] text-center text-label whitespace-nowrap tabular-nums text-foreground';

// The floating progress card (Andre, 2026-11-16): the All titles card and an
// open guide's card share one compact layout, on desktop (top right) and
// phones (docked at the bottom), at two sizes. One row: the next title's
// poster, "Before Doomsday · 3/5" over its name (a tap opens its details,
// where it is marked seen: no ✓ in the card) and a small × in the corner.
// Under it, the progress with, for a guide, ‹ › together at its right end;
// the stop the stepper is on keeps its gray outline.
export const WIDGET = 'rounded-lg border border-border bg-background/95 pt-2.5 pr-2 pb-2 pl-2.5 text-foreground shadow-sm backdrop-blur-md';
export const W_ROW = 'w-row flex min-w-0 items-center gap-2.5';
export const W_OPEN = 'w-open flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
export const W_POSTER = 'h-[54px] w-9 flex-[0_0_36px] rounded-[5px] in-[.app.touch]:h-12 in-[.app.touch]:w-8 in-[.app.touch]:basis-8 in-[.app.touch]:rounded-[4px]';
export const W_TEXT = 'flex min-w-0 flex-1 flex-col gap-px text-left';
export const W_KICKER = 'truncate text-label font-medium text-muted-foreground';
export const W_TITLE = 'truncate text-body font-semibold text-foreground';
/** The small × in the top-right corner, with a 40px touch area around it. */
export const W_CLOSE = cn('cb-close', ROUND, DIM, "relative -mt-1 -mr-0.5 size-7 flex-none self-start text-heading after:absolute after:-inset-1.5 after:content-['']");
export const W_FOOT = 'w-foot mt-2 flex items-center gap-2';
/** ‹ ›, side by side at the end of the progress. */
export const W_STEP = 'cb-step -my-1.5 -mr-0.5 inline-flex flex-none items-center gap-0.5';
export const W_STEP_BTN = cn(ROUND, "relative size-7 text-title after:absolute after:-inset-1.5 after:content-['']");
export const W_BAR = 'h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-(--progress-track)';

/** The character's face, ringed in the character's colour. */
export const PHOTO = 'cb-photo inline-flex flex-none items-center justify-center overflow-hidden rounded-full text-label font-bold text-(--on-image-base) shadow-[0_0_0_2px_var(--char-color,var(--brand))] [&_img]:block [&_img]:size-full [&_img]:object-cover';

/** A segmented group of plain buttons (`on` marks the chosen one) in the tab
 *  list's look; with a SegPill as its first child the pill carries the
 *  chosen look and slides. */
export const SEGMENTED = 'segmented relative inline-flex flex-none items-stretch rounded-lg bg-muted p-[3px]';
export const SEGMENT = 'relative z-1 flex cursor-pointer items-center rounded-md px-[13px] text-body font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&.on]:text-foreground';

// The pinned character's banner under the toolbar (desktop). It stops before
// the open drawer, so the bar looks the same whether the character is hovered
// or pinned.
export const BANNER = 'char-banner flex flex-wrap items-center gap-3 border-b bg-muted/50 px-(--grid-margin) py-2 text-body shadow-[inset_3px_0_0_var(--char-color,var(--brand))] in-[.app:not(.touch).drawer-open]:pr-[calc(var(--drawer-w)+var(--grid-margin))]';
export const BANNER_WHO = 'cb-who mr-auto flex min-w-0 flex-col [&_b]:truncate [&_b]:text-heading [&_b]:font-medium [&_b]:text-foreground';
export const BANNER_SUB = 'cb-sub truncate text-caption text-muted-foreground';
export const BANNER_GUIDE = cn('cb-guide', OUTLINE, 'h-[max(34px,2.125rem)] gap-[7px] px-3 text-body whitespace-nowrap');

// The pinned character on phones: a pill floating above the bottom bar. With
// Share in it, the name gets back what
// Share costs: more width, a smaller photo, tighter gaps.
export const PILL = 'char-pill absolute bottom-3 left-1/2 z-45 flex w-[min(420px,calc(100%-24px))] -translate-x-1/2 animate-[mrise_220ms_cubic-bezier(.2,.8,.2,1)] flex-col gap-2 motion-reduce:animate-none has-[.cb-share]:w-[min(420px,calc(100%-16px))]';
// The widgets' radius and shadow (WIDGET above; Andre, 2026-11-16) until the
// pinned character gets its own pass (Notion "Connections with a character
// pinned: the banner and selected card").
export const PILL_BAR = 'cp-bar group/pill flex items-center gap-1 data-[fit=1]:gap-0.5 data-[fit=2]:gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-sm backdrop-blur-md';
export const PILL_WHO = 'cp-who flex min-w-0 flex-auto items-center gap-[9px] pr-1 in-[.char-pill:has(.cb-share)]:gap-[7px] in-[.char-pill:has(.cb-share)]:pr-0 group-data-[fit=1]/pill:gap-[5px] group-data-[fit=2]/pill:gap-[5px]';
export const PILL_PHOTO = cn(PHOTO, 'size-[38px] in-[.char-pill:has(.cb-share)]:size-[34px] group-data-[fit=1]/pill:size-[30px] group-data-[fit=2]/pill:size-[30px]');
// The name fits by measuring (fitCharPill in app.tsx): tighter gaps and a
// smaller photo first (data-fit 1), then two lines (2), never cut short.
export const PILL_NAME = 'cp-name truncate text-body font-medium text-foreground group-data-[fit=2]/pill:line-clamp-2 group-data-[fit=2]/pill:whitespace-normal';
export const PILL_ACTOR = 'cp-actor truncate text-caption text-muted-foreground';
export const PILL_GUIDE = cn('cp-guide', ROUND, 'size-[max(38px,2.375rem)] bg-(--brand-tint-strong) active:bg-(--brand-tint-strong)');
/** Share in the pill: the stepper's borderless circle. */
export const PILL_SHARE = 'cb-share size-[max(38px,2.375rem)] rounded-full border-0 bg-transparent shadow-none active:bg-foreground/8 dark:bg-transparent';
export const BANNER_SHARE = 'cb-share size-[max(32px,2rem)]';
export const PILL_TEXT = 'cp-text flex min-w-0 flex-col leading-[1.2]';
