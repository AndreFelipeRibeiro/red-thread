// The sliding selection in a segmented group (Notion V4 Tasks, "Interface
// animation: sliding selection in the segmented controls").
//
// Put <SegPill value={…}/> as the first child of a group of buttons (sort,
// type, collection, view…). It draws the selected look as one pill behind the
// buttons and moves it to whichever button is selected (`.on`), so choosing
// another item slides the pill across instead of switching it on and off.
//
// - It measures the real button, so it fits every language, Text size and
//   compact step (useFitSteps) without knowing about any of them.
// - It slides only when `value` changes. The first placement, a resize, a font
//   load or a label that grows or shrinks put it in place at once.
// - Reduce motion (Settings or the system): it moves without sliding.
// - With no selected button (a group that has none on), it hides.
// The stylesheets hide each selected button's own background while a pill is
// present (`:has(> .seg-pill)`), so without this component a group looks as
// it always did.
import React, { useLayoutEffect, useRef } from 'react';

export function SegPill({ value }: { value: unknown }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const placed = useRef(false);
  const slidAt = useRef(0);

  const place = (slide: boolean) => {
    const pill = ref.current;
    const box = pill && pill.parentElement;
    if (!pill || !box) return;
    const on = box.querySelector<HTMLElement>(':scope > button.on');
    if (!on || !on.offsetWidth) { pill.style.opacity = '0'; placed.current = false; return; }
    const reduced = !!(window.MCU_MOTION && window.MCU_MOTION.reduced());
    const instant = !slide || !placed.current || reduced;
    pill.classList.toggle('instant', instant);
    if (instant) void pill.offsetWidth; // apply "no transition" before moving
    pill.style.width = on.offsetWidth + 'px';
    pill.style.height = on.offsetHeight + 'px';
    pill.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
    pill.style.opacity = '1';
    placed.current = true;
  };

  // A new selection: slide to it.
  useLayoutEffect(() => { if (placed.current) slidAt.current = Date.now(); place(true); }, [value]);

  // Anything that changes a button's size or place: follow at once.
  useLayoutEffect(() => {
    const box = ref.current && ref.current.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    // Some groups resize their buttons as the selection changes (the compact
    // toolbar shows only the selected label): those resizes keep sliding.
    const ro = new ResizeObserver(() => place(Date.now() - slidAt.current < 400));
    ro.observe(box);
    box.querySelectorAll(':scope > button').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, []);

  return <span ref={ref} aria-hidden="true"
    className="seg-pill instant pointer-events-none absolute top-0 left-0 z-0 rounded-md border border-transparent bg-background opacity-0 shadow-sm transition-[transform,width,height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none dark:border-input dark:bg-input/30 [&.instant]:transition-none"/>;
}

Object.assign(window, { SegPill });
