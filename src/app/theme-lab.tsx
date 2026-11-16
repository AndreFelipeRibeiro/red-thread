// Theme lab (Notion "Theme lab: a dev-only panel to try visual directions on
// the real app"): a small panel that swaps theme presets live on the real
// screens, so directions can be judged with real posters, on the phone, before
// anything is drawn in Figma.
//
// - Shown only in development and on Vercel previews (*.vercel.app), never on
//   redthread.tv. QA can force it with window.__THEME_LAB before load.
// - Presets: the app's own look (Default), Editorial (from the V5 navigation
//   hi-fi screens, values copied from the ticket) and Studio (a cooler
//   direction to react to). A tweakcn or shadcn create export pasted into the
//   panel becomes one more preset (Custom).
// - Knobs on top of a preset: the body and display typefaces, the corner
//   radius and the density (the spacing unit every control is built from).
// - The choice is kept on this device (localStorage) and applied before the
//   panel is opened, on every visit.
// - No button (Notion "Theme lab: hide the button; open it with T"): T opens
//   and closes the panel on a keyboard, Esc closes it; on a phone, a long
//   press on the Red Thread wordmark (about a second) or `?lab` in the address
//   opens it. It starts closed on every load. T is temporary: the keyboard
//   shortcuts ticket wants T for the RT sort; the lab moves (Shift+T, say)
//   when that lands.
//
// It works by writing the shadcn variables (--background, --primary…,
// --radius, --spacing, --font-sans) into one <style> element that outranks
// src/index.css. Nothing else in the app knows it exists.
//
// Hooks: `theme-lab`, `data-tl` on each control.
import React from 'react';
import { Button } from '@/components/ui/button';

type Vars = Record<string, string>;
interface Preset { label: string; light: Vars; dark: Vars; sans?: string; display?: string; radius?: number; }
export interface LabState { preset: string; sans: string; display: string; radius: number | null; density: number; custom: { light: Vars; dark: Vars } | null; }

const KEY = 'mcu.themeLab.v1';
const STYLE_ID = 'theme-lab-style';
const FONT_LINK_ID = 'theme-lab-fonts';

/** Development, a Vercel preview, or forced by QA. */
export function labEnabled(): boolean {
  try {
    if ((window as unknown as { __THEME_LAB?: boolean }).__THEME_LAB === true) return true;
    if (import.meta.env.DEV) return true;
    return /\.vercel\.app$/.test(window.location.hostname);
  } catch (e) { return false; }
}

// Both themes take the same keys; a key set for one and not the other keeps
// the app's value there.
const ed = (bg: string, card: string, pop: string, subtle: string, border: string, fg: string, muted: string, ring: string, p1: string, p2: string): Vars => ({
  '--background': bg, '--card': card, '--popover': pop,
  '--muted': subtle, '--secondary': subtle, '--accent': subtle,
  '--border': border, '--input': border,
  '--foreground': fg, '--card-foreground': fg, '--popover-foreground': fg, '--secondary-foreground': fg, '--accent-foreground': fg,
  '--muted-foreground': muted,
  '--primary': '#C42B2F', '--primary-foreground': '#FFFFFF', '--ring': ring,
  '--phase-1': p1, '--phase-2': p2,
});

export const PRESETS: Record<string, Preset> = {
  default: { label: 'Default', light: {}, dark: {} },
  // Notion ticket, "Starter preset: Editorial": near-black or warm paper
  // grounds, red as the only accent, Instrument Serif for display type.
  editorial: {
    label: 'Editorial',
    dark: ed('#0B0B0C', '#141416', '#18181B', '#232327', '#26262A', '#F2F2F3', '#A1A1AA', '#F04A4F', '#D9A441', '#7AA2F7'),
    light: ed('#F6F5F2', '#FFFFFF', '#FFFFFF', '#ECEBE7', '#E3E1DC', '#141413', '#5F5E5A', '#D9363C', '#8A5D0B', '#2F5BC4'),
    sans: 'Inter', display: 'Instrument Serif', radius: 0.625,
  },
  // A second direction to react to: cool slate grounds, an electric blue
  // accent, a geometric display face and rounder corners.
  studio: {
    label: 'Studio',
    dark: {
      '--background': '#0E1116', '--card': '#151A21', '--popover': '#1A2029',
      '--muted': '#1F2630', '--secondary': '#1F2630', '--accent': '#1F2630',
      '--border': '#2A323D', '--input': '#2A323D',
      '--foreground': '#E6EDF3', '--card-foreground': '#E6EDF3', '--popover-foreground': '#E6EDF3', '--secondary-foreground': '#E6EDF3', '--accent-foreground': '#E6EDF3',
      '--muted-foreground': '#9AA7B4', '--primary': '#4F8CFF', '--primary-foreground': '#0B1220', '--ring': '#4F8CFF',
    },
    light: {
      '--background': '#F7F9FC', '--card': '#FFFFFF', '--popover': '#FFFFFF',
      '--muted': '#EEF2F7', '--secondary': '#EEF2F7', '--accent': '#EEF2F7',
      '--border': '#DCE3EC', '--input': '#DCE3EC',
      '--foreground': '#0F1722', '--card-foreground': '#0F1722', '--popover-foreground': '#0F1722', '--secondary-foreground': '#0F1722', '--accent-foreground': '#0F1722',
      '--muted-foreground': '#556274', '--primary': '#2563EB', '--primary-foreground': '#FFFFFF', '--ring': '#2563EB',
    },
    sans: 'DM Sans', display: 'Space Grotesk', radius: 0.875,
  },
};

