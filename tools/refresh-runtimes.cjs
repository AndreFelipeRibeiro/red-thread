// Refreshes the RUNTIMES block in src/data/data.ts: how long each released title takes to
// watch, from TMDB (Notion "Time to finish: runtimes, hours per guide and
// hours left").
//
//   TMDB_READ_TOKEN=... node tools/refresh-runtimes.cjs
//
// Maintainer tool only, like tools/refresh-watch.js: the app never loads
// anything from tools/ and makes no TMDB API calls. The token is a TMDB "API
// Read Access Token" (v4) and lives only in your environment.
//
// What it does:
//   1. Takes each released title's TMDB id from watch-data.js (written by
//      refresh-watch.js, which matched them through IMDb ids).
//   2. Films: the film's runtime. Series: the season this title is (the
//      `-sN` in its id, else season 1), summing its episodes' runtimes, and
//      the episode count. The season's air year is checked against the
//      catalog's year.
//   3. Rewrites the block between data.ts's BEGIN/END RUNTIMES markers and
//      prints what changed.
// Node 18+ (built-in fetch). No packages.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'data', 'data.ts');
const API = 'https://api.themoviedb.org/3';

const token = process.env.TMDB_READ_TOKEN;
if (!token) {
  console.error('Set TMDB_READ_TOKEN (a TMDB API Read Access Token) in your environment first.');
  process.exit(1);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'watch-data.js'), 'utf8'), sandbox);
const ids = sandbox.window.WATCH.ids;
const { loadCatalog } = require(path.join(ROOT, 'qa', 'load-catalog'));
const titles = loadCatalog().TITLES;

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`${res.status} for ${url.replace(API, '')}`);
    return res.json();
  }
  throw new Error(`rate limited: ${url.replace(API, '')}`);
}

const previous = (() => {
  const m = fs.readFileSync(OUT, 'utf8').match(/const RUNTIMES[^=]*= (\{[\s\S]*?\});\n\/\/ END RUNTIMES/);
  return m ? JSON.parse(m[1]) : {};
})();

(async () => {
  const out = {}, warnings = [];
  for (const t of titles) {
    const id = ids[t.id];
    if (!id) continue;
    if (id.type === 'movie') {
      const m = await get(`${API}/movie/${id.id}`);
      if (!m.runtime) { warnings.push(`${t.id}: TMDB has no runtime for movie/${id.id}`); continue; }
      out[t.id] = { min: m.runtime };
    } else {
      const season = +((t.id.match(/-s(\d+)$/) || [])[1] || 1);
      const s = await get(`${API}/tv/${id.id}/season/${season}`);
      const eps = (s.episodes || []).filter((e) => e.air_date && e.air_date <= new Date().toLocaleDateString('en-CA'));
      const missing = eps.filter((e) => !e.runtime).length;
      const min = eps.reduce((a, e) => a + (e.runtime || 0), 0);
      if (!eps.length || !min) { warnings.push(`${t.id}: no aired episodes with runtimes in tv/${id.id} season ${season}`); continue; }
      if (missing) warnings.push(`${t.id}: ${missing} of ${eps.length} episodes have no runtime; the total leaves them out`);
      if (s.air_date && s.air_date.slice(0, 4) !== String(t.year)) warnings.push(`${t.id}: season ${season} aired ${s.air_date.slice(0, 4)}, catalog says ${t.year}`);
      out[t.id] = { min, eps: eps.length };
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const today = new Date().toLocaleDateString('en-CA');
  const src = fs.readFileSync(OUT, 'utf8');
  const block = `// BEGIN RUNTIMES (checked ${today})\nconst RUNTIMES: Record<string, { min: number; eps?: number }> = ${JSON.stringify(out, null, 1)};\n// END RUNTIMES`;
  if (!/\/\/ BEGIN RUNTIMES[\s\S]*?\/\/ END RUNTIMES/.test(src)) throw new Error('data.ts has no BEGIN/END RUNTIMES markers');
  fs.writeFileSync(OUT, src.replace(/\/\/ BEGIN RUNTIMES[\s\S]*?\/\/ END RUNTIMES/, block));

  const changes = [];
  for (const [k, v] of Object.entries(out)) {
    const p = previous[k];
    if (!p) changes.push(`+ ${k}: ${v.min} min${v.eps ? `, ${v.eps} episodes` : ''}`);
    else if (p.min !== v.min || p.eps !== v.eps) changes.push(`~ ${k}: ${p.min} → ${v.min} min`);
  }
  console.log(`data.ts RUNTIMES: ${Object.keys(out).length} titles, checked ${today}`);
  changes.forEach((c) => console.log(c));
  warnings.forEach((w) => console.log('! ' + w));
})().catch((e) => { console.error(e.message); process.exit(1); });
