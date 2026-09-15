---
type: tip
title: Install `gh` (and other CLIs) — Claude knows how to use them
audience: both
topics: [workflow]
internal: false
authored: "2026-05-28"
last_reviewed: "2026-05-28"
external_link: https://cli.github.com/
deeper_link: null
ai_summary: Claude is fluent with CLI tools like `gh`, `az`, `aws`, `jq`, `psql`. Install them, log in once, and Claude can read PRs, query Azure resources, inspect databases — without a single MCP server.
---

A surprise that lands for most newcomers: Claude doesn't need a fancy integration to read your GitHub PRs, query an Azure resource, or check a database. It already knows how to use the standard command-line tools. You just have to install them.

**`gh` (GitHub CLI)** — the single highest-leverage one for most teams.

```
brew install gh    # macOS
sudo apt install gh    # Ubuntu / WSL
```

Then `gh auth login` once. From that point on, Claude can:

- Read a PR: `gh pr view 142`
- Read the diff: `gh pr diff 142`
- List your open PRs: `gh pr list --author @me`
- Open an issue, comment on one, merge after CI passes

You don't have to tell Claude how. It knows the syntax. You just ask:

> Review PR 142 and tell me if it's safe to merge.

Claude reaches for `gh pr diff 142` on its own.

Not sure whether `gh` is already installed? Don't check by hand — ask Claude:

> Is `gh` installed on this machine? If not, install it and walk me through `gh auth login`.

Claude runs `which gh`, installs via Homebrew or apt if missing, and tells you the one interactive step (`gh auth login`) you have to run yourself. Same trick for `az`, `aws`, and the other CLIs below.

Other CLIs worth knowing exist for the same reason:

- **`az`** (Azure) — `az resource list`, `az webapp logs`, `az keyvault secret show`. The bank's Azure footprint is reachable from the same Claude session that writes the code.
- **`aws`** — same idea if you're on AWS.
- **`jq`** — slice JSON output before pasting. `gh pr list --json title,number,author | jq` makes Claude's view of the data tight.
- **`psql` / `mysql`** — point Claude at a read-only database connection and it can answer "is this user in the table?" without an ORM round-trip.
- **`docker`, `kubectl`** — same story for containers.

**Why this beats reaching for an MCP server first:** CLI tools cost zero setup, work everywhere (terminal, CI, scripts), and use the same authentication you already have. MCP shines when the CLI doesn't exist or the surface is genuinely API-shaped. Default to a CLI; reach for MCP when you need to.

The team's pattern: `gh` and `az` installed on every developer machine, logged in once, mentioned in the project CLAUDE.md as available tools. Claude does the rest.
