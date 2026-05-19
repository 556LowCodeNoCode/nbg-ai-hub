# NbgAiHub — Functional contract

Single source of truth for **what the project's components do**, expressed as labelled functional requirements. Implementation, interfaces, and signatures live in `project-design.md` (owned by the Designer). Sequencing and verification criteria live in the per-feature plan files (`plan-NNN-*.md`).

When a new feature is planned, append a new section to this file with its `F<N>` functional contract entries.

**Last updated:** 2026-05-19 (added Personalization & contributions block)

---

## RSS news pipeline (plan-001-rss-pipeline)

The pipeline is a daily-scheduled, TypeScript-based GitHub Action that fetches a curated list of RSS/Atom feeds, deduplicates against previously seen items, calls Azure OpenAI for relevance triage and metadata generation, writes each new relevant item as a markdown file under `/news/incoming/`, and opens an editorial pull request. The PR is the editorial gate; merges to `main` are human-only.

### F1 — Scheduled execution

A GitHub Action workflow at `.github/workflows/rss-triage.yml` runs on a daily cron schedule (`0 5 * * *` UTC, which equals 08:00 Europe/Athens during DST and 07:00 in winter; one-line change to swap). The workflow also supports manual triggering via `workflow_dispatch`.

### F2 — Configurable feed list

Feeds are read from `config/rss-sources.json` at runtime. Each entry exposes at minimum: `name` (human label), `url`, `enabled` (boolean). The five candidate URLs from `SCOPE.md` (Anthropic, Claude Code GitHub releases, Simon Willison, r/ClaudeAI, Hacker News filtered) ship as the initial seed list with `enabled: true`. Adding or removing a feed is a JSON edit, not a code change.

### F3 — Feed fetching and parsing

The pipeline fetches all enabled feeds over HTTPS, parses RSS 2.0 and Atom transparently, and yields a normalized item shape: `{ feedName, guid, link, title, publishedAt, rawContent }`. Network or parse failure on an individual feed is logged and skipped; remaining feeds proceed. If all feeds fail, the run exits non-zero (no silent zero-item runs).

### F4 — Deduplication

For each fetched item, the pipeline computes a stable fingerprint (SHA-256 of `feedName + (guid || link || title)`, hex-truncated to 16 chars) and skips items whose fingerprint already appears in any `.md` file under `/news/incoming/` or `/news/published/`. No item is sent to Azure OpenAI twice across runs. The markdown files are the source of truth — no separate state file.

### F5 — Azure OpenAI triage call

For each new, non-duplicate item, the pipeline calls Azure OpenAI chat completions with a single prompt that returns a JSON object:

```json
{
  "relevant": true,
  "audience": "beginner" | "advanced" | "both",
  "topics": ["setup", "workflow", "..."],
  "summary": "Two sentences."
}
```

If `relevant === false`, the item is dropped (no markdown file emitted). Malformed responses are rejected and logged with the raw payload.

### F6 — No fallback config

On invocation, the pipeline reads `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_API_KEY` from `process.env`. If any is missing or empty, the pipeline throws an explicit, named exception identifying the missing variable, and the Action step fails. No silent defaults. No `||` fallbacks. No `.env` file lookup in production runs.

### F7 — Markdown file emission

Each relevant item is written to `/news/incoming/<YYYY-MM-DD>-<slug>.md`. Date is the run date (UTC). Slug is lowercase kebab-case of the item title, truncated to 60 characters at a word boundary, non-alphanumerics stripped. Same-day collisions get a `-2`, `-3`, … suffix.

### F8 — Frontmatter conformance

Each emitted file's frontmatter conforms to the canonical "Shared content shape" from `DECISIONS.md`:

```yaml
---
type: news
title: "<item title>"
audience: beginner | advanced | both
topics: [...]
internal: false
authored: <YYYY-MM-DD run date>
last_reviewed: <YYYY-MM-DD run date>
external_link: <item link>
deeper_link: null
ai_summary: "<two-sentence summary>"
source: "<feed name>"
fingerprint: "<dedup key>"
---
```

The body is the two-sentence summary followed by a `> Source: [<feed name>](<link>)` line.

### F9 — Pull request creation

After all items are written, if at least one new file exists, the workflow commits the changes on a new branch named `news-triage/YYYY-MM-DD-<short-run-id>` (where `<short-run-id>` is the first 7 chars of `GITHUB_RUN_ID`) and opens a PR with title `News triage YYYY-MM-DD` (literal, UTC date). The PR body lists each new item: `title`, `source`, `external_link`, `ai_summary`. If no new items are emitted, no PR is opened (idempotent no-op).