// Typefaces: Inter is bundled with the app; the rest come from Google Fonts,
// loaded only while the lab uses them.
export const SANS = ['Inter', 'DM Sans', 'IBM Plex Sans', 'System'];
export const DISPLAY = ['None', 'Instrument Serif', 'Space Grotesk', 'Fraunces'];
const GOOGLE: Record<string, string> = {
  'DM Sans': 'DM+Sans:wght@400;500;600;700', 'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700',
  'Instrument Serif': 'Instrument+Serif', 'Space Grotesk': 'Space+Grotesk:wght@500;600;700', Fraunces: 'Fraunces:opsz,wght@9..144,500;9..144,600',
};
const STACK: Record<string, string> = {
  Inter: "'Inter Variable', sans-serif", System: 'system-ui, -apple-system, sans-serif',
  'DM Sans': "'DM Sans', sans-serif", 'IBM Plex Sans': "'IBM Plex Sans', sans-serif",
  'Instrument Serif': "'Instrument Serif', Georgia, serif", 'Space Grotesk': "'Space Grotesk', sans-serif", Fraunces: "'Fraunces', Georgia, serif",
};
// Where display type goes: page titles, the details' title, Up next's title
// (the Editorial spec: display type for titles only, Inter everywhere else).
const DISPLAY_TARGETS = '.ml-title, #g-page-title, .drawer-title, .m-dtitle, .un-title, .g-hero-title';

export const DEFAULT_STATE: LabState = { preset: 'default', sans: 'Inter', display: 'None', radius: null, density: 1, custom: null };

export function readLab(): LabState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULT_STATE, ...v };
  } catch (e) { /* storage blocked: the default look */ }
  return { ...DEFAULT_STATE };
}
function saveLab(s: LabState) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* this visit only */ } }

const block = (sel: string, vars: Vars) => {
  const body = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return body ? `${sel} {\n${body}\n}\n` : '';
};

// The app's accent has two roles (src/index.css): --primary fills buttons,
// --brand draws lines and fills (progress, the Up next edge, the guide
// route). A preset or a pasted theme names only shadcn's --primary and
// --ring, so its accent reaches the lines too through --brand: the ring's
// color (a line color already), else the primary.
const withAccent = (vars: Vars): Vars =>
  vars['--primary'] && !vars['--brand'] ? { ...vars, '--brand': vars['--ring'] || vars['--primary'] } : vars;

/** The CSS for a lab state: an empty string for the app's own look. */
export function labCSS(s: LabState): string {
  const p = s.preset === 'custom' && s.custom ? { label: 'Custom', light: s.custom.light, dark: s.custom.dark } as Preset : (PRESETS[s.preset] || PRESETS.default);
  const root: Vars = withAccent({ ...p.light });
  const radius = s.radius != null ? s.radius : p.radius;
  if (radius != null) root['--radius'] = radius + 'rem';
  if (s.density !== 1) root['--spacing'] = `calc(max(0.25rem, 4px) * ${s.density})`;
  if (s.sans && s.sans !== 'Inter') root['--font-sans'] = STACK[s.sans];
  // The display choice also sets the token the poster fallback reads.
  if (s.display && s.display !== 'None') root['--font-display'] = STACK[s.display];
  let css = block('html:root', root) + block('html.dark', withAccent({ ...p.dark }));
  if (s.display && s.display !== 'None') {
    css += `${DISPLAY_TARGETS} { font-family: ${STACK[s.display]}; font-weight: 400; letter-spacing: -0.01em; }\n`;
  }
  return css;
}

