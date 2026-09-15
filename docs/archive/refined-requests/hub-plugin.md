# Refined Request: Hub-as-Skill Plugin (`/hub-*` Commands inside Claude Code)

## Category

Development (Claude Code plugin / TypeScript tool + Markdown slash commands + marketplace packaging). Sibling workspace to existing `pipeline/` and `site/`.

## Objective

Build the **full scope** of the NbgAiHub Claude Code plugin — installable via `/plugin marketplace add chomovazuzana/NbgAiHub` — that brings the hub *inside* Claude Code so bank colleagues never have to leave their terminal. The plugin reads the **same markdown content** as the Astro Starlight site (single source of truth: `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`) and exposes eleven `/hub-*` commands covering discovery (`/hub`, `/hub-search`), pillar browse (`/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`), guided onboarding (`/hub-onboard`), installation (`/hub-install`), persistent preferences (`/hub-audience`), content refresh (`/hub-refresh`), and web deep-linking (`/hub-open`). Ships with a **bundled content snapshot** at install time; users opt into updates via `/hub-refresh`.

## Scope

### In scope

- `plugin/` workspace at repo root (sibling to `pipeline/` and `site/`) — own `package.json`, `tsconfig.json`, `node_modules/`, plugin manifest, command files, snapshot, and TS source.
- **Claude Code plugin manifest at `plugin/.claude-plugin/plugin.json`** (corrected from earlier `plugin/plugin.json` after Phase 3a investigation). Declares `name`, `version`, `description`, `author`. **The manifest does NOT enumerate commands** — slash commands are filesystem-discovered from `plugin/commands/<name>.md`.
- **Marketplace manifest at repo-root `.claude-plugin/marketplace.json`**, listing one plugin entry with `source: "./plugin"`. This is what `/plugin marketplace add chomovazuzana/NbgAiHub` resolves to.
- **Eleven slash commands** with the behaviors in the raw-request table. Each command is authored as a markdown file in `plugin/commands/<name>.md`. The markdown body is an LLM prompt that pre-executes a bundled Node script via `` !`node ${CLAUDE_PLUGIN_ROOT}/dist/<command>.mjs $ARGUMENTS` `` (Claude Code resolves `${CLAUDE_PLUGIN_ROOT}` to the plugin install path). The script's stdout becomes context the LLM uses to answer. TypeScript sources live under `plugin/src/<command>.ts` and compile to `plugin/dist/<command>.mjs`. Per global CLAUDE.md: TypeScript for tool implementations.
- **Bundled content snapshot.** A `plugin/snapshot/` (or equivalent) directory shipped with the plugin containing a frozen copy of `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` at build time. Plugin reads from this snapshot at runtime.
- `/hub-refresh` command that pulls the latest snapshot from the hub repo on demand (network call, fail loudly on error, write to a user-writable cache location — see Assumptions).
- **Audience filter persistence** matching the site's `localStorage.nbgaihub.audience` mechanism, but plugin-side: persisted to a per-user config file so it survives Claude Code session restarts.
- **Deep-link URL builder** for `/hub-open` with multiple invocation forms: bare (`/hub-open` → site root), section (`/hub-open news` → `/news/`), section+subsection (`/hub-open glossary mcp` → `/glossary#mcp`), and journey shortcut (`/hub-open day-1` → `/start-here/day-1/`).
- **Production-URL configuration.** A `plugin/config.json` (or equivalent) accepting the production URL as a config value (e.g., `https://chomovazuzana.github.io/NbgAiHub`) plus a `localhost:4321` override for dev demos. Graceful behavior when site is not yet deployed (clear message naming the configured URL).
- **Full set of journeys** in `/hub-onboard`: `day-1`, `week-1`, and the by-role journeys named in `SCOPE.md` Deferred section (backend dev, data scientist, ML engineer). The command degrades to a clear "journey content not yet authored" message for journeys whose markdown is still placeholder.
- **Frontmatter audience filtering** — every browse/list command respects the persistent audience filter set via `/hub-audience` and applies it consistently (beginner-only hides advanced, advanced-only hides beginner, `both` shows everything).
- **Unit / integration tests** in TypeScript covering: content loader, frontmatter parsing, search ranking, audience filter, deep-link URL builder, snapshot freshness check, `/hub-refresh` flow (mocked network), and the no-fallback-config rule.
- `README.md` inside `plugin/` documenting all eleven commands with one-line description + one usage example each.
- `DECISIONS.md` entry locking the bundled-snapshot + opt-in-refresh delivery model and the marketplace distribution path.
- `SCOPE.md` update: the "Hub-as-skill plugin" row in the MVP table moves from `not started` to `✅` (matching the format used for the RSS pipeline and Astro site rows).

### Out of scope

