// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 178 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';

// Watch tracking — per-title collection state (seen / watchlist), guest
// persistence, and the shared status controls.
//
// Three mutually exclusive states per title: 'none' | 'watchlist' | 'seen'.
// 'none' is the absence of an entry, never a stored value — the same shape the
// database uses, where clearing a status is a DELETE rather than a third status.
//
// Guests persist locally. Signed-in collections load and merge from Supabase,
// then save through per-title queues with optimistic updates and rollback.

const STORAGE_KEY = 'mcu.collection.v1';
const STORAGE_VERSION = 1;

// Below this canvas scale the status buttons are smaller than a usable hit
// target, so they are withdrawn and only the (non-interactive) seen marker
// remains. Cards are laid out at view.scale, which resetView can land near
// 0.7–0.8 and the user can pinch down to ZOOM_MIN = 0.05.
const TSA_MIN_SCALE = 0.5;

// Local calendar date, not UTC — `new Date().toISOString()` rolls over early or
// late depending on the timezone, which would move the released-title
// denominator by a day for most of the world.
function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isReleased(title, today) {
  // An announced month is a window, not proof that the title has premiered.
  return /^\d{4}-\d{2}-\d{2}$/.test(title.release) && title.release <= (today || todayISO());
}

// Whether the Seen button is offered: from 7 days before a day-precision
// release date (early screenings and premieres), and always once released.
// A month-only date never opens it. Worked out from today's date on every
// render, so it switches on by itself. Progress and Up next still wait for
// the release day (isReleased).
const MARK_SEEN_LEAD_DAYS = 7;
function canMarkSeen(title, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(title.release)) return false;
  const [y, m, d] = title.release.split('-').map(Number);
  const open = new Date(Date.UTC(y, m - 1, d - MARK_SEEN_LEAD_DAYS));
  const pad = (n) => String(n).padStart(2, '0');
  const opensOn = `${open.getUTCFullYear()}-${pad(open.getUTCMonth() + 1)}-${pad(open.getUTCDate())}`;
  return opensOn <= (today || todayISO());
}

// Taps on the seen/watchlist buttons, for the celebration toast and confetti
// (celebrate.jsx). Only user actions are announced, never sync or merges.
const statusListeners = new Set();
function onStatusChange(fn) {
  statusListeners.add(fn);
  return () => { statusListeners.delete(fn); };
}
function emitStatusChange(e) {
  statusListeners.forEach((fn) => { try { fn(e); } catch (err) { /* one listener must not stop the rest */ } });
}

// Which of `ids` a bulk action would actually change, given the current marks.
// One rule, used both for the counts shown before acting and for the action
// itself, so a label can never promise a different number than it delivers.
//   seen      — released titles not already seen (unreleased never, in bulk)
//   watchlist — titles with no mark (a seen title keeps its seen mark)
//   none      — "Mark as unseen": seen titles only (a watchlist is left alone)
function bulkTargets(ids, to, states) {
  const st = states || {};
  const byId = {};
  (window.TITLES || []).forEach((t) => { byId[t.id] = t; });
  return ids.filter((id) => {
    const t = byId[id];
    const cur = st[id] || 'none';
    if (!t) return false;
    if (to === 'seen') return cur !== 'seen' && isReleased(t);
    if (to === 'watchlist') return cur === 'none';
    if (to === 'none') return cur === 'seen';
    return false;
  });
}

// Bulk actions that need a yes first (more than 20 titles, or any "Mark as
// unseen") are handed to whoever renders the confirmation (celebrate.jsx).
const BULK_CONFIRM_OVER = 20;
const confirmListeners = new Set();
function onBulkConfirm(fn) {
  confirmListeners.add(fn);
  return () => { confirmListeners.delete(fn); };
}

// The completion denominator. Computed from release dates every time rather
// than stored, so it moves on its own as the slate ships.
function releasedCount() {
  const today = todayISO();
  return (window.TITLES || []).filter((t) => isReleased(t, today)).length;
}

// ---------------------------------------------------------------------------
// Guest storage
// ---------------------------------------------------------------------------

// Tolerates absent, malformed, truncated and hand-edited JSON: anything it
// can't make sense of degrades to an empty collection rather than throwing on
// the first render.
function readGuestStates() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return {}; // Storage disabled (Safari private mode, cookie blocking).
  }
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn('[mcu] collection storage was not valid JSON; ignoring it');
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== STORAGE_VERSION) return {};
  const states = parsed.states;
  if (!states || typeof states !== 'object') return {};
  const out = {};
  Object.keys(states).forEach((id) => {
    const v = states[id];
    if (v === 'seen' || v === 'watchlist') out[id] = v;
  });
  return out;
}

function writeGuestStates(states) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, states }));
  } catch (e) {
    // Quota or disabled storage. Tracking still works for this session in
    // memory; losing it on reload beats breaking the toggle.
    console.warn('[mcu] could not persist collection to localStorage', e);
  }
}

