import React from 'react';
import { cn } from '@/lib/utils';
import { getChoice as getThemeChoice, setChoice as setThemeChoice, subscribe as subscribeTheme, type ThemeChoice } from '../theme';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronRightIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import pkg from '../../package.json';
import type { Lang } from '../types/catalog';

// Settings (Notion V4 Tasks, "Settings menu"): how the app behaves, apart from
// the account, which is about you and your data. Desktop opens it as a panel
// from the right, in the details drawer's place; phones as a sheet. It is the
// first surface built from the V4 components rather than restyled V3 markup,
// and this file is listed with @source in src/index.css.
//
// The preferences themselves keep their own stores and storage keys, so
// nobody loses a choice made before Settings existed: the theme (src/theme.ts,
// mcu.theme), the language (i18n.js, mcu.lang.v1) and the where-to-watch
// region (watch.tsx, mcu.region.v1). Motion and celebrations are new and live
// here. Signed-in visitors sync all five to the account (PreferencesSync).

// ---------------------------------------------------------------------------
// Motion and celebrations
// ---------------------------------------------------------------------------

type Motion = 'auto' | 'reduced';
const MOTION_KEY = 'mcu.motion.v1';
const CELEBRATIONS_KEY = 'mcu.celebrations.v1';

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch (e) { return null; } };
const write = (key: string, value: string | null) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (e) { /* this visit only */ }
};

let motion: Motion = read(MOTION_KEY) === 'reduced' ? 'reduced' : 'auto';
let celebrations = read(CELEBRATIONS_KEY) !== 'off';
const localListeners = new Set<() => void>();
const emitLocal = () => localListeners.forEach((fn) => fn());

// "Reduced" puts a class on <html>: styles.css shortens every transition and
// animation under it, the same as the system setting does through the
// stylesheets' own prefers-reduced-motion rules.
function applyMotion() { document.documentElement.classList.toggle('reduce-motion', motion === 'reduced'); }
applyMotion();

/** True when motion should be kept to a minimum: the visitor chose Reduced,
 *  or chose Auto and the system asks for reduced motion. Every script that
 *  checked prefers-reduced-motion asks this instead. */
function reducedMotion(): boolean {
  if (motion === 'reduced') return true;
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function setMotion(next: Motion) {
  if (next === motion) return;
  motion = next;
  write(MOTION_KEY, next === 'reduced' ? 'reduced' : null);
  applyMotion();
  emitLocal();
}
// Text size (Notion "Font size increase"): a data attribute on <html> scales
// the root font size, which every size in the type scale follows
// (src/index.css). Kept on this device only (Andre: a phone and a laptop often
// want different sizes), so it is not part of the synced snapshot below and
// has its own listeners. vite.config.js sets it before the first paint.
//
// On an iPhone or iPad, until the visitor picks a size here, it starts from
// the system Text Size (Notion V4 Tasks, "Text size: start from the iPhone's
// system Text Size"). Safari doesn't apply that to web pages, but the WebKit
// system font -apple-system-body follows it: 17px at the iOS default. Its
// steps map by range onto the app's three sizes, nothing above Large:
// 15px or less (xSmall, Small) → Small; 16–17 (Medium, the default) →
// Default; 19 or more (xLarge up, the Accessibility sizes too) → Large.
// Only a choice made here is saved (Default included), so a later change in
// iOS keeps flowing through until then. Everywhere else the root stays at
// the browser's own font size, through rem. vite.config.js holds the one
// copy of this rule that runs before the first paint; keep the two alike.
export type TextSize = 'small' | 'default' | 'large';
const TEXT_SIZE_KEY = 'mcu.textSize.v1';
const readSavedTextSize = (): TextSize | null => {
  const v = read(TEXT_SIZE_KEY);
  // "larger" was a fourth step, dropped before release (Andre): it reads as Large.
  return v === 'small' ? 'small' : v === 'large' || v === 'larger' ? 'large' : v === 'default' ? 'default' : null;
};
/** The size matching the system Text Size on an iPhone or iPad, or null
 *  anywhere else (desktop Safari knows the font too, at macOS sizes). */
function systemTextSize(): TextSize | null {
  try {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!ios || !(window.CSS && CSS.supports('font', '-apple-system-body'))) return null;
    const probe = document.createElement('span');
    probe.setAttribute('data-probe', 'system-body');
    probe.style.cssText = 'position:absolute;visibility:hidden;font:-apple-system-body';
    document.documentElement.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();
    return !px ? null : px <= 15 ? 'small' : px >= 19 ? 'large' : 'default';
  } catch (e) { return null; }
}
let textSaved: TextSize | null = readSavedTextSize();
let textSystem: TextSize | null = systemTextSize();
let textSize: TextSize = textSaved || textSystem || 'default';
const textListeners = new Set<() => void>();
function applyTextSize() {
  const el = document.documentElement;
  if (textSize === 'default') el.removeAttribute('data-text-size');
  else el.setAttribute('data-text-size', textSize);
}
applyTextSize();
function showTextSize(next: TextSize) {
  const changed = next !== textSize;
  textSize = next;
  if (changed) applyTextSize();
  textListeners.forEach((fn) => fn());
  // Layouts that measure their text (the phone collection row) fit again.
  if (changed) window.dispatchEvent(new Event('mcu:textsize'));
}
function setTextSize(next: TextSize) {
  textSaved = next;
  write(TEXT_SIZE_KEY, next);
  showTextSize(next);
}
// Still following iOS: a Text Size changed while the app was in the
// background shows when it comes back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || textSaved) return;
  textSystem = systemTextSize();
  if (textSystem && textSystem !== textSize) showTextSize(textSystem);
});
const subscribeText = (fn: () => void) => { textListeners.add(fn); return () => { textListeners.delete(fn); }; };
const useTextSize = () => React.useSyncExternalStore(subscribeText, () => textSize);
/** True while the size comes from the system Text Size (nothing picked here). */
const useTextSizeFromSystem = () => React.useSyncExternalStore(subscribeText, () => !textSaved && !!textSystem);

