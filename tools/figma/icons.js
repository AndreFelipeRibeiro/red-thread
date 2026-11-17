// The app's icons, one entry per drawing (24×24 viewBox, stroked with
// currentColor): lucide's where the app uses lucide, the app's own otherwise.
// The Figma file's Icons page has a component per entry ("icon/<name>"), and
// capture-dom.js swaps an svg it recognizes for an instance of it.
export const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M14 6h7M14 12h5M14 18h3"/>',
  'sort-flip': '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>',
  filters: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-next': '<path d="m9 6 6 6-6 6"/>',
  seen: '<path d="m4.5 12.5 5 5 10-11"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-about': '<path d="m5 12.5 4.2 4.2L19 7"/>',
  watchlist: '<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>',
  unseen: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.2 3.2"/>',
  'mark-seen': '<path d="m12 15 2 2 4-4"/><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  pick: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="m14 17.2 2.2 2.2 4-4.4"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  person: '<circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  connections: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.4 6.5 15.6 7.5M7 8.4 9.2 15.6M16.5 10.1 11.6 16.2"/>',
  about: '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="M8.2 8.3 10.6 15M15.8 8.3 13.4 15M8.5 7h7"/>',
  hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  share: '<path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  guide: '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M7 19h7a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h7"/>',
  skip: '<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>',
  nudge: '<rect x="2.5" y="4.5" width="13" height="9.5" rx="1.5"/><path d="M6 18h6M9 14v4"/><rect x="16.5" y="8.5" width="5" height="11" rx="1.2"/><path d="M18.6 17.2h.8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
};

// An icon's geometry, order-free: every drawing attribute, with each path
// split into its subpaths, sorted (lucide and the app draw the same shapes in
// different orders).
const KEY = (inner) => {
  const parts = [];
  for (const m of inner.replace(/\s+/g, ' ').matchAll(/\b(d|r|cx|cy|x|y|x1|x2|y1|y2|width|height|rx)="([^"]+)"/g)) {
    if (m[1] === 'd') parts.push(...m[2].split(/(?=[Mm])/).map((x) => 'd:' + x.trim()));
    else parts.push(m[1] + ':' + m[2]);
  }
  return parts.sort().join('|');
};
const BY_KEY = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [KEY(v), k]));

/** The icon name for an svg element's drawing, or null. */
export function iconName(svg) {
  return BY_KEY[KEY(svg.innerHTML)] || null;
}
