// @ts-nocheck — not yet converted. See docs/V4-PLAN.md §3.1 and the Notion
// ticket "Convert the app to TypeScript": this file is renamed and inside the
// type-checked project, but still has 52 errors under `strict`, almost all of
// them component props and callback parameters that need real types rather
// than `any`. Delete this line and type the file; the shared surface it reads
// is already typed in src/types/globals.d.ts, so the errors it reports are the
// real ones.
import React from 'react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// The account menu, its phone sheet, the app bar's avatar button and the sync
// status, on the design system since Notion "shadcn pass 5/5" (this file is
// listed with `@source` in src/index.css). The desktop menu is shadcn's Popover (it
// closes on Escape or a click outside and returns focus to Account), its
// contents Buttons on the panel. Hook classes kept for the app and the QA
// checks: `acct-*`, `sync-*`, `m-acct`, `coll-ic`, `signed-in`, `open`.
const DIM = 'text-(--dim)';
const XS = 'text-caption';
const SPIN = 'border-2 border-input border-t-muted-foreground animate-[tsa-spin_700ms_linear_infinite] motion-reduce:animate-none';

// Auth state machine, session provider and account surfaces.
//
// There is no router in this app and V3 does not add one: sign-in is a full
// redirect to Google that lands back on index.html, where supabase-js completes
// the code exchange itself (detectSessionInUrl). The account UI reuses the
// existing popover (desktop) and Sheet (mobile) idioms.

// If session restoration hasn't resolved by this point, stop waiting and run as
// a guest. Supabase pauses free-tier projects after about a week of inactivity,
// so an unreachable backend is an expected state, not an exceptional one.
const AUTH_TIMEOUT_MS = 5000;

const AccountContext = React.createContext(null);

// Removes the OAuth leftovers from the address bar once the exchange is done,
// so a reload isn't messy and the code isn't sitting in history.
function stripAuthParams() {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    ['code', 'state', 'error', 'error_code', 'error_description'].forEach((k) => {
      if (url.searchParams.has(k)) { url.searchParams.delete(k); changed = true; }
    });
    if (url.hash && /access_token|refresh_token|error/.test(url.hash)) { url.hash = ''; changed = true; }
    if (changed) {
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }
  } catch (e) { /* a tidy URL is not worth a crash */ }
}

function readOAuthError() {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('error_description') || p.get('error') || null;
  } catch (e) { return null; }
}

function profileOf(user) {
  if (!user) return null;
  const m = user.user_metadata || {};
  const name = m.full_name || m.name || m.preferred_username || null;
  const email = user.email || m.email || null;
  return {
    name: name || email || window.MCU_I18N.tr('account.signedIn'),
    email,
    avatar: m.avatar_url || m.picture || null,
    initials: (name || email || '?').trim().slice(0, 1).toUpperCase(),
  };
}