### F10 — Editorial workflow (documented, not coded)

Editors review the PR, optionally delete or edit files in `/news/incoming/`, **move** approved files to `/news/published/` (either by editing the PR before merge or in a follow-up PR), then merge. The pipeline does not enforce this — it is the human editorial gate by design (per `DECISIONS.md` "Curated RSS, not auto-aggregated"). The pipeline does not auto-prune stale items in `/news/incoming/`; backlog management is the editor's job. The `last_reviewed` frontmatter field is set to the run date at emission; an editor moving the file to `/published/` should bump `last_reviewed` to their date.

---

## Astro Starlight site (plan-002-astro-starlight-site)

The site is a TypeScript-based Astro 6 + Starlight 0.39 static site under `site/` that renders the hub's five pillars (Skills, Tips, News, Journeys, Glossary) plus supporting pages. It reads content via Astro 6's `glob()` loader directly from sibling repo content folders (`../news/published/`, `../skills/`, `../tips/`, `../glossary/`, `../journeys/`), exposes a declarative 9-entry left sidebar, ships built-in search (Pagefind, Starlight default), and runs locally on port 4321. Hosting is deferred; the MVP success criterion is "working dev server with all sidebar entries clickable and the news collection rendered from `/news/published/`."

### F1 — Workspace scaffolding

