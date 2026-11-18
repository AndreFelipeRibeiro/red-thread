import React from 'react';
import { cn } from '@/lib/utils';

// Keyboard shortcuts (Notion "Keyboard shortcuts for sections, views, sorts
// and status, with a visible shortcut list", 2026-11-18). The keys are
// handled in app.tsx, next to D and L; this file holds the switch that turns
// them off, the map, and the list ? opens.
//
// - Single keys never fire while typing, in a menu or a dialog, or with a
//   modifier held (browser and screen-reader keys keep working).
// - WCAG 2.1.4: single-character shortcuts can be turned off (Settings →
//   Keyboard shortcuts). Off, none of them fire, D, L and / included; Escape
//   and the arrow keys on Connections are not single-character shortcuts and
//   stay.

const KEY = 'mcu.keys.v1';
const listeners = new Set<() => void>();
export const MCU_KEYS = {
  enabled: () => { try { return window.localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } },
  set: (on: boolean) => {
    try { if (on) window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, 'off'); } catch (e) { /* this visit only */ }
    listeners.forEach((f) => f());
  },
  subscribe: (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; },
};
export function useKeysEnabled() {
  const [on, setOn] = React.useState(MCU_KEYS.enabled());
  React.useEffect(() => MCU_KEYS.subscribe(() => setOn(MCU_KEYS.enabled())), []);
  return on;
}

/** The single keys and what they do (app.tsx reads the same map). */
export const SORT_BY_KEY: Record<string, string> = { r: 'release', c: 'chrono', p: 'phase', a: 'title', i: 'imdb', t: 'rt' };
export const SECTION_BY_KEY: Record<string, string> = { '1': 'explore', '2': 'mylist', '3': 'guides' };
export const STATUS_BY_KEY: Record<string, string> = { u: 'unseen', s: 'seen', w: 'watchlist', '0': 'all' };

/** True when a key press belongs to something else: a field, a menu, a
 *  dialog, or a modifier. */
export function keyIsTaken(e: KeyboardEvent): boolean {
  if (e.altKey || e.metaKey || e.ctrlKey || e.repeat || e.defaultPrevented) return true;
  const el = e.target;
  if (el instanceof Element && el.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"]')) return true;
  return !!document.querySelector('[aria-modal="true"]');
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 bg-muted px-1.5 font-sans text-label font-medium text-foreground">{children}</kbd>;
}

/** The list ? opens: every key by group, in a dialog. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { tr } = window.useI18n();
  const ModalDialog = window.ModalDialog;
  const on = useKeysEnabled();
  const groups: [string, [React.ReactNode, string][]][] = [
    [tr('keys.sections'), [['1', tr('nav.explore')], ['2', tr('nav.mylist')], ['3', tr('nav.guides')]]],
    [tr('keys.sort'), Object.entries(SORT_BY_KEY).map(([k, s]) => [k.toUpperCase(), tr('sortmenu.name.' + s)])],
    [tr('keys.show'), Object.entries(STATUS_BY_KEY).map(([k, s]) => [k.toUpperCase(), tr(s === 'all' ? 'keys.all' : 'collection.' + s)])],
    [tr('keys.tools'), [['/', tr('keys.search')], ['F', tr('filters.title')], ['?', tr('keys.list')], [tr('keys.esc'), tr('keys.escText')]]],
    [tr('keys.canvas'), [[<>←&nbsp;→</>, tr('keys.step')]]],
    [tr('keys.theme'), [['D', tr('theme.dark')], ['L', tr('theme.light')]]],
  ];
  return (
    <ModalDialog onClose={onClose} labelledBy="keys-title" className="keys-dialog w-[min(620px,calc(100vw-48px))]">
      <div className="about text-body text-foreground">
        <h2 id="keys-title" className="about-title pr-10 text-title leading-tight font-semibold tracking-tight">{tr('keys.title')}</h2>
        <p className="mt-1.5 text-label text-muted-foreground">{on ? tr('keys.lead') : tr('keys.off')}</p>
        <div className="keys-groups mt-5 grid grid-cols-2 gap-x-8 gap-y-5 max-[560px]:grid-cols-1">
          {groups.map(([title, rows]) => (
            <section key={title} className="min-w-0">
              <h3 className="mb-2 text-label font-medium text-muted-foreground">{title}</h3>
              <dl className="flex flex-col gap-1.5">
                {rows.map(([k, label], i) => (
                  <div key={i} className={cn('flex items-center justify-between gap-3', !on && 'opacity-60')}>
                    <dt className="min-w-0 text-pretty">{label}</dt>
                    <dd className="flex-none"><Kbd>{k}</Kbd></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="mt-5 text-label text-muted-foreground">{tr('keys.flip')}</p>
      </div>
    </ModalDialog>
  );
}

Object.assign(window, { MCU_KEYS });