function setCelebrations(on: boolean) {
  if (on === celebrations) return;
  celebrations = on;
  write(CELEBRATIONS_KEY, on ? null : 'off');
  emitLocal();
}

// ---------------------------------------------------------------------------
// One snapshot of every synced preference
// ---------------------------------------------------------------------------

export interface Preferences {
  theme: ThemeChoice;
  lang: Lang;
  region: string;
  motion: Motion;
  celebrations: boolean;
  /** Followed guides (Guides 2/4), most recent activity last: [{ id, at }]. */
  guidesFollowed: FollowedGuide[];
}
interface FollowedGuide { id: string; at: number }
interface FollowedStore {
  followedList(): FollowedGuide[];
  setFollowedList(list: unknown): void;
  onFollowed(fn: () => void): () => void;
}
// guides-ui.tsx publishes the store on MCU_GUIDE; read through this narrow
// shape rather than widening GuideRuntime's catch-all.
const followedStore = (): FollowedStore | null => {
  const g = window.MCU_GUIDE as unknown as Partial<FollowedStore> | undefined;
  return g && typeof g.followedList === 'function' ? g as FollowedStore : null;
};

function snapshot(): Preferences {
  return {
    theme: getThemeChoice(),
    lang: window.MCU_I18N.lang,
    region: window.MCU_region.get(),
    motion,
    celebrations,
    guidesFollowed: followedStore()?.followedList() ?? [],
  };
}

/** Applies preferences from the account; anything missing or unknown keeps
 *  this device's value. */
function applyPreferences(p: Partial<Preferences>) {
  if (p.theme === 'light' || p.theme === 'dark' || p.theme === 'system') setThemeChoice(p.theme);
  if (typeof p.lang === 'string' && window.MCU_I18N.languages().some((l) => l.code === p.lang)) window.MCU_I18N.setLang(p.lang);
  if (typeof p.region === 'string' && /^[A-Z]{2}$/.test(p.region)) window.MCU_region.set(p.region);
  if (p.motion === 'auto' || p.motion === 'reduced') setMotion(p.motion);
  if (typeof p.celebrations === 'boolean') setCelebrations(p.celebrations);
  if (Array.isArray(p.guidesFollowed)) followedStore()?.setFollowedList(p.guidesFollowed);
}

