// The shared Supabase client, window.mcuSupabase, loaded on demand.
//
// This file must never throw. The catalog makes zero network calls at load and
// works offline, and V3 does not regress that: a blank config, a blocked CDN, a
// paused free-tier project or a malformed URL all have to degrade to guest mode
// rather than take the page down with them.
//
// supabase-js (53 KB from unpkg) used to be a script tag every visitor waited
// for before the app could draw. Since Notion "Findability 8" it loads only
// when someone needs it:
//   - at once, when the visitor has a saved session or is coming back from
//     Google sign-in: index.html's head script spots that (MCU_SUPABASE_JS.early)
//     and has already started the download, so it lands about when it used to;
//   - otherwise when they press Sign in (window.MCU_loadSupabase()).
// Until it arrives window.mcuSupabase is null. account.tsx listens for the
// `mcu:supabase` event this file sends when the client is ready or has failed.
//
// window.MCU_SUPABASE_STATUS carries the state, and the reason when it failed,
// so the account UI can say something more useful than "something went wrong":
//   { ok: true }                  available (loaded, loading or not yet asked)
//   { ok: true, loading: true }   being fetched right now
//   { ok: false, reason }         unavailable: guest mode only

(function () {
  const EVENT = 'mcu:supabase';
  let pending: Promise<unknown> | null = null;

  function announce() {
    try { window.dispatchEvent(new Event(EVENT)); } catch (e) { /* never throw */ }
  }

  function unavailable(reason: string) {
    window.mcuSupabase = null;
    window.MCU_SUPABASE_STATUS = { ok: false, reason: reason };
    // console.info, not error: running without a backend is a supported mode,
    // not a fault, and this file is loaded on every page view.
    console.info('[mcu] sync unavailable — ' + reason);
  }

  function createClient(): unknown {
    const cfg = window.MCU_CONFIG;
    if (!cfg) { unavailable('no Supabase project configured (config.js is blank)'); return null; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      unavailable('supabase-js failed to load from the CDN');
      return null;
    }
    try {
      window.mcuSupabase = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabasePublishableKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            // On by default, but stated explicitly because the whole
            // no-callback-route sign-in flow depends on it: the user lands back
            // on index.html with a code in the URL and supabase-js completes the
            // exchange itself.
            detectSessionInUrl: true,
            flowType: 'pkce',
            // Namespaced so the auth session can be identified and cleared
            // independently of the collection keys. index.html's head script
            // looks for this prefix to know a session is saved: keep the two
            // alike.
            storageKey: 'mcu.auth.v1',
          },
        }
      );
      window.MCU_SUPABASE_STATUS = { ok: true };
      return window.mcuSupabase;
    } catch (e) {
      unavailable('client init failed: ' + ((e instanceof Error && e.message) || e));
      return null;
    }
  }

  // Fetches supabase-js once and resolves with the client, or with null when
  // it can't be had (the status then says why). Safe to call any number of
  // times; every caller shares the one download.
  function load(): Promise<unknown> {
    if (window.mcuSupabase) return Promise.resolve(window.mcuSupabase);
    if (!window.MCU_SUPABASE_STATUS.ok) return Promise.resolve(null);
    if (pending) return pending;
    const js = window.MCU_SUPABASE_JS;
    window.MCU_SUPABASE_STATUS = { ok: true, loading: true };
    pending = new Promise((resolve) => {
      const done = () => { pending = null; const c = createClient(); announce(); resolve(c); };
      if (window.supabase) { done(); return; }
      if (!js || !js.src) { unavailable('supabase-js address missing from index.html'); pending = null; announce(); resolve(null); return; }
      const s = document.createElement('script');
      s.src = js.src;
      if (js.integrity) { s.integrity = js.integrity; s.crossOrigin = 'anonymous'; }
      s.onload = done;
      s.onerror = () => { pending = null; unavailable('supabase-js failed to load from the CDN'); announce(); resolve(null); };
      document.head.appendChild(s);
    });
    return pending;
  }

  window.mcuSupabase = null;
  window.MCU_loadSupabase = load;

  const cfg = window.MCU_CONFIG;
  if (!cfg || !cfg.supabaseUrl || !cfg.supabasePublishableKey) {
    unavailable('no Supabase project configured (config.js is blank)');
    return;
  }
  window.MCU_SUPABASE_STATUS = { ok: true };

  if (window.MCU_SUPABASE_JS && window.MCU_SUPABASE_JS.early) load();
})();
