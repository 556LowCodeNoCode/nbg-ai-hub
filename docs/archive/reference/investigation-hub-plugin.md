# Investigation: Hub-as-Skill Plugin (`/hub-*` Commands inside Claude Code)

## Executive Summary

The locked architecture (Claude Code plugin with a marketplace manifest, eleven `/hub-*` commands, bundled snapshot, `~/.claude/plugins/nbg-ai-hub/state.json` for per-user state, `git pull` for `/hub-refresh`, title×5+topics×3+body×1 search) survives contact with the current Claude Code plugin spec — but **three load-bearing assumptions in the refined request need to be amended before planning starts**:

1. **The plugin manifest does NOT have a `commands` array.** Slash commands are *filesystem-discovered*: a markdown file at `commands/hub-search.md` (or the new-canonical `skills/hub-search/SKILL.md`) automatically produces the `/hub-search` command. Refined-request F2 ("`commands` array listing exactly eleven commands matching the raw-request table") and AC23 ("`plugin.json` declares the exact eleven commands") describe a schema that does not exist. The manifest is **optional** — only `name` is required. AC23 must be rewritten to assert "exactly eleven `.md` files exist in `commands/` (or eleven `skills/<name>/SKILL.md` directories), and each parses with valid frontmatter."

2. **Slash commands are LLM prompts, not script entry points.** A command file's body is rendered as a prompt to the LLM (with `$ARGUMENTS`, `${CLAUDE_SKILL_DIR}` substitutions and `` !`shell` `` pre-execution). To run TypeScript logic, the command body invokes a bundled Node script via `` !`node ${CLAUDE_SKILL_DIR}/scripts/foo.js …` `` — the script's stdout is inlined into the prompt. The "TypeScript-backed slash command" refined-request framing (F1, NF1, A7) is achievable, but **only via the bash-injection pattern**, not via a "TS entry point" field in the manifest. The implementer must build TS → JS ahead of time; ESM with explicit `.js` imports is already the project convention.

3. **The manifest lives at `.claude-plugin/plugin.json`, not `plugin/plugin.json`.** Same for `marketplace.json` (`.claude-plugin/marketplace.json` at the **marketplace** root, not the plugin root). The refined request's "`plugin/plugin.json`" and "`plugin/marketplace.json`" paths (F1, F2, F3, AC23) are wrong; the canonical locations are `plugin/.claude-plugin/plugin.json` and `plugin/.claude-plugin/marketplace.json` (and since this repo IS the marketplace per `/plugin marketplace add chomovazuzana/NbgAiHub`, the `marketplace.json` actually wants to be at **repo-root** `.claude-plugin/marketplace.json` — pointing at the `plugin/` subdirectory via `"source": "./plugin"`).

Beyond those three corrections, everything else in the refined request stands. The `~/.claude/plugins/` state path (A6) is consistent with the documented `~/.claude/plugins/data/{id}/` data directory and the `${CLAUDE_PLUGIN_DATA}` variable, so we can confirm it — actually the **best practice** is to use `${CLAUDE_PLUGIN_DATA}` (which resolves to `~/.claude/plugins/data/nbg-ai-hub/` or similar) rather than hardcoding `~/.claude/plugins/nbg-ai-hub/`. See §7. The `git pull` strategy for `/hub-refresh` is sound and aligns with Claude Code's own behaviour for private-marketplace updates (uses the user's git credential helpers). The 100-line title×5+topics×3+body×1 search is trivially implementable in pure TS. Cross-platform browser open: ship the `open` npm package (~3KB, actively maintained successor to `opn`).

Two items need deeper research before implementation begins (Phase 3b):
- **TS-script invocation pattern from a plugin command** — the docs show Python and shell-script examples; no canonical Node-binary example. We need to confirm the exact `` !`node …` `` syntax for a TypeScript-compiled Node ESM script, including how its stdout gets inlined and whether stderr corrupts output.
- **Marketplace install when the plugin sits in a subdirectory of the marketplace repo** — refined request expects `/plugin marketplace add chomovazuzana/NbgAiHub` to install one plugin from the repo. Confirm the exact `source` shape (relative path `./plugin` vs. `git-subdir`) and the path-resolution semantics during the install copy step.

---

## Context

- **What was investigated:** confirmation that the eleven-command Claude Code plugin design in `docs/refined-requests/hub-plugin.md` matches the current (mid-2026) Claude Code plugin spec, and the canonical implementation pattern for each of: the plugin and marketplace manifests, command authoring with TypeScript logic, the bundled snapshot, the per-user state file, `/hub-refresh` mechanics, search ranking, `/hub-open` browser launch, and marketplace publishing.
- **Refined request:** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/hub-plugin.md` (29 ACs, 20 Assumptions, 14 DoD items).
- **Codebase scan:** `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/reference/codebase-scan-hub-plugin.md`.
- **Locked decisions not under review:** bundled-snapshot + opt-in-refresh (A1, A11); same markdown as the site, single source of truth (A2); marketplace path `/plugin marketplace add chomovazuzana/NbgAiHub` (A5, DECISIONS.md 2026-05-18 "Hub ships as its own Claude Code skill plugin"); TS for non-trivial logic (A7); Vitest 4.x + ESLint 9 + Node 22 + ESM (A9, A10, NF1–NF6).

---

## Per-area findings

### 1. Plugin manifest & marketplace manifest — schema and locations

**Authoritative source:** [Plugins reference](https://code.claude.com/docs/en/plugins-reference), [Create and distribute a plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces). Both are current Claude Code docs.

#### 1a. The manifest is optional and has no `commands` array

The `.claude-plugin/plugin.json` schema is (full set of supported fields):

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | **Yes** (only required field) | kebab-case, no spaces. Namespaces components in the UI (`plugin-name:agent-name`). |
| `$schema` | string | No | JSON Schema URL for editor autocomplete. Claude Code ignores it at load. Use `https://json.schemastore.org/claude-code-plugin-manifest.json`. |
| `version` | string | No | Semver. **If set, you MUST bump on every release** — Claude Code uses it as the update-detection cache key. **If omitted**, falls back to the git commit SHA: every commit is a new version. For active development, omitting is the recommended path. |
| `description` | string | No | One-line plugin purpose. |
| `author` | object | No | `{ name, email?, url? }`. |
| `homepage` | string | No | Doc URL. |
| `repository` | string | No | Source URL. |
| `license` | string | No | SPDX identifier (`MIT`, `Apache-2.0`). |
| `keywords` | array | No | Discovery tags. |
| `skills` | string \| array | No | Additional skill dirs **in addition to** default `skills/`. |
| `commands` | string \| array | No | Additional command files **replacing** default `commands/`. **NOT an array of named command entries** — just file/dir paths. |
| `agents` | string \| array | No | Replaces default `agents/`. |
| `hooks` | string \| array \| object | No | Hooks config path(s) or inline. |
| `mcpServers` | string \| array \| object | No | MCP config path(s) or inline. |
| `outputStyles` | string \| array | No | Output-style files. |
| `lspServers` | string \| array \| object | No | LSP config(s). |
| `experimental.themes` / `.monitors` | string \| array | No | Experimental, schema may shift. |
| `userConfig` | object | No | Prompts user on enable; values exposed as `${user_config.KEY}` and `CLAUDE_PLUGIN_OPTION_<KEY>` env. |
| `dependencies` | array | No | Other plugins this one requires, with optional semver. |

**There is no `"commands": ["hub", "hub-search", ...]` array.** Slash commands are filesystem-discovered: a file at `commands/hub-search.md` (or `skills/hub-search/SKILL.md`) automatically produces the `/hub-search` command when the plugin is enabled. The `commands` field in the manifest is only used if you want to point at non-default paths (e.g., `"commands": ["./extras/foo.md"]`).

