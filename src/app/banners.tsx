// The pieces the floating progress cards share: All titles (upnext.tsx), an
// open guide's card and dock (guides-ui.tsx) and the pinned character's card
// (char-card.tsx): the card, its row and foot, the stepper, the close button
// and the character photo (Notion "shadcn pass 6", and "Connections with a
// character pinned", 2026-11-18, which retired the character's banner and
// pill). Class recipes only: the markup stays with each surface. This file is
// listed with `@source` in src/index.css, so the recipes are generated from
// here wherever they are used.
//
// Hook classes kept for the app and the QA checks: `cb-step`, `cb-pos`,
// `cb-close`, `cb-photo`, `cb-more`, `char-pill` (the guide's dock).
import { cn } from '@/lib/utils';

const DIM = 'text-(--dim)';

/** Icon buttons shrink a little while pressed (Notion V4 Tasks,
 *  "Micro-interaction: a press effect on icon buttons"); none with Reduce
 *  motion. */
export const PRESS = 'transition-[scale,background-color,color,border-color,box-shadow] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100';

/** shadcn's outline Button, as the banner's and module's controls use it. */
export const OUTLINE = cn('inline-flex flex-none cursor-pointer items-center justify-center rounded-md border bg-(--button-outline) p-0 leading-none text-foreground shadow-xs outline-none hover:bg-(--field-hover) focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-(--button-outline) border-(--button-outline-border)', PRESS);

// Desktop: the guide's module in Titles.
export const STEP = 'cb-step inline-flex flex-none items-center gap-1';
export const STEP_BTN = cn(OUTLINE, 'size-[max(34px,2.125rem)] text-title');
export const CLOSE = cn('cb-close', OUTLINE, 'size-[max(34px,2.125rem)] text-title');
export const POS = cn('cb-pos min-w-16 text-center text-caption whitespace-nowrap tabular-nums', DIM);

// Phones and the floating cards take borderless circles.
const ROUND = cn('inline-flex flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 leading-none text-foreground outline-none active:bg-foreground/8 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-35', PRESS);
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
/** ⋯ beside it (the pinned character's card), the same circle. */
export const W_MORE = cn('cb-more', ROUND, DIM, "relative -mt-1 size-7 flex-none self-start text-heading after:absolute after:-inset-1.5 after:content-[''] data-popup-open:bg-foreground/8");
export const W_FOOT = 'w-foot mt-2 flex items-center gap-2';
/** ‹ ›, side by side at the end of the progress. */
export const W_STEP = 'cb-step -my-1.5 -mr-0.5 inline-flex flex-none items-center gap-0.5';
export const W_STEP_BTN = cn(ROUND, "relative size-7 text-title after:absolute after:-inset-1.5 after:content-['']");
export const W_BAR = 'h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-(--progress-track)';
/** A stepper's dashes (the character's and a guide's cards): the row, and
 *  each dash as a press target that jumps straight to its title (Notion
 *  "Steppers: tap a dash to jump to that title", Andre, 2026-11-18). The
 *  target is 16px tall around the 4px dash; hovering one outlines it as the
 *  current one is, more faintly, and names the title. Out of the tab order
 *  and hidden from screen readers: ‹ › and the meter's label do that job. */
export const W_SEGS = 'flex h-1 items-center gap-[3px]';
export const W_SEG = 'w-seg group/seg flex h-4 min-w-0 flex-1 cursor-pointer items-center outline-none';
export const W_SEG_BAR = 'block h-1 w-full rounded-[2px] transition-[background-color] duration-[260ms] motion-reduce:transition-none group-hover/seg:outline-1 group-hover/seg:outline-offset-2 group-hover/seg:outline-muted-foreground/40';

/** The character's face, ringed in the character's colour. */
export const PHOTO = 'cb-photo inline-flex flex-none items-center justify-center overflow-hidden rounded-full text-label font-bold text-(--on-image-base) shadow-[0_0_0_2px_var(--char-color,var(--brand))] [&_img]:block [&_img]:size-full [&_img]:object-cover';

// The guide's dock on phones (GuidePill): it floats above the bottom bar.
export const PILL = 'char-pill absolute bottom-3 left-1/2 z-45 flex w-[min(420px,calc(100%-24px))] -translate-x-1/2 animate-[mrise_220ms_cubic-bezier(.2,.8,.2,1)] flex-col gap-2 motion-reduce:animate-none has-[.cb-share]:w-[min(420px,calc(100%-16px))]';
