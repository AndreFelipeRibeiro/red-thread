// IndexNow (Notion "Findability 14"): tells Bing, and the other engines that
// share IndexNow submissions (Yandex, Seznam, Naver…), which addresses on
// redthread.tv to crawl, instead of waiting for them to find out.
//
//   node tools/indexnow.js                 every address in the live sitemap
//   node tools/indexnow.js /guides/x …     only these paths
//   node tools/indexnow.js --dry-run       print what would be sent, send nothing
//
// Run it after a merge to main has deployed (the ship-batch skill's
// production step), never for staging: it only ever names redthread.tv, and
// it first checks that production serves the key, so it can't submit before
// the deploy is live. The key in indexnow-key.txt is public by design: the
// file is served at https://redthread.tv/indexnow-key.txt and proves the
// submission comes from whoever controls the site.
//
// The whole sitemap is about 200 addresses, well under IndexNow's 10,000 per
// request, and engines only crawl what they judge changed, so sending all of
// them after each release is fine.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'redthread.tv';
const SITE = 'https://' + HOST;
const KEY_FILE = 'indexnow-key.txt';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const paths = args.filter((a) => a !== '--dry-run');

const fail = (msg) => { console.error('indexnow: ' + msg); process.exit(1); };

(async () => {
  const key = fs.readFileSync(path.join(ROOT, KEY_FILE), 'utf8').trim();
  if (!/^[a-f0-9]{32}$/.test(key)) fail(KEY_FILE + ' does not hold a 32-character key');

  // Production must already serve the same key, or the engines reject it.
  const live = await fetch(`${SITE}/${KEY_FILE}`, { redirect: 'manual' });
  const liveKey = live.ok ? (await live.text()).trim() : '';
  if (liveKey !== key) fail(`${SITE}/${KEY_FILE} answers ${live.status}${liveKey ? ' with another key' : ''}: deploy first`);

  let urls;
  if (paths.length) {
    urls = paths.map((p) => {
      const u = new URL(p, SITE);
      if (u.host !== HOST) fail('not a redthread.tv address: ' + p);
      return u.toString();
    });
  } else {
    const sm = await fetch(`${SITE}/sitemap.xml`);
    if (!sm.ok) fail('sitemap.xml answers ' + sm.status);
    urls = [...(await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (!urls.length) fail('sitemap.xml lists no addresses');
  }
  if (urls.some((u) => new URL(u).host !== HOST)) fail('the list names another host');

  const body = { host: HOST, key, keyLocation: `${SITE}/${KEY_FILE}`, urlList: urls };
  if (dry) {
    console.log(JSON.stringify({ ...body, urlList: [...urls.slice(0, 5), `… ${urls.length} in all`] }, null, 1));
    return;
  }
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  // 200 and 202 both mean accepted (202: the key is still being checked).
  if (r.status !== 200 && r.status !== 202) fail(`${ENDPOINT} answered ${r.status} ${await r.text()}`);
  console.log(`indexnow: ${urls.length} addresses accepted (${r.status})`);
})().catch((e) => fail(e.message));