**For our plugin, the manifest can be minimal:**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "nbg-ai-hub",
  "description": "Hub-as-skill: /hub-* commands for the NbgAiHub knowledge hub.",
  "author": { "name": "chomovazuzana" },
  "repository": "https://github.com/chomovazuzana/NbgAiHub",
  "license": "MIT",
  "keywords": ["claude-code", "knowledge-hub", "onboarding", "skills"]
}
```

**Omit `version` deliberately**: the refined request locks `0.1.0` as the start version (F2) but for active development the docs explicitly recommend omitting it so each commit is auto-treated as a new version. Once we cut a stable release, set `version` and start bumping it on every release. Document this in DECISIONS.md.

Sources: [Plugins reference §Plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), [Version management](https://code.claude.com/docs/en/plugins-reference#version-management).

#### 1b. Manifest location: `.claude-plugin/plugin.json`, NOT plugin root

The manifest must live in a `.claude-plugin/` subdirectory of the plugin root. All OTHER directories (`commands/`, `skills/`, `agents/`, `hooks/`, `scripts/`) stay AT the plugin root, NOT inside `.claude-plugin/`. The docs are explicit and warn this is a common mistake.

```text
plugin/                          ← plugin root (refined request's "plugin/" workspace)
├── .claude-plugin/
│   └── plugin.json              ← ONLY the manifest lives here
├── commands/                    ← OR skills/ — Claude Code auto-discovers
│   ├── hub.md
│   ├── hub-search.md
│   ├── ...
│   └── hub-open.md
├── scripts/                     ← bundled Node scripts (TS compiled to JS)
│   ├── search.mjs
│   ├── ...
│   └── open.mjs
├── snapshot/                    ← bundled markdown content
│   ├── glossary/
│   ├── tips/
│   ├── skills/
│   ├── news/published/
│   ├── journeys/
│   └── .snapshot-meta.json
├── src/                         ← TypeScript sources (compiled into scripts/)
├── tests/                       ← Vitest tests
├── package.json
├── tsconfig.json
└── README.md
```

The refined request's `plugin/plugin.json` path (F1, F2) must be amended to `plugin/.claude-plugin/plugin.json`. Same for the marketplace file (see §1c).

Sources: [Plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema), [Plugin directory structure](https://code.claude.com/docs/en/plugins-reference#plugin-directory-structure), [Directory structure mistakes](https://code.claude.com/docs/en/plugins-reference#directory-structure-mistakes).

#### 1c. Marketplace manifest schema and location

The marketplace manifest is a separate file in a **separate-or-same** repo. Schema:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "nbg-ai-hub",
  "description": "NbgAiHub Claude Code plugin marketplace.",
  "owner": {
    "name": "chomovazuzana",
    "email": "..."
  },
  "plugins": [
    {
      "name": "nbg-ai-hub",
      "source": "./plugin",
      "description": "Hub-as-skill: /hub-* commands for the NbgAiHub knowledge hub.",
      "category": "knowledge-management",
      "keywords": ["claude-code", "knowledge-hub", "onboarding"]
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Marketplace identifier, kebab-case. Public-facing. |
| `owner` | Yes | `{ name (req), email (opt) }`. |
| `plugins` | Yes | Array of plugin entries. |
| `description` | No | One-line marketplace description. |
| `$schema` | No | Editor autocomplete URL. |
| `version` | No | Marketplace manifest version (unused by Claude Code per anecdotal docs review — Anthropic never bumps theirs). |
| `metadata.pluginRoot` | No | Base dir prepended to relative plugin sources. Lets us write `"source": "plugin"` instead of `"source": "./plugin"`. |
| `allowCrossMarketplaceDependenciesOn` | No | Cross-marketplace dependency allowlist. |

**Marketplace plugin-entry sources:**

| Source type | Shape | When to use |
|---|---|---|
| Relative path | `"source": "./plugin"` (string) | Plugin lives in the same repo as the marketplace. **THIS IS OUR CASE.** |
| `github` | `{ source: "github", repo: "owner/repo", ref?, sha? }` | Plugin lives in a separate GitHub repo. |
| `url` | `{ source: "url", url: "https://...git", ref?, sha? }` | Plugin in a non-GitHub git repo. |
| `git-subdir` | `{ source: "git-subdir", url, path, ref?, sha? }` | Plugin in a subdirectory of a separate git repo, want sparse-clone. |
| `npm` | `{ source: "npm", package, version?, registry? }` | Distributed via npm. |

**Marketplace location:** `.claude-plugin/marketplace.json` at the **marketplace repo root** (not at the plugin root). Since our marketplace and our plugin both live in the same `chomovazuzana/NbgAiHub` repo, the file goes at **repo-root** `.claude-plugin/marketplace.json` with `"source": "./plugin"` pointing to the plugin workspace.

```text
NbgAiHub/                              ← repo root (= marketplace root)
├── .claude-plugin/
│   └── marketplace.json               ← marketplace entry, source: "./plugin"
├── plugin/                            ← plugin workspace
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/ …
│   └── snapshot/ …
├── pipeline/                          ← sibling workspace (RSS)
└── site/                              ← sibling workspace (Astro)
```

This is exactly the pattern Anthropic uses in their own marketplaces ([`anthropics/claude-plugins-official/.claude-plugin/marketplace.json`](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)) and lets `/plugin marketplace add chomovazuzana/NbgAiHub` work without any `git-subdir` ceremony.

**Important detail from the docs:** "Relative paths only work when users add your marketplace via Git (GitHub, GitLab, or git URL). If users add your marketplace via a direct URL to the `marketplace.json` file, relative paths will not resolve correctly." Since our distribution path is `/plugin marketplace add chomovazuzana/NbgAiHub` (GitHub shorthand → git clone), relative paths are fine. The footgun would only kick in if someone tries to add the marketplace via a raw URL to the JSON file — not our scenario.

**Reserved names check:** Our `name: "nbg-ai-hub"` is not in the reserved list (`claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`). Cleared.

Sources: [Marketplace schema](https://code.claude.com/docs/en/plugin-marketplaces#marketplace-schema), [Plugin sources](https://code.claude.com/docs/en/plugin-marketplaces#plugin-sources), [Anthropic's official marketplace.json example](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json), [Plugins with relative paths fail in URL-based marketplaces](https://code.claude.com/docs/en/plugin-marketplaces#plugins-with-relative-paths-fail-in-url-based-marketplaces).

#### 1d. Validation

Both manifests are validated by `claude plugin validate .` (CLI) or `/plugin validate .` (interactive) from the marketplace root. AC22 ("marketplace.json conforms to required schema") becomes runnable by:
1. **Static validation:** point the file at the SchemaStore JSON Schema via `$schema` (editors validate during edit).
2. **CLI validation:** `npx --package=@anthropic-ai/claude-code claude plugin validate .` in CI.
3. **Vitest test:** parse `marketplace.json`, assert required fields exist and types are correct (poor man's schema check — fine for MVP; the CLI command is the authoritative gate).

Sources: [Validation and testing](https://code.claude.com/docs/en/plugin-marketplaces#validation-and-testing), [Common issues — manifest validation errors](https://code.claude.com/docs/en/plugins-reference#example-error-messages).

---

### 2. Command execution model — commands are LLM prompts, not script entry points

**This is the single biggest re-frame from the refined request.** The refined request (F1, NF1, A7) implies "TypeScript-backed slash command" is a thing — that the plugin can declare a TS file as a command's entry point and Claude Code executes it. That is not how the system works.

**Actual model:**

1. A slash command is a markdown file (`commands/hub-search.md` or `skills/hub-search/SKILL.md`).
2. When the user types `/hub-search foo`, Claude Code reads the markdown file, performs **string substitution** on it (`$ARGUMENTS` → `foo`, `${CLAUDE_SKILL_DIR}` → the skill's absolute install path, `${CLAUDE_PLUGIN_ROOT}` → the plugin install path, `${CLAUDE_PLUGIN_DATA}` → persistent data dir), then runs any `` !`<shell command>` `` and inlines its stdout in place of the placeholder.
3. The resulting fully-rendered markdown is **sent to the LLM as a prompt**. The LLM reads it and produces a response in conversation.

So a command's "behaviour" is: (a) what shell commands run during preprocessing, plus (b) what the LLM is instructed to do with that output. For our use case, the LLM's job is essentially to **format and present** the output that our bundled TS script already computed — or, when the body is purely informational, the LLM has nothing else to do and the user effectively sees the script's stdout.

**Three classes of command output**, each implemented by a different pattern:

#### Pattern A — Pure script output, LLM as pass-through (preferred for our list/search commands)

```markdown
---
description: Search NbgAiHub content. Args: <query> [--all]
argument-hint: <query> [--all]
allowed-tools: Bash(node *)
---

```!
node ${CLAUDE_SKILL_DIR}/../../scripts/search.mjs $ARGUMENTS
```

Output above is the search result for the user's query. Present it verbatim to the user with no editorial additions.
```

When invoked, Claude Code:
1. Substitutes `$ARGUMENTS` with the user's typed args.
2. Runs the `node …/search.mjs <query> [--all]` subprocess.
3. Inlines stdout (the formatted search results) in place of the fenced ``` ```! ``` block.
4. The LLM sees the rendered prompt and is instructed to "present verbatim." It echoes the output.

Use this pattern for: `/hub` (renders pillars menu), `/hub-search`, `/hub-skills`, `/hub-tips`, `/hub-news`, `/hub-glossary`, `/hub-onboard` (the journey body is rendered by the script), `/hub-install` (echoes the install command), `/hub-audience` (prints current value or sets it), `/hub-refresh` (status output).

#### Pattern B — Script for side effect, LLM for status reporting (good fit for `/hub-refresh`)

```markdown
---
description: Refresh the hub content snapshot from the source repo.
allowed-tools: Bash(node *)
---

Refreshing the content snapshot…

```!
node ${CLAUDE_SKILL_DIR}/../../scripts/refresh.mjs
```

If the output above shows "OK", report success with the new snapshot timestamp. If it shows an error code, surface the error verbatim and tell the user what state the cache is in.
```

The script does the `git pull` and either prints `OK <timestamp>` or `ERROR <message>`. The LLM formats it for the user.

#### Pattern C — Script that opens a URL / has no useful textual output (`/hub-open`)

```markdown
---
description: Open the hub website in the default browser.
argument-hint: [section] [subsection]
allowed-tools: Bash(node *)
---

```!
node ${CLAUDE_SKILL_DIR}/../../scripts/open.mjs $ARGUMENTS
```

The browser has been launched. Confirm to the user which URL was opened, or report the "not yet deployed" message if that's what the script printed.
```

The script computes the URL, optionally probes for the dev server, calls the `open` npm package, and prints either `Opened: <url>` or `Not opened: <url> (reason: <reason>)`.

#### Why this works for us (and is actually simpler than the refined request implied)

- The TypeScript hard work happens in `plugin/src/*.ts`, compiled to `plugin/scripts/*.mjs` by `tsc`. The compiled output is plain Node ESM, runnable as `node script.mjs args…`.
- The markdown commands are thin shells (under 15 lines each) that wire arguments → script → LLM.
- The "LLM as pass-through" pattern is what bundled skills like `/debug` and `/simplify` use; Anthropic's own marketplace plugins follow it heavily.
- Test surface concentrates on the TS modules under `src/`. The markdown files are content; integration-test their frontmatter and the script-invocation line.

#### Path-resolution gotcha — scripts/ at plugin root, not under skill dir

`${CLAUDE_SKILL_DIR}` resolves to the skill's directory (`<plugin>/skills/<name>/`), not the plugin root. To reference shared scripts from a skill, we either:

- **(a) Use plugin-root commands (preferred):** put commands at `<plugin>/commands/hub-search.md` and reference `${CLAUDE_PLUGIN_ROOT}/scripts/search.mjs`. `${CLAUDE_PLUGIN_ROOT}` is the plugin install dir and is documented as available in skill content, hook commands, and MCP/LSP configs.
- **(b) Use `skills/<name>/SKILL.md` form and walk up:** `${CLAUDE_SKILL_DIR}/../../scripts/search.mjs`. Works but feels brittle.
- **(c) Duplicate scripts per skill:** `skills/hub-search/scripts/search.mjs` referenced as `${CLAUDE_SKILL_DIR}/scripts/search.mjs`. Avoid — eleven copies of shared utilities.

**Recommendation: use the `commands/` directory (option a)** for all eleven commands and reference scripts via `${CLAUDE_PLUGIN_ROOT}/scripts/…`. Simpler paths, single scripts directory, no nesting weirdness. Note that "custom commands have been merged into skills" per the docs — the docs lightly nudge new plugins toward `skills/`, but `commands/` is still fully supported and the simpler shape for our case. We can revisit if we need supporting files per command (a glossary skill that ships a `reference.md` would naturally graduate to the `skills/` layout — but for the eleven thin shells, `commands/` is right).

Sources: [Slash commands as markdown (Skills docs)](https://code.claude.com/docs/en/skills#frontmatter-reference), [Inject dynamic context](https://code.claude.com/docs/en/skills#inject-dynamic-context), [Available string substitutions](https://code.claude.com/docs/en/skills#available-string-substitutions), [Environment variables](https://code.claude.com/docs/en/plugins-reference#environment-variables), [Plugin directory structure](https://code.claude.com/docs/en/plugins-reference#plugin-directory-structure).

---

### 3. TypeScript-backed command implementation

#### 3a. Build pipeline

`plugin/package.json`:

```json
{
  "name": "nbg-ai-hub-plugin",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\"",
    "test": "vitest run",
    "snapshot": "node scripts-build/build-snapshot.mjs"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^4.1.6",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "typescript-eslint": "^8.0.0"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "yaml": "^2.5.0",
    "open": "^10.1.0"
  }
}
```

Mirrors `pipeline/package.json` exactly for shared toolchain, plus `open` for cross-platform browser launch.

`plugin/tsconfig.json` mirrors `pipeline/tsconfig.json` — strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `target: ES2023`, `module: NodeNext`, `outDir: ./scripts`, `rootDir: ./src`.

**Output layout after `npm run build`:**

```text
plugin/
├── src/                       ← TypeScript sources (gitignore'd from cache)
│   ├── search.ts              ← command entry points (one per non-trivial command)
│   ├── hub-entry.ts
│   ├── skills.ts
│   ├── tips.ts
│   ├── news.ts
│   ├── glossary.ts
│   ├── onboard.ts
│   ├── install.ts
│   ├── audience.ts
│   ├── refresh.ts
│   ├── open.ts
│   ├── lib/                   ← shared modules
│   │   ├── config.ts          ← MissingPluginConfigError, loads plugin/config.json
│   │   ├── snapshot.ts        ← walks plugin/snapshot/, parses frontmatter
│   │   ├── frontmatter.ts     ← gray-matter wrapper with yaml engine
│   │   ├── state.ts           ← read/write state file (audience, lastJourney)
│   │   ├── search.ts          ← scoring algorithm (A14, A15)
│   │   ├── url-builder.ts     ← pure deep-link builder (AC20)
│   │   └── errors.ts          ← named error classes
│   └── (other files…)
├── scripts/                   ← compiled JS, COMMITTED to the published plugin
│   ├── search.mjs
│   ├── …
│   └── lib/…
└── commands/                  ← thin markdown shells, COMMITTED
    ├── hub.md
    ├── hub-search.md
    └── …
```

The compiled `scripts/` directory is **committed to the repo**. Reason: when a user installs the plugin via the marketplace, Claude Code copies the plugin directory to `~/.claude/plugins/cache/`. It does not run `npm install` or `tsc` on the user's machine (only `npm` source-typed plugins run `npm install`). The compiled JS must be in the repo at publish time.

**Build hook:** the existing `pipeline/` and `site/` projects don't have a pre-commit hook to enforce build-before-commit. For the plugin we'd want a CI step (`cd plugin && npm run build && git diff --exit-code scripts/`) that fails if compiled output is stale. Note this in `Issues - Pending Items.md` as a follow-up; for MVP, manual rebuild + commit is acceptable.

#### 3b. Alternative considered: `tsx` shebang

Run `.ts` files directly via `tsx`:

```markdown
```!
npx tsx ${CLAUDE_PLUGIN_ROOT}/src/search.ts $ARGUMENTS
```
```

Pros: no separate build step, no committed compiled output.
Cons: requires `tsx` installed on the user's machine (or via `npx` which adds 0.5-2s startup latency per command invocation), and ships TS sources to every user. Slow user experience kills the "snappy /hub command" feel.

**Rejected.** Build to `.mjs`, ship the compiled artifacts.

#### 3c. Alternative considered: bundle to a single executable via `bin/`

The plugin spec supports a `bin/` directory whose entries are added to the Bash tool's PATH (`<plugin>/bin/my-tool` invokable as bare `my-tool`). Could bundle each command to a Node executable.

Pros: command markdown becomes `` !`hub-search-impl $ARGUMENTS` `` — cleaner.
Cons: needs shebang lines (`#!/usr/bin/env node`) and executable permissions; permissions don't always survive the plugin cache copy (especially on Windows); adds a bundling step.

**Rejected for MVP.** Use direct `node ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs` invocation. Revisit if the syntax becomes painful.

Sources: [File locations reference](https://code.claude.com/docs/en/plugins-reference#file-locations-reference), [Plugin caching and file resolution](https://code.claude.com/docs/en/plugins-reference#plugin-caching-and-file-resolution).

---

### 4. Content snapshot strategy — bundled, refreshable via git pull

#### 4a. Bundled snapshot

`plugin/snapshot/` is committed to the repo. Mirrors the layout of repo-root `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/` exactly (per A2, A13). A build script copies these directories into `plugin/snapshot/` and writes `plugin/snapshot/.snapshot-meta.json`:

```json
{
  "generatedAt": "2026-05-19T07:00:00Z",
  "sourceCommit": "c73c36d480f112ec6e47d50a94d203ea48979246"
}
```

Build script (`plugin/scripts-build/build-snapshot.mjs`, run via `npm run snapshot` from `plugin/`):

```js
// pseudocode
import { rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const PILLARS = ['glossary', 'tips', 'skills', 'news/published', 'journeys']
const SNAPSHOT = 'snapshot'
rmSync(SNAPSHOT, { recursive: true, force: true })
mkdirSync(SNAPSHOT, { recursive: true })
for (const p of PILLARS) {
  cpSync(`../${p}`, `${SNAPSHOT}/${p}`, { recursive: true })
}
const sha = execSync('git rev-parse HEAD').toString().trim()
writeFileSync(`${SNAPSHOT}/.snapshot-meta.json`, JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: sha }, null, 2))
```

Idempotent. AC18 (snapshot build copies all five content folders) is the test.

#### 4b. `/hub-refresh` — git clone/pull into user cache

Plan: `~/.cache/nbg-ai-hub/snapshot/` (the refined-request A11 path, XDG-style) is where the user's "fresh" copy of the hub repo lives. **But there's a better option** — use `${CLAUDE_PLUGIN_DATA}`:

`${CLAUDE_PLUGIN_DATA}` resolves to `~/.claude/plugins/data/nbg-ai-hub-<marketplace-suffix>/` (the docs note characters outside `a-zA-Z0-9_-` get replaced by `-`, so for our `nbg-ai-hub@nbg-ai-hub-marketplace` install it'd be `~/.claude/plugins/data/nbg-ai-hub-nbg-ai-hub/`). It's documented as "a persistent directory for plugin state that survives updates," exactly our use case.

**Trade-off:**

| Path | Pros | Cons |
|---|---|---|
| `~/.cache/nbg-ai-hub/snapshot/` (A11) | XDG-correct; visible in expected location | Plugin owns a path outside Claude's tree; if user uninstalls the plugin, leftover cache lingers |
| `${CLAUDE_PLUGIN_DATA}/snapshot/` | Auto-cleanup on uninstall (default; `--keep-data` preserves); aligned with plugin spec | Path is slightly opaque to users debugging by hand |

**Recommendation: use `${CLAUDE_PLUGIN_DATA}/snapshot/` and amend A11.** The Claude-managed lifecycle matters more than XDG purity, and the docs are explicit that this is the intended use ("installed dependencies … generated code, caches, and any other files that should persist across plugin versions"). The plugin's TS `refresh.ts` reads `process.env.CLAUDE_PLUGIN_DATA` (the docs confirm it's exposed as an env var to subprocesses) and operates against that directory.

Refresh flow:

```ts
// pseudocode (plugin/src/refresh.ts)
import { execSync } from 'node:child_process'
import { existsSync, renameSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'

const DATA = process.env.CLAUDE_PLUGIN_DATA
if (!DATA) throw new MissingPluginConfigError('CLAUDE_PLUGIN_DATA not set; cannot refresh')
const CACHE = join(DATA, 'snapshot-clone')   // bare clone of the hub repo
const STAGING = join(DATA, 'snapshot-new')   // new content during atomic swap
const LIVE = join(DATA, 'snapshot')          // what plugin reads from after refresh

function run(cmd: string, cwd?: string) { execSync(cmd, { cwd, stdio: 'inherit' }) }

if (!existsSync(CACHE)) {
  // First refresh — clone fresh
  run(`git clone --depth 1 https://github.com/chomovazuzana/NbgAiHub.git ${CACHE}`)
} else {
  // Subsequent refresh — pull
  run('git fetch --depth 1 origin main', CACHE)
  run('git reset --hard origin/main', CACHE)
}

// Atomic swap: build a staging dir, rename into place, remove old
rmSync(STAGING, { recursive: true, force: true })
for (const pillar of ['glossary', 'tips', 'skills', 'news/published', 'journeys']) {
  cpSync(join(CACHE, pillar), join(STAGING, pillar), { recursive: true })
}
// Write meta
const sha = execSync('git rev-parse HEAD', { cwd: CACHE }).toString().trim()
writeFileSync(join(STAGING, '.snapshot-meta.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceCommit: sha }, null, 2))
// Atomic rename
if (existsSync(LIVE)) {
  const TRASH = join(DATA, `snapshot-old-${Date.now()}`)
  renameSync(LIVE, TRASH)
  rmSync(TRASH, { recursive: true, force: true })
}
renameSync(STAGING, LIVE)
console.log(`OK ${sha} ${new Date().toISOString()}`)
```

Atomicity comes from the `renameSync` on a same-filesystem directory rename (POSIX atomic). If the clone/pull fails, `STAGING` is never created and `LIVE` is untouched. If the rename fails mid-flight (unlikely on a same-filesystem move), the worst case is a leftover `snapshot-old-…` dir, which we clean up on next refresh.

**Which snapshot does the plugin read from?** Two states:

1. **Fresh install, no refresh yet:** plugin reads from `${CLAUDE_PLUGIN_ROOT}/snapshot/` (the bundled snapshot).
2. **After at least one `/hub-refresh`:** plugin reads from `${CLAUDE_PLUGIN_DATA}/snapshot/` if it exists, else falls back to the bundled snapshot.

The snapshot-loader module (`plugin/src/lib/snapshot.ts`) implements this dual lookup, preferring `${CLAUDE_PLUGIN_DATA}/snapshot/` when present. **Important:** per the no-fallback rule (CLAUDE.md), "fallback" here means "config absent" not "snapshot path absent." Both paths are computed deterministically from env vars; the existence check is a normal runtime branch, not a silent default substitution.

#### 4c. Private-repo auth for `/hub-refresh`

The hub repo is private (DECISIONS.md 2026-05-18). `/hub-refresh` does `git clone https://github.com/chomovazuzana/NbgAiHub.git` and `git pull`. Two cases:

- **User has `gh auth login` set up** → git uses the GitHub CLI credential helper → clone works.
- **User has SSH keys configured** → use the SSH URL form: `git@github.com:chomovazuzana/NbgAiHub.git`. Add a config flag (`plugin/config.json` `refreshUrl`) so users can pick.

The Claude Code docs note that for marketplace auto-updates against private repos, `GITHUB_TOKEN` env is needed in non-interactive flows. Our `/hub-refresh` runs at user request (interactive), so the user's git creds work — same model as Claude Code's own marketplace-update flow against private repos.

**OQ to register**: should `plugin/config.json` accept both `refreshUrl` (HTTPS) and `refreshUrlSsh` (SSH), defaulting to HTTPS? Document in `Issues - Pending Items.md` if it's not resolved during planning.

Sources: [Persistent data directory](https://code.claude.com/docs/en/plugins-reference#persistent-data-directory), [Private repositories](https://code.claude.com/docs/en/plugin-marketplaces#private-repositories).

---

### 5. `/hub-open` — cross-platform browser launch

#### 5a. Use the `open` npm package

[`open`](https://www.npmjs.com/package/open) is the canonical cross-platform open-URL/file/app library for Node. It's the actively maintained successor to `opn` (legacy). Under the hood it spawns `open` on macOS, `start` on Windows, and `xdg-open` on Linux. Active since 2014, current major v10 (mid-2026), Sindre Sorhus maintained.

```ts
// plugin/src/open.ts
import openLib from 'open'
import { buildUrl } from './lib/url-builder.js'
import { loadConfig } from './lib/config.js'

const args = process.argv.slice(2)   // e.g., ["news"], ["glossary", "mcp"], []
const config = loadConfig()           // throws MissingPluginConfigError if missing
const baseUrl = config.devMode ? 'http://localhost:4321' : config.productionUrl
const url = buildUrl(baseUrl, args[0], args[1])

// In devMode, probe localhost:4321 before opening
if (config.devMode) {
  try {
    const res = await fetch('http://localhost:4321', { signal: AbortSignal.timeout(1500) })
    if (!res.ok) throw new Error('non-200')
  } catch {
    console.log(`Not opened: ${url} (reason: dev server not running — run 'cd site && npm run dev' first)`)
    process.exit(0)
  }
}

// Placeholder check (AC17, AC21)
if (config.productionUrl === 'PLACEHOLDER_NOT_YET_DEPLOYED' && !config.devMode) {
  console.log(`Not opened: ${url} (reason: site not yet deployed — see DECISIONS.md for hosting status)`)
  process.exit(0)
}

await openLib(url)
console.log(`Opened: ${url}`)
```

Pros over spawning `open`/`xdg-open`/`start` ourselves:

- Battle-tested edge cases (WSL paths, app-specific opening, double-quote stripping on Windows).
- 3 KB, MIT.
- ESM-native.

#### 5b. Dev-mode probe of `localhost:4321`

Use Node's built-in `fetch` (Node 22 has it native) with a 1.5s `AbortSignal.timeout()`. If 200, open. If not (timeout, connection refused, 404 from no dev server running), print the helpful message and exit cleanly.

#### 5c. Not-yet-deployed handling (AC17, AC21)

`plugin/config.json` ships with `productionUrl: "PLACEHOLDER_NOT_YET_DEPLOYED"` (literal sentinel string) and `devMode: true`. Until the site is hosted, the `open` script: (a) when `devMode: true`, probes localhost; (b) when `devMode: false`, sees the placeholder and prints the not-yet-deployed message. Flipping `devMode` to `false` and updating `productionUrl` is a one-line config edit when GH Pages goes live (the refined-request A3 spec is exactly this).

Sources: [`open` npm package](https://www.npmjs.com/package/open), [Node.js 22 fetch / AbortSignal.timeout](https://nodejs.org/api/globals.html#fetch).

---

### 6. Search ranking — implementable in ~80 lines, no dependency

A14 locks in: title×5, frontmatter `topics`×3, body×1, case-insensitive substring, top-N=10, snippet=200 chars centered on first match.

This is ~80 lines of TS, no library needed:

```ts
// plugin/src/lib/search.ts
export type SearchItem = {
  title: string
  topics: string[]
  body: string
  pillar: 'glossary' | 'tips' | 'skills' | 'news' | 'journey'
  audience: 'beginner' | 'advanced' | 'both'
  path: string
}

export type Hit = {
  item: SearchItem
  score: number
  snippet: string
}

const W_TITLE = 5
const W_TOPICS = 3
const W_BODY = 1
const SNIPPET = 200

function countSubstring(haystack: string, needle: string): number {
  if (!needle) return 0
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  let count = 0
  let idx = 0
  while ((idx = h.indexOf(n, idx)) !== -1) {
    count++
    idx += n.length
  }
  return count
}

function score(item: SearchItem, query: string): number {
  const titleHits = countSubstring(item.title, query)
  const topicsHits = item.topics.reduce((acc, t) => acc + countSubstring(t, query), 0)
  const bodyHits = countSubstring(item.body, query)
  return titleHits * W_TITLE + topicsHits * W_TOPICS + bodyHits * W_BODY
}

function snippet(body: string, query: string): string {
  const idx = body.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return body.slice(0, SNIPPET) + (body.length > SNIPPET ? '…' : '')
  const start = Math.max(0, idx - Math.floor(SNIPPET / 2))
  const end = Math.min(body.length, start + SNIPPET)
  const head = start === 0 ? '' : '…'
  const tail = end === body.length ? '' : '…'
  return head + body.slice(start, end).replace(/\s+/g, ' ').trim() + tail
}

export function search(items: SearchItem[], query: string, audience: 'beginner' | 'advanced' | 'both', limit = 10): Hit[] {
  const filtered = audience === 'both' ? items : items.filter(i => i.audience === audience || i.audience === 'both')
  return filtered
    .map(item => ({ item, score: score(item, query), snippet: snippet(item.body, query) }))
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
```

**Pure function**, AC2-testable directly without I/O. No external dep. AC14-traceable.

Lightweight library alternatives if requirements change later: [`minisearch`](https://lucaong.github.io/minisearch/) (fuzzy + prefix, ~25 KB) or [`fuse.js`](https://www.fusejs.io/) (fuzzy, ~10 KB). Both are overkill for substring matching and add a dep we don't need for MVP.

Sources: search algorithm is plain TS — no external reference needed for the substring approach.

---

### 7. Per-user state file — `${CLAUDE_PLUGIN_DATA}` is the canonical path

Refined request A6: `~/.claude/plugins/nbg-ai-hub/state.json`.

**Confirmed direction, with one correction.** The canonical resolved path per Claude Code's spec is `~/.claude/plugins/data/<plugin-id>/` (note the `data/` segment, and the `<plugin-id>` is the plugin's marketplace-qualified identifier with non-alphanumeric chars replaced by `-`). For our plugin installed as `nbg-ai-hub@nbg-ai-hub` (plugin name @ marketplace name) the path resolves to:

```
~/.claude/plugins/data/nbg-ai-hub-nbg-ai-hub/
```

This is exposed to subprocesses as the `CLAUDE_PLUGIN_DATA` env var. The plugin reads it; if absent, throws `MissingPluginConfigError` per the no-fallback rule.

**Why this is better than hardcoding `~/.claude/plugins/nbg-ai-hub/state.json`:**

- The docs guarantee `${CLAUDE_PLUGIN_DATA}` survives plugin updates (per [Persistent data directory](https://code.claude.com/docs/en/plugins-reference#persistent-data-directory)). Hardcoded paths might not.
- The directory is auto-cleaned on uninstall (with `--keep-data` opt-out). Hardcoded paths leak.
- The plugin ID is reserved/namespaced by Claude Code, so two plugins named differently never collide.

State file: `${CLAUDE_PLUGIN_DATA}/state.json`. Schema:

```json
{
  "audience": "beginner",
  "lastJourney": "day-1"
}
```

State module:

```ts
// plugin/src/lib/state.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { MissingPluginConfigError } from './errors.js'

export type State = { audience: 'beginner' | 'advanced' | 'both'; lastJourney: string | null }
const DEFAULT_STATE: State = { audience: 'both', lastJourney: null }

function statePath(): string {
  const dir = process.env.CLAUDE_PLUGIN_DATA
  if (!dir) throw new MissingPluginConfigError('CLAUDE_PLUGIN_DATA env var not set — plugin must be invoked by Claude Code')
  return join(dir, 'state.json')
}

export function readState(): State {
  const path = statePath()
  if (!existsSync(path)) return DEFAULT_STATE  // first-run bootstrap, not a fallback
  return JSON.parse(readFileSync(path, 'utf-8'))
}

export function writeState(s: State): void {
  const path = statePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(s, null, 2))
}
```

**On the no-fallback rule and DEFAULT_STATE:** the global CLAUDE.md rule is "never substitute defaults for missing *configuration*." The audience-filter default (`"both"`) on first install is *user state initialization*, not config substitution — analogous to a freshly installed app showing the user "no preferences set yet" on first launch. The refined request A4 says the audience filter persists across sessions; that's about subsequent reads, not first-write semantics. Document explicitly in the DECISIONS.md entry that first-run bootstrap returns `{audience: 'both', lastJourney: null}` and that this is the no-preferences-set state — not a fallback for missing config. If reviewers feel this still touches the rule, register it in `Issues - Pending Items.md` as a consciously-accepted exception per CLAUDE.md.

**Action: amend A6** to specify `${CLAUDE_PLUGIN_DATA}/state.json` (effectively `~/.claude/plugins/data/<plugin-id>/state.json`) instead of `~/.claude/plugins/nbg-ai-hub/state.json`. The intent (refined request A6) is preserved; only the path-formation mechanism changes from hardcoded to Claude-supplied env var. AC12 / AC19 (audience persists across reloads) is unchanged — both paths persist.

Sources: [Persistent data directory](https://code.claude.com/docs/en/plugins-reference#persistent-data-directory), [Environment variables](https://code.claude.com/docs/en/plugins-reference#environment-variables).

---

### 8. Marketplace publishing flow — what `/plugin marketplace add chomovazuzana/NbgAiHub` actually does

Step-by-step, from the docs:

1. **User invokes** `/plugin marketplace add chomovazuzana/NbgAiHub` in their Claude Code session.
2. **Claude Code resolves the source** — the `owner/repo` shorthand is interpreted as GitHub. (Append `@ref` to pin to a branch/tag: `/plugin marketplace add chomovazuzana/NbgAiHub@v1.0`. We can ignore this for MVP.)
3. **Claude Code clones** the repo to `~/.claude/plugins/marketplaces/nbg-ai-hub/` (or similar — exact subpath is `~/.claude/plugins/<canonicalised-marketplace-id>/`). Uses the user's existing git credential helpers; supports both HTTPS (via `gh` CLI or git-credential-store) and SSH (with `ssh-agent`). 120-second timeout per git operation, configurable via `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`.
4. **Claude Code reads** `.claude-plugin/marketplace.json` from the clone.
5. **Claude Code registers** the marketplace in `~/.claude/plugins/known_marketplaces.json`.
6. **The marketplace is now "added"** — user can now `/plugin install nbg-ai-hub@nbg-ai-hub`.

When the user runs `/plugin install nbg-ai-hub@nbg-ai-hub`:

1. **Claude Code reads** the marketplace entry for `nbg-ai-hub` from the marketplace JSON.
2. **Source is `"./plugin"`** (relative path in our setup) — Claude Code resolves this against the marketplace clone root, so it reads `<marketplace-clone>/plugin/`.
3. **Claude Code copies** the `plugin/` directory to `~/.claude/plugins/cache/<marketplace-id>/<plugin-id>/<version>/`. The copy is what runs; the original clone is the marketplace registry, not the plugin runtime.
4. **Claude Code reads** `.claude-plugin/plugin.json` from the copied plugin to discover its components.
5. **Components auto-load:** `commands/*.md` → slash commands; `skills/<name>/SKILL.md` → skills; `hooks/hooks.json` → hooks; `.mcp.json` → MCP servers.
6. **`enabledPlugins` is updated** in `~/.claude/settings.json` (or project/local settings depending on `--scope`).
7. **Plugin is live** in the current session and persists across sessions.

**Key implications for our build:**

- **Compiled `scripts/*.mjs` must be in the repo.** The copy step does NOT run `npm install` or `tsc` (only `npm`-sourced plugins run `npm install`). Our `source: "./plugin"` (relative path) gets a plain file copy.
- **No `node_modules` in the plugin directory** beyond what we want to ship. Best practice: have all runtime deps as `dependencies` (not `devDependencies`) and bundle them with `esbuild` or `tsc` + `--bundle`, OR ship `node_modules/` via the plugin (heavy). **Easiest path: zero runtime dependencies.** We need `gray-matter`, `yaml`, and `open`. `gray-matter`+`yaml` are tiny (~50 KB combined). `open` is ~3 KB. We can either bundle them into `scripts/*.mjs` via esbuild (smallest), or commit `plugin/node_modules/` and pay the size cost. **Recommendation: esbuild bundling**, producing self-contained `scripts/*.mjs` files with no external deps at runtime. Add `esbuild` to devDeps. Final shipped artifacts are ~100-200 KB total.
- **Updates:** when we push a new commit to `main` with no `version` field in `plugin.json`, every user who runs `/plugin update nbg-ai-hub@nbg-ai-hub` (or whose auto-update fires) gets the new commit. Pin a `version` only when we want explicit release gating.
- **Path-traversal restriction:** the copy step copies only files inside `plugin/`. We CAN'T reference `../glossary/` from inside the plugin's source code — those files won't be there. Our build-snapshot script (which DOES `cp ../glossary plugin/snapshot/glossary` at *build* time) is fine because it runs before commit; the snapshot ends up inside `plugin/snapshot/` and gets copied along with the rest of the plugin.

**Confirmed scenario for our marketplace name:**

The marketplace's own `name` field (in `marketplace.json`) is what users see in `/plugin install <plugin>@<marketplace-name>`. So if we set `"name": "nbg-ai-hub"` in `marketplace.json`, users install with `/plugin install nbg-ai-hub@nbg-ai-hub` — which is symmetric but redundant. Two options:

- **Keep marketplace name = plugin name** (`nbg-ai-hub` / `nbg-ai-hub`) — symmetric; trade-off is the install command reads `nbg-ai-hub@nbg-ai-hub`.
- **Pick a different marketplace name** like `chomovazuzana-marketplace` — install reads `nbg-ai-hub@chomovazuzana-marketplace`. Slightly more verbose but clearer.

Recommendation: **`nbg-ai-hub-marketplace` for the marketplace, `nbg-ai-hub` for the plugin**. Install command: `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`. Mild redundancy but unambiguous.

Sources: [Plugin caching and file resolution](https://code.claude.com/docs/en/plugins-reference#plugin-caching-and-file-resolution), [Host and distribute marketplaces](https://code.claude.com/docs/en/plugin-marketplaces#host-and-distribute-marketplaces), [Plugin marketplace add (CLI)](https://code.claude.com/docs/en/plugin-marketplaces#plugin-marketplace-add), [Private repositories](https://code.claude.com/docs/en/plugin-marketplaces#private-repositories), [Path traversal limitations](https://code.claude.com/docs/en/plugins-reference#path-traversal-limitations).

---

## Recommended approach

A concrete, actionable plan, in execution order:

### Pre-implementation: amend the refined request

Before code, the project lead should:

1. **Amend F1 / F2 / F3** in `docs/refined-requests/hub-plugin.md`: paths are `plugin/.claude-plugin/plugin.json` (plugin manifest) and **repo-root** `.claude-plugin/marketplace.json` (marketplace manifest, with `"source": "./plugin"`). The marketplace manifest does NOT live in `plugin/`.
2. **Amend F2 / AC23**: the manifest does NOT contain a `commands` array of named entries. Replace AC23 with: *"`commands/` contains exactly eleven `.md` files matching `{hub, hub-search, hub-skills, hub-tips, hub-news, hub-glossary, hub-onboard, hub-install, hub-audience, hub-refresh, hub-open}.md`. Each parses with valid YAML frontmatter."*
3. **Amend A1 / F2**: `version` in `plugin.json` should be **omitted** during active development (let commit SHA be the version). Pin once we cut a stable release. Update the "starts at 0.1.0" framing.
4. **Amend A6 / A11**: per-user state path is `${CLAUDE_PLUGIN_DATA}/state.json` (resolves to `~/.claude/plugins/data/<plugin-id>/state.json`). `/hub-refresh` writes to `${CLAUDE_PLUGIN_DATA}/snapshot/`. Cite §4b and §7 of this investigation.
5. **Amend F2 / A7**: clarify that "TypeScript-backed slash command" means *the markdown command body invokes a bundled Node script (compiled from TS) via `` !`node ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs $ARGUMENTS` ``, and the LLM is instructed to present the script's stdout*. No "TS entry point" field exists in the manifest.
6. **Append a DECISIONS.md entry** for 2026-05-19 (or current date at merge) covering: (a) plugin/marketplace manifest locations + the SchemaStore `$schema` references, (b) `${CLAUDE_PLUGIN_DATA}` for state + refresh cache, (c) markdown-shell-invokes-Node-script command pattern, (d) `omit version` for active development, (e) marketplace name = `nbg-ai-hub-marketplace`, plugin name = `nbg-ai-hub`, (f) esbuild bundling of dependencies for zero-node_modules-in-plugin shipping.

### Implementation order

1. **`plugin/` scaffold:** `package.json` (Node 22, ESM, vitest 4.x, gray-matter, yaml, open, esbuild dev-dep), `tsconfig.json` (mirror `pipeline/`), `.eslintrc` / flat config (mirror `pipeline/`), `tests/` empty, `src/lib/{errors,config,frontmatter,snapshot,state,search,url-builder}.ts`, `commands/` empty, `scripts-build/build-snapshot.mjs`, `scripts-build/build.mjs` (esbuild wrapper).
2. **`plugin/.claude-plugin/plugin.json`:** minimal manifest (name + description + author + license).
3. **`.claude-plugin/marketplace.json`** at repo root: name `nbg-ai-hub-marketplace`, owner, plugins array with `{ name: "nbg-ai-hub", source: "./plugin", description, category: "knowledge-management" }`.
4. **`plugin/config.json`:** `{ productionUrl: "PLACEHOLDER_NOT_YET_DEPLOYED", devMode: true, refreshUrl: "https://github.com/chomovazuzana/NbgAiHub.git" }`. Loaded by `src/lib/config.ts` which throws `MissingPluginConfigError` if the file is absent (AC27).
5. **Shared `src/lib/` modules** (config, errors, frontmatter, snapshot, state, search, url-builder) with full Vitest coverage. These are the pure-function core; the per-command entry points compose them.
6. **Per-command `src/*.ts` entry points:** hub-entry, search, skills, tips, news, glossary, onboard, install, audience, refresh, open. Each is a small `process.argv` parser + a call to lib functions + `console.log`. Total ~50-150 lines per file.
7. **Per-command tests in `plugin/tests/*.test.ts`** (AC1–AC17 + cross-cutting AC18–AC29). Mock the snapshot loader for command tests; lib tests run against fixtures.
8. **esbuild build to `plugin/scripts/*.mjs`** with `--platform=node --target=node22 --bundle --format=esm --external:none` to produce self-contained ESM bundles. Add `node:` import prefixes everywhere.
9. **`plugin/commands/*.md`:** eleven thin markdown shells, each ~15 lines. Frontmatter: `description`, `argument-hint`, `allowed-tools: Bash(node *)`. Body: ` ```! node ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs $ARGUMENTS ``` ` plus instruction to LLM.
10. **`plugin/README.md`:** eleven command sections (AC24), tone-checked (NF8).
11. **`npm run snapshot`** to populate `plugin/snapshot/` from repo content.
12. **Validation:** `cd plugin && npm install && npm run build && npm run typecheck && npm run lint && npm run test`. Then `npx --package=@anthropic-ai/claude-code claude plugin validate .` from repo root to validate marketplace + plugin manifests.
13. **Local end-to-end smoke test:** `/plugin marketplace add ./` (from inside a fresh Claude Code session in the repo) → `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace` → invoke each of the eleven `/hub-*` commands. Record in `docs/reference/integration-verification-hub-plugin.md`.
14. **DECISIONS.md entry** appended (per pre-implementation step 6 above).
15. **SCOPE.md** "Hub-as-skill plugin" row flipped from `not started` to `✅`; demo-ability checklist items checked; `*Last updated*` bumped.

### Tooling skip list

- **No `tsx`** at runtime — build to `.mjs`.
- **No `bin/` executables** — direct `node script.mjs` is simpler.
- **No MCP server** — overkill for our use case (we don't need long-lived process state or bidirectional tool calls).
- **No hooks** — nothing event-driven in scope.
- **No `userConfig` field** — configuration lives in `plugin/config.json` (shipped) and `${CLAUDE_PLUGIN_DATA}/state.json` (per-user). `userConfig` is for sensitive values (API tokens etc.) which we don't have.
- **No agents / output styles / themes / monitors** — out of scope.

---

## Risks and mitigations

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R1 | Refined request says `plugin.json` has a `commands` array and lives at `plugin/plugin.json` — both wrong | High (will trip implementer) | Medium | **Amend the refined request before implementation** (see pre-implementation step 1-2). |
| R2 | Implementer tries to invoke `.ts` files directly via `tsx` for speed — adds 0.5-2s latency per command | Medium | Medium | Build to `.mjs` is the locked path (§3a). Pre-commit hook or CI step ensures `scripts/` is up to date. |
| R3 | Shipping `node_modules/` in `plugin/` bloats the install copy | Medium | Low | esbuild bundle into `scripts/*.mjs`. Self-contained. Plugin total ~200 KB. |
| R4 | `/hub-refresh` private-repo auth fails for users without `gh auth login` or SSH keys | Medium | Medium | Document in README the prerequisites. Surface git error verbatim per AC15. Optional `refreshUrlSsh` config flag. |
| R5 | `${CLAUDE_PLUGIN_DATA}` env var not set when our script runs (e.g., in tests) | Medium | Medium | Tests set the env explicitly. Production code throws `MissingPluginConfigError`. AC27-adjacent. |
| R6 | Compiled `scripts/` get out of sync with `src/` between commits | Medium | Low | CI step: `cd plugin && npm run build && git diff --exit-code scripts/`. Add a note in `Issues - Pending Items.md`. |
| R7 | LLM editorialises the script output instead of presenting verbatim | Low-medium | Medium | Strong instruction in markdown body ("Present the output above verbatim — do not add commentary"). Tested via manual smoke (AC29 tone check). |
| R8 | Marketplace name `nbg-ai-hub-marketplace` is too verbose for stakeholders | Low | Cosmetic | Easy to rename later; not load-bearing. Document the install command in the README. |
| R9 | Plugin spec changes between mid-2026 and our release | Low | Low-medium | Pin `$schema` URLs; subscribe to Claude Code changelogs; manifest schema has been stable since mid-2025. |
| R10 | The bundled `snapshot/` is committed to the repo, doubling content storage (`glossary/` + `plugin/snapshot/glossary/`) | Medium | Low | Acceptable storage cost (~1-2 MB). Snapshot is the source of truth at install time; eliminates a build-time fetch. |
| R11 | Single-source-of-truth drift: someone edits `plugin/snapshot/` directly | Medium | Medium | `npm run snapshot` is the ONLY supported way to update `plugin/snapshot/`. Pre-commit hook or CI check: `plugin/snapshot/.snapshot-meta.json sourceCommit` == `HEAD` (or a known recent SHA). |
| R12 | Claude Code's slash-command preprocessing strips characters or fails on quoted args containing newlines | Low | Medium | `$ARGUMENTS` uses shell-style quoting; multi-word arguments require user quoting. Document in `argument-hint`. Test edge cases. |

---

## Technical Research Guidance

**Research needed: Yes — two narrow Phase 3b topics before implementation begins.**

### Topic 1: Node script invocation pattern from a plugin slash command

- **Why:** The Claude Code skill docs show examples of `` !`python3 ${CLAUDE_SKILL_DIR}/scripts/foo.py` `` and `` !`gh pr diff` ``, but no canonical Node-binary example. We need to confirm the exact pattern for a TypeScript-compiled Node ESM bundle, including:
  - Does `` !`node ${CLAUDE_PLUGIN_ROOT}/scripts/foo.mjs $ARGUMENTS` `` work as expected when `$ARGUMENTS` contains shell-metacharacters? (E.g., `/hub-search "claude code" --all` — does the script receive `"claude code"` as one argv entry?)
  - What happens to stderr output? Does it appear inline next to stdout, or get discarded? Affects how we surface `MissingPluginConfigError` messages.
  - What's the exit-code convention? Non-zero exits — does Claude Code propagate that into the LLM context, or does the inlined output just stop at whatever stdout produced?
  - Buffering / truncation: is there an output size limit per `` !`…` `` block?
- **Focus:** write a 30-line test plugin with a Node script that emits known output (incl. multi-line, quoted-arg edge cases, stderr), install it via the local-marketplace flow, observe behaviour.
- **Depth:** Intermediate — half a day's work. Iterative via `claude --debug`.
- **Relevance:** Direct dependency for all eleven commands. If the pattern has surprises, the whole markdown-shell approach needs adjustment (e.g., we may need to wrap scripts in a tiny bash wrapper that handles exit codes / stderr explicitly).

### Topic 2: Marketplace install behaviour for `source: "./plugin"` relative to repo root

- **Why:** Documented behaviour says relative paths in `marketplace.json` resolve against the *marketplace root*, which is the directory containing `.claude-plugin/`. Our `.claude-plugin/marketplace.json` lives at the repo root, so `./plugin` resolves to `<repo>/plugin/`. But we should confirm:
  - What exactly gets copied to the cache? Whole `plugin/` directory contents only? Or does Claude Code also copy ancestor directories like `plugin/snapshot/` (yes — it's inside `plugin/`)? Confirm the snapshot ships.
  - Does the copy honour `.gitignore`? If so, anything ignored at the plugin level (e.g., `plugin/node_modules/` if we don't bundle, or `plugin/.astro/` etc.) won't ship — usually fine.
  - Does the install copy preserve file modes on Unix? (`scripts/*.mjs` doesn't need exec, but if we ever ship a shebang'd script in `bin/`, we need exec bit preserved.)
  - End-to-end test: clone repo locally, run `/plugin marketplace add ./` from a fresh Claude session in a different directory, then `/plugin install nbg-ai-hub@nbg-ai-hub-marketplace`, then `ls ~/.claude/plugins/cache/<…>/` to see what landed.
- **Focus:** local-loop smoke test of the install flow with the actual plugin scaffold, before we publish to GitHub.
- **Depth:** Intermediate — 2-4 hours.
- **Relevance:** Direct dependency for AC22 (marketplace manifest validity end-to-end) and DoD #13 (end-to-end smoke test on a fresh install).

**Topics NOT requiring deeper research** (sufficient detail already gathered):

- Plugin and marketplace manifest schemas — fully documented at [code.claude.com/docs/en/plugins-reference](https://code.claude.com/docs/en/plugins-reference) and [/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces). SchemaStore JSON Schema available for editor validation.
- `${CLAUDE_PLUGIN_DATA}` / `${CLAUDE_PLUGIN_ROOT}` semantics — fully documented with examples in [Persistent data directory](https://code.claude.com/docs/en/plugins-reference#persistent-data-directory).
- `open` npm package cross-platform behaviour — well-known, widely used, npm v10 active.
- Search ranking algorithm — pure TS, no library, AC14-traceable.
- `gray-matter` + `yaml` engine — already used in `pipeline/`, DECISIONS.md 2026-05-18 entry covers the YAML 1.1 Date quirk fix.
- Private-repo `git pull` auth — same model as Claude Code's own marketplace auto-update; documented in [Private repositories](https://code.claude.com/docs/en/plugin-marketplaces#private-repositories).

---

## Implementation Considerations

- **The `.claude-plugin/` directory at repo root will surprise readers** of the repo who're used to seeing it inside `plugin/`. Add a `README.md` snippet at repo root explaining why it's there (marketplace manifest is repo-level; plugin manifest is per-plugin and lives in `plugin/.claude-plugin/`).
- **Commit `plugin/scripts/*.mjs`** — these are not build artefacts in the usual "gitignore me" sense; they're the runtime payload of the plugin. Add `plugin/scripts/.gitkeep` so the directory exists even on a clean clone before first build, and document the rebuild step in `plugin/README.md`.
- **The plugin reads from two snapshot locations:** `${CLAUDE_PLUGIN_ROOT}/snapshot/` (bundled) and `${CLAUDE_PLUGIN_DATA}/snapshot/` (refreshed, if exists). The snapshot loader (`src/lib/snapshot.ts`) prefers the latter when present. Make this lookup explicit in tests — at least one fixture per side.
- **Run `claude plugin validate .` in CI** against the marketplace root. It's the authoritative validator; the Vitest schema-shape test (AC22) is a cheaper local smoke check that doesn't replace it.
- **Test the marketplace install locally** before pushing to GitHub: `claude plugin marketplace add ./` from a different working directory. The local-path install mode is exactly what the docs use for testing.
- **`$ARGUMENTS` quoting:** if the user types `/hub-search "claude code" --all`, the script sees `argv = ["claude code", "--all"]`. Test this. If they type `/hub-search claude code --all`, argv is `["claude", "code", "--all"]`. Document in the README that multi-word queries should be quoted.
- **AC8 (parameterised journey test):** the `journeys/` directory in the repo only has `day-1.md` and the by-role journeys (`backend`, `data-scientist`, `ml-engineer`) are placeholders or not yet authored. AC9 (placeholder graceful) must be the primary test until content lands. The plugin must NOT hardcode a journey allowlist — dynamic filename resolution per A19.
- **News-date YAML quirk** carries over from the pipeline (DECISIONS.md 2026-05-18 — gray-matter + js-yaml auto-converts unquoted dates to JS Date objects). Use the `yaml` engine explicitly when constructing the gray-matter parser. Add a test for this in `plugin/tests/frontmatter.test.ts`.
- **`noUncheckedIndexedAccess: true`** is in the inherited tsconfig. Code patterns like `parts[0]` type as `string | undefined`. Use `.at(0)` or length guards. Same gotcha as the site investigation flagged (R6 there).
- **DoD #13 (end-to-end smoke):** record in `docs/reference/integration-verification-hub-plugin.md` matching the format of the existing `integration-verification-rss-pipeline.md` and `integration-verification-astro-site.md`. Capture the `claude plugin validate` output, the install command output, and at least one invocation of each of the eleven commands.

---

## References

| # | Source | URL | What was learned |
|---|---|---|---|
| 1 | Claude Code Plugins reference | https://code.claude.com/docs/en/plugins-reference | Full plugin.json schema; `.claude-plugin/plugin.json` location; only `name` is required; `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` semantics; component auto-discovery; version-management strategy; plugin caching to `~/.claude/plugins/cache/`. |
| 2 | Claude Code Plugin Marketplaces | https://code.claude.com/docs/en/plugin-marketplaces | Full marketplace.json schema; `.claude-plugin/marketplace.json` at repo root; plugin source types (relative path, github, url, git-subdir, npm); private-repo auth via existing git credential helpers; relative-path footgun for URL-based marketplaces. |
| 3 | Claude Code Skills | https://code.claude.com/docs/en/skills | Slash command markdown frontmatter; `$ARGUMENTS`, `$N`, `${CLAUDE_SKILL_DIR}` substitutions; `` !`<command>` `` dynamic context injection (preprocessing, NOT LLM execution); `allowed-tools` for pre-approval; "custom commands have been merged into skills" — `commands/` and `skills/` both work. |
| 4 | Anthropic official marketplace example | https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json | Real-world canonical marketplace.json shape; relative-path `source` references; `$schema` pointing to schemastore. |
| 5 | Anthropic claude-code repo own marketplace | https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json | Same — confirms layout. |
| 6 | Unofficial JSON Schemas for Claude Code | https://github.com/hesreallyhim/claude-code-json-schema | Editor-validation JSON Schemas for plugin.json and marketplace.json — useful for VS Code editing. |
| 7 | JSON SchemaStore plugin manifest | https://json.schemastore.org/claude-code-plugin-manifest.json | Stable URL for the `$schema` reference in our plugin.json. |
| 8 | JSON SchemaStore marketplace manifest | https://json.schemastore.org/claude-code-marketplace.json | Stable URL for the `$schema` reference in our marketplace.json. |
| 9 | `open` npm package | https://www.npmjs.com/package/open | Cross-platform browser/file/app launcher; canonical successor to `opn`; ESM-native; ~3 KB; v10.x current; uses `open`/`start`/`xdg-open` under the hood. |
| 10 | `gray-matter` npm package | https://www.npmjs.com/package/gray-matter | Frontmatter parser; supports `yaml` engine to avoid the YAML 1.1 Date auto-conversion quirk (per DECISIONS.md 2026-05-18). |
| 11 | Node.js 22 fetch global | https://nodejs.org/api/globals.html#fetch | Built-in fetch with `AbortSignal.timeout()` — used for the `/hub-open` dev-server probe; no node-fetch dependency needed. |

---

## Original Request

See `/Users/suzy/ClaudeCode/Projects/NbgAiHub/docs/refined-requests/hub-plugin.md` for the full refined request (29 ACs, 20 Assumptions, 14 DoD items, 11 commands). Investigation scope was specified by the parent agent's instructions and traced 1:1 to the eight area headings above (manifest schemas, command execution model, TS implementation, snapshot strategy, browser open, search, state file, marketplace flow). All three load-bearing corrections (manifest locations, no `commands` array in manifest, "TS-backed command" semantics) flow into the Pre-implementation amendments listed in the Recommended Approach.