function clearGuestStates() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* nothing to do */ }
}

const IS_DEV = ['localhost', '127.0.0.1', '[::1]', ''].indexOf(window.location.hostname) !== -1;

// A stored id with no catalog entry is inert, not garbage — it may be a title
// that was renamed or temporarily pulled. It is ignored by the UI and never
// deleted, because dropping it would turn a typo into permanent data loss.
function warnUnknownIds(states) {
  if (!IS_DEV) return;
  const known = new Set((window.TITLES || []).map((t) => t.id));
  const unknown = Object.keys(states).filter((id) => !known.has(id));
  if (unknown.length) {
    console.warn('[mcu] stored title ids with no catalog entry (kept, ignored in UI):', unknown);
  }
}

// ---------------------------------------------------------------------------
// Remote shape
// ---------------------------------------------------------------------------

const TABLE = 'title_states';
const SYNC_TIMEOUT_MS = 5000;

// Bound the entire operation, including SDK retries. Aborting the builder also
// stops its retry loop; Promise.race covers adapters that never settle on abort.
async function collectionRequest(query) {
  const controller = new AbortController();
  let timer;
  try {
    const result = await Promise.race([
      Promise.resolve(query.abortSignal(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(window.MCU_I18N.tr('error.timeout'));
          error.code = 'MCU_TIMEOUT';
          reject(error);
          controller.abort();
        }, SYNC_TIMEOUT_MS);
      }),
    ]);
    if (result.error) {
      const error = new Error(result.error.message || window.MCU_I18N.tr('error.sync'));
      error.status = result.status;
      error.code = result.error.code;
      throw error;
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

function connectionUnavailable(error) {
  return error.code === 'MCU_TIMEOUT' || error.status === 0 || error.status >= 500 ||
    /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(error.message || '');
}


// Guest and account data are merged by strength, not by recency. These are
// monotonic facts about what someone watched — a last-write-wins or
// remote-wins rule silently throws real information away.
const STATUS_RANK = { none: 0, watchlist: 1, seen: 2 };

function strongestStatus(a, b) {
  const x = a || 'none';
  const y = b || 'none';
  return STATUS_RANK[x] >= STATUS_RANK[y] ? x : y;
}

function mergeStates(remote, guest) {
  const out = {};
  const ids = new Set(Object.keys(remote).concat(Object.keys(guest)));
  ids.forEach((id) => {
    const s = strongestStatus(remote[id], guest[id]);
    if (s !== 'none') out[id] = s;
  });
  return out;
}

// seen_at is only meaningful for 'seen' rows — the table has a CHECK constraint
// enforcing that it is null otherwise, so this must be explicit rather than
// simply left off the payload on an update.
function rowFor(userId, titleId, status) {
  return {
    user_id: userId,
    title_id: titleId,
    status,
    seen_at: status === 'seen' ? new Date().toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Collection context
// ---------------------------------------------------------------------------

const CollectionContext = React.createContext(null);

// Stand-in so the auth context can be read with an unconditional hook call even
// if account.jsx never loaded. tracking.jsx is loaded first and must not depend
// on account.jsx being present.
const NoAuthContext = React.createContext(null);

function CollectionProvider({ children }) {
  const auth = React.useContext(window.MCU_AUTH_CONTEXT || NoAuthContext);
  const authStatus = auth ? auth.status : 'signed_out';
  const userId = auth && auth.user ? auth.user.id : null;
  const client = window.mcuSupabase;
  const continueAsGuest = auth && auth.continueAsGuest;

  const [storedStates, setStates] = React.useState(() => {
    const initial = readGuestStates();
    warnUnknownIds(initial);
    return initial;
  });
  const [pending, setPending] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [remoteLoading, setRemoteLoading] = React.useState(false);
  const [syncError, setSyncError] = React.useState(null);

  // Supabase is the source of truth when signed in; localStorage otherwise.
  const mode = (client && authStatus === 'signed_in' && userId) ? 'account' : 'guest';
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  // A scope is replaced on every account/guest transition, including A → guest
  // → A. Old requests retain their original user id and cannot update a new scope.
  const identity = mode === 'account' ? userId : authStatus === 'initializing' ? 'initializing' : 'guest';
  const scopeRef = React.useRef(null);
  if (!scopeRef.current || scopeRef.current.identity !== identity) {
    scopeRef.current = { identity };
  }
  const scope = scopeRef.current;
  const [loadedScope, setLoadedScope] = React.useState(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const states = loadedScope === scope ? storedStates : {};
  const loading = authStatus === 'initializing' || loadedScope !== scope || (mode === 'account' && (remoteLoading || !!syncError));
  const loadingRef = React.useRef(loading);
  loadingRef.current = loading;

  // A mirror of `states` that is updated synchronously. Rapid toggling calls the
  // mutators faster than React re-renders, so reading the previous value from a
  // stale closure would lose intermediate transitions.
  const statesRef = React.useRef(storedStates);
  const commit = React.useCallback((next) => {
    statesRef.current = next;
    setStates(next);
  }, []);

  // Last value we know is actually in the database, per title. Rollback targets
  // this rather than "whatever React had a moment ago", which may itself be an
  // optimistic value that never landed.
  const confirmedRef = React.useRef({});

  // One in-flight write per title id, with last-intent-wins. Rapid toggling
  // (seen -> none -> seen) races otherwise and can settle on the wrong value.
  const writersRef = React.useRef({});

  const markPending = React.useCallback((titleId, on) => {
    setPending((p) => {
      if (!!p[titleId] === on) return p;
      const out = { ...p };
      if (on) out[titleId] = true; else delete out[titleId];
      return out;
    });
  }, []);

  const setTitleError = React.useCallback((titleId, message) => {
    setErrors((e) => {
      if (!message && !e[titleId]) return e;
      const out = { ...e };
      if (message) out[titleId] = message; else delete out[titleId];
      return out;
    });
  }, []);

  const performWrite = React.useCallback(async (uid, titleId, target) => {
    if (!client || !uid) throw new Error('not signed in');
    if (target === 'none') {
      // There is no 'none' status — absence of the row is 'none'.
      await collectionRequest(client.from(TABLE).delete().eq('user_id', uid).eq('title_id', titleId));
    } else {
      await collectionRequest(client.from(TABLE)
        .upsert(rowFor(uid, titleId, target), { onConflict: 'user_id,title_id' }));
    }
  }, [client]);

  // Drains a single title's queue. The loop re-reads `desired` after each write,
  // so a value changed mid-flight is picked up without ever running two writes
  // for the same title concurrently.
  const drain = React.useCallback((titleId) => {
    const w = writersRef.current[titleId];
    if (!w || w.running) return;
    const requestScope = scopeRef.current;
    const uid = userId;
    const current = () => scopeRef.current === requestScope;
    w.running = true;
    (async () => {
      try {
        while (current() && w.desired !== w.confirmed) {
          const target = w.desired;
          await performWrite(uid, titleId, target);
          if (!current()) return;
          w.confirmed = target;
          confirmedRef.current[titleId] = target;
        }
        if (current()) setTitleError(titleId, null);
      } catch (e) {
        if (!current()) return;
        // Roll the UI back to the last value we know landed, and report it on
        // the title itself rather than as a global toast.
        const back = confirmedRef.current[titleId] || 'none';
        const cur = { ...statesRef.current };
        if (back === 'none') delete cur[titleId]; else cur[titleId] = back;
        commit(cur);
        w.desired = back;
        w.confirmed = back;
        setTitleError(titleId, (e && e.message) ? e.message : window.MCU_I18N.tr('error.save'));
        console.warn('[mcu] write failed for', titleId, e);
      } finally {
        w.running = false;
        if (current()) markPending(titleId, false);
      }
    })();
  }, [performWrite, commit, markPending, setTitleError, userId]);

  // Applies a status change: optimistic locally, queued remotely when signed in.
  const applyStatus = React.useCallback((titleId, next) => {
    if (loadingRef.current || !['none', 'seen', 'watchlist'].includes(next)) return;
    const prev = statesRef.current;
    if ((prev[titleId] || 'none') === next) return;
    const out = { ...prev };
    if (next === 'none') delete out[titleId]; else out[titleId] = next;
    commit(out);

    if (modeRef.current === 'guest') {
      // Written here rather than in an effect on `states`, so account data can
      // never reach the guest key by way of a mode change (§5.4).
      writeGuestStates(out);
      return;
    }
    const w = writersRef.current[titleId] || (writersRef.current[titleId] = {
      desired: confirmedRef.current[titleId] || 'none',
      confirmed: confirmedRef.current[titleId] || 'none',
      running: null,
    });
    w.desired = next;
    setTitleError(titleId, null);
    markPending(titleId, true);
    drain(titleId);
  }, [commit, drain, markPending, setTitleError]);

  const setStatus = React.useCallback((titleId, next) => {
    applyStatus(titleId, next);
  }, [applyStatus]);

  // Un-seeing returns a title to 'none', never to 'watchlist' — the watchlist
  // entry was consumed when it was marked seen and there is nothing to restore.
  const toggleSeen = React.useCallback((titleId) => {
    applyStatus(titleId, statesRef.current[titleId] === 'seen' ? 'none' : 'seen');
  }, [applyStatus]);

  const toggleWatchlist = React.useCallback((titleId) => {
    applyStatus(titleId, statesRef.current[titleId] === 'watchlist' ? 'none' : 'watchlist');
  }, [applyStatus]);

  const clearAll = React.useCallback(() => {
    if (loadingRef.current) return;
    Object.keys(statesRef.current).forEach((id) => applyStatus(id, 'none'));
    if (modeRef.current === 'guest') clearGuestStates();
  }, [applyStatus]);

  // Several titles at once: one commit and one guest-storage write, then each
  // title through its own writer queue when signed in — so every failure,
  // rollback and retry behaves exactly as it does for a single mark (the
  // user's choice: N small requests over a new batched write path). Returns
  // each changed title's previous status, which is what Undo puts back.
  const applyMany = React.useCallback((changes) => {
    if (loadingRef.current) return null;
    const prev = statesRef.current;
    const out = { ...prev };
    const before = {};
    Object.keys(changes).forEach((id) => {
      const next = changes[id];
      if (!['none', 'seen', 'watchlist'].includes(next)) return;
      if ((prev[id] || 'none') === next) return;
      before[id] = prev[id] || 'none';
      if (next === 'none') delete out[id]; else out[id] = next;
    });
    const ids = Object.keys(before);
    if (!ids.length) return null;
    commit(out);
    if (modeRef.current === 'guest') { writeGuestStates(out); return before; }
    ids.forEach((id) => {
      const w = writersRef.current[id] || (writersRef.current[id] = {
        desired: confirmedRef.current[id] || 'none',
        confirmed: confirmedRef.current[id] || 'none',
        running: null,
      });
      w.desired = out[id] || 'none';
      setTitleError(id, null);
      markPending(id, true);
      drain(id);
    });
    return before;
  }, [commit, drain, markPending, setTitleError]);

  // A bulk action: changes exactly bulkTargets(), then announces it once —
  // one toast, one celebration, one step toward the sign-in reminder — the way
  // a single tap announces itself.
  const markMany = React.useCallback((ids, to) => {
    const states = statesRef.current;
    const targets = bulkTargets(ids, to, states);
    if (!targets.length) return 0;
    const changes = {};
    targets.forEach((id) => { changes[id] = to; });
    const prev = applyMany(changes);
    if (!prev) return 0;
    const changed = Object.keys(prev);
    const after = { ...states };
    changed.forEach((id) => { if (to === 'none') delete after[id]; else after[id] = to; });
    emitStatusChange({ bulk: true, ids: changed, to, prev, states, after });
    return changed.length;
  }, [applyMany]);

  // What the UI calls: acts at once, or asks first when the rules say so.
  // `onDone` runs only once the action has actually happened, so cancelling
  // the confirmation leaves the caller's selection as it was.
  const requestBulk = React.useCallback((ids, to, onDone) => {
    const n = bulkTargets(ids, to, statesRef.current).length;
    if (!n) return;
    const run = () => { markMany(ids, to); if (onDone) onDone(); };
    if (n > BULK_CONFIRM_OVER || to === 'none') {
      confirmListeners.forEach((fn) => fn({ n, to, run }));
      return;
    }
    run();
  }, [markMany]);

  // The "What have you seen?" picker (picker.jsx): picks become seen and
  // unticked titles become unseen, as ONE change — one write per title, one
  // announcement, one Undo that restores both. No confirmation: the picker
  // itself is the confirmation and its button names the numbers. The same
  // bulkTargets() rules apply (an unreleased title is never marked seen).
  const applyPicks = React.useCallback((seenIds, unseenIds) => {
    const states = statesRef.current;
    const toSeen = bulkTargets(seenIds || [], 'seen', states);
    const toNone = bulkTargets(unseenIds || [], 'none', states).filter((id) => toSeen.indexOf(id) === -1);
    const changes = {};
    toSeen.forEach((id) => { changes[id] = 'seen'; });
    toNone.forEach((id) => { changes[id] = 'none'; });
    const prev = applyMany(changes);
    if (!prev) return 0;
    const changed = Object.keys(prev);
    const after = { ...states };
    changed.forEach((id) => { if (changes[id] === 'none') delete after[id]; else after[id] = changes[id]; });
    const to = toSeen.length && toNone.length ? 'mixed' : toSeen.length ? 'seen' : 'none';
    emitStatusChange({ bulk: true, ids: changed, to, seenIds: toSeen, unseenIds: toNone, prev, states, after, picker: true });
    return changed.length;
  }, [applyMany]);

  // Undo puts every title back as it was, including a watchlist that a seen
  // mark had replaced. Like the single-title Undo, it announces nothing.
  const undoMany = React.useCallback((prev) => { applyMany(prev); }, [applyMany]);

  // ---- Load + merge on sign-in -------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    const current = () => !cancelled && scopeRef.current === scope;
    writersRef.current = {};
    confirmedRef.current = {};
    setPending({});
    setErrors({});
    setSyncError(null);
    commit({});
    if (mode !== 'account') {
      // Only guest data is read here. Account state is never persisted into it.
      commit(readGuestStates());
      setLoadedScope(scope);
      setRemoteLoading(false);
      return;
    }
    setRemoteLoading(true);

    (async () => {
      try {
        // RLS already restricts this to the caller's rows; the filter is
        // explicit so the intent is readable and the index is used.
        const { data } = await collectionRequest(client.from(TABLE)
          .select('title_id,status')
          .eq('user_id', userId));
        if (!current()) return;

        const remote = {};
        (data || []).forEach((r) => {
          if (r.status === 'seen' || r.status === 'watchlist') remote[r.title_id] = r.status;
        });
        warnUnknownIds(remote);

        const guest = readGuestStates();
        const hasGuestData = Object.keys(guest).length > 0;
        if (!hasGuestData) {
          confirmedRef.current = { ...remote };
          writersRef.current = {};
          commit(remote);
          setLoadedScope(scope);
          return;
        }

        const merged = mergeStates(remote, guest);
        const changed = Object.keys(merged).filter((id) => merged[id] !== remote[id]);
        if (changed.length) {
          await collectionRequest(client.from(TABLE)
            .upsert(changed.map((id) => rowFor(userId, id, merged[id])), { onConflict: 'user_id,title_id' }));
        }
        // Only now — an unconfirmed sync must never destroy the local copy.
        if (!current()) return;
        // Another tab may have edited its guest copy during the request. Keep
        // those newer local changes for the next merge rather than erasing them.
        if (JSON.stringify(readGuestStates()) === JSON.stringify(guest)) clearGuestStates();
        confirmedRef.current = { ...merged };
        writersRef.current = {};
        commit(merged);
        setLoadedScope(scope);
      } catch (e) {
        if (!current()) return;
        console.warn('[mcu] could not load or merge remote collection', e);
        // Guest data is deliberately left in place; the merge retries next
        // sign-in or explicit retry. Editing stays disabled until a load succeeds.
        if (connectionUnavailable(e) && continueAsGuest) {
          continueAsGuest(window.MCU_I18N.tr('error.connection'));
        } else {
          setSyncError((e && e.message) ? e.message : window.MCU_I18N.tr('error.syncFailed'));
        }
      } finally {
        if (current()) setRemoteLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [client, mode, userId, scope, retryCount, commit, continueAsGuest]);

  const retrySync = React.useCallback(() => setRetryCount((n) => n + 1), []);

  // Unreleased titles can be watchlisted and even marked seen, but they never
  // enter the completion ratio in either position.
  const progress = React.useMemo(() => {
    const today = todayISO();
    let releasedTotal = 0;
    let seenReleased = 0;
    let seenTotal = 0;
    let watchlist = 0;
    (window.TITLES || []).forEach((t) => {
      const released = isReleased(t, today);
      if (released) releasedTotal += 1;
      const status = states[t.id];
      if (status === 'seen') {
        seenTotal += 1;
        if (released) seenReleased += 1;
      } else if (status === 'watchlist') {
        watchlist += 1;
      }
    });
    return { releasedTotal, seenReleased, seenTotal, watchlist };
  }, [states]);

  // The catalog renders normally throughout; only the collection controls show
  // a loading treatment, so titles never flash as "unseen" before rows arrive.

  const value = React.useMemo(() => ({
    states,
    loading,
    // The saved collection is in (local, or the account's rows), even if
    // sign-in is still initializing: lists can start animating changes.
    ready: loadedScope === scope && !(mode === 'account' && remoteLoading),
    // Ready, and sign-in has finished deciding: the states are the account's
    // (signed in) or this device's (signed out), never a guest stand-in for an
    // account still restoring. Decisions about the visitor's history (which
    // guide to promote) wait for this.
    settled: loadedScope === scope && !(mode === 'account' && remoteLoading) && authStatus !== 'initializing',
    mode,
    syncError,
    retrySync,
    statusOf: (id) => states[id] || 'none',
    isSeen: (id) => states[id] === 'seen',
    isWatchlisted: (id) => states[id] === 'watchlist',
    pendingOf: (id) => loadedScope === scope && !!pending[id],
    errorOf: (id) => loadedScope === scope ? errors[id] || null : null,
    setStatus,
    toggleSeen,
    toggleWatchlist,
    clearAll,
    requestBulk,
    applyPicks,
    undoMany,
    progress,
  }), [states, loading, mode, authStatus, syncError, retrySync, loadedScope, scope, remoteLoading, pending, errors, setStatus, toggleSeen, toggleWatchlist, clearAll, requestBulk, applyPicks, undoMany, progress]);

  // The live collection for code outside React: the QA checks change it at
  // chosen moments (test-promo marks titles seen while a promotion is pending
  // or on screen) through the same setters the buttons use.
  React.useEffect(() => { window.MCU_COLLECTION = value; }, [value]);

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

function useCollection() {
  const ctx = React.useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection() used outside <CollectionProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Up next: the earliest released title not marked seen
// ---------------------------------------------------------------------------
//
// One rule, shared by every surface and by Guides later. No React and no DOM,
// so it can be checked on its own. `titles` arrive already narrowed to the
// scope (Watchlist, a pinned character, the type/phase/budget filters, or a
// guide). `order` is 'release' or 'chrono', always earliest first, or one of
// the list orders 'title', 'imdb' and 'rt', which follow the list's own
// direction (`dir`): on those, Up next is the first unseen title of the list
// the visitor is looking at (user decision, 2026-10-29).
//
// Returns one of:
//   { kind: 'next', title, rank, released }  rank = place among released titles in scope
//   { kind: 'allSkipped' }                   every candidate was skipped this visit
//   { kind: 'caughtUp', upcoming }           everything out is seen, more is coming
//   { kind: 'notOut', upcoming }             nothing in scope is out yet
//   { kind: 'allSeen' }                      everything seen, nothing coming
//   { kind: 'empty' }                        nothing in scope at all
//
// Released means MCU_isReleased, the same test as the progress count, so the
// two never disagree. Unreleased titles marked seen or watchlisted are simply
// not candidates: they are never suggested and never block "caught up".
function nextUp(titles, statusOf, opts) {
  const o = opts || {};
  const skipped = o.skipped || new Set();
  if (!titles || !titles.length) return { kind: 'empty' };
  const sortBy = window.sortTitles || ((list) => list.slice());
  const listOrder = o.order === 'title' || o.order === 'imdb' || o.order === 'rt';
  // `ordered`: the titles are already in their order (a guide's stops).
  const ordered = o.ordered ? titles.slice() : sortBy(titles, listOrder ? o.order : (o.order === 'chrono' ? 'chrono' : 'release'), listOrder && o.dir === 'desc' ? 'desc' : 'asc');
  const released = ordered.filter((t) => isReleased(t));
  const unseen = released.filter((t) => statusOf(t.id) !== 'seen');
  const pick = unseen.find((t) => !skipped.has(t.id));
  if (pick) return { kind: 'next', title: pick, rank: released.indexOf(pick) + 1, released: released.length };
  if (unseen.length) return { kind: 'allSkipped' };
  // The next arrival goes by release date whatever the order: it is "when",
  // not "where in the story".
  const upcoming = sortBy(titles.filter((t) => !isReleased(t)), 'release', 'asc')[0] || null;
  if (!released.length) return upcoming ? { kind: 'notOut', upcoming } : { kind: 'empty' };
  return upcoming ? { kind: 'caughtUp', upcoming } : { kind: 'allSeen' };
}

// ---------------------------------------------------------------------------
// Collection filter
// ---------------------------------------------------------------------------

const COLLECTION_OPTIONS = [
  ['all', 'All'],
  ['unseen', 'Unseen'],
  ['seen', 'Seen'],
  ['watchlist', 'Watchlist'],
];

// 'unseen' means "not marked seen", so watchlisted titles are still unseen.
function matchesCollection(status, filter) {
  if (filter === 'all') return true;
  if (filter === 'seen') return status === 'seen';
  if (filter === 'watchlist') return status === 'watchlist';
  if (filter === 'unseen') return status !== 'seen';
  return true;
}

// Copy for a list emptied by the collection filter rather than by phase/search.
function collectionEmptyCopy(filter) {
  const tr = window.MCU_I18N.tr;
  if (filter === 'watchlist') {
    return { title: tr('collection.emptyWatchlist'), sub: tr('collection.emptyWatchlistSub') };
  }
  if (filter === 'seen') {
    // Nothing seen yet: offer the picker, to mark several at once.
    const run = window.MCU_openPicker;
    return { title: tr('collection.emptySeen'), sub: tr('collection.emptySeenSub'),
      action: run ? { label: tr('picker.open'), run } : null };
  }
  if (filter === 'unseen') {
    return { title: tr('collection.emptyUnseen'), sub: tr('collection.emptyUnseenSub') };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Status controls
// ---------------------------------------------------------------------------

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>;
}

function BookmarkIcon({ filled }) {
  return <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>;
}

// A dashed ring: "not yet" beside the check for seen.
function UnseenIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3.2 3.2" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/></svg>;
}

// One icon per collection state, used everywhere the states are offered.
function CollectionIcon({ kind }) {
  if (kind === 'seen') return <CheckIcon/>;
  if (kind === 'watchlist') return <BookmarkIcon/>;
  if (kind === 'unseen') return <UnseenIcon/>;
  return null;
}

// All / Unseen / Seen / Watchlist, always visible in the toolbar (desktop) and
// the second header row (mobile) rather than inside Filters. `variant` only
// changes layout: 'toolbar' keeps every label where there is room; 'compact'
// labels just All and the active option, leaving the others as icons.
// Count badge on Seen and Watchlist. Hidden at zero; pops in when it first
// appears and rolls up or down when the number changes. The direction is
// kept until the bump ends (Notion V4 Tasks, "Micro-interaction: the Seen
// check pops in and the counters tick"): worked out afresh on every render,
// it was gone with the next one (the toast, sync) about 20ms in, which cut
// the bump and the roll short.
function CountBadge({ n, kind, appeared }) {
  const [tick, setTick] = React.useState({ n, dir: '' });
  if (tick.n !== n) setTick({ n, dir: n > tick.n ? 'up' : 'down' });
  const dir = tick.n === n ? tick.dir : '';
  return (
    <span key={n} className={`coll-count ${kind}${appeared ? ' new' : ''}${dir ? ' ' + dir : ''}`} aria-hidden="true"
      onAnimationEnd={(e) => { if (e.animationName === 'count-bump') setTick((t) => (t.dir ? { n: t.n, dir: '' } : t)); }}>
      <span className="coll-num">{n}</span>
    </span>
  );
}

/** `short`: the phone row ran out of room, so options with a shorter label
 *  ("Para ver" for "Para assistir") use it, accessible name included. Both
 *  labels are rendered, so the row can measure either before it decides. */
function CollectionSwitch({ value, onChange, variant = 'toolbar', short = false }) {
  const { tr } = window.useI18n();
  const { progress, loading } = useCollection();
  const counts = { seen: loading ? 0 : progress.seenTotal, watchlist: loading ? 0 : progress.watchlist };
  // Counts from the previous render, so a badge that just appeared can pop in
  // (but not on first load).
  const last = React.useRef(null);
  const before = last.current;
  React.useEffect(() => { last.current = loading ? null : counts; });
  return (
    <div className={`coll-switch coll-${variant}`} role="group" aria-label={tr('collection.groupAria')}>
      <window.SegPill value={value}/>
      {COLLECTION_OPTIONS.map(([v]) => {
        const full = tr('collection.' + v);
        const shortL = v === 'watchlist' ? tr('collection.watchlistShort') : full;
        const l = short ? shortL : full;
        const n = counts[v] || 0;
        const label = n ? tr('collection.countAria', { label: l, n }) : l;
        return (
        <button key={v} className={value === v ? 'on' : ''} aria-pressed={value === v}
          aria-label={label} title={label} onClick={() => onChange(v)}>
          {v !== 'all' && <span className="coll-ic"><CollectionIcon kind={v}/></span>}
          <span className="coll-label">
            {shortL === full ? full : <><span className="cl-full">{full}</span><span className="cl-short">{shortL}</span></>}
          </span>
          {n > 0 && <CountBadge n={n} kind={v} appeared={!!before && !before[v]}/>}
        </button>
        );
      })}
    </div>
  );
}

// Toggles, not checkboxes — so <button aria-pressed> rather than <input>.
//
// `variant` is 'overlay' (icon-only, sits on a poster) or 'inline' (icon plus
// text label, for drawers and sheets where there is room).
function TitleStatusActions({ title, variant, className }) {
  const { states, statusOf, pendingOf, errorOf, toggleSeen, toggleWatchlist, loading } = useCollection();
  // The button just switched on pops (CSS), until its animation ends.
  const [pop, setPop] = React.useState(null);
  const status = statusOf(title.id);
  const seen = status === 'seen';
  const listed = status === 'watchlist';
  // `busy` is a write in flight — deliberately NOT disabling, because the write
  // queue exists precisely so that toggling faster than the network settles on
  // the right value. `loading` is the initial load, where the state genuinely
  // isn't known yet, so the controls are inert until it resolves.
  const busy = pendingOf(title.id);
  const error = errorOf(title.id);
  const inline = variant === 'inline';
  // Not out yet (and not within a week of release): no Seen button, only the
  // Watchlist one. A title already marked seen keeps it, so it can be
  // unmarked. Overlays keep the empty slot so rows and cards don't shift.
  const offerSeen = seen || canMarkSeen(title);

  // The desktop Card starts a drag on mousedown and then decides "was that a
  // click?" by comparing mousedown/click coordinates. Stopping only the click
  // would still leave the card being dragged out from under the pointer, so
  // both have to be swallowed. Touch is stopped too, because the spatial
  // viewport begins a pan from touchstart.
  const swallow = (e) => { e.stopPropagation(); };
  // The saving spinner sits on the corner of the button just pressed (or the
  // first button while the collection loads) instead of after the buttons,
  // where it took room and pushed them aside while a signed-in mark was being
  // saved (Notion V4 Tasks, "Signed in: marking a title briefly pushes the
  // Seen / Watchlist buttons left").
  const [lastKind, setLastKind] = React.useState(null);
  const act = (fn, kind) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    const from = statusOf(title.id);
    const on = kind === 'seen' ? 'seen' : 'watchlist';
    const to = from === on ? 'none' : on;
    fn(title.id);
    setPop(to === 'none' ? null : kind);
    setLastKind(kind);
    emitStatusChange({ title, from, to, states });
  };

  const firstKind = offerSeen ? 'seen' : 'watch';
  const pressed = lastKind === 'watch' || (lastKind === 'seen' && offerSeen) ? lastKind : firstKind;
  const spinOn = busy ? pressed : loading ? firstKind : null;
  const cls = [
    'tsa',
    inline ? 'inline' : 'overlay',
    loading ? 'loading' : '',
    busy ? 'busy' : '',
    error ? 'has-error' : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onMouseDown={swallow} onClick={swallow} onTouchStart={swallow}
         title={error ? window.MCU_I18N.tr('status.notSaved', { error }) : undefined}>
      {!offerSeen && !inline && <span className="tsa-btn seen tsa-gap" aria-hidden="true"/>}
      {offerSeen && <button
        type="button"
        className={`tsa-btn seen${seen ? ' on' : ''}${pop === 'seen' ? ' pop' : ''}`}
        onAnimationEnd={(e) => { if (e.animationName === 'tsa-ring') setPop(null); }}
        disabled={loading}
        aria-busy={loading || busy}
        aria-pressed={loading ? undefined : seen}
        aria-label={window.MCU_I18N.tr(loading ? 'status.loadingSeen' : seen ? 'status.unmarkSeenAria' : 'status.markSeenAria', { title: window.MCU_I18N.titleName(title) })}
        title={window.MCU_I18N.tr(seen ? 'status.markedSeen' : 'status.markSeenTip')}
        onMouseDown={swallow}
        onClick={act(toggleSeen, 'seen')}
      >
        <CheckIcon/>
        {spinOn === 'seen' && <span className="tsa-spin" aria-hidden="true"/>}
        {inline && <span className="tsa-lab">{window.MCU_I18N.tr(seen ? 'status.seen' : 'status.markSeen')}</span>}
      </button>}
      <button
        type="button"
        className={`tsa-btn watch${listed ? ' on' : ''}${pop === 'watch' ? ' pop' : ''}`}
        onAnimationEnd={(e) => { if (e.animationName === 'tsa-ring') setPop(null); }}
        disabled={loading}
        aria-busy={loading || busy}
        aria-pressed={loading ? undefined : listed}
        aria-label={window.MCU_I18N.tr(loading ? 'status.loadingWatch' : listed ? 'status.removeWatchAria' : 'status.addWatchAria', { title: window.MCU_I18N.titleName(title) })}
        title={window.MCU_I18N.tr(listed ? 'status.onWatchTip' : 'status.addWatchTip')}
        onMouseDown={swallow}
        onClick={act(toggleWatchlist, 'watch')}
      >
        <BookmarkIcon filled={listed}/>
        {spinOn === 'watch' && <span className="tsa-spin" aria-hidden="true"/>}
        {inline && <span className="tsa-lab">{window.MCU_I18N.tr(listed ? 'status.onWatch' : 'status.watchlist')}</span>}
      </button>
      {/* The overlay variant has no room for a message; it carries the red
          treatment plus a tooltip, and the drawer/sheet spells it out. */}
      {error && inline && <span className="tsa-err" role="status">{window.MCU_I18N.tr('status.notSaved', { error })}</span>}
      {error && !inline && <span className="tsa-bang" role="status" aria-label={window.MCU_I18N.tr('status.notSaved', { error })}>!</span>}
    </div>
  );
}

// Non-interactive marker. Used where the controls themselves are too small to
// hit (deep zoom on the spatial canvas) but the state still needs to read.
function SeenMarker({ seen }) {
  if (!seen) return null;
  return <span className="seen-marker" title={window.MCU_I18N.tr('status.seen')} aria-hidden="true"><CheckIcon/></span>;
}

Object.assign(window, {
  CollectionProvider,
  useCollection,
  TitleStatusActions,
  SeenMarker,
  matchesCollection,
  collectionEmptyCopy,
  COLLECTION_OPTIONS,
  CollectionIcon,
  CollectionSwitch,
  releasedCount,
  todayISO,
  onStatusChange,
  CheckIcon,
  BookmarkIcon,
  MCU_isReleased: (title) => isReleased(title),
  MCU_canMarkSeen: (title) => canMarkSeen(title),
  MCU_bulkTargets: bulkTargets,
  MCU_nextUp: nextUp,
  onBulkConfirm,
  TSA_MIN_SCALE,
});

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { CollectionProvider, useCollection, TitleStatusActions, SeenMarker,
  matchesCollection, collectionEmptyCopy, COLLECTION_OPTIONS, CollectionIcon,
  CollectionSwitch, releasedCount, todayISO, onStatusChange, CheckIcon,
  BookmarkIcon, bulkTargets as MCU_bulkTargets, nextUp as MCU_nextUp,
  onBulkConfirm, TSA_MIN_SCALE };
