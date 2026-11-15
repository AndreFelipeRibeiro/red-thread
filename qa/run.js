// Runs QA checks side by side and reports them like regress.sh always has.
// Used by regress.sh (the full run) and quick.sh (the per-ticket run).
//
//   node qa/run.js --all                 every check in checks.json "regress"
//   node qa/run.js --changed [checks…]   checks for the files changed in the
//                                        working tree, plus any named here
//   node qa/run.js test-guides test-promo
//
// JOBS (default 4) runs that many at once; JOBS=1 runs one at a time. Each
// check gets its own PORT, and every check is served the built site
// (qa/serve-site.js); the build runs once, first, unless SITE says to use a
// tree that is already built. The timing-sensitive checks ("serial" in
// checks.json) run afterwards, alone. Output is buffered per check and printed
// in the list's order, so the report reads the same however many run at once.
// A run fails (exit 1, "!!") when a check exits non-zero, prints no errors
// field, or any errors field is not [] or 0, as regress.sh always did.
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const QA = __dirname;
const ROOT = path.join(QA, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(QA, 'checks.json'), 'utf8'));
const JOBS = Math.max(1, +process.env.JOBS || 4);
const CAP_MS = 300000; // the old per-check cap
const PORT_BASE = +process.env.QA_PORT_BASE || 9100;
const NOISE = 'Unable to preventDefault inside passive event listener';
// Every "…errors": [...] or "…Errors": N field. A field is clean when it
// reads [] or 0, and a failure otherwise, which is the rule regress.sh always
// had.
//
// Finding the end of the array needs a scan rather than a pattern: the
// messages inside it are JSON strings that can contain brackets of their own.
// The pattern this replaced was /"[^"]*[Ee]rrors?": *(\[[^\]]*\]|[0-9]+)/,
// which stopped at the first ] whatever it belonged to. test-skip's output
// holds the text {"skipped":[], so the value it captured *ended* in ":[]" and
// passed the "is it []" test: a check that was failing was reported clean, and
// the whole run said "44 check runs clean" with a failure in it (2026-10-31).
const FIELD = /"[^"]*[Ee]rrors?": */g;

// From the `[` at `i`, the index just past the matching `]`, ignoring brackets
// inside double-quoted strings.
function arrayEnd(s, i) {
  let depth = 0, inStr = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) {
      if (c === '\\') j++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return j + 1;
  }
  return -1;
}

// The field at a FIELD match: its name, its value as written, and whether it
// is clean. `rest` is the flattened output from just after the colon.
function fieldAt(name, rest) {
  if (rest[0] === '[') {
    const end = arrayEnd(rest, 0);
    const value = end === -1 ? rest : rest.slice(0, end);
    return { name, value, clean: /^\[ *\]$/.test(value) };
  }
  const num = rest.match(/^[0-9]+/);
  if (num) return { name, value: num[0], clean: num[0] === '0' };
  return { name, value: '(unreadable)', clean: false };
}

const norm = (c) => (typeof c === 'string' ? { check: c, env: {} } : { check: c.check, env: c.env || {}, exitOnly: !!c.exitOnly });
const keyOf = (c) => c.check + JSON.stringify(c.env);

function pick(args) {
  if (args.includes('--all')) return CFG.regress.map(norm);
  const named = args.filter(a => !a.startsWith('--')).map(a => norm(a.replace(/\.js$/, '')));
  let out = [];
  const regressNames = new Set(CFG.regress.map(c => norm(c).check));
  if (args.includes('--changed')) {
    let changed = [];
    try {
      changed = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
        .map(l => l.slice(3).trim().replace(/^"|"$/g, '')).map(f => (f.includes(' -> ') ? f.split(' -> ')[1] : f));
    } catch (e) { /* not a git checkout: only the named checks */ }
    changed.forEach(f => {
      // A changed check runs itself, if it is part of the full run; the older
      // one-off checks outside it (qa/README.md) run only when named.
      const own = f.match(/^qa\/(test-[\w-]+)\.js$/);
      if (own && regressNames.has(own[1])) out.push(norm(own[1]));
      Object.entries(CFG.files).forEach(([pat, list]) => {
        if (pat.endsWith('/') ? f.startsWith(pat) : f === pat) list.forEach(c => out.push(norm(c)));
      });
    });
    out.changedFiles = changed;
  }
  const all = out.concat(named);
  const seen = new Set();
  const list = all.filter(c => !seen.has(keyOf(c)) && seen.add(keyOf(c)) && fs.existsSync(path.join(QA, c.check + '.js')));
  list.changedFiles = out.changedFiles;
  return list;
}