// Every change, whichever store it lives in, as one subscription. The
// snapshot is cached by its JSON so useSyncExternalStore sees a stable value.
function subscribeAll(fn: () => void): () => void {
  const offs = [subscribeTheme(fn), window.MCU_I18N.subscribe(fn), window.MCU_region.subscribe(fn)];
  const store = followedStore();
  if (store) offs.push(store.onFollowed(fn));
  localListeners.add(fn);
  return () => { offs.forEach((off) => off()); localListeners.delete(fn); };
}
let cached: Preferences | null = null;
let cachedKey = '';
function currentPreferences(): Preferences {
  const next = snapshot();
  const key = JSON.stringify(next);
  if (key !== cachedKey || !cached) { cached = next; cachedKey = key; }
  return cached;
}
function usePreferences(): Preferences {
  return React.useSyncExternalStore(subscribeAll, currentPreferences);
}

const MCU_PREFS = {
  snapshot, apply: applyPreferences, subscribe: subscribeAll,
  celebrations: () => celebrations, setCelebrations, motion: () => motion, setMotion,
  textSize: () => textSize, setTextSize,
};
const MCU_MOTION = { reduced: reducedMotion };

// ---------------------------------------------------------------------------
// Sync to the account (signed-in visitors only)
// ---------------------------------------------------------------------------
// One row per user in public.user_preferences (schema.sql). Signed out,
// nothing leaves the device. Signing in applies the account's preferences if
// it has any and uploads this device's if it has none, so a first sign-in
// never resets the theme or language. A change saves locally at once and is
// sent in the background; a failure is retried on the next change, when the
// connection comes back, or when the tab is shown again, and never blocks.

const TABLE = 'user_preferences';
const SYNC_TIMEOUT_MS = 5000;
interface SupabaseError { message?: string; code?: string }
interface Result<T> { data: T | null; error: SupabaseError | null }
interface PrefsQuery {
  select(columns: string): PrefsQuery;
  eq(column: string, value: string): PrefsQuery;
  maybeSingle(): PromiseLike<Result<{ prefs: unknown }>>;
  upsert(row: Record<string, unknown>, options: { onConflict: string }): PromiseLike<Result<unknown>>;
}
interface PrefsClient { from(table: string): PrefsQuery }

function withTimeout<T>(p: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), SYNC_TIMEOUT_MS); }),
  ]).finally(() => clearTimeout(timer));
}

// The table is added by a migration the maintainer runs in Supabase; until
// then the request fails with "relation does not exist" (Postgres 42P01) or
// PostgREST's "table not in the schema cache" (PGRST205). Preferences then
// stay on the device for this visit, quietly, rather than retrying forever.
const missingTable = (e: SupabaseError | null) => !!e && (e.code === '42P01' || e.code === 'PGRST205');

interface AuthValue { status?: string; user?: { id: string } | null }
const NoAuth = React.createContext<AuthValue | null>(null);

function PreferencesSync() {
  const auth = React.useContext((window.MCU_AUTH_CONTEXT as React.Context<AuthValue | null> | undefined) || NoAuth);
  const userId = auth && auth.status === 'signed_in' && auth.user ? auth.user.id : null;
  const client = window.mcuSupabase as PrefsClient | null;

  React.useEffect(() => {
    if (!client || !userId) return undefined;
    let live = true;
    let ready = false;
    let applying = false;
    let dirty = false;
    let sending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const upload = async () => {
      if (!live || !ready || sending) return;
      sending = true; dirty = false;
      try {
        const { error } = await withTimeout(client.from(TABLE)
          .upsert({ user_id: userId, prefs: snapshot() }, { onConflict: 'user_id' }));
        if (error) throw error;
      } catch (e) {
        if (missingTable(e as SupabaseError)) { ready = false; return; }
        dirty = true;
        console.warn('[mcu] could not sync preferences; will retry', e);
      } finally {
        sending = false;
      }
    };
    const schedule = () => {
      if (applying || !ready) return;
      clearTimeout(timer);
      timer = setTimeout(upload, 600);
    };
    const retry = () => { if (dirty) upload(); };
    const off = subscribeAll(schedule);
    window.addEventListener('online', retry);
    const onShow = () => { if (document.visibilityState === 'visible') retry(); };
    document.addEventListener('visibilitychange', onShow);

    (async () => {
      try {
        const { data, error } = await withTimeout(client.from(TABLE).select('prefs').eq('user_id', userId).maybeSingle());
        if (!live) return;
        if (error) {
          if (missingTable(error)) { console.info('[mcu] preferences stay on this device: the user_preferences table is not set up yet (schema.sql)'); return; }
          throw error;
        }
        ready = true;
        const remote = data && data.prefs && typeof data.prefs === 'object' ? data.prefs as Partial<Preferences> : null;
        if (remote) {
          applying = true;
          try { applyPreferences(remote); } finally { applying = false; }
        } else {
          await upload();
        }
      } catch (e) {
        if (!live) return;
        // Couldn't reach the account: keep this device's choices and try the
        // whole sign-in step again when the connection or the tab comes back.
        console.warn('[mcu] could not load preferences from the account', e);
      }
    })();

    return () => {
      live = false;
      clearTimeout(timer);
      off();
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [client, userId]);

  return null;
}

// ---------------------------------------------------------------------------
// Device-only actions: not preferences, never synced
// ---------------------------------------------------------------------------

function clearThisDevice() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('mcu.') === 0) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) { /* nothing stored, nothing to clear */ }
  // The home page: since Findability 3 the path can name a guide or title.
  window.location.replace('/');
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

