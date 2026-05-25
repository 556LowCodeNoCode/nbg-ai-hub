---
type: glossary
title: gh (GitHub CLI)
audience: beginner
topics: [github, tooling]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: "https://cli.github.com/"
deeper_link: null
ai_summary: The official GitHub command-line tool. Claude Code uses `gh` to clone repos, create issues, open PRs, and check workflow status — you describe what you want in plain English, Claude calls `gh`.
---

`gh` is GitHub's CLI. You don't talk to GitHub directly — Claude does it for you via `gh` when you ask in plain English ("show me the open issues", "open a PR with these changes").

One-time setup:

- **macOS:** `brew install gh`
- **WSL / Linux:** `sudo apt install gh`
- **PowerShell:** `winget install --id GitHub.cli`
- Then: `gh auth login` (opens a browser, one-time)

Useful commands worth knowing by name:

- `gh repo clone <org/repo>` — clone
- `gh repo view --web` — open repo in browser
- `gh issue list` / `gh issue create`
- `gh pr create` / `gh pr view --web` / `gh pr checks`
- `gh auth status` — confirm you're authenticated

In practice you rarely type these — Claude does. But knowing they exist helps when you're reading what Claude is about to run.
