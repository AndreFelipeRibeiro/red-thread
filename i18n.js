// Language support (no build step). Each language is one file in locales/
// that registers itself on window.MCU_LOCALES; English (locales/en.js) is the
// complete base every other language falls back to, key by key. This runtime
// picks the visitor's language (saved choice, then the browser/phone language,
// then English), looks strings up with plural and {placeholder} support, and
// lets React components re-render when the language changes.
//
// To add a language: copy locales/pt-BR.js to locales/<code>.js, translate it,
// and add its <script> tag to index.html before this file. Missing keys fall
// back to English and are reported once in the console on localhost.
(function () {
  const LOCALES = window.MCU_LOCALES || (window.MCU_LOCALES = {});
  const BASE = 'en';
  const STORAGE_KEY = 'mcu.lang.v1';
  const DEV = ['localhost', '127.0.0.1', '[::1]', ''].indexOf(window.location.hostname) !== -1;
  const listeners = new Set();
  const warned = new Set();

  const codes = () => Object.keys(LOCALES);
  const meta = (code) => (LOCALES[code] && LOCALES[code].meta) || {};
  const tag = (code) => meta(code).htmlLang || code;

  // 'pt', 'pt-PT' or 'pt-BR' all map to the pt-BR catalog via meta.match.
  function matchTag(value) {
    if (!value) return null;
    const lower = String(value).toLowerCase();
    const exact = codes().find((c) => c.toLowerCase() === lower);
    if (exact) return exact;
    const primary = lower.split('-')[0];
    return codes().find((c) => (meta(c).match || [c.split('-')[0]])
      .some((m) => m.toLowerCase() === primary)) || null;
  }

  function stored() {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      return v && LOCALES[v] ? v : null;
    } catch (e) { return null; }
  }

  function detect() {
    const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (const p of prefs) { const m = matchTag(p); if (m) return m; }
    return BASE;
  }

  // A Portuguese address (/pt, /pt/guias/…; Notion "Findability 6") opens the
  // app in Portuguese whatever was saved or the browser says, so a page a
  // search engine or a friend sent reads in the language of its address. It
  // isn't saved: choosing English in Settings moves the address back to
  // English (app.tsx), and an English address keeps the saved choice.
  function pathLang() {
    try { return /^\/pt(\/|$)/.test(window.location.pathname) && LOCALES['pt-BR'] ? 'pt-BR' : null; } catch (e) { return null; }
  }

  let lang = pathLang() || stored() || detect();
  if (!LOCALES[lang]) lang = BASE;

  function apply() {
    document.documentElement.lang = tag(lang);
  }

  function setLang(next) {
    if (!LOCALES[next] || next === lang) return;
    lang = next;
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* this visit only */ }
    apply();
    listeners.forEach((fn) => fn());
  }

  function warn(key, kind) {
    if (!DEV || warned.has(lang + ':' + key)) return;
    warned.add(lang + ':' + key);
    console.warn(`[mcu i18n] ${kind} "${key}" for ${lang}`);
  }

  function raw(code, key) {
    const s = LOCALES[code] && LOCALES[code].strings;
    return s ? s[key] : undefined;
  }

  // tr('header.count', { n: 64 }) — strings may be plain text with {name}
  // placeholders, or { one, other, ... } objects chosen by Intl.PluralRules on n.
  function tr(key, vars) {
    let v = raw(lang, key);
    if (v === undefined) {
      v = raw(BASE, key);
      if (v === undefined) { warn(key, 'unknown key'); return key; }
      if (lang !== BASE) warn(key, 'missing translation');
    }
    if (v && typeof v === 'object') {
      const n = vars && typeof vars.n === 'number' ? vars.n : 0;
      let form = 'other';
      try { form = new Intl.PluralRules(tag(lang)).select(n); } catch (e) { /* default */ }
      v = v[form] != null ? v[form] : v.other;
    }
    if (!vars) return v;
    return String(v).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }

  const table = (code, name) => (LOCALES[code] && LOCALES[code][name]) || {};

  function titleName(title) {
    if (!title) return '';
    return table(lang, 'titles')[title.id] || title.title;
  }

  // Every known name for a title in every language, so search finds "Os
  // Vingadores" while browsing in English and "The Avengers" in Portuguese.
  function titleNames(title) {
    const names = [title.title];
    codes().forEach((c) => {
      const n = table(c, 'titles')[title.id];
      if (n) names.push(n);
      (table(c, 'titleAliases')[title.id] || []).forEach((a) => names.push(a));
    });
    return names;
  }

  function charName(id) {
    const c = window.CHARACTERS && window.CHARACTERS[id];
    return table(lang, 'characters')[id] || (c ? c.name : id);
  }

  function charNames(id) {
    const c = window.CHARACTERS && window.CHARACTERS[id];
    const names = c ? [c.name] : [];
    codes().forEach((code) => { const n = table(code, 'characters')[id]; if (n) names.push(n); });
    return names;
  }

  // data.js story labels are English ("Outside time", "1260 BC–1896").
  function storyLabel(story) {
    if (!story) return story;
    const words = table(lang, 'storyWords');
    return Object.keys(words).reduce((s, k) => s.split(k).join(words[k]), story);
  }

  function storyNote(title) {
    return table(lang, 'storyNotes')[title.id] || title.storyNote || null;
  }

  // Synopsis in the current language, falling back to English.
  function synopsis(title) {
    if (!title) return null;
    return table(lang, 'synopses')[title.id] || table('en', 'synopses')[title.id] || null;
  }

  // A title's release at the precision it is actually known: a full date for a
  // confirmed day, the month alone for an announced window. `status` keeps the
  // two apart — released / upcoming for a confirmed day, expected for a month —
  // so an announced month never reads as a premiere, even once it has passed
  // (the same rule MCU_isReleased applies to the completion count).
  // The release day in the current language's market: locales/<code>.js
  // `releases` holds the days that differ from data.ts (Avengers: Doomsday
  // opens a day earlier in Brazil; Notion "Findability 6").
  function releaseDay(title) {
    if (!title) return null;
    return table(lang, 'releases')[title.id] || title.release || null;
  }

  function release(title) {
    const r = releaseDay(title);
    if (!r) return { status: 'expected', date: null };
    const day = /^\d{4}-\d{2}-\d{2}$/.test(r);
    const [y, m, d] = r.split('-').map(Number);
    let date = r;
    try {
      date = new Intl.DateTimeFormat(tag(lang), day
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'long' }).format(new Date(y, (m || 1) - 1, d || 1));
    } catch (e) { /* keep the ISO text */ }
    if (!day) return { status: 'expected', date };
    const out = window.MCU_isReleased ? window.MCU_isReleased(title) : true;
    return { status: out ? 'released' : 'upcoming', date };
  }

  function budget(millions) {
    const n = millions < 1 ? millions : Math.round(millions);
    return tr('budget.format', { n: n.toLocaleString(tag(lang)) });
  }

  const upper = (s) => String(s).toLocaleUpperCase(tag(lang));
  const compare = (a, b) => String(a).localeCompare(String(b), tag(lang));

  function languages() {
    return codes().map((code) => ({ code, name: meta(code).name || code, short: meta(code).short || code }));
  }

  // Search text without case or accents, so "Capitao" finds "Capitão" and the
  // other way round. Every search path (suggestions, the filter, highlights)
  // uses this one function so they always agree.
  const fold = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  const api = {
    get lang() { return lang; },
    setLang, tr, titleName, titleNames, charName, charNames, storyLabel, storyNote, synopsis,
    release, releaseDay, budget, upper, compare, languages, detect, fold, subscribe,
  };

  // Components call useI18n() to re-render when the language changes.
  function useI18n() {
    React.useSyncExternalStore(subscribe, () => lang);
    return api;
  }

  apply();
  window.MCU_I18N = api;
  window.useI18n = useI18n;
  // The startup screen (boot.js) can show its words now.
  if (window.MCU_BOOT) window.MCU_BOOT.refresh();
})();