function runOne(c, port) {
  return new Promise(resolve => {
    const t0 = Date.now();
    // The path is quoted: the checkout lives under "Developer/Red Thread/", and
    // NODE_OPTIONS splits an unquoted path at its space, so node would not start.
    const env = { ...process.env, ...c.env, PORT: String(port), NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require "' + path.join(QA, 'serve-site.js') + '"').trim() };
    const child = spawn(process.execPath, [path.join(QA, c.check + '.js')], { cwd: QA, env });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { out += '\n(killed after ' + CAP_MS / 1000 + 's)'; child.kill('SIGKILL'); }, CAP_MS);
    child.on('close', (code) => { clearTimeout(timer); resolve({ c, code: code == null ? 137 : code, out, secs: Math.round((Date.now() - t0) / 1000) }); });
  });
}

function report(r) {
  const lines = [];
  const label = Object.entries(r.c.env).map(([k, v]) => k + '=' + v).join(' ') || 'X=1';
  lines.push(`=== ${label} ${r.c.check}.js`);
  // The accessibility scan has no errors field: it fails by exit code and
  // marks what it found with "!!".
  if (r.c.exitOnly) {
    const bad = r.code !== 0;
    lines.push(bad ? `  !! exited ${r.code}` + (r.out.match(/!!.*/) ? ' ' + r.out.match(/!!.*/)[0] : '') : '  no violations');
    lines.push(`  (${r.secs}s)`);
    if (bad && process.env.QA_VERBOSE) lines.push(r.out.split('\n').slice(-40).map(l => '  | ' + l).join('\n'));
    return { text: lines.join('\n'), bad };
  }
  const flat = r.out.replace(/\s+/g, ' ');
  const found = [];
  for (const m of flat.matchAll(FIELD)) {
    found.push(fieldAt(m[0].trim(), flat.slice(m.index + m[0].length)));
  }
  const text = f => f.name + ' ' + (f.value.length > 300 ? f.value.slice(0, 300) + '…' : f.value);
  const counts = {};
  found.forEach(f => { counts[text(f)] = (counts[text(f)] || 0) + 1; });
  Object.entries(counts).sort().forEach(([f, n]) => lines.push(`${String(n).padStart(4)} ${f}`));
  let bad = false;
  if (r.code !== 0) { lines.push(`  !! exited ${r.code}`); bad = true; }
  if (!found.length) { lines.push('  !! no errors field in output'); bad = true; }
  // test-camera's one known console warning is allowed by name, but only when
  // it is the only thing in the field.
  const onlyNoise = f => f.value.replace(/"[^"]*"/g, m => (m.includes(NOISE) ? '' : m)).replace(/[\[\], ]/g, '') === '';
  found.filter(f => !f.clean && !onlyNoise(f)).forEach(f => { lines.push('  !! ' + text(f)); bad = true; });
  lines.push(`  (${r.secs}s)`);
  if (bad && process.env.QA_VERBOSE) lines.push(r.out.split('\n').slice(-40).map(l => '  | ' + l).join('\n'));
  return { text: lines.join('\n'), bad };
}

(async () => {
  const args = process.argv.slice(2);
  const list = pick(args);
  if (list.changedFiles) console.log('changed: ' + (list.changedFiles.join(', ') || '(nothing)'));
  if (!list.length) { console.log('=== no checks to run'); return; }
  // The app is a bundle, so the checks need a built site to point at
  // (qa/serve-site.js). SITE set by hand means "this tree is already built",
  // so leave it alone; otherwise build dist/ now, once, for the whole run.
  if (!process.env.SITE) {
    const b0 = Date.now();
    process.stdout.write('=== building dist ');
    try {
      execSync('npm run build', { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      console.log('\n=== BUILD FAILED\n' + (e.stderr || '').toString().slice(-3000));
      process.exitCode = 1;
      return;
    }
    console.log(`(${Math.round((Date.now() - b0) / 1000)}s)`);
  }
  const serialSet = new Set(CFG.serial);
  const parallel = list.filter(c => !serialSet.has(c.check));
  const serial = list.filter(c => serialSet.has(c.check));
  const t0 = Date.now();
  const results = new Map();
  // Parallel pool; ports are handed out per slot, so two checks never share one.
  let next = 0;
  const worker = async (slot) => {
    while (next < parallel.length) {
      const c = parallel[next++];
      results.set(c, await runOne(c, PORT_BASE + slot));
    }
  };
  await Promise.all(Array.from({ length: Math.min(JOBS, parallel.length) }, (_, i) => worker(i)));
  for (const c of serial) results.set(c, await runOne(c, PORT_BASE + 50));
  let fail = false;
  for (const c of list) {
    const { text, bad } = report(results.get(c));
    console.log(text);
    if (bad) fail = true;
  }
  const total = Math.round((Date.now() - t0) / 1000);
  console.log(`=== total ${Math.floor(total / 60)}m ${total % 60}s (JOBS=${JOBS}); slowest:`);
  [...results.values()].sort((a, b) => b.secs - a.secs).slice(0, 10)
    .forEach(r => console.log(`  ${r.secs}s ${r.c.check}${Object.keys(r.c.env).length ? ' ' + JSON.stringify(r.c.env) : ''}`));
  console.log(fail ? '=== FAILURES ABOVE' : `=== all ${list.length} check runs clean`);
  process.exitCode = fail ? 1 : 0;
})();