`site/` is a sibling workspace to `pipeline/` with its own `package.json` (declaring `astro ^6.x` and `@astrojs/starlight ^0.39.x` as direct deps), `tsconfig.json` (extending Starlight's recommended strict TS config, plus `noUncheckedIndexedAccess: true`), `astro.config.mjs`, `src/content.config.ts`, `src/`, `public/`, and `.nvmrc` pinned to `22`. ESM only (`"type": "module"`). No monorepo tooling; `site/` and `pipeline/` are independent npm workspaces.

### F2 — Content collections

`src/content.config.ts` defines 5 collections via Astro 6's `glob()` loader, each pointing at the corresponding `../<folder>/*.md` path with a strict Zod schema (Zod imported from `astro/zod`, not `astro:content`):

| Collection | Source path | Schema notes |
|---|---|---|
| `news` | `../news/published/*.md` | 12 canonical keys + `source` + `fingerprint` + optional `hero_image`. `generateId` callback strips `^\d{4}-\d{2}-\d{2}-` from filenames so `entry.id` is URL-clean. |
| `skills` | `../skills/*.md` | 12 canonical keys, `type: z.literal('skill')`. |
| `tips` | `../tips/*.md` | 12 canonical keys, `type: z.literal('tip')`. |
| `glossary` | `../glossary/*.md` | 12 canonical keys, `type: z.literal('glossary')`. |
| `journeys` | `../journeys/*.md` | 12 canonical keys, `type: z.literal('journey-step')`. |

Schema is duplicated, not imported, from `pipeline/src/frontmatter.ts` (per refined-request A4 trade-off — drift risk acknowledged for MVP).

### F3 — Declarative sidebar

`astro.config.mjs` configures the Starlight sidebar with 9 entries in this exact order: Home, Start Here (collapsible group containing Day 1 and Week 1), News, Skills, Tips & Tricks, Glossary, Reference, Contribute. Entries use `link:` (not `slug:`) because the targets are `.astro` pages under `src/pages/`, not Markdown under `src/content/docs/`. Trailing slashes preserved on every `link:` value to match Starlight's `trailingSlash: 'always'` default.

### F4 — Homepage (`/`)

`src/content/docs/index.mdx` with `template: splash` (removes sidebar/TOC chrome for a landing-page feel). MDX imports `HomeHero` (title, tagline, two primary CTAs: "Start Here → Day 1" and "Browse Skills") and `NewsPanel` (5 most recent published news items, compact cards), plus an optional row of "featured" cards for Tips, Skills, Glossary. MDX is required (not plain `.md`) because of the component imports; Starlight bundles MDX support, so no separate `@astrojs/mdx` integration is added.

### F5 — `/news` index

`src/pages/news/index.astro` wraps `<StarlightPage>` and renders `NewsList` showing all items in the `news` collection sorted by `data.authored` descending, with `AudienceFilter` and topic filters at the top. Empty-state fallback when `news/published/` is empty: "No items yet. See [Contribute](/contribute) for how to add one."

### F6 — `/news/<slug>` per-item pages

`src/pages/news/[slug].astro` auto-generates one route per news item via `getStaticPaths()` returning `{ params: { slug: item.id }, props: { item } }` (where `item.id` is the clean date-stripped slug from F2's `generateId`). Each page renders title, `AudienceBadge`, topic chips, source name, a "Read on source ↗" link to `external_link`, and the `ai_summary` as body. Rendered via `await render(item)` (Astro 6 idiom — not the legacy `await item.render()`).

### F7 — Catalog pages

`src/pages/skills.astro` and `src/pages/tips.astro` render card grids of their respective collections using `SkillCard` (with empty-state fallback). `src/pages/glossary.astro` renders a single page with one `<section id="<term-slug>">` per glossary term, supporting `/glossary#<term-slug>` anchor links (per DECISIONS.md "Hybrid glossary"). `src/pages/reference.astro` is a hand-authored markdown cheatsheet wrapped in `<StarlightPage>`. `src/pages/contribute.astro` is a hand-authored PR contribution-flow page wrapped in `<StarlightPage>`. All hand-authored content carries the *"what I wish I knew a year ago"* tone — opinionated, plainspoken, no marketing voice.

### F8 — `/start-here/day-1` placeholder

`src/pages/start-here/day-1.astro` renders a page with headings for each of the 6 designed Day 1 steps (install → first session → survival keys → CLAUDE.md → skills & team marketplace → where to go next) plus "coming soon" body content. Real content is captured in SCOPE.md MVP table; this phase only builds the page shell. Optionally `src/pages/start-here/week-1.astro` exists as a deeper-placeholder ("Week 1 — coming soon.") to satisfy the sidebar link.

### F9 — Empty-state fallbacks

When `news/published/`, `skills/`, `tips/`, `glossary/`, or `journeys/` is empty, the corresponding page renders a consistent friendly message: *"No items yet. See [Contribute](/contribute) for how to add one."* No crash, no empty grid, no template gaps. The homepage `NewsPanel` shows the same fallback when news is empty.

### F10 — Beginner/Advanced audience filter

`AudienceFilter.astro` renders three checkboxes (Beginner, Advanced, Both — all checked by default). On any checkbox change, an inline vanilla `<script>` block reads the checked set and toggles a `audience-hidden` CSS class on every `[data-audience]` element whose `data-audience` value is not in the set. State is persisted to `localStorage` under key `nbgaihub.audience` and restored on every page load. Pure client-side DOM toggle — no fetch, no framework, no view-transition complications (Starlight does not enable `<ClientRouter />` by default, so scripts run from scratch on every full-page navigation).

### F11 — Search

Pagefind index is built at `npm run build` time via Starlight's bundled `astro:build:done` hook. The Starlight header search bar is functional in the built/preview output. In `dev` mode the search button shows a "production only" notice — expected behavior. AC17 verifies `dist/pagefind/` exists post-build.

### F12 — Strict frontmatter validation

A markdown file in any source folder that fails its collection's Zod schema causes `astro check` (or `npm run build`) to fail with a clear, named-file-and-field error. No silent skipping. The `npm run check` script is `astro sync && astro check` (sync first to mitigate the known silent-exit wart). The `npm run build` script is `astro check && astro build` to chain validation into the production build. NF8 ("no fallback config") applies — schema violations, missing config files, and missing dependencies all fail loudly.

---

## Hub plugin (plan-003-hub-plugin)

The hub plugin is the third sibling workspace (`plugin/`) alongside `pipeline/` and `site/`. It is a Claude Code marketplace plugin distributed via `/plugin marketplace add chomovazuzana/NbgAiHub` and installable as `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`. The plugin ships eleven `/hub-*` slash commands implemented as thin markdown shells that pre-execute compiled Node ESM scripts; the scripts read a bundled markdown snapshot of the five content pillars and emit plain-text output that the LLM presents verbatim. Per-user state (audience filter, last-used journey) persists at `${CLAUDE_PLUGIN_DATA}/state.json`; opt-in `/hub-refresh` pulls the latest content via `git pull` into `${CLAUDE_PLUGIN_DATA}/snapshot/`.

### F1 — Workspace scaffolding

A `plugin/` workspace at the repo root contains: `package.json` (Node 22, ESM, TypeScript strict, vitest 4.x, gray-matter, yaml, open, esbuild dev-dep), `tsconfig.json` (mirroring `pipeline/tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `target: ES2023`, `module: NodeNext`, `outDir: ./dist`, `rootDir: ./src`), `eslint.config.js` (ESLint 9 flat config, `@typescript-eslint`), `vitest.config.ts`, `.nvmrc` pinned to `22`, `.claude-plugin/plugin.json` (the plugin manifest), `commands/` (markdown shells), `src/` (TypeScript sources), `src/lib/` (shared modules), `tests/`, `snapshot/` (bundled content), `scripts-build/` (build + snapshot scripts), `dist/` (compiled `.mjs` bundles — committed to repo), and `README.md`.

### F2 — Plugin manifest at `plugin/.claude-plugin/plugin.json`

The plugin manifest lives at `plugin/.claude-plugin/plugin.json` (per Claude Code spec, not `plugin/plugin.json`). It declares `name: "nbg-ai-hub"` (the only required field), plus `$schema`, `description`, `author`, `repository`, `license`, `keywords`. The `version` field is deliberately omitted during active development so Claude Code uses each commit SHA as the cache key. The manifest does NOT enumerate commands — slash commands are filesystem-discovered from `plugin/commands/<name>.md`.

### F3 — Marketplace manifest at repo-root `.claude-plugin/marketplace.json`

The marketplace manifest lives at the repo root in `.claude-plugin/marketplace.json` (not inside `plugin/`). It declares `name: "nbg-ai-hub-marketplace"`, `owner`, and a `plugins` array with one entry: `{ name: "nbg-ai-hub", source: "./plugin", description, category: "knowledge-management", keywords }`. The relative-path `source` resolves against the marketplace clone root, pointing Claude Code at the `plugin/` workspace.

### F4 — `/hub` entry point

Renders the discoverability menu: the five pillar labels (Skills, Tips, News, Glossary, Journeys), the user's last-used journey if any (read from persistent state), and the current audience filter. The user is invited to select a pillar by invoking the corresponding `/hub-<pillar>` command.

### F5 — `/hub-search <query>` full-text search

Tokenizes the query, walks the active snapshot (bundled or refreshed — see F12), scores each item by case-insensitive substring match weighted title×5, frontmatter `topics`×3, body×1. Returns the top-10 ranked hits with title, pillar, audience badge, 200-char snippet centered on the first query-term match, and the absolute file path. Respects the current audience filter unless `--all` is appended.

### F6 — `/hub-skills [topic]` skill listing

Lists every skill in `snapshot/skills/`. For each: name (frontmatter `title`), one-line description (frontmatter `ai_summary` or body excerpt), location (`external_link` or relative path), install command (`install_command` from frontmatter), audience badge, topics. Optional `[topic]` argument filters to entries whose frontmatter `topics` array contains the value (case-insensitive). Respects the audience filter.

### F7 — `/hub-tips [topic]` tips listing

Lists every tip in `snapshot/tips/`. For each: title, audience, topics, one-line excerpt. Optional `[topic]` argument filters by `topics` array membership. Respects the audience filter.

### F8 — `/hub-news [--week|--today]` news listing

Lists news items from `snapshot/news/published/` sorted by frontmatter `authored` descending. Default range: last 7 days. `--week`: explicit last 7 days. `--today`: items where `authored` equals today's UTC date. For each: title, audience, topics, source, two-sentence summary, "Read on source" link (`external_link`). Respects the audience filter.

### F9 — `/hub-glossary <term>` term lookup

Looks up the term in `snapshot/glossary/` by filename basename or frontmatter `title` (case-insensitive). Returns the markdown body verbatim plus related terms discovered by scanning other glossary files for `[<this-term>]` inline links. Missing term: clear "term not found" message with the three closest matches by string distance.

### F10 — `/hub-onboard <journey>` guided walk

Resolves the journey by filename basename from `snapshot/journeys/` (dynamic lookup, no hardcoded allowlist). Renders the body verbatim. For journeys whose body matches the placeholder template ("coming soon" marker), renders the placeholder plus a `[content in progress]` note rather than throwing. Updates `lastJourney` in persistent state. Supports the named journeys `day-1`, `week-1`, `backend`, `data-scientist`, `ml-engineer`, and any future journey added by dropping a markdown file into `journeys/`.

### F11 — `/hub-install <skill-id>` skill install command echo

Looks up the skill in `snapshot/skills/` by frontmatter `id` (or filename basename). Echoes the frontmatter `install_command` verbatim and instructs the user to run it. The plugin does NOT execute the install on the user's behalf — Claude Code's marketplace flow runs installs. Missing skill: clear "skill not found" message plus nearby skill ids.

### F12 — `/hub-audience <beginner|advanced|both>` persistent filter

Sets the persistent audience preference, written to `${CLAUDE_PLUGIN_DATA}/state.json` (with an XDG fallback path for non-Claude-Code invocations). Subsequent `/hub-*` browse commands read this value and filter accordingly: `both` shows all; `beginner` shows `beginner` + `both` items; `advanced` shows `advanced` + `both` items. Invoking with no argument prints the current value. Invalid argument throws `InvalidAudienceError` naming the valid set (no fallback per project rule).

### F13 — `/hub-refresh` content refresh

Clones the hub repo (first run) or `git pull`s (subsequent runs) into `${CLAUDE_PLUGIN_DATA}/snapshot-clone/`, builds a staging directory `${CLAUDE_PLUGIN_DATA}/snapshot-new/` mirroring the five pillars, writes `.snapshot-meta.json`, then atomically renames staging → `${CLAUDE_PLUGIN_DATA}/snapshot/`. On success: prints counts per pillar plus the new freshness timestamp. On failure (clone error, network failure, git error): the previous snapshot is preserved untouched and the error is surfaced verbatim. The bundled snapshot at `${CLAUDE_PLUGIN_ROOT}/snapshot/` remains the install-time baseline; the snapshot loader prefers `${CLAUDE_PLUGIN_DATA}/snapshot/` when present.

### F14 — `/hub-open [section] [subsection]` deep-link

Builds a deep-link URL from `plugin/config.json` (`devMode` flag selects between `localhost:4321` and `productionUrl`) and opens the user's default browser via the `open` npm package. URL forms: bare → `<base>/`; pillar (e.g., `news`) → `<base>/<pillar>/`; glossary + term → `<base>/glossary#<term>`; journey shortcut (`day-1`, `week-1`) → `<base>/start-here/<journey>/`. Unknown section throws `UnknownSectionError` naming the valid set. When `devMode: true`, probes `localhost:4321` first; if the dev server is not running, prints a "run `cd site && npm run dev`" message and exits without opening. When `devMode: false` AND `productionUrl` is the literal sentinel `PLACEHOLDER_NOT_YET_DEPLOYED`, prints the would-be URL plus a "not yet deployed" message.

### F15 — Bundled snapshot delivery

At plugin build / publish time, `scripts-build/build-snapshot.mjs` copies `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` from the repo root into `plugin/snapshot/`, preserving the directory layout. The script writes `plugin/snapshot/.snapshot-meta.json` with `{ generatedAt: ISO8601, sourceCommit: <git-sha> }`. The snapshot is committed to the plugin's published version so first install needs no network. The script is idempotent (running twice produces the same file set, only the timestamp changes).

### F16 — Single source of truth

No plugin command duplicates or rewrites markdown bodies. All content displayed is read verbatim from the active snapshot (bundled or refreshed). Frontmatter is parsed via `gray-matter` with the explicit `yaml` engine (avoiding YAML 1.1 date-auto-coercion); bodies are rendered as-is. The frontmatter schema matches the canonical 10-key "Shared content shape" plus news-specific extras (`source`, `fingerprint`, optional `editor_confidence`, optional `hero_image`) — same shape consumed by the site.

### F17 — Audience filter shared semantics

Audience filter values are exactly `beginner | advanced | both`, matching the site's `localStorage.nbgaihub.audience` semantics. `both` shows all items; `beginner` shows items whose frontmatter `audience` is `beginner` or `both`; `advanced` shows items whose frontmatter `audience` is `advanced` or `both`. The filter is applied consistently across `/hub-search`, `/hub-skills`, `/hub-tips`, `/hub-news`, and `/hub-glossary` browse paths.

### F18 — No fallback for missing configuration

Per global CLAUDE.md: any required configuration value (production URL, snapshot path, refresh URL, plugin config file) absent at runtime causes an explicit named exception — `MissingPluginConfigError`, `SnapshotNotFoundError`, `InvalidAudienceError`, `UnknownSectionError`, `JourneyNotFoundError`, `SkillNotFoundError`, or `RefreshFailedError`. No silent defaults. First-run state bootstrap returns `{ audience: 'both', lastJourney: null }` as documented user-state initialization (not a config fallback) — recorded in the DECISIONS.md plugin entry. Any genuine exception case is registered in `Issues - Pending Items.md` before being implemented.

---

## Personalization & contributions (plan-003-personalization)

Adds per-user favourites and a low-friction skill-submission flow to the web hub, both backed by GitHub (no servers, no proxies). Personalization = each signed-in user (PAT-paste with `gist` scope) can pin/unpin any hub content item, stored in an unlisted GitHub gist they own. Community contributions = anyone (no auth) can submit a new Skills entry via a guided web form that URL-redirects to GitHub's native new-file editor. A CI validator enforces frontmatter discipline on every `skills/*.md` PR. Anonymous browsing is preserved.

For the full ordered functional list see refined-request `docs/refined-requests/personalization-and-contributions.md` §Functional (F-P1..F-P25). Below are the load-bearing functional codes plus two newer plan-side codes for build-time pin index emission and URL-redirect submission. The F-P1..F-P25 numbering is reused 1:1 from the refined request; F-P-AUTH/F-P-PIN/F-P-SUB are aliases that group the codes by concern.

### F-P-AUTH-1 — PAT validation via `GET /user`

On sign-in, the site sends `GET https://api.github.com/user` with `Authorization: token <pasted-PAT>`. **200** → extract `login`, store at `nbgaihub.gh_user`, store the token at `nbgaihub.gh_token`, close the modal. **401** → "invalid or expired token" inline. **Other 4xx/5xx** → surface status + message. Token never sent to any other origin. (Aliases F-P2 + F-P3.)

### F-P-AUTH-2 — Sign-in modal + localStorage persistence

The sign-in affordance is rendered via Starlight's `SocialIcons` slot override (not a Header override — chosen for upgrade-stability). Clicking opens a `<dialog>` modal explaining the `gist`-only PAT scope, with a deep-link to `https://github.com/settings/tokens/new?scopes=gist&description=NbgAiHub` and a password-style input. On successful validation, the three localStorage keys (`nbgaihub.gh_token`, `nbgaihub.gh_user`, `nbgaihub.gist_id` once first pin happens) are populated. Components subscribe to auth state via `site/src/lib/auth.ts::subscribe(cb)` — no scattered direct `localStorage` reads. (Aliases F-P1 + F-P4.)

### F-P-AUTH-3 — Sign-out clears localStorage

The sign-out affordance, visible when authenticated, removes `nbgaihub.gh_token`, `nbgaihub.gh_user`, and `nbgaihub.gist_id` from `localStorage` and triggers UI re-render so pin buttons revert to "Sign in to pin". The gist itself is **not** deleted — the user owns it and can delete it manually at github.com/gists. (Alias F-P5.)

### F-P-PIN-1 — Build-time pin index emission

During `npm run build`, the script `site/scripts/build-pin-index.ts` reads each of the five content collections (skill, tip, news, journey-step, glossary) via the Astro content layer and writes one JSON index per type to `site/public/_data/<type>-index.json` (five files total). Each index is a flat array of `{slug, title, audience, internal}` records with no body content. The `/my-pins/` page fetches these at runtime and joins them client-side against the gist `favourites[]` array — this keeps the page renderable without a fetch round-trip for every pinned item's full record. (Backs F-P11.)

### F-P-PIN-2 — Pin/unpin via gist read-modify-write

Every pin/unpin operation follows the RMW protocol from the gist data contract (`docs/reference/gist-contract.md`): `GET /gists/<id>` → parse `files["nbgaihub-favorites.json"].content` → mutate `favourites[]` (insert prepended; dedup by `(type, slug)`; idempotent) → `PATCH /gists/<id>` with the updated content. No ETag. Last-write-wins on a two-tab race. On `404` for a cached gist id, re-run discovery once. On first-ever pin, `findOrCreateFavoritesGist()` issues `POST /gists` with `public: false` and the wrapped initial document. (Aliases F-P8 + F-P9 + F-P10.)

### F-P-PIN-3 — /my-pins/ page with stale-reference handling

`site/src/pages/my-pins.astro` renders a shell; a client script fetches the gist + the five `<type>-index.json` files, joins each pin record's `(type, slug)` against the index, and renders one section per type (order: skill, tip, news, journey-step, glossary). Anonymous visitor → "Sign in to see your pins" panel. Pinned record whose `(type, slug)` no longer resolves in the index → rendered as a dimmed "Pinned item no longer available — [unpin]" row; clicking unpin removes the dangling entry via the standard RMW path. (Alias F-P11.)

### F-P-SUB-1 — Anonymous submission form with live validation

`site/src/pages/submit-skill.astro` renders a multi-section form covering all required `Skill` frontmatter fields (`title`, `audience`, `topics`, `internal`, `authored`, `last_reviewed`, `external_link`, `deeper_link`, `ai_summary`, `install_command`, `skill_id`, `origin`, `category`, `status`, `maintainer`, optional `requires`) plus a markdown body textarea. **Anonymous-accessible — no PAT required.** Client-side validation mirrors the CI validator's 17 rules (frontmatter completeness, `install_command` prefix, `skill_id` regex `/^[a-z0-9-]+$/`, enum values for `audience`/`origin`/`category`/`status`, date format on `authored`/`last_reviewed`). Submit button disabled until all required fields validate. Slug is derived from the title via the kebab-case + 60-char rule shared with `pipeline/src/slug.ts`. (Aliases F-P12 + F-P13 + F-P16 + F-P17.)

### F-P-SUB-2 — URL-redirect to GitHub editor (7000-char clipboard fallback)

On submit, the client assembles `---\n<yaml-frontmatter>\n---\n<body>\n`, URL-encodes it, and computes `https://github.com/chomovazuzana/NbgAiHub/new/main/skills?filename=<slug>.md&value=<urlencoded-content>`. If URL length ≤ 7000 chars → navigate directly (`window.location.assign` or `<a target="_blank">` click). If length > 7000 chars → copy the file content to the clipboard, navigate to the bare new-file URL, and surface a "your skill content is on your clipboard — paste it into the editor" toast. GitHub's own UI handles fork/branch/PR mechanics from there — NbgAiHub does no write-API calls for submissions. (Aliases F-P14 + F-P15.)

### F-P-VAL-1 — CI validator 17-rule frontmatter check + GH Actions annotations

`.github/workflows/validate-skill-submission.yml` runs on `pull_request` (opened, synchronize, reopened) with `paths: ['skills/**/*.md']`. The job invokes `node pipeline/dist/validators/cli.js <changed-files...>` and the validator (`pipeline/src/validators/skill.ts`) applies 17 rules: frontmatter parses; 16 required fields present; `type` literal == `"skill"`; `audience`/`origin`/`category`/`status` enums; `topics` non-empty `string[]`; `internal` boolean; `authored`/`last_reviewed` date `YYYY-MM-DD`; `external_link` is null or parseable URL (with HEAD reachability check; 429 → warn-and-pass per AC20); `deeper_link` null-or-URL; `ai_summary` non-empty; `install_command` starts with `/plugin marketplace add ` or `/plugin install `; `skill_id` matches `/^[a-z0-9-]+$/`; `maintainer` matches `^@[\w-]+$` or appears in `config/maintainers.json::team_aliases`; `requires` optional string array; file basename matches `<skill_id>.md`. Failures emit `::error file=<path>,line=1::<field>: <message>` annotations that surface inline on the PR diff. Uses default `GITHUB_TOKEN`; never writes to the repo. Exit codes: 0 = all valid, 1 = ≥1 invalid, 2 = internal error (e.g. missing `config/maintainers.json`). (Aliases F-P18 + F-P19.)

### F-P-DOC-1 — Documented gist data contract

`docs/reference/gist-contract.md` documents the wire format shared by the web site and the future Claude-side `/hub-*` skill: localStorage keys, gist filename `nbgaihub-favorites.json`, **unlisted (not private) visibility**, wrapped JSON shape `{schema_version: 1, favourites: [{type, slug, pinned_at}]}`, read-modify-write protocol, dedup rule, schema-versioning tolerance, error modes, privacy callout, and the explicit "Claude-side skill MUST follow this contract" requirement. (Aliases F-P20 + F-P21.)

### F-P-NF — Non-functional constraints (per refined-request NF-P1..NF-P13)

TypeScript strict + `noUncheckedIndexedAccess`. No fallback config (missing `config/maintainers.json` throws). Anonymous build path unchanged (`npm run build` produces fully-functional static site with no GH API at view time). No runtime AI on the site. Dev port still `4321`. `astro check` and `npm run build` both exit 0. Each new functional unit has Vitest coverage (`site/` 127 tests; `pipeline/` 112 tests post-Wave B).