function applyLab(s: LabState) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  const css = labCSS(s);
  if (!css) { if (el) el.remove(); }
  else {
    if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
    el.textContent = css;
  }
  const fonts = [s.sans, s.display].filter((f) => GOOGLE[f]);
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!fonts.length) { if (link) link.remove(); return; }
  const href = 'https://fonts.googleapis.com/css2?' + fonts.map((f) => 'family=' + GOOGLE[f]).join('&') + '&display=swap';
  if (!link) { link = document.createElement('link'); link.id = FONT_LINK_ID; link.rel = 'stylesheet'; document.head.appendChild(link); }
  if (link.href !== href) link.href = href;
}

/** A tweakcn / shadcn create export: `:root { --x: v; … }` and `.dark { … }`. */
export function parseExport(text: string): { light: Vars; dark: Vars } | null {
  const grab = (sel: RegExp) => {
    const m = text.match(sel);
    if (!m) return {};
    const out: Vars = {};
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
    return out;
  };
  const light = grab(/:root\s*\{([^}]*)\}/), dark = grab(/\.dark\s*\{([^}]*)\}/);
  return Object.keys(light).length || Object.keys(dark).length ? { light, dark } : null;
}

// Where typing a T means a T, not the lab (the same list as the D / L theme
// shortcut in app.tsx); the lab's own panel is the exception, so T closes it.
const TYPING = 'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"]';
const WORDMARK = '.m-brandrow, .brand-title';
const LONG_PRESS_MS = 900;
// How the panel was last opened: only the keyboard moves focus into it.
let openedBy: 'key' | 'other' = 'other';

/** T, Esc, the wordmark's long press and `?lab`: how the panel opens. */
function useLabOpeners(enabled: boolean, open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>) {
  React.useEffect(() => {
    if (!enabled) return;
    try { if (new URLSearchParams(window.location.search).has('lab')) { openedBy = 'other'; setOpen(true); } } catch (e) { /* no address */ }
  }, [enabled]);
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.repeat) return;
      const el = e.target instanceof Element ? e.target : null;
      const inLab = !!(el && el.closest('.theme-lab'));
      if (e.key === 'Escape' && open && (inLab || !document.querySelector('[aria-modal="true"]'))) {
        // The lab is the top layer while it is open: Esc closes it and nothing else.
        e.preventDefault(); e.stopImmediatePropagation(); setOpen(false); return;
      }
      if ((e.key || '').toLowerCase() !== 't' || e.shiftKey || e.defaultPrevented) return;
      if (el && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!inLab && ((el && el.closest(TYPING)) || document.querySelector('[aria-modal="true"]'))) return;
      e.preventDefault(); openedBy = 'key'; setOpen((o) => !o);
    };
    // Capture, so Esc reaches the lab before the app's own Escape ladder.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled, open]);
  React.useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined, fired = false, start: { x: number; y: number } | null = null;
    const cancel = () => { clearTimeout(timer); start = null; };
    const onDown = (e: PointerEvent) => {
      const mark = e.target instanceof Element ? e.target.closest<HTMLElement>(WORDMARK) : null;
      if (!mark) return;
      // No iOS link callout or Android context menu on the long press.
      mark.style.setProperty('-webkit-touch-callout', 'none');
      fired = false; start = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => { fired = true; start = null; openedBy = 'other'; setOpen(true); }, LONG_PRESS_MS);
    };
    const onMove = (e: PointerEvent) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel(); };
    // The press that opened the lab is not also a tap on the home link.
    const onClick = (e: MouseEvent) => { if (fired) { fired = false; e.preventDefault(); e.stopImmediatePropagation(); } };
    const onMenu = (e: Event) => { if (fired || start) e.preventDefault(); };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', cancel, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('contextmenu', onMenu, true);
    return () => {
      cancel();
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', cancel, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('contextmenu', onMenu, true);
    };
  }, [enabled]);
}