// States: initializing | signed_out | signing_in | signed_in | error
function AccountProvider({ children }) {
  const client = window.mcuSupabase;
  // With no client there is nothing to restore, so never show a loading state.
  const [status, setStatus] = React.useState(client ? 'initializing' : 'signed_out');
  const [user, setUser] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [syncAvailable, setSyncAvailable] = React.useState(!!client);
  const [offlineReason, setOfflineReason] = React.useState(null);
  const offlineRef = React.useRef(false);
  const attemptRef = React.useRef(0);
  const continueAsGuest = React.useCallback((reason) => {
    offlineRef.current = true;
    attemptRef.current += 1;
    setOfflineReason(reason || window.MCU_I18N.tr('error.connection'));
    setUser(null);
    setSyncAvailable(false);
    setStatus('signed_out');
  }, []);

  React.useEffect(() => {
    if (!client) return;
    let settled = false;
    let active = true;
    let sub;

    const oauthError = readOAuthError();
    if (oauthError) setError(oauthError);

    const settle = () => {
      settled = true;
      clearTimeout(timer);
    };
    const applySession = (session) => {
      if (offlineRef.current) return;
      attemptRef.current += 1;
      const nextUser = session && session.user;
      setUser(nextUser || null);
      setStatus(nextUser ? 'signed_in' : 'signed_out');
      setSyncAvailable(true);
      if (nextUser) setError(null);
      stripAuthParams();
    };
    const unavailable = () => {
      settle();
      continueAsGuest(window.MCU_I18N.tr('error.restore'));
    };
    const timer = setTimeout(() => {
      if (!active || settled) return;
      console.warn('[mcu] session restore timed out; running as guest');
      unavailable();
    }, AUTH_TIMEOUT_MS);

    try {
      // Subscribe first. An auth event is newer than the initial getSession
      // snapshot: cancel its timeout and ignore its eventual stale result.
      const res = client.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (!['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(event)) return;
        // A late initial snapshot must not overwrite a newer auth event or
        // the deliberate guest fallback after a timeout.
        if (event === 'INITIAL_SESSION' && settled) return;
        settle();
        applySession(event === 'SIGNED_OUT' ? null : session);
      });
      sub = res && res.data && res.data.subscription;

      Promise.resolve(client.auth.getSession()).then(({ data, error: err }) => {
        if (!active || settled) return;
        settle();
        if (err) { unavailable(); return; }
        applySession(data && data.session);
      }).catch(() => {
        if (active && !settled) unavailable();
      });
    } catch (e) {
      if (!settled) unavailable();
    }

    return () => {
      active = false;
      settle();
      if (sub) sub.unsubscribe();
    };
  }, [client, continueAsGuest]);

  // If the user starts Google sign-in and then backs out, they come back to a
  // page still sitting in 'signing_in'. Re-check on return so there is no
  // spinner stuck forever waiting for a redirect that is not coming.
  React.useEffect(() => {
    if (status !== 'signing_in' || !client) return;
    let active = true;
    let timer;
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      const attempt = attemptRef.current;
      const finish = (session) => {
        if (!active || attemptRef.current !== attempt) return;
        clearTimeout(timer);
        setUser(session ? session.user : null);
        setStatus(session ? 'signed_in' : 'signed_out');
      };
      timer = setTimeout(() => finish(null), AUTH_TIMEOUT_MS);
      Promise.resolve(client.auth.getSession()).then(({ data }) => {
        finish(data && data.session);
      }).catch(() => finish(null));
    };
    window.addEventListener('pageshow', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('pageshow', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [status, client]);

  const signIn = React.useCallback(async () => {
    if (!client) return;
    setError(null);
    setStatus('signing_in');
    const attempt = ++attemptRef.current;
    const timer = setTimeout(() => {
      if (attemptRef.current !== attempt) return;
      attemptRef.current += 1;
      setError(window.MCU_I18N.tr('error.signIn'));
      setStatus('error');
    }, AUTH_TIMEOUT_MS);
    try {
      // The home page, as always: since Findability 3 the path can name a
      // guide or title, and sign-in returns only to addresses Supabase allows.
      const redirectTo = window.location.origin + '/';
      const { error: err } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      // Plain words on screen; the technical detail goes to the console
      // (Notion "Take the collection filters out of the Account menu").
      if (err && attemptRef.current === attempt) { console.warn('Sign-in failed:', err.message); setError(window.MCU_I18N.tr('error.signIn')); setStatus('error'); }
    } catch (e) {
      if (attemptRef.current === attempt) {
        console.warn('Sign-in failed:', e && e.message);
        setError(window.MCU_I18N.tr('error.signIn'));
        setStatus('error');
      }
    } finally {
      clearTimeout(timer);
    }
  }, [client]);

  const signOut = React.useCallback(async () => {
    if (!client) return;
    setError(null);
    try {
      const { error: err } = await client.auth.signOut({ scope: 'local' });
      if (err) throw err;
      setUser(null);
      setStatus('signed_out');
    } catch (e) {
      // The SDK may still have a persisted session on failure. Do not claim
      // sign-out succeeded or switch account data into guest mode.
      setError(window.MCU_I18N.tr('error.signOut'));
    }
  }, [client]);

  const value = React.useMemo(() => ({
    status,
    user,
    profile: profileOf(user),
    error,
    syncAvailable,
    continueAsGuest,
    unavailableReason: offlineReason || (window.MCU_SUPABASE_STATUS && window.MCU_SUPABASE_STATUS.reason) || null,
    isSignedIn: status === 'signed_in',
    signIn,
    signOut,
  }), [status, user, error, syncAvailable, offlineReason, continueAsGuest, signIn, signOut]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

function useAccount() {
  const ctx = React.useContext(AccountContext);
  if (!ctx) throw new Error('useAccount() used outside <AccountProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function Avatar({ profile, size }) {
  const px = size || 28;
  const style = { width: px + 'px', height: px + 'px' };
  if (profile && profile.avatar) {
    return <img className="acct-avatar block shrink-0 rounded-full bg-muted object-cover" style={style} src={profile.avatar} alt="" referrerPolicy="no-referrer"/>;
  }
  return <span className={cn('acct-avatar fallback flex shrink-0 items-center justify-center rounded-full bg-muted text-label font-semibold', DIM)} style={style} aria-hidden="true">{profile ? profile.initials : '?'}</span>;
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="15" height="15" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.16-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/>
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z"/>
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/>
    </svg>
  );
}

// The body shared by the desktop popover and the mobile sheet, so the two can
// never drift apart in what they say about the same account.
// The picker's icon: a grid of posters with a check.
function PickIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="m14 17.2 2.2 2.2 4-4.4"/>
    </svg>
  );
}

const STAT = 'acct-stat flex-1 rounded-lg bg-muted px-2.5 py-[9px]';
const STAT_N = 'block text-title font-bold tabular-nums';
const STAT_L = 'mt-0.5 block text-label leading-[1.3] text-muted-foreground';
const LINK = 'h-8 px-2.5 text-body font-medium in-[.m-sheet]:h-auto in-[.m-sheet]:min-h-[max(38px,2.375rem)] in-[.m-sheet]:px-3 in-[.m-sheet]:text-label';
const COLL_IC = 'coll-ic inline-flex size-[13px] flex-[0_0_13px] [&_svg]:size-full';
const ACTION = 'acct-action h-9 w-full text-label font-medium in-[.m-sheet]:h-auto in-[.m-sheet]:min-h-[max(46px,2.875rem)] in-[.m-sheet]:text-body';
const ERROR = cn('acct-error rounded-lg border border-(--destructive-border) bg-(--destructive-tint) px-[9px] py-2 leading-[1.4] text-destructive', XS);

// The Account menu holds only account things: who is signed in, the
// collection's totals and Share, sync status, and the account actions (Notion
// "Take the collection filters out of the Account menu"). Showing Unseen,
// Seen or Watchlist is My list's collection tabs' job, and "Mark what you've
// seen" sits beside them.
function AccountPanel({ onClose, onAbout }) {
  const { tr } = window.useI18n();
  const { status, profile, error, syncAvailable, signIn, signOut } = useAccount();
  const { progress, loading: collectionLoading, syncError, retrySync } = window.useCollection();
  const signedIn = status === 'signed_in';

  return (
    <div className="acct-panel flex flex-col gap-[13px] text-body in-[.m-sheet]:gap-[15px]">
      {signedIn && profile ? (
        <div className="acct-id flex items-center gap-[11px]">
          <Avatar profile={profile} size={40}/>
          <div className="acct-id-text min-w-0">
            <div className="acct-name truncate text-body font-medium">{profile.name}</div>
            {profile.email && <div className="acct-email mt-0.5 truncate text-label text-muted-foreground">{profile.email}</div>}
          </div>
        </div>
      ) : (
        <div className="acct-id guest flex items-center gap-[11px]">
          <div className="acct-id-text min-w-0">
            <div className="acct-name truncate text-body font-medium">{tr('account.notSignedIn')}</div>
            <div className="acct-email mt-0.5 text-label text-muted-foreground">
              {tr(syncAvailable ? 'account.savedSync' : 'account.savedNoSync')}
            </div>
          </div>
        </div>
      )}

      {collectionLoading ? <div className="acct-note text-label leading-[1.45] text-muted-foreground" role="status">{tr(syncError ? 'account.collectionUnavailable' : 'account.loading')}</div> : (
      <div className="acct-stats flex gap-2.5">
        <div className={STAT}>
          <b className={STAT_N}>{progress.seenReleased}</b>
          <span className={STAT_L}>{tr('account.seenStat', { total: progress.releasedTotal })}</span>
        </div>
        <div className={STAT}>
          <b className={STAT_N}>{progress.watchlist}</b>
          <span className={STAT_L}>{tr('account.watchStat')}</span>
        </div>
      </div>
      )}
      {/* Share my progress (Notion "Share 1/3"): only once there is some. */}
      {!collectionLoading && progress.seenReleased > 0 && (
        <window.ShareButton className="acct-share -mt-0.5 h-auto min-h-[max(36px,2.25rem)] w-full py-1.5 leading-[1.25]" text={tr('share.progressLabel')} label={tr('share.progressLabel')}
          payload={() => ({ text: tr('share.progressText', { n: progress.seenReleased, total: progress.releasedTotal }) })}
          onShare={() => { if (onClose) onClose(); window.MCU_SHARE_IMAGE.progress(progress.seenReleased, progress.releasedTotal); }}/>
      )}

      {syncError && (
        <div className={ERROR} role="status">
          {tr('account.syncErrorPlain')}
          <Button variant="outline" className={cn(ACTION, 'mt-2')} onClick={retrySync}>{tr('account.retrySync')}</Button>
        </div>
      )}

      {error && <div className={ERROR} role="status">{error}</div>}

      {!syncAvailable && (
        <div className="acct-note text-label leading-[1.45] text-muted-foreground">
          {tr('account.unavailable', { reason: '' })}
          {window.mcuSupabase && <Button variant="outline" className={cn(ACTION, 'mt-2')} onClick={() => window.location.reload()}>{tr('account.retryConnection')}</Button>}
        </div>
      )}

      {syncAvailable && (
        signedIn
          ? <Button variant="outline" className={ACTION} onClick={signOut}>{tr('account.signOut')}</Button>
          : (
            <Button className={cn(ACTION, 'primary')} onClick={signIn} disabled={status === 'initializing' || status === 'signing_in'}>
              <GoogleMark/>
              {tr(status === 'initializing' ? 'account.checking' : status === 'signing_in' ? 'account.opening' : 'account.signInGoogle')}
            </Button>
          )
      )}

      {/* App-level links, for guests too. A future Settings entry joins About here. */}
      {onAbout && (
        <div className="acct-foot mt-0.5 flex gap-1.5 border-t pt-2.5">
          <Button variant="ghost" className={cn('acct-foot-link h-auto gap-[7px] px-0.5 py-1 text-label font-normal hover:bg-transparent hover:text-foreground in-[.m-sheet]:min-h-[max(40px,2.5rem)] in-[.m-sheet]:text-body', DIM)} onClick={() => { if (onClose) onClose(); onAbout(); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/></svg>
            {tr('about.link')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sync state, outside Account
// ---------------------------------------------------------------------------

// A failed collection load used to be visible only inside the Account panel,
// so a signed-in visitor browsed on with editing silently paused and no way
// back without opening a menu. This surfaces the state where they already are,
// and carries the Retry with it.
//
// It takes space only when something needs attention — a failure, or an
// account load in progress. Working sync and guest storage are reported to
// assistive technology and nothing more: a permanent "all fine" chip is noise
// for everyone, and the Sign in button already says who you are.
function SyncStatus() {
  const { tr } = window.useI18n();
  const { loading, syncError, retrySync, mode } = window.useCollection();
  const state = syncError ? 'failed'
    : (mode === 'account' && loading) ? 'loading'
    : mode === 'account' ? 'synced' : 'guest';
  if (state === 'synced' || state === 'guest') {
    return <span className="story-sr" role="status">{tr('sync.' + state)}</span>;
  }
  return (
    <div role="status" className={cn('sync-status inline-flex shrink-0 items-center gap-[7px] rounded-md border border-transparent px-[9px] py-1.5 leading-none max-[899px]:gap-[5px] max-[899px]:px-[7px] max-[899px]:py-[5px]', XS, state,
      state === 'failed' ? 'border-(--destructive-border) bg-(--destructive-tint) text-destructive' : DIM)}>
      <span className={cn('sync-dot size-[11px] shrink-0 rounded-full', state === 'failed' ? 'bg-destructive' : SPIN)} aria-hidden="true"/>
      {/* On a phone "Syncing…" leaves its words to the spinner (clipped, so a
          screen reader still reads them); a failure keeps its words. */}
      <span className={cn('sync-text', state === 'loading' && 'max-[899px]:sr-only')}>{tr('sync.' + state)}</span>
      {state === 'failed' && (
        <Button variant="outline" size="xs" className={cn('sync-retry h-auto border-(--destructive-border) bg-transparent px-2 py-[3px] whitespace-nowrap text-foreground hover:border-destructive', XS)} onClick={retrySync}>{tr('account.retrySync')}</Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop — a compact control at the right edge of tb-row
// ---------------------------------------------------------------------------

function AccountButton({ onAbout }) {
  const { status, profile, syncAvailable } = useAccount();
  const [open, setOpen] = React.useState(false);
  const signedIn = status === 'signed_in';
  // Read the desktop label from the live profile. Keep email in the account
  // panel rather than using it as the compact navigation label.
  const { tr } = window.useI18n();
  const accountName = profile?.name && profile.name !== profile.email ? profile.name : tr('account.title');
  const visibleLabel = signedIn ? accountName
    : status === 'signing_in' ? tr('account.signingIn')
    : status === 'initializing' || !syncAvailable ? tr('account.title') : tr('account.signIn');
  const label = signedIn && profile
    ? tr('account.named', { name: profile.name })
    : tr(syncAvailable ? 'account.signInGoogle' : 'account.noSync');

  return (
    <div className="acct-wrap relative ml-auto shrink-0">
      <Popover open={open} onOpenChange={setOpen}>
        {/* Below 1100px, or at the header row's fit step 2 (toolbar.tsx), the
            pill keeps its icon; the name stays in the tooltip and aria-label. */}
        <PopoverTrigger aria-label={label} title={label}
          className={cn(buttonVariants({ variant: 'outline' }),
            'acct-pill relative h-[max(44px,2.75rem)] max-w-44 min-w-24 gap-2 px-3 font-medium max-[1100px]:min-w-0 max-[1100px]:px-2.5 group-data-[fit=2]/toprow:min-w-0 group-data-[fit=2]/toprow:px-2.5 group-data-[fit=3]/toprow:min-w-0 group-data-[fit=4]/toprow:min-w-0 group-data-[fit=3]/toprow:px-2.5 group-data-[fit=4]/toprow:px-2.5',
            open && 'open bg-(--field-hover)', signedIn && 'signed-in')}>
          {status === 'initializing'
            ? <span className={cn('acct-dot loading block size-[13px] shrink-0 rounded-full', SPIN)} aria-hidden="true"/>
            : signedIn
              ? <Avatar profile={profile} size={26}/>
              : <PersonIcon/>}
          <span className="acct-nav-label min-w-0 truncate text-label max-[1100px]:hidden group-data-[fit=2]/toprow:hidden group-data-[fit=3]/toprow:hidden group-data-[fit=4]/toprow:hidden">{visibleLabel}</span>
          {!syncAvailable && status !== 'initializing' && <span className="acct-off absolute right-[3px] bottom-[3px] size-2 rounded-full border-2 border-background bg-muted-foreground" aria-hidden="true"/>}
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={9} className="acct-pop w-[268px] gap-0 p-3.5" aria-label={tr('account.title')}>
          <AccountPanel onClose={() => setOpen(false)} onAbout={onAbout}/>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile — avatar in the app bar, panel in a Sheet
// ---------------------------------------------------------------------------

function AccountAvatarButton({ onOpen }) {
  const { status, profile, syncAvailable } = useAccount();
  const signedIn = status === 'signed_in';
  return (
    <Button variant="outline" size="icon"
      className={cn('m-acct relative size-[max(40px,2.5rem)] flex-none text-muted-foreground transition-[scale,background-color,color,border-color] duration-150 active:not-disabled:scale-92 motion-reduce:active:scale-100 [:root.reduce-motion_&]:active:scale-100', signedIn && 'signed-in border-input')}
      onClick={onOpen}
      aria-label={signedIn && profile ? window.MCU_I18N.tr('account.named', { name: profile.name }) : window.MCU_I18N.tr('account.title')}
    >
      {status === 'initializing'
        ? <span className={cn('acct-dot loading block size-[13px] shrink-0 rounded-full', SPIN)} aria-hidden="true"/>
        : signedIn
          ? <Avatar profile={profile} size={30}/>
          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>}
      {!syncAvailable && <span className="m-acct-off absolute right-px bottom-px size-[9px] rounded-full border-2 border-background bg-muted-foreground" aria-hidden="true"/>}
    </Button>
  );
}

function AccountSheet({ onClose, onAbout }) {
  const Sheet = window.Sheet;
  return (
    <Sheet onClose={onClose} label={window.MCU_I18N.tr('account.title')}>
      <div className="m-sh-head mb-4 flex items-center justify-between">
        <div className="m-sh-title text-title font-semibold tracking-tight">{window.MCU_I18N.tr('account.title')}</div>
      </div>
      <AccountPanel onClose={onClose} onAbout={onAbout}/>
    </Sheet>
  );
}

Object.assign(window, {
  AccountProvider,
  useAccount,
  AccountButton,
  AccountAvatarButton,
  SyncStatus,
  AccountSheet,
  AccountPanel,
  GoogleMark,
  MCU_AUTH_CONTEXT: AccountContext,
});

// Exported so the shared `window` surface can be typed from the real
// implementations rather than a second, drifting copy of their signatures
// (src/types/globals.d.ts). The window publication above stays: it is what
// every reader and 15 of the QA checks still use. docs/V4-PLAN.md §5.3.
export { AccountProvider, useAccount, AccountButton, AccountAvatarButton,
  SyncStatus, AccountSheet, AccountPanel, GoogleMark,
  AccountContext as MCU_AUTH_CONTEXT };
