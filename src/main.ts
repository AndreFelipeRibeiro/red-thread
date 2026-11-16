// The app's bundled entry, introduced by Phase 2 step 2/3 of docs/V4-PLAN.md.
//
// These modules are imported for their side effects on purpose. Each one still
// publishes its data on `window` exactly as it did when index.html loaded it as
// a classic script, because every reader is still a `.jsx` file compiled by
// Babel in the browser. Changing the delivery (a bundle instead of five script
// tags) and the sharing mechanism (imports instead of globals) at the same time
// would be two changes at once, and the regression could not tell which one
// caused a failure. The exports come later, per file, as each reader converts.
//
// Those same `window` names are also what 15 of the QA checks read inside the
// page (docs/V4-PLAN.md §5.3): the documented test surface. It is deliberate
// and unconditional, not a leftover.
//
// i18n.js stays a classic script because the startup screen has to speak the
// visitor's language before the bundle arrives, and its useI18n() hook calls
// React.useSyncExternalStore as a global — which it got from the CDN UMD build
// until this commit. It runs at render time, long after this line.
import React from 'react';
window.React = React;

// The design system: Tailwind, the token file and the theme. Nothing in the app
// reads them yet — V3's stylesheets still paint every surface, and win over
// everything in this file because they are unlayered — so loading them changes
// nothing visible. Each Phase 4 surface ticket starts using them.
import './index.css';
import { startTheme } from './theme';
// The pre-paint script already set the class; this keeps it following the
// system, or the visitor's override, from here on.
startTheme();

// Order matters and matches the order index.html used:
import './config';          // window.MCU_CONFIG, read by supabase-client
import './supabase-client'; // window.mcuSupabase, window.MCU_SUPABASE_STATUS
import './data/data';       // window.TITLES, CHARACTERS, BUDGETS, ratings, credits
import './data/guides';     // window.GUIDES, window.CONTINUITY
import './data/media-data'; // window.MEDIA, window.mediaURL

// The app itself: every view and component, in the order index.html loaded
// them as `text/babel` scripts. They are imported for their side effects for
// the same reason the data above is, and the comment at the top of this file
// applies unchanged — each file still publishes its components on `window`,
// and its readers still pick them up from there.
//
// All thirteen had to convert in one step rather than one at a time as
// docs/V4-PLAN.md §3.3 planned, because React cannot be split across the two
// loading paths: a component from the bundled copy calling a hook inside a
// tree rendered by the CDN UMD copy reads that copy's null dispatcher and
// throws. docs/V4-PLAN.md §5.7.
import './app/poster';
import './app/seg-pill';  // the sliding selection in segmented groups
import './app/tracking';
// Share (V4): the one share helper and button, used by the views below.
import './app/share';
import './app/share-image'; // the share card (Share 2/3), drawn on demand
import './app/celebrate';
import './app/account';
import './app/about';
import './app/search-suggest';
import './app/mobile';
import './app/theme-lab'; // the dev-only Theme lab (renders nothing in production)
import './app/desktop-list';
import './app/upnext';
import './app/watch';
import './app/guides-ui';
import './app/picker';
// Settings (V4): the first surface built from the shadcn components. After
// watch and guides-ui, whose region and guide stores it drives.
import './app/settings';
import './app/header-controls'; // Order, View and the collection switch (shadcn pass 1/5)
import './app/phone-header';    // the phone header, sort bar and Filters sheet (shadcn pass 1/5)
import './app/status-actions'; // Seen / Watchlist, on the design system (shadcn pass 2/5)
import './app/spatial-card';
import './app/spatial-chrome';
import './app/title-details'; // the details drawer and phone sheet, on the design system (shadcn pass 3/5) // zoom, band labels, meter, empty note, thread tooltip (shadcn pass 2/5) // the Spatial card, on the design system (shadcn pass 2/5)
import './app/toolbar';  // the desktop toolbar, on the design system (shadcn pass 1/5)
// Last, and it must stay last: this one mounts the app, so everything it
// renders has to be on `window` by the time it runs.
import './app/app';