const FIELD = 'flex flex-col gap-1.5 text-label font-medium text-muted-foreground';
const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-body text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function ThemeLab() {
  const [enabled] = React.useState(labEnabled);
  const [state, setState] = React.useState<LabState>(readLab);
  const [open, setOpen] = React.useState(false);
  const [paste, setPaste] = React.useState('');
  const [pasteError, setPasteError] = React.useState('');
  React.useEffect(() => { if (enabled) { applyLab(state); saveLab(state); } }, [enabled, state]);
  useLabOpeners(enabled, open, setOpen);
  // Opened from the keyboard, the panel takes focus; closed, focus goes back.
  const panel = React.useRef<HTMLDivElement | null>(null);
  const opener = React.useRef<Element | null>(null);
  React.useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      const first = panel.current && panel.current.querySelector<HTMLElement>('[data-tl="preset"]');
      if (first && openedBy === 'key') first.focus();
    } else if (opener.current instanceof HTMLElement && opener.current.isConnected && (!document.activeElement || document.activeElement === document.body)) {
      opener.current.focus({ preventScroll: true });
    }
  }, [open]);
  if (!enabled || !open) return null;
  const set = (patch: Partial<LabState>) => setState((s) => ({ ...s, ...patch }));
  const presetKeys = [...Object.keys(PRESETS), ...(state.custom ? ['custom'] : [])];
  const radius = state.radius != null ? state.radius : (PRESETS[state.preset] && PRESETS[state.preset].radius) || 0.625;
  return (
    <div className="theme-lab-root fixed bottom-4 left-4 z-90 flex flex-col items-start gap-2 in-[.app.touch]:bottom-[calc(76px+env(safe-area-inset-bottom,0px))] in-[.app.touch]:left-2">
      <div ref={panel} className="theme-lab w-[300px] max-w-[calc(100vw-16px)] rounded-xl border bg-popover p-3.5 text-popover-foreground shadow-lg" role="dialog" aria-label="Theme lab">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-body font-semibold">Theme lab <span className="ml-1 rounded-sm border px-1 text-caption font-medium text-muted-foreground uppercase">dev</span> <span className="ml-1 text-label font-normal text-muted-foreground in-[.app.touch]:hidden">T or Esc to close</span></div>
          <Button variant="ghost" size="icon-sm" className="text-title text-muted-foreground" aria-label="Close the theme lab" onClick={() => setOpen(false)}>×</Button>
        </div>
        <div className="flex flex-col gap-3">
          <label className={FIELD}>Preset
            <select data-tl="preset" className={SELECT} value={state.preset}
              onChange={(e) => { const k = e.target.value; const p = PRESETS[k]; set({ preset: k, sans: (p && p.sans) || 'Inter', display: (p && p.display) || 'None', radius: null }); }}>
              {presetKeys.map((k) => <option key={k} value={k}>{k === 'custom' ? 'Custom (pasted)' : PRESETS[k].label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={FIELD}>Body type
              <select data-tl="sans" className={SELECT} value={state.sans} onChange={(e) => set({ sans: e.target.value })}>
                {SANS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label className={FIELD}>Display type
              <select data-tl="display" className={SELECT} value={state.display} onChange={(e) => set({ display: e.target.value })}>
                {DISPLAY.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
          </div>
          <label className={FIELD}>Corners: {Math.round(radius * 16)}px
            <input data-tl="radius" type="range" min="0" max="1.25" step="0.0625" value={radius} onChange={(e) => set({ radius: Number(e.target.value) })}/>
          </label>
          <label className={FIELD}>Density
            <select data-tl="density" className={SELECT} value={String(state.density)} onChange={(e) => set({ density: Number(e.target.value) })}>
              <option value="0.875">Compact</option><option value="1">Default</option><option value="1.125">Comfortable</option>
            </select>
          </label>
          <details className="text-label">
            <summary className="cursor-pointer font-medium text-muted-foreground">Paste a tweakcn / shadcn theme</summary>
            <textarea data-tl="paste" className="mt-2 h-24 w-full rounded-md border border-input bg-background p-2 font-mono text-caption text-foreground outline-none" value={paste}
              placeholder={':root { --background: …; }\n.dark { … }'} onChange={(e) => setPaste(e.target.value)}/>
            <div className="mt-1.5 flex items-center gap-2">
              <Button size="sm" variant="outline" data-tl="paste-apply" onClick={() => {
                const c = parseExport(paste);
                if (!c) { setPasteError('No :root or .dark variables found.'); return; }
                setPasteError(''); set({ preset: 'custom', custom: c });
              }}>Use as preset</Button>
              {pasteError && <span className="text-destructive">{pasteError}</span>}
            </div>
          </details>
          <Button variant="ghost" size="sm" data-tl="reset" className="self-start px-0 text-label text-muted-foreground" onClick={() => setState({ ...DEFAULT_STATE, custom: state.custom })}>Back to the app's own look</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ThemeLab });