- **Adding new content** to `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`. The plugin reads what exists; authoring is a separate workstream tracked in `SCOPE.md`.
- **Astro Starlight site changes.** The plugin consumes the same markdown shape; no schema changes are imposed on the site.
- **RSS pipeline changes.** News content delivery to the plugin is via the same `news/published/` folder that the pipeline writes to (via the PR / editorial gate). No coupling.
- **Server-side / SaaS infrastructure** for the plugin. No backend, no embeddings service, no telemetry endpoint.
- **Semantic search** across hub content. `/hub-search` is full-text only (token / substring matching + ranked snippets). Semantic search is deferred per `SCOPE.md`.
- **Greek-language content / i18n.** Same deferral as the site.
- **GitHub Action that auto-bumps plugin version on content regeneration.** Mentioned in the locked-in user decisions as a "future" item — not part of this scope.
- **Authoring the by-role journey content itself** (backend, data scientist, ML engineer) — the plugin must *support* invoking these journeys, but their markdown bodies remain placeholders until content is authored.
- **`/plugin install` UX** beyond what Claude Code's marketplace flow already provides — no custom install screen.
- **Telemetry / analytics** on which commands users invoke. Deferred indefinitely per `SCOPE.md` ("Out of scope — Analytics on what newcomers click").
- **Bank-confidential content handling.** Plugin processes only the public-safe content that already lives in the repo.
- **Version-control side effects.** Plugin code does not git-commit, push, branch, or rebase. `/hub-refresh` may invoke `git pull` only on the cached snapshot directory (read-only operation against the user's local cache) — see Assumption A12.

## Requirements

### Functional

1. **F1 — Workspace scaffolding.** A `plugin/` workspace at the repo root contains: `package.json` (Node 22, ESM, TypeScript), `tsconfig.json` (strict mode), `plugin.json`, `marketplace.json`, `src/`, `tests/`, `commands/` (markdown slash command files), `snapshot/` (bundled content), `README.md`. The plugin is a node ESM module with TypeScript compiled output.

2. **F2 — Plugin manifest valid.** `plugin/plugin.json` declares: plugin `name` (`nbg-ai-hub`), `version` (semver, starts at `0.1.0`), `description` (one line, hub framing), and a `commands` array listing exactly eleven commands matching the raw-request table (`/hub`, `/hub-search`, `/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`, `/hub-onboard`, `/hub-install`, `/hub-audience`, `/hub-refresh`, `/hub-open`). Each command entry references either a markdown file in `commands/` or a TypeScript entry point in `src/`.

3. **F3 — Marketplace manifest valid.** `plugin/marketplace.json` declares the plugin entry resolved by `/plugin marketplace add chomovazuzana/NbgAiHub`. The manifest is loadable by Claude Code's marketplace loader without errors; schema conformance verified by integration test.

4. **F4 — `/hub` entry point.** Renders a menu of the five pillars (Skills, Tips, News, Glossary, Journeys), the user's last-used journey (if any — read from persistent state), and the current audience filter. Behaves as a discoverability entry point — selecting a pillar suggests the corresponding `/hub-<pillar>` command.

5. **F5 — `/hub-search <query>` full-text search.** Tokenizes the query, walks the bundled snapshot (or refreshed cache — see F12), scores each item by token-match count weighted by location (title > frontmatter `topics` > body), returns top-N (default 10) ranked snippets, each showing: title, pillar, audience badge, snippet with query terms highlighted, and the absolute file path. Respects the current audience filter unless `--all` is appended.

6. **F6 — `/hub-skills [topic]` skill listing.** Lists every skill in `snapshot/skills/` showing: name (from frontmatter `title`), one-line description (from frontmatter `ai_summary` or body excerpt), where it sits (frontmatter `external_link` or relative path), install command (literal `/hub-install <skill-id>` line), and any additional info (e.g., audience, topics). If `[topic]` is provided, filters to skills whose `topics` frontmatter array contains the value. Respects audience filter.

7. **F7 — `/hub-tips [topic]` tips listing.** Lists every tip in `snapshot/tips/` showing: title, audience, topics, one-line excerpt. If `[topic]` is provided, filters to tips whose `topics` frontmatter array contains the value. Respects audience filter.

8. **F8 — `/hub-news [--week|--today]` news listing.** Lists news items from `snapshot/news/published/`, sorted by frontmatter `authored` descending. Default range: last 7 days. `--week`: last 7 days (explicit). `--today`: items where `authored` equals today's UTC date. Each entry shows: title, audience, topics, source, two-sentence summary, "Read on source" link (frontmatter `external_link`). Respects audience filter.

9. **F9 — `/hub-glossary <term>` term lookup.** Looks up the term in `snapshot/glossary/` by filename (case-insensitive match on the basename without `.md`) or by frontmatter `title` (case-insensitive). Shows the definition (markdown body) and any related terms (cross-references discovered by scanning other glossary files for `[<this-term>]` inline links). Missing term: clear "term not found" message with the closest three glossary entries listed.

10. **F10 — `/hub-onboard <journey>` step-by-step walk.** Renders the journey markdown for the named journey (`day-1`, `week-1`, `backend`, `data-scientist`, `ml-engineer`, etc.). The full scope of by-role journeys is supported — each is a separate markdown file under `snapshot/journeys/`. For journeys whose content is still placeholder, the command renders the placeholder + a "content in progress" note rather than failing. Tracks "last-used journey" in persistent state (used by `/hub`).

11. **F11 — `/hub-install <skill-id>` skill installation.** Looks up the skill in `snapshot/skills/` by frontmatter `id` (or filename basename if no `id` field). Reads the skill's install metadata (frontmatter `install_command` — the Claude Code marketplace command to run, e.g., `/plugin install some-skill@some-marketplace`), echoes it back to the user, and instructs them to run it. The plugin does NOT execute the install on the user's behalf (Claude Code's plugin system runs installs). Missing skill: clear "skill not found" message.

12. **F12 — `/hub-audience <beginner|advanced|both>` persistent audience filter.** Sets the persistent audience preference, written to a user-config file (path per Assumption A6). Subsequent `/hub-*` browse and list commands read this value and filter accordingly. Invoking the command with no argument prints the current value. Invalid argument throws an explicit named error (per global CLAUDE.md no-fallback rule).

13. **F13 — `/hub-refresh` content refresh.** Pulls the latest content snapshot from the hub repo (over the configured fetch mechanism — see Assumption A11), replaces the local cache, prints a summary (counts per pillar, freshness timestamp), and refuses to leave the cache in a partial state if the fetch fails (atomic replace). On network failure, the plugin keeps the previous snapshot and reports the error verbatim. The bundled snapshot remains the fallback baseline (no — see clarification below in Constraints) — actually: there is no silent fallback; failure surfaces an explicit named exception.

14. **F14 — `/hub-open [section] [subsection]` deep-link.** Builds a deep-link URL from the configured production URL (Assumption A1) and opens the user's default browser to it. URL-building rules:
    - `/hub-open` → `<base>/`
    - `/hub-open news` → `<base>/news/`
    - `/hub-open glossary mcp` → `<base>/glossary#mcp`
    - `/hub-open day-1` → `<base>/start-here/day-1/`
    - `/hub-open <section>` for any of the 5 pillars → `<base>/<pillar>/`
    - Unknown section: clear "unknown section" message naming the valid set.
    - Site not yet deployed: when the production URL responds with the "site is not yet deployed" condition (e.g., HTTP 404 root or a known "GH Pages not enabled" marker) OR when the configured URL is the literal placeholder declared in `config.json`, the command degrades gracefully by printing the would-be URL and a "not yet deployed — see DECISIONS.md for hosting status" message instead of opening the browser.

15. **F15 — Bundled snapshot delivery.** At plugin build / publish time, a build script copies the current content of `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` into `plugin/snapshot/` preserving the directory layout. The snapshot is committed to the plugin's published version so first install needs no network.

16. **F16 — Single source of truth.** No plugin command duplicates or rewrites markdown bodies. All content displayed is read verbatim from the snapshot. Frontmatter is parsed (`gray-matter` or equivalent), bodies are rendered as-is (optionally with terminal-friendly formatting — see Assumption A8).

17. **F17 — Audience filter shared semantics.** Audience filter values are exactly `beginner | advanced | both`, matching the site's audience filter and the canonical "Shared content shape" frontmatter schema in `DECISIONS.md` (2026-05-18 entry). `both` shows all items. `beginner` shows items whose frontmatter `audience` is `beginner` or `both`. `advanced` shows items whose frontmatter `audience` is `advanced` or `both`.

18. **F18 — No fallback for missing configuration.** Per global CLAUDE.md: any required configuration value (production URL, snapshot path, etc.) absent at runtime causes an explicit named exception. No silent defaults. Any genuine exception case must be registered in `Issues - Pending Items.md` before being implemented.

### Non-functional

19. **NF1 — TypeScript strict.** All non-trivial command implementations live in `plugin/src/` as TypeScript with `"strict": true` in `tsconfig.json`. Trivial commands (e.g., a static-text `/hub` menu before behavior accrues) may be markdown-only files in `plugin/commands/`.

20. **NF2 — Node 22, ESM.** `plugin/package.json` declares `"type": "module"` and an engines entry pinning Node 22+ to match `pipeline/.nvmrc` and `site/.nvmrc`.

21. **NF3 — Build green.** `cd plugin && npx tsc --noEmit` exits 0.

22. **NF4 — Lint clean.** `cd plugin && npm run lint` (ESLint + `@typescript-eslint`, matching `pipeline/`'s setup) exits 0.

23. **NF5 — Tests green.** `cd plugin && npm test` (Vitest, matching `pipeline/`'s framework per DECISIONS.md) exits 0 with the suite covering each non-trivial command's behavior.

24. **NF6 — No deprecated direct dependencies.** `cd plugin && npm install` produces no `deprecated` warnings for direct entries in `package.json`.

25. **NF7 — Snapshot freshness visible.** Every browse command prints a one-line footer showing the snapshot timestamp (e.g., `Snapshot: 2026-05-18 (12 days ago) — run /hub-refresh to update`).

26. **NF8 — Tone.** All user-facing strings, command help, README content, and DECISIONS.md entry follow the project's `"what I wish I knew a year ago"` voice — opinionated, plainspoken, no AI-slop hedging, no marketing voice. This is non-negotiable per project CLAUDE.md.

27. **NF9 — No version-control operations** from the plugin code (other than the read-only `git pull` against the cached snapshot directory in `/hub-refresh` — see A12). The plugin must not commit, push, branch, or rebase.

## Constraints

- **TypeScript implementation for non-trivial command logic** (global CLAUDE.md "Tool implementations are TypeScript"). Markdown-only slash commands are acceptable for trivial cases (e.g., a static `/hub` welcome screen).
- **No fallback values for missing configuration** (global CLAUDE.md). Missing production URL, missing snapshot, missing required config keys → explicit named exception. Document any consciously accepted exception in `Issues - Pending Items.md` first.
- **Single source of truth: the markdown files.** The plugin and the site share the same content shape per DECISIONS.md "Shared content shape". The plugin must not introduce a duplicate or competing schema.
- **Bundled snapshot + opt-in `/hub-refresh`** is the locked content delivery model. No always-on network reads; no auto-refresh.
- **Hosting deferred.** Production URL is a config value. The plugin must operate correctly when the site is not yet deployed.
- **Marketplace distribution path** is `/plugin marketplace add chomovazuzana/NbgAiHub` per DECISIONS.md "Hub ships as its own Claude Code skill plugin".
- **Audience filter** matches the site's `localStorage.nbgaihub.audience` mechanism in semantics, but plugin-side state lives in a user-config file (not localStorage — see A6).
- **Singular table names** rule from global CLAUDE.md applies if any persistence is added. None is planned beyond JSON config; noted for completeness.
- **No new dev-server ports** required by this workstream. Plugin runtime is invoked by Claude Code, not by a long-running dev server. (Site's `4321` and the dev-band `4322–4329` are untouched.)
- **Tone:** `"what I wish I knew a year ago"` — applies to README, command help text, error messages, and the DECISIONS.md entry.

## Acceptance Criteria

Each criterion is falsifiable with concrete evidence (test name, `file:line`, observed behavior, or built artifact path).

### Per-command ACs

- **AC1 — `/hub` entry point works.** Invoking `/hub` from a fresh Claude Code session (with the plugin installed) returns a menu of the five pillars, the last-used journey if any, and the current audience filter. Evidence: test `renders pillar menu with audience filter and last-used journey` in `plugin/tests/hub-entry.test.ts`.

- **AC2 — `/hub-search <query>` ranks and returns results.** Given a fixture snapshot with 5 known items containing a known token, the command returns those items ranked by title/topics/body weighting in the expected order. Evidence: test `ranks results by title > topics > body match` in `plugin/tests/search.test.ts`.

- **AC3 — `/hub-skills [topic]` filters and lists skills.** Given a fixture snapshot with 3 skills, two of which have `topics: [mcp]` in frontmatter, `/hub-skills mcp` returns exactly those two with name, description, location, install command, and audience badge. Evidence: test `lists skills filtered by topic` in `plugin/tests/skills.test.ts`.

- **AC4 — `/hub-tips [topic]` filters and lists tips.** Mirrors AC3 against `snapshot/tips/`. Evidence: test `lists tips filtered by topic` in `plugin/tests/tips.test.ts`.

- **AC5 — `/hub-news` default range and flags.** Default invocation returns items where `authored` is within the last 7 days. `--today` returns items where `authored` equals today (UTC). `--week` is explicit equivalent of the default. Evidence: tests `defaults to last 7 days`, `--today filters to today`, `--week is explicit 7-day window` in `plugin/tests/news.test.ts`.

- **AC6 — `/hub-glossary <term>` returns definition and related terms.** Given a fixture snapshot with 5 glossary entries where `mcp.md` references `[plugin]` and `[skill]` in its body, `/hub-glossary mcp` returns the body verbatim plus `plugin` and `skill` listed as related terms. Evidence: test `returns definition and discovers related terms` in `plugin/tests/glossary.test.ts`.

- **AC7 — `/hub-glossary` missing-term graceful.** Looking up a non-existent term returns a clear "term not found" message and lists the three closest matches (by string distance). Evidence: test `returns suggestions for unknown term` in `plugin/tests/glossary.test.ts`.

- **AC8 — `/hub-onboard <journey>` walks all named journeys.** For each of `day-1`, `week-1`, `backend`, `data-scientist`, `ml-engineer`, invoking `/hub-onboard <name>` resolves the corresponding markdown file in `snapshot/journeys/`, renders its body, and tracks the journey as "last used" in persistent state. Evidence: parameterized test `renders each named journey and updates last-used state` in `plugin/tests/onboard.test.ts`.

- **AC9 — `/hub-onboard <journey>` placeholder behavior.** For a journey whose markdown body is the placeholder template (`coming soon` markers), the command renders the placeholder content plus a `[content in progress]` note rather than throwing. Evidence: test `renders placeholder note when journey body is unfinished` in `plugin/tests/onboard.test.ts`.

- **AC10 — `/hub-install <skill-id>` echoes install command.** Given a fixture skill with frontmatter `install_command: /plugin install foo@bar`, `/hub-install foo` echoes that command verbatim and instructs the user to run it. Evidence: test `echoes the install_command from skill frontmatter` in `plugin/tests/install.test.ts`.

- **AC11 — `/hub-install` missing-skill graceful.** `/hub-install nonexistent` returns a clear "skill not found" message and lists nearby skill ids. Evidence: test `reports missing skill clearly` in `plugin/tests/install.test.ts`.

- **AC12 — `/hub-audience` persists value across simulated sessions.** Setting `/hub-audience beginner`, then re-loading the plugin's persistence layer, returns `beginner` as the current value. Evidence: test `persists audience preference across plugin reloads` in `plugin/tests/audience.test.ts`.

- **AC13 — `/hub-audience` rejects invalid value.** `/hub-audience random` throws an explicit named exception (`InvalidAudienceError` or equivalent) naming the valid set. Evidence: test `throws InvalidAudienceError for unknown value` in `plugin/tests/audience.test.ts`.

- **AC14 — `/hub-refresh` atomic replace on success.** Given a mocked source returning a new snapshot, the local cache is replaced and the freshness timestamp updates. Evidence: test `replaces snapshot atomically on success` in `plugin/tests/refresh.test.ts`.

- **AC15 — `/hub-refresh` preserves cache on failure.** Given a mocked source returning HTTP 500 (or network error), the local cache is unchanged and the error is reported verbatim. Evidence: test `preserves cache on network failure` in `plugin/tests/refresh.test.ts`.

- **AC16 — `/hub-open` builds correct URLs.** Parameterized test verifies the URL builder for all forms:
  - `/hub-open` → `<base>/`
  - `/hub-open news` → `<base>/news/`
  - `/hub-open glossary` → `<base>/glossary/`
  - `/hub-open glossary mcp` → `<base>/glossary#mcp`
  - `/hub-open day-1` → `<base>/start-here/day-1/`
  - `/hub-open week-1` → `<base>/start-here/week-1/`
  - `/hub-open skills` → `<base>/skills/`
  - `/hub-open tips` → `<base>/tips/`
  - `/hub-open reference` → `<base>/reference/`
  - `/hub-open contribute` → `<base>/contribute/`
  - Unknown section throws or returns a "valid sections are: …" message.
  - Evidence: parameterized test `builds correct deep-link URL for each invocation` in `plugin/tests/open.test.ts`.

- **AC17 — `/hub-open` graceful when site not yet deployed.** When configured URL is the literal placeholder OR a probe returns the "not yet deployed" condition, the command prints the URL it would have opened plus a "not yet deployed" message; it does NOT open the browser. Evidence: test `prints would-be URL when site not deployed` in `plugin/tests/open.test.ts`.

### Cross-cutting ACs

- **AC18 — Bundled-snapshot mechanism.** `plugin/snapshot/` exists in the published plugin and contains subdirectories `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`. A build script (`scripts/build-snapshot.ts` or `npm run snapshot`) regenerates the snapshot from the repo's content folders deterministically. Evidence: existence of `plugin/snapshot/` after `npm run snapshot` + test `snapshot build copies all five content folders` in `plugin/tests/snapshot-build.test.ts`.

- **AC19 — Audience filter persists across Claude sessions.** A round-trip test sets the filter via `/hub-audience`, reloads the plugin's persistence module, and confirms the value survives. The persistence file path is documented (per Assumption A6) and the format is parseable JSON. Evidence: test `audience preference survives plugin reload from disk` in `plugin/tests/audience.test.ts`.

- **AC20 — Deep-link URL builder is pure and unit-tested.** The URL builder is implemented as a pure function in `plugin/src/url-builder.ts` taking `(baseUrl, section?, subsection?)` and returning a string. No I/O, no side effects. AC16 exercises it. Evidence: file `plugin/src/url-builder.ts` exists with the named export + AC16 tests pass.

- **AC21 — Graceful not-yet-deployed handling end-to-end.** With `plugin/config.json` set to the literal "not-yet-deployed" placeholder, `/hub-open` prints the would-be URL + a clear deferral message. With the placeholder, `/hub-search`, `/hub-news`, etc. continue to work against the bundled snapshot (they don't depend on the production URL). Evidence: test `commands operate against snapshot when site URL is placeholder` in `plugin/tests/deployment.test.ts`.

- **AC22 — Marketplace manifest validity.** `.claude-plugin/marketplace.json` (at repo root, per Claude Code spec — corrected from earlier `plugin/marketplace.json`) is loadable by Claude Code's marketplace loader. Asserts: marketplace `name`, `owner` object, `plugins[0].name === "nbg-ai-hub"`, `plugins[0].source === "./plugin"`. Evidence: assertions in `plugin/tests/manifest.test.ts` (the marketplace + plugin manifest tests were folded into the same file during implementation).

- **AC23 — Plugin manifest validity (rewritten per Phase 3a / plan-003 R-3).** `plugin/.claude-plugin/plugin.json` (not `plugin/plugin.json` — Claude Code spec requires `.claude-plugin/` subdir) declares `name`, `description`, `author`. **The manifest does NOT enumerate commands** — slash commands are filesystem-discovered from `plugin/commands/*.md`. The "exactly eleven commands" assertion is therefore a directory check: `ls plugin/commands/*.md` returns exactly the eleven `.md` files matching `{hub, hub-search, hub-skills, hub-tips, hub-news, hub-glossary, hub-onboard, hub-install, hub-audience, hub-refresh, hub-open}.md`. Evidence: parse-shape assertions in `plugin/tests/manifest.test.ts` (no `commands` key, no `version` key, required keys present) + filesystem listing of `plugin/commands/`.

- **AC24 — README documents all eleven commands.** `plugin/README.md` contains a section for each of the eleven commands with: command name as a heading, one-line description, at least one usage example. Evidence: grep — each command name appears at least once as a heading in the README.

- **AC25 — DECISIONS.md entry appended.** A new dated entry in `DECISIONS.md` records: bundled-snapshot + opt-in-refresh model, marketplace distribution path, TypeScript-for-non-trivial-commands policy, audience-filter persistence approach. Evidence: grep `DECISIONS.md` for "hub plugin" or the dated entry title.

- **AC26 — SCOPE.md updated.** The MVP table row labeled "Hub-as-skill plugin" moves from `not started` to `✅` (or equivalent done marker), and the Demo-ability checklist items "Hub installable as a plugin..." and "/hub commands work from a fresh Claude Code install" are checked. The `*Last updated*` line at the top of SCOPE.md is bumped. Evidence: diff inspection of `SCOPE.md`.

- **AC27 — No-fallback rule enforced.** With `plugin/config.json` missing entirely (renamed during test), invoking any plugin command throws an explicit named exception identifying the missing config file. No silent default behavior. Evidence: test `throws MissingPluginConfigError when plugin/config.json absent` in `plugin/tests/config.test.ts`.

- **AC28 — Snapshot read uses single source-of-truth shape.** The frontmatter parser in `plugin/src/frontmatter.ts` accepts the canonical "Shared content shape" keys from DECISIONS.md (2026-05-18 entry) plus the news-specific `source`, `fingerprint`, optional `editor_confidence`, optional `hero_image`. Schema validation fails loudly on unknown required keys. Evidence: test `parses canonical frontmatter and rejects malformed entries` in `plugin/tests/frontmatter.test.ts`.

- **AC29 — Tone check.** README, command help strings, and the DECISIONS.md entry contain no marketing voice, no AI-slop hedging, no emoji-heavy decoration. Reviewer-judged criterion; checklist captured in the PR description. Evidence: PR-review note in the integration verification document.

## Assumptions

Locked-in user decisions (treated as Assumptions per the raw request, not Open Questions):

- **A1 — Content delivery: bundled snapshot + opt-in `/hub-refresh`.** Plugin ships with a snapshot in `plugin/snapshot/`; users refresh on demand. A future GitHub Action that bumps the plugin version when content regenerates is acknowledged but out of scope for this workstream.

- **A2 — Same markdown as the site — single source of truth.** Plugin reads frontmatter + body from snapshots of `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`. No content duplication or transformation beyond frontmatter parsing.

- **A3 — Hosting target: GitHub Pages, not yet deployed (resolved 2026-05-18).** Production URL is `https://chomovazuzana.github.io/NbgAiHub` (set in `plugin/config.json` but not yet live). **Until deployment, `/hub-open` defaults to `http://localhost:4321` so dev demos work today.** A config flag (`devMode: true` default; flip to `false` when GH Pages is live) controls which URL is used. When `devMode: true`, plugin probes localhost:4321 first; if no dev server is running, it shows a friendly message instructing the user to run `cd site && npm run dev`. When `devMode: false`, plugin opens the GH Pages URL directly.

- **A4 — Audience filter persists across Claude sessions.** Plugin-side state matches the site's `localStorage.nbgaihub.audience` semantics, but lives in a per-user config file rather than browser localStorage (see A6).

- **A5 — Distributed as a Claude Code marketplace plugin.** `plugin/plugin.json` + `plugin/marketplace.json`, installable via `/plugin marketplace add chomovazuzana/NbgAiHub`.

- **A6 — Per-user state storage path (resolved 2026-05-18; revised 2026-05-19 after Phase 3a).** Persistent per-user state (audience preference + last-used-journey) lives in `${CLAUDE_PLUGIN_DATA}/state.json` — a Claude-Code-managed directory exposed via env var to plugin commands at runtime. **Why this is better than a hardcoded path:** Claude Code owns the directory lifecycle (creates it on plugin install, cleans up on uninstall, supports OS-specific conventions transparently). Falls back to `${XDG_DATA_HOME:-$HOME/.local/share}/claude-code/plugins/nbg-ai-hub/` if the env var is not set (e.g., when running scripts outside a Claude Code session, in tests). Plugin creates the parent directory on first write. Format: JSON. Schema: `{ audience: "beginner"|"advanced"|"both", lastJourney: string|null }`. Plugin-wide configuration (default URL, search weights, snippet length) is a separate concern and ships in-repo at `plugin/config.json` per A1.

- **A7 — TypeScript for non-trivial command logic, markdown for trivial commands.** Per global CLAUDE.md. Commands with branching logic, persistence, or content traversal are TypeScript (`/hub-search`, `/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`, `/hub-onboard`, `/hub-install`, `/hub-audience`, `/hub-refresh`, `/hub-open`). The bare `/hub` entry-point command may begin as a markdown file if its initial behavior is static, and graduate to TypeScript when dynamic content (last-used journey, current filter) is added — this work delivers it as TypeScript from day one to keep the eleven implementations symmetric.

- **A8 — Tone: `"what I wish I knew a year ago"`.** Opinionated, plainspoken, no AI-slop, no marketing voice. Applies to README, command help, error messages, DECISIONS.md entry. Non-negotiable.

- **A9 — Test framework: Vitest** (matching `pipeline/` per DECISIONS.md 2026-05-18 "Vitest 4.x" entry). Same vitest ^4.x version.

- **A10 — Lint stack: ESLint + `@typescript-eslint`**, matching `pipeline/`.

- **A11 — `/hub-refresh` fetch mechanism (resolved 2026-05-18): `git pull` against a clone of the hub repo cached at `~/.cache/nbg-ai-hub/snapshot/`** (XDG-style). Rationale: aligns with "GitHub repo as CMS" (DECISIONS.md), no auth complexity for a private repo because the user already has the credentials configured for `gh` / `git` if they have the plugin installed. Alternative considered: `fetch` against a GH Raw URL per file (rejected — N+1 requests, no atomic update). Alternative considered: download a tarball from the GH releases API (rejected — requires a release artifact pipeline we don't have). The `git pull` route reuses the user's existing git auth and gives atomic update via working-tree replace.

- **A12 — Read-only git operation in `/hub-refresh`.** The plugin clones (first run) or `git pull`s (subsequent runs) the hub repo into the user's local cache directory. This is a read-only operation against a user-owned cache, not a version-control operation against the project repo, and thus falls outside the global "no VC ops without explicit request" rule (the explicit request IS the `/hub-refresh` invocation).

- **A13 — Snapshot file format on disk.** `plugin/snapshot/<pillar>/*.md` mirrors the repo's content layout 1:1 with no transformation. `plugin/snapshot/.snapshot-meta.json` records `{ generatedAt: ISO8601, sourceCommit: <git-sha> }` for the freshness footer (NF7).

- **A14 — Search scoring algorithm.** Sum of token-match counts weighted: title × 5, frontmatter `topics` × 3, body × 1. Case-insensitive substring match. No stemming, no fuzzy match, no semantic search. Flagged as a deliberate simplification — upgradeable later.

- **A15 — Snippet length in search results.** 200 chars of body content centered on the first query-term match, with `…` ellipsis on truncation.

- **A16 — Empty pillar folders.** If `snapshot/skills/` is empty (because `skills/.gitkeep`-only at snapshot time), `/hub-skills` returns "no skills in this snapshot yet — see /hub-refresh or contribute via PR" without throwing. Same pattern for `tips/`, `news/published/`, `journeys/`, `glossary/`.

- **A17 — News-item presentation.** Each news entry shows title, audience, topics, source, summary, "Read on source" link. Topics rendered as comma-separated tokens (no terminal-color chip styling — keep output plain-text friendly).

- **A18 — Audience badge rendering.** In terminal output, audience badge is a single uppercase token `[BEGINNER]`, `[ADVANCED]`, `[BOTH]`. No color codes (keeps output copy-pasteable into transcripts). Color CSS lives in the site; the plugin renders plain text.

- **A19 — Journey list extensibility.** New journeys are added by dropping a markdown file in `journeys/<name>.md` (or `snapshot/journeys/<name>.md` after refresh). `/hub-onboard <name>` resolves dynamically by filename. No hardcoded journey allowlist.

- **A20 — `Issues - Pending Items.md` updates.** Any deviation from these assumptions discovered during implementation (e.g., a required env-var fallback found genuinely needed, a missing journey body that would crash) is registered there per global rules before being implemented.

## Open Questions

**Resolved before downstream phases (2026-05-18):**

- ~~**OQ1 — Persistence file path.**~~ Resolved → `~/.claude/plugins/nbg-ai-hub/state.json` (see A6). Per-user state must not live in the repo (would cause user-pref collisions on `/hub-refresh`).
- ~~**OQ2 — `/hub-refresh` fetch mechanism.**~~ Resolved → `git clone`/`git pull` into `~/.cache/nbg-ai-hub/snapshot/` (see A11).
- ~~**OQ3 — Production URL handling.**~~ Resolved → `/hub-open` defaults to `http://localhost:4321` while `devMode: true`; flip the flag when GH Pages goes live (see A3).

**Remaining open** (to be resolved during implementation):

- **OQ4 — By-role journey names.** `backend`, `data-scientist`, `ml-engineer` named from `SCOPE.md` Deferred section. Confirm slug spellings (e.g., `data-scientist` vs `data-science` vs `data`), so `/hub-onboard <name>` resolves predictably even before content is authored.

- **OQ5 — `/plugin install` mechanics.** Does Claude Code's marketplace install flow expect a specific manifest schema version? `plugin/marketplace.json` may need to declare a `schemaVersion` key — confirm against current Claude Code marketplace spec before publishing.

- ~~**OQ6 — `editor_confidence` and `hero_image` in plugin output.**~~ Resolved → `/hub-news` surfaces `editor_confidence` as a `[confidence: high|medium|low]` marker on each news entry, matching the RSS pipeline's PR-body convention. `hero_image` remains optional in frontmatter but is not yet rendered (terminal output is plain-text by design — A18). See `src/hub-news.ts:38`.

## Definition of Done

This work is mergeable when **all** of the following hold:

1. **All ACs (AC1–AC29) pass** with concrete evidence linked in the PR description.
2. **Build green:** `cd plugin && npx tsc --noEmit` exits 0.
3. **Lint green:** `cd plugin && npm run lint` exits 0.
4. **Tests green:** `cd plugin && npm test` exits 0 and covers each of the eleven commands plus the cross-cutting modules (URL builder, frontmatter, config loader, snapshot loader, persistence, refresh).
5. **Plugin manifest valid:** `plugin/plugin.json` parses cleanly and declares the eleven commands matching the raw-request table exactly.
6. **Marketplace manifest valid:** `plugin/marketplace.json` parses cleanly and is loadable by Claude Code's marketplace loader (verified via test or recorded integration verification).
7. **README documents all eleven commands** with one-line description + one usage example each, in tone (NF8).
8. **DECISIONS.md entry appended** locking the bundled-snapshot + opt-in-refresh delivery model, marketplace distribution path, TypeScript-for-non-trivial policy, audience-filter persistence approach. Dated 2026-05-18 (or current date at merge).
9. **SCOPE.md updated:** "Hub-as-skill plugin" row in MVP table → `✅`; demo-ability checklist items "Hub installable as a plugin..." and "/hub commands work from a fresh Claude Code install" → checked; `*Last updated*` bumped.
10. **No deprecated direct dependencies:** `cd plugin && npm install` produces no `deprecated` warnings.
11. **No new entries in `Issues - Pending Items.md`** beyond ones consciously accepted (e.g., OQ entries deliberately deferred).
12. **No version-control side effects** outside the read-only `git pull` against the user's local snapshot cache (per A12) and the explicit final commit + push gated by user authorization.
13. **End-to-end smoke test on a fresh Claude Code install** demonstrated at least once: `/plugin marketplace add chomovazuzana/NbgAiHub` → `/plugin install` → each of the eleven commands invoked and produces non-error output against the bundled snapshot. Recorded in `docs/reference/integration-verification-hub-plugin.md` (sibling of the RSS + site verification docs).
14. **Design docs updated:** `docs/design/project-design.md` gains a "Plugin architecture" section; `docs/design/project-functions.md` gains the F1–F18 functional requirements listed above.

## Original Request

> Build the **full scope** (not just MVP) of the `/hub` Claude Code skill plugin for the **NbgAiHub** project — a curated Claude Code knowledge hub for bank colleagues. The plugin brings the hub *inside* Claude Code so users don't have to leave their terminal. The Astro Starlight website and the plugin share the **same markdown content** as single source of truth.
>
> **Read for full background before refining** (these set conventions, tone, prior decisions):
> - `/Users/suzy/ClaudeCode/Projects/NbgAiHub/CLAUDE.md`
> - `/Users/suzy/ClaudeCode/Projects/NbgAiHub/SCOPE.md`
> - `/Users/suzy/ClaudeCode/Projects/NbgAiHub/DECISIONS.md`
> - `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/rss-pipeline.md` and `astro-starlight-site.md` — **match this exact format and depth** for your output.
>
> ## The 11 commands to implement
>
> | Command | Behavior |
> |---|---|
> | `/hub` | Entry point — menu of pillars, last-used journey, current audience filter |
> | `/hub-search <query>` | Full-text search across all pillars; ranked snippets with file links |
> | `/hub-skills [topic]` | List skills: name, description, where it sits, install command, additional info |
> | `/hub-tips [topic]` | Browse or filter tips & tricks |
> | `/hub-news [--week\|--today]` | Latest curated news items; default last 7 days |
> | `/hub-glossary <term>` | Term lookup; definition + related terms inline |
> | `/hub-onboard <journey>` | Step-by-step walk; `day-1`, `week-1`, `backend`, etc. (full scope, all by-role journeys included) |
> | `/hub-install <skill-id>` | Install a hub-listed skill via the Claude Code marketplace |
> | `/hub-audience <beginner\|advanced\|both>` | Set persistent audience filter |
> | `/hub-refresh` | Pull latest content snapshot from the hub repo |
> | `/hub-open [section] [subsection]` | Open the hub website in browser; deep-linking: `/hub-open`, `/hub-open news`, `/hub-open glossary mcp`, `/hub-open day-1` |
>
> ## Locked-in user decisions (treat as Assumptions, not Open Questions)
>
> 1. **Content delivery: bundled snapshot + opt-in `/hub-refresh`.** Plugin ships with a snapshot; users refresh on demand. A future GH Action bumps the plugin version when content regenerates.
> 2. **Same markdown as the site — single source of truth.** Plugin reads frontmatter + body from `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`. No duplication.
> 3. **Hosting target: GitHub Pages, but NOT yet deployed.** We are in development. The plugin accepts the production URL as a config value and degrades gracefully when not yet live; supports `localhost:4321` override for dev demos.
> 4. **Audience filter persists across Claude sessions** (matching the site's `localStorage.nbgaihub.audience` mechanism, but plugin-side).
> 5. **Distributed as a Claude Code marketplace plugin** — `plugin.json` + `marketplace.json`, installable via `/plugin marketplace add chomovazuzana/NbgAiHub`.
> 6. **TypeScript for non-trivial command logic** (per global CLAUDE.md). Markdown-only slash commands fine for trivial cases.
> 7. **Tone:** *"what I wish I knew a year ago"* — opinionated, plainspoken, no AI-slop, no marketing voice.
>
> ## Hard rules (from CLAUDE.md)
> - No fallback values for missing configuration — raise explicit exceptions.
> - TypeScript for tool implementations.
> - Singular table names (not relevant here but applies if any).
>
> ## Demo targets (from SCOPE.md)
> - `/hub` commands work from a fresh Claude Code install.
> - Hub installable in one command: `/plugin marketplace add chomovazuzana/NbgAiHub`.
>
> ## Required output sections (load-bearing — every downstream phase depends on these)
>
> ### Acceptance Criteria
> Numbered `AC1`, `AC2`, … . Each falsifiable with concrete evidence (test name / file:line / observed behavior). **Every one of the 11 commands needs at least one AC.** Plus ACs for: bundled-snapshot mechanism, `/hub-refresh` behavior, audience-filter persistence, deep-link URL builder correctness, graceful not-yet-deployed handling, marketplace.json validity, README documenting all 11 commands, DECISIONS.md entry, SCOPE.md update.
>
> ### Assumptions
> Lock in the 7 user decisions above plus any others you make.
>
> ### Definition of Done
> Build green, tests cover the new behavior and pass, lint clean, plugin manifests valid, marketplace.json valid, README documenting all 11 commands, DECISIONS.md entry appended, SCOPE.md "Hub-as-skill plugin" row updated from "not started" to "done", no new deprecated deps.
