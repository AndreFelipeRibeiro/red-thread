# Repository privacy review — 2026-10-24

## Scope and method

Reviewed the 22 previously tracked files and 83 unique reachable historical file
versions across local/remote Git refs after fetching origin. Used a local pattern
scan for private-key blocks, privileged Supabase keys, Google OAuth secrets,
GitHub/OpenAI/AWS credential formats, credential-bearing URLs, JWTs, literal email
addresses and machine-specific home paths. Also reviewed author/committer email
metadata and commit-message addresses. Manually inspected account.jsx, schema.sql,
config.js and the documentation findings. Newly added/edited documentation is
checked before committing as well. Candidate values are not reproduced here.

This is a source/history review, not a guarantee against every possible secret
format or a live database/dashboard audit. GitHub-only orphaned objects, external
clones/caches, issue attachments, deployment logs and browser session storage are
outside the scanned Git refs. No user data was queried or exported.

## Findings

| Area | Finding |
|---|---|
| Credentials | No matching privileged API keys, private keys, OAuth client secrets, credential-bearing connection strings or session JWTs found in the scanned file versions. |
| Embedded user data | No literal email addresses or embedded account records found in tracked file history. Public repository-owner names/links and service/tool identifiers remain intentional credits. |
| account.jsx | Profile name, email and avatar are read from the current Supabase session at runtime. These are code references, not committed profile values. |
| schema.sql | DDL, constraints, trigger, grants and policies only; no user rows or account dump. It references auth.users by id and does not store account emails/passwords. |
| Source access rules | Schema enables RLS; SELECT/DELETE use auth.uid() ownership, INSERT checks ownership, UPDATE checks both old/new ownership; anon grants are revoked. This review does not independently attest to today's deployed policy state. |
| Public configuration | config.js contains a Supabase project URL and publishable key, which are intended for browser distribution. They are not a service-role/secret key. |
| Git metadata | One personal email identity is present in existing author/committer metadata. It remains exposed in already published commit history. No address is copied into this report. |
| Local paths | Machine-specific home-folder paths existed in three planning documents. Current copies use portable placeholders and are included in the approved main maintenance release. Historical copies retain the old values; no published-history rewrite was performed. |

Supabase documents publishable keys as safe for public client source; access to
private rows must be enforced through grants and RLS:
[API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).
Historical functional isolation checks are recorded in
[V3 verification](V3-VERIFICATION.md); they were not rerun for this documentation change.

## Changes made

- Configured this local repository's future commits to use the maintainer's
  GitHub noreply address derived from the public account id/login. This Git
  setting is local to this repository and shared by its worktrees; it does not
  change global Git settings or other contributors' machines.
- Added repository instructions for future noreply identity, Codex co-author
  attribution, staged-content checks and avoiding personal data in fixtures/docs.
- Added ignore patterns for local environment files, credentials, HAR/session
  diagnostics, logs and database backup artifacts. Ignore rules do not remove
  files that were already tracked or erase Git history.
- Replaced machine-specific paths in the current maintenance planning documents.

## Decision still required: historical email/path cleanup

No published commit was rewritten or force-pushed. Removing author/committer
emails and home paths from old commits would change commit ids and require a
coordinated rewrite of affected branches, followed by force pushes. Commit links
in this changelog and existing references would need to be updated. GitHub may
retain cached objects, pull-request references and old deployments; other people's
clones cannot be erased by rewriting this repository. Obtain explicit approval
before doing that work, and agree which refs to rewrite.

The documentation changes of the day stayed on `version/3.0` until a separately
approved merge. Publishing this report does not mean the historical exposure is
resolved — **as of 2026-10-31 it is not**: no history rewrite has been
authorised or performed, and the branch table below is as fetched on the review
date. Development has since moved to `version/4.0`, which inherits the same
history and the same unresolved finding.

### Proposed cleanup sequence (not authorized or performed)

Affected fetched remote branches at review time:

| Branch | Commits with personal author/committer email |
|---|---|
| `main` | 27 |
| `search-character-and-actor-highlighting` | 14 |
| `version/3.0` | 29 |

1. Coordinate a rewrite window and capture current remote ref ids in a private
   local recovery backup; check for new pushes and any tags/PR refs first.
2. In an isolated copy, map the personal author/committer email to the verified
   owner noreply identity and replace machine-specific home paths in historical
   planning blobs. Preserve names, dates, code changes and genuine tool credits.
3. Regenerate affected changelog commit links, verify tree contents/ancestry and
   scan again. Review the resulting diff and old/new ref mapping before upload.
4. With explicit approval, update affected remote refs using lease-protected
   pushes. Rewriting main needs a production deployment plan, since Vercel may
   redeploy it. Do not fold unmerged maintenance into main as part of cleanup.
5. Refresh both local worktrees and coordinate other clones; inspect GitHub
   commit views and ask GitHub about retained PR/cache copies as needed. Do not
   promise that external copies or historical deployments disappear.

Keeping history intact and protecting future commits is also an available choice.

## Visitor analytics — 2026-11-18

Production (`redthread.tv`) loads Vercel Web Analytics (`src/analytics.ts`,
Notion "Analytics: Vercel Web Analytics on production"). Previews, localhost
and the QA server load nothing.

- **What it records:** page views with their referrer, country, browser, OS
  and device type, as Vercel's Web Analytics does. It sets no cookies and
  stores nothing on the device, so the site shows no consent banner. Vercel
  tells visitors apart by a hash of the request that resets every day.
- **What a page view reports:** the path plus only `guide`, `view` and `ref`
  from the address. Titles, characters, searches and the rest of the app's
  state in the address are stripped before sending, and a view of the same
  kept address is not sent twice.
- **What it never sees:** the collection (seen and watchlist), account
  details and sign-in state. No custom events are sent.
- `qa/test-analytics.js` checks both the production-only loading and the
  stripping.

Vercel's own description of what it collects:
[Web Analytics privacy](https://vercel.com/docs/analytics/privacy-policy).
