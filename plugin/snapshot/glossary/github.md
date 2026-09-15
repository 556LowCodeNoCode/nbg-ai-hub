---
type: glossary
title: GitHub
audience: beginner
topics: [github, fundamentals]
internal: false
authored: "2026-05-25"
last_reviewed: "2026-05-25"
external_link: "https://github.com/"
deeper_link: null
ai_summary: The web platform where every team repo, issue, and pull request lives. The team's collective filing cabinet and review surface — Claude Code reads code from a GitHub-cloned folder on your laptop and pushes changes back via `gh`.
tldr: "The website where the team's code lives. Every project, every change, and every discussion about the code is stored and tracked there."
aliases: []
---

GitHub is where every line of code, every script, every Claude skill, and every document the team writes lives. One repo per project; one issue per bug or idea; one pull request per change. It's the industry standard — every software team uses it for the same reasons.

You touch GitHub through three doors:

- **The website** (`github.com`) — read history, comment on PRs, browse code in the browser
- **`gh`** (the GitHub CLI) — what Claude Code actually uses under the hood
- **A cloned folder on your laptop** — where Claude reads and edits files

You almost never need to "know git". Claude proposes, you approve, `gh` does the work.

The team's repos live at `github.com/orgs/556LowCodeNoCode/repositories`. Newcomers get read access on day one; specific contributor access is added per repo when needed.
