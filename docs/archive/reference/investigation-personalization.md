---
investigation: personalization-and-contributions
refined_request: docs/refined-requests/personalization-and-contributions.md
codebase_scan: docs/reference/codebase-scan-personalization.md
investigated_at: 2026-05-18
investigator_role: investigator (Phase 3)
status: complete
pivot_applied_at: 2026-05-18
pivot: option-c
---

# Investigation: Personalization (Favourites) & Community Contributions

> ## ARCHITECTURE PIVOT (2026-05-18)
>
> After the investigation surfaced **R1 (GitHub's OAuth handshake endpoints lack CORS headers)** below, the user reviewed the Cloudflare Worker mitigation and **rejected it outright**. The user then chose **Option C**, summarised here. Everything below this banner is preserved as historical context — sections marked "Historical — superseded by Option C" still document what we ruled out and why, but they are not the architecture the Planner/Designer/Coders should implement. **Read this banner + the "Option C Implementation Notes" section at the bottom of the doc as the current source of truth.**
>
> **Option C in one paragraph.** Favourites are gated by a **classic Personal Access Token (PAT) with the `gist` scope only**, which the user pastes into a sign-in modal on the site. The token is validated against `GET https://api.github.com/user` (a CORS-enabled endpoint) and stored in `localStorage`. All gist read/modify/write operations use it browser-direct against `api.github.com` (CORS supported there too). Skill submissions are **anonymous** — the form serialises the markdown to a YAML-frontmatter + body string, URL-encodes it, and redirects to `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<urlencoded>`. GitHub's own editor opens with the file pre-filled; GitHub handles the fork/branch/PR mechanics from there. **No OAuth App. No Device Flow. No Cloudflare Worker. No browser-side write APIs.**
>
> | Concern | Option C choice | Notes |
> |---|---|---|
> | **Favourites auth** | Paste a classic PAT with `gist` scope; validate via `GET /user`; store in `localStorage` | Scope is narrower than the OAuth App would have demanded (`gist` vs `repo`). No CORS-blocked endpoint touched. |
> | **Submissions** | URL-encode markdown → redirect to `github.com/.../new/main/skills?filename=...&value=...` | GitHub's UI runs the fork + branch + PR. Hub never calls write APIs. Clipboard fallback for URLs > ~7000 chars. |
> | **CI validator** | Unchanged — `pipeline/src/validators/skill.ts` on `pull_request` for `skills/**/*.md` | The CI side of the original spec is unaffected. |
>
> The Option C details — PAT scope semantics, fine-grained PAT compatibility, URL-length math, skill-side parity — are in the new **Option C Implementation Notes** section at the bottom of this doc.

## Executive Summary

> **Historical — superseded by Option C above.** The original recommendation below proposed a Cloudflare Worker proxy to mitigate the R1 CORS finding. The user rejected the proxy. Kept for context.


The refined spec commits to a **pure-static** site that talks to GitHub directly from the browser using OAuth Device Flow + private gist + token-scoped PRs. That architecture has **one load-bearing flaw**: GitHub's `github.com/login/device/code` and `github.com/login/oauth/access_token` endpoints **do not send CORS headers**, so the browser cannot call them from a `localhost:4321` or `https://*.pages.dev` origin. Every other choice in the spec (gist as store, fork→branch→file→PR sequence, Starlight Header override, OAuth App with `repo` scope, build-time pin index, localStorage for the token, CI validator in `pipeline/`) **validates cleanly** against current (May 2026) best practice and against the existing NbgAiHub conventions.

The recommendation: keep the architecture exactly as specified except **introduce a tiny, dependency-free Cloudflare Worker (~60 lines, no server state, no client secret stored on it)** to proxy two GitHub OAuth endpoints with `Access-Control-Allow-Origin: <site origin>` injected on the response. This preserves every other spec choice — including "no servers for the data path" — because gist + fork + PR endpoints on `api.github.com` **do** support CORS and remain pure-client. The worker is auth-only; pin reads/writes and submission PRs continue to fly directly browser→`api.github.com`.

Beyond that one revision, this investigation surfaces six secondary gotchas (gist write costs 5 secondary-rate-limit points; `PUT contents` requires a pre-existing branch ref; fork creation is 202-async with up to 5min latency; `pull_request_target` is dangerous and should be avoided; Octokit `@octokit/request` not `@octokit/rest` for bundle hygiene; `slug.ts` is duplicate-don't-workspace) and ten implementation patterns the planner can lift verbatim. All nine pre-committed architectural choices are individually validated with VALIDATED / NEEDS REVISION / GOTCHA verdicts in section 2.

## Context

NbgAiHub is a TypeScript "informal monorepo" (no workspaces tooling) — a Node 22 RSS pipeline (`pipeline/`, 101 vitest tests) plus an Astro 6 + Starlight 0.39 static site (`site/`, no test infra, `astro check` is the only gate). Repo is **private** on a personal GitHub account (`chomovazuzana/NbgAiHub`). The refined spec adds:

- GitHub OAuth Device Flow sign-in (header button → device code → poll → localStorage token)
- Private-gist-per-user as the favourites store (`nbgaihub-favorites.json`)
- "My Pins" page joining gist data against a build-time content index
- Skill submission form that forks the repo and opens a PR via the user's token
- CI validator at `pipeline/src/validators/skill.ts` triggered on `skills/*.md` PRs
- 7 new required fields on the Skills frontmatter schema
- SCOPE.md / DECISIONS.md / project-design.md / project-functions.md updates

The investigation must validate each architectural choice against current best practice (May 2026), surface any choice that won't hold up under research, and provide source-cited patterns the Planner and Designer can lift.

## Already-Decided Architecture — Verdict Per Item

> **Historical — superseded by Option C.** This table reflects the architecture as the original refined-request proposed (Device Flow + browser-side write APIs). Option C removed rows 1, 4, 8 (auth surface eliminated), kept rows 2, 3, 5, 6, 7, 9 effectively unchanged (the gist data plane, validator, build-time index, override target, and storage choice survive). Read for context, not implementation guidance.

Verdicts: **VALIDATED** (research confirms; no change needed), **GOTCHA** (works but has a sharp edge to mitigate), **NEEDS REVISION** (the spec is wrong as written and must be revised).

| # | Decision | Verdict | Notes |
|---|----------|---------|-------|
| 1 | **GitHub OAuth Device Flow** (not standard web flow) | **NEEDS REVISION** | Device Flow itself is fine, but the spec's "no servers" framing is impossible: GitHub's device-code + token endpoints lack CORS headers, so browser `fetch()` is blocked. **Mitigation:** a ~60-line Cloudflare Worker proxy for those two endpoints; data-path stays serverless. See Topic 1. |
| 2 | **Private gist per user**, `nbgaihub-favorites.json` | **GOTCHA** | "Private" is the wrong word. GitHub gists have only two visibilities: **public (listed/indexed)** and **secret (unlisted)**. `public: false` produces an unlisted gist whose URL is the only access gate. Anyone with the URL can read it without auth. This matches the spec's A19 ("no aggregation") intent — but the gist contract document **must use the word "unlisted" and explicitly state the gist URL is the only access control**. Do not call it "private". See Topic 2. |
| 3 | **Gist schema** `{schema_version: 1, favourites: [...]}` per A12 | **VALIDATED** | The wrapped-object shape is well-formed JSON; reserves room for forward-compat. No technical risk. |
| 4 | **Submission flow:** fork → branch → file → PR | **GOTCHA** | Two sharp edges: (a) `POST /forks` returns **202 Accepted** and the fork is created asynchronously (up to 5 min per GitHub docs); (b) `PUT /repos/{...}/contents/{path}?branch=X` does **not** implicitly create the branch — you must `POST /repos/{...}/git/refs` first. The spec's F-P12 already sequences both steps correctly, but the UI must show a "Preparing your fork…" state and tolerate fork-not-ready 404/409. See Topic 3. |
| 5 | **CI validator** in `pipeline/src/validators/skill.ts` (TypeScript, reuses pipeline tooling) | **VALIDATED** | The pipeline workspace already has `yaml`, `gray-matter`, vitest 4, Node 22, strict TS. Zero scaffold cost. The only design choice still open is workflow trigger: **use `pull_request` not `pull_request_target`** for safety. See Topic 7. |
| 6 | **Build-time pin index** at `public/_data/<type>-index.json` per A21 | **VALIDATED** | Standard Astro pattern (Vite copies `public/*` to `dist/*` verbatim). Recommend Option B from the codebase scan: a standalone `scripts/build-pin-index.ts` invoked via `"build": "tsx scripts/build-pin-index.ts && astro check && astro build"` rather than an Astro integration hook (less framework surface to learn). |
| 7 | **Starlight 0.39 Header component override** for sign-in UI per A15 | **GOTCHA** | Starlight docs explicitly warn against overriding `Header` directly ("significant complexity — prefer overriding a lower-level component"). The correct override target is **`SocialIcons`** (rendered top-right of the header by default, exact spot for sign-in UI) or **`PageFrame`** with the `header` slot preserved. Replacing the whole `Header` will break mobile menu toggle and sidebar slot wiring. See Topic 5. |
| 8 | **localStorage** for the OAuth token (`nbgaihub.gh_token`) | **GOTCHA** | Industry best practice in 2026 is `HttpOnly` cookies, **which a pure-static site cannot use** (no server to set Set-Cookie). Given the threat model (private repo, internal hub, no third-party scripts on the site, no ads/analytics SDK), localStorage with a strict CSP is acceptable. Mitigations: (1) `Content-Security-Policy` meta tag with `script-src 'self'`; (2) no third-party scripts ever; (3) document the trade-off in the gist contract; (4) document "revoke at github.com/settings/applications" as the user's recourse. See Topic 6. |
| 9 | **OAuth App** (not GitHub App) per A11 | **VALIDATED** | OAuth App is the right choice for personal-account bootstrap + Device Flow. GitHub Apps would give finer-grained scopes but require org-level installation flow that doesn't fit a personal repo. **Note**: PKCE support was added to OAuth Apps in July 2025 — irrelevant for Device Flow, but documented as a future migration vector when the project moves to authorization code flow. |

## Topic-by-Topic Findings

> **Historical — Topics 1 and 6 are largely superseded by Option C** (no Device Flow = no auth-endpoint CORS workaround needed; PAT-in-localStorage is the only token surface). Topics 2, 3, 5, 7, 8 remain relevant. See "Option C Implementation Notes" at the bottom for the post-pivot specifics.

### Topic 1 — GitHub OAuth Device Flow mechanics for browser clients

> **Historical — superseded by Option C.** Option C removes Device Flow entirely. The R1 CORS blocker below is what drove the pivot; with PAT paste there is no auth-handshake endpoint to call, so no proxy is needed. The `api.github.com` data-plane endpoints retain CORS and continue to work browser-direct under Option C exactly as described in Topic 2 below.

**Endpoint shapes (from RFC 8628 + GitHub docs):**

- `POST https://github.com/login/device/code` with form-encoded body `client_id=<id>&scope=repo` returns JSON `{device_code, user_code, verification_uri, expires_in, interval}`. `user_code` is 8 chars formatted `XXXX-XXXX`. `verification_uri` is `https://github.com/login/device`. `interval` is typically 5 (seconds).
- `POST https://github.com/login/oauth/access_token` with `client_id=<id>&device_code=<code>&grant_type=urn:ietf:params:oauth:grant-type:device_code` returns either `{access_token, token_type, scope}` on success or `{error: <code>, error_description}` while pending.

**Error taxonomy (RFC 8628 + GitHub-specific):**

| Error | Meaning | Action |
|-------|---------|--------|
| `authorization_pending` | User hasn't completed the prompt yet | Keep polling at `interval` cadence |
| `slow_down` | Polling too fast | Increase interval by at least 5 seconds, then continue |
| `expired_token` | Device code TTL exceeded (GitHub: 15 min) | Terminal — restart flow |
| `access_denied` | User clicked "Reject" | Terminal — show "Sign-in cancelled" |
| `incorrect_device_code` | Code malformed or never issued | Terminal — restart flow |
| `incorrect_client_credentials` | `client_id` is wrong | Terminal — config error, throw `MissingConfigError` |

**CORS — the blocker.** GitHub's `github.com/login/*` endpoints (both web flow and device flow) do **not** send `Access-Control-Allow-Origin`. This is intentional and has not changed despite GitHub adding PKCE in July 2025. Browser `fetch()` from any origin other than `github.com` itself receives a CORS error before the response body is parsed. **Confirmed by:**
- Andrea Zonca's January 2025 walkthrough explicitly states "GitHub does not allow direct calls to the device flow from the browser for security reasons. The device flow requires a server process."
- A GitHub Community discussion from August 2025 confirms unchanged behavior.
- The IETF browser-based-apps draft (BCP recommendation) advises against any browser-direct OAuth endpoint calls and recommends BFF (Backend-For-Frontend) pattern.

**Workaround — minimal Cloudflare Worker proxy.** The data path (`api.github.com/gists`, `api.github.com/repos/.../forks`, etc.) **does** send CORS headers and stays browser-direct. Only the two OAuth endpoints need proxying. Worker pseudo-code (~60 lines):

```typescript
// worker.ts — proxies github.com/login/device/code and /login/oauth/access_token
const ALLOWED_ORIGIN = 'https://nbgaihub.pages.dev'; // and 'http://localhost:4321' for dev
const ALLOWED_PATHS = new Set(['/login/device/code', '/login/oauth/access_token']);

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return preflight(req);
    if (!ALLOWED_PATHS.has(url.pathname)) return new Response('Not Found', { status: 404 });
    const ghUrl = `https://github.com${url.pathname}`;
    const ghRes = await fetch(ghUrl, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': req.headers.get('Content-Type') ?? 'application/x-www-form-urlencoded' },
      body: await req.text(),
    });
    return new Response(await ghRes.text(), {
      status: ghRes.status,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Content-Type': ghRes.headers.get('Content-Type') ?? 'application/json',
      },
    });
  },
};

