---
type: glossary
title: Pull Request (PR)
audience: beginner
topics: [github, fundamentals]
internal: false
authored: "2026-05-19"
last_reviewed: "2026-05-19"
external_link: null
deeper_link: null
ai_summary: A proposal to merge a branch back into `main`. The PR is where review, discussion, CI checks, and the final approval happen — it's the conversation, not just the code.
tldr: "A request to add your changes into the main project. Teammates review the diff and comment before it gets merged in."
aliases: ["PR", "PRs", "pull request", "pull requests"]
---

A Pull Request (PR) is how proposed changes enter the team's main code line. You push your branch, open a PR, and the rest of the team can read the diff, comment on lines, request changes, approve, and merge.

What a PR carries:

- The diff (what changed)
- A summary (the "why")
- Comments and review threads
- CI checks (tests, linters, validators that run automatically)
- Approval(s) and merge state

Claude Code opens PRs for you when you ask ("open a PR for these changes"). The body it drafts follows a standard template — summary + test plan. Tweak it before merging if you want.
