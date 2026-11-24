// Vercel Web Analytics (Notion "Analytics: Vercel Web Analytics on
// production", Andre, 2026-11-18): page views, referrers, countries and
// devices, with no cookies, so no consent banner greets a first visit.
//
// - Production only (redthread.tv). Previews, localhost and the QA server
//   load nothing, so staging and the checks never count as visits and never
//   ask for a script that isn't there.
// - The app keeps its state in the address (?title=, ?char=, ?explore=…) and
//   rewrites it as you browse. Each page view keeps only the parts that say
//   where a visit landed: an open guide, the view, and a `ref` a post's link
//   can carry (?guide=before-doomsday&ref=linkedin). A view whose kept
//   address matches the last one sent is dropped, so opening titles doesn't
//   spend the plan's monthly events.
// - What is measured is listed in docs/PRIVACY-REVIEW.md.
import { inject } from '@vercel/analytics';
import { parseThingPath, stateParams } from '@/share-card/addresses';

const KEEP = ['guide', 'view', 'ref'];

/** The address a page view reports: path plus the kept parameters. */
export function analyticsURL(href: string): string {
  const u = new URL(href);
  // Since Findability 3 the guide, title or character is in the path
  // (/guides/<id>): read it back as a query and report the home page, so a
  // view is reported exactly as before (and a title still isn't).
  const q = stateParams(u.pathname, u.search);
  const kept = new URLSearchParams();
  KEEP.forEach((k) => { const v = q.get(k); if (v) kept.set(k, v); });
  if (parseThingPath(u.pathname)) u.pathname = '/';
  u.search = kept.toString();
  u.hash = '';
  return u.toString();
}

export function startAnalytics(): void {
  if (location.hostname !== 'redthread.tv') return;
  let last: string | null = null;
  inject({
    mode: 'production',
    beforeSend: (event) => {
      const url = analyticsURL(event.url);
      if (event.type === 'pageview') {
        if (url === last) return null;
        last = url;
      }
      return { ...event, url };
    },
  });
}