// Scripts move focus only after keyboard input (AGENTS.md), the same rule as
// the lastInput tracker in app.tsx.
let lastInput: 'keyboard' | 'pointer' = 'pointer';
document.addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) lastInput = 'keyboard'; }, true);
document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);

// The layout follows the grouped lists of a phone's own Settings app: a short
// caption, a rounded group of rows split by hairlines, and a footnote under
// it. Rows are at least 44px tall. Groups are bordered cards rather than grey
// fills because muted text on the muted fill falls short of AA in the light
// theme (qa/test-contrast.js).
const ROW = 'flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-body';
// Rows sit inside a card that clips them to its corners, so focus rings are
// drawn inside the row.
const ROW_FOCUS = 'outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50';
const PRESS = 'cursor-pointer transition-colors hover:bg-muted/60 active:bg-muted';

function Section({ id, title, footnote, children }: {
  id: string; title: string; footnote?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="px-4 text-label font-medium text-muted-foreground">{title}</h3>
      {children}
      {footnote}
    </section>
  );
}

function Group({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-xl border border-border bg-card text-card-foreground divide-y divide-border ${className}`}>{children}</div>;
}

function Footnote({ children, role }: { children: React.ReactNode; role?: string }) {
  return <p role={role} className="px-4 text-label leading-relaxed text-muted-foreground">{children}</p>;
}

/** A segmented control (theme): a radio group drawn as one track. */
function Segmented<T extends string>({ value, onChange, label, options }: {
  value: T; onChange: (v: T) => void; label: string;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
}) {
  return (
    // The icons go when the track is too narrow for them beside the longest
    // label (Portuguese "Automático" on a 320px phone).
    <RadioGroup aria-label={label} value={value} onValueChange={(v) => onChange(v as T)}
      className="@container grid-flow-col auto-cols-fr gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <RadioPrimitive.Root key={o.value} value={o.value}
          className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-body font-medium text-foreground outline-none transition-[background-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-background data-checked:shadow-sm dark:data-checked:bg-input/60 [&_svg]:hidden [&_svg]:size-4 [&_svg]:shrink-0 @min-[19rem]:[&_svg]:block">
          {o.icon}
          <span>{o.label}</span>
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}

/** A list of choices with a checkmark on the chosen row (language). */
function CheckList<T extends string>({ value, onChange, label, options }: {
  value: T; onChange: (v: T) => void; label: string;
  options: Array<{ value: T; label: string; lang?: string }>;
}) {
  return (
    <RadioGroup aria-label={label} value={value} onValueChange={(v) => onChange(v as T)}
      className="gap-0 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
      {options.map((o) => (
        <RadioPrimitive.Root key={o.value} value={o.value} lang={o.lang}
          className={`${ROW} ${ROW_FOCUS} ${PRESS} justify-between`}>
          <span>{o.label}</span>
          <RadioPrimitive.Indicator className="flex text-foreground">
            <CheckIcon className="size-4" aria-hidden="true"/>
          </RadioPrimitive.Indicator>
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}

/** A row with a title, an optional line under it, and a switch. The whole row
 *  toggles it. */
function SwitchRow({ id, title, text, checked, onChange }: {
  id: string; title: string; text?: string; checked: boolean; onChange: (on: boolean) => void;
}) {
  return (
    <Label htmlFor={id} className={`${ROW} cursor-pointer justify-between font-normal leading-normal`}>
      <span className="flex flex-col gap-0.5">
        <span id={id + '-title'}>{title}</span>
        {text && <span id={id + '-text'} className="text-label leading-snug text-muted-foreground">{text}</span>}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={(on) => onChange(!!on)}
        aria-labelledby={id + '-title'} aria-describedby={text ? id + '-text' : undefined}/>
    </Label>
  );
}

/** A tappable row that does something (device actions, About). */
function ActionRow({ children, onClick, tone, chevron, trailing, autoFocus }: {
  children: React.ReactNode; onClick: () => void; tone?: 'destructive'; chevron?: boolean; trailing?: React.ReactNode; autoFocus?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} autoFocus={autoFocus}
      className={`${ROW} ${ROW_FOCUS} ${PRESS} justify-between ${tone === 'destructive' ? 'font-medium text-destructive' : ''}`}>
      <span>{children}</span>
      {chevron && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>}
      {trailing && <span className="flex shrink-0 text-muted-foreground">{trailing}</span>}
    </button>
  );
}

function SettingsBody({ onAbout, onShowWelcome, onClose, keyboard = false }: {
  onAbout: () => void; onShowWelcome: () => void; onClose: () => void;
  /** Desktop: mention the D / L theme shortcut under Theme. */
  keyboard?: boolean;
}) {
  const { tr, languages } = window.useI18n();
  const prefs = usePreferences();
  const size = useTextSize();
  const fromSystem = useTextSizeFromSystem();
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [guidesReset, setGuidesReset] = React.useState(false);
  const [keysOn, setKeysOn] = React.useState(() => window.MCU_KEYS.enabled());
  React.useEffect(() => window.MCU_KEYS.subscribe(() => setKeysOn(window.MCU_KEYS.enabled())), []);
  const regions = window.MCU_regionChoices();
  if (regions.indexOf(prefs.region) === -1) regions.push(prefs.region);

  return (
    <div className="flex flex-col gap-6 text-body text-foreground">
      <Section id="settings-appearance" title={tr('settings.appearance')}
        footnote={keyboard ? <Footnote>{tr('settings.themeShortcut')}</Footnote> : undefined}>
        <Segmented<ThemeChoice> label={tr('theme.label')} value={prefs.theme} onChange={setThemeChoice}
          options={[
            { value: 'light', label: tr('theme.light'), icon: <SunIcon aria-hidden="true"/> },
            { value: 'dark', label: tr('theme.dark'), icon: <MoonIcon aria-hidden="true"/> },
            { value: 'system', label: tr('theme.system'), icon: <MonitorIcon aria-hidden="true"/> },
          ]}/>
      </Section>

      <Section id="settings-text-size" title={tr('settings.textSize')}
        footnote={<Footnote>{fromSystem ? tr('settings.textSizeSystem') + ' ' : ''}{tr('settings.textSizeHint')}</Footnote>}>
        <Segmented<TextSize> label={tr('settings.textSize')} value={size} onChange={setTextSize}
          options={[
            { value: 'small', label: tr('settings.textSmall') },
            { value: 'default', label: tr('settings.textDefault') },
            { value: 'large', label: tr('settings.textLarge') },
          ]}/>
      </Section>

      <Section id="settings-language" title={tr('lang.label')}>
        <CheckList<Lang> label={tr('lang.label')} value={prefs.lang}
          onChange={(v) => window.MCU_I18N.setLang(v)}
          options={languages().map((l) => ({ value: l.code, label: l.name, lang: l.code }))}/>
      </Section>

      <Section id="settings-region" title={tr('settings.region')} footnote={<Footnote>{tr('settings.regionHint')}</Footnote>}>
        <Group>
          <Select value={prefs.region} onValueChange={(v) => { if (typeof v === 'string') window.MCU_region.set(v); }}
            items={regions.map((c) => ({ value: c, label: window.MCU_countryName(c) }))}>
            <SelectTrigger aria-label={tr('watch.regionLabel')}
              className={`${ROW} ${ROW_FOCUS} ${PRESS} h-auto rounded-none border-0 bg-transparent shadow-none dark:bg-transparent dark:hover:bg-muted/60 focus-visible:border-0`}>
              <span className="shrink-0">{tr('settings.country')}</span>
              <SelectValue className="min-w-0 justify-end text-right text-muted-foreground"/>
            </SelectTrigger>
            <SelectContent className="settings-select">
              {regions.map((c) => <SelectItem key={c} value={c}>{window.MCU_countryName(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Group>
      </Section>

      <Section id="settings-effects" title={tr('settings.effects')} footnote={<Footnote>{tr('settings.reduceMotionHint')}</Footnote>}>
        <Group>
          <SwitchRow id="settings-reduce-motion" title={tr('settings.reduceMotion')}
            checked={prefs.motion === 'reduced'} onChange={(on) => setMotion(on ? 'reduced' : 'auto')}/>
          <SwitchRow id="settings-celebrate" title={tr('settings.celebrations')} text={tr('settings.celebrationsText')}
            checked={prefs.celebrations} onChange={setCelebrations}/>
        </Group>
      </Section>

      {/* Keyboard shortcuts (Notion "Keyboard shortcuts", 2026-11-18): the
          single keys can be turned off (WCAG 2.1.4). Where there's a keyboard. */}
      {keyboard && (
        <Section id="settings-keys" title={tr('keys.settingsTitle')} footnote={<Footnote>{tr('keys.settingsHint')}</Footnote>}>
          <Group>
            <SwitchRow id="settings-keys-on" title={tr('keys.settingsSwitch')} checked={keysOn} onChange={(on) => window.MCU_KEYS.set(on)}/>
          </Group>
        </Section>
      )}

      <Section id="settings-device" title={tr('settings.device')}
        footnote={guidesReset
          ? <Footnote role="status">{tr('settings.resetGuidesDone')}</Footnote>
          : <Footnote>{tr('settings.deviceText')}</Footnote>}>
        <Group>
          <ActionRow onClick={() => { window.MCU_GUIDE.resetSkips(); setGuidesReset(true); }}>{tr('settings.resetGuides')}</ActionRow>
          <ActionRow onClick={() => { onClose(); onShowWelcome(); }}>{tr('settings.showWelcome')}</ActionRow>
          {!confirmClear ? (
            <ActionRow tone="destructive" onClick={() => setConfirmClear(true)}>{tr('settings.clearDevice')}</ActionRow>
          ) : (
            <div role="alertdialog" aria-labelledby="settings-clear-q" aria-describedby="settings-clear-text"
              className="flex flex-col gap-3 bg-destructive/5 p-4">
              <p id="settings-clear-q" className="font-medium">{tr('settings.clearQ')}</p>
              <p id="settings-clear-text" className="text-muted-foreground">{tr('settings.clearText')}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11" autoFocus onClick={() => setConfirmClear(false)}>{tr('settings.cancel')}</Button>
                <Button variant="destructive" className="h-11" onClick={clearThisDevice}>{tr('settings.clearConfirm')}</Button>
              </div>
            </div>
          )}
        </Group>
      </Section>

      <div className="flex flex-col gap-3">
        <Group>
          <ActionRow chevron onClick={() => { onClose(); onAbout(); }}>{tr('about.title')}</ActionRow>
          <ActionRow trailing={<window.ShareIcon/>} onClick={() => window.MCU_SHARE.share({ text: tr('share.appText') })}>{tr('share.appLabel')}</ActionRow>
        </Group>
        <footer className="flex flex-col gap-1 px-4 text-center text-label leading-relaxed text-muted-foreground">
          <p>{tr('about.fan')}</p>
          <p>{tr('settings.version', { v: pkg.version })}</p>
        </footer>
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

/** The gear: desktop toolbar and phone app bar. */
function SettingsButton({ onOpen, open, className = '' }: { onOpen: () => void; open?: boolean; className?: string }) {
  const tr = window.MCU_I18N.tr;
  return (
    <button type="button" className={cn('settings-btn inline-flex size-[max(44px,2.75rem)] shrink-0 cursor-pointer items-center justify-center rounded-md border bg-(--button-outline) p-0 text-foreground shadow-xs outline-none transition-[scale,background-color,color,border-color,box-shadow] duration-150 hover:bg-(--field-hover) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-disabled:scale-92 motion-reduce:active:scale-100 border-input [:root.reduce-motion_&]:active:scale-100',
      open && 'open bg-(--field-hover)', className)}
      onClick={onOpen} aria-label={tr('settings.title')} title={tr('settings.title')} aria-expanded={!!open}>
      <GearIcon/>
    </button>
  );
}

/** Desktop: a panel from the right, in the details drawer's place. Modeless
 *  like the drawer; Escape closes it (after an open select closes first), and
 *  focus goes back to the gear. */
// `leaving`: closed, and sliding away; `onGone` fires once it is off screen
// (at once when motion is cut), so the app can unmount it and bring the
// details drawer in after it. Reopened while leaving, it slides back.
function SettingsPanel({ onClose, onAbout, onShowWelcome, leaving = false, onGone }: {
  onClose: () => void; onAbout: () => void; onShowWelcome: () => void;
  leaving?: boolean; onGone?: () => void;
}) {
  const tr = window.MCU_I18N.tr;
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  const leavingRef = React.useRef(leaving);
  leavingRef.current = leaving;
  const goneRef = React.useRef(onGone);
  goneRef.current = onGone;
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!leaving) return undefined;
    const el = panelRef.current;
    // Gone when the slide ends; a timer covers a transition that never runs
    // (motion cut, or the panel never got to open).
    const moving = !!el && parseFloat(getComputedStyle(el).transitionDuration) > 0.01;
    const t = window.setTimeout(() => { if (leavingRef.current) goneRef.current?.(); }, moving ? 600 : 0);
    return () => window.clearTimeout(t);
  }, [leaving]);
  React.useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setOpen(true));
    if (lastInput === 'keyboard') headingRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || leavingRef.current) return;
      // An open select closes itself first: one layer per press.
      // (Base UI keeps a closed popup mounted, marked data-closed.)
      if (document.querySelector('[data-slot="select-content"][data-open]')) return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      const gear = opener && opener.isConnected ? opener : document.querySelector<HTMLElement>('.settings-btn');
      if (gear && lastInput === 'keyboard') gear.focus({ preventScroll: true });
    };
  }, []);
  return (
    // A div, not an aside: role="dialog" is not allowed on <aside> (axe).
    // The panel's frame matches the details drawer it replaces: below the
    // toolbar, from the right, same width. Leaving (closed onto a title, or
    // with ×) is a quicker slide out, so the drawer after it isn't kept waiting.
    // It slides with `transform` (not Tailwind's translate utilities, which
    // use the `translate` property): the close waits for that transition.
    <div ref={panelRef} role="dialog"
      className={cn('settings-panel fixed top-(--tb-h,0px) right-0 z-60 flex h-[calc(100vh-var(--tb-h,0px))] w-[380px] [transform:translateX(100%)] flex-col border-l bg-popover text-popover-foreground shadow-lg transition-transform duration-360 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
        open && !leaving && 'open [transform:none]', leaving && 'leaving pointer-events-none duration-240 ease-[cubic-bezier(.4,0,1,1)]')} aria-modal="false"
      aria-labelledby="settings-title"
      onTransitionEnd={(e) => { if (leavingRef.current && e.target === e.currentTarget && e.propertyName === 'transform') goneRef.current?.(); }}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
        <h2 id="settings-title" ref={headingRef} tabIndex={-1} className="text-title font-semibold tracking-tight outline-none">{tr('settings.title')}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={tr('details.close')} title={tr('details.close')}>×</Button>
      </div>
      <div className="settings-scroll flex-auto overflow-y-auto overscroll-contain px-5 py-5">
        <SettingsBody onAbout={onAbout} onShowWelcome={onShowWelcome} onClose={onClose} keyboard/>
      </div>
    </div>
  );
}

/** Phone: the shared bottom sheet, which traps focus, returns it to the gear
 *  and owns one history entry, so Back closes it. */
function SettingsSheet({ onClose, onAbout, onShowWelcome }: {
  onClose: () => void; onAbout: () => void; onShowWelcome: () => void;
}) {
  const Sheet = window.Sheet;
  const tr = window.MCU_I18N.tr;
  return (
    <Sheet onClose={onClose} tall labelledBy="settings-sheet-title">
      <div className="m-sh-head mb-4 flex items-center justify-between">
        <div id="settings-sheet-title" className="m-sh-title text-title font-semibold tracking-tight">{tr('settings.title')}</div>
      </div>
      <div className="settings-sheet-body pb-2">
        <SettingsBody onAbout={onAbout} onShowWelcome={onShowWelcome} onClose={onClose}/>
      </div>
    </Sheet>
  );
}

Object.assign(window, { SettingsPanel, SettingsSheet, SettingsButton, PreferencesSync, MCU_PREFS, MCU_MOTION });

// Exported so the shared `window` surface can be typed from the real
// implementations (src/types/globals.d.ts).
export { SettingsPanel, SettingsSheet, SettingsButton, PreferencesSync, MCU_PREFS, MCU_MOTION };
