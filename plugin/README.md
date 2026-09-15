# NbgAiHub — `/hub` plugin

The Claude Code plugin for the NbgAiHub knowledge hub. Bring the hub *inside* your terminal — skills catalog, tips & tricks, curated news, onboarding journeys, and glossary — without leaving Claude Code.

Tone: *"what I wish I knew a year ago."*

## Install

```text
/plugin marketplace add 556LowCodeNoCode/NbgAiHub
/plugin install nbg-ai-hub@nbg-ai-hub-marketplace
```

The plugin ships with a bundled content snapshot built at release time. Run `/hub-refresh` to pull the latest content from the hub repo.

## Commands

| Command | What it does |
|---|---|
| `/hub` | Menu of pillars, last-used journey, current audience filter |
| `/hub-search <query>` | Full-text search across all pillars; ranked snippets |
| `/hub-skills [topic]` | List skills (name, status, category, maintainer, install command) |
| `/hub-tips [topic]` | Browse tips & tricks; filter by topic |
| `/hub-news [--week\|--today]` | Latest curated news; default last 7 days |
| `/hub-glossary <term>` | Term lookup with definition + related terms |
| `/hub-onboard <journey>` | Step-by-step journey: `day-1`, `week-1`, by-role |
| `/hub-install <skill-id>` | Print the marketplace install command for a skill |
| `/hub-audience <beginner\|advanced\|both>` | Set the persistent audience filter |
| `/hub-refresh` | `git pull` the latest snapshot from the hub repo |
| `/hub-open [section] [subsection]` | Open the hub website in your default browser |

### Examples

```text
/hub
/hub-search agentic workflows
/hub-glossary mcp
/hub-skills testing
/hub-news --today
/hub-onboard day-1
/hub-audience beginner
/hub-open glossary mcp        # opens http://localhost:4321/glossary#mcp
```

## Configuration

Two layers:

- **Plugin config** (`config.json` in the plugin install dir) — shared across users. URL, search weights, devMode flag.
- **Per-user state** (`${CLAUDE_PLUGIN_DATA}/state.json`) — audience filter + last journey. Created on first `/hub-audience` or `/hub-onboard` call.

Until the hub website goes live on GitHub Pages, `devMode: true` keeps `/hub-open` pointed at `http://localhost:4321`. Flip to `false` after the production deploy.

## Architecture

- **Eleven entries**, one TypeScript script per command (`src/<command>.ts`), bundled to ESM via esbuild (`dist/<command>.mjs`).
- **Eight shared modules** under `src/lib/`: config, state, snapshot, frontmatter, search, audience, journeys, url-builder, browser, output, errors, bootstrap, content.
- **Content** is shipped as plain markdown in `snapshot/<pillar>/*.md` — identical shape to what the Astro Starlight site reads from `glossary/`, `tips/`, `skills/`, `news/published/`, `journeys/`. Single source of truth.
- **`/hub-refresh`** uses `git clone`/`git pull` into `~/.cache/nbg-ai-hub/snapshot/` — reuses the user's existing git credentials.

## Dev

```bash
cd plugin
npm install
npm run build:snapshot   # copy current repo content into plugin/snapshot/
npm run build            # esbuild → plugin/dist/*.mjs
npm test                 # vitest run
npm run typecheck
npm run lint
```

Smoke-test any command without a full Claude Code install:

```bash
CLAUDE_PLUGIN_DATA=/tmp/nbg-state node dist/hub.mjs
CLAUDE_PLUGIN_DATA=/tmp/nbg-state node dist/hub-glossary.mjs mcp
HUB_OPEN_SKIP=1 CLAUDE_PLUGIN_DATA=/tmp/nbg-state node dist/hub-open.mjs glossary mcp
```

`HUB_OPEN_SKIP=1` prints the resolved URL instead of launching a browser.

## Exit codes

| Code | Class | Examples |
|------|-------|----------|
| 0 | OK | Command succeeded |
| 1 | Not found | `E_CONTENT_NOT_FOUND`, `E_JOURNEY_MISSING`, `E_INSTALL_COMMAND_MISSING` |
| 2 | Config / state / snapshot invalid | `E_CONFIG_MISSING`, `E_CONFIG_INVALID`, `E_SNAPSHOT_MISSING`, `E_STATE_INVALID` |
| 3 | Frontmatter / URL validation | `E_FRONTMATTER_INVALID`, `E_URL_BUILD` |
| 4 | Environment / network | `E_NETWORK`, `E_GIT_UNAVAILABLE` |

Errors print one line on stderr in the form `<CODE>: <message>` and exit non-zero. There are no silent fallbacks for missing configuration.

## Contributing

Content authoring (new glossary terms, tips, skills entries, journey content) happens in the parent repo — not here. The plugin reads what the repo ships.

To add behavior to a command, edit `src/<command>.ts`, run `npm run build && npm test`, then commit.