function preflight(req: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

**Critical property:** the worker stores **no client secret** (Device Flow has none) and holds **no session state** (it's a pure relay). It only adds CORS headers and routes to two whitelisted GitHub paths. Cloudflare Workers free tier (100k requests/day) is more than sufficient.

**`repo` scope via Device Flow** — fully supported. The Device Flow's consent screen on `github.com/login/device` shows the requested scopes verbatim, and `repo` is a valid value. No additional consent UI restrictions apply.

**Sources:**
- [RFC 8628 — OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [GitHub Docs — Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub Docs — Troubleshooting OAuth app access token request errors](https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/troubleshooting-oauth-app-access-token-request-errors)
- [Andrea Zonca — Authenticate to GitHub in the Browser with the Device Flow (Jan 2025)](https://www.zonca.dev/posts/2025-01-29-github-auth-browser-device-flow)
- [Simon Willison TIL — GitHub OAuth for a static site using Cloudflare Workers](https://til.simonwillison.net/cloudflare/workers-github-oauth)
- [OAuth 2.0 for Browser-Based Applications (IETF draft-22)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps-22)
- [gr2m/cloudflare-worker-github-oauth-login — Reference Worker implementation](https://github.com/gr2m/cloudflare-worker-github-oauth-login)

### Topic 2 — GitHub Gists API for the favourites store

**"Private/secret/unlisted" semantics.** GitHub's gist API has **only two visibility states**:
- `public: true` — listed on the user's profile, indexed by search, shows in `GET /gists/public`.
- `public: false` — **unlisted** (called "secret" in the UI, but the official terminology since 2024+ is "unlisted"). **Not authenticated-only**: anyone with the URL can read it, no login required.

**This matches A19 ("no aggregation")** because the only way for an attacker to enumerate users' pins is to know the URL. URLs are 32-char hex IDs (`gist.github.com/<user>/<id>`) — practically unguessable. But the gist contract doc **must** state explicitly: *"This is not a privacy-by-auth boundary. Treat the gist URL as a shared secret. Anyone who learns the URL can read your pins (but cannot write to them — writes still require your token)."* The November 2025 GitHub policy change reporting secrets in unlisted gists to scanning partners confirms GitHub treats unlisted gists as semantically public.

**Endpoints:**

| Operation | Endpoint | Notes |
|-----------|----------|-------|
| Discover existing favourites gist | `GET /gists` (returns user's gists list, paginated 30/page) | Scan `files` map for key `nbgaihub-favorites.json`. If user has many gists, paginate via `Link` header. |
| Create | `POST /gists` body `{public: false, description, files: {"nbgaihub-favorites.json": {content: "{...}"}}}` | Returns the new gist's `id`. |
| Read | `GET /gists/{id}` | Returns gist object; pin data at `files["nbgaihub-favorites.json"].content` as a JSON string. |
| Write | `PATCH /gists/{id}` body `{files: {"nbgaihub-favorites.json": {content: "<new json>"}}}` | Full-file replace; no delta API. |

**Concurrency.** GitHub's gist API does **not** implement ETag-based optimistic concurrency on PATCH (no `If-Match` requirement, no 412 on stale write). It is **last-write-wins**. Risk for our use case: user has the site open in two tabs, pins A in tab 1, then pins B in tab 2 — tab 2's write may be against a stale local cache that omits A, overwriting it. **Mitigation:** before every write, re-read the gist (`GET /gists/{id}`), merge in the new pin/unpin operation, then PATCH. This is two API calls per write but is the only safe protocol given GitHub's lack of optimistic concurrency. Spec F-P8 should be amended to specify this read-modify-write sequence.

**Rate limits.** Authenticated REST API limit is **5,000 requests/hour per user**. Easily sufficient for individual pin operations. **However** GitHub also enforces a **secondary rate limit** of 900 "points/min" per endpoint where GET=1 point and POST/PATCH/PUT/DELETE=5 points. Gist creation is also penalized as a "content creation" operation. A user pinning 20 items in a minute = 20 PATCH × 5pts = 100 points/min — well under the 900/min limit. **Not a real risk** for human-paced UI; only a risk if we ever add bulk-import. The spec's OQ4 is correctly classifying this as a low-likelihood concern.

**Sources:**
- ["Secret" GitHub Gists Are Unlisted, Not Private — paul.af](https://paul.af/gist-complaints)
- [GitHub Changelog — Secrets in unlisted gists are reported to scanning partners (Nov 2025)](https://github.blog/changelog/2025-11-25-secrets-in-unlisted-github-gists-are-now-reported-to-secret-scanning-partners/)
- ["Secret" gists should be renamed to unlisted — community discussion #12472](https://github.com/orgs/community/discussions/12472)
- [GitHub Docs — Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

### Topic 3 — GitHub REST API choreography for the submission form

**Sequence (per F-P12, validated):**

1. `GET /repos/<user>/NbgAiHub` — check fork exists.
2. If 404 → `POST /repos/chomovazuzana/NbgAiHub/forks` returns **HTTP 202 Accepted** with the fork resource (but git objects may not yet be populated). Then poll `GET /repos/<user>/NbgAiHub/git/ref/heads/<default_branch>` every 2–5 seconds until 200 (max 30s timeout per spec; GitHub officially gives up to 5 minutes in extreme cases, but personal repos are normally ready in <5s).
3. `GET /repos/<user>/NbgAiHub/git/ref/heads/<default_branch>` — fetch the HEAD SHA of the fork's default branch.
4. `POST /repos/<user>/NbgAiHub/git/refs` with body `{ref: "refs/heads/submit-skill/<slug>", sha: <head_sha>}` — create the branch.
5. `PUT /repos/<user>/NbgAiHub/contents/skills/<slug>.md` with body `{message, content: <base64>, branch: "submit-skill/<slug>"}` — create the file on the new branch. **Critical:** `PUT contents` does **not** implicitly create the branch — step 4 must precede this.
6. `POST /repos/chomovazuzana/NbgAiHub/pulls` with body `{title, body, head: "<user>:submit-skill/<slug>", base: <default_branch>}` — open the cross-fork PR.

**Cross-fork PR limitations on private repos.** Fully supported — a user with `repo` scope can fork a private repo and open a PR back to it. Both the fork and the PR are private (visible only to repo collaborators + the fork owner). **No gotcha** for our setup.

**Fork-async UX.** F-P12 step 1's 30s timeout is correct for the common case but should surface a "Preparing your fork…" indicator with a friendly "this can take up to 30 seconds" subtitle. On timeout, show "Fork creation is taking longer than expected — your PR will be ready in a few minutes; try submitting again then."

**Slug collision pre-check (A17).** `GET /repos/chomovazuzana/NbgAiHub/contents/skills/<slug>.md` — 200 means collision (disable submit + error); 404 means slug is free. **Important:** this call hits the **source repo**, not the user's fork — the user's token has `repo` scope so private-repo reads work.

**Sources:**
- [GitHub Docs — REST API endpoints for forks](https://docs.github.com/en/rest/repos/forks)
- [GitHub Docs — Create or update file contents](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
- [gist by nottrobin — Create branch, commit a change, open PR via API v3](https://gist.github.com/nottrobin/a18f9e33286f9db4b83e48af6d285e29)

### Topic 4 — Browser-side TypeScript libraries

**Octokit vs. raw `fetch`.** Decision: **use raw `fetch`**. Rationale:

- The spec calls ~10 distinct endpoints across auth/gist/submission. Each call is 4-8 lines of `fetch()` boilerplate (URL, method, headers, body, error handling). Total custom code ~150-200 lines.
- `@octokit/rest` minified+gzipped is ~50KB+ for the full client; `@octokit/core` is ~20KB but you still need to call `octokit.request('GET /gists', {})` which is barely shorter than `fetch('https://api.github.com/gists', {headers: {Authorization: 'token ...'}})`.
- The codebase scan note 5 (page 392) already flagged: "No GitHub SDK dependency (site side is static; adding @octokit/rest would bloat the bundle)."
- All endpoints we hit support CORS and accept simple JSON. No edge cases that need a library's quirks-handling.

**If we wanted minimal hedging:** `@octokit/request` (the smallest at ~4KB gzipped) provides just `request('GET /repos/{owner}/{repo}', {owner, repo})` with typed paths. **Not recommended for our scale** — we'd add a dependency to save 30 lines of code. Stick with raw `fetch` wrapped in a small named-error module.

**YAML parsing in the validator.** `pipeline/package.json` already has `yaml` and `gray-matter`. **Use `gray-matter`** — it parses Markdown + frontmatter in one call, returns `{data, content, excerpt}`. This is the existing pipeline pattern. No new dep.

**Markdown rendering.** Spec A16 confirms no in-browser preview. CI validator does not need to render Markdown either (validation is frontmatter-only + a HEAD request on `external_link`). **Zero new deps for markdown handling.**

**Form validation library.** Spec F-P11 implies the form's client-side validation should mirror the Zod schema in `site/src/content.config.ts`. Two options:
- (A) Inline `if/else` rules in the form's `<script>` (no dep, ~80 lines).
- (B) Import Zod into the form `<script>` for client-side parsing (Zod is already a transitive dep via Astro's content layer; bundle cost is incremental).
- **Recommendation: Option B.** Reuses the canonical schema, ensures form and CI validator can't drift. Astro will bundle Zod once and reuse across pages.

### Topic 5 — Starlight 0.39 component override depth

**Override mechanism.** Starlight 0.39 supports `components: {...}` config in `astro.config.mjs`:

```javascript
starlight({
  components: { SocialIcons: './src/components/AuthHeader.astro' },
  // or for deeper change:
  // components: { Header: './src/components/CustomHeader.astro' },
})
```

**The right override target is NOT `Header`.** Starlight's official docs (`reference/overrides/`) warn:
> "These components are responsible for laying out Starlight's components and managing views across different breakpoints. Overriding these comes with significant complexity. When possible, prefer overriding a lower-level component."

**Recommended targets (in order of preference):**

1. **`SocialIcons`** (rendered top-right of the default header). Sign-in / sign-out UI fits naturally where social links normally go. Default implementation reads `social` from config; our replacement renders auth UI instead, with optional fallthrough to the default `SocialIcons` if we want both. Smallest possible override.

2. **`PageFrame`** with header slot preserved (more complex but allows wrapping the entire header):
   ```astro
   ---
   import Default from '@astrojs/starlight/components/PageFrame.astro';
   import { Header, Sidebar } from 'virtual:starlight/components';
   ---
   <Default {...Astro.props}>
     <div slot="header" style="display: flex; align-items: center; gap: 1rem;">
       <Header {...Astro.props} />
       <AuthSlot />
     </div>
     <Sidebar slot="sidebar" {...Astro.props} />
     <slot />
   </Default>
   ```

3. **`Header` direct replacement** — **avoid** unless absolutely necessary. Breaks mobile menu toggle (rendered inside PageFrame, not Header) and forces re-implementing the title/search/theme-toggle row.

**Recommendation: use `SocialIcons` override.** Smallest blast radius, no risk of breaking mobile/sidebar wiring, matches the "fit naturally into the existing chrome" goal.

**Modal mounting.** Per spec A24 the sign-in affordance is a modal. **Use native HTML `<dialog>` element** — no framework island needed.

```astro
---
// src/components/SignInModal.astro
---
<dialog id="signin-modal" class="signin-dialog">
  <header><h2>Sign in to NbgAiHub</h2><button id="signin-close" aria-label="Close">×</button></header>
  <div id="signin-step-1"><!-- prompt --></div>
  <div id="signin-step-2" hidden><!-- device code + verification link --></div>
  <div id="signin-step-3" hidden><!-- waiting indicator --></div>
</dialog>
<script>
  // Open with: document.getElementById('signin-modal').showModal();
  // Close with: document.getElementById('signin-modal').close();
  // Native: Escape key closes, focus trap, backdrop blur
</script>
```

This gives focus trapping, Escape-to-close, and screen-reader semantics for free. No `<Modal />` library needed. Astro renders this as static HTML + a small inline script — no island, no hydration directive.

**Sidebar entry for `/my-pins/`.** Spec already specifies adding `{ label: 'My Pins', link: '/my-pins/' }` to `sidebar` in `astro.config.mjs`. Confirmed: Astro's static routing will pick up `src/pages/my-pins.astro` as a route automatically. No additional config beyond the sidebar entry.

**Sources:**
- [Starlight — Overriding Components guide](https://starlight.astro.build/guides/overriding-components/)
- [Starlight — Overrides Reference](https://starlight.astro.build/reference/overrides/)
- [Accessible Astro — Modal component](https://accessible-astro.incluud.dev/components/modal/)
- [Michael Fares — Easily create modals in 2025 with native dialog element (Medium)](https://michael-fares.medium.com/easily-create-modals-in-2025-with-the-native-html-dialog-element-and-no-external-dependencies-881e03fa195c)

### Topic 6 — Token security in localStorage

**Threat model for NbgAiHub:**
- Repo is private; site itself will be hosted on Cloudflare Pages / Vercel / Netlify / similar (TLS-only).
- **No third-party scripts** on the site (no Google Analytics, no ad networks, no embedded widgets — confirmed by `site/package.json` having only Astro + Starlight + sharp).
- All scripts are first-party, bundled by Astro at build time, served from the site's own origin.
- Token grants `repo` scope = read/write to all the user's private repos (broad blast radius if stolen).

**Industry best practice (2026):** `HttpOnly` + `Secure` + `SameSite=Strict` cookies, set by a server. **Not available to us** without changing the architecture (no server to set Set-Cookie).

**Acceptable alternatives ranked:**

| Storage | XSS-safe? | Survives reload? | Available to us? |
|---------|-----------|------------------|------------------|
| `HttpOnly` cookie | Yes | Yes | **No** (no server) |
| `sessionStorage` | Same as localStorage (XSS-readable) | No (cleared on tab close) | Yes — but UX worse (sign in every tab open) |
| `localStorage` | **No** (XSS-readable) | Yes | Yes — spec choice |
| In-memory only (no persistence) | Best (no scriptable persistence) | No (lost on reload, AC2 fails) | Yes — but breaks AC2 |

**Recommendation: keep localStorage** (spec's choice) **with defense-in-depth:**

1. **CSP meta tag** in the Astro layout: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.github.com https://<oauth-proxy-worker-domain>; img-src 'self' https://avatars.githubusercontent.com data:; style-src 'self' 'unsafe-inline';">`. Note: `'unsafe-inline'` for script-src is unfortunately required by Starlight's hydration code; tighter CSP would require deeper Starlight integration. **Trade-off accepted** — we trust first-party inline scripts.
2. **Subresource Integrity (SRI)** on any external `<script>` we add. Currently we have none, so this is a "don't regress" rule.
3. **No third-party scripts ever** — record this as a project rule alongside "no runtime AI on the site" in DECISIONS.md.
4. **Document the trade-off** plainly on `/my-pins/` and `/submit-skill/` and in the gist contract: *"Your sign-in token lives in this browser's localStorage. If you sign in on a shared device, sign out before leaving. To fully revoke, visit github.com/settings/applications."*
5. **Detect 401 globally** (per spec OQ5): a thin `fetchWithAuth()` wrapper intercepts every API response; on 401, clears `nbgaihub.gh_token` + `nbgaihub.gist_id` from localStorage and emits an auth-changed event that the UI subscribes to.

**Future migration vector:** when (if) the project moves off personal-account bootstrap to team org infrastructure, swap localStorage for a serverless-function-issued `HttpOnly` cookie. This is an Issues item, not a blocker for MVP.

**Sources:**
- [OAuth 2.0 Simplified — Security Considerations for Single-Page Apps](https://www.oauth.com/oauth2-servers/single-page-apps/security-considerations/)
- [Praetorian — GitHub Device Code Phishing](https://www.praetorian.com/blog/introducing-github-device-code-phishing/)

### Topic 7 — CI validator workflow design

**Trigger: use `pull_request`, NOT `pull_request_target`.**

`pull_request_target` runs in the **base repo's** security context with full secrets and write `GITHUB_TOKEN`. If the workflow checks out the PR head SHA and executes any code from it, an attacker who opens a PR can exfiltrate secrets and push to the base repo. This is the dominant 2025-2026 GitHub Actions vulnerability class ("pwn requests").

`pull_request` runs in the **fork's** security context with `contents: read` GITHUB_TOKEN and **no access to base-repo secrets**. The validator only needs to read the changed files and post a check result — both of which `pull_request` permits. **This matches the existing convention** in the spec (validator never writes to the repo, A22).

**Workflow shape:**

```yaml
# .github/workflows/validate-skill-submission.yml
name: Validate skill submission
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - 'skills/**/*.md'

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed to diff against base.sha
      - uses: actions/setup-node@v4
        with:
          node-version-file: pipeline/.nvmrc
          cache: npm
          cache-dependency-path: pipeline/package-lock.json
      - run: npm ci
        working-directory: pipeline
      - run: npm run build
        working-directory: pipeline
      - name: Compute changed files
        id: changed
        run: |
          git diff --name-only --diff-filter=AM \
            ${{ github.event.pull_request.base.sha }} \
            ${{ github.sha }} -- 'skills/*.md' > changed.txt
          echo "files=$(cat changed.txt | tr '\n' ' ')" >> $GITHUB_OUTPUT
      - name: Run validator
        if: steps.changed.outputs.files != ''
        run: node dist/validators/cli.js ${{ steps.changed.outputs.files }}
        working-directory: pipeline
```

**Validator entry point** (`pipeline/src/validators/cli.ts`):
- Iterates over args, reads each file from disk, parses frontmatter with `gray-matter`, runs validation rules, emits one `::error file=<path>,line=1::<message>` annotation per failure (GitHub Actions workflow command format — produces inline annotations in the "Files changed" tab).
- Exits 0 if all valid, 1 if any invalid.

**Status check behaviour caveat (from research):** `paths:` filter at workflow level can cause status checks to stay "Pending" forever on PRs that don't touch `skills/*.md`. **Two mitigations:**
- (A) Don't make this check a required PR status (preferred — it's only relevant when skills change).
- (B) If required-check enforcement is needed, remove the workflow-level `paths:` filter and use `tj-actions/changed-files` inside the job to short-circuit gracefully. Trade-off: every PR triggers the workflow (wasteful) but status check resolves cleanly.
- **Recommendation: (A)** — don't make it required. Editorial review is the binding gate; validator is convenience.

**Posting results.** GitHub Actions error annotations (`::error file=...`) automatically show up as inline annotations in the Files changed tab and as bullets in the Checks tab. **No PR comment needed** — annotations are cleaner and don't notify watchers. Spec F-P15 says "Failures are reported via GitHub Checks UI" — annotations are the right primitive.

**Reusing pipeline tooling.** The validator is invoked as `node dist/validators/cli.js` — a compiled CLI script, not a vitest-imported module. Tests live in `pipeline/tests/validators/skill.test.ts` and import the module API (`validateSkillFile()`) directly. **No new test runner needed.**

**Sources:**
- [GitHub Security Lab — Preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- [DEV — `pull_request_target` Without Regret](https://dev.to/ollieb89/pullrequesttarget-without-regret-secure-fork-prs-in-github-actions-1jpi)
- [tj-actions/changed-files — GitHub Marketplace](https://github.com/marketplace/actions/changed-files)
- [GitHub Docs — Workflow commands (error/warning annotations)](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message)

### Topic 8 — Reuse of `pipeline/src/slug.ts`

**Options:**

| Approach | Effort | Lock-in cost | Drift risk |
|----------|--------|--------------|------------|
| (A) Duplicate `slug.ts` into `site/src/lib/slug.ts` | ~5 min | Low | Medium (must remember to sync) |
| (B) Set up npm workspaces (root `package.json` with `workspaces: ["pipeline", "site"]` + a new `shared/` package) | ~2-4 hours | Higher (every command needs `-w` flag, every dev needs to learn workspaces) | Low (single source) |
| (C) Vite alias in `site/astro.config.mjs` pointing at `../pipeline/src/slug.ts` | ~30 min | Low | Low — but fragile (sibling-directory tsconfig issue, see Vite #7932) |

**Recommendation: (A) Duplicate.** Rationale:

1. `slug.ts` is **53 lines** of pure functions with no dependencies. The drift risk is minimal — both copies are pure functions that take a string and return a string, with the SAME logic.
2. Adding npm workspaces mid-project is a structural change that touches root config, both workspaces' `package.json`, both `tsconfig.json`, and may break the existing RSS workflow CI which expects the current `cd pipeline && npm ci` pattern.
3. The codebase scan (Note 1) and refined request A23 both explicitly endorse the duplicate-with-tracked-Issues approach as "precedent (per astro-starlight-site A4)". Project convention is established.
4. Vite alias (option C) hits a documented Vite bug (issue #7932) where TypeScript tsconfig for the sibling directory is ignored — works in `dev` but type-checking gets fragile.

**Implementation:**

- Copy `pipeline/src/slug.ts` to `site/src/lib/slug.ts` verbatim (drop the `pipeline/` path comment; otherwise identical).
- Add a header comment: `// DUPLICATE of pipeline/src/slug.ts — keep in sync. Tracked in Issues - Pending Items.md.`
- Add to `Issues - Pending Items.md`: "Deduplicate slug.ts between site and pipeline (currently duplicated due to lack of monorepo tooling)" — under the existing "shared schema package" item from astro-starlight-site A4.
- Add a vitest test in `site/tests/slug.test.ts` (assuming Option A of codebase scan Note 2: add vitest to site) that covers the same cases as `pipeline/tests/slug.test.ts` — this provides drift detection.

**Future migration to workspaces.** When the project graduates from personal-account bootstrap and the team adds tools/, a CLI, or other workspaces, set up `npm workspaces` then. A single shared `@nbgaihub/shared` package can hold `slug.ts`, the Zod schemas, and shared types. **Not now.**

**Sources:**
- [Vite Issue #7932 — tsconfig files ignored when importing ts files from sibling directories](https://github.com/vitejs/vite/issues/7932)
- [Earthly Blog — Setup TypeScript Monorepo](https://earthly.dev/blog/setup-typescript-monorepo/)

## Recommendation

### Specific library and runtime choices

| Concern | Choice | Justification |
|---------|--------|---------------|
| Auth endpoint CORS workaround | **Cloudflare Workers** (free tier) | Cheapest, simplest, has the only existing reference Worker for this exact use case (gr2m/cloudflare-worker-github-oauth-login); zero-cost data plane stays browser-direct. |
| GitHub API client (browser) | **Raw `fetch()`** + small `fetchWithAuth` wrapper module | ~150-200 LOC saves ~20-50KB gzipped bundle vs Octokit; no maintenance dependency. |
| YAML / frontmatter parsing (validator) | **`gray-matter`** (already in `pipeline/package.json`) | Zero new dep; existing pipeline pattern. |
| Form-side schema validation | **Zod** (already transitively in Astro) | Reuses `content.config.ts` schema verbatim — single source of truth between client validation and CI validation. |
| Modal UI | **Native HTML `<dialog>`** | Built-in focus trap, Escape-to-close, screen-reader semantics; no framework island. |
| Header override target | **Starlight `SocialIcons` slot** | Lowest blast radius; sits in the right visual location. Avoid `Header` direct replacement. |
| Test runner (site-side new modules) | **Add vitest to site workspace** | Matches codebase-scan Note 2 Option A; cleaner separation. Pattern proven in pipeline. |
| Build-time pin index | **Standalone `scripts/build-pin-index.ts`** invoked before `astro build` | Simpler than an Astro integration hook; reuses `getCollection()` after `astro sync`. |
| Workflow trigger for validator | **`pull_request`** with `paths: ['skills/**/*.md']`, not `pull_request_target` | Secure-by-default; matches "validator is read-only" constraint (A22). |
| slug.ts reuse | **Duplicate** to `site/src/lib/slug.ts` with vitest drift test | Lowest risk, established project precedent (A23). |
| Token storage | **localStorage** under `nbgaihub.gh_token` + CSP + no-third-party-scripts policy | Best feasible option without a server; document trade-off clearly. |

### Specific code patterns

**`site/src/lib/auth.ts` skeleton:**
```typescript
const TOKEN_KEY = 'nbgaihub.gh_token';
const GIST_ID_KEY = 'nbgaihub.gist_id';
const PROXY_BASE = import.meta.env.PUBLIC_GH_OAUTH_PROXY; // e.g. https://nbgaihub-oauth.workers.dev
const CLIENT_ID = import.meta.env.PUBLIC_GH_CLIENT_ID;

if (!PROXY_BASE) throw new MissingConfigError('PUBLIC_GH_OAUTH_PROXY env var not set');
if (!CLIENT_ID) throw new MissingConfigError('PUBLIC_GH_CLIENT_ID env var not set');

export class MissingConfigError extends Error { /* ... */ }
export class DeviceFlowExpiredError extends Error { /* ... */ }
export class DeviceFlowDeniedError extends Error { /* ... */ }

export function getToken(): string | null { /* localStorage read */ }
export function signOut(): void { /* localStorage clear + emit event */ }

export async function signIn(): Promise<string> {
  const codeRes = await fetch(`${PROXY_BASE}/login/device/code`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, scope: 'repo' }),
  });
  const { device_code, user_code, verification_uri, interval, expires_in } = await codeRes.json();
  // emit UI event with user_code + verification_uri; user opens modal
  return pollToken(device_code, interval, expires_in);
}

async function pollToken(deviceCode: string, intervalSec: number, expiresInSec: number): Promise<string> {
  let interval = intervalSec;
  const deadline = Date.now() + expiresInSec * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const res = await fetch(`${PROXY_BASE}/login/oauth/access_token`, { /* ... */ });
    const body = await res.json();
    if (body.access_token) { localStorage.setItem(TOKEN_KEY, body.access_token); return body.access_token; }
    if (body.error === 'authorization_pending') continue;
    if (body.error === 'slow_down') { interval += 5; continue; }
    if (body.error === 'expired_token') throw new DeviceFlowExpiredError();
    if (body.error === 'access_denied') throw new DeviceFlowDeniedError();
    throw new Error(`Unknown device-flow error: ${body.error}`);
  }
  throw new DeviceFlowExpiredError();
}
```

**`site/src/lib/gist.ts` read-modify-write pattern:**
```typescript
export async function pin(token: string, record: PinRecord): Promise<void> {
  const gistId = await ensureGist(token); // discover or create
  const current = await readGist(token, gistId);
  const deduped = current.favourites.filter(r => !(r.type === record.type && r.slug === record.slug));
  deduped.push(record);
  await writeGist(token, gistId, { schema_version: 1, favourites: deduped });
}
```

**Workflow file structure** — see Topic 7 verbatim.

### Workflow shape

1. **One-time manual step** (user): register OAuth App at `github.com/settings/developers`, save `client_id`. Deploy Cloudflare Worker (paste the ~60-line file) and note its URL. Add both to `site/.env` as `PUBLIC_GH_CLIENT_ID` and `PUBLIC_GH_OAUTH_PROXY`.
2. **Implementation phase** (Phase 6/7): scaffold `site/src/lib/{auth,gist,submission}.ts`, the modal, the header override, the form, the my-pins page, the pin button, the schema extension, the validator + workflow + tests.
3. **Tests** (NF-P11): vitest in both `pipeline/tests/validators/skill.test.ts` and new `site/tests/{auth,gist,submission,slug}.test.ts`.
4. **Smoke test** (DoD #18): documented manual run through all 5 user-visible flows.

## Risks Identified

Risks that would force a spec revision if not addressed early:

| # | Risk | Severity | Mitigation | Option C status |
|---|------|----------|------------|------------------|
| **R1** | **CORS on GitHub OAuth endpoints blocks pure-static implementation.** | **Critical** | Add Cloudflare Worker proxy for two OAuth endpoints. Update SCOPE.md and DECISIONS.md to record "auth proxy is a deployed component; data plane stays serverless." | **RESOLVED** — Device Flow removed entirely. No OAuth handshake endpoint touched. PAT paste sidesteps the entire CORS problem. |
| **R2** | **"Private gist" is unlisted, not auth-protected.** | High | Update spec/gist contract to use "unlisted" and document the trust model. Filename is `nbgaihub-favorites.json` (per A9, keep), but contract doc must call this out. | **STILL APPLIES** — gist contract doc and the F-P21 privacy callout in the refined-request must use "unlisted" terminology and explain the URL-as-shared-secret trust model. |
| **R3** | **localStorage is XSS-readable; `repo` scope is broad.** | Medium | Lock CSP, ban third-party scripts in DECISIONS.md, document revocation path. | **PARTIALLY MITIGATED** — token scope under Option C is `gist` only, dramatically narrower than `repo`. The XSS-readable storage concern remains; CSP + no-third-party-scripts still apply. |
| **R4** | **Gist API lacks optimistic concurrency.** | Medium | Spec F-P8 must be amended to read-modify-write on every pin (two API calls instead of one). UI doesn't notice; correctness improves. | **STILL APPLIES** — refined-request F-P9 in the post-pivot spec is the read-modify-write protocol. |
| **R5** | **Fork creation is async (202) — up to 5 min.** | Low | F-P12 UX must surface "preparing fork" state; 30s timeout is acceptable for the 99% case; document the rare 5-min edge case. | **RESOLVED** — the hub no longer calls `POST /forks`. GitHub's own UI handles the fork when the user clicks "Propose new file" in the editor. |
| **R6** | **Header override target is wrong in spec (A15 says `Header`, should be `SocialIcons`).** | Low | Designer's contract should specify `SocialIcons` (or `PageFrame`-with-slot) as override target, not `Header`. | **STILL APPLIES** — sign-in UI under Option C also lives in the header. The override target is `SocialIcons` per the refined-request A15 (post-pivot). |
| **R7** | **`pull_request_target` would be a security hole.** | Low (we caught it) | Use `pull_request`. Document the choice in DECISIONS.md if questioned. | **STILL APPLIES** — validator workflow choice is unchanged. |
| **R8** | **No site-side test infra.** | Low | Add vitest to `site/devDependencies` + `site/tests/` directory. ~10 min setup. | **STILL APPLIES** — auth module, gist client, submission serialiser/URL builder/clipboard fallback all need site-side unit tests. |
| **R9** | **`PUT contents` does not implicitly create the branch.** | Low (spec already sequences correctly) | F-P12 step 4 (create ref) is mandatory before step 5 (PUT contents). Just don't shortcut it. | **RESOLVED** — the hub no longer calls `PUT /contents`. |
| **R10** | **Slug duplication carries drift risk.** | Low | vitest drift test in both workspaces, single Issues item, tracked. | **STILL APPLIES** — refined-request A23 (post-pivot) is unchanged. |

## Technical Research Guidance

**Research needed: No.**

The investigation gathered sufficient detail for each of the eight investigation topics. The implementation phase (Plan + Designer + Coder) has enough information to:
- Wire the Cloudflare Worker (the gr2m reference Worker is paste-and-go for our shape).
- Implement the auth/gist/submission TypeScript modules (raw `fetch` patterns are spelled out).
- Wire the Starlight `SocialIcons` override (Starlight's own docs include the exact pattern).
- Build the validator (existing `pipeline/` conventions cover every needed primitive).
- Decide on workspaces vs duplication (duplication recommended; rationale documented).

The remaining unknowns are **design decisions** (modal copy, exact form layout, sign-in error messaging) and **operational decisions** (which Cloudflare account, what worker domain, when to migrate to a GitHub App) — neither of which benefit from another research pass.

If implementation reveals an unforeseen Starlight 0.39-specific override quirk (the docs are stable across Starlight versions but our project pins 0.39 specifically), a 30-minute design spike during Phase 5 will resolve it without needing a separate research phase.

## Implementation Considerations

**Decisions still to be made (not blocking investigation, but require user/designer input):**

1. **OAuth App registration.** User must register the app at `github.com/settings/developers` and provide `client_id`. **Pre-condition for implementation start.**
2. **Cloudflare account / Worker hosting.** Decide: use the existing personal Cloudflare account or create a project account. **Pre-condition for implementation start.** Free tier is sufficient (Worker requests cap is 100k/day, our usage is ~5 requests per sign-in × <100 users/day).
3. **Worker domain.** Default `<name>.workers.dev` is fine for MVP. Custom domain later.
4. **Production site origin.** Worker's `ALLOWED_ORIGIN` must include both `http://localhost:4321` (dev) and whatever hosting platform we land on (`*.pages.dev` / `*.vercel.app` / `*.netlify.app`).
5. **Worker source repo.** Where does the Worker code live? **Recommendation:** new directory `oauth-proxy/` at NbgAiHub repo root, with `wrangler.toml`, `worker.ts`, `package.json`. Doesn't need to be in `site/` or `pipeline/`. Same repo keeps deployment scripts together.
6. **CSP `'unsafe-inline'` for scripts** — acceptable trade-off (Starlight requires it) or pursue tighter policy (more work)? **Recommendation:** accept; document.

**Dependencies / prerequisites for implementation:**

- OAuth App registered → `client_id` available.
- Cloudflare Worker deployed → proxy URL available.
- `site/.env` populated with `PUBLIC_GH_CLIENT_ID` and `PUBLIC_GH_OAUTH_PROXY`.
- Schema extension (F-P14) shipped first → unblocks form validation reuse.
- vitest added to site workspace → unblocks NF-P11 tests.

**Potential pitfalls:**

- **Astro's `import.meta.env.PUBLIC_*` rule:** any env var that should be exposed to client-side JS *must* start with `PUBLIC_`. Don't name them `GH_CLIENT_ID`; name them `PUBLIC_GH_CLIENT_ID`. Spec already uses this; just enforce it.
- **Starlight hydration timing:** the `SocialIcons` override runs at static-build time; any `localStorage` reads must happen in a client-side `<script>` block, not in the component's frontmatter. Pattern: ship a default "Sign in" button, then a small inline script promotes it to the signed-in state on hydration.
- **Worker preflight (OPTIONS) handling:** the Worker example handles `OPTIONS` correctly, but if the project drops in a different proxy (e.g., a self-built one), confirm preflight is implemented or `fetch()` will fail before the actual request.
- **`PUT contents` base64 encoding:** the request body's `content` field must be base64-encoded markdown. Use `btoa(unescape(encodeURIComponent(text)))` for Unicode safety, not naive `btoa()`.
- **Fork-default-branch:** `chomovazuzana/NbgAiHub` default branch is currently `main` per inspection — confirm before hardcoding. Use `GET /repos/{owner}/{repo}` and read `default_branch` field to be robust.

**Suggested first steps (for the Planner / Phase 4):**

1. Add a 0th task: "register OAuth App + deploy Cloudflare Worker" (manual, user-owned, completes before any code).
2. Sequence schema extension first (F-P14) — every form-validation and CI-validator task depends on it.
3. Auth + gist modules can be built and unit-tested without any UI integration (they're pure TS).
4. UI integration last (header, modal, pin buttons, my-pins page, form) — once the modules are proven by tests.
5. Validator workflow last among CI-side work — depends on a published validator binary (`pipeline/dist/validators/cli.js`).

## References

| # | Source | URL | Key takeaway |
|---|--------|-----|--------------|
| 1 | GitHub Docs — Authorizing OAuth apps | https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps | Device Flow exists, must be enabled per OAuth App; `repo` scope supported. |
| 2 | GitHub Docs — Troubleshooting OAuth app access token request errors | https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/troubleshooting-oauth-app-access-token-request-errors | Authoritative list of error codes and meanings. |
| 3 | RFC 8628 — OAuth 2.0 Device Authorization Grant | https://datatracker.ietf.org/doc/html/rfc8628 | Standard for `authorization_pending`, `slow_down`, polling interval semantics. |
| 4 | Andrea Zonca — Authenticate to GitHub in the Browser with the Device Flow (Jan 2025) | https://www.zonca.dev/posts/2025-01-29-github-auth-browser-device-flow | Explicit confirmation that CORS blocks browser-direct device flow; proxy workaround. |
| 5 | Simon Willison TIL — GitHub OAuth via Cloudflare Workers | https://til.simonwillison.net/cloudflare/workers-github-oauth | Canonical Cloudflare Worker pattern for GitHub OAuth proxying. |
| 6 | gr2m/cloudflare-worker-github-oauth-login | https://github.com/gr2m/cloudflare-worker-github-oauth-login | Reference Worker implementation — adapt for device flow endpoints. |
| 7 | IETF Draft — OAuth 2.0 for Browser-Based Applications | https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps-22 | BCP for browser OAuth; recommends BFF/proxy pattern. |
| 8 | "Secret" GitHub Gists Are Unlisted, Not Private — paul.af | https://paul.af/gist-complaints | Definitive statement on gist visibility semantics. |
| 9 | GitHub Changelog — Secrets in unlisted gists reported to scanning partners (Nov 2025) | https://github.blog/changelog/2025-11-25-secrets-in-unlisted-github-gists-are-now-reported-to-secret-scanning-partners/ | GitHub officially treats unlisted gists as semantically public. |
| 10 | GitHub Docs — Rate limits for the REST API | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api | 5000/hr authenticated; secondary 900 pts/min per endpoint; gist creation flagged as content-creation. |
| 11 | GitHub Docs — REST API endpoints for forks | https://docs.github.com/en/rest/repos/forks | Confirms 202 Accepted + async fork creation up to 5 min. |
| 12 | GitHub Docs — Create or update file contents | https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents | PUT contents requires existing branch (does not implicitly create). |
| 13 | nottrobin gist — Create branch, commit a change, open PR via API v3 | https://gist.github.com/nottrobin/a18f9e33286f9db4b83e48af6d285e29 | Reference choreography for fork → branch → file → PR. |
| 14 | Octokit npm | https://www.npmjs.com/package/octokit | Bundle-size guidance: prefer @octokit/request (~4KB) over @octokit/rest (~50KB+). |
| 15 | Starlight Docs — Overriding Components | https://starlight.astro.build/guides/overriding-components/ | Pattern for component overrides; warning against overriding Header directly. |
| 16 | Starlight Docs — Overrides Reference | https://starlight.astro.build/reference/overrides/ | Full list of overridable components, including `SocialIcons`. |
| 17 | Accessible Astro — Modal component | https://accessible-astro.incluud.dev/components/modal/ | Native `<dialog>` modal pattern reference. |
| 18 | Michael Fares — Native HTML dialog modals (Medium) | https://michael-fares.medium.com/easily-create-modals-in-2025-with-the-native-html-dialog-element-and-no-external-dependencies-881e03fa195c | 2025 best practice: prefer native `<dialog>` over JS modal libraries. |
| 19 | OAuth 2.0 Simplified — Security Considerations for SPAs | https://www.oauth.com/oauth2-servers/single-page-apps/security-considerations/ | localStorage XSS risk; CSP mitigation pattern. |
| 20 | Praetorian — GitHub Device Code Phishing | https://www.praetorian.com/blog/introducing-github-device-code-phishing/ | Device flow phishing vector — relevant for documenting user-visible warnings. |
| 21 | GitHub Security Lab — Preventing pwn requests | https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/ | Definitive guidance: avoid `pull_request_target` for any code-executing workflow. |
| 22 | DEV — `pull_request_target` Without Regret | https://dev.to/ollieb89/pullrequesttarget-without-regret-secure-fork-prs-in-github-actions-1jpi | Practical patterns for fork PR validation. |
| 23 | tj-actions/changed-files | https://github.com/marketplace/actions/changed-files | Job-level filter that avoids the workflow-level `paths:` pending-check trap. |
| 24 | GitHub Docs — Workflow commands for GitHub Actions | https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-error-message | `::error file=...` annotation format. |
| 25 | Vite Issue #7932 — tsconfig ignored for sibling-directory TS imports | https://github.com/vitejs/vite/issues/7932 | Known bug; reason to avoid the cross-workspace import approach for slug.ts. |
| 26 | Earthly Blog — Setup TypeScript Monorepo | https://earthly.dev/blog/setup-typescript-monorepo/ | Reference for the future "if/when we adopt workspaces" path. |
| 27 | GitHub Changelog — PKCE support for OAuth (July 2025) | https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/ | PKCE landed; still doesn't enable pure-browser OAuth on GitHub. |

## Original Request

> See `docs/refined-requests/personalization-and-contributions.md` for the full refined request (post-pivot: 31 ACs, 26 assumptions, 6 open questions, 21-item DoD).
>
> One-line restatement (post-pivot): add per-user pinning (PAT-scoped unlisted gist per user) and a skill-submission web form (URL-redirect to GitHub's native editor) to NbgAiHub, all from the static Astro site, plus a CI validator on `skills/*.md` PRs and the SCOPE/DECISIONS updates that come with reversing two prior "out-of-scope" / "deferred" entries.

## Option C Implementation Notes

This section is the post-pivot source of truth. Read it after the banner at the top of the doc; ignore Topic 1 ("Device Flow mechanics") and the OAuth-specific parts of Topic 6 for implementation purposes.

### 1. PAT scope and lifecycle

- **Scope:** classic PAT with **`gist` scope only**. Not `repo`. Not `public_repo`. Not `read:user`. The `gist` scope grants read/write to all the user's own gists and nothing else — about as narrow as a token can be while still being useful for this feature.
- **Acquisition UX:** the sign-in modal links the user to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub`. GitHub's token-creation page reads the `scopes` and `description` query params and pre-fills both, so the user only needs to set expiration and click "Generate token".
- **Validation:** site issues `GET https://api.github.com/user` with `Authorization: token <pasted>`. `api.github.com` sends `Access-Control-Allow-Origin: *` (confirmed in current GitHub docs and unchanged across the Device Flow era), so this works browser-direct from any origin. **200** → valid; store token + extracted `login` handle. **401** → invalid; surface inline error. We deliberately do NOT probe gist-list or any other endpoint as part of validation — `GET /user` is enough to confirm the token is alive and authenticated; the first real pin operation will surface any narrower scope/permission issue.
- **Storage:** `localStorage.setItem('nbgaihub.gh_token', token)` + `localStorage.setItem('nbgaihub.gh_user', login)`. The PAT is never sent to any origin other than `https://api.github.com` (CSP `connect-src 'self' https://api.github.com` enforces this).
- **Sign-out:** `localStorage.removeItem` on all three keys (`nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id`). The site does NOT call any revocation endpoint — GitHub doesn't expose one for PATs anyway.
- **Revocation:** user-mediated at `https://github.com/settings/tokens`. Deleting the token there immediately invalidates it on GitHub's side; the next API call from any open tab will 401. The site should detect that 401 globally and clear the local state (refined-request OQ4).

### 2. Fine-grained PAT compatibility

At the time of writing (May 2026), **fine-grained PATs cannot reliably access gists.** GitHub's "Managing your personal access tokens" docs (https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) acknowledge that fine-grained tokens have **feature gaps** versus classic PATs — and gist access via fine-grained tokens is one of those documented gaps. A web fetch against that page (2026-05-18) returned:

> "Fine-grained personal access tokens do not support every feature of personal access tokens (classic). These feature gaps are not permanent."

The doc lists gist permission under fine-grained Account Permissions in the permissions table, but the limitations section is the operative caveat — practical reports throughout 2025 and 2026 confirm that fine-grained tokens authenticate but routinely fail on gist read/write with permission errors. **Therefore the sign-in modal must say "classic personal access token" explicitly** and the `?scopes=gist` deep-link drops the user on the classic-token form, not the fine-grained one.

**Future-proofing:** if/when GitHub closes this gap, the only change required is updating the modal copy (the existing classic-token flow continues to work; fine-grained becomes an additional option). No code changes needed in the auth/gist modules.

### 3. URL-based new-file mechanics

GitHub exposes an undocumented-but-stable URL pattern for opening the editor with a pre-filled new file:

```
https://github.com/<owner>/<repo>/new/<branch>/<path>?filename=<name>&value=<content>
```

For NbgAiHub submissions, the concrete pattern is:

```
https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<urlencoded-markdown>
```

**Query parameters:**
- `filename=<slug>.md` — pre-fills the filename input on GitHub's editor.
- `value=<urlencoded>` — pre-fills the editor body. The encoding must be `encodeURIComponent` (RFC 3986 unreserved character set). GitHub's parser unescapes it server-side and feeds it into the Monaco-style editor that powers the new-file page.

**Behaviour for anonymous visitors:** GitHub's editor page detects no auth and prompts the visitor to sign in. After sign-in, if the visitor lacks write access to `chomovazuzana/NbgAiHub`, GitHub automatically forks the repo and opens the editor against the fork. Clicking "Propose new file" creates a branch on the fork, commits the file, and opens a PR back to `chomovazuzana/NbgAiHub:main`. The hub does not need to know or care about any of this choreography — GitHub handles it natively.

**Behaviour for collaborators with write access:** GitHub renders "Commit new file" instead of "Propose new file" and skips the fork step. Result is a direct commit on a new branch + PR (or direct push if "Commit directly to the main branch" is selected — discouraged by the form's default settings but not blocked).

### 3.1 URL length practical limits

Sources:
- **Stack Overflow** — https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers — the canonical reference. Summary across 2024–2026 updates: Chrome practical limit ~32KB total URL (but path + query becomes unreliable past ~8KB); Firefox practical limit ~65KB; Edge ~2KB documented but practical ~32KB; Safari ~80KB. **Practical "works everywhere" cutoff: ~2KB conservative, ~8KB pragmatic.**
- GitHub's own URL routing layer further trims overlong query strings — there is no published exact threshold, but empirical reports throughout 2024–2026 place the safe cutoff around 8KB.

**Recommendation:** detect URL length client-side immediately after building the redirect URL. **If `url.length > 7000`** (conservative cutoff well below the 8KB pragmatic limit), switch to the **clipboard-copy fallback**:

1. Call `navigator.clipboard.writeText(serialised_markdown)`. This requires a secure context (HTTPS or `http://localhost`) and a user gesture in the same tick (the form's submit click counts). If `writeText()` rejects (permission denied, insecure context, or older browser), surface a readonly `<textarea>` containing the serialised content with a manual "Copy" button as the fallback-of-the-fallback.
2. Navigate to the bare URL `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md` (no `value=` param).
3. Show the user a one-time toast/instructions: "Your submission was copied to the clipboard — paste it into the editor on the next screen, then click 'Propose new file'."

**Typical payload math:** a complete skill entry is ~500B of frontmatter + 1–2KB of body markdown = ~1.5–2.5KB raw → ~3–5KB URL-encoded (encoding inflates by ~2x for typical markdown). That's comfortably under 7000. Only skills with unusually long bodies (multi-page how-tos with embedded code blocks) will trip the fallback — exactly the case where the fallback's clipboard hop is least painful, since the user was already preparing a long submission.

### 4. Skill-side parity

The future `/hub-*` Claude skill reads and writes the **same gist** as the website. From the skill's perspective:

- The PAT is irrelevant — `gh` is already authenticated under the user's GitHub identity, and `gh api gists/<id>` works without any extra config.
- The skill performs the same discovery (`gh api gists --jq '.[] | select(.files["nbgaihub-favorites.json"]) | .id'`) and the same read-modify-write protocol on the wrapped JSON document.
- The gist contract document at `docs/reference/gist-contract.md` is the single source of truth that both surfaces (website JS + skill `gh api` calls) must conform to.

**Cross-surface concurrency:** if a user pins on the website while the skill is mid-write (or vice versa), the gist API's last-write-wins behaviour (R4) causes one of the two operations to silently overwrite the other. The read-modify-write protocol per F-P9 minimises the window — both sides re-read immediately before writing — but does not eliminate the race. **Acceptable for MVP**; if cross-surface concurrency becomes a real problem, the contract document is the place to add a versioning/etag scheme.

### 5. Sign-in UX copy (draft, for the Designer)

> **Sign in to NbgAiHub**
>
> To pin items across devices, paste a GitHub personal access token (PAT) with the `gist` scope. NbgAiHub uses it **only** to read and write your own favourites gist — nothing else.
>
> **[Generate a token →]** *(links to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` — opens in a new tab; the scope and name are pre-filled)*
>
> 1. Click "Generate token" on the GitHub page that opens.
> 2. Copy the new token (you'll see it once).
> 3. Paste it below.
>
> Token: `[••••••••••••••••••••]` *(password-style input)*
>
> *(checkbox unchecked by default)* Remember this token on this browser
>
> **[Validate & sign in]**
>
> To revoke later, go to **github.com/settings/tokens** and delete the token.

This copy is a starting point — the Designer/Coder phases will adapt it for the actual modal markup.
